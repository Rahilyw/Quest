'use strict'

const {
  POLYGON_MIN_VERTICES,
  POLYGON_MAX_VERTICES,
  POLYGON_MIN_AREA_M2,
  POLYGON_MAX_AREA_M2,
} = require('./constants')

const EARTH_RADIUS_M = 6371000
const DEG = Math.PI / 180

/**
 * Project a GeoJSON ring to planar metres (equirectangular at the ring's
 * mean latitude). Accurate to well under 1% at city scale, which is all the
 * client-side checks need — PostGIS remains the authority server-side.
 * @param {number[][]} ring [lng, lat][]
 * @returns {number[][]} [x, y][] in metres
 */
function projectRing(ring) {
  let latSum = 0
  for (const [, lat] of ring) latSum += lat
  const cosLat = Math.cos((latSum / ring.length) * DEG)
  return ring.map(([lng, lat]) => [lng * DEG * EARTH_RADIUS_M * cosLat, lat * DEG * EARTH_RADIUS_M])
}

/**
 * Strip the GeoJSON closing vertex (first repeated at the end) if present.
 * @param {number[][]} ring
 * @returns {number[][]}
 */
function openRing(ring) {
  if (ring.length < 2) return ring
  const [x0, y0] = ring[0]
  const [xn, yn] = ring[ring.length - 1]
  return x0 === xn && y0 === yn ? ring.slice(0, -1) : ring
}

/**
 * Return the ring with the GeoJSON closing vertex appended if missing.
 * @param {number[][]} ring
 * @returns {number[][]}
 */
function closeRing(ring) {
  if (ring.length < 3) return ring
  const [x0, y0] = ring[0]
  const [xn, yn] = ring[ring.length - 1]
  return x0 === xn && y0 === yn ? ring : [...ring, [x0, y0]]
}

/**
 * Planar polygon area in square metres (shoelace on the projected ring).
 * @param {number[][]} ring GeoJSON ring [lng, lat][], open or closed
 * @returns {number}
 */
function polygonAreaMeters(ring) {
  const pts = projectRing(openRing(ring))
  if (pts.length < 3) return 0
  let sum = 0
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    sum += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1]
  }
  return Math.abs(sum / 2)
}

/**
 * Polygon centroid as {lat, lng} (planar centroid, back-projected).
 * Falls back to the vertex average for degenerate rings.
 * @param {number[][]} ring GeoJSON ring [lng, lat][], open or closed
 * @returns {import('./types').LatLng | null}
 */
function polygonCentroid(ring) {
  const open = openRing(ring)
  if (open.length === 0) return null
  if (open.length < 3) {
    let lngSum = 0
    let latSum = 0
    for (const [lng, lat] of open) {
      lngSum += lng
      latSum += lat
    }
    return { lat: latSum / open.length, lng: lngSum / open.length }
  }

  const pts = projectRing(open)
  let area2 = 0
  let cx = 0
  let cy = 0
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const cross = pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1]
    area2 += cross
    cx += (pts[j][0] + pts[i][0]) * cross
    cy += (pts[j][1] + pts[i][1]) * cross
  }
  if (area2 === 0) {
    return polygonCentroid(open.slice(0, 2))
  }
  cx /= 3 * area2
  cy /= 3 * area2

  let latSum = 0
  for (const [, lat] of open) latSum += lat
  const cosLat = Math.cos((latSum / open.length) * DEG)
  return {
    lat: cy / (EARTH_RADIUS_M * DEG),
    lng: cx / (EARTH_RADIUS_M * DEG * cosLat),
  }
}

/**
 * Minimum distance in metres from a point to the polygon's edge.
 * @param {import('./types').LatLng} point
 * @param {number[][]} ring GeoJSON ring [lng, lat][], open or closed
 * @returns {number}
 */
