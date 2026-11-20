'use strict'

/**
 * Guard for card E4: non-owners never receive a path for useSignedSelfie.
 * Run: node apps/mobile/__tests__/ownSelfiePath.test.js
 */

const assert = require('assert')
const path = require('path')
const { ownSelfiePath } = require(path.join(__dirname, '../lib/ownSelfiePath.js'))

let passed = 0
function test(name, fn) {
  fn()
  passed += 1
  console.log(`ok ${passed} ${name}`)
}

test('owner with a storage path gets the path', () => {
  assert.strictEqual(ownSelfiePath(true, 'user-id/quest-id.jpg'), 'user-id/quest-id.jpg')
})

test('non-owner never gets a path even when one exists', () => {
  assert.strictEqual(ownSelfiePath(false, 'user-id/quest-id.jpg'), null)
})

test('owner with null or empty path gets null', () => {
  assert.strictEqual(ownSelfiePath(true, null), null)
  assert.strictEqual(ownSelfiePath(true, undefined), null)
  assert.strictEqual(ownSelfiePath(true, ''), null)
  assert.strictEqual(ownSelfiePath(true, '   '), null)
})

test('non-owner with null path stays null', () => {
  assert.strictEqual(ownSelfiePath(false, null), null)
})

console.log(`\n${passed} passed`)
