import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, Pressable, StyleSheet, View, type ViewToken } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Avatar } from '@/components/Avatar'
import { Cutout } from '@/components/Cutout'
import { Sprite } from '@/components/Sprite'
import { Body, Name, Small, Title } from '@/components/ui/Text'
import { useAuth } from '@/hooks/useAuth'
import { track } from '@/lib/analytics'
import { daysLeftLabel, plural, xpLabel } from '@/lib/copy'
import { getDaysLeftInWeek, getISOWeek, TAB_BAR_HEIGHT, TAB_BAR_CLEARANCE } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
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
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [cutouts, setCutouts] = useState<Record<string, LatestCutout>>({})
  const [loading, setLoading] = useState(true)
  const [ownVisible, setOwnVisible] = useState<boolean | null>(null)
  const selfId = useRef(profile?.id)
  selfId.current = profile?.id

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('leaderboard')
        .select('*')
        .order('weekly_xp', { ascending: false })
        .limit(50)
      if (!alive) return
      const ranked = ((data ?? []) as Omit<LeaderboardEntry, 'rank'>[]).map((entry, index) => ({
        ...entry,
        rank: index + 1,
        last_week_rank: entry.last_week_rank ?? null,
      }))
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
      if (!alive) return
      const next: Record<string, LatestCutout> = {}
      for (const row of proofs ?? []) {
        const userId = row.user_id as string
        if (next[userId]) continue
        const quest = questOf(row.quest as LatestCutout | LatestCutout[] | null)
        if (quest) next[userId] = quest
      }
      setCutouts(next)
    }
    load()
    return () => {
      alive = false
    }
  }, [])

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
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
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

            {loading ? (
              <View style={styles.podium}>
                {[0, 1, 2].map((slot) => (
                  <View key={slot} style={styles.podiumSkeleton} />
                ))}
              </View>
            ) : entries.length === 0 ? (
              <View style={styles.empty}>
                <Sprite name="gull" size={88} />
                <Body tone="soft">Nobody’s on the board yet. Finish a quest and take the first spot.</Body>
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
              <View style={styles.podium}>
                {podium.map((entry) => {
                  const first = entry.rank === 1
                  const cutout = cutouts[entry.user_id]
                  return (
                    <Pressable
                      key={entry.user_id}
                      onPress={() => openPlayer(entry.user_id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${entry.username}, rank ${entry.rank}`}
                      style={[styles.spot, first && styles.spotFirst]}
                    >
                      <View>
                        <Avatar username={entry.username} uri={entry.avatar_url} size={first ? 88 : 64} />
                        {cutout ? (
                          <View style={styles.spotCutout}>
                            <Cutout
                              uri={cutout.cutout_url}
                              category={cutout.category}
                              questTitle={cutout.title}
                              role="row"
                              style={{ width: 40, height: 40 }}
                            />
                          </View>
                        ) : null}
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
            accessibilityLabel={`${item.username}, rank ${item.rank}`}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Small tabular style={styles.rank}>{item.rank}</Small>
            <Avatar username={item.username} uri={item.avatar_url} size={40} />
            <Name numberOfLines={1} style={styles.rowName}>{item.username}</Name>
            <Small tabular>{xpLabel(item.weekly_xp)}</Small>
          </Pressable>
        )}
      />

      {showPin && profile ? (
        <Pressable
          onPress={() => (myEntry ? openPlayer(profile.id) : router.push('/quests'))}
          accessibilityRole="button"
          accessibilityLabel={myEntry ? `Your rank, ${myEntry.rank}` : 'You are not ranked this week'}
          style={[styles.pin, { bottom: insets.bottom + TAB_BAR_HEIGHT + 18 + SPACE.s2 }]}
        >
          <Small tabular style={styles.rank}>{myEntry ? myEntry.rank : '—'}</Small>
          <Avatar username={profile.username} uri={profile.avatar_url} size={40} />
          <View style={styles.pinCopy}>
            <Name numberOfLines={1}>{profile.username}</Name>
            <Small tone="soft">{myEntry ? 'Your rank' : 'Not ranked this week'}</Small>
          </View>
          <Small tabular>{xpLabel(myEntry?.weekly_xp ?? 0)}</Small>
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
  week: { paddingHorizontal: SPACE.s4, marginTop: SPACE.s2, marginBottom: SPACE.s5 },
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
  spotCutout: { position: 'absolute', right: -8, bottom: -4 },
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
