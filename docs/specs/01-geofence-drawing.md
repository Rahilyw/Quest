# Spec 01 — Geofence Drawing (custom polygon perimeters)

**Status:** Draft
**Depends on:** migration `013_geofence_system.sql` (shipped)
**Enables:** Spec 02 (instant verification trusts the geofence as proof)

## Summary

Admins define where a quest takes place by drawing on a map. Three of the four geofence shapes already exist (`none`, `circle`, `city` — migration 013 + `GeofenceEditor.tsx`). This spec adds the fourth: **`polygon`** — a hand-drawn perimeter for irregular locations (a park, a beach, a market square, a mountain summit trail network).

| Type | Example | Status |
|---|---|---|
| `none` | Journal-at-home quest, radius 0 | ✅ Shipped |
| `city` | "Anywhere in Victoria" | ✅ Shipped (placeholder boundary — see §7) |
| `circle` | 50 m around Mount Doug summit marker | ✅ Shipped |
| `polygon` | Exact outline of Beacon Hill Park | ❌ **This spec** |

## 1. Data model (migrations `014`, `015`)

`ALTER TYPE ... ADD VALUE` cannot be *used* in the same transaction that adds it, so this is two migrations:

**`014_geofence_polygon_enum.sql`**
```sql
ALTER TYPE geofence_type ADD VALUE IF NOT EXISTS 'polygon';
```

**`015_geofence_polygon.sql`**
```sql
ALTER TABLE quests
  ADD COLUMN IF NOT EXISTS boundary GEOGRAPHY(POLYGON, 4326);

-- polygon quests must carry a boundary; other types must not
ALTER TABLE quests ADD CONSTRAINT quests_polygon_boundary_check
  CHECK (
    (geofence_type = 'polygon' AND boundary IS NOT NULL)
    OR (geofence_type <> 'polygon' AND boundary IS NULL)
  );
```

`lat`/`lng` remain required for polygon quests — they are the map-pin/centroid used by Explore cards and the mobile map. The admin form auto-fills them with the polygon centroid (`ST_Centroid`), editable afterward.

### Validation function (server-side, single source of truth)

```sql
CREATE OR REPLACE FUNCTION set_quest_boundary(p_quest_id UUID, p_geojson JSONB)
RETURNS void ...
```
Called from the admin server action. Rules enforced here (and mirrored client-side for instant feedback):

| Rule | Limit | Failure message |
|---|---|---|
| Ring is closed & simple | `ST_IsValid` after `ST_MakeValid` attempt | "Shape crosses itself — adjust the highlighted points" |
| Vertex count | 3 ≤ n ≤ 100 | "Too many points — simplify the shape" |
| Area floor | ≥ 400 m² (~20 m × 20 m) | "Zone too small for GPS accuracy — draw a bigger area or use a 50 m radius instead" |
| Area ceiling | ≤ 250 km² (bigger than Victoria) | "Zone too large — use the City geofence instead" |
| Single ring | no holes, no multipolygon | rejected at parse |

Self-intersections: attempt `ST_MakeValid` first; if the result is a single valid polygon, accept the repaired shape and return it to the UI for confirmation; otherwise reject.

### Reading boundaries (mobile + admin edit)

Mirror the existing `get_city_boundary_geojson`:

```sql
CREATE OR REPLACE FUNCTION get_quest_boundary_geojson(p_quest_id UUID)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT ST_AsGeoJSON(boundary::geometry)::jsonb FROM quests WHERE id = p_quest_id;
$$;
GRANT EXECUTE ON FUNCTION get_quest_boundary_geojson(UUID) TO authenticated;
```

## 2. Completion validation (extends `check_completion_geofence`)

Add a polygon branch to the existing function in 013 — the `BEFORE INSERT` trigger on `completions` picks it up automatically, so **no client can bypass it**:

```sql
IF v_type = 'polygon' THEN
  RETURN ST_DWithin(v_boundary, v_point, v_buffer);  -- buffer = GPS accuracy, capped at 30 m (unchanged)
END IF;
```

`ST_DWithin(boundary, point, 0)` is equivalent to `ST_Covers` for points inside; the buffer gives the same GPS-accuracy grace the circle type already gets at the edges.

### Answers to the open questions

