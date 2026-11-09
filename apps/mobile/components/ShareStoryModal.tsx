import { useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  useWindowDimensions,
} from 'react-native'
import { captureRef } from 'react-native-view-shot'
import * as Sharing from 'expo-sharing'
import { Ionicons } from '@expo/vector-icons'
import {
  ShareCompletionCard,
  SHARE_CARD_WIDTH,
  SHARE_CARD_HEIGHT,
  type ShareCompletionData,
} from '@/components/ShareCompletionCard'
import { BodyStrong, Small } from '@/components/ui/Text'
import { COLOR, RADIUS, SPACE } from '@/lib/theme'
import { track } from '@/lib/analytics'

interface Props {
  visible: boolean
  data: ShareCompletionData | null
  onClose: () => void
}

/**
 * Preview + capture pipeline: renders the branded story card, snapshots it at
 * 1080×1920 with view-shot, and hands the image to the OS share sheet
 * (Instagram / Facebook / Messages — whatever the device offers).
 */
export function ShareStoryModal({ visible, data, onClose }: Props) {
  const cardRef = useRef<View>(null)
  const [sharing, setSharing] = useState(false)
  const { width, height } = useWindowDimensions()

  const scale = Math.min((width - SPACE.s5 * 2) / SHARE_CARD_WIDTH, (height * 0.62) / SHARE_CARD_HEIGHT)

  async function handleShare() {
    if (!data || sharing) return
    setSharing(true)
    try {
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: 1080,
        height: 1920,
      })

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share your quest',
        })
      } else {
        await Share.share({ url: uri, message: 'Quest complete.' })
      }
      track('share_completed', { surface: 'completion' })
    } catch {
      Alert.alert('Share failed', 'Could not create your share card. Try again.')
    } finally {
      setSharing(false)
    }
  }

  if (!data) return null

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close share preview"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={22} color={COLOR.white} />
        </TouchableOpacity>

        {/* Scaled preview (display only) */}
        <View
          style={{
            width: SHARE_CARD_WIDTH * scale,
            height: SHARE_CARD_HEIGHT * scale,
            borderRadius: RADIUS.card,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: SHARE_CARD_WIDTH,
              height: SHARE_CARD_HEIGHT,
              transform: [
                { translateX: -(SHARE_CARD_WIDTH * (1 - scale)) / 2 },
                { translateY: -(SHARE_CARD_HEIGHT * (1 - scale)) / 2 },
                { scale },
              ],
            }}
          >
            <ShareCompletionCard data={data} />
          </View>
        </View>

        {/* Full-size off-screen copy that view-shot captures */}
        <View style={styles.captureHost} pointerEvents="none">
          <View
            ref={cardRef}
            collapsable={false}
            style={{ width: SHARE_CARD_WIDTH, height: SHARE_CARD_HEIGHT }}
          >
            <ShareCompletionCard data={data} />
          </View>
        </View>

        <TouchableOpacity
          style={styles.shareBtn}
          onPress={handleShare}
          disabled={sharing}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="Share to your story"
        >
          {sharing ? (
            <ActivityIndicator color={COLOR.ink} />
          ) : (
            <>
              <Ionicons name="share-outline" size={19} color={COLOR.ink} />
              <BodyStrong>Share your quest</BodyStrong>
            </>
          )}
        </TouchableOpacity>
        <Small color={COLOR.inkFaint} style={styles.hint}>Opens your share sheet: Instagram, Messages and more.</Small>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLOR.ink,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACE.s5,
  },
  captureHost: {
    position: 'absolute',
    top: 0,
    left: -SHARE_CARD_WIDTH * 4,
  },
  closeBtn: {
    position: 'absolute',
    top: 56,
    right: SPACE.s4,
    width: 48,
    height: 48,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.inkPressed,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s2,
    backgroundColor: COLOR.paper,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.s7,
    marginTop: SPACE.s5,
    minHeight: 52,
  },
  hint: { marginTop: SPACE.s3 },
})
