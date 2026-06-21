import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getOnboardingCity } from '@/lib/onboarding'
import type { UserProfile } from '@/lib/types'

const USERNAME_RE = /^[a-z0-9_]{3,20}$/

function sanitizeUsername(raw: string): string {
  const cleaned = raw.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
  if (cleaned.length >= 3) return cleaned.slice(0, 20)
  return `player_${raw.replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'quest'}`.slice(0, 20)
}

function deriveUsername(session: Session): string {
  const meta = session.user.user_metadata?.username
  if (typeof meta === 'string' && USERNAME_RE.test(meta.toLowerCase())) {
    return meta.toLowerCase()
  }

  const email = session.user.email
  if (email) {
    const fromEmail = sanitizeUsername(email.split('@')[0] ?? '')
    if (USERNAME_RE.test(fromEmail)) return fromEmail
  }

  const fromId = sanitizeUsername(session.user.id.replace(/-/g, '').slice(0, 12))
  return USERNAME_RE.test(fromId) ? fromId : `player_${session.user.id.replace(/-/g, '').slice(0, 8)}`
}

async function createProfile(userId: string, session: Session): Promise<UserProfile | null> {
  const city = await getOnboardingCity()
  let username = deriveUsername(session)

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? username : `${username.slice(0, 14)}_${attempt}`
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        username: candidate,
        city,
        total_xp: 0,
        level: 1,
      })
      .select('*')
      .single()

    if (!error && data) return data
    if (error?.code !== '23505') break
    username = candidate
  }

  return null
}

/** Load the user's profile, creating one if missing (e.g. after sign-up without a profile row). */
export async function ensureUserProfile(session: Session): Promise<{
  profile: UserProfile | null
  error: string | null
}> {
  const userId = session.user.id

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    return { profile: null, error: error.message }
  }

  if (data) {
    return { profile: data, error: null }
  }

  const created = await createProfile(userId, session)
  if (created) {
    return { profile: created, error: null }
  }

  const { data: retry, error: retryError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (retry) {
    return { profile: retry, error: null }
  }

  return {
    profile: null,
    error: retryError?.message ?? 'Could not create your profile. Try again or contact support.',
  }
}
