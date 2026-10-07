#!/bin/sh
set -e
cd "$(dirname "$0")/../.."
R="$1"
SPEC="${2:-pipeline/b-concept/measure.json}"
export PP_PROFILE=.pp-profile-b
rm -rf .pp-profile-b/Default/Cache ".pp-profile-b/Default/Code Cache"
node pipeline/b-concept/transcribe.mjs "$SPEC" | tail -1
NAME=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).name)' "$SPEC")
CON=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).concept)' "$SPEC")
SIZE=$(node -e 'require("sharp")(process.argv[1]).metadata().then(m=>console.log(m.width+" "+m.height))' "$CON")
U="http://localhost:${PORT:-8765}/3d/index.html?level=$NAME&hero=0"
node tools/shot.mjs "$U" out/$NAME/$R-concept.png $SIZE >/dev/null
node tools/shot.mjs "$U" out/$NAME/$R-351.png 351 390 >/dev/null
node tools/shot.mjs "$U" out/$NAME/$R-900.png 900 800 >/dev/null
node tools/compare.mjs "$CON" out/$NAME/$R-concept.png out/$NAME/$R
