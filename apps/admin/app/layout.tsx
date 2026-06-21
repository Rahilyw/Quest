import type { Metadata } from 'next'
import { AppShell } from './app-shell'
import './globals.css'

export const metadata: Metadata = {
  title: 'Quest! Admin',
  description: 'Quest! operations dashboard — Victoria, BC',
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
