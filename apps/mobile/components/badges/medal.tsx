import type { ReactNode } from 'react'
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg'

/**
 * Faux-3D medal chassis. Layered gradients: metal rim lit from above,
 * recessed bevel ring, off-axis radial sheen on the face, specular arc.
 * Emblems render as children in a 100×100 viewBox (center 50,50).
 */

export type MedalPalette =
  | 'gold'
  | 'bronze'
  | 'silver'
  | 'sapphire'
  | 'ember'
  | 'teal'
  | 'sky'

interface PaletteStops {
  rim: [string, string, string]
  face: [string, string, string]
}

// Metals are BRAND.md §6c tokens. The coloured palettes are the category
// brights (§3), so a badge in a category's colour reads as that category:
// sapphire = cobalt (Community), ember = tomato (Food), teal = grass (Nature),
// sky = lilac (Social). Each runs light → token → deep, like the metals.
export const MEDAL_PALETTES: Record<MedalPalette, PaletteStops> = {
  gold: { rim: ['#FFF6D5', '#F2C14E', '#B97709'], face: ['#FFE9A8', '#F6B93B', '#C87F0A'] },
  bronze: { rim: ['#FBDDC0', '#C97B3D', '#7C3F16'], face: ['#F2B27C', '#C97B3D', '#8C4A1D'] },
  silver: { rim: ['#FFFFFF', '#C6D2DD', '#8195A8'], face: ['#EDF2F7', '#B9C6D3', '#8DA2B5'] },
  sapphire: { rim: ['#E4ECFD', '#8FAEF6', '#2553BB'], face: ['#9DBAF8', '#2F6BF0', '#1D4496'] },
  ember: { rim: ['#FDE4E0', '#F59A90', '#BD453A'], face: ['#F9AEA6', '#F2584A', '#9A372E'] },
  teal: { rim: ['#DEF5E6', '#86D7A3', '#298F4E'], face: ['#9CE0B5', '#34B864', '#21723F'] },
  sky: { rim: ['#F6F2FD', '#DCD0F6', '#9A8BBB'], face: ['#EAE2FA', '#C6B2F0', '#85779F'] },
}

/** The medal palette that carries a quest category's colour. */
export function categoryMedalPalette(category: string | null | undefined): MedalPalette {
  switch (category) {
    case 'community':
      return 'sapphire'
    case 'food':
      return 'ember'
    case 'nature':
      return 'teal'
    case 'social':
      return 'sky'
    default:
      return 'gold'
  }
}

interface MedalProps {
  size: number
  palette: MedalPalette
  children?: ReactNode
}

export function Medal({ size, palette, children }: MedalProps) {
  const p = MEDAL_PALETTES[palette]
  const rimId = `rim-${palette}`
  const faceId = `face-${palette}`
  const edgeId = `edge-${palette}`

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={rimId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={p.rim[0]} />
          <Stop offset="0.55" stopColor={p.rim[1]} />
          <Stop offset="1" stopColor={p.rim[2]} />
        </LinearGradient>
        {/* Bevel ring runs the opposite way, reads as a recessed cut */}
        <LinearGradient id={edgeId} x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor={p.rim[0]} />
          <Stop offset="1" stopColor={p.rim[2]} />
        </LinearGradient>
        <RadialGradient id={faceId} cx="36%" cy="30%" r="85%">
          <Stop offset="0" stopColor={p.face[0]} />
          <Stop offset="0.55" stopColor={p.face[1]} />
          <Stop offset="1" stopColor={p.face[2]} />
        </RadialGradient>
      </Defs>

      {/* Ground shadow */}
      <Circle cx="50" cy="53.5" r="46" fill="rgba(28,25,21,0.16)" />
      {/* Rim */}
      <Circle cx="50" cy="50" r="46" fill={`url(#${rimId})`} />
      {/* Recessed bevel */}
      <Circle cx="50" cy="50" r="40.5" fill={`url(#${edgeId})`} />
      {/* Face */}
      <Circle cx="50" cy="50" r="38" fill={`url(#${faceId})`} />
      {/* Engraved tick ring */}
      <Circle
        cx="50"
        cy="50"
        r="34.5"
        fill="none"
        stroke="rgba(0,0,0,0.14)"
        strokeWidth="0.8"
        strokeDasharray="1.4 3.2"
      />

      {/* Cast bridges the monorepo's hoisted @types/react@18 (react-native-svg)
          and this app's React 19 ReactNode — identical at runtime. */}
      {children as never}

      {/* Specular arc, top-left */}
      <Path
        d="M 17 33 A 37 37 0 0 1 40 14.5"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  )
}
