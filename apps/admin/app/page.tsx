import Link from 'next/link'
import { dropDayWindow, formatDropLabel } from '@quest/geofence'
import { supabaseAdmin } from '@/lib/supabase'
import { getFlaggedCommentCount, getFlaggedCount } from '@/app/moderation/actions'
import { getActiveBoosts, type XpEventRow } from '@/app/xp-events/actions'
import { formatMultiplier, formatVictoria } from '@/lib/xpEventPresets'
import { formatCount } from '@/lib/format'
import { theme } from '@/lib/theme'

export const revalidate = 60

export default async function Dashboard() {
  const [flaggedPosts, flaggedComments] = await Promise.all([getFlaggedCount(), getFlaggedCommentCount()])
  const flaggedCount = flaggedPosts + flaggedComments

  // null = couldn't read xp_events (043 not applied yet).
  const boosts: XpEventRow[] | null = await getActiveBoosts().catch(() => null)
  const topBoost = boosts?.[0] ?? null

  const [
    { count: totalUsers },
    { count: totalCompletions },
    { count: removedCompletions },
    { count: activeQuests },
    nextDrop,
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('completions').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabaseAdmin.from('completions').select('*', { count: 'exact', head: true }).eq('status', 'removed'),
    supabaseAdmin.from('quests').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    (async () => {
      const window = dropDayWindow(new Date())
      const { count, error } = await supabaseAdmin
        .from('quests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('active_from', window.start.toISOString())
        .lt('active_from', window.end.toISOString())
      return { count: error ? null : count ?? 0, label: formatDropLabel(window.at) }
    })(),
  ])

  const stats = [
    { label: 'Total Users', value: totalUsers ?? 0, color: theme.primary, href: '/users' },
    { label: 'Approved Completions', value: totalCompletions ?? 0, color: theme.success, href: '/completions' },
    { label: 'Flagged for review', value: flaggedCount, color: theme.warning, href: '/moderation' },
    { label: 'Removed (moderated)', value: removedCompletions ?? 0, color: theme.danger, href: '/completions' },
    { label: 'Active Quests', value: activeQuests ?? 0, color: theme.categories.community.color, href: '/quests' },
  ]

  return (
    <div>
      <h1 className="admin-page-title">Dashboard</h1>
      <p className="admin-page-sub">Season 1 · Victoria, BC</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {stats.map((s) => {
          const inner = (
            <div className="admin-card" style={{ borderLeft: `4px solid ${s.color}`, padding: 20 }}>
              <div className="admin-num" style={{ fontSize: 36, fontWeight: 800, color: s.color }}>
                {formatCount(s.value)}
              </div>
              <div style={{ color: theme.textMuted, marginTop: 8, fontSize: 13 }}>{s.label}</div>
            </div>
          )
          return s.href ? (
            <Link key={s.label} href={s.href} style={{ textDecoration: 'none' }}>
              {inner}
            </Link>
          ) : (
            <div key={s.label}>{inner}</div>
          )
        })}
      </div>

      <div className="admin-card" style={{ marginBottom: 24, maxWidth: 520 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: theme.textMuted }}>Next Monday drop</div>
        <div className="admin-num" style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>
          {nextDrop.count == null ? '—' : formatCount(nextDrop.count)}
        </div>
        <p style={{ margin: '8px 0 0', color: theme.textMuted, fontSize: 14 }}>
          {nextDrop.label}
          {nextDrop.count === 0
            ? '. Nothing scheduled yet — an empty Monday is visible here before it arrives.'
            : nextDrop.count == null
              ? '. Couldn’t count scheduled quests.'
              : ` scheduled for that morning.`}
        </p>
      </div>

      <Link href="/xp-events" style={{ textDecoration: 'none', color: 'inherit', display: 'block', maxWidth: 520, marginBottom: 24 }}>
        <div className="admin-card">
          <div style={{ fontSize: 13, fontWeight: 700, color: theme.textMuted }}>Active boost</div>
          {boosts == null ? (
            <p style={{ margin: '8px 0 0', color: theme.textMuted, fontSize: 14 }}>
              Unavailable. XP events need migration 043.
            </p>
          ) : topBoost == null ? (
            <>
              <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>None</div>
              <p style={{ margin: '8px 0 0', color: theme.textMuted, fontSize: 14 }}>
                Quests pay their normal XP. Start a double-XP weekend from XP events.
              </p>
            </>
          ) : (
            <>
              <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>
                {formatMultiplier(topBoost.multiplier)} {topBoost.label ?? 'XP event'}
              </div>
              <p style={{ margin: '8px 0 0', color: theme.textMuted, fontSize: 14 }}>
                {topBoost.quest_id ? topBoost.quest_title ?? 'One quest' : 'Every quest'} · ends{' '}
                {formatVictoria(topBoost.ends_at)} Victoria
                {boosts.length > 1 ? ` · ${boosts.length - 1} more running` : ''}
              </p>
            </>
          )}
        </div>
      </Link>

      <Link href="/quests/new" className="admin-btn admin-btn-primary" style={{ textDecoration: 'none' }}>
        + Create New Quest
      </Link>
    </div>
  )
}
