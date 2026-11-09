'use client'

import { useState, useEffect } from 'react'
import { signIn } from './actions'
import { theme } from '@/lib/theme'

export default function LoginForm({ initialError }: { initialError?: string }) {
  const [error, setError] = useState<string | null>(initialError ?? null)
  const [pending, setPending] = useState(false)

  // Supabase recovery emails may land on /login or / with #access_token=… — forward to reset page.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const search = window.location.search || ''
    const hash = window.location.hash || ''

    if (search.includes('code=') || search.includes('token_hash=')) {
      window.location.replace(`/auth/confirm${search}`)
      return
    }
    if (hash.includes('access_token=')) {
      window.location.replace(`/login/reset-password${hash}`)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const result = await signIn(new FormData(e.currentTarget))
    if (result?.error) {
      setError(result.error)
      setPending(false)
    }
  }

  const isAccessDenied =
    error === 'Access denied. Contact the Quest! team.' ||
    initialError === 'access_denied'

  const displayError =
    error === 'access_denied' || initialError === 'access_denied'
      ? 'Access denied. Contact the Quest! team.'
      : error

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: theme.bg,
        color: theme.text,
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ fontSize: 28, color: theme.primary, marginBottom: 8, textAlign: 'center' }}>
          <span className="brand-wordmark">Quest!</span> Admin
        </div>
        <p style={{ color: theme.textMuted, textAlign: 'center', marginBottom: 32 }}>Sign in to continue</p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={{ color: theme.textMuted, fontSize: 13, display: 'block', marginBottom: 6 }}>Email</label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: theme.surface,
                color: theme.text,
                border: '1px solid ${theme.borderStrong}',
                borderRadius: 8,
                padding: 12,
              }}
            />
          </div>
          <div>
            <label style={{ color: theme.textMuted, fontSize: 13, display: 'block', marginBottom: 6 }}>Password</label>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: theme.surface,
                color: theme.text,
                border: '1px solid ${theme.borderStrong}',
                borderRadius: 8,
                padding: 12,
              }}
            />
          </div>

          {displayError && (
            <div
              style={{
                background: isAccessDenied ? theme.dangerSoft : theme.surface,
                border: `1px solid ${isAccessDenied ? theme.danger : theme.borderStrong}`,
                borderRadius: 8,
                padding: '10px 14px',
              }}
            >
              <p style={{ color: theme.danger, fontSize: 14, margin: 0 }}>{displayError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            style={{
              width: '100%',
              background: theme.primary,
              color: theme.onPrimary,
              border: 'none',
              borderRadius: 8,
              padding: '12px 20px',
              cursor: pending ? 'not-allowed' : 'pointer',
              fontWeight: 700,
              fontSize: 15,
              opacity: pending ? 0.7 : 1,
            }}
          >
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
          <a
            href="/login/forgot-password"
            style={{ color: theme.textMuted, textAlign: 'center', fontSize: 14, textDecoration: 'none' }}
          >
            Forgot password?
          </a>
        </form>
      </div>
    </div>
  )
}
