import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@quest/db-types'

export function getSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in apps/admin/.env.local'
    )
  }

  return createBrowserClient<Database>(url, key)
}

export function adminAuthRedirectUrl(path = '/auth/confirm'): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`
  }
  return `http://localhost:3000${path}`
}
