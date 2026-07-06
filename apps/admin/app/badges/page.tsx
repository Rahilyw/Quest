'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getBadgesWithStats, type BadgeWithStats } from './actions'
import { RARITY_OPTIONS } from '@/lib/badge-rules'
import { theme } from '@/lib/theme'

export default function BadgesPage() {
  const [badges, setBadges] = useState<BadgeWithStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getBadgesWithStats()
      .then(setBadges)
      .finally(() => setLoading(false))
  }, [])

  const activeCount = badges.filter((b) => b.is_active).length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 className="admin-page-title">Badges & Achievements</h1>
          <p className="admin-page-sub" style={{ marginBottom: 0 }}>
            {badges.length} badges · {activeCount} active · unlock rules run automatically on XP updates
          </p>
        </div>
        <Link href="/badges/new" className="admin-btn admin-btn-primary" style={{ textDecoration: 'none' }}>
          ＋ New Badge
        </Link>
      </div>

      {loading ? (
        <p style={{ color: theme.textMuted }}>Loading badges…</p>
      ) : (
        <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: theme.textMuted, textAlign: 'left', borderBottom: `1px solid ${theme.border}` }}>
                <th style={{ padding: '12px 16px' }}>Badge</th>
                <th style={{ padding: '12px 16px' }}>Rarity</th>
                <th style={{ padding: '12px 16px' }}>Unlock rule</th>
                <th style={{ padding: '12px 16px' }}>Earned</th>
                <th style={{ padding: '12px 16px' }}>Quests</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {badges.map((b) => {
                const rarity = RARITY_OPTIONS.find((r) => r.value === b.rarity)
                return (
                  <tr key={b.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                    <td style={{ padding: '12px 16px' }}>
                      <Link
                        href={`/badges/${b.id}`}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit' }}
                      >
                        <span
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            background: theme.primarySoft,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 22,
                            flexShrink: 0,
                            overflow: 'hidden',
                          }}
                        >
                          {b.icon_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={b.icon_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            b.icon
                          )}
                        </span>
                        <div>
                          <div style={{ fontWeight: 700 }}>
                            {b.name}
                            {b.is_secret && (
                              <span style={{ marginLeft: 8, fontSize: 11, color: theme.warning }}>SECRET</span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>{b.unlock_condition}</div>
                        </div>
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ color: rarity?.color, fontWeight: 700, fontSize: 12 }}>{b.rarity.toUpperCase()}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: theme.textMuted }}>
                      {b.unlock_rule_type.replace(/_/g, ' ')}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{b.earn_count}</td>
                    <td style={{ padding: '12px 16px', color: theme.textMuted }}>{b.quest_link_count}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: b.is_active ? theme.success : theme.textDim,
                        }}
                      >
                        {b.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
