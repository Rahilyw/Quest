import { useMemo } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Cutout } from '@/components/Cutout'
import { Folder } from '@/components/Folder'
import { Sprite } from '@/components/Sprite'
import { Small, Title } from '@/components/ui/Text'
import { useAuth } from '@/hooks/useAuth'
import { useQuests } from '@/hooks/useQuests'
import { useUserCompletions } from '@/hooks/useUserCompletions'
import { plural } from '@/lib/copy'
import { getQuestCoverImage, TAB_BAR_CLEARANCE } from '@/lib/constants'
import { sizedImageUrl } from '@/lib/sizedImageUrl'
import { CATEGORY_KEYS, COLOR, SPACE, type CategoryKey } from '@/lib/theme'

export default function QuestsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { profile } = useAuth()
  const { quests, loading } = useQuests()
  const { excludedQuestIds } = useUserCompletions(profile?.id)

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
        ) : quests.length === 0 ? (
          <View style={styles.empty}>
            <Sprite name="gull" size={88} />
            <Small tone="soft">Nothing in Victoria yet.</Small>
          </View>
        ) : (
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
  empty: {
    alignItems: 'center',
    gap: SPACE.s3,
    paddingVertical: SPACE.s8,
  },
})
