'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { windowSummary } from '@quest/geofence'
import { getQuests, setStarterQuest, toggleQuestStatus, updateQuest, type Quest } from './actions'
import { theme, VICTORIA_DEFAULT } from '@/lib/theme'
import { QuestScheduleFields } from '@/components/QuestScheduleFields'
import { normalizeSchedule, vancouverInputToIso, vancouverInputValue } from '@/lib/schedule'
import GeofenceEditor, { type GeofenceType } from '@/components/GeofenceEditor'
import QuestCutoutUploader from '@/components/QuestCutoutUploader'
import QuestCoverPicker, { type CoverPickerValue } from '@/components/QuestCoverPicker'
import {
  areasToRpcPayload,
  newClientId,
  validateMultiAreas,
  type MultiArea,
} from '@/lib/multiAreas'

const CATEGORIES = Object.entries(theme.categories)

interface EditFormState {
  title: string
  description: string
  category: string
  lat: string
  lng: string
  radius_meters: string
  geofence_type: GeofenceType
  city_id: string
  boundary_ring: number[][] | null
  multi_areas: MultiArea[]
  xp_reward: string
  is_sponsored: boolean
  sponsor_name: string
  sponsor_reward: string
  active_from: string
  active_until: string
}

function questGeofencesToMultiAreas(q: Quest): MultiArea[] {
  return (q.quest_geofences ?? []).map((g) => ({
    clientId: g.id || newClientId(),
    label: g.label,
    shape: g.shape,
    lat: g.lat ?? undefined,
    lng: g.lng ?? undefined,
    radius_meters: g.radius_meters ?? undefined,
    boundaryRing: g.boundary_geojson?.coordinates?.[0] ?? null,
  }))
}

function questToFormState(q: Quest): EditFormState {
  return {
    title: q.title,
    description: q.description,
    category: q.category,
    lat: String(q.lat),
    lng: String(q.lng),
    radius_meters: String(q.radius_meters),
    geofence_type: q.geofence_type ?? 'circle',
    city_id: q.city_id ?? '',
    boundary_ring: q.boundary_geojson?.coordinates?.[0] ?? null,
    multi_areas: questGeofencesToMultiAreas(q),
    xp_reward: String(q.xp_reward),
    is_sponsored: q.is_sponsored,
    sponsor_name: q.sponsor_name ?? '',
    sponsor_reward: q.sponsor_reward ?? '',
    active_from: vancouverInputValue(q.active_from),
    active_until: vancouverInputValue(q.active_until),
  }
}

