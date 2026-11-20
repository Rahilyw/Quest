'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const {
  PARTY_CODE_ALPHABET,
  PARTY_CODE_LENGTH,
  normalizePartyCode,
  isValidPartyCode,
  partyExpiresInMs,
  partyExpiryLabel,
  partyPartnerStatus,
  partyLobbyState,
  partyDeepLink,
  partyErrorCopy,
} = require('../lib/party')
const { classifyInsertError } = require('../lib/submissionAttempt')
const { notificationText } = require('../lib/socialNotifications')

const root = path.join(__dirname, '..', '..', '..')
const sqlPath = path.join(root, 'supabase', 'migrations', '045_duo_quests.sql')
const sql = fs.readFileSync(sqlPath, 'utf8')
const readme = fs.readFileSync(path.join(root, 'supabase', 'migrations', 'README.md'), 'utf8')

function test(name, fn) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (err) {
    console.error(`not ok - ${name}`)
    throw err
  }
}

function fnDef(name) {
  const re = new RegExp(
    `CREATE OR REPLACE FUNCTION ${name}\\([\\s\\S]*?\\$\\$[\\s\\S]*?\\$\\$;`,
  )
  const m = re.exec(sql)
  assert.ok(m, `function ${name} missing`)
  return m[0]
}

function fnBody(name) {
  const def = fnDef(name)
  const m = /\$\$([\s\S]*)\$\$;/.exec(def)
  assert.ok(m, `body for ${name} missing`)
  return m[1]
}

test('045 is numbered duo quests and requires 043/044', () => {
  assert.ok(fs.existsSync(sqlPath))
  assert.ok(/045_duo_quests\.sql/.test(sqlPath.replace(/\\/g, '/')))
  assert.ok(/REQUIRES 043 AND 044/i.test(sql))
  assert.ok(/Verifying 045/i.test(readme))
  assert.ok(/045_duo_quests\.sql/.test(readme))
})

test('code alphabet and validation', () => {
  assert.strictEqual(PARTY_CODE_ALPHABET, 'ABCDEFGHJKMNPQRSTUVWXYZ23456789')
  assert.strictEqual(PARTY_CODE_LENGTH, 6)
  assert.ok(sql.includes(PARTY_CODE_ALPHABET))
  assert.ok(isValidPartyCode('ABCDEF'))
  assert.ok(isValidPartyCode('234567'))
  assert.ok(!isValidPartyCode('ABCDE0')) // 0 excluded
  assert.ok(!isValidPartyCode('ABCDEO')) // O excluded
  assert.ok(!isValidPartyCode('ABCDE1')) // 1 excluded
  assert.ok(!isValidPartyCode('ABCDEI')) // I excluded
  assert.ok(!isValidPartyCode('ABCDEL')) // L excluded
  assert.ok(!isValidPartyCode('ABC'))
  assert.strictEqual(normalizePartyCode(' ab-cd '), 'ABCD')
  assert.strictEqual(partyDeepLink('ab12cd'), 'quest://party/AB12CD')
})

test('lobby state machine', () => {
  assert.strictEqual(partyLobbyState(null), 'none')
  assert.strictEqual(
    partyLobbyState({
      is_open: true,
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      members: [{ user_id: 'a' }],
    }),
    'waiting',
  )
  assert.strictEqual(
    partyLobbyState({
      is_open: true,
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      members: [{ user_id: 'a' }, { user_id: 'b' }],
    }),
    'ready',
  )
  assert.strictEqual(
    partyLobbyState({
      is_open: true,
      expires_at: new Date(Date.now() - 1000).toISOString(),
      members: [{ user_id: 'a' }, { user_id: 'b' }],
    }),
    'expired',
  )
  assert.ok(partyExpiresInMs(new Date(Date.now() + 120000).toISOString()) > 0)
  assert.ok(partyExpiryLabel(new Date(Date.now() + 120000).toISOString()).includes('minute'))
  assert.strictEqual(
    partyPartnerStatus([{ user_id: 'a', username: 'me' }], 'a'),
    'Waiting for a friend',
  )
  assert.strictEqual(
    partyPartnerStatus(
      [
        { user_id: 'a', username: 'me' },
        { user_id: 'b', username: 'sam' },
      ],
      'a',
    ),
    '@sam is in',
  )
})

