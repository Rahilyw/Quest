'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createQuest, getBadges, type Badge } from '../actions'
import { theme, VICTORIA_DEFAULT } from '@/lib/theme'

const CATEGORIES = Object.entries(theme.categories)

export default function NewQuestPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [badges, setBadges] = useState<Badge[]>([])
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [selectedBadges, setSelectedBadges] = useState<Set<string>>(new Set())
  const [isSponsored, setIsSponsored] = useState(false)
  const [category, setCategory] = useState('fitness')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getBadges().then(setBadges)
  }, [])

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  function toggleBadge(id: string) {
    setSelectedBadges((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const form = e.currentTarget
    const fd = new FormData(form)
    fd.set('category', category)
    fd.set('is_sponsored', String(isSponsored))
    if (coverFile) fd.set('cover', coverFile)
    selectedBadges.forEach((id) => fd.append('badge_ids', id))

    const result = await createQuest(fd)
    setSubmitting(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    router.push('/quests')
    router.refresh()
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <Link href="/quests" style={{ color: theme.textMuted, fontSize: 13, textDecoration: 'none' }}>
          ← Back to Quests
        </Link>
        <h1 className="admin-page-title" style={{ marginTop: 12 }}>Create Quest</h1>
        <p className="admin-page-sub" style={{ marginBottom: 0 }}>
          Add details, cover photo, category, location, and linked badges — publishes active immediately.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Cover image */}
        <section className="admin-card" style={{ marginBottom: 20 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800 }}>Cover photo</h2>
          <p style={{ margin: '0 0 16px', color: theme.textMuted, fontSize: 13 }}>
            This image appears on the Explore hero card and quest detail in the app.
          </p>
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(ev) => ev.key === 'Enter' && fileRef.current?.click()}
            style={{
              height: 200,
              borderRadius: 14,
              border: `2px dashed ${theme.border}`,
              background: coverPreview ? `url(${coverPreview}) center/cover` : theme.primarySoft,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.textMuted,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {!coverPreview && '📷 Click to upload cover image'}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverChange} style={{ display: 'none' }} />
        </section>

        {/* Details */}
        <section className="admin-card" style={{ marginBottom: 20 }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800 }}>Quest details</h2>
          <div className="admin-field">
            <label className="admin-label" htmlFor="title">Title</label>
            <input id="title" name="title" className="admin-input" placeholder="Run the Galloping Goose Trail" required />
          </div>
          <div className="admin-field">
            <label className="admin-label" htmlFor="description">Description</label>
            <textarea id="description" name="description" className="admin-textarea" rows={4} placeholder="What should players do? Where? Any tips?" required />
          </div>

          <div className="admin-field">
            <span className="admin-label">Category</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.map(([key, cat]) => {
                const active = category === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategory(key)}
                    style={{
                      border: active ? `2px solid ${cat.color}` : `1px solid ${theme.border}`,
                      background: active ? cat.soft : 'transparent',
                      color: active ? cat.color : theme.textMuted,
                      borderRadius: 999,
                      padding: '8px 14px',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {cat.icon} {cat.label}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* Location */}
        <section className="admin-card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Location</h2>
            <button
              type="button"
              className="admin-btn admin-btn-ghost"
              style={{ fontSize: 12, padding: '6px 12px' }}
              onClick={() => {
                const lat = document.getElementById('lat') as HTMLInputElement
                const lng = document.getElementById('lng') as HTMLInputElement
                if (lat) lat.value = String(VICTORIA_DEFAULT.lat)
                if (lng) lng.value = String(VICTORIA_DEFAULT.lng)
              }}
            >
              Use Victoria centre
            </button>
          </div>
          <div className="admin-grid-2">
            <div className="admin-field">
              <label className="admin-label" htmlFor="lat">Latitude</label>
              <input id="lat" name="lat" className="admin-input" type="number" step="any" defaultValue={VICTORIA_DEFAULT.lat} required />
            </div>
            <div className="admin-field">
              <label className="admin-label" htmlFor="lng">Longitude</label>
              <input id="lng" name="lng" className="admin-input" type="number" step="any" defaultValue={VICTORIA_DEFAULT.lng} required />
            </div>
          </div>
          <div className="admin-grid-2">
            <div className="admin-field">
              <label className="admin-label" htmlFor="radius_meters">Geofence radius (m)</label>
              <input id="radius_meters" name="radius_meters" className="admin-input" type="number" defaultValue={300} min={50} max={2000} required />
            </div>
            <div className="admin-field">
              <label className="admin-label" htmlFor="xp_reward">XP reward</label>
              <input id="xp_reward" name="xp_reward" className="admin-input" type="number" defaultValue={150} min={25} max={1000} required />
            </div>
          </div>
        </section>

        {/* Sponsor */}
        <section className="admin-card" style={{ marginBottom: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: isSponsored ? 16 : 0 }}>
            <input
              type="checkbox"
              checked={isSponsored}
              onChange={(e) => setIsSponsored(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: theme.primary }}
            />
            <span style={{ fontWeight: 700 }}>Sponsored quest</span>
          </label>
          {isSponsored && (
            <div className="admin-grid-2">
              <div className="admin-field">
                <label className="admin-label" htmlFor="sponsor_name">Sponsor name <span style={{ color: '#ef4444' }}>*</span></label>
                <input id="sponsor_name" name="sponsor_name" className="admin-input" placeholder="Habit Coffee" required={isSponsored} />
              </div>
              <div className="admin-field">
                <label className="admin-label" htmlFor="sponsor_reward">Sponsor reward <span style={{ color: theme.textMuted, fontWeight: 400 }}>(optional)</span></label>
                <input id="sponsor_reward" name="sponsor_reward" className="admin-input" placeholder="Free double shot upgrade" />
              </div>
            </div>
          )}
        </section>

        {/* Badges */}
        <section className="admin-card" style={{ marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800 }}>Linked badges</h2>
          <p style={{ margin: '0 0 16px', color: theme.textMuted, fontSize: 13 }}>
            Badges players can earn or progress toward by completing this quest. Shown on quest detail in the app.
          </p>
          {badges.length === 0 ? (
            <p style={{ color: theme.textDim, fontSize: 13 }}>No badges in database yet.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {badges.map((b) => {
                const selected = selectedBadges.has(b.id)
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => toggleBadge(b.id)}
                    style={{
                      textAlign: 'left',
                      padding: 12,
                      borderRadius: 12,
                      border: selected ? `2px solid ${theme.primary}` : `1px solid ${theme.border}`,
                      background: selected ? theme.primarySoft : '#0f172a',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      color: theme.text,
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 4 }}>{b.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{b.name}</div>
                    <div style={{ color: theme.textDim, fontSize: 11, marginTop: 2, lineHeight: 1.3 }}>{b.unlock_condition}</div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 10, padding: 14, marginBottom: 16, color: '#fca5a5', fontSize: 14 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={submitting}>
            {submitting ? 'Publishing…' : 'Publish Quest'}
          </button>
          <Link href="/quests" className="admin-btn admin-btn-ghost" style={{ textDecoration: 'none' }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
