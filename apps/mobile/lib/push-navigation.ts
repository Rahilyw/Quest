import * as Notifications from 'expo-notifications'
import type { Router } from 'expo-router'

type NotificationData = Record<string, unknown>

function handleNotificationTap(data: NotificationData, router: Router) {
  if (data?.completion_id || data?.type === 'approval') {
    router.push('/(tabs)/profile')
  }
}

export function mountPushListeners(router: Router): () => void {
  const receivedSub = Notifications.addNotificationReceivedListener(() => {
    // foreground receive — no action needed; handler in notifications.ts shows alert
  })

  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as NotificationData
    handleNotificationTap(data, router)
  })

  return () => {
    receivedSub.remove()
    responseSub.remove()
  }
}
