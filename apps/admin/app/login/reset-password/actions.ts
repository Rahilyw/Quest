'use server'

import { createServerClient } from '@/lib/supabase-server'

export async function checkRecoverySession(): Promise<{ ready: true } | { error: string }> {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { error: 'Reset link is invalid or expired. Request a new one from the login page.' }
  }
  return { ready: true }
}

export async function establishSessionFromTokens(
  accessToken: string,
  refreshToken: string
): Promise<{ ready: true } | { error: string }> {
  if (!accessToken) {
    return { error: 'Reset link is invalid or expired. Request a new one from the login page.' }
  }

  const supabase = await createServerClient()
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  if (error) return { error: error.message }
  return { ready: true }
}

export async function updatePassword(password: string): Promise<{ ok: true } | { error: string }> {
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters' }
  }

  const supabase = await createServerClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Your reset session expired. Request a new link from the login page.' }
  }

  const { error: updateError } = await supabase.auth.updateUser({ password })
  await supabase.auth.signOut()

  if (updateError) return { error: updateError.message }
  return { ok: true }
}
