import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { AppHeader } from '@/components/AppHeader'
import { BadgeTile } from '@/components/badges/BadgeTile'
import { BadgeShowcase } from '@/components/badges/BadgeShowcase'
import { COLORS, FONT_BRAND, RADIUS, SPACING } from '@/lib/constants'
import {
  RARITY_META,
  RARITY_ORDER,
  type BadgeRarity,
  type BadgeSpec,
} from '@/lib/badgeCatalog'
import { resolveBadgeSpec } from '@/lib/badgeFromDb'
import type { Badge } from '@/lib/types'

/**
 * The Vault — the badge collection as an expedition log. Legendary relics sit
 * in a night band up top; everything below lives in the summer daylight.
 * Locked badges are shadowed, one is fully secret. Tap any badge to hold it.
 */

interface EarnedRow {
  badge_id: string
  earned_at: string
}

/** Star positions for the legendary night band (percent-based) */
const BAND_STARS: Array<[number, number, number]> = [
  [8, 18, 2], [22, 68, 1.5], [38, 12, 1.5], [55, 80, 2], [70, 22, 1.5],
  [84, 60, 2], [93, 30, 1.5], [15, 88, 1.5], [63, 50, 1], [45, 40, 1],
]

export default function BadgesScreen() {
  const insets = useSafeAreaInsets()
  const { profile } = useAuth()
  const [dbBadges, setDbBadges] = useState<Badge[]>([])
  const [earnedRows, setEarnedRows] = useState<EarnedRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [openSpec, setOpenSpec] = useState<BadgeSpec | null>(null)

  const load = useCallback(async () => {
    const [badgesResult, earnedResult] = await Promise.all([
      supabase.from('badges').select('*').eq('is_active', true).order('sort_order').order('name'),
      profile
        ? supabase
            .from('user_badges')
            .select('badge_id, earned_at')
            .eq('user_id', profile.id)
        : Promise.resolve({ data: [] as EarnedRow[] }),
    ])
    setDbBadges(badgesResult.data ?? [])
    setEarnedRows((earnedResult.data as EarnedRow[]) ?? [])
    setLoading(false)
  }, [profile?.id])

  useEffect(() => {
    load()
  }, [load])

  async function handleRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const { byRarity, fieldFinds, earnedByName, total, earnedCount } = useMemo(() => {
    const earnedById = new Map(earnedRows.map((r) => [r.badge_id, r.earned_at]))

    const earnedByName = new Map<string, string>()
    for (const b of dbBadges) {
      const at = earnedById.get(b.id)
      if (at) earnedByName.set(b.name, at)
    }

    const specs = dbBadges.map(resolveBadgeSpec)
    const fieldFinds = specs.filter((s) => !s.hasBuiltInArt && !s.iconUrl)

    const byRarity: Record<BadgeRarity, BadgeSpec[]> = {
      legendary: [],
      epic: [],
      rare: [],
      common: [],
    }
    for (const spec of specs) {
      if (!fieldFinds.includes(spec)) byRarity[spec.rarity].push(spec)
    }

    const total = specs.length
    const earnedCount = specs.filter((s) => earnedByName.has(s.name)).length

    return { byRarity, fieldFinds, earnedByName, total, earnedCount }
  }, [dbBadges, earnedRows])

  const isEarned = (spec: BadgeSpec) => earnedByName.has(spec.name)

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <AppHeader />
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.title}>THE VAULT</Text>
          <Text style={styles.subtitle}>
            Twenty relics are out there. The city keeps score.
          </Text>

          <View style={styles.trailRow} accessible accessibilityLabel={`${earnedCount} of ${total} badges earned`}>
            {Array.from({ length: total }, (_, i) => (
              <View
                key={i}
                style={[styles.trailDiamond, i < earnedCount && styles.trailDiamondEarned]}
              />
            ))}
          </View>
          <Text style={styles.trailCount}>
            {loading ? 'counting…' : `${earnedCount} of ${total} unearthed`}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 48 }} />
        ) : (
          <>
            {/* Legendary night band */}
            <View style={styles.nightBand}>
              {BAND_STARS.map(([x, y, r], i) => (
                <View
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${x}%`,
                    top: `${y}%`,
                    width: r * 2,
                    height: r * 2,
                    borderRadius: r,
                    backgroundColor: 'rgba(226,236,255,0.6)',
                  }}
                />
              ))}
              <View style={styles.sectionHeadRow}>
                <Text style={[styles.sectionLabel, { color: RARITY_META.legendary.color }]}>
                  LEGENDARY
                </Text>
                <Text style={styles.sectionCountDark}>
                  {byRarity.legendary.filter(isEarned).length}/{byRarity.legendary.length}
                </Text>
              </View>
              <Text style={styles.sectionTaglineDark}>{RARITY_META.legendary.tagline}</Text>
              <View style={styles.bandRow}>
                {byRarity.legendary.map((spec) => (
                  <View key={spec.key} style={{ flex: 1 }}>
                    <BadgeTile
                      spec={spec}
                      earned={isEarned(spec)}
                      artSize={70}
                      onDark
                      onOpen={setOpenSpec}
                    />
                  </View>
                ))}
              </View>
            </View>

            {/* Epic / Rare — two-column shelves */}
            {(['epic', 'rare'] as const).map((tier) => (
              <View key={tier} style={styles.section}>
                <View style={styles.sectionHeadRow}>
                  <Text style={[styles.sectionLabel, { color: RARITY_META[tier].color }]}>
                    {RARITY_META[tier].label}
                  </Text>
                  <Text style={styles.sectionCount}>
                    {byRarity[tier].filter(isEarned).length}/{byRarity[tier].length}
                  </Text>
                </View>
                <Text style={styles.sectionTagline}>{RARITY_META[tier].tagline}</Text>
                <View style={styles.grid}>
                  {byRarity[tier].map((spec) => (
                    <View key={spec.key} style={styles.gridItemHalf}>
                      <BadgeTile
                        spec={spec}
                        earned={isEarned(spec)}
                        artSize={78}
                        onOpen={setOpenSpec}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ))}

            {/* Common — compact three-up */}
            <View style={styles.section}>
              <View style={styles.sectionHeadRow}>
                <Text style={[styles.sectionLabel, { color: RARITY_META.common.color }]}>
                  COMMON
                </Text>
                <Text style={styles.sectionCount}>
                  {byRarity.common.filter(isEarned).length}/{byRarity.common.length}
                </Text>
              </View>
              <Text style={styles.sectionTagline}>{RARITY_META.common.tagline}</Text>
              <View style={styles.grid}>
                {byRarity.common.map((spec) => (
                  <View key={spec.key} style={styles.gridItemThird}>
                    <BadgeTile
                      spec={spec}
                      earned={isEarned(spec)}
                      artSize={54}
                      compact
                      onOpen={setOpenSpec}
                    />
                  </View>
                ))}
              </View>
            </View>

            {/* Anything the server knows that this build doesn't */}
            {fieldFinds.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeadRow}>
                  <Text style={[styles.sectionLabel, { color: COLORS.textMuted }]}>
                    FIELD FINDS
                  </Text>
                  <Text style={styles.sectionCount}>
                    {fieldFinds.filter(isEarned).length}/{fieldFinds.length}
                  </Text>
                </View>
                <Text style={styles.sectionTagline}>New relics, still being catalogued</Text>
                <View style={styles.grid}>
                  {fieldFinds.map((spec) => (
                    <View key={spec.key} style={styles.gridItemThird}>
                      <BadgeTile
                        spec={spec}
                        earned={isEarned(spec)}
                        artSize={54}
                        compact
                        onOpen={setOpenSpec}
                      />
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <BadgeShowcase
        spec={openSpec}
        earned={openSpec ? earnedByName.has(openSpec.name) : false}
        earnedAt={openSpec ? earnedByName.get(openSpec.name) : null}
        onClose={() => setOpenSpec(null)}
      />
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: SPACING.xl },

  hero: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    marginBottom: SPACING.xxl,
  },
  title: {
    fontFamily: FONT_BRAND,
    fontSize: 42,
    lineHeight: 48,
    color: COLORS.textPrimary,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
    maxWidth: 280,
  },
  trailRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: SPACING.lg,
    alignItems: 'center',
  },
  trailDiamond: {
    width: 9,
    height: 9,
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
    borderWidth: 1.5,
    borderColor: 'rgba(92,122,153,0.45)',
    backgroundColor: 'transparent',
  },
  trailDiamondEarned: {
    backgroundColor: COLORS.sunshine,
    borderColor: '#D99E06',
  },
  trailCount: {
    marginTop: SPACING.sm,
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  nightBand: {
    marginHorizontal: SPACING.xl,
    backgroundColor: '#141F3C',
    borderRadius: RADIUS.xxl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
    marginBottom: SPACING.xxl,
    overflow: 'hidden',
  },
  bandRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },

  section: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xxl,
  },
  sectionHeadRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontFamily: FONT_BRAND,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: 1,
  },
  sectionCount: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  sectionCountDark: {
    color: 'rgba(226,236,255,0.55)',
    fontSize: 12,
    fontWeight: '800',
  },
  sectionTagline: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 1,
    marginBottom: SPACING.md,
  },
  sectionTaglineDark: {
    color: 'rgba(226,236,255,0.5)',
    fontSize: 11,
    marginTop: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  gridItemHalf: {
    flexBasis: '47%',
    flexGrow: 1,
    maxWidth: '48.5%',
  },
  gridItemThird: {
    flexBasis: '30%',
    flexGrow: 1,
    maxWidth: '31.5%',
  },
})
