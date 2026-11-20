import { useEffect } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated'
import { Body, Small } from '@/components/ui/Text'
import { useSubmissionQueue, type QueueNotice } from '@/hooks/useSubmissionQueue'
import { COLOR, RADIUS, SHADOW, SPACE } from '@/lib/theme'

/** How long a "sent" notice stays up. Failures stay until dismissed. */
const SENT_VISIBLE_MS = 6000

function noticeCopy(notice: QueueNotice): { line: string; action: string | null } {
  if (notice.kind === 'sent') {
    const xp = Number.isFinite(notice.xpAwarded) ? notice.xpAwarded : 0
    return { line: `Sent: ${notice.questTitle}. +${xp} XP`, action: 'See it' }
  }
  if (notice.reason === 'expired') {
    return {
      line: `Your saved proof for ${notice.questTitle} waited three days and was removed. Take it again next time you’re there.`,
      action: null,
    }
  }
  if (notice.reason === 'outside_zone') {
    return {
      line: `That proof for ${notice.questTitle} couldn’t be sent: you weren’t inside the zone when it was taken.`,
      action: null,
    }
  }
  return { line: `That proof for ${notice.questTitle} couldn’t be sent. Take it again next time you’re there.`, action: null }
}

/**
 * One line at the top of the app when a queued proof is sent or dropped. It
 * never replays the celebration: "See it" opens the completion instead.
 */
export function SubmissionQueueBanner() {
  const { notice, dismissNotice } = useSubmissionQueue()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (notice?.kind !== 'sent') return
    const timer = setTimeout(dismissNotice, SENT_VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [notice, dismissNotice])

  if (!notice) return null
  const { line, action } = noticeCopy(notice)

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn.duration(200)}
      exiting={reduceMotion ? undefined : FadeOut.duration(150)}
      style={[styles.wrap, { top: insets.top + SPACE.s2 }]}
      pointerEvents="box-none"
    >
      <View style={styles.card} accessibilityLiveRegion="polite" accessibilityRole="alert">
        <Body style={styles.line}>{line}</Body>
        <View style={styles.actions}>
          {action && notice.kind === 'sent' ? (
            <Pressable
              onPress={() => {
                dismissNotice()
                router.push(`/completion/${notice.completionId}`)
              }}
              accessibilityRole="button"
              accessibilityLabel={`See your proof for ${notice.questTitle}`}
              style={styles.button}
            >
              <Small style={styles.buttonLabel}>{action}</Small>
            </Pressable>
          ) : null}
          <Pressable
            onPress={dismissNotice}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            style={styles.button}
          >
            <Small style={styles.buttonLabel}>OK</Small>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: SPACE.s4,
    right: SPACE.s4,
  },
  card: {
    backgroundColor: COLOR.white,
    borderRadius: RADIUS.card,
    paddingHorizontal: SPACE.s4,
    paddingVertical: SPACE.s3,
    gap: SPACE.s2,
    ...SHADOW.float,
  },
  line: {
    color: COLOR.ink,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACE.s2,
  },
  button: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: SPACE.s3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    color: COLOR.ink,
  },
})
