'use strict'

const fs = require('fs')
const path = require('path')

const geojsonPath = path.join(__dirname, '../supabase/seeds/victoria-bc-boundary.geojson')
const outPath = path.join(__dirname, '../packages/geofence/src/victoriaBoundary.js')

const geojson = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'))
const coords = JSON.stringify(geojson.coordinates)

const out = `'use strict'

/** Official City of Victoria municipal boundary (simplified). Matches migration 022. */
const VICTORIA_BOUNDARY = {
  id: 'victoria-bc',
  name: 'Victoria, BC',
  coordinates: ${coords},
}

module.exports = { VICTORIA_BOUNDARY }
`

fs.writeFileSync(outPath, out)
console.log('Wrote', outPath, `(${geojson.coordinates[0].length} vertices)`)
