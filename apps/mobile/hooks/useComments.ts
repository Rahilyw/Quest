import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { track } from '@/lib/analytics'
import { reportErrorMessage, type CommentReportReason } from '@/lib/moderation'

export interface CommentUser {
  username: string
  level: number
  avatar_url: string | null
}

export interface CommentNode {
  id: string
  completion_id: string
  user_id: string
  parent_id: string | null
  body: string
  created_at: string
  /** Only ever true on the viewer's own comments (RLS hides it from everyone else). */
  hidden: boolean
  user: CommentUser
  replies: CommentNode[]
}

type Row = {
  id: string
  completion_id: string
  user_id: string
  parent_id: string | null
  body: string
  created_at: string
  hidden: boolean
  profile: CommentUser | null
}

export function useComments(completionId: string | undefined, viewerId: string | undefined) {
  const [comments, setComments] = useState<CommentNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)

  const refetch = useCallback(async () => {
    if (!completionId) return
    setError(null)

    const [{ data, error: fetchError }, { data: reportRows }] = await Promise.all([
      supabase
        .from('completion_comments')
        .select('id, completion_id, user_id, parent_id, body, created_at, hidden, profile:profiles(username, level, avatar_url)')
        .eq('completion_id', completionId)
        .order('created_at', { ascending: true }),
      viewerId
        ? supabase.from('comment_reports').select('comment_id').eq('reporter_id', viewerId)
        : Promise.resolve({ data: [] as { comment_id: string }[] }),
    ])

    if (fetchError) {
      setError('Could not load comments. Pull to retry.')
      setLoading(false)
      return
    }

    // Comments the viewer reported disappear for them immediately, like reported posts.
    const reported = new Set((reportRows ?? []).map((r) => r.comment_id))
    const rows = ((data ?? []) as unknown as Row[]).filter((r) => r.profile && !reported.has(r.id))
    const nodes = new Map<string, CommentNode>()
    const topLevel: CommentNode[] = []

    for (const row of rows) {
      nodes.set(row.id, {
        id: row.id,
        completion_id: row.completion_id,
        user_id: row.user_id,
        parent_id: row.parent_id,
        body: row.body,
        created_at: row.created_at,
        hidden: row.hidden,
        user: row.profile!,
        replies: [],
      })
    }
    for (const node of nodes.values()) {
      if (node.parent_id) {
        nodes.get(node.parent_id)?.replies.push(node)
      } else {
        topLevel.push(node)
      }
    }

    setComments(topLevel)
    setLoading(false)
  }, [completionId, viewerId])

  useEffect(() => {
    setLoading(true)
    refetch()
  }, [refetch])

  const addComment = useCallback(
    async (body: string, parentId: string | null): Promise<boolean> => {
      const trimmed = body.trim()
      if (!viewerId || !completionId || !trimmed) return false

      setPosting(true)
      const { error: insertError } = await supabase.from('completion_comments').insert({
        completion_id: completionId,
        user_id: viewerId,
        parent_id: parentId,
        body: trimmed,
      })
      setPosting(false)

      if (insertError) {
        setError('Could not post your comment. Try again.')
        return false
      }

      track('comment_created', { has_parent: parentId != null })
      await refetch()
      return true
    },
    [viewerId, completionId, refetch]
  )

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!viewerId) return
      const { error: deleteError } = await supabase
        .from('completion_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', viewerId)
      if (!deleteError) {
        track('comment_deleted')
        await refetch()
      }
    },
    [viewerId, refetch]
  )

  /** Returns null on success, or a user-facing error message. */
  const reportComment = useCallback(
    async (commentId: string, reason: CommentReportReason, details: string): Promise<string | null> => {
      if (!viewerId) return 'Sign in to report comments.'

      const { error: reportError } = await supabase.from('comment_reports').insert({
        comment_id: commentId,
        reporter_id: viewerId,
        reason,
        details: details || null,
      })

      // Already-reported still hides it locally; anything else surfaces.
      if (reportError && reportError.code !== '23505') {
        return reportErrorMessage(reportError.code, reportError.hint ?? undefined, 'comment')
      }

      if (!reportError) track('comment_reported', { reason })
      await refetch()
      return null
    },
    [viewerId, refetch]
  )

  const totalCount = comments.reduce((sum, c) => sum + 1 + c.replies.length, 0)

  return { comments, totalCount, loading, error, posting, refetch, addComment, deleteComment, reportComment }
}
