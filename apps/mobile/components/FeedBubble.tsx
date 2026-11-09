import { useEffect, useState } from 'react'
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Avatar } from '@/components/Avatar'
import { CommentsSheet } from '@/components/CommentsSheet'
import { Cutout } from '@/components/Cutout'
import { PhotoViewer } from '@/components/PhotoViewer'
import { Pillow, PILLOW_SIZES } from '@/components/Pillow'
import { ReportPostSheet } from '@/components/ReportPostSheet'
import { ShareStoryModal } from '@/components/ShareStoryModal'
import { Body, Micro, Name, Small } from '@/components/ui/Text'
import { formatTimeAgo, type FeedPost } from '@/hooks/useActivityFeed'
import type { QuestPhoto } from '@/hooks/useQuestPhotos'
import { track } from '@/lib/analytics'
import { xpLabel } from '@/lib/copy'
import { reportErrorMessage, type ReportReason } from '@/lib/moderation'
import { sizedImageUrl } from '@/lib/sizedImageUrl'
import { socialRateLimitMessage } from '@/lib/socialNotifications'
import { supabase } from '@/lib/supabase'
import { phraseFor } from '@/lib/thisWeek'
import { COLOR, getCategory, RADIUS, SHADOW, SPACE } from '@/lib/theme'

interface Props {
  post: FeedPost
  currentUserId?: string
  /** Higher stacks above the next bubble. */
  zIndex: number
  /** Pulls this bubble over the next one. Off for the last bubble. */
  overlap?: boolean
  onReported?: (completionId: string) => void
  onBlocked?: (userId: string) => void
}

