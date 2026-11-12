/**
 * Sticker pipeline (BRAND.md §6, "Processing (on upload)").
 *
 * Turns a real photo of one object (plain contrasting backdrop, or an already
 * transparent PNG/WebP) into a die-cut sticker:
 *
 *   1. Remove the backdrop: region-grow it in from the image edges with a small
 *      colour tolerance (or use the existing alpha when the photo has one).
 *   2. Keep the largest object; fill small enclosed holes; smooth the outline.
 *   3. Add a warm-white (#FFFDFA) die-cut edge, about 4% of the long side.
 *   4. Bake a soft shadow under the edge: 0 4px 10px rgba(28,25,21,.22).
 *   5. Trim, pad, resize to 600px on the long side, encode as WebP with alpha.
 *
 * Plain CommonJS so the admin server action and `scripts/make-cutout.js` share
 * one implementation. Pixel work happens in JS on raw buffers (sharp applies its
 * pipeline operations in a fixed order, so chaining blur/threshold steps is not
 * reliable); sharp only decodes, resizes, blurs single channels and encodes.
 */

'use strict'

const OUTPUT_LONG_SIDE = 600
const WORK_LONG_SIDE = 1400
const EDGE_FRACTION = 0.04
const EDGE_RGB = [0xff, 0xfd, 0xfa]
const SHADOW_RGB = [0x1c, 0x19, 0x15]
const SHADOW_OPACITY = 0.22
const SHADOW_OFFSET_Y = 4
const SHADOW_BLUR = 10 // CSS blur radius; Gaussian sigma is half of it
const PAD = 20

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_INPUT_BYTES = 15 * 1024 * 1024

class StickerError extends Error {}

function loadSharp() {
  try {
    return require('sharp')
  } catch {
    throw new StickerError('Image processing is unavailable: the "sharp" package is not installed.')
  }
}

// ─── Mask helpers ────────────────────────────────────────────────────────────

/** Squared colour distance between pixel i and an [r,g,b] triple. */
function dist2(px, i, r, g, b) {
  const dr = px[i * 4] - r
  const dg = px[i * 4 + 1] - g
  const db = px[i * 4 + 2] - b
  return dr * dr + dg * dg + db * db
}

function medianBorderColour(px, w, h) {
  const rs = []
  const gs = []
  const bs = []
  const push = (i) => {
    rs.push(px[i * 4])
    gs.push(px[i * 4 + 1])
    bs.push(px[i * 4 + 2])
  }
  for (let x = 0; x < w; x++) {
    push(x)
    push((h - 1) * w + x)
  }
  for (let y = 1; y < h - 1; y++) {
    push(y * w)
    push(y * w + w - 1)
  }
  const med = (a) => a.sort((p, q) => p - q)[a.length >> 1]
  return [med(rs), med(gs), med(bs)]
}

/**
 * Region-grow the backdrop from the image edges. A pixel joins the backdrop
 * when it is close to the backdrop colour overall and close to the neighbour it
 * was reached from, which follows soft gradients and vignetting without
 * leaking into an object of a similar colour.
 * Returns a Uint8Array mask: 1 = object, 0 = backdrop.
 */
function growBackdrop(px, w, h) {
  const n = w * h
  const [br, bgc, bb] = medianBorderColour(px, w, h)
  const GLOBAL = 64 * 64 // squared tolerance to the backdrop colour
  const SEED = 72 * 72
  const LOCAL = 14 * 14 // squared tolerance between neighbours
  const backdrop = new Uint8Array(n)
  const queue = new Int32Array(n)
  let head = 0
  let tail = 0
  const seed = (i) => {
    if (!backdrop[i] && dist2(px, i, br, bgc, bb) < SEED) {
      backdrop[i] = 1
      queue[tail++] = i
    }
  }
  for (let x = 0; x < w; x++) {
    seed(x)
    seed((h - 1) * w + x)
  }
  for (let y = 0; y < h; y++) {
    seed(y * w)
    seed(y * w + w - 1)
  }
  while (head < tail) {
    const i = queue[head++]
    const x = i % w
    const y = (i - x) / w
    const r = px[i * 4]
    const g = px[i * 4 + 1]
    const b = px[i * 4 + 2]
    const visit = (j) => {
      if (backdrop[j]) return
      if (dist2(px, j, r, g, b) > LOCAL) return
      if (dist2(px, j, br, bgc, bb) > GLOBAL) return
      backdrop[j] = 1
      queue[tail++] = j
    }
    if (x > 0) visit(i - 1)
    if (x < w - 1) visit(i + 1)
    if (y > 0) visit(i - w)
    if (y < h - 1) visit(i + w)
  }
  const mask = new Uint8Array(n)
  for (let i = 0; i < n; i++) mask[i] = backdrop[i] ? 0 : 1
  return mask
}

