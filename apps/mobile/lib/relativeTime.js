'use strict'

/**
 * Relative time for "Photos from here" rows (card C / Phase 6 E3).
 * Victoria calendar day for "Yesterday"; figures are plain digits for tabular nums.
 */

const VICTORIA = 'America/Vancouver'

/** @param {Date} date */
function victoriaYmd(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VICTORIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const part = (type) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

/** @param {Date} date */
function victoriaDayNumber(date) {
  const [y, m, d] = victoriaYmd(date).split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000)
}

/**
 * @param {string | number | Date} when
 * @param {Date | number} [now]
 * @returns {string}
 */
function formatRelativeTime(when, now = Date.now()) {
  const then = when instanceof Date ? when : new Date(when)
  const current = now instanceof Date ? now : new Date(now)
  if (Number.isNaN(then.getTime()) || Number.isNaN(current.getTime())) return ''

  const diffMs = current.getTime() - then.getTime()
  if (diffMs < 0) return 'Just now'

  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`

  const hours = Math.floor(mins / 60)
  const dayDiff = victoriaDayNumber(current) - victoriaDayNumber(then)

  if (dayDiff === 0) return `${hours} h ago`
  if (dayDiff === 1) return 'Yesterday'
  if (dayDiff < 7) return `${dayDiff} days ago`

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: VICTORIA,
    month: 'short',
    day: 'numeric',
  }).format(then)
}

module.exports = { formatRelativeTime, victoriaYmd }
