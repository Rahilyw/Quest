/** Curated Victoria POI shortcuts for multi-area quests (optional; search covers everything else). */

export type PlaceCategory = 'libraries' | 'parks' | 'landmarks'

export interface VictoriaPlace {
  id: string
  name: string
  category: PlaceCategory
  lat: number
  lng: number
  /** Default completion radius when added as a circle spot */
  defaultRadiusMeters?: number
}

export const PLACE_CATEGORIES: { id: PlaceCategory; label: string; searchHint: string }[] = [
  { id: 'libraries', label: 'Libraries', searchHint: 'library' },
  { id: 'parks', label: 'Parks', searchHint: 'park' },
  { id: 'landmarks', label: 'Landmarks', searchHint: '' },
]

/** Small starter set — search/Nominatim is the general path for cafes, pizza, etc. */
export const VICTORIA_PLACES: VictoriaPlace[] = [
  { id: 'gvpl-central', name: 'Greater Victoria Public Library — Central', category: 'libraries', lat: 48.4245, lng: -123.3645, defaultRadiusMeters: 80 },
  { id: 'gvpl-emily-carr', name: 'GVPL — Emily Carr Branch', category: 'libraries', lat: 48.4328, lng: -123.3522, defaultRadiusMeters: 80 },
  { id: 'gvpl-nellie-mcclung', name: 'GVPL — Nellie McClung Branch', category: 'libraries', lat: 48.4136, lng: -123.3728, defaultRadiusMeters: 80 },
  { id: 'uvic-mcl', name: 'UVic McPherson Library', category: 'libraries', lat: 48.4634, lng: -123.3117, defaultRadiusMeters: 100 },
  { id: 'beacon-hill', name: 'Beacon Hill Park', category: 'parks', lat: 48.4126, lng: -123.3636, defaultRadiusMeters: 150 },
  { id: 'mount-doug', name: 'Mount Douglas Park', category: 'parks', lat: 48.4912, lng: -123.3456, defaultRadiusMeters: 150 },
  { id: 'dallas-road', name: 'Dallas Road Waterfront', category: 'parks', lat: 48.4065, lng: -123.3695, defaultRadiusMeters: 120 },
  { id: 'inner-harbour', name: 'Inner Harbour', category: 'landmarks', lat: 48.4222, lng: -123.3697, defaultRadiusMeters: 120 },
  { id: 'legislature', name: 'BC Legislature', category: 'landmarks', lat: 48.4195, lng: -123.3702, defaultRadiusMeters: 100 },
]

export function placesInCategory(category: PlaceCategory): VictoriaPlace[] {
  return VICTORIA_PLACES.filter((p) => p.category === category)
}
