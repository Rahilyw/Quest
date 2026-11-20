import Link from 'next/link'
import { formatCount } from '@/lib/format'
import { theme } from '@/lib/theme'
import { formatMultiplier, formatVictoria } from '@/lib/xpEventPresets'
import { loadPilotDashboard, type ContentGap, type DayCount, type QuestCountRow } from './data'

export const revalidate = 60

function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="admin-card" style={{ padding: 20 }}>
      <div className="admin-num" style={{ fontSize: 32, fontWeight: 800 }}>
        {value}
      </div>
      <div style={{ color: theme.textMuted, marginTop: 8, fontSize: 13, fontWeight: 600 }}>{label}</div>
      {hint ? (
        <div style={{ color: theme.textDim, marginTop: 4, fontSize: 12 }}>{hint}</div>
      ) : null}
    </div>
  )
}

function Section({
  title,
  children,
  notice,
}: {
  title: string
  children?: React.ReactNode
  notice?: string | null
}) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 12px' }}>{title}</h2>
      {notice ? (
        <div className="admin-card" style={{ padding: 20 }}>
          <p style={{ margin: 0, color: theme.textMuted, fontSize: 14 }}>{notice}</p>
        </div>
      ) : (
        children
      )}
    </section>
  )
}

function CompletionsBars({ days }: { days: DayCount[] }) {
  const max = Math.max(1, ...days.map((d) => d.count))
  return (
    <div className="admin-card" style={{ padding: 20 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 6,
          height: 140,
          marginBottom: 8,
        }}
        role="img"
        aria-label="Completions per Victoria day for the last 14 days"
      >
        {days.map((d) => {
          const pct = (d.count / max) * 100
          return (
            <div
              key={d.date}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'center',
                height: '100%',
                gap: 6,
                minWidth: 0,
              }}
              title={`${d.label}: ${d.count}`}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: 28,
                  height: `${Math.max(d.count > 0 ? 4 : 0, pct)}%`,
                  background: theme.primary,
                  borderRadius: theme.radius.sm,
                  minHeight: d.count > 0 ? 4 : 0,
                }}
              />
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {days.map((d) => (
          <div
            key={`${d.date}-label`}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 10,
              color: theme.textMuted,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {d.label.replace(/^[A-Za-z]+ /, '')}
          </div>
        ))}
      </div>
      <p style={{ margin: '12px 0 0', color: theme.textMuted, fontSize: 13 }}>
        Completions per day · last 14 Victoria days
      </p>
    </div>
  )
}

