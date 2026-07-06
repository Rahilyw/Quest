'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { BadgeForm } from '@/components/BadgeForm'
import { createBadge } from '../actions'
import { theme } from '@/lib/theme'

export default function NewBadgePage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setError(null)
    setSubmitting(true)
    const result = await createBadge(formData)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.push(`/badges/${result.badge.id}`)
    router.refresh()
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <Link href="/badges" style={{ color: theme.textMuted, fontSize: 13, textDecoration: 'none' }}>
          ← Back to Badges
        </Link>
        <h1 className="admin-page-title" style={{ marginTop: 12 }}>Create Badge</h1>
        <p className="admin-page-sub" style={{ marginBottom: 0 }}>
          Define the achievement, artwork, and unlock rule. Active badges auto-award when conditions are met.
        </p>
      </div>

      <BadgeForm
        onSubmit={handleSubmit}
        submitLabel="Create badge"
        error={error}
        submitting={submitting}
      />
    </div>
  )
}
