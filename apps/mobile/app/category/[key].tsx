import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { QuestRow } from '@/components/QuestRow'
import { Small, Title } from '@/components/ui/Text'
import { useQuests } from '@/hooks/useQuests'
import { plural } from '@/lib/copy'
import { CATEGORY_KEYS, COLOR, getCategory, SPACE, type CategoryKey } from '@/lib/theme'
import type { QuestCategory } from '@/lib/types'

export default function CategoryScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { key: raw } = useLocalSearchParams<{ key: string }>()
  const key = Array.isArray(raw) ? raw[0] : raw
  const valid = CATEGORY_KEYS.includes(key as CategoryKey)
  const category = valid ? (key as QuestCategory) : undefined
  const { quests, loading } = useQuests(category)
  const cat = getCategory(category)

  const rows = [...quests].sort((a, b) => b.created_at.localeCompare(a.created_at))

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + SPACE.s3,
          paddingHorizontal: SPACE.s4,
          paddingBottom: insets.bottom + SPACE.s7,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={22} color={COLOR.ink} />
        </Pressable>

        {!valid ? (
          <Title>That category isn’t here.</Title>
        ) : (
          <>
            <View style={styles.titleRow}>
              <Title style={styles.title}>{cat.label}</Title>
              <Small tone="soft">{loading ? '…' : plural(rows.length, 'quest')}</Small>
            </View>
            {rows.length === 0 && !loading ? (
              <Small tone="soft" style={styles.empty}>
                Nothing in {cat.label} yet.
              </Small>
            ) : (
              rows.map((quest) => (
                <QuestRow
                  key={quest.id}
                  quest={quest}
                  onPress={() => router.push(`/quest/${quest.id}?source=quests`)}
                />
              ))
            )}
          </>
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
  back: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -SPACE.s3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: SPACE.s4,
    gap: SPACE.s3,
  },
  title: {
    flex: 1,
  },
  empty: {
    marginTop: SPACE.s4,
  },
})
