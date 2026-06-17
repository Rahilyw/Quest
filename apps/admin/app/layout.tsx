import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kuest Admin',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0F172A', color: '#F1F5F9' }}>
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <Sidebar />
          <main style={{ flex: 1, padding: 32 }}>{children}</main>
        </div>
      </body>
    </html>
  )
}

function Sidebar() {
  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/completions', label: 'Completions Queue' },
    { href: '/quests', label: 'Quests' },
    { href: '/users', label: 'Users' },
    { href: '/sponsors', label: 'Sponsors' },
  ]
  return (
    <nav style={{ width: 220, background: '#1E293B', padding: '32px 16px', minHeight: '100vh' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#6366F1', marginBottom: 32 }}>Kuest Admin</div>
      {links.map((l) => (
        <a
          key={l.href}
          href={l.href}
          style={{ display: 'block', color: '#94A3B8', padding: '10px 12px', borderRadius: 8, marginBottom: 4, textDecoration: 'none' }}
        >
          {l.label}
        </a>
      ))}
    </nav>
  )
}
