/**
 * Selfies are private (bucket `proof-selfies`). The completion row stores a
 * storage path; we sign it with the viewer's own session. Storage RLS
 * (migration 033) refuses anyone who may not see the completion, so a failure
 * here just means "no selfie" and never blocks the place photo.
 */

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const TTL_SECONDS = 300
const REFRESH_MARGIN_MS = 30_000
const cache = new Map<string, { url: string; expires: number }>()

/** Bare storage paths only. Anything already a URL is not a private path. */
function isStoragePath(value: string | null | undefined): value is string {
  return !!value && !/^[a-z][a-z0-9+.-]*:/i.test(value.trim())
}

export async function signSelfiePath(path: string | null | undefined): Promise<string | null> {
  if (!isStoragePath(path)) return null
  const hit = cache.get(path)
  if (hit && hit.expires - REFRESH_MARGIN_MS > Date.now()) return hit.url
  try {
    const { data, error } = await supabase.storage
      .from('proof-selfies')
      .createSignedUrl(path, TTL_SECONDS)
    if (error || !data?.signedUrl) return null
    cache.set(path, { url: data.signedUrl, expires: Date.now() + TTL_SECONDS * 1000 })
    return data.signedUrl
  } catch {
    return null
  }
}

/** Signed URL for a selfie path, or null while loading, if absent, or on failure. */
export function useSignedSelfie(path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    setUrl(null)
    void signSelfiePath(path).then((u) => {
      if (live) setUrl(u)
    })
    return () => {
      live = false
    }
  }, [path])
  return url
}

export function clearSelfieCache() {
  cache.clear()
}
