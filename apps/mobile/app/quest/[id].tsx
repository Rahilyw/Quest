import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AppState,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Cutout } from '@/components/Cutout'
import { PhotoViewer } from '@/components/PhotoViewer'
import { Pillow, PILLOW_SIZES } from '@/components/Pillow'
import { Body, BodyStrong, Heading, Micro, Small } from '@/components/ui/Text'
import { useGeofenceCheck } from '@/hooks/useGeofenceCheck'
import { useQuest } from '@/hooks/useQuests'
import { useQuestPhotos, type QuestPhoto } from '@/hooks/useQuestPhotos'
import { track, type QuestSource } from '@/lib/analytics'
import { plural, xpLabel } from '@/lib/copy'
import { BYPASS_GEOFENCE, getQuestCoverImage, TAB_BAR_CLEARANCE } from '@/lib/constants'
import { ensureLocationPermission } from '@/lib/permissions'
import { paramAsString } from '@/lib/routeParams'
import { sizedImageUrl } from '@/lib/sizedImageUrl'
import { questMeta } from '@/lib/thisWeek'
import { COLOR, getCategory, RADIUS, SHADOW, SPACE, SPONSORED } from '@/lib/theme'
import { outsideZoneCopy } from '@/lib/zoneStatus'
import type { Quest } from '@/lib/types'

const PHOTO_LIMIT = 24

type Coords = { lat: number; lng: number; accuracy: number | null }
type Permission = 'checking' | 'granted' | 'denied'

const FAN = [
  { rotate: '-9deg', left: 0, top: 6 },
  { rotate: '6deg', left: 12, top: 0 },
  { rotate: '0deg', left: 18, top: 3 },
] as const

function fanLayers(photos: QuestPhoto[]) {
  const trio = photos.slice(0, 3)
  if (trio.length <= 1) {
    return trio.map((photo) => ({ photo, rotate: '0deg', left: 0, top: 0, z: 1 }))
  }
  const oldestFirst = [...trio].reverse()
  const start = FAN.length - oldestFirst.length
  return oldestFirst.map((photo, i) => ({
    photo,
    rotate: FAN[start + i].rotate,
    left: FAN[start + i].left,
    top: FAN[start + i].top,
    z: i + 1,
  }))
}

