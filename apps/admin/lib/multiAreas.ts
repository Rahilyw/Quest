import { closeRing, polygonCentroid, validatePolygonRing } from '@quest/geofence'

export type MultiAreaShape = 'circle' | 'polygon'

/** Client-side multi-area row (before save). */
export interface MultiArea {
  clientId: string
  label: string
  shape: MultiAreaShape
  lat?: number
  lng?: number
  radius_meters?: number
  /** Closed GeoJSON ring [lng, lat][] for polygons */
  boundaryRing?: number[][] | null
}

export function newClientId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `area-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function areasCentroid(areas: MultiArea[]): { lat: number; lng: number } | null {
  const points: { lat: number; lng: number }[] = []
  for (const a of areas) {
    if (a.shape === 'circle' && a.lat != null && a.lng != null) {
      points.push({ lat: a.lat, lng: a.lng })
    } else if (a.shape === 'polygon' && a.boundaryRing) {
      const c = polygonCentroid(a.boundaryRing)
      if (c) points.push(c)
    }
  }
  if (points.length === 0) return null
  return {
    lat: points.reduce((s, p) => s + p.lat, 0) / points.length,
    lng: points.reduce((s, p) => s + p.lng, 0) / points.length,
  }
}

/** Payload for replace_quest_geofences RPC */
export function areasToRpcPayload(areas: MultiArea[]): Array<{
  shape: 'circle' | 'polygon'
  label: string
  lat?: number
  lng?: number
  radius_meters?: number
  boundary?: { type: 'Polygon'; coordinates: number[][][] } | null
}> {
  return areas.map((a) => {
    if (a.shape === 'circle') {
      return {
        shape: 'circle' as const,
        label: a.label,
        lat: a.lat,
        lng: a.lng,
        radius_meters: a.radius_meters ?? 100,
      }
    }
    const ring = a.boundaryRing ? closeRing(a.boundaryRing) : null
    return {
      shape: 'polygon' as const,
      label: a.label,
      boundary: ring
        ? ({ type: 'Polygon' as const, coordinates: [ring] })
        : null,
    }
  })
}

export function validateMultiAreas(areas: MultiArea[]): string | null {
  if (areas.length < 1) return 'Add at least one completion area.'
  for (let i = 0; i < areas.length; i++) {
    const a = areas[i]
    const name = a.label || `Area ${i + 1}`
    if (a.shape === 'circle') {
      if (a.lat == null || a.lng == null) return `${name}: missing coordinates.`
      const r = a.radius_meters ?? 0
      if (r < 50 || r > 2000) return `${name}: radius must be 50–2000 m.`
    } else {
      if (!a.boundaryRing) return `${name}: draw the zone first.`
      const v = validatePolygonRing(a.boundaryRing)
      if (!v.ok) return `${name}: ${v.error}`
    }
  }
  return null
}

export function nearlySamePoint(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  eps = 0.00015
): boolean {
  return Math.abs(a.lat - b.lat) < eps && Math.abs(a.lng - b.lng) < eps
}
