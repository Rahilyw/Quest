/** Victoria-local dates and counts. Explicit time zone avoids server/client hydration drift. */

const victoriaDateTime = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Vancouver',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const victoriaDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Vancouver',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const countFormat = new Intl.NumberFormat('en-CA')

export function formatVictoriaDateTime(value: string | Date): string {
  return victoriaDateTime.format(new Date(value))
}

export function formatVictoriaDate(value: string | Date): string {
  return victoriaDate.format(new Date(value))
}

export function formatCount(value: number): string {
  return countFormat.format(value)
}
