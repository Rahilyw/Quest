import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MapView, { Marker } from 'react-native-maps'
import { FeedBubble } from '@/components/FeedBubble'
import { Sprite } from '@/components/Sprite'
import { Body, BodyStrong, Micro, Small, Title } from '@/components/ui/Text'
import { useActivityFeed, type FeedMode } from '@/hooks/useActivityFeed'
import { useAuth } from '@/hooks/useAuth'
import { useBlockedUsers } from '@/hooks/useBlockedUsers'
import { useUnreadNotificationCount } from '@/hooks/useNotifications'
import { useQuests } from '@/hooks/useQuests'
import { track } from '@/lib/analytics'
import { plural } from '@/lib/copy'
import { CITY, TAB_BAR_CLEARANCE } from '@/lib/constants'
import { formatBadgeCount } from '@/lib/socialNotifications'
import { COLOR, RADIUS, SHADOW, SPACE, getCategory } from '@/lib/theme'

export default function FeedScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { quests } = useQuests()
  const { profile } = useAuth()
  const { blockedIds, refetch: refetchBlocks } = useBlockedUsers(profile?.id)
  const [mode, setMode] = useState<FeedMode>('city')
  const { count: unreadCount, refetch: refetchUnread } = useUnreadNotificationCount(profile?.id)
  const { posts, loading, loadingMore, hasMore, refetch, loadMore } = useActivityFeed(
    profile?.id,
    blockedIds,
    mode,
  )

  useFocusEffect(
    useCallback(() => {
      track('feed_viewed', { post_count: posts.length, mode })
    }, [posts.length, mode]),
  )

  useFocusEffect(
    useCallback(() => {
      refetchUnread()
    }, [refetchUnread]),
  )

  const [refreshing, setRefreshing] = useState(false)
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([refetch(), refetchUnread()])
    } finally {
      setRefreshing(false)
    }
  }, [refetch, refetchUnread])

  const modes: { key: FeedMode; label: string }[] = [
    { key: 'city', label: 'City' },
    { key: 'following', label: 'Following' },
  ]

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + SPACE.s5,
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLOR.ink} colors={[COLOR.ink]} />
        }
      >
        <View style={styles.titleRow}>
          <Title>City</Title>
          <Pressable
            onPress={() => router.push('/notifications')}
            accessibilityRole="button"
            accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            style={styles.bell}
          >
            <Ionicons name="notifications-outline" size={22} color={COLOR.ink} />
            {unreadCount > 0 ? (
              <View style={styles.bellDot}>
                <Micro color={COLOR.white}>{formatBadgeCount(unreadCount)}</Micro>
              </View>
            ) : null}
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.push('/(tabs)/map')}
          accessibilityRole="button"
          accessibilityLabel={`See the map. ${plural(quests.length, 'quest')} in Victoria.`}
          style={({ pressed }) => [styles.mapCard, SHADOW.lift, pressed && styles.pressed]}
        >
          <View style={styles.mapClip}>
            <MapView
              style={StyleSheet.absoluteFill}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              pointerEvents="none"
              liteMode
              cacheEnabled
              toolbarEnabled={false}
              initialRegion={{
                latitude: CITY.lat,
                longitude: CITY.lng,
                latitudeDelta: 0.06,
                longitudeDelta: 0.06,
              }}
            >
              {quests.slice(0, 8).map((quest) => (
                <Marker
                  key={quest.id}
                  coordinate={{ latitude: quest.lat, longitude: quest.lng }}
                  pinColor={getCategory(quest.category).color}
                />
              ))}
            </MapView>
            <View style={styles.mapOverlay} pointerEvents="none">
              <View style={styles.mapPill}>
                <Small>{`${plural(quests.length, 'quest')} in Victoria`}</Small>
              </View>
              <View style={styles.mapPill}>
                <Small>See the map</Small>
              </View>
            </View>
          </View>
        </Pressable>

        <View style={styles.modes} accessibilityRole="tablist">
          {modes.map((tab) => {
            const active = mode === tab.key
            return (
              <Pressable
                key={tab.key}
                onPress={() => setMode(tab.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Show the ${tab.label} feed`}
                style={[styles.mode, active && styles.modeOn]}
              >
                <Small color={active ? COLOR.white : COLOR.ink}>{tab.label}</Small>
              </Pressable>
            )
          })}
        </View>

        {loading && posts.length === 0 ? (
          <View style={styles.skeletons}>
            {[0, 1, 2].map((slot) => (
              <View key={slot} style={[styles.skeleton, slot < 2 && styles.skeletonOverlap]} />
            ))}
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.empty}>
            <Sprite name={mode === 'following' ? 'gull' : 'seal'} size={88} />
            <Body tone="soft" style={styles.emptyCopy}>
              {mode === 'following'
                ? 'Follow people from the city feed and their quests land here.'
                : 'Nobody’s posted today. The first proof photo of the day sits at the top of City until tomorrow.'}
            </Body>
            <Pressable
              onPress={() => (mode === 'following' ? setMode('city') : router.push('/quests'))}
              accessibilityRole="button"
              accessibilityLabel={mode === 'following' ? 'Browse the city feed' : 'Find a quest'}
              style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            >
              <BodyStrong color={COLOR.white}>{mode === 'following' ? 'Browse the city' : 'Find a quest'}</BodyStrong>
            </Pressable>
          </View>
        ) : (
          <View>
            {posts.map((post, index) => (
              <FeedBubble
                key={post.id}
                post={post}
                currentUserId={profile?.id}
                zIndex={posts.length - index}
                overlap={index < posts.length - 1}
                onReported={() => refetch()}
                onBlocked={() => {
                  refetchBlocks()
                  refetch()
                }}
              />
            ))}
            {hasMore ? (
              <Pressable
                onPress={loadMore}
                disabled={loadingMore}
                accessibilityRole="button"
                accessibilityLabel="More from the city"
                style={({ pressed }) => [styles.more, pressed && styles.pressed]}
              >
                {loadingMore ? (
                  <ActivityIndicator color={COLOR.white} />
                ) : (
                  <Small color={COLOR.white}>More from the city</Small>
                )}
              </Pressable>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLOR.paper },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE.s4,
    marginBottom: SPACE.s4,
  },
  bell: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  bellDot: {
    position: 'absolute',
    top: 6,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  mapCard: { marginHorizontal: SPACE.s4, marginBottom: SPACE.s4, borderRadius: RADIUS.card },
  pressed: { transform: [{ scale: 0.97 }] },
  mapClip: { height: 168, borderRadius: RADIUS.card, overflow: 'hidden', backgroundColor: COLOR.desk },
  mapOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: SPACE.s3,
  },
  mapPill: {
    backgroundColor: COLOR.white,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.s3,
    paddingVertical: SPACE.s2,
  },
  modes: {
    flexDirection: 'row',
    gap: SPACE.s2,
    marginHorizontal: SPACE.s4,
    marginBottom: SPACE.s5,
  },
  mode: {
    minHeight: 48,
    paddingHorizontal: SPACE.s4,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.paperDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeOn: { backgroundColor: COLOR.ink },
  skeletons: { paddingTop: SPACE.s2 },
  skeleton: {
    height: 108,
    marginHorizontal: SPACE.s4,
    borderRadius: RADIUS.bubble,
    backgroundColor: COLOR.paperDeep,
  },
  skeletonOverlap: { marginBottom: -12 },
  empty: { alignItems: 'flex-start', paddingHorizontal: SPACE.s4, gap: SPACE.s3, marginTop: SPACE.s4 },
  emptyCopy: { maxWidth: 320 },
  cta: {
    minHeight: 48,
    paddingHorizontal: SPACE.s5,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: { backgroundColor: COLOR.inkPressed, transform: [{ scale: 0.97 }] },
  more: {
    alignSelf: 'center',
    minHeight: 48,
    marginTop: SPACE.s5,
    paddingHorizontal: SPACE.s5,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
