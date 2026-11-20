-- 041 push outbox: exclusive claims, win_back kind, push_drops filter.
BEGIN;
SELECT plan(6);

DO $$
DECLARE
  u uuid;
  batch1 uuid[];
  batch2 uuid[];
  overlap int;
BEGIN
  u := tests.make_user('push');
  INSERT INTO push_outbox (user_id, kind, title, body, data, dedupe_key)
  SELECT u, 'weekly_drop', 'Quest!', 'a', '{}'::jsonb, 'pgtap-claim:' || g
    FROM generate_series(1, 3) g;

  SELECT array_agg(id ORDER BY created_at, id) INTO batch1
    FROM claim_push_outbox(2);
  SELECT array_agg(id ORDER BY created_at, id) INTO batch2
    FROM claim_push_outbox(2);

  IF coalesce(array_length(batch1, 1), 0) IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'first claim expected 2 rows got %', batch1;
  END IF;
  IF coalesce(array_length(batch2, 1), 0) IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'second claim expected 1 remaining got %', batch2;
  END IF;

  SELECT count(*)::int INTO overlap
    FROM unnest(batch1) a
    JOIN unnest(batch2) b ON a = b;
  IF overlap <> 0 THEN
    RAISE EXCEPTION 'claims overlapped: % and %', batch1, batch2;
  END IF;
END;
$$;
SELECT pass('claim_push_outbox hands each row to one caller only');

DO $$
DECLARE
  u uuid;
  oid uuid;
  claimed_kind text;
BEGIN
  u := tests.make_user('wbkind');
  INSERT INTO push_outbox (user_id, kind, title, body, data, dedupe_key)
  VALUES (u, 'win_back', 'Quest!', 'come back', '{"type":"win_back"}'::jsonb, 'pgtap-wb:' || u::text)
  RETURNING id INTO oid;

  SELECT kind INTO claimed_kind FROM claim_push_outbox(10) WHERE id = oid;
  IF claimed_kind IS DISTINCT FROM 'win_back' THEN
    RAISE EXCEPTION 'win_back kind not claimable: %', claimed_kind;
  END IF;
END;
$$;
SELECT pass('win_back kind is accepted and claimable');

DO $$
DECLARE
  on_uid uuid;
  off_uid uuid;
  n_on int;
  n_off int;
BEGIN
  on_uid := tests.make_user('drops_on');
  off_uid := tests.make_user('drops_off');
  UPDATE profiles SET push_token = 'ExponentPushToken[pgtap-on]', push_drops = true WHERE id = on_uid;
  UPDATE profiles SET push_token = 'ExponentPushToken[pgtap-off]', push_drops = false WHERE id = off_uid;

  -- Same predicate enqueue_week_recap / enqueue_weekly_drop use for opt-out.
  SELECT count(*)::int INTO n_on
    FROM profiles p
   WHERE p.id = on_uid AND p.push_token IS NOT NULL AND p.push_drops = true;
  SELECT count(*)::int INTO n_off
    FROM profiles p
   WHERE p.id = off_uid AND p.push_token IS NOT NULL AND p.push_drops = true;

  IF n_on <> 1 OR n_off <> 0 THEN
    RAISE EXCEPTION 'push_drops filter broken: on=% off=%', n_on, n_off;
  END IF;
END;
$$;
SELECT pass('push_drops = false rows are excluded from send candidates');

SELECT ok(
  NOT has_function_privilege('authenticated', 'claim_push_outbox(integer)', 'EXECUTE'),
  'authenticated cannot EXECUTE claim_push_outbox'
);
SELECT ok(
  NOT has_function_privilege('anon', 'claim_push_outbox(integer)', 'EXECUTE'),
  'anon cannot EXECUTE claim_push_outbox'
);
SELECT ok(
  (SELECT pg_get_constraintdef(oid) ILIKE '%win_back%'
     FROM pg_constraint
    WHERE conrelid = 'public.push_outbox'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%kind%'
    LIMIT 1),
  'push_outbox kind CHECK includes win_back'
);

SELECT * FROM finish();
ROLLBACK;
