'use strict'

/**
 * Relative time formatter (card C). Run: node apps/mobile/__tests__/relativeTime.test.js
 */

const assert = require('assert')
const path = require('path')
const { formatRelativeTime } = require(path.join(__dirname, '../lib/relativeTime.js'))

let passed = 0
function test(name, fn) {
  fn()
  passed += 1
  console.log(`ok ${passed} ${name}`)
}

// Fixed "now": Friday 2026-11-20 18:00 America/Vancouver = 2026-11-21 02:00 UTC
const NOW = new Date('2026-11-21T02:00:00.000Z')

test('just now under one minute', () => {
  assert.strictEqual(formatRelativeTime(new Date(NOW.getTime() - 20_000), NOW), 'Just now')
})

test('minutes ago', () => {
  assert.strictEqual(formatRelativeTime(new Date(NOW.getTime() - 5 * 60_000), NOW), '5 min ago')
  assert.strictEqual(formatRelativeTime(new Date(NOW.getTime() - 45 * 60_000), NOW), '45 min ago')
})

test('hours ago same Victoria day uses h', () => {
  // 2 hours earlier still Friday evening in Victoria
  assert.strictEqual(formatRelativeTime(new Date(NOW.getTime() - 2 * 3600_000), NOW), '2 h ago')
})

test('Yesterday for previous Victoria calendar day', () => {
  // Thursday 2026-11-19 20:00 Victoria = 2026-11-20 04:00 UTC
  assert.strictEqual(formatRelativeTime(new Date('2026-11-20T04:00:00.000Z'), NOW), 'Yesterday')
})

test('days ago within a week', () => {
  // Tuesday 2026-11-17 12:00 Victoria = 2026-11-17 20:00 UTC → 3 days
  assert.strictEqual(formatRelativeTime(new Date('2026-11-17T20:00:00.000Z'), NOW), '3 days ago')
})

test('older dates use a short Victoria date', () => {
  const label = formatRelativeTime(new Date('2026-10-01T20:00:00.000Z'), NOW)
  assert.match(label, /Oct/)
  assert.match(label, /1/)
})

test('invalid input returns empty string', () => {
  assert.strictEqual(formatRelativeTime('not-a-date', NOW), '')
})

test('future timestamps read as Just now', () => {
  assert.strictEqual(formatRelativeTime(new Date(NOW.getTime() + 60_000), NOW), 'Just now')
})

console.log(`\n${passed} tests passed`)
