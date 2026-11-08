import { useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Avatar } from '@/components/Avatar'
import { EmptyState } from '@/components/EmptyState'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications, type InboxItem } from '@/hooks/useNotifications'
import { formatTimeAgo } from '@/hooks/useActivityFeed'
import { notificationRoute, notificationText } from '@/lib/socialNotifications'
import { track } from '@/lib/analytics'
import { COLORS, SPACING, RADIUS } from '@/lib/constants'
import { sizedImageUrl } from '@/lib/sizedImageUrl'

export default function NotificationsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { profile } = useAuth()
  const { items, loading, refreshing, error, refresh, markAllRead } = useNotifications(profile?.id)

  // Opening the inbox clears the bell; rows keep their unread dot until the
  // next visit so the user can still see what's new.
  useFocusEffect(
    useCallback(() => {
      markAllRead()
    }, [markAllRead])
  )

  useFocusEffect(
    useCallback(() => {
      if (!loading) track('notifications_viewed', { count: items.length })
    }, [loading, items.length])
  )

  function open(item: InboxItem) {
    const route = notificationRoute(item.type, item.completion_id, item.actor_id)
    if (!route) return
    track('notification_opened', { type: item.type, source: 'inbox' })
    router.push(route as never)
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.back, { top: insets.top + 12, left: SPACING.lg }]}
        onPress={() => router.back()}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <View style={styles.backPill}>
          <Text style={styles.backText}>←</Text>
        </View>
      </TouchableOpacity>

      <Text style={[styles.screenTitle, { paddingTop: insets.top + 18 }]}>Activity</Text>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: insets.top + 120 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingTop: insets.top + 64 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
          ListEmptyComponent={
            error ? null : (
              <EmptyState
                icon="🔔"
                title="No activity yet"
                subtitle="Likes, comments, replies, and new followers show up here."
              />
            )
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.row, item.read_at == null && styles.rowUnread]}
              activeOpacity={0.8}
              onPress={() => open(item)}
              accessibilityRole="button"
              accessibilityLabel={`@${item.actor.username} ${notificationText(item.type)} ${item.comment?.body ?? ''}`}
            >
              <TouchableOpacity
                onPress={() => router.push(`/user/${item.actor_id}`)}
                accessibilityRole="button"
                accessibilityLabel={`Open @${item.actor.username}'s profile`}
              >
                <Avatar username={item.actor.username} uri={item.actor.avatar_url} size={40} />
              </TouchableOpacity>
              <View style={styles.rowInfo}>
                <Text style={styles.body} numberOfLines={3}>
                  <Text style={styles.username}>@{item.actor.username}</Text> {notificationText(item.type)}
                  {item.comment?.body ? <Text style={styles.quote}> “{item.comment.body}”</Text> : null}
                </Text>
                <Text style={styles.time}>{formatTimeAgo(item.created_at)}</Text>
              </View>
              {item.completion?.photo_url ? (
                <Image
                  source={{ uri: sizedImageUrl(item.completion.photo_url, { width: 120, height: 120 }) }}
                  style={styles.thumb}
                />
              ) : null}
              {item.read_at == null ? <View style={styles.unreadDot} /> : null}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  back: { position: 'absolute', zIndex: 10 },
  backPill: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 999,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  backText: { fontSize: 20, fontWeight: '700', lineHeight: 28, color: COLORS.accent },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9,
  },
  list: { padding: SPACING.md, paddingBottom: 80 },
  error: { color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  rowUnread: { borderColor: COLORS.primary },
  rowInfo: { flex: 1, minWidth: 0 },
  body: { color: COLORS.textMuted, fontSize: 14, lineHeight: 19 },
  username: { color: COLORS.textPrimary, fontWeight: '800' },
  quote: { color: COLORS.textPrimary },
  time: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  thumb: { width: 44, height: 44, borderRadius: RADIUS.sm },
  unreadDot: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.highlight,
  },
})
