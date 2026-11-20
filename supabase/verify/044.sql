-- Verifying migration 044 (stickers).
-- Pass: every quest with cutout_url has a matching quest sticker; cutout_alt granted;
--       stickers / user_stickers readable and sticker_placements INSERT allowed for
--       authenticated; definer helpers not client-callable except can_view_sticker_page;
--       normalize_completion_on_insert still stores xp_awarded (043 body); verify grants
--       a sticker and ROLLBACK leaves nothing.
-- Read-only pack: behaviour block 1 uses BEGIN ... ROLLBACK. Blocks 2–3 are commented
-- manual checks (copied from README).
-- Requires 043 applied. Paste into the Supabase SQL editor after applying 044.

-- Structure, backfill and grants

-- Quests with a cutout have a matching quest sticker
SELECT count(*) FROM quests q
 WHERE q.cutout_url IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM stickers s WHERE s.quest_id = q.id AND s.unlock_rule = 'quest');
-- expect 0

-- cutout_alt is readable (explicit column grant)
SELECT has_column_privilege('authenticated', 'quests', 'cutout_alt', 'SELECT') AS alt_authed,
       has_column_privilege('anon',          'quests', 'cutout_alt', 'SELECT') AS alt_anon;
-- expect: true / true

-- Stickers and drawers are readable; placement writes are owner-only columns
SELECT has_table_privilege('authenticated', 'stickers', 'SELECT') AS stickers_read,
       has_table_privilege('authenticated', 'user_stickers', 'SELECT') AS drawer_read,
       has_table_privilege('authenticated', 'sticker_placements', 'INSERT') AS place_insert;
-- expect: true / true / true (column-level INSERT still restricts which columns)

-- Definer helpers are not client-callable; can_view_sticker_page is authenticated-only
SELECT p.oid::regprocedure,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authed,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon
  FROM pg_proc p
 WHERE p.proname IN (
   'apply_completion_rewards', 'revoke_completion_rewards',
   'sync_quest_sticker', 'grant_new_sticker_to_qualified', 'grant_badge_stickers',
   'enforce_sticker_placement_limit', 'can_view_sticker_page'
 );
-- expect: apply/revoke/sync/grant_*/enforce false/false;
--         can_view_sticker_page(uuid) true/false

-- 044 must not redefine normalize_completion_on_insert (043 owns XP award storage)
SELECT pg_get_functiondef(p.oid) LIKE '%xp_awarded%' AS still_stores_award
  FROM pg_proc p WHERE p.proname = 'normalize_completion_on_insert';
-- expect: true (043 body still in place)

-- Behaviour (run in a transaction and roll back)

-- 1. Verify -> sticker granted (through apply_completion_rewards)
BEGIN;
INSERT INTO completions (user_id, quest_id, photo_url, lat, lng, gps_accuracy)
SELECT '<test-player>', q.id, 'verify', q.lat, q.lng, 5
  FROM quests q WHERE q.cutout_url IS NOT NULL LIMIT 1
RETURNING id, status, xp_awarded;
SELECT us.* FROM user_stickers us
  JOIN stickers s ON s.id = us.sticker_id
 WHERE us.user_id = '<test-player>' AND s.unlock_rule = 'quest';
-- expect: one row for that quest's sticker
ROLLBACK;

-- 2. Remove -> sticker revoked (through revoke_completion_rewards)
-- Use a real approved completion you own, then:
-- UPDATE completions SET status = 'removed' WHERE id = '<completion-id>';
-- SELECT count(*) FROM user_stickers us JOIN stickers s ON s.id = us.sticker_id
--  WHERE us.user_id = '<player>' AND s.quest_id = '<quest>';  -- expect 0
-- (placements for that sticker cascade away)

-- 3. Placement RLS: owner writes only; public pages honour feed_public and blocks
-- As player A: INSERT into sticker_placements for A's sticker -> ok
-- As player B: INSERT for A's sticker_id/user_id -> fail
-- As B viewing A with feed_public=false -> SELECT placements empty
-- As B viewing A with a block either way -> SELECT placements empty
