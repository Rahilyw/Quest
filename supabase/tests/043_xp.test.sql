-- 043 XP: awards, multipliers, first finisher, win_back, revoke, totals.
BEGIN;
SELECT plan(14);

SELECT is(
  (SELECT count(*)::int FROM completions WHERE xp_awarded IS NULL),
  0,
  'backfill leaves no null xp_awarded'
);

SELECT is(
  (SELECT is_nullable FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'completions' AND column_name = 'xp_awarded'),
  'NO',
  'xp_awarded is NOT NULL'
);

DO $$
DECLARE
  u uuid;
  q uuid;
  c uuid;
  awarded int;
  reason text;
BEGIN
  u := tests.make_user('xp2');
  q := tests.make_quest_none(100);
  INSERT INTO xp_events (kind, multiplier, label, starts_at, ends_at, created_by)
  VALUES ('multiplier', 2, 'pgtap global', now() - interval '1 minute', now() + interval '1 hour', 'pgtap');
  c := tests.insert_completion(u, q);
  SELECT xp_awarded, xp_reason INTO awarded, reason FROM completions WHERE id = c;
  IF awarded IS DISTINCT FROM 200 THEN
    RAISE EXCEPTION 'global x2 expected 200 got % (reason %)', awarded, reason;
  END IF;
  IF reason IS DISTINCT FROM 'weekend' THEN
    RAISE EXCEPTION 'global x2 reason expected weekend got %', reason;
  END IF;
END;
$$;
SELECT pass('global x2 doubles award and sets xp_reason weekend');

DO $$
DECLARE
  u uuid;
  q uuid;
  c uuid;
  awarded int;
  reason text;
BEGIN
  u := tests.make_user('xpmax');
  q := tests.make_quest_none(100);
  INSERT INTO xp_events (kind, multiplier, label, starts_at, ends_at, created_by)
  VALUES ('multiplier', 1.5, 'pgtap global', now() - interval '1 minute', now() + interval '1 hour', 'pgtap');
  INSERT INTO xp_events (kind, multiplier, quest_id, label, starts_at, ends_at, created_by)
  VALUES ('multiplier', 2, q, 'pgtap quest', now() - interval '1 minute', now() + interval '1 hour', 'pgtap');
  c := tests.insert_completion(u, q);
  SELECT xp_awarded, xp_reason INTO awarded, reason FROM completions WHERE id = c;
  IF awarded IS DISTINCT FROM 200 THEN
    RAISE EXCEPTION 'quest x2 + global x1.5 expected max 200 got %', awarded;
  END IF;
  IF reason IS DISTINCT FROM 'quest' THEN
    RAISE EXCEPTION 'expected quest reason got %', reason;
  END IF;
END;
$$;
SELECT pass('quest x2 + global x1.5 gives max not product');

DO $$
DECLARE
  u uuid;
  q uuid;
  c uuid;
  awarded int;
BEGIN
  u := tests.make_user('xpcap');
  q := tests.make_quest_none(100);
  INSERT INTO xp_events (kind, multiplier, label, starts_at, ends_at, created_by)
  VALUES ('multiplier', 5, 'pgtap cap', now() - interval '1 minute', now() + interval '1 hour', 'pgtap');
  c := tests.insert_completion(u, q);
  SELECT xp_awarded INTO awarded FROM completions WHERE id = c;
  IF awarded IS DISTINCT FROM 300 THEN
    RAISE EXCEPTION 'cap 3 expected 300 got %', awarded;
  END IF;
END;
$$;
SELECT pass('multiplier cap is 3');

DO $$
DECLARE
  u1 uuid;
  u2 uuid;
  q uuid;
  c1 uuid;
  c2 uuid;
  a1 int;
  r1 text;
  a2 int;
  r2 text;
BEGIN
  u1 := tests.make_user('ff1');
  u2 := tests.make_user('ff2');
  q := tests.make_quest_none(100, now() - interval '1 day');
  c1 := tests.insert_completion(u1, q);
  c2 := tests.insert_completion(u2, q);
  SELECT xp_awarded, xp_reason INTO a1, r1 FROM completions WHERE id = c1;
  SELECT xp_awarded, xp_reason INTO a2, r2 FROM completions WHERE id = c2;
  IF a1 IS DISTINCT FROM 150 OR r1 IS DISTINCT FROM 'first_finisher' THEN
    RAISE EXCEPTION 'first finisher expected 150/first_finisher got %/%', a1, r1;
  END IF;
  IF a2 IS DISTINCT FROM 100 OR r2 IS NOT NULL THEN
    RAISE EXCEPTION 'second finisher expected 100/null got %/%', a2, r2;
  END IF;
END;
$$;
SELECT pass('first finisher applies once; second gets base');

DO $$
DECLARE
  u uuid;
  q1 uuid;
  q2 uuid;
  c1 uuid;
  c2 uuid;
  a1 int;
  r1 text;
  a2 int;
  r2 text;
  consumed boolean;
