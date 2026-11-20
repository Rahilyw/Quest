-- 039: Stop client reads of other players' Expo push tokens (audit SEC-01).
--
-- The profiles SELECT policy from the initial schema is USING (true) with no
-- role, so it applies to anon as well as authenticated. With the default
-- table-level SELECT grant, anyone holding the anon key (it ships in the app)
-- could read push_token on every profile row.
--
-- A column-level REVOKE does not remove a table-level SELECT grant. Same shape
-- as 038 for completions: drop the table grant, then grant back every column
-- except push_token. Row policies are unchanged, so public profile fields stay
-- readable exactly as before.
--
-- Consequences to plan for:
--   * `select=*` on profiles from a client role now fails with 42501. The
--     mobile app in this checkout selects explicit columns (lib/profiles.ts
--     PROFILE_COLUMNS). Any older build that still sends `select=*` cannot load
--     its profile once this is applied. Ship the client first.
--   * A later migration that adds a profiles column must GRANT SELECT on it to
--     anon/authenticated, or client reads of that column fail closed.
--   * service_role keeps table-level SELECT, so send-social-push,
--     send-push-outbox, enqueue_weekly_drop() (definer) and the admin app read
--     tokens as before. The leaderboard view is a definer view and does not
--     select push_token.
--
-- Writes are unchanged: authenticated keeps UPDATE (push_token) from 029, and
-- the row policy still limits UPDATE to auth.uid() = id, so a player can
-- register or clear only their own token. UPDATE ... RETURNING push_token is
-- refused because RETURNING needs SELECT on the column.
--
-- This file changes nothing on a hosted database until an owner applies it.

REVOKE SELECT ON TABLE profiles FROM PUBLIC, anon, authenticated;

GRANT SELECT (
  id,
  username,
  city,
  total_xp,
  level,
  avatar_url,
  created_at,
  current_streak,
  longest_streak,
  last_completion_week,
  last_week_rank,
  feed_public,
  push_social,
  push_drops
) ON TABLE profiles TO anon, authenticated;

GRANT SELECT ON TABLE profiles TO service_role;

-- Settings shows whether this account has push turned on. It needs a yes/no
-- for the caller only, never the token itself and never another player's row.
CREATE OR REPLACE FUNCTION own_push_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM profiles
     WHERE id = (SELECT auth.uid())
       AND push_token IS NOT NULL
  );
$$;

REVOKE ALL ON FUNCTION own_push_enabled() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION own_push_enabled() TO authenticated;
