import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Avatar } from '@/components/Avatar'
import { Podium } from '@/components/Podium'
import { EmptyState } from '@/components/EmptyState'
import { BrandText } from '@/components/BrandText'
import {
  COLORS,
  SPACING,
  RADIUS,
  CITY,
  getLevelTitle,
  getISOWeek,
  getDaysLeftInWeek,
} from '@/lib/constants'
import type { LeaderboardEntry, UserBadgeWithBadge } from '@/lib/types'
import { track } from '@/lib/analytics'

function getRankDelta(
  currentRank: number,
  lastWeekRank: number | null,
): { label: string; color: string } {
  if (lastWeekRank === null) {
    return { label: 'new', color: COLORS.primary }
  }
  const delta = lastWeekRank - currentRank
  if (delta > 0) {
    return { label: `↑${delta}`, color: COLORS.success }
  }
  if (delta < 0) {
    return { label: `↓${Math.abs(delta)}`, color: COLORS.danger }
  }
  return { label: '—', color: COLORS.textMuted }
}

export default function RankingsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { profile } = useAuth()
  const weekNum = getISOWeek()
  const daysLeft = getDaysLeftInWeek()
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
    ]).then(([lbResult, badgeResult]) => {
      const lbRows = lbResult.data ?? []

      setEntries(
        lbRows.map((e: LeaderboardEntry, i: number) => ({
          ...e,
          rank: i + 1,
          last_week_rank: e.last_week_rank ?? null,
        })),
      )
      setBadges(badgeResult.data ?? [])
      setLoading(false)
    })
  }, [profile?.id])

  const myEntry = useMemo(
    () => (profile ? entries.find((e) => e.user_id === profile.id) : undefined),
    [entries, profile],
  )

  useFocusEffect(
    useCallback(() => {
      track('leaderboard_viewed', { own_rank: myEntry?.rank ?? null })
    }, [myEntry?.rank])
  )

  const listEntries = entries.length > 3 ? entries.slice(3) : []

  const ListHeaderComponent = useMemo(
    () => (
      <>
        <View style={[styles.hero, { paddingTop: insets.top + 14 }]}>
          <View style={styles.heroBlobA} />
          <View style={styles.heroBlobB} />

          <View style={styles.heroTop}>
            <View style={styles.weekPill}>
              <Text style={styles.weekPillText}>☀️ WEEK {weekNum}</Text>
            </View>
            <View style={styles.cityPill}>
              <Text style={styles.cityPillText}>{CITY.name}</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>
            <BrandText uppercase color={COLORS.navy} size="compact" />
            <Text style={styles.heroTitleSuffix}> Rankings</Text>
          </Text>
          <Text style={styles.headline}>Who&apos;s owning the city?</Text>
          <Text style={styles.tagline}>
            Complete quests · earn XP · climb before Monday
          </Text>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{loading ? '—' : entries.length}</Text>
              <Text style={styles.heroStatLabel}>playing</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{daysLeft}</Text>
              <Text style={styles.heroStatLabel}>days left</Text>
            </View>
          </View>
        </View>

        <View style={styles.howItWorks}>
          <Ionicons name="information-circle" size={18} color={COLORS.primary} />
          <Text style={styles.howItWorksText}>
            Weekly XP from quest completions resets every Monday. Top players get bragging rights all week.
          </Text>
        </View>

        {profile && !loading && (
          <View style={styles.yourCard}>
            <View style={styles.yourCardHeader}>
              <Text style={styles.yourCardTitle}>Your week</Text>
              {myEntry ? (
                <View style={styles.yourRankPill}>
                  <Text style={styles.yourRankPillText}>#{myEntry.rank}</Text>
                </View>
              ) : (
                <Text style={styles.yourUnranked}>Not ranked yet</Text>
              )}
            </View>
            <View style={styles.yourCardBody}>
              <Avatar username={profile.username} uri={profile.avatar_url} size={44} />
              <View style={styles.yourCardInfo}>
                <Text style={styles.yourCardName}>@{profile.username}</Text>
                <Text style={styles.yourCardXp}>
                  {myEntry
                    ? `${myEntry.weekly_xp.toLocaleString()} XP this week`
                    : '0 XP — time to get out there'}
                </Text>
              </View>
              {!myEntry && (
                <TouchableOpacity
                  style={styles.yourCardCta}
                  onPress={() => router.push('/')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.yourCardCtaText}>Go →</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {!loading && entries.length > 0 && (
          <View style={styles.podiumSection}>
            <Text style={styles.sectionTitle}>🏆 Top players</Text>
            <Podium entries={entries} />
          </View>
        )}

        {badges.length > 0 && (
          <View style={styles.badgesSection}>
            <Text style={styles.sectionTitle}>Your badges</Text>
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

        {!loading && entries.length > 3 && (
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>The chase pack</Text>
            <Text style={styles.sectionSubtitle}>Everyone fighting for a podium spot</Text>
          </View>
        )}

        {loading ? (
          <Text style={styles.loading}>Loading rankings…</Text>
        ) : entries.length === 0 ? (
          <EmptyState
            icon="☀️"
            title="The board is wide open"
            subtitle="Be the first to complete a quest this week and claim #1."
            ctaLabel="Browse quests"
            onCtaPress={() => router.push('/')}
          />
        ) : entries.length <= 3 ? (
          <View style={styles.fewPlayersCard}>
            <Text style={styles.fewPlayersEmoji}>🌊</Text>
            <Text style={styles.fewPlayersTitle}>
              {entries.length === 1 ? 'Solo at the top — for now' : 'Small crew, big energy'}
            </Text>
            <Text style={styles.fewPlayersBody}>
              More explorers join every week. Complete quests to hold your spot or steal the crown.
            </Text>
            <TouchableOpacity
              style={styles.questCta}
              onPress={() => router.push('/')}
              activeOpacity={0.88}
            >
              <Ionicons name="compass" size={20} color="#FFFFFF" />
              <View style={styles.questCtaText}>
                <Text style={styles.questCtaTitle}>Find a quest</Text>
                <Text style={styles.questCtaSub}>Earn XP and move up the board</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>
        ) : null}
      </>
    ),
    [loading, entries, badges, insets.top, weekNum, daysLeft, profile, myEntry, router],
  )

  return (
    <View style={styles.container}>
      <FlatList<LeaderboardEntry>
        data={loading || entries.length <= 3 ? [] : listEntries}
        keyExtractor={(item) => item.user_id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={
          !loading && entries.length > 3 ? (
            <TouchableOpacity
              style={styles.questCtaFooter}
              onPress={() => router.push('/')}
              activeOpacity={0.88}
            >
              <Ionicons name="compass" size={20} color="#FFFFFF" />
              <View style={styles.questCtaText}>
                <Text style={styles.questCtaTitle}>Earn more XP</Text>
                <Text style={styles.questCtaSub}>Complete quests on Explore to climb the board</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          ) : null
        }
        renderItem={({ item }) => {
          const { label: deltaLabel, color: deltaColor } = getRankDelta(
            item.rank,
            item.last_week_rank,
          )
          const isMe = item.user_id === profile?.id
          return (
            <View
              style={[
                styles.row,
                isMe && styles.rowMe,
                { marginHorizontal: SPACING.lg },
              ]}
            >
              <View style={styles.rankBlock}>
                <Text style={styles.rankNum}>{item.rank}</Text>
                <Text style={[styles.rankDelta, { color: deltaColor }]}>{deltaLabel}</Text>
              </View>
              <Avatar username={item.username} uri={item.avatar_url} size={44} />
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>
                  @{item.username}
                  {isMe ? ' · you' : ''}
                </Text>
                <Text style={styles.rowLevel}>
                  LV {item.level} {getLevelTitle(item.level)}
                </Text>
              </View>
              <View style={styles.xpBlock}>
                <Text style={styles.xpValue}>{item.weekly_xp.toLocaleString()}</Text>
                <Text style={styles.xpLabel}>XP</Text>
              </View>
            </View>
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  hero: {
    backgroundColor: COLORS.bgOuter,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    borderBottomLeftRadius: RADIUS.xxl,
    borderBottomRightRadius: RADIUS.xxl,
    overflow: 'hidden',
    borderBottomWidth: 3,
    borderBottomColor: COLORS.sunshine,
  },
  heroBlobA: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  heroBlobB: {
    position: 'absolute',
    bottom: 20,
    left: -50,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(251,191,36,0.25)',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  weekPill: {
    backgroundColor: COLORS.sunshine,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  weekPillText: { color: COLORS.navy, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  cityPill: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  cityPillText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700' },
  heroTitle: { marginBottom: 4 },
  heroTitleSuffix: {
    color: COLORS.navy,
    fontSize: 22,
    fontWeight: '800',
  },
  headline: {
    color: COLORS.navy,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  tagline: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.lg,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    alignSelf: 'flex-start',
    gap: SPACING.lg,
  },
  heroStat: { alignItems: 'center' },
  heroStatValue: { color: COLORS.navy, fontSize: 22, fontWeight: '900' },
  heroStatLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroStatDivider: { width: 1, height: 28, backgroundColor: 'rgba(30,58,95,0.15)' },
  howItWorks: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.2)',
  },
  howItWorksText: {
    flex: 1,
    color: COLORS.accentText,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  yourCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.sunshine,
    shadowColor: COLORS.sunshine,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  yourCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  yourCardTitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  yourRankPill: {
    backgroundColor: COLORS.highlight,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
  },
  yourRankPillText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  yourUnranked: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700' },
  yourCardBody: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  yourCardInfo: { flex: 1 },
  yourCardName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800' },
  yourCardXp: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600', marginTop: 2 },
  yourCardCta: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  yourCardCtaText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  podiumSection: { marginTop: SPACING.xl, paddingHorizontal: SPACING.lg },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '900', marginBottom: SPACING.md },
  sectionSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: -8,
    marginBottom: SPACING.md,
  },
  badgesSection: { marginTop: SPACING.xl, paddingLeft: SPACING.lg },
  featuredBadge: { alignItems: 'center', width: 76, marginRight: SPACING.md },
  featuredBadgeIcon: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  featuredEmoji: { fontSize: 24 },
  featuredName: { color: COLORS.textPrimary, fontSize: 10, fontWeight: '700', textAlign: 'center' },
  listHeader: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl },
  fewPlayersCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primarySoft,
  },
  fewPlayersEmoji: { fontSize: 36, marginBottom: SPACING.sm },
  fewPlayersTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  fewPlayersBody: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: SPACING.lg,
  },
  questCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.highlight,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    width: '100%',
    shadowColor: COLORS.highlight,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  questCtaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.highlight,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    shadowColor: COLORS.highlight,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  questCtaText: { flex: 1 },
  questCtaTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  questCtaSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600', marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rowMe: { borderColor: COLORS.primary, borderWidth: 2, backgroundColor: COLORS.primarySoft },
  rankBlock: { alignItems: 'center', width: 36 },
  rankNum: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '900' },
  rankDelta: { fontSize: 10, fontWeight: '800', marginTop: 1, textTransform: 'uppercase' },
  rowInfo: { flex: 1, minWidth: 0 },
  rowName: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '800' },
  rowLevel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2 },
  xpBlock: { alignItems: 'flex-end' },
  xpValue: { color: COLORS.highlight, fontSize: 15, fontWeight: '900' },
  xpLabel: { color: COLORS.textMuted, fontSize: 9, fontWeight: '700' },
  loading: { color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.xxl, fontWeight: '600' },
})
