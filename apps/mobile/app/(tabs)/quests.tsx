import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { endsThisSunday, isNewThisWeek } from '@quest/geofence'
import { Cutout } from '@/components/Cutout'
import { Folder } from '@/components/Folder'
import { QuestRow } from '@/components/QuestRow'
import { Sprite } from '@/components/Sprite'
import { BodyStrong, Heading, Small, Title } from '@/components/ui/Text'
import { track } from '@/lib/analytics'
import { useAuth } from '@/hooks/useAuth'
import { useQuests } from '@/hooks/useQuests'
import { useUserCompletions } from '@/hooks/useUserCompletions'
import { plural } from '@/lib/copy'
import { getQuestCoverImage, TAB_BAR_CLEARANCE } from '@/lib/constants'
import { sizedImageUrl } from '@/lib/sizedImageUrl'
import { CATEGORY_KEYS, COLOR, RADIUS, SPACE, type CategoryKey } from '@/lib/theme'

export default function QuestsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { profile } = useAuth()
  const { quests, loading, error, refetch } = useQuests()
  const [refreshing, setRefreshing] = useState(false)
  const onRefresh = async () => {
    setRefreshing(true)
    try {
      await refetch()
    } finally {
      setRefreshing(false)
    }
  }
  const { excludedQuestIds } = useUserCompletions(profile?.id)

  const now = useMemo(() => new Date(), [quests])
  const fresh = useMemo(() => quests.filter((quest) => isNewThisWeek(quest, now)), [quests, now])
  const endingCount = useMemo(() => quests.filter((quest) => endsThisSunday(quest, now)).length, [quests, now])
  const seenDrop = useRef(false)
  useEffect(() => {
    if (loading || error || seenDrop.current) return
    seenDrop.current = true
    track('weekly_drop_seen', { new_count: fresh.length, ending_count: endingCount, source: 'quests' })
  }, [loading, error, fresh.length, endingCount])

  const newest = useMemo(() => {
    return [...quests].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null
  }, [quests])

  const byCategory = useMemo(() => {
    return CATEGORY_KEYS.map((key) => {
      const rows = quests.filter((quest) => quest.category === key)
      const newestInFolder = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at))
      return {
        key,
        count: rows.length,
        unplayed: rows.filter((quest) => !excludedQuestIds.has(quest.id)).length,
        photos: newestInFolder
          .slice(0, 2)
          .map((quest) => sizedImageUrl(getQuestCoverImage(quest), { width: 120, height: 90 })),
        cutout: newestInFolder[0] ?? null,
      }
    })
  }, [quests, excludedQuestIds])

  return (
    <View style={styles.screen}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{
          paddingTop: insets.top + SPACE.s5,
          paddingHorizontal: SPACE.s4,
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <Title style={styles.title}>Quests</Title>
          <Small tone="soft">{loading ? '…' : plural(quests.length, 'quest')}</Small>
        </View>

        {newest ? (
          <View style={styles.breakout} pointerEvents="none">
            <Cutout
              uri={newest.cutout_url}
              category={newest.category}
              questTitle={newest.title}
              role="breakout"
              style={{ width: 150 }}
            />
          </View>
        ) : null}

        {loading && quests.length === 0 ? (
          <Small tone="soft">Finding quests…</Small>
        ) : error && quests.length === 0 ? (
          <View style={styles.empty}>
            <Small tone="soft">Couldn’t load quests. Check your signal and try again.</Small>
            <Pressable
              onPress={onRefresh}
              accessibilityRole="button"
              accessibilityLabel="Try again"
              style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
            >
              <BodyStrong color={COLOR.white}>Try again</BodyStrong>
            </Pressable>
          </View>
        ) : quests.length === 0 ? (
          <View style={styles.empty}>
            <Sprite name="gull" size={88} />
            <Small tone="soft">Nothing in Victoria yet. The next drop is Monday.</Small>
            <Pressable
              onPress={() => router.push('/suggest-quest')}
              accessibilityRole="button"
              accessibilityLabel="Suggest a quest"
              style={({ pressed }) => [styles.suggest, pressed && styles.retryPressed]}
            >
              <BodyStrong>Suggest a quest</BodyStrong>
              <Small tone="soft">If we publish it, the quest carries your name.</Small>
            </Pressable>
          </View>
        ) : (
          <View>
            <View style={styles.sectionHead}>
              <Heading>New this week</Heading>
              <Small tone="soft">{fresh.length === 0 ? 'Monday' : String(fresh.length)}</Small>
            </View>
            {fresh.length === 0 ? (
              <Small tone="soft" style={styles.dropEmpty}>
                Nothing new this week. The next drop is Monday.
              </Small>
            ) : (
              fresh.map((quest) => (
                <QuestRow
                  key={quest.id}
                  quest={quest}
                  onPress={() => router.push(`/quest/${quest.id}?source=quests`)}
                />
              ))
            )}
            <View style={styles.grid}>
            {byCategory.map((folder, index) => (
              <Folder
                key={folder.key}
                category={folder.key as CategoryKey}
                count={folder.count}
                unplayed={folder.unplayed}
                photos={folder.photos}
                cutoutUri={folder.cutout?.cutout_url}
                cutoutTitle={folder.cutout?.title}
                rotation={index % 2 === 0 ? 7 : -6}
                onPress={() => router.push(`/category/${folder.key}`)}
              />
            ))}
            </View>
            <Pressable
              onPress={() => router.push('/suggest-quest')}
              accessibilityRole="button"
              accessibilityLabel="Suggest a quest"
              style={({ pressed }) => [styles.suggest, pressed && styles.retryPressed]}
            >
              <BodyStrong>Suggest a quest</BodyStrong>
              <Small tone="soft">If we publish it, the quest carries your name.</Small>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLOR.paper,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: SPACE.s3,
    gap: SPACE.s3,
  },
  title: {
    flex: 1,
  },
  breakout: {
    alignItems: 'flex-end',
    marginBottom: -SPACE.s7,
    zIndex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: SPACE.s2,
  },
  retry: {
    minHeight: 48,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.ink,
    paddingHorizontal: SPACE.s6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryPressed: { backgroundColor: COLOR.inkPressed, transform: [{ scale: 0.97 }] },
  empty: {
    alignItems: 'center',
    gap: SPACE.s3,
    paddingVertical: SPACE.s8,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: SPACE.s4,
    marginBottom: SPACE.s2,
  },
  dropEmpty: {
    marginBottom: SPACE.s4,
  },
  suggest: {
    marginTop: SPACE.s5,
    minHeight: 72,
    borderRadius: RADIUS.card,
    backgroundColor: COLOR.paperDeep,
    padding: SPACE.s4,
    gap: SPACE.s1,
    justifyContent: 'center',
  },
})
