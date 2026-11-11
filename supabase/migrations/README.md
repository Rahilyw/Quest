# Migration index and rollout notes

The baseline schema is `20260619010246_initial_schema.sql`; numbered follow-ups are `002`–`040`.
There is no `001_initial_schema.sql`. The Nov 10, 2026 runbook reports the existing Quest project
has the baseline and migrations through 038 applied; that report was not independently re-queried.
**039 and 040: Applied to production (`xuviwarpgvxzpouqesrv`) by the owner on Nov 11, 2026 with `npx supabase db push --remote --include-all`. The "Verifying 039" checks below have not been recorded as run.**

For any authorized hosted migration operation, inspect the target and dry-run first. The Supabase
CLI defaults to the local stack; `--remote` explicitly targets the linked hosted project.

## Clean install order (DB-01)

Version order is by filename prefix, so `002` … `040` sort before `20260619010246`. A fresh
database that applies files in that order fails at 002, which needs `profiles`. That covers
`supabase db reset`, `supabase start` on an empty local stack, and `db push` to a new project.
Do not rename or renumber any file: the hosted project's history table records these exact
versions, and a renamed file would look like a new, unapplied migration there.

The dependency order is fixed:

1. `20260619010246_initial_schema.sql`
2. `002` through `040`, ascending

To get that order on a **new, empty** database without touching history on the existing one,
apply the baseline by hand and record it, then let the CLI do the rest:

```bash
# 1. Run the baseline against the new database (psql, or paste the file into the SQL editor).
psql "$NEW_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20260619010246_initial_schema.sql

# 2. Record that version as applied, so the CLI does not try it again after 040.
npx supabase migration repair --status applied 20260619010246 --db-url "$NEW_DB_URL"

# 3. Dry-run, read the list (it should be 002 to 040 in order), then apply.
npx supabase db push --db-url "$NEW_DB_URL" --dry-run
npx supabase db push --db-url "$NEW_DB_URL"
```

The new database must start empty of these migrations. `supabase db reset` and a first
`supabase start` replay the folder in filename order and stop at 002, so they are not a
clean-install path as the files stand. A working local-stack recipe has not been established.

**Status of this procedure: written from the file dependencies, not executed.** On Nov 11, 2026
there was no Supabase CLI or `psql` on the working machine and the Docker daemon was not running,
so no clean install was run and the CLI flags above were not checked against `--help`. Run it
once against a throwaway database and correct this section if any step differs. Never run it
against the existing hosted project; that project already has the baseline recorded.

The existing project needs none of this. Its next step is an ordinary, owner-run
`db push --remote --dry-run` that should list exactly 039 and 040.

## Verifying 039 (profile token privacy)

`apps/mobile/__tests__/profilePrivacy.test.js` checks the SQL text and the client's queries. It
does not execute SQL. After applying 039 to any database, confirm the behaviour directly:

```sql
-- As an authenticated client (PostgREST, or SET ROLE authenticated with the JWT claims set):
SELECT push_token FROM profiles LIMIT 1;          -- expect: permission denied (42501)
SELECT * FROM profiles LIMIT 1;                   -- expect: permission denied (42501)
SELECT id, username, level FROM profiles LIMIT 1; -- expect: rows
SELECT own_push_enabled();                        -- expect: true or false for the caller
UPDATE profiles SET push_token = NULL WHERE id = auth.uid();   -- expect: 1 row
UPDATE profiles SET push_token = 'x' WHERE id <> auth.uid();   -- expect: 0 rows
UPDATE profiles SET push_token = NULL WHERE id = auth.uid() RETURNING push_token; -- expect: 42501

-- As an admin:
SELECT grantee, column_name FROM information_schema.column_privileges
 WHERE table_name = 'profiles' AND privilege_type = 'SELECT' AND column_name = 'push_token';
-- expect: no anon or authenticated rows
```

