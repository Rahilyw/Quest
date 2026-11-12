'use strict'

/**
 * Weekly recap rules (Spec 06 §2). Run: node apps/mobile/__tests__/recap.test.js
 *
 * Covers the client side: which week is selected (including DST weekends),
 * what is kept from the server payload, empty / no-photo states, and how a
 * share result is treated. The SQL in migration 040 is only checked as text
 * here. Nothing in this file runs against Postgres.
 */

const fs = require('fs')
const path = require('path')
const assert = require('assert')
const { partsInZone, zonedToUtc } = require(path.join(__dirname, '../../../packages/geofence/src/questWindow.js'))
const {
  recapWeekFor,
  weekRangeLabel,
  normalizeRecap,
  recapKind,
  shareOutcome,
  shouldTrackShare,
  RECAP_SHARE_EVENT,
} = require(path.join(__dirname, '../lib/recapWeek.js'))

let passed = 0
function test(name, fn) {
  fn()
  passed += 1
  console.log(`ok ${passed} ${name}`)
}

const weekAt = (iso) => recapWeekFor(partsInZone(new Date(iso)))
const read = (rel) => fs.readFileSync(path.join(__dirname, '..', '..', '..', rel), 'utf8')

// ─── Period policy ──────────────────────────────────────────────────────────

test('Sunday shows the current week, still in progress', () => {
  const week = weekAt('2026-11-15T20:00:00.000Z') // Sunday midday in Victoria
  assert.strictEqual(partsInZone(new Date('2026-11-15T20:00:00.000Z')).weekday, 'Sun')
  assert.deepStrictEqual(week, {
    weekStart: '2026-11-09',
    lastDay: '2026-11-15',
    nextWeekStart: '2026-11-16',
    policy: 'current',
    inProgress: true,
  })
})

test('Monday shows the week that just ended, not the empty new one', () => {
  const week = weekAt('2026-11-16T17:00:00.000Z') // Monday morning in Victoria
  assert.strictEqual(week.weekStart, '2026-11-09')
  assert.strictEqual(week.policy, 'previous')
  assert.strictEqual(week.inProgress, false)
})

test('Tuesday to Saturday keep showing last week', () => {
  for (const iso of [
    '2026-11-10T20:00:00.000Z',
    '2026-11-11T20:00:00.000Z',
    '2026-11-12T20:00:00.000Z',
    '2026-11-13T20:00:00.000Z',
    '2026-11-14T20:00:00.000Z',
  ]) {
    const week = weekAt(iso)
    assert.strictEqual(week.weekStart, '2026-11-02', iso)
    assert.strictEqual(week.lastDay, '2026-11-08', iso)
    assert.strictEqual(week.policy, 'previous', iso)
  }
})

test('every selected week starts on a Monday and spans seven calendar days', () => {
  const start = Date.UTC(2025, 0, 1, 12)
  for (let i = 0; i < 800; i++) {
    const week = weekAt(new Date(start + i * 86400000 + (i % 24) * 3600000).toISOString())
    const [y, m, d] = week.weekStart.split('-').map(Number)
    assert.strictEqual(new Date(Date.UTC(y, m - 1, d)).getUTCDay(), 1, week.weekStart)
    const [ny, nm, nd] = week.nextWeekStart.split('-').map(Number)
    assert.strictEqual((Date.UTC(ny, nm - 1, nd) - Date.UTC(y, m - 1, d)) / 86400000, 7)
  }
})

test('the week flips at Monday 00:00 Victoria, not at UTC midnight', () => {
  // Sunday 23:59:59 PST and one second later. Sunday 2025-01-12.
  const before = weekAt('2025-01-13T07:59:59.000Z')
  const after = weekAt('2025-01-13T08:00:00.000Z')
  assert.strictEqual(before.weekStart, '2025-01-06')
  assert.strictEqual(before.policy, 'current')
  assert.strictEqual(after.weekStart, '2025-01-06')
  assert.strictEqual(after.policy, 'previous')
  // Sunday 16:30 Victoria is already Monday in UTC. Still Sunday's week.
  assert.strictEqual(weekAt('2025-01-13T00:30:00.000Z').policy, 'current')
})

