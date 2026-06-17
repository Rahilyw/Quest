import { useEffect, useState } from 'react'
import * as Location from 'expo-location'

interface Coords {
  lat: number
  lng: number
  accuracy: number | null
}

export function useLocation() {
  const [coords, setCoords] = useState<Coords | null>(null)
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    requestPermission()
  }, [])

  async function requestPermission() {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') {
      setError('Location permission denied. Kuest needs your location to verify quest completions.')
      return
    }
    setPermissionGranted(true)
    getCurrentLocation()
  }

  async function getCurrentLocation() {
    try {
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      setCoords({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        accuracy: location.coords.accuracy,
      })
    } catch {
      setError('Unable to get your location. Make sure GPS is enabled.')
    }
  }

  function isWithinRadius(targetLat: number, targetLng: number, radiusMeters: number) {
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

  return { coords, permissionGranted, error, refresh: getCurrentLocation, isWithinRadius }
}
