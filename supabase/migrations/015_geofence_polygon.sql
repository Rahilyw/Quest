-- 015: Custom polygon geofences (Spec 01 — geofence drawing)
-- Requires: 013 (PostGIS + geofence system), 014 ('polygon' enum value)
--
-- Adds:
--   quests.boundary          GEOGRAPHY(POLYGON) — the drawn perimeter
--   quests.boundary_geojson  generated JSONB mirror so clients get the shape
--                            from a plain SELECT * (no extra RPC round-trip)
--   set_quest_boundary()     admin-only validated write path for boundaries
--   polygon branch in check_completion_geofence()

-- ─── COLUMNS ─────────────────────────────────────────────────────────────────

ALTER TABLE quests
  ADD COLUMN IF NOT EXISTS boundary GEOGRAPHY(POLYGON, 4326);

-- Only polygon quests may carry a boundary. The polygon->boundary direction is
-- NOT enforced here: createQuest inserts the row first and sets the boundary
-- via set_quest_boundary() in a second statement. A polygon quest with a NULL
-- boundary is unsubmittable (check_completion_geofence returns false), so the
-- transient state is safe.
ALTER TABLE quests DROP CONSTRAINT IF EXISTS quests_boundary_type_check;
ALTER TABLE quests ADD CONSTRAINT quests_boundary_type_check
  CHECK (geofence_type = 'polygon' OR boundary IS NULL);

-- Wrapper marked IMMUTABLE so it can back a generated column
-- (ST_AsGeoJSON volatility marking varies across PostGIS versions).
CREATE OR REPLACE FUNCTION quest_boundary_geojson(g GEOGRAPHY)
RETURNS JSONB
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN g IS NULL THEN NULL
              ELSE ST_AsGeoJSON(g::geometry)::jsonb END;
$$;

ALTER TABLE quests
  ADD COLUMN IF NOT EXISTS boundary_geojson JSONB
  GENERATED ALWAYS AS (quest_boundary_geojson(boundary)) STORED;

-- ─── VALIDATED WRITE PATH (admin only) ───────────────────────────────────────

-- Limits mirrored client-side in packages/geofence/src/constants.js —
-- keep both in sync.
--   vertices: 3..100 (ring closed, so npoints 4..101)
--   area:     400 m² .. 250 km²
--   shape:    single ring, no holes, valid (self-intersections auto-repaired
--             when the repair is still a single polygon)
CREATE OR REPLACE FUNCTION set_quest_boundary(
  p_quest_id UUID,
  p_geojson  JSONB
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_geom     GEOMETRY;
  v_area     DOUBLE PRECISION;
  v_vertices INTEGER;
BEGIN
  v_geom := ST_GeomFromGeoJSON(p_geojson::text);

  IF GeometryType(v_geom) <> 'POLYGON' THEN
    RAISE EXCEPTION 'BOUNDARY_INVALID: expected a Polygon geometry'
      USING ERRCODE = 'check_violation';
  END IF;

  IF ST_NumInteriorRings(v_geom) > 0 THEN
    RAISE EXCEPTION 'BOUNDARY_INVALID: holes are not supported'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT ST_IsValid(v_geom) THEN
    v_geom := ST_MakeValid(v_geom);
    IF GeometryType(v_geom) <> 'POLYGON' OR NOT ST_IsValid(v_geom) THEN
      RAISE EXCEPTION 'BOUNDARY_INVALID: shape crosses itself'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  v_vertices := ST_NPoints(ST_ExteriorRing(v_geom)) - 1; -- closing point repeats
  IF v_vertices < 3 OR v_vertices > 100 THEN
    RAISE EXCEPTION 'BOUNDARY_INVALID: polygon must have 3-100 vertices, got %', v_vertices
      USING ERRCODE = 'check_violation';
  END IF;

  v_area := ST_Area(ST_SetSRID(v_geom, 4326)::geography);
  IF v_area < 400 THEN
    RAISE EXCEPTION 'BOUNDARY_INVALID: zone too small (% m2, min 400)', round(v_area)
      USING ERRCODE = 'check_violation';
  END IF;
  IF v_area > 250000000 THEN
    RAISE EXCEPTION 'BOUNDARY_INVALID: zone too large (max 250 km2) — use a city geofence'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE quests
     SET boundary      = ST_SetSRID(v_geom, 4326)::geography,
         geofence_type = 'polygon',
         radius_meters = 0,
         city_id       = NULL
   WHERE id = p_quest_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quest % not found', p_quest_id;
  END IF;
END;
$$;

-- Admin (service role) only — players never write boundaries.
REVOKE EXECUTE ON FUNCTION set_quest_boundary(UUID, JSONB) FROM PUBLIC, anon, authenticated;

-- ─── COMPLETION VALIDATION ───────────────────────────────────────────────────

-- Full redefinition of the 013 function with the polygon branch added.
-- The trg_enforce_completion_geofence BEFORE INSERT trigger picks this up
-- automatically — no client can bypass it.
CREATE OR REPLACE FUNCTION check_completion_geofence(
  p_quest_id UUID,
  p_lat      DOUBLE PRECISION,
  p_lng      DOUBLE PRECISION,
  p_accuracy DOUBLE PRECISION DEFAULT 0
) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_type     geofence_type;
  v_lat      DOUBLE PRECISION;
  v_lng      DOUBLE PRECISION;
  v_radius   INTEGER;
  v_city     TEXT;
  v_boundary GEOGRAPHY;
  v_point    GEOGRAPHY;
  v_buffer   DOUBLE PRECISION;
BEGIN
  SELECT geofence_type, lat, lng, radius_meters, city_id, boundary
    INTO v_type, v_lat, v_lng, v_radius, v_city, v_boundary
    FROM quests
   WHERE id = p_quest_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_type = 'none' THEN
    RETURN TRUE;
  END IF;

  v_point  := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;
  v_buffer := LEAST(GREATEST(COALESCE(p_accuracy, 0), 0), 30);

  IF v_type = 'circle' THEN
    RETURN ST_DWithin(
      v_point,
      ST_SetSRID(ST_MakePoint(v_lng, v_lat), 4326)::geography,
      v_radius + v_buffer
    );
  END IF;

  IF v_type = 'city' THEN
    RETURN EXISTS (
      SELECT 1
        FROM cities c
       WHERE c.id = v_city
         AND ST_Covers(c.boundary, v_point)
    );
  END IF;

  IF v_type = 'polygon' THEN
    RETURN v_boundary IS NOT NULL
       AND ST_DWithin(v_boundary, v_point, v_buffer);
  END IF;

  RETURN FALSE;
END;
$$;
