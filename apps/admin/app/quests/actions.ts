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
  geofence_type: 'none' | 'circle' | 'city'
  city_id: string | null
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

type GeofenceType = 'none' | 'circle' | 'city'

function validateGeofence(input: {
  geofence_type: GeofenceType
  lat: number
  lng: number
  radius_meters: number
  city_id: string | null
}): string | null {
  if (Number.isNaN(input.lat) || Number.isNaN(input.lng)) {
    return 'Valid latitude and longitude are required.'
  }
  switch (input.geofence_type) {
    case 'none':
      return null
    case 'circle':
      if (Number.isNaN(input.radius_meters) || input.radius_meters < 50 || input.radius_meters > 2000) {
        return 'Circle radius must be between 50 and 2000 metres.'
      }
      return null
    case 'city':
      if (!input.city_id) return 'City is required for city-wide geofence.'
      return null
  }
}

export async function createQuest(formData: FormData): Promise<{ ok: true; quest: Quest } | { ok: false; error: string }> {
  try {
    const title = String(formData.get('title') ?? '').trim()
    const description = String(formData.get('description') ?? '').trim()
    const category = String(formData.get('category') ?? 'fitness')
    const lat = parseFloat(String(formData.get('lat') ?? ''))
    const lng = parseFloat(String(formData.get('lng') ?? ''))
    const geofence_type = String(formData.get('geofence_type') ?? 'circle') as GeofenceType
    const city_id = String(formData.get('city_id') ?? '').trim() || null
    let radius_meters = parseInt(String(formData.get('radius_meters') ?? '300'), 10)
    if (geofence_type === 'none') {
      radius_meters = 0
    } else if (geofence_type === 'city') {
      radius_meters = 0
    }
    const xp_reward = parseInt(String(formData.get('xp_reward') ?? '100'), 10)
    const is_sponsored = formData.get('is_sponsored') === 'true'
    const sponsor_name = String(formData.get('sponsor_name') ?? '').trim()
    const sponsor_reward = String(formData.get('sponsor_reward') ?? '').trim()
    const badgeIds = formData.getAll('badge_ids').map(String)
    const coverFile = formData.get('cover') as File | null

    if (!title || !description) {
      return { ok: false, error: 'Title and description are required.' }
    }
    const geofenceError = validateGeofence({ geofence_type, lat, lng, radius_meters, city_id })
    if (geofenceError) return { ok: false, error: geofenceError }
    if (is_sponsored && !sponsor_name) {
      return { ok: false, error: 'Sponsor name is required for sponsored quests.' }
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
        geofence_type,
        city_id,
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

export interface UpdateQuestInput {
  id: string
  title: string
  description: string
  category: string
  lat: number
  lng: number
  radius_meters: number
  geofence_type: 'none' | 'circle' | 'city'
  city_id: string | null
  xp_reward: number
  is_sponsored: boolean
  sponsor_name: string | null
  sponsor_reward: string | null
}

export async function updateQuest(input: UpdateQuestInput): Promise<{ ok: true; quest: Quest } | { ok: false; error: string }> {
  try {
    const { id, title, description, category, lat, lng, radius_meters, geofence_type, city_id, xp_reward, is_sponsored, sponsor_name, sponsor_reward } = input

    if (!title.trim() || !description.trim()) {
      return { ok: false, error: 'Title and description are required.' }
    }
    const geofenceError = validateGeofence({ geofence_type, lat, lng, radius_meters, city_id })
    if (geofenceError) return { ok: false, error: geofenceError }
    if (Number.isNaN(xp_reward) || xp_reward < 25 || xp_reward > 1000) {
      return { ok: false, error: 'XP reward must be between 25 and 1000.' }
    }
    if (is_sponsored && (!sponsor_name?.trim() || !sponsor_reward?.trim())) {
      return { ok: false, error: 'Sponsor name and reward are required for sponsored quests.' }
    }

    const { data: quest, error: updateError } = await supabaseAdmin
      .from('quests')
      .update({
        title: title.trim(),
        description: description.trim(),
        category,
        lat,
        lng,
        radius_meters,
        geofence_type,
        city_id,
        xp_reward,
        is_sponsored,
        sponsor_name: is_sponsored ? (sponsor_name?.trim() ?? null) : null,
        sponsor_reward: is_sponsored ? (sponsor_reward?.trim() ?? null) : null,
      })
      .eq('id', id)
      .select('*, quest_badges(badge_id, badge:badges(*))')
      .single()

    if (updateError || !quest) {
      return { ok: false, error: updateError?.message ?? 'Failed to update quest.' }
    }

    revalidatePath('/quests')
    revalidatePath('/')

    return { ok: true, quest: quest as Quest }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}
