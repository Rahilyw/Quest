-- Verifying migration 043 (XP economy events).
-- Pass: xp_awarded NOT NULL and backfilled; column grants for xp_awarded/xp_reason;
--       xp_events and win_back_sends closed to clients with RLS and no policies;
--       old apply_completion_rewards(uuid,uuid) gone; schedules for win-back present;
--       behaviour blocks match expected multipliers / revoke / win_back consume;
--       leaderboard totals match stored awards; enqueue_win_back guard holds.
-- Read-only pack: every behaviour block, including first finisher, is BEGIN ... ROLLBACK, so
-- it leaves no completion behind. photo_url must be the canonical proof-photos URL for the
-- player and quest (043 rejects anything else), so each block builds one.
-- Paste into the Supabase SQL editor after applying 041 and 043 (043 requires 041).

-- Structure and grants

-- Backfill: no nulls, column is NOT NULL
SELECT count(*) FROM completions WHERE xp_awarded IS NULL;                 -- expect 0
SELECT is_nullable FROM information_schema.columns
 WHERE table_name = 'completions' AND column_name = 'xp_awarded';          -- expect NO
-- Existing rows match today's quest values (true right after applying; drifts by design later)
SELECT count(*) FROM completions c JOIN quests q ON q.id = c.quest_id
 WHERE c.xp_awarded <> q.xp_reward AND c.xp_reason IS NULL;                -- expect 0 right after apply

-- Column grants (038 rule)
SELECT has_column_privilege('authenticated', 'completions', 'xp_awarded', 'SELECT') AS awarded,
       has_column_privilege('authenticated', 'completions', 'xp_reason',  'SELECT') AS reason,
       has_column_privilege('anon',          'completions', 'xp_awarded', 'SELECT') AS anon_awarded;
-- expect: true / true / true

-- xp_events and win_back_sends are closed to clients
SELECT has_table_privilege('authenticated', 'xp_events', 'SELECT') AS ev_read,
       has_table_privilege('authenticated', 'xp_events', 'INSERT') AS ev_write,
       has_table_privilege('authenticated', 'win_back_sends', 'SELECT') AS sends_read;
-- expect: false / false / false
SELECT relrowsecurity FROM pg_class WHERE relname IN ('xp_events', 'win_back_sends'); -- expect true, true
SELECT count(*) FROM pg_policies WHERE tablename = 'xp_events';                       -- expect 0

-- Old overload gone; new reward function and job are server-only
SELECT to_regprocedure('apply_completion_rewards(uuid,uuid)');            -- expect NULL
SELECT p.oid::regprocedure,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authed,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon
  FROM pg_proc p
 WHERE p.proname IN ('apply_completion_rewards', 'enqueue_win_back', 'active_xp_boosts',
                     'own_completion_reward', 'normalize_completion_on_insert');
-- expect: apply_completion_rewards(uuid), enqueue_win_back(), normalize_completion_on_insert()
--         false / false; active_xp_boosts() and own_completion_reward(uuid) true / false

-- Schedules
SELECT jobname, schedule, command FROM cron.job
 WHERE jobname IN ('enqueue-win-back-0000', 'enqueue-win-back-0100');
-- expect: 0 0 * * * and 0 1 * * *, both SELECT public.enqueue_win_back()

-- Behaviour (run in a transaction and roll back)
-- Use test accounts you own and a quest whose zone contains its own lat/lng (most circle
-- quests). Each block inserts as postgres, so RLS is bypassed but every completion trigger runs.
-- The rate limit allows two inserts per player per 10 minutes, so use a different test player per
-- insert, or run each block on its own.

-- 1. One global ×2 event doubles the award.
BEGIN;
INSERT INTO xp_events (kind, multiplier, label, starts_at, ends_at, created_by)
VALUES ('multiplier', 2, 'verify', now() - interval '1 minute', now() + interval '1 hour', 'verify');
INSERT INTO completions (user_id, quest_id, photo_url, lat, lng, gps_accuracy)
SELECT '<test-player-1>', q.id, 'https://example.invalid/proof-photos/<test-player-1>/' || q.id || '/verify.jpg', q.lat, q.lng, 5 FROM quests q WHERE q.id = '<old-quest-id>'
RETURNING xp_awarded, xp_reason;
-- expect: 2 × that quest's xp_reward, reason 'weekend'
-- (pick a quest that started more than 7 days ago, or it may also get first-finisher)
ROLLBACK;

-- 2. Quest ×1.5 plus global ×2 gives the max (×2), not the product (×3).
BEGIN;
INSERT INTO xp_events (kind, multiplier, label, starts_at, ends_at, created_by) VALUES
  ('multiplier', 2,   'verify global', now() - interval '1 minute', now() + interval '1 hour', 'verify');
INSERT INTO xp_events (kind, multiplier, quest_id, label, starts_at, ends_at, created_by) VALUES
  ('multiplier', 1.5, '<old-quest-id>', 'verify quest', now() - interval '1 minute', now() + interval '1 hour', 'verify');
