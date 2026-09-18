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
for (const f of ['index.cjs']) {
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

// ESLint smoke run — the config-load checks above only prove the config *imports*.
// They cannot see a parser misconfiguration, which silently turns every file into a
// parsing error and disables linting entirely in consumers. So actually lint a fixture.
try {
  const { ESLint } = await import('eslint')
  const fixtureRoot = path.join(root, 'scripts/fixtures')
  const cwd = process.cwd()
  process.chdir(fixtureRoot) // configs read process.cwd() for tsconfigRootDir
  try {
    const mod = await import(path.join(root, 'packages/eslint/next.mjs'))
    const def = mod.default
    const baseConfig = typeof def === 'function' ? def() : def
    const eslint = new ESLint({ overrideConfigFile: true, baseConfig, cwd: fixtureRoot })
    const results = await eslint.lintFiles(['apps/demo/src/sample.tsx'])
    const msgs = results.flatMap((r) => r.messages)
    if (msgs.length) {
      throw new Error(msgs.map((m) => `${m.ruleId ?? 'parse'}: ${m.message}`).join(' | '))
    }
    ok('eslint/next smoke lint (fixture)')
  } finally {
    process.chdir(cwd)
  }
} catch (e) {
  fail('eslint/next smoke lint (fixture)', e)
}

// Stylelint smoke run — requiring the config does not validate rule names.
// An invalid rule (e.g. a wrong "scss/" prefix) only surfaces as an "Unknown rule"
// error per linted file, so actually lint a fixture.
try {
  const stylelint = (await import('stylelint')).default
  const config = require(path.join(root, 'packages/stylelint/index.cjs'))
  const res = await stylelint.lint({
    files: path.join(root, 'scripts/fixtures/styles/sample.scss'),
    config,
    customSyntax: require.resolve('postcss-scss'),
    configBasedir: path.join(root, 'packages/stylelint'),
  })
  const warnings = res.results.flatMap((r) => r.warnings)
  const invalid = res.results.flatMap((r) => r.invalidOptionWarnings ?? [])
  if (warnings.length || invalid.length) {
    throw new Error(
      [...invalid.map((w) => w.text), ...warnings.map((w) => `${w.rule}: ${w.text}`)].join(' | '),
    )
  }
  ok('stylelint/index.cjs smoke lint (fixture)')
} catch (e) {
  fail('stylelint/index.cjs smoke lint (fixture)', e)
}

const passed = checks.filter(Boolean).length
console.log(`\n${passed}/${checks.length} checks passed`)
process.exit(passed === checks.length ? 0 : 1)
