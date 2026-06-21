'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { EmailOtpType } from '@supabase/supabase-js'
import { getSupabaseBrowser } from '@/lib/supabase-browser'

export default function AuthConfirmPage() {
  const router = useRouter()
  const [message, setMessage] = useState('Confirming reset link…')

  useEffect(() => {
    async function confirm() {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const tokenHash = params.get('token_hash')
      const type = params.get('type') as EmailOtpType | null

      try {
        const supabase = getSupabaseBrowser()

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
          if (error) throw error
        } else {
          throw new Error('Reset link is missing a token. Request a new link.')
        }

        router.replace('/login/reset-password')
      } catch (err) {
        const text = err instanceof Error ? err.message : 'Could not verify reset link.'
        setMessage(text)
        router.replace(`/login/reset-password?error=${encodeURIComponent(text)}`)
      }
    }

    confirm()
  }, [router])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0F172A',
        color: '#64748B',
      }}
    >
      {message}
    </div>
  )
}
