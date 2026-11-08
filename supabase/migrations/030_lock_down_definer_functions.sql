-- 030: Harden SECURITY DEFINER functions flagged in the Nov 2026 audit.
--
-- 1. apply_completion_rewards(uuid, uuid) grants XP/level/streak and had no
--    REVOKE, so Postgres' default EXECUTE-to-PUBLIC let any signed-in client
--    call it via PostgREST RPC with their own id and mint unlimited XP.
--    It is only ever called from the insert triggers (which run as the
--    function owner), so no client role needs it.
-- 2. get_completion_geofence_evidence(uuid) returns a user's raw GPS
--    coordinates with no caller check. Restrict to service_role (admin app).
-- 3. Pin search_path on older SECURITY DEFINER functions that never set one.
--    `extensions` is included because PostGIS may be installed there on
--    Supabase; pg_temp comes last so temp objects can't shadow anything.

REVOKE EXECUTE ON FUNCTION apply_completion_rewards(UUID, UUID) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION get_completion_geofence_evidence(UUID) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION get_completion_geofence_evidence(UUID) TO service_role;

ALTER FUNCTION check_badges_on_xp_update()                SET search_path = public, extensions, pg_temp;
ALTER FUNCTION award_xp_on_approval()                     SET search_path = public, extensions, pg_temp;
ALTER FUNCTION check_completion_geofence(UUID, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION)
                                                          SET search_path = public, extensions, pg_temp;
ALTER FUNCTION enforce_completion_geofence()              SET search_path = public, extensions, pg_temp;
ALTER FUNCTION get_city_boundary_geojson(TEXT)            SET search_path = public, extensions, pg_temp;
ALTER FUNCTION set_quest_boundary(UUID, JSONB)            SET search_path = public, extensions, pg_temp;
ALTER FUNCTION apply_completion_rewards(UUID, UUID)       SET search_path = public, extensions, pg_temp;
ALTER FUNCTION apply_completion_rewards_on_insert()       SET search_path = public, extensions, pg_temp;
ALTER FUNCTION normalize_completion_on_insert()           SET search_path = public, extensions, pg_temp;
ALTER FUNCTION revoke_completion_rewards()                SET search_path = public, extensions, pg_temp;
ALTER FUNCTION enforce_completion_report_insert()         SET search_path = public, extensions, pg_temp;
ALTER FUNCTION sync_completion_report_counts()            SET search_path = public, extensions, pg_temp;
ALTER FUNCTION get_completion_geofence_evidence(UUID)     SET search_path = public, extensions, pg_temp;
ALTER FUNCTION replace_quest_geofences(UUID, JSONB)       SET search_path = public, extensions, pg_temp;
