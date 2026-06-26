import { View, Text, Image, StyleSheet } from 'react-native'

// Vivid summer palette — rotated by username hash so every user gets a distinct color
const PALETTES = [
  { bg: '#DCFCE7', fg: '#15803D' }, // green
  { bg: '#F3E8FF', fg: '#7E22CE' }, // purple
  { bg: '#FFEDD5', fg: '#C2410C' }, // orange
  { bg: '#DBEAFE', fg: '#1D4ED8' }, // blue
  { bg: '#CFFAFE', fg: '#0E7490' }, // cyan
  { bg: '#FEF9C3', fg: '#A16207' }, // yellow
  { bg: '#FCE7F3', fg: '#9D174D' }, // pink
]

function hashUsername(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return h
}

interface Props {
  username: string
  uri?: string | null
  size?: number
}

export function Avatar({ username, uri, size = 48 }: Props) {
  const palette = PALETTES[hashUsername(username) % PALETTES.length]
  const initial = (username[0] ?? '?').toUpperCase()
  const radius = size / 2

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, { width: size, height: size, borderRadius: radius }]}
        accessibilityLabel={`${username}'s avatar`}
      />
    )
  }

  return (
    <View
      style={[
        styles.initials,
        { width: size, height: size, borderRadius: radius, backgroundColor: palette.bg },
      ]}
      accessible
      accessibilityLabel={`${username}'s avatar`}
    >
      <Text
        style={{
          fontSize: Math.round(size * 0.38),
          fontWeight: '800',
          color: palette.fg,
          lineHeight: size,
          textAlign: 'center',
        }}
      >
        {initial}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  image: { overflow: 'hidden' },
  initials: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
})
