import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * send-push-outbox
 *
 * Drains `push_outbox` rows written by enqueue_weekly_drop() (migration 034)
 * and by the admin when a suggestion goes live (035).
 *
 * Call it from a Database Webhook on INSERT into `weekly_drop_sends`,
 * header `x-webhook-secret` = DROP_PUSH_WEBHOOK_SECRET.
 * verify_jwt is off. This function does not run until that webhook exists;
 * rows can sit unsent until then.
 *
 * A row is marked sent after Expo accepts it, or when the player has no
 * token / has turned drops off, or the token is dead. Transient HTTP
 * failures leave sent_at null so a later invoke can retry. dedupe_key
 * stops a second enqueue from creating a second row.
 */

interface OutboxRow {
  id: string
  user_id: string
  kind: string
  title: string
  body: string
  data: Record<string, unknown> | null
}

interface ProfileRow {
  id: string
  push_token: string | null
  push_drops: boolean | null
}

const BATCH = 100

Deno.serve(async (req) => {
  const secret = Deno.env.get('DROP_PUSH_WEBHOOK_SECRET')
  if (!secret || req.headers.get('x-webhook-secret') !== secret) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  const { data: rows, error } = await admin
    .from('push_outbox')
    .select('id, user_id, kind, title, body, data')
    .is('sent_at', null)
    .order('created_at', { ascending: true })
    .limit(BATCH)

  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 })
  const pending = (rows ?? []) as OutboxRow[]
  if (pending.length === 0) return Response.json({ ok: true, pushed: 0, skipped: 0 })

  const userIds = [...new Set(pending.map((row) => row.user_id))]
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, push_token, push_drops')
    .in('id', userIds)

  const byId = new Map(((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]))
  const now = new Date().toISOString()
  const skipIds: string[] = []
  const messages: { to: string; title: string; body: string; sound: 'default'; data: Record<string, unknown> }[] = []
  const messageIds: string[] = []

  for (const row of pending) {
    const profile = byId.get(row.user_id)
    if (!profile?.push_token || profile.push_drops === false) {
      skipIds.push(row.id)
      continue
    }
    messages.push({
      to: profile.push_token,
      title: row.title,
      body: row.body,
      sound: 'default',
      data: { ...(row.data ?? {}), outbox_id: row.id },
    })
    messageIds.push(row.id)
  }

  if (skipIds.length > 0) {
    await admin.from('push_outbox').update({ sent_at: now }).in('id', skipIds)
  }

  if (messages.length === 0) {
    return Response.json({ ok: true, pushed: 0, skipped: skipIds.length })
  }

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  }).catch((err) => {
    console.error('[send-push-outbox] Expo request failed:', err)
    return null
  })

  if (!res) return Response.json({ ok: false, skipped: skipIds.length }, { status: 502 })

  const ticket = await res.json().catch(() => null)
  const results = Array.isArray(ticket?.data) ? ticket.data : []
  const sentIds: string[] = []
  const deadUsers: string[] = []

  messageIds.forEach((id, index) => {
    const result = results[index]
    if (result?.status === 'error') {
      if (result.details?.error === 'DeviceNotRegistered') {
        const row = pending.find((item) => item.id === id)
        if (row) deadUsers.push(row.user_id)
        sentIds.push(id)
      }
      console.error('[send-push-outbox] Expo ticket error:', result)
      return
    }
    sentIds.push(id)
  })

  if (sentIds.length > 0) {
    await admin.from('push_outbox').update({ sent_at: now }).in('id', sentIds)
  }
  if (deadUsers.length > 0) {
    await admin.from('profiles').update({ push_token: null }).in('id', deadUsers)
  }

  return Response.json({
    ok: true,
    pushed: sentIds.length,
    skipped: skipIds.length,
    remaining_hint: pending.length === BATCH ? 'invoke again to drain the rest' : null,
  })
})
