import type React from 'react'

/**
 * Primary interactive control for all user actions — CTA, form submit, navigation trigger.
 *
 * @startingPoint section="Core Components" subtitle="Primary, ghost & link variants" viewport="700x180"
 */
export interface ButtonProps {
  /** Button text — use `label` for strings, `children` for JSX */
  label?: string
  children?: React.ReactNode
  /** Visual style variant */
  variant?: 'primary' | 'ghost' | 'link'
  /** Size — md (default 14px pad) or sm (8px pad) */
  size?: 'sm' | 'md'
  /** 40% opacity, non-interactive. Never hide from DOM. */
  disabled?: boolean
  /** Stretch to fill container — use in auth screens and modals */
  fullWidth?: boolean
  onClick?: () => void
}
