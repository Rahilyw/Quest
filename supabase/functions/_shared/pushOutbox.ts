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
  const sentRows: SentEntry[] = []

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
    sentRows.push({
      row,
      token: profile.push_token,
      message: {
        to: profile.push_token,
        title: row.title,
        body: row.body,
        sound: 'default',
        data: { ...(row.data ?? {}), outbox_id: row.id },
      },
    })
  }

  await finish(admin, noToken, 'skipped: no push token')
  await finish(admin, prefOff, 'skipped: preference off')
  result.skipped = noToken.length + prefOff.length

  if (sentRows.length === 0) return result

  const outcomes = await sendEntries(sentRows, fetchImpl, { requests: 0 })

  const okIds: string[] = []
  const deadIds: string[] = []
  const deadTokens: { userId: string; token: string }[] = []
  const failures = new Map<string, string[]>()
  const fail = (reason: string, id: string) => {
    const list = failures.get(reason) ?? []
    list.push(id)
    failures.set(reason, list)
  }

  for (const outcome of outcomes) {
    const { row, token } = outcome.entry
    if (outcome.kind === 'transport') {
      result.transportFailed = true
      fail(outcome.reason, row.id)
      continue
    }
    if (outcome.kind === 'rejected') {
      fail(outcome.reason, row.id)
      continue
    }
    const ticket = outcome.ticket
    if (ticket?.status === 'ok') {
      okIds.push(row.id)
      continue
    }
    if (ticket?.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
      deadIds.push(row.id)
      deadTokens.push({ userId: row.user_id, token })
      continue
    }
    // Expo's message text can quote the token, so keep it out of the log and last_error.
    const reason = redactTokens(
      ticket?.status === 'error'
        ? `ticket: ${ticket.details?.error ?? ticket.message ?? 'error'}`
        : 'ticket: missing or unknown status',
    )
    console.error('[send-push-outbox] Expo ticket error:', row.id, reason)
    fail(reason, row.id)
  }

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

interface SentEntry {
  row: OutboxRow
  token: string
  message: ExpoMessage
}

type SendOutcome =
  | { kind: 'ticket'; entry: SentEntry; ticket: ExpoTicket | null }
  /** Expo refused this one message (HTTP 400 on its own). Released for retry or dead letter. */
  | { kind: 'rejected'; entry: SentEntry; reason: string }
  /** No usable answer: the whole request failed. The caller stops draining. */
  | { kind: 'transport'; entry: SentEntry; reason: string }

/** Most Expo requests one batch may spend finding a bad message by splitting. */
const MAX_SPLIT_REQUESTS = 40

/** Replaces any Expo push token in a string, so tokens never reach a log or last_error. */
export function redactTokens(text: string): string {
  return text.replace(/Expo(?:nent)?PushToken\[[^\]]*\]/g, 'ExponentPushToken[redacted]')
}

/**
 * Sends entries to Expo in one request. A request-level 400 usually means one bad
 * message (for example a token from another Expo project) rejected the whole batch of
 * 100, so split in half and retry until the bad message stands alone. Everything else
 * in the batch still goes out (C-6).
 */
async function sendEntries(
  entries: SentEntry[],
  fetchImpl: typeof fetch,
  budget: { requests: number },
): Promise<SendOutcome[]> {
  const transportAll = (reason: string): SendOutcome[] =>
    entries.map((entry): SendOutcome => ({ kind: 'transport', entry, reason }))

  if (budget.requests >= MAX_SPLIT_REQUESTS) {
    return transportAll('split budget exhausted')
  }
  budget.requests += 1

  let res: Response
  try {
    res = await fetchImpl(EXPO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(entries.map((entry) => entry.message)),
    })
  } catch (err) {
    const text = redactTokens(String(err))
    console.error('[send-push-outbox] Expo request failed:', text)
    return transportAll(`network: ${text.slice(0, 200)}`)
  }

  const payload = await res.json().catch(() => null) as {
    data?: unknown
    errors?: unknown
  } | null

  if (res.status === 400) {
    if (entries.length === 1) {
      console.error('[send-push-outbox] Expo rejected message', entries[0].row.id)
      return [{ kind: 'rejected', entry: entries[0], reason: 'rejected: Expo returned HTTP 400 for this message' }]
    }
    const middle = Math.ceil(entries.length / 2)
    const first = await sendEntries(entries.slice(0, middle), fetchImpl, budget)
    const second = await sendEntries(entries.slice(middle), fetchImpl, budget)
    return [...first, ...second]
  }

  if (!res.ok) {
    const detail = payload?.errors ? redactTokens(JSON.stringify(payload.errors)).slice(0, 200) : ''
    console.error('[send-push-outbox] Expo HTTP', res.status, detail)
    return transportAll(`HTTP ${res.status}${detail ? `: ${detail}` : ''}`)
  }

  const tickets = payload?.data
  if (!Array.isArray(tickets) || tickets.length !== entries.length) {
    console.error('[send-push-outbox] unexpected Expo response shape')
    return transportAll('unexpected Expo response shape')
  }

  return entries.map((entry, index): SendOutcome => ({
    kind: 'ticket',
    entry,
    ticket: (tickets[index] ?? null) as ExpoTicket | null,
  }))
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
