#!/usr/bin/env node
// Generates the Quest! app icon, adaptive icon and splash mark in the Cutouts
// direction (docs/design/BRAND.md): the Pilowlava wordmark in ink, on a
// sunflower field for the icon and on paper (set in app.json) for the splash.
//
//   node scripts/gen-app-icons.js
//
// Glyph outlines come from scripts/data/pilowlava-glyphs.json, extracted once
// from apps/mobile/assets/fonts/Pilowlava-Regular.otf (OFL, see OFL-Pilowlava.txt),
// so no font needs to be installed to render. Requires `sharp` (already used by
// scripts/make-cutout.js).
//
// Outputs (1024x1024 PNG):
//   apps/mobile/assets/icon.png           full-bleed sunflower + ink "Q!"
//   apps/mobile/assets/adaptive-icon.png  transparent "Q!" inside the Android safe circle
//   apps/mobile/assets/splash.png         transparent ink "Quest!" for the paper splash

const { join } = require('node:path')
const sharp = require('sharp')
const data = require('./data/pilowlava-glyphs.json')

const SIZE = 1024
const ASSETS = join(__dirname, '..', 'apps', 'mobile', 'assets')

// Tokens: apps/mobile/lib/theme.ts (COLOR.ink, CATEGORY.fitness.color)
const INK = '#1C1915'
const SUNFLOWER = '#FFCE1F'

/** Lay glyphs out left to right; returns SVG path groups and the total advance. */
function layout(text) {
  let x = 0
  const parts = []
  for (const ch of text) {
    const g = data.glyphs[ch]
    if (!g) throw new Error(`No glyph data for "${ch}"`)
    parts.push(`<path transform="translate(${x} 0)" d="${g.path}"/>`)
    x += g.advance
  }
  return { parts, advance: x }
}

/**
 * SVG with `text` centred and scaled so its ink bounds span `widthFraction` of the canvas.
 * Font y-axis points up, so the group is flipped; the baseline sits so the cap height
 * (775 units) centres on the canvas.
 */
function markSvg(text, { widthFraction, background }) {
  const { parts, advance } = layout(text)
  const first = data.glyphs[text[0]]
  const last = data.glyphs[text[text.length - 1]]
  const inkLeft = first.bounds[0]
  const inkRight = advance - last.advance + last.bounds[2]
  const inkWidth = inkRight - inkLeft
  const scale = (SIZE * widthFraction) / inkWidth
  const tx = SIZE / 2 - ((inkLeft + inkRight) / 2) * scale
  const capCentre = 775 / 2
  const ty = SIZE / 2 + capCentre * scale
  const bg = background ? `<rect width="${SIZE}" height="${SIZE}" fill="${background}"/>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
${bg}<g fill="${INK}" transform="translate(${tx} ${ty}) scale(${scale} ${-scale})">${parts.join('')}</g></svg>`
}

async function write(name, svg) {
  const file = join(ASSETS, name)
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(file)
  console.log(`wrote ${file}`)
}

async function main() {
  // Icon: "Q!" about 62% of the canvas width on the sunflower field.
  await write('icon.png', markSvg('Q!', { widthFraction: 0.62, background: SUNFLOWER }))
  // Adaptive: Android masks to a circle that is 66/108 of the canvas; keep the mark inside it.
  await write('adaptive-icon.png', markSvg('Q!', { widthFraction: 0.4 }))
  // Splash: the full wordmark; app.json draws it on paper at "contain".
  await write('splash.png', markSvg('Quest!', { widthFraction: 0.78 }))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
