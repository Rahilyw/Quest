-- 046: Storage and push-token hardening (security review, card Z, approved as DZ-2).
--
-- Requires: the baseline, 023, 032, 033, 037 and 039. It does not depend on
-- 041-045, and they do not depend on it. The owner applies it before TestFlight
-- build #1, which is before 045 (duo); `db push --remote --include-all` then
-- lists exactly 045 when O13 comes.
--
-- What this contains, and nothing else:
--   1. A-1  proof-photos: owners only can SELECT (and so list) their own folder.
--   2. A-3  proof-photos: uploads only into the caller's own folder.
--   3. C-1  proof-selfies: owners only can read their selfies (DZ-1 = owner only).
--   4. C-3, C-6  profiles.push_token: format check, and one token on one account.
--   5. K2   set_starter_quest() refuses anything but an anywhere quest.
--
-- Public proof-photo URLs keep loading: the bucket stays public, and the public
-- object route does not go through these policies. Admin reads and deletes use
-- the service role and are unaffected.

-- ─── 1. A-1: stop anyone listing proof-photos ────────────────────────────────
-- The baseline policy had no role and no folder limit, so the anon key could
-- list every player's <user>/<quest>/<attempt> paths, including players with
-- feed_public = false, blocked pairs and removed posts.

DROP POLICY IF EXISTS "Anyone can view proof photos" ON storage.objects;

-- Owners keep SELECT on their own folder: the 042 upsert and retry path, and the
-- DELETE policies, need to see the row.
DROP POLICY IF EXISTS "Owners can view own proof photos" ON storage.objects;
CREATE POLICY "Owners can view own proof photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'proof-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── 2. A-3: upload only into your own folder ────────────────────────────────
-- lib/submitCompletion.ts always uploads to <auth.uid()>/<quest>/<attempt>.jpg
-- (placePhotoPath), so this does not affect the app.

DROP POLICY IF EXISTS "Authenticated users can upload proof photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload proof photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'proof-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── 3. C-1: selfies are owner only ──────────────────────────────────────────
-- 033 let any viewer of a visible completion sign that player's selfie. Owner
-- decision DZ-1: strangers' faces stay out of the public feed for R1. The
-- owner policy from 032 ("Owners can view own proof selfies") stays; this adds
-- the folder check so the rule does not depend on the owner column alone.

DROP POLICY IF EXISTS "Viewers can view permitted proof selfies" ON storage.objects;
DROP POLICY IF EXISTS "Owners can view own selfie folder" ON storage.objects;
CREATE POLICY "Owners can view own selfie folder"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'proof-selfies'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- can_view_selfie_object() stays defined, but nothing references it now.
REVOKE EXECUTE ON FUNCTION can_view_selfie_object(TEXT) FROM authenticated;

-- ─── 4. C-3 and C-6: push token format, and one token per account ────────────
-- A token could sit on two accounts at once (a shared test device), so account
-- A's pushes, including comment text, showed up on B's phone. A token from
-- another Expo project also failed a whole batch of 100 in the sender.
--
-- The 029 column grant stays, so builds already installed keep working. Clients
-- still write profiles.push_token directly; this trigger enforces the rules.

CREATE OR REPLACE FUNCTION enforce_profile_push_token()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.push_token IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.push_token !~ '^ExponentPushToken\[[A-Za-z0-9_-]+\]$' THEN
    RAISE EXCEPTION 'INVALID_PUSH_TOKEN'
      USING ERRCODE = 'invalid_parameter_value',
            HINT   = 'INVALID_PUSH_TOKEN';
  END IF;

  -- The newest registration wins: take the same token off every other profile.
  UPDATE profiles
     SET push_token = NULL
   WHERE push_token = NEW.push_token
     AND id <> NEW.id;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION enforce_profile_push_token() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_profile_push_token ON profiles;
CREATE TRIGGER trg_profile_push_token
  BEFORE INSERT OR UPDATE OF push_token ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_profile_push_token();

-- ─── 5. K2: the starter quest must be an anywhere quest ──────────────────────
-- Full replacement of 037's function; the only change is the geofence_type
-- check. The first-run flow assumes the starter works anywhere, so a zone quest
-- would strand a new player who is not standing in it.

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
  IF target.geofence_type IS DISTINCT FROM 'none' THEN
    RAISE EXCEPTION 'The starter quest must be an anywhere quest';
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
