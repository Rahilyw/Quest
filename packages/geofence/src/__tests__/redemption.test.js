'use strict'

const assert = require('assert')
const { normalizeRedemptionCode, redemptionStats } = require('../redemption')

assert.strictEqual(normalizeRedemptionCode('ab c-12 3d'), null)
assert.strictEqual(normalizeRedemptionCode('  ab23kmpq '), 'AB23KMPQ')
assert.strictEqual(normalizeRedemptionCode('AB23KMPQ9'), null)
assert.strictEqual(normalizeRedemptionCode(''), null)

const stats = redemptionStats([
  { redemption_code: 'AB23KMPQ', redeemed_at: '2026-11-02T18:00:00.000Z' },
  { redemption_code: 'CD45NPR7', redeemed_at: null },
  { redemption_code: null, redeemed_at: null },
])
assert.deepStrictEqual(stats, {
  issued: 2,
  redeemed: 1,
  rate: 50,
  last: '2026-11-02T18:00:00.000Z',
})
assert.deepStrictEqual(redemptionStats([]), { issued: 0, redeemed: 0, rate: 0, last: null })

console.log('redemption tests passed')
