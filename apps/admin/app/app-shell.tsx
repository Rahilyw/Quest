'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from './actions'

function Sidebar() {
  const pathname = usePathname()
  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/moderation', label: 'Moderation' },
    { href: '/completions', label: 'Completions' },
    { href: '/quests', label: 'Quests' },
    { href: '/quests/new', label: 'New Quest' },
    { href: '/suggestions', label: 'Suggestions' },
    { href: '/xp-events', label: 'XP Events' },
    { href: '/badges', label: 'Badges' },
    { href: '/stickers', label: 'Stickers' },
    { href: '/users', label: 'Users' },
    { href: '/sponsors', label: 'Sponsors' },
  ]

  return (
    <nav className="admin-sidebar" aria-label="Admin">
      <div style={{ padding: '0 10px', marginBottom: 28 }}>
        <div className="brand-wordmark" translate="no">
          Quest!
        </div>
        <div style={{ fontSize: 13, color: 'var(--admin-muted)', fontWeight: 600, marginTop: 2 }}>Admin</div>
      </div>

      {links.map((l) => {
        const active =
          l.href === '/quests'
            ? pathname === '/quests'
            : l.href === '/badges'
              ? pathname === '/badges' || pathname.startsWith('/badges/')
              : pathname === l.href
        return (
          <Link key={l.href} href={l.href} className="admin-nav-link" aria-current={active ? 'page' : undefined}>
            {l.label}
          </Link>
        )
      })}

      <form action={signOut} style={{ marginTop: 'auto', paddingTop: 24 }}>
        <button type="submit" className="admin-btn admin-btn-ghost admin-btn-block">
          Sign Out
        </button>
      </form>
    </nav>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === '/login' || pathname.startsWith('/login/') || pathname.startsWith('/auth/')
  const isRedeem = pathname === '/redeem' || pathname.startsWith('/redeem/')

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {isLogin || isRedeem ? (
        <main id="main">{children}</main>
      ) : (
        <div className="admin-shell">
          <Sidebar />
          <main id="main" className="admin-main">
            {children}
          </main>
        </div>
      )}
    </>
  )
}
