import { Tabs } from 'expo-router'
import { QuestTabBar } from '@/components/QuestTabBar'
import { TAB_THEMES } from '@/lib/constants'

/**
 * The tab bar is fully custom (see QuestTabBar) — icons, colours and the glass
 * pane all live there. Screens render edge-to-edge behind the floating bar and
 * pad their own content by `insets.bottom + TAB_BAR_CLEARANCE`.
 */
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <QuestTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: TAB_THEMES.index.label }} />
      <Tabs.Screen name="feed" options={{ title: TAB_THEMES.feed.label }} />
      <Tabs.Screen name="leaderboard" options={{ title: TAB_THEMES.leaderboard.label }} />
      <Tabs.Screen name="badges" options={{ title: TAB_THEMES.badges.label }} />
      <Tabs.Screen name="profile" options={{ title: TAB_THEMES.profile.label }} />
      <Tabs.Screen name="map" options={{ href: null }} />
    </Tabs>
  )
}
