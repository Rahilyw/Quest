'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import {
  createLibrarySticker,
  deleteLibrarySticker,
  getStickerLibrary,
  grantSticker,
  updateLibrarySticker,
  type StickerLibrary,
  type StickerRow,
  type UnlockRule,
} from './actions'
import StickerPreview from '@/components/StickerPreview'
import { prepareStickerPhoto, STICKER_ACCEPT } from '@/lib/sticker-client'
import { theme } from '@/lib/theme'

const RULES: { value: Exclude<UnlockRule, 'quest'>; label: string }[] = [
  { value: 'badge', label: 'Earning a badge' },
  { value: 'season', label: 'A season' },
  { value: 'manual', label: 'Given by an admin' },
]

function describeUnlock(s: StickerRow): string {
  if (s.unlock_rule === 'quest') return s.quest ? `Verify ${s.quest.title}` : 'Verify its quest'
  if (s.unlock_rule === 'badge') return s.badge ? `Earn ${s.badge.name}` : 'Earn a badge (deleted)'
  if (s.unlock_rule === 'season') return `Season: ${s.unlock_season ?? ''}`
  return 'Given by an admin'
}

function UnlockFields({
  badges,
  initial,
}: {
  badges: StickerLibrary['badges']
  initial?: Partial<StickerRow>
}) {
  const id = useId()
  const [rule, setRule] = useState<Exclude<UnlockRule, 'quest'>>(
    initial?.unlock_rule && initial.unlock_rule !== 'quest' ? initial.unlock_rule : 'badge'
  )
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div>
        <label className="admin-label" htmlFor={`${id}-rule`}>
          Unlocked by
        </label>
        <select
          id={`${id}-rule`}
          name="unlock_rule"
          className="admin-input"
          value={rule}
          onChange={(e) => setRule(e.target.value as Exclude<UnlockRule, 'quest'>)}
        >
          {RULES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      {rule === 'badge' ? (
        <div>
          <label className="admin-label" htmlFor={`${id}-badge`}>
            Badge
          </label>
          <select
            id={`${id}-badge`}
            name="unlock_badge_id"
            className="admin-input"
            defaultValue={initial?.unlock_badge_id ?? ''}
            required
          >
            <option value="">Choose a badge</option>
            {badges.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {rule === 'season' ? (
        <div>
          <label className="admin-label" htmlFor={`${id}-season`}>
            Season
          </label>
          <input
            id={`${id}-season`}
            name="unlock_season"
            className="admin-input"
            placeholder="Winter 2026"
            defaultValue={initial?.unlock_season ?? ''}
            required
          />
        </div>
      ) : null}
      <div>
        <label className="admin-label" htmlFor={`${id}-hint`}>
          Hint under the greyed sticker (optional)
        </label>
        <input
          id={`${id}-hint`}
          name="unlock_hint"
          className="admin-input"
          maxLength={80}
          placeholder="Do 3 Nature quests"
          defaultValue={initial?.unlock_hint ?? ''}
        />
      </div>
    </div>
  )
}

function NewStickerForm({ badges, onDone }: { badges: StickerLibrary['badges']; onDone: () => void }) {
  const id = useId()
  const form = useRef<HTMLFormElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [alt, setAlt] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      const fd = new FormData(e.currentTarget)
      const photo = fd.get('photo')
      if (photo instanceof File && photo.size > 0) fd.set('photo', await prepareStickerPhoto(photo))
      const result = await createLibrarySticker(fd)
      if (!result.ok) {
        setMessage({ tone: 'error', text: result.error })
        return
      }
      form.current?.reset()
      setAlt('')
      setPreview(null)
      setMessage({ tone: 'ok', text: ['Sticker added to the library.', ...(result.warnings ?? [])].join(' ') })
      onDone()
    } catch (err) {
      setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Upload failed.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form ref={form} onSubmit={onSubmit} className="admin-card" style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Add a library sticker</h2>
      <p style={{ margin: 0, color: theme.textMuted, fontSize: 13 }}>
        A real photo of one object, on a plain backdrop or already transparent. We cut it out and add the
        white edge. No stock photos, drawings, AI images or brand logos. Quest stickers are added on each
        quest&apos;s page.
      </p>
      <div>
        <label className="admin-label" htmlFor={`${id}-photo`}>
          Photo
        </label>
        <input
          id={`${id}-photo`}
          name="photo"
          type="file"
          accept={STICKER_ACCEPT}
          required
          onChange={(e) => {
            const f = e.target.files?.[0]
            setPreview(f ? URL.createObjectURL(f) : null)
          }}
        />
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" style={{ display: 'block', marginTop: 8, maxWidth: 160, maxHeight: 120, borderRadius: 8 }} />
        ) : null}
      </div>
      <div>
        <label className="admin-label" htmlFor={`${id}-alt`}>
          Alt text (required)
        </label>
        <input
          id={`${id}-alt`}
          name="alt"
          className="admin-input"
          required
          minLength={3}
          maxLength={140}
          placeholder="Totem pole at Thunderbird Park"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
        />
      </div>
      <UnlockFields badges={badges} />
      <div>
        <button type="submit" className="admin-btn admin-btn-primary" disabled={busy || alt.trim().length < 3}>
          {busy ? 'Making sticker…' : 'Make sticker'}
        </button>
      </div>
      {message ? (
        <p role={message.tone === 'error' ? 'alert' : 'status'} style={{ margin: 0, fontSize: 13, color: message.tone === 'error' ? theme.danger : theme.text }}>
          {message.text}
        </p>
      ) : null}
    </form>
  )
}

