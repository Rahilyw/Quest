'use client'
import { useEffect, useState } from 'react'
import { getPendingCompletions, updateCompletionStatus, type Completion } from './actions'

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

  if (loading) return <p style={{ color: '#64748B' }}>Loading…</p>

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 32 }}>
        Completions Queue ({completions.length} pending)
      </h1>

      {completions.length === 0 && (
        <p style={{ color: '#64748B' }}>All caught up! No pending submissions.</p>
      )}

      <div style={{ display: 'grid', gap: 16 }}>
        {completions.map((c) => (
          <div key={c.id} style={{ background: '#1E293B', borderRadius: 16, padding: 20, display: 'flex', gap: 20 }}>
            <a href={c.photo_url} target="_blank" rel="noreferrer">
              <img src={c.photo_url} alt="proof" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 12 }} />
            </a>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                {c.quests?.title ?? 'Unknown quest'}
              </div>
              <div style={{ color: '#64748B', marginBottom: 4 }}>by @{c.profiles?.username}</div>
              <div style={{ color: '#64748B', fontSize: 13, marginBottom: 4 }}>
                {new Date(c.completed_at).toLocaleString()} · {c.quests?.xp_reward} XP
              </div>
              <div style={{ color: '#64748B', fontSize: 12 }}>
                GPS: {c.lat.toFixed(5)}, {c.lng.toFixed(5)}
              </div>
              {c.quests?.is_sponsored && (
                <div style={{ color: '#F59E0B', fontSize: 12, marginTop: 4 }}>
                  ⭐ Sponsored quest — code will be generated on approval
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => handleUpdateStatus(c.id, 'approved', c.quests?.is_sponsored ?? false)}
                style={{ background: '#22C55E', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 700 }}
              >
                Approve
              </button>
              <button
                onClick={() => handleUpdateStatus(c.id, 'rejected')}
                style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 700 }}
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
