-- 013: Geofence types (none | circle | city) + server-side completion validation
-- Requires: PostGIS (enabled by default on Supabase)

CREATE EXTENSION IF NOT EXISTS postgis;

DO $$ BEGIN
  CREATE TYPE geofence_type AS ENUM ('none', 'circle', 'city');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS cities (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  boundary   GEOGRAPHY(POLYGON, 4326) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read cities" ON cities;
CREATE POLICY "Anyone can read cities"
  ON cities FOR SELECT USING (true);

ALTER TABLE quests
  ADD COLUMN IF NOT EXISTS geofence_type geofence_type NOT NULL DEFAULT 'circle',
  ADD COLUMN IF NOT EXISTS city_id       TEXT REFERENCES cities(id);

UPDATE quests SET geofence_type = 'circle' WHERE geofence_type IS NULL;

-- Placeholder bounding box — replace with real municipal boundary before prod.
-- Companion file: supabase/seeds/victoria-bc-boundary.geojson
INSERT INTO cities (id, name, boundary)
VALUES (
  'victoria-bc',
  'Victoria, BC',
  ST_GeogFromText($boundary$
    POLYGON((
      -123.4120 48.4720,
      -123.2980 48.4720,
      -123.2980 48.3820,
      -123.4120 48.3820,
      -123.4120 48.4720
    ))
  $boundary$)
)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name, boundary = EXCLUDED.boundary;

CREATE OR REPLACE FUNCTION check_completion_geofence(
  p_quest_id UUID,
  p_lat      DOUBLE PRECISION,
  p_lng      DOUBLE PRECISION,
  p_accuracy DOUBLE PRECISION DEFAULT 0
) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_type   geofence_type;
  v_lat    DOUBLE PRECISION;
  v_lng    DOUBLE PRECISION;
  v_radius INTEGER;
  v_city   TEXT;
  v_point  GEOGRAPHY;
  v_buffer DOUBLE PRECISION;
BEGIN
  SELECT geofence_type, lat, lng, radius_meters, city_id
    INTO v_type, v_lat, v_lng, v_radius, v_city
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

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_completion_geofence()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT check_completion_geofence(NEW.quest_id, NEW.lat, NEW.lng, 0) THEN
    RAISE EXCEPTION 'GEOFENCE_VIOLATION'
      USING ERRCODE = 'check_violation',
            HINT   = 'Submission coordinates are outside the quest geofence.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_completion_geofence ON completions;
CREATE TRIGGER trg_enforce_completion_geofence
  BEFORE INSERT ON completions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_completion_geofence();

CREATE OR REPLACE FUNCTION get_city_boundary_geojson(p_city_id TEXT)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT ST_AsGeoJSON(boundary::geometry)::jsonb
    FROM cities
   WHERE id = p_city_id;
$$;

GRANT EXECUTE ON FUNCTION get_city_boundary_geojson(TEXT) TO authenticated;
