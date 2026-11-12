import { useState } from 'react'
import {
  Modal,
  View,
  Pressable,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Body, Heading, Small } from '@/components/ui/Text'
import { COLOR, RADIUS, SPACE, TYPE } from '@/lib/theme'
import { REPORT_REASONS, reasonNeedsDetails, type ReasonOption, type ReportReason } from '@/lib/moderation'

interface Props<R extends string> {
  visible: boolean
  /** Context line under the title — the quest title, or the reported comment. */
  questTitle: string
  onClose: () => void
  onSubmit: (reason: R, details: string) => Promise<void>
  title?: string
  reasons?: ReasonOption<R>[]
}

export function ReportPostSheet<R extends string = ReportReason>({
  visible,
  questTitle,
  onClose,
  onSubmit,
  title = 'Report post',
  reasons = REPORT_REASONS as unknown as ReasonOption<R>[],
}: Props<R>) {
  const [step, setStep] = useState<'reason' | 'details'>('reason')
  const [selectedReason, setSelectedReason] = useState<R | null>(null)
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleClose() {
    setStep('reason')
    setSelectedReason(null)
    setDetails('')
    onClose()
  }

  function pickReason(reason: R) {
    setSelectedReason(reason)
    if (reasonNeedsDetails(reason)) {
      setStep('details')
    } else {
      void confirmSubmit(reason, '')
    }
  }

  async function confirmSubmit(reason: R, detailText: string) {
    setSubmitting(true)
    try {
      await onSubmit(reason, detailText.trim())
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={handleClose} accessibilityLabel="Close report" />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Heading>{title}</Heading>
          <Small tone="soft" numberOfLines={2}>{questTitle}</Small>

          {submitting ? (
            <View style={styles.submitting}>
              <ActivityIndicator color={COLOR.ink} />
              <Small tone="soft">Sending the report…</Small>
            </View>
          ) : step === 'reason' ? (
            <ScrollView style={styles.list}>
              {reasons.map((item) => (
                <Pressable
                  key={item.value}
                  style={styles.reasonRow}
                  onPress={() => pickReason(item.value)}
                  accessibilityRole="button"
                >
                  <Body>{item.label}</Body>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.detailsBlock}>
              <Small tone="soft">Anything else we should know?</Small>
              <TextInput
                style={styles.detailsInput}
                value={details}
                onChangeText={setDetails}
                placeholder="Keep it brief"
                placeholderTextColor={COLOR.inkFaint}
                multiline
                maxLength={500}
              />
              <Pressable
                style={styles.submitBtn}
                onPress={() => selectedReason && confirmSubmit(selectedReason, details)}
                accessibilityRole="button"
                accessibilityLabel="Submit report"
              >
                <Small color={COLOR.white}>Submit report</Small>
              </Pressable>
              <Pressable onPress={() => setStep('reason')} style={styles.backLink} accessibilityRole="button">
                <Small>Back</Small>
              </Pressable>
            </View>
          )}

          <Pressable onPress={handleClose} style={styles.cancelBtn} accessibilityRole="button">
            <Small tone="soft">Cancel</Small>
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
    paddingBottom: SPACE.s7,
    maxHeight: '80%',
    gap: SPACE.s2,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.paperDeep,
    alignSelf: 'center',
    marginTop: SPACE.s3,
    marginBottom: SPACE.s2,
  },
  list: { maxHeight: 320 },
  reasonRow: {
    minHeight: 48,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLOR.rule,
  },
  submitting: { alignItems: 'center', gap: SPACE.s3, paddingVertical: SPACE.s6 },
  detailsBlock: { gap: SPACE.s3, marginTop: SPACE.s2 },
  detailsInput: {
    ...TYPE.body,
    color: COLOR.ink,
    backgroundColor: COLOR.white,
    borderRadius: RADIUS.control,
    padding: SPACE.s3,
    minHeight: 88,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: COLOR.ink,
    borderRadius: RADIUS.pill,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACE.s5,
  },
  backLink: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
})
