#!/bin/sh
set -e
cd "$(dirname "$0")/../.."
R="$1"
export PP_PROFILE=.pp-profile-b
rm -rf .pp-profile-b/Default/Cache ".pp-profile-b/Default/Code Cache"
node pipeline/b-concept/transcribe.mjs | tail -1
U="http://localhost:${PORT:-8765}/3d/index.html?level=forest-b&hero=0"
node tools/shot.mjs "$U" out/forest-b/$R-concept.png 928 1152 >/dev/null
node tools/shot.mjs "$U" out/forest-b/$R-351.png 351 390 >/dev/null
node tools/shot.mjs "$U" out/forest-b/$R-900.png 900 800 >/dev/null
node tools/compare.mjs pipeline/b-concept/concept.png out/forest-b/$R-concept.png out/forest-b/$R
