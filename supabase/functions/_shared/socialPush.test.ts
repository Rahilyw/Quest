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
  cleared: string[]
  marked: string[]
} {
  const cleared: string[] = []
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
    async clearPushToken(userId) {
      cleared.push(userId)
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
  assertEquals(deps.cleared, ['r1'])
  assertEquals(deps.marked, [])
})

Deno.test('successful push marks notification pushed_at', async () => {
  const deps = makeDeps()
  const res = await deliverSocialPush(baseRecord(), deps)
  assertEquals(await res.json(), { ok: true, pushed: true })
  assertEquals(deps.marked, ['n1'])
  assertEquals(deps.cleared, [])
})
