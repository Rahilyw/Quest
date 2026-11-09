#!/usr/bin/env node
/**
 * make-cutout.js — Prepare a hero cutout PNG for the Quest! app.
 *
 * Usage:
 *   node scripts/make-cutout.js <input.png> [output.webp]
 *   node scripts/make-cutout.js --help
 *
 * Requirements:
 *   • Input must be a PNG with an alpha channel (transparent background).
 *
 * Processing pipeline:
 *   1. Validate alpha channel presence.
 *   2. Trim transparent edges (sharp .trim()).
 *   3. Pad 8 % on each side.
 *   4. Resize so longest edge ≤ 600 px (aspect-ratio preserved).
 *   5. Bake a soft CSS-like drop shadow into the canvas
 *      (spec: 0 5px 5px rgba(0,0,0,.22) + 0 1px 1px rgba(0,0,0,.12)).
 *   6. Write as WebP with alpha.
 */

'use strict';

const path = require('path');
const fs   = require('fs');

// ─── Help ─────────────────────────────────────────────────────────────────────

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
make-cutout — Quest! hero-cutout processor

USAGE
  node scripts/make-cutout.js <input.png> [output.webp]

ARGUMENTS
  input.png    PNG with an alpha (transparent) channel — required.
  output.webp  Destination path.  Defaults to <input-basename>.webp in the
               same directory as the input file.

OPTIONS
  --help, -h   Show this message and exit.

OUTPUT
  WebP file with pre-baked drop shadow, padded, longest-edge ≤ 600 px.

SHADOW SPEC (matches BRAND.md)
  0 5px 5px rgba(0,0,0,.22) + 0 1px 1px rgba(0,0,0,.12)
