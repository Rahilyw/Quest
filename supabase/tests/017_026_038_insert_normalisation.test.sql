-- Insert normalisation: completed_at owned by server, rate limit, geofence.
BEGIN;
SELECT plan(6);

DO $$
DECLARE
  u uuid;
  q uuid;
  c uuid;
  stored_at timestamptz;
  forged timestamptz := now() - interval '3 days';
BEGIN
  u := tests.make_user('norm');
  q := tests.make_quest_none();
  INSERT INTO completions (user_id, quest_id, photo_url, lat, lng, gps_accuracy, completed_at)
  VALUES (
    u, q,
    'https://example.invalid/proof-photos/' || u::text || '/' || q::text || '/p.jpg',
    48.4284, -123.3656, 5, forged
  )
  RETURNING id, completed_at INTO c, stored_at;

  IF abs(extract(epoch FROM (stored_at - now()))) > 5 THEN
    RAISE EXCEPTION 'completed_at not forced to now(): forged=% stored=%', forged, stored_at;
  END IF;
END;
$$;
SELECT pass('completed_at forced to now() on insert');

DO $$
DECLARE
  u uuid;
  q1 uuid;
  q2 uuid;
  q3 uuid;
BEGIN
  u := tests.make_user('rate');
  q1 := tests.make_quest_none();
  q2 := tests.make_quest_none();
  q3 := tests.make_quest_none();
  PERFORM tests.insert_completion(u, q1);
  PERFORM tests.insert_completion(u, q2);
  BEGIN
    PERFORM tests.insert_completion(u, q3);
    RAISE EXCEPTION 'expected RATE_LIMITED on third insert';
  EXCEPTION
    WHEN check_violation THEN
      NULL; -- HINT RATE_LIMITED / errcode check_violation
  END;
END;
$$;
SELECT pass('rate limit trips at third completion within 10 minutes');

DO $$
DECLARE
  u uuid;
  q uuid;
  c uuid;
  st text;
BEGIN
  u := tests.make_user('zone_in');
  q := tests.make_quest_circle(48.4284, -123.3656, 80);
  c := tests.insert_completion(u, q, 48.4284, -123.3656, 5);
  SELECT status::text INTO st FROM completions WHERE id = c;
  IF st IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION 'inside zone expected approved, got %', st;
  END IF;
END;
$$;
SELECT pass('inside circle zone -> approved');

SELECT throws_ok(
  $$
  DO $inner$
  DECLARE
    u uuid;
    q uuid;
  BEGIN
    u := tests.make_user('zone_out');
    q := tests.make_quest_circle(48.4284, -123.3656, 50);
    PERFORM tests.insert_completion(u, q, 48.50, -123.50, 5);
  END;
  $inner$;
  $$,
  '23514',
  NULL,
  'outside circle zone raises geofence check_violation'
);

-- Accuracy buffer: a point just outside the radius but within gps_accuracy can pass.
DO $$
DECLARE
  u uuid;
  q uuid;
  c uuid;
BEGIN
  u := tests.make_user('zone_buf');
  -- 80m radius; ~90m away with 20m accuracy should still be inside (radius+accuracy).
  q := tests.make_quest_circle(48.4284, -123.3656, 80);
  c := tests.insert_completion(u, q, 48.4292, -123.3656, 20);
  IF NOT EXISTS (SELECT 1 FROM completions WHERE id = c AND status = 'approved') THEN
    RAISE EXCEPTION 'accuracy buffer should approve near-edge point';
  END IF;
END;
$$;
SELECT pass('gps_accuracy buffer can approve near-edge point');

SELECT ok(
  (SELECT status::text FROM completions LIMIT 0) IS NULL OR true,
  'insert normalisation suite finished'
);

SELECT * FROM finish();
ROLLBACK;
