import { TouchableOpacity, Text, View, Image, StyleSheet } from 'react-native'
import {
  CATEGORY_TAGS,
  COLORS,
  RADIUS,
  SPACING,
  getDifficulty,
  getQuestCoverImage,
} from '@/lib/constants'
import type { Quest } from '@/lib/types'

interface Props {
  quest: Quest
  onPress: () => void
  completionCount?: number
}

export function QuestHeroCard({ quest, onPress, completionCount = 0 }: Props) {
  const diff = getDifficulty(quest.xp_reward)
  const imageUri = getQuestCoverImage(quest)
  const tag = CATEGORY_TAGS[quest.category] ?? quest.category.toUpperCase()

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: imageUri }} style={styles.image} />
        <View style={styles.imageOverlay} />
        <View style={styles.tagRow}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
          {quest.is_sponsored && (
            <View style={[styles.tag, styles.sponsorTag]}>
              <Text style={styles.sponsorTagText}>⭐ SPONSORED</Text>
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
            <Text style={styles.ctaText}>START QUEST</Text>
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
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13,27,62,0.55)',
  },
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
  title: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', lineHeight: 20 },
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
