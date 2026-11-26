-- 044 stickers: grant/revoke, placement owner-write, public page visibility.
BEGIN;
SELECT plan(12);

DO $$
DECLARE
  u uuid;
  q uuid;
  c uuid;
  n int;
BEGIN
  u := tests.make_user('stk');
  q := tests.make_quest_none(100, now() - interval '30 days', false, 'https://example.invalid/cutout.png');
  c := tests.insert_completion(u, q);
  SELECT count(*)::int INTO n
    FROM user_stickers us
    JOIN stickers s ON s.id = us.sticker_id
   WHERE us.user_id = u AND s.quest_id = q AND s.unlock_rule = 'quest';
  IF n <> 1 THEN
    RAISE EXCEPTION 'expected 1 quest sticker after verify, got %', n;
  END IF;

  UPDATE completions SET status = 'removed' WHERE id = c;
  SELECT count(*)::int INTO n
    FROM user_stickers us
    JOIN stickers s ON s.id = us.sticker_id
   WHERE us.user_id = u AND s.quest_id = q;
  IF n <> 0 THEN
    RAISE EXCEPTION 'sticker should revoke with completion, got %', n;
  END IF;
END;
$$;
SELECT pass('verified completion grants quest sticker; revoke removes it');

DO $$
DECLARE
  owner uuid;
  other uuid;
  q uuid;
  sid uuid;
  placed uuid;
BEGIN
  owner := tests.make_user('place_o');
  other := tests.make_user('place_x');
  q := tests.make_quest_none(100, now() - interval '30 days', false, 'https://example.invalid/cutout2.png');
  PERFORM tests.insert_completion(owner, q);
  SELECT s.id INTO sid FROM stickers s WHERE s.quest_id = q;

  PERFORM tests.act_as(owner);
  INSERT INTO sticker_placements (user_id, sticker_id, x, y, tilt, scale, z)
  VALUES (owner, sid, 0.5, 0.5, 0, 1, 1)
  RETURNING id INTO placed;
  PERFORM tests.clear_auth();

  IF placed IS NULL THEN
    RAISE EXCEPTION 'owner placement insert failed';
  END IF;

  PERFORM tests.act_as(other);
  BEGIN
    INSERT INTO sticker_placements (user_id, sticker_id, x, y, tilt, scale, z)
    VALUES (owner, sid, 0.2, 0.2, 0, 1, 2);
    RAISE EXCEPTION 'other user placed on owner board';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation OR foreign_key_violation THEN
      NULL;
    WHEN others THEN
      IF SQLSTATE = '42501' OR SQLERRM ILIKE '%policy%' OR SQLERRM ILIKE '%permission%' THEN
        NULL;
      ELSE
        RAISE;
      END IF;
  END;
  PERFORM tests.clear_auth();
END;
$$;
SELECT pass('placements are owner-write only');

DO $$
DECLARE
  owner uuid;
  viewer uuid;
  q uuid;
  sid uuid;
  n int;
BEGIN
  owner := tests.make_user('vis_o');
  viewer := tests.make_user('vis_v');
  q := tests.make_quest_none(100, now() - interval '30 days', false, 'https://example.invalid/cutout3.png');
  PERFORM tests.insert_completion(owner, q);
  SELECT s.id INTO sid FROM stickers s WHERE s.quest_id = q;

  PERFORM tests.act_as(owner);
  INSERT INTO sticker_placements (user_id, sticker_id, x, y, tilt, scale, z)
  VALUES (owner, sid, 0.4, 0.4, 0, 1, 0);
  PERFORM tests.clear_auth();

  UPDATE profiles SET feed_public = false WHERE id = owner;
  PERFORM tests.act_as(viewer);
  SELECT count(*)::int INTO n FROM sticker_placements WHERE user_id = owner;
  PERFORM tests.clear_auth();
  IF n <> 0 THEN
    RAISE EXCEPTION 'private feed still visible to viewer (n=%)', n;
  END IF;

  UPDATE profiles SET feed_public = true WHERE id = owner;
  PERFORM tests.act_as(viewer);
  SELECT count(*)::int INTO n FROM sticker_placements WHERE user_id = owner;
  PERFORM tests.clear_auth();
  IF n <> 1 THEN
    RAISE EXCEPTION 'public feed should show placements (n=%)', n;
  END IF;

  INSERT INTO blocked_users (blocker_id, blocked_id) VALUES (owner, viewer);
  PERFORM tests.act_as(viewer);
  SELECT count(*)::int INTO n FROM sticker_placements WHERE user_id = owner;
  PERFORM tests.clear_auth();
  IF n <> 0 THEN
    RAISE EXCEPTION 'blocked viewer still sees placements (n=%)', n;
  END IF;
END;
$$;
SELECT pass('public page readable only when feed_public and not blocked');

