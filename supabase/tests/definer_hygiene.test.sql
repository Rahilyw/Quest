-- Definer hygiene: search_path set; internal helpers not executable by clients.
BEGIN;
SELECT plan(4);

-- Name any offenders so a failure is actionable (build-2 stop vs in-place fix).
SELECT diag(format('missing search_path: %s(%s)', p.proname, pg_get_function_identity_arguments(p.oid)))
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.prosecdef
   AND NOT EXISTS (
         SELECT 1
           FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
          WHERE cfg LIKE 'search_path=%'
       );

SELECT is(
  (
    SELECT count(*)::int
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prosecdef
       AND NOT EXISTS (
             SELECT 1
               FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
              WHERE cfg LIKE 'search_path=%'
           )
  ),
  0,
  'every public SECURITY DEFINER function has search_path set'
);

SELECT ok(
  (
    SELECT bool_and(
             NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
             AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
           )
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN (
         'normalize_completion_on_insert',
         'apply_completion_rewards',
         'revoke_completion_rewards',
         'claim_push_outbox',
         'finish_push_outbox',
         'release_push_outbox',
         'invoke_push_outbox_drain',
         'enqueue_week_recap',
         'enqueue_win_back',
         'enqueue_weekly_drop',
         'sync_quest_sticker',
         'grant_new_sticker_to_qualified',
         'grant_badge_stickers',
         'enforce_sticker_placement_limit'
       )
  ),
  'README-listed internal definers are not executable by anon/authenticated'
);

SELECT ok(
  has_function_privilege('authenticated', 'own_completion_reward(uuid)', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'own_completion_reward(uuid)', 'EXECUTE'),
  'own_completion_reward is authenticated-only'
);

SELECT ok(
  has_function_privilege('authenticated', 'active_xp_boosts()', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'active_xp_boosts()', 'EXECUTE'),
  'active_xp_boosts is authenticated-only'
);

SELECT * FROM finish();
ROLLBACK;
