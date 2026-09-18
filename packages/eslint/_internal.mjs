/**
 * Internal helpers shared by LintKit ESLint configs (ESM only).
 */
import { createRequire } from 'node:module'
import path from 'node:path'

/** Prefer consumer's node_modules, then fallback to this package. */
const consumerRequire = createRequire(path.join(process.cwd(), 'package.json'))
const selfRequire = createRequire(import.meta.url)

/**
 * Resolve a module id from consumer first, then self.
 * @param {string} spec
 * @returns {string}
 */
export function resolveFromConsumerOrSelf(spec) {
  try { return consumerRequire.resolve(spec) } catch { return selfRequire.resolve(spec) }
}

/**
 * Dynamic import that returns default export when available.
 * @template T
 * @param {string} spec
 * @param {(s:string)=>string} [resolver=resolveFromConsumerOrSelf]
 * @returns {Promise<T>}
 */
export async function importDefault(spec, resolver = resolveFromConsumerOrSelf) {
  const mod = await import(resolver(spec))
  return mod?.default ?? mod
}

/**
 * Read JSON array from env: KEY='["a","b"]'
 * @template T
 * @param {string} key
 * @param {T[]} [fallback=[]]
 * @returns {T[]}
 */
export function fromEnvJSON(key, fallback = []) {
  try {
    const raw = process.env[key]
    if (!raw) return [...fallback]
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? [...parsed] : [...fallback]
  } catch {
    return [...fallback]
  }
}

/** Defaults */
export function defaultUseTSResolverFromEnv() {
  return process.env.LINTKIT_DISABLE_TS_RESOLVER ? false : true
}
export const DEFAULT_IGNORE_DTS = ['**/*.d.ts']
export const DEFAULT_TS_FILES = [
  'apps/**/{app,src}/**/*.{ts,tsx}',
  'packages/**/src/**/*.{ts,tsx}',
]
export const DEFAULT_JS_FILES = ['**/*.{js,jsx}']

/** typed ESLint で参照する tsconfig グロブ（モノレポ前提） */
export const DEFAULT_TS_PROJECT_GLOBS = [
  'apps/**/tsconfig*.json',
  'packages/**/tsconfig*.json',
]


// ----------------------------------------------------------------

/**
 * typed-zone（型あり ESLint）に適用する既定のファイルグロブ
 * A. 最小（軽量）：Nextアプリ配下のみ
 */
export const DEFAULT_TYPED_ZONE_FILES_MIN = [
  'apps/**/{app,src}/**/*.{ts,tsx}',
]

/**
 * B. 広域（厳密）：monorepoの「apps + packages/src」をすべて型ありに
 *   ※ CPUコスト上がるため、重い場合は MIN に戻すか、環境変数で絞る
 */
export const DEFAULT_TYPED_ZONE_FILES_WIDE = [
  'apps/**/{app,src}/**/*.{ts,tsx}',
  'packages/**/src/**/*.{ts,tsx}',
]

/**
 * 実運用で使うデフォルト（お好みでどちらかを有効化）
 */
export const DEFAULT_TYPED_ZONE_FILES = DEFAULT_TYPED_ZONE_FILES_MIN
// もし軽量運用を優先するなら、こちらに切替：
// export const DEFAULT_TYPED_ZONE_FILES = DEFAULT_TYPED_ZONE_FILES_MIN

// ----------------------------------------------------------------

/** Common rule fragments */
export const BASE_STYLE_RULES = {
  semi: ['error', 'never', { beforeStatementContinuationChars: 'never' }],
  'semi-spacing': ['error', { after: true, before: false }],
  'semi-style': ['error', 'first'],
  'no-extra-semi': 'error',
  'no-unexpected-multiline': 'error',
  'no-unreachable': 'error',

  // 日本語 UI では JSX テキスト中の全角スペースが意図的なレイアウトになる
  // (例: <span>　次回更新 {period}</span>)。コード部分の紛れ込みは引き続き弾く。
  'no-irregular-whitespace': ['error', { skipJSXText: true }],
}
export const TS_CORE_RULES = {
  'no-undef': 'off',
  'no-unused-vars': 'off',
  'no-throw-literal': 'off',
  '@typescript-eslint/only-throw-error': 'off',
  '@typescript-eslint/no-unused-vars': [
    'error',
    { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
  ],
}
