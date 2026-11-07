import { useEffect, useState } from 'react'
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Pressable,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Avatar } from '@/components/Avatar'
import { ReportPostSheet } from '@/components/ReportPostSheet'
import { CommentsSheet } from '@/components/CommentsSheet'
import { ShareStoryModal } from '@/components/ShareStoryModal'
import { COLORS, SPACING, RADIUS } from '@/lib/constants'
import { sizedImageUrl } from '@/lib/sizedImageUrl'
import { supabase } from '@/lib/supabase'
import { reportErrorMessage, type ReportReason } from '@/lib/moderation'
import { track } from '@/lib/analytics'
import { socialRateLimitMessage } from '@/lib/socialNotifications'
import type { FeedPost } from '@/hooks/useActivityFeed'
import { formatTimeAgo } from '@/hooks/useActivityFeed'

interface Props {
  post: FeedPost
  currentUserId?: string
  onReported?: (completionId: string) => void
  onBlocked?: (userId: string) => void
}

export function FeedPostCard({ post, currentUserId, onReported, onBlocked }: Props) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reported, setReported] = useState(post.viewerReported)
  const [liked, setLiked] = useState(post.viewer_liked)
  const [likeCount, setLikeCount] = useState(post.like_count)
  const [commentCount, setCommentCount] = useState(post.comment_count)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  const isOwnPost = currentUserId != null && post.user_id === currentUserId

  // Refetches replace post objects — resync interaction state with the source.
  useEffect(() => {
    setLiked(post.viewer_liked)
    setLikeCount(post.like_count)
    setCommentCount(post.comment_count)
  }, [post.id, post.viewer_liked, post.like_count, post.comment_count])

  function openProfile() {
    track('profile_opened', { self: isOwnPost, source: 'feed' })
    router.push(`/user/${post.user_id}`)
  }

  async function toggleLike() {
    if (!currentUserId) return

    const next = !liked
    setLiked(next)
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)))

    if (next) {
      const { error } = await supabase.from('completion_likes').insert({
        completion_id: post.id,
        user_id: currentUserId,
      })
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
        .eq('completion_id', post.id)
        .eq('user_id', currentUserId)
      if (error) {
        setLiked(true)
        setLikeCount((c) => c + 1)
      } else {
        track('post_unliked')
      }
    }
  }

  async function submitReport(reason: ReportReason, details: string) {
    if (!currentUserId) return

    const { error } = await supabase.from('completion_reports').insert({
      completion_id: post.id,
      reporter_id: currentUserId,
      reason,
      details: details || null,
    })

    if (error) {
      Alert.alert('Report failed', reportErrorMessage(error.code, error.hint ?? undefined))
      if (error.code === '23505') {
        setReported(true)
        onReported?.(post.id)
      }
      return
    }

    setReported(true)
    onReported?.(post.id)
    track('post_reported', { reason })
  }

  async function handleBlock() {
    setMenuOpen(false)
    if (!currentUserId) return

    Alert.alert(
      `Block @${post.user.username}?`,
      'Their posts will disappear from your feed. You can unblock later in Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('blocked_users').insert({
              blocker_id: currentUserId,
              blocked_id: post.user_id,
            })
            if (error && error.code !== '23505') {
              Alert.alert('Could not block user', error.message)
              return
            }
            track('user_blocked', { source: 'feed' })
            onBlocked?.(post.user_id)
          },
        },
      ]
    )
  }

  if (reported) {
    return (
      <View style={styles.reportedStub}>
        <Text style={styles.reportedText}>Reported. Thanks for keeping Quest real.</Text>
      </View>
    )
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={openProfile}
          accessibilityRole="button"
          accessibilityLabel={`View ${post.user.username}'s profile`}
        >
          <Avatar username={post.user.username} uri={post.user.avatar_url} size={40} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <TouchableOpacity onPress={openProfile}>
              <Text style={styles.name}>@{post.user.username}</Text>
            </TouchableOpacity>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>LV {post.user.level}</Text>
            </View>
          </View>
          <Text style={styles.questLine} numberOfLines={1}>✓ {post.quest.title}</Text>
        </View>
        <View style={styles.timeBlock}>
          <Text style={styles.xp}>+{post.quest.xp_reward} XP</Text>
          <Text style={styles.time}>{formatTimeAgo(post.completed_at)}</Text>
        </View>
        {!isOwnPost && currentUserId ? (
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => setMenuOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Post options"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.menuIcon}>⋯</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Image
        source={{ uri: sizedImageUrl(post.photo_url, { width: 800, height: 800 }) }}
        style={styles.photo}
        resizeMode="cover"
        accessibilityLabel={`${post.user.username}'s proof photo for ${post.quest.title}`}
      />

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={toggleLike}
          disabled={!currentUserId}
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Unlike' : 'Like'}
        >
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={24}
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
          <Ionicons name="chatbubble-outline" size={22} color={COLORS.textPrimary} />
          {commentCount > 0 ? <Text style={styles.actionCount}>{commentCount}</Text> : null}
        </TouchableOpacity>

        {isOwnPost ? (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShareOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Share this quest"
          >
            <Ionicons name="paper-plane-outline" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
        ) : null}
      </View>

      <CommentsSheet
        visible={commentsOpen}
        completionId={post.id}
        currentUserId={currentUserId}
        onClose={() => setCommentsOpen(false)}
        onCountChange={setCommentCount}
      />

      {isOwnPost ? (
        <ShareStoryModal
          visible={shareOpen}
          onClose={() => setShareOpen(false)}
          data={{
            photoUri: sizedImageUrl(post.photo_url, { width: 1080 }),
            questTitle: post.quest.title,
            username: post.user.username,
            level: post.user.level,
            xpReward: post.quest.xp_reward,
            completedAt: post.completed_at,
          }}
        />
      ) : null}

      <Modal transparent visible={menuOpen} animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={styles.menuSheet}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false)
                setReportOpen(true)
              }}
            >
              <Text style={styles.menuItemText}>🚩 Report post</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleBlock}>
              <Text style={styles.menuItemText}>Block @{post.user.username}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <ReportPostSheet
        visible={reportOpen}
        questTitle={post.quest.title}
        onClose={() => setReportOpen(false)}
        onSubmit={submitReport}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  reportedStub: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reportedText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.md,
  },
  headerInfo: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  levelBadge: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  levelText: { color: COLORS.primary, fontSize: 10, fontWeight: '700' },
  questLine: { color: COLORS.primary, fontSize: 11, marginTop: 2 },
  timeBlock: { alignItems: 'flex-end' },
  xp: { color: COLORS.success, fontSize: 12, fontWeight: '900' },
  time: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  menuBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -4,
  },
  menuIcon: { fontSize: 22, color: COLORS.textMuted, fontWeight: '700', lineHeight: 24 },
  photo: { width: '100%', height: 208 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
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
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.35)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    paddingBottom: SPACING.xxl,
  },
  menuItem: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemText: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '600' },
})
