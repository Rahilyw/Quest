import { Alert, Linking } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import { APP_NAME } from '@/lib/constants'

function showPermissionDeniedAlert(feature: string) {
  Alert.alert(
    'Permission needed',
    `${APP_NAME} needs ${feature} access for this. You can turn it on in your phone settings.`,
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]
  )
}

export async function ensureCameraPermission(): Promise<boolean> {
  const current = await ImagePicker.getCameraPermissionsAsync()
  if (current.granted) return true

  const { granted } = await ImagePicker.requestCameraPermissionsAsync()
  if (granted) return true

  showPermissionDeniedAlert('camera')
  return false
}

export async function ensureMediaLibraryPermission(): Promise<boolean> {
  const current = await ImagePicker.getMediaLibraryPermissionsAsync()
  if (current.granted) return true

  const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (granted) return true

  showPermissionDeniedAlert('photo library')
  return false
}

export async function ensureLocationPermission(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync()
  if (current.granted) return true

  const { granted } = await Location.requestForegroundPermissionsAsync()
  if (granted) return true

  showPermissionDeniedAlert('location')
  return false
}
