#!/bin/sh
set -e
OUT="${1:?usage: tools/deploy-site.sh <out-dir>}"
SRC="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$OUT"
rsync -a --delete --exclude='.git' --exclude='netlify.toml' --exclude='README.md' \
  --exclude='*.mjs' --exclude='*.py' --exclude='*.md' --exclude='.DS_Store' \
  --include='/index.html' --include='/islands.html' \
  --include='/core/***' --include='/3d/***' --include='/landing/***' --include='/assets/***' \
  --include='/levels/' --include='/levels/run.json' $(node -e 'for (const n of require(process.argv[1]).order) process.stdout.write(" --include=/levels/" + n + ".json")' "$SRC/levels/run.json") --include='/levels/home.json' \
  --exclude='*' "$SRC/" "$OUT/"
cat > "$OUT/netlify.toml" <<'TOML'
[build]
  publish = "."
  command = "echo static site, no build"

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"

[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=0, must-revalidate"
TOML