function distanceToRingMeters(point, ring) {
  const closed = closeRing(openRing(ring))
  // Project relative to the point (point at origin) so the ring and the point
  // share one scale factor — projecting absolute coords with even slightly
  // different cos(lat) factors introduces errors of hundreds of metres.
  const cosLat = Math.cos(point.lat * DEG)
  const pts = closed.map(([lng, lat]) => [
    (lng - point.lng) * DEG * EARTH_RADIUS_M * cosLat,
    (lat - point.lat) * DEG * EARTH_RADIUS_M,
  ])

  let min = Infinity
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i]
    const [bx, by] = pts[i + 1]
    const abx = bx - ax
    const aby = by - ay
    const lenSq = abx * abx + aby * aby
    let t = lenSq === 0 ? 0 : (-ax * abx - ay * aby) / lenSq
    t = Math.max(0, Math.min(1, t))
    const dx = ax + t * abx
    const dy = ay + t * aby
    const d = Math.sqrt(dx * dx + dy * dy)
    if (d < min) min = d
  }
  return min
}

function segmentsIntersect(p1, p2, p3, p4) {
  const orient = (a, b, c) => {
    const v = (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1])
    if (v > 0) return 1
    if (v < 0) return -1
    return 0
  }
  const onSegment = (a, b, c) =>
    Math.min(a[0], b[0]) <= c[0] && c[0] <= Math.max(a[0], b[0]) &&
    Math.min(a[1], b[1]) <= c[1] && c[1] <= Math.max(a[1], b[1])

  const o1 = orient(p1, p2, p3)
  const o2 = orient(p1, p2, p4)
  const o3 = orient(p3, p4, p1)
  const o4 = orient(p3, p4, p2)

  if (o1 !== o2 && o3 !== o4) return true
  if (o1 === 0 && onSegment(p1, p2, p3)) return true
  if (o2 === 0 && onSegment(p1, p2, p4)) return true
  if (o3 === 0 && onSegment(p3, p4, p1)) return true
  if (o4 === 0 && onSegment(p3, p4, p2)) return true
  return false
}

/**
 * True when any two non-adjacent edges of the ring cross.
 * O(n²) — fine at the 100-vertex cap.
 * @param {number[][]} ring GeoJSON ring, open or closed
 * @returns {boolean}
 */
function ringSelfIntersects(ring) {
  const open = openRing(ring)
  const n = open.length
  if (n < 4) return false
  for (let i = 0; i < n; i++) {
    const a1 = open[i]
    const a2 = open[(i + 1) % n]
    for (let j = i + 1; j < n; j++) {
      // skip adjacent edges (they legitimately share a vertex)
      if (j === i || (j + 1) % n === i || j === (i + 1) % n) continue
      const b1 = open[j]
      const b2 = open[(j + 1) % n]
      if (segmentsIntersect(a1, a2, b1, b2)) return true
    }
  }
  return false
}

/**
 * Validate a drawn perimeter against the same limits set_quest_boundary()
 * enforces in the database (migration 015) — keep both in sync.
 * @param {number[][] | null | undefined} ring GeoJSON ring [lng, lat][], open or closed
 * @returns {{ ok: true, ring: number[][] } | { ok: false, error: string }}
 */
function validatePolygonRing(ring) {
  if (!ring || !Array.isArray(ring)) {
    return { ok: false, error: 'Draw a zone on the map first.' }
  }
  const open = openRing(ring)
  if (open.length < POLYGON_MIN_VERTICES) {
    return { ok: false, error: `Add at least ${POLYGON_MIN_VERTICES} points to close the shape.` }
  }
  if (open.length > POLYGON_MAX_VERTICES) {
    return { ok: false, error: `Too many points — simplify the shape (max ${POLYGON_MAX_VERTICES}).` }
  }
  if (ringSelfIntersects(open)) {
    return { ok: false, error: 'Shape crosses itself — adjust the points so edges don\'t overlap.' }
  }
  const area = polygonAreaMeters(open)
  if (area < POLYGON_MIN_AREA_M2) {
    return { ok: false, error: 'Zone too small for GPS accuracy — draw a bigger area or use a 50m radius instead.' }
  }
  if (area > POLYGON_MAX_AREA_M2) {
    return { ok: false, error: 'Zone too large — use the city-wide geofence instead.' }
  }
  return { ok: true, ring: closeRing(open) }
}

module.exports = {
  polygonAreaMeters,
  polygonCentroid,
  distanceToRingMeters,
  ringSelfIntersects,
  validatePolygonRing,
  closeRing,
  openRing,
}
