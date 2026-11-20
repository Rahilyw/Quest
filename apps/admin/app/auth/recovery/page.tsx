'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { theme } from '@/lib/theme'

/** Catches Supabase redirects to Site URL (/) with #access_token in the hash. */
export default function AuthRecoveryRedirect() {
  const router = useRouter()

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '')
    if (hash.includes('access_token')) {
      router.replace(`/login/reset-password#${hash}`)
      return
    }
    router.replace('/login')
  }, [router])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: theme.bg,
        color: theme.textMuted,
      }}
    >
      Redirecting…
    </div>
  )
}
