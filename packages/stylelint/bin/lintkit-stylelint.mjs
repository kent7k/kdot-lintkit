#!/usr/bin/env node
// Run stylelint with central config.
// 1) try exports:  @kent7k/lintkit-stylelint
// 2) fallback:     ../index.cjs and ../ignore (relative to this bin)
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const req = createRequire(process.cwd() + '/package.json')

function resolveCLI(pkgName, binName) {
  try {
    const pkgJson = req.resolve(`${pkgName}/package.json`)
    const pkg = JSON.parse(fs.readFileSync(pkgJson, 'utf8'))
    const rel = typeof pkg.bin === 'string'
      ? pkg.bin
      : (pkg.bin?.[binName] ?? Object.values(pkg.bin ?? {})[0])
    if (rel) return path.resolve(path.dirname(pkgJson), rel)
  } catch {
      // noop
  }
  const localBin = path.join(process.cwd(), 'node_modules', '.bin', pkgName)
  return fs.existsSync(localBin) ? localBin : pkgName
}

// 1) exports 経由で index.cjs / ignore を解決
let cfg = null, ign = null
try { cfg = req.resolve('@kent7k/lintkit-stylelint') } catch {
    // noop
}
try { ign = req.resolve('@kent7k/lintkit-stylelint/ignore') } catch {
    // noop
}

// 2) bin からの相対 fallback
if (!cfg || !ign) {
  const here = path.dirname(fileURLToPath(new URL('.', import.meta.url)))
  if (!cfg) {
    const p = path.resolve(here, '..', 'index.cjs')
    if (fs.existsSync(p)) cfg = p
  }
  if (!ign) {
    const p = path.resolve(here, '..', 'ignore')
    if (fs.existsSync(p)) ign = p
  }
}

if (!cfg) {
  console.error('lintkit-stylelint: cannot locate central config')
  process.exit(2)
}

const raw = process.argv.slice(2)
const args = []
if (!raw.includes('--config'))      args.push('--config', cfg)
if (ign && !raw.includes('--ignore-path')) args.push('--ignore-path', ign)
if (!raw.includes('--allow-empty-input'))  args.push('--allow-empty-input')
// グロブ未指定なら既定を付与
if (!raw.some(a => !a.startsWith('-'))) {
  raw.push(
    'apps/**/{app,src}/**/*.{css,scss}',
    'packages/**/src/**/*.{css,scss}'
  )
}


const cli = resolveCLI('stylelint', 'stylelint')
const r = spawnSync(cli, [...args, ...raw], { stdio: 'inherit' })
process.exit(r.status ?? 1)
