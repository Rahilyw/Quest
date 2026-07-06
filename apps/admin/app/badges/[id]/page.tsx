'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BadgeForm } from '@/components/BadgeForm'
import {
  deleteBadge,
  getBadge,
  getBadgeEarners,
  grantBadge,
  revokeBadge,
  searchUsers,
  updateBadge,
  type BadgeEarner,
  type BadgeWithStats,
} from '../actions'
import { theme } from '@/lib/theme'

export default function EditBadgePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [badge, setBadge] = useState<BadgeWithStats | null>(null)
  const [earners, setEarners] = useState<BadgeEarner[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [grantQuery, setGrantQuery] = useState('')
  const [grantResults, setGrantResults] = useState<{ id: string; username: string }[]>([])
  const [grantBusy, setGrantBusy] = useState(false)
  const [grantMsg, setGrantMsg] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getBadge(params.id), getBadgeEarners(params.id)])
      .then(([b, e]) => {
        setBadge(b)
        setEarners(e)
      })
      .finally(() => setLoading(false))
  }, [params.id])

  useEffect(() => {
    if (grantQuery.length < 2) {
      setGrantResults([])
      return
    }
    const t = setTimeout(() => {
      searchUsers(grantQuery).then(setGrantResults)
    }, 250)
    return () => clearTimeout(t)
  }, [grantQuery])

  async function handleSubmit(formData: FormData) {
    setError(null)
    setSubmitting(true)
    const result = await updateBadge(params.id, formData)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    const refreshed = await getBadge(params.id)
    setBadge(refreshed)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm('Delete this badge? Earned records and quest links will be removed.')) return
    const result = await deleteBadge(params.id)
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.push('/badges')
    router.refresh()
  }

  async function handleGrant(userId: string, username: string) {
    setGrantBusy(true)
    setGrantMsg(null)
    const result = await grantBadge(params.id, userId)
    setGrantBusy(false)
    if (!result.ok) {
      setGrantMsg(result.error)
      return
    }
    setGrantMsg(`Granted to @${username}`)
    setGrantQuery('')
    setGrantResults([])
    const [b, e] = await Promise.all([getBadge(params.id), getBadgeEarners(params.id)])
    setBadge(b)
    setEarners(e)
  }

  async function handleRevoke(userId: string) {
    if (!confirm('Revoke this badge from the player?')) return
    const result = await revokeBadge(params.id, userId)
    if (!result.ok) {
      setGrantMsg(result.error)
      return
    }
    const [b, e] = await Promise.all([getBadge(params.id), getBadgeEarners(params.id)])
    setBadge(b)
    setEarners(e)
  }

  if (loading) {
    return <p style={{ color: theme.textMuted }}>Loading badge…</p>
  }

  if (!badge) {
    return (
      <div>
        <p style={{ color: theme.danger }}>Badge not found.</p>
        <Link href="/badges">← Back to Badges</Link>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <Link href="/badges" style={{ color: theme.textMuted, fontSize: 13, textDecoration: 'none' }}>
            ← Back to Badges
          </Link>
          <h1 className="admin-page-title" style={{ marginTop: 12 }}>{badge.name}</h1>
          <p className="admin-page-sub" style={{ marginBottom: 0 }}>
            {badge.earn_count} earned · {badge.quest_link_count} quest links
          </p>
        </div>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={handleDelete} style={{ color: theme.danger }}>
          Delete badge
        </button>
      </div>

      <BadgeForm
        badge={badge}
        iconUrl={badge.icon_url}
        onSubmit={handleSubmit}
        submitLabel="Save changes"
        error={error}
        submitting={submitting}
      />

      <section className="admin-card" style={{ marginTop: 28 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800 }}>Manual awards</h2>
        <p style={{ margin: '0 0 16px', color: theme.textMuted, fontSize: 13 }}>
          Grant or revoke for support, testing, or badges with a &quot;Manual only&quot; unlock rule.
        </p>

        <div className="admin-field">
          <label>Search player</label>
          <input
            value={grantQuery}
            onChange={(e) => setGrantQuery(e.target.value)}
            placeholder="Type username…"
            disabled={grantBusy}
          />
        </div>

        {grantResults.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            {grantResults.map((u) => (
              <button
                key={u.id}
                type="button"
                className="admin-btn admin-btn-ghost"
                style={{ marginRight: 8, marginBottom: 8 }}
                disabled={grantBusy}
                onClick={() => handleGrant(u.id, u.username)}
              >
                Grant @{u.username}
              </button>
            ))}
          </div>
        )}

        {grantMsg && (
          <p style={{ fontSize: 13, color: theme.success, margin: '0 0 12px' }}>{grantMsg}</p>
        )}

        {earners.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
            <thead>
              <tr style={{ color: theme.textMuted, textAlign: 'left', borderBottom: `1px solid ${theme.border}` }}>
                <th style={{ padding: '8px 0' }}>Player</th>
                <th style={{ padding: '8px 0' }}>Earned</th>
                <th style={{ padding: '8px 0' }} />
              </tr>
            </thead>
            <tbody>
              {earners.map((e) => (
                <tr key={e.user_id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                  <td style={{ padding: '10px 0', fontWeight: 600 }}>@{e.username}</td>
                  <td style={{ padding: '10px 0', color: theme.textMuted, fontSize: 13 }}>
                    {new Date(e.earned_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '10px 0', textAlign: 'right' }}>
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost"
                      style={{ color: theme.danger, fontSize: 12, padding: '6px 12px' }}
                      onClick={() => handleRevoke(e.user_id)}
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: theme.textDim, fontSize: 13, margin: 0 }}>No players have earned this badge yet.</p>
        )}
      </section>
    </div>
  )
}
