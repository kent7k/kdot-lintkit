/**
 * Node.js + TypeScript (Flat Config, ESM only).
 * Modules are resolved from the consumer first, then this package.
 */
import {
  importDefault,
  resolveFromConsumerOrSelf,
  DEFAULT_JS_FILES,
  BASE_STYLE_RULES,
  TS_CORE_RULES,
} from './_internal.mjs'

const r = resolveFromConsumerOrSelf

const js = await importDefault('@eslint/js', r)
const globals = await importDefault('globals', r)
const tseslint = await importDefault('typescript-eslint', r)
const importPlugin = await importDefault('eslint-plugin-import', r)
const sortExportAll = await importDefault('eslint-plugin-sort-export-all', r)

/**
 * @typedef {Object} NodeOptions
 * @property {string[]} [ignores]
 * @property {boolean}  [useTSResolver]
 * @property {string[]} [jsFiles]
 */

/**
 * Build a FlatConfig for Node + TS.
 * @param {NodeOptions} [options]
 * @returns {import('eslint').Linter.FlatConfig[]}
 */
export default function createNodeTSConfig({
  ignores = [],
  useTSResolver = true,
  jsFiles = DEFAULT_JS_FILES,
} = {}) {
  return tseslint.config(
    { name: 'ignores', ignores },
    js.configs.recommended,
    {
      name: 'ts+node',
      files: ['**/*.{ts,tsx}'],
      languageOptions: {
        parser: tseslint.parser,
        parserOptions: { projectService: true, tsconfigRootDir: process.cwd() },
        ecmaVersion: 'latest',
        sourceType: 'module',
        globals: { ...globals.node },
      },
      plugins: {
        '@typescript-eslint': tseslint.plugin,
        import: importPlugin,
        'sort-export-all': sortExportAll,
      },
      settings: {
        'import/resolver': {
          node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
          ...(useTSResolver ? { typescript: { project: true } } : {}),
        },
      },
      rules: {
        ...TS_CORE_RULES,
        'no-console': 'off',

        'import/no-extraneous-dependencies': [
          'error',
          {
            devDependencies: [
              '**/*.{spec,test}.{ts,tsx,js,jsx}',
              '**/*.config.{js,ts}',
              '**/scripts/*.{js,ts}',
            ],
            peerDependencies: false,
          },
        ],
        'import/order': [
          'error',
          {
            groups: ['builtin', 'external', 'internal', 'index', 'sibling', 'parent'],
            alphabetize: { order: 'asc', caseInsensitive: true },
            'newlines-between': 'always',
          },
        ],
        'sort-imports': ['error', { ignoreDeclarationSort: true }],
        'sort-export-all/sort-export-all': 'off',
        'import/newline-after-import': 'error',
        'import/named': 'off',
        'import/prefer-default-export': 'off',

        ...BASE_STYLE_RULES,
      },
    },
    {
      name: 'jest-globals',
      files: ['**/*.{spec,test}.{ts,tsx,js,jsx}'],
      languageOptions: { globals: globals.jest },
    },
    {
      name: 'disable-type-checked-on-js',
      files: jsFiles,
      extends: [tseslint.configs.disableTypeChecked],
      languageOptions: { globals: { ...globals.node, jest: true } },
    },
  )
}
