'use strict'

/**
 * Admin hardening rules from the security review (B-1, B-2, B-3, B-5, B-6, B-7).
 * Run: node apps/admin/__tests__/adminHardening.test.js
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8')
const { hasConfirmedEmail } = require(path.join(root, 'lib/adminIdentity.js'))
const { sniffCover, MAX_COVER_PIXELS } = require(path.join(root, 'lib/coverImage.js'))
const {
  COMPLETION_COLUMNS,
  COMPLETIONS_DEFAULT_LIMIT,
  COMPLETIONS_MAX_LIMIT,
  clampCompletionsLimit,
  summariseSponsoredQuest,
  canGrantStickerByHand,
} = require(path.join(root, 'lib/adminRules.js'))
const { processSticker, StickerError, MAX_INPUT_PIXELS, SHARP_INPUT_OPTIONS } = require(path.join(
  root,
  'lib/sticker-pipeline.js'
))
const sharp = require('sharp')

const tests = []
function test(name, fn) {
  tests.push({ name, fn })
}

// ─── B-1: confirmed email ────────────────────────────────────────────────────

test('B-1: an unconfirmed or missing email is not an admin identity', () => {
  assert.strictEqual(hasConfirmedEmail(null), false)
  assert.strictEqual(hasConfirmedEmail(undefined), false)
  assert.strictEqual(hasConfirmedEmail({ email: 'a@b.co' }), false)
  assert.strictEqual(hasConfirmedEmail({ email: 'a@b.co', email_confirmed_at: null }), false)
  assert.strictEqual(hasConfirmedEmail({ email: 'a@b.co', email_confirmed_at: '' }), false)
  assert.strictEqual(hasConfirmedEmail({ email: '', email_confirmed_at: '2026-01-01T00:00:00Z' }), false)
  assert.strictEqual(hasConfirmedEmail({ email_confirmed_at: '2026-01-01T00:00:00Z' }), false)
})

test('B-1: a confirmed email passes', () => {
  assert.strictEqual(hasConfirmedEmail({ email: 'a@b.co', email_confirmed_at: '2026-01-01T00:00:00Z' }), true)
})

test('B-1: every admin gate goes through isAdminUser, never the bare email check', () => {
  for (const file of ['lib/require-admin.ts', 'middleware.ts', 'app/login/actions.ts', 'app/api/places/search/route.ts']) {
    const src = read(file)
    assert.ok(src.includes('isAdminUser('), `${file} should call isAdminUser`)
    assert.ok(!src.includes('isAdminEmail('), `${file} should not call isAdminEmail`)
  }
  const auth = read('lib/admin-auth.ts')
  assert.ok(auth.includes('hasConfirmedEmail(user)'), 'isAdminUser checks the confirmed email')
})

// ─── B-2 / B-3: image sniffing and pixel limits ──────────────────────────────

const blank = (format, width = 64, height = 64) =>
  sharp({ create: { width, height, channels: 3, background: { r: 200, g: 120, b: 40 } } })
    [format]()
    .toBuffer()

test('B-2: png, jpeg and webp covers are accepted and typed from their bytes', async () => {
  assert.deepStrictEqual(await sniffCover(await blank('png')), { ext: 'png', contentType: 'image/png' })
  assert.deepStrictEqual(await sniffCover(await blank('jpeg')), { ext: 'jpg', contentType: 'image/jpeg' })
  assert.deepStrictEqual(await sniffCover(await blank('webp')), { ext: 'webp', contentType: 'image/webp' })
})

test('B-2: SVG, HTML, empty and garbage files are refused whatever they claim to be', async () => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>')
  const html = Buffer.from('<!doctype html><script>alert(1)</script>')
  assert.strictEqual(await sniffCover(svg), null)
  assert.strictEqual(await sniffCover(html), null)
  assert.strictEqual(await sniffCover(Buffer.alloc(0)), null)
  assert.strictEqual(await sniffCover(Buffer.from('not an image')), null)
  assert.strictEqual(await sniffCover(await sharp({ create: { width: 8, height: 8, channels: 3, background: '#fff' } }).gif().toBuffer()), null)
})

test('B-2: the upload action stores the sniffed type, not the declared one', () => {
  const src = read('app/quests/actions.ts')
  const block = src.slice(src.indexOf('async function uploadQuestCover'), src.indexOf('async function deleteQuestCoverIfOwned'))
  assert.ok(block.includes('sniffCover(buffer)'))
  assert.ok(block.includes('contentType: detected.contentType'))
  assert.ok(!block.includes('coverFile.type'), 'must not trust the declared type')
  assert.ok(!block.includes('coverFile.name'), 'must not trust the declared name')
})

test('B-3: decompression bombs are refused by cover sniffing and the sticker pipeline', async () => {
  assert.strictEqual(MAX_COVER_PIXELS, 40_000_000)
  assert.strictEqual(MAX_INPUT_PIXELS, 40_000_000)
  assert.deepStrictEqual(SHARP_INPUT_OPTIONS, { limitInputPixels: 40_000_000 })
  // 8000 x 6000 = 48 MP of flat colour: tiny on disk, large in memory.
  const bomb = await blank('png', 8000, 6000)
  assert.strictEqual(await sniffCover(bomb), null)
  await assert.rejects(() => processSticker(bomb), (err) => err instanceof StickerError)
})

test('B-3: every input-decoding sharp call in the sticker pipeline sets the pixel limit', () => {
  const src = read('lib/sticker-pipeline.js')
  assert.ok(src.includes('sharp(input, SHARP_INPUT_OPTIONS).metadata()'))
  assert.ok(src.includes('sharp(input, SHARP_INPUT_OPTIONS)\n') || src.includes('sharp(input, SHARP_INPUT_OPTIONS)\r\n'))
  assert.ok(!/sharp\(input\)/.test(src), 'no sharp(input) without options')
})

// ─── B-5 / B-6 / B-7 ─────────────────────────────────────────────────────────

test('B-5: the sponsor export summary carries counts and never a redemption code', () => {
  const summary = summariseSponsoredQuest({
    title: 'Coffee',
    sponsor_name: 'Bean',
    sponsor_reward: 'Free cup',
    completions: [
      { status: 'approved', redemption_code: 'ABC123', redeemed_at: '2026-11-02T10:00:00Z' },
      { status: 'approved', redemption_code: 'XYZ789', redeemed_at: null },
      { status: 'pending', redemption_code: null, redeemed_at: null },
      { status: 'rejected' },
    ],
  })
  assert.strictEqual(summary.total, 4)
  assert.strictEqual(summary.approved, 2)
  assert.strictEqual(summary.pending, 1)
  assert.strictEqual(summary.rejected, 1)
  assert.strictEqual(summary.issued, 2)
  assert.strictEqual(summary.redeemed, 1)
  assert.strictEqual(summary.lastRedemption, '2026-11-02T10:00:00Z')
  const json = JSON.stringify(summary)
  assert.ok(!json.includes('ABC123') && !json.includes('XYZ789'))
  assert.strictEqual(summariseSponsoredQuest({ title: 'T', completions: null }).total, 0)
})

test('B-5: the sponsors page is dynamic and passes only the summary to the client', () => {
  const page = read('app/sponsors/page.tsx')
  assert.ok(page.includes("export const dynamic = 'force-dynamic'"))
  assert.ok(!page.includes('export const revalidate'))
  assert.ok(page.includes('summary={summariseSponsoredQuest(quest)}'))
  assert.ok(!page.includes('quest={quest}'))
  assert.ok(!read('app/sponsors/ExportButton.tsx').includes('redemption_code'))
})

test('B-6: completions use explicit columns and a server-side limit cap', () => {
  assert.ok(!COMPLETION_COLUMNS.includes('*'))
  assert.strictEqual(clampCompletionsLimit(undefined), COMPLETIONS_DEFAULT_LIMIT)
  assert.strictEqual(clampCompletionsLimit('abc'), COMPLETIONS_DEFAULT_LIMIT)
  assert.strictEqual(clampCompletionsLimit(-5), COMPLETIONS_DEFAULT_LIMIT)
  assert.strictEqual(clampCompletionsLimit(0), COMPLETIONS_DEFAULT_LIMIT)
  assert.strictEqual(clampCompletionsLimit(25.9), 25)
  assert.strictEqual(clampCompletionsLimit(1_000_000), COMPLETIONS_MAX_LIMIT)
  const src = read('app/completions/actions.ts')
  assert.ok(!/select\(\s*[`'"]\*/.test(src), "no select('*')")
  assert.ok(src.includes('COMPLETION_COLUMNS.join'))
  assert.ok(src.includes('.limit(clampCompletionsLimit(limit))'))
})

