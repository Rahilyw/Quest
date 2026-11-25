'use strict'

/**
 * Dark-launch probe for migration 045 (duo quests).
 * When `quests.min_party_size` is not readable, every duo path must stay
 * inert so an OTA build on a database without 045 behaves like build-2.
 */

/**
 * @param {{ message?: string, code?: string, details?: string, hint?: string } | null | undefined} error
 * @returns {boolean} true when the probe proves 045 is present
 */
function interpretDuoProbeError(error) {
  if (!error) return true
  const blob = [error.message, error.details, error.hint, error.code]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  // Column missing, schema cache miss, or PostgREST unknown column.
  if (
    blob.includes('min_party_size') ||
    blob.includes('does not exist') ||
    blob.includes('could not find') ||
    blob.includes('pgrst204') ||
    blob.includes('42703')
  ) {
    return false
  }
  // Any other error: treat as unavailable so we never call party RPCs blindly.
  return false
}

/**
 * One-shot schema probe. Callers should cache the result for the process.
 * @param {{ from: (table: string) => { select: (cols: string) => { limit: (n: number) => Promise<{ error: unknown }> } } }} client
 * @returns {Promise<boolean>}
 */
async function probeDuoAvailable(client) {
  try {
    const { error } = await client.from('quests').select('min_party_size').limit(1)
    return interpretDuoProbeError(error)
  } catch {
    return false
  }
}

module.exports = {
  interpretDuoProbeError,
  probeDuoAvailable,
}
