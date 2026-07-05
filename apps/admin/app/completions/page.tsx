'use client'

import { useEffect, useState } from 'react'
import { getRecentCompletions, removeCompletion, type Completion } from './actions'
import { theme } from '@/lib/theme'

export default function CompletionsLog() {
  const [completions, setCompletions] = useState<Completion[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<Set<string>>(new Set())

  useEffect(() => {
    getRecentCompletions().then((data) => {
      setCompletions(data)
      setLoading(false)
    })
  }, [])

  async function handleRemove(id: string) {
    if (!confirm('Remove this completion? XP will be revoked and the post will leave the feed.')) {
      return
    }

    setProcessing((prev) => new Set(prev).add(id))
    try {
      await removeCompletion(id)
      setCompletions((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: 'removed' } : c))
      )
    } catch (err) {
      console.error('[handleRemove] failed for completion', id, err)
      alert(err instanceof Error ? err.message : 'Failed to remove completion')
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  if (loading) return <p style={{ color: theme.textMuted }}>Loading…</p>

  return (
    <div>
      <h1 className="admin-page-title">Completions Log</h1>
      <p className="admin-page-sub">
        {completions.length} recent · instant verification — spot-check and remove if needed
      </p>

      {completions.length === 0 && (
        <div className="admin-card" style={{ color: theme.textMuted, textAlign: 'center', padding: 40 }}>
          No completions yet.
        </div>
      )}

      <div style={{ display: 'grid', gap: 16 }}>
        {completions.map((c) => {
          const isRemoved = c.status === 'removed'
          const isProcessing = processing.has(c.id)

          return (
            <div
              key={c.id}
              className="admin-card"
              style={{
                display: 'flex',
                gap: 20,
                alignItems: 'flex-start',
                opacity: isRemoved ? 0.55 : 1,
              }}
            >
              <a href={c.photo_url} target="_blank" rel="noreferrer">
                <img
                  src={c.photo_url}
                  alt="proof"
                  style={{
                    width: 120,
                    height: 120,
                    objectFit: 'cover',
                    borderRadius: 12,
                    border: `1px solid ${theme.border}`,
                  }}
                />
              </a>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>
                  {c.quests?.title ?? 'Unknown quest'}
                </div>
                <div style={{ color: theme.textMuted, marginBottom: 4 }}>by @{c.profiles?.username}</div>
                <div style={{ color: theme.textDim, fontSize: 13, marginBottom: 4 }}>
                  {new Date(c.completed_at).toLocaleString()} ·{' '}
                  <span style={{ color: theme.primary, fontWeight: 700 }}>{c.quests?.xp_reward} XP</span>
                  {isRemoved && (
                    <span style={{ color: theme.danger, fontWeight: 700, marginLeft: 8 }}>REMOVED</span>
                  )}
                </div>
                <div style={{ color: theme.textDim, fontSize: 12 }}>
                  GPS: {c.lat.toFixed(5)}, {c.lng.toFixed(5)}
                  {c.quests?.geofence_type ? ` · ${c.quests.geofence_type} geofence` : ''}
                </div>
                {c.redemption_code && !isRemoved && (
                  <div style={{ color: theme.highlight, fontSize: 12, marginTop: 6, fontWeight: 600 }}>
                    Code: {c.redemption_code}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {isRemoved ? (
                  <div style={{ color: theme.textMuted, fontSize: 13, padding: '6px 12px' }}>
                    XP revoked
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleRemove(c.id)}
                    className="admin-btn"
                    style={{ background: theme.danger, color: '#fff', opacity: isProcessing ? 0.5 : 1 }}
                    disabled={isProcessing}
                  >
                    {isProcessing ? '…' : 'Remove'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
