'use strict'

const { MAX_GPS_ACCURACY_BUFFER } = require('./constants')
const { haversineMeters } = require('./haversine')
const { pointInPolygon } = require('./pointInPolygon')
const { distanceToRingMeters } = require('./polygon')

/**
 * @param {number | null | undefined} accuracyMeters
 * @returns {number}
 */
function gpsBuffer(accuracyMeters) {
  return Math.min(Math.max(accuracyMeters ?? 0, 0), MAX_GPS_ACCURACY_BUFFER)
}

/**
 * @param {import('./types').LatLng} user
 * @param {{ lat: number, lng: number, radius_meters: number }} circle
 * @param {number} buffer
 * @returns {boolean}
 */
function withinCircle(user, circle, buffer) {
  const distance = haversineMeters(user, { lat: circle.lat, lng: circle.lng })
  return distance <= circle.radius_meters + buffer
}

/**
 * @param {import('./types').LatLng} user
 * @param {import('./types').PolygonGeometry | null | undefined} boundary
 * @param {number} buffer
 * @returns {boolean}
 */
function withinPolygon(user, boundary, buffer) {
  const ring = boundary?.coordinates?.[0]
  if (!ring || ring.length < 3) return false
  if (pointInPolygon(user.lng, user.lat, ring)) return true
  if (buffer <= 0) return false
  return distanceToRingMeters(user, ring) <= buffer
}

/**
 * @param {import('./types').GeofenceCheckInput} input
 * @returns {boolean}
 */
function isWithinGeofence(input) {
  const { quest, user, accuracyMeters, cityBoundary, boundary, locations, bypass } = input
  if (bypass) return true

  switch (quest.geofence_type) {
    case 'none':
      return true

    case 'circle': {
      const buffer = gpsBuffer(accuracyMeters)
      return withinCircle(
        user,
        { lat: quest.lat, lng: quest.lng, radius_meters: quest.radius_meters },
        buffer
      )
    }

    case 'city': {
      if (!cityBoundary || !quest.city_id) return false
      const ring = cityBoundary.coordinates[0]
      if (!ring || ring.length < 3) return false
      return pointInPolygon(user.lng, user.lat, ring)
    }

    case 'polygon': {
      return withinPolygon(user, boundary, gpsBuffer(accuracyMeters))
    }

    case 'multi': {
      if (!locations || locations.length === 0) return false
      const buffer = gpsBuffer(accuracyMeters)
      return locations.some((loc) => {
        if (loc.shape === 'circle') {
          if (loc.lat == null || loc.lng == null || loc.radius_meters == null) return false
          return withinCircle(
            user,
            { lat: loc.lat, lng: loc.lng, radius_meters: loc.radius_meters },
            buffer
          )
        }
        if (loc.shape === 'polygon') {
          return withinPolygon(user, loc.boundary ?? loc.boundary_geojson ?? null, buffer)
        }
        return false
      })
    }

    default:
      return false
  }
}

module.exports = { isWithinGeofence }
