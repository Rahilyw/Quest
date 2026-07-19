'use strict'

/** @typedef {'none' | 'circle' | 'city' | 'polygon' | 'multi'} GeofenceType */
/** @typedef {'circle' | 'polygon'} QuestGeofenceShape */

/**
 * @typedef {Object} PolygonGeometry GeoJSON Polygon geometry
 * @property {'Polygon'} type
 * @property {number[][][]} coordinates [ring][vertex][lng, lat]
 */

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
 * One completion area on a multi-geofence quest.
 * @typedef {Object} QuestGeofenceLocation
 * @property {string | undefined} [label]
 * @property {QuestGeofenceShape} shape
 * @property {number | null | undefined} [lat]
 * @property {number | null | undefined} [lng]
 * @property {number | null | undefined} [radius_meters]
 * @property {PolygonGeometry | null | undefined} [boundary]
 * @property {PolygonGeometry | null | undefined} [boundary_geojson]
 */

/**
 * @typedef {Object} GeofenceCheckInput
 * @property {QuestGeofence} quest
 * @property {LatLng} user
 * @property {number | null | undefined} [accuracyMeters]
 * @property {CityBoundary | null | undefined} [cityBoundary]
 * @property {PolygonGeometry | null | undefined} [boundary] drawn perimeter for polygon quests (quests.boundary_geojson)
 * @property {QuestGeofenceLocation[] | null | undefined} [locations] child areas for multi quests
 * @property {boolean | undefined} [bypass]
 */

module.exports = {}
