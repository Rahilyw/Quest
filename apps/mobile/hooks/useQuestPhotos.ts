import { useCallback, useEffect, useState } from 'react'
import { currentWeekStart } from '@quest/geofence'
import { supabase } from '@/lib/supabase'

export interface QuestPhoto {
  id: string
  user_id: string
  username: string
  avatar_url: string | null
  photo_url: string
  selfie_url?: string | null
  completed_at: string
  like_count: number
  viewer_liked?: boolean
}

const PHOTO_SELECT =
  'id, user_id, photo_url, selfie_url, completed_at, profile:profiles(username, avatar_url), likes:completion_likes(count)'

type PhotoRow = {
  id: string
  user_id: string
  photo_url: string
  selfie_url?: string | null
  completed_at: string
  profile: { username: string; avatar_url: string | null } | null
  likes: { count: number }[]
}

export function useQuestPhotos(
  questId: string | null,
  limit = 3,
): {
  photos: QuestPhoto[]
  weeklyCount: number
  loading: boolean
  refetch: () => void
} {
  const [photos, setPhotos] = useState<QuestPhoto[]>([])
  const [weeklyCount, setWeeklyCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!questId) {
      setPhotos([])
      setWeeklyCount(0)
      setLoading(false)
      return
    }

    setLoading(true)

    // Fetch latest public, approved, non-hidden photos
    const { data: rows } = await supabase
      .from('completions')
      .select(PHOTO_SELECT)
      .eq('quest_id', questId)
      .eq('status', 'approved')
      .eq('feed_public', true)
      .eq('hidden_pending_review', false)
      .order('completed_at', { ascending: false })
      .limit(limit)

    const typedRows = (rows ?? []) as unknown as PhotoRow[]

    const mapped: QuestPhoto[] = typedRows
      .filter((r) => r.profile != null)
      .map((r) => ({
        id: r.id,
        user_id: r.user_id,
        username: r.profile!.username,
        avatar_url: r.profile!.avatar_url,
        photo_url: r.photo_url,
        selfie_url: r.selfie_url ?? null,
        completed_at: r.completed_at,
        like_count: r.likes?.[0]?.count ?? 0,
      }))

    setPhotos(mapped)

    // Weekly count: Monday 00:00 America/Vancouver to now
    const weekStart = currentWeekStart(new Date())
    const { count } = await supabase
      .from('completions')
      .select('id', { count: 'exact', head: true })
      .eq('quest_id', questId)
      .eq('status', 'approved')
      .eq('feed_public', true)
      .gte('completed_at', weekStart.toISOString())

    setWeeklyCount(count ?? 0)
    setLoading(false)
  }, [questId, limit])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { photos, weeklyCount, loading, refetch }
}
