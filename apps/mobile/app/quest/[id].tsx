import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuest } from '@/hooks/useQuests'
import {
  CATEGORY_COLORS,
  CATEGORY_TAGS,
  COLORS,
  RADIUS,
  SPACING,
  getDifficulty,
  getQuestCoverImage,
} from '@/lib/constants'

export default function QuestDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { quest, loading } = useQuest(id)

  if (loading || !quest) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Loading…</Text>
      </View>
    )
  }

  const categoryColor = CATEGORY_COLORS[quest.category] ?? COLORS.primary
  const tag = CATEGORY_TAGS[quest.category] ?? quest.category.toUpperCase()
  const diff = getDifficulty(quest.xp_reward)
  const coverUri = getQuestCoverImage(quest)

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          <Image source={{ uri: coverUri }} style={styles.heroImage} />
          <View style={styles.heroOverlay} />
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <View style={styles.backPill}>
              <Text style={styles.backText}>←</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.heroMeta}>
            <View style={styles.tagRow}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
              <View style={[styles.diffBadge, { backgroundColor: `${diff.color}33` }]}>
                <Text style={[styles.diffText, { color: diff.color }]}>{diff.label}</Text>
              </View>
            </View>
            <Text style={styles.heroTitle}>{quest.title}</Text>
            {quest.is_sponsored && (
              <View style={styles.sponsoredBadge}>
                <Text style={styles.sponsoredText}>⭐ Sponsored by {quest.sponsor_name}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.xpRow}>
            <View style={styles.xpBadge}>
              <Text style={styles.xpText}>+{quest.xp_reward} XP</Text>
            </View>
            <Text style={styles.radiusText}>Within {quest.radius_meters}m of location</Text>
          </View>

          <Text style={styles.description}>{quest.description}</Text>

          {quest.sponsor_reward && (
            <View style={styles.rewardBox}>
              <Text style={styles.rewardLabel}>Your reward</Text>
              <Text style={[styles.rewardValue, { color: categoryColor }]}>{quest.sponsor_reward}</Text>
            </View>
          )}

          {quest.badges.length > 0 && (
            <View style={styles.badgesSection}>
              <Text style={styles.sectionTitle}>Badges linked to this quest</Text>
              <View style={styles.badgeGrid}>
                {quest.badges.map((badge) => (
                  <View key={badge.id} style={styles.badgeCard}>
                    <Text style={styles.badgeIcon}>{badge.icon}</Text>
                    <Text style={styles.badgeName}>{badge.name}</Text>
                    <Text style={styles.badgeDesc} numberOfLines={2}>{badge.description}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.rules}>
            <Text style={styles.rulesTitle}>How to complete</Text>
            <Text style={styles.rulesText}>1. Go to the quest location</Text>
            <Text style={styles.rulesText}>2. Tap "Start Quest" when you arrive</Text>
            <Text style={styles.rulesText}>3. Take a photo as proof</Text>
            <Text style={styles.rulesText}>4. Submit — we'll review within 2 hours</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => router.push(`/submit/${quest.id}`)}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>Start Quest</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loading: { color: COLORS.textMuted, textAlign: 'center', marginTop: 100 },
  heroWrap: { height: 280, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13,27,62,0.55)',
  },
  back: { position: 'absolute', top: 52, left: SPACING.lg, zIndex: 2 },
  backPill: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: RADIUS.pill,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 20, fontWeight: '700', color: COLORS.navy, lineHeight: 28 },
  heroMeta: {
    position: 'absolute',
    bottom: SPACING.lg,
    left: SPACING.lg,
    right: SPACING.lg,
  },
  tagRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  diffBadge: { borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 4 },
  diffText: { fontSize: 10, fontWeight: '800' },
  heroTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', lineHeight: 30 },
  sponsoredBadge: {
    alignSelf: 'flex-start',
    marginTop: SPACING.sm,
    backgroundColor: `${COLORS.highlight}CC`,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  sponsoredText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  content: { padding: SPACING.xl },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  xpBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  xpText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  radiusText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  description: { color: COLORS.textSecondary, fontSize: 16, lineHeight: 25, marginBottom: SPACING.xl },
  rewardBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rewardLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rewardValue: { fontSize: 18, fontWeight: '800' },
  badgesSection: { marginBottom: SPACING.xl },
  sectionTitle: { color: COLORS.navy, fontWeight: '800', fontSize: 15, marginBottom: SPACING.md },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  badgeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    width: '47%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badgeIcon: { fontSize: 28, marginBottom: 4 },
  badgeName: { color: COLORS.navy, fontWeight: '800', fontSize: 13, marginBottom: 2 },
  badgeDesc: { color: COLORS.textMuted, fontSize: 11, lineHeight: 16 },
  rules: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rulesTitle: { color: COLORS.navy, fontWeight: '800', marginBottom: SPACING.md, fontSize: 15 },
  rulesText: { color: COLORS.textSecondary, marginBottom: 10, lineHeight: 22 },
  footer: {
    padding: SPACING.lg,
    paddingBottom: 36,
    backgroundColor: 'rgba(232,243,255,0.96)',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  ctaButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: 18,
    alignItems: 'center',
  },
  ctaText: { color: '#FFFFFF', fontWeight: '800', fontSize: 18 },
})
