import { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { AppHeader } from '@/components/AppHeader'
import { COLORS, SPACING, RADIUS } from '@/lib/constants'
import type { Badge, UserBadgeWithBadge } from '@/lib/types'

export default function BadgesScreen() {
  const insets = useSafeAreaInsets()
  const { profile } = useAuth()
  const [allBadges, setAllBadges] = useState<Badge[]>([])
  const [earned, setEarned] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const [badgesResult, earnedResult] = await Promise.all([
      supabase.from('badges').select('*').order('name'),
      profile
        ? supabase.from('user_badges').select('badge_id').eq('user_id', profile.id)
        : Promise.resolve({ data: [] }),
    ])
    setAllBadges(badgesResult.data ?? [])
    setEarned(new Set((earnedResult.data ?? []).map((r) => r.badge_id)))
    setLoading(false)
  }, [profile?.id])

  useEffect(() => {
    load()
  }, [load])

  async function handleRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const earnedCount = allBadges.filter((b) => earned.has(b.id)).length

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={COLORS.primary}
        />
      }
    >
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <AppHeader trailing={<Text style={styles.screenLabel}>Badges</Text>} />
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Your collection</Text>
        <Text style={styles.summaryValue}>
          {loading ? '—' : `${earnedCount} / ${allBadges.length} earned`}
        </Text>
        <View style={styles.summaryTrack}>
          <View
            style={[
              styles.summaryFill,
              { width: allBadges.length ? `${(earnedCount / allBadges.length) * 100}%` : '0%' },
            ]}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>ALL BADGES</Text>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.grid}>
          {allBadges.map((badge) => {
            const isEarned = earned.has(badge.id)
            return (
              <View key={badge.id} style={[styles.tile, !isEarned && styles.tileLocked]}>
                {!isEarned && (
                  <View style={styles.lockOverlay}>
                    <Ionicons name="lock-closed" size={24} color={COLORS.textMuted} />
                  </View>
                )}
                {isEarned && (
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                  </View>
                )}
                <Text style={styles.badgeEmoji}>{badge.icon}</Text>
                <Text style={styles.badgeName}>{badge.name}</Text>
                <Text style={styles.badgeDesc} numberOfLines={2}>{badge.description}</Text>
                <View style={styles.rarityPill}>
                  <Text style={styles.rarityText}>BADGE</Text>
                </View>
              </View>
            )
          })}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: SPACING.xl, marginBottom: SPACING.lg },
  screenLabel: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '900' },
  summaryCard: {
    marginHorizontal: SPACING.xl,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  summaryLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
  summaryValue: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', marginVertical: SPACING.sm },
  summaryTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
  },
  summaryFill: { height: '100%', backgroundColor: '#FFFFFF', borderRadius: RADIUS.pill },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  tile: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xxl,
    padding: SPACING.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  tileLocked: { opacity: 0.6 },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    borderRadius: RADIUS.xxl,
  },
  checkBadge: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmoji: { fontSize: 28, marginBottom: SPACING.sm },
  badgeName: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '900', marginBottom: 4 },
  badgeDesc: { color: COLORS.textMuted, fontSize: 10, lineHeight: 14, marginBottom: SPACING.sm },
  rarityPill: {
    alignSelf: 'flex-start',
    backgroundColor: `${COLORS.primary}22`,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  rarityText: { color: COLORS.primary, fontSize: 10, fontWeight: '900' },
})
