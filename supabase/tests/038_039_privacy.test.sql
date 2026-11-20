-- 038/039: secret columns are not client-selectable; owner reads code via RPC.
BEGIN;
SELECT plan(12);

SELECT ok(
  NOT has_column_privilege('authenticated', 'completions', 'redemption_code', 'SELECT'),
  'authenticated cannot SELECT completions.redemption_code'
);
SELECT ok(
  NOT has_column_privilege('authenticated', 'completions', 'lat', 'SELECT'),
  'authenticated cannot SELECT completions.lat'
);
SELECT ok(
  NOT has_column_privilege('authenticated', 'completions', 'lng', 'SELECT'),
  'authenticated cannot SELECT completions.lng'
);
SELECT ok(
  NOT has_column_privilege('authenticated', 'completions', 'gps_accuracy', 'SELECT'),
  'authenticated cannot SELECT completions.gps_accuracy'
);
SELECT ok(
  NOT has_column_privilege('anon', 'completions', 'redemption_code', 'SELECT'),
  'anon cannot SELECT completions.redemption_code'
);
SELECT ok(
  NOT has_column_privilege('anon', 'completions', 'lat', 'SELECT'),
  'anon cannot SELECT completions.lat'
);
SELECT ok(
  NOT has_column_privilege('authenticated', 'profiles', 'push_token', 'SELECT'),
  'authenticated cannot SELECT profiles.push_token'
);
SELECT ok(
  NOT has_column_privilege('anon', 'profiles', 'push_token', 'SELECT'),
  'anon cannot SELECT profiles.push_token'
);

SELECT ok(
  has_function_privilege('authenticated', 'own_completion_reward(uuid)', 'EXECUTE'),
  'authenticated can EXECUTE own_completion_reward'
);

DO $$
DECLARE
  u uuid;
  q uuid;
  c uuid;
  reward jsonb;
BEGIN
  u := tests.make_user('priv');
  q := tests.make_quest_none(100, now() - interval '30 days', true);
  c := tests.insert_completion(u, q);

  PERFORM tests.act_as(u);
  reward := own_completion_reward(c);
  IF reward IS NULL OR reward->>'redemption_code' IS NULL THEN
    RAISE EXCEPTION 'owner reward missing code: %', reward;
  END IF;
  IF (reward->>'xp_awarded')::int IS DISTINCT FROM 100 THEN
    RAISE EXCEPTION 'owner reward xp_awarded expected 100 got %', reward->>'xp_awarded';
  END IF;
  PERFORM tests.clear_auth();
END;
$$;

SELECT pass('owner reads own redemption_code through own_completion_reward');

DO $$
DECLARE
  owner uuid;
  other uuid;
  q uuid;
  c uuid;
BEGIN
  owner := tests.make_user('priv_o');
  other := tests.make_user('priv_x');
  q := tests.make_quest_none(50, now() - interval '30 days', true);
  c := tests.insert_completion(owner, q);

  PERFORM tests.act_as(other);
  IF own_completion_reward(c) IS NOT NULL THEN
    RAISE EXCEPTION 'other player should not read owner reward';
  END IF;
  PERFORM tests.clear_auth();
END;
$$;

SELECT pass('other player cannot read owner reward via own_completion_reward');

SELECT ok(
  has_column_privilege('authenticated', 'completions', 'id', 'SELECT'),
  'authenticated can SELECT completions.id (non-secret)'
);

SELECT * FROM finish();
ROLLBACK;
