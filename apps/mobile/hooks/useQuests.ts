import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
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

export function useQuest(id: string) {
  const [quest, setQuest] = useState<Quest | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('quests')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setQuest(data)
        setLoading(false)
      })
  }, [id])

  return { quest, loading }
}
