'use strict'

/**
 * Guard for audit finding OPS-01 / F-007 (push_outbox draining) and the Sunday
 * recap push (Spec 06 §2).
 * Run: node apps/mobile/__tests__/pushOutbox.test.js
 *
 * This is a text check of migration 041, the send-push-outbox function and the
 * mobile push routing. It does NOT execute SQL or call Expo: it cannot prove
 * the claim locking, the cron schedule or delivery behave as written. That
 * needs a real database and a deployed function (see supabase/migrations/README.md,
 * "Verifying 041", and LAUNCH-RUNBOOK.md Step 0c).
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

const sql = read('supabase/migrations/041_push_outbox_draining.sql').replace(/--.*$/gm, '')
// Handler + shared drain logic (M4 moved pure code into _shared/pushOutbox.ts).
const fn = [
  read('supabase/functions/send-push-outbox/index.ts'),
  read('supabase/functions/_shared/pushOutbox.ts'),
].join('\n')
const nav = read('apps/mobile/lib/push-navigation.ts')

/** Body of one CREATE FUNCTION, from its header to the closing $$; */
function fnBody(name) {
  const start = sql.indexOf(`CREATE OR REPLACE FUNCTION ${name}(`)
  assert.notStrictEqual(start, -1, `${name} not found in 041`)
  const open = sql.indexOf('$$', start)
  const close = sql.indexOf('$$;', open + 2)
  return sql.slice(start, close)
}

test('041 adds the claim bookkeeping columns', () => {
  assert.ok(/ADD COLUMN IF NOT EXISTS attempts\s+INTEGER NOT NULL DEFAULT 0/.test(sql))
  assert.ok(/ADD COLUMN IF NOT EXISTS last_error\s+TEXT/.test(sql))
  assert.ok(/ADD COLUMN IF NOT EXISTS claimed_at\s+TIMESTAMPTZ/.test(sql))
  assert.ok(/ADD COLUMN IF NOT EXISTS next_attempt_at\s+TIMESTAMPTZ/.test(sql))
})

