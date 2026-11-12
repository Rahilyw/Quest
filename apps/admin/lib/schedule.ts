import {
  formatVancouverInput,
  parseVancouverInput,
} from '@quest/geofence'

export interface ScheduleFields {
  active_from: string | null
  active_until: string | null
}

/** Hidden form values are UTC instants. Empty means that side of the window is open. */
export function scheduleFromForm(formData: FormData): ScheduleFields | { error: string } {
  return normalizeSchedule(
    String(formData.get('active_from') ?? ''),
    String(formData.get('active_until') ?? ''),
  )
}

export function normalizeSchedule(fromRaw: string, untilRaw: string): ScheduleFields | { error: string } {
  const from = fromRaw.trim()
  const until = untilRaw.trim()
  const activeFrom = from ? new Date(from) : null
  const activeUntil = until ? new Date(until) : null
  if (from && (!activeFrom || Number.isNaN(activeFrom.getTime()))) {
    return { error: 'Start time isn’t a valid Victoria time.' }
  }
  if (until && (!activeUntil || Number.isNaN(activeUntil.getTime()))) {
    return { error: 'End time isn’t a valid Victoria time.' }
  }
  if (activeFrom && activeUntil && activeUntil.getTime() <= activeFrom.getTime()) {
    return { error: 'The end must be after the start. The quest stays live up to, but not including, the end.' }
  }
  return {
    active_from: activeFrom ? activeFrom.toISOString() : null,
    active_until: activeUntil ? activeUntil.toISOString() : null,
  }
}

export function vancouverInputValue(iso: string | null | undefined): string {
  return formatVancouverInput(iso ?? null)
}

export function vancouverInputToIso(value: string): string {
  return parseVancouverInput(value) ?? ''
}
