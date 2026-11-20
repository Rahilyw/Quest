'use strict'

/** Same rule as lookup_redemption: 8 letters or digits, case-insensitive. */
function normalizeRedemptionCode(input) {
  const compact = String(input ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return /^[A-Z0-9]{8}$/.test(compact) ? compact : null
}

function redemptionStats(completions) {
  const codes = (completions ?? []).filter((row) => row && row.redemption_code)
  const redeemed = codes.filter((row) => row.redeemed_at)
  const last = redeemed
    .map((row) => row.redeemed_at)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null
  const issued = codes.length
  const redeemedCount = redeemed.length
  return {
    issued,
    redeemed: redeemedCount,
    rate: issued === 0 ? 0 : Math.round((redeemedCount / issued) * 100),
    last,
  }
}

module.exports = { normalizeRedemptionCode, redemptionStats }
