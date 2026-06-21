import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface FeedPost {
  id: string
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
}

export function useActivityFeed(limit = 20) {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('completions')
      .select(
        'id, photo_url, completed_at, profile:profiles(username, level, avatar_url), quest:quests(title, xp_reward)'
      )
      .eq('status', 'approved')
      .order('completed_at', { ascending: false })
      .limit(limit)

    type Row = {
      id: string
      photo_url: string
      completed_at: string
      profile: { username: string; level: number; avatar_url: string | null } | null
      quest: { title: string; xp_reward: number } | null
    }

    const mapped = ((data ?? []) as unknown as Row[])
      .filter((row) => row.profile && row.quest)
      .map((row) => ({
        id: row.id,
        photo_url: row.photo_url,
        completed_at: row.completed_at,
        user: row.profile!,
        quest: row.quest!,
      }))

    setPosts(mapped)
    setLoading(false)
  }, [limit])

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
