#!/usr/bin/env node
// LintKit: markdownlint wrapper
// サブコマンド: check | write（--fix）
// 既定のパターン: check→README.md / write→**/*.md
// 既定の無視: node_modules, .next, dist, build, coverage, .contentlayer
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const require = createRequire(import.meta.url)
const mdBin = require.resolve('markdownlint-cli/markdownlint.js')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const defaultConfigPath = path.resolve(__dirname, '../config/base.json')

const argv0 = process.argv.slice(2)

if (argv0.includes('-h') || argv0.includes('--help')) {
  console.log(`Usage:
  lintkit-markdownlint [check|write] [globs...] [-- <markdownlint-cli options>]

Examples:
  lintkit-markdownlint check
  lintkit-markdownlint write "**/*.md"
  lintkit-markdownlint check README.md -- --config .markdownlintrc
`)
  process.exit(0)
}
if (argv0.includes('-v') || argv0.includes('--version')) {
  const r = spawnSync(process.execPath, [mdBin, '--version'], { stdio: 'inherit' })
  process.exit(r.status ?? 0)
}

// サブコマンド
let subcmd = 'check'
if (argv0[0] && !argv0[0].startsWith('-')) subcmd = argv0.shift()

// ユーザー引数（globs/オプション混在可、CLI に素通し）
const userArgs = argv0

// --config 指定が無ければ共通設定を注入
const hasConfig = userArgs.includes('-c') || userArgs.includes('--config')
const args = []
if (!hasConfig) args.push('--config', defaultConfigPath)

// write は --fix
if (subcmd === 'write' && !userArgs.includes('--fix') && !userArgs.includes('-f')) {
  args.push('--fix')
}

// 既定 ignore（--ignore/--ignore-path が無い場合のみ）
const hasIgnore = userArgs.some((a, i) =>
  a === '--ignore' || a === '-i' || a === '--ignore-path' ||
  (a === '-c' && userArgs[i + 1]) || (a === '--config' && userArgs[i + 1])
)
if (!hasIgnore && !process.env.LINTKIT_MD_NO_DEFAULT_IGNORES) {
  ;[
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/.contentlayer/**'
  ].forEach((p) => { args.push('--ignore', p) })
}

// パターン未指定時は既定を付与
const needsDefaultPatterns = userArgs.length === 0
if (needsDefaultPatterns) {
  args.push(subcmd === 'write' ? '**/*.md' : 'README.md')
}

// 実行
const result = spawnSync(process.execPath, [mdBin, ...args, ...userArgs], { stdio: 'inherit' })
process.exit(result.status ?? 1)
