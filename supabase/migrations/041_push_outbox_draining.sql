-- 041: Bounded push_outbox draining (OPS-01 / F-007) and the Sunday recap push
--      (Spec 06 §2).
--
-- Before this file, send-push-outbox read at most 100 unsent rows per call and
-- was only called by the weekly_drop_sends INSERT webhook, so anything past the
-- first 100 rows waited for next Monday. It also ignored HTTP failures.
--
-- This migration:
--   * adds claim bookkeeping to push_outbox: attempts, last_error, claimed_at,
--     next_attempt_at
--   * adds service-role RPCs the sender uses: claim_push_outbox,
--     finish_push_outbox, release_push_outbox
--   * widens push_outbox.kind to 'week_recap' and 'win_back' (Phase 4 uses
--     win_back; adding it now avoids a second CHECK change)
--   * adds invoke_push_outbox_drain(), which pg_cron calls every 5 minutes; it
--     calls the function through pg_net only when there are rows to claim
--   * adds week_recap_sends and enqueue_week_recap() on two Sunday-evening
--     UTC crons with a Victoria local-time guard
--
-- Row lifecycle:
--   unsent       sent_at IS NULL, claimed_at IS NULL, attempts < 5
--   claimed      claimed_at set by claim_push_outbox(); other callers skip it
--   stale claim  claimed_at older than 10 minutes (the sender died mid-batch);
--                the next claim takes it again and counts that as an attempt
--   finished     sent_at set: Expo accepted it, or it was skipped on purpose
--                (no token, preference off, dead token). last_error says which.
--   released     a send failed: attempts + 1, last_error set, claim cleared,
--                next_attempt_at pushed back (2, 4, 8, 16 minutes)
--   dead letter  sent_at IS NULL AND attempts >= 5. Never claimed again.
--                MAX_ATTEMPTS in send-push-outbox/index.ts must match.
--
-- The drain cron needs two Vault secrets the owner creates (see
-- supabase/migrations/README.md, "Verifying 041"):
--   push_outbox_function_url  https://<project-ref>.supabase.co/functions/v1/send-push-outbox
--   push_outbox_webhook_secret  the same value as DROP_PUSH_WEBHOOK_SECRET
-- Until both exist, invoke_push_outbox_drain() returns 'not configured' and
-- sends nothing. The existing weekly_drop_sends webhook keeps working.
--
-- Recap schedule. pg_cron times are UTC; the recap is due Sunday 18:00 in
-- America/Vancouver, which is Monday 01:00 UTC in PDT and Monday 02:00 UTC in
-- PST. Both run; the local-time guard skips the one that lands at 17:00 PST and
-- week_recap_sends stops the 19:00 PDT run from sending twice.
--
-- This file changes nothing on a hosted database until the owner applies it.

-- ─── Outbox bookkeeping ─────────────────────────────────────────────────────

ALTER TABLE push_outbox
  ADD COLUMN IF NOT EXISTS attempts        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error      TEXT,
  ADD COLUMN IF NOT EXISTS claimed_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ;

-- Widen kind. 034 wrote the CHECK inline, so its name is generated; drop any
-- CHECK on push_outbox that mentions kind instead of guessing the name.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname
      FROM pg_constraint
     WHERE conrelid = 'public.push_outbox'::regclass
       AND contype = 'c'
       AND pg_get_constraintdef(oid) ILIKE '%kind%'
  LOOP
    EXECUTE format('ALTER TABLE public.push_outbox DROP CONSTRAINT %I', r.conname);
  END LOOP;
END;
$$;

ALTER TABLE push_outbox
  ADD CONSTRAINT push_outbox_kind_check
  CHECK (kind IN ('weekly_drop', 'suggestion_live', 'week_recap', 'win_back'));

-- Dead letters, for the owner's checks. The 034 index already covers claims
-- (created_at WHERE sent_at IS NULL).
CREATE INDEX IF NOT EXISTS push_outbox_dead_idx
  ON push_outbox (created_at)
  WHERE sent_at IS NULL AND attempts >= 5;

-- ─── Claim / finish / release ───────────────────────────────────────────────

