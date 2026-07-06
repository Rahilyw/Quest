-- 018: Reports, blocking, feed privacy (Spec 03)

-- ─── ENUMS ───────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE report_reason AS ENUM (
    'not_at_location',
    'photo_mismatch',
    'inappropriate',
    'spam',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('open', 'dismissed', 'actioned');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── PROFILES: FEED PRIVACY ──────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS feed_public BOOLEAN NOT NULL DEFAULT true;

-- ─── COMPLETIONS: REPORT STATE ─────────────────────────────────────────────

ALTER TABLE completions
  ADD COLUMN IF NOT EXISTS open_report_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hidden_pending_review BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT;

-- ─── COMPLETION REPORTS ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS completion_reports (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  completion_id UUID NOT NULL REFERENCES completions(id) ON DELETE CASCADE,
  reporter_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason        report_reason NOT NULL,
  details       TEXT CHECK (details IS NULL OR char_length(details) <= 500),
  status        report_status NOT NULL DEFAULT 'open',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (completion_id, reporter_id)
);

ALTER TABLE completion_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own reports" ON completion_reports;
CREATE POLICY "Users insert own reports"
  ON completion_reports FOR INSERT
  WITH CHECK (
    reporter_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM completions c
      WHERE c.id = completion_id AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users read own reports" ON completion_reports;
CREATE POLICY "Users read own reports"
  ON completion_reports FOR SELECT
  USING (reporter_id = auth.uid());

-- ─── BLOCKED USERS ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS blocked_users (
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own blocks" ON blocked_users;
CREATE POLICY "Users manage own blocks"
  ON blocked_users FOR ALL
  USING (blocker_id = auth.uid())
  WITH CHECK (blocker_id = auth.uid());

-- ─── REPORT VALIDATION + RATE LIMIT ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION enforce_completion_report_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  recent_reports integer;
BEGIN
  IF EXISTS (
    SELECT 1 FROM completions c
    WHERE c.id = NEW.completion_id AND c.user_id = NEW.reporter_id
  ) THEN
    RAISE EXCEPTION 'CANNOT_REPORT_OWN'
      USING ERRCODE = 'check_violation',
            HINT   = 'CANNOT_REPORT_OWN';
  END IF;

  SELECT count(*)::integer INTO recent_reports
    FROM completion_reports
   WHERE reporter_id = NEW.reporter_id
     AND created_at >= now() - interval '24 hours';

  IF recent_reports >= 10 THEN
    RAISE EXCEPTION 'REPORT_RATE_LIMITED'
      USING ERRCODE = 'check_violation',
            HINT   = 'REPORT_RATE_LIMITED';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_completion_report ON completion_reports;
CREATE TRIGGER trg_enforce_completion_report
  BEFORE INSERT ON completion_reports
  FOR EACH ROW
  EXECUTE FUNCTION enforce_completion_report_insert();

-- ─── REPORT COUNTERS + AUTO-HIDE (≥3 distinct open reporters) ───────────────

CREATE OR REPLACE FUNCTION sync_completion_report_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_completion_id UUID;
  v_open_count integer;
  v_distinct_open integer;
BEGIN
  v_completion_id := COALESCE(NEW.completion_id, OLD.completion_id);

  SELECT count(*)::integer INTO v_open_count
    FROM completion_reports
   WHERE completion_id = v_completion_id
     AND status = 'open';

  SELECT count(DISTINCT reporter_id)::integer INTO v_distinct_open
    FROM completion_reports
   WHERE completion_id = v_completion_id
     AND status = 'open';

  UPDATE completions
     SET open_report_count = v_open_count,
         hidden_pending_review = (v_distinct_open >= 3)
   WHERE id = v_completion_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_completion_report_counts ON completion_reports;
CREATE TRIGGER trg_sync_completion_report_counts
  AFTER INSERT OR UPDATE OF status ON completion_reports
  FOR EACH ROW
  EXECUTE FUNCTION sync_completion_report_counts();

-- ─── FEED RLS (public feed excludes hidden + non-public profiles) ──────────────

DROP POLICY IF EXISTS "Anyone can read approved completions" ON completions;

CREATE POLICY "Anyone can read public feed completions"
  ON completions FOR SELECT
  USING (
    status = 'approved'
    AND hidden_pending_review = false
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = completions.user_id
        AND p.feed_public = true
    )
  );

-- ─── ADMIN GPS EVIDENCE (moderation queue) ───────────────────────────────────

CREATE OR REPLACE FUNCTION get_completion_geofence_evidence(p_completion_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_lat DOUBLE PRECISION;
  v_lng DOUBLE PRECISION;
  v_quest_id UUID;
  v_inside BOOLEAN;
  v_geofence_type geofence_type;
BEGIN
  SELECT c.lat, c.lng, c.quest_id, q.geofence_type
    INTO v_lat, v_lng, v_quest_id, v_geofence_type
    FROM completions c
    JOIN quests q ON q.id = c.quest_id
   WHERE c.id = p_completion_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  v_inside := check_completion_geofence(v_quest_id, v_lat, v_lng, 12);

  RETURN jsonb_build_object(
    'found', true,
    'inside', v_inside,
    'lat', v_lat,
    'lng', v_lng,
    'geofence_type', v_geofence_type
  );
END;
$$;
