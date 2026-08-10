import { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Avatar } from '@/components/Avatar'
import { FollowButton } from '@/components/FollowButton'
import { EmptyState } from '@/components/EmptyState'
import { useAuth } from '@/hooks/useAuth'
import { useFollow } from '@/hooks/useFollow'
import { supabase } from '@/lib/supabase'
import { sizedImageUrl } from '@/lib/sizedImageUrl'
import { paramAsString } from '@/lib/routeParams'
import { track } from '@/lib/analytics'
import { COLORS, SPACING, RADIUS, CITY, getLevelTitle } from '@/lib/constants'

interface ProfileHeader {
  id: string
  username: string
  level: number
  avatar_url: string | null
  feed_public: boolean
}

interface GridPost {
  id: string
  photo_url: string
}

const GRID_GAP = 2

export default function PublicProfile() {
  const params = useLocalSearchParams<{ id: string | string[] }>()
  const userId = paramAsString(params.id)
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const { profile: viewerProfile } = useAuth()
  const viewerId = viewerProfile?.id
  const isSelf = viewerId != null && viewerId === userId

  const { isFollowing, followerCount, followingCount, toggling, toggle, refetch: refetchFollow } =
    useFollow(viewerId, userId)

  const [user, setUser] = useState<ProfileHeader | null>(null)
  const [posts, setPosts] = useState<GridPost[]>([])
  const [postCount, setPostCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const cellSize = (width - GRID_GAP * 2) / 3

  const load = useCallback(async () => {
    if (!userId) return

    const [profileResult, postsResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, username, level, avatar_url, feed_public')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('completions')
        .select('id, photo_url', { count: 'exact' })
        .eq('user_id', userId)
        .eq('status', 'approved')
        .eq('hidden_pending_review', false)
        .not('photo_url', 'is', null)
        .order('completed_at', { ascending: false }),
    ])

    setUser((profileResult.data as ProfileHeader | null) ?? null)
    setPosts((postsResult.data ?? []) as GridPost[])
    setPostCount(postsResult.count ?? 0)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    track('profile_opened', { self: isSelf, source: 'route' })
  }, [isSelf])

  const isPrivate = user != null && !user.feed_public && !isSelf

  if (loading) {
    return (
      <View style={[styles.centerScreen, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  if (!user) {
    return (
      <View style={[styles.centerScreen, { paddingTop: insets.top }]}>
        <EmptyState icon="🕵️" title="Adventurer not found" subtitle="This profile doesn't exist anymore." />
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>← Go back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const header = (
    <View>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarName}>@{user.username}</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.heroRow}>
        <View style={styles.avatarWrap}>
          <Avatar username={user.username} uri={user.avatar_url} size={84} />
          <View style={styles.levelChip}>
            <Text style={styles.levelChipText}>LV {user.level}</Text>
          </View>
        </View>

        <View style={styles.countsRow}>
          <View style={styles.countCell}>
            <Text style={styles.countValue}>{postCount}</Text>
            <Text style={styles.countLabel}>Posts</Text>
          </View>
          <TouchableOpacity
            style={styles.countCell}
            onPress={() => router.push(`/user/${user.id}/followers`)}
            accessibilityRole="button"
            accessibilityLabel="View followers"
          >
            <Text style={styles.countValue}>{followerCount}</Text>
            <Text style={styles.countLabel}>Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.countCell}
            onPress={() => router.push(`/user/${user.id}/following`)}
            accessibilityRole="button"
            accessibilityLabel="View following"
          >
            <Text style={styles.countValue}>{followingCount}</Text>
            <Text style={styles.countLabel}>Following</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.metaBlock}>
        <Text style={styles.levelTitle}>{getLevelTitle(user.level)}</Text>
        <Text style={styles.metaCity}>📍 {CITY.name}</Text>
      </View>

      <View style={styles.actionRow}>
        {isSelf ? (
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push('/edit-profile')}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
          >
            <Text style={styles.editBtnText}>Edit profile</Text>
          </TouchableOpacity>
        ) : viewerId ? (
          <FollowButton
            isFollowing={isFollowing}
            loading={toggling}
            onPress={async () => {
              await toggle()
              refetchFollow()
            }}
          />
        ) : null}
      </View>

      {isPrivate ? (
        <EmptyState
          icon="🔒"
          title="This trail log is private"
          subtitle={`@${user.username} keeps their quests off the public feed.`}
        />
      ) : posts.length === 0 ? (
        <EmptyState
          icon="🧭"
          title="No quests yet"
          subtitle={
            isSelf
              ? 'Complete a quest and your proof photos build your grid.'
              : `@${user.username} hasn't completed any quests yet.`
          }
        />
      ) : null}
    </View>
  )

  return (
    <View style={[styles.container, { paddingTop: insets.top + SPACING.sm }]}>
      <FlatList
        data={isPrivate ? [] : posts}
        keyExtractor={(item) => item.id}
        numColumns={3}
        ListHeaderComponent={header}
        columnWrapperStyle={{ gap: GRID_GAP }}
        contentContainerStyle={{ gap: GRID_GAP, paddingBottom: insets.bottom + SPACING.xxl }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/completion/${item.id}`)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="View quest completion"
          >
            <Image
              source={{ uri: sizedImageUrl(item.photo_url, { width: 400, height: 400 }) }}
              style={{ width: cellSize, height: cellSize, backgroundColor: COLORS.bgWarm }}
            />
          </TouchableOpacity>
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centerScreen: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backLink: { marginTop: SPACING.md, minHeight: 44, justifyContent: 'center' },
  backLinkText: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarName: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '900' },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.sm,
    gap: SPACING.xl,
  },
  avatarWrap: { position: 'relative' },
  levelChip: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    backgroundColor: COLORS.highlight,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: COLORS.bg,
  },
  levelChipText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  countsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  countCell: { alignItems: 'center', minWidth: 64, minHeight: 44, justifyContent: 'center' },
  countValue: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '900' },
  countLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', marginTop: 1 },
  metaBlock: { paddingHorizontal: SPACING.xl, marginTop: SPACING.lg },
  levelTitle: { color: COLORS.navy, fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  metaCity: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600', marginTop: 2 },
  actionRow: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  editBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    minHeight: 38,
  },
  editBtnText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '800' },
})
