-- 038: Stop public reads of sponsor codes and proof coordinates.
--
-- Completions SELECT policies (own rows, and the public feed policy from 028)
-- are row-level. With the default table SELECT grant, anon and authenticated
-- could read redemption_code, lat, lng and gps_accuracy on every visible row.
-- The anon key ships in the app, so that is a live query, not a theoretical one.
--
-- A column-level REVOKE does not remove a table-level SELECT grant, and
-- Supabase grants SELECT on the whole table to anon and authenticated. Drop
-- that table grant, then grant back every column except the secrets and
-- reviewed_by (an admin email). A later migration that adds a completions
-- column must GRANT SELECT on that column to anon/authenticated or client
-- reads of it fail closed.
--
-- Owners read their own code through the functions below. service_role
-- (admin, merchant redeem) keeps table-level SELECT.
-- The Nov 10, 2026 launch runbook reports this migration applied to the hosted
-- Quest project. Re-verify that operational state before future deployment work.

REVOKE SELECT ON TABLE completions FROM PUBLIC, anon, authenticated;

GRANT SELECT (
  id,
  user_id,
  quest_id,
  photo_url,
  selfie_url,
  completed_at,
  status,
  reviewed_at,
  created_at,
  redeemed_at,
  open_report_count,
  hidden_pending_review
) ON TABLE completions TO anon, authenticated;

GRANT SELECT ON TABLE completions TO service_role;

-- 026 overwrites redemption_code only for sponsored quests, so a client could
-- store an arbitrary code on any other completion. Clear it.
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

  SELECT is_sponsored INTO sponsored FROM quests WHERE id = NEW.quest_id;
  IF sponsored THEN
    NEW.redemption_code := generate_redemption_code();
  ELSE
    NEW.redemption_code := NULL;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION normalize_completion_on_insert() FROM PUBLIC, anon, authenticated;

-- Streak weeks were session time (UTC on Supabase). Leaderboard week (031) and
-- badge windows already use America/Vancouver. Existing last_completion_week
-- values stay as stored UTC labels, so the next completion after this migration
-- can reset a streak once if those labels disagree.
CREATE OR REPLACE FUNCTION apply_completion_rewards(p_user_id UUID, p_quest_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  quest_xp integer;
  new_xp integer;
  new_level integer;
  current_week text;
  previous_week text;
  last_week text;
  new_streak integer;
  new_longest integer;
  victoria_now timestamp;
BEGIN
  SELECT xp_reward INTO quest_xp FROM quests WHERE id = p_quest_id;

  UPDATE profiles
  SET total_xp = total_xp + quest_xp
  WHERE id = p_user_id
  RETURNING total_xp INTO new_xp;

  new_level := CASE
    WHEN new_xp >= 15000 THEN 10
    WHEN new_xp >= 11000 THEN 9
    WHEN new_xp >= 8000  THEN 8
    WHEN new_xp >= 5500  THEN 7
    WHEN new_xp >= 3500  THEN 6
    WHEN new_xp >= 2000  THEN 5
    WHEN new_xp >= 1000  THEN 4
    WHEN new_xp >= 500   THEN 3
    WHEN new_xp >= 200   THEN 2
    ELSE 1
  END;

  victoria_now := now() AT TIME ZONE 'America/Vancouver';
  current_week := to_char(victoria_now, 'IYYY-"W"IW');
  previous_week := to_char(date_trunc('week', victoria_now) - interval '7 days', 'IYYY-"W"IW');

  SELECT last_completion_week, current_streak, longest_streak
    INTO last_week, new_streak, new_longest
    FROM profiles
   WHERE id = p_user_id;

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
  WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION apply_completion_rewards(UUID, UUID) FROM PUBLIC, anon, authenticated;

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
    'redeemed_at', c.redeemed_at
  )
    INTO result
    FROM completions c
   WHERE c.id = p_completion_id
     AND c.user_id = auth.uid()
     AND c.status = 'approved';

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION own_reward_codes()
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
    RAISE EXCEPTION 'own_reward_codes requires a signed-in player';
  END IF;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'redemption_code', c.redemption_code,
        'redeemed_at', c.redeemed_at,
        'title', q.title,
        'sponsor_reward', q.sponsor_reward
      )
      ORDER BY (c.redeemed_at IS NOT NULL), c.completed_at DESC
    ),
    '[]'::jsonb
  )
    INTO result
    FROM completions c
    JOIN quests q ON q.id = c.quest_id
   WHERE c.user_id = auth.uid()
     AND c.status = 'approved'
     AND c.redemption_code IS NOT NULL
     AND q.is_sponsored = true;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION own_completion_reward(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION own_reward_codes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION own_completion_reward(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION own_reward_codes() TO authenticated;
