/**
 * Self-check: load every package's config/entry and fail if any throws.
 * Run before publish so a broken config never reaches the registry.
 */
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const checks = []
const ok = (n) => (checks.push(true), console.log('  ✓', n))
const fail = (n, e) => (checks.push(false), console.error('  ✗', n, '-', e.message))

// ESLint flat configs — default export is either a flat-config array or a factory.
for (const entry of ['flat', 'base', 'node', 'next']) {
  try {
    const mod = await import(path.join(root, 'packages/eslint', `${entry}.mjs`))
    const def = mod.default
    const out = typeof def === 'function' ? def() : def
    if (!Array.isArray(out)) throw new Error('did not resolve to a flat-config array')
    ok(`eslint/${entry} (${out.length} configs)`)
  } catch (e) {
    fail(`eslint/${entry}`, e)
  }
}

// Prettier config — valid JSON with the expected shape.
try {
  const j = JSON.parse(readFileSync(path.join(root, 'packages/prettier/index.json'), 'utf8'))
  if (typeof j.printWidth !== 'number') throw new Error('missing printWidth')
  ok('prettier/index.json')
} catch (e) {
  fail('prettier/index.json', e)
}

// Stylelint configs — requireable CommonJS objects.
for (const f of ['index.cjs', 'morning-routine.cjs']) {
  try {
    const c = require(path.join(root, 'packages/stylelint', f))
    if (!c || typeof c !== 'object') throw new Error('empty config')
    ok(`stylelint/${f}`)
  } catch (e) {
    fail(`stylelint/${f}`, e)
  }
}

// Markdownlint config — valid JSON.
try {
  JSON.parse(readFileSync(path.join(root, 'packages/markdownlint/config/base.json'), 'utf8'))
  ok('markdownlint/config/base.json')
} catch (e) {
  fail('markdownlint/config/base.json', e)
}

const passed = checks.filter(Boolean).length
console.log(`\n${passed}/${checks.length} checks passed`)
process.exit(passed === checks.length ? 0 : 1)
