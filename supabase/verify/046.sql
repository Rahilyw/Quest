-- Verifying migration 046 (storage and push-token hardening).
-- Requires: the baseline, 023, 032, 033, 037 and 039. Does not need 041-045.
-- Read-only: every check is a SELECT against the catalog. Nothing is inserted,
-- updated or deleted, so it is safe to paste into the Supabase SQL editor.
-- Behaviour (anon listing, cross-folder upload, selfie reads, token dedupe, starter
-- guard) is proven in pgTAP: supabase/tests/046_hardening.test.sql.

-- A-1: the open proof-photos SELECT policy is gone, the owner-only one exists
SELECT policyname, cmd, roles::text AS roles
  FROM pg_policies
 WHERE schemaname = 'storage' AND tablename = 'objects'
   AND policyname IN ('Anyone can view proof photos', 'Owners can view own proof photos');
-- expect: 1 row, 'Owners can view own proof photos', SELECT, {authenticated}

-- No remaining SELECT policy on storage.objects that mentions proof-photos without a folder check
SELECT policyname, qual
  FROM pg_policies
 WHERE schemaname = 'storage' AND tablename = 'objects' AND cmd = 'SELECT'
   AND qual LIKE '%proof-photos%' AND qual NOT LIKE '%foldername%';
-- expect: 0 rows

-- A-3: upload policy has the folder check
SELECT policyname, roles::text AS roles,
       (with_check LIKE '%foldername%') AS folder_check,
       (with_check LIKE '%proof-photos%') AS bucket_check
  FROM pg_policies
 WHERE schemaname = 'storage' AND tablename = 'objects'
   AND policyname = 'Authenticated users can upload proof photos';
-- expect: 1 row, {authenticated}, true, true

-- C-1: the viewer selfie policy is gone, the owner-folder one exists
SELECT policyname, roles::text AS roles, (qual LIKE '%foldername%') AS folder_check
  FROM pg_policies
 WHERE schemaname = 'storage' AND tablename = 'objects'
   AND policyname IN ('Viewers can view permitted proof selfies', 'Owners can view own selfie folder');
-- expect: 1 row, 'Owners can view own selfie folder', {authenticated}, true

SELECT has_function_privilege('authenticated', 'can_view_selfie_object(text)', 'EXECUTE') AS authed,
       has_function_privilege('anon', 'can_view_selfie_object(text)', 'EXECUTE') AS anon;
-- expect: false / false

-- C-3 and C-6: trigger and function
SELECT t.tgname, t.tgenabled, p.prosecdef AS definer,
       coalesce(p.proconfig::text, '') LIKE '%search_path%' AS has_search_path,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authed,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon
  FROM pg_trigger t
  JOIN pg_proc p ON p.oid = t.tgfoid
 WHERE t.tgrelid = 'public.profiles'::regclass AND t.tgname = 'trg_profile_push_token';
-- expect: 1 row, tgenabled O, definer true, has_search_path true, authed false, anon false

-- The 029 grant stays: clients UPDATE push_token, never SELECT it
SELECT has_column_privilege('authenticated', 'profiles', 'push_token', 'UPDATE') AS can_update,
       has_column_privilege('authenticated', 'profiles', 'push_token', 'SELECT') AS can_select,
       has_column_privilege('anon', 'profiles', 'push_token', 'SELECT') AS anon_select;
-- expect: true / false / false

-- Existing rows with a malformed token (the trigger checks new writes only)
SELECT count(*) FROM profiles
 WHERE push_token IS NOT NULL
   AND push_token !~ '^ExponentPushToken\[[A-Za-z0-9_-]+\]$';
-- expect: 0 (a non-zero count is fine to clear by hand, but tell the owner first)

-- The same token on more than one profile (should be 0 after clients re-register)
SELECT count(*) FROM (
  SELECT push_token FROM profiles
   WHERE push_token IS NOT NULL
   GROUP BY push_token HAVING count(*) > 1
) dup;
-- expect: 0 right after apply is not guaranteed; each such token clears on the next registration

-- K2: set_starter_quest checks geofence_type and stays server-only
SELECT pg_get_functiondef('public.set_starter_quest(uuid)'::regprocedure) LIKE '%anywhere quest%' AS has_guard,
       has_function_privilege('authenticated', 'public.set_starter_quest(uuid)', 'EXECUTE') AS authed,
       has_function_privilege('anon', 'public.set_starter_quest(uuid)', 'EXECUTE') AS anon,
       has_function_privilege('service_role', 'public.set_starter_quest(uuid)', 'EXECUTE') AS service;
-- expect: true / false / false / true

-- The current starter is an anywhere quest
SELECT id, title, geofence_type FROM quests WHERE is_starter AND status = 'active';
-- expect: 1 row, geofence_type 'none'
