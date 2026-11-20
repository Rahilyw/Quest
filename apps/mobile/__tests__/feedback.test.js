'use strict'

/**
 * Feedback helpers (card F). Run: node apps/mobile/__tests__/feedback.test.js
 */

const assert = require('assert')
const path = require('path')
const {
  FEEDBACK_MAX_LENGTH,
  clampFeedbackMessage,
  feedbackResultCopy,
} = require(path.join(__dirname, '../lib/feedback.js'))

let passed = 0
function test(name, fn) {
  fn()
  passed += 1
  console.log(`ok ${passed} ${name}`)
}

test('max length is 1000', () => {
  assert.strictEqual(FEEDBACK_MAX_LENGTH, 1000)
})

test('clamp leaves short messages alone', () => {
  assert.strictEqual(clampFeedbackMessage('hello'), 'hello')
  assert.strictEqual(clampFeedbackMessage(''), '')
})

test('clamp truncates over the limit', () => {
  const long = 'a'.repeat(FEEDBACK_MAX_LENGTH + 50)
  const clamped = clampFeedbackMessage(long)
  assert.strictEqual(clamped.length, FEEDBACK_MAX_LENGTH)
  assert.strictEqual(clamped, 'a'.repeat(FEEDBACK_MAX_LENGTH))
})

test('clamp coerces nullish to empty string', () => {
  assert.strictEqual(clampFeedbackMessage(null), '')
  assert.strictEqual(clampFeedbackMessage(undefined), '')
})

test('result-to-copy for sent', () => {
  assert.strictEqual(feedbackResultCopy('sent'), 'Thanks — we got your note.')
})

test('result-to-copy for unavailable', () => {
  assert.strictEqual(
    feedbackResultCopy('unavailable'),
    "Feedback isn't switched on in this build yet."
  )
})

test('result-to-copy for failed', () => {
  assert.strictEqual(
    feedbackResultCopy('failed'),
    "That didn't send. Check your signal and try again."
  )
})

test('result-to-copy falls back for unknown results', () => {
  assert.strictEqual(
    feedbackResultCopy('weird'),
    "That didn't send. Check your signal and try again."
  )
})

console.log(`\n${passed} tests passed`)
