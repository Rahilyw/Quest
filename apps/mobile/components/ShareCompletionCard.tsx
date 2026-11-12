import { View, StyleSheet } from 'react-native'
import { BrandText } from '@/components/BrandText'
import { Sticker } from '@/components/Sticker'
import { Pillow } from '@/components/Pillow'
import { Body, Heading, Small } from '@/components/ui/Text'
import { getLevelTitle } from '@/lib/constants'
import { COLOR, RADIUS, getCategory } from '@/lib/theme'

/**
 * 9:16 story card (BRAND.md §7), rendered at 360×640 and captured at 3× for
 * Instagram stories. The quest's category colour is the whole background, the
 * proof photo is a pillow, and the quest's cutout overlaps its corner.
 * Pure view: the parent wraps it for view-shot capture.
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
  /** Quest category key. Drives the background colour. Falls back to Fitness. */
  category?: string | null
  /** `quests.cutout_url`; a category-colour placeholder shows when absent. */
  cutoutUrl?: string | null
}

const PHOTO_W = 276
const PHOTO_H = 316

export function ShareCompletionCard({ data }: { data: ShareCompletionData }) {
  const cat = getCategory(data.category)
  const dateStr = new Date(data.completedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <View style={[styles.card, { backgroundColor: cat.color }]}>
      <View style={styles.topRow}>
        <BrandText size="inline" color={cat.onColor}>
          Quest!
        </BrandText>
        <Small color={cat.onColor}>Victoria, BC</Small>
      </View>

      <View style={styles.stage}>
        <Pillow
          uri={data.photoUri}
          width={PHOTO_W}
          height={PHOTO_H}
          edge="white"
          style={styles.photo}
        />
        <Sticker uri={data.cutoutUrl} size={128} tilt={6} style={styles.cutout} />
      </View>

      <View style={styles.copy}>
        <Small color={cat.onColor}>Quest complete</Small>
        <Heading color={cat.onColor} numberOfLines={2}>
          {data.questTitle}
        </Heading>
        <View style={styles.row}>
          <View style={styles.xpPill}>
            <Body color={COLOR.white} tabular style={styles.xpText}>
              +{data.xpReward} XP
            </Body>
          </View>
          <Small color={cat.onColor} numberOfLines={1} style={styles.who}>
            @{data.username}, level {data.level} {getLevelTitle(data.level)}
          </Small>
        </View>
        <Small color={cat.onColor}>{dateStr}</Small>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    overflow: 'hidden',
    paddingHorizontal: 22,
    paddingTop: 22,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stage: {
    marginTop: 24,
    height: PHOTO_H + 24,
    alignItems: 'center',
  },
  photo: { transform: [{ rotate: '-3deg' }] },
  cutout: { position: 'absolute', right: -6, bottom: -4 },
  copy: { marginTop: 22, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  xpPill: {
    backgroundColor: COLOR.ink,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  xpText: { fontWeight: '800' },
  who: { flexShrink: 1 },
})
