import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Avatar } from '@/components/Avatar'
import { BadgeVisual } from '@/components/badges/BadgeVisual'
import { Cutout } from '@/components/Cutout'
import { Sprite } from '@/components/Sprite'
import { Body, Heading, Name, Small, Title } from '@/components/ui/Text'
import { useAuth } from '@/hooks/useAuth'
import { useFollow } from '@/hooks/useFollow'
import { useQuests } from '@/hooks/useQuests'
import { isQuestActive } from '@quest/geofence'
import { useUserCompletions } from '@/hooks/useUserCompletions'
import { resolveBadgeSpec } from '@/lib/badgeFromDb'
import type { BadgeSpec } from '@/lib/badgeCatalog'
import { levelLabel, plural } from '@/lib/copy'
import { TAB_BAR_CLEARANCE } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import { COLOR, RADIUS, SPACE, SPONSORED } from '@/lib/theme'
import type { Badge } from '@/lib/types'

interface ShelfBadge {
  id: string
  spec: BadgeSpec
  earned: boolean
}

interface RewardCard {
  id: string
  title: string
  reward: string | null
  code: string
  redeemedAt: string | null
}

function redeemedWhen(iso: string) {
  return new Date(iso).toLocaleString('en-CA', {
    timeZone: 'America/Vancouver',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function Profile() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { profile, loading, profileError, refreshProfile } = useAuth()
  const { quests, loading: questsLoading } = useQuests(undefined, 'archive')
  const { refetch: refetchCompletions } = useUserCompletions(profile?.id)
  const { followerCount, followingCount, refetch: refetchFollow } = useFollow(profile?.id, profile?.id)
  const [earnedIds, setEarnedIds] = useState<Set<string>>(new Set())
  const [badges, setBadges] = useState<ShelfBadge[]>([])
  const [rewards, setRewards] = useState<RewardCard[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const loadShelf = useCallback(async () => {
    if (!profile) return
    const [doneResult, badgeResult, earnedResult] = await Promise.all([
      supabase
        .from('completions')
        .select('quest_id')
        .eq('user_id', profile.id)
        .eq('status', 'approved'),
      supabase.from('badges').select('*').order('sort_order'),
      supabase.from('user_badges').select('badge_id').eq('user_id', profile.id),
    ])
    setEarnedIds(new Set((doneResult.data ?? []).map((row) => row.quest_id as string)))
    const earned = new Set((earnedResult.data ?? []).map((row) => row.badge_id as string))
    const rows = ((badgeResult.data ?? []) as Badge[]).filter((badge) => badge.is_active !== false)
    setBadges(
      rows
        .map((badge) => ({ id: badge.id, spec: resolveBadgeSpec(badge), earned: earned.has(badge.id) }))
        .sort((a, b) => Number(b.earned) - Number(a.earned)),
    )
  }, [profile])

  const loadRewards = useCallback(async () => {
    if (!profile) return
    const { data } = await supabase
      .from('completions')
      .select('id, redemption_code, redeemed_at, quest:quests(title, sponsor_reward, is_sponsored)')
      .eq('user_id', profile.id)
      .eq('status', 'approved')
      .not('redemption_code', 'is', null)
    const cards: RewardCard[] = []
    for (const row of data ?? []) {
      const quest = Array.isArray(row.quest) ? row.quest[0] : row.quest
      if (!quest?.is_sponsored || !row.redemption_code) continue
      cards.push({
        id: row.id as string,
        title: quest.title as string,
        reward: (quest.sponsor_reward as string | null) ?? null,
        code: row.redemption_code as string,
        redeemedAt: (row.redeemed_at as string | null) ?? null,
      })
    }
    cards.sort((a, b) => Number(Boolean(a.redeemedAt)) - Number(Boolean(b.redeemedAt)))
    setRewards(cards)
  }, [profile])

  useEffect(() => {
    loadShelf()
    loadRewards()
  }, [loadShelf, loadRewards])

  useFocusEffect(useCallback(() => {
    refetchCompletions()
    loadRewards()
  }, [refetchCompletions, loadRewards]))

  async function handleRefresh() {
    setRefreshing(true)
    await Promise.all([refreshProfile(), loadShelf(), loadRewards(), refetchCompletions(), refetchFollow()])
    setRefreshing(false)
  }

  const shelf = useMemo(() => {
    return [...quests]
      .filter((quest) => earnedIds.has(quest.id) || isQuestActive(quest, new Date()))
      .sort((a, b) => {
      const aEarned = earnedIds.has(a.id) ? 0 : 1
      const bEarned = earnedIds.has(b.id) ? 0 : 1
      if (aEarned !== bEarned) return aEarned - bEarned
      return a.title.localeCompare(b.title)
    })
  }, [quests, earnedIds])

  const earnedBadges = badges.filter((badge) => badge.earned)

  if (loading) {
    return (
      <View style={[styles.screen, styles.gate, { paddingTop: insets.top + SPACE.s8 }]}>
        <View style={styles.skeletonAvatar} />
        <View style={styles.skeletonLine} />
        <View style={styles.skeletonLineShort} />
      </View>
    )
  }

  if (!profile) {
    return (
      <View style={[styles.screen, styles.gate, { paddingTop: insets.top + SPACE.s8 }]}>
        <Title>You</Title>
        <Body tone="soft">{profileError ?? 'Your profile didn’t load. Try again.'}</Body>
        <Pressable
          onPress={refreshProfile}
          accessibilityRole="button"
          accessibilityLabel="Try again"
          style={styles.cta}
        >
          <Small color={COLOR.white}>Try again</Small>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + SPACE.s5,
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLOR.ink} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Title>You</Title>
          <Pressable
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            style={styles.iconBtn}
          >
            <Ionicons name="settings-outline" size={22} color={COLOR.ink} />
          </Pressable>
        </View>

        <View style={styles.identity}>
          <Avatar username={profile.username} uri={profile.avatar_url} size={88} />
          <Name>{profile.username}</Name>
          <Small tone="soft">{levelLabel(profile.level)}</Small>
          <Small tone="soft">
            {profile.current_streak > 0
              ? `${plural(profile.current_streak, 'week')} streak`
              : 'No streak yet'}
          </Small>
        </View>

        <View style={styles.social}>
          <Pressable
            onPress={() => router.push(`/user/${profile.id}/followers`)}
            accessibilityRole="button"
            accessibilityLabel="Followers"
            style={styles.socialBtn}
          >
            <Name tabular>{followerCount}</Name>
            <Small tone="soft">Followers</Small>
          </Pressable>
          <Pressable
            onPress={() => router.push(`/user/${profile.id}/following`)}
            accessibilityRole="button"
            accessibilityLabel="Following"
            style={styles.socialBtn}
          >
            <Name tabular>{followingCount}</Name>
            <Small tone="soft">Following</Small>
          </Pressable>
          <Pressable
            onPress={() => router.push('/edit-profile')}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
            style={styles.socialBtn}
          >
            <Ionicons name="create-outline" size={18} color={COLOR.ink} />
            <Small>Edit profile</Small>
          </Pressable>
        </View>

        {rewards.length > 0 ? (
          <View style={styles.rewards}>
            <Heading>Rewards</Heading>
            {rewards.map((reward) => (
              <View key={reward.id} style={styles.reward} accessibilityLabel={`${reward.title} code ${reward.code}`}>
                <Name>{reward.title}</Name>
                {reward.reward ? <Small color={SPONSORED.deep}>{reward.reward}</Small> : null}
                <Title tabular style={styles.code}>{reward.code}</Title>
                <Small tone="soft">
                  {reward.redeemedAt
                    ? `Redeemed ${redeemedWhen(reward.redeemedAt)}`
                    : 'Show this screen at the counter'}
                </Small>
              </View>
            ))}
          </View>
        ) : null}

        <Pressable
          onPress={() => router.push('/suggest-quest')}
          accessibilityRole="button"
          accessibilityLabel="Suggest a quest"
          style={styles.suggest}
        >
          <Body>Suggest a quest</Body>
          <Small tone="soft">If we publish it, the quest carries your name.</Small>
        </Pressable>

        <View style={styles.sectionHead}>
          <Heading>Cutouts</Heading>
          <Small tone="soft">{earnedIds.size > 0 ? plural(earnedIds.size, 'cutout') : 'None yet'}</Small>
        </View>

        {questsLoading && quests.length === 0 ? (
          <View style={styles.shelfSkeleton}>
            {[0, 1, 2].map((slot) => (
              <View key={slot} style={styles.cutoutSkeleton} />
            ))}
          </View>
        ) : shelf.length === 0 ? (
          <View style={styles.empty}>
            <Sprite name="seal" size={72} />
            <Body tone="soft">Your shelf is empty. Finish a quest and the cutout lands here.</Body>
            <Pressable
              onPress={() => router.push('/quests')}
              accessibilityRole="button"
              accessibilityLabel="Find a quest"
              style={styles.cta}
            >
              <Small color={COLOR.white}>Find a quest</Small>
            </Pressable>
          </View>
        ) : (
          <View style={styles.grid}>
            {shelf.map((quest) => {
              const locked = !earnedIds.has(quest.id)
              return (
                <Pressable
                  key={quest.id}
                  onPress={() => router.push(`/quest/${quest.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={locked ? `${quest.title}, locked` : quest.title}
                  style={styles.cell}
                >
                  <Cutout
                    uri={quest.cutout_url}
                    category={quest.category}
                    questTitle={quest.title}
                    role="collection"
                    locked={locked}
                  />
                  <Small numberOfLines={2} tone={locked ? 'faint' : 'ink'} style={styles.cellLabel}>
                    {locked ? `Finish ${quest.title}` : quest.title}
                  </Small>
                </Pressable>
              )
            })}
          </View>
        )}

        <View style={styles.sectionHead}>
          <Heading>Badges</Heading>
          <Pressable
            onPress={() => router.push('/badges')}
            accessibilityRole="button"
            accessibilityLabel="See all badges"
            hitSlop={8}
          >
            <Small>See all</Small>
          </Pressable>
        </View>

        {earnedBadges.length === 0 ? (
          <View style={styles.empty}>
            <Body tone="soft">No badges yet. They show up here once you earn them.</Body>
            <Pressable
              onPress={() => router.push('/badges')}
              accessibilityRole="button"
              accessibilityLabel="See badges"
              style={styles.cta}
            >
              <Small color={COLOR.white}>See badges</Small>
            </Pressable>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgeRow}>
            {earnedBadges.map((badge) => (
              <Pressable
                key={badge.id}
                onPress={() => router.push('/badges')}
                accessibilityRole="button"
                accessibilityLabel={badge.spec.name}
                style={styles.badge}
              >
                <BadgeVisual spec={badge.spec} size={64} earned />
                <Small numberOfLines={2} style={styles.cellLabel}>{badge.spec.name}</Small>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLOR.paper },
  gate: { paddingHorizontal: SPACE.s4, gap: SPACE.s3 },
  skeletonAvatar: {
    width: 88,
    height: 88,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.paperDeep,
  },
  skeletonLine: { width: 180, height: 18, borderRadius: RADIUS.pill, backgroundColor: COLOR.paperDeep },
  skeletonLineShort: { width: 120, height: 14, borderRadius: RADIUS.pill, backgroundColor: COLOR.paperDeep },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE.s4,
  },
  iconBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  identity: { alignItems: 'flex-start', gap: SPACE.s1, paddingHorizontal: SPACE.s4, marginTop: SPACE.s3 },
  social: {
    flexDirection: 'row',
    gap: SPACE.s2,
    paddingHorizontal: SPACE.s4,
    marginTop: SPACE.s4,
    marginBottom: SPACE.s6,
  },
  socialBtn: {
    minHeight: 48,
    minWidth: 72,
    justifyContent: 'center',
    paddingHorizontal: SPACE.s2,
  },
  rewards: { paddingHorizontal: SPACE.s4, gap: SPACE.s3, marginBottom: SPACE.s6 },
  reward: {
    borderRadius: RADIUS.card,
    backgroundColor: COLOR.paperDeep,
    padding: SPACE.s4,
    gap: SPACE.s1,
  },
  code: { letterSpacing: 2 },
  suggest: {
    marginHorizontal: SPACE.s4,
    marginBottom: SPACE.s6,
    minHeight: 72,
    borderRadius: RADIUS.card,
    backgroundColor: COLOR.paperDeep,
    padding: SPACE.s4,
    justifyContent: 'center',
    gap: SPACE.s1,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE.s4,
    marginBottom: SPACE.s3,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACE.s2, marginBottom: SPACE.s6 },
  cell: { width: '33.33%', alignItems: 'center', paddingHorizontal: SPACE.s1, marginBottom: SPACE.s4, gap: SPACE.s1 },
  cellLabel: { textAlign: 'center' },
  shelfSkeleton: { flexDirection: 'row', gap: SPACE.s3, paddingHorizontal: SPACE.s4, marginBottom: SPACE.s6 },
  cutoutSkeleton: { width: 88, height: 96, borderRadius: RADIUS.card, backgroundColor: COLOR.paperDeep },
  empty: { paddingHorizontal: SPACE.s4, gap: SPACE.s3, marginBottom: SPACE.s6, alignItems: 'flex-start' },
  cta: {
    minHeight: 48,
    paddingHorizontal: SPACE.s5,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: { paddingHorizontal: SPACE.s4, gap: SPACE.s4, paddingBottom: SPACE.s4 },
  badge: { width: 84, alignItems: 'center', gap: SPACE.s2 },
})
