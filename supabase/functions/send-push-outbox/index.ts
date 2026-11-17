import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

/**
 * send-push-outbox
 *
 * Drains `push_outbox` (034, bookkeeping from 041). Rows come from
 * enqueue_weekly_drop() (034), enqueue_week_recap() (041) and the admin when a
 * suggestion goes live (035).
 *
 * Callers, both with header `x-webhook-secret` = DROP_PUSH_WEBHOOK_SECRET
 * (verify_jwt is off):
 *   - pg_cron every 5 minutes through invoke_push_outbox_drain() (041), which
 *     only calls when there are rows to claim;
 *   - optionally the Database Webhook on INSERT into `weekly_drop_sends`.
 *
 * One call loops claim → send → finish/release, up to MAX_BATCHES batches or
 * TIME_BUDGET_MS, whichever comes first. Rows left over wait for the next call.
 *
 *   - claim_push_outbox() takes rows with FOR UPDATE SKIP LOCKED, so two calls
 *     at once never send the same row.
 *   - A row is finished (sent_at set) when Expo returns an `ok` ticket, or on
 *     purpose when there is no token, the player's preference is off, or Expo
 *     says DeviceNotRegistered (the token is then cleared).
 *   - Anything else is released: attempts + 1, last_error, and a backoff. After
 *     MAX_ATTEMPTS failures the row is a dead letter and is not claimed again.
 *   - A failure of the whole request (network, non-2xx, unexpected body) stops
 *     the loop, so an Expo outage does not burn every row's attempts in one call.
 *
 * An `ok` ticket means Expo accepted the message, not that the phone showed it.
 * Push receipts are not checked here.
 */

interface OutboxRow {
  id: string
  user_id: string
  kind: string
  title: string
  body: string
  data: Record<string, unknown> | null
  attempts: number
}

interface ProfileRow {
  id: string
  push_token: string | null
  push_drops: boolean | null
}

interface ExpoMessage {
  to: string
  title: string
  body: string
  sound: 'default'
  data: Record<string, unknown>
}

interface ExpoTicket {
  status?: string
  id?: string
  message?: string
  details?: { error?: string }
}

interface BatchResult {
  pushed: number
  skipped: number
  failed: number
  deadTokens: number
  /** True when the whole Expo request failed; the caller stops looping. */
  transportFailed: boolean
}

/** Expo accepts at most 100 messages per request. */
const BATCH = 100
const MAX_BATCHES = 20
const TIME_BUDGET_MS = 50_000
/**
 * Dead-letter threshold. The database enforces it (`attempts < 5` in
 * claim_push_outbox, migration 041); this copy is for the log line and must match.
 */
const MAX_ATTEMPTS = 5
const EXPO_URL = 'https://exp.host/--/api/v2/push/send'

/**
 * Per-kind preference gate. weekly_drop, week_recap and win_back all follow
 * the "Weekly digest" toggle (profiles.push_drops). suggestion_live keeps the
 * behaviour it had before 041, which was the same push_drops check.
 * An unknown kind is never sent.
 */
function preferenceAllows(kind: string, profile: ProfileRow): boolean {
  switch (kind) {
    case 'weekly_drop':
    case 'week_recap':
    case 'win_back':
      return profile.push_drops !== false
    case 'suggestion_live':
      return profile.push_drops !== false
    default:
      return false
  }
}

async function finish(admin: SupabaseClient, ids: string[], note: string | null) {
  if (ids.length === 0) return
  const { error } = await admin.rpc('finish_push_outbox', { p_ids: ids, p_note: note })
  if (error) console.error('[send-push-outbox] finish failed:', error.message)
}

async function release(admin: SupabaseClient, ids: string[], reason: string) {
  if (ids.length === 0) return
  const { error } = await admin.rpc('release_push_outbox', { p_ids: ids, p_error: reason })
  if (error) console.error('[send-push-outbox] release failed:', error.message)
}

/** Groups ids by reason so each distinct reason is one RPC. */
async function releaseGrouped(admin: SupabaseClient, failures: Map<string, string[]>) {
  for (const [reason, ids] of failures) await release(admin, ids, reason)
}

