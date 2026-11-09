/**
 * Picks the This week sentence and the standing line.
 * Quests have no end date, so the "expiring soon" slot is the next nearest
 * unplayed quest instead.
 */
import { NBSP, plural } from '@/lib/copy'

export type WeekSlot = 'nearest' | 'newest' | 'friend' | 'also'

export interface ThisWeekCandidate {
  id: string
  title: string
  category: string
  action_phrase?: string | null
  cutout_url?: string | null
  lat: number | null
  lng: number | null
  created_at: string
  xp_reward: number
}

export interface PickedQuest {
  quest: ThisWeekCandidate
  phrase: string
  slot: WeekSlot
}

const ONES = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten']

export function greetingName(username: string | null | undefined): string {
  const trimmed = username?.trim()
  if (!trimmed) return 'there'
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

export function phraseFor(quest: { title: string; action_phrase?: string | null }): string {
  const raw = quest.action_phrase?.trim() || quest.title.trim()
  const stripped = raw.replace(/\.+$/, '')
  if (!stripped) return 'try this'
  return stripped.charAt(0).toLowerCase() + stripped.slice(1)
}

function finite(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export function pickThisWeek({
  quests,
  playedIds,
  userLat,
  userLng,
  friendQuestId,
  limit = 4,
}: {
  quests: ThisWeekCandidate[]
  playedIds: Set<string>
  userLat?: number | null
  userLng?: number | null
  friendQuestId?: string | null
  limit?: number
}): { picked: PickedQuest[]; poolSize: number; usedLocation: boolean } {
  const pool = quests.filter((quest) => !playedIds.has(quest.id))
  const usedLocation = finite(userLat) && finite(userLng)

  const distance = (quest: ThisWeekCandidate) => {
    if (!usedLocation || !finite(quest.lat) || !finite(quest.lng)) return Number.POSITIVE_INFINITY
    return haversine(userLat, userLng, quest.lat, quest.lng)
  }

  const picked: PickedQuest[] = []
  const taken = new Set<string>()

  function take(quest: ThisWeekCandidate | undefined, slot: WeekSlot) {
    if (!quest || taken.has(quest.id) || picked.length >= limit) return
    taken.add(quest.id)
    picked.push({ quest, phrase: phraseFor(quest), slot })
  }

  if (usedLocation) {
    const nearest = [...pool].sort((a, b) => distance(a) - distance(b))[0]
    take(nearest, 'nearest')
  }

  const newest = [...pool].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  take(newest, 'newest')

  take(
    pool.find((quest) => quest.id === friendQuestId),
    'friend',
  )

  const rest = pool.filter((quest) => !taken.has(quest.id))
  rest.sort((a, b) =>
    usedLocation ? distance(a) - distance(b) : b.created_at.localeCompare(a.created_at),
  )
  for (const quest of rest) {
    if (picked.length >= limit) break
    take(quest, 'also')
  }

  return { picked, poolSize: pool.length, usedLocation }
}

export function ordinal(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

export function passLine(
  rank: number | null,
  aheadName: string | null,
  gap: number | null,
  questXp: number,
): string | null {
  if (rank === 1 || !aheadName || gap == null || gap <= 0) return null
  const n = Math.ceil((gap + 1) / Math.max(questXp, 1))
  const word = n <= 10 ? ONES[n] : String(n)
  const noun = n === 1 ? 'quest' : 'quests'
  const verb = n === 1 ? 'gets' : 'get'
  return `${word} ${noun} ${verb} you past ${aheadName}.`
}

export function streakLine(weeks: number): string | null {
  if (weeks <= 0) return null
  return `Your streak is ${plural(weeks, 'week')}.`
}

export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000
    const rounded = km >= 10 ? Math.round(km) : Math.round(km * 10) / 10
    return `${rounded}${NBSP}km`
  }
  return `${Math.round(meters)}${NBSP}m`
}

export function questMeta(quest: {
  distance_m?: number | null
  duration_min?: number | null
}): string | null {
  const parts: string[] = []
  if (quest.distance_m != null && quest.distance_m > 0) parts.push(formatDistance(quest.distance_m))
  if (quest.duration_min != null && quest.duration_min > 0) {
    parts.push(`about ${plural(quest.duration_min, 'min', 'min')}`)
  }
  return parts.length ? parts.join(', ') : null
}
