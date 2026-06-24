import { useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Avatar } from '@/components/Avatar'
import { Podium } from '@/components/Podium'
import { EmptyState } from '@/components/EmptyState'
import { COLORS, SPACING, RADIUS, CITY, getLevelTitle } from '@/lib/constants'
import type { LeaderboardEntry, UserBadgeWithBadge } from '@/lib/types'

/** Returns a compact rank-delta label and its colour given a user's delta. */
function getRankDelta(
  currentRank: number,
  lastWeekRank: number | null,
): { label: string; color: string } {
  if (lastWeekRank === null) {
    return { label: '–', color: COLORS.textMuted }
  }
  const delta = lastWeekRank - currentRank
  if (delta > 0) {
    return { label: `↑${delta}`, color: COLORS.success }
  }
  if (delta < 0) {
    return { label: `↓${Math.abs(delta)}`, color: COLORS.danger }
  }
  return { label: '–', color: COLORS.textMuted }
}

export default function RankingsScreen() {
  const insets = useSafeAreaInsets()
  const { profile } = useAuth()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [badges, setBadges] = useState<UserBadgeWithBadge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase
        .from('leaderboard')
        .select('*')
        .order('weekly_xp', { ascending: false })
        .limit(50),
      profile
        ? supabase
            .from('user_badges')
            .select('*, badge:badges(*)')
            .eq('user_id', profile.id)
            .limit(6)
        : Promise.resolve({ data: [] }),
    ]).then(async ([lbResult, badgeResult]) => {
      const lbRows = lbResult.data ?? []

      // Fetch last_week_rank for each user on the leaderboard.
      let rankMap: Record<string, number | null> = {}
      if (lbRows.length > 0) {
        const userIds = lbRows.map((r: { user_id: string }) => r.user_id)
        const { data: profileRows } = await supabase
          .from('profiles')
          .select('id, last_week_rank')
          .in('id', userIds)
        for (const p of profileRows ?? []) {
          rankMap[p.id] = p.last_week_rank ?? null
        }
      }

      setEntries(
        lbRows.map((e: any, i: number) => ({
          ...e,
          rank: i + 1,
          last_week_rank: rankMap[e.user_id] ?? null,
        })),
      )
      setBadges(badgeResult.data ?? [])
      setLoading(false)
    })
  }, [profile?.id])

  const rest = entries.slice(3)

  const ListHeaderComponent = (
    <>
      <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        <View style={styles.heroTop}>
          <View style={styles.menuIcon}>
            <View style={styles.menuLine} />
            <View style={[styles.menuLine, { width: 28 }]} />
            <View style={[styles.menuLine, { width: 16 }]} />
          </View>
          <Text style={styles.heroTitle}>QUEST! RANKINGS</Text>
          <Ionicons name="trophy" size={20} color={COLORS.warning} />
        </View>

        <Text style={styles.weekLabel}>WEEK 24 · {CITY.name.toUpperCase()}</Text>
        <Text style={styles.headline}>THE CITY&apos;S ELITE</Text>
        <Text style={styles.tagline}>Off the couch and onto the board.</Text>

        {!loading && entries.length >= 3 && <Podium entries={entries} />}
      </View>

      {badges.length > 0 && (
        <View style={styles.badgesSection}>
          <View style={styles.badgesHeader}>
            <Text style={styles.badgesTitle}>FEATURED BADGES</Text>
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>New</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {badges.map((ub) => (
              <View key={ub.badge_id} style={styles.featuredBadge}>
                <View style={styles.featuredBadgeIcon}>
                  <Text style={styles.featuredEmoji}>{ub.badge?.icon ?? '🏅'}</Text>
                </View>
                <Text style={styles.featuredName} numberOfLines={2}>
                  {ub.badge?.name}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.chasersHeader}>
        <Text style={styles.chasersTitle}>UPCOMING CHASERS</Text>
      </View>

      {loading ? (
        <Text style={styles.loading}>Loading…</Text>
      ) : entries.length === 0 ? (
        <EmptyState
          icon="🏆"
          title="No rankings yet"
          subtitle="Complete quests this week to appear on the board."
        />
      ) : null}
    </>
  )

  const ListFooterComponent = entries.length > 0 ? (
    <TouchableOpacity style={styles.boostBtn} activeOpacity={0.85}>
      <Text style={styles.boostText}>Boost Your Rank →</Text>
    </TouchableOpacity>
  ) : null

  return (
    <View style={styles.container}>
      <FlatList<LeaderboardEntry>
        data={loading || entries.length === 0 ? [] : rest}
        keyExtractor={(item) => item.user_id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        renderItem={({ item }) => {
          const { label: deltaLabel, color: deltaColor } = getRankDelta(
            item.rank,
            item.last_week_rank,
          )
          return (
            <View style={[
              styles.chaserRow,
              item.user_id === profile?.id && styles.chaserHighlight,
              { marginHorizontal: SPACING.xl },
            ]}>
              <View style={styles.rankBlock}>
                <Text style={styles.chaserRank}>{item.rank}</Text>
                <Text style={[styles.rankDelta, { color: deltaColor }]}>{deltaLabel}</Text>
              </View>
              <Avatar username={item.username} uri={item.avatar_url} size={40} />
              <View style={styles.chaserInfo}>
                <Text style={styles.chaserName}>@{item.username}</Text>
                <Text style={styles.chaserLevel}>
                  LV {estimateLevel(item.weekly_xp)} {getLevelTitle(estimateLevel(item.weekly_xp))}
                </Text>
              </View>
              <View style={styles.chaserXpBlock}>
                <Text style={styles.chaserXp}>{item.weekly_xp.toLocaleString()}</Text>
                <Text style={styles.chaserXpLabel}>XP</Text>
              </View>
            </View>
          )
        }}
      />
    </View>
  )
}

function estimateLevel(weeklyXp: number): number {
  if (weeklyXp >= 3500) return 9
  if (weeklyXp >= 2000) return 7
  if (weeklyXp >= 1000) return 5
  if (weeklyXp >= 500) return 4
  return 3
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  hero: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
    borderBottomLeftRadius: RADIUS.xxl,
    borderBottomRightRadius: RADIUS.xxl,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  menuIcon: { gap: 5, width: 32 },
  menuLine: { height: 2, width: 20, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.5)' },
  heroTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  weekLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  headline: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  tagline: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: SPACING.xl,
  },
  badgesSection: { paddingTop: SPACING.xl, paddingLeft: SPACING.xl },
  badgesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    paddingRight: SPACING.xl,
  },
  badgesTitle: { color: COLORS.textPrimary, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  newBadge: {
    backgroundColor: COLORS.highlight,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  newBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  featuredBadge: { alignItems: 'center', width: 80, marginRight: SPACING.md },
  featuredBadgeIcon: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  featuredEmoji: { fontSize: 24 },
  featuredName: {
    color: COLORS.textPrimary,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  chasersHeader: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: SPACING.sm },
  chasersTitle: { color: COLORS.textPrimary, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  chaserList: { paddingHorizontal: SPACING.xl },
  chaserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  chaserHighlight: { borderWidth: 1, borderColor: COLORS.primary },
  rankBlock: {
    alignItems: 'center',
    width: 32,
  },
  chaserRank: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '900',
  },
  rankDelta: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  chaserInfo: { flex: 1, minWidth: 0 },
  chaserName: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  chaserLevel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2 },
  chaserXpBlock: { alignItems: 'flex-end' },
  chaserXp: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '900' },
  chaserXpLabel: { color: COLORS.textMuted, fontSize: 10 },
  boostBtn: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  boostText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  loading: { color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.xxl },
})
