import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import {
  authorizeWebhook,
  buildMessage,
  deliverSocialPush,
  shouldSkipRecipient,
  type NotificationRecord,
  type SocialPushDeps,
} from './socialPush.ts'

function baseRecord(partial: Partial<NotificationRecord> = {}): NotificationRecord {
  return {
    id: 'n1',
    recipient_id: 'r1',
    actor_id: 'a1',
    type: 'comment',
    completion_id: 'c1',
    comment_id: 'cm1',
    ...partial,
  }
}

function makeDeps(overrides: Partial<SocialPushDeps> = {}): SocialPushDeps & {
  cleared: { userId: string; token: string }[]
  marked: string[]
} {
  const cleared: { userId: string; token: string }[] = []
  const marked: string[] = []
  return {
    cleared,
    marked,
    async getRecipient() {
      return { push_token: 'ExponentPushToken[x]', push_social: true }
    },
    async getActor() {
      return { username: 'ada' }
    },
    async getComment() {
      return { body: 'nice', hidden: false }
    },
    async countRecentPushes() {
      return 0
    },
    async clearPushToken(userId, token) {
      cleared.push({ userId, token })
    },
    async markPushed(id) {
      marked.push(id)
    },
    fetchImpl: async () =>
      new Response(JSON.stringify({ data: { status: 'ok' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ...overrides,
  }
}

Deno.test('buildMessage covers comment reply follow', () => {
  assertEquals(buildMessage('comment', 'ada', 'hello')?.title, '@ada commented on your quest')
  assertEquals(buildMessage('reply', 'ada', null)?.body, 'Tap to see the reply.')
  assertEquals(buildMessage('follow', 'ada', null)?.title, 'New follower')
  assertEquals(buildMessage('like', 'ada', null), null)
})

Deno.test('authorizeWebhook rejects bad social secret', () => {
  const req = { headers: { get: () => 'nope' } }
  assertEquals(authorizeWebhook(req, 'secret'), false)
})

Deno.test('push_social false is skipped and Expo is not called', async () => {
  let fetches = 0
  const deps = makeDeps({
    async getRecipient() {
      return { push_token: 't', push_social: false }
    },
    fetchImpl: async () => {
      fetches += 1
      return new Response('{}')
    },
  })
  const res = await deliverSocialPush(baseRecord(), deps)
  assertEquals(res.status, 200)
  assertEquals(await res.json(), { ok: true, skipped: 'recipient opted out or missing' })
  assertEquals(fetches, 0)
  assertEquals(shouldSkipRecipient({
    push_token: 't',
    push_social: false,
    actorPresent: true,
  }), 'recipient opted out or missing')
})

Deno.test('DeviceNotRegistered clears token (pins today\'s behaviour)', async () => {
  const deps = makeDeps({
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          data: { status: 'error', message: 'dead', details: { error: 'DeviceNotRegistered' } },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
  })
  const res = await deliverSocialPush(baseRecord(), deps)
  const body = await res.json()
  assertEquals(body.ok, false)
  // C-13: the token that was sent to is the one cleared.
  assertEquals(deps.cleared, [{ userId: 'r1', token: 'ExponentPushToken[x]' }])
  assertEquals(deps.marked, [])
})

Deno.test('successful push marks notification pushed_at', async () => {
  const deps = makeDeps()
  const res = await deliverSocialPush(baseRecord(), deps)
  assertEquals(await res.json(), { ok: true, pushed: true })
  assertEquals(deps.marked, ['n1'])
  assertEquals(deps.cleared, [])
})

/** Runs fn while capturing everything passed to console.error. */
async function captureErrors<T>(fn: () => Promise<T>): Promise<{ result: T; logged: string }> {
  const original = console.error
  const lines: string[] = []
  console.error = (...args: unknown[]) => {
    lines.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '))
  }
  try {
    return { result: await fn(), logged: lines.join('\n') }
  } finally {
    console.error = original
  }
}

Deno.test('C-4: an Expo ticket error never leaks the token to the log or the response', async () => {
  const token = 'ExponentPushToken[x]'
  const deps = makeDeps({
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          data: {
            status: 'error',
            message: `"${token}" is not a registered push notification recipient`,
            details: { error: 'DeviceNotRegistered', expoPushToken: token },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
  })
  const { result: res, logged } = await captureErrors(() => deliverSocialPush(baseRecord(), deps))
  const body = await res.json()
  assertEquals(body, { ok: false, error: 'push_failed' })
  assertEquals(logged.includes(token), false)
  assertEquals(logged.includes('DeviceNotRegistered'), true)
})

Deno.test('C-4: a failed Expo request logs the error type only', async () => {
  const deps = makeDeps({
    fetchImpl: async () => {
      throw new TypeError('connect failed for ExponentPushToken[x]')
    },
  })
  const { result: res, logged } = await captureErrors(() => deliverSocialPush(baseRecord(), deps))
  assertEquals(res.status, 502)
  assertEquals(await res.json(), { ok: false, error: 'push_failed' })
  assertEquals(logged.includes('ExponentPushToken'), false)
})

Deno.test('C-5: a non-2xx Expo reply is not marked pushed', async () => {
  const deps = makeDeps({
    fetchImpl: async () => new Response('Service Unavailable', { status: 503 }),
  })
  const { result: res } = await captureErrors(() => deliverSocialPush(baseRecord(), deps))
  assertEquals(res.status, 502)
  assertEquals(await res.json(), { ok: false, error: 'push_failed' })
  assertEquals(deps.marked, [])
  assertEquals(deps.cleared, [])
})

Deno.test('C-5: a 200 reply without an ok ticket is not marked pushed', async () => {
  for (const payload of [{}, { data: {} }, { data: { status: 'pending' } }, null]) {
    const deps = makeDeps({
      fetchImpl: async () =>
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    })
    const { result: res } = await captureErrors(() => deliverSocialPush(baseRecord(), deps))
    assertEquals(res.status, 502)
    assertEquals(deps.marked, [])
  }
})