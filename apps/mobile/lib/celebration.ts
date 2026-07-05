import { getLevelFromXp } from '@/lib/constants'

/** True when crossing an XP level threshold (used by celebration modal + tests). */
export function didLevelUp(previousXp: number, newXp: number): boolean {
  return getLevelFromXp(newXp) > getLevelFromXp(previousXp)
}
