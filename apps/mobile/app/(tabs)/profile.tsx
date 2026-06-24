import { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Avatar } from '@/components/Avatar'
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
}

export default function Profile() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
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

    const [badgesResult, countResult, historyResult, leaderboardResult] = await Promise.all([
      supabase.from('user_badges').select('badge_id', { count: 'exact' }).eq('user_id', profile.id),
      supabase
        .from('completions')
        .select('id', { count: 'exact' })
        .eq('user_id', profile.id)
        .eq('status', 'approved'),
      supabase
        .from('completions')
        .select('id, completed_at, redemption_code, quest:quests(title, category, xp_reward, is_sponsored, sponsor_reward)')
        .eq('user_id', profile.id)
        .eq('status', 'approved')
        .order('completed_at', { ascending: false })
        .limit(3),
      supabase.from('leaderboard').select('user_id').order('weekly_xp', { ascending: false }).limit(50),
    ])

    setBadgesCount(badgesResult.count ?? 0)
    setCompletionCount(countResult.count ?? 0)

    type HistoryRow = {
      id: string
      completed_at: string
      redemption_code: string | null
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
          ...r.quest!,
        }))
    )

    const entries = leaderboardResult.data ?? []
    const idx = entries.findIndex((e) => e.user_id === profile.id)
    setWeeklyRank(idx >= 0 ? idx + 1 : null)
    setStatsLoading(false)
  }, [profile])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useFocusEffect(useCallback(() => { refetchCompletions() }, [refetchCompletions]))

  async function handleRefresh() {
    setRefreshing(true)
    await Promise.all([refreshProfile(), loadStats(), refetchCompletions()])
    setRefreshing(false)
  }

  if (loading) {
    return (
      <View style={[styles.loadingScreen, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  if (!profile) {
    return (
      <View style={[styles.loadingScreen, { paddingTop: insets.top }]}>
        <Text style={styles.errorTitle}>Could not load profile</Text>
        <Text style={styles.errorMessage}>{profileError ?? 'Try again or sign out and back in.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={refreshProfile}>
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const stats = [
    { label: 'Quests Done', value: statsLoading ? '—' : String(completionCount), icon: '🎯' },
    { label: 'Total XP', value: statsLoading ? '—' : profile.total_xp.toLocaleString(), icon: '⚡' },
    { label: 'Badges', value: statsLoading ? '—' : String(badgesCount), icon: '🏅' },
    { label: 'Best Rank', value: weeklyRank ? `#${weeklyRank}` : '—', icon: '🏆' },
  ]

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
      }
    >
      <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          style={[styles.settingsBtn, { top: insets.top + 16 }]}
          onPress={() => router.push('/settings')}
        >
          <Ionicons name="settings-outline" size={22} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>

        <View style={styles.avatarRing}>
          <Avatar username={profile.username} uri={profile.avatar_url} size={80} />
        </View>
        <Text style={styles.heroName}>@{profile.username}</Text>
        <Text style={styles.heroMeta}>
          LV {profile.level} · Week 24 · {CITY.name}
        </Text>
        <View style={styles.heroPills}>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillText}>{profile.total_xp.toLocaleString()} XP</Text>
          </View>
          {weeklyRank && (
            <View style={[styles.heroPill, styles.heroPillAccent]}>
              <Text style={styles.heroPillText}>Rank #{weeklyRank}</Text>
            </View>
          )}
        </View>
        <Text style={styles.heroTitle}>{getLevelTitle(profile.level)}</Text>
      </View>

      <View style={styles.statsGrid}>
        {stats.map((s) => (
          <View key={s.label} style={styles.statTile}>
            <Text style={styles.statIcon}>{s.icon}</Text>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.editLink} onPress={() => router.push('/edit-profile')}>
        <Text style={styles.editLinkText}>Edit Profile →</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
      {recentQuests.length === 0 ? (
        <Text style={styles.emptyActivity}>No completed quests yet — start exploring!</Text>
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
              />
            </View>
          ))}
        </View>
      )}
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
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  retryBtnText: { color: '#FFFFFF', fontWeight: '700' },
  hero: {
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    paddingBottom: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
    borderBottomLeftRadius: RADIUS.xxl,
    borderBottomRightRadius: RADIUS.xxl,
  },
  settingsBtn: { position: 'absolute', right: SPACING.xl, padding: SPACING.sm, zIndex: 1 },
  avatarRing: {
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 44,
    marginBottom: SPACING.md,
  },
  heroName: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  heroMeta: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600', marginTop: 4 },
  heroTitle: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: SPACING.sm,
  },
  heroPills: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  heroPill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  heroPillAccent: { backgroundColor: COLORS.primary },
  heroPillText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.xl,
    marginTop: -SPACING.lg,
    gap: SPACING.md,
  },
  statTile: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  statIcon: { fontSize: 22, marginBottom: SPACING.xs },
  statValue: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '900' },
  statLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2 },
  editLink: { alignItems: 'center', paddingVertical: SPACING.lg },
  editLinkText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
  },
  emptyActivity: {
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  activityList: { paddingHorizontal: SPACING.sm, gap: SPACING.xs },
  // Outer wrapper carries elevation — no overflow clip to avoid Android shadow bug
  activityRow: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
})
