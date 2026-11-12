import Link from 'next/link'
import { nearbyQuests } from '@/lib/nearbyQuests'
import { theme } from '@/lib/theme'
import { listActiveQuestPins, listSuggestionQueue } from './actions'
import { RejectSuggestion } from './RejectSuggestion'

export const dynamic = 'force-dynamic'

export default async function SuggestionsPage() {
  const [suggestions, pins] = await Promise.all([listSuggestionQueue(), listActiveQuestPins()])
  const withNearby = suggestions.map((suggestion) => ({
    suggestion,
    nearby: suggestion.status === 'submitted' ? nearbyQuests(suggestion, pins) : [],
  }))
  const open = suggestions.filter((row) => row.status === 'submitted').length

  return (
    <div>
      <h1 className="admin-page-title">Suggestions</h1>
      <p className="admin-page-sub">
        {open === 0 ? 'No ideas waiting.' : `${open} waiting for review.`} Publishing is curated.
      </p>

      {suggestions.length === 0 ? (
        <div className="admin-card" style={{ padding: 28 }}>
          <p style={{ margin: 0, color: theme.textMuted }}>
            When a player suggests a quest, it lands here. Accepting opens the quest form with their words filled in.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {withNearby.map(({ suggestion, nearby }) => (
            <article key={suggestion.id} className="admin-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ margin: '0 0 4px', fontSize: 18 }}>{suggestion.title}</h2>
                  <p style={{ margin: 0, color: theme.textMuted, fontSize: 13 }}>
                    @{suggestion.username} · {suggestion.category} · {suggestion.status}
                  </p>
                </div>
                {suggestion.status === 'submitted' ? (
                  <Link
                    href={`/quests/new?suggestion=${suggestion.id}`}
                    className="admin-btn admin-btn-primary"
                    style={{ textDecoration: 'none' }}
                  >
                    Accept and edit
                  </Link>
                ) : null}
              </div>
              <p style={{ margin: '12px 0', lineHeight: 1.5 }}>{suggestion.description}</p>
              {suggestion.lat != null && suggestion.lng != null ? (
                <p style={{ margin: '0 0 12px', color: theme.textMuted, fontSize: 13 }}>
                  Pin {suggestion.lat.toFixed(4)}, {suggestion.lng.toFixed(4)}
                </p>
              ) : (
                <p style={{ margin: '0 0 12px', color: theme.textMuted, fontSize: 13 }}>No pin.</p>
              )}
              {suggestion.status === 'submitted' ? (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 13 }}>Within 500 m</p>
                  {nearby.length === 0 ? (
                    <p style={{ margin: 0, color: theme.textMuted, fontSize: 13 }}>
                      {suggestion.lat == null ? 'No pin, so no nearby check.' : 'No active quest within 500 m.'}
                    </p>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {nearby.map((quest) => (
                        <li key={quest.id} style={{ fontSize: 13, marginBottom: 4 }}>
                          {quest.title} · {Math.round(quest.distance_m)} m
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
              {suggestion.admin_notes ? (
                <p style={{ margin: '0 0 12px', fontSize: 13, color: theme.textMuted }}>
                  Note: {suggestion.admin_notes}
                </p>
              ) : null}
              {suggestion.status === 'submitted' ? <RejectSuggestion id={suggestion.id} /> : null}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
