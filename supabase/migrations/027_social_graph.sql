-- 027: Social graph — likes, comments (1-level replies), follows
--
-- Completions are the social objects (no separate posts table). Visibility for
-- every interaction mirrors the feed RLS from 018: approved + not hidden +
-- owner feed_public, owner always sees their own, and blocked pairs see
-- nothing of each other. Account deletion (023) cascades through profiles.

-- ─── HELPERS ─────────────────────────────────────────────────────────────────

-- True when either user has blocked the other.
CREATE OR REPLACE FUNCTION is_blocked_pair(a UUID, b UUID)
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

-- Feed visibility for the calling user, bypassing completions RLS so it can be
-- used inside policies on interaction tables without recursion.
CREATE OR REPLACE FUNCTION can_view_completion(p_completion_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM completions c
      JOIN profiles p ON p.id = c.user_id
     WHERE c.id = p_completion_id
       AND (
         c.user_id = auth.uid()
         OR (
           c.status = 'approved'
           AND c.hidden_pending_review = false
           AND p.feed_public = true
           AND NOT is_blocked_pair(auth.uid(), c.user_id)
         )
       )
  );
$$;

REVOKE EXECUTE ON FUNCTION is_blocked_pair(UUID, UUID) FROM public, anon;
REVOKE EXECUTE ON FUNCTION can_view_completion(UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION is_blocked_pair(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_completion(UUID) TO authenticated;

-- ─── LIKES ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS completion_likes (
  completion_id UUID NOT NULL REFERENCES completions(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (completion_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_completion_likes_user ON completion_likes(user_id);

ALTER TABLE completion_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Likes visible on visible completions" ON completion_likes;
CREATE POLICY "Likes visible on visible completions"
  ON completion_likes FOR SELECT
  TO authenticated
  USING (
    can_view_completion(completion_id)
    AND NOT is_blocked_pair(auth.uid(), user_id)
  );

DROP POLICY IF EXISTS "Users like visible completions" ON completion_likes;
CREATE POLICY "Users like visible completions"
  ON completion_likes FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND can_view_completion(completion_id)
  );

DROP POLICY IF EXISTS "Users remove own likes" ON completion_likes;
CREATE POLICY "Users remove own likes"
  ON completion_likes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ─── COMMENTS ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS completion_comments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  completion_id UUID NOT NULL REFERENCES completions(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id     UUID REFERENCES completion_comments(id) ON DELETE CASCADE,
  body          TEXT NOT NULL CHECK (char_length(btrim(body)) >= 1 AND char_length(body) <= 500),
  hidden        BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_completion_comments_completion
  ON completion_comments(completion_id, created_at);
CREATE INDEX IF NOT EXISTS idx_completion_comments_user ON completion_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_completion_comments_parent ON completion_comments(parent_id);

-- Replies stay one level deep and on the same completion as their parent.
CREATE OR REPLACE FUNCTION enforce_comment_parent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_completion UUID;
  parent_parent UUID;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT completion_id, parent_id
      INTO parent_completion, parent_parent
      FROM completion_comments
     WHERE id = NEW.parent_id;

    IF parent_completion IS DISTINCT FROM NEW.completion_id THEN
      RAISE EXCEPTION 'COMMENT_PARENT_MISMATCH'
        USING ERRCODE = 'check_violation', HINT = 'COMMENT_PARENT_MISMATCH';
    END IF;

    IF parent_parent IS NOT NULL THEN
      RAISE EXCEPTION 'COMMENT_TOO_DEEP'
        USING ERRCODE = 'check_violation', HINT = 'COMMENT_TOO_DEEP';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_comment_parent ON completion_comments;
CREATE TRIGGER trg_enforce_comment_parent
  BEFORE INSERT ON completion_comments
  FOR EACH ROW
  EXECUTE FUNCTION enforce_comment_parent();

ALTER TABLE completion_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comments visible on visible completions" ON completion_comments;
CREATE POLICY "Comments visible on visible completions"
  ON completion_comments FOR SELECT
  TO authenticated
  USING (
    can_view_completion(completion_id)
    AND NOT is_blocked_pair(auth.uid(), user_id)
    AND (hidden = false OR user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users comment on visible completions" ON completion_comments;
CREATE POLICY "Users comment on visible completions"
  ON completion_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND hidden = false
    AND can_view_completion(completion_id)
  );

DROP POLICY IF EXISTS "Users edit own comments" ON completion_comments;
CREATE POLICY "Users edit own comments"
  ON completion_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own comments" ON completion_comments;
CREATE POLICY "Users delete own comments"
  ON completion_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ─── FOLLOWS ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS follows (
  follower_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Follow graph readable" ON follows;
CREATE POLICY "Follow graph readable"
  ON follows FOR SELECT
  TO authenticated
  USING (
    NOT is_blocked_pair(auth.uid(), follower_id)
    AND NOT is_blocked_pair(auth.uid(), following_id)
  );

DROP POLICY IF EXISTS "Users follow others" ON follows;
CREATE POLICY "Users follow others"
  ON follows FOR INSERT
  TO authenticated
  WITH CHECK (
    follower_id = auth.uid()
    AND NOT is_blocked_pair(follower_id, following_id)
  );

DROP POLICY IF EXISTS "Users unfollow" ON follows;
CREATE POLICY "Users unfollow"
  ON follows FOR DELETE
  TO authenticated
  USING (follower_id = auth.uid());

-- Blocking severs the follow relationship in both directions.
CREATE OR REPLACE FUNCTION remove_follows_on_block()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM follows
   WHERE (follower_id = NEW.blocker_id AND following_id = NEW.blocked_id)
      OR (follower_id = NEW.blocked_id AND following_id = NEW.blocker_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_remove_follows_on_block ON blocked_users;
CREATE TRIGGER trg_remove_follows_on_block
  AFTER INSERT ON blocked_users
  FOR EACH ROW
  EXECUTE FUNCTION remove_follows_on_block();
