import { useCallback, useEffect, useRef, useState } from 'react'
import { endsThisSunday, includeInScope, isNewThisWeek } from '@quest/geofence'
import * as Location from 'expo-location'
import { NBSP } from '@/lib/copy'
import { supabase } from '@/lib/supabase'
import {
  passLine,
  pickThisWeek,
  streakLine,
  type PickedQuest,
  type ThisWeekCandidate,
} from '@/lib/thisWeek'

export interface WeekFriend {
  userId: string
  username: string
  avatarUrl: string | null
}

export interface CityNote {
  id: string
  userId: string
  username: string
  avatarUrl: string | null
  phrase: string
  category: string
  cutoutUrl: string | null
  isYou: boolean
}

export interface Standing {
  rank: number | null
  weeklyXp: number
  passLine: string | null
  streakLine: string | null
}

interface StandingRaw {
  rank: number | null
  weeklyXp: number
  aheadName: string | null
  gap: number | null
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function asNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

async function loadPosition(): Promise<{ lat: number; lng: number } | null> {
  try {
    const current = await Location.getForegroundPermissionsAsync()
    let granted = current.status === 'granted'
    if (current.status === 'undetermined') {
      const asked = await Location.requestForegroundPermissionsAsync()
      granted = asked.status === 'granted'
    }
    if (!granted) return null
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
    ])
    if (!pos) return null
    return { lat: pos.coords.latitude, lng: pos.coords.longitude }
  } catch {
    return null
  }
}

async function loadQuests(): Promise<{
  quests: ThisWeekCandidate[]
  starterQuest: ThisWeekCandidate | null
  newCount: number
  endingCount: number
}> {
  const { data, error } = await supabase
    .from('quests')
    .select('id, title, category, action_phrase, cutout_url, lat, lng, created_at, xp_reward, active_from, active_until, is_starter')
    .eq('status', 'active')
  if (error) throw new Error(error.message)
  const now = new Date()
  const quests = ((data ?? []) as Record<string, unknown>[])
    .map((row) => ({
      id: String(row.id),
      title: String(row.title ?? ''),
      category: String(row.category ?? 'fitness'),
      action_phrase: (row.action_phrase as string | null) ?? null,
      cutout_url: (row.cutout_url as string | null) ?? null,
      lat: asNumber(row.lat),
      lng: asNumber(row.lng),
      created_at: String(row.created_at ?? ''),
      xp_reward: asNumber(row.xp_reward) ?? 0,
      active_from: (row.active_from as string | null) ?? null,
      active_until: (row.active_until as string | null) ?? null,
      is_starter: row.is_starter === true,
    }))
    .filter((quest) => includeInScope(quest, 'live', now))
  return {
    quests,
    starterQuest: quests.find((quest) => quest.is_starter) ?? null,
    newCount: quests.filter((quest) => isNewThisWeek(quest, now)).length,
    endingCount: quests.filter((quest) => endsThisSunday(quest, now)).length,
  }
}

async function loadFriendHits(userId: string): Promise<
  { questId: string; userId: string; username: string; avatarUrl: string | null }[]
