export function getAdminAllowlist(): string[] {
  const raw = process.env.ADMIN_ALLOWED_EMAILS ?? ''
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false

  const allowlist = getAdminAllowlist()

  if (allowlist.length === 0) {
    // An empty allowlist denies everyone, in every environment. The only
    // escape hatch is an explicit local opt-in, which production ignores.
    if (
      process.env.ADMIN_DEV_ALLOW_ALL === '1' &&
      process.env.NODE_ENV !== 'production'
    ) {
      console.warn(
        '[admin-auth] ADMIN_ALLOWED_EMAILS is empty and ADMIN_DEV_ALLOW_ALL=1. Allowing all emails (local dev only).'
      )
      return true
    }
    return false
  }

  return allowlist.includes(email.toLowerCase())
}
