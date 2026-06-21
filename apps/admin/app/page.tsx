import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { theme } from '@/lib/theme'

export const revalidate = 60

export default async function Dashboard() {
  const [
    { count: totalUsers },
    { count: totalCompletions },
    { count: pendingCompletions },
    { count: activeQuests },
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('completions').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabaseAdmin.from('completions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('quests').select('*', { count: 'exact', head: true }).eq('status', 'active'),
  ])

  const stats = [
    { label: 'Total Users', value: totalUsers ?? 0, color: theme.primary, href: '/users' },
    { label: 'Approved Completions', value: totalCompletions ?? 0, color: theme.success },
    { label: 'Pending Review', value: pendingCompletions ?? 0, color: theme.warning, href: '/completions' },
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
              <div style={{ fontSize: 36, fontWeight: 800, color: s.color }}>{s.value}</div>
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

      <Link href="/quests/new" className="admin-btn admin-btn-primary" style={{ textDecoration: 'none' }}>
        + Create New Quest
      </Link>
    </div>
  )
}
