import React, { useState } from 'react'

/**
 * Filter chip for quest category selection.
 * Inactive = frosted glass pill. Active = Local Signal fill with Action Glow.
 * Shows emoji + label. Color lives on the quest card, NOT the chip.
 */
export function CategoryChip({ label, active = false, count, onClick }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        borderRadius: 'var(--radius-pill)',
        padding: '8px 16px',
        fontSize: 'var(--font-size-label)',
        fontWeight: 600,
        fontFamily: 'var(--font-system)',
        cursor: 'pointer',
        border: '1.5px solid',
        transition: 'all 150ms ease',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        outline: 'none',
        lineHeight: 1,
        // Active vs inactive
        backgroundColor: active ? 'var(--color-accent)' : 'var(--color-surface)',
        borderColor:     active ? 'var(--color-accent)' : 'var(--color-border)',
        color:           active ? '#FFFFFF' : 'var(--color-text-secondary)',
        boxShadow:       active
          ? 'var(--shadow-action-glow)'
          : 'var(--shadow-sm)',
        opacity: hovered && !active ? 0.85 : 1,
      }}
    >
      {label}
      {count !== undefined && (
        <span style={{ opacity: 0.75, marginLeft: '2px' }}>{count}</span>
      )}
    </button>
  )
}
