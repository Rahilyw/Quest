import React, { useState } from 'react'

/**
 * Text input field — Glass White surface, subtle border at rest, indigo focus ring.
 */
export function Input({ placeholder, value, onChange, type = 'text', label, error, disabled = false }) {
  const [focused, setFocused] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', width: '100%' }}>
      {label && (
        <label
          style={{
            fontSize: 'var(--font-size-label)',
            fontWeight: 'var(--font-weight-label)',
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-system)',
            lineHeight: 'var(--line-height-label)',
          }}
        >
          {label}
        </label>
      )}

      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text-primary)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          fontSize: 'var(--font-size-body)',
          fontFamily: 'var(--font-system)',
          border: focused
            ? '1.5px solid var(--color-accent)'
            : '1.5px solid var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
          outline: 'none',
          width: '100%',
          boxSizing: 'border-box',
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : 'text',
          transition: 'border-color 150ms ease',
          lineHeight: 'var(--line-height-body)',
        }}
      />

      {error && (
        <span
          style={{
            fontSize: 'var(--font-size-label-sm)',
            color: 'var(--color-sponsor)',
            fontFamily: 'var(--font-system)',
            lineHeight: 1.4,
          }}
        >
          {error}
        </span>
      )}
    </div>
  )
}
