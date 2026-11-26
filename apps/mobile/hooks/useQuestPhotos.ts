import { useCallback, useEffect, useState } from 'react'
import { currentWeekStart } from '@quest/geofence'
import { useAuth } from '@/hooks/useAuth'
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

// !inner so we can filter on profiles.feed_public (completions has no such column).
// No selfie_url here: selfies are owner only (DZ-1 / C-1), so other players' selfie
// paths are never selected. The viewer's own rows get theirs from a second query.
const PHOTO_SELECT =
  'id, user_id, photo_url, completed_at, profile:profiles!inner(username, avatar_url, feed_public), likes:completion_likes(count)'

type PhotoRow = {
  id: string
  user_id: string
  photo_url: string
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
  const { session } = useAuth()
  const viewerId = session?.user.id

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
      .eq('profile.feed_public', true)
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
        selfie_url: null,
        completed_at: r.completed_at,
        like_count: r.likes?.[0]?.count ?? 0,
      }))

    // Only the viewer's own selfie paths are read, and only for their own rows.
    if (viewerId) {
      const ownIds = mapped.filter((p) => p.user_id === viewerId).map((p) => p.id)
      if (ownIds.length > 0) {
        const { data: ownRows } = await supabase
          .from('completions')
          .select('id, selfie_url')
          .eq('user_id', viewerId)
          .in('id', ownIds)
        const byId = new Map(
          ((ownRows ?? []) as { id: string; selfie_url: string | null }[]).map((r) => [r.id, r.selfie_url]),
        )
        for (const p of mapped) {
          if (p.user_id === viewerId) p.selfie_url = byId.get(p.id) ?? null
        }
      }
    }

    setPhotos(mapped)

    // Weekly count: Monday 00:00 America/Vancouver to now
    const weekStart = currentWeekStart(new Date())
    const { count } = await supabase
      .from('completions')
      .select('id, profile:profiles!inner(feed_public)', { count: 'exact', head: true })
      .eq('quest_id', questId)
      .eq('status', 'approved')
      .eq('profile.feed_public', true)
      .gte('completed_at', weekStart.toISOString())

    setWeeklyCount(count ?? 0)
    setLoading(false)
  }, [questId, limit, viewerId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { photos, weeklyCount, loading, refetch }
}
