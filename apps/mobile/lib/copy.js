'use strict'

/**
 * Copy helpers for the voice in docs/design/BRAND.md §9: sentence case, proper plurals,
 * no "·"-joined meta strings. Plain JS so __tests__/logic.test.js can run it in Node.
 */

const NBSP = ' '

/** "1 day", "3 days". Uses a non-breaking space between the number and the word. */
function plural(count, singular, pluralForm) {
  const word = count === 1 ? singular : pluralForm || singular + 's'
  return `${count}${NBSP}${word}`
}

/** Level titles, sentence case. */
function levelTitle(level) {
  if (level >= 10) return 'Legend'
  if (level >= 7) return 'Explorer'
  if (level >= 4) return 'Seeker'
  if (level >= 2) return 'Nomad'
  return 'Rookie'
}

/** "Rookie, level 1" */
function levelLabel(level) {
  return `${levelTitle(level)}, level${NBSP}${level}`
}

/** "3 days left this week" / "1 day left this week" / "Last day this week" */
function daysLeftLabel(daysLeft) {
  if (daysLeft <= 0) return 'Last day this week'
  return `${plural(daysLeft, 'day')} left this week`
}

/** "150 XP" with a non-breaking space; thousands separated. */
function xpLabel(xp) {
  return `${Number(xp).toLocaleString('en-CA')}${NBSP}XP`
}

module.exports = { NBSP, plural, levelTitle, levelLabel, daysLeftLabel, xpLabel }
