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

const { VICTORIA_BOUNDARY } = require('./victoriaBoundary')

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
