'use strict'

/**
 * Geofence package tests — plain Node.js, no bundler.
 * Run: node packages/geofence/src/__tests__/geofence.test.js
 *   or: yarn test:geofence
 */

const {
  isWithinGeofence,
  formatGeofenceLabel,
  formatGeofenceShort,
  haversineMeters,
  pointInPolygon,
  polygonAreaMeters,
  polygonCentroid,
  distanceToRingMeters,
  ringSelfIntersects,
  validatePolygonRing,
  closeRing,
  openRing,
  VICTORIA_BOUNDARY,
  MAX_GPS_ACCURACY_BUFFER,
  POLYGON_MAX_VERTICES,
} = require('../index')

let passed = 0
let failed = 0

function assert(label, actual, expected) {
  const ok = actual === expected
  if (ok) {
    passed++
    console.log(`  ✓ ${label}`)
  } else {
    failed++
    console.error(`  ✗ ${label}`)
    console.error(`    expected: ${expected}`)
    console.error(`    actual:   ${actual}`)
  }
}

function assertApprox(label, actual, expected, tolerance = 1) {
  const ok = Math.abs(actual - expected) <= tolerance
  if (ok) {
    passed++
    console.log(`  ✓ ${label}`)
  } else {
    failed++
    console.error(`  ✗ ${label}`)
    console.error(`    expected ~${expected}, got ${actual}`)
  }
}

const mountDoug = { lat: 48.4912, lng: -123.3456 }
const victoriaCentre = { lat: 48.4284, lng: -123.3656 }
const vancouver = { lat: 49.2827, lng: -123.1207 }

console.log('\n--- Geofence: haversine ---')
assertApprox(
  '0m distance for same point',
  haversineMeters(mountDoug, mountDoug),
  0
)

console.log('\n--- Geofence: circle ---')
const circleQuest = {
  geofence_type: 'circle',
  lat: mountDoug.lat,
  lng: mountDoug.lng,
  radius_meters: 50,
  city_id: null,
}

// Point ~30m north (~0.00027° lat ≈ 30m)
const inside30m = { lat: mountDoug.lat + 0.00027, lng: mountDoug.lng }
assert(
  'circle — inside 50m radius',
  isWithinGeofence({ quest: circleQuest, user: inside30m, accuracyMeters: 0 }),
  true
)

// Point ~80m north
const outside80m = { lat: mountDoug.lat + 0.00072, lng: mountDoug.lng }
assert(
  'circle — outside 50m radius',
  isWithinGeofence({ quest: circleQuest, user: outside80m, accuracyMeters: 0 }),
  false
)

// 52m away with 5m accuracy buffer → pass (50 + 5)
const outside52m = { lat: mountDoug.lat + 0.000468, lng: mountDoug.lng }
const dist52 = haversineMeters(mountDoug, outside52m)
assertApprox('sanity: ~52m offset', dist52, 52, 5)
assert(
  'circle — GPS buffer allows near-miss (52m with 5m accuracy)',
  isWithinGeofence({ quest: circleQuest, user: outside52m, accuracyMeters: 5 }),
  true
)

assert(
  'circle — buffer capped at MAX_GPS_ACCURACY_BUFFER',
  isWithinGeofence({ quest: circleQuest, user: outside80m, accuracyMeters: 50 }),
  false
)

assert(
  'circle — bypass flag overrides',
  isWithinGeofence({ quest: circleQuest, user: outside80m, bypass: true }),
  true
)

console.log('\n--- Geofence: none ---')
const noneQuest = {
  geofence_type: 'none',
  lat: victoriaCentre.lat,
  lng: victoriaCentre.lng,
  radius_meters: 0,
  city_id: null,
}
assert(
  'none — always passes regardless of location',
  isWithinGeofence({ quest: noneQuest, user: vancouver }),
  true
)

console.log('\n--- Geofence: city ---')
const cityQuest = {
  geofence_type: 'city',
  lat: victoriaCentre.lat,
  lng: victoriaCentre.lng,
  radius_meters: 0,
  city_id: 'victoria-bc',
}
assert(
  'city — inside Victoria boundary',
  isWithinGeofence({
    quest: cityQuest,
    user: victoriaCentre,
    cityBoundary: VICTORIA_BOUNDARY,
  }),
  true
)
assert(
  'city — outside Victoria boundary (Vancouver)',
  isWithinGeofence({
    quest: cityQuest,
    user: vancouver,
    cityBoundary: VICTORIA_BOUNDARY,
  }),
  false
)
assert(
  'city — fails without boundary data',
  isWithinGeofence({ quest: cityQuest, user: victoriaCentre, cityBoundary: null }),
  false
)

