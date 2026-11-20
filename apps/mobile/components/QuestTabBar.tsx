import { useCallback } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated'
import type { BottomTabBarProps } from 'expo-router/tabs'
import { Avatar } from '@/components/Avatar'
import { useAuth } from '@/hooks/useAuth'
import { useSubmissionQueue } from '@/hooks/useSubmissionQueue'
import { COLOR, RADIUS, SHADOW, TYPE } from '@/lib/theme'

const PILL_TABS: { name: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { name: 'index', label: 'This week', icon: 'calendar-outline' },
  { name: 'quests', label: 'Quests', icon: 'folder-outline' },
  { name: 'feed', label: 'City', icon: 'chatbubbles-outline' },
  { name: 'leaderboard', label: 'Rankings', icon: 'trophy-outline' },
]

const YOU_ROUTE = 'profile'

/**
 * White pill with four icon buttons, plus an avatar circle for You.
 * The active icon is an ink pill. No blur.
 */
export function QuestTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const { profile } = useAuth()
  const { items: queued } = useSubmissionQueue()
  const focusedName = state.routes[state.index]?.name
  const waiting = queued.length
  const youLabel =
    waiting === 0 ? 'You' : `You, ${waiting} ${waiting === 1 ? 'proof' : 'proofs'} waiting to send`

  const go = useCallback(
    (name: string) => {
      const route = state.routes.find((item) => item.name === name)
      if (!route) return
      const event = emitter.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      })
      if (route.name !== focusedName && !event.defaultPrevented) {
        navigateToTab(route.key)
      }
    },
    [emitter, focusedName, navigateToTab, state.routes],
  )

  return (
    <View style={[styles.dock, { paddingBottom: insets.bottom + 18 }]} pointerEvents="box-none">
      <View style={styles.pill}>
        {PILL_TABS.map((tab) => (
          <TabButton
            key={tab.name}
            label={tab.label}
            icon={tab.icon}
            focused={focusedName === tab.name}
            onPress={() => go(tab.name)}
          />
        ))}
      </View>
      <TabButton
        label={youLabel}
        focused={focusedName === YOU_ROUTE}
        onPress={() => go(YOU_ROUTE)}
        avatar={{
          username: profile?.username ?? 'You',
          uri: profile?.avatar_url,
        }}
        queueCount={waiting}
      />
    </View>
  )
}

function TabButton({
  label,
  icon,
  focused,
  onPress,
  avatar,
  queueCount = 0,
}: {
  label: string
  icon?: keyof typeof Ionicons.glyphMap
  focused: boolean
  onPress: () => void
  avatar?: { username: string; uri?: string | null }
  /** Count on the You badge; label also announces the queue. */
  queueCount?: number
}) {
  const reduceMotion = useReducedMotion()
  const scale = useSharedValue(1)
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        if (!reduceMotion) scale.value = withTiming(0.97, { duration: 120 })
      }}
      onPressOut={() => {
        if (!reduceMotion) scale.value = withTiming(1, { duration: 150 })
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: focused }}
      hitSlop={4}
    >
      <Animated.View style={animated}>
        {avatar ? (
          <View style={[styles.avatarRing, focused && styles.avatarRingOn]}>
            <Avatar username={avatar.username} uri={avatar.uri} size={44} />
            {queueCount > 0 ? (
              <View style={styles.badge} pointerEvents="none" accessibilityElementsHidden>
                <Text style={styles.badgeText} allowFontScaling={false}>
                  {queueCount > 9 ? '9+' : String(queueCount)}
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={[styles.iconBtn, focused && styles.iconBtnOn]}>
            <Ionicons name={icon!} size={22} color={focused ? COLOR.white : COLOR.ink} />
          </View>
        )}
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOR.white,
    borderRadius: RADIUS.pill,
    padding: 4,
    ...SHADOW.float,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnOn: {
    backgroundColor: COLOR.ink,
  },
  avatarRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLOR.white,
    borderWidth: 3,
    borderColor: COLOR.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.float,
  },
  avatarRingOn: {
    borderColor: COLOR.ink,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.ink,
    borderWidth: 2,
    borderColor: COLOR.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...TYPE.micro,
    color: COLOR.white,
    lineHeight: 12,
  },
})
