import { Platform } from 'react-native'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { supabase } from './supabase'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

function getProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID
  )
}

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (!Device.isDevice) return null

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
    })
  }

  const existing = await Notifications.getPermissionsAsync()
  const hasPermission =
    existing.granted ||
    existing.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL

  if (!hasPermission) {
    const requested = await Notifications.requestPermissionsAsync()
    const granted =
      requested.granted ||
      requested.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
      requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    if (!granted) return null
  }

  const projectId = getProjectId()
  if (!projectId) {
    console.warn(
      'Push notifications need an EAS project ID (app.json extra.eas.projectId or EXPO_PUBLIC_EAS_PROJECT_ID)',
    )
    return null
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })

  await supabase.from('profiles').update({ push_token: token }).eq('id', userId)

  return token
}

export async function clearPushToken(userId: string): Promise<void> {
  await supabase.from('profiles').update({ push_token: null }).eq('id', userId)
}
