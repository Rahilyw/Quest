#!/usr/bin/env node
'use strict'

/**
 * Token guard for the Cutouts design system (docs/design/BRAND.md §12).
 *
 * Flags raw colour literals (#hex, rgb/rgba) and fontSize literals outside the files that
 * are allowed to define them. Screens should use COLOR / CATEGORY / TYPE from lib/theme.ts
 * and the text primitives in components/ui/Text.tsx.
 *
 *   npm run lint:tokens            report only (Phase 1 to 3)
 *   npm run lint:tokens -- --strict  exit 1 on any finding (from the end of Phase 4)
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const SCAN = ['app', 'components', 'hooks', 'lib']
const ALLOW = new Set([
  'lib/theme.ts',
  'components/ui/Text.tsx',
  // Badge artwork is illustration: its palette lives with the drawings.
  'components/badges/art.tsx',
  'components/badges/medal.tsx',
])

const RULES = [
  { name: 'hex colour', re: /['"`]#[0-9a-fA-F]{3,8}['"`]/g },
  { name: 'rgb colour', re: /['"`]rgba?\([^)]*\)['"`]/g },
  { name: 'fontSize literal', re: /fontSize:\s*\d/g },
]

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (/\.(tsx?|jsx?)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) out.push(full)
  }
  return out
}

const strict = process.argv.includes('--strict')
const files = SCAN.flatMap((d) => walk(path.join(ROOT, d), []))
const report = []
const totals = Object.fromEntries(RULES.map((r) => [r.name, 0]))

for (const file of files) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/')
  if (ALLOW.has(rel)) continue
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
  const counts = {}
  lines.forEach((line) => {
    if (/^\s*(\/\/|\*)/.test(line)) return
    for (const rule of RULES) {
      const n = (line.match(rule.re) || []).length
      if (n) {
        counts[rule.name] = (counts[rule.name] || 0) + n
        totals[rule.name] += n
      }
    }
  })
  const sum = Object.values(counts).reduce((a, b) => a + b, 0)
  if (sum) report.push({ rel, sum, counts })
}

report.sort((a, b) => b.sum - a.sum)
for (const { rel, sum, counts } of report) {
  const detail = Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')
  console.log(`${String(sum).padStart(4)}  ${rel}  (${detail})`)
}
const total = Object.values(totals).reduce((a, b) => a + b, 0)
console.log(
  `\n${total} raw token${total === 1 ? '' : 's'} in ${report.length} file${report.length === 1 ? '' : 's'}: ` +
    Object.entries(totals).map(([k, v]) => `${v} ${k}`).join(', '),
)
if (strict && total > 0) process.exit(1)
