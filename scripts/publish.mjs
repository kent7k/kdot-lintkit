/**
 * Idempotent monorepo publish for independently-versioned packages.
 * For each non-private package, publish only if name@version is not already
 * on the registry. Safe to re-run; a single repo tag no longer republishes
 * (and conflicts on) unchanged packages.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REGISTRY = 'https://registry.npmjs.org/'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkgsDir = path.join(root, 'packages')

let published = 0
let skipped = 0

for (const dir of readdirSync(pkgsDir)) {
  const pkgDir = path.join(pkgsDir, dir)
  let pkg
  try {
    pkg = JSON.parse(readFileSync(path.join(pkgDir, 'package.json'), 'utf8'))
  } catch {
    continue
  }
  if (pkg.private || !pkg.name || !pkg.version) continue

  const spec = `${pkg.name}@${pkg.version}`
  let exists = false
  try {
    execFileSync('npm', ['view', spec, 'version', `--registry=${REGISTRY}`], { stdio: 'pipe' })
    exists = true
  } catch {
    exists = false // not found (or other view error) -> attempt publish
  }

  if (exists) {
    console.log(`skip    ${spec} (already published)`)
    skipped++
    continue
  }

  console.log(`publish ${spec}`)
  // npm CLI で出す: npmjs の trusted publishing（OIDC）は npm >= 11.5.1 だけが対応し、pnpm publish は token を要る。
  // workspace: 依存は無いので pnpm の書き換えは要らない。
  execFileSync('npm', ['publish', '--access', 'public', `--registry=${REGISTRY}`], { cwd: pkgDir, stdio: 'inherit' })
  published++
}

console.log(`\n${published} published, ${skipped} skipped`)
