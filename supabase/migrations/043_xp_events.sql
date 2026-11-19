-- 043: XP economy events (Spec 06 §3, build plan Nov 19 Phase 4a).
--
-- REQUIRES 041 APPLIED FIRST. This file redefines enqueue_week_recap() (041)
-- and writes push_outbox rows of kind 'win_back', which 041's CHECK adds.
-- Apply order: 041 → 042 → 043, each followed by its "Verifying" block in
-- supabase/migrations/README.md.
--
-- What changes:
--   1. completions.xp_awarded (stored award, NOT NULL after backfill) and
--      completions.xp_reason, both with column SELECT grants (038 rule).
--   2. xp_events: admin multiplier events and personal win-back rows. RLS on,
--      no client policies; admin writes with the service role.
--   3. normalize_completion_on_insert() (from 038, all of its logic kept)
--      now also computes xp_awarded / xp_reason:
--        base         quests.xp_reward
--        m_event      highest active 'multiplier' row that is global or for
--                     this quest
--        m_personal   the caller's oldest active, unconsumed 'win_back' row,
--                     which is consumed here
--        m            greatest(1, m_event, m_personal): no stacking, the
--                     highest wins and xp_reason records which one
--        first finisher: quest started (coalesce(active_from, created_at))
--                     within 7 days and no approved completion yet, checked
--                     under pg_advisory_xact_lock(hashtext(quest_id)) so two
--                     finishers cannot both get it: m := m * 1.5
--        xp_awarded   round(base * least(m, 3))
--   4. apply_completion_rewards(p_completion_id uuid) pays the stored award.
--      Both trigger wrappers call it; the (uuid, uuid) overload is dropped.
--      A reinstate pays back the same stored award.
--   5. Everything that sums XP uses coalesce(c.xp_awarded, q.xp_reward):
--      revoke_completion_rewards, the leaderboard view (and so
--      snapshot_last_week_ranks), own_week_recap, enqueue_week_recap.
--      Side effect: editing a quest's xp_reward no longer rewrites past weeks.
--   6. active_xp_boosts(): what the signed-in player can earn right now.
--   7. own_completion_reward() also returns xp_awarded and xp_reason.
--   8. enqueue_win_back() daily at 17:00 America/Vancouver (two UTC crons and
--      a local-time guard, as in 034/041).
--
-- xp_reason values: null (no boost), 'weekend' (any global multiplier event;
-- the admin presets are weekend events), 'quest' (a quest-specific event),
-- 'first_finisher', 'win_back', and 'duo' (reserved for Phase 5).
-- xp_events.kind 'first_finisher' is reserved: the first-finisher bonus is a
-- rule in the trigger, not a row, and nothing in 043 reads such rows.
--
-- Bonus XP not tied to a completion (035 suggestion bonus) is still not in
-- weekly XP, same as before.
--
-- This file changes nothing on a hosted database until an owner applies it.

-- ─── 1. Stored award on completions ─────────────────────────────────────────

ALTER TABLE completions ADD COLUMN IF NOT EXISTS xp_awarded integer;
ALTER TABLE completions ADD COLUMN IF NOT EXISTS xp_reason text;

-- Backfill every existing row to its quest's current xp_reward. That is the
-- value the leaderboard and recap already used for these rows. The AFTER
-- UPDATE triggers on completions only act on a status change, and this
-- statement changes no status, so no XP moves.
UPDATE completions c
   SET xp_awarded = q.xp_reward
  FROM quests q
 WHERE q.id = c.quest_id
   AND c.xp_awarded IS NULL;

-- A row whose quest no longer exists (none expected: quest_id cascades).
UPDATE completions SET xp_awarded = 0 WHERE xp_awarded IS NULL;

ALTER TABLE completions ALTER COLUMN xp_awarded SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.completions'::regclass
       AND conname = 'completions_xp_awarded_nonneg'
  ) THEN
    ALTER TABLE completions
      ADD CONSTRAINT completions_xp_awarded_nonneg CHECK (xp_awarded >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.completions'::regclass
       AND conname = 'completions_xp_reason_check'
  ) THEN
    ALTER TABLE completions
      ADD CONSTRAINT completions_xp_reason_check
      CHECK (xp_reason IS NULL
             OR xp_reason IN ('weekend', 'quest', 'first_finisher', 'win_back', 'duo'));
  END IF;
END;
$$;

