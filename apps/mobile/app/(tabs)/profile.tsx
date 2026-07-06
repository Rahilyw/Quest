import { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Avatar } from '@/components/Avatar'
import { BrandText } from '@/components/BrandText'
import { useUserCompletions } from '@/hooks/useUserCompletions'
import { QuestHistoryItem } from '@/components/QuestHistoryItem'
import {
  COLORS,
  SPACING,
  RADIUS,
  CITY,
  getLevelTitle,
} from '@/lib/constants'

interface RecentQuest {
  id: string
  title: string
  category: string
  xp_reward: number
  completed_at: string
  redemption_code: string | null
  is_sponsored: boolean
  sponsor_reward: string | null
  status: 'approved' | 'removed'
}

const STAT_TILES = [
  { key: 'quests', label: 'Quests', icon: '🎯', tint: COLORS.primarySoft, accent: COLORS.primary },
  { key: 'xp', label: 'Total XP', icon: '⚡', tint: COLORS.goldSoft, accent: COLORS.highlight },
  { key: 'badges', label: 'Badges', icon: '🏅', tint: '#F3E8FF', accent: '#A855F7' },
  { key: 'streak', label: 'Streak', icon: '🔥', tint: COLORS.successSoft, accent: COLORS.success },
] as const

export default function Profile() {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const router = useRouter()

  const isWide = width >= 600
  const numCols = isWide ? 4 : 2
  const tileWidth = (width - 2 * SPACING.lg - (numCols - 1) * SPACING.md) / numCols
  const heroHPad = Math.max(SPACING.lg, insets.left + SPACING.sm)
  const { profile, loading, profileError, refreshProfile } = useAuth()
  const { refetch: refetchCompletions } = useUserCompletions(profile?.id)
  const [badgesCount, setBadgesCount] = useState(0)
  const [completionCount, setCompletionCount] = useState(0)
  const [weeklyRank, setWeeklyRank] = useState<number | null>(null)
  const [recentQuests, setRecentQuests] = useState<RecentQuest[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [statsLoading, setStatsLoading] = useState(true)

  const loadStats = useCallback(async () => {
    if (!profile) return
    setStatsLoading(true)

    const [badgesResult, countResult, historyResult, userXpResult] = await Promise.all([
      supabase.from('user_badges').select('badge_id', { count: 'exact' }).eq('user_id', profile.id),
      supabase
        .from('completions')
        .select('id', { count: 'exact' })
        .eq('user_id', profile.id)
        .eq('status', 'approved'),
      supabase
        .from('completions')
        .select('id, completed_at, redemption_code, status, quest:quests(title, category, xp_reward, is_sponsored, sponsor_reward)')
        .eq('user_id', profile.id)
        .in('status', ['approved', 'removed'])
        .order('completed_at', { ascending: false })
        .limit(5),
      supabase.from('leaderboard').select('weekly_xp').eq('user_id', profile.id).maybeSingle(),
    ])

    setBadgesCount(badgesResult.count ?? 0)
    setCompletionCount(countResult.count ?? 0)

    type HistoryRow = {
      id: string
      completed_at: string
      redemption_code: string | null
      status: 'approved' | 'removed'
      quest: {
        title: string
        category: string
        xp_reward: number
        is_sponsored: boolean
        sponsor_reward: string | null
      } | null
    }
    setRecentQuests(
      ((historyResult.data ?? []) as unknown as HistoryRow[])
        .filter((r) => r.quest)
        .map((r) => ({
          id: r.id,
          completed_at: r.completed_at,
          redemption_code: r.redemption_code,
          status: r.status,
          ...r.quest!,
        })),
    )

    const userWeeklyXp = userXpResult.data?.weekly_xp ?? null
    if (userWeeklyXp !== null) {
      const { count: aboveCount } = await supabase
        .from('leaderboard')
        .select('user_id', { count: 'exact', head: true })
        .gt('weekly_xp', userWeeklyXp)
      setWeeklyRank(aboveCount !== null ? aboveCount + 1 : null)
    } else {
      setWeeklyRank(null)
    }
    setStatsLoading(false)
  }, [profile])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useFocusEffect(useCallback(() => { refetchCompletions() }, [refetchCompletions]))

  const goToSettings = useCallback(() => router.push('/settings'), [router])
  const goToEditProfile = useCallback(() => router.push('/edit-profile'), [router])
  const goToExplore = useCallback(() => router.push('/'), [router])

  async function handleRefresh() {
    setRefreshing(true)
    await Promise.all([refreshProfile(), loadStats(), refetchCompletions()])
    setRefreshing(false)
  }

  if (loading) {
    return (
      <View style={[styles.loadingScreen, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.highlight} />
      </View>
    )
  }

  if (!profile) {
    return (
      <View style={[styles.loadingScreen, { paddingTop: insets.top }]}>
        <Text style={styles.errorTitle}>Could not load profile</Text>
        <Text style={styles.errorMessage}>{profileError ?? 'Try again or sign out and back in.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={refreshProfile} accessibilityRole="button">
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const streakValue = profile.current_streak > 0 ? `${profile.current_streak}w` : '—'
  const levelTitle = getLevelTitle(profile.level)

  const statValues: Record<string, string> = {
    quests: statsLoading ? '—' : String(completionCount),
    xp: statsLoading ? '—' : profile.total_xp.toLocaleString(),
    badges: statsLoading ? '—' : String(badgesCount),
    streak: streakValue,
  }

  const statAccents: Record<string, string> = {
    quests: COLORS.primary,
    xp: COLORS.highlight,
    badges: '#A855F7',
    streak: COLORS.success,
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 88 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.highlight} />
      }
    >
      {/* Summer hero */}
      <View style={[styles.hero, { paddingTop: insets.top + 14, paddingHorizontal: heroHPad }]}>
        <View style={styles.heroBlobA} />
        <View style={styles.heroBlobB} />

        <TouchableOpacity
          style={[styles.settingsBtn, { top: insets.top + 12, right: heroHPad }]}
          onPress={goToSettings}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <View style={styles.settingsPill}>
            <Ionicons name="settings-outline" size={20} color={COLORS.navy} />
          </View>
        </TouchableOpacity>

        <View style={styles.avatarRing}>
          <Avatar username={profile.username} uri={profile.avatar_url} size={88} />
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>LV {profile.level}</Text>
          </View>
        </View>

        <BrandText size="display" color={COLORS.navy} style={styles.levelTitle}>
          {levelTitle}
        </BrandText>

        <Text style={styles.heroName}>@{profile.username}</Text>
        <Text style={styles.heroMeta}>
          {CITY.name}
          {profile.current_streak > 0 ? ` · 🔥 ${profile.current_streak} week streak` : ''}
        </Text>

        <View style={styles.heroPills}>
          <View style={[styles.heroPill, styles.heroPillXp]}>
            <Text style={styles.heroPillLabel}>Total XP</Text>
            <Text style={styles.heroPillValue}>{profile.total_xp.toLocaleString()}</Text>
          </View>
          {weeklyRank ? (
            <View style={[styles.heroPill, styles.heroPillRank]}>
              <Text style={styles.heroPillLabel}>This week</Text>
              <Text style={styles.heroPillValue}>#{weeklyRank}</Text>
            </View>
          ) : (
            <View style={[styles.heroPill, styles.heroPillRankMuted]}>
              <Text style={styles.heroPillLabelMuted}>This week</Text>
              <Text style={styles.heroPillValueMuted}>Unranked</Text>
            </View>
          )}
        </View>
      </View>

      {/* Stats bento */}
      <View style={styles.statsSection}>
        <BrandText size="compact" color={COLORS.navy} style={styles.statsHeading}>
          Your stats
        </BrandText>
        <View style={styles.statsGrid}>
          {STAT_TILES.map((tile) => (
            <View
              key={tile.key}
              style={[
                styles.statTile,
                { width: tileWidth, backgroundColor: tile.tint, borderColor: `${tile.accent}33` },
              ]}
            >
              <Text style={styles.statIcon}>{tile.icon}</Text>
              <Text style={[styles.statValue, { color: statAccents[tile.key] }]}>
                {statValues[tile.key]}
              </Text>
              <Text style={styles.statLabel}>{tile.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Quick actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={goToEditProfile}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
        >
          <Ionicons name="create-outline" size={18} color="#FFFFFF" />
          <Text style={styles.editBtnText}>Edit profile</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rankBtn}
          onPress={() => router.push('/leaderboard')}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="View rankings"
        >
          <Ionicons name="trophy-outline" size={18} color={COLORS.navy} />
          <Text style={styles.rankBtnText}>Rankings</Text>
        </TouchableOpacity>
      </View>

      {/* Recent activity */}
      <View style={styles.activitySection}>
        <View style={styles.activityHeader}>
          <BrandText size="compact" color={COLORS.navy}>
            Trail log
          </BrandText>
          <Text style={styles.activitySub}>Recent quests you crushed</Text>
        </View>

        {recentQuests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🧭</Text>
            <Text style={styles.emptyTitle}>No trails yet</Text>
            <Text style={styles.emptyBody}>
              Your completed quests show up here. Grab one from Explore and get out there.
            </Text>
            <TouchableOpacity style={styles.emptyCta} onPress={goToExplore} activeOpacity={0.88}>
              <Text style={styles.emptyCtaText}>Find a quest →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.activityList}>
            {recentQuests.map((q) => (
              <View key={q.id} style={styles.activityRow}>
                <QuestHistoryItem
                  title={q.title}
                  category={q.category}
                  xp_reward={q.xp_reward}
                  completed_at={q.completed_at}
                  redemption_code={q.redemption_code}
                  is_sponsored={q.is_sponsored}
                  sponsor_reward={q.sponsor_reward}
                  status={q.status}
                />
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingScreen: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  errorTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: SPACING.sm },
  errorMessage: { color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING.lg },
  retryBtn: {
    backgroundColor: COLORS.highlight,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  retryBtnText: { color: '#FFFFFF', fontWeight: '700' },

  hero: {
    backgroundColor: COLORS.bgOuter,
    alignItems: 'center',
    paddingBottom: SPACING.xxl + 8,
    borderBottomLeftRadius: RADIUS.xxl,
    borderBottomRightRadius: RADIUS.xxl,
    overflow: 'hidden',
    borderBottomWidth: 3,
    borderBottomColor: COLORS.sunshine,
  },
  heroBlobA: {
    position: 'absolute',
    top: -30,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  heroBlobB: {
    position: 'absolute',
    top: 40,
    right: -50,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(251,191,36,0.3)',
  },
  settingsBtn: { position: 'absolute', zIndex: 2 },
  settingsPill: {
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: RADIUS.pill,
    padding: SPACING.sm,
  },
  avatarRing: {
    borderWidth: 3,
    borderColor: COLORS.sunshine,
    borderRadius: 50,
    marginBottom: SPACING.sm,
    position: 'relative',
    shadowColor: COLORS.sunshine,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  levelBadge: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    backgroundColor: COLORS.highlight,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: COLORS.bgOuter,
  },
  levelBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  levelTitle: {
    textAlign: 'center',
    marginBottom: 2,
  },
  heroName: {
    color: COLORS.navy,
    fontSize: 18,
    fontWeight: '800',
    marginTop: SPACING.xs,
  },
  heroMeta: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  heroPills: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  heroPill: {
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    minWidth: 110,
    alignItems: 'center',
  },
  heroPillXp: {
    backgroundColor: COLORS.primary,
  },
  heroPillRank: {
    backgroundColor: COLORS.highlight,
  },
  heroPillRankMuted: {
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(30,58,95,0.12)',
  },
  heroPillLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  heroPillLabelMuted: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  heroPillValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  heroPillValueMuted: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '800',
  },

  statsSection: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  statsHeading: {
    marginBottom: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  statTile: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 2,
  },
  statIcon: { fontSize: 24, marginBottom: SPACING.xs },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', marginTop: 2 },

  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.highlight,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.md,
    shadowColor: COLORS.highlight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  editBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  rankBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.sunshine,
  },
  rankBtnText: { color: COLORS.navy, fontWeight: '800', fontSize: 14 },

  activitySection: {
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  activityHeader: { marginBottom: SPACING.md },
  activitySub: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primarySoft,
    borderStyle: 'dashed',
  },
  emptyEmoji: { fontSize: 36, marginBottom: SPACING.sm },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: SPACING.xs,
  },
  emptyBody: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: SPACING.lg,
  },
  emptyCta: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  emptyCtaText: {
    color: COLORS.accentText,
    fontWeight: '800',
    fontSize: 13,
  },
  activityList: { gap: SPACING.sm },
  activityRow: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
})
