/**
 * Own-profile grid cell for a verified completion.
 * Shows the place photo with the player's private selfie in the corner when
 * one exists. Only mounted on the owner's profile (card E4); other players
 * keep the plain place-photo cell and never request a signed selfie URL.
 */

import { Image, Pressable, StyleSheet, View } from 'react-native'
import { Pillow } from '@/components/Pillow'
import { ownSelfiePath } from '@/lib/ownSelfiePath'
import { useSignedSelfie } from '@/lib/selfieUrl'
import { sizedImageUrl } from '@/lib/sizedImageUrl'
import { COLOR, SPACE } from '@/lib/theme'

export interface OwnProfileCompletionRowProps {
  photoUrl: string
  /** Storage path; signed only because this row is owner-only. */
  selfieUrl?: string | null
  size: number
  onPress: () => void
}

export function OwnProfileCompletionRow({
  photoUrl,
  selfieUrl,
  size,
  onPress,
}: OwnProfileCompletionRowProps) {
  // This component is only rendered for the owner; still gate so a misuse never signs.
  const selfie = useSignedSelfie(ownSelfiePath(true, selfieUrl))
  const selfieSide = Math.max(26, Math.round(size * 0.36))

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="View your quest completion"
      style={{ width: size, height: size }}
    >
      <View style={[styles.cell, { width: size, height: size }]}>
        <Image
          source={{ uri: sizedImageUrl(photoUrl, { width: 400, height: 400 }) }}
          style={{ width: size, height: size, backgroundColor: COLOR.paperDeep }}
          accessibilityLabel="Your proof photo"
        />
        {selfie ? (
          <View style={styles.selfie} pointerEvents="none">
            <Pillow
              uri={selfie}
              width={selfieSide}
              height={Math.round(selfieSide * (70 / 62))}
              edge="white"
              accessibilityLabel="Your selfie"
            />
          </View>
        ) : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  cell: {
    overflow: 'hidden',
    position: 'relative',
  },
  selfie: {
    position: 'absolute',
    top: SPACE.s1,
    left: SPACE.s1,
  },
})