// ─── DST ────────────────────────────────────────────────────────────────────
// Historical transitions, so the result does not depend on future tz rules.

test('fall back: the Sunday of the change is 25 hours and stays in its week', () => {
  // 2025-11-02 clocks went back. Monday 00:00 PST is 08:00Z, not 07:00Z.
  const lateSunday = weekAt('2025-11-03T07:30:00.000Z') // 23:30 PST Sunday
  assert.strictEqual(lateSunday.policy, 'current')
  assert.strictEqual(lateSunday.weekStart, '2025-10-27')
  const monday = weekAt('2025-11-03T08:00:00.000Z')
  assert.strictEqual(monday.policy, 'previous')
  assert.strictEqual(monday.weekStart, '2025-10-27')

  const from = zonedToUtc(2025, 10, 27)
  const to = zonedToUtc(2025, 11, 3)
  assert.strictEqual((to.getTime() - from.getTime()) / 3600000, 169)
})

test('spring forward: the Sunday of the change is 23 hours and the week is 167', () => {
  // 2025-03-09 clocks went forward. Monday 00:00 PDT is 07:00Z, not 08:00Z.
  const lateSunday = weekAt('2025-03-10T06:30:00.000Z') // 23:30 PDT Sunday
  assert.strictEqual(lateSunday.policy, 'current')
  assert.strictEqual(lateSunday.weekStart, '2025-03-03')
  const monday = weekAt('2025-03-10T07:00:00.000Z')
  assert.strictEqual(monday.policy, 'previous')
  assert.strictEqual(monday.weekStart, '2025-03-03')

  const from = zonedToUtc(2025, 3, 3)
  const to = zonedToUtc(2025, 3, 10)
  assert.strictEqual((to.getTime() - from.getTime()) / 3600000, 167)
})

test('weeks across month and year ends', () => {
  assert.strictEqual(weekAt('2026-01-01T20:00:00.000Z').weekStart, '2025-12-22') // Thursday
  assert.strictEqual(weekAt('2026-01-04T20:00:00.000Z').weekStart, '2025-12-29') // Sunday
  assert.strictEqual(weekRangeLabel('2025-12-29'), 'Dec 29 to Jan 4')
  assert.strictEqual(weekRangeLabel('2026-11-02'), 'Nov 2 to Nov 8')
  assert.strictEqual(weekRangeLabel('not-a-date'), '')
  assert.strictEqual(weekRangeLabel('2026-02-30'), '')
})

test('an unknown weekday is an error, not a silent wrong week', () => {
  assert.throws(() => recapWeekFor({ year: 2026, month: 11, day: 11, weekday: 'Mi' }))
})

// ─── Payload selection ──────────────────────────────────────────────────────

const PAYLOAD = {
  week_start: '2026-11-02',
  starts_at: '2026-11-02T08:00:00+00:00',
  ends_at: '2026-11-09T08:00:00+00:00',
  in_progress: false,
  weekly_xp: 450,
  quests_completed: 3,
  rank: 4,
  ranked_players: 27,
  streak_weeks: 5,
  best_photo: {
    completion_id: 'c1',
    photo_url: 'https://example.supabase.co/storage/v1/object/public/proof-photos/u/p.jpg',
    quest_title: ' Run Dallas Road ',
    category: 'fitness',
  },
}

test('keeps rank and XP for the requested week', () => {
  const recap = normalizeRecap(PAYLOAD, '2026-11-02')
  assert.deepStrictEqual(recap, {
    weekStart: '2026-11-02',
    inProgress: false,
    weeklyXp: 450,
    questsCompleted: 3,
    rank: 4,
    rankedPlayers: 27,
    streakWeeks: 5,
    photo: {
      url: PAYLOAD.best_photo.photo_url,
      questTitle: 'Run Dallas Road',
      category: 'fitness',
    },
  })
})

test('a payload for a different week is rejected', () => {
  assert.strictEqual(normalizeRecap(PAYLOAD, '2026-11-09'), null)
  assert.strictEqual(normalizeRecap({ ...PAYLOAD, week_start: 'last week' }, null), null)
})

