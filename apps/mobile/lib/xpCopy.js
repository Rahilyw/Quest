'use strict'

/**
 * XP award display helpers (card C). Pure so Node tests can cover reason lines.
 */

/**
 * @param {string | null | undefined} reason
 * @returns {string | null}
 */
function xpReasonLine(reason) {
  switch (reason) {
    case 'first_finisher':
      return 'First to finish it: +50%'
    case 'weekend':
      return 'Double XP weekend'
    case 'quest':
      return 'Double XP on this quest'
    case 'win_back':
      return 'Welcome back: double XP'
    case 'duo':
      return 'Duo bonus'
    default:
      return null
  }
}

/**
 * Prefer server `xp_awarded`; fall back to quest.xp_reward when 043 is missing.
 * @param {unknown} awarded
 * @param {number} fallback
 * @returns {number}
 */
function resolveXpAwarded(awarded, fallback) {
  const n = typeof awarded === 'number' ? awarded : Number(awarded)
  if (Number.isFinite(n) && n >= 0) return n
  return Number.isFinite(fallback) ? fallback : 0
}

/**
 * Multiplier for analytics: awarded / base, capped sensibly.
 * @param {number} awarded
 * @param {number} base
 * @returns {number | undefined}
 */
function xpMultiplier(awarded, base) {
  if (!(base > 0) || !(awarded >= 0)) return undefined
  const m = awarded / base
  if (!Number.isFinite(m) || m <= 0) return undefined
  return Math.round(m * 100) / 100
}

module.exports = { xpReasonLine, resolveXpAwarded, xpMultiplier }
