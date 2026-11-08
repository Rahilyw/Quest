import { Text as RNText, type TextProps, type TextStyle, type StyleProp } from 'react-native'
import { COLOR, TYPE, type TypeRole } from '@/lib/theme'

/**
 * Text primitives, one per type role in docs/design/BRAND.md §4.
 * Components use these instead of setting fontFamily / fontSize themselves.
 *
 *   <Title>Quests</Title>
 *   <Body tone="soft">4 km, about 40 minutes</Body>
 */

type Tone = 'ink' | 'soft' | 'faint' | 'inverse'

const TONE: Record<Tone, string> = {
  ink: COLOR.ink,
  soft: COLOR.inkSoft,
  faint: COLOR.inkFaint,
  inverse: COLOR.white,
}

/** Large roles stop growing past this system text-size multiplier so layouts hold. */
const MAX_SCALE: Partial<Record<TypeRole, number>> = { title: 1.3, sentence: 1.3, heading: 1.4 }

export interface QuestTextProps extends TextProps {
  tone?: Tone
  /** Overrides tone with any token colour, e.g. a category's onColor. */
  color?: string
  /** Tabular figures for numbers that change (XP, counts, ranks). */
  tabular?: boolean
  style?: StyleProp<TextStyle>
}

function make(role: TypeRole, accessibilityRole?: TextProps['accessibilityRole']) {
  function QuestText({ tone = 'ink', color, tabular, style, ...rest }: QuestTextProps) {
    return (
      <RNText
        accessibilityRole={accessibilityRole}
        maxFontSizeMultiplier={MAX_SCALE[role]}
        {...rest}
        style={[
          TYPE[role],
          { color: color ?? TONE[tone] },
          tabular ? { fontVariant: ['tabular-nums'] } : null,
          style,
        ]}
      />
    )
  }
  QuestText.displayName = `Text.${role}`
  return QuestText
}

export const Title = make('title', 'header')
export const Sentence = make('sentence')
export const Heading = make('heading', 'header')
export const Body = make('body')
export const BodyStrong = make('bodyStrong')
export const Name = make('name')
export const Small = make('small')
export const Micro = make('micro')
