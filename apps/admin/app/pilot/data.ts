import 'server-only'

import {
  currentWeekStart,
  isQuestActive,
  nextWeekStart,
  partsInZone,
  zonedToUtc,
} from '@quest/geofence'
import { migrationNotice } from '@/lib/pilotFallback'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'

export type DayCount = { date: string; label: string; count: number }

export type QuestCountRow = { id: string; title: string; count: number }

export type ContentGap = {
  id: string
  title: string
  missing: Array<'cutout_url' | 'cutout_alt' | 'action_phrase'>
}

export type ActiveBoost = {
  id: string
  multiplier: number
  label: string | null
  questTitle: string | null
  questId: string | null
  startsAt: string
  endsAt: string
}

export type PilotDashboard = {
  cohort: {
    playersTotal: number
    newLast7Days: number
    weeklyActive: number
    pushOptInRate: number | null
    pushOptInCount: number
  }
  activity: {
    completionsPerDay: DayCount[]
    reportsOpenedLast7Days: number
    postsRemovedLast7Days: number
  }
  quests: {
    topThisWeek: QuestCountRow[]
    liveZeroCompletions: QuestCountRow[]
  }
  content: {
    gaps: ContentGap[]
    cutoutAltAvailable: boolean
    notice: string | null
  }
  boosts: {
    active: ActiveBoost | null
    notice: string | null
  }
}

type QuestRow = {
  id: string
  title: string
  status: string
  active_from: string | null
  active_until: string | null
  cutout_url?: string | null
  cutout_alt?: string | null
  action_phrase?: string | null
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function victoriaDateKey(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

/** Inclusive window of the last `days` Victoria calendar days ending today. */
function victoriaDayWindow(now: Date, days: number): { start: Date; days: DayCount[] } {
  const parts = partsInZone(now)
  const out: DayCount[] = []
  let windowStart: Date | null = null
  for (let i = days - 1; i >= 0; i--) {
    const rolled = new Date(Date.UTC(parts.year, parts.month - 1, parts.day - i))
    const y = rolled.getUTCFullYear()
    const m = rolled.getUTCMonth() + 1
    const d = rolled.getUTCDate()
    const start = zonedToUtc(y, m, d, 0, 0, 0)
    if (!windowStart) windowStart = start
    const label = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Vancouver',
      month: 'short',
      day: 'numeric',
    }).format(start)
    out.push({ date: victoriaDateKey(y, m, d), label, count: 0 })
  }
  return { start: windowStart ?? now, days: out }
}

function victoriaDateOf(iso: string): string {
  const parts = partsInZone(new Date(iso))
  return victoriaDateKey(parts.year, parts.month, parts.day)
}

function isLiveQuest(quest: QuestRow, now: Date): boolean {
  if (quest.status !== 'active') return false
  return isQuestActive(
    { active_from: quest.active_from, active_until: quest.active_until },
    now,
  )
}