`.trim());
  process.exit(0);
}

// ─── Args ─────────────────────────────────────────────────────────────────────

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Error: input file path is required.\nRun with --help for usage.');
  process.exit(1);
}

if (!fs.existsSync(inputPath)) {
  console.error(`Error: file not found — ${inputPath}`);
  process.exit(1);
}

const inputExt  = path.extname(inputPath);
const inputBase = path.basename(inputPath, inputExt);
const inputDir  = path.dirname(inputPath);

const outputPath = process.argv[3]
  || path.join(inputDir, `${inputBase}.webp`);

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error(
      'Error: "sharp" is not installed.\n' +
      'Run: yarn add --dev sharp   (or npm install --save-dev sharp)'
    );
    process.exit(1);
  }

  // 1. Validate alpha channel
  const meta = await sharp(inputPath).metadata();
  if (!meta.hasAlpha) {
    console.error(
      `Error: "${path.basename(inputPath)}" has no alpha channel.\n` +
      'The input must be a PNG with a transparent background.'
    );
    process.exit(1);
  }

  // 2. Trim transparent edges
  const trimmed = await sharp(inputPath)
    .trim()
    .toBuffer({ resolveWithObject: true });

  const { width: tw, height: th } = trimmed.info;

  // 3. Calculate 8 % padding
  const padH = Math.round(tw * 0.08);
  const padV = Math.round(th * 0.08);

  const paddedW = tw + padH * 2;
  const paddedH = th + padV * 2;

  const padded = await sharp(trimmed.data)
    .extend({
      top:    padV,
      bottom: padV,
      left:   padH,
      right:  padH,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer({ resolveWithObject: true });

  // 4. Resize so longest edge ≤ 600 px
  const MAX_EDGE = 600;
  const scale = Math.min(1, MAX_EDGE / Math.max(paddedW, paddedH));
  const finalW = Math.round(paddedW * scale);
  const finalH = Math.round(paddedH * scale);

  const resized = await sharp(padded.data)
    .resize(finalW, finalH, { fit: 'fill' })
    .toBuffer({ resolveWithObject: true });

  // 5. Bake drop shadow
  //
  // Shadow spec: 0 5px 5px rgba(0,0,0,.22) + 0 1px 1px rgba(0,0,0,.12)
  //
  // Strategy:
  //   a. Extract the alpha channel of the resized image.
  //   b. Build a pure-black layer at the same size (the shadow colour).
  //   c. Apply the alpha channel as the mask of the black layer, then blur it —
  //      this gives a soft alpha that mimics a Gaussian drop-shadow.
  //   d. Offset the blurred shadow layer by the CSS offset (0, 5px dominant).
  //   e. Composite: shadow below, then original on top.
  //
  // We approximate the two CSS layers by producing one blurred shadow with
  // an effective blur radius of 5 px and opacity 0.28 (≈ 0.22 + 0.12 / 2).

  const SHADOW_BLUR   = 5;   // px — matches the larger CSS shadow radius
  const SHADOW_OFFSET_X = 0; // px
  const SHADOW_OFFSET_Y = 5; // px — matches 5px offset in CSS spec
  const SHADOW_OPACITY = 0.28; // combined visual weight of both CSS shadows

  // Canvas is expanded to accommodate the offset so the shadow is never clipped.
  const canvasW = finalW + Math.abs(SHADOW_OFFSET_X) + SHADOW_BLUR * 2;
  const canvasH = finalH + Math.abs(SHADOW_OFFSET_Y) + SHADOW_BLUR * 2;

  // Where the original image sits on the expanded canvas (top-left of image).
  const imgLeft = SHADOW_BLUR + (SHADOW_OFFSET_X < 0 ? Math.abs(SHADOW_OFFSET_X) : 0);
  const imgTop  = SHADOW_BLUR + (SHADOW_OFFSET_Y < 0 ? Math.abs(SHADOW_OFFSET_Y) : 0);

  // Where the shadow sits (offset from image position).
  const shadowLeft = imgLeft + SHADOW_OFFSET_X;
  const shadowTop  = imgTop  + SHADOW_OFFSET_Y;

  // a. Extract alpha → greyscale buffer (the shape mask).
  const alphaMask = await sharp(resized.data)
    .extractChannel('alpha')
    .toBuffer();

  // b+c. Create the shadow layer: black pixels weighted by alpha, then blurred.
  //      We build an RGBA buffer where RGB = 0 and A = alphaMask * opacity,
  //      then blur it to soften edges.
  const maskMeta = await sharp(alphaMask).metadata();
  const maskPixels = maskMeta.width * maskMeta.height;

  // alphaMask raw pixels (single channel, uint8)
  const alphaBuf  = await sharp(alphaMask).raw().toBuffer();
  const shadowRaw = Buffer.alloc(maskPixels * 4); // RGBA

  for (let i = 0; i < maskPixels; i++) {
    const a = alphaBuf[i]; // 0–255
    shadowRaw[i * 4 + 0] = 0;   // R
    shadowRaw[i * 4 + 1] = 0;   // G
    shadowRaw[i * 4 + 2] = 0;   // B
    shadowRaw[i * 4 + 3] = Math.round(a * SHADOW_OPACITY); // A
  }

  const shadowBlurred = await sharp(shadowRaw, {
    raw: { width: finalW, height: finalH, channels: 4 },
  })
    .blur(SHADOW_BLUR)
    .toBuffer();

  // d+e. Composite onto transparent canvas: shadow first, then image on top.
  const result = await sharp({
    create: {
      width:    canvasW,
      height:   canvasH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input:  shadowBlurred,
        left:   shadowLeft,
        top:    shadowTop,
        blend:  'over',
      },
      {
        input:  resized.data,
        left:   imgLeft,
        top:    imgTop,
        blend:  'over',
      },
    ])
    .webp({ lossless: true, effort: 6 })
    .toBuffer({ resolveWithObject: true });

  // 6. Write output
  fs.writeFileSync(outputPath, result.data);

  const { width: outW, height: outH } = result.info;
  console.log(`✓ Written: ${outputPath}`);
  console.log(`  Dimensions: ${outW} × ${outH} px`);
  console.log(`  Size: ${(result.data.length / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  console.error('Fatal error:', err.message || err);
  process.exit(1);
});
