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
  VICTORIA_BOUNDARY,
  MAX_GPS_ACCURACY_BUFFER,
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

console.log('\n--- Geofence: constants ---')
assert('MAX_GPS_ACCURACY_BUFFER is 30', MAX_GPS_ACCURACY_BUFFER, 30)

console.log(`\n${'='.repeat(40)}`)
console.log(`Results: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
console.log('All geofence tests passed.\n')
