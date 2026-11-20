import { Alert, Pressable, StyleSheet, View } from 'react-native'
import { BodyStrong, Heading, Name, Small } from '@/components/ui/Text'
import { useSubmissionQueue } from '@/hooks/useSubmissionQueue'
import { COLOR, RADIUS, SPACE } from '@/lib/theme'

function takenAt(capturedAt: string): string {
  const date = new Date(capturedAt)
  if (Number.isNaN(date.getTime())) return 'Taken earlier'
  const now = new Date()
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (date.toDateString() === now.toDateString()) return `Taken ${time}`
  const day = date.toLocaleDateString(undefined, { weekday: 'long' })
  return `Taken ${day}, ${time}`
}

/**
 * Proofs captured without signal, waiting to be sent (plan Phase 3). Nothing
 * here is verified yet: it counts once the server accepts it.
 */
export function WaitingToSend() {
  const { items, sending, sendNow, discard } = useSubmissionQueue()
  if (items.length === 0) return null

  function confirmDiscard(id: string, title: string) {
    Alert.alert('Discard this proof?', `Your photo for ${title} will be deleted from this phone.`, [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => void discard(id) },
    ])
  }

  return (
    <View style={styles.section}>
      <Heading>Waiting to send</Heading>
      <Small tone="soft">These send when you’re back online. They count once they arrive.</Small>
      {items.map((item) => (
        <View key={item.id} style={styles.card}>
          <Name>{item.questTitle || 'Your quest'}</Name>
          <Small tone="soft" tabular>
            {takenAt(item.attempt.capturedAt)}
          </Small>
          <View style={styles.actions}>
            <Pressable
              onPress={() => sendNow(item.id)}
              disabled={sending}
              accessibilityRole="button"
              accessibilityLabel={`Send your proof for ${item.questTitle} now`}
              accessibilityState={{ disabled: sending, busy: sending }}
              style={[styles.primary, sending && styles.disabled]}
            >
              <BodyStrong color={COLOR.white}>{sending ? 'Sending…' : 'Send now'}</BodyStrong>
            </Pressable>
            <Pressable
              onPress={() => confirmDiscard(item.id, item.questTitle)}
              accessibilityRole="button"
              accessibilityLabel={`Discard your proof for ${item.questTitle}`}
              style={styles.secondary}
            >
              <BodyStrong>Discard</BodyStrong>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: SPACE.s4, gap: SPACE.s3, marginBottom: SPACE.s6 },
  card: {
    borderRadius: RADIUS.card,
    backgroundColor: COLOR.paperDeep,
    padding: SPACE.s4,
    gap: SPACE.s1,
  },
  actions: { flexDirection: 'row', gap: SPACE.s2, marginTop: SPACE.s2 },
  primary: {
    minHeight: 48,
    paddingHorizontal: SPACE.s4,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    minHeight: 48,
    paddingHorizontal: SPACE.s4,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.secondaryFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { backgroundColor: COLOR.disabledFill },
})
