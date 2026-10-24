#!/usr/bin/env bash
# npmjs に「まだ無いパッケージ」を 1 回だけ手元から出す（trusted publisher はパッケージが在ってから登録するため）。
# 2 回目からは .github/workflows/publish.yml（OIDC・token 無し）が出す。
#
#   使い方: npmjs で granular token（Read and write・Bypass 2FA・期限 7 日）を作ってから
#     bash scripts/first-publish.sh packages/* ../kdot-tsconfig
#   token は隠し入力で聞く（貼って Enter）。NPM_TOKEN を env で渡してもよい。
#   pbpaste で渡すと、あとでコマンドをコピーした時点で token が消える（2026-10-24 にそれで 401）。
#
# token の値はファイルに書かない: 一時 userconfig に ${NPM_TOKEN} の参照だけを置き、終わったら消す。
# `npm login` は使わない（~/.npmrc は dotfiles への symlink で、リテラルが git に入る）。
set -euo pipefail
if [ -z "${NPM_TOKEN:-}" ]; then
  read -rsp 'npmjs の token を貼って Enter（表示されない）: ' NPM_TOKEN; echo
fi
case "$NPM_TOKEN" in
  npm_*) ;;
  *) echo "token が npm_ で始まっていない（${#NPM_TOKEN} 文字・別の物を貼った？）" >&2; exit 2 ;;
esac
export NPM_TOKEN
[ "$#" -gt 0 ] || { echo "publish するディレクトリを渡す（例: packages/* ../kdot-tsconfig）" >&2; exit 2; }

REGISTRY=https://registry.npmjs.org/
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
printf '//registry.npmjs.org/:_authToken=${NPM_TOKEN}\n' > "$tmp/npmrc"
export NPM_CONFIG_USERCONFIG="$tmp/npmrc"

who="$(npm whoami --registry="$REGISTRY")"
echo "npmjs: ${who} として出す"

for dir in "$@"; do
  spec="$(cd "$dir" && node -p 'const p=require("./package.json"); p.name+"@"+p.version')"
  if npm view "$spec" version --registry="$REGISTRY" >/dev/null 2>&1; then
    echo "skip    $spec（npmjs に在る）"
    continue
  fi
  echo "publish $spec"
  (cd "$dir" && npm publish --access public --registry="$REGISTRY")
done

echo
echo "次: 各パッケージの https://www.npmjs.com/package/<name>/access → Trusted publisher に GitHub Actions を登録（repo＝源の repo・workflow＝publish.yml）"
echo "済んだら token を npmjs で消す: https://www.npmjs.com/settings/${who}/tokens"
