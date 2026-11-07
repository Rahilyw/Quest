import { TouchableOpacity, Text, View, Image, StyleSheet } from 'react-native'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import {
  COLORS,
  FONT_DISPLAY,
  RADIUS,
  SPACING,
  getDifficulty,
  getQuestCoverImage,
} from '@/lib/constants'
import { getCategory } from '@/lib/theme'
import { sizedImageUrl } from '@/lib/sizedImageUrl'
import type { Quest } from '@/lib/types'

interface Props {
  quest: Quest
  onPress: () => void
  completionCount?: number
}

export function QuestHeroCard({ quest, onPress, completionCount = 0 }: Props) {
  const diff = getDifficulty(quest.xp_reward)
  const imageUri = sizedImageUrl(getQuestCoverImage(quest), { width: 700, height: 440 })
  const tag = getCategory(quest.category).label

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={quest.title}
      accessibilityHint={`${quest.xp_reward} XP. Double tap to view quest details.`}
    >
      <View style={styles.imageWrap}>
        <Image source={{ uri: imageUri }} style={styles.image} />
        <Svg style={styles.imageOverlay} pointerEvents="none">
          <Defs>
            <LinearGradient id="heroScrim" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#0D1B3E" stopOpacity="0.18" />
              <Stop offset="0.45" stopColor="#0D1B3E" stopOpacity="0.1" />
              <Stop offset="1" stopColor="#0D1B3E" stopOpacity="0.78" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#heroScrim)" />
        </Svg>
        <View style={styles.tagRow}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
          {quest.is_sponsored && (
            <View style={[styles.tag, styles.sponsorTag]}>
              <Text style={styles.sponsorTagText}>Sponsored</Text>
            </View>
          )}
        </View>
        <View style={styles.xpBadge}>
          <Text style={styles.xpText}>+{quest.xp_reward} XP</Text>
        </View>
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={2}>{quest.title}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.desc} numberOfLines={2}>{quest.description}</Text>
        <View style={styles.footer}>
          <View style={styles.metaRow}>
            <View style={[styles.diffBadge, { backgroundColor: `${diff.color}22` }]}>
              <Text style={[styles.diffText, { color: diff.color }]}>{diff.label}</Text>
            </View>
            {completionCount > 0 && (
              <Text style={styles.completions}>{completionCount} completed</Text>
            )}
          </View>
          <View style={styles.cta}>
            <Text style={styles.ctaText}>View quest</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  imageWrap: { height: 176, position: 'relative' },
  image: { width: '100%', height: '100%' },
  imageOverlay: StyleSheet.absoluteFillObject,
  tagRow: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  sponsorTag: { backgroundColor: `${COLORS.highlight}CC` },
  sponsorTagText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  xpBadge: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  xpText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  titleWrap: {
    position: 'absolute',
    bottom: SPACING.md,
    left: SPACING.lg,
    right: SPACING.lg,
  },
  title: { color: '#FFFFFF', fontSize: 18, fontFamily: FONT_DISPLAY, lineHeight: 22 },
  body: { padding: SPACING.lg },
  desc: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18, marginBottom: SPACING.md },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  diffBadge: { borderRadius: RADIUS.pill, paddingHorizontal: SPACING.sm, paddingVertical: 2 },
  diffText: { fontSize: 10, fontWeight: '700' },
  completions: { color: COLORS.textMuted, fontSize: 10 },
  cta: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  ctaText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
})
