'use client'

import { useState, useEffect } from 'react'
import { signIn } from './actions'

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
        background: '#0D1B3E',
        color: '#F1F5F9',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#4364F7', marginBottom: 8, textAlign: 'center' }}>
          Quest! Admin
        </div>
        <p style={{ color: '#64748B', textAlign: 'center', marginBottom: 32 }}>Sign in to continue</p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={{ color: '#94A3B8', fontSize: 13, display: 'block', marginBottom: 6 }}>Email</label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: '#1E293B',
                color: '#F1F5F9',
                border: '1px solid #334155',
                borderRadius: 8,
                padding: 12,
              }}
            />
          </div>
          <div>
            <label style={{ color: '#94A3B8', fontSize: 13, display: 'block', marginBottom: 6 }}>Password</label>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: '#1E293B',
                color: '#F1F5F9',
                border: '1px solid #334155',
                borderRadius: 8,
                padding: 12,
              }}
            />
          </div>

          {displayError && (
            <div
              style={{
                background: isAccessDenied ? '#450A0A' : '#1E293B',
                border: `1px solid ${isAccessDenied ? '#EF4444' : '#334155'}`,
                borderRadius: 8,
                padding: '10px 14px',
              }}
            >
              <p style={{ color: '#EF4444', fontSize: 14, margin: 0 }}>{displayError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            style={{
              width: '100%',
              background: '#4364F7',
              color: '#fff',
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
            style={{ color: '#94A3B8', textAlign: 'center', fontSize: 14, textDecoration: 'none' }}
          >
            Forgot password?
          </a>
        </form>
      </div>
    </div>
  )
}
