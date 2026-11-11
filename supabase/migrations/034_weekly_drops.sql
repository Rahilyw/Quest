-- 034: Weekly drop surfacing and Monday push outbox (Spec 05).
--
-- active_from / active_until already exist (012). This migration:
--   * hides quests that have not started yet from client reads
--   * still lets a player open a quest they already completed after it ends
--   * stores the Monday-drop push preference on the profile
--   * enqueues one idempotent city-wide push per Victoria week
--
-- Boundaries match packages/geofence/src/questWindow.js:
--   active_from inclusive, active_until exclusive, null means open.
-- Admin reads use the service role, which bypasses RLS, so scheduled
-- quests stay editable before they drop.
--
-- Push delivery is NOT done here. enqueue_weekly_drop() only writes
-- push_outbox. Deploy supabase/functions/send-push-outbox and a webhook
-- on weekly_drop_sends INSERT before any phone can receive it.
-- pg_cron times are UTC. Two Monday runs cover the PST/PDT shift:
--   16:15 UTC = 09:15 PDT / 08:15 PST
--   17:15 UTC = 10:15 PDT / 09:15 PST
-- A run before any quest's active_from does not lock the week.

-- ─── Read window ────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Anyone can read active quests" ON quests;
CREATE POLICY "Anyone can read quests in their active window"
  ON quests FOR SELECT
  USING (
    status = 'active'
    AND (active_from IS NULL OR active_from <= now())
    AND (
      active_until IS NULL
      OR active_until > now()
      OR EXISTS (
        SELECT 1
        FROM completions c
        WHERE c.quest_id = quests.id
          AND c.user_id = (SELECT auth.uid())
      )
    )
  );

CREATE INDEX IF NOT EXISTS quests_active_from_idx
  ON quests (active_from)
  WHERE status = 'active';

-- Completing a quest that has not dropped, or has already ended, is rejected
-- even if the client knows the id. Admins do not insert completions.
CREATE OR REPLACE FUNCTION enforce_quest_active_window()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_from   timestamptz;
  v_until  timestamptz;
  v_status text;
BEGIN
  SELECT active_from, active_until, status
    INTO v_from, v_until, v_status
  FROM quests
  WHERE id = NEW.quest_id;

  IF v_status IS DISTINCT FROM 'active'
     OR (v_from IS NOT NULL AND v_from > now())
     OR (v_until IS NOT NULL AND v_until <= now()) THEN
    RAISE EXCEPTION 'This quest is not available right now.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_quest_active_window ON completions;
CREATE TRIGGER trg_enforce_quest_active_window
  BEFORE INSERT ON completions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_quest_active_window();

REVOKE EXECUTE ON FUNCTION enforce_quest_active_window() FROM PUBLIC, anon, authenticated;

-- ─── Preference ─────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS push_drops BOOLEAN NOT NULL DEFAULT true;

GRANT UPDATE (push_drops) ON profiles TO authenticated;

-- ─── Outbox ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS push_outbox (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('weekly_drop', 'suggestion_live')),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key  TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS push_outbox_unsent_idx
  ON push_outbox (created_at)
  WHERE sent_at IS NULL;

ALTER TABLE push_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON push_outbox FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS weekly_drop_sends (
  week_start  TIMESTAMPTZ PRIMARY KEY,
  quest_count INTEGER NOT NULL CHECK (quest_count > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE weekly_drop_sends ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON weekly_drop_sends FROM PUBLIC, anon, authenticated;

-- ─── Enqueue ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION enqueue_weekly_drop()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_week   timestamptz;
  v_count  integer;
  v_body   text;
  v_inserted integer;
BEGIN
  -- Monday 00:00 America/Vancouver, as an absolute instant.
  v_week := date_trunc('week', now() AT TIME ZONE 'America/Vancouver')
            AT TIME ZONE 'America/Vancouver';

  SELECT count(*) INTO v_count
  FROM quests
  WHERE status = 'active'
    AND active_from >= v_week
    AND active_from < v_week + interval '1 day'
    AND active_from <= now()
    AND (active_until IS NULL OR active_until > now());

  IF v_count = 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO weekly_drop_sends (week_start, quest_count)
  VALUES (v_week, v_count)
  ON CONFLICT (week_start) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN
    RETURN 0;
  END IF;

  v_body := v_count || ' new quest' || CASE WHEN v_count = 1 THEN '' ELSE 's' END
            || ' just dropped in Victoria.';

  INSERT INTO push_outbox (user_id, kind, title, body, data, dedupe_key)
  SELECT
    p.id,
    'weekly_drop',
    'Quest!',
    v_body,
    jsonb_build_object('type', 'weekly_drop', 'quest_count', v_count),
    'weekly_drop:' || v_week::text || ':' || p.id::text
  FROM profiles p
  WHERE p.push_token IS NOT NULL
    AND p.push_drops = true
  ON CONFLICT (dedupe_key) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

REVOKE EXECUTE ON FUNCTION enqueue_weekly_drop() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION enqueue_weekly_drop() TO service_role;

-- Same extension 031 already creates. Skip the schedule if cron isn't installed
-- in this database; the function can still be called by hand.
DO $$
DECLARE
  r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    FOR r IN
      SELECT jobid FROM cron.job
      WHERE jobname IN ('enqueue-weekly-drop-1615', 'enqueue-weekly-drop-1715')
    LOOP
      PERFORM cron.unschedule(r.jobid);
    END LOOP;

    PERFORM cron.schedule(
      'enqueue-weekly-drop-1615',
      '15 16 * * 1',
      'SELECT public.enqueue_weekly_drop()'
    );
    PERFORM cron.schedule(
      'enqueue-weekly-drop-1715',
      '15 17 * * 1',
      'SELECT public.enqueue_weekly_drop()'
    );
  END IF;
END;
$$;
