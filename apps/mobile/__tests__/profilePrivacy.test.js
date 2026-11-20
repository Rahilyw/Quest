'use strict'

/**
 * Guard for audit finding SEC-01 (profile push_token exposure).
 * Run: node apps/mobile/__tests__/profilePrivacy.test.js
 *
 * This is a text check of migration 039 and of the client's profile reads.
 * It does NOT execute SQL: it cannot prove the grants or RLS behave as written.
 * That needs a real Postgres (see supabase/migrations/README.md, "Verifying 039").
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

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (/\.(tsx?|jsx?)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) out.push(full)
  }
  return out
}

const sql = read('supabase/migrations/039_profile_push_token_privacy.sql').replace(/^\s*--.*$/gm, '')
const grantMatch = /GRANT SELECT \(([^)]*)\) ON TABLE profiles TO anon, authenticated;/.exec(sql)
const granted = grantMatch ? grantMatch[1].split(',').map((c) => c.trim()).filter(Boolean) : []

/** Every profiles column created by a migration in this folder. */
function profileColumns() {
  const dir = path.join(ROOT, 'supabase/migrations')
  const cols = new Set()
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql'))) {
    const text = fs.readFileSync(path.join(dir, file), 'utf8').replace(/^\s*--.*$/gm, '')
    const create = /create table profiles \(([^;]*?)\);/i.exec(text)
    if (create) {
      for (const line of create[1].split('\n')) {
        const m = /^\s*([a-z_]+)\s+(uuid|text|integer|timestamptz|boolean)/i.exec(line)
        if (m) cols.add(m[1])
      }
    }
    const alters = text.match(/alter table profiles[^;]*;/gi) || []
    for (const stmt of alters) {
      for (const m of stmt.matchAll(/add column(?: if not exists)?\s+([a-z_]+)/gi)) cols.add(m[1])
    }
  }
  return [...cols]
}

test('039 drops the table-level SELECT before granting columns', () => {
  const revoke = sql.indexOf('REVOKE SELECT ON TABLE profiles FROM PUBLIC, anon, authenticated;')
  assert.notStrictEqual(revoke, -1)
  assert.strictEqual(revoke < sql.indexOf('GRANT SELECT ('), true)
  assert.strictEqual(sql.includes('GRANT SELECT ON TABLE profiles TO service_role;'), true)
})

test('the client column grant leaves out push_token and nothing else', () => {
  assert.strictEqual(granted.includes('push_token'), false)
  const all = profileColumns()
  assert.strictEqual(all.includes('push_token'), true, 'push_token should be found in the schema')
  const missing = all.filter((c) => c !== 'push_token' && !granted.includes(c))
  assert.deepStrictEqual(missing, [], 'every other profiles column must stay readable')
  const unknown = granted.filter((c) => !all.includes(c))
  assert.deepStrictEqual(unknown, [], 'grant names a column no migration creates')
})

test('039 does not widen writes or touch the row policies', () => {
  assert.strictEqual(/GRANT\s+(UPDATE|INSERT|DELETE|ALL)/i.test(sql), false)
  assert.strictEqual(/POLICY/i.test(sql), false)
})

test('own_push_enabled answers for the caller only and returns no token', () => {
  assert.strictEqual(/FUNCTION own_push_enabled\(\)\s+RETURNS boolean/.test(sql), true)
  assert.strictEqual(/WHERE id = \(SELECT auth\.uid\(\)\)/.test(sql), true)
  assert.strictEqual(/REVOKE ALL ON FUNCTION own_push_enabled\(\) FROM PUBLIC, anon;/.test(sql), true)
  assert.strictEqual(/GRANT EXECUTE ON FUNCTION own_push_enabled\(\) TO authenticated;/.test(sql), true)
  assert.strictEqual(/SET search_path = public, pg_temp/.test(sql), true)
})

test('PROFILE_COLUMNS stays inside the grant', () => {
  const src = read('apps/mobile/lib/profiles.ts')
  const m = /export const PROFILE_COLUMNS =\s*'([^']+)'/.exec(src)
  assert.ok(m, 'PROFILE_COLUMNS not found')
  const cols = m[1].split(',').map((c) => c.trim())
  assert.strictEqual(cols.includes('push_token'), false)
  assert.deepStrictEqual(cols.filter((c) => !granted.includes(c)), [])
})

test('no mobile query selects push_token or * from profiles', () => {
  const offenders = []
  for (const file of walk(path.join(ROOT, 'apps/mobile'))) {
    if (file.includes(`${path.sep}__tests__${path.sep}`)) continue
    const code = fs.readFileSync(file, 'utf8')
    const rel = path.relative(ROOT, file)

    // .from('profiles') ... .select('...') up to the end of the statement chain.
    for (const m of code.matchAll(/\.from\('profiles'\)([^;]*?)\.select\(\s*(['"`])([^'"`]*)\2/g)) {
      const cols = m[3]
      if (cols.trim() === '*' || /\bpush_token\b/.test(cols)) offenders.push(`${rel}: select(${cols})`)
    }
    // Embedded profile joins: profiles(...), profile:profiles!fk(...)
    for (const m of code.matchAll(/profiles(?:![a-z_]+)?\(([^)]*)\)/g)) {
      if (m[1].trim() === '*' || /\bpush_token\b/.test(m[1])) offenders.push(`${rel}: embed(${m[1]})`)
    }
  }
  assert.deepStrictEqual(offenders, [])
})

test('push_token appears only in the two own-row writes and their write-only types', () => {
  const uses = []
  for (const file of walk(path.join(ROOT, 'apps/mobile'))) {
    if (file.includes(`${path.sep}__tests__${path.sep}`)) continue
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
    lines.forEach((line) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return
      if (/push_token/.test(line)) uses.push(`${path.relative(ROOT, file).split(path.sep).join('/')}: ${line.trim()}`)
    })
  }
  assert.deepStrictEqual(uses, [
    "apps/mobile/lib/notifications.ts: await supabase.from('profiles').update({ push_token: token }).eq('id', userId)",
    "apps/mobile/lib/notifications.ts: await supabase.from('profiles').update({ push_token: null }).eq('id', userId)",
    'apps/mobile/lib/types.ts: push_token?: string | null',
    "apps/mobile/lib/types.ts: Update: Partial<Omit<UserProfile, 'id' | 'created_at'>> & { push_token?: string | null }",
  ])
})

test('push tokens are not sent to analytics or logged', () => {
  for (const rel of ['apps/mobile/lib/notifications.ts', 'apps/mobile/app/settings.tsx']) {
    const code = read(rel)
    assert.strictEqual(/track\([^)]*token/i.test(code), false, rel)
    assert.strictEqual(/console\.(log|warn|error|info)\([^)]*\btoken\b/.test(code), false, rel)
  }
})

console.log(`\n${passed} profile privacy tests passed`)
