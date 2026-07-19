import { TouchableOpacity, Text, View, StyleSheet } from 'react-native'
import { formatGeofenceShort } from '@quest/geofence'
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_SOFT, COLORS, RADIUS, SPACING } from '@/lib/constants'
import type { Quest } from '@/lib/types'

interface Props {
  quest: Quest
  onPress: () => void
}

export function QuestCard({ quest, onPress }: Props) {
  const color = CATEGORY_COLORS[quest.category]
  const softBg = CATEGORY_SOFT[quest.category] ?? '#F1F5F9'
  const icon = CATEGORY_ICONS[quest.category]
  const geofenceType = quest.geofence_type ?? 'circle'
  const geofenceShort = formatGeofenceShort(
    {
      geofence_type: geofenceType,
      lat: quest.lat,
      lng: quest.lng,
      radius_meters: quest.radius_meters,
      city_id: quest.city_id ?? null,
    },
    quest.quest_geofences?.length
  )
  const geofenceIcon =
    geofenceType === 'none' ? '🌐' : geofenceType === 'city' ? '🌆' : geofenceType === 'multi' ? '📌' : '📍'

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.82}
    >
      {/* Glass specular: 1px white highlight on top edge */}
      <View style={styles.specular} />

      <View style={[styles.iconBox, { backgroundColor: softBg }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>

      <View style={styles.info}>
        {/* Top row: sponsor pill or category chip */}
        {quest.is_sponsored ? (
          <View style={styles.sponsorPill}>
            <Text style={styles.sponsorText}>⭐ {quest.sponsor_name}</Text>
          </View>
        ) : (
          <View style={[styles.categoryPill, { backgroundColor: softBg }]}>
            <Text style={[styles.categoryText, { color }]}>{quest.category}</Text>
          </View>
        )}

        <Text style={styles.title} numberOfLines={1}>{quest.title}</Text>
        <Text style={styles.description} numberOfLines={2}>{quest.description}</Text>

        <View style={styles.footer}>
          <View style={styles.distancePill}>
            <Text style={styles.distanceText}>{geofenceIcon} {geofenceShort}</Text>
          </View>
          <Text style={[styles.xp, { color }]}>+{quest.xp_reward} XP</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    // Glass elevation
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
    overflow: 'visible',
  },
  // 1px top highlight — simulates glass catching light
  specular: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: RADIUS.xl,
    zIndex: 1,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  icon: { fontSize: 24 },
  info: { flex: 1 },
  sponsorPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF7ED',
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  sponsorText: { color: COLORS.sponsor, fontSize: 11, fontWeight: '700' },
  categoryPill: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    marginBottom: 6,
  },
  categoryText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  title: {
    color: COLORS.textPrimary,
    fontWeight: '800',
    fontSize: 15,
    marginBottom: 4,
  },
  description: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  distancePill: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  distanceText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
  xp: { fontWeight: '800', fontSize: 13 },
})
