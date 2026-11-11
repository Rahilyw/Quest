'use strict'

/**
 * Weekly recap rules (Spec 06 §2). Plain JS with no imports so
 * __tests__/recap.test.js runs in Node without an install.
 *
 * Period policy
 *   A recap week is Monday 00:00 to the following Monday 00:00 in
 *   America/Vancouver, the same week the leaderboard uses.
 *   - Sunday (Victoria): the current week, still in progress. This is the
 *     "Sunday recap": the board settles at midnight.
 *   - Monday to Saturday: the week that ended last Sunday night. Final.
 *   So Monday morning shows the week that just closed, never an empty new one.
 *
 * The caller turns "now" into Victoria calendar parts with `partsInZone` from
 * @quest/geofence (tz database, DST-aware) and passes them in. This file only
 * does calendar arithmetic on dates. The server (migration 040) turns the
 * Monday date into exact instants.
 */

const WEEKDAY_FROM_MON = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const NBSP = ' '

function pad(n) {
  return String(n).padStart(2, '0')
}

function isoDate(year, month, day) {
  const d = new Date(Date.UTC(year, month - 1, day))
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

function parseIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ''))
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const d = new Date(Date.UTC(year, month - 1, day))
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null
  return { year, month, day }
}

function addDays(iso, days) {
  const parts = parseIsoDate(iso)
  if (!parts) return null
  return isoDate(parts.year, parts.month, parts.day + days)
}

/**
 * Which week the recap shows, from Victoria wall-clock parts.
 * @param {{ year: number, month: number, day: number, weekday: string }} parts
 * @returns {{ weekStart: string, lastDay: string, nextWeekStart: string, policy: 'current' | 'previous', inProgress: boolean }}
 */
function recapWeekFor(parts) {
  const sinceMonday = WEEKDAY_FROM_MON[parts.weekday]
  if (sinceMonday == null) throw new Error(`recapWeekFor: unknown weekday "${parts.weekday}"`)
  const thisMonday = isoDate(parts.year, parts.month, parts.day - sinceMonday)
  const isSunday = sinceMonday === 6
  const weekStart = isSunday ? thisMonday : addDays(thisMonday, -7)
  return {
    weekStart,
    lastDay: addDays(weekStart, 6),
    nextWeekStart: addDays(weekStart, 7),
    policy: isSunday ? 'current' : 'previous',
    inProgress: isSunday,
  }
}

/** "Nov 2 to Nov 8" for a Monday date. Empty string for a bad date. */
function weekRangeLabel(weekStart) {
  const start = parseIsoDate(weekStart)
  const end = parseIsoDate(addDays(weekStart, 6))
  if (!start || !end) return ''
  const label = (d) => `${MONTHS[d.month - 1]}${NBSP}${d.day}`
  return `${label(start)} to ${label(end)}`
}

function nonNegativeInt(value) {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
}

function httpsUrl(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return /^https:\/\/\S+$/i.test(trimmed) ? trimmed : null
}

/**
 * Validate the `own_week_recap` payload for the week we asked for.
 * Returns null when the payload is unusable or is for a different week, so a
 * stale or mismatched response is shown as an error and never as someone's week.
 *
 * Only whitelisted fields are copied. Anything else the server might send
 * (it sends nothing else today) never reaches the card.
 */
function normalizeRecap(raw, expectedWeekStart) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  if (!parseIsoDate(raw.week_start)) return null
  if (expectedWeekStart != null && raw.week_start !== expectedWeekStart) return null

  const weeklyXp = nonNegativeInt(raw.weekly_xp)
  const quests = nonNegativeInt(raw.quests_completed)
  if (weeklyXp == null || quests == null) return null

  const rankRaw = raw.rank == null ? null : nonNegativeInt(raw.rank)
  // A rank only means something with XP on the board.
  const rank = rankRaw != null && rankRaw >= 1 && weeklyXp > 0 ? rankRaw : null
  const playersRaw = nonNegativeInt(raw.ranked_players)
  const rankedPlayers = rank != null && playersRaw != null && playersRaw >= rank ? playersRaw : null
  const streakRaw = raw.streak_weeks == null ? null : nonNegativeInt(raw.streak_weeks)

  let photo = null
  const p = raw.best_photo
  if (p && typeof p === 'object' && !Array.isArray(p)) {
    const url = httpsUrl(p.photo_url)
    if (url) {
      photo = {
        url,
        questTitle: typeof p.quest_title === 'string' ? p.quest_title.trim() : '',
        category: typeof p.category === 'string' ? p.category : null,
      }
    }
  }

  return {
    weekStart: raw.week_start,
    inProgress: raw.in_progress === true,
    weeklyXp,
    questsCompleted: quests,
    rank,
    rankedPlayers,
    streakWeeks: streakRaw,
    photo,
  }
}

/**
 * What the screen shows for a loaded recap.
 * 'empty'    nothing verified that week: no card, nothing to share.
 * 'no_photo' numbers only (photo missing, hidden by moderation, or failed to load).
 * 'ready'    numbers and the player's own photo.
 */
function recapKind(recap, photoUsable) {
  if (!recap || recap.questsCompleted <= 0) return 'empty'
  if (!recap.photo || photoUsable === false) return 'no_photo'
  return 'ready'
}

/**
 * Outcome of handing the image to the OS.
 * iOS `Share.share` reports sharedAction / dismissedAction. Android share
 * intents report nothing, so a sheet that opened without error is 'unknown'.
 */
function shareOutcome(result) {
  const action = result && typeof result === 'object' ? result.action : null
  if (action === 'dismissedAction') return 'dismissed'
  if (action === 'sharedAction') return 'shared'
  return 'unknown'
}

/** `share_completed` is sent unless the player visibly backed out. */
function shouldTrackShare(outcome) {
  return outcome === 'shared' || outcome === 'unknown'
}

/** The only analytics payload the recap sends. No image, username or place. */
const RECAP_SHARE_EVENT = Object.freeze({ surface: 'recap' })

module.exports = {
  recapWeekFor,
  weekRangeLabel,
  addDays,
  normalizeRecap,
  recapKind,
  shareOutcome,
  shouldTrackShare,
  RECAP_SHARE_EVENT,
}