BEGIN
  u := tests.make_user('wb');
  q1 := tests.make_quest_none(100);
  q2 := tests.make_quest_none(100);
  INSERT INTO xp_events (kind, multiplier, user_id, label, starts_at, ends_at, created_by)
  VALUES ('win_back', 2, u, 'pgtap wb', now() - interval '1 minute', now() + interval '7 days', 'pgtap');
  c1 := tests.insert_completion(u, q1);
  SELECT xp_awarded, xp_reason INTO a1, r1 FROM completions WHERE id = c1;
  SELECT consumed_at IS NOT NULL INTO consumed FROM xp_events WHERE user_id = u AND kind = 'win_back';
  c2 := tests.insert_completion(u, q2);
  SELECT xp_awarded, xp_reason INTO a2, r2 FROM completions WHERE id = c2;
  IF a1 IS DISTINCT FROM 200 OR r1 IS DISTINCT FROM 'win_back' THEN
    RAISE EXCEPTION 'win_back first expected 200/win_back got %/%', a1, r1;
  END IF;
  IF NOT consumed THEN
    RAISE EXCEPTION 'win_back row not consumed';
  END IF;
  IF a2 IS DISTINCT FROM 100 OR r2 IS NOT NULL THEN
    RAISE EXCEPTION 'second completion should not reuse win_back: %/%', a2, r2;
  END IF;
END;
$$;
SELECT pass('win_back consumed once; xp_reason set');

DO $$
DECLARE
  u uuid;
  q uuid;
  c uuid;
  t0 int;
  t1 int;
  t2 int;
  award int;
BEGIN
  u := tests.make_user('rev');
  q := tests.make_quest_none(100);
  INSERT INTO xp_events (kind, multiplier, label, starts_at, ends_at, created_by)
  VALUES ('multiplier', 3, 'pgtap rev', now() - interval '1 minute', now() + interval '1 hour', 'pgtap');
  SELECT total_xp INTO t0 FROM profiles WHERE id = u;
  c := tests.insert_completion(u, q);
  SELECT xp_awarded INTO award FROM completions WHERE id = c;
  SELECT total_xp INTO t1 FROM profiles WHERE id = u;
  UPDATE completions SET status = 'removed' WHERE id = c;
  SELECT total_xp INTO t2 FROM profiles WHERE id = u;
  IF t1 IS DISTINCT FROM t0 + award THEN
    RAISE EXCEPTION 'after award expected % got %', t0 + award, t1;
  END IF;
  IF t2 IS DISTINCT FROM t0 THEN
    RAISE EXCEPTION 'revoke should restore % got %', t0, t2;
  END IF;
END;
$$;
SELECT pass('revoke subtracts stored xp_awarded');

DO $$
DECLARE
  u uuid;
  q uuid;
  c uuid;
  lb int;
  stored int;
BEGIN
  u := tests.make_user('lb');
  q := tests.make_quest_none(100);
  INSERT INTO xp_events (kind, multiplier, label, starts_at, ends_at, created_by)
  VALUES ('multiplier', 2, 'pgtap lb', now() - interval '1 minute', now() + interval '1 hour', 'pgtap');
  c := tests.insert_completion(u, q);
  SELECT xp_awarded INTO stored FROM completions WHERE id = c;
  SELECT weekly_xp INTO lb FROM leaderboard WHERE user_id = u;
  IF lb IS DISTINCT FROM stored THEN
    RAISE EXCEPTION 'leaderboard weekly_xp % <> stored %', lb, stored;
  END IF;
END;
$$;
SELECT pass('leaderboard weekly XP = sum(xp_awarded)');

DO $$
DECLARE
  u uuid;
  q uuid;
  week_start date;
  recap jsonb;
  sum_xp int;
BEGIN
  u := tests.make_user('recap');
  q := tests.make_quest_none(80);
  PERFORM tests.insert_completion(u, q);
  week_start := date_trunc('week', now() AT TIME ZONE 'America/Vancouver')::date;
  PERFORM tests.act_as(u);
  recap := own_week_recap(week_start);
  PERFORM tests.clear_auth();
  sum_xp := coalesce((recap->>'weekly_xp')::int, -1);
  IF sum_xp IS DISTINCT FROM 80 THEN
    RAISE EXCEPTION 'own_week_recap weekly_xp expected 80 got % (payload %)', sum_xp, recap;
  END IF;
END;
$$;
SELECT pass('own_week_recap sums the same stored awards');

DO $$
DECLARE
  a uuid;
  b uuid;
  boost jsonb;
BEGIN
  a := tests.make_user('boost_a');
  b := tests.make_user('boost_b');
  INSERT INTO xp_events (kind, multiplier, user_id, label, starts_at, ends_at, created_by) VALUES
    ('win_back', 2, a, 'a', now() - interval '1 minute', now() + interval '7 days', 'pgtap'),
    ('win_back', 3, b, 'b', now() - interval '1 minute', now() + interval '7 days', 'pgtap');
  PERFORM tests.act_as(a);
  boost := active_xp_boosts();
  PERFORM tests.clear_auth();
  IF boost->'win_back' IS NULL OR (boost->'win_back'->>'multiplier')::numeric IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'caller win_back missing or wrong: %', boost;
  END IF;
  IF (boost->'win_back'->>'multiplier')::numeric = 3 THEN
    RAISE EXCEPTION 'leaked other player win_back: %', boost;
  END IF;
END;
$$;
SELECT pass('active_xp_boosts shows only the caller win_back');

SELECT ok(
  has_function_privilege('authenticated', 'active_xp_boosts()', 'EXECUTE'),
  'authenticated can call active_xp_boosts'
);

SELECT ok(
  NOT has_function_privilege('authenticated', 'apply_completion_rewards(uuid)', 'EXECUTE'),
  'authenticated cannot call apply_completion_rewards'
);

SELECT * FROM finish();
ROLLBACK;