test('kind CHECK allows the two new kinds and keeps the old ones', () => {
  const m = /CONSTRAINT push_outbox_kind_check\s+CHECK \(kind IN \(([^)]*)\)\)/.exec(sql)
  assert.ok(m, 'kind CHECK not found')
  const kinds = m[1].split(',').map((k) => k.trim().replace(/'/g, '')).sort()
  assert.deepStrictEqual(kinds, ['suggestion_live', 'week_recap', 'weekly_drop', 'win_back'])
  // The old inline CHECK is dropped by definition, not by a guessed name.
  assert.ok(/pg_get_constraintdef\(oid\) ILIKE '%kind%'/.test(sql))
})

test('claim_push_outbox skips locked rows, dead letters and fresh claims', () => {
  const body = fnBody('claim_push_outbox')
  assert.ok(/FOR UPDATE SKIP LOCKED/.test(body))
  assert.ok(/o\.sent_at IS NULL/.test(body))
  assert.ok(/o\.attempts < 5/.test(body))
  assert.ok(/o\.claimed_at IS NULL OR o\.claimed_at < now\(\) - interval '10 minutes'/.test(body))
  assert.ok(/o\.next_attempt_at IS NULL OR o\.next_attempt_at <= now\(\)/.test(body))
  assert.ok(/SET claimed_at = now\(\)/.test(body))
  assert.ok(/LIMIT LEAST\(GREATEST\(COALESCE\(p_batch, 1\), 1\), 500\)/.test(body))
})

test('release counts the attempt, records the error and backs off', () => {
  const body = fnBody('release_push_outbox')
  assert.ok(/claimed_at = NULL/.test(body))
  assert.ok(/attempts = attempts \+ 1/.test(body))
  assert.ok(/last_error = /.test(body))
  assert.ok(/next_attempt_at = now\(\) \+/.test(body))
  assert.ok(/sent_at IS NULL/.test(body), 'a finished row must not be released')
})

test('finish sets sent_at and clears the claim', () => {
  const body = fnBody('finish_push_outbox')
  assert.ok(/SET sent_at = now\(\)/.test(body))
  assert.ok(/claimed_at = NULL/.test(body))
})

test('outbox RPCs are service-role only', () => {
  for (const sig of [
    'claim_push_outbox(integer)',
    'finish_push_outbox(uuid[], text)',
    'release_push_outbox(uuid[], text)',
    'invoke_push_outbox_drain()',
  ]) {
    const esc = sig.replace(/[()[\]]/g, '\\$&')
    assert.ok(new RegExp(`REVOKE ALL ON FUNCTION ${esc} FROM PUBLIC, anon, authenticated;`).test(sql), sig)
    assert.ok(new RegExp(`GRANT EXECUTE ON FUNCTION ${esc} TO service_role;`).test(sql), sig)
    assert.strictEqual(new RegExp(`GRANT [^;]*${esc}[^;]* TO [^;]*(anon|authenticated)`).test(sql), false, sig)
  }
  assert.ok(/REVOKE EXECUTE ON FUNCTION enqueue_week_recap\(\) FROM PUBLIC, anon, authenticated;/.test(sql))
  assert.ok(/REVOKE ALL ON week_recap_sends FROM PUBLIC, anon, authenticated;/.test(sql))
  assert.ok(/ALTER TABLE week_recap_sends ENABLE ROW LEVEL SECURITY;/.test(sql))
})

test('every new definer function pins search_path', () => {
  const headers = sql.match(/CREATE OR REPLACE FUNCTION [\s\S]*?AS \$\$/g) || []
  assert.strictEqual(headers.length, 5)
  for (const h of headers) {
    assert.ok(/SECURITY DEFINER/.test(h), h.split('\n')[0])
    assert.ok(/SET search_path = public, pg_temp/.test(h), h.split('\n')[0])
  }
})

test('the drain cron only calls out when rows are claimable, with secrets from Vault', () => {
  const body = fnBody('invoke_push_outbox_drain')
  const check = body.indexOf('IF NOT EXISTS (')
  const post = body.indexOf('net.http_post(')
  assert.ok(check !== -1 && post !== -1 && check < post, 'row check must come before the HTTP call')
  assert.ok(/RETURN 'idle'/.test(body))
  assert.ok(/name = 'push_outbox_function_url'/.test(body))
  assert.ok(/name = 'push_outbox_webhook_secret'/.test(body))
  assert.ok(/'x-webhook-secret', v_secret/.test(body))
  // Nothing project-specific is baked into the migration.
  assert.strictEqual(/https?:\/\//.test(sql), false, 'no URL in 041 outside comments')
  assert.strictEqual(/supabase\.co/.test(sql), false)
  assert.ok(/'drain-push-outbox',\s*'\*\/5 \* \* \* \*',\s*'SELECT public\.invoke_push_outbox_drain\(\)'/.test(sql))
})

test('enqueue_week_recap is guarded to Sunday 18:00 Victoria and idempotent per week', () => {
  const body = fnBody('enqueue_week_recap')
  assert.ok(/now\(\) AT TIME ZONE 'America\/Vancouver'/.test(body))
  assert.ok(/extract\(isodow FROM v_local\) <> 7 OR extract\(hour FROM v_local\) < 18/.test(body))
  assert.ok(/INSERT INTO week_recap_sends \(week_start\)[\s\S]*ON CONFLICT \(week_start\) DO NOTHING/.test(body))
  assert.ok(/IF v_inserted = 0 THEN\s+RETURN 0;/.test(body))
  assert.ok(/'week_recap:' \|\| v_monday::text \|\| ':' \|\| p\.id::text/.test(body))
  assert.ok(/ON CONFLICT \(dedupe_key\) DO NOTHING/.test(body))
  assert.ok(/'0 1 \* \* 1',\s*'SELECT public\.enqueue_week_recap\(\)'/.test(sql))
  assert.ok(/'0 2 \* \* 1',\s*'SELECT public\.enqueue_week_recap\(\)'/.test(sql))
})

test('the recap targets players with approved XP this week by the leaderboard rule', () => {
  const body = fnBody('enqueue_week_recap')
  assert.ok(/v_from\s+:= v_monday::timestamp AT TIME ZONE 'America\/Vancouver'/.test(body))
  assert.ok(/v_to\s+:= \(v_monday \+ 7\)::timestamp AT TIME ZONE 'America\/Vancouver'/.test(body))
  assert.ok(/c\.status = 'approved'/.test(body))
  assert.ok(/c\.reviewed_at >= v_from/.test(body))
  assert.ok(/c\.reviewed_at <\s+v_to/.test(body))
  assert.ok(/HAVING COALESCE\(sum\(q\.xp_reward\), 0\) > 0/.test(body))
  assert.ok(/p\.push_token IS NOT NULL/.test(body))
  assert.ok(/p\.push_drops = true/.test(body))
  // Same week rule as 040's own_week_recap.
  const recap = read('supabase/migrations/040_week_recap.sql')
  assert.ok(/c\.reviewed_at >= week_from/.test(recap) && /c\.reviewed_at <  week_to/.test(recap))
})

test('the recap push copy and payload match the mobile route', () => {
  const body = fnBody('enqueue_week_recap')
  assert.ok(body.includes("'Your week in Victoria is in.'"))
  assert.ok(/jsonb_build_object\('type', 'week_recap', 'url', '\/recap'/.test(body))
  assert.ok(/data\?\.type === 'week_recap'[\s\S]*?router\.push\('\/recap'\)/.test(nav))
  // Recap must be matched before the generic completion_id fallback.
  assert.ok(nav.indexOf("'week_recap'") < nav.indexOf('data?.completion_id'))
  assert.ok(fs.existsSync(path.join(ROOT, 'apps/mobile/app/recap.tsx')))
})

test('every kind an enqueue writes has a tap route', () => {
  for (const kind of ['weekly_drop', 'week_recap', 'suggestion_live']) {
    assert.ok(nav.includes(`data?.type === '${kind}'`), kind)
  }
})

test('the sender loops over claims within a batch and time cap', () => {
  assert.ok(/admin\.rpc\('claim_push_outbox', \{ p_batch: (BATCH|batchSize) \}\)/.test(fn))
  assert.strictEqual(/\.from\('push_outbox'\)/.test(fn), false, 'no direct outbox reads or writes')
  assert.ok(/while \(totals\.batches < (MAX_BATCHES|maxBatches)\)/.test(fn))
  const batch = Number(/const BATCH = (\d+)/.exec(fn)[1])
  const budget = Number(/const TIME_BUDGET_MS = ([\d_]+)/.exec(fn)[1].replace(/_/g, ''))
  assert.ok(batch > 0 && batch <= 100, 'Expo takes at most 100 messages per request')
  assert.ok(budget > 0 && budget <= 50000)
})

test('the sender checks HTTP status and ticket shape, and releases on failure', () => {
  assert.ok(/if \(!res\.ok\)/.test(fn))
  assert.ok(/!Array\.isArray\(tickets\) \|\| tickets\.length !== (messages|entries)\.length/.test(fn))
  assert.ok(/ticket\?\.status === 'ok'/.test(fn))
  assert.ok(/admin\.rpc\('release_push_outbox'/.test(fn))
  assert.ok(/admin\.rpc\('finish_push_outbox'/.test(fn))
  assert.ok(/transportFailed/.test(fn))
})

test('the dead-letter threshold matches the SQL', () => {
  const max = Number(/const MAX_ATTEMPTS = (\d+)/.exec(fn)[1])
  const sqlMax = Number(/o\.attempts < (\d+)/.exec(fnBody('claim_push_outbox'))[1])
  assert.strictEqual(max, sqlMax)
  assert.strictEqual(max, 5)
})

test('DeviceNotRegistered still clears the token, and only that token', () => {
  assert.ok(/details\?\.error === 'DeviceNotRegistered'/.test(fn))
  assert.ok(/\.update\(\{ push_token: null \}\)\s*\.eq\('id', userId\)\s*\.eq\('push_token', token\)/.test(fn))
})

test('preferences are gated per kind', () => {
  const m = /function preferenceAllows[\s\S]*?\n\}/.exec(fn)
  assert.ok(m, 'preferenceAllows not found')
  const gate = m[0]
  assert.ok(/case 'weekly_drop':\s*case 'week_recap':\s*case 'win_back':\s*return profile\.push_drops !== false/.test(gate))
  assert.ok(/case 'suggestion_live':\s*return profile\.push_drops !== false/.test(gate))
  assert.ok(/default:\s*return false/.test(gate))
})

test('push tokens are not logged by the sender', () => {
  assert.strictEqual(/console\.(log|warn|error|info)\([^)]*\btoken\b/.test(fn), false)
})

console.log(`\n${passed} push outbox tests passed`)
