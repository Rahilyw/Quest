'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase'
import {
  parseRuleConfig,
  summarizeUnlockRule,
  type BadgeArtStyle,
  type BadgeRarity,
  type UnlockRuleType,
} from '@/lib/badge-rules'

export interface BadgeRow {
  id: string
  name: string
  description: string
  icon: string
  icon_url: string | null
  unlock_condition: string
  rarity: BadgeRarity
  art_style: BadgeArtStyle
  locked_hint: string | null
  is_secret: boolean
  art_key: string | null
  unlock_rule_type: UnlockRuleType
  unlock_rule_config: Record<string, unknown>
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BadgeWithStats extends BadgeRow {
  earn_count: number
  quest_link_count: number
}

export interface BadgeEarner {
  user_id: string
  username: string
  earned_at: string
}

function slugifyArtKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

async function uploadBadgeIcon(file: File): Promise<{ url: string } | { error: string }> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(ext) ? ext : 'png'
  const path = `${crypto.randomUUID()}.${safeExt}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabaseAdmin.storage
    .from('badge-icons')
    .upload(path, buffer, { contentType: file.type || 'image/png', upsert: false })

  if (error) return { error: `Icon upload failed: ${error.message}` }

  const { data } = supabaseAdmin.storage.from('badge-icons').getPublicUrl(path)
  return { url: data.publicUrl }
}

function readBadgeFields(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const icon = String(formData.get('icon') ?? '🏅').trim() || '🏅'
  const locked_hint = String(formData.get('locked_hint') ?? '').trim() || null
  const rarity = String(formData.get('rarity') ?? 'common') as BadgeRarity
  const art_style = String(formData.get('art_style') ?? 'medal') as BadgeArtStyle
  const art_key = String(formData.get('art_key') ?? '').trim() || null
  const is_secret = formData.get('is_secret') === 'true'
  const is_active = formData.get('is_active') !== 'false'
  const sort_order = parseInt(String(formData.get('sort_order') ?? '0'), 10) || 0
  const unlock_rule_type = String(formData.get('unlock_rule_type') ?? 'manual') as UnlockRuleType

  const configRaw: Record<string, string> = {}
  for (const [key, value] of Array.from(formData.entries())) {
    if (key.startsWith('rule_')) configRaw[key.slice(5)] = String(value)
  }
  const unlock_rule_config = parseRuleConfig(unlock_rule_type, configRaw)
  const unlock_condition =
    String(formData.get('unlock_condition') ?? '').trim() ||
    summarizeUnlockRule(unlock_rule_type, unlock_rule_config)

  return {
    name,
    description,
    icon,
    locked_hint,
    rarity,
    art_style,
    art_key: art_key || slugifyArtKey(name),
    is_secret,
    is_active,
    sort_order,
    unlock_rule_type,
    unlock_rule_config,
    unlock_condition,
  }
}

export async function getBadgesWithStats(): Promise<BadgeWithStats[]> {
  const { data: badges, error } = await supabaseAdmin
    .from('badges')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)

  const rows = (badges as BadgeRow[]) ?? []
  if (rows.length === 0) return []

  const ids = rows.map((b) => b.id)

  const [{ data: earnCounts }, { data: questLinks }] = await Promise.all([
    supabaseAdmin.from('user_badges').select('badge_id').in('badge_id', ids),
    supabaseAdmin.from('quest_badges').select('badge_id').in('badge_id', ids),
  ])

  const earnMap = new Map<string, number>()
  for (const row of earnCounts ?? []) {
    earnMap.set(row.badge_id, (earnMap.get(row.badge_id) ?? 0) + 1)
  }
  const questMap = new Map<string, number>()
  for (const row of questLinks ?? []) {
    questMap.set(row.badge_id, (questMap.get(row.badge_id) ?? 0) + 1)
  }

  return rows.map((b) => ({
    ...b,
    unlock_rule_config: (b.unlock_rule_config as Record<string, unknown>) ?? {},
    earn_count: earnMap.get(b.id) ?? 0,
    quest_link_count: questMap.get(b.id) ?? 0,
  }))
}

export async function getBadge(id: string): Promise<BadgeWithStats | null> {
  const list = await getBadgesWithStats()
  return list.find((b) => b.id === id) ?? null
}

export async function getBadgeEarners(badgeId: string, limit = 25): Promise<BadgeEarner[]> {
  const { data, error } = await supabaseAdmin
    .from('user_badges')
    .select('user_id, earned_at, profile:profiles(username)')
    .eq('badge_id', badgeId)
    .order('earned_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => ({
    user_id: row.user_id,
    username: (row.profile as { username?: string } | null)?.username ?? 'unknown',
    earned_at: row.earned_at,
  }))
}

export async function searchUsers(query: string): Promise<{ id: string; username: string }[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, username')
    .ilike('username', `%${q}%`)
    .order('username')
    .limit(12)

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createBadge(
  formData: FormData
): Promise<{ ok: true; badge: BadgeRow } | { ok: false; error: string }> {
  try {
    const fields = readBadgeFields(formData)
    if (!fields.name || !fields.description) {
      return { ok: false, error: 'Name and description are required.' }
    }

    const iconFile = formData.get('icon_file') as File | null
    let icon_url: string | null = null
    if (iconFile && iconFile.size > 0) {
      const uploaded = await uploadBadgeIcon(iconFile)
      if ('error' in uploaded) return { ok: false, error: uploaded.error }
      icon_url = uploaded.url
    }

    const { data, error } = await supabaseAdmin
      .from('badges')
      .insert({ ...fields, icon_url, updated_at: new Date().toISOString() })
      .select('*')
      .single()

    if (error || !data) {
      return { ok: false, error: error?.message ?? 'Failed to create badge.' }
    }

    revalidatePath('/badges')
    return { ok: true, badge: data as BadgeRow }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export async function updateBadge(
  id: string,
  formData: FormData
): Promise<{ ok: true; badge: BadgeRow } | { ok: false; error: string }> {
  try {
    const fields = readBadgeFields(formData)
    if (!fields.name || !fields.description) {
      return { ok: false, error: 'Name and description are required.' }
    }

    const removeIcon = formData.get('remove_icon') === 'true'
    const iconFile = formData.get('icon_file') as File | null
    let icon_url: string | null | undefined

    if (removeIcon) icon_url = null
    if (iconFile && iconFile.size > 0) {
      const uploaded = await uploadBadgeIcon(iconFile)
      if ('error' in uploaded) return { ok: false, error: uploaded.error }
      icon_url = uploaded.url
    }

    const patch: Record<string, unknown> = {
      ...fields,
      updated_at: new Date().toISOString(),
    }
    if (icon_url !== undefined) patch.icon_url = icon_url

    const { data, error } = await supabaseAdmin
      .from('badges')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()

    if (error || !data) {
      return { ok: false, error: error?.message ?? 'Failed to update badge.' }
    }

    revalidatePath('/badges')
    revalidatePath(`/badges/${id}`)
    return { ok: true, badge: data as BadgeRow }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export async function deleteBadge(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabaseAdmin.from('badges').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/badges')
  return { ok: true }
}

export async function grantBadge(
  badgeId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabaseAdmin
    .from('user_badges')
    .upsert({ user_id: userId, badge_id: badgeId }, { onConflict: 'user_id,badge_id' })

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/badges/${badgeId}`)
  return { ok: true }
}

export async function revokeBadge(
  badgeId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabaseAdmin
    .from('user_badges')
    .delete()
    .eq('badge_id', badgeId)
    .eq('user_id', userId)

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/badges/${badgeId}`)
  return { ok: true }
}
