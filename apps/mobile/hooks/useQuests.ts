import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { paramAsString } from '@/lib/routeParams'
import type { Quest, QuestCategory } from '@/lib/types'

export function useQuests(category?: QuestCategory) {
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchQuests()
  }, [category])

  async function fetchQuests() {
    setLoading(true)
    let query = supabase
      .from('quests')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (category) query = query.eq('category', category)

    const { data, error } = await query
    if (error) setError(error.message)
    else setQuests(data ?? [])
    setLoading(false)
  }

  return { quests, loading, error, refetch: fetchQuests }
}

export function useQuest(id: string | string[] | undefined) {
  const questId = paramAsString(id)
  const [quest, setQuest] = useState<Quest | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!questId) {
      setQuest(null)
      setLoading(false)
      return
    }

    setLoading(true)
    supabase
      .from('quests')
      .select('*')
      .eq('id', questId)
      .single()
      .then(({ data, error }) => {
        setQuest(error ? null : data)
        setLoading(false)
      })
  }, [questId])

  return { quest, loading }
}