console.log('\n--- Geofence: pointInPolygon ---')
const box = VICTORIA_BOUNDARY.coordinates[0]
assert(
  'pointInPolygon — centre inside box',
  pointInPolygon(victoriaCentre.lng, victoriaCentre.lat, box),
  true
)
assert(
  'pointInPolygon — Vancouver outside box',
  pointInPolygon(vancouver.lng, vancouver.lat, box),
  false
)

console.log('\n--- Geofence: labels ---')
assert(
  'formatGeofenceLabel circle',
  formatGeofenceLabel(circleQuest),
  'Within 50m of location'
)
assert(
  'formatGeofenceLabel none',
  formatGeofenceLabel(noneQuest),
  'No location required'
)
assert(
  'formatGeofenceLabel city',
  formatGeofenceLabel(cityQuest, 'Victoria, BC'),
  'Anywhere in Victoria, BC'
)
assert(
  'formatGeofenceShort circle',
  formatGeofenceShort(circleQuest),
  '50m'
)
assert(
  'formatGeofenceShort none',
  formatGeofenceShort(noneQuest),
  'Anywhere'
)
assert(
  'formatGeofenceShort city',
  formatGeofenceShort(cityQuest),
  'City-wide'
)

console.log('\n--- Geofence: polygon math ---')
// ~1km x ~1km square near Victoria centre (0.009° lat ≈ 1000m; lng scaled by cos(48.42°) ≈ 0.66)
const kmSquare = [
  [-123.3700, 48.4200],
  [-123.3565, 48.4200],
  [-123.3565, 48.4290],
  [-123.3700, 48.4290],
  [-123.3700, 48.4200],
]
assertApprox(
  'polygonAreaMeters — ~1km² square',
  polygonAreaMeters(kmSquare),
  1000000,
  100000
)
const kmCentroid = polygonCentroid(kmSquare)
assertApprox('polygonCentroid lat', kmCentroid.lat, 48.4245, 0.0005)
assertApprox('polygonCentroid lng', kmCentroid.lng, -123.36325, 0.0005)

assert('openRing strips closing vertex', openRing(kmSquare).length, 4)
assert('closeRing appends closing vertex', closeRing(openRing(kmSquare)).length, 5)

const squareCentre = { lat: 48.4245, lng: -123.36325 }
assertApprox(
  'distanceToRingMeters — centre of 1km square ≈ 500m from edge',
  distanceToRingMeters(squareCentre, kmSquare),
  500,
  30
)

const bowtie = [
  [-123.3700, 48.4200],
  [-123.3565, 48.4290],
  [-123.3565, 48.4200],
  [-123.3700, 48.4290],
  [-123.3700, 48.4200],
]
assert('ringSelfIntersects — bowtie detected', ringSelfIntersects(bowtie), true)
assert('ringSelfIntersects — square is simple', ringSelfIntersects(kmSquare), false)

console.log('\n--- Geofence: polygon validation ---')
assert('validatePolygonRing — square ok', validatePolygonRing(kmSquare).ok, true)
assert('validatePolygonRing — closes open ring', validatePolygonRing(openRing(kmSquare)).ok && validatePolygonRing(openRing(kmSquare)).ring.length, 5)
assert('validatePolygonRing — null rejected', validatePolygonRing(null).ok, false)
assert(
  'validatePolygonRing — too few vertices',
  validatePolygonRing([[-123.37, 48.42], [-123.36, 48.42]]).ok,
  false
)
assert('validatePolygonRing — bowtie rejected', validatePolygonRing(bowtie).ok, false)
// ~10m x 10m — under the 400 m² floor
const tinySquare = [
  [-123.37000, 48.42000],
  [-123.36986, 48.42000],
  [-123.36986, 48.42009],
  [-123.37000, 48.42009],
  [-123.37000, 48.42000],
]
assert('validatePolygonRing — too small rejected', validatePolygonRing(tinySquare).ok, false)
// giant box far over 250 km²
const giant = [
  [-124.0, 48.0],
  [-123.0, 48.0],
  [-123.0, 49.0],
  [-124.0, 49.0],
  [-124.0, 48.0],
]
assert('validatePolygonRing — too large rejected', validatePolygonRing(giant).ok, false)
const manyVertices = []
for (let i = 0; i <= POLYGON_MAX_VERTICES + 1; i++) {
  const angle = (i / (POLYGON_MAX_VERTICES + 1)) * 2 * Math.PI
  manyVertices.push([-123.3650 + 0.01 * Math.cos(angle), 48.4245 + 0.007 * Math.sin(angle)])
}
assert('validatePolygonRing — over vertex cap rejected', validatePolygonRing(manyVertices).ok, false)

