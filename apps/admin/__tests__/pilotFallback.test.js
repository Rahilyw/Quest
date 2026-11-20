'use strict'

/**
 * Pilot schema-fallback helper. Run: node apps/admin/__tests__/pilotFallback.test.js
 */

const assert = require('assert')
const path = require('path')
const {
  isMissingSchemaError,
  needsMigrationCopy,
  classifyMissingMigration,
  migrationNotice,
} = require(path.join(__dirname, '../lib/pilotFallback.js'))

let passed = 0
function test(name, fn) {
  fn()
  passed += 1
  console.log(`ok ${passed} ${name}`)
}

test('null error is not a missing-schema case', () => {
  assert.strictEqual(isMissingSchemaError(null), false)
  assert.strictEqual(classifyMissingMigration(null, '043'), null)
  assert.strictEqual(migrationNotice(null, 'xp_events'), null)
})

test('Postgres undefined_table / undefined_column codes', () => {
  assert.strictEqual(isMissingSchemaError({ code: '42P01', message: 'relation "xp_events" does not exist' }), true)
  assert.strictEqual(isMissingSchemaError({ code: '42703', message: 'column "cutout_alt" does not exist' }), true)
})

test('PostgREST schema-cache codes', () => {
  assert.strictEqual(isMissingSchemaError({ code: 'PGRST205', message: 'Could not find the table' }), true)
  assert.strictEqual(isMissingSchemaError({ code: 'PGRST204', message: 'column not in schema cache' }), true)
})

test('message fallback when code is absent', () => {
  assert.strictEqual(isMissingSchemaError({ message: 'column cutout_alt does not exist' }), true)
  assert.strictEqual(isMissingSchemaError({ message: 'permission denied' }), false)
})

test('needsMigrationCopy wording', () => {
  assert.strictEqual(needsMigrationCopy('043'), 'Needs migration 043')
  assert.strictEqual(needsMigrationCopy('044'), 'Needs migration 044')
})

test('hint wins for classification', () => {
  assert.strictEqual(
    classifyMissingMigration({ code: '42P01', message: 'relation does not exist' }, 'xp_events'),
    '043',
  )
  assert.strictEqual(
    classifyMissingMigration({ code: '42703', message: 'column does not exist' }, 'cutout_alt'),
    '044',
  )
})

test('message-based classification without hint', () => {
  assert.strictEqual(
    classifyMissingMigration({ code: '42P01', message: 'relation "public.xp_events" does not exist' }),
    '043',
  )
  assert.strictEqual(
    classifyMissingMigration({ code: '42703', message: 'column quests.cutout_alt does not exist' }),
    '044',
  )
})

test('migrationNotice returns copy or null', () => {
  assert.strictEqual(
    migrationNotice({ code: 'PGRST205', message: 'Could not find the table' }, 'xp_events'),
    'Needs migration 043',
  )
  assert.strictEqual(
    migrationNotice({ code: '42703', message: 'column cutout_alt does not exist' }, 'cutout_alt'),
    'Needs migration 044',
  )
  assert.strictEqual(migrationNotice({ code: '42501', message: 'permission denied' }, '043'), null)
})

test('unclassifiable missing schema returns null migration id', () => {
  assert.strictEqual(
    classifyMissingMigration({ code: '42P01', message: 'relation "other_table" does not exist' }),
    null,
  )
})

console.log(`\n${passed} passed`)
