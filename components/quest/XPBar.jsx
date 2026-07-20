import React from 'react'

// Single source: apps/mobile/lib/xpLevels.js (_ds_bundle.js may still embed a generated copy)
const { XP_LEVELS, getLevelFromXp } = require('../../apps/mobile/lib/xpLevels.js')

/**
 * Signature XP progress bar.
 * White glass card, Local Signal fill with violet blend on right 35%, glass sheen strip.
 * Level markers below track. XP fraction in Mist.
 */
export function XPBar({ totalXp = 750 }) {
  const level        = getLevelFromXp(totalXp)
  const curLevelXp   = XP_LEVELS.find((l) => l.level === level)?.minXp ?? 0
  const nextLevelEntry = XP_LEVELS.find((l) => l.level === level + 1)
  const isMaxLevel   = !nextLevelEntry
  const nextLevelXp  = nextLevelEntry?.minXp ?? curLevelXp + 1
  const progress     = isMaxLevel ? 1 : (totalXp - curLevelXp) / (nextLevelXp - curLevelXp)
  const fillPct      = `${Math.min(Math.max(progress * 100, 2), 100)}%`
  const xpLabel      = isMaxLevel
    ? 'Max level'
    : `${totalXp.toLocaleString()} / ${nextLevelXp.toLocaleString()} XP`

  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-lg)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 'var(--space-md)',
        }}
      >
        <span
          style={{
            color: 'var(--color-text-primary)',
            fontWeight: 800,
            fontSize: 15,
            fontFamily: 'var(--font-system)',
          }}
        >
          Level {level}
        </span>
        <span
          style={{
            color: 'var(--color-text-muted)',
            fontSize: 13,
            fontFamily: 'var(--font-system)',
          }}
        >
          {xpLabel}
        </span>
      </div>

      {/* Track */}
      <div
        style={{
          height: 12,
          backgroundColor: 'var(--color-surface-elevated)',
          borderRadius: 'var(--radius-pill)',
          overflow: 'hidden',
          border: '1px solid var(--color-border)',
          position: 'relative',
        }}
      >
        {/* Fill */}
        <div
          style={{
            height: '100%',
            width: fillPct,
            backgroundColor: 'var(--color-accent)',
            borderRadius: 'var(--radius-pill)',
            position: 'relative',
            overflow: 'hidden',
            transition: 'width 600ms ease-out',
          }}
        >
          {/* Violet right-side blend — fakes gradient without expo-linear-gradient */}
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: '35%',
              backgroundColor: '#8B5CF6',
              opacity: 0.55,
            }}
          />
          {/* Top glass sheen — white highlight strip */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '50%',
              backgroundColor: '#FFFFFF',
              opacity: 0.28,
            }}
          />
        </div>
      </div>

      {/* Level markers */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 'var(--space-xs)',
        }}
      >
        <span
          style={{
            color: 'var(--color-text-muted)',
            fontSize: 11,
            fontWeight: 600,
            fontFamily: 'var(--font-system)',
          }}
        >
          Lv {level}
        </span>
        {!isMaxLevel && (
          <span
            style={{
              color: 'var(--color-text-muted)',
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'var(--font-system)',
            }}
          >
            Lv {level + 1}
          </span>
        )}
      </div>
    </div>
  )
}
