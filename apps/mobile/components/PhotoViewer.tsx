/**
 * Dark full-screen viewer for a quest's public proof photos.
 * Opened from the quest page corner stack and the Photos from here row.
 */

import { useEffect, useRef, useState } from 'react'
import {
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Avatar } from '@/components/Avatar'
import { Pillow, PILLOW_SIZES } from '@/components/Pillow'
import { BodyStrong, Micro, Name, Small } from '@/components/ui/Text'
import { formatTimeAgo } from '@/hooks/useActivityFeed'
import type { QuestPhoto } from '@/hooks/useQuestPhotos'
import { plural } from '@/lib/copy'
import { useSignedSelfie } from '@/lib/selfieUrl'
import { sizedImageUrl } from '@/lib/sizedImageUrl'
import { COLOR, RADIUS, SPACE } from '@/lib/theme'

interface PhotoViewerProps {
  visible: boolean
  photos: QuestPhoto[]
  startIndex: number
  questTitle: string
  onClose: () => void
  onStart: () => void
}

export function PhotoViewer({
  visible,
  photos,
  startIndex,
  questTitle,
  onClose,
  onStart,
}: PhotoViewerProps) {
  const insets = useSafeAreaInsets()
  const [index, setIndex] = useState(startIndex)
  const countRef = useRef(photos.length)
  countRef.current = photos.length

  useEffect(() => {
    if (!visible) return
    const max = Math.max(photos.length - 1, 0)
    setIndex(Math.min(Math.max(startIndex, 0), max))
  }, [visible, startIndex, photos.length])

  useEffect(() => {
    if (!visible) return
    StatusBar.setBarStyle('light-content')
    if (Platform.OS === 'android') StatusBar.setBackgroundColor(COLOR.ink)
    return () => {
      StatusBar.setBarStyle('dark-content')
      if (Platform.OS === 'android') StatusBar.setBackgroundColor(COLOR.paper)
    }
  }, [visible])

  const step = (delta: number) => {
    setIndex((current) => {
      const max = Math.max(countRef.current - 1, 0)
      const base = Math.min(Math.max(current, 0), max)
      const next = base + delta
      if (next < 0 || next > max) return base
      return next
    })
  }

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 18 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx <= -48) step(1)
        else if (gesture.dx >= 48) step(-1)
      },
    }),
  ).current

  const photo = photos[index]
  // Hooks run before the early return. Signed only for viewers storage RLS allows.
  const selfie = useSignedSelfie(visible ? photo?.selfie_url : null)
  if (!visible || !photo) return null

  const previous = photos[index - 1]
  const next = photos[index + 1]
  const placeUri = sizedImageUrl(photo.photo_url, { width: 720, height: 820 })

  return (
    <Modal
      visible
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.screen, { paddingTop: insets.top + 56, paddingBottom: Math.max(insets.bottom, SPACE.s3) }]}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={[styles.close, { top: insets.top + SPACE.s2 }]}
        >
          <Ionicons name="close" size={24} color={COLOR.white} />
        </Pressable>

        <View style={styles.body}>
          <View style={styles.stage}>
            {previous ? (
              <View pointerEvents="none" style={[styles.behind, styles.behindLeft]}>
                <Pillow
                  uri={sizedImageUrl(previous.photo_url, { width: 480, height: 540 })}
                  {...PILLOW_SIZES.viewer}
                  edge="white"
                />
              </View>
            ) : null}
            {next ? (
              <View pointerEvents="none" style={[styles.behind, styles.behindRight]}>
                <Pillow
                  uri={sizedImageUrl(next.photo_url, { width: 480, height: 540 })}
                  {...PILLOW_SIZES.viewer}
                  edge="white"
                />
              </View>
            ) : null}

            <View
              style={styles.front}
              {...pan.panHandlers}
              accessible
              accessibilityLabel={
                selfie
                  ? `${photo.username}'s proof photo, with a selfie`
                  : `${photo.username}'s proof photo`
              }
              accessibilityHint="Swipe sideways for the next photo"
            >
              <Pillow uri={placeUri} {...PILLOW_SIZES.viewer} edge="white" />
              {selfie ? (
                <View style={styles.selfie} pointerEvents="none">
                  <Pillow
                    uri={selfie}
                    {...PILLOW_SIZES.row}
                    edge="white"
                  />
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.meta}>
            <Avatar username={photo.username} uri={photo.avatar_url} size={40} />
            <View style={styles.metaCopy}>
              <Name color={COLOR.white} numberOfLines={1}>
                {photo.username}
              </Name>
              <Small tone="faint">
                {formatTimeAgo(photo.completed_at)}, verified
              </Small>
            </View>
          </View>

          <View
            style={styles.likes}
            accessible
            accessibilityLabel={plural(photo.like_count, 'like')}
          >
            <Ionicons
              name="heart-outline"
              size={22}
              color={COLOR.white}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Small color={COLOR.white} tabular>
              {photo.like_count}
            </Small>
          </View>

          {photos.length > 1 ? (
            <View style={styles.nav}>
              <Pressable
                onPress={() => step(-1)}
                disabled={index === 0}
                accessibilityRole="button"
                accessibilityLabel="Previous photo"
                accessibilityState={{ disabled: index === 0 }}
                style={[styles.navBtn, index === 0 && styles.navDisabled]}
              >
                <Ionicons name="chevron-back" size={22} color={COLOR.white} />
              </Pressable>
              <Micro color={COLOR.white} tabular>
                {index + 1} of {photos.length}
              </Micro>
              <Pressable
                onPress={() => step(1)}
                disabled={index === photos.length - 1}
                accessibilityRole="button"
                accessibilityLabel="Next photo"
                accessibilityState={{ disabled: index === photos.length - 1 }}
                style={[styles.navBtn, index === photos.length - 1 && styles.navDisabled]}
              >
                <Ionicons name="chevron-forward" size={22} color={COLOR.white} />
              </Pressable>
            </View>
          ) : null}
        </View>

        <Pressable
          onPress={onStart}
          accessibilityRole="button"
          accessibilityLabel="Start this quest"
          accessibilityHint={`Takes you to submit proof for ${questTitle}`}
          style={({ pressed }) => [styles.start, pressed && styles.startPressed]}
        >
          <BodyStrong color={COLOR.ink}>Start this quest</BodyStrong>
        </Pressable>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLOR.ink,
    paddingHorizontal: SPACE.s4,
  },
  close: {
    position: 'absolute',
    left: SPACE.s4,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.s4,
  },
  stage: {
    width: PILLOW_SIZES.viewer.width,
    height: PILLOW_SIZES.viewer.height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  behind: {
    position: 'absolute',
    opacity: 0.92,
  },
  behindLeft: {
    transform: [{ translateX: -28 }, { rotate: '-8deg' }],
  },
  behindRight: {
    transform: [{ translateX: 28 }, { rotate: '6deg' }],
  },
  front: {
    width: PILLOW_SIZES.viewer.width,
    height: PILLOW_SIZES.viewer.height,
  },
  selfie: {
    position: 'absolute',
    top: SPACE.s2,
    left: SPACE.s2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s3,
    alignSelf: 'stretch',
    paddingHorizontal: SPACE.s2,
  },
  metaCopy: {
    flex: 1,
    gap: SPACE.s1,
  },
  likes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s2,
    alignSelf: 'flex-start',
    marginLeft: SPACE.s2,
    minHeight: 48,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s4,
  },
  navBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navDisabled: {
    opacity: 0.35,
  },
  start: {
    minHeight: 52,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACE.s5,
    paddingVertical: SPACE.s3,
  },
  startPressed: {
    transform: [{ scale: 0.97 }],
    backgroundColor: COLOR.paper,
  },
})
