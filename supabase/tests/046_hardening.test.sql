-- 046 hardening: proof-photos listing and upload, selfie privacy, push token rules,
-- starter quest guard. Security review A-1, A-3, C-1, C-3, C-6, K2.
BEGIN;
SELECT plan(13);

-- Catalog: the old policies are gone, the new ones are in place.
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'storage' AND tablename = 'objects'
       AND policyname IN (
         'Anyone can view proof photos',
         'Viewers can view permitted proof selfies'
       )
  ),
  'the open proof-photos SELECT policy and the viewer selfie policy are dropped'
);

SELECT ok(
  (SELECT count(*) FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname IN (
        'Owners can view own proof photos',
        'Authenticated users can upload proof photos',
        'Owners can view own selfie folder'
      )
      AND roles::text = '{authenticated}') = 3,
  'the three 046 storage policies exist for authenticated only'
);

-- A-1: neither anon nor another player can list <victim>/ in proof-photos.
DO $$
DECLARE
  victim uuid;
  other uuid;
  obj_name text;
  n_anon int := 0;
  n_other int;
  n_owner int;
BEGIN
  victim := tests.make_user('lst_v');
  other := tests.make_user('lst_x');
  obj_name := victim::text || '/quest/attempt.jpg';
  INSERT INTO storage.objects (bucket_id, name, owner, metadata)
  VALUES ('proof-photos', obj_name, victim, '{}'::jsonb);

  EXECUTE 'SET LOCAL ROLE anon';
  BEGIN
    SELECT count(*)::int INTO n_anon
      FROM storage.objects
     WHERE bucket_id = 'proof-photos' AND name LIKE victim::text || '/%';
  EXCEPTION
    WHEN insufficient_privilege THEN n_anon := 0;
  END;
  PERFORM tests.clear_auth();

  PERFORM tests.act_as(other);
  SELECT count(*)::int INTO n_other
    FROM storage.objects
   WHERE bucket_id = 'proof-photos' AND name LIKE victim::text || '/%';
  PERFORM tests.clear_auth();

  PERFORM tests.act_as(victim);
  SELECT count(*)::int INTO n_owner
    FROM storage.objects
   WHERE bucket_id = 'proof-photos' AND name LIKE victim::text || '/%';
  PERFORM tests.clear_auth();

  IF n_anon <> 0 THEN
    RAISE EXCEPTION 'anon listed the victim folder (% rows)', n_anon;
  END IF;
  IF n_other <> 0 THEN
    RAISE EXCEPTION 'another player listed the victim folder (% rows)', n_other;
  END IF;
  IF n_owner <> 1 THEN
    RAISE EXCEPTION 'the owner should still see their own object, got %', n_owner;
  END IF;
END;
$$;
SELECT pass('anon and another player cannot list <victim>/ in proof-photos; the owner can (A-1)');

-- A-3: uploads into someone else's folder are refused, your own are not.
DO $$
DECLARE
  attacker uuid;
  victim uuid;
BEGIN
  attacker := tests.make_user('up_a');
  victim := tests.make_user('up_v');

  PERFORM tests.act_as(attacker);
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES ('proof-photos', victim::text || '/quest/planted.jpg', attacker, '{}'::jsonb);
    RAISE EXCEPTION 'attacker uploaded into the victim folder';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;

  -- Own folder: RLS must not refuse it. Other local-schema errors are ignored,
  -- the same way 042_storage.test.sql treats this insert.
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner, metadata)
    VALUES ('proof-photos', attacker::text || '/quest/mine.jpg', attacker, '{}'::jsonb);
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE EXCEPTION 'upload into the caller''s own folder was refused by RLS';
    WHEN others THEN
      NULL;
  END;
  PERFORM tests.clear_auth();
END;
$$;
SELECT pass('upload into another player''s proof-photos folder is refused (A-3)');

-- C-1: a stranger cannot read a selfie even when the completion is public and approved.
DO $$
DECLARE
  owner uuid;
  viewer uuid;
  q uuid;
  c uuid;
  obj_name text;
  n_viewer int;
  n_owner int;
BEGIN
  owner := tests.make_user('sf_o');
  viewer := tests.make_user('sf_v');
  q := tests.make_quest_none();
  c := tests.insert_completion(owner, q);
  obj_name := owner::text || '/' || q::text || '-att.jpg';
  INSERT INTO storage.objects (bucket_id, name, owner, metadata)
  VALUES ('proof-selfies', obj_name, owner, '{}'::jsonb);
  UPDATE completions SET selfie_url = obj_name WHERE id = c;

  PERFORM tests.act_as(viewer);
  SELECT count(*)::int INTO n_viewer
    FROM storage.objects
   WHERE bucket_id = 'proof-selfies' AND name = obj_name;
  PERFORM tests.clear_auth();

  PERFORM tests.act_as(owner);
  SELECT count(*)::int INTO n_owner
    FROM storage.objects
   WHERE bucket_id = 'proof-selfies' AND name = obj_name;
  PERFORM tests.clear_auth();

  IF n_viewer <> 0 THEN
    RAISE EXCEPTION 'a non-owner can read a selfie object (% rows)', n_viewer;
  END IF;
  IF n_owner <> 1 THEN
    RAISE EXCEPTION 'the owner cannot read their own selfie (% rows)', n_owner;
  END IF;
END;
$$;
SELECT pass('only the owner can read a selfie object, even for a public approved completion (C-1)');

