import { theme } from '@/lib/theme'
import { formatMultiplier, formatVictoria } from '@/lib/xpEventPresets'
import { listQuestOptions, listXpEvents, type XpEventRow } from './actions'
import { CreateXpEvent } from './CreateXpEvent'
import { EndXpEvent } from './EndXpEvent'

export const dynamic = 'force-dynamic'

function EventCard({ row, state }: { row: XpEventRow; state: 'active' | 'upcoming' | 'ended' }) {
  const scope = row.quest_id ? row.quest_title ?? 'A quest that was deleted' : 'Every quest'
  return (
    <article
      className="admin-card"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
        opacity: state === 'ended' ? 0.7 : 1,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 22, fontWeight: 800 }}>{formatMultiplier(row.multiplier)}</span>
          <span style={{ fontWeight: 700 }}>{row.label ?? 'XP event'}</span>
        </div>
        <p style={{ margin: '4px 0 0', color: theme.textMuted, fontSize: 13 }}>
          {scope} · {formatVictoria(row.starts_at)} → {formatVictoria(row.ends_at)} (Victoria)
        </p>
        {row.created_by ? (
          <p style={{ margin: '2px 0 0', color: theme.textDim, fontSize: 12 }}>Created by {row.created_by}</p>
        ) : null}
      </div>
      {state === 'ended' ? null : <EndXpEvent id={row.id} upcoming={state === 'upcoming'} />}
    </article>
  )
}

function Section({
  title,
  rows,
  state,
  empty,
}: {
  title: string
  rows: XpEventRow[]
  state: 'active' | 'upcoming' | 'ended'
  empty: string
}) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 12px' }}>{title}</h2>
      {rows.length === 0 ? (
        <p style={{ margin: 0, color: theme.textMuted, fontSize: 14 }}>{empty}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map((row) => (
            <EventCard key={row.id} row={row} state={state} />
          ))}
        </div>
      )}
    </section>
  )
}

export default async function XpEventsPage() {
  let lists: Awaited<ReturnType<typeof listXpEvents>>
  let quests: Awaited<ReturnType<typeof listQuestOptions>>
  try {
    ;[lists, quests] = await Promise.all([listXpEvents(), listQuestOptions()])
  } catch (err) {
    return (
      <div>
        <h1 className="admin-page-title">XP events</h1>
        <div className="admin-card" style={{ padding: 24 }}>
          <p style={{ margin: 0, color: theme.danger }}>
            Couldn&apos;t load XP events: {err instanceof Error ? err.message : 'unknown error'}.
          </p>
          <p style={{ margin: '8px 0 0', color: theme.textMuted, fontSize: 14 }}>
            This page needs migration 043 applied to the database.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="admin-page-title">XP events</h1>
      <p className="admin-page-sub">
        Boosts don&apos;t stack: a completion gets the highest one that applies, capped at ×3 with the
        first-finisher bonus.
      </p>

      <CreateXpEvent quests={quests} />

      <Section title="Active" rows={lists.active} state="active" empty="No boost is running." />
      <Section title="Upcoming" rows={lists.upcoming} state="upcoming" empty="Nothing scheduled." />
      <Section title="Ended" rows={lists.ended} state="ended" empty="No past events yet." />

      <section className="admin-card" style={{ maxWidth: 520 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 6px' }}>Win-back</h2>
        <p style={{ margin: 0, color: theme.textMuted, fontSize: 14, lineHeight: 1.5 }}>
          {lists.winBack.open} player{lists.winBack.open === 1 ? '' : 's'} holding a ×2 win-back bonus ·{' '}
          {lists.winBack.usedLast30Days} used in the last 30 days.
        </p>
        <p style={{ margin: '8px 0 0', color: theme.textDim, fontSize: 12, lineHeight: 1.5 }}>
          Sent daily at 17:00 Victoria to players whose last quest was 10–60 days ago. Personal rows
          aren&apos;t listed here.
        </p>
      </section>
    </div>
  )
}
