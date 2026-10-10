# Preload and lift loading

## What loads

`tools/load-probe.mjs [--landing] [base] [hops]` records requests over CDP (cache cleared first), time from navigation to `window.__done`, and per-hop beats. `THROTTLE=1` adds 60 ms latency at 10 Mbps. `tools/serve-netlify.mjs [root] [port]` serves the repo with the `netlify.toml` header rules plus ETag/304, so cache behaviour matches production; the dev servers send `no-store` and show no warm-cache effect.

A cold `3d/index.html?level=cat-medium` fetches 69 requests, 3176 KB: 52 JS modules (three.module.js is 648 KB of it), 15 JSON, the cloud atlas webp. No run island uses a GLB. A lift hop fetched the next level JSON plus its pieces modules (2 to 6 requests, 34 to 190 KB) and spent 5 to 7 ms in `prepare`.

## Changes

- `core/warm.js`: `warmPage(name)` crawls the 3d module graph from `3d/main.js` (static and literal dynamic imports, the `three` import map resolved by hand), the island's level JSON, pieces modules, GLBs named in them, run.json and the cloud atlas, all with `fetch(..., { priority: "low" })`. `warmIsland(name)` keeps the parsed level JSON in memory (`loadLevel` takes it) and `import()`s the pieces modules into the module map.
- Landing: `wire()` schedules `warmPage(order[0])` after first paint and an idle callback; skipped under Save-Data. `modulepreload` was not used: module maps are per document, and the bare `three` specifier fails to resolve on the landing, which has no import map. No WebGL context is created on the landing.
- In the run: each island load idle-warms the next island in run order, so the ride's `preload` hits memory and the module map.
- Hold: `SEQ.holdMin` (1.8 s) is replaced by `SEQ.holdBeats` (2). The hold lasts at least two beats at 140 BPM and ends on the first beat of the dance grid after the next island is staged.
- `netlify.toml` and `tools/deploy-site.sh`: `public, max-age=31536000, immutable` for `/3d/vendor/*`, `*.webp`, `*.glb`, `*.jpg`, `*.png`. The `/*.js` rule is gone because Netlify merges every matching rule's values, and it overlapped the vendor rule; JS, JSON and HTML fall back to Netlify's default `public, max-age=0, must-revalidate`.

## Results (serve-netlify, headless Chrome, swiftshader)

| | requests on network | KB | navigation to `__done` |
|---|---|---|---|
| 3d page cold | 69 | 3176 | 1986 ms |
| 3d page after landing warm | 63 (all 304) | 16 | 1379 ms |
| 3d page cold, throttled | 69 | 3176 | 4793 ms |
| 3d page after landing warm, throttled | 63 (all 304) | 16 | 2374 ms |

The landing warm itself pulls 77 requests, 3364 KB, at low priority after the landing settles.

| hop cat-medium to wizard-medium | hold (`hold` to `arrive`) | ride total |
|---|---|---|
| before | 2.33 s | 6.58 s |
| after | 1.42 s | 5.67 s |

Landing link icons are the Simple Icons 13.21.0 path data (CC0, https://simpleicons.org), inlined in `landing/themes/souls.js`.
