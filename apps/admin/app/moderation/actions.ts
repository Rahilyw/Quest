'use server'

import { supabaseAdmin } from '@/lib/supabase'
import { sendExpoPush } from '@/lib/expo-push'
import { getAdminAllowlist, isAdminEmail } from '@/lib/admin-auth'
import { createServerClient } from '@/lib/supabase-server'

export interface ModerationReport {
  id: string
  reason: string
  details: string | null
  status: string
  created_at: string
  reporterUsername: string
}

export interface ModerationItem {
  id: string
  photo_url: string
  lat: number
  lng: number
  completed_at: string
  status: string
  open_report_count: number
  hidden_pending_review: boolean
  user_id: string
  profiles: { username: string; level: number; created_at: string } | null
  quests: { title: string; geofence_type: string; xp_reward: number } | null
  reports: ModerationReport[]
  geofenceEvidence: { inside?: boolean; geofence_type?: string; found?: boolean } | null
  removedCount: number
  totalCompletions: number
}

async function getAdminEmail(): Promise<string> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminEmail(user?.email)) {
    throw new Error('Unauthorized')
  }
  return user?.email ?? getAdminAllowlist()[0] ?? 'admin'
}

function resolveQuestTitle(
  quests: { title: string } | { title: string }[] | null | undefined
): string {
  if (!quests) return 'quest'
  if (Array.isArray(quests)) return quests[0]?.title ?? 'quest'
  return quests.title
}

export async function getModerationQueue(): Promise<ModerationItem[]> {
  const { data: completions } = await supabaseAdmin
    .from('completions')
    .select(
      'id, photo_url, lat, lng, completed_at, status, open_report_count, hidden_pending_review, user_id, profiles(username, level, created_at), quests(title, geofence_type, xp_reward)'
    )
    .gt('open_report_count', 0)
    .eq('status', 'approved')
    .order('open_report_count', { ascending: false })
    .order('completed_at', { ascending: true })

  if (!completions?.length) return []

  const completionIds = completions.map((c) => c.id)
  const userIds = Array.from(new Set(completions.map((c) => c.user_id)))

  const [{ data: reportRows }, { data: removedRows }, { data: totalRows }] = await Promise.all([
    supabaseAdmin
      .from('completion_reports')
      .select('id, completion_id, reason, details, status, created_at, reporter_id')
      .in('completion_id', completionIds)
      .eq('status', 'open'),
    supabaseAdmin
      .from('completions')
      .select('user_id')
      .in('user_id', userIds)
      .eq('status', 'removed'),
    supabaseAdmin
      .from('completions')
      .select('user_id')
      .in('user_id', userIds)
      .eq('status', 'approved'),
  ])

  const reporterIds = Array.from(new Set((reportRows ?? []).map((r) => r.reporter_id)))
  const { data: reporters } = reporterIds.length
    ? await supabaseAdmin.from('profiles').select('id, username').in('id', reporterIds)
    : { data: [] as { id: string; username: string }[] }

  const reporterNames = new Map((reporters ?? []).map((p) => [p.id, p.username]))

  const removedByUser = new Map<string, number>()
  for (const row of removedRows ?? []) {
    removedByUser.set(row.user_id, (removedByUser.get(row.user_id) ?? 0) + 1)
  }
  const totalByUser = new Map<string, number>()
  for (const row of totalRows ?? []) {
    totalByUser.set(row.user_id, (totalByUser.get(row.user_id) ?? 0) + 1)
  }

  const reportsByCompletion = new Map<string, ModerationReport[]>()
  for (const report of reportRows ?? []) {
    const list = reportsByCompletion.get(report.completion_id) ?? []
    list.push({
      id: report.id,
      reason: report.reason,
      details: report.details,
      status: report.status,
      created_at: report.created_at,
      reporterUsername: reporterNames.get(report.reporter_id) ?? 'unknown',
    })
    reportsByCompletion.set(report.completion_id, list)
  }

  const items: ModerationItem[] = []

  for (const raw of completions) {
    const c = raw as {
      id: string
      photo_url: string
      lat: number
      lng: number
      completed_at: string
      status: string
      open_report_count: number
      hidden_pending_review: boolean
      user_id: string
      profiles: { username: string; level: number; created_at: string } | { username: string; level: number; created_at: string }[] | null
      quests: { title: string; geofence_type: string; xp_reward: number } | { title: string; geofence_type: string; xp_reward: number }[] | null
    }

    const profile = Array.isArray(c.profiles) ? c.profiles[0] ?? null : c.profiles
    const quest = Array.isArray(c.quests) ? c.quests[0] ?? null : c.quests

    const { data: evidence } = await supabaseAdmin.rpc('get_completion_geofence_evidence', {
      p_completion_id: c.id,
    })

    items.push({
      id: c.id,
      photo_url: c.photo_url,
      lat: c.lat,
      lng: c.lng,
      completed_at: c.completed_at,
      status: c.status,
      open_report_count: c.open_report_count,
      hidden_pending_review: c.hidden_pending_review,
      user_id: c.user_id,
      profiles: profile,
      quests: quest,
      reports: reportsByCompletion.get(c.id) ?? [],
      geofenceEvidence: evidence as ModerationItem['geofenceEvidence'],
      removedCount: removedByUser.get(c.user_id) ?? 0,
      totalCompletions: totalByUser.get(c.user_id) ?? 0,
    })
  }

  return items
}

