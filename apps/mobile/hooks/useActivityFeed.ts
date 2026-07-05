import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface FeedPost {
  id: string
  user_id: string
  photo_url: string
  completed_at: string
  user: {
    username: string
    level: number
    avatar_url: string | null
  }
  quest: {
    title: string
    xp_reward: number
  }
  viewerReported: boolean
}

export function useActivityFeed(
  viewerId: string | undefined,
  blockedIds: Set<string>,
  limit = 20
) {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setLoading(true)

    const [completionsResult, reportsResult] = await Promise.all([
      supabase
        .from('completions')
        .select(
          'id, user_id, photo_url, completed_at, profile:profiles(username, level, avatar_url), quest:quests(title, xp_reward)'
        )
        .eq('status', 'approved')
        .eq('hidden_pending_review', false)
        .order('completed_at', { ascending: false })
        .limit(limit),
      viewerId
        ? supabase
            .from('completion_reports')
            .select('completion_id')
            .eq('reporter_id', viewerId)
        : Promise.resolve({ data: [] as { completion_id: string }[] }),
    ])

    const reportedIds = new Set((reportsResult.data ?? []).map((r) => r.completion_id))

    type Row = {
      id: string
      user_id: string
      photo_url: string
      completed_at: string
      profile: { username: string; level: number; avatar_url: string | null } | null
      quest: { title: string; xp_reward: number } | null
    }

    const mapped = ((completionsResult.data ?? []) as unknown as Row[])
      .filter((row) => row.profile && row.quest)
      .filter((row) => !blockedIds.has(row.user_id))
      .map((row) => ({
        id: row.id,
        user_id: row.user_id,
        photo_url: row.photo_url,
        completed_at: row.completed_at,
        user: row.profile!,
        quest: row.quest!,
        viewerReported: reportedIds.has(row.id),
      }))

    setPosts(mapped)
    setLoading(false)
  }, [viewerId, blockedIds, limit])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { posts, loading, refetch }
}

export function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${Math.max(1, mins)} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}
