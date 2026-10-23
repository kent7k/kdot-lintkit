#!/usr/bin/env bash
# npmjs に「まだ無いパッケージ」を 1 回だけ手元から出す（trusted publisher はパッケージが在ってから登録するため）。
# 2 回目からは .github/workflows/publish.yml（OIDC・token 無し）が出す。
#
#   使い方: npmjs で granular token（Read and write・Bypass 2FA・期限 7 日）を作ってコピーしてから
#     NPM_TOKEN="$(pbpaste)" bash scripts/first-publish.sh packages/* ../kdot-tsconfig
#
# token の値はファイルに書かない: 一時 userconfig に ${NPM_TOKEN} の参照だけを置き、終わったら消す。
# `npm login` は使わない（~/.npmrc は dotfiles への symlink で、リテラルが git に入る）。
set -euo pipefail
: "${NPM_TOKEN:?NPM_TOKEN が空（npmjs で作った token をコピーして NPM_TOKEN=\"\$(pbpaste)\" で渡す）}"
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
