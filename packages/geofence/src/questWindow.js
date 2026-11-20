'use strict'

/**
 * Weekly drop window for Quest!.
 *
 * Product timezone is America/Vancouver. Instants are absolute:
 * `active_from` is inclusive and `active_until` is exclusive.
 * Null on either side means that side is open, so existing quests
 * with no schedule stay available.
 *
 * "New this week" is an elapsed 7 × 24 hours, not a calendar week.
 * "Ends Sunday" means `active_until` falls after now and at or before
 * the next Monday 00:00 Victoria, the same boundary the leaderboard uses.
 * Monday drop presets are 09:00 Victoria, ending the following Monday 00:00.
 */

const TZ = 'America/Vancouver'
const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const WEEKDAY_FROM_MON = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }

function partsInZone(date, timeZone = TZ) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  })
  const bag = {}
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== 'literal') bag[part.type] = part.value
  }
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour: Number(bag.hour),
    minute: Number(bag.minute),
    second: Number(bag.second),
    weekday: bag.weekday,
  }
}

function addCalendarDays(year, month, day, days) {
  const next = new Date(Date.UTC(year, month - 1, day + days))
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  }
}

/** Victoria wall-clock to a UTC Date. Iterates so DST gaps don't stick. */
function zonedToUtc(year, month, day, hour = 0, minute = 0, second = 0, timeZone = TZ) {
  const desired = Date.UTC(year, month - 1, day, hour, minute, second)
  let utc = desired
  for (let i = 0; i < 4; i++) {
    const got = partsInZone(new Date(utc), timeZone)
    const gotAsUtc = Date.UTC(got.year, got.month - 1, got.day, got.hour, got.minute, got.second)
    const diff = desired - gotAsUtc
    if (diff === 0) return new Date(utc)
    utc += diff
  }
  return new Date(utc)
}

function parseInstant(value) {
  if (value == null || value === '') return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function mondayOf(date) {
  const parts = partsInZone(date)
  const back = WEEKDAY_FROM_MON[parts.weekday] ?? 0
  return addCalendarDays(parts.year, parts.month, parts.day, -back)
}

/** Monday 00:00 America/Vancouver of the leaderboard week that contains `now`. */
function currentWeekStart(now) {
  const monday = mondayOf(now)
  return zonedToUtc(monday.year, monday.month, monday.day, 0, 0, 0)
}

/** The following Monday 00:00 America/Vancouver. Exclusive end of this week. */
function nextWeekStart(now) {
  const monday = mondayOf(now)
  const next = addCalendarDays(monday.year, monday.month, monday.day, 7)
  return zonedToUtc(next.year, next.month, next.day, 0, 0, 0)
}

/**
 * Next Monday 09:00 Victoria that is still in the future.
 * On Monday before 09:00 this is today; after 09:00 it is the following Monday.
 */
function nextMondayNine(now) {
  const monday = mondayOf(now)
  const todayNine = zonedToUtc(monday.year, monday.month, monday.day, 9, 0, 0)
  if (now.getTime() < todayNine.getTime()) return todayNine
  const next = addCalendarDays(monday.year, monday.month, monday.day, 7)
  return zonedToUtc(next.year, next.month, next.day, 9, 0, 0)
}

/** Calendar day (Victoria) of the upcoming 09:00 drop. `end` is the next midnight, exclusive. */
function dropDayWindow(now) {
  const at = nextMondayNine(now)
  const parts = partsInZone(at)
  const start = zonedToUtc(parts.year, parts.month, parts.day, 0, 0, 0)
  const next = addCalendarDays(parts.year, parts.month, parts.day, 1)
  const end = zonedToUtc(next.year, next.month, next.day, 0, 0, 0)
  return { start, end, at }
}

/** Exclusive end for a one-week drop: the Monday 00:00 after `activeFrom`'s week. */
function weekAfterDrop(activeFrom) {
  const instant = parseInstant(activeFrom) ?? new Date(activeFrom)
  return nextWeekStart(instant)
}

function isQuestActive(quest, now) {
  const from = parseInstant(quest.active_from)
  const until = parseInstant(quest.active_until)
  if (from && now.getTime() < from.getTime()) return false
  if (until && now.getTime() >= until.getTime()) return false
  return true
}

function isFutureQuest(quest, now) {
  const from = parseInstant(quest.active_from)
  return Boolean(from && now.getTime() < from.getTime())
}

function activationInstant(quest) {
  return parseInstant(quest.active_from) || parseInstant(quest.created_at)
}

function isNewThisWeek(quest, now) {
  if (!isQuestActive(quest, now)) return false
  const activated = activationInstant(quest)
  if (!activated || activated.getTime() > now.getTime()) return false
  return now.getTime() - activated.getTime() < WEEK_MS
}

function endsThisSunday(quest, now) {
  if (!isQuestActive(quest, now)) return false
  const until = parseInstant(quest.active_until)
  if (!until || until.getTime() <= now.getTime()) return false
  return until.getTime() <= nextWeekStart(now).getTime()
}

/**
 * Discovery lists hide anything that has not started.
 * `live` also hides quests whose window has ended.
 * `archive` keeps ended quests (a player's shelf) and still hides future drops.
 */
function includeInScope(quest, scope, now) {
  if (isFutureQuest(quest, now)) return false
  if (scope === 'archive') return true
  return isQuestActive(quest, now)
}

function formatVancouverInput(iso) {
  const date = parseInstant(iso)
  if (!date) return ''
  const parts = partsInZone(date)
  const pad = (n) => String(n).padStart(2, '0')
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`
}

function parseVancouverInput(value) {
  if (value == null || String(value).trim() === '') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(value).trim())
  if (!match) return null
  const date = zonedToUtc(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    0,
  )
  return date.toISOString()
}

function formatDropLabel(date) {
  const instant = parseInstant(date)
  if (!instant) return ''
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(instant)
}

function windowSummary(quest, now) {
  if (isFutureQuest(quest, now)) {
    const from = parseInstant(quest.active_from)
    return { kind: 'scheduled', label: from ? `Drops ${formatDropLabel(from)}` : 'Scheduled' }
  }
  if (!isQuestActive(quest, now)) return { kind: 'ended', label: 'Ended' }
  if (endsThisSunday(quest, now)) return { kind: 'ending', label: 'Ends Sunday' }
  if (isNewThisWeek(quest, now)) return { kind: 'new', label: 'New this week' }
  return { kind: 'live', label: 'Live' }
}

module.exports = {
  TZ,
  WEEK_MS,
  partsInZone,
  zonedToUtc,
  currentWeekStart,
  nextWeekStart,
  nextMondayNine,
  dropDayWindow,
  weekAfterDrop,
  isQuestActive,
  isFutureQuest,
  isNewThisWeek,
  endsThisSunday,
  includeInScope,
  formatVancouverInput,
  parseVancouverInput,
  formatDropLabel,
  windowSummary,
}
