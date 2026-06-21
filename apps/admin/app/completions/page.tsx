'use client'

import { useEffect, useState } from 'react'
import { getPendingCompletions, updateCompletionStatus, type Completion } from './actions'
import { theme } from '@/lib/theme'

export default function CompletionsQueue() {
  const [completions, setCompletions] = useState<Completion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPendingCompletions().then((data) => {
      setCompletions(data)
      setLoading(false)
    })
  }, [])

  async function handleUpdateStatus(id: string, status: 'approved' | 'rejected', isSponsored = false) {
    await updateCompletionStatus(id, status, isSponsored)
    setCompletions((prev) => prev.filter((c) => c.id !== id))
  }

  if (loading) return <p style={{ color: theme.textMuted }}>Loading…</p>

  return (
    <div>
      <h1 className="admin-page-title">Completions Queue</h1>
      <p className="admin-page-sub">{completions.length} pending review</p>

      {completions.length === 0 && (
        <div className="admin-card" style={{ color: theme.textMuted, textAlign: 'center', padding: 40 }}>
          All caught up! No pending submissions.
        </div>
      )}

      <div style={{ display: 'grid', gap: 16 }}>
        {completions.map((c) => (
          <div key={c.id} className="admin-card" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            <a href={c.photo_url} target="_blank" rel="noreferrer">
              <img
                src={c.photo_url}
                alt="proof"
                style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 12, border: `1px solid ${theme.border}` }}
              />
            </a>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{c.quests?.title ?? 'Unknown quest'}</div>
              <div style={{ color: theme.textMuted, marginBottom: 4 }}>by @{c.profiles?.username}</div>
              <div style={{ color: theme.textDim, fontSize: 13, marginBottom: 4 }}>
                {new Date(c.completed_at).toLocaleString()} · <span style={{ color: theme.primary, fontWeight: 700 }}>{c.quests?.xp_reward} XP</span>
              </div>
              <div style={{ color: theme.textDim, fontSize: 12 }}>
                GPS: {c.lat.toFixed(5)}, {c.lng.toFixed(5)}
              </div>
              {c.quests?.is_sponsored && (
                <div style={{ color: theme.highlight, fontSize: 12, marginTop: 6, fontWeight: 600 }}>
                  ⭐ Sponsored — redemption code on approval
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                onClick={() => handleUpdateStatus(c.id, 'approved', c.quests?.is_sponsored ?? false)}
                className="admin-btn"
                style={{ background: theme.success, color: '#fff' }}
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus(c.id, 'rejected')}
                className="admin-btn"
                style={{ background: theme.danger, color: '#fff' }}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
