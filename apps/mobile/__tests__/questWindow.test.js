'use strict'

/**
 * Weekly-drop window rules. Run: node apps/mobile/__tests__/questWindow.test.js
 */

const path = require('path')
const assert = require('assert')
const {
  partsInZone,
  nextMondayNine,
  dropDayWindow,
  weekAfterDrop,
  isQuestActive,
  isNewThisWeek,
  endsThisSunday,
  includeInScope,
  formatVancouverInput,
  parseVancouverInput,
  currentWeekStart,
  nextWeekStart,
} = require(path.join(__dirname, '../../../packages/geofence/src/questWindow.js'))
const { validateSuggestion } = require(path.join(__dirname, '../lib/suggestionForm.js'))

let passed = 0
function test(name, fn) {
  fn()
  passed += 1
  console.log(`ok ${passed} ${name}`)
}

test('next Monday 09:00 is today before the drop and next week after it', () => {
  const early = new Date('2026-11-09T16:00:00.000Z') // Monday 08:00 PST
  const earlyDrop = nextMondayNine(early)
  const earlyParts = partsInZone(earlyDrop)
  assert.strictEqual(earlyParts.weekday, 'Mon')
  assert.strictEqual(earlyParts.day, 9)
  assert.strictEqual(earlyParts.hour, 9)
  assert.strictEqual(earlyParts.minute, 0)

  const late = new Date('2026-11-09T18:00:00.000Z') // Monday 10:00 PST
  const lateParts = partsInZone(nextMondayNine(late))
  assert.strictEqual(lateParts.day, 16)
  assert.strictEqual(lateParts.hour, 9)
})

test('drop day window is that Monday in Victoria, and the preset ends the next Monday midnight', () => {
  const wed = new Date('2026-11-11T18:00:00.000Z')
  const window = dropDayWindow(wed)
  assert.strictEqual(partsInZone(window.at).day, 16)
  assert.strictEqual(partsInZone(window.start).hour, 0)
  assert.strictEqual(window.start.getTime() < window.at.getTime(), true)
  assert.strictEqual(window.at.getTime() < window.end.getTime(), true)
  assert.strictEqual(partsInZone(window.end).day, 17)

  const until = weekAfterDrop(window.at)
  assert.strictEqual(partsInZone(until).weekday, 'Mon')
  assert.strictEqual(partsInZone(until).hour, 0)
  assert.strictEqual(partsInZone(until).day, 23)
})

test('week boundary stays on Victoria midnights across the spring clock change', () => {
  const wednesday = new Date('2026-03-04T18:00:00.000Z')
  const start = currentWeekStart(wednesday)
  const next = nextWeekStart(wednesday)
  assert.strictEqual(start.toISOString(), '2026-03-02T08:00:00.000Z') // Monday 00:00 PST
  assert.strictEqual(next.toISOString(), '2026-03-09T07:00:00.000Z') // Monday 00:00 PDT
})

test('active_from is inclusive and active_until is exclusive', () => {
  const from = '2026-11-16T17:00:00.000Z'
  const until = '2026-11-23T08:00:00.000Z'
  const quest = { active_from: from, active_until: until, created_at: from }
  assert.strictEqual(isQuestActive(quest, new Date(from)), true)
  assert.strictEqual(isQuestActive(quest, new Date(new Date(from).getTime() - 1)), false)
  assert.strictEqual(isQuestActive(quest, new Date(new Date(until).getTime() - 1)), true)
  assert.strictEqual(isQuestActive(quest, new Date(until)), false)
  assert.strictEqual(isQuestActive({ active_from: null, active_until: null }, new Date(from)), true)
})

test('new this week uses activation time and hides future or stale quests', () => {
  const now = new Date('2026-11-11T18:00:00.000Z')
  const fresh = {
    active_from: '2026-11-09T17:00:00.000Z',
    active_until: null,
    created_at: '2026-01-01T00:00:00.000Z',
  }
  const byCreated = { active_from: null, active_until: null, created_at: '2026-11-10T18:00:00.000Z' }
  const old = { active_from: null, active_until: null, created_at: '2026-11-01T18:00:00.000Z' }
  const future = { active_from: '2026-11-16T17:00:00.000Z', active_until: null, created_at: now.toISOString() }
  assert.strictEqual(isNewThisWeek(fresh, now), true)
  assert.strictEqual(isNewThisWeek(byCreated, now), true)
  assert.strictEqual(isNewThisWeek(old, now), false)
  assert.strictEqual(isNewThisWeek(future, now), false)
})

