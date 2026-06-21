'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getQuests, toggleQuestStatus, type Quest } from './actions'
import { theme } from '@/lib/theme'

export default function QuestsPage() {
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getQuests().then((data) => {
      setQuests(data)
      setLoading(false)
    })
  }, [])

  async function handleToggle(id: string, status: string) {
    const next = await toggleQuestStatus(id, status)
    setQuests((prev) => prev.map((q) => (q.id === id ? { ...q, status: next } : q)))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 className="admin-page-title">Quests</h1>
          <p className="admin-page-sub">{quests.length} total · {quests.filter((q) => q.status === 'active').length} active</p>
        </div>
        <Link href="/quests/new" className="admin-btn admin-btn-primary" style={{ textDecoration: 'none' }}>
          + Create Quest
        </Link>
      </div>

      {loading ? (
        <p style={{ color: theme.textMuted }}>Loading quests…</p>
      ) : quests.length === 0 ? (
        <div className="admin-card" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: theme.textMuted, marginBottom: 16 }}>No quests yet. Create your first one!</p>
          <Link href="/quests/new" className="admin-btn admin-btn-primary" style={{ textDecoration: 'none' }}>
            + Create Quest
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {quests.map((q) => {
            const cat = theme.categories[q.category]
            return (
              <div key={q.id} className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div
                  style={{
                    height: 140,
                    background: q.cover_image_url
                      ? `url(${q.cover_image_url}) center/cover`
                      : `linear-gradient(135deg, ${cat?.soft ?? theme.primarySoft}, ${theme.surface})`,
                    position: 'relative',
                  }}
                >
                  {!q.cover_image_url && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>
                      {cat?.icon ?? '📍'}
                    </div>
                  )}
                  <div
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      background: q.status === 'active' ? 'rgba(34,197,94,0.9)' : 'rgba(100,116,139,0.9)',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: 999,
                      textTransform: 'uppercase',
                    }}
                  >
                    {q.status}
                  </div>
                </div>
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: cat?.color ?? theme.primary,
                        background: cat?.soft ?? theme.primarySoft,
                        padding: '3px 8px',
                        borderRadius: 999,
                        textTransform: 'capitalize',
                      }}
                    >
                      {cat?.icon} {q.category}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: theme.primary }}>+{q.xp_reward} XP</span>
                    {q.is_sponsored && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: theme.highlight }}>⭐ Sponsored</span>
                    )}
                  </div>
                  <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, lineHeight: 1.3 }}>{q.title}</h3>
                  <p style={{ margin: 0, color: theme.textMuted, fontSize: 12, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {q.description}
                  </p>
                  {q.quest_badges && q.quest_badges.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
                      {q.quest_badges.slice(0, 4).map((qb) => (
                        <span key={qb.badge_id} title={qb.badge?.name} style={{ fontSize: 16 }}>
                          {qb.badge?.icon ?? '🏅'}
                        </span>
                      ))}
                      {q.quest_badges.length > 4 && (
                        <span style={{ fontSize: 11, color: theme.textDim }}>+{q.quest_badges.length - 4}</span>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => handleToggle(q.id, q.status)}
                    className="admin-btn admin-btn-ghost"
                    style={{ width: '100%', marginTop: 14, fontSize: 12 }}
                  >
                    {q.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
