import fs from 'fs'
import path from 'path'

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', 'dist', 'coverage'].includes(e.name)) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, acc)
    else if (/\.(tsx?|jsx?)$/.test(e.name) && !e.name.endsWith('.d.ts')) acc.push(p)
  }
  return acc
}

const files = [...walk('apps'), ...walk('packages'), ...walk('supabase/functions'), ...walk('scripts')].filter(
  (f) => !f.includes(`${path.sep}scripts${path.sep}find-unreferenced`)
)
const texts = new Map(files.map((f) => [f, fs.readFileSync(f, 'utf8')]))
const all = [...texts.values()].join('\n')

const exportRe =
  /export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)|export\s+(?:const|let|class|type|interface|enum)\s+([A-Za-z0-9_]+)|export\s*\{([^}]+)\}/g

const unused = []
for (const [file, text] of texts) {
  if (file.includes(`${path.sep}app${path.sep}`) && /\\(page|layout|route|middleware|actions)\./.test(file)) {
    // still check non-default exports
  }
  const names = new Set()
  for (const m of text.matchAll(exportRe)) {
    if (m[1]) names.add(m[1])
    if (m[2]) names.add(m[2])
    if (m[3]) {
      for (const part of m[3].split(',')) {
        const name = part.trim().split(/\s+as\s+/).pop()?.trim()
        if (name && /^[A-Za-z0-9_]+$/.test(name)) names.add(name)
      }
    }
  }
  for (const name of names) {
    if (['default', 'metadata', 'revalidate', 'dynamic', 'runtime'].includes(name)) continue
    const re = new RegExp(`\\b${name}\\b`, 'g')
    const hits = (all.match(re) || []).length
    const inFile = (text.match(re) || []).length
    if (hits - inFile <= 0) unused.push(`${file.split(path.sep).join('/')}:${name}`)
  }
}

console.log(unused.join('\n') || '(none)')
console.log(`--- unused exports ${unused.length}`)
