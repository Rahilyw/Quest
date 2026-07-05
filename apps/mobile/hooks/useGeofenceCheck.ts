import { useMemo } from 'react'
import { isWithinGeofence, formatGeofenceLabel } from '@quest/geofence'
import { VICTORIA_BOUNDARY, VICTORIA_CITY_NAME } from '@/lib/victoriaBoundary'
import type { Quest } from '@/lib/types'

interface Coords {
  lat: number
  lng: number
  accuracy: number | null
}

export function useGeofenceCheck(
  quest: Quest | null | undefined,
  coords: Coords | null,
  bypass: boolean
) {
  const insideGeofence = useMemo(() => {
    if (!quest || !coords) return false
    return isWithinGeofence({
      quest: {
        geofence_type: quest.geofence_type ?? 'circle',
        lat: quest.lat,
        lng: quest.lng,
        radius_meters: quest.radius_meters,
        city_id: quest.city_id ?? null,
      },
      user: { lat: coords.lat, lng: coords.lng },
      accuracyMeters: coords.accuracy,
      cityBoundary:
        (quest.geofence_type ?? 'circle') === 'city' ? VICTORIA_BOUNDARY : null,
      boundary: quest.boundary_geojson ?? null,
      bypass,
    })
  }, [quest, coords, bypass])

  const geofenceLabel = useMemo(() => {
    if (!quest) return ''
    return formatGeofenceLabel(
      {
        geofence_type: quest.geofence_type ?? 'circle',
        lat: quest.lat,
        lng: quest.lng,
        radius_meters: quest.radius_meters,
        city_id: quest.city_id ?? null,
      },
      VICTORIA_CITY_NAME
    )
  }, [quest])

  const requiresLocation = (quest?.geofence_type ?? 'circle') !== 'none'

  return { insideGeofence, geofenceLabel, requiresLocation }
}
