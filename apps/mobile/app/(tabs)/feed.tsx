import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MapView, { Marker } from 'react-native-maps'
import { useQuests } from '@/hooks/useQuests'
import { useActivityFeed } from '@/hooks/useActivityFeed'
import { useBlockedUsers } from '@/hooks/useBlockedUsers'
import { useAuth } from '@/hooks/useAuth'
import { FeedPostCard } from '@/components/FeedPostCard'
import { AppHeader } from '@/components/AppHeader'
import { EmptyState } from '@/components/EmptyState'
import { COLORS, SPACING, RADIUS, CITY, CATEGORY_COLORS } from '@/lib/constants'

export default function FeedScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { quests } = useQuests()
  const { profile } = useAuth()
  const { blockedIds, refetch: refetchBlocks } = useBlockedUsers(profile?.id)
  const { posts, loading, refetch } = useActivityFeed(profile?.id, blockedIds)

  function handleFeedChange() {
    refetch()
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 100 }}
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

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Recent Completions</Text>
        <Text style={styles.seeAll}>See all</Text>
      </View>

      {loading ? (
        <Text style={styles.loading}>Loading feed…</Text>
      ) : posts.length === 0 ? (
        <EmptyState
          icon="📸"
          title="No completions yet"
          subtitle="When players finish quests, their proof photos show up here."
        />
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
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
  },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '900' },
  seeAll: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  feedList: { paddingHorizontal: SPACING.xl },
  loading: { color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.xxl },
})
