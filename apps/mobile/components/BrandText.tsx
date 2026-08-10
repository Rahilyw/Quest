import { Text, type TextProps, type TextStyle } from 'react-native'
import { APP_NAME, COLORS, FONT_BRAND } from '@/lib/constants'

type BrandSize = 'display' | 'header' | 'logo' | 'inline' | 'compact'

/** Pilowlava wordmark face — logo / brand name only. */
const SIZE_MAP: Record<BrandSize, number> = {
  display: 36,
  header: 30,
  logo: 48,
  inline: 20,
  compact: 22,
}

const LETTER_SPACING: Record<BrandSize, number> = {
  display: 0,
  header: 0,
  logo: 0,
  inline: 0,
  compact: 0,
}

export interface BrandTextProps extends TextProps {
  size?: BrandSize
  uppercase?: boolean
  color?: string
}

export function BrandText({
  size = 'header',
  uppercase = false,
  color = COLORS.primary,
  style,
  children,
  ...rest
}: BrandTextProps) {
  const label = children ?? APP_NAME
  const display = uppercase ? String(label).toUpperCase() : label

  return (
    <Text
      style={[
        {
          fontFamily: FONT_BRAND,
          fontSize: SIZE_MAP[size],
          color,
          letterSpacing: LETTER_SPACING[size],
          lineHeight: SIZE_MAP[size] * 1.15,
        } as TextStyle,
        style,
      ]}
      {...rest}
    >
      {display}
    </Text>
  )
}

/** Inline "Quest!" inside body copy — nest inside a parent Text. */
export function BrandInline({ color }: { color?: string }) {
  return (
    <Text
      style={{
        fontFamily: FONT_BRAND,
        fontSize: SIZE_MAP.inline,
        color: color ?? COLORS.textPrimary,
        lineHeight: SIZE_MAP.inline * 1.2,
      }}
    >
      {APP_NAME}
    </Text>
  )
}
