'use strict'

const assert = require('assert')
const { decideAuthDeepLinkAction, parseAuthParams } = require('../lib/authLinkingGuard')

function test(name, fn) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (err) {
    console.error(`not ok - ${name}`)
    throw err
  }
}

test('parseAuthParams reads hash tokens', () => {
  const p = parseAuthParams('quest://reset-password#access_token=abc&refresh_token=r&type=recovery')
  assert.strictEqual(p.access_token, 'abc')
  assert.strictEqual(p.type, 'recovery')
})

test('parseAuthParams reads query code (PKCE)', () => {
  const p = parseAuthParams('quest://reset-password?code=pkce-code')
  assert.strictEqual(p.code, 'pkce-code')
})

test('C-2: ignore when no pending flow (login CSRF)', () => {
  assert.strictEqual(
    decideAuthDeepLinkAction({
      hasLiveSession: false,
      pendingFlow: null,
      params: { access_token: 'attacker' },
    }),
    'ignore',
  )
})

test('C-2: ignore when a live session already exists', () => {
  assert.strictEqual(
    decideAuthDeepLinkAction({
      hasLiveSession: true,
      pendingFlow: 'recovery',
      params: { access_token: 'x', refresh_token: 'y' },
    }),
    'ignore',
  )
})

test('C-2: apply when pending and no live session', () => {
  assert.strictEqual(
    decideAuthDeepLinkAction({
      hasLiveSession: false,
      pendingFlow: 'recovery',
      params: { access_token: 'x' },
    }),
    'apply',
  )
  assert.strictEqual(
    decideAuthDeepLinkAction({
      hasLiveSession: false,
      pendingFlow: 'signin',
      params: { code: 'pkce' },
    }),
    'apply',
  )
})

test('C-2: ignore empty params', () => {
  assert.strictEqual(
    decideAuthDeepLinkAction({ hasLiveSession: false, pendingFlow: 'recovery', params: null }),
    'ignore',
  )
  assert.strictEqual(
    decideAuthDeepLinkAction({ hasLiveSession: false, pendingFlow: 'recovery', params: {} }),
    'ignore',
  )
})

console.log('authLinking: all tests passed')
