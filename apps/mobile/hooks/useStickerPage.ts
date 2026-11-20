import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  MAX_PLACEMENTS,
  drawerEntries,
  normalizePlacement,
  randomTilt,
  topZ,
  visiblePlacements,
  type DrawerEntry,
  type EarnedSticker,
  type Placement,
  type StickerRecord,
} from '@/lib/stickerBoard'

/**
 * A player's sticker page (migration 041): their board placements, and for the
 * owner, the drawer of earned and not-yet-earned stickers.
 *
 * `unavailable` means the database has no sticker tables yet (041 not applied)
 * or the page is not visible to this viewer; callers render nothing then.
 */
export type StickerPageStatus = 'loading' | 'ready' | 'unavailable' | 'error'

const STICKER_COLUMNS = 'id, quest_id, image_url, alt_text, unlock_rule, unlock_hint, is_active'
const PLACEMENT_COLUMNS = 'id, sticker_id, x, y, tilt, scale, z, created_at'

function missingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /does not exist|could not find the table/i.test(error.message ?? '')
  )
}

export function useStickerPage(userId: string | null | undefined, owner: boolean) {
  const [status, setStatus] = useState<StickerPageStatus>('loading')
  const [stickers, setStickers] = useState<StickerRecord[]>([])
  const [earned, setEarned] = useState<EarnedSticker[]>([])
  const [placements, setPlacements] = useState<Placement[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const load = useCallback(async () => {
    if (!userId) return
    const placementsQuery = supabase
      .from('sticker_placements')
      .select(PLACEMENT_COLUMNS)
      .eq('user_id', userId)
      .order('z', { ascending: true })
      .limit(MAX_PLACEMENTS)

    if (owner) {
      const [stickerResult, earnedResult, placementResult] = await Promise.all([
        supabase.from('stickers').select(STICKER_COLUMNS).eq('is_active', true).order('created_at').limit(300),
        supabase.from('user_stickers').select('sticker_id, earned_at').eq('user_id', userId),
        placementsQuery,
      ])
      if (!alive.current) return
      const firstError = stickerResult.error ?? earnedResult.error ?? placementResult.error
      if (firstError) {
        setStatus(missingTable(firstError) ? 'unavailable' : 'error')
        return
      }
      setStickers((stickerResult.data ?? []) as StickerRecord[])
      setEarned((earnedResult.data ?? []) as EarnedSticker[])
      setPlacements((placementResult.data ?? []).map((row) => normalizePlacement(row)))
      setStatus('ready')
      return
    }

    // Visitors only need the stickers on the board.
    const placementResult = await placementsQuery
    if (!alive.current) return
    if (placementResult.error) {
      setStatus(missingTable(placementResult.error) ? 'unavailable' : 'error')
      return
    }
    const rows = (placementResult.data ?? []).map((row) => normalizePlacement(row))
    const ids = [...new Set(rows.map((p) => p.sticker_id))]
    let found: StickerRecord[] = []
    if (ids.length) {
      const { data, error } = await supabase.from('stickers').select(STICKER_COLUMNS).in('id', ids)
      if (!alive.current) return
      if (error) {
        setStatus('error')
        return
      }
      found = (data ?? []) as StickerRecord[]
    }
    setStickers(found)
    setPlacements(rows)
    setStatus('ready')
  }, [userId, owner])

  useEffect(() => {
    setStatus('loading')
    void load()
  }, [load])

  const stickersById = useMemo(() => {
    const map: Record<string, StickerRecord> = {}
    for (const s of stickers) map[s.id] = s
    return map
  }, [stickers])

  const board = useMemo(() => visiblePlacements(placements, stickersById), [placements, stickersById])
  const drawer: DrawerEntry[] = useMemo(() => (owner ? drawerEntries(stickers, earned) : []), [owner, stickers, earned])

  /** Put a drawer sticker on the board at a centre fraction. */
  const place = useCallback(
    async (stickerId: string, x: number, y: number): Promise<string | null> => {
      if (!userId || !owner) return null
      if (placements.length >= MAX_PLACEMENTS) {
        setMessage(`Your page holds ${MAX_PLACEMENTS} stickers. Remove one to add another.`)
        return null
      }
      const draft: Placement = {
        id: `local-${Date.now()}`,
        sticker_id: stickerId,
        x,
        y,
        tilt: randomTilt(),
        scale: 1,
        z: topZ(placements),
        created_at: new Date().toISOString(),
      }
      setMessage(null)
      setPlacements((prev) => [...prev, draft])
      const { data, error } = await supabase
        .from('sticker_placements')
        .insert({
          user_id: userId,
          sticker_id: stickerId,
          x: draft.x,
          y: draft.y,
          tilt: draft.tilt,
          scale: draft.scale,
          z: draft.z,
        })
        .select(PLACEMENT_COLUMNS)
        .single()
      if (!alive.current) return null
      if (error || !data) {
        setPlacements((prev) => prev.filter((p) => p.id !== draft.id))
        setMessage(
          /STICKER_BOARD_FULL/.test(error?.message ?? '')
            ? `Your page holds ${MAX_PLACEMENTS} stickers. Remove one to add another.`
            : 'That sticker didn’t stick. Check your signal and try again.',
        )
        return null
      }
      const saved = normalizePlacement(data)
      setPlacements((prev) => prev.map((p) => (p.id === draft.id ? saved : p)))
      return saved.id
    },
    [userId, owner, placements],
  )

  /** Move, tilt or resize a placed sticker. */
  const update = useCallback(
    async (id: string, patch: Partial<Pick<Placement, 'x' | 'y' | 'tilt' | 'scale' | 'z'>>) => {
      if (!owner) return
      let before: Placement | undefined
      setPlacements((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p
          before = p
          return { ...p, ...patch }
        }),
      )
      if (id.startsWith('local-')) return
      const { error } = await supabase.from('sticker_placements').update(patch).eq('id', id)
      if (!alive.current) return
      if (error && before) {
        const restore = before
        setPlacements((prev) => prev.map((p) => (p.id === id ? restore : p)))
        setMessage('That change didn’t save. Try again.')
      }
    },
    [owner],
  )

  const remove = useCallback(
    async (id: string) => {
      if (!owner) return
      let removed: Placement | undefined
      setPlacements((prev) => {
        removed = prev.find((p) => p.id === id)
        return prev.filter((p) => p.id !== id)
      })
      if (id.startsWith('local-')) return
      const { error } = await supabase.from('sticker_placements').delete().eq('id', id)
      if (!alive.current) return
      if (error && removed) {
        const restore = removed
        setPlacements((prev) => [...prev, restore])
        setMessage('That sticker didn’t come off. Try again.')
      }
    },
    [owner],
  )

  return {
    status,
    board,
    drawer,
    stickersById,
    earnedCount: earned.length,
    message,
    clearMessage: () => setMessage(null),
    place,
    update,
    remove,
    refresh: load,
  }
}
