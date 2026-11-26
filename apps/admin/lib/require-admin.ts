import 'server-only'

import { isAdminUser } from '@/lib/admin-auth'
import { createServerClient } from '@/lib/supabase-server'

/**
 * Authorize inside every server action. Server actions are public POST
 * endpoints, so we never rely on middleware alone before touching the
 * service-role client. Returns the admin's email; throws if not an admin.
 */
export async function requireAdmin(): Promise<string> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  // An allowlisted email that the account has confirmed (B-1).
  if (!user?.email || !isAdminUser(user)) {
    throw new Error('Unauthorized')
  }
  return user.email
}
