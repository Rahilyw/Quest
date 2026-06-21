'use client'

import { usePathname } from 'next/navigation'
import { signOut } from './actions'

function Sidebar() {
  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/completions', label: 'Completions Queue' },
    { href: '/quests', label: 'Quests' },
    { href: '/users', label: 'Users' },
    { href: '/sponsors', label: 'Sponsors' },
  ]
  return (
    <nav style={{ width: 220, background: '#1E293B', padding: '32px 16px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#6366F1', marginBottom: 32 }}>Quest! Admin</div>
      {links.map((l) => (
        <a
          key={l.href}
          href={l.href}
          style={{ display: 'block', color: '#94A3B8', padding: '10px 12px', borderRadius: 8, marginBottom: 4, textDecoration: 'none' }}
        >
          {l.label}
        </a>
      ))}
      <form action={signOut} style={{ marginTop: 'auto', paddingTop: 24 }}>
        <button
          type="submit"
          style={{
            width: '100%',
            background: 'transparent',
            color: '#94A3B8',
            border: '1px solid #334155',
            borderRadius: 8,
            padding: '10px 12px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Sign Out
        </button>
      </form>
    </nav>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === '/login' || pathname.startsWith('/login/')

  if (isLogin) {
    return <>{children}</>
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: 32 }}>{children}</main>
    </div>
  )
}