console.log('\n--- Geofence: polygon quest ---')
const polygonQuest = {
  geofence_type: 'polygon',
  lat: squareCentre.lat,
  lng: squareCentre.lng,
  radius_meters: 0,
  city_id: null,
}
const boundary = { type: 'Polygon', coordinates: [kmSquare] }
assert(
  'polygon — inside boundary',
  isWithinGeofence({ quest: polygonQuest, user: squareCentre, boundary }),
  true
)
assert(
  'polygon — outside boundary (Vancouver)',
  isWithinGeofence({ quest: polygonQuest, user: vancouver, boundary }),
  false
)
assert(
  'polygon — fails without boundary data',
  isWithinGeofence({ quest: polygonQuest, user: squareCentre, boundary: null }),
  false
)
// ~15m north of the top edge: outside, but within a 20m accuracy buffer
const justOutside = { lat: 48.4290 + 0.000135, lng: -123.36325 }
assert(
  'polygon — GPS buffer allows near-miss (~15m out, 20m accuracy)',
  isWithinGeofence({ quest: polygonQuest, user: justOutside, accuracyMeters: 20, boundary }),
  true
)
assert(
  'polygon — near-miss rejected without accuracy buffer',
  isWithinGeofence({ quest: polygonQuest, user: justOutside, accuracyMeters: 0, boundary }),
  false
)
assert(
  'polygon — buffer capped at MAX_GPS_ACCURACY_BUFFER',
  isWithinGeofence({
    quest: polygonQuest,
    user: { lat: 48.4290 + 0.00072, lng: -123.36325 }, // ~80m out
    accuracyMeters: 100,
    boundary,
  }),
  false
)
assert(
  'formatGeofenceLabel polygon',
  formatGeofenceLabel(polygonQuest),
  'Inside the quest zone'
)
assert('formatGeofenceShort polygon', formatGeofenceShort(polygonQuest), 'Custom zone')

console.log('\n--- Geofence: multi ---')
const multiQuest = {
  geofence_type: 'multi',
  lat: mountDoug.lat,
  lng: mountDoug.lng,
  radius_meters: 0,
  city_id: null,
}
const multiLocations = [
  {
    shape: 'circle',
    lat: mountDoug.lat,
    lng: mountDoug.lng,
    radius_meters: 50,
    label: 'Mount Doug',
  },
  {
    shape: 'polygon',
    boundary: { type: 'Polygon', coordinates: [kmSquare] },
    label: 'Downtown square',
  },
]
assert(
  'multi — inside first circle',
  isWithinGeofence({ quest: multiQuest, user: inside30m, locations: multiLocations }),
  true
)
assert(
  'multi — inside second polygon',
  isWithinGeofence({ quest: multiQuest, user: squareCentre, locations: multiLocations }),
  true
)
assert(
  'multi — outside all areas',
  isWithinGeofence({ quest: multiQuest, user: vancouver, locations: multiLocations }),
  false
)
assert(
  'multi — fails with empty locations',
  isWithinGeofence({ quest: multiQuest, user: inside30m, locations: [] }),
  false
)
assert(
  'formatGeofenceLabel multi',
  formatGeofenceLabel(multiQuest, undefined, 6),
  'At any of 6 areas'
)
assert('formatGeofenceShort multi', formatGeofenceShort(multiQuest, 6), '6 areas')

console.log('\n--- Geofence: constants ---')
assert('MAX_GPS_ACCURACY_BUFFER is 30', MAX_GPS_ACCURACY_BUFFER, 30)

console.log(`\n${'='.repeat(40)}`)
console.log(`Results: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
console.log('All geofence tests passed.\n')
