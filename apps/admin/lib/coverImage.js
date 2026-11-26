'use strict'

/**
 * Quest cover sniffing (security review B-2). Covers live in a public bucket, so
 * the stored Content-Type decides what a browser does with the object. The file's
 * own declared type and name are attacker-controlled, so decode the bytes and
 * take the type from what sharp actually finds. Anything that is not a PNG, JPEG
 * or WebP (SVG, HTML, polyglots) is refused.
 */

const FORMATS = {
  png: { ext: 'png', contentType: 'image/png' },
  jpeg: { ext: 'jpg', contentType: 'image/jpeg' },
  webp: { ext: 'webp', contentType: 'image/webp' },
}

// Same ceiling as the sticker pipeline: refuse decompression bombs.
const MAX_COVER_PIXELS = 40_000_000

/**
 * @param {Buffer} buffer
 * @param {(input: Buffer, options?: object) => { metadata(): Promise<{ format?: string }> }} [sharpImpl]
 * @returns {Promise<{ ext: string, contentType: string } | null>}
 */
async function sniffCover(buffer, sharpImpl) {
  if (!buffer || buffer.length === 0) return null
  const sharp = sharpImpl || require('sharp')
  let meta
  try {
    meta = await sharp(buffer, { limitInputPixels: MAX_COVER_PIXELS }).metadata()
  } catch {
    return null
  }
  const found = meta && typeof meta.format === 'string' ? FORMATS[meta.format] : undefined
  return found ? { ext: found.ext, contentType: found.contentType } : null
}

module.exports = { sniffCover, MAX_COVER_PIXELS }
