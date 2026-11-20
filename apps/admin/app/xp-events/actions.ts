'use server'

import { revalidatePath } from 'next/cache'
import { parseVancouverInput } from '@quest/geofence'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { normalizeMultiplier, weekendWindow, type XpEventPreset } from '@/lib/xpEventPresets'

/** A multiplier event (043 xp_events, kind = 'multiplier'). Win-back rows are never listed. */
export interface XpEventRow {
  id: string
  multiplier: number
  quest_id: string | null
  quest_title: string | null
  label: string | null
  starts_at: string
  ends_at: string
  created_by: string | null
  created_at: string
}

export interface XpEventLists {
  active: XpEventRow[]
  upcoming: XpEventRow[]
  ended: XpEventRow[]
  winBack: { open: number; usedLast30Days: number }
}

export interface QuestOption {
  id: string
  title: string
}

type Result = { ok: true } | { ok: false; error: string }

const ENDED_SHOWN = 20

function toRow(raw: Record<string, unknown>): XpEventRow {
  const quest = raw.quest as { title: string } | { title: string }[] | null
  const questTitle = Array.isArray(quest) ? quest[0]?.title ?? null : quest?.title ?? null
  return {
    id: String(raw.id),
    multiplier: Number(raw.multiplier),
    quest_id: (raw.quest_id as string | null) ?? null,
    quest_title: questTitle,
    label: (raw.label as string | null) ?? null,
    starts_at: String(raw.starts_at),
    ends_at: String(raw.ends_at),
    created_by: (raw.created_by as string | null) ?? null,
    created_at: String(raw.created_at),
  }
}

export async function listXpEvents(): Promise<XpEventLists> {
  await requireAdmin()
  const nowIso = new Date().toISOString()
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const select = 'id, multiplier, quest_id, label, starts_at, ends_at, created_by, created_at, quest:quests(title)'

  const [current, ended, open, used] = await Promise.all([
    supabaseAdmin
      .from('xp_events')
      .select(select)
      .eq('kind', 'multiplier')
      .gt('ends_at', nowIso)
      .order('starts_at', { ascending: true }),
    supabaseAdmin
      .from('xp_events')
      .select(select)
      .eq('kind', 'multiplier')
      .lte('ends_at', nowIso)
      .order('ends_at', { ascending: false })
      .limit(ENDED_SHOWN),
    supabaseAdmin
      .from('xp_events')
      .select('id', { count: 'exact', head: true })
      .eq('kind', 'win_back')
      .is('consumed_at', null)
      .gt('ends_at', nowIso),
    supabaseAdmin
      .from('xp_events')
      .select('id', { count: 'exact', head: true })
      .eq('kind', 'win_back')
      .gte('consumed_at', since30),
  ])

  if (current.error) throw new Error(current.error.message)
  if (ended.error) throw new Error(ended.error.message)

  const now = Date.now()
  const currentRows = ((current.data ?? []) as Record<string, unknown>[]).map(toRow)

  return {
    active: currentRows.filter((row) => new Date(row.starts_at).getTime() <= now),
    upcoming: currentRows.filter((row) => new Date(row.starts_at).getTime() > now),
    ended: ((ended.data ?? []) as Record<string, unknown>[]).map(toRow),
    winBack: { open: open.count ?? 0, usedLast30Days: used.count ?? 0 },
  }
}

/** Active multiplier events, highest first. Used by the dashboard card. */
export async function getActiveBoosts(): Promise<XpEventRow[]> {
  await requireAdmin()
  const nowIso = new Date().toISOString()
  const { data, error } = await supabaseAdmin
    .from('xp_events')
    .select('id, multiplier, quest_id, label, starts_at, ends_at, created_by, created_at, quest:quests(title)')
    .eq('kind', 'multiplier')
    .lte('starts_at', nowIso)
    .gt('ends_at', nowIso)
    .order('multiplier', { ascending: false })
    .order('ends_at', { ascending: true })

  // Before 043 is applied the table does not exist; the dashboard shows "unavailable".
  if (error) throw new Error(error.message)
  return ((data ?? []) as Record<string, unknown>[]).map(toRow)
}

