import { distanceToRingMeters, haversineMeters } from '@quest/geofence'
import { formatDistance } from '@/lib/thisWeek'
import { VICTORIA_BOUNDARY } from '@/lib/victoriaBoundary'
import type { Quest } from '@/lib/types'

type Coords = { lat: number; lng: number }

function cardinal(from: Coords, to: Coords): string {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const y = Math.sin(toRad(to.lng - from.lng)) * Math.cos(toRad(to.lat))
  const x =
    Math.cos(toRad(from.lat)) * Math.sin(toRad(to.lat)) -
    Math.sin(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.cos(toRad(to.lng - from.lng))
  const deg = (Math.atan2(y, x) * 180) / Math.PI
  const dirs = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest']
  return dirs[Math.round(((deg + 360) % 360) / 45) % 8]
}

function ringOf(boundary: { coordinates?: number[][][] } | null | undefined): number[][] | null {
  const ring = boundary?.coordinates?.[0]
  return ring && ring.length >= 3 ? ring : null
}

/** Distance and direction when the player is outside a quest zone. */
export function outsideZoneCopy(quest: Quest, coords: Coords): string {
  const user = { lat: coords.lat, lng: coords.lng }
  const type = quest.geofence_type ?? 'circle'
  let meters = Number.POSITIVE_INFINITY
  let toward = ''

  if (type === 'circle') {
    const center = { lat: quest.lat, lng: quest.lng }
    meters = Math.max(0, haversineMeters(user, center) - quest.radius_meters)
    toward = `the ${cardinal(coords, center)}`
  } else if (type === 'polygon') {
    const ring = ringOf(quest.boundary_geojson)
    if (ring) meters = distanceToRingMeters(user, ring)
    toward = `the ${cardinal(coords, { lat: quest.lat, lng: quest.lng })}`
  } else if (type === 'city') {
    const ring = ringOf(VICTORIA_BOUNDARY)
    if (ring) meters = distanceToRingMeters(user, ring)
    toward = 'Victoria'
  } else if (type === 'multi') {
    for (const area of quest.quest_geofences ?? []) {
      let gap = Number.POSITIVE_INFINITY
      let point: Coords | null = null
      if (area.shape === 'circle' && area.lat != null && area.lng != null && area.radius_meters != null) {
        point = { lat: area.lat, lng: area.lng }
        gap = Math.max(0, haversineMeters(user, point) - area.radius_meters)
      } else if (area.shape === 'polygon') {
        const ring = ringOf(area.boundary_geojson)
        if (ring) gap = distanceToRingMeters(user, ring)
        if (area.lat != null && area.lng != null) point = { lat: area.lat, lng: area.lng }
      }
      if (gap < meters) {
        meters = gap
        toward = area.label?.trim() || (point ? `the ${cardinal(coords, point)}` : '')
      }
    }
  }

  if (!Number.isFinite(meters)) return 'Outside the zone'
  const distance = formatDistance(Math.max(0, meters))
  if (meters < 15) return 'Just outside the zone'
  return toward ? `${distance} to go, toward ${toward}` : `${distance} to go`
}
