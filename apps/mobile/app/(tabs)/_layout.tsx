import { Tabs } from 'expo-router'
import { QuestTabBar } from '@/components/QuestTabBar'

/**
 * Four icons in the pill (This week, Quests, City, Rankings) and the avatar
 * for You. Badges stay reachable as a screen, but they are not a tab.
 */
export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <QuestTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'This week' }} />
      <Tabs.Screen name="quests" options={{ title: 'Quests' }} />
      <Tabs.Screen name="feed" options={{ title: 'City' }} />
      <Tabs.Screen name="leaderboard" options={{ title: 'Rankings' }} />
      <Tabs.Screen name="profile" options={{ title: 'You' }} />
      <Tabs.Screen name="badges" options={{ href: null, title: 'Badges' }} />
      <Tabs.Screen name="map" options={{ href: null }} />
    </Tabs>
  )
}