test('B-7: only active manual or season library stickers can be granted by hand', () => {
  assert.strictEqual(canGrantStickerByHand({ unlock_rule: 'manual', quest_id: null, is_active: true }), true)
  assert.strictEqual(canGrantStickerByHand({ unlock_rule: 'season', quest_id: null, is_active: true }), true)
  assert.strictEqual(canGrantStickerByHand({ unlock_rule: 'quest', quest_id: 'q', is_active: true }), false)
  assert.strictEqual(canGrantStickerByHand({ unlock_rule: 'badge', quest_id: null, is_active: true }), false)
  assert.strictEqual(canGrantStickerByHand({ unlock_rule: 'manual', quest_id: 'q', is_active: true }), false)
  assert.strictEqual(canGrantStickerByHand({ unlock_rule: 'manual', quest_id: null, is_active: false }), false)
  assert.strictEqual(canGrantStickerByHand(null), false)
  const src = read('app/stickers/actions.ts')
  const block = src.slice(src.indexOf('export async function grantSticker'))
  assert.ok(block.indexOf('canGrantStickerByHand(sticker)') !== -1)
  assert.ok(block.indexOf('canGrantStickerByHand(sticker)') < block.indexOf(".from('user_stickers')"))
})

;(async () => {
  let passed = 0
  for (const { name, fn } of tests) {
    await fn()
    passed += 1
    console.log(`ok ${passed} ${name}`)
  }
  console.log(`${passed} admin hardening tests passed`)
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
