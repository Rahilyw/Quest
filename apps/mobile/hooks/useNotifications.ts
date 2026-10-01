import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { SocialNotificationType } from '@/lib/socialNotifications'

export interface InboxItem {
  id: string
  type: SocialNotificationType
  actor_id: string
  completion_id: string | null
  comment_id: string | null
  read_at: string | null
  created_at: string
  actor: { username: string; avatar_url: string | null }
  completion: { photo_url: string | null } | null
  comment: { body: string } | null
}

type Row = Omit<InboxItem, 'actor'> & { actor: InboxItem['actor'] | null }

const PAGE_SIZE = 50

/** Unread badge count only — cheap enough to run on every tab focus. */
export function useUnreadNotificationCount(userId: string | undefined) {
  const [count, setCount] = useState(0)

  const refetch = useCallback(async () => {
    if (!userId) {
      setCount(0)
      return
    }
    const { count: unread } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .is('read_at', null)
    setCount(unread ?? 0)
  }, [userId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { count, refetch }
}

export function useNotifications(userId: string | undefined) {
  const [items, setItems] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!userId) return
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('notifications')
      .select(
        'id, type, actor_id, completion_id, comment_id, read_at, created_at, ' +
          'actor:profiles!notifications_actor_id_fkey(username, avatar_url), ' +
          'completion:completions(photo_url), ' +
          'comment:completion_comments(body)'
      )
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)

    if (fetchError) {
      setError('Could not load activity. Pull to retry.')
    } else {
      setItems(((data ?? []) as unknown as Row[]).filter((r): r is InboxItem => r.actor != null))
    }
    setLoading(false)
    setRefreshing(false)
  }, [userId])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  const refresh = useCallback(() => {
    setRefreshing(true)
    load()
  }, [load])

  /** Marks everything read server-side; the UI keeps showing unread dots until the next load. */
  const markAllRead = useCallback(async () => {
    if (!userId) return
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_id', userId)
      .is('read_at', null)
  }, [userId])

  return { items, loading, refreshing, error, refresh, markAllRead }
}
