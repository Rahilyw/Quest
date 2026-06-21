import { supabaseAdmin } from '@/lib/supabase'

import { theme } from '@/lib/theme'

export const revalidate = 60

export default async function UsersPage() {
  const { data: users } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .order('total_xp', { ascending: false })

  return (
    <div>
      <h1 className="admin-page-title">Users</h1>
      <p className="admin-page-sub">{users?.length ?? 0} registered players</p>
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: theme.textMuted, textAlign: 'left', borderBottom: `1px solid ${theme.border}` }}>
              <th style={{ padding: '12px 16px' }}>Username</th>
              <th style={{ padding: '12px 16px' }}>City</th>
              <th style={{ padding: '12px 16px' }}>Level</th>
              <th style={{ padding: '12px 16px' }}>Total XP</th>
              <th style={{ padding: '12px 16px' }}>Joined</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u) => (
              <tr key={u.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>@{u.username}</td>
                <td style={{ padding: '12px 16px', color: theme.textMuted }}>{u.city}</td>
                <td style={{ padding: '12px 16px', color: theme.primary, fontWeight: 700 }}>Lv {u.level}</td>
                <td style={{ padding: '12px 16px' }}>{u.total_xp.toLocaleString()} XP</td>
                <td style={{ padding: '12px 16px', color: theme.textMuted }}>
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