SELECT ok(
  NOT has_function_privilege('authenticated', 'sync_quest_sticker()', 'EXECUTE'),
  'authenticated cannot EXECUTE sync_quest_sticker'
);
SELECT ok(
  NOT has_function_privilege('authenticated', 'grant_new_sticker_to_qualified()', 'EXECUTE'),
  'authenticated cannot EXECUTE grant_new_sticker_to_qualified'
);
SELECT ok(
  has_function_privilege('authenticated', 'can_view_sticker_page(uuid)', 'EXECUTE'),
  'authenticated can EXECUTE can_view_sticker_page'
);
SELECT ok(
  NOT has_function_privilege('anon', 'can_view_sticker_page(uuid)', 'EXECUTE'),
  'anon cannot EXECUTE can_view_sticker_page'
);

-- A-4: anon sees stickers of live quests only, never an unreleased quest's.
DO $$
DECLARE
  live_q uuid;
  future_q uuid;
  n_live int;
  n_future int;
BEGIN
  live_q := tests.make_quest_none(100, now() - interval '1 day', false, 'https://example.invalid/live.png');
  future_q := tests.make_quest_none(100, now() + interval '3 days', false, 'https://example.invalid/future.png');

  EXECUTE 'SET LOCAL ROLE anon';
  SELECT count(*)::int INTO n_live FROM stickers WHERE quest_id = live_q;
  SELECT count(*)::int INTO n_future FROM stickers WHERE quest_id = future_q;
  PERFORM tests.clear_auth();

  IF n_live <> 1 THEN
    RAISE EXCEPTION 'anon should read the live quest sticker, got %', n_live;
  END IF;
  IF n_future <> 0 THEN
    RAISE EXCEPTION 'anon read an unreleased quest sticker, got %', n_future;
  END IF;
END;
$$;
SELECT pass('anon reads a live quest sticker but not an unreleased one (A-4)');

-- A-4: a sticker you earned stays readable after its quest's window ends.
DO $$
DECLARE
  u uuid;
  q uuid;
  n int;
BEGIN
  u := tests.make_user('a4_ended');
  q := tests.make_quest_none(100, now() - interval '30 days', false, 'https://example.invalid/ended.png');
  PERFORM tests.insert_completion(u, q);
  UPDATE quests SET active_until = now() - interval '1 day' WHERE id = q;

  PERFORM tests.act_as(u);
  SELECT count(*)::int INTO n FROM stickers WHERE quest_id = q;
  PERFORM tests.clear_auth();
  IF n <> 1 THEN
    RAISE EXCEPTION 'earned sticker of an ended quest should stay readable, got %', n;
  END IF;
END;
$$;
SELECT pass('earned sticker of an ended quest stays readable to its owner');

-- A-5: clients cannot write the drawer.
DO $$
DECLARE
  u uuid;
  q uuid;
  sid uuid;
BEGIN
  u := tests.make_user('a5');
  q := tests.make_quest_none(100, now() - interval '30 days', false, 'https://example.invalid/a5.png');
  SELECT s.id INTO sid FROM stickers s WHERE s.quest_id = q;

  PERFORM tests.act_as(u);
  BEGIN
    INSERT INTO user_stickers (user_id, sticker_id) VALUES (u, sid);
    RAISE EXCEPTION 'client inserted into user_stickers';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE stickers SET alt_text = 'hijacked sticker' WHERE id = sid;
    RAISE EXCEPTION 'client updated stickers';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
  PERFORM tests.clear_auth();
END;
$$;
SELECT pass('clients cannot write user_stickers or stickers (A-5)');

-- A-6: a retired (inactive) sticker is not granted on verify.
DO $$
DECLARE
  u uuid;
  q uuid;
  n int;
BEGIN
  u := tests.make_user('a6');
  q := tests.make_quest_none(100, now() - interval '30 days', false, 'https://example.invalid/a6.png');
  UPDATE stickers SET is_active = false WHERE quest_id = q;
  PERFORM tests.insert_completion(u, q);
  SELECT count(*)::int INTO n FROM user_stickers WHERE user_id = u;
  IF n <> 0 THEN
    RAISE EXCEPTION 'retired sticker was granted, got %', n;
  END IF;
END;
$$;
SELECT pass('a retired sticker is not granted (A-6)');

-- A-8: a 1-2 character cutout_alt falls back to the title instead of failing the save.
DO $$
DECLARE
  q uuid;
  alt text;
BEGIN
  q := tests.make_quest_none(100, now() - interval '30 days', false, 'https://example.invalid/a8.png');
  UPDATE quests SET cutout_alt = 'ab' WHERE id = q;
  SELECT s.alt_text INTO alt FROM stickers s WHERE s.quest_id = q;
  IF alt IS DISTINCT FROM 'pgtap none sticker' THEN
    RAISE EXCEPTION 'expected title fallback alt text, got %', alt;
  END IF;
END;
$$;
SELECT pass('a short cutout_alt falls back to the title (A-8)');

SELECT * FROM finish();
ROLLBACK;
