'use strict'

/**
 * @param {import('./types').QuestGeofence} quest
 * @param {string | undefined} cityName
 * @param {number | undefined} [areaCount] number of child areas for multi quests
 * @returns {string}
 */
function formatGeofenceLabel(quest, cityName, areaCount) {
  switch (quest.geofence_type) {
    case 'none':
      return 'No location required'
    case 'circle':
      return `Within ${quest.radius_meters}m of location`
    case 'city':
      return cityName ? `Anywhere in ${cityName}` : 'Anywhere in city'
    case 'polygon':
      return 'Inside the quest zone'
    case 'multi': {
      const n = areaCount ?? 0
      if (n <= 0) return 'At any listed location'
      if (n === 1) return 'At the quest location'
      return `At any of ${n} areas`
    }
    default:
      return `Within ${quest.radius_meters}m of location`
  }
}

/**
 * @param {import('./types').QuestGeofence} quest
 * @param {number | undefined} [areaCount]
 * @returns {string}
 */
function formatGeofenceShort(quest, areaCount) {
  switch (quest.geofence_type) {
    case 'none':
      return 'Anywhere'
    case 'circle':
      return `${quest.radius_meters}m`
    case 'city':
      return 'City-wide'
    case 'polygon':
      return 'Custom zone'
    case 'multi': {
      const n = areaCount ?? 0
      return n > 0 ? `${n} areas` : 'Multi'
    }
    default:
      return `${quest.radius_meters}m`
  }
}

module.exports = { formatGeofenceLabel, formatGeofenceShort }
