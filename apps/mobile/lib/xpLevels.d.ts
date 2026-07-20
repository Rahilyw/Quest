export const XP_LEVELS: ReadonlyArray<{ level: number; minXp: number }>
export function getLevelFromXp(xp: number): number
export function getXpToNextLevel(xp: number): number
export function getMinXpForLevel(level: number): number
