import { useMemo, useCallback, useState, useEffect } from 'react'
import {
  View,
  FlatList,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuests } from '@/hooks/useQuests'
import { useUserCompletions } from '@/hooks/useUserCompletions'
import { useAuth } from '@/hooks/useAuth'
import { useUnreadNotificationCount } from '@/hooks/useNotifications'
import { QuestHeroCard } from '@/components/QuestHeroCard'
import { QuestCardSkeleton } from '@/components/QuestCardSkeleton'
import { CategoryChip } from '@/components/CategoryChip'
import { EmptyState } from '@/components/EmptyState'
import { AppHeader } from '@/components/AppHeader'
import { PlayerCard } from '@/components/PlayerCard'
import { COLORS, SPACING, TAB_BAR_CLEARANCE, getDaysLeftInWeek } from '@/lib/constants'
import { daysLeftLabel } from '@/lib/copy'
import { supabase } from '@/lib/supabase'
import type { QuestCategory } from '@/lib/types'


const CATEGORIES: { label: string; value: QuestCategory | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Fitness', value: 'fitness' },
  { label: 'Social', value: 'social' },
  { label: 'Food', value: 'food' },
  { label: 'Community', value: 'community' },
  { label: 'Nature', value: 'nature' },
]

export default function ExploreScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [activeCategory, setActiveCategory] = useState<QuestCategory | undefined>(undefined)
  const { quests, loading, refetch } = useQuests(activeCategory)
  const { profile } = useAuth()
  const { excludedQuestIds, refetch: refetchCompletions } = useUserCompletions(profile?.id)
  const { count: unreadCount, refetch: refetchUnread } = useUnreadNotificationCount(profile?.id)
  const [weeklyRank, setWeeklyRank] = useState<number | null>(null)

  useEffect(() => {
    if (!profile) return
    supabase
      .from('leaderboard')
      .select('weekly_xp')
      .eq('user_id', profile.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data == null || data.weekly_xp == null) {
          setWeeklyRank(null)
          return
        }
        supabase
          .from('leaderboard')
          .select('user_id', { count: 'exact', head: true })
          .gt('weekly_xp', data.weekly_xp)
          .then(({ count }) => setWeeklyRank(count !== null ? count + 1 : null))
      })
  }, [profile?.id])

  const availableQuests = useMemo(
    () => quests.filter((q) => !excludedQuestIds.has(q.id)),
    [quests, excludedQuestIds]
  )

  useFocusEffect(
    useCallback(() => {
      refetchCompletions()
      refetchUnread()
    }, [refetchCompletions, refetchUnread])
  )

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <AppHeader
          subtitle={daysLeftLabel(getDaysLeftInWeek())}
          showBell
          notificationCount={unreadCount}
          onBellPress={() => router.push('/notifications')}
        />
        {profile && <PlayerCard profile={profile} weeklyRank={weeklyRank ?? undefined} />}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipContent}
      >
        {CATEGORIES.map((cat) => (
          <CategoryChip
            key={cat.label}
            label={cat.label}
            category={cat.value}
            active={activeCategory === cat.value}
            onPress={() => setActiveCategory(cat.value)}
          />
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.list}>
          <QuestCardSkeleton />
          <QuestCardSkeleton />
        </View>
      ) : availableQuests.length === 0 ? (
        <EmptyState
          icon="🗺️"
          title="No quests here yet"
          subtitle="Try another category or check back tomorrow."
        />
      ) : (
        <FlatList
          data={availableQuests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <QuestHeroCard
              quest={item}
              onPress={() => router.push(`/quest/${item.id}?source=explore`)}
            />
          )}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + TAB_BAR_CLEARANCE },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => {
                refetch()
                refetchCompletions()
              }}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.sm },
  chipScroll: { flexGrow: 0, marginBottom: SPACING.md },
  chipContent: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
  },
  list: { paddingHorizontal: SPACING.xl },
})
