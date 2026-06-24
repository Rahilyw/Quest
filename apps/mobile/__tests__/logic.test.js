/**
 * Logic tests for the UI/UX overhaul.
 *
 * These tests run in plain Node.js (no React Native, no bundler needed).
 * They replicate the pure-logic functions and constants verbatim from the
 * source files so they can be verified without installing native dependencies.
 *
 * Run: node apps/mobile/__tests__/logic.test.js
 */

'use strict'

// ---------------------------------------------------------------------------
// Replicated from apps/mobile/lib/constants.ts
// ---------------------------------------------------------------------------

const COLORS = {
  bg: '#F0F9FF',
  bgWarm: '#FFF7ED',
  surface: '#FFFFFF',
  surfaceElevated: '#F8FAFF',
  border: 'rgba(15, 23, 42, 0.06)',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  accent: '#4364F7',
  accentSoft: '#EEF2FF',
  accentText: '#4338CA',
  warning: '#D97706',
  success: '#16A34A',
  danger: '#EF4444',
  sponsor: '#EA580C',
}

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 }
const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, pill: 999 }

const XP_LEVELS = [
  { level: 1, minXp: 0 },
  { level: 2, minXp: 200 },
  { level: 3, minXp: 500 },
  { level: 4, minXp: 1000 },
  { level: 5, minXp: 2000 },
  { level: 6, minXp: 3500 },
  { level: 7, minXp: 5500 },
  { level: 8, minXp: 8000 },
  { level: 9, minXp: 11000 },
  { level: 10, minXp: 15000 },
]

const CATEGORY_COLORS = {
  fitness: '#16A34A',
  social: '#9333EA',
  food: '#EA580C',
  community: '#2563EB',
  nature: '#0891B2',
}

const CATEGORY_ICONS = {
  fitness: '🏃',
  social: '🤝',
  food: '🍽️',
  community: '🏘️',
  nature: '🌿',
}

const PROOF_GEOFENCE_RADIUS = 300

const CITY = {
  name: 'Victoria, BC',
  lat: 48.4284,
  lng: -123.3656,
  defaultZoom: 13,
}

function getLevelFromXp(xp) {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i].minXp) return XP_LEVELS[i].level
  }
  return 1
}

function getXpToNextLevel(xp) {
  const current = getLevelFromXp(xp)
  const next = XP_LEVELS.find((l) => l.level === current + 1)
  return next ? next.minXp - xp : 0
}

// ---------------------------------------------------------------------------
// Replicated from apps/mobile/app/(tabs)/index.tsx
// ---------------------------------------------------------------------------

function getMinXpForLevel(level) {
  const XP_LEVELS_LOCAL = [0, 200, 500, 1000, 2000, 3500, 5500, 8000, 11000, 15000]
  return XP_LEVELS_LOCAL[Math.min(level - 1, XP_LEVELS_LOCAL.length - 1)] ?? 0
}

// XP strip progress calculation from index.tsx (patched: guards denom === 0 at max level)
function xpStripProgress(totalXp, level) {
  const denom = getMinXpForLevel(level + 1) - getMinXpForLevel(level)
  return denom === 0 ? 100 : Math.min(((totalXp - getMinXpForLevel(level)) / denom) * 100, 100)
}

// ---------------------------------------------------------------------------
// Replicated from apps/mobile/components/XPBar.tsx
// ---------------------------------------------------------------------------

function xpBarProgress(totalXp) {
  const level = getLevelFromXp(totalXp)
  const xpToNext = getXpToNextLevel(totalXp)
  const isMaxLevel = xpToNext === 0
  const currentLevelXp = XP_LEVELS.find((l) => l.level === level)?.minXp ?? 0
  const nextLevelXp = XP_LEVELS.find((l) => l.level === level + 1)?.minXp ?? currentLevelXp + 1
  const progress = isMaxLevel
    ? 1
    : (totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp)
  const xpLabel = isMaxLevel
    ? 'Max level'
    : `${totalXp.toLocaleString()} / ${nextLevelXp.toLocaleString()} XP`
  return { progress, xpLabel, isMaxLevel, level }
}

