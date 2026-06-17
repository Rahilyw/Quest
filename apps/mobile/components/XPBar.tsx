import { View, Text, StyleSheet } from 'react-native'
import { getLevelFromXp, getXpToNextLevel, XP_LEVELS } from '@/lib/constants'

interface Props {
  totalXp: number
}

export function XPBar({ totalXp }: Props) {
  const level = getLevelFromXp(totalXp)
  const xpToNext = getXpToNextLevel(totalXp)
  const currentLevelXp = XP_LEVELS.find((l) => l.level === level)?.minXp ?? 0
  const nextLevelXp = XP_LEVELS.find((l) => l.level === level + 1)?.minXp ?? currentLevelXp + 1
  const progress = (totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp)

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.level}>Level {level}</Text>
        <Text style={styles.xpLabel}>{xpToNext > 0 ? `${xpToNext} XP to Level ${level + 1}` : 'Max level!'}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(progress * 100, 100)}%` }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginHorizontal: 16, marginBottom: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  level: { color: '#F1F5F9', fontWeight: '700' },
  xpLabel: { color: '#64748B', fontSize: 12 },
  track: { height: 8, backgroundColor: '#1E293B', borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#6366F1', borderRadius: 4 },
})