-- 038 removed table-level SELECT for client roles; new columns need their own
-- grant. Neither column is secret: it is the XP the feed and recap show.
GRANT SELECT (xp_awarded, xp_reason) ON TABLE completions TO anon, authenticated;

-- ─── 2. Events table ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS xp_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind         text NOT NULL CHECK (kind IN ('multiplier', 'first_finisher', 'win_back')),
  multiplier   numeric(3,2) NOT NULL CHECK (multiplier BETWEEN 1 AND 3),
  quest_id     uuid NULL REFERENCES quests(id) ON DELETE CASCADE,
  user_id      uuid NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label        text NULL,                 -- admin-facing name
  starts_at    timestamptz NOT NULL,
  ends_at      timestamptz NOT NULL,
  consumed_at  timestamptz NULL,          -- win_back only
  created_by   text NULL,                 -- admin email, or 'cron'
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT xp_events_window CHECK (ends_at > starts_at),
  -- A multiplier event is global or per-quest, never per-player.
  CONSTRAINT xp_events_multiplier_scope CHECK (kind <> 'multiplier' OR user_id IS NULL),
  -- A win-back row belongs to one player and no quest.
  CONSTRAINT xp_events_win_back_scope CHECK (kind <> 'win_back' OR (user_id IS NOT NULL AND quest_id IS NULL)),
  CONSTRAINT xp_events_consumed_win_back CHECK (consumed_at IS NULL OR kind = 'win_back')
);

CREATE INDEX IF NOT EXISTS xp_events_active_multiplier_idx
  ON xp_events (ends_at, starts_at)
  WHERE kind = 'multiplier';

CREATE INDEX IF NOT EXISTS xp_events_win_back_user_idx
  ON xp_events (user_id, created_at)
  WHERE kind = 'win_back';

CREATE INDEX IF NOT EXISTS xp_events_quest_id_idx
  ON xp_events (quest_id)
  WHERE quest_id IS NOT NULL;

ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE xp_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE xp_events TO service_role;

-- ─── 3. Award on insert (redefines 038:41, keeps all of its logic) ─────────

CREATE OR REPLACE FUNCTION normalize_completion_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  recent_10min integer;
  recent_24h integer;
  sponsored boolean;
  base_xp integer;
  quest_start timestamptz;
  m_event numeric;
  m_event_global numeric;
  m_personal numeric;
  win_back_id uuid;
  m numeric;
  reason text;
BEGIN
  NEW.completed_at := now();

  SELECT count(*)::integer INTO recent_10min
    FROM completions
   WHERE user_id = NEW.user_id
     AND completed_at >= now() - interval '10 minutes';

  IF recent_10min >= 2 THEN
    RAISE EXCEPTION 'RATE_LIMITED'
      USING ERRCODE = 'check_violation',
            HINT   = 'RATE_LIMITED';
  END IF;

  SELECT count(*)::integer INTO recent_24h
    FROM completions
   WHERE user_id = NEW.user_id
     AND completed_at >= now() - interval '24 hours';

  IF recent_24h >= 10 THEN
    RAISE EXCEPTION 'RATE_LIMITED'
      USING ERRCODE = 'check_violation',
            HINT   = 'RATE_LIMITED';
  END IF;

  NEW.status := 'approved';
  NEW.reviewed_at := now();

  SELECT is_sponsored, xp_reward, coalesce(active_from, created_at)
    INTO sponsored, base_xp, quest_start
    FROM quests
   WHERE id = NEW.quest_id;

  IF sponsored THEN
    NEW.redemption_code := generate_redemption_code();
  ELSE
    NEW.redemption_code := NULL;
  END IF;

  -- ── XP award (043). Client-supplied xp_awarded / xp_reason are ignored. ──

  base_xp := coalesce(base_xp, 0);

  -- Highest active multiplier event that is global or for this quest.
  SELECT max(e.multiplier),
         max(e.multiplier) FILTER (WHERE e.quest_id IS NULL)
    INTO m_event, m_event_global
    FROM xp_events e
   WHERE e.kind = 'multiplier'
     AND e.user_id IS NULL
     AND (e.quest_id IS NULL OR e.quest_id = NEW.quest_id)
     AND e.starts_at <= now()
     AND e.ends_at > now();

  m_event := coalesce(m_event, 1);

  -- The caller's oldest active, unconsumed win-back row. FOR UPDATE makes a
  -- concurrent insert by the same player wait, then skip the consumed row.
  SELECT e.id, e.multiplier
    INTO win_back_id, m_personal
    FROM xp_events e
   WHERE e.kind = 'win_back'
     AND e.user_id = NEW.user_id
     AND e.consumed_at IS NULL
     AND e.starts_at <= now()
     AND e.ends_at > now()
   ORDER BY e.created_at, e.id
   LIMIT 1
   FOR UPDATE;

  IF win_back_id IS NOT NULL THEN
    -- Rolled back with the insert if a later check or constraint fails.
    UPDATE xp_events SET consumed_at = now() WHERE id = win_back_id;
  END IF;

  m_personal := coalesce(m_personal, 1);

  -- No stacking: the highest multiplier wins. A tie goes to the win-back row,
  -- because it was just used up.
  m := greatest(1, m_event, m_personal);
  reason := CASE
    WHEN m = 1 THEN NULL
    WHEN m_personal >= m_event THEN 'win_back'
    WHEN m_event_global IS NOT NULL AND m_event_global >= m_event THEN 'weekend'
    ELSE 'quest'
  END;

  -- First finisher: only for a quest that started in the last 7 days. The
  -- advisory lock is held to the end of this transaction, so a second
  -- finisher waits for the first to commit and then sees its row.
  IF quest_start IS NOT NULL AND quest_start > now() - interval '7 days' THEN
    PERFORM pg_advisory_xact_lock(hashtext(NEW.quest_id::text));

    IF NOT EXISTS (
      SELECT 1 FROM completions c
       WHERE c.quest_id = NEW.quest_id
         AND c.status = 'approved'
    ) THEN
      m := m * 1.5;
      reason := 'first_finisher';
    END IF;
  END IF;

  NEW.xp_awarded := round(base_xp * least(m, 3))::integer;
  NEW.xp_reason := reason;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION normalize_completion_on_insert() FROM PUBLIC, anon, authenticated;

