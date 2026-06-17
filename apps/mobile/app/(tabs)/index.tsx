import { useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuests } from '@/hooks/useQuests'
import { QuestCard } from '@/components/QuestCard'
import type { QuestCategory } from '@/lib/types'

const CATEGORIES: { label: string; value: QuestCategory | undefined }[] = [
  { label: 'All', value: undefined },
  { label: '🏃 Fitness', value: 'fitness' },
  { label: '🤝 Social', value: 'social' },
  { label: '🍽️ Food', value: 'food' },
  { label: '🏘️ Community', value: 'community' },
  { label: '🌿 Nature', value: 'nature' },
]

export default function QuestFeed() {
  const router = useRouter()
  const [activeCategory, setActiveCategory] = useState<QuestCategory | undefined>(undefined)
  const { quests, loading } = useQuests(activeCategory)

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Kuest</Text>
        <Text style={styles.subtitle}>Victoria, BC · Season 1</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.label}
            style={[styles.chip, activeCategory === cat.value && styles.chipActive]}
            onPress={() => setActiveCategory(cat.value)}
          >
            <Text style={[styles.chipText, activeCategory === cat.value && styles.chipTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <Text style={styles.loading}>Loading quests…</Text>
      ) : (
        <FlatList
          data={quests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <QuestCard quest={item} onPress={() => router.push(`/quest/${item.id}`)} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 32, fontWeight: '800', color: '#6366F1' },
  subtitle: { color: '#64748B', marginTop: 4 },
  categoryScroll: { paddingHorizontal: 16, marginBottom: 8 },
  chip: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  chipActive: { backgroundColor: '#6366F1' },
  chipText: { color: '#64748B', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  loading: { color: '#64748B', textAlign: 'center', marginTop: 40 },
})