export async function loadPilotDashboard(): Promise<PilotDashboard> {
  await requireAdmin()

  const now = new Date()
  const weekStart = currentWeekStart(now)
  const weekEnd = nextWeekStart(now)
  const last14 = victoriaDayWindow(now, 14)
  const last7 = victoriaDayWindow(now, 7)
  const weekStartIso = weekStart.toISOString()
  const weekEndIso = weekEnd.toISOString()
  const day14Iso = last14.start.toISOString()
  const day7Iso = last7.start.toISOString()

  const [
    playersTotalRes,
    newLast7Res,
    weekCompletionsRes,
    pushOptInRes,
    day14CompletionsRes,
    reportsRes,
    commentReportsRes,
    removedRes,
    activeQuestsRes,
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
    supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', day7Iso),
    supabaseAdmin
      .from('completions')
      .select('user_id, quest_id')
      .eq('status', 'approved')
      .gte('completed_at', weekStartIso)
      .lt('completed_at', weekEndIso),
    supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .not('push_token', 'is', null)
      .eq('push_drops', true),
    supabaseAdmin
      .from('completions')
      .select('completed_at, quest_id')
      .eq('status', 'approved')
      .gte('completed_at', day14Iso),
    supabaseAdmin
      .from('completion_reports')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', day7Iso),
    supabaseAdmin
      .from('comment_reports')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', day7Iso),
    supabaseAdmin
      .from('completions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'removed')
      .gte('reviewed_at', day7Iso),
    supabaseAdmin
      .from('quests')
      .select('id, title, status, active_from, active_until')
      .eq('status', 'active'),
  ])

  const playersTotal = playersTotalRes.count ?? 0
  const newLast7Days = newLast7Res.count ?? 0
  const pushOptInCount = pushOptInRes.count ?? 0
  const pushOptInRate = playersTotal > 0 ? pushOptInCount / playersTotal : null

  const weekRows = weekCompletionsRes.data ?? []
  const weeklyActive = new Set(weekRows.map((r) => r.user_id as string)).size

  const completionsPerDay = last14.days.map((d) => ({ ...d }))
  const byDate = new Map(completionsPerDay.map((d) => [d.date, d]))
  const day14QuestIds = new Set<string>()
  for (const row of day14CompletionsRes.data ?? []) {
    const key = victoriaDateOf(String(row.completed_at))
    const bucket = byDate.get(key)
    if (bucket) bucket.count += 1
    if (row.quest_id) day14QuestIds.add(String(row.quest_id))
  }

  const reportsOpenedLast7Days =
    (reportsRes.count ?? 0) + (commentReportsRes.error ? 0 : commentReportsRes.count ?? 0)
  const postsRemovedLast7Days = removedRes.count ?? 0

  const weekQuestCounts = new Map<string, number>()
  for (const row of weekRows) {
    const id = String(row.quest_id)
    weekQuestCounts.set(id, (weekQuestCounts.get(id) ?? 0) + 1)
  }
  const topIds = Array.from(weekQuestCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id)

  const titleById = new Map<string, string>()
  if (topIds.length > 0) {
    const { data: titles } = await supabaseAdmin.from('quests').select('id, title').in('id', topIds)
    for (const q of titles ?? []) titleById.set(String(q.id), String(q.title))
  }

  const topThisWeek: QuestCountRow[] = topIds.map((id) => ({
    id,
    title: titleById.get(id) ?? 'Quest',
    count: weekQuestCounts.get(id) ?? 0,
  }))

  const activeQuests = (activeQuestsRes.data ?? []) as QuestRow[]
  const liveQuests = activeQuests.filter((q) => isLiveQuest(q, now))
  const liveZeroCompletions: QuestCountRow[] = liveQuests
    .filter((q) => !day14QuestIds.has(q.id))
    .map((q) => ({ id: q.id, title: q.title, count: 0 }))
    .sort((a, b) => a.title.localeCompare(b.title))

  const content = await loadContentReadiness(liveQuests)
  const boosts = await loadActiveBoost(now)

  return {
    cohort: {
      playersTotal,
      newLast7Days,
      weeklyActive,
      pushOptInRate,
      pushOptInCount,
    },
    activity: {
      completionsPerDay,
      reportsOpenedLast7Days,
      postsRemovedLast7Days,
    },
    quests: {
      topThisWeek,
      liveZeroCompletions,
    },
    content,
    boosts,
  }
}

async function loadContentReadiness(liveQuests: QuestRow[]): Promise<PilotDashboard['content']> {
  if (liveQuests.length === 0) {
    return { gaps: [], cutoutAltAvailable: true, notice: null }
  }

  const ids = liveQuests.map((q) => q.id)
  const withAlt = await supabaseAdmin
    .from('quests')
    .select('id, title, cutout_url, cutout_alt, action_phrase')
    .in('id', ids)

  if (withAlt.error) {
    const notice = migrationNotice(withAlt.error, 'cutout_alt')
    if (!notice) throw new Error(withAlt.error.message)
    // Content readiness checks cutout_alt (044). Soft-fail the whole section.
    return { gaps: [], cutoutAltAvailable: false, notice }
  }

  const gaps: ContentGap[] = []
  for (const row of withAlt.data ?? []) {
    const missing: ContentGap['missing'] = []
    if (!row.cutout_url) missing.push('cutout_url')
    if (!row.cutout_alt || !String(row.cutout_alt).trim()) missing.push('cutout_alt')
    if (!row.action_phrase || !String(row.action_phrase).trim()) missing.push('action_phrase')
    if (missing.length) gaps.push({ id: String(row.id), title: String(row.title), missing })
  }
  return { gaps, cutoutAltAvailable: true, notice: null }
}

async function loadActiveBoost(now: Date): Promise<PilotDashboard['boosts']> {
  const nowIso = now.toISOString()
  const { data, error } = await supabaseAdmin
    .from('xp_events')
    .select('id, multiplier, quest_id, label, starts_at, ends_at, quest:quests(title)')
    .eq('kind', 'multiplier')
    .lte('starts_at', nowIso)
    .gt('ends_at', nowIso)
    .order('multiplier', { ascending: false })
    .order('ends_at', { ascending: true })
    .limit(1)

  if (error) {
    const notice = migrationNotice(error, 'xp_events')
    if (notice) return { active: null, notice }
    throw new Error(error.message)
  }

  const raw = (data ?? [])[0] as Record<string, unknown> | undefined
  if (!raw) return { active: null, notice: null }

  const quest = raw.quest as { title: string } | { title: string }[] | null
  const questTitle = Array.isArray(quest) ? quest[0]?.title ?? null : quest?.title ?? null

  return {
    active: {
      id: String(raw.id),
      multiplier: Number(raw.multiplier),
      label: (raw.label as string | null) ?? null,
      questTitle,
      questId: (raw.quest_id as string | null) ?? null,
      startsAt: String(raw.starts_at),
      endsAt: String(raw.ends_at),
    },
    notice: null,
  }
}
