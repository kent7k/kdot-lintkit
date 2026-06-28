/**
 * Minimal JS base (no TS). Shared by Node/Next configurations.
 */
import { importDefault, resolveFromConsumerOrSelf } from './_internal.mjs'

const r = resolveFromConsumerOrSelf
const js = await importDefault('@eslint/js', r)
const globals = await importDefault('globals', r)

/**
 * @param {{ ignores?: string[] }} [opts]
 * @returns {import('eslint').Linter.FlatConfig[]}
 */
export function createBase({ ignores = [] } = {}) {
  return [
    { name: 'ignores', ignores },
    js.configs.recommended,
    {
      name: 'base-language',
      languageOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        globals: { ...globals.node, ...globals.browser },
      },
    },
  ]
}

export default createBase
