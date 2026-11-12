import { haversineMeters } from '@quest/geofence'

const NEARBY_METERS = 500

export interface NearbyQuest {
  id: string
  title: string
  distance_m: number
}

export function nearbyQuests(
  suggestion: { lat: number | null; lng: number | null },
  quests: { id: string; title: string; lat: number; lng: number }[],
): NearbyQuest[] {
  if (suggestion.lat == null || suggestion.lng == null) return []
  return quests
    .map((quest) => ({
      id: quest.id,
      title: quest.title,
      distance_m: haversineMeters(
        { lat: suggestion.lat as number, lng: suggestion.lng as number },
        { lat: quest.lat, lng: quest.lng },
      ),
    }))
    .filter((quest) => quest.distance_m <= NEARBY_METERS)
    .sort((a, b) => a.distance_m - b.distance_m)
}
