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
      setError('Passwords do not match')
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
        <p style={{ color: '#64748B', textAlign: 'center', marginBottom: 32 }}>Choose a new password</p>

        {!ready ? (
          <p style={{ color: '#64748B', textAlign: 'center' }}>Verifying reset link…</p>
        ) : done ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ marginBottom: 16 }}>Password updated. You can sign in now.</p>
            <Link href="/login" style={{ color: '#4364F7', fontWeight: 600 }}>
              Go to sign in
            </Link>
          </div>
        ) : !sessionReady ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#EF4444', marginBottom: 16, lineHeight: 1.5 }}>
              {error ?? 'This reset link is invalid or has expired.'}
            </p>
            <Link href="/login/forgot-password" style={{ color: '#4364F7', fontWeight: 600 }}>
              Request a new reset link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={{ color: '#94A3B8', fontSize: 13, display: 'block', marginBottom: 6 }}>
                New password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
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
              <label style={{ color: '#94A3B8', fontSize: 13, display: 'block', marginBottom: 6 }}>
                Confirm password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
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
              {pending ? 'Saving…' : 'Update password'}
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
