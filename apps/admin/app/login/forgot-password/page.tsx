'use client'

import { useState } from 'react'
import Link from 'next/link'
import { adminAuthRedirectUrl, getSupabaseBrowser } from '@/lib/supabase-browser'
import { theme } from '@/lib/theme'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) {
      setError('Email is required')
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
      setError(err instanceof Error ? err.message : 'Could not send reset email.')
    } finally {
      setPending(false)
    }
  }

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
        <p style={{ color: theme.textMuted, textAlign: 'center', marginBottom: 32 }}>Reset your password</p>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: theme.text, marginBottom: 12, lineHeight: 1.5 }}>
              If an account exists for <strong>{email}</strong>, we sent a reset link.
            </p>
            <p style={{ color: theme.textMuted, fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
              Open the link in this same browser so the reset can verify correctly.
            </p>
            <Link href="/login" style={{ color: theme.primary, fontWeight: 600 }}>
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={{ color: theme.textMuted, fontSize: 13, display: 'block', marginBottom: 6 }}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
            {error && <p style={{ color: theme.danger, fontSize: 14, margin: 0 }}>{error}</p>}
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
                opacity: pending ? 0.7 : 1,
              }}
            >
              {pending ? 'Sending…' : 'Send reset link'}
            </button>
            <Link href="/login" style={{ color: theme.textMuted, textAlign: 'center', fontSize: 14 }}>
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