export default function QuestDetail() {
  const { id, source } = useLocalSearchParams<{ id: string; source?: string }>()
  const questId = paramAsString(id) ?? null
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()
  const { quest, loading } = useQuest(id)
  const { photos, weeklyCount, loading: photosLoading, refetch } = useQuestPhotos(questId, PHOTO_LIMIT)
  const [coords, setCoords] = useState<Coords | null>(null)
  const [permission, setPermission] = useState<Permission>('checking')
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)

  const { insideGeofence, requiresLocation } = useGeofenceCheck(quest, coords, BYPASS_GEOFENCE)

  const watchRef = useRef<Location.LocationSubscription | null>(null)

  const readLocation = useCallback(async (alive: () => boolean = () => true) => {
    const stopWatch = () => {
      watchRef.current?.remove()
      watchRef.current = null
    }
    const current = await Location.getForegroundPermissionsAsync()
    if (!alive()) return
    let granted = current.granted
    if (!granted && current.status === Location.PermissionStatus.UNDETERMINED) {
      const asked = await Location.requestForegroundPermissionsAsync()
      if (!alive()) return
      granted = asked.granted
    }
    if (!alive()) return
    if (!granted) {
      stopWatch()
      setPermission('denied')
      setCoords(null)
      return
    }
    setPermission('granted')
    const apply = (location: Location.LocationObject) => {
      setCoords({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        accuracy: location.coords.accuracy,
      })
    }
    try {
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      if (!alive()) return
      apply(location)
    } catch {
      if (!alive()) return
      setCoords(null)
      return
    }
    try {
      stopWatch()
      const watch = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 20 },
        (fix) => {
          if (alive()) apply(fix)
        },
      )
      if (!alive()) {
        watch.remove()
        return
      }
      watchRef.current = watch
    } catch {
      // The first fix still stands if the watch cannot start.
    }
  }, [])

  useEffect(() => {
    if (!quest || !requiresLocation) return
    let cancelled = false
    const alive = () => !cancelled
    readLocation(alive)
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') readLocation(alive)
    })
    return () => {
      cancelled = true
      watchRef.current?.remove()
      watchRef.current = null
      sub.remove()
    }
  }, [quest?.id, requiresLocation, readLocation])

  useFocusEffect(
    useCallback(() => {
      if (!questId) return
      refetch()
    }, [questId, refetch]),
  )

  useEffect(() => {
    if (!quest) return
    const questSource: QuestSource =
      source === 'explore' ||
      source === 'this-week' ||
      source === 'quests' ||
      source === 'map' ||
      source === 'feed' ||
      source === 'deep_link'
        ? source
        : 'unknown'
    track('quest_viewed', {
      quest_id: quest.id,
      category: quest.category,
      is_sponsored: quest.is_sponsored,
      source: questSource,
    })
  }, [quest?.id, source])

  const startQuest = useCallback(() => {
    if (!quest) return
    setViewerIndex(null)
    router.push(`/submit/${quest.id}`)
  }, [quest, router])

  const footerPad = Math.max(insets.bottom, SPACE.s3)
  const footerHeight = SPACE.s3 + 52 + footerPad
  const contentBottom = Math.max(footerHeight, insets.bottom + TAB_BAR_CLEARANCE) + SPACE.s4

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top + SPACE.s3 }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.backPlain}
        >
          <Ionicons name="chevron-back" size={22} color={COLOR.ink} />
        </Pressable>
        <Small tone="soft">Finding this quest…</Small>
      </View>
    )
  }

  if (!quest) {
    return (
      <View style={[styles.screen, styles.missing, { paddingTop: insets.top + SPACE.s6 }]}>
        <Heading>Quest not found</Heading>
        <Body tone="soft">This quest may have been removed or is no longer available.</Body>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [styles.missingBtn, pressed && styles.startPressed]}
        >
          <BodyStrong color={COLOR.white}>Go back</BodyStrong>
        </Pressable>
      </View>
    )
  }

  const category = getCategory(quest.category)
  const heroHeight = Math.round(windowHeight * 0.46)
  const coverUri = sizedImageUrl(getQuestCoverImage(quest), { width: 1200, height: 800 })
  const meta = questMeta(quest)
  const facts = meta ? `${meta}, ${xpLabel(quest.xp_reward)}` : xpLabel(quest.xp_reward)
  const description = quest.description?.trim()
  const layers = fanLayers(photos)
  const preview = photos.slice(0, 3)
  const showStack = photos.length > 0

  let zone: 'hidden' | 'checking' | 'inside' | 'outside' | 'denied' = 'hidden'
  let zoneText = ''
  if (requiresLocation) {
    if (permission === 'denied') {
      zone = 'denied'
      zoneText = 'Turn on location to check in'
    } else if (permission === 'checking' || !coords) {
      zone = 'checking'
      zoneText = 'Finding you…'
    } else if (insideGeofence) {
      zone = 'inside'
      zoneText = 'You’re in the zone'
    } else {
      zone = 'outside'
      zoneText = outsideZoneCopy(quest, coords)
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: contentBottom }}
      >
        <View style={[styles.hero, { height: heroHeight }]}>
          <Image
            source={{ uri: coverUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessibilityLabel={quest.cover_image_url ? 'Photo: Quest!' : `${quest.title} place`}
          />

          <View style={[styles.topBar, { top: insets.top + SPACE.s2 }]}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={styles.back}
            >
              <Ionicons name="chevron-back" size={22} color={COLOR.ink} />
            </Pressable>
            <View style={styles.catPill}>
              <Small>{category.label}</Small>
            </View>
          </View>

          {showStack ? (
            <Pressable
              onPress={() => setViewerIndex(0)}
              accessibilityRole="button"
              accessibilityLabel={
                weeklyCount > 0
                  ? `${weeklyCount} this week. Opens photos from here.`
                  : 'Opens photos from here.'
              }
              style={[styles.stack, { top: insets.top + SPACE.s2 + 48 + SPACE.s3 }]}
            >
              <View style={styles.stackStage}>
                {layers.map((layer) => (
                  <Pillow
                    key={layer.photo.id}
                    uri={sizedImageUrl(layer.photo.photo_url, { width: 186, height: 210 })}
                    {...PILLOW_SIZES.row}
                    style={{
                      position: 'absolute',
                      left: layer.left,
                      top: layer.top,
                      zIndex: layer.z,
                      transform: [{ rotate: layer.rotate }],
                      ...SHADOW.stack,
                    }}
                  />
                ))}
              </View>
              {weeklyCount > 0 ? (
                <View style={styles.tag}>
                  <Micro color={COLOR.white} tabular>
                    {weeklyCount} this week
                  </Micro>
                </View>
              ) : null}
            </Pressable>
          ) : null}

          {quest.cover_image_url ? (
            <View style={styles.credit}>
              <Micro color={COLOR.white}>Photo: Quest!</Micro>
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          <View pointerEvents="none" style={styles.cutout}>
            <Cutout
              uri={quest.cutout_url}
              category={quest.category}
              questTitle={quest.title}
              role="breakout"
              style={{ width: 112 }}
            />
          </View>

          <View style={styles.copy}>
          <View style={styles.headingBlock}>
            <Heading>{quest.title}</Heading>
            <Small tone="soft">{facts}</Small>
          </View>

          {description ? <Body tone="soft">{description}</Body> : null}

          {zone !== 'hidden' ? (
            <ZoneLine
              kind={zone}
              text={zoneText}
              onAsk={() => {
                ensureLocationPermission().then((granted) => {
                  if (granted) readLocation()
                })
              }}
            />
          ) : null}

          {quest.is_sponsored ? (
            <View style={styles.sponsored}>
              <Micro color={SPONSORED.onColor}>Sponsored</Micro>
              {quest.sponsor_name ? (
                <BodyStrong color={SPONSORED.onColor}>{quest.sponsor_name}</BodyStrong>
              ) : null}
              {quest.sponsor_reward ? (
                <Small color={SPONSORED.onColor}>{quest.sponsor_reward}</Small>
              ) : null}
            </View>
          ) : null}

          <View style={styles.photos}>
            <BodyStrong>Photos from here</BodyStrong>
            {photosLoading && photos.length === 0 ? (
              <Small tone="soft">Loading photos…</Small>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.photoRow}
              >
                {preview.map((photo, index) => (
                  <Pressable
                    key={photo.id}
                    onPress={() => setViewerIndex(index)}
                    accessibilityRole="button"
                    accessibilityLabel={`${photo.username}, ${plural(photo.like_count, 'like')}`}
                    style={({ pressed }) => [styles.photoCol, pressed && styles.pressed]}
                  >
                    <Pillow
                      uri={sizedImageUrl(photo.photo_url, { width: 186, height: 210 })}
                      {...PILLOW_SIZES.row}
                    />
                    <Small numberOfLines={1} style={styles.photoName}>
                      {photo.username}
                    </Small>
                    <View style={styles.photoLikes}>
                      <Ionicons
                        name="heart-outline"
                        size={12}
                        color={COLOR.inkSoft}
                        accessibilityElementsHidden
                        importantForAccessibility="no"
                      />
                      <Micro tone="soft" tabular>
                        {photo.like_count}
                      </Micro>
                    </View>
                  </Pressable>
                ))}
                <Pressable
                  onPress={startQuest}
                  accessibilityRole="button"
                  accessibilityLabel="You next"
                  accessibilityHint="Start this quest and take the photo"
                  style={({ pressed }) => [styles.photoCol, pressed && styles.pressed]}
                >
                  <View style={styles.youSlot}>
                    <Ionicons
                      name="camera-outline"
                      size={20}
                      color={COLOR.inkSoft}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    />
                  </View>
                  <Micro tone="soft">You next</Micro>
                </Pressable>
              </ScrollView>
            )}
          </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: footerPad }]}>
        <Pressable
          onPress={startQuest}
          accessibilityRole="button"
          accessibilityLabel={`Start quest: ${quest.title}`}
          accessibilityHint="Takes you to the photo submission screen"
          style={({ pressed }) => [styles.start, pressed && styles.startPressed]}
        >
          <BodyStrong color={COLOR.white}>Start quest</BodyStrong>
          <Ionicons
            name="camera-outline"
            size={20}
            color={COLOR.white}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </Pressable>
      </View>

      <PhotoViewer
        visible={viewerIndex != null && photos.length > 0}
        photos={photos}
        startIndex={viewerIndex ?? 0}
        questTitle={quest.title}
        onClose={() => setViewerIndex(null)}
        onStart={startQuest}
      />
    </View>
  )
}

