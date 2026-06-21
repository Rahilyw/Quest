'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase'

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  unlock_condition: string
}

export interface Quest {
  id: string
  title: string
  description: string
  category: string
  lat: number
  lng: number
  radius_meters: number
  xp_reward: number
  is_sponsored: boolean
  sponsor_name: string | null
  sponsor_reward: string | null
  cover_image_url: string | null
  status: string
  created_at: string
  quest_badges?: { badge_id: string; badge: Badge | null }[]
}

export async function getQuests(): Promise<Quest[]> {
  const { data, error } = await supabaseAdmin
    .from('quests')
    .select('*, quest_badges(badge_id, badge:badges(*))')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data as Quest[]) ?? []
}

export async function getBadges(): Promise<Badge[]> {
  const { data, error } = await supabaseAdmin.from('badges').select('*').order('name')
  if (error) throw new Error(error.message)
  return (data as Badge[]) ?? []
}

export async function createQuest(formData: FormData): Promise<{ ok: true; quest: Quest } | { ok: false; error: string }> {
  try {
    const title = String(formData.get('title') ?? '').trim()
    const description = String(formData.get('description') ?? '').trim()
    const category = String(formData.get('category') ?? 'fitness')
    const lat = parseFloat(String(formData.get('lat') ?? ''))
    const lng = parseFloat(String(formData.get('lng') ?? ''))
    const radius_meters = parseInt(String(formData.get('radius_meters') ?? '300'), 10)
    const xp_reward = parseInt(String(formData.get('xp_reward') ?? '100'), 10)
    const is_sponsored = formData.get('is_sponsored') === 'true'
    const sponsor_name = String(formData.get('sponsor_name') ?? '').trim()
    const sponsor_reward = String(formData.get('sponsor_reward') ?? '').trim()
    const badgeIds = formData.getAll('badge_ids').map(String)
    const coverFile = formData.get('cover') as File | null

    if (!title || !description) {
      return { ok: false, error: 'Title and description are required.' }
    }
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return { ok: false, error: 'Valid latitude and longitude are required.' }
    }
    if (is_sponsored && (!sponsor_name || !sponsor_reward)) {
      return { ok: false, error: 'Sponsor name and reward are required for sponsored quests.' }
    }

    let cover_image_url: string | null = null

    if (coverFile && coverFile.size > 0) {
      const ext = coverFile.name.split('.').pop()?.toLowerCase() || 'jpg'
      const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg'
      const path = `${crypto.randomUUID()}.${safeExt}`
      const buffer = Buffer.from(await coverFile.arrayBuffer())

      const { error: uploadError } = await supabaseAdmin.storage
        .from('quest-covers')
        .upload(path, buffer, { contentType: coverFile.type || 'image/jpeg', upsert: false })

      if (uploadError) {
        return { ok: false, error: `Cover upload failed: ${uploadError.message}` }
      }

      const { data: urlData } = supabaseAdmin.storage.from('quest-covers').getPublicUrl(path)
      cover_image_url = urlData.publicUrl
    }

    const { data: quest, error: insertError } = await supabaseAdmin
      .from('quests')
      .insert({
        title,
        description,
        category,
        lat,
        lng,
        radius_meters,
        xp_reward,
        is_sponsored,
        sponsor_name: is_sponsored ? sponsor_name : null,
        sponsor_reward: is_sponsored ? sponsor_reward : null,
        cover_image_url,
        status: 'active',
      })
      .select('*')
      .single()

    if (insertError || !quest) {
      return { ok: false, error: insertError?.message ?? 'Failed to create quest.' }
    }

    if (badgeIds.length > 0) {
      const rows = badgeIds.map((badge_id) => ({ quest_id: quest.id, badge_id }))
      const { error: badgeError } = await supabaseAdmin.from('quest_badges').insert(rows)
      if (badgeError) {
        return { ok: false, error: `Quest created but badge linking failed: ${badgeError.message}` }
      }
    }

    revalidatePath('/quests')
    revalidatePath('/')

    const full = await supabaseAdmin
      .from('quests')
      .select('*, quest_badges(badge_id, badge:badges(*))')
      .eq('id', quest.id)
      .single()

    return { ok: true, quest: (full.data as Quest) ?? (quest as Quest) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export async function toggleQuestStatus(id: string, current: string): Promise<string> {
  const next = current === 'active' ? 'inactive' : 'active'
  const { error } = await supabaseAdmin.from('quests').update({ status: next }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/quests')
  return next
}
