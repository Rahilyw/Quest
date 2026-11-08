export type SocialNotificationType = 'like' | 'comment' | 'reply' | 'follow'

export function notificationText(type: SocialNotificationType): string
export function notificationRoute(
  type: SocialNotificationType,
  completionId: string | null,
  actorId: string | null
): string | null
export function formatBadgeCount(count: number): string
export function socialRateLimitMessage(hint: string | null | undefined): string | null
