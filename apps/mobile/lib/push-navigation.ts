import * as Notifications from 'expo-notifications'
import type { Router } from 'expo-router'
import { notificationRoute, type SocialNotificationType } from './socialNotifications'
import { track } from './analytics'

type NotificationData = Record<string, unknown>

function handleNotificationTap(data: NotificationData, router: Router) {
  // Social pushes (029) carry completion_id too, so match them first.
  if (data?.type === 'weekly_drop') {
    track('notification_opened', { type: 'weekly_drop', source: 'push' })
    router.push('/(tabs)/quests')
    return
  }
  if (data?.type === 'suggestion_live') {
    track('notification_opened', { type: 'suggestion_live', source: 'push' })
    const questId = typeof data.quest_id === 'string' ? data.quest_id : null
    router.push((questId ? `/quest/${questId}` : '/(tabs)/quests') as never)
    return
  }
  if (data?.type === 'social') {
    const type = data.notification_type as SocialNotificationType
    const route = notificationRoute(
      type,
      (data.completion_id as string | null) ?? null,
      (data.actor_id as string | null) ?? null
    )
    track('notification_opened', { type, source: 'push' })
    router.push((route ?? '/notifications') as never)
    return
  }
  if (data?.type === 'removal' || data?.completion_id || data?.type === 'approval') {
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