test('ends Sunday only through the coming Monday midnight', () => {
  const now = new Date('2026-11-11T18:00:00.000Z') // Wednesday
  const sundayNight = {
    active_from: '2026-11-09T17:00:00.000Z',
    active_until: '2026-11-16T08:00:00.000Z', // Monday 00:00 PST
    created_at: '2026-11-09T17:00:00.000Z',
  }
  const later = { ...sundayNight, active_until: '2026-11-23T08:00:00.000Z' }
  const alreadyOver = { ...sundayNight, active_until: '2026-11-11T08:00:00.000Z' }
  assert.strictEqual(endsThisSunday(sundayNight, now), true)
  assert.strictEqual(endsThisSunday(later, now), false)
  assert.strictEqual(endsThisSunday(alreadyOver, now), false)

  const dstNow = new Date('2026-03-04T18:00:00.000Z')
  const justAfterMonday = {
    active_from: '2026-03-02T16:00:00.000Z',
    active_until: '2026-03-09T07:30:00.000Z',
    created_at: '2026-03-02T16:00:00.000Z',
  }
  const lastMinuteSunday = { ...justAfterMonday, active_until: '2026-03-09T06:59:00.000Z' }
  assert.strictEqual(endsThisSunday(justAfterMonday, dstNow), false)
  assert.strictEqual(endsThisSunday(lastMinuteSunday, dstNow), true)
})

test('discovery never includes a future quest; archive keeps ended ones', () => {
  const now = new Date('2026-11-11T18:00:00.000Z')
  const future = { active_from: '2026-11-16T17:00:00.000Z', active_until: null }
  const ended = { active_from: '2026-11-01T17:00:00.000Z', active_until: '2026-11-10T08:00:00.000Z' }
  const live = { active_from: null, active_until: null }
  assert.strictEqual(includeInScope(future, 'live', now), false)
  assert.strictEqual(includeInScope(future, 'archive', now), false)
  assert.strictEqual(includeInScope(ended, 'live', now), false)
  assert.strictEqual(includeInScope(ended, 'archive', now), true)
  assert.strictEqual(includeInScope(live, 'live', now), true)
})

test('Victoria datetime inputs round-trip and blank means open', () => {
  const iso = parseVancouverInput('2026-11-16T09:00')
  assert.ok(iso)
  assert.strictEqual(partsInZone(new Date(iso)).hour, 9)
  assert.strictEqual(partsInZone(new Date(iso)).day, 16)
  assert.strictEqual(formatVancouverInput(iso), '2026-11-16T09:00')
  assert.strictEqual(parseVancouverInput(''), null)
  assert.strictEqual(parseVancouverInput('not-a-date'), null)
})

test('suggestion text is bounded and a pin needs both coordinates', () => {
  const ok = validateSuggestion({
    title: '  Inner Harbour light  ',
    description: 'Walk the causeway after dark and find the lights.',
    category: 'nature',
    lat: 48.42,
    lng: -123.37,
  })
  assert.strictEqual(ok.ok, true)
  assert.strictEqual(ok.title, 'Inner Harbour light')

  const missing = validateSuggestion({
    title: 'Hi',
    description: 'Too short',
    category: 'nope',
    lat: 48.4,
    lng: null,
  })
  assert.strictEqual(missing.ok, false)
  assert.ok(missing.errors.title)
  assert.ok(missing.errors.description)
  assert.ok(missing.errors.category)
  assert.ok(missing.errors.pin)

  const noPin = validateSuggestion({
    title: 'Bastion bells',
    description: 'Count the bells at noon from the square.',
    category: 'community',
    lat: null,
    lng: null,
  })
  assert.strictEqual(noPin.ok, true)
  assert.strictEqual(noPin.lat, null)
})

console.log(`\n${passed} quest window tests passed`)
