'use client'

import { useRef, useState } from 'react'
import { setQuestCutout } from '@/app/quests/actions'
import { theme } from '@/lib/theme'

const CATEGORY_SWATCHES = Object.entries(theme.categories).map(([key, c]) => ({ key, label: c.label, color: c.color }))

export default function QuestCutoutUploader({
  questId,
  category,
  initialUrl,
  onChange,
}: {
  questId: string
  category: string
  initialUrl: string | null | undefined
  onChange?: (url: string | null) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState<string | null>(initialUrl ?? null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function apply(file: File | null) {
    setBusy(true)
    setMessage(null)
    const result = await setQuestCutout(questId, file)
    setBusy(false)
    if (input.current) input.current.value = ''
    if (!result.ok) {
      setMessage(result.error)
      return
    }
    setUrl(result.cutout_url)
    onChange?.(result.cutout_url)
    setMessage(result.cutout_url ? 'Cutout saved.' : 'Cutout removed. The category default shows instead.')
  }

  return (
    <div>
      <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Cutout</label>
      <p style={{ opacity: 0.7, fontSize: 13, margin: '0 0 8px' }}>
        Transparent WebP from <code>scripts/make-cutout.js</code>. Saves immediately.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        {CATEGORY_SWATCHES.map((c) => (
          <div
            key={c.key}
            style={{
              width: 96,
              height: 96,
              borderRadius: 10,
              background: c.color,
              display: 'grid',
              placeItems: 'center',
              outline: c.key === category ? '2px solid currentColor' : 'none',
              outlineOffset: 2,
            }}
            title={c.label}
          >
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={`${c.label} preview`} style={{ maxWidth: '80%', maxHeight: '80%' }} />
            ) : (
              <span style={{ fontSize: 11, color: theme.text }}>No cutout</span>
            )}
          </div>
        ))}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/webp"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void apply(f)
        }}
      />
      {url ? (
        <button type="button" disabled={busy} onClick={() => void apply(null)} style={{ marginLeft: 8 }}>
          Remove
        </button>
      ) : null}
      {message ? <p role="status" style={{ fontSize: 13, marginTop: 6 }}>{message}</p> : null}
    </div>
  )
}
