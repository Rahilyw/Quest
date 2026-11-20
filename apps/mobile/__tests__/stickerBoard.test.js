'use strict'

/**
 * Sticker board rules (lib/stickerBoard.js) and the guards around the sticker
 * direction (BRAND.md §6, §6b, §6c). Run: node apps/mobile/__tests__/stickerBoard.test.js
 */

const fs = require('fs')
const path = require('path')
const assert = require('assert')
const b = require('../lib/stickerBoard.js')

const ROOT = path.join(__dirname, '..', '..', '..')
const MOBILE = path.join(__dirname, '..')
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')

let passed = 0
function test(name, fn) {
  fn()
  passed += 1
  console.log(`ok ${passed} ${name}`)
}

test('tilt and scale stay inside the database checks', () => {
  assert.strictEqual(b.clampTilt(40), 12)
  assert.strictEqual(b.clampTilt(-40), -12)
  assert.strictEqual(b.clampScale(3), 1.6)
  assert.strictEqual(b.clampScale(0.1), 0.6)
  assert.strictEqual(b.clampScale(NaN), 0.6)
  for (let i = 0; i < 50; i++) {
    const t = b.randomTilt()
    assert.ok(t >= -8 && t <= 8, `tilt ${t}`)
  }
})

test('Tilt cycles through the range and wraps', () => {
  const seen = [0]
  let t = 0
  for (let i = 0; i < 5; i++) {
    t = b.nextTilt(t)
    seen.push(t)
  }
  assert.deepStrictEqual(seen, [0, 6, 12, -12, -6, 0])
  assert.strictEqual(b.nextTilt(3.4), 6)
})

test('Bigger and Smaller step by 0.2 and stop at the limits', () => {
  assert.strictEqual(b.bigger(1), 1.2)
  assert.strictEqual(b.bigger(1.6), 1.6)
  assert.strictEqual(b.smaller(0.6), 0.6)
  assert.strictEqual(b.smaller(1), 0.8)
})

test('fractions round-trip between touches and points on any board', () => {
  for (const [w, h] of [[343, 394], [390, 449], [700, 805]]) {
    const f = b.toFraction(w * 0.25, h * 0.75, w, h)
    assert.deepStrictEqual(f, { x: 0.25, y: 0.75 })
    const size = b.stickerPoints(1, w)
    const p = b.toPoints(f.x, f.y, w, h, size)
    assert.ok(Math.abs(p.left + size / 2 - w * 0.25) < 0.5)
    assert.ok(Math.abs(p.top + size / 2 - h * 0.75) < 0.5)
  }
  assert.deepStrictEqual(b.toFraction(-20, 9999, 300, 300), { x: 0, y: 1 })
})

test('dragging never leaves the board', () => {
  assert.deepStrictEqual(b.dragBy(0.9, 0.1, 500, -500, 300, 345), { x: 1, y: 0 })
  assert.deepStrictEqual(b.dragBy(0.5, 0.5, 30, 0, 300, 345), { x: 0.6, y: 0.5 })
})

test('sticker size is 128 at scale 1 on a phone board and scales 0.6x to 1.6x', () => {
  assert.strictEqual(b.stickerPoints(1, 390), 128)
  assert.strictEqual(b.stickerPoints(0.6, 390), 77)
  assert.strictEqual(b.stickerPoints(1.6, 390), 205)
  assert.ok(b.stickerPoints(1, 200) < 128)
})

test('new stickers go on top; drawing order is by z', () => {
  const ps = [
    { id: 'a', z: 3, created_at: '2026-11-01' },
    { id: 'b', z: 0, created_at: '2026-11-02' },
    { id: 'c', z: 3, created_at: '2026-10-01' },
  ]
  assert.strictEqual(b.topZ(ps), 4)
  assert.strictEqual(b.topZ([]), 0)
  assert.deepStrictEqual(b.sortForDrawing(ps).map((p) => p.id), ['b', 'c', 'a'])
})

