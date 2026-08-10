import { View, Text, Image, StyleSheet } from 'react-native'
import { BrandText } from '@/components/BrandText'
import { COLORS, CITY, FONT_DISPLAY, getLevelTitle } from '@/lib/constants'

/**
 * Strava-style 9:16 story card, rendered at 360×640 and captured at 3× for
 * Instagram stories. Pure view — the parent wraps it for view-shot capture.
 */
export const SHARE_CARD_WIDTH = 360
export const SHARE_CARD_HEIGHT = 640

export interface ShareCompletionData {
  /** Local file uri or remote proof photo url */
  photoUri: string
  questTitle: string
  username: string
  level: number
  xpReward: number
  completedAt: string
}

export function ShareCompletionCard({ data }: { data: ShareCompletionData }) {
  const dateStr = new Date(data.completedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <View style={styles.card}>
      <Image source={{ uri: data.photoUri }} style={styles.photo} resizeMode="cover" />

      {/* Top brand strip */}
      <View style={styles.topRow}>
        <View style={styles.brandChip}>
          <BrandText size="inline" color={COLORS.primary}>
            QUEST!
          </BrandText>
        </View>
        <View style={styles.cityPill}>
          <Text style={styles.cityPillText}>{CITY.name}</Text>
        </View>
      </View>

      {/* Bottom stat panel */}
      <View style={styles.panel}>
        <View style={styles.panelAccent} />
        <Text style={styles.completeLabel}>QUEST COMPLETE</Text>
        <Text style={styles.questTitle} numberOfLines={2}>
          {data.questTitle}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>+{data.xpReward}</Text>
            <Text style={styles.statLabel}>XP EARNED</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>LV {data.level}</Text>
            <Text style={styles.statLabel}>{getLevelTitle(data.level)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValueSmall}>{dateStr}</Text>
            <Text style={styles.statLabel}>VICTORIA, BC</Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.username}>@{data.username}</Text>
          <Text style={styles.tagline}>Real quests. Real city. ✦</Text>
        </View>
      </View>
    </View>
  )
}

const PANEL_HEIGHT = 232

const styles = StyleSheet.create({
  card: {
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    backgroundColor: COLORS.navy,
    overflow: 'hidden',
  },
  photo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SHARE_CARD_HEIGHT - PANEL_HEIGHT + 24,
  },
  topRow: {
    position: 'absolute',
    top: 18,
    left: 18,
    right: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandChip: {
    backgroundColor: COLORS.bg,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  cityPill: {
    backgroundColor: COLORS.highlight,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  cityPillText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: PANEL_HEIGHT,
    backgroundColor: COLORS.navy,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 18,
  },
  panelAccent: {
    position: 'absolute',
    top: 0,
    left: 22,
    width: 56,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.sunshine,
    marginTop: 10,
  },
  completeLabel: {
    color: COLORS.sunshine,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.2,
    marginTop: 12,
  },
  questTitle: {
    color: '#FFFFFF',
    fontFamily: FONT_DISPLAY,
    fontSize: 26,
    lineHeight: 31,
    marginTop: 6,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  stat: { flex: 1 },
  statDivider: {
    width: 1,
    height: 34,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginHorizontal: 14,
  },
  statValue: { color: COLORS.sunshine, fontSize: 22, fontWeight: '900' },
  statValueSmall: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginTop: 4 },
  statLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginTop: 3,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
  },
  username: { color: COLORS.primaryLight, fontSize: 14, fontWeight: '800' },
  tagline: { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '700' },
})
