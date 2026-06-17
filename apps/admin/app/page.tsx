import { supabaseAdmin } from '@/lib/supabase'

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
    { label: 'Total Users', value: totalUsers ?? 0, color: '#6366F1' },
    { label: 'Approved Completions', value: totalCompletions ?? 0, color: '#22C55E' },
    { label: 'Pending Review', value: pendingCompletions ?? 0, color: '#F59E0B', href: '/completions' },
    { label: 'Active Quests', value: activeQuests ?? 0, color: '#3B82F6', href: '/quests' },
  ]

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Dashboard</h1>
      <p style={{ color: '#64748B', marginBottom: 32 }}>Season 1 · Victoria, BC</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {stats.map((s) => (
          <a key={s.label} href={s.href ?? '#'} style={{ textDecoration: 'none' }}>
            <div style={{ background: '#1E293B', borderRadius: 16, padding: 24, borderLeft: `4px solid ${s.color}` }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ color: '#94A3B8', marginTop: 8 }}>{s.label}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
