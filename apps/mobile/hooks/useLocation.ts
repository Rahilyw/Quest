import { useCallback, useEffect, useState } from 'react'
import * as Location from 'expo-location'
import { APP_NAME, BYPASS_GEOFENCE } from '@/lib/constants'
import { ensureLocationPermission } from '@/lib/permissions'

interface Coords {
  lat: number
  lng: number
  accuracy: number | null
}

export function useLocation() {
  const [coords, setCoords] = useState<Coords | null>(null)
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMocked, setIsMocked] = useState(false)

  const getCurrentLocation = useCallback(async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })
      setIsMocked(location.mocked === true)
      setCoords({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        accuracy: location.coords.accuracy,
      })
      setError(null)
    } catch {
      setError('Unable to get your location. Make sure GPS is enabled.')
    }
  }, [])

  const ensurePermission = useCallback(async (): Promise<boolean> => {
    const granted = await ensureLocationPermission()
    if (!granted) {
      setPermissionGranted(false)
      setError(`Location permission denied. ${APP_NAME} needs your location to verify quest completions.`)
      return false
    }
    setPermissionGranted(true)
    await getCurrentLocation()
    return true
  }, [getCurrentLocation])

  useEffect(() => {
    ensurePermission()
  }, [ensurePermission])

  function isWithinRadius(targetLat: number, targetLng: number, radiusMeters: number) {
    if (BYPASS_GEOFENCE) return true
    if (!coords) return false
    const R = 6371000
    const dLat = ((targetLat - coords.lat) * Math.PI) / 180
    const dLng = ((targetLng - coords.lng) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((coords.lat * Math.PI) / 180) *
        Math.cos((targetLat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2
    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return distance <= radiusMeters
  }

  /** Coords for submission — uses quest location when geofence bypass is on and GPS is unavailable. */
  function getSubmissionCoords(fallbackLat?: number, fallbackLng?: number): Coords | null {
    if (coords) return coords
    if (BYPASS_GEOFENCE && fallbackLat != null && fallbackLng != null) {
      return { lat: fallbackLat, lng: fallbackLng, accuracy: null }
    }
    return null
  }

  return {
    coords,
    permissionGranted,
    error,
    isMocked,
    bypassGeofence: BYPASS_GEOFENCE,
    ensurePermission,
    refresh: getCurrentLocation,
    getSubmissionCoords,
    isWithinRadius,
  }
}
