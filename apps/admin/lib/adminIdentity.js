'use strict'

/**
 * Admin access is keyed on an allowlisted email (B-1). Anyone can register that
 * address through the mobile sign-up, so the address alone proves nothing: the
 * account must also have confirmed it. Without this, an allowlisted address that
 * has no account yet, or a project with "Confirm email" off, hands service-role
 * admin to whoever signs up with it first.
 *
 * @param {{ email?: string | null, email_confirmed_at?: string | null } | null | undefined} user
 * @returns {boolean}
 */
function hasConfirmedEmail(user) {
  if (!user || typeof user.email !== 'string' || user.email.trim() === '') return false
  return typeof user.email_confirmed_at === 'string' && user.email_confirmed_at.trim() !== ''
}

module.exports = { hasConfirmedEmail }
