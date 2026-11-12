/**
 * Quest! Admin: the Cutouts direction (docs/design/BRAND.md), on paper.
 * Values mirror apps/mobile/lib/theme.ts so category colours match the app.
 * Admin stays dense and quiet: ink buttons, category colour only as small chips.
 */
export const theme = {
  bg: '#F6F2EC',
  bgElevated: '#FFFDFA',
  surface: '#FFFDFA',
  surfaceHover: '#ECE7E0',
  border: 'rgba(28, 25, 21, 0.10)',
  borderStrong: 'rgba(28, 25, 21, 0.20)',

  text: '#1C1915',
  textMuted: '#6B665E',
  textDim: '#6B665E',

  /** Ink is the one action colour. */
  primary: '#1C1915',
  primaryLight: '#34302A',
  primarySoft: 'rgba(28, 25, 21, 0.07)',
  onPrimary: '#FFFDFA',

  /** Sponsored. */
  highlight: '#C77818',
  success: '#298F4E',
  warning: '#C77818',
  danger: '#BD453A',
  dangerSoft: 'rgba(189, 69, 58, 0.10)',
  dangerBorder: 'rgba(189, 69, 58, 0.35)',

  radius: { sm: 8, md: 12, lg: 16, xl: 22, pill: 9999 },

  categories: {
    fitness: { color: '#FFCE1F', deep: '#C7A118', onColor: '#1C1915', soft: 'rgba(255,206,31,0.25)', label: 'Fitness' },
    social: { color: '#C6B2F0', deep: '#9A8BBB', onColor: '#1C1915', soft: 'rgba(198,178,240,0.30)', label: 'Social' },
    food: { color: '#F2584A', deep: '#BD453A', onColor: '#1C1915', soft: 'rgba(242,88,74,0.20)', label: 'Food' },
    community: { color: '#2F6BF0', deep: '#2553BB', onColor: '#FFFDFA', soft: 'rgba(47,107,240,0.18)', label: 'Community' },
    nature: { color: '#34B864', deep: '#298F4E', onColor: '#1C1915', soft: 'rgba(52,184,100,0.22)', label: 'Nature' },
  } as Record<string, { color: string; deep: string; onColor: string; soft: string; label: string }>,
} as const

export const VICTORIA_DEFAULT = { lat: 48.4284, lng: -123.3656 }
