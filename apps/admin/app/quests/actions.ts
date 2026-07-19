'use server'

import { revalidatePath } from 'next/cache'
import { validatePolygonRing } from '@quest/geofence'
import { supabaseAdmin } from '@/lib/supabase'

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  unlock_condition: string
}

export interface QuestGeofenceRow {
  id: string
  quest_id: string
  label: string
  shape: 'circle' | 'polygon'
  lat: number | null
  lng: number | null
  radius_meters: number | null
  boundary_geojson: { type: 'Polygon'; coordinates: number[][][] } | null
  sort_order: number
}

export interface Quest {
  id: string
  title: string
  description: string
  category: string
  lat: number
  lng: number
  radius_meters: number
  geofence_type: 'none' | 'circle' | 'city' | 'polygon' | 'multi'
  city_id: string | null
  /** GeoJSON Polygon from the generated boundary_geojson column; read-only. */
  boundary_geojson: { type: 'Polygon'; coordinates: number[][][] } | null
  xp_reward: number
  is_sponsored: boolean
  sponsor_name: string | null
  sponsor_reward: string | null
  cover_image_url: string | null
  status: string
  created_at: string
  quest_badges?: { badge_id: string; badge: Badge | null }[]
  quest_geofences?: QuestGeofenceRow[]
}

const QUEST_SELECT =
  '*, quest_badges(badge_id, badge:badges(*)), quest_geofences(id, quest_id, label, shape, lat, lng, radius_meters, boundary_geojson, sort_order)'

export async function getQuests(): Promise<Quest[]> {
  const { data, error } = await supabaseAdmin
    .from('quests')
    .select(QUEST_SELECT)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  const quests = (data as Quest[]) ?? []
  for (const q of quests) {
    if (q.quest_geofences) {
      q.quest_geofences.sort((a, b) => a.sort_order - b.sort_order)
    }
  }
  return quests
}

export async function getBadges(): Promise<Badge[]> {
  const { data, error } = await supabaseAdmin.from('badges').select('*').order('name')
  if (error) throw new Error(error.message)
  return (data as Badge[]) ?? []
}

type GeofenceType = 'none' | 'circle' | 'city' | 'polygon' | 'multi'

export type MultiAreaPayload = {
  shape: 'circle' | 'polygon'
  label: string
  lat?: number | null
  lng?: number | null
  radius_meters?: number | null
  boundary?: { type: 'Polygon'; coordinates: number[][][] } | null
}

/**
 * Parse a boundary_geojson form value into a validated GeoJSON Polygon.
 * Returns { geojson } on success or { error } on any problem.
 */
function parseBoundaryGeojson(
  raw: string | null
): { geojson: { type: 'Polygon'; coordinates: number[][][] } } | { error: string } {
  if (!raw) return { error: 'Draw the quest zone on the map first.' }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { error: 'Quest zone data is malformed — redraw the shape.' }
  }
  const geojson = parsed as { type?: string; coordinates?: number[][][] }
  if (geojson?.type !== 'Polygon' || !Array.isArray(geojson.coordinates)) {
    return { error: 'Quest zone must be a polygon — redraw the shape.' }
  }
  const validation = validatePolygonRing(geojson.coordinates[0])
  if (!validation.ok) return { error: validation.error }
  return { geojson: { type: 'Polygon', coordinates: [validation.ring] } }
}

function validateMultiAreasPayload(areas: MultiAreaPayload[] | null | undefined): string | null {
  if (!areas || areas.length < 1) return 'Add at least one completion area.'
  for (let i = 0; i < areas.length; i++) {
    const a = areas[i]
    const name = a.label?.trim() || `Area ${i + 1}`
    if (a.shape === 'circle') {
      if (a.lat == null || a.lng == null || Number.isNaN(a.lat) || Number.isNaN(a.lng)) {
        return `${name}: missing coordinates.`
      }
      const r = a.radius_meters ?? 0
      if (r < 50 || r > 2000) return `${name}: radius must be 50–2000 m.`
    } else if (a.shape === 'polygon') {
      if (!a.boundary?.coordinates?.[0]) return `${name}: draw the zone first.`
      const v = validatePolygonRing(a.boundary.coordinates[0])
      if (!v.ok) return `${name}: ${v.error}`
    } else {
      return `${name}: unknown shape.`
    }
  }
  return null
}

