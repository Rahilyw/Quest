import {
  assertEquals,
  assertGreater,
} from 'https://deno.land/std@0.224.0/assert/mod.ts'
import {
  authorizeWebhook,
  drainPushOutbox,
  preferenceAllows,
  processBatch,
  type OutboxRow,
  type ProfileRow,
  type PushOutboxAdmin,
} from './pushOutbox.ts'

function row(partial: Partial<OutboxRow> & Pick<OutboxRow, 'id' | 'user_id'>): OutboxRow {
  return {
    kind: 'weekly_drop',
    title: 'Quest!',
    body: 'hi',
    data: {},
    attempts: 0,
    ...partial,
  }
}

type RpcCall = { fn: string; args: Record<string, unknown> }

function makeAdmin(opts: {
  claims?: OutboxRow[][]
  profiles?: ProfileRow[]
}): {
  admin: PushOutboxAdmin
  rpcs: RpcCall[]
  clearedTokens: { userId: string; token: string }[]
} {
  const claims = [...(opts.claims ?? [])]
  const profiles = opts.profiles ?? []
  const rpcs: RpcCall[] = []
  const clearedTokens: { userId: string; token: string }[] = []

  const admin: PushOutboxAdmin = {
    async rpc(fn, args) {
      rpcs.push({ fn, args })
      if (fn === 'claim_push_outbox') {
        const next = claims.shift() ?? []
        return { data: next, error: null }
      }
      return { data: null, error: null }
    },
    from(table: string) {
      if (table !== 'profiles') {
        throw new Error(`unexpected table ${table}`)
      }
      return {
        select(_cols: string) {
          return {
            async in(_col: string, ids: string[]) {
              return {
                data: profiles.filter((p) => ids.includes(p.id)),
                error: null,
              }
            },
          }
        },
        update(values: Record<string, unknown>) {
          return {
            eq(col1: string, val1: string) {
              return {
                async eq(col2: string, val2: string) {
                  if (values.push_token === null && col1 === 'id' && col2 === 'push_token') {
                    clearedTokens.push({ userId: val1, token: val2 })
                  }
                  return { error: null }
                },
              }
            },
          }
        },
      }
    },
  }

  return { admin, rpcs, clearedTokens }
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.test('preferenceAllows respects push_drops opt-out', () => {
  const on: ProfileRow = { id: 'a', push_token: 't', push_drops: true }
  const off: ProfileRow = { id: 'b', push_token: 't', push_drops: false }
  assertEquals(preferenceAllows('weekly_drop', on), true)
  assertEquals(preferenceAllows('week_recap', off), false)
  assertEquals(preferenceAllows('win_back', off), false)
  assertEquals(preferenceAllows('suggestion_live', off), false)
  assertEquals(preferenceAllows('unknown', on), false)
})

Deno.test('authorizeWebhook rejects bad secret', () => {
  const req = { headers: { get: (n: string) => (n === 'x-webhook-secret' ? 'wrong' : null) } }
  assertEquals(authorizeWebhook(req, 'expected'), false)
  assertEquals(authorizeWebhook(req, undefined), false)
  const ok = { headers: { get: (n: string) => (n === 'x-webhook-secret' ? 'secret' : null) } }
  assertEquals(authorizeWebhook(ok, 'secret'), true)
})

Deno.test('non-2xx Expo response releases rows (claimable again)', async () => {
  const rows = [row({ id: '1', user_id: 'u1' }), row({ id: '2', user_id: 'u1' })]
  const { admin, rpcs } = makeAdmin({
    profiles: [{ id: 'u1', push_token: 'ExponentPushToken[x]', push_drops: true }],
  })
  const fetchImpl: typeof fetch = async () => jsonResponse(503, { errors: ['down'] })

  const result = await processBatch(admin, rows, fetchImpl)
  assertEquals(result.transportFailed, true)
  assertEquals(result.failed, 2)
  assertEquals(result.pushed, 0)
  const releases = rpcs.filter((c) => c.fn === 'release_push_outbox')
  assertEquals(releases.length, 1)
  assertEquals((releases[0].args.p_ids as string[]).sort(), ['1', '2'])
  assertEquals(String(releases[0].args.p_error).startsWith('HTTP 503'), true)
  assertEquals(rpcs.some((c) => c.fn === 'finish_push_outbox' && c.args.p_note == null), false)
})

Deno.test('per-ticket errors are released; DeviceNotRegistered finishes and clears token', async () => {
  const rows = [
    row({ id: 'ok', user_id: 'u1' }),
    row({ id: 'dead', user_id: 'u2' }),
    row({ id: 'err', user_id: 'u3' }),
  ]
  const { admin, rpcs, clearedTokens } = makeAdmin({
    profiles: [
      { id: 'u1', push_token: 't1', push_drops: true },
      { id: 'u2', push_token: 't2', push_drops: true },
      { id: 'u3', push_token: 't3', push_drops: true },
    ],
  })
  const fetchImpl: typeof fetch = async () =>
    jsonResponse(200, {
      data: [
        { status: 'ok', id: 'ticket-1' },
        { status: 'error', details: { error: 'DeviceNotRegistered' } },
        { status: 'error', details: { error: 'MessageTooBig' }, message: 'too big' },
      ],
    })

  const result = await processBatch(admin, rows, fetchImpl)
  assertEquals(result.pushed, 1)
  assertEquals(result.deadTokens, 1)
  assertEquals(result.failed, 1)
  assertEquals(result.transportFailed, false)

  const finishes = rpcs.filter((c) => c.fn === 'finish_push_outbox')
  const finishOk = finishes.find((c) => c.args.p_note == null)
  const finishDead = finishes.find((c) => c.args.p_note === 'DeviceNotRegistered')
  assertEquals(finishOk?.args.p_ids, ['ok'])
  assertEquals(finishDead?.args.p_ids, ['dead'])

  const releases = rpcs.filter((c) => c.fn === 'release_push_outbox')
  assertEquals(releases.length, 1)
  assertEquals(releases[0].args.p_ids, ['err'])
  assertEquals(String(releases[0].args.p_error).includes('MessageTooBig'), true)

  // Today's behaviour: dead tokens are cleared (matched by current token).
  assertEquals(clearedTokens, [{ userId: 'u2', token: 't2' }])
})

Deno.test('push_drops false finishes as preference off and does not call Expo', async () => {
  let fetchCalls = 0
  const { admin, rpcs } = makeAdmin({
    profiles: [{ id: 'u1', push_token: 't', push_drops: false }],
  })
  const result = await processBatch(
    admin,
    [row({ id: '1', user_id: 'u1', kind: 'week_recap' })],
    async () => {
      fetchCalls += 1
      return jsonResponse(200, { data: [] })
    },
  )
  assertEquals(fetchCalls, 0)
  assertEquals(result.skipped, 1)
  assertEquals(result.pushed, 0)
  const finish = rpcs.find((c) => c.fn === 'finish_push_outbox')
  assertEquals(finish?.args.p_note, 'skipped: preference off')
})

Deno.test('more than 100 rows are drained across batches', async () => {
  const batch1 = Array.from({ length: 100 }, (_, i) =>
    row({ id: `a${i}`, user_id: 'u1' }),
  )
  const batch2 = Array.from({ length: 50 }, (_, i) =>
    row({ id: `b${i}`, user_id: 'u1' }),
  )
  const { admin } = makeAdmin({
    claims: [batch1, batch2],
    profiles: [{ id: 'u1', push_token: 't', push_drops: true }],
  })

  const fetchImpl: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body ?? '[]')) as unknown[]
    return jsonResponse(200, {
      data: body.map(() => ({ status: 'ok', id: 't' })),
    })
  }

  const result = await drainPushOutbox(admin, { fetchImpl })
  assertEquals(result.stop, 'drained')
  assertEquals(result.batches, 2)
  assertEquals(result.pushed, 150)
  assertGreater(result.pushed, 100)
})
