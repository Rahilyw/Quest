import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { clearPushToken } from '@/lib/notifications'
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

  async function loadProfile(activeSession: Session) {
    const { profile: data, error } = await ensureUserProfile(activeSession)
    setProfile(data)
    setProfileError(error)
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession)
      if (initialSession) loadProfile(initialSession)
      else setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (nextSession) {
        setLoading(true)
        loadProfile(nextSession)
      } else {
        setProfile(null)
        setProfileError(null)
        setLoading(false)
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
    if (session?.user.id) {
      await clearPushToken(session.user.id)
    }
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