function StickerCard({
  sticker,
  badges,
  onChange,
}: {
  sticker: StickerRow
  badges: StickerLibrary['badges']
  onChange: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [grantTo, setGrantTo] = useState('')
  const [busy, setBusy] = useState(false)
  const isQuest = sticker.unlock_rule === 'quest'

  async function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setBusy(true)
    setError(null)
    const r = await fn()
    setBusy(false)
    if (!r.ok) setError(r.error)
    else onChange()
    return r.ok
  }

  return (
    <li className="admin-card" style={{ listStyle: 'none', display: 'grid', gap: 10, opacity: sticker.is_active ? 1 : 0.55 }}>
      <StickerPreview url={sticker.image_url} alt={sticker.alt_text} category={sticker.quest?.category} />
      <div>
        <div style={{ fontWeight: 800 }}>{sticker.alt_text}</div>
        <div style={{ fontSize: 13, color: theme.textMuted }}>
          {describeUnlock(sticker)}. In {sticker.earned_count ?? 0} {sticker.earned_count === 1 ? 'drawer' : 'drawers'}
          {sticker.is_active ? '' : '. Hidden'}
        </div>
      </div>
      {isQuest ? (
        <p style={{ margin: 0, fontSize: 13, color: theme.textMuted }}>Edit this one on the quest&apos;s page.</p>
      ) : editing ? (
        <form
          style={{ display: 'grid', gap: 10 }}
          onSubmit={async (e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            if (await run(() => updateLibrarySticker(sticker.id, fd))) setEditing(false)
          }}
        >
          <input name="alt" className="admin-input" defaultValue={sticker.alt_text} required minLength={3} maxLength={140} aria-label="Alt text" />
          <UnlockFields badges={badges} initial={sticker} />
          <label style={{ fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" name="is_active" value="1" defaultChecked={sticker.is_active} />
            Showing in the app
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={busy}>Save</button>
            <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setEditing(true)}>Edit</button>
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            disabled={busy}
            onClick={() => {
              if (window.confirm('Delete this sticker? It leaves every drawer and page.')) {
                void run(() => deleteLibrarySticker(sticker.id))
              }
            }}
          >
            Delete
          </button>
        </div>
      )}
      {!isQuest ? (
        <form
          style={{ display: 'flex', gap: 8 }}
          onSubmit={async (e) => {
            e.preventDefault()
            if (await run(() => grantSticker(sticker.id, grantTo))) setGrantTo('')
          }}
        >
          <input className="admin-input" placeholder="Give to username" aria-label="Give to username" value={grantTo} onChange={(e) => setGrantTo(e.target.value)} />
          <button type="submit" className="admin-btn admin-btn-ghost" disabled={busy || !grantTo.trim()}>Give</button>
        </form>
      ) : null}
      {error ? <p role="alert" style={{ margin: 0, fontSize: 13, color: theme.danger }}>{error}</p> : null}
    </li>
  )
}

export default function StickersPage() {
  const [library, setLibrary] = useState<StickerLibrary | null>(null)
  const load = useCallback(() => {
    getStickerLibrary().then(setLibrary).catch(() => setLibrary({ stickers: [], badges: [], missingMigration: false }))
  }, [])
  useEffect(load, [load])

  const questCount = library?.stickers.filter((s) => s.unlock_rule === 'quest').length ?? 0
  const libraryCount = (library?.stickers.length ?? 0) - questCount

  return (
    <div>
      <h1 className="admin-page-title">Stickers</h1>
      <p className="admin-page-sub">
        {library ? `${questCount} quest stickers, ${libraryCount} in the library.` : 'Loading…'} Players earn a
        quest&apos;s sticker by verifying it, then place stickers on their page.
      </p>
      {library?.missingMigration ? (
        <p role="alert" className="admin-card" style={{ color: theme.danger }}>
          This database has no sticker tables yet. Migration 041 needs applying (with the founder) before the
          library works.
        </p>
      ) : null}
      {library ? (
        <div style={{ display: 'grid', gap: 24 }}>
          <NewStickerForm badges={library.badges} onDone={load} />
          <ul style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', padding: 0, margin: 0 }}>
            {library.stickers.map((s) => (
              <StickerCard key={s.id} sticker={s} badges={library.badges} onChange={load} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
