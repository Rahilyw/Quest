'use strict'

const { isWithinGeofence } = require('./isWithinGeofence')
const { formatGeofenceLabel, formatGeofenceShort } = require('./formatGeofenceLabel')
const { haversineMeters } = require('./haversine')
const { pointInPolygon } = require('./pointInPolygon')
const {
  polygonAreaMeters,
  polygonCentroid,
  distanceToRingMeters,
  ringSelfIntersects,
  validatePolygonRing,
  closeRing,
  openRing,
} = require('./polygon')
const {
  MAX_GPS_ACCURACY_BUFFER,
  CIRCLE_RADIUS_MIN,
  CIRCLE_RADIUS_MAX,
  RADIUS_PRESETS,
  DEFAULT_CITY_ID,
  POLYGON_MIN_VERTICES,
  POLYGON_MAX_VERTICES,
  POLYGON_MIN_AREA_M2,
  POLYGON_MAX_AREA_M2,
} = require('./constants')

/** Victoria, BC placeholder bounding box — matches migration 013 seed. */
const VICTORIA_BOUNDARY = {
  id: DEFAULT_CITY_ID,
  name: 'Victoria, BC',
  coordinates: [[
    [-123.4120, 48.4720],
    [-123.2980, 48.4720],
    [-123.2980, 48.3820],
    [-123.4120, 48.3820],
    [-123.4120, 48.4720],
  ]],
}

module.exports = {
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
  MAX_GPS_ACCURACY_BUFFER,
  CIRCLE_RADIUS_MIN,
  CIRCLE_RADIUS_MAX,
  RADIUS_PRESETS,
  DEFAULT_CITY_ID,
  POLYGON_MIN_VERTICES,
  POLYGON_MAX_VERTICES,
  POLYGON_MIN_AREA_M2,
  POLYGON_MAX_AREA_M2,
  VICTORIA_BOUNDARY,
}
