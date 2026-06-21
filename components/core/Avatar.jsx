import React from 'react'

const PALETTES = [
  { bg: '#DCFCE7', fg: '#15803D' }, // fitness green
  { bg: '#F3E8FF', fg: '#7E22CE' }, // social purple
  { bg: '#FFEDD5', fg: '#C2410C' }, // food orange
  { bg: '#DBEAFE', fg: '#1D4ED8' }, // community blue
  { bg: '#CFFAFE', fg: '#0E7490' }, // nature teal
  { bg: '#FEF9C3', fg: '#A16207' }, // amber
  { bg: '#FCE7F3', fg: '#9D174D' }, // pink
]

function hashUsername(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return h
}

/**
 * User avatar — shows photo if provided, falls back to deterministic
 * initial with vivid color derived from username hash.
 */
export function Avatar({ username = '?', src, size = 48 }) {
  const palette = PALETTES[hashUsername(username) % PALETTES.length]
  const initial = (username[0] ?? '?').toUpperCase()

  if (src) {
    return (
      <img
        src={src}
        alt={username}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          display: 'block',
          flexShrink: 0,
        }}
      />
    )
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: palette.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <span
        style={{
          fontSize: Math.round(size * 0.38),
          fontWeight: 800,
          color: palette.fg,
          lineHeight: 1,
          fontFamily: 'var(--font-system)',
        }}
      >
        {initial}
      </span>
    </div>
  )
}