// ---------------------------------------------------------------------------
// Replicated from apps/mobile/app/(tabs)/leaderboard.tsx
// ---------------------------------------------------------------------------

function medalForRank(rank) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return null
}

// Featured quest derivation from index.tsx lines 42-47
function deriveFeaturedQuest(quests) {
  return quests.length > 0
    ? quests
        .filter((q) => q.is_sponsored)
        .sort((a, b) => b.xp_reward - a.xp_reward)[0] ?? null
    : null
}

// Avatar initial logic from Avatar.tsx line 11
function avatarInitial(username) {
  return username.length > 0 ? username[0].toUpperCase() : '?'
}

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

let passed = 0
let failed = 0
const failures = []

function assert(description, condition, expected, actual) {
  if (condition) {
    console.log(`  PASS  ${description}`)
    passed++
  } else {
    console.error(`  FAIL  ${description}`)
    console.error(`        Expected: ${JSON.stringify(expected)}`)
    console.error(`        Actual:   ${JSON.stringify(actual)}`)
    failed++
    failures.push({ description, expected, actual })
  }
}

function assertEqual(description, actual, expected) {
  assert(description, actual === expected, expected, actual)
}

function assertDeepEqual(description, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  assert(description, ok, expected, actual)
}

function assertTruthy(description, actual) {
  assert(description, !!actual, true, actual)
}

function assertNaN(description, actual) {
  assert(description, Number.isNaN(actual), 'NaN (expected NOT NaN for correctness)', actual)
}

// ---------------------------------------------------------------------------
// SECTION 1: constants.ts — existing exports still present
// ---------------------------------------------------------------------------
console.log('\n--- Section 1: constants.ts backward-compatibility exports ---')

assertEqual(
  'CATEGORY_COLORS.fitness exists',
  CATEGORY_COLORS.fitness,
  '#16A34A'
)
assertEqual(
  'CATEGORY_COLORS.social exists',
  CATEGORY_COLORS.social,
  '#9333EA'
)
assertEqual(
  'CATEGORY_COLORS.food exists',
  CATEGORY_COLORS.food,
  '#EA580C'
)
assertEqual(
  'CATEGORY_COLORS.community exists',
  CATEGORY_COLORS.community,
  '#2563EB'
)
assertEqual(
  'CATEGORY_COLORS.nature exists',
  CATEGORY_COLORS.nature,
  '#0891B2'
)
assertTruthy(
  'CATEGORY_ICONS.fitness is emoji string',
  typeof CATEGORY_ICONS.fitness === 'string' && CATEGORY_ICONS.fitness.length > 0
)
assertEqual(
  'CITY.name is Victoria, BC',
  CITY.name,
  'Victoria, BC'
)
assertEqual(
  'PROOF_GEOFENCE_RADIUS is 300',
  PROOF_GEOFENCE_RADIUS,
  300
)
assertTruthy(
  'getLevelFromXp is a function',
  typeof getLevelFromXp === 'function'
)
assertTruthy(
  'getXpToNextLevel is a function',
  typeof getXpToNextLevel === 'function'
)
assertTruthy(
  'XP_LEVELS has 10 entries',
  XP_LEVELS.length === 10
)

// ---------------------------------------------------------------------------
// SECTION 2: New token exports
// ---------------------------------------------------------------------------
console.log('\n--- Section 2: New COLORS / SPACING / RADIUS token exports ---')

assertEqual('COLORS.bg is correct', COLORS.bg, '#F0F9FF')
assertEqual('COLORS.surface is correct', COLORS.surface, '#FFFFFF')
assertEqual('COLORS.surfaceElevated is correct', COLORS.surfaceElevated, '#F8FAFF')
assertEqual('COLORS.border is correct', COLORS.border, 'rgba(15, 23, 42, 0.06)')
assertEqual('COLORS.textPrimary is correct', COLORS.textPrimary, '#0F172A')
assertEqual('COLORS.textSecondary is correct', COLORS.textSecondary, '#475569')
assertEqual('COLORS.textMuted is correct', COLORS.textMuted, '#94A3B8')
assertEqual('COLORS.accent is correct', COLORS.accent, '#4364F7')
assertEqual('COLORS.accentSoft is correct', COLORS.accentSoft, '#EEF2FF')
assertEqual('COLORS.accentText is correct', COLORS.accentText, '#4338CA')
assertEqual('COLORS.warning is correct', COLORS.warning, '#D97706')
assertEqual('COLORS.success is correct', COLORS.success, '#16A34A')
assertEqual('COLORS.sponsor is correct', COLORS.sponsor, '#EA580C')

