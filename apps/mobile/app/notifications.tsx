import { useCallback } from 'react'
import { View, StyleSheet, FlatList, Pressable, RefreshControl, Image } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Avatar } from '@/components/Avatar'
import { Sprite } from '@/components/Sprite'
import { Body, Name, Small, Title } from '@/components/ui/Text'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications, type InboxItem } from '@/hooks/useNotifications'
import { formatTimeAgo } from '@/hooks/useActivityFeed'
import { notificationRoute, notificationText } from '@/lib/socialNotifications'
import { track } from '@/lib/analytics'
import { sizedImageUrl } from '@/lib/sizedImageUrl'
import { COLOR, RADIUS, SPACE } from '@/lib/theme'

export default function NotificationsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { profile } = useAuth()
  const { items, loading, refreshing, error, refresh, markAllRead } = useNotifications(profile?.id)

  useFocusEffect(
    useCallback(() => {
      markAllRead()
    }, [markAllRead]),
  )

  useFocusEffect(
    useCallback(() => {
      if (!loading) track('notifications_viewed', { count: items.length })
    }, [loading, items.length]),
  )

  function open(item: InboxItem) {
    const route = notificationRoute(item.type, item.completion_id, item.actor_id)
    if (!route) return
    track('notification_opened', { type: item.type, source: 'inbox' })
    router.push(route as never)
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + SPACE.s3 }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={22} color={COLOR.ink} />
        </Pressable>
        <Title>Activity</Title>
      </View>

      {loading ? (
        <View style={styles.skeletons}>
          {[0, 1, 2].map((slot) => (
            <View key={slot} style={styles.skeleton} />
          ))}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + SPACE.s7 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLOR.ink} />}
          ListHeaderComponent={error ? <Body tone="soft" style={styles.error}>{error}</Body> : undefined}
          ListEmptyComponent={
            error ? undefined : (
              <View style={styles.empty}>
                <Sprite name="gull" size={88} />
                <Body tone="soft">Likes, comments, and new followers show up here.</Body>
              </View>
            )
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.row, item.read_at == null && styles.rowUnread]}
              onPress={() => open(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.actor.username} ${notificationText(item.type)}`}
            >
              <Pressable
                onPress={() => router.push(`/user/${item.actor_id}`)}
                accessibilityRole="button"
                accessibilityLabel={`Open ${item.actor.username}'s profile`}
              >
                <Avatar username={item.actor.username} uri={item.actor.avatar_url} size={40} />
              </Pressable>
              <View style={styles.rowInfo}>
                <Body numberOfLines={3}>
                  <Name>{item.actor.username}</Name>
                  {` ${notificationText(item.type)}`}
                  {item.comment?.body ? ` “${item.comment.body}”` : ''}
                </Body>
                <Small tone="faint">{formatTimeAgo(item.created_at)}</Small>
              </View>
              {item.completion?.photo_url ? (
                <Image
                  source={{ uri: sizedImageUrl(item.completion.photo_url, { width: 120, height: 120 }) }}
                  style={styles.thumb}
                />
              ) : null}
            </Pressable>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLOR.paper },
  header: {
    paddingHorizontal: SPACE.s4,
    paddingBottom: SPACE.s3,
    gap: SPACE.s2,
  },
  back: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginLeft: -SPACE.s2 },
  skeletons: { paddingHorizontal: SPACE.s4, gap: SPACE.s3 },
  skeleton: { height: 72, borderRadius: RADIUS.card, backgroundColor: COLOR.paperDeep },
  list: { paddingHorizontal: SPACE.s4 },
  error: { textAlign: 'center', marginBottom: SPACE.s3 },
  empty: { paddingTop: SPACE.s7, gap: SPACE.s3, alignItems: 'flex-start' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s3,
    minHeight: 72,
    paddingVertical: SPACE.s3,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.rule,
  },
  rowUnread: { backgroundColor: COLOR.paperDeep, marginHorizontal: -SPACE.s3, paddingHorizontal: SPACE.s3, borderRadius: RADIUS.control },
  rowInfo: { flex: 1, minWidth: 0, gap: SPACE.s1 },
  thumb: { width: 48, height: 48, borderRadius: RADIUS.control, backgroundColor: COLOR.desk },
})
