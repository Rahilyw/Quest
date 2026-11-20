-- Verifying migration 042 (proof-photo owner UPDATE/DELETE policies).
-- Pass: storage.objects has both "Owners can update unclaimed proof photos" (UPDATE)
--       and "Owners can delete unclaimed proof photos" (DELETE) for role authenticated,
--       scoped to bucket_id = 'proof-photos', caller folder, and unclaimed objects.
-- Read-only: all checks are SELECTs against pg_policies / policy expressions.
--
-- Notes: README.md had no dedicated "Verifying 042" block. This file was derived from
-- the intent of supabase/migrations/042_proof_photo_owner_policies.sql. Do not treat
-- these queries as README SQL — README was not edited.
-- Paste into the Supabase SQL editor after applying 042.

-- Both owner policies exist on storage.objects for authenticated
SELECT policyname, cmd, roles::text AS roles
  FROM pg_policies
 WHERE schemaname = 'storage'
   AND tablename = 'objects'
   AND policyname IN (
     'Owners can update unclaimed proof photos',
     'Owners can delete unclaimed proof photos'
   )
 ORDER BY policyname;
-- expect: 2 rows — UPDATE and DELETE, roles include authenticated

-- UPDATE policy: proof-photos bucket, caller folder, unclaimed (no matching completion photo_url)
SELECT
  policyname,
  (qual LIKE '%proof-photos%') AS uses_bucket,
  (qual LIKE '%foldername%') AS uses_folder,
  (qual LIKE '%completions%') AS guards_claimed,
  (with_check LIKE '%proof-photos%') AS check_bucket
  FROM pg_policies
 WHERE schemaname = 'storage'
   AND tablename = 'objects'
   AND policyname = 'Owners can update unclaimed proof photos';
-- expect: one row, all true

-- DELETE policy: same folder + unclaimed guards (no WITH CHECK on DELETE)
SELECT
  policyname,
  (qual LIKE '%proof-photos%') AS uses_bucket,
  (qual LIKE '%foldername%') AS uses_folder,
  (qual LIKE '%completions%') AS guards_claimed,
  with_check IS NULL AS no_with_check
  FROM pg_policies
 WHERE schemaname = 'storage'
   AND tablename = 'objects'
   AND policyname = 'Owners can delete unclaimed proof photos';
-- expect: one row, all true

-- Full policy expressions (eyeball: folder = auth.uid(), NOT EXISTS on completions.photo_url)
SELECT policyname, cmd, qual, with_check
  FROM pg_policies
 WHERE schemaname = 'storage'
   AND tablename = 'objects'
   AND policyname IN (
     'Owners can update unclaimed proof photos',
     'Owners can delete unclaimed proof photos'
   )
 ORDER BY policyname;