export async function listQuestOptions(): Promise<QuestOption[]> {
  await requireAdmin()
  const { data, error } = await supabaseAdmin
    .from('quests')
    .select('id, title')
    .eq('status', 'active')
    .order('title', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).map((q) => ({ id: String(q.id), title: String(q.title) }))
}

export interface CreateXpEventInput {
  preset: XpEventPreset
  /** Required for 'quest'; optional for 'custom' (blank = every quest). */
  questId?: string | null
  /** `YYYY-MM-DDTHH:mm` in America/Vancouver. Ignored for 'weekend'. */
  startsLocal?: string
  endsLocal?: string
  /** Only read for 'custom'. Presets are ×2. */
  multiplier?: number
  label?: string
}

export async function createXpEvent(input: CreateXpEventInput): Promise<Result> {
  const adminEmail = await requireAdmin()
  const now = new Date()

  let multiplier = 2
  let questId: string | null = null
  let startsAt: string | null
  let endsAt: string | null
  let label = (input.label ?? '').trim().slice(0, 80)

  if (input.preset === 'weekend') {
    const window = weekendWindow(now)
    startsAt = window.start.toISOString()
    endsAt = window.end.toISOString()
    if (!label) label = 'Double XP this weekend'
  } else if (input.preset === 'quest' || input.preset === 'custom') {
    startsAt = parseVancouverInput(input.startsLocal ?? '')
    endsAt = parseVancouverInput(input.endsLocal ?? '')
    if (!startsAt || !endsAt) return { ok: false, error: 'Pick a start and an end time.' }

    questId = input.questId ? String(input.questId) : null
    if (input.preset === 'quest' && !questId) return { ok: false, error: 'Pick a quest.' }

    if (input.preset === 'custom') {
      const m = normalizeMultiplier(Number(input.multiplier))
      if (m == null) return { ok: false, error: 'Multiplier must be between 1.25 and 3.' }
      multiplier = m
    }

    if (!label) label = input.preset === 'quest' ? 'Double XP on one quest' : `×${multiplier} XP`
  } else {
    return { ok: false, error: 'Unknown preset.' }
  }

  if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    return { ok: false, error: 'The end must be after the start.' }
  }
  if (new Date(endsAt).getTime() <= now.getTime()) {
    return { ok: false, error: 'That window has already ended.' }
  }

  if (questId) {
    const { data: quest, error } = await supabaseAdmin
      .from('quests')
      .select('id')
      .eq('id', questId)
      .maybeSingle()
    if (error || !quest) return { ok: false, error: 'That quest no longer exists.' }
  }

  const { error } = await supabaseAdmin.from('xp_events').insert({
    kind: 'multiplier',
    multiplier,
    quest_id: questId,
    user_id: null,
    label,
    starts_at: startsAt,
    ends_at: endsAt,
    created_by: adminEmail,
  })
  if (error) return { ok: false, error: error.message }

  revalidatePath('/xp-events')
  revalidatePath('/')
  return { ok: true }
}

/**
 * Ends a running event now. An event that has not started yet is deleted
 * instead (ends_at must stay after starts_at). Already-ended events are left
 * alone. Only multiplier events can be ended here.
 */
export async function endXpEvent(id: string): Promise<Result> {
  await requireAdmin()
  const { data, error } = await supabaseAdmin
    .from('xp_events')
    .select('id, kind, starts_at, ends_at')
    .eq('id', id)
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: false, error: 'Event not found.' }
  if (data.kind !== 'multiplier') return { ok: false, error: 'Only multiplier events can be ended here.' }

  const now = new Date()
  if (new Date(data.ends_at).getTime() <= now.getTime()) {
    return { ok: true }
  }

  if (new Date(data.starts_at).getTime() > now.getTime()) {
    const { error: deleteError } = await supabaseAdmin.from('xp_events').delete().eq('id', id)
    if (deleteError) return { ok: false, error: deleteError.message }
  } else {
    const { error: updateError } = await supabaseAdmin
      .from('xp_events')
      .update({ ends_at: now.toISOString() })
      .eq('id', id)
      .gt('ends_at', now.toISOString())
    if (updateError) return { ok: false, error: updateError.message }
  }

  revalidatePath('/xp-events')
  revalidatePath('/')
  return { ok: true }
}
