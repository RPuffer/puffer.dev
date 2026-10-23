#!/bin/sh
set -e
REPO="${1:?usage: tools/deploy-site.sh <repo-dir>}"
OUT="$REPO/build"
SRC="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$OUT"
rsync -a --delete --exclude='.git' --exclude='netlify.toml' --exclude='README.md' \
  --exclude='*.mjs' --exclude='*.py' --exclude='*.md' --exclude='.DS_Store' \
  --include='/index.html' --include='/islands.html' \
  --include='/core/***' --include='/3d/***' --include='/landing/***' --include='/assets/***' \
  --include='/levels/' --include='/levels/run.json' $(node -e 'for (const n of require(process.argv[1]).order) process.stdout.write(" --include=/levels/" + n + ".json")' "$SRC/levels/run.json") --include='/levels/home.json' \
  --exclude='*' "$SRC/" "$OUT/"
node "$SRC/tools/modulepreload.mjs" "$OUT"
[ "$2" = "--no-toml" ] && exit 0
cat > "$REPO/netlify.toml" <<'TOML'
[build]
  publish = "build"
  command = "echo static site, no build"
[build.environment]
  NODE_VERSION = "22"

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"

[[headers]]
  for = "/3d/vendor/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.webp"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.glb"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.jpg"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.png"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
TOML