async function processBatch(admin: SupabaseClient, rows: OutboxRow[]): Promise<BatchResult> {
  const result: BatchResult = { pushed: 0, skipped: 0, failed: 0, deadTokens: 0, transportFailed: false }

  const userIds = [...new Set(rows.map((row) => row.user_id))]
  const { data: profiles, error: profileError } = await admin
    .from('profiles')
    .select('id, push_token, push_drops')
    .in('id', userIds)

  if (profileError) {
    await release(admin, rows.map((row) => row.id), `profile lookup failed: ${profileError.message}`)
    result.failed = rows.length
    result.transportFailed = true
    return result
  }

  const byId = new Map(((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]))
  const noToken: string[] = []
  const prefOff: string[] = []
  const messages: ExpoMessage[] = []
  const sentRows: { row: OutboxRow; token: string }[] = []

  for (const row of rows) {
    const profile = byId.get(row.user_id)
    if (!profile?.push_token) {
      noToken.push(row.id)
      continue
    }
    if (!preferenceAllows(row.kind, profile)) {
      prefOff.push(row.id)
      continue
    }
    messages.push({
      to: profile.push_token,
      title: row.title,
      body: row.body,
      sound: 'default',
      data: { ...(row.data ?? {}), outbox_id: row.id },
    })
    sentRows.push({ row, token: profile.push_token })
  }

  await finish(admin, noToken, 'skipped: no push token')
  await finish(admin, prefOff, 'skipped: preference off')
  result.skipped = noToken.length + prefOff.length

  if (messages.length === 0) return result

  const allIds = sentRows.map((entry) => entry.row.id)
  let res: Response
  try {
    res = await fetch(EXPO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    })
  } catch (err) {
    console.error('[send-push-outbox] Expo request failed:', err)
    await release(admin, allIds, `network: ${String(err).slice(0, 200)}`)
    result.failed = allIds.length
    result.transportFailed = true
    return result
  }

  const payload = await res.json().catch(() => null) as { data?: unknown; errors?: unknown } | null

  if (!res.ok) {
    const detail = payload?.errors ? JSON.stringify(payload.errors).slice(0, 200) : ''
    console.error('[send-push-outbox] Expo HTTP', res.status, detail)
    await release(admin, allIds, `HTTP ${res.status}${detail ? `: ${detail}` : ''}`)
    result.failed = allIds.length
    result.transportFailed = true
    return result
  }

  const tickets = payload?.data
  if (!Array.isArray(tickets) || tickets.length !== messages.length) {
    console.error('[send-push-outbox] unexpected Expo response shape')
    await release(admin, allIds, 'unexpected Expo response shape')
    result.failed = allIds.length
    result.transportFailed = true
    return result
  }

  const okIds: string[] = []
  const deadIds: string[] = []
  const deadTokens: { userId: string; token: string }[] = []
  const failures = new Map<string, string[]>()

  sentRows.forEach(({ row, token }, index) => {
    const ticket = tickets[index] as ExpoTicket | null
    if (ticket?.status === 'ok') {
      okIds.push(row.id)
      return
    }
    if (ticket?.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
      deadIds.push(row.id)
      deadTokens.push({ userId: row.user_id, token })
      return
    }
    const reason = ticket?.status === 'error'
      ? `ticket: ${ticket.details?.error ?? ticket.message ?? 'error'}`
      : 'ticket: missing or unknown status'
    console.error('[send-push-outbox] Expo ticket error:', row.id, reason)
    const list = failures.get(reason) ?? []
    list.push(row.id)
    failures.set(reason, list)
  })

  await finish(admin, okIds, null)
  await finish(admin, deadIds, 'DeviceNotRegistered')
  await releaseGrouped(admin, failures)

  // Clear a dead token only if the player has not registered a new one since.
  for (const { userId, token } of deadTokens) {
    const { error } = await admin
      .from('profiles')
      .update({ push_token: null })
      .eq('id', userId)
      .eq('push_token', token)
    if (error) console.error('[send-push-outbox] dead device cleanup failed:', error.message)
  }

  result.pushed = okIds.length
  result.deadTokens = deadIds.length
  result.skipped += deadIds.length
  result.failed = [...failures.values()].reduce((sum, ids) => sum + ids.length, 0)
  return result
}

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

  const started = Date.now()
  const totals = { batches: 0, pushed: 0, skipped: 0, failed: 0, dead_tokens: 0 }
  let stopReason = 'max_batches'

  while (totals.batches < MAX_BATCHES) {
    if (Date.now() - started >= TIME_BUDGET_MS) {
      stopReason = 'time_budget'
      break
    }

    const { data, error } = await admin.rpc('claim_push_outbox', { p_batch: BATCH })
    if (error) {
      console.error('[send-push-outbox] claim failed:', error.message)
      return Response.json({ ok: false, error: error.message, ...totals }, { status: 500 })
    }

    const rows = (data ?? []) as OutboxRow[]
    if (rows.length === 0) {
      stopReason = 'drained'
      break
    }

    totals.batches += 1
    const batch = await processBatch(admin, rows)
    totals.pushed += batch.pushed
    totals.skipped += batch.skipped
    totals.failed += batch.failed
    totals.dead_tokens += batch.deadTokens

    if (batch.transportFailed) {
      stopReason = 'expo_unavailable'
      break
    }
    if (rows.length < BATCH) {
      stopReason = 'drained'
      break
    }
  }

  console.log('[send-push-outbox]', JSON.stringify({
    ...totals,
    stop: stopReason,
    ms: Date.now() - started,
    max_attempts: MAX_ATTEMPTS,
  }))
  return Response.json({ ok: stopReason !== 'expo_unavailable', ...totals, stop: stopReason })
})
