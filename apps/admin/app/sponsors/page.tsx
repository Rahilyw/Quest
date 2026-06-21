import { supabaseAdmin } from '@/lib/supabase'
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
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Sponsors</h1>
      <p style={{ color: '#64748B', marginBottom: 32 }}>
        Sponsored quest performance. Export each report for the business partner.
      </p>

      {(!sponsored || sponsored.length === 0) && (
        <div style={{ background: '#1E293B', borderRadius: 16, padding: 32, textAlign: 'center', color: '#64748B' }}>
          No sponsored quests yet. Create one in the Quests tab.
        </div>
      )}

      <div style={{ display: 'grid', gap: 16 }}>
        {sponsored?.map((q: any) => {
          const total = q.completions?.length ?? 0
          const approved = q.completions?.filter((c: any) => c.status === 'approved').length ?? 0
          return (
            <div key={q.id} style={{ background: '#1E293B', borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{q.title}</div>
                  <div style={{ color: '#F59E0B', fontWeight: 700, marginBottom: 8 }}>
                    ⭐ {q.sponsor_name}
                  </div>
                  <div style={{ color: '#64748B' }}>Reward: {q.sponsor_reward}</div>
                  <ExportButton quest={q} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#22C55E' }}>{approved}</div>
                  <div style={{ color: '#64748B', fontSize: 12 }}>completions</div>
                  <div style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>{total} submitted</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
