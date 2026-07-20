import { Text, type TextProps, type TextStyle } from 'react-native'
import { APP_NAME, COLORS, FONT_BRAND } from '@/lib/constants'

type BrandSize = 'display' | 'header' | 'logo' | 'inline' | 'compact'

/** Bispo Nova is a display face — slightly larger than UI text, but kept restrained. */
const SIZE_MAP: Record<BrandSize, number> = {
  display: 32,
  header: 28,
  logo: 44,
  inline: 18,
  compact: 20,
}

const LETTER_SPACING: Record<BrandSize, number> = {
  display: 0.5,
  header: 0,
  logo: 0.5,
  inline: 0,
  compact: 0.25,
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
