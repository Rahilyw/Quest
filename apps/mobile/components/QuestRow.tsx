import { Image, Pressable, StyleSheet, View } from 'react-native'
import { endsThisSunday, isNewThisWeek } from '@quest/geofence'
import { Cutout } from '@/components/Cutout'
import { Micro, Name, Small } from '@/components/ui/Text'
import { xpLabel } from '@/lib/copy'
import { getQuestCoverImage } from '@/lib/constants'
import { sizedImageUrl } from '@/lib/sizedImageUrl'
import { questMeta } from '@/lib/thisWeek'
import { COLOR, RADIUS, SPACE } from '@/lib/theme'
import type { Quest } from '@/lib/types'

export function QuestRow({ quest, onPress }: { quest: Quest; onPress: () => void }) {
  const meta = questMeta(quest)
  const cover = sizedImageUrl(getQuestCoverImage(quest), { width: 200, height: 140 })
  const now = new Date()
  const ending = endsThisSunday(quest, now)
  const fresh = isNewThisWeek(quest, now)
  const facts = [meta, `${quest.xp_reward} XP`, fresh ? 'New this week' : null, ending ? 'Ends Sunday' : null]
    .filter(Boolean)
    .join(', ')

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${quest.title}. ${facts}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Image source={{ uri: cover }} style={styles.cover} accessibilityElementsHidden importantForAccessibility="no" />
      <View style={styles.copy}>
        <Name numberOfLines={2}>{quest.title}</Name>
        <View style={styles.facts}>
          {meta ? (
            <Small tone="soft" style={styles.meta} numberOfLines={1}>
              {meta}
            </Small>
          ) : (
            <View style={styles.meta} />
          )}
          {ending ? (
            <View style={styles.pill}>
              <Micro color={COLOR.white}>Ends Sunday</Micro>
            </View>
          ) : null}
          {fresh ? (
            <View style={styles.fresh}>
              <Micro>New</Micro>
            </View>
          ) : null}
          <View style={styles.pill}>
            <Micro color={COLOR.white}>{xpLabel(quest.xp_reward)}</Micro>
          </View>
        </View>
      </View>
      <Cutout uri={quest.cutout_url} category={quest.category} questTitle={quest.title} role="row" />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s3,
    paddingVertical: SPACE.s3,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLOR.rule,
    minHeight: 72,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  cover: {
    width: 72,
    height: 56,
    borderRadius: RADIUS.control,
    backgroundColor: COLOR.paperDeep,
  },
  copy: {
    flex: 1,
    gap: SPACE.s1,
  },
  facts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s2,
  },
  meta: {
    flex: 1,
  },
  pill: {
    backgroundColor: COLOR.ink,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.s2,
    paddingVertical: SPACE.s1,
  },
  fresh: {
    backgroundColor: COLOR.paperDeep,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.s2,
    paddingVertical: SPACE.s1,
  },
})
