import { TouchableOpacity, View, Image, StyleSheet } from 'react-native'
import { COLOR, RADIUS, SPACE, SHADOW, TYPE, getCategory } from '@/lib/theme'
import { getQuestCoverImage } from '@/lib/constants'
import { sizedImageUrl } from '@/lib/sizedImageUrl'
import { Body, Small, Heading } from '@/components/ui/Text'
import type { Quest } from '@/lib/types'

interface Props {
  quest: Quest
  onPress: () => void
  completionCount?: number
}

export function QuestHeroCard({ quest, onPress, completionCount = 0 }: Props) {
  const imageUri = sizedImageUrl(getQuestCoverImage(quest), { width: 700, height: 440 })
  const catToken = getCategory(quest.category)

  // Distance / duration label (spec §Task 2 step 5)
  let metaLabel = `+${quest.xp_reward} XP`
  if (quest.distance_m != null && quest.duration_min != null) {
    const km = Math.round((quest.distance_m / 1000) * 10) / 10
    metaLabel = `${km} km, about ${quest.duration_min} min`
  }

  return (
    <TouchableOpacity
      style={[styles.card, SHADOW.lift]}
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={quest.title}
      accessibilityHint={`${quest.xp_reward} XP. Double tap to view quest details.`}
    >
      <View style={styles.imageWrap}>
        <Image source={{ uri: imageUri }} style={styles.image} />
        {/* Simple dark scrim — no LinearGradient */}
        <View style={styles.scrim} pointerEvents="none" />

        {/* Category tag: coloured dot + label */}
        <View style={styles.tagRow}>
          <View style={styles.tag}>
            <View style={[styles.catDot, { backgroundColor: catToken.color }]} />
            <Small color={COLOR.white}>{catToken.label}</Small>
          </View>
          {quest.is_sponsored && (
            <View style={styles.tag}>
              <Small color={COLOR.white}>Sponsored</Small>
            </View>
          )}
        </View>

        {/* XP badge */}
        <View style={styles.xpBadge}>
          <Small color={COLOR.white}>+{quest.xp_reward} XP</Small>
        </View>

        {/* Title */}
        <View style={styles.titleWrap}>
          <Heading
            color={COLOR.white}
            numberOfLines={2}
            style={{ fontFamily: TYPE.heading.fontFamily }}
          >
            {quest.title}
          </Heading>
        </View>
      </View>

      <View style={styles.body}>
        <Body tone="soft" numberOfLines={2} style={styles.desc}>
          {quest.description}
        </Body>
        <View style={styles.footer}>
          <View style={styles.metaRow}>
            <Small tone="soft">{metaLabel}</Small>
            {completionCount > 0 && (
              <Small tone="soft">{completionCount} completed</Small>
            )}
          </View>
          <View style={styles.cta}>
            <Small color={COLOR.white}>View quest</Small>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLOR.white,
    borderRadius: RADIUS.card,
    overflow: 'hidden',
    marginBottom: SPACE.s4,
  },
  imageWrap: { height: 176, position: 'relative' },
  image: { width: '100%', height: '100%' },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28,25,21,0.42)',
  },
  tagRow: {
    position: 'absolute',
    top: SPACE.s3,
    left: SPACE.s3,
    flexDirection: 'row',
    gap: SPACE.s2,
    alignItems: 'center',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s1,
    paddingHorizontal: SPACE.s2,
    paddingVertical: 4,
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  xpBadge: {
    position: 'absolute',
    top: SPACE.s3,
    right: SPACE.s3,
    backgroundColor: COLOR.ink,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.s3,
    paddingVertical: 4,
  },
  titleWrap: {
    position: 'absolute',
    bottom: SPACE.s3,
    left: SPACE.s4,
    right: SPACE.s4,
  },
  body: { padding: SPACE.s4 },
  desc: { marginBottom: SPACE.s3 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.s3 },
  cta: {
    backgroundColor: COLOR.ink,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.s4,
    paddingVertical: SPACE.s2,
  },
})
