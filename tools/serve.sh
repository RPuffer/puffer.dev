#!/bin/sh
PORT="${PORT:-8765}"
cd "$(dirname "$0")/.." || exit 1
echo "http://localhost:$PORT/"
exec python3 -m http.server "$PORT" --bind 127.0.0.1
