import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Linking from 'expo-linking'
import { decideAuthDeepLinkAction, parseAuthParams } from '@/lib/authLinkingGuard'
import { supabase } from '@/lib/supabase'

const PENDING_AUTH_KEY = 'quest.pendingAuthFlow'

export type PendingAuthFlow = 'recovery' | 'signin'

export function passwordResetRedirectUrl(): string {
  return Linking.createURL('reset-password')
}

/** Call before resetPasswordForEmail / signInWithOtp so the return link is accepted. */
export async function markPendingAuthFlow(kind: PendingAuthFlow): Promise<void> {
  await AsyncStorage.setItem(PENDING_AUTH_KEY, kind)
}

export async function clearPendingAuthFlow(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_AUTH_KEY)
}

async function readPendingAuthFlow(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PENDING_AUTH_KEY)
  } catch {
    return null
  }
}

/**
 * Apply session tokens from a deep link only when this device started the flow
 * and there is no live session (C-2). Returns the kind, or null if ignored.
 */
export async function handleAuthDeepLink(url: string): Promise<'recovery' | 'session' | null> {
  const params = parseAuthParams(url)
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const pendingFlow = await readPendingAuthFlow()
  const action = decideAuthDeepLinkAction({
    hasLiveSession: !!session,
    pendingFlow,
    params,
  })
  if (action === 'ignore' || !params) return null

  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code)
    if (error) throw error
  } else {
    const { error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token ?? '',
    })
    if (error) throw error
  }

  await clearPendingAuthFlow()
  return params.type === 'recovery' || pendingFlow === 'recovery' ? 'recovery' : 'session'
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

export { decideAuthDeepLinkAction, parseAuthParams }
