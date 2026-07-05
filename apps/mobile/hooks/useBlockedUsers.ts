import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useBlockedUsers(userId: string | undefined) {
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!userId) {
      setBlockedIds(new Set())
      setLoading(false)
      return
    }

    setLoading(true)
    const { data } = await supabase
      .from('blocked_users')
      .select('blocked_id')
      .eq('blocker_id', userId)

    setBlockedIds(new Set((data ?? []).map((row) => row.blocked_id)))
    setLoading(false)
  }, [userId])

  useEffect(() => {
    refetch()
  }, [refetch])

  async function blockUser(blockedId: string): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!userId || blockedId === userId) {
      return { ok: false, error: 'Invalid block target.' }
    }

    const { error } = await supabase.from('blocked_users').insert({
      blocker_id: userId,
      blocked_id: blockedId,
    })

    if (error) {
      if (error.code === '23505') {
        await refetch()
        return { ok: true }
      }
      return { ok: false, error: error.message }
    }

    await refetch()
    return { ok: true }
  }

  return { blockedIds, loading, refetch, blockUser }
}
