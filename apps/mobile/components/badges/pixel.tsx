import { View } from 'react-native'

/**
 * Tiny pixel-sprite renderer. Each grid row is a string; each char maps to a
 * palette color, '.' (or any unmapped char) is transparent. Sprites stay small
 * (12×12) so the View count is negligible.
 */

interface PixelSpriteProps {
  grid: string[]
  palette: Record<string, string>
  size: number
}

export function PixelSprite({ grid, palette, size }: PixelSpriteProps) {
  const rows = grid.length
  const cols = grid[0]?.length ?? 1
  const px = size / Math.max(rows, cols)

  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      pointerEvents="none"
    >
      <View>
        {grid.map((row, y) => (
          <View key={y} style={{ flexDirection: 'row' }}>
            {[...row].map((c, x) => (
              <View
                key={x}
                style={{ width: px, height: px, backgroundColor: palette[c] ?? 'transparent' }}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  )
}
