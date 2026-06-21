import { Fragment } from 'react'
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native'
import MapView, { Marker, Circle } from 'react-native-maps'
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
        {quests.map((quest) => (
          <Fragment key={quest.id}>
            <Marker
              coordinate={{ latitude: quest.lat, longitude: quest.lng }}
              pinColor={CATEGORY_COLORS[quest.category]}
              onPress={() => router.push(`/quest/${quest.id}`)}
              title={quest.title}
              description={`${quest.xp_reward} XP`}
            />
            <Circle
              center={{ latitude: quest.lat, longitude: quest.lng }}
              radius={quest.radius_meters}
              fillColor={`${CATEGORY_COLORS[quest.category]}22`}
              strokeColor={`${CATEGORY_COLORS[quest.category]}66`}
              strokeWidth={1}
            />
          </Fragment>
        ))}
      </MapView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
})
