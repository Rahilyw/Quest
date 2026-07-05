-- 016: Instant verification — auto-approve on insert, rewards on insert path,
-- in-DB redemption codes, rate limits, removal + XP revocation (Spec 02)

-- ─── STATUS ENUM ─────────────────────────────────────────────────────────────

ALTER TYPE completion_status ADD VALUE IF NOT EXISTS 'removed';

ALTER TABLE completions ADD COLUMN IF NOT EXISTS redeemed_at TIMESTAMPTZ;

-- ─── SHARED REWARD LOGIC (extracted from 006) ────────────────────────────────

CREATE OR REPLACE FUNCTION apply_completion_rewards(p_user_id UUID, p_quest_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

  current_week := to_char(now(), 'IYYY-"W"IW');
  previous_week := to_char(date_trunc('week', now())::date - interval '7 days', 'IYYY-"W"IW');

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

CREATE OR REPLACE FUNCTION level_from_xp(p_xp integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_xp >= 15000 THEN 10
    WHEN p_xp >= 11000 THEN 9
    WHEN p_xp >= 8000  THEN 8
    WHEN p_xp >= 5500  THEN 7
    WHEN p_xp >= 3500  THEN 6
    WHEN p_xp >= 2000  THEN 5
    WHEN p_xp >= 1000  THEN 4
    WHEN p_xp >= 500   THEN 3
    WHEN p_xp >= 200   THEN 2
    ELSE 1
  END;
$$;

-- UPDATE path: moderation re-instate (Spec 03) + legacy backfill of pending rows
CREATE OR REPLACE FUNCTION award_xp_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    PERFORM apply_completion_rewards(NEW.user_id, NEW.quest_id);
  END IF;
  RETURN NEW;
END;
$$;

-- INSERT path: normal instant-verification flow
CREATE OR REPLACE FUNCTION apply_completion_rewards_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    PERFORM apply_completion_rewards(NEW.user_id, NEW.quest_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_completion_rewards_on_insert ON completions;
CREATE TRIGGER trg_apply_completion_rewards_on_insert
  AFTER INSERT ON completions
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION apply_completion_rewards_on_insert();

-- ─── REDEMPTION CODE GENERATOR ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION generate_redemption_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, (floor(random() * length(chars))::integer + 1), 1);
  END LOOP;
  RETURN result;
END;
$$;

-- ─── AUTO-APPROVE + RATE LIMIT (BEFORE INSERT, after geofence gate) ──────────

CREATE OR REPLACE FUNCTION normalize_completion_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  recent_10min integer;
  recent_24h integer;
BEGIN
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

DROP TRIGGER IF EXISTS trg_normalize_completion ON completions;
CREATE TRIGGER trg_normalize_completion
  BEFORE INSERT ON completions
  FOR EACH ROW
  EXECUTE FUNCTION normalize_completion_on_insert();

-- ─── REWARD REVOCATION (Spec 03 moderation) ──────────────────────────────────

CREATE OR REPLACE FUNCTION revoke_completion_rewards()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  quest_xp integer;
  new_xp integer;
BEGIN
  IF OLD.status = 'approved' AND NEW.status = 'removed' THEN
    SELECT xp_reward INTO quest_xp FROM quests WHERE id = NEW.quest_id;

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

DROP TRIGGER IF EXISTS trg_revoke_completion_rewards ON completions;
CREATE TRIGGER trg_revoke_completion_rewards
  AFTER UPDATE ON completions
  FOR EACH ROW
  WHEN (OLD.status = 'approved' AND NEW.status = 'removed')
  EXECUTE FUNCTION revoke_completion_rewards();

-- ─── BACKFILL LEGACY PENDING ROWS ────────────────────────────────────────────

UPDATE completions
   SET status = 'approved',
       reviewed_at = COALESCE(reviewed_at, now())
 WHERE status = 'pending';
