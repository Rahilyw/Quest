'use strict'

/**
 * Schema-fallback helpers for the admin Pilot dashboard.
 * 043 = xp_events (and related). 044 = cutout_alt / stickers tables.
 * Pure CommonJS so a plain Node test can require it.
 */

/**
 * @param {{ code?: string, message?: string } | null | undefined} error
 * @returns {boolean}
 */
function isMissingSchemaError(error) {
  if (!error) return false
  const code = String(error.code ?? '')
  if (code === '42P01' || code === '42703' || code === 'PGRST204' || code === 'PGRST205') {
    return true
  }
  const message = String(error.message ?? '')
  return /does not exist|could not find the (table|column)|schema cache/i.test(message)
}

/**
 * Human copy for a section that cannot load until a migration is applied.
 * @param {'043' | '044' | string} migration
 * @returns {string}
 */
function needsMigrationCopy(migration) {
  return `Needs migration ${migration}`
}

/**
 * Map a missing-schema error to a migration id, using an optional hint from the caller.
 * Returns null when the error is not a missing-schema case (real failures should still throw).
 *
 * @param {{ code?: string, message?: string } | null | undefined} error
 * @param {'xp_events' | 'cutout_alt' | 'stickers' | '043' | '044' | null | undefined} [hint]
 * @returns {'043' | '044' | null}
 */
function classifyMissingMigration(error, hint) {
  if (!isMissingSchemaError(error)) return null
  if (hint === 'xp_events' || hint === '043') return '043'
  if (hint === 'cutout_alt' || hint === 'stickers' || hint === '044') return '044'

  const message = String(error.message ?? '').toLowerCase()
  if (
    message.includes('xp_events') ||
    message.includes('win_back_sends') ||
    message.includes('xp_awarded') ||
    message.includes('xp_reason')
  ) {
    return '043'
  }
  if (
    message.includes('cutout_alt') ||
    message.includes('sticker_placements') ||
    message.includes('stickers') ||
    message.includes('sticker_unlocks')
  ) {
    return '044'
  }
  return null
}

/**
 * @param {{ code?: string, message?: string } | null | undefined} error
 * @param {'xp_events' | 'cutout_alt' | 'stickers' | '043' | '044' | null | undefined} [hint]
 * @returns {string | null} "Needs migration 0xx" or null if this is not a soft schema miss
 */
function migrationNotice(error, hint) {
  const id = classifyMissingMigration(error, hint)
  return id ? needsMigrationCopy(id) : null
}

module.exports = {
  isMissingSchemaError,
  needsMigrationCopy,
  classifyMissingMigration,
  migrationNotice,
}