- **Overlapping perimeters (between quests):** explicitly allowed, no constraint. Each completion validates only against its own quest's fence. Two quests can share a plaza.
- **Irregular shapes:** any simple polygon within the limits above. No holes/multi-rings in v1 (not worth the UX cost; a landmark quest never needs a donut).
- **Validation logic for uploads:** unchanged architecture — the existing `trg_enforce_completion_geofence BEFORE INSERT` trigger is the authority. The photo is uploaded first, but the completion row (and therefore XP) only exists if the coordinates pass. Client-side checks are advisory UX only.

## 3. Admin UX — drawing tool (`apps/admin/components/GeofenceEditor.tsx`)

Extend the existing editor. A fourth pill joins the row:

```
[📍 Anywhere] [⭕ Radius] [🌆 Victoria] [✏️ Draw]
```

**Recommended library:** `@geoman-io/leaflet-geoman-free` on top of the existing react-leaflet map — it provides draw / drag-vertex / insert-midpoint / delete-vertex out of the box and is MIT-licensed. (Fallback if the dependency is unwanted: hand-rolled draggable `Marker` per vertex + polyline preview, consistent with how the circle editor was hand-rolled — roughly 2 extra days of work.)

**Draw mode flow:**
1. Selecting **✏️ Draw** enters drawing mode: crosshair cursor, hint bar *"Tap the map to add points — tap the first point to close the shape."*
2. Each click adds a vertex; a dashed preview polygon follows the cursor.
3. Clicking the first vertex (or **Finish**) closes the ring.
4. Closed shape becomes editable: drag vertices, drag translucent midpoints to insert, right-click/⌫ a vertex to delete.
5. Toolbar: **Undo point · Clear · Finish**. Live readout: vertex count + area (`~4.2 ha`).
6. Validation runs live (client mirror of §1 rules); violations show inline and block Save.
7. On save, the shape serializes to a hidden `boundary_geojson` input (same `renderHiddenInputs` pattern the editor already uses); the server action calls `set_quest_boundary`.
8. Switching away from ✏️ to another pill keeps the drawn shape in state (so a mis-click doesn't destroy work) but clears it on save if another type is selected — matching how `handleTypeChange` already resets radius/city.

**Edit flow:** editing an existing polygon quest loads the boundary via `get_quest_boundary_geojson` and opens directly in vertex-edit mode.

Files touched: `GeofenceEditor.tsx`, `apps/admin/app/quests/actions.ts` (`createQuest`/edit action parse + RPC call), `packages/geofence` (shared validation constants: `MIN_POLYGON_AREA_M2`, `MAX_POLYGON_VERTICES`, …).

## 4. Mobile UX

- **Quest detail map:** render the polygon (`react-native-maps` `<Polygon>`), same fill/stroke treatment the admin preview uses for city boundaries. Circle quests keep `<Circle>`; `none` shows no overlay.
- **Submit screen (`app/submit/[questId].tsx`):** the "Inside quest zone / Outside quest zone" status row already exists. Extend `useGeofenceCheck` + `@quest/geofence`'s `isWithinGeofence` to the polygon case using the already-present `pointInPolygon.js`. Boundary GeoJSON is fetched once via `get_quest_boundary_geojson` alongside the quest.
- **Geofence label copy** (`formatGeofenceLabel`): polygon → `"inside the [quest title] zone"`.

Client checks are UX sugar; the DB trigger remains authoritative (unchanged principle from 013).

## 5. Radius/type presets (recap of the concept mapping)

| Quest style | Configuration |
|---|---|
| Home-based / reflective | `none` — submit from anywhere |
| City/region-wide | `city` — anywhere inside the Victoria boundary |
| Landmark | `circle` — 50–300 m preset radius |
| Irregular venue (park, market, trail network) | `polygon` — drawn perimeter |

## 6. Testing

- `packages/geofence/__tests__`: polygon cases — inside, outside, on-edge, concave shapes, vertex-count/area limit validators.
- SQL: seed a polygon quest (Beacon Hill Park outline) in `seed.sql`; assert `check_completion_geofence` true inside / false outside via a `supabase test` script or the existing logic-test pattern.
- Manual: draw → save → reload edit form → shape round-trips identically.

## 7. Pre-existing debt this touches

- The Victoria `city` boundary in 013 is a placeholder bounding box (`-123.412/-123.298 × 48.382/48.472`). Before launch, load the real municipal boundary from `supabase/seeds/victoria-bc-boundary.geojson` — this matters much more once geofence = proof (Spec 02).
