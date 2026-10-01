import { useCallback, useEffect, useState } from 'react'
import { Alert } from 'react-native'
import { supabase } from '@/lib/supabase'
import { track } from '@/lib/analytics'
import { socialRateLimitMessage } from '@/lib/socialNotifications'

export function useFollow(viewerId: string | undefined, targetUserId: string | undefined) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  const isSelf = viewerId != null && viewerId === targetUserId

  const refetch = useCallback(async () => {
    if (!targetUserId) return

    const [followersResult, followingResult, edgeResult] = await Promise.all([
      supabase
        .from('follows')
        .select('follower_id', { count: 'exact', head: true })
        .eq('following_id', targetUserId),
      supabase
        .from('follows')
        .select('following_id', { count: 'exact', head: true })
        .eq('follower_id', targetUserId),
      viewerId && !isSelf
        ? supabase
            .from('follows')
            .select('follower_id')
            .eq('follower_id', viewerId)
            .eq('following_id', targetUserId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    setFollowerCount(followersResult.count ?? 0)
    setFollowingCount(followingResult.count ?? 0)
    setIsFollowing(edgeResult.data != null)
    setLoading(false)
  }, [viewerId, targetUserId, isSelf])

  useEffect(() => {
    setLoading(true)
    refetch()
  }, [refetch])

  const toggle = useCallback(async () => {
    if (!viewerId || !targetUserId || isSelf || toggling) return

    const next = !isFollowing
    setToggling(true)
    setIsFollowing(next)
    setFollowerCount((c) => Math.max(0, c + (next ? 1 : -1)))

    if (next) {
      const { error } = await supabase.from('follows').insert({
        follower_id: viewerId,
        following_id: targetUserId,
      })
      if (error && error.code !== '23505') {
        setIsFollowing(false)
        setFollowerCount((c) => Math.max(0, c - 1))
        const limited = socialRateLimitMessage(error.hint)
        if (limited) Alert.alert('Slow down', limited)
      } else {
        track('user_followed')
      }
    } else {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', viewerId)
        .eq('following_id', targetUserId)
      if (error) {
        setIsFollowing(true)
        setFollowerCount((c) => c + 1)
      } else {
        track('user_unfollowed')
      }
    }

    setToggling(false)
  }, [viewerId, targetUserId, isSelf, isFollowing, toggling])

  return { isFollowing, followerCount, followingCount, loading, toggling, toggle, refetch, isSelf }
}
