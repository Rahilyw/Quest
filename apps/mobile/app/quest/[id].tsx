import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuest } from '@/hooks/useQuests'
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/lib/constants'

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

  const categoryColor = CATEGORY_COLORS[quest.category]
  const categoryIcon = CATEGORY_ICONS[quest.category]

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={[styles.hero, { backgroundColor: `${categoryColor}22` }]}>
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.heroIcon}>{categoryIcon}</Text>
          {quest.is_sponsored && (
            <View style={styles.sponsoredBadge}>
              <Text style={styles.sponsoredText}>⭐ Sponsored by {quest.sponsor_name}</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.xpBadge}>
            <Text style={styles.xpText}>+{quest.xp_reward} XP</Text>
          </View>
          <Text style={styles.title}>{quest.title}</Text>
          <Text style={styles.description}>{quest.description}</Text>

          {quest.sponsor_reward && (
            <View style={styles.rewardBox}>
              <Text style={styles.rewardLabel}>Your reward</Text>
              <Text style={styles.rewardValue}>{quest.sponsor_reward}</Text>
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
          style={[styles.ctaButton, { backgroundColor: categoryColor }]}
          onPress={() => router.push(`/submit/${quest.id}`)}
        >
          <Text style={styles.ctaText}>Start Quest</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  loading: { color: '#64748B', textAlign: 'center', marginTop: 100 },
  hero: { height: 200, alignItems: 'center', justifyContent: 'center' },
  back: { position: 'absolute', top: 48, left: 16, padding: 8 },
  backText: { color: '#F1F5F9', fontSize: 24 },
  heroIcon: { fontSize: 64 },
  sponsoredBadge: { position: 'absolute', bottom: 12, backgroundColor: '#F59E0B22', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  sponsoredText: { color: '#F59E0B', fontSize: 12, fontWeight: '700' },
  content: { padding: 20 },
  xpBadge: { backgroundColor: '#6366F122', borderRadius: 20, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, marginBottom: 12 },
  xpText: { color: '#6366F1', fontWeight: '800', fontSize: 14 },
  title: { fontSize: 26, fontWeight: '800', color: '#F1F5F9', marginBottom: 12 },
  description: { color: '#94A3B8', fontSize: 16, lineHeight: 24, marginBottom: 20 },
  rewardBox: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 20 },
  rewardLabel: { color: '#64748B', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  rewardValue: { color: '#22C55E', fontSize: 18, fontWeight: '700' },
  rules: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16 },
  rulesTitle: { color: '#F1F5F9', fontWeight: '700', marginBottom: 12 },
  rulesText: { color: '#94A3B8', marginBottom: 8 },
  footer: { padding: 16, paddingBottom: 36, backgroundColor: '#0F172A' },
  ctaButton: { borderRadius: 14, padding: 18, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 18 },
})
