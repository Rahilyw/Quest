import { useEffect, useState } from 'react'
import { interpretDuoProbeError, probeDuoAvailable } from '@/lib/duoAvailable'
import { supabase } from '@/lib/supabase'

/** Process-lifetime cache so every screen shares one probe. */
let cached: boolean | null = null
let inflight: Promise<boolean> | null = null

async function resolveDuoAvailable(): Promise<boolean> {
  if (cached !== null) return cached
  if (!inflight) {
    inflight = probeDuoAvailable(supabase)
      .then((ok) => {
        cached = ok
        return ok
      })
      .catch(() => {
        cached = false
        return false
      })
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

/** Test helper: reset the process cache between Node assertions. */
export function __resetDuoAvailableCacheForTests(): void {
  cached = null
  inflight = null
}

/** Test helper: seed the cache without hitting the network. */
export function __setDuoAvailableForTests(value: boolean | null): void {
  cached = value
  inflight = null
}

/**
 * Probes once for `quests.min_party_size`. Until the probe finishes,
 * `available` is false so duo UI and party RPCs stay dark.
 */
export function useDuoAvailable(): { available: boolean; loading: boolean } {
  const [available, setAvailable] = useState(cached === true)
  const [loading, setLoading] = useState(cached === null)

  useEffect(() => {
    let cancelled = false
    if (cached !== null) {
      setAvailable(cached)
      setLoading(false)
      return
    }
    setLoading(true)
    void resolveDuoAvailable().then((ok) => {
      if (cancelled) return
      setAvailable(ok)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { available, loading }
}

/**
 * Awaitable guard for non-hook call sites (submit celebration, party RPCs).
 * Returns false when 045 is absent or the probe fails.
 */
export async function ensureDuoAvailable(): Promise<boolean> {
  return resolveDuoAvailable()
}

export { interpretDuoProbeError, probeDuoAvailable }
