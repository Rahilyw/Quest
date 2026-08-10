import { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Avatar } from '@/components/Avatar'
import { FollowButton } from '@/components/FollowButton'
import { EmptyState } from '@/components/EmptyState'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { track } from '@/lib/analytics'
import { COLORS, SPACING, RADIUS } from '@/lib/constants'

export type FollowListMode = 'followers' | 'following'

interface RowUser {
  id: string
  username: string
  level: number
  avatar_url: string | null
}

interface Props {
  userId: string
  mode: FollowListMode
}

export function FollowList({ userId, mode }: Props) {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { profile } = useAuth()
  const viewerId = profile?.id
  const [users, setUsers] = useState<RowUser[]>([])
  const [viewerFollowing, setViewerFollowing] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const relation =
      mode === 'followers'
        ? 'profile:profiles!follows_follower_id_fkey(id, username, level, avatar_url)'
        : 'profile:profiles!follows_following_id_fkey(id, username, level, avatar_url)'
    const filterCol = mode === 'followers' ? 'following_id' : 'follower_id'

    const [listResult, viewerResult] = await Promise.all([
      supabase
        .from('follows')
        .select(relation)
        .eq(filterCol, userId)
        .order('created_at', { ascending: false }),
      viewerId
        ? supabase.from('follows').select('following_id').eq('follower_id', viewerId)
        : Promise.resolve({ data: [] as { following_id: string }[] }),
    ])

    type Row = { profile: RowUser | null }
    setUsers(
      ((listResult.data ?? []) as unknown as Row[])
        .map((r) => r.profile)
        .filter((p): p is RowUser => p != null)
    )
    setViewerFollowing(new Set((viewerResult.data ?? []).map((r) => r.following_id)))
    setLoading(false)
  }, [userId, mode, viewerId])

  useEffect(() => {
    load()
  }, [load])

  async function toggleRow(targetId: string) {
    if (!viewerId || targetId === viewerId) return
    const currentlyFollowing = viewerFollowing.has(targetId)

    setViewerFollowing((prev) => {
      const next = new Set(prev)
      if (currentlyFollowing) next.delete(targetId)
      else next.add(targetId)
      return next
    })

    if (currentlyFollowing) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', viewerId)
        .eq('following_id', targetId)
      if (error) setViewerFollowing((prev) => new Set(prev).add(targetId))
      else track('user_unfollowed')
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: viewerId, following_id: targetId })
      if (error && error.code !== '23505') {
        setViewerFollowing((prev) => {
          const next = new Set(prev)
          next.delete(targetId)
          return next
        })
      } else {
        track('user_followed')
      }
    }
  }

  const title = mode === 'followers' ? 'Followers' : 'Following'

  return (
    <View style={[styles.container, { paddingTop: insets.top + SPACING.sm }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={styles.loader} />
      ) : users.length === 0 ? (
        <EmptyState
          icon={mode === 'followers' ? '👋' : '🧭'}
          title={mode === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
          subtitle={
            mode === 'followers'
              ? 'Complete quests and show up on the city feed to get noticed.'
              : 'Find adventurers on the Victoria feed and follow their trails.'
          }
        />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + SPACING.xl }}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <TouchableOpacity
                style={styles.rowUser}
                onPress={() => router.push(`/user/${item.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`View ${item.username}'s profile`}
              >
                <Avatar username={item.username} uri={item.avatar_url} size={44} />
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName}>@{item.username}</Text>
                  <Text style={styles.rowLevel}>LV {item.level}</Text>
                </View>
              </TouchableOpacity>
              {viewerId && item.id !== viewerId ? (
                <FollowButton
                  compact
                  isFollowing={viewerFollowing.has(item.id)}
                  onPress={() => toggleRow(item.id)}
                />
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '900' },
  loader: { marginTop: SPACING.xxl * 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  rowUser: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  rowInfo: { minWidth: 0 },
  rowName: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '800' },
  rowLevel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', marginTop: 1 },
})
