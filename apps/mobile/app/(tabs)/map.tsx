import { Fragment } from 'react'
import { View, StyleSheet } from 'react-native'
import { VICTORIA_BOUNDARY } from '@quest/geofence'
import MapView, { Marker, Circle, Polygon } from 'react-native-maps'
import { useRouter } from 'expo-router'
import { useQuests } from '@/hooks/useQuests'
import { CATEGORY_COLORS, CITY, COLORS } from '@/lib/constants'

export default function QuestMap() {
  const router = useRouter()
  const { quests } = useQuests()

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: CITY.lat,
          longitude: CITY.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        userInterfaceStyle="dark"
        showsUserLocation
      >
        {quests.map((quest) => {
          const geofenceType = quest.geofence_type ?? 'circle'
          const color = CATEGORY_COLORS[quest.category]
          return (
            <Fragment key={quest.id}>
              {geofenceType === 'multi' && (quest.quest_geofences?.length ?? 0) > 0 ? (
                quest.quest_geofences!.map((area) => (
                  <Fragment key={area.id}>
                    {area.lat != null && area.lng != null && (
                      <Marker
                        coordinate={{ latitude: area.lat, longitude: area.lng }}
                        pinColor={color}
                        onPress={() => router.push(`/quest/${quest.id}`)}
                        title={quest.title}
                        description={area.label || `${quest.xp_reward} XP`}
                      />
                    )}
                    {area.shape === 'circle' &&
                      area.lat != null &&
                      area.lng != null &&
                      (area.radius_meters ?? 0) > 0 && (
                        <Circle
                          center={{ latitude: area.lat, longitude: area.lng }}
                          radius={area.radius_meters!}
                          fillColor={`${color}22`}
                          strokeColor={`${color}66`}
                          strokeWidth={1}
                        />
                      )}
                    {area.shape === 'polygon' && area.boundary_geojson?.coordinates?.[0] && (
                      <Polygon
                        coordinates={area.boundary_geojson.coordinates[0].map(([lng, lat]) => ({
                          latitude: lat,
                          longitude: lng,
                        }))}
                        fillColor={`${color}22`}
                        strokeColor={`${color}66`}
                        strokeWidth={1}
                      />
                    )}
                  </Fragment>
                ))
              ) : (
                <>
                  <Marker
                    coordinate={{ latitude: quest.lat, longitude: quest.lng }}
                    pinColor={color}
                    onPress={() => router.push(`/quest/${quest.id}`)}
                    title={quest.title}
                    description={`${quest.xp_reward} XP`}
                  />
                  {geofenceType === 'circle' && quest.radius_meters > 0 && (
                    <Circle
                      center={{ latitude: quest.lat, longitude: quest.lng }}
                      radius={quest.radius_meters}
                      fillColor={`${color}22`}
                      strokeColor={`${color}66`}
                      strokeWidth={1}
                    />
                  )}
                  {geofenceType === 'city' && (
                    <Polygon
                      coordinates={VICTORIA_BOUNDARY.coordinates[0].map(([lng, lat]) => ({
                        latitude: lat,
                        longitude: lng,
                      }))}
                      fillColor="rgba(67, 100, 247, 0.08)"
                      strokeColor="rgba(67, 100, 247, 0.35)"
                      strokeWidth={1}
                    />
                  )}
                  {geofenceType === 'polygon' && quest.boundary_geojson?.coordinates?.[0] && (
                    <Polygon
                      coordinates={quest.boundary_geojson.coordinates[0].map(([lng, lat]) => ({
                        latitude: lat,
                        longitude: lng,
                      }))}
                      fillColor={`${color}22`}
                      strokeColor={`${color}66`}
                      strokeWidth={1}
                    />
                  )}
                </>
              )}
            </Fragment>
          )
        })}
      </MapView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
})
