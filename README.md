# kdot-lintkit (`@kent7k/lintkit-*`)

共有 lint / format ツールキット。pnpm monorepo で各ツールを独立パッケージとして持つ。
公開 npm には出さず、GitHub Packages (`npm.pkg.github.com`) の `kent7k` 配下に private publish して各プロジェクトから使う。

> 設計の姉妹リポジトリ: [`kdot-tsconfig`](https://github.com/kent7k/kdot-tsconfig) (`@kent7k/tsconfig`)。
> tsconfig は依存ゼロなので 1 パッケージ多 exports。lintkit は各ツールの依存が重く異なるため、依存を分離できる monorepo にしている。

## パッケージ

| パッケージ | 役割 | キーポイント |
|---|---|---|
| `@kent7k/lintkit-eslint` | ESLint flat config | `./base` `./node` `./next` `./flat` を export。consumer の node_modules を優先解決 |
| `@kent7k/lintkit-prettier` | Prettier config + ignore マージ wrapper | `index.json` が config。`lintkit-prettier` で共通 ignore を結合して実行 |
| `@kent7k/lintkit-stylelint` | Stylelint config | `standard-scss` + `recess-order`。`.` と `./morning-routine` を export |
| `@kent7k/lintkit-markdownlint` | markdownlint wrapper | `config/base.json` 同梱。`markdownlint-cli` をバンドル |
| `@kent7k/lintkit-locale` | i18n JSON キー整合チェッカ | `lk-locale` CLI。`fast-glob` 利用 |

## セットアップ

```bash
pnpm install
```

## 取得方法（各プロジェクト側）

公開しないので **GitHub Packages 経由**で取得する。consumer 側に `.npmrc` を置く:

```ini
@kent7k:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}   # read:packages 権限の PAT
```

その上で普通にインストール:

```bash
pnpm add -D @kent7k/lintkit-eslint @kent7k/lintkit-prettier @kent7k/lintkit-stylelint @kent7k/lintkit-markdownlint @kent7k/lintkit-locale
```

### 使用例

```js
// eslint.config.mjs
import config from '@kent7k/lintkit-eslint/flat'
export default config
```

```js
// .prettierrc.cjs などは不要。package.json scripts で:
// "format": "lintkit-prettier write"
// "lint:md": "lintkit-markdownlint '**/*.md'"
```

```js
// stylelint.config.cjs
module.exports = require('@kent7k/lintkit-stylelint')
```

## publish

```bash
# 認証: write:packages 権限の PAT を ~/.npmrc か NODE_AUTH_TOKEN に
pnpm publish:all          # 全パッケージを GitHub Packages へ
```

バージョンは各 `packages/*/package.json` の `version` を上げてから publish する。
CI からの自動 publish は `.github/workflows/publish.yml`（タグ push でトリガ）。