function EditForm({ quest, onSave, onCancel }: { quest: Quest; onSave: (updated: Quest) => void; onCancel: () => void }) {
  const [form, setForm] = useState<EditFormState>(questToFormState(quest))
  const [cover, setCover] = useState<CoverPickerValue>({
    file: null,
    previewUrl: quest.cover_image_url,
    remove: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof EditFormState>(field: K, value: EditFormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (form.geofence_type === 'multi') {
      const multiErr = validateMultiAreas(form.multi_areas)
      if (multiErr) {
        setError(multiErr)
        return
      }
    }
    const schedule = normalizeSchedule(
      vancouverInputToIso(form.active_from),
      vancouverInputToIso(form.active_until),
    )
    if ('error' in schedule) {
      setError(schedule.error)
      return
    }

    setSubmitting(true)

    try {
      const lat = parseFloat(form.lat)
      const lng = parseFloat(form.lng)
      const radius_meters = parseInt(form.radius_meters, 10)
      const xp_reward = parseInt(form.xp_reward, 10)

      const result = await updateQuest(
        {
          id: quest.id,
          title: form.title,
          description: form.description,
          category: form.category,
          lat,
          lng,
          radius_meters,
          geofence_type: form.geofence_type,
          city_id: form.city_id || null,
          boundary_geojson:
            form.geofence_type === 'polygon' && form.boundary_ring
              ? JSON.stringify({ type: 'Polygon', coordinates: [form.boundary_ring] })
              : null,
          xp_reward,
          is_sponsored: form.is_sponsored,
          sponsor_name: form.is_sponsored ? form.sponsor_name || null : null,
          sponsor_reward: form.is_sponsored ? form.sponsor_reward || null : null,
          remove_cover: cover.remove && !cover.file,
          multi_areas:
            form.geofence_type === 'multi' ? areasToRpcPayload(form.multi_areas) : null,
          active_from: schedule.active_from,
          active_until: schedule.active_until,
        },
        cover.file
      )

      if (!result.ok) {
        setError(result.error)
        return
      }

      onSave(result.quest)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSave} style={{ padding: '0 16px 20px' }}>
      <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 16 }}>
        <p style={{ margin: '0 0 14px', fontWeight: 800, fontSize: 14, color: theme.textMuted }}>
          Edit quest
        </p>

        <div className="admin-field">
          <QuestCoverPicker
            currentUrl={quest.cover_image_url}
            compact
            onChange={setCover}
          />
        </div>

        <div className="admin-field">
          <QuestCutoutUploader
            questId={quest.id}
            category={form.category}
            questTitle={quest.title}
            initialUrl={quest.cutout_url}
            initialAlt={quest.cutout_alt}
          />
        </div>

        {/* Title */}
        <div className="admin-field">
          <label className="admin-label" htmlFor={`edit-title-${quest.id}`}>Title</label>
          <input
            id={`edit-title-${quest.id}`}
            className="admin-input"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            required
          />
        </div>

        {/* Description */}
        <div className="admin-field">
          <label className="admin-label" htmlFor={`edit-desc-${quest.id}`}>Description</label>
          <textarea
            id={`edit-desc-${quest.id}`}
            className="admin-textarea"
            rows={3}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            required
          />
        </div>

        {/* Category */}
        <div className="admin-field">
          <span className="admin-label">Category</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {CATEGORIES.map(([key, cat]) => {
              const active = form.category === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => set('category', key)}
                  style={{
                    border: active ? `2px solid ${cat.deep}` : `1px solid ${theme.border}`,
                    background: active ? cat.color : 'transparent',
                    color: active ? cat.onColor : theme.textMuted,
                    borderRadius: 999,
                    padding: '6px 12px',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {cat.label}
                </button>
              )
            })}
          </div>
        </div>

        <GeofenceEditor
          geofenceType={form.geofence_type}
          onGeofenceTypeChange={(t) => set('geofence_type', t)}
          lat={parseFloat(form.lat) || VICTORIA_DEFAULT.lat}
          lng={parseFloat(form.lng) || VICTORIA_DEFAULT.lng}
          onLatLngChange={(newLat, newLng) => {
            set('lat', String(newLat))
            set('lng', String(newLng))
          }}
          radiusMeters={parseInt(form.radius_meters, 10) || 300}
          onRadiusChange={(r) => set('radius_meters', String(r))}
          cityId={form.city_id || null}
          onCityIdChange={(id) => set('city_id', id ?? '')}
          boundaryRing={form.boundary_ring}
          onBoundaryChange={(ring) => set('boundary_ring', ring)}
          multiAreas={form.multi_areas}
          onMultiAreasChange={(areas) => set('multi_areas', areas)}
        />

        <div className="admin-field" style={{ marginTop: 16 }}>
          <label className="admin-label" htmlFor={`edit-xp-${quest.id}`}>XP reward</label>
          <input
            id={`edit-xp-${quest.id}`}
            className="admin-input"
            type="number"
            min={25}
            max={1000}
            value={form.xp_reward}
            onChange={(e) => set('xp_reward', e.target.value)}
            required
          />
        </div>

        <QuestScheduleFields
          activeFrom={form.active_from}
          activeUntil={form.active_until}
          onChange={(next) => {
            set('active_from', next.activeFrom)
            set('active_until', next.activeUntil)
          }}
        />

        {/* Sponsor toggle */}
        <div className="admin-field">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.is_sponsored}
              onChange={(e) => set('is_sponsored', e.target.checked)}
              style={{ width: 16, height: 16, accentColor: theme.primary }}
            />
            <span style={{ fontWeight: 700, fontSize: 13 }}>Sponsored quest</span>
          </label>
        </div>

        {form.is_sponsored && (
          <div className="admin-grid-2">
            <div className="admin-field">
              <label className="admin-label" htmlFor={`edit-sname-${quest.id}`}>Sponsor name</label>
              <input
                id={`edit-sname-${quest.id}`}
                className="admin-input"
                placeholder="Habit Coffee"
                value={form.sponsor_name}
                onChange={(e) => set('sponsor_name', e.target.value)}
                required={form.is_sponsored}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label" htmlFor={`edit-sreward-${quest.id}`}>Sponsor reward</label>
              <input
                id={`edit-sreward-${quest.id}`}
                className="admin-input"
                placeholder="Free double shot upgrade"
                value={form.sponsor_reward}
                onChange={(e) => set('sponsor_reward', e.target.value)}
                required={form.is_sponsored}
              />
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: theme.dangerSoft, border: `1px solid ${theme.dangerBorder}`, borderRadius: 10, padding: 12, marginBottom: 12, color: theme.danger, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={submitting} style={{ fontSize: 12, flex: 1 }}>
            {submitting ? 'Saving…' : 'Save Changes'}
          </button>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onCancel} style={{ fontSize: 12, flex: 1 }}>
            Cancel
          </button>
        </div>
      </div>
    </form>
  )
}