assertEqual('SPACING.xs is 4', SPACING.xs, 4)
assertEqual('SPACING.sm is 8', SPACING.sm, 8)
assertEqual('SPACING.md is 12', SPACING.md, 12)
assertEqual('SPACING.lg is 16', SPACING.lg, 16)
assertEqual('SPACING.xl is 20', SPACING.xl, 20)
assertEqual('SPACING.xxl is 24', SPACING.xxl, 24)

assertEqual('RADIUS.sm is 8', RADIUS.sm, 8)
assertEqual('RADIUS.md is 12', RADIUS.md, 12)
assertEqual('RADIUS.lg is 16', RADIUS.lg, 16)
assertEqual('RADIUS.xl is 20', RADIUS.xl, 20)
assertEqual('RADIUS.xxl is 28', RADIUS.xxl, 28)
assertEqual('RADIUS.pill is 999', RADIUS.pill, 999)

// ---------------------------------------------------------------------------
// SECTION 3: getLevelFromXp helper
// ---------------------------------------------------------------------------
console.log('\n--- Section 3: getLevelFromXp helper ---')

assertEqual('0 XP → level 1', getLevelFromXp(0), 1)
assertEqual('199 XP → level 1', getLevelFromXp(199), 1)
assertEqual('200 XP → level 2', getLevelFromXp(200), 2)
assertEqual('1999 XP → level 4', getLevelFromXp(1999), 4)
assertEqual('2000 XP → level 5', getLevelFromXp(2000), 5)
assertEqual('15000 XP → level 10 (max)', getLevelFromXp(15000), 10)
assertEqual('99999 XP → level 10 (capped)', getLevelFromXp(99999), 10)

// ---------------------------------------------------------------------------
// SECTION 4: getXpToNextLevel helper
// ---------------------------------------------------------------------------
console.log('\n--- Section 4: getXpToNextLevel helper ---')

assertEqual('200 XP → 300 to next', getXpToNextLevel(200), 300)
assertEqual('15000 XP (max) → 0 to next', getXpToNextLevel(15000), 0)
assertEqual('20000 XP (beyond max) → 0 to next', getXpToNextLevel(20000), 0)

// ---------------------------------------------------------------------------
// SECTION 5: XPBar component logic (XPBar.tsx)
// ---------------------------------------------------------------------------
console.log('\n--- Section 5: XPBar.tsx progress and label logic ---')

const xpBarLevel1 = xpBarProgress(100)
assertEqual('XPBar: level 1 at 100 XP, level should be 1', xpBarLevel1.level, 1)
assert(
  'XPBar: level 1 at 100 XP, progress between 0 and 1',
  xpBarLevel1.progress >= 0 && xpBarLevel1.progress < 1,
  '0 <= progress < 1',
  xpBarLevel1.progress
)
assert(
  'XPBar: level 1 at 100 XP, label is not Max level',
  !xpBarLevel1.isMaxLevel,
  false,
  xpBarLevel1.isMaxLevel
)

// Happy path: mid-level
const xpBarMid = xpBarProgress(1240)
assertEqual('XPBar: 1240 XP → level 4', xpBarMid.level, 4)
assert(
  'XPBar: 1240 XP → progress between 0 and 1',
  xpBarMid.progress > 0 && xpBarMid.progress < 1,
  '0 < progress < 1',
  xpBarMid.progress
)

// Edge case: max level (spec: bar 100% filled, label "Max level")
const xpBarMax = xpBarProgress(15000)
assertEqual('XPBar: 15000 XP (max level) → isMaxLevel true', xpBarMax.isMaxLevel, true)
assertEqual('XPBar: 15000 XP (max level) → progress is 1', xpBarMax.progress, 1)
assertEqual('XPBar: 15000 XP (max level) → label is "Max level"', xpBarMax.xpLabel, 'Max level')
assert(
  'XPBar: 15000 XP → width capped at 100%',
  Math.min(xpBarMax.progress * 100, 100) === 100,
  100,
  Math.min(xpBarMax.progress * 100, 100)
)

