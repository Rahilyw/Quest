-- 032: Quest Cutouts UI overhaul — DB columns, storage buckets, and cleanup
--
-- A. New columns on quests (cutout asset + UX metadata)
-- B. New column on completions (selfie proof)
-- C. quest-cutouts storage bucket (public read, admin-write)
-- D. proof-selfies storage bucket (private — signed URLs only)
-- E. Performance index on completions(quest_id, completed_at)
-- F. Extend delete_own_account() to include proof-selfies

-- ─── A. QUESTS columns ────────────────────────────────────────────────────────

ALTER TABLE quests ADD COLUMN IF NOT EXISTS cutout_url    TEXT;
ALTER TABLE quests ADD COLUMN IF NOT EXISTS action_phrase TEXT;
ALTER TABLE quests ADD COLUMN IF NOT EXISTS distance_m    INTEGER;
ALTER TABLE quests ADD COLUMN IF NOT EXISTS duration_min  INTEGER;

-- ─── B. COMPLETIONS column ────────────────────────────────────────────────────

ALTER TABLE completions ADD COLUMN IF NOT EXISTS selfie_url TEXT;

-- ─── C. quest-cutouts BUCKET (public read, admin-only write) ──────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('quest-cutouts', 'quest-cutouts', true)
ON CONFLICT (id) DO NOTHING;

-- Public read, same as quest covers. Admin uploads use the service role,
-- which bypasses storage RLS. There is no profiles.is_admin column.
DROP POLICY IF EXISTS "Anyone can view quest cutouts" ON storage.objects;
CREATE POLICY "Anyone can view quest cutouts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'quest-cutouts');

DROP POLICY IF EXISTS "Admins can upload quest cutouts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update quest cutouts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete quest cutouts" ON storage.objects;

-- ─── D. proof-selfies BUCKET (private — no public URL) ───────────────────────
-- Selfies contain faces. No public = true, no SELECT policy for the world.
-- Reads must go through signed URLs generated server-side.

INSERT INTO storage.buckets (id, name, public)
VALUES ('proof-selfies', 'proof-selfies', false)
ON CONFLICT (id) DO NOTHING;

-- Completion owner can upload their own selfie.
-- Path convention: <user_id>/<completion_id>.webp
DROP POLICY IF EXISTS "Owners can upload proof selfies" ON storage.objects;
CREATE POLICY "Owners can upload proof selfies"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'proof-selfies'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner can read their own selfie (for preview after upload).
DROP POLICY IF EXISTS "Owners can view own proof selfies" ON storage.objects;
CREATE POLICY "Owners can view own proof selfies"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'proof-selfies'
    AND (owner = auth.uid() OR owner_id = auth.uid()::text)
  );

-- Admin moderation reads and deletes through the service role.
DROP POLICY IF EXISTS "Admins can view all proof selfies" ON storage.objects;

DROP POLICY IF EXISTS "Owner or admin can delete proof selfies" ON storage.objects;
CREATE POLICY "Owners can delete proof selfies"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'proof-selfies'
    AND (owner = auth.uid() OR owner_id = auth.uid()::text)
  );

-- ─── E. PERFORMANCE INDEX ─────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS completions_quest_id_completed_at_idx
  ON completions (quest_id, completed_at DESC);

-- ─── F. EXTEND delete_own_account() — add proof-selfies ──────────────────────
-- Full replacement of the function from migration 023, adding proof-selfies
-- to the bucket cleanup so self-serve account deletion is GDPR-complete.

CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Proof photos, selfies, and avatar uploaded by this user.
  DELETE FROM storage.objects
  WHERE bucket_id IN ('proof-photos', 'proof-selfies', 'avatars')
    AND (owner = v_uid OR owner_id = v_uid::text);

  -- Cascades: profiles, completions, user_badges, completion_reports,
  -- blocked_users (both directions), push token — everything keyed to the user.
  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;

REVOKE EXECUTE ON FUNCTION delete_own_account() FROM public;
REVOKE EXECUTE ON FUNCTION delete_own_account() FROM anon;
GRANT EXECUTE ON FUNCTION delete_own_account() TO authenticated;