INSERT INTO completions (user_id, quest_id, photo_url, lat, lng, gps_accuracy)
SELECT '<test-player-2>', q.id, 'https://example.invalid/proof-photos/<test-player-2>/' || q.id || '/verify.jpg', q.lat, q.lng, 5 FROM quests q WHERE q.id = '<old-quest-id>'
RETURNING xp_awarded, xp_reason;   -- expect ×2, 'weekend'
ROLLBACK;

-- 3. Revoke subtracts the stored award, and a reinstate pays it back.
BEGIN;
INSERT INTO xp_events (kind, multiplier, label, starts_at, ends_at, created_by)
VALUES ('multiplier', 3, 'verify', now() - interval '1 minute', now() + interval '1 hour', 'verify');
SELECT total_xp FROM profiles WHERE id = '<test-player-3>';                       -- note T0
INSERT INTO completions (user_id, quest_id, photo_url, lat, lng, gps_accuracy)
SELECT '<test-player-3>', q.id, 'https://example.invalid/proof-photos/<test-player-3>/' || q.id || '/verify.jpg', q.lat, q.lng, 5 FROM quests q WHERE q.id = '<old-quest-id>'
RETURNING id, xp_awarded;                                                          -- note A (= 3 × base)
SELECT total_xp FROM profiles WHERE id = '<test-player-3>';                       -- expect T0 + A
UPDATE completions SET status = 'removed' WHERE id = '<id from above>';
SELECT total_xp FROM profiles WHERE id = '<test-player-3>';                       -- expect T0
UPDATE completions SET status = 'approved' WHERE id = '<id from above>';
SELECT total_xp FROM profiles WHERE id = '<test-player-3>';                       -- expect T0 + A
ROLLBACK;

-- 4. Win-back: personal ×2 is consumed by the next completion.
BEGIN;
INSERT INTO xp_events (kind, multiplier, user_id, label, starts_at, ends_at, created_by)
VALUES ('win_back', 2, '<test-player-4>', 'verify', now() - interval '1 minute', now() + interval '7 days', 'verify');
INSERT INTO completions (user_id, quest_id, photo_url, lat, lng, gps_accuracy)
SELECT '<test-player-4>', q.id, 'https://example.invalid/proof-photos/<test-player-4>/' || q.id || '/verify.jpg', q.lat, q.lng, 5 FROM quests q WHERE q.id = '<old-quest-id>'
RETURNING xp_awarded, xp_reason;   -- expect ×2, 'win_back'
SELECT consumed_at IS NOT NULL FROM xp_events WHERE user_id = '<test-player-4>';   -- expect true
ROLLBACK;

-- 5. First finisher: only the first approved completion of a new quest gets the bonus.
-- One session, rolled back, so nothing is left in production. Use a quest whose
-- coalesce(active_from, created_at) is within the last 7 days and that has no approved
-- completion yet, and two different test players (the rate limit is per player).
-- The two-session race test is not run here: the advisory lock that serialises it is proven by
-- reading the function, and supabase/tests/043_xp.test.sql covers first finisher in pgTAP.
BEGIN;
INSERT INTO completions (user_id, quest_id, photo_url, lat, lng, gps_accuracy)
SELECT '<test-player-5>', q.id, 'https://example.invalid/proof-photos/<test-player-5>/' || q.id || '/verify.jpg', q.lat, q.lng, 5 FROM quests q WHERE q.id = '<new-quest-id>'
RETURNING xp_awarded, xp_reason;   -- expect round(base × 1.5), 'first_finisher'
INSERT INTO completions (user_id, quest_id, photo_url, lat, lng, gps_accuracy)
SELECT '<test-player-6>', q.id, 'https://example.invalid/proof-photos/<test-player-6>/' || q.id || '/verify.jpg', q.lat, q.lng, 5 FROM quests q WHERE q.id = '<new-quest-id>'
RETURNING xp_awarded, xp_reason;   -- expect base, reason NULL
ROLLBACK;

-- Totals

-- The leaderboard equals the stored awards for this Victoria week.
WITH stored AS (
  SELECT c.user_id, sum(c.xp_awarded)::integer AS xp
    FROM completions c
   WHERE c.status = 'approved'
     AND c.reviewed_at >= (date_trunc('week', now() AT TIME ZONE 'America/Vancouver') AT TIME ZONE 'America/Vancouver')
   GROUP BY c.user_id
)
SELECT count(*) FROM leaderboard l LEFT JOIN stored s ON s.user_id = l.user_id
 WHERE l.weekly_xp <> coalesce(s.xp, 0);                                  -- expect 0

-- Win-back guard: before 17:00 Victoria this returns 0 and writes nothing.
BEGIN;
SELECT enqueue_win_back();
SELECT * FROM win_back_sends ORDER BY local_date DESC LIMIT 3;
SELECT count(*) FILTER (WHERE consumed_at IS NULL AND ends_at > now()) AS open_win_backs,
       count(*) FILTER (WHERE consumed_at IS NOT NULL) AS used
  FROM xp_events WHERE kind = 'win_back';
ROLLBACK;