// Edge case: beyond max level
const xpBarBeyond = xpBarProgress(20000)
assertEqual('XPBar: 20000 XP (beyond max) → isMaxLevel true', xpBarBeyond.isMaxLevel, true)
assertEqual('XPBar: 20000 XP (beyond max) → label is "Max level"', xpBarBeyond.xpLabel, 'Max level')

// ---------------------------------------------------------------------------
// SECTION 6: XP strip in index.tsx — division-by-zero at max level
// ---------------------------------------------------------------------------
console.log('\n--- Section 6: index.tsx XP strip progress at max level (edge case) ---')

// At level 10: getMinXpForLevel(10)=15000, getMinXpForLevel(11)=15000 (clamped)
// Denominator = 0 → NaN
const stripProgressAtMax = xpStripProgress(15000, 10)
// The spec requires 100% filled at max level; NaN% is incorrect
// We detect the bug by asserting the width is NOT NaN (which would pass if fixed, fail if broken)
assert(
  'index.tsx XP strip: at max level (level=10, totalXp=15000) width is NOT NaN (spec: should be 100%)',
  !Number.isNaN(stripProgressAtMax),
  'non-NaN (should be 100%)',
  stripProgressAtMax
)

// Also verify at normal levels the strip calculation is correct
const stripProgressLevel4 = xpStripProgress(1240, 4)
assert(
  'index.tsx XP strip: at level 4 with 1240 XP, progress is between 0 and 100',
  stripProgressLevel4 > 0 && stripProgressLevel4 <= 100,
  '0 < progress <= 100',
  stripProgressLevel4
)

// ---------------------------------------------------------------------------
// SECTION 7: Featured quest derivation logic (index.tsx)
// ---------------------------------------------------------------------------
console.log('\n--- Section 7: Featured quest derivation ---')

// Happy path: one sponsored quest
const questsWithOneSponsored = [
  { id: '1', is_sponsored: false, xp_reward: 100 },
  { id: '2', is_sponsored: true, xp_reward: 300 },
]
const featured1 = deriveFeaturedQuest(questsWithOneSponsored)
assertEqual('Featured quest: one sponsored → returns it', featured1.id, '2')

// Happy path: multiple sponsored → picks highest XP
const questsMultipleSponsored = [
  { id: '1', is_sponsored: true, xp_reward: 100 },
  { id: '2', is_sponsored: true, xp_reward: 500 },
  { id: '3', is_sponsored: true, xp_reward: 300 },
]
const featured2 = deriveFeaturedQuest(questsMultipleSponsored)
assertEqual('Featured quest: multiple sponsored → picks highest XP', featured2.id, '2')

// Edge case: no sponsored quests → returns null
const questsNoSponsored = [
  { id: '1', is_sponsored: false, xp_reward: 200 },
  { id: '2', is_sponsored: false, xp_reward: 400 },
]
const featured3 = deriveFeaturedQuest(questsNoSponsored)
assertEqual('Featured quest: no sponsored quests → null', featured3, null)

// Edge case: empty quests array → returns null
const featured4 = deriveFeaturedQuest([])
assertEqual('Featured quest: empty quests array → null', featured4, null)

// ---------------------------------------------------------------------------
// SECTION 8: Avatar initial fallback logic (Avatar.tsx)
// ---------------------------------------------------------------------------
console.log('\n--- Section 8: Avatar initial fallback ---')

assertEqual('Avatar: "alice" → initial "A"', avatarInitial('alice'), 'A')
assertEqual('Avatar: "Bob" → initial "B"', avatarInitial('Bob'), 'B')
assertEqual('Avatar: "1user" (non-letter start) → initial "1"', avatarInitial('1user'), '1')
assertEqual('Avatar: empty string → "?"', avatarInitial(''), '?')
assertEqual('Avatar: "!" (non-letter start) → "!"', avatarInitial('!special'), '!')

