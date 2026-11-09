-- 033: Authorised signed-URL access to private proof selfies
--
-- Selfies live in the private `proof-selfies` bucket (migration 032). Clients
-- fetch them with `storage.createSignedUrl()` using their own JWT, so no
-- service-role key ever reaches the mobile app. Storage only signs an object
-- the caller can SELECT, so access is decided by this policy.
--
-- A viewer may read a selfie only when:
--   * a completion points at that exact object path (selfie_url = name), and
--   * the object sits in the completion owner's own folder (stops a user from
--     pointing their completion at someone else's selfie), and
--   * can_view_completion() allows it: own post, or approved + not hidden +
--     owner's feed is public + no block between the pair (migration 027).

CREATE OR REPLACE FUNCTION can_view_selfie_object(p_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM completions c
     WHERE c.selfie_url = p_name
       AND (storage.foldername(p_name))[1] = c.user_id::text
       AND can_view_completion(c.id)
  );
$$;

REVOKE EXECUTE ON FUNCTION can_view_selfie_object(TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION can_view_selfie_object(TEXT) TO authenticated;

DROP POLICY IF EXISTS "Viewers can view permitted proof selfies" ON storage.objects;
CREATE POLICY "Viewers can view permitted proof selfies"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'proof-selfies'
    AND can_view_selfie_object(name)
  );
