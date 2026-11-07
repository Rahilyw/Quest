import { View, Text, Image, StyleSheet, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { BrandText } from '@/components/BrandText'
import {
  CATEGORY_IMAGES,
  COLORS,
  FONT_DISPLAY,
  RADIUS,
  SPACING,
} from '@/lib/constants'

export function WelcomeVisual() {
  return (
    <View style={styles.welcomeRoot}>
      <View style={[styles.blob, styles.blobSun]} />
      <View style={[styles.blob, styles.blobSky]} />
      <View style={[styles.blob, styles.blobCoral]} />

      <View style={styles.welcomeBrand}>
        <BrandText size="display" color={COLORS.navy} />
        <Text style={styles.tagline}>Real life, gamified.</Text>
      </View>

      <View style={styles.mockHero}>
        <Image
          source={{ uri: CATEGORY_IMAGES.nature }}
          style={styles.mockHeroImage}
          accessibilityIgnoresInvertColors
        />
        <View style={styles.mockHeroOverlay} />
        <View style={styles.mockHeroTag}>
          <Text style={styles.mockHeroTagText}>Nature</Text>
        </View>
        <View style={styles.mockHeroXp}>
          <Text style={styles.mockHeroXpText}>+150 XP</Text>
        </View>
        <Text style={styles.mockHeroTitle}>Sunset at the Breakwater</Text>
      </View>

      <View style={styles.floatingPill}>
        <Ionicons name="flash" size={14} color={COLORS.sunshine} />
        <Text style={styles.floatingPillText}>New quests every week</Text>
      </View>
    </View>
  )
}

export function ExploreVisual() {
  const pins: { top: ViewStyle['top']; left: ViewStyle['left']; color: string; icon: string }[] = [
    { top: '18%', left: '22%', color: COLORS.mint, icon: '🏃' },
    { top: '42%', left: '58%', color: COLORS.highlight, icon: '🍽️' },
    { top: '62%', left: '28%', color: COLORS.primary, icon: '🤝' },
    { top: '34%', left: '72%', color: COLORS.sunshine, icon: '🌿' },
  ]

  return (
    <View style={styles.exploreRoot}>
      <View style={styles.mapFrame}>
        <View style={styles.mapGrid}>
          {Array.from({ length: 6 }).map((_, row) => (
            <View key={row} style={styles.mapRow}>
              {Array.from({ length: 5 }).map((__, col) => (
                <View key={col} style={styles.mapCell} />
              ))}
            </View>
          ))}
        </View>
        {pins.map((pin, i) => (
          <View
            key={i}
            style={[
              styles.mapPin,
              { top: pin.top, left: pin.left, backgroundColor: pin.color },
            ]}
          >
            <Text style={styles.mapPinEmoji}>{pin.icon}</Text>
          </View>
        ))}
        <View style={styles.youAreHere}>
          <View style={styles.youDot} />
          <Text style={styles.youLabel}>You</Text>
        </View>
      </View>

      <View style={styles.exploreCard}>
        <View style={styles.exploreCardIcon}>
          <Ionicons name="navigate" size={18} color={COLORS.primary} />
        </View>
        <View style={styles.exploreCardBody}>
          <Text style={styles.exploreCardTitle}>Go there. Prove it. Earn XP.</Text>
          <Text style={styles.exploreCardSub}>Snap a photo when you arrive</Text>
        </View>
      </View>
    </View>
  )
}

export function CityVisual() {
  return (
    <View style={styles.cityVisualRoot}>
      <View style={styles.citySkyline}>
        <View style={[styles.cityBuilding, { height: 72, width: 48 }]} />
        <View style={[styles.cityBuilding, { height: 96, width: 56, backgroundColor: COLORS.primary }]} />
        <View style={[styles.cityBuilding, { height: 64, width: 40 }]} />
        <View style={[styles.cityBuilding, { height: 88, width: 52 }]} />
      </View>
      <View style={styles.cityPinCard}>
        <Ionicons name="location-sharp" size={28} color={COLORS.highlight} />
        <Text style={styles.cityPinLabel}>Victoria, BC</Text>
        <Text style={styles.cityPinSub}>Inner Harbour, James Bay, Fairfield</Text>
      </View>
    </View>
  )
}

export function EarnVisual() {
  const badges = [
    { icon: '🌅', label: 'Early Bird', color: COLORS.goldSoft },
    { icon: '🏃', label: 'Trailblazer', color: COLORS.successSoft },
    { icon: '🤝', label: 'Socialite', color: COLORS.primarySoft },
  ]

  return (
    <View style={styles.earnRoot}>
      <View style={styles.badgeRow}>
        {badges.map((b) => (
          <View key={b.label} style={[styles.badgeTile, { backgroundColor: b.color }]}>
            <Text style={styles.badgeEmoji}>{b.icon}</Text>
            <Text style={styles.badgeLabel}>{b.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.xpCard}>
        <View style={styles.xpHeader}>
          <Text style={styles.xpLevel}>Seeker, level 4</Text>
          <Text style={styles.xpGain}>+120 XP</Text>
        </View>
        <View style={styles.xpTrack}>
          <View style={[styles.xpFill, { width: '68%' }]} />
        </View>
        <Text style={styles.xpMeta}>1,240 / 2,000 XP to next level</Text>
      </View>

      <View style={styles.podiumRow}>
        <View style={[styles.podiumSlot, styles.podiumSecond]}>
          <Text style={styles.podiumMedal}>🥈</Text>
          <Text style={styles.podiumName}>@maya</Text>
        </View>
        <View style={[styles.podiumSlot, styles.podiumFirst]}>
          <Text style={styles.podiumCrown}>👑</Text>
          <Text style={styles.podiumMedal}>🥇</Text>
          <Text style={styles.podiumName}>@you</Text>
        </View>
        <View style={[styles.podiumSlot, styles.podiumThird]}>
          <Text style={styles.podiumMedal}>🥉</Text>
          <Text style={styles.podiumName}>@kai</Text>
        </View>
      </View>
    </View>
  )
}

const COLORS_EXTRA = {
  sunshineSoft: '#FEF3C7',
}

const styles = StyleSheet.create({
  welcomeRoot: {
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.55,
  },
  blobSun: {
    width: 180,
    height: 180,
    backgroundColor: COLORS.sunshine,
    top: 0,
    right: -20,
  },
  blobSky: {
    width: 140,
    height: 140,
    backgroundColor: COLORS.primaryLight,
    bottom: 40,
    left: -30,
  },
  blobCoral: {
    width: 90,
    height: 90,
    backgroundColor: COLORS.coral,
    top: 60,
    left: 20,
    opacity: 0.35,
  },
  welcomeBrand: { alignItems: 'center', marginBottom: SPACING.xl, zIndex: 1 },
  tagline: {
    marginTop: SPACING.sm,
    color: COLORS.textMuted,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  mockHero: {
    width: '92%',
    maxWidth: 300,
    height: 148,
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  mockHeroImage: { width: '100%', height: '100%' },
  mockHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30, 58, 95, 0.45)',
  },
  mockHeroTag: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  mockHeroTagText: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  mockHeroXp: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  mockHeroXpText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  mockHeroTitle: {
    position: 'absolute',
    bottom: SPACING.md,
    left: SPACING.lg,
    right: SPACING.lg,
    color: '#FFF',
    fontSize: 17,
    fontFamily: FONT_DISPLAY,
    lineHeight: 22,
  },
  floatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.lg,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  floatingPillText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '700' },

  exploreRoot: { height: 320, marginBottom: SPACING.lg },
  mapFrame: {
    flex: 1,
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  mapGrid: { flex: 1, opacity: 0.35, padding: SPACING.md },
  mapRow: { flex: 1, flexDirection: 'row', gap: 8 },
  mapCell: {
    flex: 1,
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    borderRadius: 6,
  },
  mapPin: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  mapPinEmoji: { fontSize: 18 },
  youAreHere: {
    position: 'absolute',
    bottom: SPACING.lg,
    left: '46%',
    alignItems: 'center',
  },
  youDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.highlight,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  youLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.navy,
    letterSpacing: 0.5,
  },
  exploreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  exploreCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exploreCardBody: { flex: 1 },
  exploreCardTitle: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '800' },
  exploreCardSub: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },

  cityVisualRoot: {
    height: 200,
    marginBottom: SPACING.lg,
    justifyContent: 'flex-end',
  },
  citySkyline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingBottom: SPACING.md,
    opacity: 0.9,
  },
  cityBuilding: {
    backgroundColor: COLORS.navy,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    opacity: 0.2,
  },
  cityPinCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  cityPinLabel: {
    marginTop: SPACING.sm,
    fontFamily: FONT_DISPLAY,
    fontSize: 22,
    color: COLORS.navy,
  },
  cityPinSub: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },

  earnRoot: { height: 320, marginBottom: SPACING.lg, gap: SPACING.md },
  badgeRow: { flexDirection: 'row', gap: SPACING.sm },
  badgeTile: {
    flex: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badgeEmoji: { fontSize: 28, marginBottom: 4 },
  badgeLabel: { fontSize: 9, fontWeight: '800', color: COLORS.navy, textAlign: 'center' },
  xpCard: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  xpLevel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  xpGain: { color: COLORS.sunshine, fontSize: 14, fontWeight: '900' },
  xpTrack: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: RADIUS.pill,
    overflow: 'hidden',
    marginBottom: 6,
  },
  xpFill: { height: '100%', backgroundColor: '#FFF', borderRadius: RADIUS.pill },
  xpMeta: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  podiumSlot: {
    flex: 1,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  podiumFirst: {
    paddingTop: SPACING.lg,
    backgroundColor: COLORS_EXTRA.sunshineSoft,
    borderColor: COLORS.sunshine,
  },
  podiumSecond: { marginBottom: 12, backgroundColor: COLORS.silverSoft },
  podiumThird: { marginBottom: 6, backgroundColor: COLORS.bronzeSoft },
  podiumCrown: { fontSize: 14, marginBottom: -4 },
  podiumMedal: { fontSize: 22 },
  podiumName: { marginTop: 4, fontSize: 10, fontWeight: '700', color: COLORS.textMuted },
})
