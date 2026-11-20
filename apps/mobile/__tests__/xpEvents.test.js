'use strict'

/**
 * XP economy events (migration 043, plan Phase 4a).
 * Run: node apps/mobile/__tests__/xpEvents.test.js
 *
 * Part 1 is a pure JS mirror of the award rule in normalize_completion_on_insert
 * (043). It pins precedence, the cap, the first-finisher window and rounding,
 * so a change to either side shows up as a disagreement in review.
 *
 * Part 2 is a text check of the 043 SQL and the admin queries, in the style of
 * profilePrivacy.test.js. It does NOT execute SQL: it cannot prove the grants,
 * triggers or locks behave as written. That needs a real Postgres
 * (supabase/migrations/README.md, "Verifying 043").
 */

const fs = require('fs')
const path = require('path')
const assert = require('assert')

const ROOT = path.join(__dirname, '..', '..', '..')
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')

let passed = 0
function test(name, fn) {
  fn()
  passed += 1
  console.log(`ok ${passed} ${name}`)
}

// ─── Part 1: the rule ──────────────────────────────────────────────────────

const CAP = 3
const FIRST_FINISHER = 1.5
const FIRST_FINISHER_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

const isActive = (e, now) => new Date(e.starts_at) <= now && new Date(e.ends_at) > now

/** Postgres round(numeric) rounds half away from zero; awards are never negative. */
const pgRound = (x) => Math.round(x)

/**
 * Mirror of 043 normalize_completion_on_insert's XP section.
 * @returns {{ xpAwarded: number, reason: string|null, consumedId: string|null }}
 */
function computeAward({ base, questId, userId, questStart, hasApprovedCompletion, events, now }) {
  const multipliers = events.filter(
    (e) => e.kind === 'multiplier' && e.user_id == null && (e.quest_id == null || e.quest_id === questId) && isActive(e, now)
  )
  const mEvent = multipliers.length ? Math.max(...multipliers.map((e) => e.multiplier)) : 1
  const globals = multipliers.filter((e) => e.quest_id == null)
  const mEventGlobal = globals.length ? Math.max(...globals.map((e) => e.multiplier)) : null

  const winBack = events
    .filter((e) => e.kind === 'win_back' && e.user_id === userId && e.consumed_at == null && isActive(e, now))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at) || String(a.id).localeCompare(String(b.id)))[0]
  const mPersonal = winBack ? winBack.multiplier : 1

  let m = Math.max(1, mEvent, mPersonal)
  let reason
  if (m === 1) reason = null
  else if (mPersonal >= mEvent) reason = 'win_back'
  else if (mEventGlobal != null && mEventGlobal >= mEvent) reason = 'weekend'
  else reason = 'quest'

  if (questStart != null && new Date(questStart).getTime() > now.getTime() - FIRST_FINISHER_WINDOW_MS) {
    if (!hasApprovedCompletion) {
      m = m * FIRST_FINISHER
      reason = 'first_finisher'
    }
  }

  return { xpAwarded: pgRound(base * Math.min(m, CAP)), reason, consumedId: winBack ? winBack.id : null }
}

const NOW = new Date('2026-11-21T20:00:00Z') // a Saturday in Victoria
const H = 60 * 60 * 1000
const at = (offsetHours) => new Date(NOW.getTime() + offsetHours * H).toISOString()
const OLD_QUEST_START = at(-24 * 30)
const Q = 'quest-a'
const U = 'user-1'

function ev(over) {
  return {
    id: over.id ?? Math.random().toString(36).slice(2),
    kind: 'multiplier',
    multiplier: 2,
    quest_id: null,
    user_id: null,
    starts_at: at(-1),
    ends_at: at(24),
    consumed_at: null,
    created_at: at(-2),
    ...over,
  }
}

const base = (over = {}) => ({
  base: 100,
  questId: Q,
  userId: U,
  questStart: OLD_QUEST_START,
  hasApprovedCompletion: true,
  events: [],
  now: NOW,
  ...over,
})

test('no events: base XP, no reason', () => {
  assert.deepStrictEqual(computeAward(base()), { xpAwarded: 100, reason: null, consumedId: null })
})

test('a global ×2 event doubles and is reported as weekend', () => {
  const r = computeAward(base({ events: [ev({})] }))
  assert.strictEqual(r.xpAwarded, 200)
  assert.strictEqual(r.reason, 'weekend')
})

test('quest ×1.5 plus global ×2 gives the max, not the product', () => {
  const r = computeAward(base({ events: [ev({ multiplier: 2 }), ev({ multiplier: 1.5, quest_id: Q })] }))
  assert.strictEqual(r.xpAwarded, 200)
  assert.strictEqual(r.reason, 'weekend')
})

