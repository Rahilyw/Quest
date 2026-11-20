'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'

export interface SuggestionRow {
  id: string
  user_id: string
  title: string
  description: string
  category: string
  lat: number | null
  lng: number | null
  status: 'submitted' | 'accepted' | 'rejected'
  admin_notes: string | null
  quest_id: string | null
  created_at: string
  username: string
}

export async function getSuggestionPrefill(id: string): Promise<{
  title: string
  description: string
  category: string
  lat: number | null
  lng: number | null
} | null> {
  await requireAdmin()
  const { data, error } = await supabaseAdmin
    .from('quest_suggestions')
    .select('title, description, category, lat, lng, status')
    .eq('id', id)
    .maybeSingle()
  if (error || !data || data.status !== 'submitted') return null
  return {
    title: data.title,
    description: data.description,
    category: data.category,
    lat: data.lat,
    lng: data.lng,
  }
}

export async function listSuggestionQueue(): Promise<SuggestionRow[]> {
  await requireAdmin()
  const { data, error } = await supabaseAdmin
    .from('quest_suggestions')
    .select('id, user_id, title, description, category, lat, lng, status, admin_notes, quest_id, created_at, profile:profiles(username)')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const rows = ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const profile = row.profile as { username: string } | { username: string }[] | null
    const username = Array.isArray(profile) ? profile[0]?.username : profile?.username
    return {
      id: String(row.id),
      user_id: String(row.user_id),
      title: String(row.title),
      description: String(row.description),
      category: String(row.category),
      lat: row.lat == null ? null : Number(row.lat),
      lng: row.lng == null ? null : Number(row.lng),
      status: row.status as SuggestionRow['status'],
      admin_notes: (row.admin_notes as string | null) ?? null,
      quest_id: (row.quest_id as string | null) ?? null,
      created_at: String(row.created_at),
      username: username ?? 'player',
    }
  })

  const rank = { submitted: 0, accepted: 1, rejected: 2 }
  rows.sort((a, b) => rank[a.status] - rank[b.status] || b.created_at.localeCompare(a.created_at))
  return rows
}

export async function listActiveQuestPins(): Promise<{ id: string; title: string; lat: number; lng: number }[]> {
  await requireAdmin()
  const { data, error } = await supabaseAdmin
    .from('quests')
    .select('id, title, lat, lng, status')
    .eq('status', 'active')
  if (error) throw new Error(error.message)
  return ((data ?? []) as { id: string; title: string; lat: number; lng: number }[]).filter(
    (quest) => Number.isFinite(quest.lat) && Number.isFinite(quest.lng),
  )
}

export async function rejectSuggestion(
  id: string,
  note: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin()
  const trimmed = note.trim()
  if (trimmed.length > 500) return { ok: false, error: 'Note must be 500 characters or fewer.' }

  const { data, error } = await supabaseAdmin
    .from('quest_suggestions')
    .update({ status: 'rejected', admin_notes: trimmed || null })
    .eq('id', id)
    .eq('status', 'submitted')
    .select('id')
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: false, error: 'That idea is no longer waiting for review.' }
  revalidatePath('/suggestions')
  return { ok: true }
}
