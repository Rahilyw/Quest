import { Image, StyleSheet, Text, View } from 'react-native'
import { COLOR, FONT } from '@/lib/theme'

interface Props {
  username: string
  uri?: string | null
  size?: number
}

/**
 * A player's photo, or their initial in ink on paper. The brights belong to quest
 * categories (BRAND.md §3), so the fallback stays neutral.
 */
export function Avatar({ username, uri, size = 48 }: Props) {
  const initial = (username[0] ?? '?').toUpperCase()
  const radius = size / 2

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, { width: size, height: size, borderRadius: radius }]}
        accessibilityLabel={`${username}’s photo`}
      />
    )
  }

  const glyph = Math.round(size * 0.4)
  return (
    <View
      style={[styles.initials, { width: size, height: size, borderRadius: radius }]}
      accessible
      accessibilityLabel={`${username}’s photo`}
    >
      <Text
        allowFontScaling={false}
        style={[styles.initial, { fontSize: glyph, lineHeight: Math.round(glyph * 1.2) }]}
      >
        {initial}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  image: { overflow: 'hidden', backgroundColor: COLOR.paperDeep },
  initials: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: COLOR.desk,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLOR.inkFaint,
  },
  initial: {
    fontFamily: FONT.black,
    color: COLOR.ink,
    textAlign: 'center',
  },
})