test('placements for hidden or missing stickers render nothing', () => {
  const stickers = {
    s1: { id: 's1', image_url: 'https://x/s1.webp', is_active: true },
    s2: { id: 's2', image_url: 'https://x/s2.webp', is_active: false },
  }
  const ps = [
    b.normalizePlacement({ id: 1, sticker_id: 's1', x: 0.5, y: 0.5, tilt: 4, scale: 1, z: 1 }),
    b.normalizePlacement({ id: 2, sticker_id: 's2', x: 0.5, y: 0.5, tilt: 4, scale: 1, z: 2 }),
    b.normalizePlacement({ id: 3, sticker_id: 'gone', x: 2, y: -1, tilt: 99, scale: 9, z: -4 }),
  ]
  assert.deepStrictEqual(b.visiblePlacements(ps, stickers).map((p) => p.id), ['1'])
  assert.deepStrictEqual(
    { x: ps[2].x, y: ps[2].y, tilt: ps[2].tilt, scale: ps[2].scale, z: ps[2].z },
    { x: 1, y: 0, tilt: 12, scale: 1.6, z: 0 },
  )
})

test('drawer lists earned stickers first, newest first, then greyed ones with a hint', () => {
  const stickers = [
    { id: 'a', image_url: 'u', unlock_rule: 'quest', unlock_hint: 'Verify Run Dallas Road', is_active: true },
    { id: 'b', image_url: 'u', unlock_rule: 'badge', unlock_hint: null, is_active: true },
    { id: 'c', image_url: 'u', unlock_rule: 'quest', unlock_hint: null, is_active: true },
    { id: 'd', image_url: 'u', unlock_rule: 'quest', unlock_hint: null, is_active: false },
  ]
  const earned = [
    { sticker_id: 'c', earned_at: '2026-11-01' },
    { sticker_id: 'b', earned_at: '2026-11-10' },
  ]
  const entries = b.drawerEntries(stickers, earned)
  assert.deepStrictEqual(entries.map((e) => [e.sticker.id, e.earned]), [['b', true], ['c', true], ['a', false]])
  assert.strictEqual(entries[2].hint, 'Verify Run Dallas Road')
})

// ─── Guards for the sticker direction ────────────────────────────────────────

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) out.push(full)
  }
  return out
}

test('no icon-tile or sprite stand-ins remain in the app', () => {
  assert.ok(!fs.existsSync(path.join(MOBILE, 'components', 'Sprite.tsx')), 'components/Sprite.tsx is retired')
  assert.ok(!fs.existsSync(path.join(MOBILE, 'components', 'Cutout.tsx')), 'components/Cutout.tsx is replaced by Sticker')
  const files = ['app', 'components', 'hooks', 'lib'].flatMap((d) => walk(path.join(MOBILE, d)))
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8')
    assert.ok(!/from ['"]@\/components\/(Sprite|Cutout)['"]/.test(src), `${path.relative(MOBILE, file)} imports a retired component`)
  }
})

test('the Sticker component renders nothing without an image', () => {
  const src = fs.readFileSync(path.join(MOBILE, 'components', 'Sticker.tsx'), 'utf8')
  assert.ok(/if \(!uri\) return null/.test(src))
  assert.ok(!/Ionicons|CategoryIcon/.test(src), 'no icon fallback')
})

test('medal palettes use the category brights, not old Tailwind colours', () => {
  const src = read('apps/mobile/components/badges/medal.tsx')
  for (const old of ['#3B82F6', '#2563EB', '#F97316', '#14B8A6', '#0EA5E9', '#38BDF8', '#EA580C', '#0D9488']) {
    assert.ok(!src.toUpperCase().includes(old), `medal.tsx still uses ${old}`)
  }
  for (const gold of ['#F6B93B', '#FFE9A8', '#B97709']) assert.ok(src.toUpperCase().includes(gold), `gold token ${gold}`)
})

test('migration 041 locks placements to their owner and follows feed privacy', () => {
  const sql = read('supabase/migrations/041_stickers.sql')
  assert.ok(/NOT APPLIED TO PRODUCTION/.test(sql))
  assert.ok(/CHECK \(tilt >= -12 AND tilt <= 12\)/.test(sql))
  assert.ok(/CHECK \(scale >= 0\.6 AND scale <= 1\.6\)/.test(sql))
  assert.ok(/REFERENCES user_stickers \(user_id, sticker_id\) ON DELETE CASCADE/.test(sql))
  assert.ok(/WITH CHECK \(user_id = auth\.uid\(\)\)/.test(sql))
  assert.ok(/p\.feed_public = true/.test(sql) && /is_blocked_pair/.test(sql))
  assert.ok(/GRANT UPDATE \(x, y, tilt, scale, z\) ON sticker_placements TO authenticated/.test(sql))
})

console.log(`\n${passed} sticker tests passed`)
