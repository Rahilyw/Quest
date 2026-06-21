'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from './actions'
import { theme } from '@/lib/theme'

function Sidebar() {
  const pathname = usePathname()
  const links = [
    { href: '/', label: 'Dashboard', icon: '◆' },
    { href: '/completions', label: 'Completions', icon: '◎' },
    { href: '/quests', label: 'Quests', icon: '⚡' },
    { href: '/quests/new', label: 'New Quest', icon: '＋' },
    { href: '/users', label: 'Users', icon: '◉' },
    { href: '/sponsors', label: 'Sponsors', icon: '★' },
  ]

  return (
    <nav
      style={{
        width: 240,
        background: theme.bgElevated,
        borderRight: `1px solid ${theme.border}`,
        padding: '28px 14px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
    >
      <div style={{ padding: '0 10px', marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: theme.primary, letterSpacing: -0.5 }}>
          QUEST!
        </div>
        <div style={{ fontSize: 11, color: theme.textDim, fontWeight: 600, letterSpacing: 1, marginTop: 2 }}>
          ADMIN
        </div>
      </div>

      {links.map((l) => {
        const active =
          l.href === '/quests'
            ? pathname === '/quests'
            : pathname === l.href
        return (
          <Link
            key={l.href}
            href={l.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: active ? theme.text : theme.textMuted,
              background: active ? theme.primarySoft : 'transparent',
              border: active ? `1px solid ${theme.border}` : '1px solid transparent',
              padding: '10px 12px',
              borderRadius: 10,
              marginBottom: 4,
              textDecoration: 'none',
              fontWeight: active ? 700 : 500,
              fontSize: 14,
            }}
          >
            <span style={{ opacity: 0.7, fontSize: 12 }}>{l.icon}</span>
            {l.label}
          </Link>
        )
      })}

      <form action={signOut} style={{ marginTop: 'auto', paddingTop: 24 }}>
        <button type="submit" className="admin-btn admin-btn-ghost" style={{ width: '100%' }}>
          Sign Out
        </button>
      </form>
    </nav>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === '/login' || pathname.startsWith('/login/') || pathname.startsWith('/auth/')

  if (isLogin) {
    return <>{children}</>
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '32px 36px', maxWidth: 1200 }}>{children}</main>
    </div>
  )
}
