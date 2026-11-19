'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { theme } from '@/lib/theme'
import { endXpEvent } from './actions'

export function EndXpEvent({ id, upcoming }: { id: string; upcoming: boolean }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onEnd() {
    const prompt = upcoming
      ? 'Cancel this event? It has not started, so it will be deleted.'
      : 'End this event now? Completions from this moment on get normal XP.'
    if (!confirm(prompt)) return
    setPending(true)
    setError(null)
    const result = await endXpEvent(id)
    setPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
      <button type="button" className="admin-btn admin-btn-ghost" disabled={pending} onClick={onEnd}>
        {pending ? 'Ending…' : upcoming ? 'Cancel' : 'End now'}
      </button>
      {error ? <p style={{ margin: 0, color: theme.danger, fontSize: 13 }}>{error}</p> : null}
    </div>
  )
}
