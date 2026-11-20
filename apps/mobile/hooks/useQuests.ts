import { useEffect, useState } from 'react'
import { includeInScope } from '@quest/geofence'
import { supabase } from '@/lib/supabase'
import { paramAsString } from '@/lib/routeParams'
import type { Badge, Quest, QuestCategory, QuestWithBadges } from '@/lib/types'

/** `live` is discovery. `archive` keeps ended quests for a player's own shelf and still hides future drops. */
export type QuestListScope = 'live' | 'archive'

type QuestBadgeRow = { badge_id: string; badge: Badge | null }

function mapQuestBadges(rows: QuestBadgeRow[] | null | undefined): Badge[] {
  return (rows ?? [])
    .map((row) => row.badge)
    .filter((badge): badge is Badge => badge != null)
}

export function useQuests(category?: QuestCategory, scope: QuestListScope = 'live') {
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchQuests()
  }, [category, scope])

  async function fetchQuests() {
    setLoading(true)
    let query = supabase
      .from('quests')
      .select('*, quest_geofences(id, label, shape, lat, lng, radius_meters, boundary_geojson, sort_order)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (category) query = query.eq('category', category)

    const { data, error: queryError } = await query
    if (queryError) setError(queryError.message)
    else {
      setError(null)
      const now = new Date()
      const rows = ((data ?? []) as Quest[]).filter((quest) => includeInScope(quest, scope, now))
      for (const q of rows) {
        if (q.quest_geofences) {
          q.quest_geofences.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        }
      }
      setQuests(rows)
    }
    setLoading(false)
  }

  return { quests, loading, error, refetch: fetchQuests }
}

export function useQuest(id: string | string[] | undefined) {
  const questId = paramAsString(id)
  const [quest, setQuest] = useState<QuestWithBadges | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!questId) {
      setQuest(null)
      setLoading(false)
      return
    }

    setLoading(true)
    supabase
      .from('quests')
      .select(
        '*, quest_badges(badge_id, badge:badges(*)), quest_geofences(id, label, shape, lat, lng, radius_meters, boundary_geojson, sort_order)'
      )
      .eq('id', questId)
      .single()
      .then(async ({ data, error }) => {
        if (error || !data) {
          setQuest(null)
          setLoading(false)
          return
        }
        const { quest_badges, quest_geofences, ...rest } = data as Quest & {
          quest_badges?: QuestBadgeRow[]
        }
        const areas = [...(quest_geofences ?? [])].sort(
          (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
        )
        let suggester_username: string | null = null
        if (rest.suggested_by) {
          const { data: suggester } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', rest.suggested_by)
            .maybeSingle()
          suggester_username = suggester?.username ?? null
        }
        setQuest({
          ...rest,
          quest_geofences: areas,
          badges: mapQuestBadges(quest_badges),
          suggester_username,
        })
        setLoading(false)
      })
  }, [questId])

  return { quest, loading }
}
