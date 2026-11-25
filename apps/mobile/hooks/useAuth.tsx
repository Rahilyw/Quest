import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { identify, resetAnalytics } from '@/lib/analytics'
import { clearPushTokenWithRetry } from '@/lib/notifications'
import { purgeQueue } from '@/lib/submissionQueueStore'
import { ensureUserProfile } from '@/lib/profiles'
import type { UserProfile } from '@/lib/types'

interface AuthContextValue {
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  profileError: string | null
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  /** Survives SIGNED_OUT so we can still clear that user's push token (C-3). */
  const lastUserIdRef = useRef<string | null>(null)

  async function loadProfile(activeSession: Session) {
    const { profile: data, error } = await ensureUserProfile(activeSession)
    setProfile(data)
    setProfileError(error)
    if (data) {
      identify(data.id, {
        city: data.city,
        level: data.level,
        created_at: data.created_at ?? undefined,
      })
    }
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession)
      lastUserIdRef.current = initialSession?.user.id ?? null
      if (initialSession) loadProfile(initialSession)
      else setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      if (nextSession) {
        lastUserIdRef.current = nextSession.user.id
        setLoading(true)
        loadProfile(nextSession)
        return
      }

      // SIGNED_OUT (or any path that clears the session): clear push before we forget the uid.
      const uid = lastUserIdRef.current
      lastUserIdRef.current = null
      setProfile(null)
      setProfileError(null)
      setLoading(false)
      // Any path that clears the session (SIGNED_OUT, expiry, revoke).
      if (uid) {
        void clearPushTokenWithRetry(uid)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function refreshProfile() {
    if (session) {
      setLoading(true)
      await loadProfile(session)
    }
  }

  async function signOut() {
    const uid = session?.user.id ?? lastUserIdRef.current
    if (uid) {
      // Queued proofs belong to this player only (plan Phase 3).
      await purgeQueue(uid)
      await clearPushTokenWithRetry(uid)
    }
    resetAnalytics()
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, profileError, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
