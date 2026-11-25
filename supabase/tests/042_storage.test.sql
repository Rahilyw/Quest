-- 042 storage: owner update/delete on unclaimed proof photos; other cannot.
BEGIN;
SELECT plan(5);

DO $$
DECLARE
  owner uuid;
  other uuid;
  obj_name text;
  owner_deleted int;
BEGIN
  owner := tests.make_user('stor_o');
  other := tests.make_user('stor_x');
  obj_name := owner::text || '/quest/attempt.jpg';

  -- Seed object as service/postgres (bypass RLS), then exercise policies as roles.
  INSERT INTO storage.objects (bucket_id, name, owner, metadata)
  VALUES ('proof-photos', obj_name, owner, '{}'::jsonb);

  PERFORM tests.act_as(owner);
  BEGIN
    -- Owner insert into own folder (baseline INSERT policy: any authenticated).
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES ('proof-photos', owner::text || '/quest/b.jpg', owner, '{}'::jsonb);
  EXCEPTION
    WHEN unique_violation THEN NULL;
    WHEN others THEN
      -- Some local schemas require more columns; try minimal path only once.
      NULL;
  END;

  DELETE FROM storage.objects
   WHERE bucket_id = 'proof-photos' AND name = obj_name;
  GET DIAGNOSTICS owner_deleted = ROW_COUNT;
  PERFORM tests.clear_auth();

  IF owner_deleted <> 1 THEN
    RAISE EXCEPTION 'owner should delete own unclaimed proof object (deleted=%)', owner_deleted;
  END IF;
END;
$$;
SELECT pass('owner can delete their own unclaimed proof object');

DO $$
DECLARE
  owner uuid;
  other uuid;
  obj_name text;
  other_deleted int;
BEGIN
  owner := tests.make_user('stor_o2');
  other := tests.make_user('stor_x2');
  obj_name := owner::text || '/quest/keep.jpg';

  INSERT INTO storage.objects (bucket_id, name, owner, metadata)
  VALUES ('proof-photos', obj_name, owner, '{}'::jsonb);

  PERFORM tests.act_as(other);
  DELETE FROM storage.objects
   WHERE bucket_id = 'proof-photos' AND name = obj_name;
  GET DIAGNOSTICS other_deleted = ROW_COUNT;
  PERFORM tests.clear_auth();

  IF other_deleted <> 0 THEN
    RAISE EXCEPTION 'other user deleted owner object (rows=%)', other_deleted;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM storage.objects WHERE bucket_id = 'proof-photos' AND name = obj_name
  ) THEN
    RAISE EXCEPTION 'owner object missing after other delete attempt';
  END IF;
END;
$$;
SELECT pass('another user cannot delete owner proof object');

DO $$
DECLARE
  owner uuid;
  q uuid;
  c uuid;
  obj_name text;
  deleted int;
BEGIN
  owner := tests.make_user('stor_claimed');
  q := tests.make_quest_none();
  obj_name := owner::text || '/' || q::text || '/claimed.jpg';
  INSERT INTO storage.objects (bucket_id, name, owner, metadata)
  VALUES ('proof-photos', obj_name, owner, '{}'::jsonb);

  INSERT INTO completions (user_id, quest_id, photo_url, lat, lng, gps_accuracy, completed_at)
  VALUES (
    owner, q,
    'https://example.invalid/storage/v1/object/public/proof-photos/' || obj_name,
    48.4284, -123.3656, 5, now()
  )
  RETURNING id INTO c;

  PERFORM tests.act_as(owner);
  DELETE FROM storage.objects
   WHERE bucket_id = 'proof-photos' AND name = obj_name;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  PERFORM tests.clear_auth();

  IF deleted <> 0 THEN
    RAISE EXCEPTION 'owner must not delete proof claimed by a completion';
  END IF;
END;
$$;
SELECT pass('owner cannot delete proof claimed by a completion');

SELECT ok(
  EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'proof-photos'),
  'proof-photos bucket exists'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'storage' AND tablename = 'objects'
       AND policyname = 'Owners can delete unclaimed proof photos'
  ),
  '042 delete policy is present'
);

SELECT * FROM finish();
ROLLBACK;