test('unusable payloads are rejected rather than shown as zeroes', () => {
  for (const raw of [null, undefined, 'x', 7, [], {}, { ...PAYLOAD, weekly_xp: null }, { ...PAYLOAD, weekly_xp: -5 }, { ...PAYLOAD, quests_completed: 'many' }]) {
    assert.strictEqual(normalizeRecap(raw, '2026-11-02'), null)
  }
})

test('rank needs XP on the board; a current-board rank is never invented', () => {
  const noXp = normalizeRecap({ ...PAYLOAD, weekly_xp: 0, rank: 1, ranked_players: 9 }, '2026-11-02')
  assert.strictEqual(noXp.rank, null)
  assert.strictEqual(noXp.rankedPlayers, null)
  const unranked = normalizeRecap({ ...PAYLOAD, rank: null }, '2026-11-02')
  assert.strictEqual(unranked.rank, null)
  assert.strictEqual(unranked.weeklyXp, 450)
  const badCount = normalizeRecap({ ...PAYLOAD, rank: 4, ranked_players: 2 }, '2026-11-02')
  assert.strictEqual(badCount.rank, 4)
  assert.strictEqual(badCount.rankedPlayers, null)
})

test('only whitelisted fields survive: no selfie, coordinates or other players', () => {
  const recap = normalizeRecap(
    {
      ...PAYLOAD,
      lat: 48.4,
      lng: -123.3,
      leaderboard: [{ username: 'someone_else', weekly_xp: 900 }],
      best_photo: { ...PAYLOAD.best_photo, selfie_url: 'u/selfie.jpg', lat: 48.4, lng: -123.3, user_id: 'x' },
    },
    '2026-11-02',
  )
  const text = JSON.stringify(recap)
  for (const banned of ['selfie', 'lat', 'lng', 'someone_else', 'leaderboard', 'user_id', 'completion_id']) {
    assert.strictEqual(text.includes(banned), false, banned)
  }
})

test('a photo is used only when it is an https url', () => {
  const variants = [null, '', 'u/123/selfie.jpg', 'http://insecure.example/p.jpg', 'file:///tmp/p.jpg', 42]
  for (const photo_url of variants) {
    const recap = normalizeRecap({ ...PAYLOAD, best_photo: { ...PAYLOAD.best_photo, photo_url } }, '2026-11-02')
    assert.strictEqual(recap.photo, null, String(photo_url))
  }
  assert.strictEqual(normalizeRecap({ ...PAYLOAD, best_photo: null }, '2026-11-02').photo, null)
})

test('streak can be unknown without breaking the recap', () => {
  assert.strictEqual(normalizeRecap({ ...PAYLOAD, streak_weeks: null }, '2026-11-02').streakWeeks, null)
  assert.strictEqual(normalizeRecap({ ...PAYLOAD, streak_weeks: 0 }, '2026-11-02').streakWeeks, 0)
})

// ─── States ─────────────────────────────────────────────────────────────────

test('empty week, no photo, and ready', () => {
  const full = normalizeRecap(PAYLOAD, '2026-11-02')
  const empty = normalizeRecap({ ...PAYLOAD, weekly_xp: 0, quests_completed: 0, rank: null, best_photo: null }, '2026-11-02')
  const noPhoto = normalizeRecap({ ...PAYLOAD, best_photo: null }, '2026-11-02')
  assert.strictEqual(recapKind(null), 'empty')
  assert.strictEqual(recapKind(empty), 'empty')
  assert.strictEqual(recapKind(noPhoto), 'no_photo')
  assert.strictEqual(recapKind(full), 'ready')
  assert.strictEqual(recapKind(full, true), 'ready')
  // The photo exists but would not load: numbers only, not an error.
  assert.strictEqual(recapKind(full, false), 'no_photo')
})

// ─── Share result ───────────────────────────────────────────────────────────

test('a dismissed share sheet is not a share', () => {
  assert.strictEqual(shareOutcome({ action: 'dismissedAction' }), 'dismissed')
  assert.strictEqual(shouldTrackShare('dismissed'), false)
})

