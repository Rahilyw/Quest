import { VICTORIA_BOUNDARY, DEFAULT_CITY_ID } from '@quest/geofence'

export { VICTORIA_BOUNDARY, DEFAULT_CITY_ID }

/** GeoJSON [lat, lng][] for react-leaflet Polygon (it expects [lat, lng] not [lng, lat]) */
export function boundaryToLeafletCoords(boundary: any): [number, number][] {
  return boundary.coordinates[0].map(([lng, lat]: [number, number]) => [lat, lng])
}
