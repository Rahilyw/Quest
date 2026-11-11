import { StyleSheet, Text, View } from 'react-native'
import { BrandText } from '@/components/BrandText'
import { Pillow } from '@/components/Pillow'
import { Tape, TornLabel } from '@/components/scraps'
import { Body, Heading, Small } from '@/components/ui/Text'
import { plural, xpLabel } from '@/lib/copy'
import { weekRangeLabel, type WeekRecap } from '@/lib/recapWeek'
import { ordinal } from '@/lib/thisWeek'
import { COLOR, RADIUS, TYPE, getCategory } from '@/lib/theme'

/**
 * Weekly recap story card (Spec 06 §2, BRAND.md §5 scraps and §7 share card).
 * 9:16 at 360×640, captured at 3× like ShareCompletionCard. Pure view: the
 * parent wraps it for view-shot capture.
 *
 * What may appear here: the player's own rank, weekly XP, quest count, streak,
 * username, and their own place photo with its quest title. Nothing else.
 * No selfie, no coordinates, no other player.
 *
 * With a photo the quest's category colour is the background. Without one the
 * card is paper and ink, numbers only.
 *
 * Text does not follow the system font scale: this is a fixed-size image, and
 * the on-screen preview carries an accessibility label with the same content.
 */
export const RECAP_CARD_WIDTH = 360
export const RECAP_CARD_HEIGHT = 640

export interface RecapCardData {
  recap: WeekRecap
  username: string
  /** False when there is no photo or it failed to load: render numbers only. */
  showPhoto: boolean
}

const PHOTO_W = 180
const PHOTO_H = 206

/** One sentence with everything on the card, for the preview's screen-reader label. */
export function recapCardLabel({ recap, username, showPhoto }: RecapCardData): string {
  const parts = [`Recap card for ${weekRangeLabel(recap.weekStart)}`]
  if (recap.rank != null) parts.push(`${ordinal(recap.rank)} place`)
  parts.push(xpLabel(recap.weeklyXp))
  parts.push(plural(recap.questsCompleted, 'quest'))
  if (recap.streakWeeks != null && recap.streakWeeks > 0) {
    parts.push(`${recap.streakWeeks}-week streak`)
  }
  if (showPhoto && recap.photo?.questTitle) parts.push(`your photo from ${recap.photo.questTitle}`)
  parts.push(`@${username}`)
  return parts.join(', ')
}

export function RecapShareCard({ data }: { data: RecapCardData }) {
  const { recap, username, showPhoto } = data
  const photo = showPhoto ? recap.photo : null
  const cat = photo ? getCategory(photo.category) : null
  const background = cat ? cat.color : COLOR.paper
  const onColor = cat ? cat.onColor : COLOR.ink
  const ranked = recap.rank != null
  const streak = recap.streakWeeks != null && recap.streakWeeks > 0 ? recap.streakWeeks : null

  return (
    <View style={[styles.card, { backgroundColor: background }]}>
      <View style={styles.topRow}>
        <BrandText size="inline" color={onColor} allowFontScaling={false}>
          Quest!
        </BrandText>
        <Small color={onColor} allowFontScaling={false}>
          Victoria, BC
        </Small>
      </View>

      <View style={styles.label}>
        <TornLabel text={weekRangeLabel(recap.weekStart)} />
      </View>

      <View style={styles.figure}>
        <Text allowFontScaling={false} style={[TYPE.numeral, styles.numeral, { color: onColor }]}>
          {ranked ? ordinal(recap.rank as number) : String(recap.questsCompleted)}
        </Text>
        <Body color={onColor} allowFontScaling={false} style={styles.figureCaption}>
          {ranked
            ? recap.rankedPlayers != null && recap.rankedPlayers > 1
              ? `of ${plural(recap.rankedPlayers, 'player')} this week`
              : 'in Victoria this week'
            : `${recap.questsCompleted === 1 ? 'quest' : 'quests'} this week`}
        </Body>
      </View>

      {photo ? (
        <View style={styles.stage}>
          <Pillow uri={photo.url} width={PHOTO_W} height={PHOTO_H} edge="white" style={styles.photo} />
          <View style={styles.tape}>
            <Tape width={84} height={20} angle={-8} />
          </View>
        </View>
      ) : null}

      <View style={styles.copy}>
        <View style={styles.pills}>
          <View style={styles.pill}>
            <Body color={COLOR.white} tabular allowFontScaling={false} style={styles.pillText}>
              +{xpLabel(recap.weeklyXp)}
            </Body>
          </View>
          {ranked ? (
            <View style={styles.pill}>
              <Body color={COLOR.white} tabular allowFontScaling={false} style={styles.pillText}>
                {plural(recap.questsCompleted, 'quest')}
              </Body>
            </View>
          ) : null}
          {streak != null ? (
            <View style={styles.pill}>
              <Body color={COLOR.white} tabular allowFontScaling={false} style={styles.pillText}>
                {streak}-week streak
              </Body>
            </View>
          ) : null}
        </View>
        {photo?.questTitle ? (
          <Heading color={onColor} numberOfLines={1} allowFontScaling={false}>
            {photo.questTitle}
          </Heading>
        ) : null}
        <Small color={onColor} numberOfLines={1} allowFontScaling={false}>
          @{username}
        </Small>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    width: RECAP_CARD_WIDTH,
    height: RECAP_CARD_HEIGHT,
    overflow: 'hidden',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 22,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: { marginTop: 14, alignSelf: 'flex-start', transform: [{ rotate: '-2deg' }] },
  figure: { marginTop: 6 },
  numeral: { includeFontPadding: false },
  figureCaption: { marginTop: -2 },
  stage: {
    position: 'absolute',
    right: 14,
    top: 250,
    width: PHOTO_W,
    height: PHOTO_H,
  },
  photo: { transform: [{ rotate: '4deg' }] },
  tape: { position: 'absolute', top: -8, left: PHOTO_W / 2 - 42 },
  copy: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 22,
    gap: 8,
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    backgroundColor: COLOR.ink,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pillText: { fontWeight: '800' },
})
