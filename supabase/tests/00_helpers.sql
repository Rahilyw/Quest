-- Shared helpers for supabase/tests/*.test.sql (loaded by scripts/db-local/pgtap.sh).
-- Creates a `tests` schema with user/quest fixtures and act_as(uid).

CREATE EXTENSION IF NOT EXISTS pgtap;

CREATE SCHEMA IF NOT EXISTS tests;
GRANT USAGE ON SCHEMA tests TO postgres, authenticated, anon, service_role;
-- act_as switches to authenticated; helpers must stay callable after that.
ALTER DEFAULT PRIVILEGES IN SCHEMA tests
  GRANT EXECUTE ON FUNCTIONS TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION tests.act_as(p_uid uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_uid::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', p_uid::text, 'role', 'authenticated')::text,
    true
  );
  EXECUTE 'SET LOCAL ROLE authenticated';
END;
$$;

CREATE OR REPLACE FUNCTION tests.clear_auth()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claim.role', '', true);
  PERFORM set_config('request.jwt.claims', '', true);
  RESET ROLE;
END;
$$;

-- Minimal auth.users + profiles row. Local GoTrue schemas vary; fill common NOT NULLs.
CREATE OR REPLACE FUNCTION tests.make_user(p_label text DEFAULT 't')
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  uid uuid := gen_random_uuid();
  uname text := 't_' || substr(replace(uid::text, '-', ''), 1, 12) || '_' || p_label;
BEGIN
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    uid,
    'authenticated',
    'authenticated',
    uname || '@pgtap.local',
    -- Fixed bcrypt hash; avoids depending on pgcrypto in search_path.
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- GoTrue expects an identity row for email users on recent Auth schemas.
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    uid,
    uid,
    jsonb_build_object('sub', uid::text, 'email', uname || '@pgtap.local'),
    'email',
    uid::text,
    now(),
    now(),
    now()
  );

  INSERT INTO profiles (id, username, city)
  VALUES (uid, uname, 'Victoria, BC');

  RETURN uid;
END;
$$;

-- Point geofence circle. inside = (lat,lng); outside = far away.
CREATE OR REPLACE FUNCTION tests.make_quest_circle(
  p_lat double precision DEFAULT 48.4284,
  p_lng double precision DEFAULT -123.3656,
  p_radius integer DEFAULT 80,
  p_xp integer DEFAULT 100
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  qid uuid;
BEGIN
  INSERT INTO quests (
    title, description, category, lat, lng, radius_meters,
    xp_reward, status, geofence_type, active_from
  ) VALUES (
    'pgtap circle', 'test', 'fitness', p_lat, p_lng, p_radius,
    p_xp, 'active', 'circle', now() - interval '30 days'
  )
  RETURNING id INTO qid;
  RETURN qid;
END;
$$;

-- No geofence — XP / sticker / rate-limit tests.
CREATE OR REPLACE FUNCTION tests.make_quest_none(
  p_xp integer DEFAULT 100,
  p_active_from timestamptz DEFAULT now() - interval '30 days',
  p_sponsored boolean DEFAULT false,
  p_cutout text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  qid uuid;
BEGIN
  INSERT INTO quests (
    title, description, category, lat, lng, radius_meters,
    xp_reward, is_sponsored, status, geofence_type, active_from, cutout_url, cutout_alt
  ) VALUES (
    'pgtap none', 'test', 'fitness', 48.4284, -123.3656, 300,
    p_xp, p_sponsored, 'active', 'none', p_active_from, p_cutout,
    CASE WHEN p_cutout IS NULL THEN NULL ELSE 'Test sticker alt text' END
  )
  RETURNING id INTO qid;
  RETURN qid;
END;
$$;

CREATE OR REPLACE FUNCTION tests.insert_completion(
  p_user uuid,
  p_quest uuid,
  p_lat double precision DEFAULT 48.4284,
  p_lng double precision DEFAULT -123.3656,
  p_accuracy double precision DEFAULT 5
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  cid uuid;
BEGIN
  INSERT INTO completions (user_id, quest_id, photo_url, lat, lng, gps_accuracy, completed_at)
  VALUES (
    p_user, p_quest,
    'https://example.invalid/proof-photos/' || p_user::text || '/' || p_quest::text || '/a.jpg',
    p_lat, p_lng, p_accuracy, now() - interval '1 hour'
  )
  RETURNING id INTO cid;
  RETURN cid;
END;
$$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tests TO authenticated, anon, service_role;