function validateGeofence(input: {
  geofence_type: GeofenceType
  lat: number
  lng: number
  radius_meters: number
  city_id: string | null
  boundary_geojson?: string | null
  multi_areas?: MultiAreaPayload[] | null
}): string | null {
  if (input.geofence_type !== 'multi' && (Number.isNaN(input.lat) || Number.isNaN(input.lng))) {
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
    case 'polygon': {
      const result = parseBoundaryGeojson(input.boundary_geojson ?? null)
      return 'error' in result ? result.error : null
    }
    case 'multi':
      return validateMultiAreasPayload(input.multi_areas)
  }
}

async function applyMultiAreas(
  questId: string,
  areas: MultiAreaPayload[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabaseAdmin.rpc('replace_quest_geofences', {
    p_quest_id: questId,
    p_areas: areas,
  })
  if (error) return { ok: false, error: `Multi-area save failed: ${error.message}` }
  return { ok: true }
}

async function clearMultiAreas(questId: string) {
  await supabaseAdmin.from('quest_geofences').delete().eq('quest_id', questId)
}

async function uploadQuestCover(
  coverFile: File
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!coverFile.size) return { ok: false, error: 'Cover file is empty.' }
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
  return { ok: true, url: urlData.publicUrl }
}

/** Best-effort cleanup of a previous cover object in the quest-covers bucket. */
async function deleteQuestCoverIfOwned(url: string | null | undefined) {
  if (!url) return
  try {
    const marker = '/quest-covers/'
    const idx = url.indexOf(marker)
    if (idx === -1) return
    const path = decodeURIComponent(url.slice(idx + marker.length).split('?')[0] ?? '')
    if (!path || path.includes('..')) return
    await supabaseAdmin.storage.from('quest-covers').remove([path])
  } catch {
    // Non-fatal — DB URL update still proceeds.
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
    const boundary_geojson = String(formData.get('boundary_geojson') ?? '').trim() || null
    let radius_meters = parseInt(String(formData.get('radius_meters') ?? '300'), 10)
    if (geofence_type !== 'circle') {
      radius_meters = 0
    }
    let multi_areas: MultiAreaPayload[] | null = null
    const multiRaw = String(formData.get('multi_areas') ?? '').trim()
    if (multiRaw) {
      try {
        multi_areas = JSON.parse(multiRaw) as MultiAreaPayload[]
      } catch {
        return { ok: false, error: 'Multi-area data is malformed.' }
      }
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
    const geofenceError = validateGeofence({
      geofence_type,
      lat,
      lng,
      radius_meters,
      city_id,
      boundary_geojson,
      multi_areas,
    })
    if (geofenceError) return { ok: false, error: geofenceError }
    if (is_sponsored && !sponsor_name) {
      return { ok: false, error: 'Sponsor name is required for sponsored quests.' }
    }

    let cover_image_url: string | null = null

    if (coverFile && coverFile.size > 0) {
      const uploaded = await uploadQuestCover(coverFile)
      if (!uploaded.ok) return uploaded
      cover_image_url = uploaded.url
    }

    // For multi, use first area as provisional pin; RPC overwrites lat/lng.
    let insertLat = lat
    let insertLng = lng
    if (geofence_type === 'multi' && multi_areas?.[0]) {
      const first = multi_areas[0]
      if (first.lat != null && first.lng != null) {
        insertLat = first.lat
        insertLng = first.lng
      }
    }

    const { data: quest, error: insertError } = await supabaseAdmin
      .from('quests')
      .insert({
        title,
        description,
        category,
        lat: insertLat,
        lng: insertLng,
        radius_meters,
        geofence_type,
        city_id: geofence_type === 'city' ? city_id : null,
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

    if (geofence_type === 'polygon') {
      // Boundary is written through the validated RPC (migration 015). If it
      // fails, remove the just-created quest so no broken polygon quest lives.
      const parsed = parseBoundaryGeojson(boundary_geojson)
      if ('error' in parsed) {
        await supabaseAdmin.from('quests').delete().eq('id', quest.id)
        return { ok: false, error: parsed.error }
      }
      const { error: boundaryError } = await supabaseAdmin.rpc('set_quest_boundary', {
        p_quest_id: quest.id,
        p_geojson: parsed.geojson,
      })
      if (boundaryError) {
        await supabaseAdmin.from('quests').delete().eq('id', quest.id)
        return { ok: false, error: `Quest zone rejected: ${boundaryError.message}` }
      }
    }

    if (geofence_type === 'multi' && multi_areas) {
      const applied = await applyMultiAreas(quest.id, multi_areas)
      if (!applied.ok) {
        await supabaseAdmin.from('quests').delete().eq('id', quest.id)
        return applied
      }
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
      .select(QUEST_SELECT)
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
  geofence_type: 'none' | 'circle' | 'city' | 'polygon' | 'multi'
  city_id: string | null
  /** Stringified GeoJSON Polygon; required when geofence_type is 'polygon'. */
  boundary_geojson: string | null
  xp_reward: number
  is_sponsored: boolean
  sponsor_name: string | null
  sponsor_reward: string | null
  /** Clear cover_image_url when true and no new cover is provided. */
  remove_cover?: boolean
  /** Child areas when geofence_type is multi */
  multi_areas?: MultiAreaPayload[] | null
}

export async function updateQuest(
  input: UpdateQuestInput,
  /** Optional new cover file (cropped JPEG/PNG/WebP). Passed separately so Next can serialize File. */
  cover: File | null = null
): Promise<{ ok: true; quest: Quest } | { ok: false; error: string }> {
  try {
    const {
      id,
      title,
      description,
      category,
      lat,
      lng,
      radius_meters,
      geofence_type,
      city_id,
      boundary_geojson,
      xp_reward,
      is_sponsored,
      sponsor_name,
      sponsor_reward,
      remove_cover,
      multi_areas,
    } = input

    if (!title.trim() || !description.trim()) {
      return { ok: false, error: 'Title and description are required.' }
    }
    const geofenceError = validateGeofence({
      geofence_type,
      lat,
      lng,
      radius_meters,
      city_id,
      boundary_geojson,
      multi_areas,
    })
    if (geofenceError) return { ok: false, error: geofenceError }
    if (Number.isNaN(xp_reward) || xp_reward < 25 || xp_reward > 1000) {
      return { ok: false, error: 'XP reward must be between 25 and 1000.' }
    }
    if (is_sponsored && (!sponsor_name?.trim() || !sponsor_reward?.trim())) {
      return { ok: false, error: 'Sponsor name and reward are required for sponsored quests.' }
    }

    const { data: existing } = await supabaseAdmin
      .from('quests')
      .select('cover_image_url')
      .eq('id', id)
      .single()

    let coverPatch: { cover_image_url: string | null } | Record<string, never> = {}
    if (cover && cover.size > 0) {
      const uploaded = await uploadQuestCover(cover)
      if (!uploaded.ok) return uploaded
      coverPatch = { cover_image_url: uploaded.url }
      await deleteQuestCoverIfOwned(existing?.cover_image_url)
    } else if (remove_cover) {
      coverPatch = { cover_image_url: null }
      await deleteQuestCoverIfOwned(existing?.cover_image_url)
    }

    let updateLat = lat
    let updateLng = lng
    if (geofence_type === 'multi' && multi_areas?.[0]) {
      const first = multi_areas[0]
      if (first.lat != null && first.lng != null) {
        updateLat = first.lat
        updateLng = first.lng
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from('quests')
      .update({
        title: title.trim(),
        description: description.trim(),
        category,
        lat: updateLat,
        lng: updateLng,
        radius_meters: geofence_type === 'circle' ? radius_meters : 0,
        geofence_type,
        city_id: geofence_type === 'city' ? city_id : null,
        // Leaving polygon: drop the boundary in the same statement so the
        // quests_boundary_type_check constraint stays satisfied.
        ...(geofence_type !== 'polygon' ? { boundary: null } : {}),
        xp_reward,
        is_sponsored,
        sponsor_name: is_sponsored ? (sponsor_name?.trim() ?? null) : null,
        sponsor_reward: is_sponsored ? (sponsor_reward?.trim() ?? null) : null,
        ...coverPatch,
      })
      .eq('id', id)

    if (updateError) {
      return { ok: false, error: updateError.message }
    }

    if (geofence_type === 'polygon') {
      const parsed = parseBoundaryGeojson(boundary_geojson)
      if ('error' in parsed) return { ok: false, error: parsed.error }
      const { error: boundaryError } = await supabaseAdmin.rpc('set_quest_boundary', {
        p_quest_id: id,
        p_geojson: parsed.geojson,
      })
      if (boundaryError) {
        return { ok: false, error: `Quest zone rejected: ${boundaryError.message}` }
      }
    }

    if (geofence_type === 'multi' && multi_areas) {
      const applied = await applyMultiAreas(id, multi_areas)
      if (!applied.ok) return applied
    } else {
      await clearMultiAreas(id)
    }

    const { data: quest, error: fetchError } = await supabaseAdmin
      .from('quests')
      .select(QUEST_SELECT)
      .eq('id', id)
      .single()

    if (fetchError || !quest) {
      return { ok: false, error: fetchError?.message ?? 'Failed to update quest.' }
    }

    revalidatePath('/quests')
    revalidatePath('/')

    return { ok: true, quest: quest as Quest }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}
