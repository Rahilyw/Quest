import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MapView, { Marker } from 'react-native-maps'
import { useQuests } from '@/hooks/useQuests'
import { useActivityFeed, type FeedMode } from '@/hooks/useActivityFeed'
import { useBlockedUsers } from '@/hooks/useBlockedUsers'
import { useAuth } from '@/hooks/useAuth'
import { FeedPostCard } from '@/components/FeedPostCard'
import { AppHeader } from '@/components/AppHeader'
import { EmptyState } from '@/components/EmptyState'
import { COLORS, SPACING, RADIUS, CITY, CATEGORY_COLORS, TAB_BAR_CLEARANCE } from '@/lib/constants'
import { track } from '@/lib/analytics'

const CITY_SHORT = CITY.name.split(',')[0]

export default function FeedScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { quests } = useQuests()
  const { profile } = useAuth()
  const { blockedIds, refetch: refetchBlocks } = useBlockedUsers(profile?.id)
  const [mode, setMode] = useState<FeedMode>('city')
  const { posts, loading, loadingMore, hasMore, refetch, loadMore } = useActivityFeed(
    profile?.id,
    blockedIds,
    mode
  )

  function handleFeedChange() {
    refetch()
  }

  useFocusEffect(
    useCallback(() => {
      track('feed_viewed', { post_count: posts.length, mode })
    }, [posts.length, mode])
  )

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <AppHeader />
        <Text style={styles.sectionLabel}>Activity Feed</Text>
      </View>

      <TouchableOpacity
        style={styles.mapCard}
        activeOpacity={0.9}
        onPress={() => router.push('/(tabs)/map')}
        accessibilityRole="button"
        accessibilityLabel="Open quest map"
      >
        <MapView
          style={styles.map}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          pointerEvents="none"
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
              pinColor={CATEGORY_COLORS[quest.category]}
            />
          ))}
        </MapView>
        <View style={styles.mapOverlay}>
          <View style={styles.mapPill}>
            <View style={styles.liveDot} />
            <Text style={styles.mapPillText}>{quests.length} quests near you</Text>
          </View>
          <View style={styles.mapCta}>
            <Text style={styles.mapCtaText}>Explore map →</Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.modeTabs}>
        {(
          [
            { key: 'city', label: CITY_SHORT },
            { key: 'following', label: 'Following' },
          ] as { key: FeedMode; label: string }[]
        ).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.modeTab, mode === tab.key && styles.modeTabActive]}
            onPress={() => setMode(tab.key)}
            accessibilityRole="button"
            accessibilityLabel={`Show ${tab.label} feed`}
          >
            <Text style={[styles.modeTabText, mode === tab.key && styles.modeTabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Recent Completions</Text>
      </View>

      {loading ? (
        <Text style={styles.loading}>Loading feed…</Text>
      ) : posts.length === 0 ? (
        mode === 'following' ? (
          <EmptyState
            icon="🫶"
            title="Your following feed is quiet"
            subtitle="Follow adventurers from the city feed and their quests land here."
            ctaLabel={`Browse the ${CITY_SHORT} feed`}
            onCtaPress={() => setMode('city')}
          />
        ) : (
          <EmptyState
            icon="📸"
            title="No completions yet"
            subtitle="When players finish quests, their proof photos show up here."
          />
        )
      ) : (
        <View style={styles.feedList}>
          {posts.map((post) => (
            <FeedPostCard
              key={post.id}
              post={post}
              currentUserId={profile?.id}
              onReported={handleFeedChange}
              onBlocked={() => {
                refetchBlocks()
                refetch()
              }}
            />
          ))}
          {hasMore ? (
            <TouchableOpacity
              style={styles.loadMoreBtn}
              onPress={loadMore}
              disabled={loadingMore}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Load more posts"
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={styles.loadMoreText}>Load more</Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: SPACING.xl, marginBottom: SPACING.md },
  sectionLabel: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: SPACING.sm,
  },
  mapCard: {
    marginHorizontal: SPACING.xl,
    height: 176,
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  map: { ...StyleSheet.absoluteFillObject },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  mapPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success },
  mapPillText: { color: COLORS.textPrimary, fontSize: 11, fontWeight: '700' },
  mapCta: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  mapCtaText: { color: COLORS.primary, fontSize: 11, fontWeight: '700' },
  modeTabs: {
    flexDirection: 'row',
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modeTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.pill,
    minHeight: 40,
    justifyContent: 'center',
  },
  modeTabActive: { backgroundColor: COLORS.primary },
  modeTabText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '800' },
  modeTabTextActive: { color: '#FFFFFF' },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
  },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '900' },
  feedList: { paddingHorizontal: SPACING.xl },
  loading: { color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.xxl },
  loadMoreBtn: {
    alignSelf: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    minHeight: 44,
    justifyContent: 'center',
    marginTop: SPACING.xs,
  },
  loadMoreText: { color: COLORS.primary, fontSize: 13, fontWeight: '800' },
})
