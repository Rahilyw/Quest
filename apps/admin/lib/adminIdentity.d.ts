/** True only when the user has an email and has confirmed it (security review B-1). */
export function hasConfirmedEmail(
  user: { email?: string | null; email_confirmed_at?: string | null } | null | undefined,
): boolean
