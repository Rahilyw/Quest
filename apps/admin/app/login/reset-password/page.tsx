'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  checkRecoverySession,
  establishSessionFromTokens,
  updatePassword,
} from './actions'

function parseHashParams(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash) return {}
  return Object.fromEntries(new URLSearchParams(hash))
}

export default function ResetPasswordPage() {
  const [sessionReady, setSessionReady] = useState(false)
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    async function init() {
      const queryError = new URLSearchParams(window.location.search).get('error')
      if (queryError) {
        setError(decodeURIComponent(queryError))
        setReady(true)
        return
      }

      // Legacy implicit-flow links: tokens in the URL hash.
      const hashParams = parseHashParams()
      if (hashParams.access_token) {
        const result = await establishSessionFromTokens(
          hashParams.access_token,
          hashParams.refresh_token ?? ''
        )
        if ('error' in result) setError(result.error)
        else setSessionReady(true)
        window.history.replaceState(null, '', window.location.pathname)
        setReady(true)
        return
      }

      // PKCE / cookie session set by /auth/confirm.
      const result = await checkRecoverySession()
      if ('ready' in result) setSessionReady(true)
      else setError(result.error)
      setReady(true)
    }

    init()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Those passwords don’t match. Type the same password in both fields.')
      return
    }
    if (!sessionReady) {
      setError('Reset link is invalid or expired. Request a new one from the login page.')
      return
    }

    setPending(true)
    setError(null)

    const result = await updatePassword(password)
    setPending(false)

    if ('error' in result) {
      setError(result.error)
      return
    }
    setDone(true)
  }

  return (
    <div className="admin-auth">
      <div className="admin-auth-card">
        <h1 className="admin-auth-title">
          <span className="brand-wordmark" translate="no">
            Quest!
          </span>{' '}
          Admin
        </h1>
        <p className="admin-auth-sub">Choose a new password</p>

        {!ready ? (
          <p style={{ color: 'var(--admin-muted)', textAlign: 'center' }} role="status" aria-live="polite">
            Verifying reset link…
          </p>
        ) : done ? (
          <div style={{ textAlign: 'center' }} role="status" aria-live="polite">
            <p style={{ marginBottom: 16 }}>Password updated. Sign in with the new password.</p>
            <Link href="/login" style={{ fontWeight: 600 }}>
              Go to Sign In
            </Link>
          </div>
        ) : !sessionReady ? (
          <div style={{ textAlign: 'center' }}>
            <p className="admin-alert" role="alert" style={{ marginBottom: 16 }}>
              {error ?? 'This reset link is invalid or has expired. Request a new one.'}
            </p>
            <Link href="/login/forgot-password" style={{ fontWeight: 600 }}>
              Request a New Reset Link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="admin-field">
              <label className="admin-label" htmlFor="password">
                New password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="admin-input"
              />
            </div>
            <div className="admin-field">
              <label className="admin-label" htmlFor="confirm">
                Confirm password
              </label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                className="admin-input"
              />
            </div>
            {error && (
              <p className="admin-alert" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="admin-btn admin-btn-primary admin-btn-block" disabled={pending}>
              {pending ? 'Saving…' : 'Update Password'}
            </button>
            <Link href="/login" style={{ color: 'var(--admin-muted)', textAlign: 'center', fontSize: 14 }}>
              Back to Sign In
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
