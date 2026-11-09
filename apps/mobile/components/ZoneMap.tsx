/**
 * Small map of a quest's real geofence, shown on the camera screen (BRAND.md §7, "The zone").
 * Outlined dashed in the category's deep colour, filled with the category colour at 35%,
 * with the player's dot. Decorative for screen readers: the zone chip carries the status.
 */
import { useEffect, useMemo, useRef } from 'react'
import { StyleSheet, View } from 'react-native'
import MapView, { Circle, Marker, Polygon, type LatLng } from 'react-native-maps'
import { VICTORIA_BOUNDARY } from '@/lib/victoriaBoundary'
import type { Quest } from '@/lib/types'
import { COLOR, getCategory } from '@/lib/theme'

export interface ZoneShape {
  kind: 'circle' | 'polygon'
  center?: LatLng
  radius?: number
  ring?: LatLng[]
}

/** The shapes to draw for a quest; empty when the quest has no zone (anywhere quests). */
export function zoneShapes(quest: Quest): ZoneShape[] {
  const type = quest.geofence_type ?? 'circle'
  const ring = (coords: number[][] | undefined): LatLng[] | null =>
    coords && coords.length >= 3 ? coords.map(([lng, lat]) => ({ latitude: lat, longitude: lng })) : null

  if (type === 'none') return []
  if (type === 'city') {
    const r = ring(VICTORIA_BOUNDARY.coordinates[0])
    return r ? [{ kind: 'polygon', ring: r }] : []
  }
  if (type === 'polygon') {
    const r = ring(quest.boundary_geojson?.coordinates?.[0])
    return r ? [{ kind: 'polygon', ring: r }] : []
  }
  if (type === 'multi') {
    const shapes: ZoneShape[] = []
    for (const area of quest.quest_geofences ?? []) {
      if (area.shape === 'polygon') {
        const r = ring(area.boundary_geojson?.coordinates?.[0])
        if (r) shapes.push({ kind: 'polygon', ring: r })
      } else if (area.lat != null && area.lng != null && (area.radius_meters ?? 0) > 0) {
        shapes.push({
          kind: 'circle',
          center: { latitude: area.lat, longitude: area.lng },
          radius: area.radius_meters!,
        })
      }
    }
    return shapes
  }
  return quest.radius_meters > 0
    ? [{ kind: 'circle', center: { latitude: quest.lat, longitude: quest.lng }, radius: quest.radius_meters }]
    : []
}

/** Points that must be visible: ring vertices, and the four extremes of each circle. */
export function zonePoints(shapes: ZoneShape[]): LatLng[] {
  const points: LatLng[] = []
  for (const s of shapes) {
    if (s.kind === 'polygon' && s.ring) points.push(...s.ring)
    if (s.kind === 'circle' && s.center && s.radius) {
      const dLat = s.radius / 111_320
      const dLng = s.radius / (111_320 * Math.max(0.2, Math.cos((s.center.latitude * Math.PI) / 180)))
      points.push(
        { latitude: s.center.latitude + dLat, longitude: s.center.longitude },
        { latitude: s.center.latitude - dLat, longitude: s.center.longitude },
        { latitude: s.center.latitude, longitude: s.center.longitude + dLng },
        { latitude: s.center.latitude, longitude: s.center.longitude - dLng },
      )
    }
  }
  return points
}

/** `#RRGGBB` plus an alpha 0..1 as 8-digit hex. */
function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0')
  return `${hex}${a}`
}

export function ZoneMap({
  quest,
  coords,
  size = 112,
}: {
  quest: Quest
  coords: { lat: number; lng: number } | null
  size?: number
}) {
  const mapRef = useRef<MapView>(null)
  const cat = getCategory(quest.category)
  const shapes = useMemo(() => zoneShapes(quest), [quest])
  const player = coords ? { latitude: coords.lat, longitude: coords.lng } : null
  const hasPlayer = !!player

  useEffect(() => {
    const points = zonePoints(shapes)
    if (points.length === 0) return
    const all = player ? [...points, player] : points
    // Wait a frame so the native map has a size before fitting.
    const t = setTimeout(() => {
      mapRef.current?.fitToCoordinates(all, {
        edgePadding: { top: 14, right: 14, bottom: 14, left: 14 },
        animated: false,
      })
    }, 50)
    return () => clearTimeout(t)
    // Refit when the shapes change or the first fix arrives, not on every GPS tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapes, hasPlayer])

  if (shapes.length === 0) return null

  const first = zonePoints(shapes)[0]

  return (
    <View
      style={[styles.frame, { width: size, height: size }]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: first.latitude,
          longitude: first.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        showsCompass={false}
        showsPointsOfInterest={false}
        liteMode
      >
        {shapes.map((s, i) =>
          s.kind === 'circle' && s.center && s.radius ? (
            <Circle
              key={i}
              center={s.center}
              radius={s.radius}
              fillColor={withAlpha(cat.color, 0.35)}
              strokeColor={cat.deep}
              strokeWidth={2}
              lineDashPattern={[8, 6]}
            />
          ) : s.ring ? (
            <Polygon
              key={i}
              coordinates={s.ring}
              fillColor={withAlpha(cat.color, 0.35)}
              strokeColor={cat.deep}
              strokeWidth={2}
              lineDashPattern={[8, 6]}
            />
          ) : null,
        )}
        {player ? (
          <Marker coordinate={player} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
            <View style={styles.dot} />
          </Marker>
        ) : null}
      </MapView>
    </View>
  )
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLOR.white,
    backgroundColor: COLOR.paperDeep,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLOR.ink,
    borderWidth: 2,
    borderColor: COLOR.white,
  },
})

export default ZoneMap