| File | Description |
|------|-------------|
| `20260619010246_initial_schema.sql` | Core tables, XP trigger, storage bucket |
| `002_badge_unlock_trigger.sql` | Badge trigger (replaced by 005) |
| `003_add_quest_categories.sql` | Adds outdoor/culture enum values (unused in seed) |
| `004_push_token.sql` | Adds `push_token` to profiles |
| `005_align_badge_unlock_logic.sql` | Replaces 002 trigger; must run after 004 |
| `006_streak_system.sql` | Weekly streak columns and XP trigger extension |
| `007_avatar_bucket.sql` | Public `avatars` storage bucket and RLS policies |
| `008_public_feed_completions.sql` | RLS policy so activity feed can read approved completions |
| `009_quest_cover_and_badges.sql` | `quests.cover_image_url` column + `quest_badges` junction table |
| `010_quest_covers_bucket.sql` | Public `quest-covers` storage bucket for admin cover uploads |
| `011_leaderboard_rank_snapshot.sql` | `profiles.last_week_rank` for weekly rank delta display |
| `012_quest_scheduling.sql` | `quests.active_from` / `active_until` scheduling columns |
| `013_geofence_system.sql` | PostGIS, `geofence_type` enum, `cities` table, completion geofence trigger |
| `014_geofence_polygon_enum.sql` | Adds `polygon` to `geofence_type` (enum value must land in its own transaction) |
| `015_geofence_polygon.sql` | `quests.boundary` + generated `boundary_geojson`, `set_quest_boundary()` validated write path, polygon branch in `check_completion_geofence()` |
| `016_completion_status_removed.sql` | Adds `removed` to `completion_status` (enum value must land in its own transaction) |
| `017_instant_verification.sql` | Auto-approve on insert, rewards on insert path, rate limits, in-DB redemption codes, XP revocation on `removed` |
| `018_completion_reports.sql` | Reports, blocking, feed privacy (`feed_public`), auto-hide at 3 reports, moderation GPS evidence |
| `019_expand_badges.sql` | Expands badge set and unlock trigger rules |
| `020_admin_badge_system.sql` | Badge metadata columns, icon uploads, data-driven unlock rules from admin |
| `021_per_badge_unlock_thresholds.sql` | Fixes badge unlock evaluation: precomputes raw per-user metrics, per-badge threshold comparison (fixes shared-rule-type collision where 2+ badges couldn't have different limits) |
| `022_victoria_boundary.sql` | Replaces placeholder bounding box with official Victoria municipal boundary |
| `023_account_deletion.sql` | `delete_own_account()` RPC (App Store 5.1.1(v)); report-count trigger now fires on DELETE so cascade-deleted reports can't leave phantom counts |
| `024_geofence_multi_enum.sql` | Adds `multi` to `geofence_type` (enum value must land in its own transaction) |
| `025_quest_multi_geofences.sql` | `quest_geofences` child areas (circle/polygon), `replace_quest_geofences()`, multi OR-match in `check_completion_geofence()` |
| `026_audit_security_geofence.sql` | Column-level profile UPDATE lock; server-owned `completed_at`; `gps_accuracy` + geofence buffer; leaderboard view `level`/`last_week_rank`; completion indexes. Live XP path remains 017 triggers (award-xp edge function retired). |
| `027_social_graph.sql` | Social layer: `completion_likes`, `completion_comments` (one-level replies), `follows`, `is_blocked_pair()`, `can_view_completion()` RLS helpers |
| `028_comment_reports.sql` | Comment reports (Apple 1.2): `comment_reports`, auto-hide at 3 reporters, admin `removed_at`, report budget shared with post reports; clients can only UPDATE comment `body`; completions read policy now hides blocked pairs from each other |
| `029_social_rate_limits_notifications.sql` | Rate limits on comments (10/10 min, 100/day), likes (120/h), follows (60/h, 200/day); `notifications` activity inbox fed by like/comment/reply/follow triggers; `profiles.push_social`. Push via `send-social-push` + Database Webhook |
| `030_lock_down_definer_functions.sql` | Revokes client EXECUTE on `apply_completion_rewards` (it was callable over RPC and could mint XP); restricts `get_completion_geofence_evidence` to `service_role`; pins `search_path` on 14 definer functions. Applied live Nov 7, 2026 |
| `031_audit_fixes.sql` | Nov 2026 audit: weekly rank snapshot moved into SQL (`snapshot_last_week_ranks()` on pg_cron, replacing the never-scheduled `snapshot-ranks` edge function); leaderboard week in `America/Vancouver`; client EXECUTE revoked on trigger functions; `search_path` on 5 more functions; 9 foreign-key indexes; RLS policies evaluate `auth.uid()` once per query |
| `032_quest_cutouts.sql` | Cutouts redesign: quest cutout/action/distance/duration fields, optional completion selfie path, public cutout and private selfie buckets, quest photo index, and account-deletion cleanup for selfies. Applied Nov 10, 2026. Re-applying drops `Owners can delete proof selfies` before creating it. |
| `033_selfie_signed_url_access.sql` | `can_view_selfie_object()` + storage SELECT policy on private `proof-selfies`, so the viewer's own JWT can `createSignedUrl` only for selfies of completions they may see (`can_view_completion`: own, or approved, not hidden, feed public, no block). Applied Nov 10, 2026. |
| `034_weekly_drops.sql` | Client reads hide quests before `active_from` and after `active_until` (completed quests stay readable to that player). Completion insert rejects a closed window. `profiles.push_drops`. `push_outbox` + `weekly_drop_sends` and `enqueue_weekly_drop()` on two Monday UTC crons (PST/PDT). Applied Nov 10, 2026. New ids use `gen_random_uuid()`. Push is not sent until `send-push-outbox` is deployed. |
| `035_quest_suggestions.sql` | `quest_suggestions`, 3-open cap, `quests.suggested_by`, one-time +100 XP and City Author via `publish_suggested_quest` (service role only). Applied Nov 10, 2026. New ids use `gen_random_uuid()`. |
| `036_merchant_redemption.sql` | `sponsors` plus an unguessable `merchant_key`. Service-role lookup and idempotent mark-redeemed, 10 attempts per minute per sponsor. Players cannot set `redeemed_at` (`redeemed_at` itself is from 017). Applied Nov 10, 2026. New ids use `gen_random_uuid()`. |
| `037_starter_quest.sql` | Adds `quests.is_starter`, designates the anywhere journal quest, and provides a service-role-only transaction for safely moving the designation. Applied Nov 10, 2026. |
| `038_completion_secret_columns.sql` | Drops anon/authenticated table SELECT on `completions`, then grants every column except `redemption_code`, `lat`, `lng`, `gps_accuracy` and `reviewed_by`. Owners read their own code via `own_completion_reward` / `own_reward_codes`. Non-sponsored inserts cannot keep a client-supplied code. Streak week uses `America/Vancouver`. A later column on `completions` needs its own GRANT. Runbook reports applied Nov 10, 2026. |
| `039_profile_push_token_privacy.sql` | SEC-01. Drops anon/authenticated table SELECT on `profiles`, then grants every column except `push_token`. `own_push_enabled()` gives Settings a yes/no for the caller. Own-row `push_token` UPDATE is unchanged. `select=*` on profiles from a client now fails, so ship the client first. A later column on `profiles` needs its own GRANT. **Applied to production Nov 11, 2026; verification checks not yet recorded.** |
| `040_week_recap.sql` | Spec 06 §2. `own_week_recap(date)` returns the caller's rank, weekly XP, quest count, derived streak and best own place photo for one `America/Vancouver` week (current or previous only). Authenticated only. Recomputed from live rows; no snapshot table. **Applied to production Nov 11, 2026.** |

## Column grants: what a new column needs

`completions` (038) and `profiles` (039) have no table-level SELECT for client roles. A
migration that adds a column to either must `GRANT SELECT (new_column)` to `anon, authenticated`
if clients should read it. Leaving the grant out is the safe default: the column is unreadable.

## Env var naming drift

- Root `.env.example` uses `SUPABASE_SERVICE_ROLE_KEY`
- `apps/admin/.env.example` uses `SUPABASE_SECRET_KEY`

Both refer to the Supabase service-role / secret key for server-side admin access. Use the name expected by each app when copying env files.
