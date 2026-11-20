import type { Metadata, Viewport } from 'next'
import { AppShell } from './app-shell'
import './globals.css'

export const metadata: Metadata = {
  title: 'Quest! Admin',
  description: 'Quest! operations dashboard — Victoria, BC',
}

export const viewport: Viewport = {
  themeColor: '#f6f2ec',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
