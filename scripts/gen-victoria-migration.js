const fs = require('fs')
const path = require('path')

const geojsonPath = path.join(__dirname, '../supabase/seeds/victoria-bc-boundary.geojson')
const outPath = path.join(__dirname, '../supabase/migrations/022_victoria_boundary.sql')

const geojson = fs.readFileSync(geojsonPath, 'utf8').trim().replace(/'/g, "''")

const sql = `-- 022: Replace placeholder Victoria bounding box with official municipal boundary (simplified)
-- Source: City of Victoria Open Data (VicMap/City Boundary)

UPDATE cities
SET boundary = ST_SetSRID(ST_GeomFromGeoJSON('${geojson}'), 4326)::geography
WHERE id = 'victoria-bc';
`

fs.writeFileSync(outPath, sql)
console.log('Wrote', outPath, `(${sql.length} bytes)`)
