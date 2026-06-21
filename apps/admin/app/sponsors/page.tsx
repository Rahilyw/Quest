import { supabaseAdmin } from '@/lib/supabase'
import { theme } from '@/lib/theme'
import ExportButton from './ExportButton'

export const revalidate = 60

export default async function SponsorsPage() {
  const { data: sponsored } = await supabaseAdmin
    .from('quests')
    .select('*, completions(id, status)')
    .eq('is_sponsored', true)
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 className="admin-page-title">Sponsors</h1>
      <p className="admin-page-sub">
        Sponsored quest performance. Export each report for the business partner.
      </p>

      {(!sponsored || sponsored.length === 0) && (
        <div className="admin-card" style={{ padding: 32, textAlign: 'center', color: theme.textMuted }}>
          No sponsored quests yet. Create one in Quests → New Quest.
        </div>
      )}

      <div style={{ display: 'grid', gap: 16 }}>
        {sponsored?.map((q: any) => {
          const total = q.completions?.length ?? 0
          const approved = q.completions?.filter((c: any) => c.status === 'approved').length ?? 0
          return (
            <div key={q.id} className="admin-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{q.title}</div>
                  <div style={{ color: theme.warning, fontWeight: 700, marginBottom: 8 }}>
                    ⭐ {q.sponsor_name}
                  </div>
                  <div style={{ color: theme.textMuted, marginBottom: 12 }}>Reward: {q.sponsor_reward}</div>
                  <ExportButton quest={q} />
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: theme.success }}>{approved}</div>
                  <div style={{ color: theme.textMuted, fontSize: 12 }}>completions</div>
                  <div style={{ color: theme.textMuted, fontSize: 12, marginTop: 4 }}>{total} submitted</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
