import { Tabs } from 'expo-router'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0F172A', borderTopColor: '#1E293B' },
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: '#64748B',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Quests', tabBarIcon: () => null }} />
      <Tabs.Screen name="map" options={{ title: 'Map', tabBarIcon: () => null }} />
      <Tabs.Screen name="leaderboard" options={{ title: 'Ranks', tabBarIcon: () => null }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: () => null }} />
    </Tabs>
  )
}
