'use strict'

/**
 * @param {import('./types').QuestGeofence} quest
 * @param {string | undefined} cityName
 * @returns {string}
 */
function formatGeofenceLabel(quest, cityName) {
  switch (quest.geofence_type) {
    case 'none':
      return 'No location required'
    case 'circle':
      return `Within ${quest.radius_meters}m of location`
    case 'city':
      return cityName ? `Anywhere in ${cityName}` : 'Anywhere in city'
    default:
      return `Within ${quest.radius_meters}m of location`
  }
}

/**
 * @param {import('./types').QuestGeofence} quest
 * @returns {string}
 */
function formatGeofenceShort(quest) {
  switch (quest.geofence_type) {
    case 'none':
      return 'Anywhere'
    case 'circle':
      return `${quest.radius_meters}m`
    case 'city':
      return 'City-wide'
    default:
      return `${quest.radius_meters}m`
  }
}

module.exports = { formatGeofenceLabel, formatGeofenceShort }
