# Migration run order

Apply migrations in numeric/filename order:

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

## Env var naming drift

- Root `.env.example` uses `SUPABASE_SERVICE_ROLE_KEY`
- `apps/admin/.env.example` uses `SUPABASE_SECRET_KEY`

Both refer to the Supabase service-role / secret key for server-side admin access. Use the name expected by each app when copying env files.