export function FeedBubble({ post, currentUserId, zIndex, overlap = true, onReported, onBlocked }: Props) {
  const router = useRouter()
  const cat = getCategory(post.quest.category)
  const [menuOpen, setMenuOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reported, setReported] = useState(post.viewerReported)
  const [liked, setLiked] = useState(post.viewer_liked)
  const [likeCount, setLikeCount] = useState(post.like_count)
  const [commentCount, setCommentCount] = useState(post.comment_count)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)

  const isOwnPost = currentUserId != null && post.user_id === currentUserId
  const rawPhrase = phraseFor(post.quest)
  const phrase = rawPhrase.charAt(0).toUpperCase() + rawPhrase.slice(1)
  const photo: QuestPhoto = {
    id: post.id,
    user_id: post.user_id,
    username: post.user.username,
    avatar_url: post.user.avatar_url,
    photo_url: post.photo_url,
    completed_at: post.completed_at,
    like_count: likeCount,
    viewer_liked: liked,
  }

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
    setLikeCount((count) => Math.max(0, count + (next ? 1 : -1)))
    if (next) {
      const { error } = await supabase.from('completion_likes').insert({
        completion_id: post.id,
        user_id: currentUserId,
      })
      if (error && error.code !== '23505') {
        setLiked(false)
        setLikeCount((count) => Math.max(0, count - 1))
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
        setLikeCount((count) => count + 1)
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

  function handleBlock() {
    setMenuOpen(false)
    if (!currentUserId) return
    Alert.alert(`Block @${post.user.username}?`, 'Their posts will disappear from your feed. You can unblock later in Settings.', [
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
    ])
  }

  if (reported) {
    return (
      <View style={[styles.reported, { zIndex }]}>
        <Small tone="soft">Reported. Thanks for keeping the city honest.</Small>
      </View>
    )
  }

  return (
    <Pressable
      onPress={() => setViewerOpen(true)}
      accessibilityRole="button"
      accessibilityLabel={`${post.user.username} finished ${phrase}`}
      style={({ pressed }) => [
        styles.bubble,
        SHADOW.stack,
        { backgroundColor: cat.color, zIndex, elevation: zIndex, marginBottom: overlap ? -12 : SPACE.s4 },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.tail, { backgroundColor: cat.color }]} />
      <View style={styles.photoWrap}>
        <Pillow
          uri={sizedImageUrl(post.photo_url, { width: 200, height: 220 })}
          {...PILLOW_SIZES.bubble}
          edge="white"
          accessibilityLabel={`${post.user.username}'s proof photo`}
        />
        <Pressable
          onPress={openProfile}
          accessibilityRole="button"
          accessibilityLabel={`${post.user.username}'s profile`}
          style={styles.avatar}
        >
          <Avatar username={post.user.username} uri={post.user.avatar_url} size={28} />
        </Pressable>
      </View>
      <View style={styles.copy}>
        <Name color={cat.onColor} numberOfLines={1}>{post.user.username}</Name>
        <Small color={cat.onColor}>{formatTimeAgo(post.completed_at)}</Small>
        <Body color={cat.onColor} numberOfLines={2}>{phrase}</Body>
        <View style={styles.meta}>
          <View style={[styles.xp, cat.onColor === COLOR.white && styles.xpOnCobalt]}>
            <Micro color={cat.onColor === COLOR.white ? COLOR.ink : COLOR.white} tabular>
              {`+${xpLabel(post.quest.xp_reward)}`}
            </Micro>
          </View>
          <Pressable
            onPress={toggleLike}
            disabled={!currentUserId}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={liked ? 'Unlike' : 'Like'}
            style={styles.iconHit}
          >
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={cat.onColor} />
            {likeCount > 0 ? <Micro color={cat.onColor} tabular>{likeCount}</Micro> : null}
          </Pressable>
          <Pressable
            onPress={() => setCommentsOpen(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Comments"
            style={styles.iconHit}
          >
            <Ionicons name="chatbubble-outline" size={18} color={cat.onColor} />
            {commentCount > 0 ? <Micro color={cat.onColor} tabular>{commentCount}</Micro> : null}
          </Pressable>
          {isOwnPost ? (
            <Pressable
              onPress={() => setShareOpen(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Share"
              style={styles.iconHit}
            >
              <Ionicons name="share-outline" size={18} color={cat.onColor} />
            </Pressable>
          ) : currentUserId ? (
            <Pressable
              onPress={() => setMenuOpen(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Post options"
              style={styles.iconHit}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={cat.onColor} />
            </Pressable>
          ) : null}
        </View>
      </View>
      <Cutout
        uri={post.quest.cutout_url}
        category={post.quest.category}
        questTitle={post.quest.title}
        role="row"
      />
      <PhotoViewer
        visible={viewerOpen}
        photos={[photo]}
        startIndex={0}
        questTitle={post.quest.title}
        onClose={() => setViewerOpen(false)}
        onStart={() => {
          setViewerOpen(false)
          router.push(`/quest/${post.questId}?source=feed`)
        }}
      />
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
            category: post.quest.category,
            cutoutUrl: post.quest.cutout_url,
          }}
        />
      ) : null}
      <Modal transparent visible={menuOpen} animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)}>
          <View style={styles.sheet}>
            <Pressable
              style={styles.sheetRow}
              onPress={() => {
                setMenuOpen(false)
                setReportOpen(true)
              }}
              accessibilityRole="button"
            >
              <Body>Report post</Body>
            </Pressable>
            <Pressable style={styles.sheetRow} onPress={handleBlock} accessibilityRole="button">
              <Body>{`Block @${post.user.username}`}</Body>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
      <ReportPostSheet
        visible={reportOpen}
        questTitle={post.quest.title}
        onClose={() => setReportOpen(false)}
        onSubmit={submitReport}
      />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s3,
    borderRadius: RADIUS.bubble,
    padding: SPACE.s3,
    marginHorizontal: SPACE.s4,
  },
  pressed: { transform: [{ scale: 0.97 }] },
  tail: {
    position: 'absolute',
    bottom: -6,
    left: 48,
    width: 16,
    height: 16,
    transform: [{ rotate: '45deg' }],
  },
  photoWrap: { width: PILLOW_SIZES.bubble.width, height: PILLOW_SIZES.bubble.height },
  avatar: {
    position: 'absolute',
    right: -6,
    bottom: -4,
    borderWidth: 2,
    borderColor: COLOR.white,
    borderRadius: 16,
  },
  copy: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: SPACE.s2, marginTop: SPACE.s1 },
  xp: {
    backgroundColor: COLOR.ink,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.s2,
    paddingVertical: 4,
  },
  xpOnCobalt: { backgroundColor: COLOR.white },
  iconHit: { minWidth: 48, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 2 },
  reported: { marginHorizontal: SPACE.s4, marginBottom: SPACE.s3, padding: SPACE.s3 },
  backdrop: { flex: 1, backgroundColor: COLOR.scrim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLOR.paper,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    padding: SPACE.s4,
    paddingBottom: SPACE.s7,
  },
  sheetRow: { minHeight: 48, justifyContent: 'center' },
})
