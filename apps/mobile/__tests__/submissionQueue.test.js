'use strict'

/**
 * Offline submission queue rules (plan Phase 3, Spec 06 §5).
 * Run: node apps/mobile/__tests__/submissionQueue.test.js
 */

const fs = require('fs')
const path = require('path')
const assert = require('assert')
const Q = require(path.join(__dirname, '../lib/submissionQueue.js'))

let passed = 0
function test(name, fn) {
  fn()
  passed += 1
  console.log(`ok ${passed} ${name}`)
}

const T0 = Date.parse('2026-11-19T22:00:00Z')
const MIN = 60 * 1000
const HOUR = 60 * MIN

function fields(questId, attemptId, extra = {}) {
  return {
    userId: 'user-1',
    questId,
    questTitle: `Quest ${questId}`,
    xpReward: 150,
    isSponsored: false,
    attempt: { attemptId, lat: 48.42, lng: -123.37, accuracy: 10, capturedAt: new Date(T0).toISOString() },
    placeUri: `file:///doc/queue/user-1/${attemptId}-place.jpg`,
    selfieUri: null,
    ...extra,
  }
}

function filled(n, now = T0) {
  let queue = []
  for (let i = 0; i < n; i += 1) queue = Q.enqueue(queue, fields(`q${i}`, `a${i}`), now).queue
  return queue
}

test('an enqueued capture waits 30 s before its first retry', () => {
  const { queue, accepted, item } = Q.enqueue([], fields('q1', 'a1'), T0)
  assert.strictEqual(accepted, true)
  assert.strictEqual(queue.length, 1)
  assert.strictEqual(item.id, 'a1')
  assert.strictEqual(item.attempts, 0)
  assert.strictEqual(item.nextAttemptAt, T0 + 30 * 1000)
  assert.strictEqual(Q.nextDue(queue, T0), null)
  assert.strictEqual(Q.nextDue(queue, T0 + 30 * 1000).id, 'a1')
})

test('the queue holds at most three proofs and refuses a fourth rather than dropping one', () => {
  const queue = filled(3)
  const result = Q.enqueue(queue, fields('q9', 'a9'), T0)
  assert.strictEqual(result.accepted, false)
  assert.strictEqual(result.queue.length, 3)
  assert.deepStrictEqual(result.queue.map((item) => item.id), ['a0', 'a1', 'a2'])
})

test('a new capture of a queued quest replaces the old one, even when full', () => {
  const queue = filled(3)
  const result = Q.enqueue(queue, fields('q1', 'b1'), T0 + MIN)
  assert.strictEqual(result.accepted, true)
  assert.strictEqual(result.queue.length, 3)
  assert.deepStrictEqual(result.replaced.map((item) => item.id), ['a1'])
  assert.ok(result.queue.some((item) => item.id === 'b1'))
  assert.ok(!result.queue.some((item) => item.id === 'a1'))
})

test('enqueue never mutates the queue it was given', () => {
  const queue = filled(2)
  const snapshot = JSON.stringify(queue)
  Q.enqueue(queue, fields('q5', 'a5'), T0)
  Q.markAttempt(queue, 'a0', 'network', T0)
  Q.remove(queue, 'a0')
  assert.strictEqual(JSON.stringify(queue), snapshot)
})

test('items expire 72 hours after they were queued', () => {
  const queue = filled(2)
  const almost = Q.expire(queue, T0 + 72 * HOUR - 1)
  assert.strictEqual(almost.queue.length, 2)
  const gone = Q.expire(queue, T0 + 72 * HOUR)
  assert.strictEqual(gone.queue.length, 0)
  assert.strictEqual(gone.expired.length, 2)
  assert.strictEqual(Q.nextDue(queue, T0 + 72 * HOUR), null, 'expired items are never sent')
})

test('an expired item frees its slot for a new capture', () => {
  const queue = filled(3)
  const result = Q.enqueue(queue, fields('q9', 'a9'), T0 + 72 * HOUR)
  assert.strictEqual(result.accepted, true)
  assert.strictEqual(result.expired.length, 3)
  assert.deepStrictEqual(result.queue.map((item) => item.id), ['a9'])
})

test('backoff climbs 30 s, 2 min, 10 min, 30 min, then stays hourly', () => {
  assert.deepStrictEqual(
    [1, 2, 3, 4, 5, 6, 9].map(Q.backoffDelay),
    [30 * 1000, 2 * MIN, 10 * MIN, 30 * MIN, HOUR, HOUR, HOUR],
  )
  let queue = filled(1)
  queue = Q.markAttempt(queue, 'a0', 'network', T0)
  assert.strictEqual(queue[0].attempts, 1)
  assert.strictEqual(queue[0].lastError, 'network')
  assert.strictEqual(queue[0].nextAttemptAt, T0 + 30 * 1000)
  queue = Q.markAttempt(queue, 'a0', 'network', T0 + MIN)
  assert.strictEqual(queue[0].nextAttemptAt, T0 + MIN + 2 * MIN)
})

test('the earliest due item goes first, and the wake time is the earliest due', () => {
  let queue = filled(3)
  queue = Q.markAttempt(queue, 'a0', 'network', T0)
  queue = Q.markAttempt(queue, 'a0', 'network', T0)
  assert.strictEqual(Q.nextDue(queue, T0 + 31 * 1000).id, 'a1')
  assert.strictEqual(Q.nextWakeAt(queue), T0 + 30 * 1000)
  assert.strictEqual(Q.nextWakeAt([]), null)
})

