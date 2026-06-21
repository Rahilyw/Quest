import type React from 'react'

/**
 * Text input field — Glass White background, no visible border at rest, indigo focus ring.
 * Matches the quest app's auth form inputs.
 */
export interface InputProps {
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: 'text' | 'email' | 'password' | 'number' | 'search'
  /** Optional label rendered above the field */
  label?: string
  /** Error message rendered below the field in orange-600 */
  error?: string
  disabled?: boolean
}