test('a confirmed share, or a platform that cannot tell, counts once', () => {
  assert.strictEqual(shareOutcome({ action: 'sharedAction', activityType: 'x' }), 'shared')
  assert.strictEqual(shareOutcome(undefined), 'unknown')
  assert.strictEqual(shareOutcome({}), 'unknown')
  assert.strictEqual(shouldTrackShare('shared'), true)
  assert.strictEqual(shouldTrackShare('unknown'), true)
})

test('the analytics payload is the surface and nothing else', () => {
  assert.deepStrictEqual({ ...RECAP_SHARE_EVENT }, { surface: 'recap' })
  assert.strictEqual(Object.isFrozen(RECAP_SHARE_EVENT), true)
})

// ─── Source guards ──────────────────────────────────────────────────────────

test('the recap screen tracks one event and only on the share path', () => {
  const screen = read('apps/mobile/app/recap.tsx')
  const calls = screen.match(/track\([^)]*\)/g) || []
  assert.deepStrictEqual(calls, ["track('share_completed', { ...RECAP_SHARE_EVENT })"])
  assert.strictEqual(screen.indexOf('handleShare') < screen.indexOf("track('share_completed'"), true)
  // Capture and share happen in the tap handler, never on mount.
  assert.strictEqual(/useEffect\([^]*captureRef/.test(screen), false)
})

test('the card and hook never read a selfie, coordinates or another player', () => {
  for (const rel of [
    'apps/mobile/components/RecapShareCard.tsx',
    'apps/mobile/hooks/useWeekRecap.ts',
    'apps/mobile/app/recap.tsx',
  ]) {
    const code = read(rel).replace(/\/\*[^]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    for (const banned of ['selfie', 'signSelfiePath', '.lat', '.lng', "from('leaderboard')", "from('completions')", "from('profiles')"]) {
      assert.strictEqual(code.includes(banned), false, `${rel}: ${banned}`)
    }
  }
})

test('the per-completion share flow is untouched by the recap', () => {
  const modal = read('apps/mobile/components/ShareStoryModal.tsx')
  assert.strictEqual(modal.includes("track('share_completed', { surface: 'completion' })"), true)
  assert.strictEqual(/recap/i.test(modal), false)
  assert.strictEqual(/recap/i.test(read('apps/mobile/components/ShareCompletionCard.tsx')), false)
})

test('migration 040: caller-only, Victoria week, no private columns (text check only)', () => {
  const sql = read('supabase/migrations/040_week_recap.sql')
  const body = sql.replace(/^\s*--.*$/gm, '')
  assert.strictEqual(/uid uuid := auth\.uid\(\)/.test(body), true)
  assert.strictEqual(/REVOKE ALL ON FUNCTION own_week_recap\(date\) FROM PUBLIC, anon;/.test(body), true)
  assert.strictEqual(/GRANT EXECUTE ON FUNCTION own_week_recap\(date\) TO authenticated;/.test(body), true)
  assert.strictEqual(/SET search_path = public, pg_temp/.test(body), true)
  assert.strictEqual((body.match(/AT TIME ZONE 'America\/Vancouver'/g) || []).length >= 3, true)
  assert.strictEqual(/p_week_start \+ 7\)::timestamp AT TIME ZONE/.test(body), true)
  // Half-open interval on every completions filter.
  assert.strictEqual((body.match(/c\.reviewed_at >= week_from/g) || []).length, 3)
  assert.strictEqual((body.match(/c\.reviewed_at <\s+week_to/g) || []).length, 3)
  // The photo comes from the caller's own visible rows.
  assert.strictEqual(/WHERE c\.user_id = uid\s+AND c\.status = 'approved'\s+AND c\.hidden_pending_review = false/.test(body), true)
  for (const banned of ['selfie_url', 'c.lat', 'c.lng', 'gps_accuracy', 'redemption_code', 'push_token', 'username', 'avatar_url']) {
    assert.strictEqual(body.includes(banned), false, banned)
  }
  // It does not read the current-week leaderboard view.
  assert.strictEqual(/\bleaderboard\b/.test(body), false)
})

console.log(`\n${passed} recap tests passed`)