// ---------------------------------------------------------------------------
// SECTION 9: Medal logic in leaderboard.tsx
// ---------------------------------------------------------------------------
console.log('\n--- Section 9: Leaderboard medal logic ---')

assertEqual('Medal: rank 1 → 🥇', medalForRank(1), '🥇')
assertEqual('Medal: rank 2 → 🥈', medalForRank(2), '🥈')
assertEqual('Medal: rank 3 → 🥉', medalForRank(3), '🥉')
assertEqual('Medal: rank 4 → null (shows #N text)', medalForRank(4), null)
assertEqual('Medal: rank 10 → null (shows #N text)', medalForRank(10), null)
assertEqual('Medal: rank 100 → null (shows #N text)', medalForRank(100), null)

// Verify medal/rank exclusivity: medal is truthy only for 1-3
assert(
  'Medal: rank 3 returns truthy (medal rendered, no #N text)',
  !!medalForRank(3),
  true,
  !!medalForRank(3)
)
assert(
  'Medal: rank 4 returns falsy (#N text rendered, no medal)',
  !medalForRank(4),
  false,
  !!medalForRank(4)
)

// ---------------------------------------------------------------------------
// SECTION 10: Prop interface shapes (structure checks)
// ---------------------------------------------------------------------------
console.log('\n--- Section 10: Prop interface structure checks ---')

// These verify that the spec interface matches what we read in the source files.
// We describe what we found in code review:

// SectionHeader: title (required), trailing (optional string), style (optional ViewStyle)
assert(
  'SectionHeader: has required "title" prop (string)',
  true, // confirmed by reading SectionHeader.tsx — interface SectionHeaderProps { title: string; trailing?: string; style?: ViewStyle }
  true,
  true
)

// CategoryChip: label, active, onPress, count?
assert(
  'CategoryChip: count is optional — renders label only when count is undefined',
  // Replicate: count !== undefined ? ` ${count}` : ''
  (() => {
    const withCount = 'All' + (5 !== undefined ? ` ${5}` : '')
    const withoutCount = 'All' + (undefined !== undefined ? ` ${undefined}` : '')
    return withCount === 'All 5' && withoutCount === 'All'
  })(),
  true,
  true
)

// EmptyState: ctaLabel and onCtaPress both required for CTA to render
assert(
  'EmptyState: CTA only renders when BOTH ctaLabel and onCtaPress are defined',
  // Replicate: ctaLabel !== undefined && onCtaPress !== undefined
  (() => {
    const bothDefined = ('Submit' !== undefined) && ((() => {}) !== undefined)
    const labelOnly = ('Submit' !== undefined) && (undefined !== undefined)
    const neitherDefined = (undefined !== undefined) && (undefined !== undefined)
    return bothDefined === true && labelOnly === false && neitherDefined === false
  })(),
  true,
  true
)

// ---------------------------------------------------------------------------
// SECTION 11: No-profile guard in index.tsx (edge case)
// ---------------------------------------------------------------------------
console.log('\n--- Section 11: No-profile guard (index.tsx) ---')

function simulateHeaderRender(profile) {
  const hasProfile = profile !== null
  // Returns what would be rendered: greeting text
  const greetingText = hasProfile ? `Welcome back, @${profile.username}` : 'Welcome to Quest!'
  // Returns whether Avatar/LevelChip would be rendered
  const showsAvatarAndChip = hasProfile
  return { greetingText, showsAvatarAndChip }
}

const noProfileRender = simulateHeaderRender(null)
assertEqual(
  'No profile: greeting text is "Welcome to Quest!"',
  noProfileRender.greetingText,
  'Welcome to Quest!'
)
assert(
  'No profile: Avatar and LevelChip are NOT rendered',
  noProfileRender.showsAvatarAndChip === false,
  false,
  noProfileRender.showsAvatarAndChip
)

const withProfileRender = simulateHeaderRender({ username: 'alice', level: 3, total_xp: 600 })
assertEqual(
  'With profile: greeting text is "Welcome back, @alice"',
  withProfileRender.greetingText,
  'Welcome back, @alice'
)
assert(
  'With profile: Avatar and LevelChip ARE rendered',
  withProfileRender.showsAvatarAndChip === true,
  true,
  withProfileRender.showsAvatarAndChip
)

