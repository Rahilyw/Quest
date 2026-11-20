import { useCallback, useEffect, useRef, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { trackXpBoostSeen } from '@/lib/analytics'
import { supabase } from '@/lib/supabase'

export type XpBoostKind = 'weekend' | 'quest' | 'win_back'

export interface XpBoostEvent {
  quest_id: string | null
  multiplier: number
  starts_at: string
  ends_at: string
  label: string | null
}

export interface XpWinBack {
  multiplier: number
  ends_at: string
}

export interface ActiveXpBoosts {
  events: XpBoostEvent[]
  win_back: XpWinBack | null
}

export interface XpBanner {
  kind: 'weekend' | 'win_back'
  text: string
}

const EMPTY: ActiveXpBoosts = { events: [], win_back: null }

function asNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function parseEvent(raw: unknown): XpBoostEvent | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const row = raw as Record<string, unknown>
  const multiplier = asNumber(row.multiplier)
  if (multiplier == null || multiplier <= 1) return null
  return {
    quest_id: asString(row.quest_id),
    multiplier,
    starts_at: asString(row.starts_at) ?? '',
    ends_at: asString(row.ends_at) ?? '',
    label: asString(row.label),
  }
}

function parsePayload(data: unknown): ActiveXpBoosts {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return EMPTY
  const root = data as Record<string, unknown>
  const eventsRaw = root.events
  const events = Array.isArray(eventsRaw)
    ? eventsRaw.map(parseEvent).filter((e): e is XpBoostEvent => e != null)
    : []
  let win_back: XpWinBack | null = null
  const wb = root.win_back
  if (wb && typeof wb === 'object' && !Array.isArray(wb)) {
    const row = wb as Record<string, unknown>
    const multiplier = asNumber(row.multiplier)
    const ends_at = asString(row.ends_at)
    if (multiplier != null && multiplier > 1 && ends_at) {
      win_back = { multiplier, ends_at }
    }
  }
  return { events, win_back }
}

/** This week banner: one global weekend line, else win-back. Never first-finisher. */
export function bannerForBoosts(boosts: ActiveXpBoosts): XpBanner | null {
  const global = boosts.events.find((e) => e.quest_id == null)
  if (global) {
    return { kind: 'weekend', text: 'Double XP until Sunday night' }
  }
  if (boosts.win_back) {
    return { kind: 'win_back', text: 'Double XP on your next quest this week' }
  }
  return null
}

/** Quest detail "2x today" when a global or this-quest multiplier applies. */
export function questBoostApplies(boosts: ActiveXpBoosts, questId: string | null): boolean {
  if (!questId) return false
  return boosts.events.some(
    (e) => e.quest_id == null || e.quest_id === questId,
  )
}

/**
 * Loads `active_xp_boosts()` on focus. Missing RPC (043 not applied) → empty,
 * no throw. Call from This week and quest detail only.
 */
export function useXpBoosts(enabled = true): {
  boosts: ActiveXpBoosts
  banner: XpBanner | null
  loading: boolean
  refresh: () => Promise<void>
  questHasBoost: (questId: string | null) => boolean
} {
  const [boosts, setBoosts] = useState<ActiveXpBoosts>(EMPTY)
  const [loading, setLoading] = useState(false)
  const seenKind = useRef<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled) {
      setBoosts(EMPTY)
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('active_xp_boosts')
      if (error) {
        setBoosts(EMPTY)
        return
      }
      setBoosts(parsePayload(data))
    } catch {
      setBoosts(EMPTY)
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return
      void refresh()
    }, [enabled, refresh]),
  )

  const banner = bannerForBoosts(boosts)

  useEffect(() => {
    if (!banner) {
      seenKind.current = null
      return
    }
    if (seenKind.current === banner.kind) return
    seenKind.current = banner.kind
    trackXpBoostSeen(banner.kind)
  }, [banner])

  return {
    boosts,
    banner,
    loading,
    refresh,
    questHasBoost: (questId) => questBoostApplies(boosts, questId),
  }
}
