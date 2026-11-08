import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * send-social-push edge function
 *
 * Called by a Database Webhook on INSERT into `notifications` (migration 029).
 * Sends an Expo push for comment / reply / follow rows; likes stay inbox-only.
 *
 * Skips when the recipient has no push token, has turned off social pushes
 * (profiles.push_social), or has already had 5 social pushes in the last
 * 10 minutes — the inbox still holds every row.
 *
 * Authentication: the webhook must send `x-webhook-secret` matching the
 * SOCIAL_PUSH_WEBHOOK_SECRET function secret (verify_jwt is off in config.toml).
 */

type NotificationType = 'like' | 'comment' | 'reply' | 'follow'

interface NotificationRecord {
  id: string
  recipient_id: string
  actor_id: string
  type: NotificationType
  completion_id: string | null
  comment_id: string | null
}

const PUSH_TYPES: NotificationType[] = ['comment', 'reply', 'follow']
const BURST_WINDOW_MS = 10 * 60 * 1000
const BURST_LIMIT = 5

function snippet(body: string | null | undefined): string {
  if (!body) return ''
  const flat = body.replace(/\s+/g, ' ').trim()
  return flat.length > 80 ? `${flat.slice(0, 79)}…` : flat
}

function buildMessage(type: NotificationType, actor: string, commentBody: string | null) {
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

Deno.serve(async (req) => {
  const secret = Deno.env.get('SOCIAL_PUSH_WEBHOOK_SECRET')
  if (!secret || req.headers.get('x-webhook-secret') !== secret) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const payload = await req.json().catch(() => null)
  const record = payload?.record as NotificationRecord | undefined
  if (payload?.type !== 'INSERT' || !record?.id) {
    return Response.json({ ok: true, skipped: 'not an insert' })
  }
  if (!PUSH_TYPES.includes(record.type)) {
    return Response.json({ ok: true, skipped: 'inbox only' })
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )

  const since = new Date(Date.now() - BURST_WINDOW_MS).toISOString()
  const [recipientResult, actorResult, commentResult, burstResult] = await Promise.all([
    admin.from('profiles').select('push_token, push_social').eq('id', record.recipient_id).maybeSingle(),
    admin.from('profiles').select('username').eq('id', record.actor_id).maybeSingle(),
    record.comment_id
      ? admin.from('completion_comments').select('body, hidden').eq('id', record.comment_id).maybeSingle()
      : Promise.resolve({ data: null }),
    admin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', record.recipient_id)
      .gte('pushed_at', since),
  ])

  const recipient = recipientResult.data
  const actor = actorResult.data
  if (!recipient?.push_token || recipient.push_social === false || !actor) {
    return Response.json({ ok: true, skipped: 'recipient opted out or missing' })
  }
  if (commentResult.data?.hidden) {
    return Response.json({ ok: true, skipped: 'comment hidden' })
  }
  if ((burstResult.count ?? 0) >= BURST_LIMIT) {
    return Response.json({ ok: true, skipped: 'burst limit' })
  }

  const message = buildMessage(record.type, actor.username, commentResult.data?.body ?? null)
  if (!message) return Response.json({ ok: true, skipped: 'no message' })

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: recipient.push_token,
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

  const ticket = await res.json().catch(() => null)
  if (ticket?.data?.status === 'error') {
    // Uninstalled app / revoked permission: stop pushing to a dead token.
    if (ticket.data.details?.error === 'DeviceNotRegistered') {
      await admin.from('profiles').update({ push_token: null }).eq('id', record.recipient_id)
    }
    console.error('[send-social-push] Expo ticket error:', ticket.data)
    return Response.json({ ok: false, error: ticket.data.message })
  }

  await admin.from('notifications').update({ pushed_at: new Date().toISOString() }).eq('id', record.id)

  return Response.json({ ok: true, pushed: true })
})
