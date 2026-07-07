#!/usr/bin/env node
// Generates the Quest! app icons from the Harbour Electric brand mark ("Q!"),
// replacing the 1x1 placeholder PNGs. Zero dependencies: shapes are rendered
// with signed-distance functions and encoded as PNG by hand (node:zlib).
//
//   node scripts/gen-app-icons.js
//
// Outputs (1024x1024 RGBA):
//   apps/mobile/assets/icon.png           full-bleed Quest Blue + Q! mark
//   apps/mobile/assets/adaptive-icon.png  transparent, mark shrunk to the
//                                         Android adaptive-icon safe circle
//   apps/mobile/assets/splash.png         transparent, mark for the navy splash

const { deflateSync } = require('node:zlib')
const { writeFileSync } = require('node:fs')
const { join } = require('node:path')

const SIZE = 1024
const ASSETS = join(__dirname, '..', 'apps', 'mobile', 'assets')

// ─── Colors (DESIGN.md — Harbour Electric) ────────────────────────────────────
const QUEST_BLUE_TOP = [78, 111, 255] // subtle vertical gradient top
const QUEST_BLUE_BOT = [59, 87, 232] // gradient bottom (base #4364F7 midpoint)
const WHITE = [255, 255, 255]
const CITY_ORANGE = [255, 107, 53] // #FF6B35

// ─── The "Q!" mark, defined in mark-space (origin at mark center) ────────────
// Ring (the Q) centered left, capsule tail at 45°, exclamation bar + dot right.
const RING_C = { x: -139, y: 0 }
const RING_MID_R = 215
const RING_HALF_T = 55
const TAIL_A = { x: 13, y: 152 }
const TAIL_B = { x: 146, y: 285 }
const TAIL_R = 55
const BANG_X = 271
const BANG_TOP = -260
const BANG_BOT = 60
const BANG_R = 57
const DOT_C = { x: 271, y: 215 }
const DOT_R = 62

function segDist(px, py, ax, ay, bx, by) {
  const abx = bx - ax
  const aby = by - ay
  const apx = px - ax
  const apy = py - ay
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / (abx * abx + aby * aby)))
  const dx = apx - abx * t
  const dy = apy - aby * t
  return Math.hypot(dx, dy)
}

// Signed distances (< 0 inside)
function sdWhite(x, y) {
  const ring = Math.abs(Math.hypot(x - RING_C.x, y - RING_C.y) - RING_MID_R) - RING_HALF_T
  const tail = segDist(x, y, TAIL_A.x, TAIL_A.y, TAIL_B.x, TAIL_B.y) - TAIL_R
  return Math.min(ring, tail)
}

function sdOrange(x, y) {
  const bar = segDist(x, y, BANG_X, BANG_TOP, BANG_X, BANG_BOT) - BANG_R
  const dot = Math.hypot(x - DOT_C.x, y - DOT_C.y) - DOT_R
  return Math.min(bar, dot)
}

function coverage(sd, aa) {
  // 0 outside, 1 inside, smooth across ±aa
  if (sd <= -aa) return 1
  if (sd >= aa) return 0
  return 0.5 - sd / (2 * aa)
}

function render({ scale, background }) {
  const px = new Uint8Array(SIZE * SIZE * 4)
  const aa = 1.5 / scale // anti-alias falloff in mark-space units
  const cx = SIZE / 2 + 19 * scale // mark is slightly left-heavy; re-center
  const cy = SIZE / 2

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const mx = (x + 0.5 - cx) / scale
      const my = (y + 0.5 - cy) / scale

      let r = 0
      let g = 0
      let b = 0
      let a = 0
      if (background) {
        const t = y / (SIZE - 1)
        r = QUEST_BLUE_TOP[0] + (QUEST_BLUE_BOT[0] - QUEST_BLUE_TOP[0]) * t
        g = QUEST_BLUE_TOP[1] + (QUEST_BLUE_BOT[1] - QUEST_BLUE_TOP[1]) * t
        b = QUEST_BLUE_TOP[2] + (QUEST_BLUE_BOT[2] - QUEST_BLUE_TOP[2]) * t
        a = 1
      }

      const w = coverage(sdWhite(mx, my), aa)
      if (w > 0) {
        r = WHITE[0] * w + r * (1 - w)
        g = WHITE[1] * w + g * (1 - w)
        b = WHITE[2] * w + b * (1 - w)
        a = w + a * (1 - w)
      }
      const o = coverage(sdOrange(mx, my), aa)
      if (o > 0) {
        r = CITY_ORANGE[0] * o + r * (1 - o)
        g = CITY_ORANGE[1] * o + g * (1 - o)
        b = CITY_ORANGE[2] * o + b * (1 - o)
        a = o + a * (1 - o)
      }

      const i = (y * SIZE + x) * 4
      px[i] = Math.round(r)
      px[i + 1] = Math.round(g)
      px[i + 2] = Math.round(b)
      px[i + 3] = Math.round(a * 255)
    }
  }
  return px
}

// ─── Minimal PNG encoder (8-bit RGBA, filter 0) ──────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(px) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(SIZE, 0)
  ihdr.writeUInt32BE(SIZE, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1))
  for (let y = 0; y < SIZE; y++) {
    raw[y * (SIZE * 4 + 1)] = 0 // filter: none
    Buffer.from(px.buffer, y * SIZE * 4, SIZE * 4).copy(raw, y * (SIZE * 4 + 1) + 1)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function write(name, opts) {
  const file = join(ASSETS, name)
  writeFileSync(file, encodePng(render(opts)))
  console.log(`wrote ${file}`)
}

// Mark is ~742 wide in mark-space.
write('icon.png', { scale: 0.86, background: true }) // mark ≈ 62% of canvas
write('adaptive-icon.png', { scale: 0.62, background: false }) // fits the 66/108 safe circle
write('splash.png', { scale: 0.78, background: false }) // logo on navy splash bg