function QuestTable({
  rows,
  empty,
  countLabel,
}: {
  rows: QuestCountRow[]
  empty: string
  countLabel: string
}) {
  if (rows.length === 0) {
    return <p style={{ margin: 0, color: theme.textMuted, fontSize: 14 }}>{empty}</p>
  }
  return (
    <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: theme.textMuted, textAlign: 'left', borderBottom: `1px solid ${theme.border}` }}>
            <th style={{ padding: '12px 16px' }}>Quest</th>
            <th style={{ padding: '12px 16px', textAlign: 'right' }}>{countLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
              <td style={{ padding: '12px 16px' }}>
                <Link href="/quests" style={{ fontWeight: 600, textDecoration: 'none' }}>
                  {row.title}
                </Link>
              </td>
              <td style={{ padding: '12px 16px', textAlign: 'right' }} className="admin-num">
                {formatCount(row.count)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function gapLabel(field: ContentGap['missing'][number]): string {
  if (field === 'cutout_url') return 'cutout'
  if (field === 'cutout_alt') return 'alt'
  return 'action phrase'
}

function ContentTable({ gaps }: { gaps: ContentGap[] }) {
  if (gaps.length === 0) {
    return (
      <p style={{ margin: 0, color: theme.textMuted, fontSize: 14 }}>
        Every live quest has a cutout, alt text and action phrase.
      </p>
    )
  }
  return (
    <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: theme.textMuted, textAlign: 'left', borderBottom: `1px solid ${theme.border}` }}>
            <th style={{ padding: '12px 16px' }}>Quest</th>
            <th style={{ padding: '12px 16px' }}>Missing</th>
          </tr>
        </thead>
        <tbody>
          {gaps.map((row) => (
            <tr key={row.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
              <td style={{ padding: '12px 16px' }}>
                <Link href="/quests" style={{ fontWeight: 600, textDecoration: 'none' }}>
                  {row.title}
                </Link>
              </td>
              <td style={{ padding: '12px 16px', color: theme.textMuted, fontSize: 13 }}>
                {row.missing.map(gapLabel).join(', ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatPercent(rate: number | null): string {
  if (rate == null) return '—'
  return `${Math.round(rate * 100)}%`
}

export default async function PilotPage() {
  const data = await loadPilotDashboard()
  const { cohort, activity, quests, content, boosts } = data

  return (
    <div>
      <h1 className="admin-page-title">Pilot</h1>
      <p className="admin-page-sub">R1 cohort · Victoria week · read only</p>

      <Section title="Cohort">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 16,
          }}
        >
          <StatCard label="Players" value={formatCount(cohort.playersTotal)} />
          <StatCard label="New last 7 days" value={formatCount(cohort.newLast7Days)} />
          <StatCard
            label="Weekly active"
            value={formatCount(cohort.weeklyActive)}
            hint="Approved completions this Victoria week"
          />
          <StatCard
            label="Push opt-in"
            value={formatPercent(cohort.pushOptInRate)}
            hint={`${formatCount(cohort.pushOptInCount)} with token and drops on`}
          />
        </div>
      </Section>

      <Section title="Activity">
        <div style={{ display: 'grid', gap: 16 }}>
          <CompletionsBars days={activity.completionsPerDay} />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 16,
            }}
          >
            <StatCard
              label="Reports opened"
              value={formatCount(activity.reportsOpenedLast7Days)}
              hint="Last 7 days"
            />
            <StatCard
              label="Posts removed"
              value={formatCount(activity.postsRemovedLast7Days)}
              hint="Last 7 days"
            />
          </div>
        </div>
      </Section>

      <Section title="Quests">
        <div style={{ display: 'grid', gap: 20 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 8px', color: theme.textMuted }}>
              Top 10 this week
            </h3>
            <QuestTable
              rows={quests.topThisWeek}
              empty="No approved completions this Victoria week yet."
              countLabel="Completions"
            />
          </div>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 8px', color: theme.textMuted }}>
              Live with zero completions in 14 days
            </h3>
            <QuestTable
              rows={quests.liveZeroCompletions}
              empty="Every live quest has at least one completion in the last 14 days."
              countLabel="Completions"
            />
          </div>
        </div>
      </Section>

      <Section title="Content readiness" notice={content.notice}>
        <ContentTable gaps={content.gaps} />
      </Section>

      <Section title="Boosts" notice={boosts.notice}>
        <div className="admin-card" style={{ padding: 20, maxWidth: 520 }}>
          {boosts.active == null ? (
            <>
              <div style={{ fontSize: 28, fontWeight: 800 }}>None</div>
              <p style={{ margin: '8px 0 0', color: theme.textMuted, fontSize: 14 }}>
                No XP event is running. Manage boosts on{' '}
                <Link href="/xp-events" style={{ fontWeight: 600 }}>
                  XP events
                </Link>
                .
              </p>
            </>
          ) : (
            <>
              <div style={{ fontSize: 28, fontWeight: 800 }}>
                {formatMultiplier(boosts.active.multiplier)}{' '}
                {boosts.active.label ?? 'XP event'}
              </div>
              <p style={{ margin: '8px 0 0', color: theme.textMuted, fontSize: 14 }}>
                {boosts.active.questId
                  ? boosts.active.questTitle ?? 'One quest'
                  : 'Every quest'}{' '}
                · ends {formatVictoria(boosts.active.endsAt)} Victoria
              </p>
              <p style={{ margin: '8px 0 0' }}>
                <Link href="/xp-events" style={{ fontWeight: 600, fontSize: 13 }}>
                  Open XP events
                </Link>
              </p>
            </>
          )}
        </div>
      </Section>
    </div>
  )
}
