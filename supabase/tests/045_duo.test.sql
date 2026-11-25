-- 045 duo quests: party codes, membership, PARTY_REQUIRED, duo bonus, Recruiter, rate limit.
BEGIN;
SELECT plan(11);

SELECT is(
  party_code_alphabet(),
  'ABCDEFGHJKMNPQRSTUVWXYZ23456789',
  'party code alphabet matches Spec 06'
);

SELECT is(
  length(party_code_alphabet()),
  31,
  'party code alphabet length is 31'
);

DO $$
DECLARE
  a uuid;
  b uuid;
  c uuid;
  q uuid;
  code1 text;
  code2 text;
  n int;
BEGIN
  a := tests.make_user('duo_a');
  b := tests.make_user('duo_b');
  c := tests.make_user('duo_c');
  q := tests.make_quest_none(100);
  UPDATE quests SET min_party_size = 2 WHERE id = q;

  PERFORM tests.act_as(a);
  SELECT (create_party(q)->>'code') INTO code1;
  PERFORM tests.clear_auth();
  IF code1 IS NULL OR length(code1) <> 6 THEN
    RAISE EXCEPTION 'create_party did not return a 6-char code: %', code1;
  END IF;

  PERFORM tests.act_as(b);
  PERFORM join_party(code1);
  PERFORM tests.clear_auth();

  PERFORM tests.act_as(c);
  BEGIN
    PERFORM join_party(code1);
    RAISE EXCEPTION 'third member should be refused';
  EXCEPTION
    WHEN check_violation THEN
      IF SQLERRM NOT ILIKE '%PARTY_FULL%' THEN
        RAISE EXCEPTION 'expected PARTY_FULL, got %', SQLERRM;
      END IF;
  END;
  PERFORM tests.clear_auth();

  -- One open party per creator: a second duo quest closes the first.
  q := tests.make_quest_none(80);
  UPDATE quests SET min_party_size = 2 WHERE id = q;
  PERFORM tests.act_as(a);
  SELECT (create_party(q)->>'code') INTO code2;
  PERFORM tests.clear_auth();
  IF code2 IS NULL OR length(code2) <> 6 THEN
    RAISE EXCEPTION 'second create_party failed: %', code2;
  END IF;
  SELECT count(*)::int INTO n FROM quest_parties WHERE created_by = a AND is_open;
  IF n <> 1 THEN
    RAISE EXCEPTION 'expected one open party per creator, got %', n;
  END IF;
END;
$$;
SELECT pass('one open party per creator; third member refused (PARTY_FULL)');

DO $$
DECLARE
  a uuid;
  code text;
BEGIN
  a := tests.make_user('self');
  PERFORM tests.act_as(a);
  BEGIN
    -- Join own party: create then join same code.
    DECLARE
      q uuid := tests.make_quest_none(50);
    BEGIN
      UPDATE quests SET min_party_size = 2 WHERE id = q;
      SELECT (create_party(q)->>'code') INTO code;
      PERFORM join_party(code);
      RAISE EXCEPTION 'PARTY_SELF expected';
    EXCEPTION
      WHEN check_violation THEN
        IF SQLERRM NOT ILIKE '%PARTY_SELF%' THEN
          RAISE EXCEPTION 'expected PARTY_SELF, got %', SQLERRM;
        END IF;
    END;
  END;
  PERFORM tests.clear_auth();
END;
$$;
SELECT pass('PARTY_SELF refused');

DO $$
DECLARE
  a uuid;
  b uuid;
  q uuid;
  code text;
BEGIN
  a := tests.make_user('exp_a');
  b := tests.make_user('exp_b');
  q := tests.make_quest_none(50);
  UPDATE quests SET min_party_size = 2 WHERE id = q;
  PERFORM tests.act_as(a);
  SELECT (create_party(q)->>'code') INTO code;
  PERFORM tests.clear_auth();

  UPDATE quest_parties SET expires_at = now() - interval '1 minute' WHERE code = code;

  PERFORM tests.act_as(b);
  BEGIN
    PERFORM join_party(code);
    RAISE EXCEPTION 'PARTY_EXPIRED expected';
  EXCEPTION
    WHEN check_violation THEN
      IF SQLERRM NOT ILIKE '%PARTY_EXPIRED%' THEN
        RAISE EXCEPTION 'expected PARTY_EXPIRED, got %', SQLERRM;
      END IF;
  END;
  PERFORM tests.clear_auth();
