import { useMemo, useCallback, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useQuests } from '@/hooks/useQuests'
import { useUserCompletions } from '@/hooks/useUserCompletions'
import { useAuth } from '@/hooks/useAuth'
import { QuestCard } from '@/components/QuestCard'
import { QuestCardSkeleton } from '@/components/QuestCardSkeleton'
import { SectionHeader } from '@/components/SectionHeader'
import { CategoryChip } from '@/components/CategoryChip'
import { EmptyState } from '@/components/EmptyState'
import { Avatar } from '@/components/Avatar'
import { LevelChip } from '@/components/LevelChip'
import { COLORS, SPACING, RADIUS, CATEGORY_ICONS, APP_NAME } from '@/lib/constants'
import type { QuestCategory } from '@/lib/types'

const CATEGORIES: { label: string; value: QuestCategory | undefined }[] = [
  { label: 'All', value: undefined },
  { label: `${CATEGORY_ICONS.fitness} Fitness`, value: 'fitness' },
  { label: `${CATEGORY_ICONS.social} Social`, value: 'social' },
  { label: `${CATEGORY_ICONS.food} Food`, value: 'food' },
  { label: `${CATEGORY_ICONS.community} Community`, value: 'community' },
  { label: `${CATEGORY_ICONS.nature} Nature`, value: 'nature' },
]

export default function QuestFeed() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [activeCategory, setActiveCategory] = useState<QuestCategory | undefined>(undefined)
  const { quests, loading, refetch } = useQuests(activeCategory)
  const { profile } = useAuth()
  const { excludedQuestIds, refetch: refetchCompletions } = useUserCompletions(profile?.id)

  const availableQuests = useMemo(
    () => quests.filter((q) => !excludedQuestIds.has(q.id)),
    [quests, excludedQuestIds]
  )

  // Featured quest: highest-XP active sponsored quest not yet completed/pending
  const featuredQuest =
    availableQuests.length > 0
      ? availableQuests
          .filter((q) => q.is_sponsored)
          .sort((a, b) => b.xp_reward - a.xp_reward)[0] ?? null
      : null

  const hasProfile = profile !== null

  useFocusEffect(
    useCallback(() => {
      refetchCompletions()
    }, [refetchCompletions])
  )

  return (
    <View style={styles.container}>
      {/* Greeting header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <View style={styles.greetingBlock}>
            {hasProfile ? (
              <>
                <Text style={styles.greetingText}>Welcome back,</Text>
                <Text style={styles.greetingName}>@{profile.username}</Text>
              </>
            ) : (
              <Text style={styles.greetingName}>Welcome to {APP_NAME}</Text>
            )}
          </View>
          {hasProfile && (
            <View style={styles.headerRight}>
              <LevelChip level={profile.level} />
              <TouchableOpacity
                style={styles.avatarWrapper}
                onPress={() => router.push('/(tabs)/profile')}
                activeOpacity={0.8}
              >
                <Avatar username={profile.username} uri={profile.avatar_url} size={40} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Compact XP progress strip */}
        {hasProfile && (
          <View style={styles.xpStrip}>
            <Text style={styles.xpStripLabel}>{profile.total_xp.toLocaleString()} XP</Text>
            <View style={styles.xpTrack}>
              <View
                style={[
                  styles.xpFill,
                  {
                    width: (() => {
                      const denom = getMinXpForLevel(profile.level + 1) - getMinXpForLevel(profile.level)
                      const pct = denom === 0 ? 100 : Math.min(((profile.total_xp - getMinXpForLevel(profile.level)) / denom) * 100, 100)
                      return `${pct}%`
                    })(),
                  },
                ]}
              />
            </View>
          </View>
        )}
      </View>

      {/* Featured quest hero card */}
      {!loading && featuredQuest && (
        <TouchableOpacity
          style={styles.featuredCard}
          onPress={() => router.push(`/quest/${featuredQuest.id}`)}
          activeOpacity={0.8}
        >
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredBadgeText}>⭐ Featured</Text>
          </View>
          <Text style={styles.featuredTitle} numberOfLines={1}>{featuredQuest.title}</Text>
          <Text style={styles.featuredDesc} numberOfLines={2}>{featuredQuest.description}</Text>
          <Text style={styles.featuredXp}>+{featuredQuest.xp_reward} XP</Text>
        </TouchableOpacity>
      )}

      {/* Category chip row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContent}
      >
        {CATEGORIES.map((cat) => (
          <CategoryChip
            key={cat.label}
            label={cat.label}
            active={activeCategory === cat.value}
            onPress={() => setActiveCategory(cat.value)}
          />
        ))}
      </ScrollView>

      {/* Section header */}
      <SectionHeader
        title="Active Quests"
        trailing={loading ? undefined : `${availableQuests.length}`}
      />

      {/* List area */}
      {loading ? (
        <ScrollView contentContainerStyle={styles.list}>
          <QuestCardSkeleton />
          <QuestCardSkeleton />
          <QuestCardSkeleton />
        </ScrollView>
      ) : availableQuests.length === 0 ? (
        <EmptyState
          icon="🗺️"
          title="No quests here yet"
          subtitle="Completed and pending quests move to your profile. Try another category or check back soon."
        />
      ) : (
        <FlatList
          data={availableQuests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <QuestCard quest={item} onPress={() => router.push(`/quest/${item.id}`)} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => {
                refetch()
                refetchCompletions()
              }}
              tintColor={COLORS.accent}
              colors={[COLORS.accent]}
            />
          }
        />
      )}
    </View>
  )
}

function getMinXpForLevel(level: number): number {
  const XP_LEVELS = [0, 200, 500, 1000, 2000, 3500, 5500, 8000, 11000, 15000]
  return XP_LEVELS[Math.min(level - 1, XP_LEVELS.length - 1)] ?? 0
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  greetingBlock: { flex: 1 },
  greetingText: { color: COLORS.textMuted, fontSize: 13 },
  greetingName: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '800' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  avatarWrapper: { marginLeft: SPACING.xs },
  xpStrip: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  xpStripLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600', width: 72 },
  xpTrack: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.pill,
  },
  featuredCard: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.accentSoft,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  featuredBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${COLORS.sponsor}22`,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    marginBottom: SPACING.sm,
  },
  featuredBadgeText: { color: COLORS.sponsor, fontSize: 11, fontWeight: '700' },
  featuredTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: SPACING.xs,
  },
  featuredDesc: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  featuredXp: { color: COLORS.accentText, fontWeight: '800', fontSize: 14 },
  categoryScroll: { marginBottom: SPACING.xs },
  categoryContent: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xs },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: 100 },
})
