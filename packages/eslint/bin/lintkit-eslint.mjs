#!/usr/bin/env node
/**
 * Run ESLint with LintKit defaults.
 * - Prints which ignore sources were loaded.
 * - Merges ignore globs from those files into LINTKIT_ESLINT_IGNORES_JSON.
 * - ESLint v9+ compatible bin resolution (no require.resolve on subpath).
 * CLI flags:
 *   --print-ignores | -P  : print merged ignores
 *   --dry-run             : don't run ESLint, just print info
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'

const cwd = process.cwd()
// …/packages/lintkit-eslint
const pkgRoot = path.resolve(fileURLToPath(new URL('../', import.meta.url)))

const consumerRequire = createRequire(path.join(cwd, 'package.json'))
const selfRequire = createRequire(import.meta.url)

// ---------- CLI / ENV ----------
const argvRaw = process.argv.slice(2)
let PRINT_IGNORES = process.env.LINTKIT_ESLINT_PRINT_IGNORES === '1'
let DRY_RUN = false
const argv = []
for (const a of argvRaw) {
  if (a === '--print-ignores' || a === '-P') { PRINT_IGNORES = true; continue }
  if (a === '--dry-run') { DRY_RUN = true; continue }
  argv.push(a)
}

// 追加の ignore ソース（任意）
const EXTRA_SOURCES = (() => {
  try {
    const raw = process.env.LINTKIT_ESLINT_SOURCES_JSON
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.map((p) => path.resolve(cwd, p)) : []
  } catch { return [] }
})()

const candidateSources = [
  path.join(cwd, 'packages/tooling-ignores/common.ignore'),
  path.join(pkgRoot, 'ignore'),
  ...EXTRA_SOURCES,
]

// ---------- Helpers ----------
/** Parse JSON array env safely. */
function fromEnvJSON(key) {
  try {
    const raw = process.env[key]
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

/**
 * Strip a trailing inline comment from a single .ignore line.
 * A "trailing inline comment" is defined as `# ...` when the `#` is preceded by whitespace.
 * Examples:
 *   'foo/bar  # comment' -> 'foo/bar'
 *   'foo#bar'            -> 'foo#bar'   (kept, not a comment)
 *   '# full line'        -> ''          (removed as full-line comment)
 * @param {string} line
 * @returns {string} cleaned line or '' if it's empty/comment
 */
function stripTrailingInlineComment(line) {
  // Normalize line ending and surrounding space first
  const s = line.replace(/\r$/, '').trim()
  if (!s || s.startsWith('#')) return ''
  const idx = s.indexOf('#')
  if (idx > 0 && /\s/.test(s[idx - 1])) {
    // Whitespace immediately before '#': treat as inline comment
    return s.slice(0, idx).trimEnd()
  }
  return s
}

/**
 * Read an .ignore-like file and return glob patterns.
 * - Removes blank lines and comments
 * - Removes trailing inline comments
 */
function readIgnoreFile(file) {
  const text = fs.readFileSync(file, 'utf8')
  return text
    .split(/\r?\n/g)
    .map(stripTrailingInlineComment)
    .filter(Boolean)
}

/** Normalize path-style for consistent deduplication. */
function normalizeGlob(g) {
  return g.replace(/\\/g, '/').replace(/\/{2,}/g, '/').trim()
}

/** Unique helper */
const uniq = (arr) => Array.from(new Set(arr))

// ---------- Sources ----------
const sources = candidateSources.filter((p) => fs.existsSync(p))
console.log('[lintkit-eslint] sources:')
for (const s of sources) console.log(`  - ${s}`)

// ---------- Merge ignores (env + files) ----------
const mergedIgnores = uniq([
  ...fromEnvJSON('LINTKIT_ESLINT_IGNORES_JSON').map(normalizeGlob),
  ...sources.flatMap(readIgnoreFile).map(normalizeGlob),
])

if (PRINT_IGNORES) {
  console.log(`[lintkit-eslint] ignores (${mergedIgnores.length}):`)
  for (const g of mergedIgnores) console.log(`  - ${g}`)
}

if (DRY_RUN) {
  console.log('[lintkit-eslint] dry-run: not invoking ESLint')
  process.exit(0)
}

// ---------- ESLint invocation ----------
const hasConfigFlag =
  argv.some((a) => a === '--config' || a === '-c') ||
  argv.some((a) => a.startsWith('--config='))
const flatConfigPath = selfRequire.resolve('../flat.mjs')
const eslintArgs = hasConfigFlag ? argv : ['--config', flatConfigPath, ...argv]

// Find eslint bin (compatible with v9+)
function findPkgRoot(startFile) {
  let dir = path.dirname(startFile)
  const { root } = path.parse(dir)
  while (dir && dir !== root) {
    const pj = path.join(dir, 'package.json')
    if (fs.existsSync(pj)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pj, 'utf8'))
        if (pkg?.name === 'eslint') return dir
      } catch { /* ignore */ }
    }
    dir = path.dirname(dir)
  }
  return null
}

function resolveEslintBin() {
  let entry
  try { entry = consumerRequire.resolve('eslint') } catch {}
  if (!entry) { try { entry = selfRequire.resolve('eslint') } catch {} }
  if (!entry) return null

  const root = findPkgRoot(entry)
  if (!root) return null

  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
    const binField = pkg?.bin
    let rel
    if (typeof binField === 'string') rel = binField
    else if (binField && typeof binField === 'object') rel = binField.eslint || Object.values(binField)[0]
    if (rel) {
      const abs = path.join(root, rel)
      if (fs.existsSync(abs)) return abs
    }
  } catch { /* ignore */ }

  const fallback = path.join(root, 'bin', 'eslint.js')
  if (fs.existsSync(fallback)) return fallback
  return null
}

const eslintBin = resolveEslintBin()

const env = { ...process.env, LINTKIT_ESLINT_IGNORES_JSON: JSON.stringify(mergedIgnores) }

let result
if (eslintBin) {
  result = spawnSync(process.execPath, [eslintBin, ...eslintArgs], { stdio: 'inherit', env })
} else {
  const cmd = process.platform === 'win32' ? 'eslint.cmd' : 'eslint'
  result = spawnSync(cmd, eslintArgs, { stdio: 'inherit', env, shell: process.platform === 'win32' })
}

process.exit(result.status ?? 1)
