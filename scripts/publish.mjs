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

const REGISTRY = 'https://npm.pkg.github.com'
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
  execFileSync('pnpm', ['publish', '--no-git-checks'], { cwd: pkgDir, stdio: 'inherit' })
  published++
}

console.log(`\n${published} published, ${skipped} skipped`)