test('a higher quest event beats the global one and is reported as quest', () => {
  const r = computeAward(base({ events: [ev({ multiplier: 2 }), ev({ multiplier: 2.5, quest_id: Q })] }))
  assert.strictEqual(r.xpAwarded, 250)
  assert.strictEqual(r.reason, 'quest')
})

test('an event for another quest does not apply', () => {
  const r = computeAward(base({ events: [ev({ quest_id: 'quest-b' })] }))
  assert.strictEqual(r.xpAwarded, 100)
  assert.strictEqual(r.reason, null)
})

test('start is inclusive, end is exclusive, future and past events are ignored', () => {
  assert.strictEqual(computeAward(base({ events: [ev({ starts_at: at(0) })] })).xpAwarded, 200)
  assert.strictEqual(computeAward(base({ events: [ev({ ends_at: at(0) })] })).xpAwarded, 100)
  assert.strictEqual(computeAward(base({ events: [ev({ starts_at: at(1), ends_at: at(5) })] })).xpAwarded, 100)
  assert.strictEqual(computeAward(base({ events: [ev({ starts_at: at(-9), ends_at: at(-1) })] })).xpAwarded, 100)
})

test('win-back beats a smaller event and the oldest open row is consumed', () => {
  const r = computeAward(
    base({
      events: [
        ev({ multiplier: 1.5 }),
        ev({ id: 'wb-new', kind: 'win_back', user_id: U, multiplier: 2, created_at: at(-1) }),
        ev({ id: 'wb-old', kind: 'win_back', user_id: U, multiplier: 2, created_at: at(-48) }),
      ],
    })
  )
  assert.strictEqual(r.xpAwarded, 200)
  assert.strictEqual(r.reason, 'win_back')
  assert.strictEqual(r.consumedId, 'wb-old')
})

test('win-back is consumed even when an event already gives the same ×2 (tie → win_back)', () => {
  const r = computeAward(base({ events: [ev({}), ev({ id: 'wb', kind: 'win_back', user_id: U })] }))
  assert.strictEqual(r.xpAwarded, 200)
  assert.strictEqual(r.reason, 'win_back')
  assert.strictEqual(r.consumedId, 'wb')
})

test("consumed, expired and other players' win-back rows are ignored", () => {
  const r = computeAward(
    base({
      events: [
        ev({ kind: 'win_back', user_id: U, consumed_at: at(-1) }),
        ev({ kind: 'win_back', user_id: U, ends_at: at(-1), starts_at: at(-30) }),
        ev({ kind: 'win_back', user_id: 'user-2' }),
      ],
    })
  )
  assert.deepStrictEqual(r, { xpAwarded: 100, reason: null, consumedId: null })
})

test('first finisher: ×1.5 inside 7 days with no approved completion', () => {
  const r = computeAward(base({ questStart: at(-24), hasApprovedCompletion: false }))
  assert.strictEqual(r.xpAwarded, 150)
  assert.strictEqual(r.reason, 'first_finisher')
})

test('first finisher multiplies the winning boost: ×2 × 1.5 = ×3', () => {
  const r = computeAward(base({ questStart: at(-24), hasApprovedCompletion: false, events: [ev({})] }))
  assert.strictEqual(r.xpAwarded, 300)
  assert.strictEqual(r.reason, 'first_finisher')
})

test('the cap is ×3: ×3 event with first finisher stays at ×3', () => {
  const r = computeAward(base({ questStart: at(-24), hasApprovedCompletion: false, events: [ev({ multiplier: 3 })] }))
  assert.strictEqual(r.xpAwarded, 300)
  const r2 = computeAward(base({ questStart: at(-24), hasApprovedCompletion: false, events: [ev({ multiplier: 2.5 })] }))
  assert.strictEqual(r2.xpAwarded, 300)
})

test('first finisher window: exactly 7 days old or older does not qualify; an approved row blocks it', () => {
  assert.strictEqual(computeAward(base({ questStart: at(-24 * 7), hasApprovedCompletion: false })).reason, null)
  assert.strictEqual(computeAward(base({ questStart: at(-24 * 7 + 1), hasApprovedCompletion: false })).reason, 'first_finisher')
  assert.strictEqual(computeAward(base({ questStart: at(-24), hasApprovedCompletion: true })).reason, null)
  assert.strictEqual(computeAward(base({ questStart: null, hasApprovedCompletion: false })).reason, null)
})

test('rounding matches Postgres round(): half away from zero', () => {
  assert.strictEqual(computeAward(base({ base: 75, questStart: at(-1), hasApprovedCompletion: false })).xpAwarded, 113) // 112.5
  assert.strictEqual(computeAward(base({ base: 25, events: [ev({ multiplier: 1.25 })] })).xpAwarded, 31) // 31.25
  assert.strictEqual(computeAward(base({ base: 150, events: [ev({ multiplier: 1.33 })] })).xpAwarded, 200) // 199.5
})

