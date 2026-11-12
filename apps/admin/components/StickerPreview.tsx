'use client'

import { theme } from '@/lib/theme'

/**
 * How a sticker reads in the app: inline on the dark This week screen (44),
 * in a row on paper (56), and on a page board (128) on the category colour.
 */
export default function StickerPreview({
  url,
  alt,
  category,
}: {
  url: string | null
  alt: string
  category?: string
}) {
  const cat = category ? theme.categories[category] : undefined
  const tiles: { size: number; bg: string; label: string; tilt: number }[] = [
    { size: 44, bg: theme.text, label: 'This week', tilt: -6 },
    { size: 56, bg: theme.bg, label: 'Row', tilt: 0 },
    { size: 128, bg: cat?.color ?? '#EDE6DC', label: cat ? cat.label : 'Page', tilt: 5 },
  ]
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      {tiles.map((t) => (
        <figure key={t.label} style={{ margin: 0, textAlign: 'center' }}>
          <div
            style={{
              width: t.size + 32,
              height: t.size + 32,
              borderRadius: 14,
              background: t.bg,
              border: `1px solid ${theme.border}`,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt={t.size === 128 ? alt : ''}
                style={{ width: t.size, height: t.size, objectFit: 'contain', transform: `rotate(${t.tilt}deg)` }}
              />
            ) : (
              <span style={{ fontSize: 12, color: t.bg === theme.text ? theme.bg : theme.textMuted }}>None</span>
            )}
          </div>
          <figcaption style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>{t.label}</figcaption>
        </figure>
      ))}
    </div>
  )
}
