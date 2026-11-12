/**
 * Pillow — the bulged-squircle clip shape used for ALL proof photos and selfies.
 *
 * Shape: a custom bezier path (BRAND.md §6a) that is not perfectly round and not
 * a standard rounded rectangle — it has exaggerated curvature on the long sides
 * and tighter corners, giving the "bulge" that reads as an Instax-style frame.
 *
 * Usage:
 *   <Pillow uri={completion.photo_url} width={PILLOW_SIZES.row.width} height={PILLOW_SIZES.row.height} />
 *   <Pillow uri={completion.photo_url} {...PILLOW_SIZES.viewer} edge="white" />
 */

import React, { useId } from 'react'
import { View, type ViewStyle } from 'react-native'
import Svg, {
  Defs,
  ClipPath,
  Path,
  Image as SvgImage,
} from 'react-native-svg'
import { COLOR } from '@/lib/theme'

// ---------------------------------------------------------------------------
// Standard sizes (BRAND.md §6a)
// ---------------------------------------------------------------------------

export const PILLOW_SIZES = {
  /** Used in list rows and corner stacks on the quest page. */
  row: { width: 62, height: 70 },
  /** Used in feed speech bubbles. */
  bubble: { width: 66, height: 74 },
  /** Full-screen viewer. */
  viewer: { width: 236, height: 268 },
} as const

export type PillowSize = keyof typeof PILLOW_SIZES

// ---------------------------------------------------------------------------
// Path builder
// ---------------------------------------------------------------------------

/**
 * Build the pillow bezier in absolute pixel coordinates for a given W×H.
 *
 * The normalized path (from BRAND.md §6a, `clipPathUnits="objectBoundingBox"`) is:
 *   M.5 0 C.83 0 .96.03 .985.18  1 .3 1 .7  .985.82 .96.97 .83 1  .5 1
 *         .17 1 .04.97 .015.82    0 .7 0 .3  .015.18 .04.03 .17 0  .5 0 Z
 *
 * Each (x, y) normalised coordinate maps to (x*W, y*H).
 */
function pillowPath(W: number, H: number): string {
  const x = (n: number) => n * W
  const y = (n: number) => n * H
  // prettier-ignore
  return [
    `M${x(0.5)} ${y(0)}`,
    `C${x(0.83)} ${y(0)} ${x(0.96)} ${y(0.03)} ${x(0.985)} ${y(0.18)}`,
    `${x(1)} ${y(0.3)} ${x(1)} ${y(0.7)}`,
    `${x(0.985)} ${y(0.82)} ${x(0.96)} ${y(0.97)} ${x(0.83)} ${y(1)}`,
    `${x(0.5)} ${y(1)}`,
    `${x(0.17)} ${y(1)} ${x(0.04)} ${y(0.97)} ${x(0.015)} ${y(0.82)}`,
    `${x(0)} ${y(0.7)} ${x(0)} ${y(0.3)}`,
    `${x(0.015)} ${y(0.18)} ${x(0.04)} ${y(0.03)} ${x(0.17)} ${y(0)}`,
    `${x(0.5)} ${y(0)} Z`,
  ].join(' ')
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PillowProps {
  /** The image URI to display (remote URL or local file URI). */
  uri: string
  width: number
  height: number
  /**
   * Edge/outline colour:
   * - `'ink'`  — 2 px warm-black stroke (default; use on light backgrounds)
   * - `'white'` — 2 px warm-white stroke (use on dark or colour-filled backgrounds)
   */
  edge?: 'ink' | 'white'
  style?: ViewStyle
  accessibilityLabel?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Pillow({
  uri,
  width,
  height,
  edge = 'ink',
  style,
  accessibilityLabel,
}: PillowProps) {
  // Each Pillow instance needs its own unique clip-path ID so multiple pillows
  // on the same screen don't share the same clip region.
  const uid = useId()
  const clipId = `pillow-clip-${uid.replace(/:/g, '')}`

  const path = pillowPath(width, height)
  const edgeColor = edge === 'white' ? COLOR.white : COLOR.ink

  return (
    <View
      style={[{ width, height }, style]}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
    >
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <ClipPath id={clipId}>
            <Path d={path} />
          </ClipPath>
        </Defs>

        {/* The photo, clipped to the pillow shape */}
        <SvgImage
          href={uri}
          x={0}
          y={0}
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
        />

        {/* 2 px outline rendered as a stroked path on top of the clip */}
        <Path
          d={path}
          fill="none"
          stroke={edgeColor}
          strokeWidth={2}
          // The stroke sits on the path centre-line, so half of it bleeds
          // outside the clip region (giving the clean edge look from the spec).
        />
      </Svg>
    </View>
  )
}

export default Pillow