// ─── Part 2: SQL and admin text guards ─────────────────────────────────────

const stripComments = (s) => s.replace(/^\s*--.*$/gm, '').replace(/--[^\n]*$/gm, '')
const sql = stripComments(read('supabase/migrations/043_xp_events.sql'))

/** Body of a `CREATE OR REPLACE FUNCTION name(...)` up to its closing `$$;`. */
function fnBody(name) {
  const re = new RegExp(`CREATE OR REPLACE FUNCTION ${name}\\([^)]*\\)[\\s\\S]*?AS \\$\\$([\\s\\S]*?)\\$\\$;`)
  const m = re.exec(sql)
  assert.ok(m, `043 defines ${name}`)
  return m[1]
}

test('043 grants SELECT on xp_awarded and xp_reason to client roles (038 rule)', () => {
  const m = /GRANT SELECT \(([^)]*)\) ON TABLE completions TO anon, authenticated;/.exec(sql)
  assert.ok(m, 'column grant on completions')
  const cols = m[1].split(',').map((c) => c.trim())
  assert.ok(cols.includes('xp_awarded'))
  assert.ok(cols.includes('xp_reason'))
  assert.ok(!/GRANT SELECT ON (TABLE )?completions TO (anon|authenticated)/i.test(sql), 'no table-level grant back')
})

test('xp_awarded is backfilled before it becomes NOT NULL', () => {
  const backfill = sql.indexOf('SET xp_awarded = q.xp_reward')
  const notNull = sql.indexOf('ALTER COLUMN xp_awarded SET NOT NULL')
  assert.ok(backfill > 0 && notNull > backfill)
})

test('the old apply_completion_rewards(uuid, uuid) overload is dropped and nothing calls it', () => {
  assert.ok(/DROP FUNCTION IF EXISTS apply_completion_rewards\(uuid, uuid\);/i.test(sql))
  assert.ok(!/apply_completion_rewards\(NEW\.user_id/i.test(sql))
  assert.ok(/PERFORM apply_completion_rewards\(NEW\.id\)/.test(fnBody('award_xp_on_approval')))
  assert.ok(/PERFORM apply_completion_rewards\(NEW\.id\)/.test(fnBody('apply_completion_rewards_on_insert')))
  assert.ok(/xp_awarded/.test(fnBody('apply_completion_rewards')))
})

test('no sum(q.xp_reward) remains in anything 043 redefines', () => {
  assert.ok(!/sum\(\s*q\.xp_reward\s*\)/i.test(sql), 'sum(q.xp_reward) found in 043')
  for (const name of ['own_week_recap', 'enqueue_week_recap']) {
    const body = fnBody(name)
    assert.ok(/sum\(coalesce\(c\.xp_awarded, q\.xp_reward\)\)/.test(body), `${name} sums the stored award`)
  }
  assert.ok(/coalesce\(c\.xp_awarded, q\.xp_reward\) DESC/.test(fnBody('own_week_recap')), 'recap photo order')
  const view = /CREATE OR REPLACE VIEW leaderboard AS([\s\S]*?);\s*\n/.exec(sql)
  assert.ok(view && /sum\(coalesce\(c\.xp_awarded, q\.xp_reward\)\)/.test(view[1]), 'leaderboard sums the stored award')
  assert.ok(/coalesce\(NEW\.xp_awarded, q\.xp_reward\)/.test(fnBody('revoke_completion_rewards')), 'revoke subtracts the stored award')
})

test('normalize_completion_on_insert keeps all of 038 and adds the award rule', () => {
  const body = fnBody('normalize_completion_on_insert')
  const kept = [
    'NEW.completed_at := now();',
    "interval '10 minutes'",
    "interval '24 hours'",
    'IF recent_10min >= 2 THEN',
    'IF recent_24h >= 10 THEN',
    "NEW.status := 'approved';",
    'NEW.reviewed_at := now();',
    'NEW.redemption_code := generate_redemption_code();',
    'NEW.redemption_code := NULL;',
  ]
  for (const line of kept) assert.ok(body.includes(line), `keeps: ${line}`)
  assert.strictEqual((body.match(/RAISE EXCEPTION 'RATE_LIMITED'/g) || []).length, 2)
  assert.ok(body.includes('pg_advisory_xact_lock(hashtext(NEW.quest_id::text))'))
  assert.ok(body.includes("interval '7 days'"))
  assert.ok(body.includes(`m := m * ${FIRST_FINISHER};`))
  assert.ok(body.includes(`least(m, ${CAP})`))
  assert.ok(body.includes('greatest(1, m_event, m_personal)'))
  assert.ok(/UPDATE xp_events SET consumed_at = now\(\)/.test(body), 'consumes the win-back row')
  assert.ok(/FOR UPDATE;/.test(body), 'locks the win-back row')
  assert.ok(body.includes('NEW.xp_awarded :=') && body.includes('NEW.xp_reason :='))
})

test('xp_events has RLS on and no client policies or grants', () => {
  assert.ok(/ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;/.test(sql))
  assert.ok(/REVOKE ALL ON TABLE xp_events FROM PUBLIC, anon, authenticated;/.test(sql))
  assert.ok(!/CREATE POLICY[^;]*ON xp_events/i.test(sql))
  assert.ok(/multiplier BETWEEN 1 AND 3/.test(sql))
})

test('definer functions are revoked from clients; player RPCs are authenticated-only', () => {
  assert.ok(/REVOKE ALL ON FUNCTION apply_completion_rewards\(uuid\) FROM PUBLIC, anon, authenticated;/.test(sql))
  assert.ok(/REVOKE ALL ON FUNCTION normalize_completion_on_insert\(\) FROM PUBLIC, anon, authenticated;/.test(sql))
  assert.ok(/REVOKE EXECUTE ON FUNCTION enqueue_win_back\(\) FROM PUBLIC, anon, authenticated;/.test(sql))
  assert.ok(/REVOKE ALL ON FUNCTION active_xp_boosts\(\) FROM PUBLIC, anon;/.test(sql))
  assert.ok(/GRANT EXECUTE ON FUNCTION active_xp_boosts\(\) TO authenticated;/.test(sql))
  assert.ok(/auth\.uid\(\)/.test(fnBody('active_xp_boosts')))
  for (const m of sql.matchAll(/CREATE OR REPLACE FUNCTION (\w+)\([^)]*\)[\s\S]*?AS \$\$/g)) {
    assert.ok(/SECURITY DEFINER/.test(m[0]), `${m[1]} is a definer function`)
    assert.ok(/SET search_path = public/.test(m[0]), `${m[1]} pins search_path`)
  }
})

