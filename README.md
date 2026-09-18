# kdot-lintkit (`@kent7k/lintkit-*`)

**kent7k 個人プロジェクト用の lint / format 設定。** 汎用ツールキットではない。

現在の利用者は `wabunka-classroom` と `portfolio` の 2 つで、どちらも Next.js + SCSS + i18n という
同じ構成をしている。**この 2 つで回ることだけを保証範囲とする。**
他の構成への一般化や外部プロジェクトへの配布は目標にしない（そのつもりで作った姉妹リポジトリの
`kdot-devkit` は、汎用性を気にして手が止まり、利用者ゼロのまま 2026-09-18 に廃止した）。

pnpm monorepo で各ツールを独立パッケージとして持ち、GitHub Packages (`npm.pkg.github.com`) に private publish する。

> 姉妹リポジトリ: [`kdot-tsconfig`](https://github.com/kent7k/kdot-tsconfig) (`@kent7k/tsconfig`)。
> tsconfig は依存ゼロなので 1 パッケージ多 exports。lintkit は各ツールの依存が重く異なるため、依存を分離できる monorepo にしている。

## パッケージ

| パッケージ | 役割 | キーポイント |
|---|---|---|
| `@kent7k/lintkit-eslint` | ESLint flat config | `./base` `./node` `./next` `./flat` を export。consumer の node_modules を優先解決 |
| `@kent7k/lintkit-prettier` | Prettier config + ignore マージ wrapper | `index.json` が config。`lintkit-prettier` で共通 ignore を結合して実行 |
| `@kent7k/lintkit-stylelint` | Stylelint config | `standard-scss` + `recess-order` |
| `@kent7k/lintkit-markdownlint` | markdownlint wrapper | `config/base.json` 同梱。`markdownlint-cli` をバンドル |
| `@kent7k/lintkit-locale` | i18n JSON キー整合チェッカ | `lk-locale` CLI。`fast-glob` 利用 |

`lintkit-locale` 以外は既製 config の薄いラッパーで、いつでも捨てられる。
**このリポジトリを残す理由は `lintkit-locale`（代替が無い自作ロジック）と `eslint/next.mjs`（Next 固有の蓄積）にある。**

## 依存の追従

lint ツールの版を束ねて配るのが仕事なので、**依存が古くなること自体がパッケージの劣化になる。**
手で追従すると必ず止まる（実際 2026-06-29 から 3 か月止まった）ため、Dependabot に任せている
（`.github/dependabot.yml`）。

- npm は root と `packages/*` の両方を対象。minor/patch はまとめて 1 PR、**メジャーは 1 件ずつ**
- github-actions は monthly
- PR は `ci.yml` の `pnpm check`（全パッケージの config をロードして落ちないか検査）で自動検証される

**基本は緑の PR をマージするだけ。** メジャー更新の PR 履歴が、このリポジトリを維持するコストの実測値になる。
見合わなくなったら Biome への一本化を検討する（その時に捨てられないのは上記 2 つだけ）。

## セットアップ

```bash
pnpm install
```

## 取得方法（各プロジェクト側）

公開しないので **GitHub Packages 経由**で取得する。consumer 側の `.npmrc` には **scope routing だけ**を書く:

```ini
@kent7k:registry=https://npm.pkg.github.com
```

認証情報はここに書かない（pnpm >= 10.34 はプロジェクト層の `${ENV}` 展開 auth を捨てる）。
`read:packages` 権限の PAT は `~/.npmrc` か `NODE_AUTH_TOKEN` で渡す。
正本は `~/.dotfiles/.config/lang/npm/README.md`。

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

**publish したら消費側 2 リポジトリの依存レンジも上げること。** `0.x` では minor bump が
レンジ (`^0.1.x`) を跨ぐため、上げ忘れると以降の修正が一切届かなくなる。
