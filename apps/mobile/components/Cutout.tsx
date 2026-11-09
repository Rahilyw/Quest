/**
 * Cutout — the photographed, background-removed quest object.
 *
 * Every quest has exactly one cutout (a real photographed object, background
 * removed, shadow baked into the WebP). This component handles all placement
 * roles defined in BRAND.md §6 (Placement table).
 *
 * Usage:
 *   <Cutout uri={quest.cutout_url} category="food" questTitle="Soft-serve at Beacon Drive-In" role="folder" />
 *   <Cutout uri={null} category="fitness" role="inline" />
 *   <Cutout uri={quest.cutout_url} category="nature" role="collection" locked />
 */

import React from 'react'
import {
  Dimensions,
  Image,
  StyleSheet,
  View,
  type ImageStyle,
  type ViewStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLOR, CATEGORY, getCategory } from '@/lib/theme'

// ---------------------------------------------------------------------------
// Role → size map (BRAND.md §6, Placement table)
// ---------------------------------------------------------------------------

const SCREEN_WIDTH = Dimensions.get('window').width

/**
 * Resolved display dimensions for each placement role.
 * `breakout` and `celebration` scale with the screen width.
 */
function getSizeForRole(role: CutoutRole): { width: number | string; height: number | 'auto' } {
  switch (role) {
    case 'inline':
      // About 1.5× body size, with a real box so the image can sit inside a sentence.
      return { width: 28, height: 28 }
    case 'folder':
      return { width: 54, height: 64 }
    case 'row':
      return { width: 48, height: 48 }
    case 'breakout':
      // Up to 60% of screen width, aspect ratio preserved via height: 'auto'
      return { width: Math.round(SCREEN_WIDTH * 0.6), height: 'auto' }
    case 'collection':
      // 3-across shelf with 16px gutters on each side and 8px between items:
      //   usable = screenWidth - 2*16 - 2*8 = screenWidth - 48
      //   itemWidth = usable / 3
      return { width: Math.round((SCREEN_WIDTH - 48) / 3), height: 'auto' }
    case 'celebration':
      return { width: Math.round(SCREEN_WIDTH * 0.5), height: 'auto' }
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type CutoutRole = 'inline' | 'folder' | 'row' | 'breakout' | 'collection' | 'celebration'

export interface CutoutProps {
  /**
   * The cutout URL (`quest.cutout_url`). Falls back to a placeholder when null.
   * Category defaults are content, not code — the caller supplies the URL or null.
   */
  uri?: string | null
  /** Used for the category-colour placeholder and the accessibility label. */
  category: string
  /** e.g. "Soft-serve cone, Beacon Drive-In" — used in the accessibility label. */
  questTitle?: string
  /** Where the cutout appears; controls its size. */
  role: CutoutRole
  /**
   * Collection role: locked cutouts render at 28% opacity and desaturated.
   * Has no effect on other roles.
   */
  locked?: boolean
  /** Rotation in degrees. Clamped to ±10° per spec (BRAND.md §6). */
  rotation?: number
  style?: ImageStyle
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Cutout({
  uri,
  category,
  questTitle,
  role,
  locked = false,
  rotation = 0,
  style,
}: CutoutProps) {
  // Clamp rotation to ±10° (spec: "Never rotate more than 10°")
  const clampedRotation = Math.max(-10, Math.min(10, rotation))

  const cat = getCategory(category)
  const { width, height } = getSizeForRole(role)

  // Inline cutouts in sentences are purely decorative
  const isDecorative = role === 'inline'

  // Accessibility label
  const a11yLabel = questTitle
    ? `${questTitle} cutout`
    : `${cat.label} quest cutout`

  // --- Collection locked treatment ---
  const imageStyle: ImageStyle = {
    width: typeof width === 'string' ? undefined : width,
    height: typeof height === 'string' ? undefined : height,
    ...(typeof width === 'string' ? {} : {}),
    transform: clampedRotation !== 0 ? [{ rotate: `${clampedRotation}deg` }] : undefined,
    ...(locked && role === 'collection'
      ? {
          opacity: 0.28,
          // React Native doesn't have a CSS filter, but on iOS we can use
          // tintColor as a greyscale hint. A proper greyscale filter requires
          // expo-image or a third-party library. We set opacity (28%) and leave
          // greyscale as a TODO until expo-image is adopted.
          // TODO: replace with expo-image <Image style={{ filter: 'grayscale(1)' }} />
        }
      : {}),
    ...style,
  }

  // --- Fallback: no URI → category colour + icon placeholder ---
  if (!uri) {
    const placeholderSize = typeof width === 'number' ? width : 48
    return (
      <View
        style={[
          styles.placeholder,
          {
            width: placeholderSize,
            height: typeof height === 'number' ? height : placeholderSize,
            backgroundColor: cat.color,
            transform: clampedRotation !== 0 ? [{ rotate: `${clampedRotation}deg` }] : undefined,
            opacity: locked && role === 'collection' ? 0.28 : 1,
          },
        ]}
        accessible={!isDecorative}
        accessibilityLabel={isDecorative ? undefined : a11yLabel}
        accessibilityRole="image"
        // Decorative inline cutouts are hidden from the screen reader
        accessibilityElementsHidden={isDecorative}
        // @ts-ignore — React Native Web / Android accessibility
        importantForAccessibility={isDecorative ? 'no-hide-descendants' : 'auto'}
      >
        <Ionicons
          name={cat.icon as any}
          size={Math.round(placeholderSize * 0.5)}
          color={cat.onColor}
        />
      </View>
    )
  }

  // --- Normal image render ---
  // For roles where height is 'auto' we need aspectRatio instead of a fixed height.
  const needsAuto = height === 'auto'

  return (
    <Image
      source={{ uri }}
      style={[
        {
          width: typeof width === 'number' ? width : undefined,
          // For fixed sizes
          ...(needsAuto
            ? { aspectRatio: 1 }   // cutouts are roughly square; baked shadow means natural ratio is fine
            : { height: height as number }),
          resizeMode: 'contain',
        },
        imageStyle,
      ]}
      accessible={!isDecorative}
      accessibilityLabel={isDecorative ? undefined : a11yLabel}
      accessibilityRole="image"
      // Inline cutouts are decorative and should be hidden from screen readers
      accessibilityElementsHidden={isDecorative}
      // @ts-ignore
      importantForAccessibility={isDecorative ? 'no-hide-descendants' : 'auto'}
    />
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  placeholder: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
})

export default Cutout
