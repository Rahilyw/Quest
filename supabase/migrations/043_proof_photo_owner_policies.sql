-- 043: Let players overwrite and delete their own unclaimed proof photos.
--
-- The submit screen now uploads each capture to a fixed path,
-- <user_id>/<quest_id>/<attempt_id>.jpg, with upsert, and deletes the file
-- when the attempt fails for good (geofence rejection, duplicate from another
-- attempt, or the player abandons after a server rejection).
--
-- proof-photos only had INSERT and SELECT policies (initial schema), so:
--   * an upsert onto an existing object failed RLS (storage upsert needs UPDATE);
--   * client deletes silently removed nothing (no DELETE policy).
--
-- Both policies are limited to the caller's own folder and to objects that no
-- completion of theirs points at. Without the second condition a player could
-- replace or remove the photo behind an approved, possibly reported, completion.
-- Admin moderation and account deletion keep using the service role.

DROP POLICY IF EXISTS "Owners can update unclaimed proof photos" ON storage.objects;
CREATE POLICY "Owners can update unclaimed proof photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'proof-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND NOT EXISTS (
      SELECT 1
        FROM public.completions c
       WHERE c.user_id = auth.uid()
         AND c.photo_url LIKE '%/proof-photos/' || name
    )
  )
  WITH CHECK (
    bucket_id = 'proof-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Owners can delete unclaimed proof photos" ON storage.objects;
CREATE POLICY "Owners can delete unclaimed proof photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'proof-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND NOT EXISTS (
      SELECT 1
        FROM public.completions c
       WHERE c.user_id = auth.uid()
         AND c.photo_url LIKE '%/proof-photos/' || name
    )
  );
