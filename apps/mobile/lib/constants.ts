export const CITY = {
  name: 'Victoria, BC',
  lat: 48.4284,
  lng: -123.3656,
  defaultZoom: 13,
}

export const XP_LEVELS = [
  { level: 1, minXp: 0 },
  { level: 2, minXp: 200 },
  { level: 3, minXp: 500 },
  { level: 4, minXp: 1000 },
  { level: 5, minXp: 2000 },
  { level: 6, minXp: 3500 },
  { level: 7, minXp: 5500 },
  { level: 8, minXp: 8000 },
  { level: 9, minXp: 11000 },
  { level: 10, minXp: 15000 },
]

export function getLevelFromXp(xp: number) {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i].minXp) return XP_LEVELS[i].level
  }
  return 1
}

export function getXpToNextLevel(xp: number) {
  const current = getLevelFromXp(xp)
  const next = XP_LEVELS.find((l) => l.level === current + 1)
  return next ? next.minXp - xp : 0
}

export const CATEGORY_COLORS: Record<string, string> = {
  fitness: '#22C55E',
  social: '#A855F7',
  food: '#F97316',
  community: '#3B82F6',
  nature: '#06B6D4',
}

export const CATEGORY_ICONS: Record<string, string> = {
  fitness: '🏃',
  social: '🤝',
  food: '🍽️',
  community: '🏘️',
  nature: '🌿',
}

export const PROOF_GEOFENCE_RADIUS = 300 // metres
