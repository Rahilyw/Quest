# Phase A Implementation Spec: Geofence System

**Scope:** `none` · `circle` · `city` geofence types — fix hardcoded 300m bug, PostGIS server validation, admin type picker + map preview, mobile client checks.

**Out of scope (Phase B):** polygon drawing, `geofence` geometry column, vertex editor.

**Status:** Phase A complete (Day 1–3 merged)

---

## Implementation order

1. ✅ Migration + seed + geofence package + tests
2. ✅ Admin GeofenceEditor + actions
3. ✅ Mobile submit + display labels + map + seed
4. ⚠️ Apply migration 013 on live Supabase + E2E manual tests + real Victoria boundary polygon

---

## Bug fixed

`apps/mobile/app/submit/[questId].tsx` previously used hardcoded `PROOF_GEOFENCE_RADIUS = 300`. Now uses `@quest/geofence` with per-quest `geofence_type`.

---

## Migration

See `supabase/migrations/013_geofence_system.sql`:
- PostGIS extension
- `geofence_type` enum (`none`, `circle`, `city`)
- `cities` table with Victoria boundary
- `quests.geofence_type`, `quests.city_id`
- `check_completion_geofence()` + INSERT trigger on `completions`

Boundary seed: `supabase/seeds/victoria-bc-boundary.geojson`

---

## Shared package

`packages/geofence` — `@quest/geofence`

Exports:
- `isWithinGeofence(input)`
- `formatGeofenceLabel(quest, cityName?)`
- `formatGeofenceShort(quest)`
- `VICTORIA_BOUNDARY`, `RADIUS_PRESETS`, etc.

---

## Geofence types

| Type | radius_meters | city_id | Client | Server |
|------|---------------|---------|--------|--------|
| `none` | 0 | null | always pass | always pass |
| `circle` | 50–2000 | null | haversine + GPS buffer | ST_DWithin |
| `city` | 0 | victoria-bc | point-in-polygon | ST_Covers |

---

## Tests

```bash
node packages/geofence/src/__tests__/geofence.test.js
node apps/mobile/__tests__/logic.test.js
```
