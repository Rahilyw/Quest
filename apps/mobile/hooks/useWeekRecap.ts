import { useCallback, useEffect, useRef, useState } from 'react'
import { Image } from 'react-native'
import { partsInZone } from '@quest/geofence'
import { supabase } from '@/lib/supabase'
import { normalizeRecap, recapWeekFor, type RecapWeek, type WeekRecap } from '@/lib/recapWeek'

/** The recap week for "now" in Victoria. See lib/recapWeek.js for the policy. */
export function currentRecapWeek(now: Date = new Date()): RecapWeek {
  return recapWeekFor(partsInZone(now))
}

export interface WeekRecapState {
  week: RecapWeek
  recap: WeekRecap | null
  loading: boolean
  failed: boolean
  /**
   * null while the photo is still being fetched, then whether it can be drawn.
   * A photo that fails to load is treated as no photo, never as an error.
   */
  photoReady: boolean | null
  reload: () => void
}

/**
 * Loads the signed-in player's recap through `own_week_recap` (migration 040).
 * The function returns only the caller's own numbers and photo, so nothing
 * about another player reaches the device.
 */
export function useWeekRecap(userId: string | undefined): WeekRecapState {
  const [week, setWeek] = useState<RecapWeek>(() => currentRecapWeek())
  const [recap, setRecap] = useState<WeekRecap | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [photoReady, setPhotoReady] = useState<boolean | null>(null)
  const request = useRef(0)

  const load = useCallback(async () => {
    if (!userId) return
    const id = ++request.current
    // Recompute on every load so a screen left open across midnight asks for the right week.
    const target = currentRecapWeek()
    setWeek(target)
    setLoading(true)
    setFailed(false)
    setPhotoReady(null)

    let next: WeekRecap | null = null
    try {
      const { data, error } = await supabase.rpc('own_week_recap', { p_week_start: target.weekStart })
      if (!error) next = normalizeRecap(data, target.weekStart)
    } catch {
      next = null
    }
    if (id !== request.current) return

    if (!next) {
      setRecap(null)
      setFailed(true)
      setLoading(false)
      return
    }

    setRecap(next)
    setLoading(false)

    if (!next.photo) {
      setPhotoReady(false)
      return
    }
    const ok = await Image.prefetch(next.photo.url).catch(() => false)
    if (id === request.current) setPhotoReady(ok === true)
  }, [userId])

  useEffect(() => {
    void load()
    return () => {
      request.current += 1
    }
  }, [load])

  return { week, recap, loading, failed, photoReady, reload: () => void load() }
}
