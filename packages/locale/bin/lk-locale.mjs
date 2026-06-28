#!/usr/bin/env node
// LintKit: locale keys verifier
// - ディレクトリごと（例: apps/web/src/locales/*）に base 言語を選び、同じディレクトリ内の他言語とキー整合性を比較します。
// - 既定の検索対象: src/locales/*.json, apps/*/src/locales/*.json, packages/*/src/locales/*.json
// - 使い方: lk-locale check [--glob <pat> ...] [--base en|ja] [--strict] [--format json|pretty] [--silent]

import fs from 'node:fs/promises'
import path from 'node:path'
import fg from 'fast-glob'

const VERSION = '0.1.0'

// ---------- CLI parse ----------
const argv0 = process.argv.slice(2)
let cmd = 'check'
if (argv0[0] && !argv0[0].startsWith('-')) cmd = argv0.shift()

let baseLang = 'en'
let baseFileArg = ''
let strict = false
let format = 'pretty' // 'pretty' | 'json'
let silent = false
let cwd = process.cwd()
const globs = []

for (let i = 0; i < argv0.length; i++) {
  const a = argv0[i]
  if (a === '--glob') { globs.push(argv0[++i]); continue }
  if (a === '--base') { baseLang = argv0[++i]; continue }
  if (a === '--base-file') { baseFileArg = argv0[++i]; continue }
  if (a === '--cwd') { cwd = path.resolve(argv0[++i]); continue }
  if (a === '--strict') { strict = true; continue }
  if (a === '--format') { format = argv0[++i]; continue }
  if (a === '--silent') { silent = true; continue }
  if (a === '-h' || a === '--help') { printHelp(); process.exit(0) }
  if (a === '-v' || a === '--version') { console.log(`lk-locale v${VERSION}`); process.exit(0) }
  console.error(`Unknown option: ${a}`)
  process.exit(1)
}

if (!['check', undefined].includes(cmd)) {
  console.error(`Unknown command: ${cmd}`)
  printHelp()
  process.exit(1)
}

if (globs.length === 0) {
  globs.push(
    'src/locales/*.json',
    'apps/*/src/locales/*.json',
    'packages/*/src/locales/*.json'
  )
}

// ---------- util ----------
function rel(p) {
  const r = path.relative(cwd, p)
  return r || '.'
}

function printHelp() {
  console.log(
`Usage:
  lk-locale check [--glob <pattern> ...] [--base <lang>] [--base-file <file>] [--strict] [--format json|pretty] [--silent] [--cwd <dir>]

Options:
  --glob <pattern>   追加の検索パターン（複数可）。未指定なら以下を使用:
                     "src/locales/*.json" "apps/*/src/locales/*.json" "packages/*/src/locales/*.json"
  --base <lang>      ベース言語ファイル名（既定: en → en.json を優先）
  --base-file <file> ベースとして固定する JSON ファイル（同ディレクトリ内の比較対象と照合）
  --strict           一致するファイルが 0 件なら失敗（exit 1）。既定は成功（skip で exit 0）
  --format <fmt>     出力形式: pretty | json（既定: pretty）
  --silent           skip 時のメッセージを出力しない
  --cwd <dir>        作業ディレクトリ（既定: process.cwd()）
  -h, --help         ヘルプを表示
  -v, --version      バージョンを表示`
  )
}

function flattenKeys(obj, prefix = '') {
  const out = []
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      const name = prefix ? `${prefix}.${k}` : k
      if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...flattenKeys(v, name))
      else out.push(name)
    }
  }
  return out
}
const keysOf = (obj) => new Set(flattenKeys(obj))

async function readJSON(file) {
  try {
    const txt = await fs.readFile(file, 'utf8')
    return JSON.parse(txt)
  } catch (e) {
    throw new Error(`Invalid JSON: ${rel(file)}\n  ${e.message}`)
  }
}

function pickBaseFile(files, baseLang, baseFileArg) {
  if (baseFileArg) {
    const absBase = path.resolve(cwd, baseFileArg)
    const match = files.find((f) => path.resolve(f) === absBase)
    if (match) return match
  }
  const re = new RegExp(`${path.sep}${baseLang}\\.json$`)
  const found = files.find((f) => re.test(f))
  return found || files[0]
}

// ---------- main ----------
async function main() {
  const files = await fg(globs, {
    cwd,
    absolute: true,
    dot: false,
    ignore: ['**/node_modules/**', '**/.git/**', '**/.turbo/**']
  })

  if (files.length === 0) {
    const msg = 'lk-locale: no locale files matched. Skipping.'
    if (strict) { if (!silent) console.error(msg); process.exit(1) }
    if (!silent) console.log(msg)
    process.exit(0)
  }

  // ディレクトリごとにグループ化（…/src/locales 配下単位）
  const groups = new Map()
  for (const f of files) {
    const dir = path.dirname(f)
    if (!groups.has(dir)) groups.set(dir, [])
    groups.get(dir).push(f)
  }

  let anyFail = false
  const report = []

  for (const [dir, list] of groups) {
    list.sort()
    const baseFile = pickBaseFile(list, baseLang, baseFileArg)
    const baseObj = await readJSON(baseFile)
    const baseKeys = keysOf(baseObj)

    const entries = []
    for (const f of list) {
      if (f === baseFile) continue
      const obj = await readJSON(f)
      const ks = keysOf(obj)
      const missing = [...baseKeys].filter((k) => !ks.has(k)).sort()
      const extra = [...ks].filter((k) => !baseKeys.has(k)).sort()
      entries.push({ file: f, missing, extra })
      if (missing.length || extra.length) anyFail = true
    }
    report.push({ dir, baseFile, files: entries })
  }

  if (format === 'json') {
    const payload = {
      ok: !anyFail,
      groups: report.map((g) => ({
        dir: rel(g.dir),
        baseFile: rel(g.baseFile),
        files: g.files.map((x) => ({
          file: rel(x.file),
          missing: x.missing,
          extra: x.extra
        }))
      }))
    }
    console.log(JSON.stringify(payload, null, 2))
    process.exit(anyFail ? 1 : 0)
  }

  // pretty
  for (const g of report) {
    if (g.files.length === 0) {
      // そのディレクトリに base のみ存在
      console.log(`(skip) only base found in ${rel(g.dir)} (base: ${rel(g.baseFile)})`)
      continue
    }
    const hasDiff = g.files.some((x) => x.missing.length || x.extra.length)
    if (hasDiff) {
      console.log(`\n[${rel(g.dir)}] (base: ${rel(g.baseFile)})`)
      for (const x of g.files) {
        if (x.missing.length || x.extra.length) {
          console.log(`- ${rel(x.file)}`)
          if (x.missing.length) console.log(`  missing: ${x.missing.join(', ')}`)
          if (x.extra.length)   console.log(`  extra  : ${x.extra.join(', ')}`)
        }
      }
    } else {
      console.log(`Locale keys are aligned ✅ (dir: ${rel(g.dir)}, base: ${rel(g.baseFile)})`)
    }
  }

  process.exit(anyFail ? 1 : 0)
}

main().catch((e) => {
  console.error(e?.stack || String(e))
  process.exit(1)
})
