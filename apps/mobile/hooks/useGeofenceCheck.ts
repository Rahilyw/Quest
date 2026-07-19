import { useMemo } from 'react'
import { isWithinGeofence, formatGeofenceLabel } from '@quest/geofence'
import { VICTORIA_BOUNDARY, VICTORIA_CITY_NAME } from '@/lib/victoriaBoundary'
import type { Quest } from '@/lib/types'

interface Coords {
  lat: number
  lng: number
  accuracy: number | null
}

function questLocations(quest: Quest) {
  return (quest.quest_geofences ?? []).map((g) => ({
    label: g.label,
    shape: g.shape,
    lat: g.lat,
    lng: g.lng,
    radius_meters: g.radius_meters,
    boundary_geojson: g.boundary_geojson ?? null,
    boundary: g.boundary_geojson ?? null,
  }))
}

export function useGeofenceCheck(
  quest: Quest | null | undefined,
  coords: Coords | null,
  bypass: boolean
) {
  const insideGeofence = useMemo(() => {
    if (!quest || !coords) return false
    const geofenceType = quest.geofence_type ?? 'circle'
    return isWithinGeofence({
      quest: {
        geofence_type: geofenceType,
        lat: quest.lat,
        lng: quest.lng,
        radius_meters: quest.radius_meters,
        city_id: quest.city_id ?? null,
      },
      user: { lat: coords.lat, lng: coords.lng },
      accuracyMeters: coords.accuracy,
      cityBoundary: geofenceType === 'city' ? VICTORIA_BOUNDARY : null,
      boundary: quest.boundary_geojson ?? null,
      locations: geofenceType === 'multi' ? questLocations(quest) : undefined,
      bypass,
    })
  }, [quest, coords, bypass])

  const geofenceLabel = useMemo(() => {
    if (!quest) return ''
    const geofenceType = quest.geofence_type ?? 'circle'
    return formatGeofenceLabel(
      {
        geofence_type: geofenceType,
        lat: quest.lat,
        lng: quest.lng,
        radius_meters: quest.radius_meters,
        city_id: quest.city_id ?? null,
      },
      VICTORIA_CITY_NAME,
      quest.quest_geofences?.length
    )
  }, [quest])

  const requiresLocation = (quest?.geofence_type ?? 'circle') !== 'none'

  return { insideGeofence, geofenceLabel, requiresLocation }
}
