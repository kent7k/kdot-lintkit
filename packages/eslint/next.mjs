/**
 * Next.js + TypeScript (Flat Config, ESM only).
 * Prefer consumer-installed dependencies; fallback to package's own.
 */
import {
  importDefault,
  resolveFromConsumerOrSelf,
  defaultUseTSResolverFromEnv,
  DEFAULT_IGNORE_DTS,
  DEFAULT_TS_FILES,
  DEFAULT_JS_FILES,
  BASE_STYLE_RULES,
  TS_CORE_RULES,
  fromEnvJSON,
  DEFAULT_TYPED_ZONE_FILES, DEFAULT_TS_PROJECT_GLOBS,
} from './_internal.mjs';


const r = resolveFromConsumerOrSelf

const js = await importDefault('@eslint/js', r)
const globals = await importDefault('globals', r)
const tseslint = await importDefault('typescript-eslint', r)
const nextPlugin = await importDefault('@next/eslint-plugin-next', r)
const importPlugin = await importDefault('eslint-plugin-import', r)
const sortExportAll = await importDefault('eslint-plugin-sort-export-all', r)
// 明示登録（extends で読み込まれるが、自前で使うルール名もあるため宣言しておく）
const reactPlugin = await importDefault('eslint-plugin-react', r)
const reactHooksPlugin = await importDefault('eslint-plugin-react-hooks', r)
const jsxA11yPlugin = await importDefault('eslint-plugin-jsx-a11y', r)


/**
 * @typedef {Object} NextOptions
 * @property {string[]} [ignores]
 * @property {string[]} [ignoreDts]
 * @property {string[]} [tsFiles]
 * @property {string[]} [jsFiles]
 * @property {boolean}  [useTSResolver]
 * @property {"detect"|string} [reactVersion]
 */

/**
 * Build a FlatConfig for Next.js + TS (monorepo friendly).
 * @param {NextOptions} [options]
 * @returns {import('eslint').Linter.FlatConfig[]}
 */
