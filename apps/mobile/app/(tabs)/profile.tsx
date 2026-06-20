import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { XPBar } from '@/components/XPBar'
import { BadgeGrid } from '@/components/BadgeGrid'
import { Avatar } from '@/components/Avatar'
import { LevelChip } from '@/components/LevelChip'
import { SectionHeader } from '@/components/SectionHeader'
import { EmptyState } from '@/components/EmptyState'
import { QuestHistoryItem } from '@/components/QuestHistoryItem'
import { COLORS, SPACING, RADIUS, CATEGORY_ICONS, CATEGORY_COLORS } from '@/lib/constants'
import type { UserBadgeWithBadge } from '@/lib/types'

interface CompletedQuest {
  id: string
  title: string
  category: string
  xp_reward: number
  completed_at: string
  redemption_code: string | null
  is_sponsored: boolean
}

function formatMemberSince(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

export default function Profile() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { profile, loading, refreshProfile } = useAuth()
  const [badges, setBadges] = useState<UserBadgeWithBadge[]>([])
  const [completionCount, setCompletionCount] = useState(0)
  const [completedQuests, setCompletedQuests] = useState<CompletedQuest[]>([])
  const [weeklyRank, setWeeklyRank] = useState<number | null>(null)
  const [weeklyXp, setWeeklyXp] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [statsLoading, setStatsLoading] = useState(true)

  const loadProfileStats = useCallback(async () => {
    if (!profile) return

    setStatsLoading(true)

    const [badgesResult, countResult, historyResult, leaderboardResult] = await Promise.all([
      supabase
        .from('user_badges')
        .select('*, badge:badges(*)')
        .eq('user_id', profile.id),
      supabase
        .from('completions')
        .select('id', { count: 'exact' })
        .eq('user_id', profile.id)
        .eq('status', 'approved'),
      supabase
        .from('completions')
        .select('id, completed_at, redemption_code, quest:quests(title, category, xp_reward, is_sponsored)')
        .eq('user_id', profile.id)
        .eq('status', 'approved')
        .order('completed_at', { ascending: false })
        .limit(20),
      supabase
        .from('leaderboard')
        .select('user_id, weekly_xp')
        .order('weekly_xp', { ascending: false })
        .limit(50),
    ])

    setBadges(badgesResult.data ?? [])
    setCompletionCount(countResult.count ?? 0)

    type HistoryRow = {
      id: string
      completed_at: string
      redemption_code: string | null
      quest: { title: string; category: string; xp_reward: number; is_sponsored: boolean } | null
    }

    const mapped = ((historyResult.data ?? []) as unknown as HistoryRow[])
      .filter((item) => item.quest != null)
      .map((item) => ({
        id: item.id,
        title: item.quest!.title,
        category: item.quest!.category,
        xp_reward: item.quest!.xp_reward,
        completed_at: item.completed_at,
        redemption_code: item.redemption_code,
        is_sponsored: item.quest!.is_sponsored ?? false,
      }))
    setCompletedQuests(mapped)

    const entries = leaderboardResult.data ?? []
    const myIndex = entries.findIndex((e) => e.user_id === profile.id)
    if (myIndex >= 0) {
      setWeeklyRank(myIndex + 1)
      setWeeklyXp(entries[myIndex].weekly_xp)
    } else {
      setWeeklyRank(null)
      setWeeklyXp(0)
    }

    setStatsLoading(false)
  }, [profile])

  useEffect(() => {
    loadProfileStats()
  }, [loadProfileStats])

  async function handleRefresh() {
    setRefreshing(true)
    await Promise.all([refreshProfile(), loadProfileStats()])
    setRefreshing(false)
  }

  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const quest of completedQuests) {
      counts[quest.category] = (counts[quest.category] ?? 0) + 1
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
  }, [completedQuests])

  const currentStreak = profile?.current_streak ?? 0
  const longestStreak = profile?.longest_streak ?? 0

  if (loading || !profile) {
    return (
      <View style={[styles.loadingScreen, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={COLORS.accent}
          colors={[COLORS.accent]}
        />
      }
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.screenTitle}>Profile</Text>
        <TouchableOpacity
          style={[styles.settingsBtn, { top: insets.top + 16 }]}
          activeOpacity={0.8}
          onPress={() => router.push('/settings')}
        >
          <Ionicons name="settings-outline" size={22} color={COLORS.textMuted} />
        </TouchableOpacity>

        <View style={styles.heroCard}>
          <View style={styles.avatarContainer}>
            <Avatar username={profile.username} uri={profile.avatar_url} size={88} />
            <View style={styles.levelOverlay}>
              <LevelChip level={profile.level} compact />
            </View>
          </View>

          <Text style={styles.username}>@{profile.username}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.city}>{profile.city}</Text>
          </View>
          <Text style={styles.memberSince}>
            Member since {formatMemberSince(profile.created_at)}
          </Text>

          <TouchableOpacity
            style={styles.editBtn}
            activeOpacity={0.8}
            onPress={() => router.push('/edit-profile')}
          >
            <Ionicons name="create-outline" size={16} color={COLORS.accentText} />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {weeklyRank !== null && (
        <TouchableOpacity
          style={styles.rankCard}
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/leaderboard')}
        >
          <View style={styles.rankLeft}>
            <Text style={styles.rankLabel}>This week</Text>
            <Text style={styles.rankXp}>{weeklyXp.toLocaleString()} XP earned</Text>
          </View>
          <View style={styles.rankBadge}>
            <Text style={styles.rankNumber}>#{weeklyRank}</Text>
            <Text style={styles.rankHint}>View ranks →</Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{statsLoading ? '—' : completionCount}</Text>
          <Text style={styles.statLabel}>Quests</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {statsLoading ? '—' : profile.total_xp.toLocaleString()}
          </Text>
          <Text style={styles.statLabel}>Total XP</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{statsLoading ? '—' : badges.length}</Text>
          <Text style={styles.statLabel}>Badges</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>Lv {profile.level}</Text>
          <Text style={styles.statLabel}>Level</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {currentStreak >= 2 ? `🔥${currentStreak}` : currentStreak}
          </Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
      </View>

      <XPBar totalXp={profile.total_xp} />

      {longestStreak > 0 && currentStreak > 0 && (
        <View style={styles.streakBestCard}>
          <Text style={styles.streakBestText}>
            Personal best: {longestStreak} week streak
          </Text>
        </View>
      )}

      {categoryBreakdown.length > 0 && (
        <>
          <SectionHeader title="Top Categories" />
          <View style={styles.categoryCard}>
            {categoryBreakdown.map(([category, count]) => {
              const pct = Math.round((count / completionCount) * 100)
              return (
                <View key={category} style={styles.categoryRow}>
                  <View style={styles.categoryLabelRow}>
                    <Text style={styles.categoryIcon}>
                      {CATEGORY_ICONS[category] ?? '📍'}
                    </Text>
                    <Text style={styles.categoryName}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Text>
                    <Text style={styles.categoryCount}>{count}</Text>
                  </View>
                  <View style={styles.categoryTrack}>
                    <View
                      style={[
                        styles.categoryFill,
                        {
                          width: `${pct}%`,
                          backgroundColor: CATEGORY_COLORS[category] ?? COLORS.accent,
                        },
                      ]}
                    />
                  </View>
                </View>
              )
            })}
          </View>
        </>
      )}

      <SectionHeader title="Badges" trailing={badges.length > 0 ? `${badges.length}` : undefined} />
      <BadgeGrid badges={badges} />

      <SectionHeader title="Quest History" />
      {completedQuests.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No completed quests yet"
          subtitle="Approved quests will appear here"
        />
      ) : (
        <View style={styles.historyList}>
          {completedQuests.map((quest, index) => (
            <View key={quest.id}>
              <QuestHistoryItem
                title={quest.title}
                category={quest.category}
                xp_reward={quest.xp_reward}
                completed_at={quest.completed_at}
                redemption_code={quest.redemption_code}
                is_sponsored={quest.is_sponsored}
              />
              {index < completedQuests.length - 1 && <View style={styles.historyDivider} />}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 100 },
  loadingScreen: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.xl,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    alignSelf: 'flex-start',
    marginBottom: SPACING.lg,
  },
  settingsBtn: {
    position: 'absolute',
    right: SPACING.xl,
    padding: SPACING.sm,
  },
  heroCard: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarContainer: { marginBottom: SPACING.md, position: 'relative' },
  levelOverlay: {
    position: 'absolute',
    bottom: -4,
    right: -4,
  },
  username: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '800' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.xs,
  },
  city: { color: COLORS.textMuted, fontSize: 14 },
  memberSince: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: SPACING.xs,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  editBtnText: { color: COLORS.accentText, fontWeight: '700', fontSize: 14 },
  rankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
    backgroundColor: COLORS.accentSoft,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  rankLeft: { flex: 1 },
  rankLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  rankXp: { color: COLORS.accentText, fontWeight: '800', fontSize: 16, marginTop: 2 },
  rankBadge: { alignItems: 'flex-end' },
  rankNumber: { color: COLORS.accentText, fontWeight: '800', fontSize: 24 },
  rankHint: { color: COLORS.accent, fontSize: 11, fontWeight: '600', marginTop: 2 },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stat: { alignItems: 'center', flex: 1 },
  statDivider: { width: 1, height: 36, backgroundColor: COLORS.border },
  statValue: { color: COLORS.accent, fontSize: 18, fontWeight: '800' },
  statLabel: { color: COLORS.textMuted, marginTop: 4, fontSize: 11 },
  streakBestCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
    backgroundColor: COLORS.accentSoft,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  streakBestText: { color: COLORS.accentText, fontWeight: '700', fontSize: 14 },
  categoryCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  categoryRow: { gap: SPACING.xs },
  categoryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  categoryIcon: { fontSize: 14 },
  categoryName: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  categoryCount: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  categoryTrack: {
    height: 6,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
  },
  categoryFill: {
    height: '100%',
    borderRadius: RADIUS.pill,
  },
  historyList: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  historyDivider: { height: 1, backgroundColor: COLORS.border },
})