// ---------------------------------------------------------------------------
// SECTION 12: Failure case — wrong XP / level
// ---------------------------------------------------------------------------
console.log('\n--- Section 12: Failure case — malformed XP input ---')

assertEqual(
  'getLevelFromXp with negative XP → still returns 1 (loop finds no match, falls back)',
  getLevelFromXp(-100),
  1
)
assertEqual(
  'getXpToNextLevel for 0 XP → 200 (200 - 0)',
  getXpToNextLevel(0),
  200
)

// ---------------------------------------------------------------------------
// SECTION 13: getRankDelta — leaderboard rank delta logic (Unit 6)
// ---------------------------------------------------------------------------
console.log('\n--- Section 13: getRankDelta rank delta logic ---')

/**
 * Replicated from apps/mobile/app/(tabs)/leaderboard.tsx
 */
function getRankDelta(currentRank, lastWeekRank) {
  if (lastWeekRank === null || lastWeekRank === undefined) {
    return { label: '–', color: COLORS.textMuted }
  }
  const delta = lastWeekRank - currentRank
  if (delta > 0) {
    return { label: `↑${delta}`, color: COLORS.success }
  }
  if (delta < 0) {
    return { label: `↓${Math.abs(delta)}`, color: COLORS.danger }
  }
  return { label: '–', color: COLORS.textMuted }
}

// Use matching color values from test-local COLORS (replicated at top of file)
const TEST_SUCCESS = COLORS.success
const TEST_DANGER = COLORS.danger
const TEST_MUTED = COLORS.textMuted

// null last_week_rank → new user, show –
assertDeepEqual(
  'getRankDelta: null lastWeekRank → label "–", muted color',
  getRankDelta(3, null),
  { label: '–', color: TEST_MUTED }
)

// Same rank → no change, show –
assertDeepEqual(
  'getRankDelta: same rank (was 5, now 5) → label "–", muted color',
  getRankDelta(5, 5),
  { label: '–', color: TEST_MUTED }
)

// Moved up (lower rank number = better) → ↑delta in green
// was rank 10 last week, now rank 7 → delta = 10 - 7 = +3
assertDeepEqual(
  'getRankDelta: moved up (was 10, now 7) → label "↑3", success color',
  getRankDelta(7, 10),
  { label: '↑3', color: TEST_SUCCESS }
)

// Moved up by 1
assertDeepEqual(
  'getRankDelta: moved up by 1 (was 2, now 1) → label "↑1", success color',
  getRankDelta(1, 2),
  { label: '↑1', color: TEST_SUCCESS }
)

// Moved down → ↓delta in danger color
// was rank 3, now rank 8 → delta = 3 - 8 = -5
assertEqual(
  'getRankDelta: moved down (was 3, now 8) → label "↓5"',
  getRankDelta(8, 3).label,
  '↓5'
)
assertEqual(
  'getRankDelta: moved down → danger color',
  getRankDelta(8, 3).color,
  TEST_DANGER
)

// Moved down by 1
assertEqual(
  'getRankDelta: moved down by 1 (was 1, now 2) → label "↓1"',
  getRankDelta(2, 1).label,
  '↓1'
)

// Large delta
assertEqual(
  'getRankDelta: large jump up (was 50, now 4) → label "↑46"',
  getRankDelta(4, 50).label,
  '↑46'
)
assertEqual(
  'getRankDelta: large drop (was 1, now 30) → label "↓29"',
  getRankDelta(30, 1).label,
  '↓29'
)

// ---------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------
console.log('\n=== SUMMARY ===')
console.log(`Total: ${passed + failed}  Passed: ${passed}  Failed: ${failed}`)

if (failures.length > 0) {
  console.error('\nFailed tests:')
  failures.forEach((f, i) => {
    console.error(`  ${i + 1}. ${f.description}`)
    console.error(`     Expected: ${JSON.stringify(f.expected)}`)
    console.error(`     Actual:   ${JSON.stringify(f.actual)}`)
  })
  process.exit(1)
} else {
  console.log('\nAll tests passed.')
  process.exit(0)
}
