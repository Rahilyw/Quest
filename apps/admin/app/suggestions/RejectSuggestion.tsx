'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { theme } from '@/lib/theme'
import { rejectSuggestion } from './actions'

export function RejectSuggestion({ id }: { id: string }) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onReject() {
    setPending(true)
    setError(null)
    const result = await rejectSuggestion(id, note)
    setPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220 }}>
      <label className="admin-label" htmlFor={`note-${id}`}>
        Note to yourself (optional)
      </label>
      <textarea
        id={`note-${id}`}
        className="admin-textarea"
        rows={2}
        maxLength={500}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Too close to an existing quest"
      />
      {error ? <p style={{ margin: 0, color: theme.danger, fontSize: 13 }}>{error}</p> : null}
      <button type="button" className="admin-btn admin-btn-ghost" disabled={pending} onClick={onReject}>
        {pending ? 'Rejecting…' : 'Reject'}
      </button>
    </div>
  )
}
