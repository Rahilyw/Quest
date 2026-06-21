import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface PendingQuest {
  id: string
  quest_id: string
  title: string
  category: string
  xp_reward: number
  submitted_at: string
  is_sponsored: boolean
}

type CompletionRow = {
  id: string
  quest_id: string
  completed_at: string
  status: 'pending' | 'approved' | 'rejected'
  quest: {
    title: string
    category: string
    xp_reward: number
    is_sponsored: boolean
  } | null
}

export function useUserCompletions(userId: string | undefined) {
  const [pendingQuests, setPendingQuests] = useState<PendingQuest[]>([])
  const [excludedQuestIds, setExcludedQuestIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!userId) {
      setPendingQuests([])
      setExcludedQuestIds(new Set())
      setLoading(false)
      return
    }

    setLoading(true)

    const { data } = await supabase
      .from('completions')
      .select('id, quest_id, completed_at, status, quest:quests(title, category, xp_reward, is_sponsored)')
      .eq('user_id', userId)
      .in('status', ['pending', 'approved'])

    const rows = (data ?? []) as unknown as CompletionRow[]
    const hidden = new Set<string>()
    const pending: PendingQuest[] = []

    for (const row of rows) {
      if (!row.quest) continue
      hidden.add(row.quest_id)
      if (row.status === 'pending') {
        pending.push({
          id: row.id,
          quest_id: row.quest_id,
          title: row.quest.title,
          category: row.quest.category,
          xp_reward: row.quest.xp_reward,
          submitted_at: row.completed_at,
          is_sponsored: row.quest.is_sponsored ?? false,
        })
      }
    }

    pending.sort(
      (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
    )

    setPendingQuests(pending)
    setExcludedQuestIds(hidden)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { pendingQuests, excludedQuestIds, loading, refetch }
}
