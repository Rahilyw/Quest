-- 025: Multiple completion areas per quest (circles and/or polygons)
-- Requires: 013–015 (PostGIS + geofence), 024 ('multi' enum value)
--
-- Adds:
--   quest_geofences              child areas for geofence_type = 'multi'
--   replace_quest_geofences()    admin-only validated bulk write
--   multi branch in check_completion_geofence()

DO $$ BEGIN
  CREATE TYPE quest_geofence_shape AS ENUM ('circle', 'polygon');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS quest_geofences (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id       UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  label          TEXT NOT NULL,
  shape          quest_geofence_shape NOT NULL DEFAULT 'circle',
  lat            DOUBLE PRECISION,
  lng            DOUBLE PRECISION,
  radius_meters  INTEGER,
  boundary       GEOGRAPHY(POLYGON, 4326),
  sort_order     INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT quest_geofences_shape_check CHECK (
    (shape = 'circle'
      AND lat IS NOT NULL AND lng IS NOT NULL
      AND radius_meters BETWEEN 50 AND 2000
      AND boundary IS NULL)
    OR
    (shape = 'polygon'
      AND boundary IS NOT NULL
      AND radius_meters IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS quest_geofences_quest_id_idx ON quest_geofences(quest_id);

ALTER TABLE quest_geofences
  ADD COLUMN IF NOT EXISTS boundary_geojson JSONB
  GENERATED ALWAYS AS (quest_boundary_geojson(boundary)) STORED;

ALTER TABLE quest_geofences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read quest geofences" ON quest_geofences;
CREATE POLICY "Anyone can read quest geofences"
  ON quest_geofences FOR SELECT USING (true);

-- ─── VALIDATED BULK WRITE (admin / service role only) ────────────────────────

CREATE OR REPLACE FUNCTION replace_quest_geofences(
  p_quest_id UUID,
  p_areas    JSONB
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_area     JSONB;
  v_idx      INTEGER := 0;
  v_shape    TEXT;
  v_label    TEXT;
  v_lat      DOUBLE PRECISION;
  v_lng      DOUBLE PRECISION;
  v_radius   INTEGER;
  v_geojson  JSONB;
  v_geom     GEOMETRY;
  v_poly_area DOUBLE PRECISION;
  v_vertices INTEGER;
  v_centroid GEOMETRY;
BEGIN
  IF p_areas IS NULL OR jsonb_typeof(p_areas) <> 'array' OR jsonb_array_length(p_areas) < 1 THEN
    RAISE EXCEPTION 'MULTI_GEOFENCE_INVALID: at least one area is required'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM quests WHERE id = p_quest_id) THEN
    RAISE EXCEPTION 'Quest % not found', p_quest_id;
  END IF;

  DELETE FROM quest_geofences WHERE quest_id = p_quest_id;

  FOR v_area IN SELECT * FROM jsonb_array_elements(p_areas)
  LOOP
    v_shape := COALESCE(v_area->>'shape', 'circle');
    v_label := NULLIF(trim(COALESCE(v_area->>'label', '')), '');
    IF v_label IS NULL THEN
      v_label := 'Area ' || (v_idx + 1);
    END IF;

    IF v_shape = 'circle' THEN
      v_lat := (v_area->>'lat')::DOUBLE PRECISION;
      v_lng := (v_area->>'lng')::DOUBLE PRECISION;
      v_radius := COALESCE((v_area->>'radius_meters')::INTEGER, 100);

      IF v_lat IS NULL OR v_lng IS NULL THEN
        RAISE EXCEPTION 'MULTI_GEOFENCE_INVALID: circle requires lat/lng'
          USING ERRCODE = 'check_violation';
      END IF;
      IF v_radius < 50 OR v_radius > 2000 THEN
        RAISE EXCEPTION 'MULTI_GEOFENCE_INVALID: circle radius must be 50-2000m'
          USING ERRCODE = 'check_violation';
      END IF;

      INSERT INTO quest_geofences (quest_id, label, shape, lat, lng, radius_meters, sort_order)
      VALUES (p_quest_id, v_label, 'circle', v_lat, v_lng, v_radius, v_idx);

    ELSIF v_shape = 'polygon' THEN
      v_geojson := v_area->'boundary';
      IF v_geojson IS NULL THEN
        RAISE EXCEPTION 'MULTI_GEOFENCE_INVALID: polygon requires boundary GeoJSON'
          USING ERRCODE = 'check_violation';
      END IF;

      v_geom := ST_GeomFromGeoJSON(v_geojson::text);

      IF GeometryType(v_geom) <> 'POLYGON' THEN
        RAISE EXCEPTION 'MULTI_GEOFENCE_INVALID: expected a Polygon geometry'
          USING ERRCODE = 'check_violation';
      END IF;
      IF ST_NumInteriorRings(v_geom) > 0 THEN
        RAISE EXCEPTION 'MULTI_GEOFENCE_INVALID: holes are not supported'
          USING ERRCODE = 'check_violation';
      END IF;
      IF NOT ST_IsValid(v_geom) THEN
        v_geom := ST_MakeValid(v_geom);
        IF GeometryType(v_geom) <> 'POLYGON' OR NOT ST_IsValid(v_geom) THEN
          RAISE EXCEPTION 'MULTI_GEOFENCE_INVALID: shape crosses itself'
            USING ERRCODE = 'check_violation';
        END IF;
      END IF;

      v_vertices := ST_NPoints(ST_ExteriorRing(v_geom)) - 1;
      IF v_vertices < 3 OR v_vertices > 100 THEN
        RAISE EXCEPTION 'MULTI_GEOFENCE_INVALID: polygon must have 3-100 vertices'
          USING ERRCODE = 'check_violation';
      END IF;

      v_poly_area := ST_Area(ST_SetSRID(v_geom, 4326)::geography);
      IF v_poly_area < 400 THEN
        RAISE EXCEPTION 'MULTI_GEOFENCE_INVALID: zone too small (min 400 m2)'
          USING ERRCODE = 'check_violation';
      END IF;
      IF v_poly_area > 250000000 THEN
        RAISE EXCEPTION 'MULTI_GEOFENCE_INVALID: zone too large (max 250 km2)'
          USING ERRCODE = 'check_violation';
      END IF;

      v_centroid := ST_Centroid(v_geom);

      INSERT INTO quest_geofences (quest_id, label, shape, lat, lng, radius_meters, boundary, sort_order)
      VALUES (
        p_quest_id,
        v_label,
        'polygon',
        ST_Y(v_centroid),
        ST_X(v_centroid),
        NULL,
        ST_SetSRID(v_geom, 4326)::geography,
        v_idx
      );
    ELSE
      RAISE EXCEPTION 'MULTI_GEOFENCE_INVALID: unknown shape %', v_shape
        USING ERRCODE = 'check_violation';
    END IF;

    v_idx := v_idx + 1;
  END LOOP;

  -- Keep parent quest as multi with a representative pin at the first area centroid.
  UPDATE quests q
     SET geofence_type = 'multi',
         radius_meters = 0,
         city_id       = NULL,
         boundary      = NULL,
         lat = COALESCE(
           (SELECT g.lat FROM quest_geofences g WHERE g.quest_id = p_quest_id ORDER BY g.sort_order LIMIT 1),
           q.lat
         ),
         lng = COALESCE(
           (SELECT g.lng FROM quest_geofences g WHERE g.quest_id = p_quest_id ORDER BY g.sort_order LIMIT 1),
           q.lng
         )
   WHERE q.id = p_quest_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION replace_quest_geofences(UUID, JSONB) FROM PUBLIC, anon, authenticated;

-- ─── COMPLETION VALIDATION (adds multi OR-match) ─────────────────────────────

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

  IF v_type = 'multi' THEN
    RETURN EXISTS (
      SELECT 1
        FROM quest_geofences g
       WHERE g.quest_id = p_quest_id
         AND (
           (g.shape = 'circle'
             AND g.lat IS NOT NULL AND g.lng IS NOT NULL
             AND ST_DWithin(
               v_point,
               ST_SetSRID(ST_MakePoint(g.lng, g.lat), 4326)::geography,
               g.radius_meters + v_buffer
             ))
           OR
           (g.shape = 'polygon'
             AND g.boundary IS NOT NULL
             AND ST_DWithin(g.boundary, v_point, v_buffer))
         )
    );
  END IF;

  RETURN FALSE;
END;
$$;
