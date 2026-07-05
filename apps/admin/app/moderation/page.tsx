'use client'

import { useEffect, useState } from 'react'
import {
  dismissReports,
  getModerationQueue,
  removeAndAllowRetry,
  removeCompletionModeration,
  type ModerationItem,
} from './actions'
import { theme } from '@/lib/theme'

const REASON_LABELS: Record<string, string> = {
  not_at_location: "Wasn't at location",
  photo_mismatch: "Photo doesn't match",
  inappropriate: 'Inappropriate',
  spam: 'Spam',
  other: 'Other',
}

export default function ModerationPage() {
  const [items, setItems] = useState<ModerationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<Set<string>>(new Set())

  useEffect(() => {
    getModerationQueue().then((data) => {
      setItems(data)
      setLoading(false)
    })
  }, [])

  async function runAction(id: string, action: () => Promise<void>) {
    setProcessing((prev) => new Set(prev).add(id))
    try {
      await action()
      setItems((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Action failed')
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
      <h1 className="admin-page-title">Moderation Queue</h1>
      <p className="admin-page-sub">
        {items.length} flagged · community reports — dismiss or remove
      </p>

      {items.length === 0 && (
        <div className="admin-card" style={{ color: theme.textMuted, textAlign: 'center', padding: 40 }}>
          Nothing flagged right now.
        </div>
      )}

      <div style={{ display: 'grid', gap: 16 }}>
        {items.map((item) => {
          const busy = processing.has(item.id)
          const inside = item.geofenceEvidence?.inside
          const repeatOffender = item.removedCount >= 2

          return (
            <div key={item.id} className="admin-card" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <a href={item.photo_url} target="_blank" rel="noreferrer">
                <img
                  src={item.photo_url}
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
                  {item.quests?.title ?? 'Unknown quest'}
                </div>
                <div style={{ color: theme.textMuted, marginBottom: 4 }}>
                  @{item.profiles?.username} · LV {item.profiles?.level} · joined{' '}
                  {item.profiles?.created_at
                    ? new Date(item.profiles.created_at).toLocaleDateString()
                    : '—'}
                </div>
                <div style={{ color: theme.textDim, fontSize: 13, marginBottom: 6 }}>
                  {item.open_report_count} open report{item.open_report_count === 1 ? '' : 's'}
                  {item.hidden_pending_review ? ' · hidden from feed pending review' : ''}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: inside ? theme.success : theme.warning,
                    marginBottom: 8,
                  }}
                >
                  GPS: {inside ? 'Inside geofence (±12 m)' : 'Outside geofence'} ·{' '}
                  {item.quests?.geofence_type ?? 'unknown'} zone
                </div>
                <div style={{ fontSize: 12, color: theme.textDim, marginBottom: 8 }}>
                  Submitter history: {item.totalCompletions} approved
                  {repeatOffender && (
                    <span style={{ color: theme.danger, fontWeight: 700 }}>
                      {' '}
                      · {item.removedCount} previously removed
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {item.reports.map((r) => (
                    <div key={r.id} style={{ fontSize: 12, color: theme.textMuted }}>
                      <strong>@{r.reporterUsername}</strong> — {REASON_LABELS[r.reason] ?? r.reason}
                      {r.details ? `: ${r.details}` : ''}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 140 }}>
                <button
                  type="button"
                  className="admin-btn"
                  style={{ background: theme.success, color: '#fff', opacity: busy ? 0.5 : 1 }}
                  disabled={busy}
                  onClick={() => runAction(item.id, () => dismissReports(item.id))}
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  className="admin-btn"
                  style={{ background: theme.danger, color: '#fff', opacity: busy ? 0.5 : 1 }}
                  disabled={busy}
                  onClick={() => runAction(item.id, () => removeCompletionModeration(item.id))}
                >
                  Remove
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost"
                  style={{ opacity: busy ? 0.5 : 1 }}
                  disabled={busy}
                  onClick={() => runAction(item.id, () => removeAndAllowRetry(item.id))}
                >
                  Remove + retry
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
