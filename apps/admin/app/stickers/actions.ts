'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { processAndStoreSticker, removeStoredSticker, validateAltText } from '@/lib/sticker-storage'

export type UnlockRule = 'quest' | 'badge' | 'season' | 'manual'

export interface StickerRow {
  id: string
  quest_id: string | null
  image_url: string
  alt_text: string
  unlock_rule: UnlockRule
  unlock_badge_id: string | null
  unlock_season: string | null
  unlock_hint: string | null
  is_active: boolean
  created_at: string
  quest?: { title: string; category: string } | null
  badge?: { name: string } | null
  earned_count?: number
}

export interface StickerLibrary {
  stickers: StickerRow[]
  badges: { id: string; name: string }[]
  /** Set when migration 041 has not been applied to this database. */
  missingMigration: boolean
}

export async function getStickerLibrary(): Promise<StickerLibrary> {
  await requireAdmin()
  const [{ data, error }, { data: badges }] = await Promise.all([
    supabaseAdmin
      .from('stickers')
      .select('*, quest:quests(title, category), badge:badges(name), user_stickers(count)')
      .order('created_at', { ascending: false }),
    supabaseAdmin.from('badges').select('id, name').order('name'),
  ])
  if (error) {
    return { stickers: [], badges: badges ?? [], missingMigration: /stickers/.test(error.message) }
  }
  const stickers = (data ?? []).map((row) => {
    const { user_stickers, ...rest } = row as StickerRow & { user_stickers?: { count: number }[] }
    return { ...rest, earned_count: user_stickers?.[0]?.count ?? 0 }
  })
  return { stickers, badges: badges ?? [], missingMigration: false }
}

type Result = { ok: true } | { ok: false; error: string }

function readUnlock(formData: FormData):
  | { ok: true; rule: Exclude<UnlockRule, 'quest'>; badgeId: string | null; season: string | null; hint: string | null }
  | { ok: false; error: string } {
  const rule = String(formData.get('unlock_rule') ?? 'manual') as UnlockRule
  const hint = String(formData.get('unlock_hint') ?? '').trim() || null
  if (rule === 'badge') {
    const badgeId = String(formData.get('unlock_badge_id') ?? '')
    if (!badgeId) return { ok: false, error: 'Pick the badge that unlocks this sticker.' }
    return { ok: true, rule, badgeId, season: null, hint }
  }
  if (rule === 'season') {
    const season = String(formData.get('unlock_season') ?? '').trim()
    if (!season) return { ok: false, error: 'Name the season, e.g. "Winter 2026".' }
    return { ok: true, rule, badgeId: null, season, hint }
  }
  if (rule === 'manual') return { ok: true, rule, badgeId: null, season: null, hint }
  return { ok: false, error: 'Quest stickers are added on the quest’s page.' }
}

/** Upload a library sticker (seasonal, landmark, badge unlock). */
export async function createLibrarySticker(formData: FormData): Promise<Result & { warnings?: string[] }> {
  await requireAdmin()
  const alt = validateAltText(formData.get('alt'))
  if (!alt.ok) return alt
  const unlock = readUnlock(formData)
  if (!unlock.ok) return unlock
  const photo = formData.get('photo')
  if (!(photo instanceof File) || photo.size === 0) return { ok: false, error: 'Choose a photo first.' }

  const stored = await processAndStoreSticker(photo, 'library')
  if (!stored.ok) return stored

  const { error } = await supabaseAdmin.from('stickers').insert({
    image_url: stored.url,
    storage_path: stored.path,
    alt_text: alt.alt,
    unlock_rule: unlock.rule,
    unlock_badge_id: unlock.badgeId,
    unlock_season: unlock.season,
    unlock_hint: unlock.hint,
  })
  if (error) {
    await removeStoredSticker(stored.url)
    return { ok: false, error: error.message }
  }
  revalidatePath('/stickers')
  return { ok: true, warnings: stored.warnings }
}

export async function updateLibrarySticker(id: string, formData: FormData): Promise<Result> {
  await requireAdmin()
  const alt = validateAltText(formData.get('alt'))
  if (!alt.ok) return alt
  const unlock = readUnlock(formData)
  if (!unlock.ok) return unlock
  const { error } = await supabaseAdmin
    .from('stickers')
    .update({
      alt_text: alt.alt,
      unlock_rule: unlock.rule,
      unlock_badge_id: unlock.badgeId,
      unlock_season: unlock.season,
      unlock_hint: unlock.hint,
      is_active: formData.get('is_active') === '1',
    })
    .eq('id', id)
    .is('quest_id', null)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/stickers')
  return { ok: true }
}

/** Deleting a library sticker also takes it out of every drawer and page. */
export async function deleteLibrarySticker(id: string): Promise<Result> {
  await requireAdmin()
  const { data, error } = await supabaseAdmin
    .from('stickers')
    .delete()
    .eq('id', id)
    .is('quest_id', null)
    .select('image_url')
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  await removeStoredSticker(data?.image_url as string | undefined)
  revalidatePath('/stickers')
  return { ok: true }
}

/** Give a manual or season sticker to a player by username. */
export async function grantSticker(stickerId: string, username: string): Promise<Result> {
  await requireAdmin()
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .ilike('username', username.trim().replace(/[%_\\]/g, '\\$&'))
    .maybeSingle()
  if (!profile) return { ok: false, error: `No player called ${username.trim()}.` }
  const { error } = await supabaseAdmin
    .from('user_stickers')
    .upsert({ user_id: profile.id, sticker_id: stickerId }, { onConflict: 'user_id,sticker_id', ignoreDuplicates: true })
  if (error) return { ok: false, error: error.message }
  revalidatePath('/stickers')
  return { ok: true }
}
