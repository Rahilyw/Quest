import { useState } from 'react'
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
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
import { Body, Heading, Name, Small } from '@/components/ui/Text'
import { useComments, type CommentNode } from '@/hooks/useComments'
import { formatTimeAgo } from '@/hooks/useActivityFeed'
import { COMMENT_REPORT_REASONS, type CommentReportReason } from '@/lib/moderation'
import { COLOR, RADIUS, SPACE, TYPE } from '@/lib/theme'

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
    currentUserId,
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
    if (!draft.trim()) return
    const failure = await addComment(draft, replyTo?.id ?? null)
    if (failure) {
      Alert.alert('Comment not posted', failure)
      return
    }
    setDraft('')
    setReplyTo(null)
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
        <Pressable
          onPress={() => openProfile(comment.user_id)}
          accessibilityRole="button"
          accessibilityLabel={`View ${comment.user.username}'s profile`}
        >
          <Avatar username={comment.user.username} uri={comment.user.avatar_url} size={isReply ? 28 : 36} />
        </Pressable>
        <View style={styles.commentBody}>
          <View style={styles.commentMeta}>
            <Pressable onPress={() => openProfile(comment.user_id)} accessibilityRole="button">
              <Name numberOfLines={1}>{comment.user.username}</Name>
            </Pressable>
            <Small tone="faint">{formatTimeAgo(comment.created_at)}</Small>
          </View>
          <Body>{comment.body}</Body>
          {isOwn && comment.hidden ? (
            <Small tone="soft">Hidden from others while under review</Small>
          ) : null}
          <View style={styles.commentActions}>
            {!isReply && currentUserId ? (
              <Pressable
                onPress={() => setReplyTo(comment)}
                accessibilityRole="button"
                accessibilityLabel="Reply"
                style={styles.action}
              >
                <Small tone="soft">Reply</Small>
              </Pressable>
            ) : null}
            {currentUserId && !isOwn ? (
              <Pressable
                onPress={() => setReporting(comment)}
                accessibilityRole="button"
                accessibilityLabel={`Report comment by ${comment.user.username}`}
                style={styles.action}
              >
                <Small tone="soft">Report</Small>
              </Pressable>
            ) : null}
            {isOwn ? (
              <Pressable
                onPress={() => confirmDelete(comment)}
                accessibilityRole="button"
                accessibilityLabel="Delete comment"
                style={styles.action}
              >
                <Small>Delete</Small>
              </Pressable>
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
          <Heading style={styles.title}>Comments</Heading>

          {loading ? (
            <View style={styles.centerFill}>
              <View style={styles.skeleton} />
              <View style={styles.skeleton} />
            </View>
          ) : error ? (
            <Body tone="soft" style={styles.centerNote}>{error}</Body>
          ) : comments.length === 0 ? (
            <Body tone="soft" style={styles.centerNote}>No comments yet. Say what you saw.</Body>
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
                  <Small numberOfLines={1} style={styles.replyBannerText}>
                    {`Replying to ${replyTo.user.username}`}
                  </Small>
                  <Pressable
                    onPress={() => setReplyTo(null)}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel reply"
                    style={styles.action}
                  >
                    <Ionicons name="close" size={18} color={COLOR.ink} />
                  </Pressable>
                </View>
              ) : null}
              <View style={styles.composer}>
                <TextInput
                  style={styles.input}
                  placeholder={replyTo ? 'Write a reply…' : 'Add a comment…'}
                  placeholderTextColor={COLOR.inkFaint}
                  value={draft}
                  onChangeText={setDraft}
                  maxLength={500}
                  multiline
                />
                <Pressable
                  style={[styles.sendBtn, (!draft.trim() || posting) && styles.sendBtnDisabled]}
                  onPress={submit}
                  disabled={!draft.trim() || posting}
                  accessibilityRole="button"
                  accessibilityLabel="Post comment"
                >
                  {posting ? (
                    <ActivityIndicator size="small" color={COLOR.white} />
                  ) : (
                    <Ionicons
                      name="arrow-up"
                      size={18}
                      color={!draft.trim() ? COLOR.inkFaint : COLOR.white}
                    />
                  )}
                </Pressable>
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
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: COLOR.scrim },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLOR.paper,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    maxHeight: '78%',
    minHeight: '55%',
    paddingBottom: SPACE.s5,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.paperDeep,
    alignSelf: 'center',
    marginTop: SPACE.s3,
  },
  title: { textAlign: 'center', paddingVertical: SPACE.s3 },
  centerFill: { padding: SPACE.s4, gap: SPACE.s3 },
  skeleton: { height: 64, borderRadius: RADIUS.card, backgroundColor: COLOR.paperDeep },
  centerNote: { textAlign: 'center', marginVertical: SPACE.s7, paddingHorizontal: SPACE.s5 },
  list: { paddingHorizontal: SPACE.s4 },
  commentRow: { flexDirection: 'row', gap: SPACE.s3, paddingVertical: SPACE.s2 },
  replyRow: { marginLeft: SPACE.s7 },
  commentBody: { flex: 1, minWidth: 0, gap: 2 },
  commentMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACE.s2 },
  commentActions: { flexDirection: 'row', gap: SPACE.s2 },
  action: { minHeight: 48, justifyContent: 'center', paddingRight: SPACE.s2 },
  composerWrap: {
    borderTopWidth: 1,
    borderTopColor: COLOR.rule,
    paddingHorizontal: SPACE.s4,
    paddingTop: SPACE.s3,
  },
  replyBanner: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACE.s2 },
  replyBannerText: { flex: 1 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACE.s2 },
  input: {
    flex: 1,
    ...TYPE.body,
    color: COLOR.ink,
    backgroundColor: COLOR.white,
    borderRadius: RADIUS.control,
    paddingHorizontal: SPACE.s3,
    paddingVertical: SPACE.s3,
    maxHeight: 96,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLOR.disabledFill },
})
