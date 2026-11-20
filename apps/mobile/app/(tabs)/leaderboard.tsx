import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, Pressable, RefreshControl, StyleSheet, View, type ListViewToken } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Avatar } from '@/components/Avatar'
import { Sticker, questStickerAlt } from '@/components/Sticker'
import { Body, BodyStrong, Micro, Name, Small, Title } from '@/components/ui/Text'
import { useAuth } from '@/hooks/useAuth'
import { currentRecapWeek } from '@/hooks/useWeekRecap'
import { track } from '@/lib/analytics'
import { daysLeftLabel, plural, xpLabel } from '@/lib/copy'
import { getDaysLeftInWeek, getISOWeek, TAB_BAR_HEIGHT, TAB_BAR_CLEARANCE } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import { ordinal } from '@/lib/thisWeek'
import { COLOR, RADIUS, SPACE } from '@/lib/theme'
import type { LeaderboardEntry } from '@/lib/types'

interface LatestCutout {
  title: string
  category: string
  cutout_url: string | null
}

function questOf(
  value: LatestCutout | LatestCutout[] | null,
): LatestCutout | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export default function RankingsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { profile } = useAuth()
  const weekNum = getISOWeek()
  const daysLeft = getDaysLeftInWeek()
  const recapInProgress = currentRecapWeek().inProgress
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [cutouts, setCutouts] = useState<Record<string, LatestCutout>>({})
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [ownVisible, setOwnVisible] = useState<boolean | null>(null)
  const selfId = useRef(profile?.id)
  selfId.current = profile?.id

  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  // The board moves while you're out: reload quietly every time the tab is opened.
  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('weekly_xp', { ascending: false })
      .limit(50)
    if (!alive.current) return
    if (error) {
      setFailed(true)
      setLoading(false)
      return
    }
    const ranked = ((data ?? []) as Omit<LeaderboardEntry, 'rank'>[]).map((entry, index) => ({
      ...entry,
      rank: index + 1,
      last_week_rank: entry.last_week_rank ?? null,
    }))
    setFailed(false)
    setEntries(ranked)
    setLoading(false)

    const topIds = ranked.slice(0, 3).map((entry) => entry.user_id)
    if (topIds.length === 0) return
    const { data: proofs } = await supabase
      .from('completions')
      .select('user_id, completed_at, quest:quests(title, category, cutout_url)')
      .in('user_id', topIds)
      .eq('status', 'approved')
      .order('completed_at', { ascending: false })
      .limit(30)
    if (!alive.current) return
    const next: Record<string, LatestCutout> = {}
    for (const row of proofs ?? []) {
      const userId = row.user_id as string
      if (next[userId]) continue
      const quest = questOf(row.quest as LatestCutout | LatestCutout[] | null)
      if (quest) next[userId] = quest
    }
    setCutouts(next)
  }, [])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await load()
    } finally {
      if (alive.current) setRefreshing(false)
    }
  }, [load])

  const myEntry = useMemo(
    () => (profile ? entries.find((entry) => entry.user_id === profile.id) : undefined),
    [entries, profile],
  )

  useFocusEffect(
    useCallback(() => {
      track('leaderboard_viewed', { own_rank: myEntry?.rank ?? null })
    }, [myEntry?.rank]),
  )

  const top = entries.slice(0, 3)
  const rest = entries.slice(3)
  const podium = [top[1], top[0], top[2]].filter((entry): entry is LeaderboardEntry => entry != null)
  const showPin = Boolean(profile) && !loading && (myEntry ? myEntry.rank > 3 && ownVisible === false : true)

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ListViewToken[] }) => {
      setOwnVisible(viewableItems.some((token) => token.item?.user_id === selfId.current))
    },
  ).current

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current

  function openPlayer(userId: string) {
    router.push(`/user/${userId}`)
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={rest}
        keyExtractor={(item) => item.user_id}
        viewabilityConfig={viewabilityConfig}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLOR.ink} colors={[COLOR.ink]} />
        }
        onViewableItemsChanged={onViewableItemsChanged}
        contentContainerStyle={{
          paddingTop: insets.top + SPACE.s5,
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE + (showPin ? 72 : 0),
        }}
        ListHeaderComponent={
          <View>
            <View style={styles.titleRow}>
              <Title>Rankings</Title>
              <Small tone="soft">{loading ? '…' : plural(entries.length, 'player')}</Small>
            </View>
            <Small tone="soft" style={styles.week}>
              {`Week ${weekNum}. ${daysLeftLabel(daysLeft)}.`}
            </Small>

            {profile ? (
              <Pressable
                onPress={() => router.push('/recap')}
                accessibilityRole="button"
                accessibilityLabel={recapInProgress ? 'Your week so far' : 'Your recap of last week'}
                accessibilityHint="Opens a card you can share"
                style={({ pressed }) => [styles.recap, pressed && styles.recapPressed]}
              >
                <BodyStrong style={styles.recapLabel}>
                  {recapInProgress ? 'Your week so far' : 'Your recap of last week'}
                </BodyStrong>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={COLOR.ink}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
              </Pressable>
            ) : null}

            {loading ? (
              <View style={styles.podium}>
                {[0, 1, 2].map((slot) => (
                  <View key={slot} style={styles.podiumSkeleton} />
                ))}
              </View>
            ) : failed && entries.length === 0 ? (
              <View style={styles.empty}>
                <Body tone="soft">Couldn’t load the rankings. Check your signal and try again.</Body>
                <Pressable
                  onPress={onRefresh}
                  accessibilityRole="button"
                  accessibilityLabel="Try again"
                  style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
                >
                  <BodyStrong color={COLOR.white}>Try again</BodyStrong>
                </Pressable>
              </View>
            ) : entries.length === 0 ? (
              <View style={styles.empty}>
                <Body tone="soft">Nobody’s on the board yet. Finish a quest and take the first spot.</Body>
                <Pressable
                  onPress={() => router.push('/quests')}
                  accessibilityRole="button"
                  accessibilityLabel="Find a quest"
                  style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
                >
                  <BodyStrong color={COLOR.white}>Find a quest</BodyStrong>
                </Pressable>
              </View>
            ) : (
              <View style={styles.podium}>
                {podium.map((entry) => {
                  const first = entry.rank === 1
                  const cutout = cutouts[entry.user_id]
                  return (
                    <Pressable
                      key={entry.user_id}
                      onPress={() => openPlayer(entry.user_id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${entry.username}, ${ordinal(entry.rank)}, ${xpLabel(entry.weekly_xp)}`}
                      style={({ pressed }) => [styles.spot, first && styles.spotFirst, pressed && styles.spotPressed]}
                    >
                      <View>
                        <Avatar username={entry.username} uri={entry.avatar_url} size={first ? 88 : 64} />
                        {cutout?.cutout_url ? (
                          <View style={styles.spotCutout}>
                            <Sticker uri={cutout.cutout_url} size={44} tilt={8} alt={questStickerAlt(cutout)} />
                          </View>
                        ) : null}
                        <View style={styles.place}>
                          <Micro color={COLOR.white} tabular>{ordinal(entry.rank)}</Micro>
                        </View>
                      </View>
                      <Name numberOfLines={1}>{entry.username}</Name>
                      <Small tone="soft" tabular>{xpLabel(entry.weekly_xp)}</Small>
                    </Pressable>
                  )
                })}
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openPlayer(item.user_id)}
            accessibilityRole="button"
            accessibilityLabel={`${item.user_id === profile?.id ? 'You' : item.username}, ${ordinal(item.rank)}, ${xpLabel(item.weekly_xp)}`}
            style={({ pressed }) => [
              styles.row,
              item.user_id === profile?.id && styles.rowSelf,
              pressed && styles.pressed,
            ]}
          >
            <Small tabular style={styles.rank}>{item.rank}</Small>
            <Avatar username={item.username} uri={item.avatar_url} size={40} />
            <View style={styles.rowName}>
              <Name numberOfLines={1}>{item.username}</Name>
              {item.user_id === profile?.id ? <Small tone="soft">You</Small> : null}
            </View>
            <Small tabular>{xpLabel(item.weekly_xp)}</Small>
          </Pressable>
        )}
      />

      {showPin && profile ? (
        <Pressable
          onPress={() => (myEntry ? openPlayer(profile.id) : router.push('/quests'))}
          accessibilityRole="button"
          accessibilityLabel={
            myEntry
              ? `You’re ${ordinal(myEntry.rank)} with ${xpLabel(myEntry.weekly_xp)}`
              : 'Not ranked this week. Find a quest.'
          }
          style={[styles.pin, { bottom: insets.bottom + TAB_BAR_HEIGHT + 18 + SPACE.s2 }]}
        >
          <Small tabular style={styles.rank}>{myEntry ? myEntry.rank : ''}</Small>
          <Avatar username={profile.username} uri={profile.avatar_url} size={40} />
          <View style={styles.pinCopy}>
            <Name numberOfLines={1}>{profile.username}</Name>
            <Small tone="soft">{myEntry ? 'Your rank' : 'Not ranked yet. Finish a quest.'}</Small>
          </View>
          {myEntry ? <Small tabular>{xpLabel(myEntry.weekly_xp)}</Small> : null}
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLOR.paper },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE.s4,
  },
  week: { paddingHorizontal: SPACE.s4, marginTop: SPACE.s2, marginBottom: SPACE.s4 },
  recap: {
    minHeight: 48,
    marginHorizontal: SPACE.s4,
    marginBottom: SPACE.s5,
    paddingHorizontal: SPACE.s4,
    paddingVertical: SPACE.s3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s2,
    borderRadius: RADIUS.control,
    backgroundColor: COLOR.secondaryFill,
  },
  recapPressed: { transform: [{ scale: 0.97 }] },
  recapLabel: { flex: 1 },
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: SPACE.s3,
    marginBottom: SPACE.s6,
  },
  podiumSkeleton: {
    width: 88,
    height: 120,
    borderRadius: RADIUS.card,
    backgroundColor: COLOR.paperDeep,
  },
  spot: { width: 104, alignItems: 'center', gap: SPACE.s1, minHeight: 48 },
  spotFirst: { width: 120, marginBottom: SPACE.s3 },
  spotPressed: { transform: [{ scale: 0.97 }] },
  spotCutout: { position: 'absolute', right: -8, bottom: -4 },
  place: {
    position: 'absolute',
    left: -6,
    top: -4,
    minWidth: 32,
    paddingHorizontal: SPACE.s2,
    paddingVertical: SPACE.s1,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.ink,
    alignItems: 'center',
  },
  empty: { paddingHorizontal: SPACE.s4, gap: SPACE.s3, alignItems: 'flex-start' },
  cta: {
    minHeight: 48,
    paddingHorizontal: SPACE.s5,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s3,
    paddingHorizontal: SPACE.s4,
    paddingVertical: SPACE.s2,
  },
  pressed: { backgroundColor: COLOR.paperDeep },
  rowSelf: { backgroundColor: COLOR.secondaryFill },
  ctaPressed: { backgroundColor: COLOR.inkPressed, transform: [{ scale: 0.97 }] },
  rank: { width: 28 },
  rowName: { flex: 1 },
  pin: {
    position: 'absolute',
    left: SPACE.s3,
    right: SPACE.s3,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s3,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.card,
    backgroundColor: COLOR.white,
    borderWidth: 1,
    borderColor: COLOR.rule,
  },
  pinCopy: { flex: 1 },
})
