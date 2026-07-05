'use server'

import { supabaseAdmin } from '@/lib/supabase'

export interface Completion {
  id: string
  photo_url: string
  lat: number
  lng: number
  completed_at: string
  status: string
  user_id: string
  quest_id: string
  redemption_code: string | null
  profiles: { username: string } | null
  quests: { title: string; xp_reward: number; is_sponsored: boolean; geofence_type: string } | null
}

export async function getRecentCompletions(limit = 100): Promise<Completion[]> {
  const { data } = await supabaseAdmin
    .from('completions')
    .select('*, profiles(username), quests(title, xp_reward, is_sponsored, geofence_type)')
    .in('status', ['approved', 'removed'])
    .order('completed_at', { ascending: false })
    .limit(limit)

  return (data as Completion[]) ?? []
}

export async function removeCompletion(id: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('completions')
    .select('status')
    .eq('id', id)
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Completion not found')
  }

  if (data.status === 'removed') {
    return
  }

  if (data.status !== 'approved') {
    throw new Error('Only approved completions can be removed')
  }

  const { error: updateError } = await supabaseAdmin
    .from('completions')
    .update({ status: 'removed', reviewed_at: new Date().toISOString() })
    .eq('id', id)

  if (updateError) throw new Error(updateError.message)
}
