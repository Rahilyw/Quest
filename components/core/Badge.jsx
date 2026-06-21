import React from 'react'

const CATEGORY_COLORS = {
  fitness:   '#16A34A',
  social:    '#9333EA',
  food:      '#EA580C',
  community: '#2563EB',
  nature:    '#0891B2',
}

const CATEGORY_SOFT = {
  fitness:   '#DCFCE7',
  social:    '#F3E8FF',
  food:      '#FFEDD5',
  community: '#DBEAFE',
  nature:    '#CFFAFE',
}

/**
 * Compact label pill for category identification, sponsor tags, and status chips.
 * XP values in category color (not indigo) on quest cards — reward state, not earned.
 */
export function Badge({ label, variant = 'category', category, icon }) {
  const catColor = category ? (CATEGORY_COLORS[category] ?? 'var(--color-text-secondary)') : 'var(--color-text-secondary)'
  const catSoft  = category ? (CATEGORY_SOFT[category]  ?? 'var(--color-surface-elevated)') : 'var(--color-surface-elevated)'

  const variants = {
    category: { bg: catSoft,                        color: catColor,                        border: undefined },
    sponsor:  { bg: 'var(--color-bg-warm)',          color: 'var(--color-sponsor)',          border: '1px solid #FDBA74' },
    accent:   { bg: 'var(--color-accent-soft)',      color: 'var(--color-accent-text)',      border: undefined },
    muted:    { bg: 'var(--color-surface-elevated)', color: 'var(--color-text-muted)',       border: '1px solid var(--color-border)' },
    success:  { bg: '#F0FDF4',                       color: 'var(--color-success)',          border: undefined },
    warning:  { bg: '#FFFBEB',                       color: 'var(--color-warning)',          border: undefined },
  }

  const s = variants[variant] ?? variants.category

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        borderRadius: 'var(--radius-pill)',
        padding: '3px 10px',
        fontSize: 'var(--font-size-label-sm)',
        fontWeight: 'var(--font-weight-label)',
        fontFamily: 'var(--font-system)',
        letterSpacing: 'var(--letter-spacing-label)',
        backgroundColor: s.bg,
        color: s.color,
        border: s.border ?? undefined,
        whiteSpace: 'nowrap',
        lineHeight: 'var(--line-height-label)',
        textTransform: 'capitalize',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {icon && <span style={{ fontSize: '10px' }}>{icon}</span>}
      {label}
    </span>
  )
}
