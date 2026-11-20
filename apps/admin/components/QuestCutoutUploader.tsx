'use client'

import { useId, useRef, useState } from 'react'
import { setQuestSticker } from '@/app/quests/actions'
import { prepareStickerPhoto, STICKER_ACCEPT } from '@/lib/sticker-client'
import { theme } from '@/lib/theme'
import StickerPreview from '@/components/StickerPreview'

/**
 * The quest's sticker (BRAND.md §6). The admin uploads a real photo of the
 * quest's object; the server cuts it out, adds the white die-cut edge and the
 * shadow, and saves it on the quest. Alt text is required.
 */
export default function QuestCutoutUploader({
  questId,
  category,
  questTitle,
  initialUrl,
  initialAlt,
  onChange,
}: {
  questId: string
  category: string
  questTitle?: string
  initialUrl: string | null | undefined
  initialAlt?: string | null
  onChange?: (url: string | null) => void
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState<string | null>(initialUrl ?? null)
  const [alt, setAlt] = useState(initialAlt ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  async function submit(remove = false) {
    setBusy(true)
    setMessage(null)
    try {
      const fd = new FormData()
      fd.set('questId', questId)
      if (remove) {
        fd.set('remove', '1')
      } else {
        fd.set('alt', alt)
        if (file) fd.set('photo', await prepareStickerPhoto(file))
      }
      const result = await setQuestSticker(fd)
      if (!result.ok) {
        setMessage({ tone: 'error', text: result.error })
        return
      }
      setUrl(result.cutout_url)
      setFile(null)
      if (input.current) input.current.value = ''
      onChange?.(result.cutout_url)
      const base = remove
        ? 'Sticker removed. The quest shows no sticker until you add one.'
        : file
          ? 'Sticker saved. Players who verify this quest get it in their drawer.'
          : 'Alt text saved.'
      setMessage({ tone: 'ok', text: [base, ...result.warnings].join(' ') })
    } catch (err) {
      setMessage({ tone: 'error', text: err instanceof Error ? err.message : 'Upload failed.' })
    } finally {
      setBusy(false)
    }
  }

  const altHint = questTitle ? `e.g. "Soft-serve cone, ${questTitle} quest"` : 'e.g. "Soft-serve cone, Beacon Drive-In quest"'
  const canSave = !busy && alt.trim().length >= 3 && (file !== null || (url !== null && alt !== (initialAlt ?? '')))

  return (
    <div>
      <label className="admin-label" htmlFor={`${id}-photo`}>
        Sticker
      </label>
      <p style={{ color: theme.textMuted, fontSize: 13, margin: '0 0 10px', maxWidth: 520 }}>
        Upload a real photo of the quest&apos;s object, taken at the place, on a plain backdrop (or a
        transparent PNG). We cut it out and add the white edge. No stock photos, drawings, AI images
        or brand logos.
      </p>

      <StickerPreview url={url} alt={alt || 'Sticker preview'} category={category} />

      <div style={{ display: 'grid', gap: 10, marginTop: 12, maxWidth: 520 }}>
        <input
          id={`${id}-photo`}
          ref={input}
          type="file"
          accept={STICKER_ACCEPT}
          disabled={busy}
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null)
            setMessage(null)
          }}
        />
        <div>
          <label className="admin-label" htmlFor={`${id}-alt`}>
            Alt text (required)
          </label>
          <input
            id={`${id}-alt`}
            className="admin-input"
            value={alt}
            maxLength={140}
            placeholder={altHint}
            onChange={(e) => setAlt(e.target.value)}
            disabled={busy}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            disabled={!canSave}
            onClick={() => void submit(false)}
          >
            {busy ? 'Making sticker…' : file ? (url ? 'Replace sticker' : 'Make sticker') : 'Save alt text'}
          </button>
          {url ? (
            <button
              type="button"
              className="admin-btn admin-btn-ghost"
              disabled={busy}
              onClick={() => {
                if (window.confirm('Remove this quest’s sticker? It stops showing everywhere in the app, including on players’ pages.')) {
                  void submit(true)
                }
              }}
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>
      {message ? (
        <p
          role={message.tone === 'error' ? 'alert' : 'status'}
          style={{ fontSize: 13, marginTop: 8, color: message.tone === 'error' ? theme.danger : theme.text }}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  )
}
