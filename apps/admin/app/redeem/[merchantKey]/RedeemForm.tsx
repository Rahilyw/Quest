'use client'

import { useState, type FormEvent } from 'react'
import { normalizeRedemptionCode } from '@quest/geofence'
import { theme } from '@/lib/theme'
import { lookupRedemption, markRedemption, type RedeemResult } from '../actions'

function whenRedeemed(iso: string) {
  return new Date(iso).toLocaleString('en-CA', {
    timeZone: 'America/Vancouver',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function RedeemForm({ merchantKey, sponsorName }: { merchantKey: string; sponsorName: string }) {
  const [code, setCode] = useState('')
  const [pending, setPending] = useState<'lookup' | 'mark' | null>(null)
  const [outcome, setOutcome] = useState<RedeemResult | null>(null)

  async function onLookup(event: FormEvent) {
    event.preventDefault()
    const normalized = normalizeRedemptionCode(code)
    if (!normalized) return
    setPending('lookup')
    const next = await lookupRedemption(merchantKey, normalized)
    setOutcome(next)
    setPending(null)
  }

  async function onMark() {
    const normalized = normalizeRedemptionCode(code)
    if (!normalized) return
    setPending('mark')
    const next = await markRedemption(merchantKey, normalized)
    setOutcome(next)
    setPending(null)
  }

  const tone =
    outcome?.result === 'valid' || outcome?.result === 'redeemed'
      ? theme.success
      : outcome?.result === 'used'
        ? theme.warning
        : outcome?.result === 'invalid' || outcome?.result === 'error'
          ? theme.danger
          : theme.text

  const headline =
    outcome?.result === 'valid'
      ? 'Valid'
      : outcome?.result === 'redeemed'
        ? 'Redeemed'
        : outcome?.result === 'used'
          ? 'Already used'
          : outcome?.result === 'invalid'
            ? 'Invalid'
            : outcome?.result === 'limited'
              ? 'Slow down'
              : outcome?.result === 'error'
                ? 'Try again'
                : null

  return (
    <form onSubmit={onLookup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <label htmlFor="code" style={{ fontSize: 15, fontWeight: 700, color: theme.textMuted }}>
        {sponsorName}
      </label>
      <input
        id="code"
        value={code}
        onChange={(event) => {
          setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))
          setOutcome(null)
        }}
        inputMode="text"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        maxLength={8}
        placeholder="8-character code"
        aria-label="Redemption code"
        style={{
          fontSize: 32,
          fontWeight: 800,
          letterSpacing: 4,
          textAlign: 'center',
          padding: '18px 12px',
          borderRadius: 16,
          border: `1px solid ${theme.borderStrong}`,
          background: theme.surface,
          color: theme.text,
          width: '100%',
        }}
      />
      <button
        type="submit"
        disabled={code.length !== 8 || pending !== null}
        style={{
          minHeight: 56,
          border: 'none',
          borderRadius: 999,
          background: theme.primary,
          color: theme.onPrimary,
          fontSize: 18,
          fontWeight: 800,
          cursor: 'pointer',
        }}
      >
        {pending === 'lookup' ? 'Checking…' : 'Check code'}
      </button>

      {headline ? (
        <div
          role="status"
          style={{
            borderRadius: 16,
            padding: 20,
            background: theme.surface,
            border: `2px solid ${tone}`,
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 800, color: tone, letterSpacing: -0.4 }}>{headline}</div>
          {outcome && (outcome.result === 'valid' || outcome.result === 'used' || outcome.result === 'redeemed') ? (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{outcome.title}</div>
              {outcome.reward ? <div style={{ color: theme.textMuted }}>{outcome.reward}</div> : null}
              {outcome.level != null ? (
                <div style={{ fontWeight: 700 }}>Level {outcome.level}</div>
              ) : null}
              {outcome.result !== 'valid' ? (
                <div style={{ color: theme.textMuted }}>{whenRedeemed(outcome.redeemed_at)} Victoria</div>
              ) : null}
            </div>
          ) : null}
          {outcome?.result === 'invalid' ? (
            <p style={{ margin: '8px 0 0', color: theme.textMuted }}>That code isn’t valid here.</p>
          ) : null}
          {outcome?.result === 'limited' ? (
            <p style={{ margin: '8px 0 0', color: theme.textMuted }}>Too many tries. Wait a minute.</p>
          ) : null}
          {outcome?.result === 'error' ? (
            <p style={{ margin: '8px 0 0', color: theme.textMuted }}>Couldn’t check that code.</p>
          ) : null}
          {outcome?.result === 'valid' ? (
            <button
              type="button"
              onClick={onMark}
              disabled={pending !== null}
              style={{
                marginTop: 16,
                minHeight: 56,
                width: '100%',
                border: 'none',
                borderRadius: 999,
                background: theme.success,
                color: theme.onPrimary,
                fontSize: 18,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {pending === 'mark' ? 'Saving…' : 'Mark redeemed'}
            </button>
          ) : null}
        </div>
      ) : null}
    </form>
  )
}