export default function QuestsPage() {
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [starterBusyId, setStarterBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    getQuests().then((data) => {
      setQuests(data)
      setLoading(false)
    })
  }, [])

  async function handleToggle(id: string) {
    setActionError(null)
    try {
      const next = await toggleQuestStatus(id)
      setQuests((prev) => prev.map((q) => (q.id === id ? { ...q, status: next } : q)))
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not update this quest.')
    }
  }

  async function handleSetStarter(id: string) {
    setActionError(null)
    setStarterBusyId(id)
    try {
      const result = await setStarterQuest(id)
      if (!result.ok) {
        setActionError(result.error)
        return
      }
      setQuests((prev) => prev.map((q) => ({ ...q, is_starter: q.id === id })))
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not set the first quest.')
    } finally {
      setStarterBusyId(null)
    }
  }

  function handleEditSave(updated: Quest) {
    setQuests((prev) => prev.map((q) => (q.id === updated.id ? updated : q)))
    setEditingId(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 className="admin-page-title">Quests</h1>
          <p className="admin-page-sub">{quests.length} total · {quests.filter((q) => q.status === 'active').length} active</p>
        </div>
        <Link href="/quests/new" className="admin-btn admin-btn-primary" style={{ textDecoration: 'none' }}>
          + Create Quest
        </Link>
      </div>

      {loading ? (
        <p style={{ color: theme.textMuted }}>Loading quests…</p>
      ) : quests.length === 0 ? (
        <div className="admin-card" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: theme.textMuted, marginBottom: 16 }}>No quests yet. Create your first one!</p>
          <Link href="/quests/new" className="admin-btn admin-btn-primary" style={{ textDecoration: 'none' }}>
            + Create Quest
          </Link>
        </div>
      ) : (
        <>
        {actionError ? (
          <p role="alert" style={{ color: theme.danger, marginBottom: 16 }}>{actionError}</p>
        ) : null}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {quests.map((q) => {
            const cat = theme.categories[q.category]
            const isEditing = editingId === q.id
            return (
              <div key={q.id} className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div
                  style={{
                    height: 140,
                    background: q.cover_image_url
                      ? `url(${q.cover_image_url}) center/cover`
                      : `linear-gradient(135deg, ${cat?.soft ?? theme.primarySoft}, ${theme.surface})`,
                    position: 'relative',
                  }}
                >
                  {!q.cover_image_url && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>
                      
                    </div>
                  )}
                  <div
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      background: q.status === 'active' ? theme.success : theme.textMuted,
                      color: theme.onPrimary,
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: 999,
                      textTransform: 'capitalize',
                    }}
                  >
                    {q.status}
                  </div>
                </div>
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: cat?.onColor ?? theme.text,
                        background: cat?.color ?? theme.primarySoft,
                        padding: '3px 8px',
                        borderRadius: 999,
                        textTransform: 'capitalize',
                      }}
                    >
                      {q.category}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: theme.primary }}>+{q.xp_reward} XP</span>
                    {q.is_sponsored && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: theme.highlight }}>Sponsored</span>
                    )}
                    {q.is_starter && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: theme.success }}>First quest</span>
                    )}
                    {(q.geofence_type ?? 'circle') === 'none' && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: theme.textMuted }}>Anywhere</span>
                    )}
                    {(q.geofence_type ?? 'circle') === 'city' && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: theme.primaryLight }}>City-wide</span>
                    )}
                    {(q.geofence_type ?? 'circle') === 'circle' && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: theme.primaryLight }}>{q.radius_meters}m</span>
                    )}
                    {(q.geofence_type ?? 'circle') === 'polygon' && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: theme.primaryLight }}>Custom zone</span>
                    )}
                    {(q.geofence_type ?? 'circle') === 'multi' && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: theme.primaryLight }}>
                        {q.quest_geofences?.length ?? 0} areas
                      </span>
                    )}
                  </div>
                  <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, lineHeight: 1.3 }}>{q.title}</h3>
                  <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: theme.textMuted }}>
                    {windowSummary(q, new Date()).label}
                  </p>
                  {q.is_sponsored && q.sponsor_name && (
                    <p style={{ margin: '0 0 6px', fontSize: 11, color: theme.highlight, fontWeight: 600 }}>
                      Sponsored by {q.sponsor_name}
                    </p>
                  )}
                  <p style={{ margin: 0, color: theme.textMuted, fontSize: 12, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {q.description}
                  </p>
                  {q.quest_badges && q.quest_badges.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
                      {q.quest_badges.slice(0, 4).map((qb) => (
                        <span key={qb.badge_id} title={qb.badge?.name} style={{ fontSize: 16 }}>
                          {qb.badge?.icon ?? '🏅'}
                        </span>
                      ))}
                      {q.quest_badges.length > 4 && (
                        <span style={{ fontSize: 11, color: theme.textDim }}>+{q.quest_badges.length - 4}</span>
                      )}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setEditingId(isEditing ? null : q.id)}
                      className="admin-btn admin-btn-ghost"
                      style={{ flex: 1, fontSize: 12 }}
                    >
                      {isEditing ? 'Close' : 'Edit'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggle(q.id)}
                      className="admin-btn admin-btn-ghost"
                      style={{ flex: 1, fontSize: 12 }}
                    >
                      {q.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetStarter(q.id)}
                      className="admin-btn admin-btn-ghost"
                      style={{ flex: 1, fontSize: 12 }}
                      disabled={q.is_starter || q.status !== 'active' || starterBusyId === q.id}
                    >
                      {q.is_starter ? 'First quest' : starterBusyId === q.id ? 'Saving…' : 'Set as first quest'}
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <EditForm
                    quest={q}
                    onSave={handleEditSave}
                    onCancel={() => setEditingId(null)}
                  />
                )}
              </div>
            )
          })}
        </div>
        </>
      )}
    </div>
  )
}