/** Label 4-connected components where mask[i] === value. */
function components(mask, w, h, value) {
  const n = w * h
  const labels = new Int32Array(n).fill(-1)
  const sizes = []
  const touchesBorder = []
  const stack = new Int32Array(n)
  for (let start = 0; start < n; start++) {
    if (mask[start] !== value || labels[start] !== -1) continue
    const id = sizes.length
    let size = 0
    let border = false
    let top = 0
    stack[top++] = start
    labels[start] = id
    while (top > 0) {
      const i = stack[--top]
      size++
      const x = i % w
      const y = (i - x) / w
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) border = true
      const push = (j) => {
        if (mask[j] === value && labels[j] === -1) {
          labels[j] = id
          stack[top++] = j
        }
      }
      if (x > 0) push(i - 1)
      if (x < w - 1) push(i + 1)
      if (y > 0) push(i - w)
      if (y < h - 1) push(i + w)
    }
    sizes.push(size)
    touchesBorder.push(border)
  }
  return { labels, sizes, touchesBorder }
}

/** Keep the largest object, then fill enclosed holes smaller than 3% of it. */
function largestObjectClosed(mask, w, h) {
  const fg = components(mask, w, h, 1)
  if (fg.sizes.length === 0) return { mask: new Uint8Array(w * h), area: 0 }
  let best = 0
  for (let k = 1; k < fg.sizes.length; k++) if (fg.sizes[k] > fg.sizes[best]) best = k
  const out = new Uint8Array(w * h)
  for (let i = 0; i < out.length; i++) out[i] = fg.labels[i] === best ? 1 : 0
  const area = fg.sizes[best]
  const bg = components(out, w, h, 0)
  const maxHole = area * 0.03
  for (let i = 0; i < out.length; i++) {
    const l = bg.labels[i]
    if (l !== -1 && !bg.touchesBorder[l] && bg.sizes[l] <= maxHole) out[i] = 1
  }
  let filled = 0
  for (let i = 0; i < out.length; i++) filled += out[i]
  return { mask: out, area: filled }
}

/**
 * Enclosed gaps the edge-grow can't reach (a mug handle, the space inside a
 * ring) show the backdrop colour. Punch them out when they are large enough to
 * be a real gap rather than a pale detail. Returns how many pixels it removed.
 */
function punchEnclosedBackdrop(px, mask, w, h, area) {
  const [br, bgc, bb] = medianBorderColour(px, w, h)
  const TIGHT = 36 * 36
  const cand = new Uint8Array(w * h)
  for (let i = 0; i < cand.length; i++) cand[i] = mask[i] && dist2(px, i, br, bgc, bb) < TIGHT ? 1 : 0
  const c = components(cand, w, h, 1)
  const minGap = area * 0.02
  let removed = 0
  for (let i = 0; i < cand.length; i++) {
    const l = c.labels[i]
    if (l !== -1 && c.sizes[l] >= minGap) {
      mask[i] = 0
      removed++
    }
  }
  return removed
}

/** 1-D squared Euclidean distance transform (Felzenszwalb & Huttenlocher). */
function edt1d(f, n, d, v, z) {
  let k = 0
  v[0] = 0
  z[0] = -Infinity
  z[1] = Infinity
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
    while (s <= z[k]) {
      k--
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
    }
    k++
    v[k] = q
    z[k] = s
    z[k + 1] = Infinity
  }
  k = 0
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]
  }
}

/** Distance (px) from every pixel to the nearest pixel with inside[i] = 1. */
function distanceToShape(inside, w, h) {
  const INF = 1e20
  const grid = new Float64Array(w * h)
  for (let i = 0; i < grid.length; i++) grid[i] = inside[i] ? 0 : INF
  const m = Math.max(w, h)
  const f = new Float64Array(m)
  const d = new Float64Array(m)
  const v = new Int32Array(m)
  const z = new Float64Array(m + 1)
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x]
    edt1d(f, h, d, v, z)
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y]
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x]
    edt1d(f, w, d, v, z)
    for (let x = 0; x < w; x++) grid[y * w + x] = Math.sqrt(d[x])
  }
  return grid
}

// ─── Pipeline ────────────────────────────────────────────────────────────────