SELECT ok(
  NOT has_function_privilege('authenticated', 'can_view_selfie_object(text)', 'EXECUTE'),
  'authenticated cannot EXECUTE can_view_selfie_object any more'
);

-- C-3 and C-6: token format.
DO $$
DECLARE
  u uuid;
  bad text;
  rejected int := 0;
  stored text;
BEGIN
  u := tests.make_user('tok_f');

  PERFORM tests.act_as(u);
  FOREACH bad IN ARRAY ARRAY[
    'x',
    'ExponentPushToken[]',
    'ExponentPushToken[has space]',
    'ExpoPushToken[abc]',
    'ExponentPushToken[abc]extra'
  ] LOOP
    BEGIN
      UPDATE profiles SET push_token = bad WHERE id = u;
      RAISE EXCEPTION 'accepted a malformed token: %', bad;
    EXCEPTION
      WHEN invalid_parameter_value THEN
        rejected := rejected + 1;
    END;
  END LOOP;

  UPDATE profiles SET push_token = 'ExponentPushToken[abc-DEF_123]' WHERE id = u;
  PERFORM tests.clear_auth();

  IF rejected <> 5 THEN
    RAISE EXCEPTION 'expected 5 malformed tokens rejected, got %', rejected;
  END IF;
  SELECT push_token INTO stored FROM profiles WHERE id = u;
  IF stored IS DISTINCT FROM 'ExponentPushToken[abc-DEF_123]' THEN
    RAISE EXCEPTION 'valid token was not stored, got %', stored;
  END IF;
END;
$$;
SELECT pass('malformed push tokens are rejected, a well-formed one is stored (C-3, C-6)');

-- C-3: one token, one account. The newest registration wins.
DO $$
DECLARE
  a uuid;
  b uuid;
  tok text := 'ExponentPushToken[shared-device-1]';
  a_tok text;
  b_tok text;
BEGIN
  a := tests.make_user('tok_a');
  b := tests.make_user('tok_b');

  PERFORM tests.act_as(a);
  UPDATE profiles SET push_token = tok WHERE id = a;
  PERFORM tests.clear_auth();

  PERFORM tests.act_as(b);
  UPDATE profiles SET push_token = tok WHERE id = b;
  PERFORM tests.clear_auth();

  SELECT push_token INTO a_tok FROM profiles WHERE id = a;
  SELECT push_token INTO b_tok FROM profiles WHERE id = b;
  IF a_tok IS NOT NULL THEN
    RAISE EXCEPTION 'first account still holds the shared token: %', a_tok;
  END IF;
  IF b_tok IS DISTINCT FROM tok THEN
    RAISE EXCEPTION 'second account lost the token: %', b_tok;
  END IF;
END;
$$;
SELECT pass('registering a token removes it from every other profile (C-3)');

-- Clearing a token is still allowed (sign-out path).
DO $$
DECLARE
  u uuid;
  stored text;
BEGIN
  u := tests.make_user('tok_clr');
  PERFORM tests.act_as(u);
  UPDATE profiles SET push_token = 'ExponentPushToken[clear-me]' WHERE id = u;
  UPDATE profiles SET push_token = NULL WHERE id = u;
  PERFORM tests.clear_auth();
  SELECT push_token INTO stored FROM profiles WHERE id = u;
  IF stored IS NOT NULL THEN
    RAISE EXCEPTION 'token was not cleared: %', stored;
  END IF;
END;
$$;
SELECT pass('a player can still clear their own token');

SELECT ok(
  (
    SELECT p.prosecdef
       AND EXISTS (
             SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
              WHERE cfg LIKE 'search_path=%'
           )
       AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
       AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'enforce_profile_push_token'
  ),
  'enforce_profile_push_token is a definer with search_path set and no client EXECUTE'
);

-- K2: the starter quest must be an anywhere quest.
DO $$
DECLARE
  zone_q uuid;
  anywhere_q uuid;
  is_set boolean;
BEGIN
  zone_q := tests.make_quest_circle();
  anywhere_q := tests.make_quest_none();

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  PERFORM set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);

  BEGIN
    PERFORM set_starter_quest(zone_q);
    RAISE EXCEPTION 'a zone quest was accepted as the starter';
  EXCEPTION
    WHEN others THEN
      IF SQLERRM NOT ILIKE '%anywhere quest%' THEN
        RAISE;
      END IF;
  END;

  PERFORM set_starter_quest(anywhere_q);
  PERFORM tests.clear_auth();

  SELECT is_starter INTO is_set FROM quests WHERE id = anywhere_q;
  IF NOT is_set THEN
    RAISE EXCEPTION 'the anywhere quest was not set as the starter';
  END IF;
END;
$$;
SELECT pass('set_starter_quest refuses a zone quest and accepts an anywhere quest (K2)');

SELECT ok(
  NOT has_function_privilege('authenticated', 'set_starter_quest(uuid)', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'set_starter_quest(uuid)', 'EXECUTE')
  AND has_function_privilege('service_role', 'set_starter_quest(uuid)', 'EXECUTE'),
  'set_starter_quest stays server-only after the 046 redefinition'
);

-- The 029 column grant stays, so installed builds keep registering tokens.
SELECT ok(
  has_column_privilege('authenticated', 'profiles', 'push_token', 'UPDATE')
  AND NOT has_column_privilege('authenticated', 'profiles', 'push_token', 'SELECT'),
  'authenticated can still UPDATE profiles.push_token but not SELECT it'
);

SELECT * FROM finish();
ROLLBACK;