END;
$$;
SELECT pass('PARTY_EXPIRED refused');

DO $$
DECLARE
  u uuid;
  q uuid;
BEGIN
  u := tests.make_user('solo');
  q := tests.make_quest_none(100);
  UPDATE quests SET min_party_size = 2 WHERE id = q;
  BEGIN
    PERFORM tests.insert_completion(u, q);
    RAISE EXCEPTION 'PARTY_REQUIRED expected on solo duo insert';
  EXCEPTION
    WHEN check_violation THEN
      IF SQLERRM NOT ILIKE '%PARTY_REQUIRED%' THEN
        RAISE EXCEPTION 'expected PARTY_REQUIRED, got %', SQLERRM;
      END IF;
  END;
END;
$$;
SELECT pass('solo insert on duo quest raises PARTY_REQUIRED');

DO $$
DECLARE
  a uuid;
  b uuid;
  q uuid;
  code text;
  c_a uuid;
  c_b uuid;
  xp_a int;
  xp_b int;
  reason_b text;
  bonus int;
BEGIN
  a := tests.make_user('pay_a');
  b := tests.make_user('pay_b');
  -- Old accounts: no referral (created_at is now from make_user — bump both older).
  UPDATE profiles SET created_at = now() - interval '7 days' WHERE id IN (a, b);
  UPDATE auth.users SET created_at = now() - interval '7 days' WHERE id IN (a, b);

  q := tests.make_quest_none(100);
  UPDATE quests SET min_party_size = 2, geofence_type = 'none' WHERE id = q;

  PERFORM tests.act_as(a);
  SELECT (create_party(q)->>'code') INTO code;
  PERFORM tests.clear_auth();
  PERFORM tests.act_as(b);
  PERFORM join_party(code);
  PERFORM tests.clear_auth();

  c_a := tests.insert_completion(a, q);
  SELECT xp_awarded INTO xp_a FROM completions WHERE id = c_a;

  c_b := tests.insert_completion(b, q);
  SELECT xp_awarded, xp_reason INTO xp_b, reason_b FROM completions WHERE id = c_b;
  SELECT xp_awarded INTO xp_a FROM completions WHERE id = c_a;

  IF reason_b IS DISTINCT FROM 'duo' THEN
    RAISE EXCEPTION 'second member xp_reason expected duo, got %', reason_b;
  END IF;

  -- Base 100, no multiplier, no first-finisher if quest is older than 7d start...
  -- make_quest_none uses active_from = now()-30d so no first finisher. Bonus = round(0.5*100)=50.
  bonus := 50;
  IF xp_b < 100 + bonus THEN
    RAISE EXCEPTION 'second award expected >= %, got %', 100 + bonus, xp_b;
  END IF;
  IF xp_a < 100 + bonus THEN
    RAISE EXCEPTION 'first member should receive duo bump, got %', xp_a;
  END IF;
END;
$$;
SELECT pass('second verify pays both +round(0.5*base) and sets xp_reason duo');

DO $$
DECLARE
  a uuid;
  b uuid;
  q uuid;
  code text;
  c_a uuid;
  c_b uuid;
  xp_b int;
BEGIN
  a := tests.make_user('ref_a');
  -- Keep a old; b under 48h (default make_user).
  UPDATE profiles SET created_at = now() - interval '7 days' WHERE id = a;
  UPDATE auth.users SET created_at = now() - interval '7 days' WHERE id = a;
  b := tests.make_user('ref_b');

  q := tests.make_quest_none(100);
  UPDATE quests SET min_party_size = 2 WHERE id = q;

  PERFORM tests.act_as(a);
  SELECT (create_party(q)->>'code') INTO code;
  PERFORM tests.clear_auth();
  PERFORM tests.act_as(b);
  PERFORM join_party(code);
  PERFORM tests.clear_auth();

  c_a := tests.insert_completion(a, q);
  c_b := tests.insert_completion(b, q);
  SELECT xp_awarded INTO xp_b FROM completions WHERE id = c_b;
  -- Referral: +base (100) on top of base award.
  IF xp_b < 200 THEN
    RAISE EXCEPTION 'referral duo bonus expected xp >= 200, got %', xp_b;
  END IF;
END;
$$;
SELECT pass('referral (under 48h) pays +base duo bonus');

DO $$
DECLARE
  a uuid;
  b uuid;
  q uuid;
  code text;
  c_a uuid;
  c_b uuid;
  xp_before int;
  xp_after int;
  total_before int;
  total_after int;
