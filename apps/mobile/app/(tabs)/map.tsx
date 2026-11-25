import { Fragment, useMemo } from 'react'
import { View, StyleSheet } from 'react-native'
import { VICTORIA_BOUNDARY } from '@quest/geofence'
import MapView, { Marker, Circle, Polygon } from 'react-native-maps'
import { useRouter } from 'expo-router'
import { useReducedMotion } from 'react-native-reanimated'
import { CategoryPin } from '@/components/map/CategoryPin'
import { MapSkeleton } from '@/components/map/MapSkeleton'
import { useQuests } from '@/hooks/useQuests'
import { CITY } from '@/lib/constants'
import { COLOR, getCategory, withAlpha } from '@/lib/theme'
import type { Quest } from '@/lib/types'

// Zones on the big map overlap, so they stay lighter than ZoneMap's 35% fill.
const ZONE_FILL = 0.13
const CITY_FILL = 0.08

function pinLabel(quest: Quest, areaLabel?: string | null): string {
  const cat = getCategory(quest.category)
  const area = areaLabel && areaLabel.length > 0 ? `, ${areaLabel}` : ''
  return `${quest.title}, ${cat.label} quest${area}, ${quest.xp_reward} XP. Open quest.`
}

export default function QuestMap() {
  const router = useRouter()
  const { quests, loading } = useQuests()
  const reduceMotion = useReducedMotion()
  const showSkeleton = loading && quests.length === 0

  const initialRegion = useMemo(
    () => ({
      latitude: CITY.lat,
      longitude: CITY.lng,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }),
    [],
  )

  return (
    <View style={styles.container} accessibilityLabel="Quest map">
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        userInterfaceStyle="light"
        showsUserLocation
        // Paper/ink Cutouts: no dark chrome. Reduce-motion skips map camera easing.
        rotateEnabled={!reduceMotion}
        pitchEnabled={false}
        moveOnMarkerPress={!reduceMotion}
      >
        {quests.map((quest) => {
          const geofenceType = quest.geofence_type ?? 'circle'
          const cat = getCategory(quest.category)
          const fill = withAlpha(cat.color, ZONE_FILL)
          return (
            <Fragment key={quest.id}>
              {geofenceType === 'multi' && (quest.quest_geofences?.length ?? 0) > 0 ? (
                quest.quest_geofences!.map((area) => (
                  <Fragment key={area.id}>
                    {area.lat != null && area.lng != null && (
                      <Marker
                        coordinate={{ latitude: area.lat, longitude: area.lng }}
                        onPress={() => router.push(`/quest/${quest.id}?source=map`)}
                        anchor={{ x: 0.5, y: 0.5 }}
                        tracksViewChanges={false}
                        accessibilityLabel={pinLabel(quest, area.label)}
                      >
                        <CategoryPin
                          category={quest.category}
                          accessibilityLabel={pinLabel(quest, area.label)}
                        />
                      </Marker>
                    )}
                    {area.shape === 'circle' &&
                      area.lat != null &&
                      area.lng != null &&
                      (area.radius_meters ?? 0) > 0 && (
                        <Circle
                          center={{ latitude: area.lat, longitude: area.lng }}
                          radius={area.radius_meters!}
                          fillColor={fill}
                          strokeColor={cat.deep}
                          strokeWidth={1}
                        />
                      )}
                    {area.shape === 'polygon' && area.boundary_geojson?.coordinates?.[0] && (
                      <Polygon
                        coordinates={area.boundary_geojson.coordinates[0].map(([lng, lat]) => ({
                          latitude: lat,
                          longitude: lng,
                        }))}
                        fillColor={fill}
                        strokeColor={cat.deep}
                        strokeWidth={1}
                      />
                    )}
                  </Fragment>
                ))
              ) : (
                <>
                  <Marker
                    coordinate={{ latitude: quest.lat, longitude: quest.lng }}
                    onPress={() => router.push(`/quest/${quest.id}?source=map`)}
                    anchor={{ x: 0.5, y: 0.5 }}
                    tracksViewChanges={false}
                    accessibilityLabel={pinLabel(quest)}
                  >
                    <CategoryPin category={quest.category} accessibilityLabel={pinLabel(quest)} />
                  </Marker>
                  {geofenceType === 'circle' && quest.radius_meters > 0 && (
                    <Circle
                      center={{ latitude: quest.lat, longitude: quest.lng }}
                      radius={quest.radius_meters}
                      fillColor={fill}
                      strokeColor={cat.deep}
                      strokeWidth={1}
                    />
                  )}
                  {geofenceType === 'city' && (
                    <Polygon
                      coordinates={VICTORIA_BOUNDARY.coordinates[0].map(([lng, lat]) => ({
                        latitude: lat,
                        longitude: lng,
                      }))}
                      fillColor={withAlpha(cat.color, CITY_FILL)}
                      strokeColor={cat.deep}
                      strokeWidth={1}
                    />
                  )}
                  {geofenceType === 'polygon' && quest.boundary_geojson?.coordinates?.[0] && (
                    <Polygon
                      coordinates={quest.boundary_geojson.coordinates[0].map(([lng, lat]) => ({
                        latitude: lat,
                        longitude: lng,
                      }))}
                      fillColor={fill}
                      strokeColor={cat.deep}
                      strokeWidth={1}
                    />
                  )}
                </>
              )}
            </Fragment>
          )
        })}
      </MapView>
      {showSkeleton ? <MapSkeleton /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR.paper,
  },
})
