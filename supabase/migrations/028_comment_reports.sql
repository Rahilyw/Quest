-- 028: Comment reports + moderation (Apple Guideline 1.2 for comments)
--
-- Mirrors the post-report system from 018 for completion_comments (027):
-- immutable one-per-user reports, can't report your own comment, a 10/day
-- report budget shared with post reports, auto-hide at 3 distinct open
-- reporters, and an admin removal that sticks (removed_at) even after the
-- open reports are closed out.
--
-- Also closes a 027 hole: the "Users edit own comments" UPDATE policy let an
-- author flip their own `hidden` flag back to false. Clients may now only
-- update `body`.

-- ─── ENUM ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE comment_report_reason AS ENUM (
    'harassment',
    'hate',
    'inappropriate',
    'spam',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── COMMENTS: REPORT STATE ──────────────────────────────────────────────────

ALTER TABLE completion_comments
  ADD COLUMN IF NOT EXISTS open_report_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT;

CREATE INDEX IF NOT EXISTS idx_completion_comments_flagged
  ON completion_comments(open_report_count)
  WHERE open_report_count > 0;

-- Column-level lock (same pattern as 026 for profiles): moderation columns
-- are server-owned.
REVOKE UPDATE ON TABLE completion_comments FROM authenticated, anon;
GRANT UPDATE (body) ON TABLE completion_comments TO authenticated;

-- ─── COMMENT REPORTS ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS comment_reports (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id  UUID NOT NULL REFERENCES completion_comments(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason      comment_report_reason NOT NULL,
  details     TEXT CHECK (details IS NULL OR char_length(details) <= 500),
  status      report_status NOT NULL DEFAULT 'open',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (comment_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_reports_comment ON comment_reports(comment_id, status);
CREATE INDEX IF NOT EXISTS idx_comment_reports_reporter ON comment_reports(reporter_id, created_at);

ALTER TABLE comment_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own comment reports" ON comment_reports;
CREATE POLICY "Users insert own comment reports"
  ON comment_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    reporter_id = auth.uid()
    AND status = 'open'
    -- Subquery runs under the reporter's RLS: only comments they can see.
    AND EXISTS (
      SELECT 1 FROM completion_comments cc
      WHERE cc.id = comment_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM completion_comments cc
      WHERE cc.id = comment_id AND cc.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users read own comment reports" ON comment_reports;
CREATE POLICY "Users read own comment reports"
  ON comment_reports FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

-- ─── REPORT VALIDATION + SHARED RATE LIMIT ───────────────────────────────────

CREATE OR REPLACE FUNCTION enforce_comment_report_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_reports integer;
BEGIN
  IF EXISTS (
    SELECT 1 FROM completion_comments cc
    WHERE cc.id = NEW.comment_id AND cc.user_id = NEW.reporter_id
  ) THEN
    RAISE EXCEPTION 'CANNOT_REPORT_OWN'
      USING ERRCODE = 'check_violation',
            HINT   = 'CANNOT_REPORT_OWN';
  END IF;

  -- One daily budget across post + comment reports.
  SELECT
    (SELECT count(*) FROM completion_reports
      WHERE reporter_id = NEW.reporter_id
        AND created_at >= now() - interval '24 hours')
    +
    (SELECT count(*) FROM comment_reports
      WHERE reporter_id = NEW.reporter_id
        AND created_at >= now() - interval '24 hours')
  INTO recent_reports;

  IF recent_reports >= 10 THEN
    RAISE EXCEPTION 'REPORT_RATE_LIMITED'
      USING ERRCODE = 'check_violation',
            HINT   = 'REPORT_RATE_LIMITED';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_comment_report ON comment_reports;
CREATE TRIGGER trg_enforce_comment_report
  BEFORE INSERT ON comment_reports
  FOR EACH ROW
  EXECUTE FUNCTION enforce_comment_report_insert();

-- ─── COUNTERS + AUTO-HIDE (≥3 distinct open reporters) ───────────────────────
-- Fires on DELETE too (lesson from 023) so a reporter's account deletion
-- can't leave phantom counts. An admin removal (removed_at) keeps the comment
-- hidden regardless of open-report state.

CREATE OR REPLACE FUNCTION sync_comment_report_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comment_id UUID;
  v_open_count integer;
  v_distinct_open integer;
BEGIN
  v_comment_id := COALESCE(NEW.comment_id, OLD.comment_id);

  SELECT count(*)::integer, count(DISTINCT reporter_id)::integer
    INTO v_open_count, v_distinct_open
    FROM comment_reports
   WHERE comment_id = v_comment_id
     AND status = 'open';

  UPDATE completion_comments
     SET open_report_count = v_open_count,
         hidden = (removed_at IS NOT NULL) OR (v_distinct_open >= 3)
   WHERE id = v_comment_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_comment_report_counts ON comment_reports;
CREATE TRIGGER trg_sync_comment_report_counts
  AFTER INSERT OR UPDATE OF status OR DELETE ON comment_reports
  FOR EACH ROW
  EXECUTE FUNCTION sync_comment_report_counts();

-- ─── BLOCKS HIDE COMPLETIONS BOTH WAYS ───────────────────────────────────────
-- 018's feed policy never checked blocked_users, so a blocked user could still
-- open the blocker's profile grid and completion detail. The mobile feed only
-- filtered client-side for the blocker. is_blocked_pair() (027) is
-- SECURITY DEFINER so it sees blocks in both directions; it returns false
-- when auth.uid() is NULL and true for any probe about two other users, so
-- granting it to anon leaks nothing.

GRANT EXECUTE ON FUNCTION is_blocked_pair(UUID, UUID) TO anon;

DROP POLICY IF EXISTS "Anyone can read public feed completions" ON completions;
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
    AND NOT is_blocked_pair(auth.uid(), completions.user_id)
  );
