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
import { COLORS, SPACING, RADIUS } from '@/lib/constants'
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

  const scale = Math.min((width - SPACING.xl * 2) / SHARE_CARD_WIDTH, (height * 0.62) / SHARE_CARD_HEIGHT)

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
        await Share.share({ url: uri, message: 'Quest complete! 🧭' })
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
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Scaled preview (display only) */}
        <View
          style={{
            width: SHARE_CARD_WIDTH * scale,
            height: SHARE_CARD_HEIGHT * scale,
            borderRadius: RADIUS.xl,
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
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="share-outline" size={19} color="#FFFFFF" />
              <Text style={styles.shareBtnText}>Share your quest</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.hint}>Opens your share sheet: Instagram, Messages and more</Text>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,16,28,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  captureHost: {
    position: 'absolute',
    top: 0,
    left: -SHARE_CARD_WIDTH * 4,
  },
  closeBtn: {
    position: 'absolute',
    top: 56,
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.highlight,
    borderRadius: RADIUS.pill,
    paddingVertical: 14,
    paddingHorizontal: SPACING.xxl + 8,
    marginTop: SPACING.xl,
    minHeight: 48,
    shadowColor: COLORS.highlight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  shareBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  hint: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: SPACING.md },
})