export async function dismissReports(completionId: string): Promise<void> {
  const adminEmail = await getAdminEmail()

  const { data: completion } = await supabaseAdmin
    .from('completions')
    .select('status')
    .eq('id', completionId)
    .single()

  if (!completion || completion.status !== 'approved') return

  await supabaseAdmin
    .from('completion_reports')
    .update({ status: 'dismissed' })
    .eq('completion_id', completionId)
    .eq('status', 'open')

  await supabaseAdmin
    .from('completions')
    .update({ reviewed_by: adminEmail, reviewed_at: new Date().toISOString() })
    .eq('id', completionId)
}

async function notifyRemoval(userId: string, questTitle: string): Promise<void> {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('push_token')
    .eq('id', userId)
    .single()

  if (profile?.push_token) {
    await sendExpoPush(
      profile.push_token,
      'Completion removed',
      `Your "${questTitle}" completion was removed after review. The XP has been returned.`
    )
  }
}

export async function removeCompletionModeration(completionId: string): Promise<void> {
  const adminEmail = await getAdminEmail()

  const { data: completion } = await supabaseAdmin
    .from('completions')
    .select('status, user_id, quests(title)')
    .eq('id', completionId)
    .single()

  if (!completion || completion.status !== 'approved') return

  const questTitle = resolveQuestTitle(completion.quests)

  await supabaseAdmin
    .from('completions')
    .update({
      status: 'removed',
      reviewed_by: adminEmail,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', completionId)

  await supabaseAdmin
    .from('completion_reports')
    .update({ status: 'actioned' })
    .eq('completion_id', completionId)
    .eq('status', 'open')

  await notifyRemoval(completion.user_id, questTitle)
}

export async function removeAndAllowRetry(completionId: string): Promise<void> {
  const adminEmail = await getAdminEmail()

  const { data: completion } = await supabaseAdmin
    .from('completions')
    .select('status, user_id, quests(title)')
    .eq('id', completionId)
    .single()

  if (!completion) return

  const questTitle = resolveQuestTitle(completion.quests)

  if (completion.status === 'approved') {
    await supabaseAdmin
      .from('completions')
      .update({
        status: 'removed',
        reviewed_by: adminEmail,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', completionId)

    await supabaseAdmin
      .from('completion_reports')
      .update({ status: 'actioned' })
      .eq('completion_id', completionId)
      .eq('status', 'open')

    await notifyRemoval(completion.user_id, questTitle)
  }

  await supabaseAdmin.from('completions').delete().eq('id', completionId)
}

export async function getFlaggedCount(): Promise<number> {
  const { count } = await supabaseAdmin
    .from('completions')
    .select('*', { count: 'exact', head: true })
    .gt('open_report_count', 0)
    .eq('status', 'approved')

  return count ?? 0
}
