import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useUserCompletions(userId: string | undefined) {
  const [excludedQuestIds, setExcludedQuestIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!userId) {
      setExcludedQuestIds(new Set())
      setLoading(false)
      return
    }

    setLoading(true)

    const { data } = await supabase
      .from('completions')
      .select('quest_id')
      .eq('user_id', userId)

    const hidden = new Set<string>()
    for (const row of data ?? []) {
      hidden.add(row.quest_id)
    }

    setExcludedQuestIds(hidden)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { excludedQuestIds, loading, refetch }
}
