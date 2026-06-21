import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import { Avatar } from '@/components/Avatar'
import { COLORS, SPACING, RADIUS } from '@/lib/constants'
import type { FeedPost } from '@/hooks/useActivityFeed'
import { formatTimeAgo } from '@/hooks/useActivityFeed'

interface Props {
  post: FeedPost
}

export function FeedPostCard({ post }: Props) {
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
      </View>
      <Image source={{ uri: post.photo_url }} style={styles.photo} resizeMode="cover" />
      <View style={styles.actions}>
        <TouchableOpacity style={styles.action} activeOpacity={0.7}>
          <Text style={styles.actionIcon}>♥</Text>
          <Text style={styles.actionCount}>—</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.action} activeOpacity={0.7}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionCount}>—</Text>
        </TouchableOpacity>
      </View>
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
  photo: { width: '100%', height: 208 },
  actions: {
    flexDirection: 'row',
    gap: SPACING.lg,
    padding: SPACING.lg,
    paddingTop: SPACING.md,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionIcon: { fontSize: 16, color: COLORS.textMuted },
  actionCount: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
})
