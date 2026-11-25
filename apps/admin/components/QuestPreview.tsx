'use client'

import { theme } from '@/lib/theme'

export type QuestPreviewProps = {
  title: string
  category: string
  /** Real sticker URL only. Null/empty → no sticker (never a sprite). */
  cutoutUrl?: string | null
  xpReward?: number | null
}

/**
 * Read-only live preview of how the quest reads as a Quests folder tile and a
 * City feed bubble (BRAND.md §6 / UI plan Phase 6). No server actions.
 */
export default function QuestPreview({
  title,
  category,
  cutoutUrl = null,
  xpReward = null,
}: QuestPreviewProps) {
  const cat = theme.categories[category] ?? theme.categories.fitness
  const label = title.trim() || 'Untitled quest'
  const sticker = cutoutUrl && cutoutUrl.length > 0 ? cutoutUrl : null
  const xp = typeof xpReward === 'number' && Number.isFinite(xpReward) ? xpReward : null

  return (
    <section
      aria-label="App preview"
      style={{
        marginTop: 24,
        padding: 16,
        borderRadius: theme.radius.lg,
        border: `1px solid ${theme.border}`,
        background: theme.bg,
      }}
    >
      <h2 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 800, color: theme.text }}>
        App preview
      </h2>
      <p style={{ margin: '0 0 16px', fontSize: 12, color: theme.textMuted }}>
        How this quest shows in the Quests folder and as a City bubble. Read-only.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {/* Folder tile */}
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: theme.textMuted }}>
            Quests folder
          </p>
          <div
            aria-label={`${cat.label} folder preview for ${label}`}
            style={{ position: 'relative', width: 168, height: 140 }}
          >
            <div
              style={{
                position: 'absolute',
                top: 22,
                left: 0,
                right: 8,
                bottom: 0,
                borderRadius: 10,
                background: cat.deep,
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 10,
                width: 56,
                height: 26,
                borderRadius: '10px 10px 0 0',
                background: cat.deep,
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 28,
                left: 6,
                right: 0,
                bottom: 0,
                borderRadius: 10,
                background: cat.color,
                color: cat.onColor,
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                boxShadow: '0 10px 24px -14px rgba(60,40,20,0.3)',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.2 }}>{cat.label}</span>
              <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.9, lineHeight: 1.25 }}>
                {label}
              </span>
              {xp != null ? (
                <span style={{ fontSize: 11, fontWeight: 700, marginTop: 'auto' }}>{xp} XP</span>
              ) : null}
            </div>
            {sticker ? (
              // eslint-disable-next-line @next/next/no-img-element -- admin preview of uploaded sticker
              <img
                src={sticker}
                alt=""
                style={{
                  position: 'absolute',
                  right: -4,
                  bottom: -6,
                  width: 64,
                  height: 64,
                  objectFit: 'contain',
                  transform: 'rotate(7deg)',
                  filter: 'drop-shadow(0 4px 8px rgba(28,25,21,0.25))',
                  pointerEvents: 'none',
                }}
              />
            ) : null}
          </div>
          {!sticker ? (
            <p style={{ margin: '10px 0 0', fontSize: 11, color: theme.textMuted }}>
              No sticker yet.
            </p>
          ) : null}
        </div>

        {/* City bubble */}
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: theme.textMuted }}>
            City bubble
          </p>
          <div
            aria-label={`City bubble preview for ${label}`}
            style={{
              maxWidth: 280,
              borderRadius: 30,
              background: cat.color,
              color: cat.onColor,
              padding: '14px 16px 16px',
              boxShadow: '0 10px 24px -14px rgba(60,40,20,0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800 }}>@player</span>
              <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.85 }}>{cat.label}</span>
            </div>
            <div
              style={{
                width: '100%',
                aspectRatio: '1',
                borderRadius: 18,
                background: theme.bgElevated,
                border: `2px solid ${theme.bgElevated}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 10,
                position: 'relative',
              }}
            >
              <span style={{ fontSize: 12, color: theme.textMuted }}>Proof photo</span>
              {sticker ? (
                // eslint-disable-next-line @next/next/no-img-element -- real sticker only
                <img
                  src={sticker}
                  alt=""
                  style={{
                    position: 'absolute',
                    right: 8,
                    bottom: 8,
                    width: 48,
                    height: 48,
                    objectFit: 'contain',
                    transform: 'rotate(-6deg)',
                    filter: 'drop-shadow(0 3px 6px rgba(28,25,21,0.28))',
                    pointerEvents: 'none',
                  }}
                />
              ) : null}
            </div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>{label}</p>
            {xp != null ? (
              <p style={{ margin: '6px 0 0', fontSize: 12, fontWeight: 600, opacity: 0.9 }}>
                {xp} XP
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
