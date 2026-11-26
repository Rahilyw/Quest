-- D-1: delete_own_account removes the caller's storage objects on the CI stack.
-- If this fails on the pinned Supabase storage version, 046 must move deletes
-- to the Storage API (owner decision DZ-2 / App Review blocker).
BEGIN;
SELECT plan(2);

DO $$
DECLARE
  u uuid;
  n int;
BEGIN
  u := tests.make_user('del');

  INSERT INTO storage.objects (bucket_id, name, owner, metadata)
  VALUES ('proof-photos', u::text || '/q/a.jpg', u, '{}'::jsonb),
         ('proof-selfies', u::text || '/q-a.jpg', u, '{}'::jsonb);

  PERFORM tests.act_as(u);
  PERFORM delete_own_account();
  PERFORM tests.clear_auth();

  SELECT count(*)::int INTO n
    FROM storage.objects
   WHERE bucket_id IN ('proof-photos', 'proof-selfies')
     AND name LIKE u::text || '/%';
  IF n <> 0 THEN
    RAISE EXCEPTION 'proof photo or selfie objects left after delete_own_account: %', n;
  END IF;

  SELECT count(*)::int INTO n FROM auth.users WHERE id = u;
  IF n <> 0 THEN
    RAISE EXCEPTION 'auth.users row left after delete_own_account';
  END IF;
END;
$$;
SELECT pass('delete_own_account removes proof-photos and proof-selfies objects and the auth user');

DO $$
DECLARE
  u uuid;
BEGIN
  u := tests.make_user('del2');
  PERFORM tests.act_as(u);
  PERFORM delete_own_account();
  PERFORM tests.clear_auth();
  -- Second call as nobody should fail; prove the function still exists.
  BEGIN
    PERFORM delete_own_account();
    RAISE EXCEPTION 'expected not authenticated';
  EXCEPTION
    WHEN others THEN
      IF SQLERRM NOT ILIKE '%not authenticated%' THEN
        RAISE EXCEPTION 'unexpected: %', SQLERRM;
      END IF;
  END;
END;
$$;
SELECT pass('delete_own_account requires auth.uid()');

SELECT * FROM finish();
ROLLBACK;
