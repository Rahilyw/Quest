import { currentWeekStart, nextWeekStart, partsInZone, zonedToUtc } from '@quest/geofence'

/** Bounds for a custom multiplier. The DB allows 1–3; below 1.25 is not worth a banner. */
export const CUSTOM_MULTIPLIER_MIN = 1.25
export const CUSTOM_MULTIPLIER_MAX = 3

export type XpEventPreset = 'weekend' | 'quest' | 'custom'

/** completions.xp_reason (043) as shown in the admin. */
export const XP_REASON_LABELS: Record<string, string> = {
  weekend: 'site-wide boost',
  quest: 'quest boost',
  first_finisher: 'first finisher',
  win_back: 'win-back',
  duo: 'duo',
}

/**
 * Saturday 00:00 → Monday 00:00 America/Vancouver of the current Victoria week.
 * Monday to Friday this is the coming weekend; on Saturday or Sunday it is the
 * one in progress (the event starts in the past and is live at once).
 */
export function weekendWindow(now: Date): { start: Date; end: Date } {
  const monday = partsInZone(currentWeekStart(now))
  // zonedToUtc goes through Date.UTC, so day + 5 rolls over months correctly.
  const start = zonedToUtc(monday.year, monday.month, monday.day + 5, 0, 0, 0)
  const end = nextWeekStart(now)
  return { start, end }
}

/** Round to the column's numeric(3,2) and check the custom range. */
export function normalizeMultiplier(value: number): number | null {
  if (!Number.isFinite(value)) return null
  const rounded = Math.round(value * 100) / 100
  if (rounded < CUSTOM_MULTIPLIER_MIN || rounded > CUSTOM_MULTIPLIER_MAX) return null
  return rounded
}

export function formatVictoria(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Vancouver',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function formatMultiplier(m: number | string): string {
  const n = typeof m === 'string' ? Number(m) : m
  return `×${Number.isInteger(n) ? n.toFixed(0) : String(n)}`
}
