import { TouchableOpacity, Text, View, StyleSheet } from 'react-native'
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/lib/constants'
import type { Quest } from '@/lib/types'

interface Props {
  quest: Quest
  onPress: () => void
}

export function QuestCard({ quest, onPress }: Props) {
  const color = CATEGORY_COLORS[quest.category]
  const icon = CATEGORY_ICONS[quest.category]

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.iconBox, { backgroundColor: `${color}22` }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.info}>
        {quest.is_sponsored && (
          <Text style={styles.sponsored}>⭐ {quest.sponsor_name}</Text>
        )}
        <Text style={styles.title} numberOfLines={1}>{quest.title}</Text>
        <Text style={styles.description} numberOfLines={2}>{quest.description}</Text>
        <View style={styles.footer}>
          <View style={[styles.categoryPill, { backgroundColor: `${color}22` }]}>
            <Text style={[styles.categoryText, { color }]}>{quest.category}</Text>
          </View>
          <Text style={styles.xp}>+{quest.xp_reward} XP</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  icon: { fontSize: 24 },
  info: { flex: 1 },
  sponsored: { color: '#F59E0B', fontSize: 11, fontWeight: '700', marginBottom: 2 },
  title: { color: '#F1F5F9', fontWeight: '700', fontSize: 15, marginBottom: 4 },
  description: { color: '#64748B', fontSize: 13, lineHeight: 18, marginBottom: 10 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  categoryText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  xp: { color: '#6366F1', fontWeight: '800', fontSize: 13 },
})
