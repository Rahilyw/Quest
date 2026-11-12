import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type FeedMode = 'city' | 'following'

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
  questId: string
  quest: {
    title: string
    xp_reward: number
    category: string
    cutout_url: string | null
    action_phrase: string | null
  }
  viewerReported: boolean
  like_count: number
  comment_count: number
  viewer_liked: boolean
}

const POST_SELECT =
  'id, user_id, quest_id, photo_url, completed_at, profile:profiles(username, level, avatar_url), quest:quests(title, xp_reward, category, cutout_url, action_phrase), likes:completion_likes(count), comments:completion_comments(count)'

type Row = {
  id: string
  user_id: string
  quest_id: string
  photo_url: string
  completed_at: string
  profile: { username: string; level: number; avatar_url: string | null } | null
  quest: {
    title: string
    xp_reward: number
    category: string
    cutout_url: string | null
    action_phrase: string | null
  } | null
  likes: { count: number }[]
  comments: { count: number }[]
}

async function fetchViewerLikes(viewerId: string | undefined, postIds: string[]) {
  if (!viewerId || postIds.length === 0) return new Set<string>()
  const { data } = await supabase
    .from('completion_likes')
    .select('completion_id')
    .eq('user_id', viewerId)
    .in('completion_id', postIds)
  return new Set((data ?? []).map((r) => r.completion_id))
}

export function useActivityFeed(
  viewerId: string | undefined,
  blockedIds: Set<string>,
  mode: FeedMode = 'city',
  limit = 20
) {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const reportedIdsRef = useRef<Set<string>>(new Set())

  const fetchPage = useCallback(
    async (cursor: string | null): Promise<{ posts: FeedPost[]; hasMore: boolean }> => {
      let followingIds: string[] | null = null
      if (mode === 'following') {
        if (!viewerId) return { posts: [], hasMore: false }
        const { data } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', viewerId)
        followingIds = (data ?? []).map((r) => r.following_id)
        if (followingIds.length === 0) return { posts: [], hasMore: false }
      }

      let query = supabase
        .from('completions')
        .select(POST_SELECT)
        .eq('status', 'approved')
        .eq('hidden_pending_review', false)
        .order('completed_at', { ascending: false })
        .limit(limit)
      if (cursor) query = query.lt('completed_at', cursor)
      if (followingIds) query = query.in('user_id', followingIds)

      const { data } = await query
      const rows = (data ?? []) as unknown as Row[]
      const viewerLiked = await fetchViewerLikes(
        viewerId,
        rows.map((r) => r.id)
      )

      const mapped = rows
        .filter((row) => row.profile && row.quest)
        .filter((row) => !blockedIds.has(row.user_id))
        .map((row) => ({
          id: row.id,
          user_id: row.user_id,
          questId: row.quest_id,
          photo_url: row.photo_url,
          completed_at: row.completed_at,
          user: row.profile!,
          quest: row.quest!,
          viewerReported: reportedIdsRef.current.has(row.id),
          like_count: row.likes?.[0]?.count ?? 0,
          comment_count: row.comments?.[0]?.count ?? 0,
          viewer_liked: viewerLiked.has(row.id),
        }))

      return { posts: mapped, hasMore: rows.length === limit }
    },
    [viewerId, blockedIds, mode, limit]
  )

  const refetch = useCallback(async () => {
    setLoading(true)

    if (viewerId) {
      const { data } = await supabase
        .from('completion_reports')
        .select('completion_id')
        .eq('reporter_id', viewerId)
      reportedIdsRef.current = new Set((data ?? []).map((r) => r.completion_id))
    }

    const page = await fetchPage(null)
    setPosts(page.posts)
    setHasMore(page.hasMore)
    setLoading(false)
  }, [viewerId, fetchPage])

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore || posts.length === 0) return
    setLoadingMore(true)
    const cursor = posts[posts.length - 1].completed_at
    const page = await fetchPage(cursor)
    setPosts((prev) => {
      const seen = new Set(prev.map((p) => p.id))
      return [...prev, ...page.posts.filter((p) => !seen.has(p.id))]
    })
    setHasMore(page.hasMore)
    setLoadingMore(false)
  }, [loading, loadingMore, hasMore, posts, fetchPage])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { posts, loading, loadingMore, hasMore, refetch, loadMore }
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
