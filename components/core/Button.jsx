import React, { useState } from 'react'

/**
 * Primary interactive control for all user actions.
 * Variants: primary (Local Signal + glow), ghost (transparent border), link (text only).
 * Disabled state uses 40% opacity — never hide or remove from DOM.
 */
export function Button({
  label,
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  fullWidth = false,
  onClick,
}) {
  const [hovered, setHovered] = useState(false)
  const text = label ?? children

  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-system)',
    fontWeight: 'var(--font-weight-label)',
    fontSize: size === 'sm' ? 'var(--font-size-label)' : 'var(--font-size-body)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : hovered ? 0.9 : 1,
    border: 'none',
    outline: 'none',
    transition: 'opacity 150ms ease',
    width: fullWidth ? '100%' : 'auto',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    textDecoration: 'none',
    padding: size === 'sm' ? '8px 16px' : '14px 24px',
    letterSpacing: '0.01em',
    lineHeight: 'var(--line-height-label)',
    boxSizing: 'border-box',
  }

  const variants = {
    primary: {
      backgroundColor: 'var(--color-accent)',
      color: '#FFFFFF',
      boxShadow: 'var(--shadow-action-glow)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--color-text-secondary)',
      border: '1.5px solid var(--color-border-strong)',
    },
    link: {
      backgroundColor: 'transparent',
      color: 'var(--color-accent)',
      padding: size === 'sm' ? '4px 0' : '8px 0',
      boxShadow: 'none',
    },
  }

  return (
    <button
      style={{ ...base, ...(variants[variant] ?? variants.primary) }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {text}
    </button>
  )
}
