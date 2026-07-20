-- 026: Audit fixes — profile column locks, server-owned completed_at,
-- gps_accuracy buffer on geofence checks, leaderboard view +level/rank, indexes.
-- Live XP path remains 017 triggers; award-xp edge function is retired in config.

-- ─── A1: Lock profiles XP / level / streaks from client UPDATE ───────────────

REVOKE UPDATE ON TABLE profiles FROM authenticated, anon;
GRANT UPDATE (username, city, avatar_url, push_token, feed_public)
  ON TABLE profiles TO authenticated;

CREATE OR REPLACE FUNCTION protect_profile_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.total_xp := 0;
  NEW.level := 1;
  NEW.current_streak := 0;
  NEW.longest_streak := 0;
  NEW.last_completion_week := NULL;
  NEW.last_week_rank := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_insert ON profiles;
CREATE TRIGGER trg_protect_profile_insert
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profile_insert();

-- ─── A2 + A3: gps_accuracy column, server-owned completed_at, buffer on insert ─

ALTER TABLE completions
  ADD COLUMN IF NOT EXISTS gps_accuracy double precision;

CREATE OR REPLACE FUNCTION normalize_completion_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  recent_10min integer;
  recent_24h integer;
BEGIN
  -- Server owns the completion timestamp (blocks forged Early Bird / Night Owl / streaks)
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

  NEW.status      := 'approved';
  NEW.reviewed_at := now();

  IF EXISTS (
    SELECT 1 FROM quests WHERE id = NEW.quest_id AND is_sponsored = true
  ) THEN
    NEW.redemption_code := generate_redemption_code();
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_completion_geofence()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT check_completion_geofence(
    NEW.quest_id,
    NEW.lat,
    NEW.lng,
    COALESCE(NEW.gps_accuracy, 0)
  ) THEN
    RAISE EXCEPTION 'GEOFENCE_VIOLATION'
      USING ERRCODE = 'check_violation',
            HINT   = 'Submission coordinates are outside the quest geofence.';
  END IF;
  RETURN NEW;
END;
$$;

-- Report / moderation re-check: use stored accuracy, fallback 12m
CREATE OR REPLACE FUNCTION get_completion_geofence_evidence(p_completion_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_lat DOUBLE PRECISION;
  v_lng DOUBLE PRECISION;
  v_accuracy DOUBLE PRECISION;
  v_quest_id UUID;
  v_inside BOOLEAN;
  v_geofence_type geofence_type;
BEGIN
  SELECT c.lat, c.lng, c.gps_accuracy, c.quest_id, q.geofence_type
    INTO v_lat, v_lng, v_accuracy, v_quest_id, v_geofence_type
    FROM completions c
    JOIN quests q ON q.id = c.quest_id
   WHERE c.id = p_completion_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  v_inside := check_completion_geofence(
    v_quest_id,
    v_lat,
    v_lng,
    COALESCE(v_accuracy, 12)
  );

  RETURN jsonb_build_object(
    'found', true,
    'inside', v_inside,
    'lat', v_lat,
    'lng', v_lng,
    'gps_accuracy', v_accuracy,
    'geofence_type', v_geofence_type
  );
END;
$$;

-- ─── A6: Indexes for leaderboard / moderation ────────────────────────────────

CREATE INDEX IF NOT EXISTS completions_status_completed_at_idx
  ON completions (status, completed_at DESC);

CREATE INDEX IF NOT EXISTS completions_user_id_status_idx
  ON completions (user_id, status);

CREATE INDEX IF NOT EXISTS completions_status_reviewed_at_idx
  ON completions (status, reviewed_at DESC);

-- ─── A7: Leaderboard view exposes real level + last_week_rank ────────────────

CREATE OR REPLACE VIEW leaderboard AS
SELECT
  p.id AS user_id,
  p.username,
  p.avatar_url,
  p.level,
  p.last_week_rank,
  coalesce(sum(q.xp_reward), 0)::integer AS weekly_xp
FROM profiles p
LEFT JOIN completions c ON c.user_id = p.id
  AND c.status = 'approved'
  AND c.reviewed_at >= date_trunc('week', now())
LEFT JOIN quests q ON q.id = c.quest_id
GROUP BY p.id, p.username, p.avatar_url, p.level, p.last_week_rank
ORDER BY weekly_xp DESC;