-- ─── 4. Rewards read the stored award ───────────────────────────────────────

-- Same body as 038's apply_completion_rewards(uuid, uuid) except the XP comes
-- from completions.xp_awarded. level_from_xp (017) has the same thresholds as
-- the CASE 038 inlined.
CREATE OR REPLACE FUNCTION apply_completion_rewards(p_completion_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  award integer;
  new_xp integer;
  new_level integer;
  current_week text;
  previous_week text;
  last_week text;
  new_streak integer;
  new_longest integer;
  victoria_now timestamp;
BEGIN
  SELECT c.user_id, coalesce(c.xp_awarded, q.xp_reward, 0)
    INTO v_user_id, award
    FROM completions c
    LEFT JOIN quests q ON q.id = c.quest_id
   WHERE c.id = p_completion_id;

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE profiles
  SET total_xp = total_xp + award
  WHERE id = v_user_id
  RETURNING total_xp INTO new_xp;

  new_level := level_from_xp(new_xp);

  victoria_now := now() AT TIME ZONE 'America/Vancouver';
  current_week := to_char(victoria_now, 'IYYY-"W"IW');
  previous_week := to_char(date_trunc('week', victoria_now) - interval '7 days', 'IYYY-"W"IW');

  SELECT last_completion_week, current_streak, longest_streak
    INTO last_week, new_streak, new_longest
    FROM profiles
   WHERE id = v_user_id;

  IF last_week IS DISTINCT FROM current_week THEN
    IF last_week = previous_week THEN
      new_streak := new_streak + 1;
    ELSE
      new_streak := 1;
    END IF;

    IF new_streak > new_longest THEN
      new_longest := new_streak;
    END IF;
  END IF;

  UPDATE profiles
  SET
    level = new_level,
    current_streak = new_streak,
    longest_streak = new_longest,
    last_completion_week = current_week
  WHERE id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION apply_completion_rewards(uuid) FROM PUBLIC, anon, authenticated;

-- UPDATE path (017:96): moderation reinstate pays back the same stored award.
CREATE OR REPLACE FUNCTION award_xp_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    PERFORM apply_completion_rewards(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- INSERT path (017:110).
CREATE OR REPLACE FUNCTION apply_completion_rewards_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    PERFORM apply_completion_rewards(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION award_xp_on_approval() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION apply_completion_rewards_on_insert() FROM PUBLIC, anon, authenticated;

-- Nothing calls the old overload after the two wrappers above.
DROP FUNCTION IF EXISTS apply_completion_rewards(uuid, uuid);

-- ─── 5. Everything that sums XP uses the stored award ──────────────────────

-- 017:202. Removal subtracts what was actually paid.
CREATE OR REPLACE FUNCTION revoke_completion_rewards()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  quest_xp integer;
  new_xp integer;
BEGIN
  IF OLD.status = 'approved' AND NEW.status = 'removed' THEN
    SELECT coalesce(NEW.xp_awarded, q.xp_reward)
      INTO quest_xp
      FROM quests q
     WHERE q.id = NEW.quest_id;

    quest_xp := coalesce(quest_xp, NEW.xp_awarded, 0);

    UPDATE profiles
       SET total_xp = GREATEST(total_xp - quest_xp, 0)
     WHERE id = NEW.user_id
     RETURNING total_xp INTO new_xp;

    UPDATE profiles
       SET level = level_from_xp(new_xp)
     WHERE id = NEW.user_id;

    UPDATE completions
       SET redemption_code = NULL
     WHERE id = NEW.id
       AND redeemed_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION revoke_completion_rewards() FROM PUBLIC, anon, authenticated;

-- 031:130. Same columns and order; weekly_xp sums the stored award.
-- snapshot_last_week_ranks() reads this view, so it follows.
CREATE OR REPLACE VIEW leaderboard AS
SELECT
  p.id AS user_id,
  p.username,
  p.avatar_url,
  p.level,
  p.last_week_rank,
  COALESCE(sum(coalesce(c.xp_awarded, q.xp_reward)), 0)::integer AS weekly_xp
FROM profiles p
LEFT JOIN completions c
  ON c.user_id = p.id
 AND c.status = 'approved'
 AND c.reviewed_at >= (date_trunc('week', now() AT TIME ZONE 'America/Vancouver') AT TIME ZONE 'America/Vancouver')
LEFT JOIN quests q ON q.id = c.quest_id
GROUP BY p.id, p.username, p.avatar_url, p.level, p.last_week_rank
ORDER BY COALESCE(sum(coalesce(c.xp_awarded, q.xp_reward)), 0)::integer DESC;

REVOKE ALL ON leaderboard FROM anon, authenticated;
GRANT SELECT ON leaderboard TO anon, authenticated;

-- 040. Same body; the three XP reads (weekly XP, ranked players, best photo
-- order) use the stored award.
CREATE OR REPLACE FUNCTION own_week_recap(p_week_start date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
  this_monday date;
  week_from timestamptz;
  week_to timestamptz;
  own_xp integer := 0;
  own_quests integer := 0;
  own_rank integer;
  ranked_players integer := 0;
  cur_streak integer;
  last_week text;
  sel_label text;
  next_label text;
  streak integer;
  photo jsonb;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'own_week_recap requires a signed-in player';
  END IF;

  this_monday := date_trunc('week', now() AT TIME ZONE 'America/Vancouver')::date;

  IF p_week_start IS NULL
     OR (p_week_start <> this_monday AND p_week_start <> this_monday - 7) THEN
    RAISE EXCEPTION 'RECAP_WEEK_OUT_OF_RANGE'
      USING ERRCODE = 'invalid_parameter_value',
            HINT    = 'RECAP_WEEK_OUT_OF_RANGE';
  END IF;

  week_from := p_week_start::timestamp AT TIME ZONE 'America/Vancouver';
  week_to   := (p_week_start + 7)::timestamp AT TIME ZONE 'America/Vancouver';

  WITH xp AS (
    SELECT c.user_id,
           COALESCE(sum(coalesce(c.xp_awarded, q.xp_reward)), 0)::integer AS weekly_xp,
           count(*)::integer AS quests
      FROM completions c
      JOIN quests q ON q.id = c.quest_id
     WHERE c.status = 'approved'
       AND c.reviewed_at >= week_from
       AND c.reviewed_at <  week_to
     GROUP BY c.user_id
  ),
  ranked AS (
    SELECT user_id,
           row_number() OVER (ORDER BY weekly_xp DESC, user_id)::integer AS rnk
      FROM xp
     WHERE weekly_xp > 0
  )
  SELECT x.weekly_xp, x.quests, r.rnk
    INTO own_xp, own_quests, own_rank
    FROM xp x
    LEFT JOIN ranked r ON r.user_id = x.user_id
   WHERE x.user_id = uid;

  own_xp := COALESCE(own_xp, 0);
  own_quests := COALESCE(own_quests, 0);

  SELECT count(*)::integer
    INTO ranked_players
    FROM (
      SELECT c.user_id
        FROM completions c
        JOIN quests q ON q.id = c.quest_id
       WHERE c.status = 'approved'
         AND c.reviewed_at >= week_from
         AND c.reviewed_at <  week_to
       GROUP BY c.user_id
      HAVING COALESCE(sum(coalesce(c.xp_awarded, q.xp_reward)), 0) > 0
    ) players;

  SELECT current_streak, last_completion_week
    INTO cur_streak, last_week
    FROM profiles
   WHERE id = uid;

  sel_label  := to_char(p_week_start, 'IYYY-"W"IW');
  next_label := to_char(p_week_start + 7, 'IYYY-"W"IW');

  streak := CASE
    WHEN own_quests = 0 THEN 0
    WHEN last_week = sel_label THEN cur_streak
    WHEN last_week = next_label THEN GREATEST(cur_streak - 1, 1)
    ELSE NULL
  END;

  SELECT jsonb_build_object(
           'completion_id', c.id,
           'photo_url', c.photo_url,
           'quest_title', q.title,
           'category', q.category::text
         )
    INTO photo
    FROM completions c
    JOIN quests q ON q.id = c.quest_id
   WHERE c.user_id = uid
     AND c.status = 'approved'
     AND c.hidden_pending_review = false
     AND c.photo_url IS NOT NULL
     AND c.reviewed_at >= week_from
     AND c.reviewed_at <  week_to
   ORDER BY (SELECT count(*) FROM completion_likes l WHERE l.completion_id = c.id) DESC,
            coalesce(c.xp_awarded, q.xp_reward) DESC,
            c.completed_at DESC
   LIMIT 1;

  RETURN jsonb_build_object(
    'week_start', p_week_start,
    'starts_at', week_from,
    'ends_at', week_to,
    'in_progress', now() < week_to,
    'weekly_xp', own_xp,
    'quests_completed', own_quests,
    'rank', own_rank,
    'ranked_players', ranked_players,
    'streak_weeks', streak,
    'best_photo', photo
  );
END;
$$;

REVOKE ALL ON FUNCTION own_week_recap(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION own_week_recap(date) TO authenticated;

-- 041:259. Same body; the "XP this week > 0" test uses the stored award.
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
    HAVING COALESCE(sum(coalesce(c.xp_awarded, q.xp_reward)), 0) > 0
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

-- ─── 6. Client read: active boosts ──────────────────────────────────────────

-- Returns
--   { "events":   [{ "quest_id": uuid|null, "multiplier": n, "starts_at", "ends_at", "label" }],
--     "win_back": { "multiplier": n, "ends_at" } | null }
-- events: active multiplier rows that are global or for a quest the player
-- can currently see (status active, inside its window). win_back: the
-- caller's own oldest active, unconsumed row. No other player's rows.
CREATE OR REPLACE FUNCTION active_xp_boosts()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
  v_events jsonb;
  v_win_back jsonb;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'active_xp_boosts requires a signed-in player';
  END IF;

  SELECT coalesce(
           jsonb_agg(
             jsonb_build_object(
               'quest_id', e.quest_id,
               'multiplier', e.multiplier,
               'starts_at', e.starts_at,
               'ends_at', e.ends_at,
               'label', e.label
             )
             ORDER BY e.multiplier DESC, e.ends_at
           ),
           '[]'::jsonb
         )
    INTO v_events
    FROM xp_events e
    LEFT JOIN quests q ON q.id = e.quest_id
   WHERE e.kind = 'multiplier'
     AND e.user_id IS NULL
     AND e.starts_at <= now()
     AND e.ends_at > now()
     AND (
       e.quest_id IS NULL
       OR (
         q.status = 'active'
         AND (q.active_from IS NULL OR q.active_from <= now())
         AND (q.active_until IS NULL OR q.active_until > now())
       )
     );

  SELECT jsonb_build_object('multiplier', e.multiplier, 'ends_at', e.ends_at)
    INTO v_win_back
    FROM xp_events e
   WHERE e.kind = 'win_back'
     AND e.user_id = uid
     AND e.consumed_at IS NULL
     AND e.starts_at <= now()
     AND e.ends_at > now()
   ORDER BY e.created_at, e.id
   LIMIT 1;

  RETURN jsonb_build_object('events', v_events, 'win_back', v_win_back);
END;
$$;

REVOKE ALL ON FUNCTION active_xp_boosts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION active_xp_boosts() TO authenticated;

-- ─── 7. Reward read (038) adds the award ────────────────────────────────────

CREATE OR REPLACE FUNCTION own_completion_reward(p_completion_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'own_completion_reward requires a signed-in player';
  END IF;

  SELECT jsonb_build_object(
    'redemption_code', c.redemption_code,
    'redeemed_at', c.redeemed_at,
    'xp_awarded', c.xp_awarded,
    'xp_reason', c.xp_reason
  )
    INTO result
    FROM completions c
   WHERE c.id = p_completion_id
     AND c.user_id = auth.uid()
     AND c.status = 'approved';

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION own_completion_reward(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION own_completion_reward(uuid) TO authenticated;

-- ─── 8. Daily win-back ──────────────────────────────────────────────────────

-- One run per Victoria day, 17:00 local or later.
CREATE TABLE IF NOT EXISTS win_back_sends (
  local_date    date PRIMARY KEY,           -- America/Vancouver calendar day
  player_count  integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE win_back_sends ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE win_back_sends FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE win_back_sends TO service_role;

-- Targets players whose last approved completion is 10 to 60 days old, with a
-- push token, push_drops on, and no win_back row in the last 30 days. Each
-- gets a 7-day ×2 personal row and one push_outbox row. 041's sender gates
-- win_back on push_drops again at send time. Returns rows written.
CREATE OR REPLACE FUNCTION enqueue_win_back()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_local    timestamp := now() AT TIME ZONE 'America/Vancouver';
  v_day      date;
  v_inserted integer;
BEGIN
  -- Local-time guard: 17:00 or later in Victoria.
  IF extract(hour FROM v_local) < 17 THEN
    RETURN 0;
  END IF;

  v_day := v_local::date;

  INSERT INTO win_back_sends (local_date)
  VALUES (v_day)
  ON CONFLICT (local_date) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN
    RETURN 0;
  END IF;

  WITH lapsed AS (
    SELECT c.user_id
      FROM completions c
     WHERE c.status = 'approved'
     GROUP BY c.user_id
    HAVING max(c.completed_at) <= now() - interval '10 days'
       AND max(c.completed_at) >= now() - interval '60 days'
  ),
  targets AS (
    SELECT p.id AS user_id
      FROM profiles p
      JOIN lapsed l ON l.user_id = p.id
     WHERE p.push_token IS NOT NULL
       AND p.push_drops = true
       AND NOT EXISTS (
         SELECT 1 FROM xp_events e
          WHERE e.kind = 'win_back'
            AND e.user_id = p.id
            AND e.created_at > now() - interval '30 days'
       )
  ),
  granted AS (
    INSERT INTO xp_events (kind, multiplier, user_id, label, starts_at, ends_at, created_by)
    SELECT 'win_back', 2, t.user_id, 'Win-back', now(), now() + interval '7 days', 'cron'
      FROM targets t
    RETURNING user_id
  )
  INSERT INTO push_outbox (user_id, kind, title, body, data, dedupe_key)
  SELECT
    g.user_id,
    'win_back',
    'Quest!',
    'Victoria misses you. Double XP on your next quest this week.',
    jsonb_build_object('type', 'win_back', 'multiplier', 2),
    'win_back:' || v_day::text || ':' || g.user_id::text
  FROM granted g
  ON CONFLICT (dedupe_key) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  UPDATE win_back_sends
     SET player_count = v_inserted
   WHERE local_date = v_day;

  RETURN v_inserted;
END;
$$;

REVOKE EXECUTE ON FUNCTION enqueue_win_back() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION enqueue_win_back() TO service_role;

-- Same guard as 034/041: skip scheduling if pg_cron is not installed here; the
-- function can still be called by hand.
DO $$
DECLARE
  r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    FOR r IN
      SELECT jobid FROM cron.job
      WHERE jobname IN ('enqueue-win-back-0000', 'enqueue-win-back-0100')
    LOOP
      PERFORM cron.unschedule(r.jobid);
    END LOOP;

    -- 00:00 UTC = 17:00 PDT (16:00 PST: guard skips).
    PERFORM cron.schedule(
      'enqueue-win-back-0000',
      '0 0 * * *',
      'SELECT public.enqueue_win_back()'
    );
    -- 01:00 UTC = 17:00 PST (18:00 PDT: already ran today, no-op).
    PERFORM cron.schedule(
      'enqueue-win-back-0100',
      '0 1 * * *',
      'SELECT public.enqueue_win_back()'
    );
  END IF;
END;
$$;
