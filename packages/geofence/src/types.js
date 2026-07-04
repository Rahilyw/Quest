'use strict'

/** @typedef {'none' | 'circle' | 'city'} GeofenceType */

/**
 * @typedef {Object} LatLng
 * @property {number} lat
 * @property {number} lng
 */

/**
 * @typedef {Object} CityBoundary
 * @property {string} id
 * @property {string} name
 * @property {number[][][]} coordinates GeoJSON Polygon: [ring][vertex][lng, lat]
 */

/**
 * @typedef {Object} QuestGeofence
 * @property {GeofenceType} geofence_type
 * @property {number} lat
 * @property {number} lng
 * @property {number} radius_meters
 * @property {string | null} city_id
 */

/**
 * @typedef {Object} GeofenceCheckInput
 * @property {QuestGeofence} quest
 * @property {LatLng} user
 * @property {number | null | undefined} [accuracyMeters]
 * @property {CityBoundary | null | undefined} [cityBoundary]
 * @property {boolean | undefined} [bypass]
 */

module.exports = {}
