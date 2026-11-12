'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from './actions'
import { theme } from '@/lib/theme'

function Sidebar() {
  const pathname = usePathname()
  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/moderation', label: 'Moderation' },
    { href: '/completions', label: 'Completions' },
    { href: '/quests', label: 'Quests' },
    { href: '/quests/new', label: 'New quest' },
    { href: '/suggestions', label: 'Suggestions' },
    { href: '/badges', label: 'Badges' },
    { href: '/stickers', label: 'Stickers' },
    { href: '/users', label: 'Users' },
    { href: '/sponsors', label: 'Sponsors' },
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
        <div style={{ color: theme.text }} className="brand-wordmark">
          Quest!
        </div>
        <div style={{ fontSize: 13, color: theme.textMuted, fontWeight: 600, marginTop: 2 }}>
          Admin
        </div>
      </div>

      {links.map((l) => {
        const active =
          l.href === '/quests'
            ? pathname === '/quests'
            : l.href === '/badges'
              ? pathname === '/badges' || pathname.startsWith('/badges/')
              : pathname === l.href
        return (
          <Link
            key={l.href}
            href={l.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: active ? theme.onPrimary : theme.textMuted,
              background: active ? theme.primary : 'transparent',
              border: '1px solid transparent',
              padding: '10px 12px',
              borderRadius: 999,
              marginBottom: 4,
              textDecoration: 'none',
              fontWeight: active ? 700 : 500,
              fontSize: 14,
            }}
          >
            {l.label}
          </Link>
        )
      })}

      <form action={signOut} style={{ marginTop: 'auto', paddingTop: 24 }}>
        <button type="submit" className="admin-btn admin-btn-ghost" style={{ width: '100%' }}>
          Sign out
        </button>
      </form>
    </nav>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === '/login' || pathname.startsWith('/login/') || pathname.startsWith('/auth/')
  const isRedeem = pathname === '/redeem' || pathname.startsWith('/redeem/')

  if (isLogin || isRedeem) {
    return <>{children}</>
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '32px 36px', maxWidth: 1200 }}>{children}</main>
    </div>
  )
}
