/**
 * Pure / injectable pieces of send-social-push.
 */

export type NotificationType = 'like' | 'comment' | 'reply' | 'follow'

export interface NotificationRecord {
  id: string
  recipient_id: string
  actor_id: string
  type: NotificationType
  completion_id: string | null
  comment_id: string | null
}

export const PUSH_TYPES: NotificationType[] = ['comment', 'reply', 'follow']
export const BURST_WINDOW_MS = 10 * 60 * 1000
export const BURST_LIMIT = 5
export const EXPO_URL = 'https://exp.host/--/api/v2/push/send'

export function snippet(body: string | null | undefined): string {
  if (!body) return ''
  const flat = body.replace(/\s+/g, ' ').trim()
  return flat.length > 80 ? `${flat.slice(0, 79)}…` : flat
}

export function buildMessage(
  type: NotificationType,
  actor: string,
  commentBody: string | null,
): { title: string; body: string } | null {
  const text = snippet(commentBody)
  switch (type) {
    case 'comment':
      return { title: `@${actor} commented on your quest`, body: text || 'Tap to see the comment.' }
    case 'reply':
      return { title: `@${actor} replied to you`, body: text || 'Tap to see the reply.' }
    case 'follow':
      return { title: 'New follower', body: `@${actor} started following you.` }
    default:
      return null
  }
}

export function authorizeWebhook(
  req: { headers: { get(name: string): string | null } },
  secret: string | undefined,
): boolean {
  return Boolean(secret && req.headers.get('x-webhook-secret') === secret)
}

/** Whether social push should be skipped for opt-out / missing token / actor. */
export function shouldSkipRecipient(opts: {
  push_token: string | null | undefined
  push_social: boolean | null | undefined
  actorPresent: boolean
}): string | null {
  if (!opts.push_token || opts.push_social === false || !opts.actorPresent) {
    return 'recipient opted out or missing'
  }
  return null
}

export interface SocialPushDeps {
  getRecipient(id: string): Promise<{ push_token: string | null; push_social: boolean | null } | null>
  getActor(id: string): Promise<{ username: string } | null>
  getComment(id: string): Promise<{ body: string | null; hidden: boolean } | null>
  countRecentPushes(recipientId: string, sinceIso: string): Promise<number>
  clearPushToken(userId: string): Promise<void>
  markPushed(notificationId: string): Promise<void>
  fetchImpl?: typeof fetch
}

/**
 * Core social-push path after auth + INSERT validation.
 * Behaviour matches send-social-push/index.ts (including DeviceNotRegistered clear).
 */
export async function deliverSocialPush(
  record: NotificationRecord,
  deps: SocialPushDeps,
): Promise<Response> {
  if (!PUSH_TYPES.includes(record.type)) {
    return Response.json({ ok: true, skipped: 'inbox only' })
  }

  const since = new Date(Date.now() - BURST_WINDOW_MS).toISOString()
  const [recipient, actor, comment, burstCount] = await Promise.all([
    deps.getRecipient(record.recipient_id),
    deps.getActor(record.actor_id),
    record.comment_id ? deps.getComment(record.comment_id) : Promise.resolve(null),
    deps.countRecentPushes(record.recipient_id, since),
  ])

  const skip = shouldSkipRecipient({
    push_token: recipient?.push_token,
    push_social: recipient?.push_social,
    actorPresent: Boolean(actor),
  })
  if (skip) return Response.json({ ok: true, skipped: skip })

  if (comment?.hidden) {
    return Response.json({ ok: true, skipped: 'comment hidden' })
  }
  if (burstCount >= BURST_LIMIT) {
    return Response.json({ ok: true, skipped: 'burst limit' })
  }

  const message = buildMessage(record.type, actor!.username, comment?.body ?? null)
  if (!message) return Response.json({ ok: true, skipped: 'no message' })

  const fetchImpl = deps.fetchImpl ?? fetch
  const res = await fetchImpl(EXPO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: recipient!.push_token,
      title: message.title,
      body: message.body,
      sound: 'default',
      data: {
        type: 'social',
        notification_type: record.type,
        notification_id: record.id,
        completion_id: record.completion_id,
        actor_id: record.actor_id,
      },
    }),
  }).catch((err) => {
    console.error('[send-social-push] Expo request failed:', err)
    return null
  })

  if (!res) return Response.json({ ok: false }, { status: 502 })

  const ticket = await res.json().catch(() => null) as {
    data?: { status?: string; message?: string; details?: { error?: string } }
  } | null
  if (ticket?.data?.status === 'error') {
    if (ticket.data.details?.error === 'DeviceNotRegistered') {
      await deps.clearPushToken(record.recipient_id)
    }
    console.error('[send-social-push] Expo ticket error:', ticket.data)
    return Response.json({ ok: false, error: ticket.data.message })
  }

  await deps.markPushed(record.id)
  return Response.json({ ok: true, pushed: true })
}
