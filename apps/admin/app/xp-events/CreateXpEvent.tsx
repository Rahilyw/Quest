'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatVancouverInput } from '@quest/geofence'
import { theme } from '@/lib/theme'
import {
  CUSTOM_MULTIPLIER_MAX,
  CUSTOM_MULTIPLIER_MIN,
  formatVictoria,
  weekendWindow,
  type XpEventPreset,
} from '@/lib/xpEventPresets'
import { createXpEvent, type QuestOption } from './actions'

const PRESETS: { value: XpEventPreset; label: string; hint: string }[] = [
  {
    value: 'weekend',
    label: 'Double XP this weekend',
    hint: 'Every quest, ×2, Saturday 00:00 to Monday 00:00 Victoria.',
  },
  { value: 'quest', label: 'Double XP on one quest', hint: 'One quest, ×2, for the dates you pick.' },
  {
    value: 'custom',
    label: 'Custom',
    hint: `Any multiplier from ×${CUSTOM_MULTIPLIER_MIN} to ×${CUSTOM_MULTIPLIER_MAX}, for every quest or one.`,
  },
]

function defaultRange(): { starts: string; ends: string } {
  const start = new Date()
  start.setMinutes(0, 0, 0)
  start.setHours(start.getHours() + 1)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { starts: formatVancouverInput(start.toISOString()), ends: formatVancouverInput(end.toISOString()) }
}

export function CreateXpEvent({ quests }: { quests: QuestOption[] }) {
  const router = useRouter()
  const initial = useMemo(defaultRange, [])
  const [preset, setPreset] = useState<XpEventPreset>('weekend')
  const [questId, setQuestId] = useState('')
  const [startsLocal, setStartsLocal] = useState(initial.starts)
  const [endsLocal, setEndsLocal] = useState(initial.ends)
  const [multiplier, setMultiplier] = useState('1.5')
  const [label, setLabel] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const weekend = useMemo(() => weekendWindow(new Date()), [])
  const hint = PRESETS.find((p) => p.value === preset)?.hint

  async function onCreate() {
    setPending(true)
    setError(null)
    setDone(null)
    const result = await createXpEvent({
      preset,
      questId: questId || null,
      startsLocal,
      endsLocal,
      multiplier: Number(multiplier),
      label,
    })
    setPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setDone('Event created.')
    setLabel('')
    router.refresh()
  }

  return (
    <section className="admin-card" style={{ marginBottom: 28, maxWidth: 720 }}>
      <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800 }}>New event</h2>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }} role="radiogroup" aria-label="Preset">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            role="radio"
            aria-checked={preset === p.value}
            className={`admin-btn ${preset === p.value ? 'admin-btn-primary' : 'admin-btn-ghost'}`}
            onClick={() => setPreset(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p style={{ margin: '0 0 16px', color: theme.textMuted, fontSize: 13 }}>{hint}</p>

      {preset === 'weekend' ? (
        <p style={{ margin: '0 0 16px', fontSize: 14 }}>
          Runs {formatVictoria(weekend.start)} → {formatVictoria(weekend.end)}.
          {weekend.start.getTime() <= Date.now() ? ' This weekend is under way, so it starts at once.' : ''}
        </p>
      ) : (
        <>
          <div className="admin-field">
            <label className="admin-label" htmlFor="xp-quest">
              {preset === 'quest' ? 'Quest' : 'Quest (blank = every quest)'}
            </label>
            <select
              id="xp-quest"
              className="admin-select"
              value={questId}
              onChange={(e) => setQuestId(e.target.value)}
            >
              <option value="">{preset === 'quest' ? 'Pick a quest…' : 'Every quest'}</option>
              {quests.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-grid-2">
            <div className="admin-field">
              <label className="admin-label" htmlFor="xp-starts">Starts (Victoria)</label>
              <input
                id="xp-starts"
                className="admin-input"
                type="datetime-local"
                value={startsLocal}
                onChange={(e) => setStartsLocal(e.target.value)}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label" htmlFor="xp-ends">Ends (Victoria)</label>
              <input
                id="xp-ends"
                className="admin-input"
                type="datetime-local"
                value={endsLocal}
                onChange={(e) => setEndsLocal(e.target.value)}
              />
            </div>
          </div>
          {preset === 'custom' ? (
            <div className="admin-field">
              <label className="admin-label" htmlFor="xp-multiplier">Multiplier</label>
              <input
                id="xp-multiplier"
                className="admin-input"
                type="number"
                min={CUSTOM_MULTIPLIER_MIN}
                max={CUSTOM_MULTIPLIER_MAX}
                step={0.05}
                value={multiplier}
                onChange={(e) => setMultiplier(e.target.value)}
              />
            </div>
          ) : null}
        </>
      )}

      <div className="admin-field">
        <label className="admin-label" htmlFor="xp-label">Name (admin only, optional)</label>
        <input
          id="xp-label"
          className="admin-input"
          maxLength={80}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={PRESETS.find((p) => p.value === preset)?.label}
        />
      </div>

      {error ? <p style={{ margin: '0 0 12px', color: theme.danger, fontSize: 13 }}>{error}</p> : null}
      {done ? <p style={{ margin: '0 0 12px', color: theme.success, fontSize: 13 }}>{done}</p> : null}

      <button type="button" className="admin-btn admin-btn-primary" disabled={pending} onClick={onCreate}>
        {pending ? 'Creating…' : 'Create event'}
      </button>
    </section>
  )
}
