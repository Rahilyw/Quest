'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { theme } from '@/lib/theme'
import { ensureSponsorLink } from './actions'

export function MerchantLink({ name, merchantKey }: { name: string; merchantKey: string | null }) {
  const router = useRouter()
  const [key, setKey] = useState(merchantKey)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function create() {
    setPending(true)
    setError(null)
    const result = await ensureSponsorLink(name)
    setPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setKey(result.merchantKey)
    router.refresh()
  }

  async function copy() {
    if (!key || typeof window === 'undefined') return
    await navigator.clipboard.writeText(`${window.location.origin}/redeem/${key}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!key) {
    return (
      <div>
        <button type="button" className="admin-btn" onClick={create} disabled={pending}>
          {pending ? 'Creating…' : 'Create merchant link'}
        </button>
        {error ? <div style={{ color: theme.danger, marginTop: 8, fontSize: 13 }}>{error}</div> : null}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      <code style={{ fontSize: 13, wordBreak: 'break-all' }}>/redeem/{key}</code>
      <button type="button" className="admin-btn admin-btn-ghost" onClick={copy}>
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  )
}
