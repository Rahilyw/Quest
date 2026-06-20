'use server'

import { invokeEdgeFunction } from '@/lib/invoke-edge-function'
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
  quests: { title: string; xp_reward: number; is_sponsored: boolean } | null
}

export async function getPendingCompletions(): Promise<Completion[]> {
  const { data } = await supabaseAdmin
    .from('completions')
    .select('*, profiles(username), quests(title, xp_reward, is_sponsored)')
    .eq('status', 'pending')
    .order('completed_at', { ascending: true })

  return (data as Completion[]) ?? []
}

export async function updateCompletionStatus(
  id: string,
  status: 'approved' | 'rejected',
  isSponsored: boolean,
) {
  const { error } = await supabaseAdmin
    .from('completions')
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)

  if (status === 'approved') {
    try {
      await invokeEdgeFunction('award-xp', { completion_id: id })
    } catch (err) {
      console.error('[award-xp] failed for completion', id, err)
    }

    if (isSponsored) {
      try {
        await invokeEdgeFunction('generate-redemption-code', { completion_id: id, action: 'generate' })
      } catch (err) {
        console.error('[generate-redemption-code] failed for completion', id, err)
      }
    }
  }
}
