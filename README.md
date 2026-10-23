# kdot-lintkit (`@kent7k/lintkit-*`)

**kent7k 個人プロジェクト用の lint / format 設定。** 汎用ツールキットではない。

現在の利用者は `wabunka-classroom` と `portfolio` の 2 つで、どちらも Next.js + SCSS + i18n という
同じ構成をしている。**この 2 つで回ることだけを保証範囲とする。**
他の構成への一般化や外部プロジェクトへの配布は目標にしない（そのつもりで作った姉妹リポジトリの
`kdot-devkit` は、汎用性を気にして手が止まり、利用者ゼロのまま 2026-09-18 に廃止した）。

pnpm monorepo で各ツールを独立パッケージとして持ち、npmjs (`registry.npmjs.org`) に public で publish する（2026-10 に GitHub Packages の private から移した。読む側の鍵を無くすため。経緯は kdot-hq `docs/packages-registry-plan-2026-10.md`）。
public なのは鍵を要らなくするためで、他人向けに保守する約束ではない。保証範囲は上の 2 つだけ。

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

- npm は **root のみ**を対象（pnpm workspace なので `/` で `packages/*` も含まれる。
  `packages/*` を個別ディレクトリとして足すと root の `pnpm-lock.yaml` が据え置かれ、
  CI の `--frozen-lockfile` が必ず落ちる）。minor/patch はまとめて 1 PR、**メジャーは 1 件ずつ**
- github-actions は monthly
- PR は `ci.yml` の `pnpm check` で自動検証される

### `pnpm check` が見ているもの

1. 各パッケージの config を import / require して落ちないか
2. **`scripts/fixtures/` の実ファイルを ESLint に実際に通して 0 件か**

2 は 1 では検出できない parser の設定ミスを捕まえるためにある。
実際 `projectService` と `project` の併用で全ファイルが parsing error になり、
消費側の lint が丸ごと無効化されていたことがあった（1 は素通りしていた）。
fixture は typed-zones の glob (`apps/**/{app,src}/**`) に合う位置に置くこと。

**基本は緑の PR をマージするだけ。** ただし**メジャーは緑でも消費側で実際に lint を回して確認する**
（`pnpm check` は fixture 1 枚しか見ていない）。メジャー更新の PR 履歴が、このリポジトリを維持するコストの実測値になる。
見合わなくなったら Biome への一本化を検討する（その時に捨てられないのは上記 2 つだけ）。

## セットアップ

```bash
pnpm install
```

## 取得方法（各プロジェクト側）

npmjs の public パッケージなので、consumer 側の `.npmrc` に routing も auth も要らない。

普通にインストール:

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

タグ `v*` の push で `.github/workflows/publish.yml` が npmjs へ出す。**token は持たない**（npmjs の trusted publishing＝GitHub Actions の OIDC）。
`scripts/publish.mjs` は登録済の `name@version` を飛ばすので、上げたパッケージだけが出る。

```bash
# packages/<x>/package.json の version を上げて commit したあと
git tag v$(date +%Y%m%d)-1 && git push origin --tags
```

- 新しいパッケージを足したときだけ、npmjs のそのパッケージの Settings → Trusted publisher に `kent7k/kdot-lintkit`・`publish.yml` を登録する（npmjs は存在しないパッケージに登録できないので、初回 1 回だけ手元から token で出す）。
- 手元から出すときも `npm login` は使わない（`~/.npmrc` は dotfiles への symlink で、token のリテラルが git に入る）。

1.0.0 からは semver どおり。minor・patch は consumer の `^1` に Dependabot が届ける。**メジャーを上げたときだけ**消費側 2 リポジトリのレンジを手で上げる。
