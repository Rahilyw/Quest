import { Image, Pressable, StyleSheet, View } from 'react-native'
import { Sticker } from '@/components/Sticker'
import { Micro, Name, Small } from '@/components/ui/Text'
import { COLOR, RADIUS, getCategory, type CategoryKey } from '@/lib/theme'

/**
 * A category folder: deep back panel, colour front, peeking covers and one cutout.
 */
export function Folder({
  category,
  count,
  unplayed,
  photos,
  cutoutUri,
  cutoutTitle,
  rotation = 7,
  onPress,
}: {
  category: CategoryKey
  count: number
  unplayed: number
  photos: string[]
  cutoutUri?: string | null
  cutoutTitle?: string
  rotation?: number
  onPress: () => void
}) {
  const cat = getCategory(category)
  const label =
    unplayed > 0
      ? `${cat.label}, ${count} quests, ${unplayed} still to do`
      : `${cat.label}, ${count} quests`

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
    >
      <View style={[styles.back, { backgroundColor: cat.deep }]}>
        <View style={[styles.tab, { backgroundColor: cat.deep }]} />
        <View style={styles.peeks}>
          {photos.slice(0, 2).map((uri, index) => (
            <Image
              key={`${uri}-${index}`}
              source={{ uri }}
              style={[styles.peek, index > 0 && styles.peekOverlap]}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          ))}
        </View>
      </View>
      <View style={[styles.front, { backgroundColor: cat.color }]}>
        <Name color={cat.onColor} numberOfLines={1}>
          {cat.label}
        </Name>
        <Small color={cat.onColor}>{count}</Small>
        {unplayed > 0 ? (
          <View style={styles.badge}>
            <Micro color={COLOR.white}>{unplayed}</Micro>
          </View>
        ) : null}
      </View>
      <View style={styles.cutout} pointerEvents="none">
        <Sticker uri={cutoutUri} size="folder" tilt={rotation} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  hit: {
    width: '48%',
    height: 168,
    marginBottom: 28,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  back: {
    position: 'absolute',
    top: 28,
    left: 0,
    right: 10,
    bottom: 0,
    borderRadius: RADIUS.folder,
  },
  tab: {
    position: 'absolute',
    top: -12,
    left: 14,
    width: 36,
    height: 16,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  peeks: {
    position: 'absolute',
    top: -18,
    left: 8,
    flexDirection: 'row',
  },
  peek: {
    width: 36,
    height: 28,
    borderRadius: 4,
    backgroundColor: COLOR.paperDeep,
  },
  peekOverlap: {
    marginLeft: -10,
  },
  front: {
    position: 'absolute',
    top: 52,
    left: 10,
    right: 0,
    bottom: 8,
    borderRadius: RADIUS.folder,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'flex-end',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 22,
    height: 22,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  cutout: {
    position: 'absolute',
    top: 8,
    right: -4,
  },
})
