import { useCallback, useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native'
import { BlurView } from 'expo-blur'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { TabChipArt, TAB_CHIP_SIZE, TAB_CHIP_RADIUS } from '@/components/TabIconArt'
import { COLORS, RADIUS, TAB_BAR_HEIGHT, TAB_THEMES, type TabTheme } from '@/lib/constants'

/**
 * Floating glass tab bar.
 *
 * Every tab keeps an identical 44×44 chip footprint — that's what fixes the old
 * "uneven shapes" problem, where only the active tab grew a 48px circle and
 * jumped 8px upward. Personality comes from colour + motif instead of geometry.
 */

const SPRING = { damping: 16, stiffness: 220, mass: 0.7 }
const TAB_COUNT_FALLBACK = 5

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

function isHidden(options: { tabBarItemStyle?: unknown }): boolean {
  const flat = StyleSheet.flatten(options.tabBarItemStyle as never) as
    | { display?: string }
    | undefined
  return flat?.display === 'none'
}

interface TabItemProps {
  theme: TabTheme
  routeKey: string
  focused: boolean
  onPress: () => void
  onLongPress: () => void
}

function TabItem({ theme, routeKey, focused, onPress, onLongPress }: TabItemProps) {
  const active = useSharedValue(focused ? 1 : 0)
  const press = useSharedValue(0)

  useEffect(() => {
    active.value = withSpring(focused ? 1 : 0, SPRING)
  }, [focused, active])

  const chipStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: active.value * -3 },
      { scale: (1 + active.value * 0.06) * (1 - press.value * 0.1) },
    ],
    shadowOpacity: active.value * 0.45,
  }))

  const fillStyle = useAnimatedStyle(() => ({
    opacity: active.value,
  }))

  const glyphOnStyle = useAnimatedStyle(() => ({ opacity: active.value }))
  const glyphOffStyle = useAnimatedStyle(() => ({ opacity: 1 - active.value }))

  const labelStyle = useAnimatedStyle(() => ({
    opacity: 0.62 + active.value * 0.38,
    transform: [{ translateY: active.value * -1 }],
    color: interpolateColor(active.value, [0, 1], [COLORS.textMuted, theme.to]),
  }))

  return (
    <Pressable
      style={styles.item}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        press.value = withTiming(1, { duration: 90 })
      }}
      onPressOut={() => {
        press.value = withSpring(0, SPRING)
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={theme.label}
      hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
    >
      <Animated.View style={[styles.chip, { shadowColor: theme.glow }, chipStyle]}>
        {/* resting state — a frosted well so inactive tabs still read as glass */}
        <View style={[styles.chipWell, { borderColor: `${theme.glow}2E` }]} />

        <Animated.View style={[StyleSheet.absoluteFill, fillStyle]}>
          <TabChipArt id={routeKey} from={theme.from} to={theme.to} motif={theme.motif} />
        </Animated.View>

        <Animated.View style={[styles.glyph, glyphOffStyle]}>
          <Ionicons name={theme.iconOutline as IoniconsName} size={21} color={theme.to} />
        </Animated.View>
        <Animated.View style={[styles.glyph, glyphOnStyle]}>
          <Ionicons name={theme.icon as IoniconsName} size={21} color="#FFFFFF" />
        </Animated.View>
      </Animated.View>

      <Animated.Text numberOfLines={1} style={[styles.label, labelStyle]}>
        {theme.label}
      </Animated.Text>
    </Pressable>
  )
}

export function QuestTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const [barWidth, setBarWidth] = useState(0)

  const visible = state.routes.filter((route) => !isHidden(descriptors[route.key].options))
  const focusedKey = state.routes[state.index]?.key
  const activeIndex = visible.findIndex((route) => route.key === focusedKey)

  const auraX = useSharedValue(Math.max(activeIndex, 0))
  const auraTint = useSharedValue(Math.max(activeIndex, 0))

  useEffect(() => {
    // A hidden route (the full-screen map) is focused — leave the aura parked.
    if (activeIndex < 0) return
    auraX.value = withSpring(activeIndex, SPRING)
    auraTint.value = withTiming(activeIndex, { duration: 260 })
  }, [activeIndex, auraX, auraTint])

  // `barWidth` is the row's outer width; the items live inside 4px of padding.
  const tabWidth = barWidth > 0 ? (barWidth - 8) / (visible.length || TAB_COUNT_FALLBACK) : 0

  const glowColors = visible.map((route) => TAB_THEMES[route.name]?.glow ?? COLORS.primary)
  const inputRange = visible.map((_, i) => i)

  const auraStyle = useAnimatedStyle(() => ({
    width: tabWidth,
    opacity: tabWidth > 0 && activeIndex >= 0 ? 0.16 : 0,
    transform: [{ translateX: auraX.value * tabWidth }],
    backgroundColor:
      glowColors.length > 1
        ? interpolateColor(auraTint.value, inputRange, glowColors)
        : glowColors[0],
  }))

  const handlePress = useCallback(
    (routeKey: string, routeName: string, focused: boolean) => {
      const event = navigation.emit({
        type: 'tabPress',
        target: routeKey,
        canPreventDefault: true,
      })
      if (!focused && !event.defaultPrevented) {
        navigation.navigate(routeName as never)
      }
    },
    [navigation],
  )

  return (
    <View
      style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 10) }]}
      pointerEvents="box-none"
    >
      <View style={styles.shadowWrap}>
        <View style={styles.clip}>
          {/* Frosted pane */}
          <BlurView
            intensity={Platform.OS === 'ios' ? 42 : 28}
            tint="light"
            style={StyleSheet.absoluteFill}
            {...(Platform.OS === 'android'
              ? { experimentalBlurMethod: 'dimezisBlurView' as const }
              : null)}
          />
          <View style={styles.tintLayer} pointerEvents="none" />
          <View style={styles.sheen} pointerEvents="none" />

          <View
            style={styles.row}
            onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
          >
            {/* Sliding colour aura — picks up the active tab's hue */}
            <Animated.View style={[styles.aura, auraStyle]} pointerEvents="none" />

            {visible.map((route) => {
              const theme = TAB_THEMES[route.name]
              if (!theme) return null
              const focused = route.key === focusedKey

              return (
                <TabItem
                  key={route.key}
                  routeKey={route.key}
                  theme={theme}
                  focused={focused}
                  onPress={() => handlePress(route.key, route.name, focused)}
                  onLongPress={() =>
                    navigation.emit({ type: 'tabLongPress', target: route.key })
                  }
                />
              )
            })}
          </View>
        </View>

        {/* Inner rim highlight — sits above the blur, outside the clip */}
        <View style={styles.rim} pointerEvents="none" />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
  },
  shadowWrap: {
    borderRadius: 30,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 14,
    // Android draws its elevation shadow from the view outline, which needs a
    // background to exist — and it doubles as the frosted base if the
    // experimental blur is unavailable on the device.
    backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.82)' : 'transparent',
  },
  clip: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  // Kept light — the BlurView already frosts. Too much white here and the
  // "glass" turns into a plain opaque bar.
  tintLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  rim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: TAB_BAR_HEIGHT,
    paddingHorizontal: 4,
  },
  aura: {
    position: 'absolute',
    left: 4,
    top: 2,
    bottom: 2,
    borderRadius: RADIUS.xxl,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  chip: {
    width: TAB_CHIP_SIZE,
    height: TAB_CHIP_SIZE,
    borderRadius: TAB_CHIP_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 0,
  },
  chipWell: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: TAB_CHIP_RADIUS,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
  },
  glyph: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
})