test('own_completion_reward returns xp_awarded and xp_reason', () => {
  const body = fnBody('own_completion_reward')
  assert.ok(body.includes("'xp_awarded', c.xp_awarded"))
  assert.ok(body.includes("'xp_reason', c.xp_reason"))
  assert.ok(body.includes('c.user_id = auth.uid()'))
})

test('win-back job: two UTC schedules, 17:00 Victoria guard, win_back outbox rows', () => {
  const body = fnBody('enqueue_win_back')
  assert.ok(body.includes("now() AT TIME ZONE 'America/Vancouver'"))
  assert.ok(body.includes('extract(hour FROM v_local) < 17'))
  assert.ok(body.includes("interval '10 days'") && body.includes("interval '60 days'") && body.includes("interval '30 days'"))
  assert.ok(body.includes('p.push_token IS NOT NULL') && body.includes('p.push_drops = true'))
  assert.ok(body.includes("'win_back'") && body.includes('INSERT INTO push_outbox'))
  assert.ok(body.includes('ON CONFLICT (dedupe_key) DO NOTHING'))
  assert.ok(/'enqueue-win-back-0000',\s*'0 0 \* \* \*'/.test(sql))
  assert.ok(/'enqueue-win-back-0100',\s*'0 1 \* \* \*'/.test(sql))
})

test('041 allows the win_back push kind 043 writes', () => {
  assert.ok(/'win_back'/.test(read('supabase/migrations/041_push_outbox_draining.sql')))
})

test('admin completions and moderation show xp_awarded, not quests.xp_reward', () => {
  for (const rel of ['apps/admin/app/completions/actions.ts', 'apps/admin/app/moderation/actions.ts']) {
    const src = read(rel)
    assert.ok(/xp_awarded/.test(src), `${rel} reads xp_awarded`)
    assert.ok(!/quests\([^)]*xp_reward/.test(src), `${rel} no longer selects quests.xp_reward`)
  }
  assert.ok(/c\.xp_awarded\} XP/.test(read('apps/admin/app/completions/page.tsx')))
})

test('every exported admin XP-event action calls requireAdmin()', () => {
  const src = read('apps/admin/app/xp-events/actions.ts')
  assert.ok(src.startsWith("'use server'"))
  const fns = [...src.matchAll(/export async function (\w+)\([^)]*\)[^{]*\{([\s\S]*?)\n\}/g)]
  assert.ok(fns.length >= 5, 'found the actions')
  for (const [, name, body] of fns) {
    assert.ok(/await requireAdmin\(\)/.test(body), `${name} calls requireAdmin()`)
  }
})

console.log(`\n${passed} passed`)
