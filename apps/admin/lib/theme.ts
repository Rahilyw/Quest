/** Quest! Admin — Harbour Electric (dark ops desk variant) */
export const theme = {
  bg: '#0D1B3E',
  bgElevated: '#1a2d6d',
  surface: '#1E293B',
  surfaceHover: '#243047',
  border: 'rgba(67, 100, 247, 0.15)',
  borderStrong: 'rgba(255, 255, 255, 0.08)',

  text: '#F1F5F9',
  textMuted: '#94A3B8',
  textDim: '#64748B',

  primary: '#4364F7',
  primaryLight: '#6B8EFF',
  primarySoft: 'rgba(67, 100, 247, 0.15)',

  highlight: '#FF6B35',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',

  radius: { sm: 8, md: 12, lg: 16, xl: 20, pill: 9999 },

  categories: {
    fitness: { color: '#22C55E', soft: 'rgba(34,197,94,0.15)', label: 'Fitness', icon: '🏃' },
    social: { color: '#A855F7', soft: 'rgba(168,85,247,0.15)', label: 'Social', icon: '🤝' },
    food: { color: '#F97316', soft: 'rgba(249,115,22,0.15)', label: 'Food', icon: '🍽️' },
    community: { color: '#3B82F6', soft: 'rgba(59,130,246,0.15)', label: 'Community', icon: '🏘️' },
    nature: { color: '#06B6D4', soft: 'rgba(6,182,212,0.15)', label: 'Nature', icon: '🌿' },
  } as Record<string, { color: string; soft: string; label: string; icon: string }>,
} as const

export const VICTORIA_DEFAULT = { lat: 48.4284, lng: -123.3656 }
