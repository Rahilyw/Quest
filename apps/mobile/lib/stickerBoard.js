'use strict'

/**
 * Sticker board rules (BRAND.md §6 Placement, §7 "Your page"; migration 041).
 * Plain JS with no imports so __tests__/stickerBoard.test.js runs in Node.
 *
 * Placements are stored as fractions of the board (x, y = the sticker's
 * centre), so a page looks the same on every phone. Tilt is -12..12 degrees,
 * scale 0.6..1.6 of the 128pt board size, z orders the stack (higher on top).
 */

const TILT_MIN = -12
const TILT_MAX = 12
const SCALE_MIN = 0.6
const SCALE_MAX = 1.6
const SCALE_STEP = 0.2
const TILT_STEP = 6
const BOARD_STICKER = 128
/** Board height as a multiple of its width. */
const BOARD_ASPECT = 1.15
const MAX_PLACEMENTS = 60

/** Sizes a sticker is drawn at, in points (BRAND.md §6 Placement). */
const STICKER_SIZE = { inline: 44, row: 56, drawer: 56, folder: 72, board: BOARD_STICKER }

function clamp(n, lo, hi) {
  if (typeof n !== 'number' || Number.isNaN(n)) return lo
  return n < lo ? lo : n > hi ? hi : n
}

const clampTilt = (t) => Math.round(clamp(t, TILT_MIN, TILT_MAX) * 10) / 10
const clampScale = (s) => Math.round(clamp(s, SCALE_MIN, SCALE_MAX) * 100) / 100
const clampFraction = (f) => Math.round(clamp(f, 0, 1) * 10000) / 10000

/** A fresh tilt for a newly placed sticker, from -8..8 so it reads as hand-placed. */
function randomTilt(rand) {
  const r = typeof rand === 'function' ? rand() : Math.random()
  return clampTilt(Math.round((r * 16 - 8) * 10) / 10)
}

/** Next tilt in the Tilt button's cycle: 0 → 6 → 12 → -12 → -6 → 0. */
function nextTilt(tilt) {
  const t = clampTilt(tilt)
  if (t >= TILT_MAX) return TILT_MIN
  return clampTilt(Math.floor(t / TILT_STEP) * TILT_STEP + TILT_STEP)
}

const bigger = (scale) => clampScale(clampScale(scale) + SCALE_STEP)
const smaller = (scale) => clampScale(clampScale(scale) - SCALE_STEP)

/** Point size of a placed sticker on a board `boardWidth` wide. */
function stickerPoints(scale, boardWidth) {
  // Stickers keep their 128pt size on phone-width boards and shrink on very
  // narrow ones, so a full board still fits a small screen.
  const base = Math.min(BOARD_STICKER, boardWidth * 0.36)
  return Math.round(base * clampScale(scale))
}

/** Convert a touch at (px, py) on a board w × h into a stored centre fraction. */
function toFraction(px, py, w, h) {
  return { x: clampFraction(w > 0 ? px / w : 0.5), y: clampFraction(h > 0 ? py / h : 0.5) }
}

/** Convert a stored centre fraction to the sticker's top-left on a board. */
function toPoints(x, y, w, h, size) {
  return { left: clampFraction(x) * w - size / 2, top: clampFraction(y) * h - size / 2 }
}

/** Move a centre fraction by a drag of (dx, dy) points, staying on the board. */
function dragBy(x, y, dx, dy, w, h) {
  return {
    x: clampFraction(clampFraction(x) + (w > 0 ? dx / w : 0)),
    y: clampFraction(clampFraction(y) + (h > 0 ? dy / h : 0)),
  }
}

/** z for a sticker brought to the top of `placements`. */
function topZ(placements) {
  let z = -1
  for (const p of placements || []) if (typeof p.z === 'number' && p.z > z) z = p.z
  return Math.min(z + 1, 10000)
}

/** Placements in drawing order (lowest z first, ties by creation). */
function sortForDrawing(placements) {
  return [...(placements || [])].sort(
    (a, b) => (a.z ?? 0) - (b.z ?? 0) || String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')),
  )
}

/** Clean one placement row read from the database. */
function normalizePlacement(row) {
  return {
    id: String(row.id),
    sticker_id: String(row.sticker_id),
    x: clampFraction(Number(row.x)),
    y: clampFraction(Number(row.y)),
    tilt: clampTilt(Number(row.tilt)),
    scale: clampScale(Number(row.scale ?? 1)),
    z: Math.max(0, Math.round(Number(row.z) || 0)),
    created_at: row.created_at ?? null,
  }
}

/** Drop placements whose sticker is missing or hidden, so the board renders nothing for them. */
function visiblePlacements(placements, stickersById) {
  return sortForDrawing(placements).filter((p) => {
    const s = stickersById[p.sticker_id]
    return Boolean(s && s.is_active !== false && s.image_url)
  })
}

/**
 * Drawer entries: every active sticker, earned first (newest earned first),
 * then not-yet-earned ones greyed with their unlock hint.
 */
function drawerEntries(stickers, earned) {
  const earnedAt = new Map((earned || []).map((e) => [e.sticker_id, e.earned_at || '']))
  return (stickers || [])
    .filter((s) => s && s.is_active !== false && s.image_url)
    .map((s) => ({
      sticker: s,
      earned: earnedAt.has(s.id),
      earnedAt: earnedAt.get(s.id) || null,
      hint: earnedAt.has(s.id) ? null : s.unlock_hint || (s.unlock_rule === 'quest' ? 'Verify its quest' : 'Not yet earned'),
    }))
    .sort((a, b) => {
      if (a.earned !== b.earned) return a.earned ? -1 : 1
      if (a.earned) return String(b.earnedAt).localeCompare(String(a.earnedAt))
      return 0
    })
}

/** Where a sticker tapped in the drawer lands when there is no drop point: near the middle, offset per count. */
function defaultDrop(count) {
  const ring = [
    [0.5, 0.45],
    [0.3, 0.3],
    [0.7, 0.32],
    [0.32, 0.68],
    [0.68, 0.7],
    [0.5, 0.2],
    [0.5, 0.8],
  ]
  const [x, y] = ring[(count || 0) % ring.length]
  return { x, y }
}

module.exports = {
  TILT_MIN,
  TILT_MAX,
  SCALE_MIN,
  SCALE_MAX,
  BOARD_STICKER,
  BOARD_ASPECT,
  MAX_PLACEMENTS,
  STICKER_SIZE,
  clampTilt,
  clampScale,
  clampFraction,
  randomTilt,
  nextTilt,
  bigger,
  smaller,
  stickerPoints,
  toFraction,
  toPoints,
  dragBy,
  topZ,
  sortForDrawing,
  normalizePlacement,
  visiblePlacements,
  drawerEntries,
  defaultDrop,
}
