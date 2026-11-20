'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { signIn } from './actions'

export default function LoginForm({ initialError }: { initialError?: string }) {
  const [error, setError] = useState<string | null>(initialError ?? null)
  const [pending, setPending] = useState(false)
  const errorRef = useRef<HTMLParagraphElement>(null)

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

  useEffect(() => {
    if (displayError) errorRef.current?.focus()
  }, [displayError])

  return (
    <div className="admin-auth">
      <div className="admin-auth-card">
        <h1 className="admin-auth-title">
          <span className="brand-wordmark" translate="no">
            Quest!
          </span>{' '}
          Admin
        </h1>
        <p className="admin-auth-sub">Sign in to continue</p>

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="admin-field">
            <label className="admin-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              spellCheck={false}
              className="admin-input"
            />
          </div>
          <div className="admin-field">
            <label className="admin-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="admin-input"
            />
          </div>

          {displayError && (
            <p
              ref={errorRef}
              tabIndex={-1}
              className={isAccessDenied ? 'admin-alert admin-alert-danger' : 'admin-alert'}
              role="alert"
            >
              {displayError}
            </p>
          )}

          <button type="submit" className="admin-btn admin-btn-primary admin-btn-block" disabled={pending}>
            {pending ? 'Signing in…' : 'Sign In'}
          </button>
          <Link href="/login/forgot-password" style={{ color: 'var(--admin-muted)', textAlign: 'center', fontSize: 14 }}>
            Forgot password?
          </Link>
        </form>
      </div>
    </div>
  )
}