function ZoneLine({
  kind,
  text,
  onAsk,
}: {
  kind: 'checking' | 'inside' | 'outside' | 'denied'
  text: string
  onAsk: () => void
}) {
  const mark = (
    <View
      style={[
        styles.mark,
        kind === 'checking' && styles.markChecking,
        kind === 'denied' && styles.markDenied,
      ]}
    >
      {kind === 'checking' ? <ActivityIndicator size="small" color={COLOR.inkSoft} /> : null}
      {kind === 'inside' ? (
        <Ionicons name="checkmark" size={16} color={COLOR.ink} accessibilityElementsHidden importantForAccessibility="no" />
      ) : null}
      {kind === 'outside' ? (
        <Ionicons name="arrow-forward" size={16} color={COLOR.ink} accessibilityElementsHidden importantForAccessibility="no" />
      ) : null}
      {kind === 'denied' ? <Micro>!</Micro> : null}
    </View>
  )

  if (kind === 'denied') {
    return (
      <Pressable
        onPress={onAsk}
        accessibilityRole="button"
        accessibilityLabel={text}
        style={styles.zone}
      >
        {mark}
        <Small style={styles.zoneText}>{text}</Small>
      </Pressable>
    )
  }

  return (
    <View style={styles.zone} accessibilityRole="text">
      {mark}
      <Small style={styles.zoneText}>{text}</Small>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLOR.paper,
  },
  centered: {
    paddingHorizontal: SPACE.s4,
  },
  missing: {
    paddingHorizontal: SPACE.s5,
    gap: SPACE.s3,
  },
  missingBtn: {
    alignSelf: 'flex-start',
    marginTop: SPACE.s2,
    minHeight: 48,
    paddingHorizontal: SPACE.s5,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPlain: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -SPACE.s3,
    marginBottom: SPACE.s2,
  },
  hero: {
    backgroundColor: COLOR.paperDeep,
    overflow: 'hidden',
  },
  topBar: {
    position: 'absolute',
    left: SPACE.s4,
    right: SPACE.s4,
    zIndex: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.float,
  },
  catPill: {
    backgroundColor: COLOR.white,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.s3,
    paddingVertical: SPACE.s2,
    ...SHADOW.float,
  },
  stack: {
    position: 'absolute',
    left: SPACE.s4,
    zIndex: 3,
  },
  stackStage: {
    width: 96,
    height: 80,
  },
  tag: {
    alignSelf: 'flex-start',
    marginTop: SPACE.s2,
    backgroundColor: COLOR.ink,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.s2,
    paddingVertical: SPACE.s1,
  },
  credit: {
    position: 'absolute',
    left: SPACE.s4,
    bottom: SPACE.s4,
    zIndex: 2,
    backgroundColor: COLOR.scrim,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.s2,
    paddingVertical: SPACE.s1,
  },
  body: {
    paddingHorizontal: SPACE.s4,
  },
  cutout: {
    alignItems: 'flex-end',
    marginTop: -56,
    marginBottom: -56,
    zIndex: 2,
  },
  copy: {
    gap: SPACE.s4,
    paddingTop: SPACE.s3,
  },
  headingBlock: {
    paddingRight: 120,
    gap: SPACE.s2,
  },
  zone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s2,
    minHeight: 48,
  },
  zoneText: {
    flex: 1,
  },
  mark: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markChecking: {
    backgroundColor: COLOR.paperDeep,
  },
  markDenied: {
    borderWidth: 1.5,
    borderColor: COLOR.ink,
  },
  sponsored: {
    backgroundColor: SPONSORED.color,
    borderRadius: RADIUS.card,
    padding: SPACE.s4,
    gap: SPACE.s1,
  },
  photos: {
    gap: SPACE.s3,
  },
  photoRow: {
    gap: SPACE.s3,
    paddingRight: SPACE.s2,
  },
  photoCol: {
    width: 84,
    alignItems: 'center',
    gap: SPACE.s1,
  },
  photoName: {
    alignSelf: 'stretch',
    textAlign: 'center',
  },
  photoLikes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s1,
  },
  youSlot: {
    width: PILLOW_SIZES.row.width,
    height: PILLOW_SIZES.row.height,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLOR.inkFaint,
    borderRadius: RADIUS.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SPACE.s4,
    paddingTop: SPACE.s3,
    backgroundColor: COLOR.paper,
  },
  start: {
    minHeight: 52,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.s2,
    paddingHorizontal: SPACE.s5,
  },
  startPressed: {
    backgroundColor: COLOR.inkPressed,
    transform: [{ scale: 0.97 }],
  },
})
