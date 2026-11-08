/**
 * Treats unset, blank, and template placeholder values (e.g. "REPLACE_WITH_…",
 * "phc_your_key_here") as missing, so an SDK stays a no-op instead of
 * initialising with junk credentials.
 */
export function publicKey(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  if (/^REPLACE_/i.test(trimmed) || /your[-_]?(key|dsn)/i.test(trimmed)) return undefined
  return trimmed
}
