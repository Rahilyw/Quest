import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Avatar } from '@/components/Avatar'
import { ReportPostSheet } from '@/components/ReportPostSheet'
import { COLORS, SPACING, RADIUS } from '@/lib/constants'
import { useComments, type CommentNode } from '@/hooks/useComments'
import { formatTimeAgo } from '@/hooks/useActivityFeed'
import { COMMENT_REPORT_REASONS, type CommentReportReason } from '@/lib/moderation'

interface Props {
  visible: boolean
  completionId: string
  currentUserId?: string
  onClose: () => void
  /** Reports the fresh total so feed cards can sync their comment count. */
  onCountChange?: (count: number) => void
}

export function CommentsSheet({ visible, completionId, currentUserId, onClose, onCountChange }: Props) {
  const router = useRouter()
  const { comments, totalCount, loading, error, posting, addComment, deleteComment, reportComment } = useComments(
    visible ? completionId : undefined,
    currentUserId
  )
  const [draft, setDraft] = useState('')
  const [replyTo, setReplyTo] = useState<CommentNode | null>(null)
  const [reporting, setReporting] = useState<CommentNode | null>(null)

  function close() {
    onCountChange?.(totalCount)
    setDraft('')
    setReplyTo(null)
    onClose()
  }

  function openProfile(userId: string) {
    close()
    router.push(`/user/${userId}`)
  }

  async function submit() {
    const ok = await addComment(draft, replyTo?.id ?? null)
    if (ok) {
      setDraft('')
      setReplyTo(null)
    }
  }

  function confirmDelete(comment: CommentNode) {
    Alert.alert('Delete comment?', 'This removes it for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteComment(comment.id) },
    ])
  }

  async function submitReport(reason: CommentReportReason, details: string) {
    if (!reporting) return
    const message = await reportComment(reporting.id, reason, details)
    if (message) {
      Alert.alert('Report failed', message)
      return
    }
    if (replyTo?.id === reporting.id) setReplyTo(null)
    Alert.alert('Thanks for reporting', "We'll review this comment. You won't see it anymore.")
  }

  function renderComment(comment: CommentNode, isReply: boolean) {
    const isOwn = currentUserId != null && comment.user_id === currentUserId
    return (
      <View key={comment.id} style={[styles.commentRow, isReply && styles.replyRow]}>
        <TouchableOpacity
          onPress={() => openProfile(comment.user_id)}
          accessibilityRole="button"
          accessibilityLabel={`View ${comment.user.username}'s profile`}
        >
          <Avatar username={comment.user.username} uri={comment.user.avatar_url} size={isReply ? 28 : 34} />
        </TouchableOpacity>
        <View style={styles.commentBody}>
          <View style={styles.commentMeta}>
            <TouchableOpacity onPress={() => openProfile(comment.user_id)}>
              <Text style={styles.commentName}>@{comment.user.username}</Text>
            </TouchableOpacity>
            <Text style={styles.commentTime}>{formatTimeAgo(comment.created_at)}</Text>
          </View>
          <Text style={styles.commentText}>{comment.body}</Text>
          {isOwn && comment.hidden ? (
            <Text style={styles.hiddenNote}>Hidden from others while under review</Text>
          ) : null}
          <View style={styles.commentActions}>
            {!isReply && currentUserId ? (
              <TouchableOpacity
                onPress={() => setReplyTo(comment)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.commentActionText}>Reply</Text>
              </TouchableOpacity>
            ) : null}
            {currentUserId && !isOwn ? (
              <TouchableOpacity
                onPress={() => setReporting(comment)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel={`Report comment by ${comment.user.username}`}
              >
                <Text style={styles.commentActionText}>Report</Text>
              </TouchableOpacity>
            ) : null}
            {isOwn ? (
              <TouchableOpacity
                onPress={() => confirmDelete(comment)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.commentDeleteText}>Delete</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    )
  }

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrap}
        pointerEvents="box-none"
      >
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.title}>Comments</Text>

          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={styles.centerFill} />
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : comments.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyTitle}>No comments yet</Text>
              <Text style={styles.emptyBody}>Be the first to hype this quest.</Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              style={styles.list}
              renderItem={({ item }) => (
                <View>
                  {renderComment(item, false)}
                  {item.replies.map((reply) => renderComment(reply, true))}
                </View>
              )}
              keyboardShouldPersistTaps="handled"
            />
          )}

          {currentUserId ? (
            <View style={styles.composerWrap}>
              {replyTo ? (
                <View style={styles.replyBanner}>
                  <Text style={styles.replyBannerText} numberOfLines={1}>
                    Replying to @{replyTo.user.username}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setReplyTo(null)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel reply"
                  >
                    <Ionicons name="close" size={16} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>
              ) : null}
              <View style={styles.composer}>
                <TextInput
                  style={styles.input}
                  placeholder={replyTo ? 'Write a reply…' : 'Add a comment…'}
                  placeholderTextColor={COLORS.textMuted}
                  value={draft}
                  onChangeText={setDraft}
                  maxLength={500}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.sendBtn, (!draft.trim() || posting) && styles.sendBtnDisabled]}
                  onPress={submit}
                  disabled={!draft.trim() || posting}
                  accessibilityRole="button"
                  accessibilityLabel="Post comment"
                >
                  {posting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>

      <ReportPostSheet<CommentReportReason>
        visible={reporting != null}
        title="Report comment"
        questTitle={reporting ? `@${reporting.user.username}: ${reporting.body}` : ''}
        reasons={COMMENT_REPORT_REASONS}
        onClose={() => setReporting(null)}
        onSubmit={submitReport}
      />
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.35)',
  },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    maxHeight: '78%',
    minHeight: '55%',
    paddingBottom: SPACING.xl,
  },
  grabber: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginTop: SPACING.sm,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  centerFill: { marginVertical: SPACING.xxl * 2 },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: SPACING.xxl,
  },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl * 2 },
  emptyEmoji: { fontSize: 32, marginBottom: SPACING.sm },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800' },
  emptyBody: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },
  list: { paddingHorizontal: SPACING.lg },
  commentRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  replyRow: {
    marginLeft: SPACING.xl + SPACING.lg,
  },
  commentBody: { flex: 1, minWidth: 0 },
  commentMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  commentName: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '800' },
  commentTime: { color: COLORS.textMuted, fontSize: 11 },
  commentText: { color: COLORS.textPrimary, fontSize: 14, lineHeight: 20, marginTop: 2 },
  commentActions: { flexDirection: 'row', gap: SPACING.lg, marginTop: 4 },
  commentActionText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700' },
  hiddenNote: { color: COLORS.warning, fontSize: 11, fontWeight: '700', marginTop: 2 },
  commentDeleteText: { color: COLORS.danger, fontSize: 12, fontWeight: '700' },
  composerWrap: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    marginBottom: SPACING.sm,
  },
  replyBannerText: { color: COLORS.accentText, fontSize: 12, fontWeight: '700', flex: 1 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm },
  input: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    color: COLORS.textPrimary,
    fontSize: 14,
    maxHeight: 96,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
})
