import React from 'react'

/**
 * Compact indigo level indicator pill.
 * Appears on profile header overlay and quest feed header.
 * Never use category colors here — level is an earned/indigo concept.
 */
export function LevelChip({ level, compact = false }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: 'var(--color-accent)',
        color: '#FFFFFF',
        borderRadius: 'var(--radius-pill)',
        padding: compact ? '2px 8px' : '4px 10px',
        fontSize: compact ? '10px' : 'var(--font-size-label-sm)',
        fontWeight: 'var(--font-weight-display)',
        fontFamily: 'var(--font-system)',
        letterSpacing: 'var(--letter-spacing-label)',
        boxShadow: 'var(--shadow-action-glow)',
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      Lv {level}
    </span>
  )
}