export default function createNextConfig({
  ignores = [],
  reactVersion = 'detect',
  useTSResolver = defaultUseTSResolverFromEnv(),
  ignoreDts = DEFAULT_IGNORE_DTS,
  tsFiles = DEFAULT_TS_FILES,
  jsFiles = DEFAULT_JS_FILES,
} = {}) {
  return tseslint.config(
    { name: 'ignores', ignores },
    js.configs.recommended,
     {
       name: 'next-plugin-core-web-vitals',
       plugins: { '@next/next': nextPlugin },
       // モノレポで Next 本体がルート直下に無い場合の推奨設定
       settings: { next: { rootDir: ['apps/*/'] } }, // 例: ['apps/web', 'apps/cms'] でも可
       rules: {
         ...nextPlugin.configs.recommended.rules,
         ...nextPlugin.configs['core-web-vitals'].rules,
       },
     },

    {
      name: 'ts+react',
      files: tsFiles,
      ...(ignoreDts?.length ? { ignores: ignoreDts } : {}),
      languageOptions: {
        parser: tseslint.parser,
        parserOptions: {
          // ★ 超シンプル運用：型解決をやめる（tsc が型を担保）
          projectService: false,
          project: null,
          tsconfigRootDir: process.cwd(),
         },
        ecmaVersion: 'latest',
        sourceType: 'module',
        globals: { ...globals.browser, ...globals.node },
      },
      plugins: {
        '@typescript-eslint': tseslint.plugin,
        import: importPlugin,
        'sort-export-all': sortExportAll,
        react: reactPlugin,
        'react-hooks': reactHooksPlugin,
        'jsx-a11y': jsxA11yPlugin,
      },
      settings: {
        react: { version: reactVersion },
        'import/resolver': {
          node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
          ...(useTSResolver
            ? {
                typescript: {
                  // モノレポ広域探索を避け、対象プロジェクトに限定
                  project: ['apps/**/tsconfig*.json', 'packages/**/tsconfig*.json'],
                  alwaysTryTypes: false,
                },
              }
            : {}),
        },
      },
      rules: {
        ...TS_CORE_RULES,

        'no-return-assign': 'off',
        'no-console': 'off',
        'no-plusplus': 'off',

        'import/no-extraneous-dependencies': [
          'error',
          {
            // ★ stories / test は devDeps を許可
            devDependencies: [
              '**/*.setup.{js,ts}',
              '**/*.config.{js,ts}',
              '**/*.{spec,test}.{ts,tsx}',
              '**/.storybook/**/*.{ts,tsx}',
              '**/*.stories.{ts,tsx}',
              '**/__fixtures__/**/*.{ts,tsx}',
              '**/mocks/**/*.{ts,tsx,js,jsx}',
              'tests/**/*',
              // 手で叩く開発用スクリプト (dev-send-mail.ts 等) と scripts/ 配下
              '**/dev-*.{ts,tsx,mjs,js}',
              '**/scripts/**/*.{ts,tsx,mjs,js}',
              '**/testUtils.{ts,tsx,js,jsx}',
            ],
            // ★ ライブラリ（ui-core）向けに peerDeps を正として扱う
            peerDependencies: true,
          },
        ],
        'import/order': [
          'error',
          {
            groups: ['builtin', 'external', 'internal', 'index', 'sibling', 'parent'],
            pathGroups: [{ pattern: 'react*', group: 'external', position: 'before' }],
            pathGroupsExcludedImportTypes: ['react'],
            alphabetize: { order: 'asc', caseInsensitive: true },
            'newlines-between': 'always',
          },
        ],
        'sort-imports': ['error', { ignoreDeclarationSort: true }],
        'sort-export-all/sort-export-all': 'off',
        'import/no-named-export': 'off',
        'import/no-relative-packages': 'off',
        'import/newline-after-import': 'error',
        'import/named': 'off',
        'import/prefer-default-export': 'off',

        // next/core-web-vitals がプラグイン登録する領域
        'jsx-a11y/anchor-is-valid': 'off',
        'react/display-name': 'off',
        'react-hooks/rules-of-hooks': 'error',
        'react/jsx-filename-extension': ['warn', { extensions: ['.tsx'] }],
        // 自動 JSX ランタイムに合わせて短縮記法を正とする
        'react/jsx-fragments': ['error', 'syntax'],
        // JSX 内の未定義識別子を実行前に検知（<React.Fragment> など）
        'react/jsx-no-undef': 'error',
        'react/jsx-props-no-spreading': 'off',
        'react/prop-types': 'off',
        'react/require-default-props': 'off',
        'react/function-component-definition': 'off',
        'react/react-in-jsx-scope': 'off',

        ...BASE_STYLE_RULES,

        // いつか直して
        'no-empty': 'off',
      },
    },

    // ✅ 一部だけ「型あり ESLint」を復活させるオプトイン・ゾーン
    //    既定: Next アプリの app/src 配下。環境変数で追加・上書きできます。
    {
      name: 'typed-zones (opt-in)',
      files: fromEnvJSON('LINTKIT_TYPED_ZONE_GLOBS_JSON', DEFAULT_TYPED_ZONE_FILES),
      languageOptions: {
        parser: tseslint.parser,
        // projectService と project は排他。両方渡すと typescript-eslint が
        // 「Enabling "project" does nothing when "projectService" is enabled」で
        // 全ファイルを parsing error にする（＝ lint が丸ごと無効化される）。
        // 既定は projectService（モノレポの tsconfig も自動で辿る）。
        // 自動解決で取りこぼす場合だけ LINTKIT_TYPED_PROJECTS_JSON で
        // 明示 project モードに切り替える。
        parserOptions: {
          ...(process.env.LINTKIT_TYPED_PROJECTS_JSON
            ? {
                projectService: false,
                project: fromEnvJSON('LINTKIT_TYPED_PROJECTS_JSON', DEFAULT_TS_PROJECT_GLOBS),
              }
            : { projectService: true }),
          tsconfigRootDir: process.cwd(),
        },
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      // 型ありゾーンでのみ、型必須ルールを有効化
      rules: {
        '@typescript-eslint/only-throw-error': 'error',
        // 必要があればここに typed ルールを追加:
        // '@typescript-eslint/no-floating-promises': 'error',
      },
    },

    {
      name: 'spec-and-stories-no-project-service',
      files: ['**/*.{spec,test,stories}.{ts,tsx}'],
      languageOptions: {
        parser: tseslint.parser,
        parserOptions: { projectService: false, project: null, tsconfigRootDir: process.cwd() },
      },
      // 型前提のルールを緩める（必要に応じて調整）
      rules: { '@typescript-eslint/only-throw-error': 'off' },
    },

    // ✅ infra / scripts / ルート直下の TS は型なしで軽量に
    {
      name: 'infra-and-scripts-no-types',
      files: ['infra/**/*.{ts,tsx}', 'scripts/**/*.{ts,tsx}', '*.{ts}'],
      languageOptions: {
        parser: tseslint.parser,
        parserOptions: { projectService: false, project: null, tsconfigRootDir: process.cwd() },
        ecmaVersion: 'latest',
        sourceType: 'module',
        globals: { ...globals.browser, ...globals.node },
      },
      rules: { '@typescript-eslint/only-throw-error': 'off' },
    },

    { name: 'jest-globals', files: ['**/*.{spec,test}.{ts,tsx,js,jsx}'], languageOptions: { globals: globals.jest } },

    {
      name: 'disable-type-checked-on-js',
      files: jsFiles,
      extends: [tseslint.configs.disableTypeChecked],
      languageOptions: {
        globals: { ...globals.browser, ...globals.node, jest: true },
      },
    },
  )
}
