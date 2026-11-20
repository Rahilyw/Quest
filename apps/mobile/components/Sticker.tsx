/**
 * Sticker — a real photographed object with a white die-cut edge and a baked
 * shadow (BRAND.md §6). The admin uploads the photo; the server bakes the edge
 * and shadow into a 600px WebP, so this component only places the image.
 *
 * A quest without a sticker shows no sticker: this renders nothing when `uri`
 * is empty. There is no category default and no icon tile.
 *
 *   <Sticker uri={quest.cutout_url} size="inline" />                     decorative, beside its action phrase
 *   <Sticker uri={quest.cutout_url} size="row" alt="Soft-serve cone" />
 *   <Sticker uri={s.image_url} size="drawer" alt={s.alt_text} locked />  greyed at 28%
 */

import { Image, type ImageStyle, type StyleProp } from 'react-native'
import { COLOR } from '@/lib/theme'
import { STICKER_SIZE, clampTilt } from '@/lib/stickerBoard'

export type StickerSize = keyof typeof STICKER_SIZE

export interface StickerProps {
  uri?: string | null
  /** Named slot from BRAND.md §6 Placement, or an exact point size. */
  size: StickerSize | number
  /**
   * What the object is ("Soft-serve cone, Beacon Drive-In quest"). Without it
   * the sticker is decorative and hidden from screen readers, which suits a
   * sticker sitting beside words that already name the quest.
   */
  alt?: string | null
  /** Degrees, clamped to -12..12. */
  tilt?: number
  /** Not yet earned: a grey silhouette at 28%. */
  locked?: boolean
  style?: StyleProp<ImageStyle>
}

export function Sticker({ uri, size, alt, tilt = 0, locked = false, style }: StickerProps) {
  if (!uri) return null
  const points = typeof size === 'number' ? size : STICKER_SIZE[size]
  const t = clampTilt(tilt)
  const decorative = !alt
  return (
    <Image
      source={{ uri }}
      resizeMode="contain"
      style={[
        { width: points, height: points },
        t !== 0 ? { transform: [{ rotate: `${t}deg` }] } : null,
        locked ? { opacity: 0.28, tintColor: COLOR.inkSoft } : null,
        style,
      ]}
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={decorative ? undefined : locked ? `${alt}, not earned yet` : alt ?? undefined}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
    />
  )
}

/** Accessible name for a quest's sticker when the quest has no stored alt text. */
export function questStickerAlt(quest: { title?: string | null; cutout_alt?: string | null }): string {
  return quest.cutout_alt?.trim() || (quest.title ? `${quest.title} sticker` : 'Quest sticker')
}

export default Sticker
