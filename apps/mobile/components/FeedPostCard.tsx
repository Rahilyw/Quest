import { useState } from 'react'
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
import { Avatar } from '@/components/Avatar'
import { ReportPostSheet } from '@/components/ReportPostSheet'
import { COLORS, SPACING, RADIUS } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import { reportErrorMessage, type ReportReason } from '@/lib/moderation'
import { track } from '@/lib/analytics'
import type { FeedPost } from '@/hooks/useActivityFeed'
import { formatTimeAgo } from '@/hooks/useActivityFeed'

interface Props {
  post: FeedPost
  currentUserId?: string
  onReported?: (completionId: string) => void
  onBlocked?: (userId: string) => void
}

export function FeedPostCard({ post, currentUserId, onReported, onBlocked }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reported, setReported] = useState(post.viewerReported)

  const isOwnPost = currentUserId != null && post.user_id === currentUserId

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
            onBlocked?.(post.user_id)
          },
        },
      ]
    )
  }

  if (reported) {
    return (
      <View style={styles.reportedStub}>
        <Text style={styles.reportedText}>Reported — thanks for keeping Quest real.</Text>
      </View>
    )
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar username={post.user.username} uri={post.user.avatar_url} size={40} />
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>@{post.user.username}</Text>
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
        source={{ uri: post.photo_url }}
        style={styles.photo}
        resizeMode="cover"
        accessibilityLabel={`${post.user.username}'s proof photo for ${post.quest.title}`}
      />

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
  photo: { width: '100%', height: 208, marginBottom: SPACING.xs },
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
