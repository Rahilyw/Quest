export interface RecapWeek {
  /** Monday of the recap week, `YYYY-MM-DD` in America/Vancouver. */
  weekStart: string
  /** The Sunday that closes it. */
  lastDay: string
  /** Exclusive end: the following Monday. */
  nextWeekStart: string
  policy: 'current' | 'previous'
  inProgress: boolean
}

export interface RecapPhoto {
  url: string
  questTitle: string
  category: string | null
}

export interface WeekRecap {
  weekStart: string
  inProgress: boolean
  weeklyXp: number
  questsCompleted: number
  /** Null when the player has no XP on the board that week. */
  rank: number | null
  rankedPlayers: number | null
  /** Null when the streak for that week cannot be derived. */
  streakWeeks: number | null
  /** The player's own place photo. Never a selfie. */
  photo: RecapPhoto | null
}

export type RecapKind = 'empty' | 'no_photo' | 'ready'
export type ShareOutcome = 'shared' | 'dismissed' | 'unknown'

export function recapWeekFor(parts: { year: number; month: number; day: number; weekday: string }): RecapWeek
export function weekRangeLabel(weekStart: string): string
export function addDays(iso: string, days: number): string | null
export function normalizeRecap(raw: unknown, expectedWeekStart?: string | null): WeekRecap | null
export function recapKind(recap: WeekRecap | null, photoUsable?: boolean): RecapKind
export function shareOutcome(result: unknown): ShareOutcome
export function shouldTrackShare(outcome: ShareOutcome): boolean
export const RECAP_SHARE_EVENT: Readonly<{ surface: 'recap' }>
