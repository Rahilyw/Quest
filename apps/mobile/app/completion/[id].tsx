import { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Avatar } from '@/components/Avatar'
import { EmptyState } from '@/components/EmptyState'
import { CommentsSheet } from '@/components/CommentsSheet'
import { ShareStoryModal } from '@/components/ShareStoryModal'
import { useAuth } from '@/hooks/useAuth'
import { formatTimeAgo } from '@/hooks/useActivityFeed'
import { supabase } from '@/lib/supabase'
import { sizedImageUrl } from '@/lib/sizedImageUrl'
import { paramAsString } from '@/lib/routeParams'
import { track } from '@/lib/analytics'
import { socialRateLimitMessage } from '@/lib/socialNotifications'
import { COLORS, SPACING, RADIUS } from '@/lib/constants'

interface CompletionDetail {
  id: string
  user_id: string
  photo_url: string
  completed_at: string
  user: { username: string; level: number; avatar_url: string | null }
  quest: { title: string; xp_reward: number }
  like_count: number
  comment_count: number
  viewer_liked: boolean
}

export default function CompletionScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>()
  const completionId = paramAsString(params.id)
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { profile } = useAuth()
  const viewerId = profile?.id

  const [detail, setDetail] = useState<CompletionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [commentCount, setCommentCount] = useState(0)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  const isOwn = detail != null && viewerId === detail.user_id

  const load = useCallback(async () => {
    if (!completionId) return

    const [detailResult, likeResult] = await Promise.all([
      supabase
        .from('completions')
        .select(
          'id, user_id, photo_url, completed_at, profile:profiles(username, level, avatar_url), quest:quests(title, xp_reward), likes:completion_likes(count), comments:completion_comments(count)'
        )
        .eq('id', completionId)
        .maybeSingle(),
      viewerId
        ? supabase
            .from('completion_likes')
            .select('completion_id')
            .eq('completion_id', completionId)
            .eq('user_id', viewerId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    type Row = {
      id: string
      user_id: string
      photo_url: string
      completed_at: string
      profile: { username: string; level: number; avatar_url: string | null } | null
      quest: { title: string; xp_reward: number } | null
      likes: { count: number }[]
      comments: { count: number }[]
    }
    const row = detailResult.data as unknown as Row | null

    if (!row || !row.profile || !row.quest) {
      setDetail(null)
      setLoading(false)
      return
    }

    const mapped: CompletionDetail = {
      id: row.id,
      user_id: row.user_id,
      photo_url: row.photo_url,
      completed_at: row.completed_at,
      user: row.profile,
      quest: row.quest,
      like_count: row.likes?.[0]?.count ?? 0,
      comment_count: row.comments?.[0]?.count ?? 0,
      viewer_liked: likeResult.data != null,
    }
    setDetail(mapped)
    setLiked(mapped.viewer_liked)
    setLikeCount(mapped.like_count)
    setCommentCount(mapped.comment_count)
    setLoading(false)
  }, [completionId, viewerId])

  useEffect(() => {
    load()
  }, [load])

  async function toggleLike() {
    if (!viewerId || !detail) return
    const next = !liked
    setLiked(next)
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)))

    if (next) {
      const { error } = await supabase
        .from('completion_likes')
        .insert({ completion_id: detail.id, user_id: viewerId })
      if (error && error.code !== '23505') {
        setLiked(false)
        setLikeCount((c) => Math.max(0, c - 1))
        const limited = socialRateLimitMessage(error.hint)
        if (limited) Alert.alert('Slow down', limited)
      } else {
        track('post_liked')
      }
    } else {
      const { error } = await supabase
        .from('completion_likes')
        .delete()
        .eq('completion_id', detail.id)
        .eq('user_id', viewerId)
      if (error) {
        setLiked(true)
        setLikeCount((c) => c + 1)
      } else {
        track('post_unliked')
      }
    }
  }

  if (loading) {
    return (
      <View style={[styles.centerScreen, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  if (!detail) {
    return (
      <View style={[styles.centerScreen, { paddingTop: insets.top }]}>
        <EmptyState
          icon="🌫️"
          title="Completion unavailable"
          subtitle="This post was removed or isn't visible to you."
        />
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>← Go back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: insets.top + SPACING.sm,
        paddingBottom: insets.bottom + SPACING.xxl,
      }}
      showsVerticalScrollIndicator={false}
    >
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
        <Text style={styles.topBarTitle}>Quest post</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.card}>
        <TouchableOpacity
          style={styles.userRow}
          onPress={() => router.push(`/user/${detail.user_id}`)}
          accessibilityRole="button"
          accessibilityLabel={`View ${detail.user.username}'s profile`}
        >
          <Avatar username={detail.user.username} uri={detail.user.avatar_url} size={40} />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>@{detail.user.username}</Text>
            <Text style={styles.userMeta}>
              Level {detail.user.level}, {formatTimeAgo(detail.completed_at)}
            </Text>
          </View>
          <Text style={styles.xp}>+{detail.quest.xp_reward} XP</Text>
        </TouchableOpacity>

        <Image
          source={{ uri: sizedImageUrl(detail.photo_url, { width: 1000, height: 1000 }) }}
          style={styles.photo}
          resizeMode="cover"
          accessibilityLabel={`Proof photo for ${detail.quest.title}`}
        />

        <View style={styles.body}>
          <Text style={styles.questTitle}>✓ {detail.quest.title}</Text>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={toggleLike}
              disabled={!viewerId}
              accessibilityRole="button"
              accessibilityLabel={liked ? 'Unlike' : 'Like'}
            >
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={25}
                color={liked ? COLORS.highlight : COLORS.textPrimary}
              />
              {likeCount > 0 ? <Text style={styles.actionCount}>{likeCount}</Text> : null}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setCommentsOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="View comments"
            >
              <Ionicons name="chatbubble-outline" size={23} color={COLORS.textPrimary} />
              {commentCount > 0 ? <Text style={styles.actionCount}>{commentCount}</Text> : null}
            </TouchableOpacity>
            {isOwn ? (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setShareOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Share this quest"
              >
                <Ionicons name="paper-plane-outline" size={23} color={COLORS.textPrimary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>

      <CommentsSheet
        visible={commentsOpen}
        completionId={detail.id}
        currentUserId={viewerId}
        onClose={() => setCommentsOpen(false)}
        onCountChange={setCommentCount}
      />

      {isOwn ? (
        <ShareStoryModal
          visible={shareOpen}
          onClose={() => setShareOpen(false)}
          data={{
            photoUri: sizedImageUrl(detail.photo_url, { width: 1080 }),
            questTitle: detail.quest.title,
            username: detail.user.username,
            level: detail.user.level,
            xpReward: detail.quest.xp_reward,
            completedAt: detail.completed_at,
          }}
        />
      ) : null}
    </ScrollView>
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
    marginBottom: SPACING.sm,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '900' },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xxl,
    marginHorizontal: SPACING.lg,
    overflow: 'hidden',
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '800' },
  userMeta: { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  xp: { color: COLORS.success, fontSize: 13, fontWeight: '900' },
  photo: { width: '100%', aspectRatio: 1 },
  body: { padding: SPACING.lg, paddingTop: SPACING.md },
  questTitle: { color: COLORS.primary, fontSize: 14, fontWeight: '800' },
  actionRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.sm },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: SPACING.sm,
    justifyContent: 'center',
  },
  actionCount: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '800' },
})
