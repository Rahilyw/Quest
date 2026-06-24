import { useRef, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import { COLORS, CATEGORY_COLORS, SPACING, RADIUS } from '@/lib/constants'

const CATEGORY_IONICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  fitness: 'barbell-outline',
  social: 'people-outline',
  food: 'restaurant-outline',
  community: 'home-outline',
  nature: 'leaf-outline',
}

const COPY_REVERT_MS = 2000

interface Props {
  title: string
  category: string
  xp_reward: number
  completed_at: string
  redemption_code?: string | null
  is_sponsored?: boolean
  sponsor_reward?: string | null
}

function formatCompletedDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function RedemptionCodeCard({ code, sponsor_reward }: { code: string; sponsor_reward?: string | null }) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function handleCopy() {
    // Clear any existing revert timer so re-taps restart the clock
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    try {
      await Clipboard.setStringAsync(code)
    } catch {
      // Clipboard failure is non-fatal — still show feedback
    }

    setCopied(true)
    timeoutRef.current = setTimeout(() => {
      setCopied(false)
      timeoutRef.current = null
    }, COPY_REVERT_MS)
  }

  return (
    // Outer view carries elevation (Android shadow) — no overflow clip here
    <View style={styles.codeCardOuter}>
      {/* Inner view clips rounded corners without breaking Android shadow */}
      <View style={styles.codeCardInner}>
        {sponsor_reward ? (
          <Text style={styles.sponsorReward}>{sponsor_reward}</Text>
        ) : null}
        <Text style={styles.codeText}>{code}</Text>
        <TouchableOpacity
          style={[styles.copyBtn, copied && styles.copyBtnCopied]}
          onPress={handleCopy}
          activeOpacity={0.75}
        >
          <Ionicons
            name={copied ? 'checkmark' : 'copy-outline'}
            size={13}
            color={copied ? COLORS.success : COLORS.indigo}
          />
          <Text style={[styles.copyBtnLabel, copied && styles.copyBtnLabelCopied]}>
            {copied ? 'Copied!' : 'Copy Code'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

export function QuestHistoryItem({
  title,
  category,
  xp_reward,
  completed_at,
  redemption_code,
  is_sponsored,
  sponsor_reward,
}: Props) {
  const color = CATEGORY_COLORS[category] ?? COLORS.accent
  const iconName = CATEGORY_IONICONS[category] ?? 'flag-outline'

  return (
    <View style={styles.row}>
      <View style={[styles.iconCircle, { backgroundColor: color + '26' }]}>
        <Ionicons name={iconName} size={18} color={color} />
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.date}>{formatCompletedDate(completed_at)}</Text>

        {is_sponsored && redemption_code ? (
          <RedemptionCodeCard code={redemption_code} sponsor_reward={sponsor_reward} />
        ) : is_sponsored ? (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>🎁 Reward Pending</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.xp}>+{xp_reward} XP</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  info: { flex: 1 },
  title: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  date: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  xp: { color: COLORS.accent, fontSize: 13, fontWeight: '700', alignSelf: 'flex-start', marginTop: 2 },

  // Pending badge (amber/gold pill)
  pendingBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: COLORS.bgWarm,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.warning + '60',
  },
  pendingBadgeText: {
    color: COLORS.warning,
    fontWeight: '700',
    fontSize: 11,
  },

  // Code card outer — carries Android elevation, no overflow clip
  codeCardOuter: {
    marginTop: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.indigoSoft,
    borderWidth: 1,
    borderColor: COLORS.indigo + '40',
    // iOS shadow
    shadowColor: COLORS.indigo,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    // Android elevation
    elevation: 2,
  },
  // Code card inner — clips content to rounded corners (safe on Android)
  codeCardInner: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  sponsorReward: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.indigo,
    marginBottom: SPACING.xs,
    letterSpacing: 0.2,
  },
  codeText: {
    fontFamily: 'Courier',
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 2,
    marginBottom: SPACING.sm,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: COLORS.indigo + '40',
  },
  copyBtnCopied: {
    borderColor: COLORS.success + '60',
    backgroundColor: COLORS.success + '10',
  },
  copyBtnLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.indigo,
  },
  copyBtnLabelCopied: {
    color: COLORS.success,
  },
})
