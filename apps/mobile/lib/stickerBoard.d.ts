export interface StickerRecord {
  id: string
  quest_id: string | null
  image_url: string
  alt_text: string
  unlock_rule: 'quest' | 'badge' | 'season' | 'manual'
  unlock_hint: string | null
  is_active: boolean
}

export interface EarnedSticker {
  sticker_id: string
  earned_at: string | null
}

export interface Placement {
  id: string
  sticker_id: string
  /** Centre, as a fraction of board width. */
  x: number
  /** Centre, as a fraction of board height. */
  y: number
  tilt: number
  scale: number
  z: number
  created_at: string | null
}

export interface DrawerEntry {
  sticker: StickerRecord
  earned: boolean
  earnedAt: string | null
  hint: string | null
}

export declare const TILT_MIN: number
export declare const TILT_MAX: number
export declare const SCALE_MIN: number
export declare const SCALE_MAX: number
export declare const BOARD_STICKER: number
export declare const BOARD_ASPECT: number
export declare const MAX_PLACEMENTS: number
export declare const STICKER_SIZE: { inline: 44; row: 56; drawer: 56; folder: 72; board: 128 }

export declare function clampTilt(t: number): number
export declare function clampScale(s: number): number
export declare function clampFraction(f: number): number
export declare function randomTilt(rand?: () => number): number
export declare function nextTilt(tilt: number): number
export declare function bigger(scale: number): number
export declare function smaller(scale: number): number
export declare function stickerPoints(scale: number, boardWidth: number): number
export declare function toFraction(px: number, py: number, w: number, h: number): { x: number; y: number }
export declare function toPoints(x: number, y: number, w: number, h: number, size: number): { left: number; top: number }
export declare function dragBy(x: number, y: number, dx: number, dy: number, w: number, h: number): { x: number; y: number }
export declare function topZ(placements: { z: number }[]): number
export declare function sortForDrawing<T extends { z: number; created_at?: string | null }>(placements: T[]): T[]
export declare function normalizePlacement(row: Record<string, unknown>): Placement
export declare function visiblePlacements(
  placements: Placement[],
  stickersById: Record<string, StickerRecord | undefined>,
): Placement[]
export declare function drawerEntries(stickers: StickerRecord[], earned: EarnedSticker[]): DrawerEntry[]
export declare function defaultDrop(count: number): { x: number; y: number }
