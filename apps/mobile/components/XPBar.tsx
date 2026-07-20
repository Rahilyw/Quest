import { View, Text, StyleSheet, type DimensionValue } from 'react-native'
import { getLevelFromXp, getXpToNextLevel, XP_LEVELS, COLORS, SPACING, RADIUS } from '@/lib/constants'

interface Props {
  totalXp: number
}

export function XPBar({ totalXp }: Props) {
  const level = getLevelFromXp(totalXp)
  const xpToNext = getXpToNextLevel(totalXp)
  const isMaxLevel = xpToNext === 0
  const currentLevelXp = XP_LEVELS.find((l) => l.level === level)?.minXp ?? 0
  const nextLevelXp = XP_LEVELS.find((l) => l.level === level + 1)?.minXp ?? currentLevelXp + 1
  const progress = isMaxLevel ? 1 : (totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp)
  const fillPct = `${Math.min(progress * 100, 100)}%` as DimensionValue

  const xpLabel = isMaxLevel
    ? 'Max level'
    : `${totalXp.toLocaleString()} / ${nextLevelXp.toLocaleString()} XP`

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.level}>Level {level}</Text>
        <Text style={styles.xpLabel}>{xpLabel}</Text>
      </View>

      {/* Track */}
      <View style={styles.track}>
        {/* Fill: accent base */}
        <View style={[styles.fill, { width: fillPct }]}>
          {/* Violet accent on right portion — fakes a gradient without expo-linear-gradient */}
          <View style={styles.fillAccent} />
          {/* Top sheen — glass highlight */}
          <View style={styles.fillSheen} />
        </View>
      </View>

      {/* Level markers */}
      <View style={styles.markers}>
        <Text style={styles.markerLabel}>Lv {level}</Text>
        {!isMaxLevel && <Text style={styles.markerLabel}>Lv {level + 1}</Text>}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xxl,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  level: { color: COLORS.textPrimary, fontWeight: '800', fontSize: 15 },
  xpLabel: { color: COLORS.textMuted, fontSize: 13 },
  track: {
    height: 12,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
  },
  // Rightmost 35% blends toward violet for a warm gradient effect
  fillAccent: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '35%',
    backgroundColor: '#8B5CF6', // violet-500
    opacity: 0.55,
  },
  // Top glass sheen
  fillSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: '#FFFFFF',
    opacity: 0.28,
  },
  markers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
  },
  markerLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
})
