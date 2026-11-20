'use client'

import { useState } from 'react'
import Link from 'next/link'
import { adminAuthRedirectUrl, getSupabaseBrowser } from '@/lib/supabase-browser'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) {
      setError('Enter the email on the admin account.')
      return
    }

    setPending(true)
    setError(null)

    try {
      const supabase = getSupabaseBrowser()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: adminAuthRedirectUrl('/auth/confirm'),
      })

      if (resetError) {
        setError(resetError.message)
        return
      }
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t send the reset email. Try again in a minute.')
    } finally {
      setPending(false)
    }
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
        <p className="admin-auth-sub">Reset your password</p>

        {sent ? (
          <div style={{ textAlign: 'center' }} role="status" aria-live="polite">
            <p style={{ marginBottom: 12, lineHeight: 1.5 }}>
              If an account exists for <strong translate="no">{email}</strong>, a reset link is on its way.
            </p>
            <p style={{ color: 'var(--admin-muted)', fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
              Open the link in this same browser so the reset can verify correctly.
            </p>
            <Link href="/login" style={{ fontWeight: 600 }}>
              Back to Sign In
            </Link>
          </div>
        ) : (
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                spellCheck={false}
                className="admin-input"
              />
            </div>
            {error && (
              <p className="admin-alert" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="admin-btn admin-btn-primary admin-btn-block" disabled={pending}>
              {pending ? 'Sending…' : 'Send Reset Link'}
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
