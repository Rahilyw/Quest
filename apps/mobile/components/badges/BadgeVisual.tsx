import { Image, Text, View } from 'react-native'
import { FONT_BRAND } from '@/lib/constants'
import type { BadgeSpec } from '@/lib/badgeCatalog'
import { BADGE_ART } from './art'

/**
 * Renders a badge's art with its earned/locked treatment.
 * Locked art stays visible but sinks into shadow (a relic you can't read yet).
 * Secret badges render a sealed marker until earned.
 */

interface Props {
  spec: BadgeSpec
  size: number
  earned: boolean
}

export function MysterySeal({ size }: { size: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#1A2B4A',
        borderWidth: 1.5,
        borderColor: 'rgba(251,191,36,0.4)',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: FONT_BRAND,
          fontSize: size * 0.42,
          color: 'rgba(251,191,36,0.85)',
          lineHeight: size * 0.52,
        }}
      >
        ?
      </Text>
    </View>
  )
}

export function BadgeVisual({ spec, size, earned }: Props) {
  if (spec.secret && !earned) {
    return <MysterySeal size={size} />
  }

  const art = BADGE_ART[spec.key]

  if (art) {
    const { Component, shape } = art

    if (earned) {
      return <Component size={size} />
    }

    return (
      <View style={{ width: size, height: size }}>
        <Component size={size} />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: size,
            height: size,
            borderRadius: shape === 'round' ? size / 2 : size * 0.14,
            backgroundColor: 'rgba(26,43,74,0.62)',
          }}
        />
      </View>
    )
  }

  if (spec.iconUrl) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.14,
          overflow: 'hidden',
          opacity: earned ? 1 : 0.45,
        }}
      >
        <Image source={{ uri: spec.iconUrl }} style={{ width: size, height: size }} resizeMode="cover" />
      </View>
    )
  }

  return <MysterySeal size={size} />
}
