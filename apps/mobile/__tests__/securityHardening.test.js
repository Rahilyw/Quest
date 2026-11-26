'use strict'

/**
 * Client-side rules from the security review: C-1 (selfies are owner only),
 * C-7/C-8 (queue seal and orphan folders), C-9 (analytics opt-out), C-11 (Sentry scrub).
 * Run: node apps/mobile/__tests__/securityHardening.test.js
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8')
const guard = require(path.join(root, 'lib/queueGuard.js'))
const { scrubString, scrubBreadcrumb, scrubEvent } = require(path.join(root, 'lib/sentryScrub.js'))

let passed = 0
function test(name, fn) {
  fn()
  passed += 1
  console.log(`ok ${passed} ${name}`)
}

// ─── C-1 ─────────────────────────────────────────────────────────────────────

test('C-1: the shared photo query never selects other players\' selfie paths', () => {
  const src = read('hooks/useQuestPhotos.ts')
  const select = src.slice(src.indexOf('const PHOTO_SELECT'), src.indexOf('export'))
  assert.ok(!select.includes('selfie_url'), 'PHOTO_SELECT must not include selfie_url')
  assert.ok(src.includes(".eq('user_id', viewerId)"), 'own selfies come from a query scoped to the viewer')
})

test('C-1: the profile photo list only asks for selfies on your own profile', () => {
  const src = read('app/user/[id]/index.tsx')
  assert.ok(src.includes("isSelf ? 'id, photo_url, selfie_url' : 'id, photo_url'"))
})

test('C-1: the photo viewer signs a selfie only for its owner', () => {
  const src = read('components/PhotoViewer.tsx')
  assert.ok(src.includes('ownSelfiePath(viewerId != null && photo?.user_id === viewerId'))
})

// ─── C-7 / C-8: queue seal ───────────────────────────────────────────────────

test('C-7: a sealed queue stays sealed until that player signs in again', () => {
  guard.resetQueueSeals()
  assert.strictEqual(guard.isQueueSealed('u1'), false)
  guard.sealQueue('u1')
  assert.strictEqual(guard.isQueueSealed('u1'), true)
  assert.strictEqual(guard.isQueueSealed('u2'), false)
  guard.unsealQueue('u1')
  assert.strictEqual(guard.isQueueSealed('u1'), false)
})

test('C-7: sealing ignores empty or non-string ids', () => {
  guard.resetQueueSeals()
  guard.sealQueue('')
  guard.sealQueue(undefined)
  guard.sealQueue(null)
  assert.strictEqual(guard.isQueueSealed(''), false)
  assert.strictEqual(guard.isQueueSealed(undefined), false)
})

test('C-7: the store purges by sealing first and refuses writes while sealed', () => {
  const src = read('lib/submissionQueueStore.ts')
  const purge = src.slice(src.indexOf('export async function purgeQueue'))
  assert.ok(purge.indexOf('sealQueue(userId)') !== -1)
  assert.ok(purge.indexOf('sealQueue(userId)') < purge.indexOf('await AsyncStorage'))
  assert.ok(src.includes('isQueueSealed('))
})

test('C-8: stale queue folders are everything that is not the signed-in player', () => {
  assert.deepStrictEqual(guard.staleQueueFolders(['me', 'old1/', 'old2'], 'me'), ['old1', 'old2'])
  assert.deepStrictEqual(guard.staleQueueFolders(['me/'], 'me'), [])
  assert.deepStrictEqual(guard.staleQueueFolders(['..', '.', 'a/b', 'a\\b', '', 'ok'], 'me'), ['ok'])
  assert.deepStrictEqual(guard.staleQueueFolders([], 'me'), [])
})

// ─── C-9 ─────────────────────────────────────────────────────────────────────

test('C-9: analytics has a settings opt-out and does not record IP geolocation', () => {
  assert.ok(read('lib/analyticsPreference.ts').includes("'pref_analytics_opt_out'"))
  assert.ok(read('components/AnalyticsProvider.tsx').includes('disableGeoip: true'))
  assert.ok(read('components/AnalyticsProvider.tsx').includes('applyAnalyticsPreference'))
  assert.ok(read('app/settings.tsx').includes('Share usage data'))
})

// ─── C-11 ────────────────────────────────────────────────────────────────────

test('C-11: query strings, fragments and storage paths are stripped', () => {
  assert.strictEqual(scrubString('https://x.co/a?token=abc&b=2'), 'https://x.co/a')
  assert.strictEqual(scrubString('https://x.co/cb#access_token=zzz'), 'https://x.co/cb')
  assert.strictEqual(
    scrubString('GET https://x.co/storage/v1/object/proof-photos/11111111/22222222/a.jpg'),
    'GET https://x.co/storage/v1/object/proof-photos/[path]'
  )
  assert.strictEqual(scrubString('plain text'), 'plain text')
  assert.strictEqual(scrubString(42), 42)
})

test('C-11: breadcrumbs are scrubbed in message and nested data', () => {
  const out = scrubBreadcrumb({
    category: 'fetch',
    message: 'open /quest?id=1',
    data: { url: 'https://x.co/s?sig=abc', nested: { path: 'proof-selfies/u/q.jpg' }, list: ['a?b=c'] },
  })
  assert.strictEqual(out.message, 'open /quest')
  assert.strictEqual(out.data.url, 'https://x.co/s')
  assert.strictEqual(out.data.nested.path, 'proof-selfies/[path]')
  assert.deepStrictEqual(out.data.list, ['a'])
  assert.strictEqual(scrubBreadcrumb(null), null)
})

test('C-11: events lose query strings, cookies and breadcrumb secrets', () => {
  const out = scrubEvent({
    message: 'failed https://x.co/p?token=1',
    request: { url: 'https://x.co/p?token=1', query_string: 'token=1', cookies: 'a=b' },
    exception: { values: [{ value: 'bad avatars/u1/me.jpg' }, {}] },
    breadcrumbs: [{ message: 'go /a?x=1' }],
  })
  assert.strictEqual(out.message, 'failed https://x.co/p')
  assert.strictEqual(out.request.url, 'https://x.co/p')
  assert.strictEqual(out.request.query_string, undefined)
  assert.strictEqual(out.request.cookies, undefined)
  assert.strictEqual(out.exception.values[0].value, 'bad avatars/[path]')
  assert.strictEqual(out.breadcrumbs[0].message, 'go /a')
})

test('C-11: Sentry is wired to the scrubbers', () => {
  const src = read('lib/sentry.ts')
  assert.ok(src.includes('beforeBreadcrumb: scrubBreadcrumb'))
  assert.ok(src.includes('beforeSend: scrubEvent'))
})

console.log(`${passed} security hardening tests passed`)