BEGIN
  a := tests.make_user('rev_a');
  b := tests.make_user('rev_b');
  UPDATE profiles SET created_at = now() - interval '7 days' WHERE id IN (a, b);
  UPDATE auth.users SET created_at = now() - interval '7 days' WHERE id IN (a, b);

  q := tests.make_quest_none(100);
  UPDATE quests SET min_party_size = 2 WHERE id = q;

  PERFORM tests.act_as(a);
  SELECT (create_party(q)->>'code') INTO code;
  PERFORM tests.clear_auth();
  PERFORM tests.act_as(b);
  PERFORM join_party(code);
  PERFORM tests.clear_auth();

  c_a := tests.insert_completion(a, q);
  c_b := tests.insert_completion(b, q);

  SELECT xp_awarded INTO xp_before FROM completions WHERE id = c_b;
  SELECT total_xp INTO total_before FROM profiles WHERE id = b;

  UPDATE completions SET status = 'removed' WHERE id = c_b;

  SELECT xp_awarded INTO xp_after FROM completions WHERE id = c_b;
  SELECT total_xp INTO total_after FROM profiles WHERE id = b;

  IF total_after <> total_before - xp_before THEN
    RAISE EXCEPTION 'revoke should subtract stored award: before % after % award %',
      total_before, total_after, xp_before;
  END IF;
END;
$$;
SELECT pass('revoke removes the duo award from profiles.total_xp');

DO $$
DECLARE
  creator uuid;
  partners uuid[] := ARRAY[]::uuid[];
  i int;
  q uuid;
  code text;
  partner uuid;
  n int;
  badge_id uuid;
BEGIN
  creator := tests.make_user('rec_c');
  UPDATE profiles SET created_at = now() - interval '30 days' WHERE id = creator;
  UPDATE auth.users SET created_at = now() - interval '30 days' WHERE id = creator;

  SELECT id INTO badge_id FROM badges WHERE name = 'Recruiter' LIMIT 1;
  IF badge_id IS NULL THEN
    RAISE EXCEPTION 'Recruiter badge missing from seed/045';
  END IF;

  FOR i IN 1..3 LOOP
    partner := tests.make_user('rec_p' || i::text);
    -- Partner under 48h (default).
    q := tests.make_quest_none(40);
    UPDATE quests SET min_party_size = 2 WHERE id = q;

    PERFORM tests.act_as(creator);
    SELECT (create_party(q)->>'code') INTO code;
    PERFORM tests.clear_auth();
    PERFORM tests.act_as(partner);
    PERFORM join_party(code);
    PERFORM tests.clear_auth();

    PERFORM tests.insert_completion(creator, q);
    PERFORM tests.insert_completion(partner, q);
  END LOOP;

  SELECT count(*)::int INTO n
    FROM user_badges
   WHERE user_id = creator AND badge_id = badge_id;
  IF n < 1 THEN
    RAISE EXCEPTION 'Recruiter badge should unlock after 3 recruits, got %', n;
  END IF;
END;
$$;
SELECT pass('Recruiter badge ticks at 3 under-48h partners');

DO $$
DECLARE
  u uuid;
  q uuid;
  i int;
  code text;
BEGIN
  u := tests.make_user('rate');

  PERFORM tests.act_as(u);
  -- Each create must insert a new party_parties row (reuse on the same quest
  -- would not bump the rate counter). Use a fresh duo quest each time.
  FOR i IN 1..10 LOOP
    q := tests.make_quest_none(10);
    UPDATE quests SET min_party_size = 2 WHERE id = q;
    SELECT (create_party(q)->>'code') INTO code;
  END LOOP;

  q := tests.make_quest_none(10);
  UPDATE quests SET min_party_size = 2 WHERE id = q;
  BEGIN
    SELECT (create_party(q)->>'code') INTO code;
    RAISE EXCEPTION 'PARTY_RATE_LIMITED expected on 11th create';
  EXCEPTION
    WHEN check_violation THEN
      IF SQLERRM NOT ILIKE '%PARTY_RATE_LIMITED%' THEN
        RAISE EXCEPTION 'expected PARTY_RATE_LIMITED, got %', SQLERRM;
      END IF;
  END;
  PERFORM tests.clear_auth();
END;
$$;
SELECT pass('party rate limit trips at 10 creates/joins per hour');

SELECT * FROM finish();
ROLLBACK;
