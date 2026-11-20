import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Avatar } from '@/components/Avatar'
import { RewardsRow } from '@/components/RewardsRow'
import { StickerPage } from '@/components/stickers/StickerPage'
import { Body, Heading, Name, Small, Title } from '@/components/ui/Text'
import { useAuth } from '@/hooks/useAuth'
import { useFollow } from '@/hooks/useFollow'
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
  const { refetch: refetchCompletions } = useUserCompletions(profile?.id)
  const { followerCount, followingCount, refetch: refetchFollow } = useFollow(profile?.id, profile?.id)
  const [dragging, setDragging] = useState(false)
  const [badges, setBadges] = useState<ShelfBadge[]>([])
  const [rewards, setRewards] = useState<RewardCard[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const loadShelf = useCallback(async () => {
    if (!profile) return
    const [badgeResult, earnedResult] = await Promise.all([
      supabase.from('badges').select('*').order('sort_order'),
      supabase.from('user_badges').select('badge_id').eq('user_id', profile.id),
    ])
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
    const { data, error } = await supabase.rpc('own_reward_codes')
    if (error || !Array.isArray(data)) {
      setRewards([])
      return
    }
    const cards: RewardCard[] = []
    for (const row of data) {
      if (!row || typeof row !== 'object') continue
      const reward = row as {
        id?: unknown
        title?: unknown
        sponsor_reward?: unknown
        redemption_code?: unknown
        redeemed_at?: unknown
      }
      if (typeof reward.id !== 'string' || typeof reward.redemption_code !== 'string') continue
      cards.push({
        id: reward.id,
        title: typeof reward.title === 'string' ? reward.title : 'Quest',
        reward: typeof reward.sponsor_reward === 'string' ? reward.sponsor_reward : null,
        code: reward.redemption_code,
        redeemedAt: typeof reward.redeemed_at === 'string' ? reward.redeemed_at : null,
      })
    }
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
    setPageKey((k) => k + 1)
    setRefreshing(false)
  }

  const earnedBadges = useMemo(() => badges.filter((badge) => badge.earned), [badges])
  const [pageKey, setPageKey] = useState(0)

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
        scrollEnabled={!dragging}
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

        <View style={styles.sectionHead}>
          <Heading>Badges and medals</Heading>
          <Pressable
            onPress={() => router.push('/badges')}
            accessibilityRole="button"
            accessibilityLabel="See all badges"
            hitSlop={8}
            style={styles.seeAll}
          >
            <Small>See all</Small>
          </Pressable>
        </View>

        {earnedBadges.length === 0 && !(profile.last_week_rank && profile.last_week_rank <= 3) ? (
          <View style={styles.empty}>
            <Body tone="soft">No badges yet. Verify quests to earn them; a podium finish earns a medal.</Body>
          </View>
        ) : (
          <RewardsRow
            badges={earnedBadges}
            lastWeekRank={profile.last_week_rank}
            onOpenBadge={() => router.push('/badges')}
          />
        )}

        <View style={styles.sectionHead}>
          <Heading>Your page</Heading>
        </View>
        <StickerPage
          key={pageKey}
          userId={profile.id}
          owner
          onDragChange={setDragging}
          emptyAction={
            <Pressable
              onPress={() => router.push('/quests')}
              accessibilityRole="button"
              accessibilityLabel="Find a quest"
              style={styles.cta}
            >
              <Small color={COLOR.white}>Find a quest</Small>
            </Pressable>
          }
        />

        <View style={styles.spacer} />

        {rewards.length > 0 ? (
          <View style={styles.rewards}>
            <Heading>Codes to redeem</Heading>
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
  seeAll: { minHeight: 48, justifyContent: 'center' },
  spacer: { height: SPACE.s7 },
  empty: { paddingHorizontal: SPACE.s4, gap: SPACE.s3, marginBottom: SPACE.s6, alignItems: 'flex-start' },
  cta: {
    minHeight: 48,
    paddingHorizontal: SPACE.s5,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