test('party error copy and classifyInsertError PARTY_REQUIRED', () => {
  assert.ok(partyErrorCopy('PARTY_NOT_FOUND').length > 10)
  assert.ok(partyErrorCopy('PARTY_EXPIRED').toLowerCase().includes('expired'))
  assert.ok(partyErrorCopy('PARTY_FULL').toLowerCase().includes('full'))
  assert.ok(partyErrorCopy('PARTY_SELF').toLowerCase().includes('own'))
  assert.ok(partyErrorCopy('PARTY_REQUIRED').toLowerCase().includes('friend'))
  assert.strictEqual(
    classifyInsertError({ code: '23514', message: 'PARTY_REQUIRED', hint: 'PARTY_REQUIRED' }),
    'party_required',
  )
  assert.strictEqual(
    classifyInsertError({ code: '23514', message: 'RATE_LIMITED', hint: 'RATE_LIMITED' }),
    'rate_limited',
  )
})

test('SQL: min_party_size grant, tables, RPCs, definer hygiene', () => {
  assert.ok(/ADD COLUMN IF NOT EXISTS min_party_size/i.test(sql))
  assert.ok(/GRANT SELECT \(min_party_size\) ON TABLE quests TO anon, authenticated/i.test(sql))
  assert.ok(/CREATE TABLE IF NOT EXISTS quest_parties/i.test(sql))
  assert.ok(/CREATE TABLE IF NOT EXISTS quest_party_members/i.test(sql))
  assert.ok(/quest_parties_one_open_per_creator/i.test(sql))
  for (const name of ['create_party', 'join_party', 'leave_party', 'own_party']) {
    assert.ok(sql.includes(`CREATE OR REPLACE FUNCTION ${name}`), name)
    assert.ok(
      new RegExp(`GRANT EXECUTE ON FUNCTION ${name}`).test(sql) ||
        new RegExp(`GRANT EXECUTE ON FUNCTION ${name}\\(`).test(sql),
      `${name} granted`,
    )
  }
  assert.ok(/PARTY_NOT_FOUND/.test(sql) && /PARTY_EXPIRED/.test(sql))
  assert.ok(/PARTY_FULL/.test(sql) && /PARTY_SELF/.test(sql) && /PARTY_REQUIRED/.test(sql))
  assert.ok(/SECURITY DEFINER/.test(fnDef('create_party')))
  assert.ok(/SET search_path = public/.test(fnDef('create_party')))
  assert.ok(/REVOKE ALL ON FUNCTION normalize_completion_on_insert\(\)/.test(sql))
  assert.ok(/REVOKE ALL ON FUNCTION apply_duo_party_on_completion\(\)/.test(sql))
})

test('normalize keeps 043 XP award logic and adds party gate + duo bonus', () => {
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
    'pg_advisory_xact_lock(hashtext(NEW.quest_id::text))',
    "interval '7 days'",
    'greatest(1, m_event, m_personal)',
    'UPDATE xp_events SET consumed_at = now()',
    'NEW.xp_awarded :=',
    'NEW.xp_reason :=',
  ]
  for (const line of kept) assert.ok(body.includes(line), `keeps: ${line}`)
  assert.strictEqual((body.match(/RAISE EXCEPTION 'RATE_LIMITED'/g) || []).length, 2)
  assert.ok(body.includes("RAISE EXCEPTION 'PARTY_REQUIRED'"))
  assert.ok(body.includes("NEW.xp_reason := 'duo'"))
  assert.ok(body.includes("interval '48 hours'"))
  assert.ok(body.includes('round(0.5 * base_xp)'))
})

test('recruits rule, Recruiter badge, duo_bonus notification', () => {
  assert.ok(/WHEN 'recruits' THEN/i.test(sql))
  assert.ok(/'Recruiter'/i.test(sql))
  assert.ok(/ADD VALUE IF NOT EXISTS 'duo_bonus'/i.test(sql))
  assert.ok(/type = 'duo_bonus'/.test(sql) || /'duo_bonus'/.test(sql))
  assert.strictEqual(
    notificationText('duo_bonus'),
    'finished your duo quest. You both got a bonus.',
  )
})

console.log('party.test.js: all passed')
