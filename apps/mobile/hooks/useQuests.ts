import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { paramAsString } from '@/lib/routeParams'
import type { Badge, Quest, QuestCategory, QuestWithBadges } from '@/lib/types'

type QuestBadgeRow = { badge_id: string; badge: Badge | null }

function mapQuestBadges(rows: QuestBadgeRow[] | null | undefined): Badge[] {
  return (rows ?? [])
    .map((row) => row.badge)
    .filter((badge): badge is Badge => badge != null)
}

export function useQuests(category?: QuestCategory) {
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchQuests()
  }, [category])

  async function fetchQuests() {
    setLoading(true)
    let query = supabase
      .from('quests')
      .select('*, quest_geofences(id, label, shape, lat, lng, radius_meters, boundary_geojson, sort_order)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (category) query = query.eq('category', category)

    const { data, error } = await query
    if (error) setError(error.message)
    else {
      const rows = (data ?? []) as Quest[]
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
      .then(({ data, error }) => {
        if (error || !data) {
          setQuest(null)
        } else {
          const { quest_badges, quest_geofences, ...rest } = data as Quest & {
            quest_badges?: QuestBadgeRow[]
          }
          const areas = [...(quest_geofences ?? [])].sort(
            (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
          )
          setQuest({
            ...rest,
            quest_geofences: areas,
            badges: mapQuestBadges(quest_badges),
          })
        }
        setLoading(false)
      })
  }, [questId])

  return { quest, loading }
}