-- Claims up to p_batch rows, oldest first. FOR UPDATE SKIP LOCKED lets two
-- senders run at once without taking the same row; claimed_at keeps the row
-- out of later claims until it is finished, released, or 10 minutes old.
-- p_batch is clamped to 1..500.
CREATE OR REPLACE FUNCTION claim_push_outbox(p_batch integer)
RETURNS SETOF push_outbox
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH picked AS (
    SELECT o.id
      FROM push_outbox o
     WHERE o.sent_at IS NULL
       AND o.attempts < 5
       AND (o.claimed_at IS NULL OR o.claimed_at < now() - interval '10 minutes')
       AND (o.next_attempt_at IS NULL OR o.next_attempt_at <= now())
     ORDER BY o.created_at, o.id
     LIMIT LEAST(GREATEST(COALESCE(p_batch, 1), 1), 500)
     FOR UPDATE SKIP LOCKED
  )
  UPDATE push_outbox o
     SET claimed_at = now(),
         -- A stale claim means the last sender died mid-batch: count it.
         attempts   = o.attempts + CASE WHEN o.claimed_at IS NULL THEN 0 ELSE 1 END,
         last_error = CASE WHEN o.claimed_at IS NULL THEN o.last_error ELSE 'claim expired' END
    FROM picked
   WHERE o.id = picked.id
  RETURNING o.*;
$$;

