/**
 * Flat preset for consumers.
 * Builds on the Next.js config and applies pragmatic tweaks.
 */
import createNextConfig from './next.mjs'
import { fromEnvJSON } from './_internal.mjs'

const MERGED_IGNORES = fromEnvJSON('LINTKIT_ESLINT_IGNORES_JSON')
const IGNORE_DTS = fromEnvJSON('LINTKIT_ESLINT_IGNORE_DTS_JSON')

const base = createNextConfig({
  ignores: MERGED_IGNORES,
  ignoreDts: IGNORE_DTS,
})

const config = [
  ...base,
  {
    // App Router プロジェクトでは pages/ が無いので無効化
    name: 'next-app-router-compat',
    rules: {
      '@next/next/no-html-link-for-pages': 'off',
      // いつか直して
      'no-empty': 'off',
      'no-undef': 'off',
      'no-unused-vars': 'off'
    },
  },
  // ここからコスト最適化（確実に止血）：import の解決は Node のみ
  {
    name: 'resolver-global-node-only',
    settings: {
      'import/resolver': {
       // 解決を Node 解決に限定するのは、むしろ大規模ワークスペースでは推奨
       //    typescript: { project: [
       //      'apps/cms/tsconfig.json'
       //    ] },
        typescript: false, // ← これが無いと base 側の typescript リゾルバが残ります
        node: { extensions: ['.js', '.jsx', '.ts', '.tsx', '.d.ts'] },
      },
      rules: {
        'import/order': ['error', {
          groups: ['builtin','external','internal','parent','sibling','index','object','type'],
          pathGroups: [
            { pattern: '@/**', group: 'internal', position: 'after' },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        }],
      },
    },
  },
]

export default config
