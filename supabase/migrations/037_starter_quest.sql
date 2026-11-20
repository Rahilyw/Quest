-- 037: designate exactly one active, currently available starter quest.

ALTER TABLE quests
  ADD COLUMN IF NOT EXISTS is_starter BOOLEAN NOT NULL DEFAULT false;

-- The starter should be the existing anywhere journal quest from the pilot seed.
-- Clear first so this migration is safe to re-run against a partially migrated DB.
UPDATE quests SET is_starter = false WHERE is_starter;

UPDATE quests
   SET is_starter = true
 WHERE id = (
   SELECT id
     FROM quests
    WHERE lower(btrim(title)) = lower('Write a Journal Entry About Your City')
      AND geofence_type = 'none'
      AND status = 'active'
      AND (active_from IS NULL OR active_from <= now())
      AND (active_until IS NULL OR active_until > now())
    ORDER BY created_at, id
    LIMIT 1
 );

CREATE UNIQUE INDEX IF NOT EXISTS quests_one_active_starter_idx
  ON quests (is_starter)
  WHERE is_starter AND status = 'active';

-- Admins use this service-role-only transaction to move the starter designation.
-- The advisory lock serializes competing admin requests; clear-before-set satisfies
-- the partial unique index while remaining atomic to all other transactions.
CREATE OR REPLACE FUNCTION set_starter_quest(p_quest_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target quests%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'set_starter_quest is server-only';
  END IF;

  PERFORM pg_advisory_xact_lock(782391, 37);

  SELECT * INTO target
    FROM quests
   WHERE id = p_quest_id
   FOR UPDATE;

  IF NOT FOUND OR target.status <> 'active' THEN
    RAISE EXCEPTION 'Choose an active quest';
  END IF;
  IF target.active_from IS NOT NULL AND target.active_from > now() THEN
    RAISE EXCEPTION 'The starter quest must already be live';
  END IF;
  IF target.active_until IS NOT NULL AND target.active_until <= now() THEN
    RAISE EXCEPTION 'The starter quest has ended';
  END IF;

  UPDATE quests
     SET is_starter = false
   WHERE is_starter AND id <> p_quest_id;

  UPDATE quests
     SET is_starter = true
   WHERE id = p_quest_id;
END;
$$;

REVOKE ALL ON FUNCTION set_starter_quest(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION set_starter_quest(UUID) TO service_role;
