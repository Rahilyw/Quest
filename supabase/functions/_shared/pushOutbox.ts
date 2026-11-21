/**
 * Pure / injectable pieces of send-push-outbox.
 * fetch and the Supabase client are passed in so Deno tests can fake them.
 */

export interface OutboxRow {
  id: string
  user_id: string
  kind: string
  title: string
  body: string
  data: Record<string, unknown> | null
  attempts: number
}

export interface ProfileRow {
  id: string
  push_token: string | null
  push_drops: boolean | null
}

export interface ExpoMessage {
  to: string
  title: string
  body: string
  sound: 'default'
  data: Record<string, unknown>
}

export interface ExpoTicket {
  status?: string
  id?: string
  message?: string
  details?: { error?: string }
}

export interface BatchResult {
  pushed: number
  skipped: number
  failed: number
  deadTokens: number
  /** True when the whole Expo request failed; the caller stops looping. */
  transportFailed: boolean
}

export interface DrainTotals {
  batches: number
  pushed: number
  skipped: number
  failed: number
  dead_tokens: number
}

export interface DrainResult extends DrainTotals {
  ok: boolean
  stop: string
}

/** Expo accepts at most 100 messages per request. */
export const BATCH = 100
export const MAX_BATCHES = 20
export const TIME_BUDGET_MS = 50_000
/**
 * Dead-letter threshold. The database enforces it (`attempts < 5` in
 * claim_push_outbox, migration 041); this copy is for the log line and must match.
 */
export const MAX_ATTEMPTS = 5
export const EXPO_URL = 'https://exp.host/--/api/v2/push/send'

/** Minimal surface processBatch / drain need from the service-role client. */
export interface PushOutboxAdmin {
  rpc(
    fn: string,
    args: Record<string, unknown>,
  ): Promise<{ data: unknown; error: { message: string } | null }>
  from(table: string): {
    select(cols: string): {
      in(col: string, vals: string[]): Promise<{ data: unknown; error: { message: string } | null }>
    }
    update(values: Record<string, unknown>): {
      eq(col: string, val: string): {
        eq(col: string, val: string): Promise<{ error: { message: string } | null }>
      }
    }
  }
}

/**
 * Per-kind preference gate. weekly_drop, week_recap and win_back all follow
 * the "Weekly digest" toggle (profiles.push_drops). suggestion_live keeps the
 * behaviour it had before 041, which was the same push_drops check.
 * An unknown kind is never sent.
 */
export function preferenceAllows(kind: string, profile: ProfileRow): boolean {
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

async function finish(
  admin: PushOutboxAdmin,
  ids: string[],
  note: string | null,
) {
  if (ids.length === 0) return
  const { error } = await admin.rpc('finish_push_outbox', { p_ids: ids, p_note: note })
  if (error) console.error('[send-push-outbox] finish failed:', error.message)
}

async function release(admin: PushOutboxAdmin, ids: string[], reason: string) {
  if (ids.length === 0) return
  const { error } = await admin.rpc('release_push_outbox', { p_ids: ids, p_error: reason })
  if (error) console.error('[send-push-outbox] release failed:', error.message)
}

/** Groups ids by reason so each distinct reason is one RPC. */
async function releaseGrouped(
  admin: PushOutboxAdmin,
  failures: Map<string, string[]>,
) {
  for (const [reason, ids] of failures) await release(admin, ids, reason)
}

export async function processBatch(
  admin: PushOutboxAdmin,
  rows: OutboxRow[],
  fetchImpl: typeof fetch = fetch,
): Promise<BatchResult> {
  const result: BatchResult = {
    pushed: 0,
    skipped: 0,
    failed: 0,
    deadTokens: 0,
    transportFailed: false,
  }

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

  const byId = new Map(
    ((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]),
  )
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
    res = await fetchImpl(EXPO_URL, {
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

  const payload = await res.json().catch(() => null) as {
    data?: unknown
    errors?: unknown
  } | null

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

export async function drainPushOutbox(
  admin: PushOutboxAdmin,
  opts: {
    fetchImpl?: typeof fetch
    now?: () => number
    batchSize?: number
    maxBatches?: number
    timeBudgetMs?: number
  } = {},
): Promise<DrainResult> {
  const fetchImpl = opts.fetchImpl ?? fetch
  const now = opts.now ?? Date.now
  const batchSize = opts.batchSize ?? BATCH
  const maxBatches = opts.maxBatches ?? MAX_BATCHES
  const timeBudgetMs = opts.timeBudgetMs ?? TIME_BUDGET_MS

  const started = now()
  const totals: DrainTotals = {
    batches: 0,
    pushed: 0,
    skipped: 0,
    failed: 0,
    dead_tokens: 0,
  }
  let stopReason = 'max_batches'

  while (totals.batches < maxBatches) {
    if (now() - started >= timeBudgetMs) {
      stopReason = 'time_budget'
      break
    }

    const { data, error } = await admin.rpc('claim_push_outbox', { p_batch: batchSize })
    if (error) {
      console.error('[send-push-outbox] claim failed:', error.message)
      return { ok: false, stop: 'claim_failed', ...totals }
    }

    const rows = (data ?? []) as OutboxRow[]
    if (rows.length === 0) {
      stopReason = 'drained'
      break
    }

    totals.batches += 1
    const batch = await processBatch(admin, rows, fetchImpl)
    totals.pushed += batch.pushed
    totals.skipped += batch.skipped
    totals.failed += batch.failed
    totals.dead_tokens += batch.deadTokens

    if (batch.transportFailed) {
      stopReason = 'expo_unavailable'
      break
    }
    if (rows.length < batchSize) {
      stopReason = 'drained'
      break
    }
  }

  return {
    ok: stopReason !== 'expo_unavailable' && stopReason !== 'claim_failed',
    stop: stopReason,
    ...totals,
  }
}

export function authorizeWebhook(
  req: { headers: { get(name: string): string | null } },
  secret: string | undefined,
): boolean {
  return Boolean(secret && req.headers.get('x-webhook-secret') === secret)
}
