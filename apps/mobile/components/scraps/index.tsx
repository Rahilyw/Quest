/**
 * Scrap kit — small SVG decorative elements used sparingly on collage surfaces.
 *
 * Rules (BRAND.md §6b):
 * - At most 2 scraps per screen.
 * - Never in lists, forms or settings.
 * - All are hidden from screen readers unless they carry meaning.
 *
 * Exported components:
 *   PenRing      — hand-drawn circle, used to circle your rank on This week
 *   PenArrow     — hand-drawn arrow pointing right (or left)
 *   PenUnderline — single wavy underline stroke
 *   Sparkle      — four-point star sparkle, used on Verified screen
 *   Tape         — translucent butter-yellow washi tape strip
 *   TornLabel    — torn paper label for headings on collage moments ("Week 45")
 */

import React from 'react'
import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native'
import Svg, { Path, Rect, Polygon, Line, G } from 'react-native-svg'
import { COLOR, FONT, TYPE } from '@/lib/theme'

// ---------------------------------------------------------------------------
// Shared accessibility helpers
// All scraps are decorative by default.
// ---------------------------------------------------------------------------

const decorativeProps = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants' as const,
  accessible: false,
}

// ---------------------------------------------------------------------------
// PenRing
// ---------------------------------------------------------------------------

export interface PenRingProps {
  width: number
  height: number
  /** Default: tomato #F2584A */
  color?: string
}

/**
 * A rough hand-drawn circle. The bezier wobbles slightly so it reads as a
 * real pen mark rather than a computed shape.
 */
