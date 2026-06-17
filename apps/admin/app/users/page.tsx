import { supabaseAdmin } from '@/lib/supabase'

export const revalidate = 60

export default async function UsersPage() {
  const { data: users } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .order('total_xp', { ascending: false })

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 32 }}>Users ({users?.length ?? 0})</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: '#64748B', textAlign: 'left', borderBottom: '1px solid #1E293B' }}>
            <th style={{ padding: '12px 16px' }}>Username</th>
            <th style={{ padding: '12px 16px' }}>City</th>
            <th style={{ padding: '12px 16px' }}>Level</th>
            <th style={{ padding: '12px 16px' }}>Total XP</th>
            <th style={{ padding: '12px 16px' }}>Joined</th>
          </tr>
        </thead>
        <tbody>
          {users?.map((u) => (
            <tr key={u.id} style={{ borderBottom: '1px solid #1E293B' }}>
              <td style={{ padding: '12px 16px', fontWeight: 600 }}>@{u.username}</td>
              <td style={{ padding: '12px 16px', color: '#64748B' }}>{u.city}</td>
              <td style={{ padding: '12px 16px', color: '#6366F1' }}>Lv {u.level}</td>
              <td style={{ padding: '12px 16px' }}>{u.total_xp} XP</td>
              <td style={{ padding: '12px 16px', color: '#64748B' }}>
                {new Date(u.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
