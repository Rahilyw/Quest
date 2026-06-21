import * as Linking from 'expo-linking'
import { supabase } from '@/lib/supabase'

/** Parse access tokens from a Supabase auth redirect (quest://…#access_token=…). */
function parseAuthParams(url: string): Record<string, string> | null {
  const hash = url.includes('#') ? url.split('#')[1] : url.split('?')[1]
  if (!hash) return null
  return Object.fromEntries(new URLSearchParams(hash))
}

export function passwordResetRedirectUrl(): string {
  return Linking.createURL('reset-password')
}

/** Apply session tokens from a deep link; returns true if this was a recovery link. */
export async function handleAuthDeepLink(url: string): Promise<'recovery' | 'session' | null> {
  const params = parseAuthParams(url)
  if (!params?.access_token) return null

  const { error } = await supabase.auth.setSession({
    access_token: params.access_token,
    refresh_token: params.refresh_token ?? '',
  })
  if (error) throw error

  return params.type === 'recovery' ? 'recovery' : 'session'
}

export function subscribeToAuthDeepLinks(onRecovery: () => void) {
  async function handle(url: string | null) {
    if (!url) return
    try {
      const kind = await handleAuthDeepLink(url)
      if (kind === 'recovery') onRecovery()
    } catch {
      // Ignore malformed or expired links
    }
  }

  Linking.getInitialURL().then(handle)
  const sub = Linking.addEventListener('url', ({ url }) => handle(url))
  return () => sub.remove()
}
