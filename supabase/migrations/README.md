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

## Env var naming drift

- Root `.env.example` uses `SUPABASE_SERVICE_ROLE_KEY`
- `apps/admin/.env.example` uses `SUPABASE_SECRET_KEY`

Both refer to the Supabase service-role / secret key for server-side admin access. Use the name expected by each app when copying env files.
