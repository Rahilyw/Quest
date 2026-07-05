import { useState } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { COLORS, SPACING, RADIUS } from '@/lib/constants'
import { REPORT_REASONS, type ReportReason } from '@/lib/moderation'

interface Props {
  visible: boolean
  questTitle: string
  onClose: () => void
  onSubmit: (reason: ReportReason, details: string) => Promise<void>
}

export function ReportPostSheet({ visible, questTitle, onClose, onSubmit }: Props) {
  const [step, setStep] = useState<'reason' | 'details'>('reason')
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null)
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleClose() {
    setStep('reason')
    setSelectedReason(null)
    setDetails('')
    onClose()
  }

  function pickReason(reason: ReportReason) {
    setSelectedReason(reason)
    if (reason === 'other' || reason === 'inappropriate') {
      setStep('details')
    } else {
      void confirmSubmit(reason, '')
    }
  }

  async function confirmSubmit(reason: ReportReason, detailText: string) {
    setSubmitting(true)
    try {
      await onSubmit(reason, detailText.trim())
      handleClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Report post</Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {questTitle}
          </Text>

          {submitting ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 32 }} />
          ) : step === 'reason' ? (
            <ScrollView style={styles.list}>
              {REPORT_REASONS.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={styles.reasonRow}
                  onPress={() => pickReason(item.value)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.reasonText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.detailsBlock}>
              <Text style={styles.detailsLabel}>Anything else we should know? (optional)</Text>
              <TextInput
                style={styles.detailsInput}
                value={details}
                onChangeText={setDetails}
                placeholder="Keep it brief — 500 chars max"
                placeholderTextColor={COLORS.textMuted}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={() => selectedReason && confirmSubmit(selectedReason, details)}
                activeOpacity={0.85}
              >
                <Text style={styles.submitText}>Submit report</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStep('reason')} style={styles.backLink}>
                <Text style={styles.backLinkText}>← Back</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity onPress={handleClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.45)' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { color: COLORS.textMuted, fontSize: 13, marginTop: 4, marginBottom: SPACING.lg },
  list: { maxHeight: 320 },
  reasonRow: {
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  reasonText: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '600' },
  detailsBlock: { marginBottom: SPACING.md },
  detailsLabel: { color: COLORS.textMuted, fontSize: 13, marginBottom: SPACING.sm },
  detailsInput: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    minHeight: 88,
    color: COLORS.textPrimary,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  submitText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  backLink: { alignItems: 'center', marginTop: SPACING.md },
  backLinkText: { color: COLORS.primary, fontWeight: '600' },
  cancelBtn: { alignItems: 'center', paddingTop: SPACING.lg },
  cancelText: { color: COLORS.textMuted, fontWeight: '600' },
})