> {
  const { data: follows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
  const ids = (follows ?? []).map((row) => row.following_id as string)
  if (ids.length === 0) return []

  const { data } = await supabase
    .from('completions')
    .select('quest_id, user_id, profile:profiles(username, avatar_url)')
    .in('user_id', ids)
    .eq('status', 'approved')
    .order('completed_at', { ascending: false })
    .limit(30)

  return ((data ?? []) as Record<string, unknown>[])
    .map((row) => {
      const profile = one(row.profile as { username: string; avatar_url: string | null } | null)
      if (!profile) return null
      return {
        questId: String(row.quest_id),
        userId: String(row.user_id),
        username: profile.username,
        avatarUrl: profile.avatar_url,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row != null)
}

function vancouverDayStartIso(): string {
  const now = new Date()
  const vanNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Vancouver' }))
  vanNow.setHours(0, 0, 0, 0)
  const offset = now.getTime() - new Date(now.toLocaleString('en-US', { timeZone: 'America/Vancouver' })).getTime()
  return new Date(vanNow.getTime() + offset).toISOString()
}

async function loadCity(
  userId: string,
  blockedIds: Set<string>,
): Promise<{ notes: CityNote[]; todayCount: number }> {
  const [rowsResult, countResult] = await Promise.all([
    supabase
      .from('completions')
      .select(
        'id, user_id, completed_at, profile:profiles(username, avatar_url), quest:quests(title, action_phrase, category, cutout_url, duration_min)',
      )
      .eq('status', 'approved')
      .eq('hidden_pending_review', false)
      .order('completed_at', { ascending: false })
      .limit(12),
    supabase
      .from('completions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved')
      .eq('hidden_pending_review', false)
      .gte('completed_at', vancouverDayStartIso()),
  ])

  const notes: CityNote[] = []
  for (const row of (rowsResult.data ?? []) as Record<string, unknown>[]) {
    const user = String(row.user_id)
    if (blockedIds.has(user)) continue
    const profile = one(row.profile as { username: string; avatar_url: string | null } | null)
    const quest = one(
      row.quest as {
        title: string
        action_phrase: string | null
        category: string
        cutout_url: string | null
        duration_min: number | null
      } | null,
    )
    if (!profile || !quest) continue
    const phrase = quest.action_phrase?.trim() || quest.title
    const duration = asNumber(quest.duration_min)
    notes.push({
      id: String(row.id),
      userId: user,
      username: profile.username,
      avatarUrl: profile.avatar_url,
      phrase: duration ? `${phrase}, ${duration}${NBSP}min` : phrase,
      category: quest.category,
      cutoutUrl: quest.cutout_url,
      isYou: user === userId,
    })
    if (notes.length === 3) break
  }

  return { notes, todayCount: countResult.count ?? 0 }
}

async function loadStandingRaw(userId: string): Promise<StandingRaw> {
  const { data } = await supabase
    .from('leaderboard')
    .select('user_id, username, weekly_xp')
    .order('weekly_xp', { ascending: false })
    .limit(50)

  const rows = (data ?? []) as { user_id: string; username: string; weekly_xp: number }[]
  const idx = rows.findIndex((row) => row.user_id === userId)

  if (idx >= 0) {
    const weeklyXp = rows[idx].weekly_xp ?? 0
    const ahead = idx > 0 ? rows[idx - 1] : null
    return {
      rank: idx + 1,
      weeklyXp,
      aheadName: ahead?.username ?? null,
      gap: ahead ? (ahead.weekly_xp ?? 0) - weeklyXp : null,
    }
  }

  const { data: mine } = await supabase
    .from('leaderboard')
    .select('weekly_xp')
    .eq('user_id', userId)
    .maybeSingle()
  const weeklyXp = mine?.weekly_xp ?? 0
  let rank: number | null = null
  if (weeklyXp > 0) {
    const { count } = await supabase
      .from('leaderboard')
      .select('user_id', { count: 'exact', head: true })
      .gt('weekly_xp', weeklyXp)
    rank = (count ?? 0) + 1
  }
  const { data: aheadRows } = await supabase
    .from('leaderboard')
    .select('username, weekly_xp')
    .gt('weekly_xp', weeklyXp)
    .order('weekly_xp', { ascending: true })
    .limit(1)
  const ahead = aheadRows?.[0] as { username: string; weekly_xp: number } | undefined
  return {
    rank,
    weeklyXp,
    aheadName: ahead?.username ?? null,
    gap: ahead ? ahead.weekly_xp - weeklyXp : null,
  }
}

export function useThisWeek(
  userId: string | undefined,
  playedIds: Set<string>,
  blockedIds: Set<string>,
  streakWeeks: number,
  enabled = true,
) {
  const [starterQuest, setStarterQuest] = useState<ThisWeekCandidate | null>(null)
  const [picked, setPicked] = useState<PickedQuest[]>([])
  const [poolSize, setPoolSize] = useState(0)
  const [usedLocation, setUsedLocation] = useState(false)
  const [friends, setFriends] = useState<WeekFriend[]>([])
  const [notes, setNotes] = useState<CityNote[]>([])
  const [todayCount, setTodayCount] = useState(0)
  const [newCount, setNewCount] = useState(0)
  const [endingCount, setEndingCount] = useState(0)
  const [standing, setStanding] = useState<Standing | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (!userId) {
        setStarterQuest(null)
        setLoading(false)
        return
      }
      if (!enabled) return
      const id = ++requestId.current
      if (mode === 'initial') setLoading(true)
      else setRefreshing(true)
      setError(null)

      try {
        const [position, loaded, friendHits, city, raw] = await Promise.all([
          loadPosition(),
          loadQuests(),
          loadFriendHits(userId),
          loadCity(userId, blockedIds),
          loadStandingRaw(userId),
        ])
        const quests = loaded.quests

        const friendQuestId = friendHits.find((hit) => !playedIds.has(hit.questId))?.questId ?? null
        const result = pickThisWeek({
          quests,
          playedIds,
          userLat: position?.lat,
          userLng: position?.lng,
          friendQuestId,
        })

        const pickedIds = new Set(result.picked.map((item) => item.quest.id))
        const seen = new Set<string>()
        const shownFriends: WeekFriend[] = []
        for (const hit of friendHits) {
          if (!pickedIds.has(hit.questId) || seen.has(hit.userId)) continue
          seen.add(hit.userId)
          shownFriends.push({
            userId: hit.userId,
            username: hit.username,
            avatarUrl: hit.avatarUrl,
          })
          if (shownFriends.length === 3) break
        }

        const questXp = result.picked.reduce((max, item) => Math.max(max, item.quest.xp_reward), 100)

        if (requestId.current !== id) return

        setPicked(result.picked)
        setStarterQuest(playedIds.size === 0 ? loaded.starterQuest : null)
        setPoolSize(result.poolSize)
        setUsedLocation(result.usedLocation)
        setFriends(shownFriends)
        setNotes(city.notes)
        setTodayCount(city.todayCount)
        setNewCount(loaded.newCount)
        setEndingCount(loaded.endingCount)
        setStanding({
          rank: raw.rank,
          weeklyXp: raw.weeklyXp,
          passLine: passLine(raw.rank, raw.aheadName, raw.gap, questXp),
          streakLine: streakLine(streakWeeks),
        })
      } catch (err) {
        if (requestId.current === id) {
          setError(err instanceof Error ? err.message : 'Could not load this week.')
        }
      } finally {
        if (requestId.current === id) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    },
    [userId, playedIds, blockedIds, streakWeeks, enabled],
  )

  useEffect(() => {
    load('initial')
  }, [load])

  const refresh = useCallback(() => load('refresh'), [load])

  return {
    starterQuest,
    picked,
    poolSize,
    usedLocation,
    friends,
    notes,
    todayCount,
    newCount,
    endingCount,
    standing,
    loading,
    refreshing,
    error,
    refresh,
  }
}
