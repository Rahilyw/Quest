'use strict'

/**
 * Ray-casting point-in-polygon test.
 * @param {number} lng
 * @param {number} lat
 * @param {number[][]} ring GeoJSON ring: array of [lng, lat]
 * @returns {boolean}
 */
function pointInPolygon(lng, lat, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0]
    const yi = ring[i][1]
    const xj = ring[j][0]
    const yj = ring[j][1]
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

module.exports = { pointInPolygon }
