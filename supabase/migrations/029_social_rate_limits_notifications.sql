-- 029: Social rate limits + activity inbox (notifications)
--
-- 027 shipped likes / comments / follows with no write throttles. This adds
-- per-user rate limits in the same style as 017 (BEFORE INSERT triggers that
-- raise check_violation with a HINT the client maps to copy), then an
-- in-app activity inbox fed entirely by triggers:
--
--   like    → completion owner        (inbox only, no push)
--   comment → completion owner        (push)
--   reply   → parent comment author   (push)
--   follow  → followed user           (push)
--
-- Push delivery is the `send-social-push` edge function, invoked by a Database
-- Webhook on INSERT into notifications (see LAUNCH-RUNBOOK.md). Nothing here
-- calls out over the network.

-- ─── RATE LIMITS ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_completion_comments_user_created
  ON completion_comments(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_completion_likes_user_created
  ON completion_likes(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_follows_follower_created
  ON follows(follower_id, created_at);

-- Comments: 10 per 10 minutes, 100 per 24 hours.
CREATE OR REPLACE FUNCTION enforce_comment_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM completion_comments
       WHERE user_id = NEW.user_id
         AND created_at >= now() - interval '10 minutes') >= 10
  OR (SELECT count(*) FROM completion_comments
       WHERE user_id = NEW.user_id
         AND created_at >= now() - interval '24 hours') >= 100
  THEN
    RAISE EXCEPTION 'COMMENT_RATE_LIMITED'
      USING ERRCODE = 'check_violation', HINT = 'COMMENT_RATE_LIMITED';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_comment_rate_limit ON completion_comments;
CREATE TRIGGER trg_enforce_comment_rate_limit
  BEFORE INSERT ON completion_comments
  FOR EACH ROW
  EXECUTE FUNCTION enforce_comment_rate_limit();

-- Likes: 120 per hour. Unlike deletes the row, so like/unlike toggling isn't
-- counted here — the inbox dedupe below keeps it from producing noise.
CREATE OR REPLACE FUNCTION enforce_like_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM completion_likes
       WHERE user_id = NEW.user_id
         AND created_at >= now() - interval '1 hour') >= 120
  THEN
    RAISE EXCEPTION 'LIKE_RATE_LIMITED'
      USING ERRCODE = 'check_violation', HINT = 'LIKE_RATE_LIMITED';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_like_rate_limit ON completion_likes;
CREATE TRIGGER trg_enforce_like_rate_limit
  BEFORE INSERT ON completion_likes
  FOR EACH ROW
  EXECUTE FUNCTION enforce_like_rate_limit();

-- Follows: 60 per hour, 200 per 24 hours.
CREATE OR REPLACE FUNCTION enforce_follow_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM follows
       WHERE follower_id = NEW.follower_id
         AND created_at >= now() - interval '1 hour') >= 60
  OR (SELECT count(*) FROM follows
       WHERE follower_id = NEW.follower_id
         AND created_at >= now() - interval '24 hours') >= 200
  THEN
    RAISE EXCEPTION 'FOLLOW_RATE_LIMITED'
      USING ERRCODE = 'check_violation', HINT = 'FOLLOW_RATE_LIMITED';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_follow_rate_limit ON follows;
CREATE TRIGGER trg_enforce_follow_rate_limit
  BEFORE INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION enforce_follow_rate_limit();

-- ─── PROFILE PREFERENCE ──────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS push_social BOOLEAN NOT NULL DEFAULT true;

-- Re-issue 026's column allow-list with the new preference.
REVOKE UPDATE ON TABLE profiles FROM authenticated, anon;
GRANT UPDATE (username, city, avatar_url, push_token, feed_public, push_social)
  ON TABLE profiles TO authenticated;

-- ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE social_notification_type AS ENUM ('like', 'comment', 'reply', 'follow');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type          social_notification_type NOT NULL,
  completion_id UUID REFERENCES completions(id) ON DELETE CASCADE,
  comment_id    UUID REFERENCES completion_comments(id) ON DELETE CASCADE,
  read_at       TIMESTAMPTZ,
  pushed_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (recipient_id <> actor_id),
  CHECK (
    (type = 'follow'  AND completion_id IS NULL     AND comment_id IS NULL) OR
    (type = 'like'    AND completion_id IS NOT NULL AND comment_id IS NULL) OR
    (type IN ('comment', 'reply') AND completion_id IS NOT NULL AND comment_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient
  ON notifications(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications(recipient_id)
  WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_pushed
  ON notifications(recipient_id, pushed_at)
  WHERE pushed_at IS NOT NULL;

-- One like notification per (actor, completion) and one follow notification
-- per actor: re-liking or unfollow→refollow never stacks or re-pushes.
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_like
  ON notifications(recipient_id, actor_id, completion_id)
  WHERE type = 'like';
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_follow
  ON notifications(recipient_id, actor_id)
  WHERE type = 'follow';

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Recipients see their own inbox, minus anything from a blocked pair and any
-- comment they can no longer see (hidden by reports, removed by an admin, or
-- on a completion that left the feed). The comment subquery runs under the
-- recipient's own completion_comments RLS.
DROP POLICY IF EXISTS "Recipients read own notifications" ON notifications;
CREATE POLICY "Recipients read own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    recipient_id = auth.uid()
    AND NOT is_blocked_pair(auth.uid(), actor_id)
    AND (
      comment_id IS NULL
      OR EXISTS (SELECT 1 FROM completion_comments cc WHERE cc.id = comment_id)
    )
  );

DROP POLICY IF EXISTS "Recipients mark own notifications read" ON notifications;
CREATE POLICY "Recipients mark own notifications read"
  ON notifications FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Recipients clear own notifications" ON notifications;
CREATE POLICY "Recipients clear own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (recipient_id = auth.uid());

-- No client INSERT policy: rows are written only by the triggers below.
REVOKE UPDATE ON TABLE notifications FROM authenticated, anon;
GRANT UPDATE (read_at) ON TABLE notifications TO authenticated;

-- ─── FAN-OUT TRIGGERS ────────────────────────────────────────────────────────

-- Direct block check (no auth.uid() dependency, unlike is_blocked_pair).
CREATE OR REPLACE FUNCTION social_pair_blocked(a UUID, b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = a AND blocked_id = b)
       OR (blocker_id = b AND blocked_id = a)
  );
$$;

CREATE OR REPLACE FUNCTION notify_on_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Unlike retracts the inbox row (likes never push, so nothing to undo).
    DELETE FROM notifications
     WHERE type = 'like'
       AND actor_id = OLD.user_id
       AND completion_id = OLD.completion_id;
    RETURN OLD;
  END IF;

  SELECT user_id INTO v_owner FROM completions WHERE id = NEW.completion_id;

  IF v_owner IS NULL OR v_owner = NEW.user_id OR social_pair_blocked(v_owner, NEW.user_id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (recipient_id, actor_id, type, completion_id)
  VALUES (v_owner, NEW.user_id, 'like', NEW.completion_id)
  ON CONFLICT (recipient_id, actor_id, completion_id) WHERE type = 'like' DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_like ON completion_likes;
CREATE TRIGGER trg_notify_on_like
  AFTER INSERT OR DELETE ON completion_likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_like();

CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
  v_parent_author UUID;
BEGIN
  SELECT user_id INTO v_owner FROM completions WHERE id = NEW.completion_id;

  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO v_parent_author FROM completion_comments WHERE id = NEW.parent_id;

    IF v_parent_author IS NOT NULL
       AND v_parent_author <> NEW.user_id
       AND NOT social_pair_blocked(v_parent_author, NEW.user_id) THEN
      INSERT INTO notifications (recipient_id, actor_id, type, completion_id, comment_id)
      VALUES (v_parent_author, NEW.user_id, 'reply', NEW.completion_id, NEW.id);
    END IF;
  END IF;

  -- The post owner hears about every comment on their completion, unless
  -- they already got this one as a reply to their own comment.
  IF v_owner IS NOT NULL
     AND v_owner <> NEW.user_id
     AND v_owner IS DISTINCT FROM v_parent_author
     AND NOT social_pair_blocked(v_owner, NEW.user_id) THEN
    INSERT INTO notifications (recipient_id, actor_id, type, completion_id, comment_id)
    VALUES (v_owner, NEW.user_id, 'comment', NEW.completion_id, NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_comment ON completion_comments;
CREATE TRIGGER trg_notify_on_comment
  AFTER INSERT ON completion_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_comment();

-- Follow notifications are kept on unfollow, so unfollow→refollow is a no-op
-- instead of a second push.
CREATE OR REPLACE FUNCTION notify_on_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF social_pair_blocked(NEW.following_id, NEW.follower_id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (recipient_id, actor_id, type)
  VALUES (NEW.following_id, NEW.follower_id, 'follow')
  ON CONFLICT (recipient_id, actor_id) WHERE type = 'follow' DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_follow ON follows;
CREATE TRIGGER trg_notify_on_follow
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_follow();

-- Trigger/helper functions run as table owner; nobody needs them over RPC.
REVOKE EXECUTE ON FUNCTION enforce_comment_rate_limit() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION enforce_like_rate_limit() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION enforce_follow_rate_limit() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION social_pair_blocked(UUID, UUID) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION notify_on_like() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION notify_on_comment() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION notify_on_follow() FROM public, anon, authenticated;
