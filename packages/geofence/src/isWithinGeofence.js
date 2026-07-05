'use strict'

const { MAX_GPS_ACCURACY_BUFFER } = require('./constants')
const { haversineMeters } = require('./haversine')
const { pointInPolygon } = require('./pointInPolygon')
const { distanceToRingMeters } = require('./polygon')

/**
 * @param {import('./types').GeofenceCheckInput} input
 * @returns {boolean}
 */
function isWithinGeofence(input) {
  const { quest, user, accuracyMeters, cityBoundary, boundary, bypass } = input
  if (bypass) return true

  switch (quest.geofence_type) {
    case 'none':
      return true

    case 'circle': {
      const buffer = Math.min(
        Math.max(accuracyMeters ?? 0, 0),
        MAX_GPS_ACCURACY_BUFFER
      )
      const distance = haversineMeters(user, { lat: quest.lat, lng: quest.lng })
      return distance <= quest.radius_meters + buffer
    }

    case 'city': {
      if (!cityBoundary || !quest.city_id) return false
      const ring = cityBoundary.coordinates[0]
      if (!ring || ring.length < 3) return false
      return pointInPolygon(user.lng, user.lat, ring)
    }

    case 'polygon': {
      const ring = boundary?.coordinates?.[0]
      if (!ring || ring.length < 3) return false
      if (pointInPolygon(user.lng, user.lat, ring)) return true
      // GPS-accuracy grace at the edges, same cap as the circle type
      const buffer = Math.min(
        Math.max(accuracyMeters ?? 0, 0),
        MAX_GPS_ACCURACY_BUFFER
      )
      if (buffer <= 0) return false
      return distanceToRingMeters(user, ring) <= buffer
    }

    default:
      return false
  }
}

module.exports = { isWithinGeofence }
