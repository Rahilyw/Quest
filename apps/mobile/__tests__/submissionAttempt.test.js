'use strict'

/**
 * Submission attempt rules (plan Phase 1d). Run: node apps/mobile/__tests__/submissionAttempt.test.js
 */

const path = require('path')
const assert = require('assert')
const {
  newAttemptId,
  placePhotoPath,
  selfiePhotoPath,
  captureAttempt,
  classifyInsertError,
  photoUrlMatchesPath,
} = require(path.join(__dirname, '../lib/submissionAttempt.js'))

let passed = 0
function test(name, fn) {
  fn()
  passed += 1
  console.log(`ok ${passed} ${name}`)
}

test('attempt ids are path-safe and differ between captures', () => {
  const a = newAttemptId(1_700_000_000_000)
  const b = newAttemptId(1_700_000_000_000)
  assert.match(a, /^[a-z0-9]+-[a-z0-9]{10}$/)
  assert.notStrictEqual(a, b)
})

test('a capture keeps one storage path across retries', () => {
  const attempt = captureAttempt({ lat: 48.4, lng: -123.3, accuracy: 12 }, new Date('2026-11-17T20:00:00Z'), () => 'abc-123')
  const first = placePhotoPath('user-1', 'quest-1', attempt.attemptId)
  const retry = placePhotoPath('user-1', 'quest-1', attempt.attemptId)
  assert.strictEqual(first, 'user-1/quest-1/abc-123.jpg')
  assert.strictEqual(retry, first)
  assert.strictEqual(selfiePhotoPath('user-1', 'quest-1', attempt.attemptId), 'user-1/quest-1-abc-123.jpg')
})

test('capture freezes coordinates, accuracy and time', () => {
  const live = { lat: 48.4284, lng: -123.3656, accuracy: 8.5 }
  const attempt = captureAttempt(live, new Date('2026-11-17T20:00:00Z'), () => 'id')
  live.lat = 0
  live.lng = 0
  assert.deepStrictEqual(attempt, {
    attemptId: 'id',
    lat: 48.4284,
    lng: -123.3656,
    accuracy: 8.5,
    capturedAt: '2026-11-17T20:00:00.000Z',
  })
})

test('capture without a fix returns null; missing accuracy becomes null', () => {
  assert.strictEqual(captureAttempt(null), null)
  assert.strictEqual(captureAttempt({ lat: Number.NaN, lng: 1 }), null)
  assert.strictEqual(captureAttempt({ lat: 1, lng: 2, accuracy: null }, new Date(0), () => 'x').accuracy, null)
})

test('insert errors: rate limit (23514) is not mistaken for the geofence', () => {
  assert.strictEqual(classifyInsertError({ code: '23514', message: 'RATE_LIMITED', hint: 'RATE_LIMITED' }), 'rate_limited')
  assert.strictEqual(classifyInsertError({ code: 'P0001', message: 'x', hint: 'RATE_LIMITED' }), 'rate_limited')
  assert.strictEqual(
    classifyInsertError({ code: '23514', message: 'PARTY_REQUIRED', hint: 'PARTY_REQUIRED' }),
    'party_required',
  )
  assert.strictEqual(
    classifyInsertError({ code: '23514', message: 'GEOFENCE_VIOLATION', hint: 'Submission coordinates are outside the quest geofence.' }),
    'outside_zone',
  )
  assert.strictEqual(classifyInsertError({ code: '23514', message: 'new row violates check constraint' }), 'outside_zone')
  assert.strictEqual(classifyInsertError({ code: '23505', message: 'duplicate key' }), 'duplicate')
  assert.strictEqual(classifyInsertError({ code: '42501', message: 'permission denied' }), 'rejected')
  assert.strictEqual(classifyInsertError({ code: '', message: 'TypeError: Network request failed' }), 'network')
  assert.strictEqual(classifyInsertError(null), null)
})

test('a duplicate only owns the photo when the stored URL is this attempt', () => {
  const p = 'user-1/quest-1/abc.jpg'
  assert.strictEqual(photoUrlMatchesPath(`https://x.supabase.co/storage/v1/object/public/proof-photos/${p}`, p), true)
  assert.strictEqual(photoUrlMatchesPath('https://x.supabase.co/storage/v1/object/public/proof-photos/user-1/quest-1/old.jpg', p), false)
  assert.strictEqual(photoUrlMatchesPath(null, p), false)
})

console.log(`\n${passed} submission attempt tests passed`)
