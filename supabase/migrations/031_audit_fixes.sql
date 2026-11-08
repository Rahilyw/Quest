-- 031: Fixes from the Nov 2026 codebase audit (Supabase security + performance advisors).
--
-- 1. Weekly rank snapshot. profiles.last_week_rank was never written: the snapshot-ranks
--    edge function had no schedule (pg_cron was not installed), so rank deltas on the
--    leaderboard never showed. Replace it with a SQL function scheduled by pg_cron. No
--    service-role key is needed because it runs inside the database.
-- 2. Pin search_path on the five functions the advisor still flags.
-- 3. Revoke EXECUTE on trigger-only and internal definer functions from client roles.
--    Triggers don't check EXECUTE at fire time, so this changes nothing for the app; it
--    only removes them from the public RPC surface.
-- 4. Index foreign keys the advisor flags as unindexed. completions(quest_id, completed_at)
--    also backs the "Photos from here" query on the quest page (docs/design/BRAND.md §7).
-- 5. Wrap auth.uid() in RLS policies as (SELECT auth.uid()) so Postgres evaluates it once
--    per query instead of once per row (advisor lint 0003).
-- 6. Leaderboard week in Victoria time. The view used date_trunc('week', now()) in UTC, so
--    the week reset at Sunday 4 or 5 pm Pacific while the app counts days left in local
--    time and PRODUCT.md promises "Sunday night settles the score". Also drop the write
--    grants client roles had on the view (it isn't updatable; SELECT is all they need).

-- ─── 1. Weekly rank snapshot ────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION snapshot_last_week_ranks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  n integer;
BEGIN
  WITH ranked AS (
    SELECT user_id, row_number() OVER (ORDER BY weekly_xp DESC, user_id) AS rnk
    FROM leaderboard
  )
  UPDATE profiles p
     SET last_week_rank = r.rnk
    FROM ranked r
   WHERE p.id = r.user_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE EXECUTE ON FUNCTION snapshot_last_week_ranks() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION snapshot_last_week_ranks() TO service_role;

-- pg_cron runs in UTC. 06:55 UTC Monday is Sunday 23:55 PDT / 22:55 PST: always just before
-- the Victoria week resets at Monday 00:00 local (see section 6).
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'snapshot-last-week-ranks';
SELECT cron.schedule('snapshot-last-week-ranks', '55 6 * * 1', 'SELECT public.snapshot_last_week_ranks()');

-- ─── 2. Pin search_path ─────────────────────────────────────────────────────────────────

ALTER FUNCTION level_from_xp(integer) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION quest_boundary_geojson(geography) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION generate_redemption_code() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION protect_profile_insert() SET search_path = public, extensions, pg_temp;
ALTER FUNCTION evaluate_badge_unlock(text, jsonb, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, integer, boolean, integer)
  SET search_path = public, extensions, pg_temp;

-- ─── 3. Trim the RPC surface ────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION apply_completion_rewards_on_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION award_xp_on_approval() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION check_badges_on_xp_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION enforce_comment_report_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION enforce_completion_geofence() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION enforce_completion_report_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION normalize_completion_on_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION revoke_completion_rewards() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION sync_comment_report_counts() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION sync_completion_report_counts() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION protect_profile_insert() FROM PUBLIC, anon, authenticated;
-- Only called from the geofence trigger (which runs as the owner); clients check zones
-- locally with @quest/geofence.
REVOKE EXECUTE ON FUNCTION check_completion_geofence(uuid, double precision, double precision, double precision)
  FROM PUBLIC, anon, authenticated;

-- ─── 4. Foreign-key indexes ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS blocked_users_blocked_id_idx ON blocked_users (blocked_id);
CREATE INDEX IF NOT EXISTS completion_reports_reporter_id_idx ON completion_reports (reporter_id);
CREATE INDEX IF NOT EXISTS completions_quest_id_completed_at_idx ON completions (quest_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS notifications_actor_id_idx ON notifications (actor_id);
CREATE INDEX IF NOT EXISTS notifications_comment_id_idx ON notifications (comment_id);
CREATE INDEX IF NOT EXISTS notifications_completion_id_idx ON notifications (completion_id);
CREATE INDEX IF NOT EXISTS quest_badges_badge_id_idx ON quest_badges (badge_id);
CREATE INDEX IF NOT EXISTS quests_city_id_idx ON quests (city_id);
CREATE INDEX IF NOT EXISTS user_badges_badge_id_idx ON user_badges (badge_id);

-- ─── 5. Evaluate auth.uid() once per query in RLS ───────────────────────────────────────

DO $$
DECLARE
  pol record;
  wrapped constant text := '( SELECT auth.uid() AS uid)';
  marker constant text := '__QUEST_WRAPPED_UID__';
  new_qual text;
  new_check text;
  stmt text;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (replace(coalesce(qual, ''), wrapped, '') LIKE '%auth.uid()%'
        OR replace(coalesce(with_check, ''), wrapped, '') LIKE '%auth.uid()%')
  LOOP
    new_qual := replace(replace(replace(pol.qual, wrapped, marker), 'auth.uid()', wrapped), marker, wrapped);
    new_check := replace(replace(replace(pol.with_check, wrapped, marker), 'auth.uid()', wrapped), marker, wrapped);
    stmt := format('ALTER POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    IF new_qual IS NOT NULL THEN
      stmt := stmt || ' USING (' || new_qual || ')';
    END IF;
    IF new_check IS NOT NULL THEN
      stmt := stmt || ' WITH CHECK (' || new_check || ')';
    END IF;
    EXECUTE stmt;
  END LOOP;
END;
$$;

-- ─── 6. Leaderboard week in Victoria time ───────────────────────────────────────────────
-- Stays a definer view on purpose: weekly XP must count every player's completions,
-- including ones hidden from the caller by feed privacy or blocks. It exposes only
-- username, avatar, level and XP.

CREATE OR REPLACE VIEW leaderboard AS
SELECT
  p.id AS user_id,
  p.username,
  p.avatar_url,
  p.level,
  p.last_week_rank,
  COALESCE(sum(q.xp_reward), 0)::integer AS weekly_xp
FROM profiles p
LEFT JOIN completions c
  ON c.user_id = p.id
 AND c.status = 'approved'
 AND c.reviewed_at >= (date_trunc('week', now() AT TIME ZONE 'America/Vancouver') AT TIME ZONE 'America/Vancouver')
LEFT JOIN quests q ON q.id = c.quest_id
GROUP BY p.id, p.username, p.avatar_url, p.level, p.last_week_rank
ORDER BY COALESCE(sum(q.xp_reward), 0)::integer DESC;

REVOKE ALL ON leaderboard FROM anon, authenticated;
GRANT SELECT ON leaderboard TO anon, authenticated;
