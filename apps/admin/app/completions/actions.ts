'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { COMPLETION_COLUMNS, clampCompletionsLimit } from '@/lib/adminRules'

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
  /** XP this completion paid (043). Replaces quests.xp_reward, which can change later. */
  xp_awarded: number
  xp_reason: string | null
  profiles: { username: string } | null
  quests: { title: string; is_sponsored: boolean; geofence_type: string } | null
}

export async function getRecentCompletions(limit = 100): Promise<Completion[]> {
  await requireAdmin()
  const { data } = await supabaseAdmin
    .from('completions')
    .select(`${COMPLETION_COLUMNS.join(', ')}, profiles(username), quests(title, is_sponsored, geofence_type)`)
    .in('status', ['approved', 'removed'])
    .order('completed_at', { ascending: false })
    .limit(clampCompletionsLimit(limit))

  // The column list is built at runtime, so the generated types can't parse it.
  return (data as unknown as Completion[] | null) ?? []
}

export async function removeCompletion(id: string): Promise<void> {
  await requireAdmin()
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