export function PenRing({ width, height, color = '#F2584A' }: PenRingProps) {
  const cx = width / 2
  const cy = height / 2
  const rx = width * 0.44
  const ry = height * 0.42

  // Imperfect ellipse: each quadrant has a slight wobble offset
  const path = [
    `M ${cx + rx} ${cy - ry * 0.08}`,
    // Top-right → top-left (wobble: starts slightly off-centre)
    `C ${cx + rx * 0.9} ${cy - ry * 1.1}  ${cx - rx * 0.1} ${cy - ry * 1.08}  ${cx - rx * 0.9} ${cy - ry * 0.6}`,
    // Top-left → bottom-left
    `C ${cx - rx * 1.1} ${cy - ry * 0.1}  ${cx - rx * 1.05} ${cy + ry * 0.6}  ${cx - rx * 0.5} ${cy + ry * 1.0}`,
    // Bottom-left → bottom-right
    `C ${cx + rx * 0.1} ${cy + ry * 1.12}  ${cx + rx * 1.0} ${cy + ry * 1.05}  ${cx + rx * 1.05} ${cy + ry * 0.4}`,
    // Bottom-right → back to start
    `C ${cx + rx * 1.08} ${cy - ry * 0.15}  ${cx + rx * 1.05} ${cy - ry * 0.05}  ${cx + rx} ${cy - ry * 0.08}`,
    'Z',
  ].join(' ')

  return (
    <View {...decorativeProps} style={{ width, height }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Path d={path} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  )
}

// ---------------------------------------------------------------------------
// PenArrow
// ---------------------------------------------------------------------------

export interface PenArrowProps {
  width: number
  height: number
  /** Default: cobalt #2F6BF0 */
  color?: string
  /** 'right' (default) or 'left' */
  direction?: 'right' | 'left'
}

/**
 * A hand-drawn arrow pointing right (or left). The shaft has a slight
 * upward bow and the arrowhead has two strokes rather than a filled triangle.
 */
export function PenArrow({ width, height, color = '#2F6BF0', direction = 'right' }: PenArrowProps) {
  const cx = width / 2
  const cy = height / 2

  // Shaft: slight bow upward from left to right
  const shaftPath = [
    `M ${width * 0.08} ${cy + height * 0.06}`,
    `C ${width * 0.3} ${cy - height * 0.12}  ${width * 0.65} ${cy - height * 0.08}  ${width * 0.88} ${cy}`,
  ].join(' ')

  // Arrowhead (two strokes from the tip)
  const tipX = width * 0.88
  const tipY = cy
  const headLen = width * 0.2
  const headAngle = 0.5 // radians

  const headPath = [
    `M ${tipX - Math.cos(headAngle) * headLen} ${tipY - Math.sin(headAngle) * headLen}`,
    `L ${tipX} ${tipY}`,
    `L ${tipX - Math.cos(headAngle) * headLen} ${tipY + Math.sin(headAngle) * headLen}`,
  ].join(' ')

  const transform = direction === 'left'
    ? `translate(${width} 0) scale(-1 1)`
    : undefined

  return (
    <View {...decorativeProps} style={{ width, height }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <G transform={transform}>
          <Path d={shaftPath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
          <Path d={headPath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        </G>
      </Svg>
    </View>
  )
}

// ---------------------------------------------------------------------------
// PenUnderline
// ---------------------------------------------------------------------------

export interface PenUnderlineProps {
  width: number
  height: number
  /** Default: ink #1C1915 */
  color?: string
}

/**
 * A single wavy underline stroke. The wave has one gentle undulation so it
 * reads as hand-drawn rather than a CSS text-decoration line.
 */
export function PenUnderline({ width, height, color = COLOR.ink }: PenUnderlineProps) {
  const cy = height * 0.6

  // One gentle wave: dips down in the first third, rises in the last third
  const path = [
    `M ${width * 0.02} ${cy}`,
    `C ${width * 0.25} ${cy + height * 0.3}`,
    `  ${width * 0.5}  ${cy - height * 0.25}`,
    `  ${width * 0.75} ${cy + height * 0.1}`,
    `  ${width * 0.98} ${cy - height * 0.05}`,
  ].join(' ')

  return (
    <View {...decorativeProps} style={{ width, height }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Path d={path} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      </Svg>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Sparkle
// ---------------------------------------------------------------------------

export interface SparkleProps {
  /** Default: 24 */
  size?: number
  /** Default: ink #1C1915 */
  color?: string
}

/**
 * A four-point star sparkle. Used on the Verified screen (3 of these staggered
 * by 300ms, per BRAND.md §8).
 *
 * Shape: a four-arm star where each arm is a narrow diamond lobe, giving the
 * classic "✦" or "sparkle" look.
 */
export function Sparkle({ size = 24, color = COLOR.ink }: SparkleProps) {
  const c = size / 2  // centre
  const outer = size / 2       // tip of long arms
  const inner = size * 0.09    // waist of star
  const shortOuter = size * 0.3 // tip of short (diagonal) arms

  // 4-point star path: alternate between long-arm tips and short-arm tips
  const path = [
    `M ${c} ${c - outer}`,                             // top tip
    `L ${c + inner} ${c - inner}`,
    `L ${c + shortOuter} ${c}`,                        // right diagonal tip
    `L ${c + inner} ${c + inner}`,
    `L ${c} ${c + outer}`,                             // bottom tip
    `L ${c - inner} ${c + inner}`,
    `L ${c - shortOuter} ${c}`,                        // left diagonal tip
    `L ${c - inner} ${c - inner}`,
    'Z',
  ].join(' ')

  return (
    <View {...decorativeProps} style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Path d={path} fill={color} />
      </Svg>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Tape
// ---------------------------------------------------------------------------

export interface TapeProps {
  /** Width of the tape strip. Default: 80 */
  width?: number
  /** Height of the tape strip. Default: 20 */
  height?: number
  /** Rotation in degrees. Default: 0 */
  angle?: number
}

/**
 * Translucent butter-yellow washi tape strip with faint diagonal stripes.
 * Used to hold proof photos on collage surfaces (Verified, share cards, You).
 *
 * Per BRAND.md §6b: "a translucent butter-yellow strip with faint stripes".
 */
export function Tape({ width = 80, height = 20, angle = 0 }: TapeProps) {
  // Stripe spacing and angle
  const stripeColor = 'rgba(200,170,60,0.3)'
  const stripeWidth = 2
  const stripeGap = 8
  const stripeAngle = 45 // degrees, from horizontal

  // Build stripe lines across the tape
  const stripes: React.ReactElement[] = []
  const diagLen = Math.sqrt(width * width + height * height)
  const count = Math.ceil(diagLen / stripeGap) + 2

  for (let i = -2; i <= count; i++) {
    const x = i * stripeGap
    // A vertical stripe line from (x, -height) to (x, height*2), rotated 45°
    stripes.push(
      <Line
        key={i}
        x1={x}
        y1={-height}
        x2={x - height * Math.tan((stripeAngle * Math.PI) / 180)}
        y2={height * 2}
        stroke={stripeColor}
        strokeWidth={stripeWidth}
      />
    )
  }

  return (
    <View
      {...decorativeProps}
      style={{
        width,
        height,
        transform: [{ rotate: `${angle}deg` }],
        backgroundColor: 'rgba(255,230,100,0.55)',
        overflow: 'hidden',
        borderRadius: 1,
      }}
    >
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {stripes}
      </Svg>
    </View>
  )
}

// ---------------------------------------------------------------------------
// TornLabel
// ---------------------------------------------------------------------------

export interface TornLabelProps {
  text: string
  /** Background colour. Default: warm white #FFFDFA */
  color?: string
  /** Text colour. Default: ink #1C1915 */
  textColor?: string
}

/**
 * A torn paper label: warm-white background, ink text at 800 weight, with
 * ragged top and bottom edges drawn in SVG to simulate torn paper.
 *
 * Used for headings on collage moments like "Week 45" on share cards.
 */
export function TornLabel({ text, color = COLOR.white, textColor = COLOR.ink }: TornLabelProps) {
  const paddingH = 12
  const paddingV = 6
  const tearHeight = 8
  const fontSize = TYPE.name.fontSize   // 16, 800 weight
  const lineH = TYPE.name.lineHeight ?? 22 // 22
  const totalHeight = tearHeight + paddingV + lineH + paddingV + tearHeight

  // Torn edge SVG for a strip of given width
  // The raggedness is a simple repeated zigzag-bezier
  function tornEdge(w: number, flip: boolean): string {
    const pts: string[] = []
    const steps = 6
    const stepW = w / steps

    pts.push(`M 0 ${flip ? 0 : tearHeight}`)
    for (let i = 0; i <= steps; i++) {
      const x = i * stepW
      const wobble = flip
        ? (i % 2 === 0 ? tearHeight * 0.3 : tearHeight * 0.9)
        : (i % 2 === 0 ? tearHeight * 0.7 : tearHeight * 0.1)
      pts.push(`L ${x} ${wobble}`)
    }
    pts.push(`L ${w} ${flip ? 0 : tearHeight}`)
    return pts.join(' ')
  }

  return (
    <View
      {...decorativeProps}
      style={[styles.tornLabelOuter, { minWidth: 60 }]}
    >
      {/* Top torn edge — rendered as SVG below the View so we can use percentage width */}
      <View style={{ height: tearHeight, overflow: 'hidden' }}>
        {/* We use a fixed estimate width; for a real implementation the layout
            engine would measure first. 200px covers most short labels. */}
        <Svg width="100%" height={tearHeight} viewBox={`0 0 200 ${tearHeight}`} preserveAspectRatio="none">
          <Path d={tornEdge(200, true)} fill={color} />
        </Svg>
      </View>

      {/* Body */}
      <View style={[styles.tornLabelBody, { backgroundColor: color, paddingHorizontal: paddingH, paddingVertical: paddingV }]}>
        <Text
          style={[styles.tornLabelText, { color: textColor }]}
          numberOfLines={1}
        >
          {text}
        </Text>
      </View>

      {/* Bottom torn edge */}
      <View style={{ height: tearHeight, overflow: 'hidden' }}>
        <Svg width="100%" height={tearHeight} viewBox={`0 0 200 ${tearHeight}`} preserveAspectRatio="none">
          <Path d={tornEdge(200, false)} fill={color} />
        </Svg>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  tornLabelOuter: {
    alignSelf: 'flex-start',
    // Soft shadow to lift the label off the collage surface
    shadowColor: COLOR.ink,
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  } as ViewStyle,
  tornLabelBody: {
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  tornLabelText: {
    fontFamily: FONT.black,
    fontSize: TYPE.name.fontSize,
    lineHeight: TYPE.name.lineHeight,
  } as TextStyle,
})
