#!/usr/bin/env node
/**
 * make-cutout.js — turn a real photo into a Quest! sticker (BRAND.md §6).
 *
 * Usage:
 *   node scripts/make-cutout.js <photo.(png|jpg|webp)> [output.webp]
 *   node scripts/make-cutout.js --help
 *
 * Same treatment as the admin uploader (apps/admin/lib/sticker-pipeline.js):
 * remove the plain backdrop (or use the photo's transparency), keep the largest
 * object, close small holes, add a #FFFDFA die-cut edge (~4% of the long side),
 * bake a 0 4px 10px rgba(28,25,21,.22) shadow, trim, and write a 600px WebP
 * with alpha.
 *
 * Use real photos only: no stock images, drawings, AI images or brand logos.
 * Normally you don't need this script; upload the photo on the quest's admin
 * page and it is processed there.
 */

'use strict'

const path = require('path')
const fs = require('fs')
const { processSticker } = require('../apps/admin/lib/sticker-pipeline.js')

if (process.argv.includes('--help') || process.argv.includes('-h') || !process.argv[2]) {
  console.log(`
make-cutout — Quest! sticker processor

USAGE
  node scripts/make-cutout.js <photo> [output.webp]

ARGUMENTS
  photo        A real photo of one object: PNG, JPEG or WebP, on a plain
               contrasting backdrop or already transparent. 1500px+ long side.
  output.webp  Destination. Defaults to <photo-basename>.sticker.webp beside it.

OUTPUT
  600px (long side) WebP with alpha: die-cut white edge and baked shadow.
`.trim())
  process.exit(process.argv[2] ? 0 : 1)
}

const inputPath = process.argv[2]
if (!fs.existsSync(inputPath)) {
  console.error(`Error: file not found — ${inputPath}`)
  process.exit(1)
}
const base = path.basename(inputPath, path.extname(inputPath))
const outputPath = process.argv[3] || path.join(path.dirname(inputPath), `${base}.sticker.webp`)

processSticker(fs.readFileSync(inputPath))
  .then(({ buffer, width, height, warnings }) => {
    fs.writeFileSync(outputPath, buffer)
    for (const w of warnings) console.warn(`! ${w}`)
    console.log(`✓ Written: ${outputPath}`)
    console.log(`  ${width} × ${height} px, ${(buffer.length / 1024).toFixed(1)} KB`)
  })
  .catch((err) => {
    console.error(`Error: ${err.message || err}`)
    process.exit(1)
  })
