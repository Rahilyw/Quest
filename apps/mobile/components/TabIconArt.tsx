import { memo } from 'react'
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg'
import type { TabMotif } from '@/lib/constants'

/**
 * The filled chip behind an active tab glyph: a vertical gradient in the tab's
 * own colour, a per-tab motif, and an iOS-style specular dome on top.
 * Every chip is the same 44×44 squircle — only the paint changes.
 */

const SIZE = 44
const R = 15

function Motif({ motif }: { motif: TabMotif }) {
  const stroke = 'rgba(255,255,255,0.55)'

  switch (motif) {
    // Explore — a sun/compass burst
    case 'rays':
      return (
        <G opacity={0.9}>
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4
            return (
              <Path
                key={i}
                d={`M${22 + Math.cos(a) * 12} ${22 + Math.sin(a) * 12} L${22 + Math.cos(a) * 18} ${22 + Math.sin(a) * 18}`}
                stroke={stroke}
                strokeWidth={1.6}
                strokeLinecap="round"
              />
            )
          })}
        </G>
      )

    // Quests — a dashed trail winding across the chip
    case 'trail':
      return (
        <G opacity={0.75}>
          <Path
            d="M2 34 C12 30, 12 16, 22 12 S36 14, 42 6"
            stroke={stroke}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeDasharray="3 4"
            fill="none"
          />
          <Circle cx={42} cy={6} r={2} fill="rgba(255,255,255,0.7)" />
        </G>
      )

    // Rankings — scattered sparkles
    case 'sparks':
      return (
        <G opacity={0.85}>
          {[
            [8, 10, 3.5],
            [36, 14, 2.6],
            [12, 35, 2.2],
            [33, 33, 3],
          ].map(([x, y, s], i) => (
            <Path
              key={i}
              d={`M${x} ${y - s} Q${x} ${y}, ${x + s} ${y} Q${x} ${y}, ${x} ${y + s} Q${x} ${y}, ${x - s} ${y} Q${x} ${y}, ${x} ${y - s} Z`}
              fill="rgba(255,255,255,0.75)"
            />
          ))}
        </G>
      )

    // Badges — concentric medal rings
    case 'rings':
      return (
        <G opacity={0.65}>
          <Circle cx={22} cy={22} r={19} stroke={stroke} strokeWidth={1.2} fill="none" />
          <Circle cx={22} cy={22} r={14} stroke={stroke} strokeWidth={1} fill="none" />
        </G>
      )

    // Profile — ripple arcs rising behind the figure
    case 'arc':
    default:
      return (
        <G opacity={0.6}>
          <Path d="M-2 38 A24 24 0 0 1 46 38" stroke={stroke} strokeWidth={1.6} fill="none" />
          <Path d="M4 42 A18 18 0 0 1 40 42" stroke={stroke} strokeWidth={1.4} fill="none" />
        </G>
      )
  }
}

export const TabChipArt = memo(function TabChipArt({
  id,
  from,
  to,
  motif,
}: {
  id: string
  from: string
  to: string
  motif: TabMotif
}) {
  const gradId = `chip-${id}`
  const glossId = `gloss-${id}`

  return (
    <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="0.35" y2="1">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
        <LinearGradient id={glossId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.55} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
      </Defs>

      <Rect x={0} y={0} width={SIZE} height={SIZE} rx={R} ry={R} fill={`url(#${gradId})`} />

      <G clipPath="none">
        <Motif motif={motif} />
      </G>

      {/* specular dome — the iOS glass tell */}
      <Ellipse cx={SIZE / 2} cy={2} rx={SIZE * 0.52} ry={SIZE * 0.34} fill={`url(#${glossId})`} />
      <Rect
        x={0.75}
        y={0.75}
        width={SIZE - 1.5}
        height={SIZE - 1.5}
        rx={R - 0.75}
        ry={R - 0.75}
        fill="none"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth={1.5}
      />
    </Svg>
  )
})

export const TAB_CHIP_SIZE = SIZE
export const TAB_CHIP_RADIUS = R
