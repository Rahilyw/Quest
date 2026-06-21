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
        background: '#0F172A',
        color: '#F1F5F9',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#4364F7', marginBottom: 8, textAlign: 'center' }}>
          Quest! Admin
        </div>
        <p style={{ color: '#64748B', textAlign: 'center', marginBottom: 32 }}>Reset your password</p>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#F1F5F9', marginBottom: 12, lineHeight: 1.5 }}>
              If an account exists for <strong>{email}</strong>, we sent a reset link.
            </p>
            <p style={{ color: '#64748B', fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
              Open the link in this same browser so the reset can verify correctly.
            </p>
            <Link href="/login" style={{ color: '#4364F7', fontWeight: 600 }}>
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={{ color: '#94A3B8', fontSize: 13, display: 'block', marginBottom: 6 }}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
            {error && <p style={{ color: '#EF4444', fontSize: 14, margin: 0 }}>{error}</p>}
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
                opacity: pending ? 0.7 : 1,
              }}
            >
              {pending ? 'Sending…' : 'Send reset link'}
            </button>
            <Link href="/login" style={{ color: '#94A3B8', textAlign: 'center', fontSize: 14 }}>
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