-- Marks claimed rows done. p_note is null for a delivered push, or says why a
-- row was skipped ('skipped: no push token', 'DeviceNotRegistered', ...).
CREATE OR REPLACE FUNCTION finish_push_outbox(p_ids uuid[], p_note text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE push_outbox
     SET sent_at = now(),
         claimed_at = NULL,
         next_attempt_at = NULL,
         last_error = COALESCE(left(p_note, 500), last_error)
   WHERE id = ANY(p_ids)
     AND sent_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Gives failed rows back with one more attempt and a backoff, so the same
-- sender loop does not take them again straight away. After the fifth failure
-- the row is a dead letter (claim skips attempts >= 5).
CREATE OR REPLACE FUNCTION release_push_outbox(p_ids uuid[], p_error text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE push_outbox
     SET claimed_at = NULL,
         attempts = attempts + 1,
         last_error = left(COALESCE(p_error, 'unknown error'), 500),
         next_attempt_at = now() + interval '1 minute' * power(2, LEAST(attempts + 1, 6))
   WHERE id = ANY(p_ids)
     AND sent_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION claim_push_outbox(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION finish_push_outbox(uuid[], text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION release_push_outbox(uuid[], text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_push_outbox(integer) TO service_role;
GRANT EXECUTE ON FUNCTION finish_push_outbox(uuid[], text) TO service_role;
GRANT EXECUTE ON FUNCTION release_push_outbox(uuid[], text) TO service_role;

-- ─── Drain trigger (pg_cron → pg_net → send-push-outbox) ────────────────────

-- pg_net is a Supabase-provided extension. Skip it where it is not available
-- (plain local Postgres); invoke_push_outbox_drain() then reports it missing.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_net') THEN
    CREATE EXTENSION IF NOT EXISTS pg_net;
  END IF;
END;
$$;

-- Returns what it did, so a manual `SELECT invoke_push_outbox_drain();` is a
-- readable check. pg_net sends the request after this transaction commits.
CREATE OR REPLACE FUNCTION invoke_push_outbox_drain()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_url    text;
  v_secret text;
  v_req    bigint;
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM push_outbox o
     WHERE o.sent_at IS NULL
       AND o.attempts < 5
       AND (o.claimed_at IS NULL OR o.claimed_at < now() - interval '10 minutes')
       AND (o.next_attempt_at IS NULL OR o.next_attempt_at <= now())
  ) THEN
    RETURN 'idle';
  END IF;

  IF to_regnamespace('net') IS NULL THEN
    RETURN 'not configured: pg_net is not installed';
  END IF;
  IF to_regclass('vault.decrypted_secrets') IS NULL THEN
    RETURN 'not configured: vault is not available';
  END IF;

  SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets
   WHERE name = 'push_outbox_function_url';
  SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets
   WHERE name = 'push_outbox_webhook_secret';

  IF v_url IS NULL OR v_secret IS NULL THEN
    RETURN 'not configured: vault secrets push_outbox_function_url / push_outbox_webhook_secret';
  END IF;

  SELECT net.http_post(
           url := v_url,
           body := jsonb_build_object('source', 'cron'),
           headers := jsonb_build_object(
             'Content-Type', 'application/json',
             'x-webhook-secret', v_secret
           ),
           timeout_milliseconds := 60000
         )
    INTO v_req;

  RETURN 'requested ' || v_req::text;
END;
$$;

REVOKE ALL ON FUNCTION invoke_push_outbox_drain() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION invoke_push_outbox_drain() TO service_role;

-- ─── Sunday recap enqueue ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS week_recap_sends (
  week_start    DATE PRIMARY KEY,           -- Monday of the Victoria week
  player_count  INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE week_recap_sends ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON week_recap_sends FROM PUBLIC, anon, authenticated;

-- One recap push per Victoria week, Sunday 18:00 local or later. Targets
-- players with a token, push_drops on, and approved XP this week by the
-- leaderboard rule (031 view, 040 recap): approved completions by reviewed_at
-- inside Monday 00:00 to next Monday 00:00 America/Vancouver, summing
-- quests.xp_reward, more than zero.
-- The week is still open at 18:00; the recap screen says so and settles at
-- midnight. Returns the number of outbox rows written.
CREATE OR REPLACE FUNCTION enqueue_week_recap()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_local    timestamp := now() AT TIME ZONE 'America/Vancouver';
  v_monday   date;
  v_from     timestamptz;
  v_to       timestamptz;
  v_inserted integer;
BEGIN
  -- Local-time guard: Sunday, 18:00 or later, in Victoria.
  IF extract(isodow FROM v_local) <> 7 OR extract(hour FROM v_local) < 18 THEN
    RETURN 0;
  END IF;

  v_monday := date_trunc('week', v_local)::date;
  v_from   := v_monday::timestamp AT TIME ZONE 'America/Vancouver';
  v_to     := (v_monday + 7)::timestamp AT TIME ZONE 'America/Vancouver';

  INSERT INTO week_recap_sends (week_start)
  VALUES (v_monday)
  ON CONFLICT (week_start) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO push_outbox (user_id, kind, title, body, data, dedupe_key)
  SELECT
    p.id,
    'week_recap',
    'Quest!',
    'Your week in Victoria is in.',
    jsonb_build_object('type', 'week_recap', 'url', '/recap', 'week_start', v_monday),
    'week_recap:' || v_monday::text || ':' || p.id::text
  FROM profiles p
  JOIN (
    SELECT c.user_id
      FROM completions c
      JOIN quests q ON q.id = c.quest_id
     WHERE c.status = 'approved'
       AND c.reviewed_at >= v_from
       AND c.reviewed_at <  v_to
     GROUP BY c.user_id
    HAVING COALESCE(sum(q.xp_reward), 0) > 0
  ) xp ON xp.user_id = p.id
  WHERE p.push_token IS NOT NULL
    AND p.push_drops = true
  ON CONFLICT (dedupe_key) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  UPDATE week_recap_sends
     SET player_count = v_inserted
   WHERE week_start = v_monday;

  RETURN v_inserted;
END;
$$;

REVOKE EXECUTE ON FUNCTION enqueue_week_recap() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION enqueue_week_recap() TO service_role;

-- ─── Schedules ──────────────────────────────────────────────────────────────

-- Same guard as 034: skip scheduling if pg_cron is not installed here; the
-- functions can still be called by hand.
DO $$
DECLARE
  r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    FOR r IN
      SELECT jobid FROM cron.job
      WHERE jobname IN ('drain-push-outbox', 'enqueue-week-recap-0100', 'enqueue-week-recap-0200')
    LOOP
      PERFORM cron.unschedule(r.jobid);
    END LOOP;

    PERFORM cron.schedule(
      'drain-push-outbox',
      '*/5 * * * *',
      'SELECT public.invoke_push_outbox_drain()'
    );
    -- Monday 01:00 UTC = Sunday 18:00 PDT (17:00 PST: guard skips).
    PERFORM cron.schedule(
      'enqueue-week-recap-0100',
      '0 1 * * 1',
      'SELECT public.enqueue_week_recap()'
    );
    -- Monday 02:00 UTC = Sunday 18:00 PST (19:00 PDT: already sent, no-op).
    PERFORM cron.schedule(
      'enqueue-week-recap-0200',
      '0 2 * * 1',
      'SELECT public.enqueue_week_recap()'
    );
  END IF;
END;
$$;
