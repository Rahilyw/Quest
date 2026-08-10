import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { track } from '@/lib/analytics'

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

    const { data, error: fetchError } = await supabase
      .from('completion_comments')
      .select('id, completion_id, user_id, parent_id, body, created_at, profile:profiles(username, level, avatar_url)')
      .eq('completion_id', completionId)
      .order('created_at', { ascending: true })

    if (fetchError) {
      setError('Could not load comments. Pull to retry.')
      setLoading(false)
      return
    }

    const rows = ((data ?? []) as unknown as Row[]).filter((r) => r.profile)
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
  }, [completionId])

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

  const totalCount = comments.reduce((sum, c) => sum + 1 + c.replies.length, 0)

  return { comments, totalCount, loading, error, posting, refetch, addComment, deleteComment }
}