/**
 * @param {Buffer} input  PNG, JPEG or WebP bytes.
 * @returns {Promise<{ buffer: Buffer, width: number, height: number, warnings: string[] }>}
 */
async function processSticker(input) {
  const sharp = loadSharp()
  const warnings = []
  if (!input || input.length === 0) throw new StickerError('The file is empty.')
  if (input.length > MAX_INPUT_BYTES) throw new StickerError('That photo is over 15 MB. Export a smaller copy.')

  let meta
  try {
    meta = await sharp(input).metadata()
  } catch {
    throw new StickerError('That file is not an image we can read. Use a PNG, JPEG or WebP photo.')
  }
  if (!['png', 'jpeg', 'webp'].includes(meta.format)) {
    throw new StickerError('Use a PNG, JPEG or WebP photo.')
  }
  const longSide = Math.max(meta.width || 0, meta.height || 0)
  if (longSide < 400) throw new StickerError('That photo is too small. Use one at least 1500px on the long side.')
  if (longSide < 1500) warnings.push(`The photo is ${longSide}px on its long side; 1500px or more gives a crisper sticker.`)

  // 1. Decode at a working size (EXIF-rotated), as straight RGBA.
  const work = await sharp(input)
    .rotate()
    .resize({ width: WORK_LONG_SIDE, height: WORK_LONG_SIDE, fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const w = work.info.width
  const h = work.info.height
  const px = work.data
  const n = w * h

  // Does the photo already carry transparency? Count clear pixels on the border.
  let clearBorder = 0
  let borderCount = 0
  const countBorder = (i) => {
    borderCount++
    if (px[i * 4 + 3] < 16) clearBorder++
  }
  for (let x = 0; x < w; x++) {
    countBorder(x)
    countBorder((h - 1) * w + x)
  }
  for (let y = 1; y < h - 1; y++) {
    countBorder(y * w)
    countBorder(y * w + w - 1)
  }
  const transparentInput = meta.hasAlpha && clearBorder / borderCount > 0.5

  let raw
  if (transparentInput) {
    raw = new Uint8Array(n)
    for (let i = 0; i < n; i++) raw[i] = px[i * 4 + 3] >= 128 ? 1 : 0
  } else {
    raw = growBackdrop(px, w, h)
  }

  // 2. Largest object, holes closed.
  const { mask, area: closedArea } = largestObjectClosed(raw, w, h)
  let area = closedArea
  if (!transparentInput && area > 0) area -= punchEnclosedBackdrop(px, mask, w, h, area)
  const coverage = area / n
  if (coverage < 0.02) {
    throw new StickerError(
      "Couldn't find an object. Photograph it larger in the frame, on a plain contrasting backdrop."
    )
  }
  if (coverage > 0.96) {
    throw new StickerError(
      "Couldn't find a plain backdrop. Shoot the object on a plain contrasting surface, or upload a transparent PNG."
    )
  }

  // Smooth the outline a little: blur the hard mask and threshold at half.
  const smooth = await sharp(Buffer.from(mask.map((m) => (m ? 255 : 0))), { raw: { width: w, height: h, channels: 1 } })
    .blur(1.2)
    .extractChannel(0)
    .raw()
    .toBuffer()

  // Object alpha: smoothed mask, multiplied by any existing alpha.
  let minX = w
  let minY = h
  let maxX = -1
  let maxY = -1
  const objAlpha = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    const a = smooth[i] >= 128 ? (transparentInput ? px[i * 4 + 3] : 255) : 0
    objAlpha[i] = a
    if (a > 0) {
      const x = i % w
      const y = (i - x) / w
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  if (maxX < 0) throw new StickerError("Couldn't find an object in that photo.")

  // Crop the object (RGBA with the new alpha) to its bounding box.
  const cw = maxX - minX + 1
  const ch = maxY - minY + 1
  const crop = Buffer.alloc(cw * ch * 4)
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const s = (minY + y) * w + (minX + x)
      const t = (y * cw + x) * 4
      crop[t] = px[s * 4]
      crop[t + 1] = px[s * 4 + 1]
      crop[t + 2] = px[s * 4 + 2]
      crop[t + 3] = objAlpha[s]
    }
  }

  // 3. Lay out at output scale: object + white edge + shadow padding = 600.
  const edge = Math.round(OUTPUT_LONG_SIDE * EDGE_FRACTION)
  const objLong = OUTPUT_LONG_SIDE - 2 * (edge + PAD)
  const scale = objLong / Math.max(cw, ch)
  const ow = Math.max(1, Math.round(cw * scale))
  const oh = Math.max(1, Math.round(ch * scale))
  const obj = await sharp(crop, { raw: { width: cw, height: ch, channels: 4 } })
    .resize(ow, oh, { fit: 'fill', kernel: 'lanczos3' })
    .raw()
    .toBuffer()

  const W = ow + 2 * (edge + PAD)
  const H = oh + 2 * (edge + PAD) + SHADOW_OFFSET_Y
  const ox = edge + PAD
  const oy = edge + PAD
  const N = W * H

  // Die-cut edge: everything within `edge` px of the object, anti-aliased.
  const inside = new Uint8Array(N)
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      if (obj[(y * ow + x) * 4 + 3] >= 128) inside[(oy + y) * W + ox + x] = 1
    }
  }
  const dist = distanceToShape(inside, W, H)
  const edgeAlpha = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    const a = edge + 0.5 - dist[i]
    edgeAlpha[i] = a <= 0 ? 0 : a >= 1 ? 1 : a
  }

  // 4. Shadow: the edge shape, offset 4px down, blurred (sigma = blur / 2).
  const shadowSrc = Buffer.alloc(N)
  for (let y = 0; y < H; y++) {
    const sy = y - SHADOW_OFFSET_Y
    if (sy < 0) continue
    for (let x = 0; x < W; x++) shadowSrc[y * W + x] = Math.round(edgeAlpha[sy * W + x] * 255)
  }
  const shadow = await sharp(shadowSrc, { raw: { width: W, height: H, channels: 1 } })
    .blur(SHADOW_BLUR / 2)
    .extractChannel(0)
    .raw()
    .toBuffer()

  // Composite: shadow, then white edge, then the object (straight alpha "over").
  const out = Buffer.alloc(N * 4)
  for (let i = 0; i < N; i++) {
    // shadow layer
    let a = (shadow[i] / 255) * SHADOW_OPACITY
    let r = SHADOW_RGB[0] * a
    let g = SHADOW_RGB[1] * a
    let b = SHADOW_RGB[2] * a
    // white edge over it
    const ea = edgeAlpha[i]
    r = EDGE_RGB[0] * ea + r * (1 - ea)
    g = EDGE_RGB[1] * ea + g * (1 - ea)
    b = EDGE_RGB[2] * ea + b * (1 - ea)
    a = ea + a * (1 - ea)
    // object over both
    const x = i % W
    const y = (i - x) / W
    const lx = x - ox
    const ly = y - oy
    if (lx >= 0 && ly >= 0 && lx < ow && ly < oh) {
      const j = (ly * ow + lx) * 4
      const oa = obj[j + 3] / 255
      if (oa > 0) {
        r = obj[j] * oa + r * (1 - oa)
        g = obj[j + 1] * oa + g * (1 - oa)
        b = obj[j + 2] * oa + b * (1 - oa)
        a = oa + a * (1 - oa)
      }
    }
    // premultiplied → straight
    if (a > 0) {
      out[i * 4] = Math.round(r / a)
      out[i * 4 + 1] = Math.round(g / a)
      out[i * 4 + 2] = Math.round(b / a)
      out[i * 4 + 3] = Math.round(a * 255)
    }
  }

  // 5. Trim to the visible sticker plus a 4px margin, fit 600 on the long side.
  let tx0 = W
  let ty0 = H
  let tx1 = -1
  let ty1 = -1
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (out[(y * W + x) * 4 + 3] > 2) {
        if (x < tx0) tx0 = x
        if (x > tx1) tx1 = x
        if (y < ty0) ty0 = y
        if (y > ty1) ty1 = y
      }
    }
  }
  const m = 4
  tx0 = Math.max(0, tx0 - m)
  ty0 = Math.max(0, ty0 - m)
  tx1 = Math.min(W - 1, tx1 + m)
  ty1 = Math.min(H - 1, ty1 + m)

  const result = await sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: tx0, top: ty0, width: tx1 - tx0 + 1, height: ty1 - ty0 + 1 })
    .resize({ width: OUTPUT_LONG_SIDE, height: OUTPUT_LONG_SIDE, fit: 'inside' })
    .webp({ quality: 88, alphaQuality: 100, effort: 5 })
    .toBuffer({ resolveWithObject: true })

  return { buffer: result.data, width: result.info.width, height: result.info.height, warnings }
}

module.exports = { processSticker, StickerError, ACCEPTED_TYPES, MAX_INPUT_BYTES, OUTPUT_LONG_SIDE }