test('a duplicate counts as sent: the same capture may have landed before the signal dropped', () => {
  assert.strictEqual(Q.flushOutcome('verified'), 'sent')
  assert.strictEqual(Q.flushOutcome('duplicate'), 'sent')
  assert.strictEqual(Q.flushOutcome('outside_zone'), 'drop')
  assert.strictEqual(Q.flushOutcome('rejected'), 'drop')
  assert.strictEqual(Q.flushOutcome('network'), 'retry')
  assert.strictEqual(Q.flushOutcome('rate_limited'), 'retry')
})

test('an uploaded place photo is remembered so a retry skips the upload', () => {
  const queue = Q.markPlaceUploaded(filled(2), 'a1')
  assert.strictEqual(queue.find((item) => item.id === 'a1').placeUploaded, true)
  assert.strictEqual(queue.find((item) => item.id === 'a0').placeUploaded, false)
})

test('stored queues are parsed defensively and only for the signed-in player', () => {
  const mine = filled(1)[0]
  const theirs = { ...mine, id: 'x', userId: 'user-2' }
  const broken = { id: 'y', questId: 'q', placeUri: 'f', attempt: { lat: 'north' } }
  const raw = JSON.stringify([mine, theirs, broken])
  assert.deepStrictEqual(Q.parseStored(raw, 'user-1').map((item) => item.id), ['a0'])
  assert.deepStrictEqual(Q.parseStored('not json', 'user-1'), [])
  assert.deepStrictEqual(Q.parseStored(JSON.stringify({ a: 1 }), 'user-1'), [])
  assert.deepStrictEqual(Q.parseStored(null, 'user-1'), [])
})

test('signing in as someone else marks other players’ queue keys for purging', () => {
  const keys = [Q.storageKey('user-1'), Q.storageKey('user-2'), 'quest.onboarding', `${Q.STORAGE_PREFIX}user-3`]
  assert.deepStrictEqual(Q.staleQueueKeys(keys, 'user-1'), [Q.storageKey('user-2'), Q.storageKey('user-3')])
  assert.deepStrictEqual(Q.staleQueueKeys(null, 'user-1'), [])
})

test('analytics waits are coarse buckets, never exact times', () => {
  assert.strictEqual(Q.waitedMinutesBucket(T0, T0 + 3 * MIN), 0)
  assert.strictEqual(Q.waitedMinutesBucket(T0, T0 + 20 * MIN), 15)
  assert.strictEqual(Q.waitedMinutesBucket(T0, T0 + 7 * HOUR), 360)
  assert.strictEqual(Q.waitedMinutesBucket(T0, T0 + 5 * 24 * HOUR), 2880)
  assert.strictEqual(Q.waitedMinutesBucket(T0, T0 - MIN), 0)
})

// Source guards: the app wiring that the pure rules above cannot see.
const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')

test('the submit screen queues only on a network result', () => {
  const src = read('app/submit/[questId].tsx')
  const networkCase = src.slice(src.indexOf("case 'network'"), src.indexOf("case 'duplicate'"))
  assert.ok(networkCase.includes('enqueueCapture('), 'network case enqueues')
  for (const other of ["case 'rate_limited'", "case 'outside_zone'", "case 'rejected'"]) {
    const start = src.indexOf(other)
    const segment = src.slice(start, src.indexOf('case', start + other.length))
    assert.ok(!segment.includes('enqueueCapture'), `${other} must not enqueue`)
  }
})

test('queued copy never claims the proof is verified', () => {
  const sources = [read('app/submit/[questId].tsx'), read('components/WaitingToSend.tsx'), read('components/SubmissionQueueBanner.tsx')]
  const queuedCopy = sources[0].slice(sources[0].indexOf("step === 'queued'"), sources[0].indexOf("step === 'failed'"))
  // Comments may explain the rule; only the code and its strings are checked.
  const withoutComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  for (const text of [queuedCopy, sources[1], sources[2]]) {
    assert.ok(!/verified/i.test(withoutComments(text)), 'no "verified" in queue UI copy')
  }
  assert.ok(queuedCopy.includes('Saved. We’ll send it when you’re back online.'))
})

test('the queue is purged on sign-out and on account deletion', () => {
  assert.ok(read('hooks/useAuth.tsx').includes('purgeQueue(session.user.id)'))
  const settings = read('app/settings.tsx')
  const deleteFlow = settings.slice(settings.indexOf("rpc('delete_own_account')"))
  assert.ok(deleteFlow.slice(0, 400).includes('purgeQueue('), 'purged right after the account is deleted')
})

test('queue analytics carry no coordinates or photo paths', () => {
  const hook = read('hooks/useSubmissionQueue.tsx')
  const calls = hook.match(/track\('proof_queue[^)]*\)|track\('proof_queued[^)]*\)/g) || []
  assert.ok(calls.length >= 3)
  for (const call of calls) assert.ok(!/lat|lng|uri|path|attempt/i.test(call), call)
})

console.log(`\n${passed} submission queue tests passed`)
