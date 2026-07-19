'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import { theme } from '@/lib/theme'
import { COVER_ASPECT, getCroppedCoverFile } from '@/lib/cropImage'

export type CoverPickerValue = {
  /** New cropped file to upload, or null if unchanged / removed */
  file: File | null
  /** Local preview URL for the chosen (or existing) cover */
  previewUrl: string | null
  /** True when user cleared an existing cover without replacing it */
  remove: boolean
}

type Props = {
  /** Existing public cover URL from the quest */
  currentUrl?: string | null
  onChange: (value: CoverPickerValue) => void
  /** Shorter preview height for the inline edit form */
  compact?: boolean
}

export default function QuestCoverPicker({ currentUrl = null, onChange, compact = false }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl)
  const [remove, setRemove] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  // Crop modal state
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [cropping, setCropping] = useState(false)
  const [cropError, setCropError] = useState<string | null>(null)

  useEffect(() => {
    setPreviewUrl(currentUrl)
    setRemove(false)
    setFile(null)
  }, [currentUrl])

  function emit(next: { file: File | null; previewUrl: string | null; remove: boolean }) {
    setFile(next.file)
    setPreviewUrl(next.previewUrl)
    setRemove(next.remove)
    onChange(next)
  }

  function openPicker() {
    fileRef.current?.click()
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    e.target.value = ''
    if (!selected) return
    if (!selected.type.startsWith('image/')) {
      setCropError('Please choose a JPEG, PNG, or WebP image.')
      return
    }
    setCropError(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    setCropSrc(URL.createObjectURL(selected))
  }

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  async function confirmCrop() {
    if (!cropSrc || !croppedAreaPixels) return
    setCropping(true)
    setCropError(null)
    try {
      const cropped = await getCroppedCoverFile(cropSrc, croppedAreaPixels)
      const url = URL.createObjectURL(cropped)
      URL.revokeObjectURL(cropSrc)
      setCropSrc(null)
      emit({ file: cropped, previewUrl: url, remove: false })
    } catch (err) {
      setCropError(err instanceof Error ? err.message : 'Crop failed.')
    } finally {
      setCropping(false)
    }
  }

  function cancelCrop() {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
    setCropError(null)
  }

  function handleRemove() {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl)
    }
    emit({ file: null, previewUrl: null, remove: true })
  }

  const previewHeight = compact ? 160 : 200
  const hasImage = Boolean(previewUrl)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, gap: 12 }}>
        <div>
          <p style={{ margin: 0, fontWeight: 800, fontSize: compact ? 12 : 16, color: compact ? theme.textMuted : theme.text, textTransform: compact ? 'uppercase' : undefined, letterSpacing: compact ? '0.05em' : undefined }}>
            Cover photo
          </p>
          <p style={{ margin: '4px 0 0', color: theme.textMuted, fontSize: 12 }}>
            Cropped to 16:10 for Explore and quest detail.
          </p>
        </div>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={openPicker}
        onKeyDown={(ev) => ev.key === 'Enter' && openPicker()}
        style={{
          height: previewHeight,
          borderRadius: 14,
          border: `2px dashed ${theme.border}`,
          background: hasImage ? `url(${previewUrl}) center/cover` : theme.primarySoft,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.textMuted,
          fontSize: 14,
          fontWeight: 600,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {!hasImage && 'Click to add cover image'}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={openPicker} style={{ fontSize: 12 }}>
          {hasImage ? 'Change photo' : 'Add photo'}
        </button>
        {hasImage && (
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            onClick={handleRemove}
            style={{ fontSize: 12, color: theme.danger }}
          >
            Remove
          </button>
        )}
        {file && (
          <span style={{ fontSize: 12, color: theme.success, alignSelf: 'center', fontWeight: 600 }}>
            New crop ready — save to apply
          </span>
        )}
        {remove && !file && (
          <span style={{ fontSize: 12, color: theme.warning, alignSelf: 'center', fontWeight: 600 }}>
            Cover will be removed on save
          </span>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelected}
        style={{ display: 'none' }}
      />

      {cropError && !cropSrc && (
        <p style={{ margin: '8px 0 0', color: theme.danger, fontSize: 12 }}>{cropError}</p>
      )}

      {cropSrc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Crop cover photo"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              width: 'min(640px, 100%)',
              background: theme.surface,
              borderRadius: 16,
              border: `1px solid ${theme.border}`,
              padding: 20,
              boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
            }}
          >
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800 }}>Crop cover</h3>
            <p style={{ margin: '0 0 14px', color: theme.textMuted, fontSize: 13 }}>
              Drag to frame the shot. Aspect ratio is locked to 16:10.
            </p>

            <div
              style={{
                position: 'relative',
                width: '100%',
                height: 320,
                borderRadius: 12,
                overflow: 'hidden',
                background: '#000',
              }}
            >
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={COVER_ASPECT}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                objectFit="contain"
              />
            </div>

            <div style={{ marginTop: 14 }}>
              <label className="admin-label" htmlFor="cover-zoom" style={{ marginBottom: 6, display: 'block' }}>
                Zoom
              </label>
              <input
                id="cover-zoom"
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                style={{ width: '100%', accentColor: theme.primary }}
              />
            </div>

            {cropError && (
              <p style={{ margin: '10px 0 0', color: theme.danger, fontSize: 12 }}>{cropError}</p>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={confirmCrop}
                disabled={cropping || !croppedAreaPixels}
                style={{ flex: 1, fontSize: 13 }}
              >
                {cropping ? 'Cropping…' : 'Use this crop'}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                onClick={cancelCrop}
                disabled={cropping}
                style={{ flex: 1, fontSize: 13 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
