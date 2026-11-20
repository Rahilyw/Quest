import { useEffect, useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Body, BodyStrong, Heading, Small } from '@/components/ui/Text'
import { track } from '@/lib/analytics'
import {
  FEEDBACK_MAX_LENGTH,
  clampFeedbackMessage,
  feedbackResultCopy,
} from '@/lib/feedback'
import { isFeedbackAvailable, sendFeedback } from '@/lib/sentry'
import { COLOR, RADIUS, SPACE, TYPE } from '@/lib/theme'

interface Props {
  visible: boolean
  onClose: () => void
  /** Sentry event id from ErrorBoundary when reporting a crash. */
  eventId?: string
}

export function FeedbackSheet({ visible, onClose, eventId }: Props) {
  const insets = useSafeAreaInsets()
  const available = isFeedbackAvailable()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) {
      setMessage('')
      setSending(false)
      setStatus(null)
    }
  }, [visible])

  function handleClose() {
    if (sending) return
    onClose()
  }

  function handleChange(text: string) {
    setMessage(clampFeedbackMessage(text))
    if (status) setStatus(null)
  }

  function handleSend() {
    if (sending) return
    const trimmed = message.trim()
    if (!trimmed) return

    setSending(true)
    setStatus(null)
    const result = sendFeedback(trimmed, eventId)
    setSending(false)

    if (result === 'sent') {
      track('feedback_sent')
      setStatus(feedbackResultCopy(result))
      setMessage('')
      return
    }

    setStatus(feedbackResultCopy(result))
  }

  const canSend = available && message.trim().length > 0 && !sending

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={styles.backdrop}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Close feedback"
        />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, SPACE.s4) + SPACE.s3 }]}>
          <View style={styles.handle} />
          <Heading>Send feedback</Heading>

          {!available ? (
            <Body tone="soft">{feedbackResultCopy('unavailable')}</Body>
          ) : (
            <>
              <Small nativeID="feedback-message-label">Your message</Small>
              <TextInput
                style={styles.input}
                value={message}
                onChangeText={handleChange}
                placeholder="What should we know?"
                placeholderTextColor={COLOR.inkFaint}
                multiline
                maxLength={FEEDBACK_MAX_LENGTH}
                editable={!sending}
                accessibilityLabel="Your message"
                accessibilityLabelledBy="feedback-message-label"
                textAlignVertical="top"
              />
              <Small tone="soft" accessibilityLabel={`${message.length} of ${FEEDBACK_MAX_LENGTH} characters`}>
                {message.length} / {FEEDBACK_MAX_LENGTH}
              </Small>
              <Small tone="soft">
                Sends your message, app version and device model. No photos or location.
              </Small>
              <Pressable
                onPress={handleSend}
                disabled={!canSend}
                accessibilityRole="button"
                accessibilityLabel="Send"
                accessibilityState={{ disabled: !canSend, busy: sending }}
                style={({ pressed }) => [
                  styles.send,
                  !canSend && styles.sendDisabled,
                  pressed && canSend && styles.sendPressed,
                ]}
              >
                <BodyStrong color={COLOR.white}>{sending ? 'Sending…' : 'Send'}</BodyStrong>
              </Pressable>
            </>
          )}

          {status ? (
            <Small accessibilityLiveRegion="polite" accessibilityRole="text">
              {status}
            </Small>
          ) : null}

          <Pressable
            onPress={handleClose}
            disabled={sending}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
          >
            <Small tone="soft">Close</Small>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: COLOR.scrim },
  sheet: {
    backgroundColor: COLOR.paper,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    paddingHorizontal: SPACE.s4,
    maxHeight: '85%',
    gap: SPACE.s3,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.paperDeep,
    alignSelf: 'center',
    marginTop: SPACE.s3,
    marginBottom: SPACE.s1,
  },
  input: {
    ...TYPE.body,
    color: COLOR.ink,
    backgroundColor: COLOR.white,
    borderRadius: RADIUS.control,
    padding: SPACE.s3,
    minHeight: 120,
  },
  send: {
    backgroundColor: COLOR.ink,
    borderRadius: RADIUS.pill,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACE.s5,
  },
  sendDisabled: { backgroundColor: COLOR.disabledFill },
  sendPressed: { backgroundColor: COLOR.inkPressed, transform: [{ scale: 0.97 }] },
  close: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePressed: { opacity: 0.6 },
})
