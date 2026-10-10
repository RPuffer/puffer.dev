import { tone, solid, circle, roundRect } from "./baker.js";
import { PALETTE } from "./palette.js";

const tri3 = (a) => tone(a[0], a[1], a[2]);

export const CROWN = 0.045, LEAF = 0.035, FLAME = 0.04, MIST = 0.05, FALL_SEGMENTS = 8;

function beam(B, a, b, r, pal, n = 5) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dx, dy, dz);
  if (len < 1e-6) return;
  const yaw = Math.atan2(dx, dz), pitch = Math.acos(Math.max(-1, Math.min(1, dy / len)));
  B.push(a[0], a[1], a[2], yaw);
  B.rot([1, 0, 0], pitch);
  B.cyl(r, len, pal, 0, 0, 0, n);
  B.pop(); B.pop();
}

function bar(B, a, b, w, pal) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dx, dy, dz);
  const yaw = Math.atan2(dx, dz), pitch = Math.acos(Math.max(-1, Math.min(1, dy / len)));
  B.push(a[0], a[1], a[2], yaw);
  B.rot([1, 0, 0], pitch);
  B.box(w, len, w, pal);
  B.pop(); B.pop();
}

function starShape(r0, r1, n = 5) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, r = i % 2 ? r1 : r0; pts.push([Math.sin(a) * r, Math.cos(a) * r]); }
  return pts;
}

function heartShape(s) {
  const pts = [];
  for (let i = 0; i < 24; i++) {
    const t = (i / 24) * Math.PI * 2;
    pts.push([s * 16 * Math.sin(t) ** 3 / 16, s * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16]);
  }
  return pts;
}

function upright(B, pts, depth, pal, y) {
  B.push(0, y, 0, Math.PI / 4);
  B.rot([1, 0, 0], -Math.PI / 2);
  B.prism(pts.map(([u, v]) => [u, -v]).reverse(), -depth / 2, depth / 2, pal, { bottom: true });
  B.pop(); B.pop();
}

export function makePieces(style) {
  const P = style?.palette || PALETTE;
  const W = P.wood;
  const woodPal = tone(W.light, W.mid, W.dark, W.dark);
  const trunkPal = tone(P.trunk[0], P.trunk[0], P.trunk[1]);

  function pine(B, H, wk, cols) {
    const [lit, top, shade] = cols;
    const pal = tone(top, lit, shade);
    const trunk = H * 0.36;
    B.box(0.16, trunk + 0.1, 0.16, trunkPal);
    const tiers = [[1, 0.55], [0.83, 0.5], [0.63, 0.45], [0.41, 0.4]].map(([w, h]) => [w * wk, h]);
    const k = (H - trunk) / tiers.reduce((a, t) => a + t[1], 0);
    let y = trunk;
    B.sway("crown", { amp: CROWN, root: [0, trunk, 0], span: H - trunk }, () => {
      for (const [w, h] of tiers) {
        B.rbox(w, h * k * 1.02, w, 0.1, pal, 0, y, 0);
        y += h * k;
      }
    });
  }

  function roundTree(B, H, cols) {
    const pal = tone(cols[0], cols[1], cols[2]);
    const k = H / 3.8;
    B.box(0.17, 1.2 * k, 0.17, trunkPal);
    const cubes = [[1.05, 0, 1.8, 0.05], [0.62, 0.74, 1.15, 0.2], [0.6, -0.74, 2.3, -0.1], [0.88, 0.16, 2.8, -0.05]];
    B.sway("crown", { amp: CROWN, root: [0, 1.2 * k, 0], span: H - 1.2 * k }, () => {
      for (const [a, sx, hc, sd] of cubes) {
        const dx = (sx + sd) / 2, dz = (sd - sx) / 2;
        B.rbox(a * k, a * k * 0.95, a * k, 0.14 * k, pal, dx * k, (hc - a * 0.55) * k, dz * k);
      }
    });
  }

  function post(B, x, z, h = 0.45, r = 0.14) {
    B.cyl(r, h, tone(W.mid, W.mid, W.dark), x, 0, z, 8, { topPal: W.end });
    B.cyl(r + 0.008, 0.05, tone(W.dark, W.dark, W.shadow), x, h * 0.3, z, 8, { top: false });
    B.cyl(r + 0.008, 0.05, tone(W.dark, W.dark, W.shadow), x, h * 0.65, z, 8, { top: false });
  }

  function rope(B, a, b, sag = 0.05, r = 0.018) {
    const n = 4;
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      const p = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(Math.PI * t) * sag, a[2] + (b[2] - a[2]) * t];
      beam(B, p(t0), p(t1), r, tone(P.rope, P.rope, P.ropeShade));
    }
  }



  function flower4(B, x, z, y, petal, centre) {
    for (const [dx, dz] of [[0.06, 0], [-0.06, 0], [0, 0.06], [0, -0.06]]) B.cyl(0.05, 0.02, solid(petal), x + dx, y, z + dz, 6);
    B.cyl(0.04, 0.03, solid(centre), x, y, z, 6);
  }

  function ring(B, x, z, y, r, t, pal, n = 10) {
    const outer = circle(x, z, r, r, n), inner = circle(x, z, r - t, r - t, n);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      B.quad([outer[i][0], y, outer[i][1]], [outer[j][0], y, outer[j][1]], [inner[j][0], y, inner[j][1]], [inner[i][0], y, inner[i][1]], pal);
      B.quad([outer[i][0], y - 0.03, outer[i][1]], [outer[j][0], y - 0.03, outer[j][1]], [outer[j][0], y, outer[j][1]], [outer[i][0], y, outer[i][1]], pal);
    }
  }




  const PIECES = {
    "tree-pine"(B, H, v) {
      pine(B, H * 1.1, v % 3 ? 0.9 : 1.08, [P.treeMint, P.treeLeaf, [P.treeTeal[1], P.treeTeal[2], P.treeTeal[3]]][v % 3]);
    },
    "tree-round"(B, H, v) {
      roundTree(B, H * 1.73, [P.treeLime, P.treeLeaf, P.treeMint][v % 3]);
    },
    "tree-orange"(B, H, v) {
      roundTree(B, H * 1.73, [P.treeGold, [P.flame[1], W.light, W.dark]][v % 2]);
    },
    bush(B, H, v) {
      const c = v % 2 ? P.treeLeaf : P.bushTeal;
      const pal = tone(c[1], c[1], c[2]);
      const s = 1.35;
      for (const [x, y, z, r] of [[0, 0.2, 0, 0.2], [-0.15, 0.15, 0.08, 0.15], [0.15, 0.14, 0.05, 0.15], [0.03, 0.14, 0.18, 0.15], [-0.05, 0.13, -0.15, 0.14], [0.08, 0.3, 0.02, 0.15]]) B.ball(r * s, pal, x * s, y * s * 0.9, z * s, 0.85, 1);
      for (const [x, y, z] of [[-0.1, 0.32, 0.16], [0.14, 0.28, 0.16], [0.02, 0.42, 0.08], [0.24, 0.2, 0], [-0.22, 0.22, 0.04], [0.06, 0.22, 0.28], [-0.08, 0.4, -0.08]]) B.ball(0.04 * s, tone(P.berry[0], P.berry[0], P.berry[1]), x * s, y * s * 0.9, z * s, 1, 0);
    },
    "bush-cluster"(B, H, v) {
      const c = v % 2 ? P.treeGold : [P.treeTeal[0], P.treeTeal[1], P.treeTeal[3]];
      const pal = tone(c[0], c[1], c[2]);
      B.rbox(0.62, 0.5, 0.62, 0.13, pal, -0.08, 0.28, -0.1);
      B.rbox(0.34, 0.34, 0.34, 0.09, pal, 0.26, 0.16, -0.12);
      for (const [x, z, h] of [[-0.3, 0.26, 0.3], [-0.05, 0.3, 0.24], [0.2, 0.26, 0.3], [0.34, 0.06, 0.26], [-0.34, 0.02, 0.36]]) B.rbox(0.17, h, 0.17, 0.07, pal, x, 0, z);
      B.ball(0.08, tri3(P.rock), 0.36, 0.06, 0.36, 0.8, 0);
    },
    rock(B, H, v) {
      const pal = tone(P.rock[0], P.rock[1], P.rock[2]);
      const s = [1, 0.85, 1.15][v % 3];
      B.rbox(0.28 * s, 0.14 * s, 0.24 * s, 0.07, pal, 0, 0, 0);
      B.rbox(0.18 * s, 0.12 * s, 0.16 * s, 0.05, tone(P.rock[0], P.rock[1], P.rock[3]), 0.02, 0.14 * s, -0.01);
    },
    "rock-big"(B, H, v) {
      const pal = tone(P.rock[0], P.rock[1], P.rock[2]);
      const k = H / 0.75;
      const parts = v % 2 ? [[0, 0, 0, 0.6, 0.5], [0.15, 0.5, -0.05, 0.4, 0.4], [-0.2, 0, 0.22, 0.35, 0.3]] : [[0, 0, 0, 0.7, 0.55], [-0.1, 0.55, -0.05, 0.45, 0.35], [0.25, 0, 0.25, 0.35, 0.28], [-0.28, 0, 0.3, 0.25, 0.2]];
      for (const [x, y, z, w, h] of parts) B.rbox(w * 1.2, h * k, w * 1.1, 0.12, pal, x * 1.2, y * k, z * 1.2);
    },
    well(B, H) {
      const stone = tone(P.wellStone[0], P.wellStone[1], P.wellStone[2]);
      const base = 0.62, w = 0.86;
      B.rbox(w, base, w, 0.1, stone);
      B.rbox(w + 0.04, 0.1, w + 0.04, 0.1, tone(P.wellStone[0], P.wellStone[0], P.wellStone[1]), 0, base - 0.02, 0);
      B.rbox(w - 0.3, 0.012, w - 0.3, 0.06, solid(P.wellMortar), 0, base + 0.08, 0);
      const bricks = [[0.12, -0.24], [0.12, 0.12], [0.3, -0.06], [0.3, 0.28], [0.3, -0.36]];
      for (const [y, u] of bricks) {
        B.vpoly([[u - 0.1, y, w / 2 + 0.004], [u + 0.1, y, w / 2 + 0.004], [u + 0.1, y + 0.09, w / 2 + 0.004], [u - 0.1, y + 0.09, w / 2 + 0.004]], P.wellStone[2]);
        B.vpoly([[w / 2 + 0.004, y, -u + 0.1], [w / 2 + 0.004, y, -u - 0.1], [w / 2 + 0.004, y + 0.09, -u - 0.1], [w / 2 + 0.004, y + 0.09, -u + 0.1]], P.wellMortar);
      }
      const top = Math.max(H, 1.45);
      for (const x of [-0.3, 0.3]) B.box(0.11, top - base, 0.11, woodPal, x, base, 0);
      B.box(1.0, 0.11, 0.12, woodPal, 0.08, top, 0);
      B.at(0.58, top + 0.055, 0, 0, () => { B.rot([0, 0, 1], -Math.PI / 2); B.cyl(0.056, 0.01, solid(W.end), 0, 0, 0, 8); B.pop(); });
      B.cyl(0.02, top - base - 0.3, solid(P.rope), 0, base + 0.25, 0, 5);
      B.cyl(0.09, 0.13, stone, 0, base + 0.1, 0, 8, { topPal: P.wellStone[2] });
    },
    fence(B, H) {
      const h = 0.45;
      post(B, -0.3, 0, h);
      post(B, 0.3, 0, h);
      rope(B, [-0.3, h * 0.7, 0], [0.3, h * 0.7, 0], 0.07, 0.025);
    },
    "fence-post"(B) { post(B, 0, 0, 0.42, 0.13); },
    "fence-pen"(B) {
      const h = 0.42, s = 0.3;
      const c = [[-s, -s], [s, -s], [s, s], [-s, s]];
      for (const [x, z] of c) post(B, x, z, h, 0.12);
      for (let i = 0; i < 4; i++) { const a = c[i], b = c[(i + 1) % 4]; rope(B, [a[0], h * 0.75, a[1]], [b[0], h * 0.75, b[1]], 0.05, 0.018); }
    },
    barrel(B) {
      const r = 0.2, h = 0.4;
      B.cyl(r, h, tone(W.mid, W.mid, W.dark), 0, 0, 0, 10, { topPal: P.interior });
      B.cyl(r + 0.012, 0.05, tone(W.dark, W.dark, W.shadow), 0, 0.06, 0, 10, { top: false });
      B.cyl(r + 0.012, 0.05, tone(W.dark, W.dark, W.shadow), 0, h - 0.1, 0, 10, { top: false });
      ring(B, 0, 0, h + 0.008, r, 0.035, solid(W.light), 10);
    },
    pot(B, H, v) {
      const c = P.pot;
      const pal = v % 2 ? tone(P.wellStone[0], P.wellStone[1], P.wellStone[2]) : tone(c[0], c[1], c[2]);
      B.cone(0.14, 0.22, 0.25, pal, 0, 0, 0, 8);
      B.cone(0.22, 0.12, 0.22, pal, 0, 0.25, 0, 8);
      B.cyl(0.14, 0.07, pal, 0, 0.47, 0, 8, { topPal: P.interior });
    },
    crate(B, H) {
      const s = 0.55, c = P.crate;
      B.box(s, s - 0.02, s, tone(c[0], c[1], c[2]));
      const trim = tone(c[1], c[2], W.shadow);
      for (const y of [0, s - 0.06]) B.box(s + 0.02, 0.06, s + 0.02, trim, 0, y, 0);
      B.vpoly([[-s / 2, 0.06, s / 2 + 0.012], [-s / 2 + 0.08, 0.06, s / 2 + 0.012], [s / 2, s - 0.06, s / 2 + 0.012], [s / 2 - 0.08, s - 0.06, s / 2 + 0.012]], c[2]);
      B.vpoly([[s / 2 + 0.012, 0.06, s / 2], [s / 2 + 0.012, 0.06, s / 2 - 0.08], [s / 2 + 0.012, s - 0.06, -s / 2], [s / 2 + 0.012, s - 0.06, -s / 2 + 0.08]], W.shadow);
    },
    chest(B) {
      const w = 0.6, d = 0.4, h = 0.3;
      B.rbox(w, h, d, 0.03, tone(W.mid, W.mid, W.dark));
      B.push(0, h, -d / 2);
      B.rot([1, 0, 0], 0);
      B.rbox(w + 0.02, 0.16, d + 0.02, 0.05, tone(W.light, W.mid, W.dark), 0, 0, d / 2);
      B.pop(); B.pop();
      for (const x of [-0.2, 0.2]) B.box(0.06, h + 0.17, d + 0.04, tone(P.gold[0], P.gold[0], P.gold[1]), x, 0, 0);
      B.box(0.1, 0.12, 0.03, tone(P.gold[2], P.gold[0], P.gold[1]), 0, h - 0.06, d / 2 + 0.02);
    },
    mushroom(B, H, v) {
      const cap = v % 2 ? P.capGold : P.cap;
      for (const [x, z, s] of [[0, 0, 1.5], [0.24, 0.18, 1]]) {
        B.cyl(0.06 * s, 0.25 * s, tone(P.mushroomStem[0], P.mushroomStem[0], P.mushroomStem[1]), x, 0, z, 6);
        B.cone(0.2 * s, 0.05 * s, 0.14 * s, tone(cap[0], cap[1], cap[2]), x, 0.22 * s, z, 8);
        B.ball(0.03 * s, solid(P.capSpot), x + 0.08 * s, 0.3 * s, z + 0.06 * s, 0.6, 0);
      }
    },
    flower(B, H, v) {
      const spots = [[-0.18, 0.1], [0.12, -0.12], [0.08, 0.2], [-0.05, -0.22]];
      if (v % 3 === 1) {
        for (const [x, z] of spots.slice(0, 3)) {
          ring(B, x, z, 0.06, 0.06, 0.022, solid(P.flowerBlue[0]), 8);
          B.box(0.015, 0.08, 0.015, solid(P.stem), x, 0, z);
        }
        return;
      }
      const petal = v % 3 === 2 ? P.heart[0] : P.flowerOrange[0];
      for (const [x, z] of spots) flower4(B, x, z, 0.01, petal, P.flowerOrange[1]);
    },
    coin(B, H) {
      const r = 0.3;
      B.rot([1, 0, 0], Math.PI / 2, 0, 0.3 + r, 0);
      B.cyl(r, 0.08, tone(P.gold[1], P.gold[1], P.gold[1]), 0, -0.04, 0, 12, { topPal: P.gold[0] });
      B.cyl(r * 0.68, 0.14, solid(P.gold[1]), 0, -0.07, 0, 12, { topPal: P.gold[1] });
      B.cyl(r * 0.5, 0.2, solid(P.gold[1]), 0, -0.1, 0, 12, { topPal: P.gold[0] });
      B.pop();
    },
    marker(B) {
      B.push(0, 0.07, 0, Math.PI / 4);
      const sq = (a) => [[a, a], [a, -a], [-a, -a], [-a, a]];
      B.prism(sq(0.14), -0.07, 0.02, tone(P.gold[0], P.gold[0], P.gold[1]));
      B.frustum(sq(0.14), sq(0.07), 0.02, 0.07, tone(P.gold[0], P.gold[0], P.gold[1]));
      B.pop();
    },
    gem(B, H, v) {
      const c = P.gem[v % 2];
      const y = 0.25;
      B.cone(0, 0.2, 0.2, tone(c[0], c[1], c[2]), 0, y, 0, 6);
      B.cone(0.2, 0.12, 0.08, tone(c[0], c[1], c[2]), 0, y + 0.2, 0, 6);
    },
    torch(B, H) {
      B.cyl(0.07, H - 0.32, tone(W.mid, W.mid, W.dark), 0, 0, 0, 6);
      B.cyl(0.12, 0.1, tone(W.dark, W.dark, W.shadow), 0, H - 0.4, 0, 8, { topPal: W.shadow });
      flame(B, 0, H - 0.3, 0, 0.12);
    },
    campfire(B, H) {
      for (let i = 0; i < 4; i++) B.at(0, 0.06, 0, (i * Math.PI) / 2 + 0.4, () => { B.rot([0, 0, 1], Math.PI / 2 - 0.25); B.cyl(0.06, 0.45, tone(W.mid, W.mid, W.dark), 0, -0.05, 0, 6, { topPal: W.end }); B.pop(); });
      for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; B.ball(0.06, tri3(P.rock), Math.sin(a) * 0.3, 0.04, Math.cos(a) * 0.3, 0.7, 0); }
      flame(B, 0, 0.05, 0, 0.16);
    },
    signpost(B, H) {
      B.box(0.08, H, 0.08, woodPal);
      B.rbox(0.5, 0.2, 0.06, 0.03, tone(W.light, W.mid, W.dark), 0.12, H * 0.62, 0);
      B.rbox(0.42, 0.16, 0.06, 0.03, tone(W.light, W.mid, W.dark), -0.1, H * 0.35, 0);
    },
    waterfall(B, H, v, ctx) {
      const drop = ctx.drop, zf = -0.5 + 0.008;
      const streaks = [[0.06, 0.05, P.water.fall[0]], [0.2, 0.025, P.water.bubble], [0.34, 0.07, P.water.fall[1]], [0.52, 0.03, P.water.bubble], [0.66, 0.05, P.water.fall[2]], [0.84, 0.03, P.water.bubble]];
      const n = FALL_SEGMENTS;
      for (const [u, w, hex] of streaks) {
        const x0 = -0.5 + u, top = drop - (hex === P.water.bubble ? 0.12 : 0.08), bubble = hex === P.water.bubble;
        for (let i = 0; i < n; i++) {
          const y1 = top - (top * i) / n, y0 = top - (top * (i + 1)) / n, mid = [x0 + w / 2, (y0 + y1) / 2, zf];
          const quad = () => B.vpoly([[x0, y0, zf], [x0 + w, y0, zf], [x0 + w, y1, zf], [x0, y1, zf]], hex);
          if (bubble) B.sway("fall", { phase: i * 0.9, root: mid, span: (y1 - y0) / 2 }, quad);
          else B.sway("swatch", { rate: 0.7, duty: 0.2, phase: -i * 1.1, root: mid, alt: P.water.top }, quad);
        }
      }
      const foam = tone(P.water.bubble, P.water.foamShade, P.water.top);
      const k = v % 2 ? -1 : 1;
      B.rbox(0.4, 0.16, 0.3, 0.1, foam, -0.18 * k, 0, -0.3);
      B.rbox(0.26, 0.36, 0.2, 0.08, foam, 0.16 * k, 0, -0.38);
      B.rbox(0.18, 0.16, 0.18, 0.07, foam, -0.08 * k, 0.16, -0.3);
      B.rbox(0.16, 0.12, 0.16, 0.06, foam, 0.32 * k, 0, -0.16);
    },
    "stepping-stones"(B, H, v) {
      const pal = tone(P.stone.pebble, P.stone.rim, P.wellStone[1]);
      const spots = v % 2 ? [[-0.2, -0.1, 0.18, 0.1], [0.18, 0.15, 0.2, 0.11]] : [[-0.22, -0.15, 0.16, 0.09], [0.15, -0.1, 0.12, 0.08], [0.02, 0.22, 0.18, 0.1]];
      for (const [x, z, rx, rz] of spots) B.prism(circle(x, z, rx, rz, 10), -0.04, 0.08, pal);
    },
    log(B) {
      B.rot([1, 0, 0], Math.PI / 2, 0, 0.16, 0);
      B.cyl(0.16, 0.9, tone(W.light, W.mid, W.dark), 0, -0.45, 0, 8, { topPal: W.end });
      B.pop();
    },
    lantern(B, H) {
      B.box(0.07, H - 0.25, 0.07, woodPal);
      B.box(0.3, 0.05, 0.05, woodPal, 0.1, H - 0.3, 0);
      B.sway("swatch", { rate: 0.35, duty: 0.5, root: [0.2, H - 0.52, 0], alt: tone(P.flame[0], P.flame[0], P.flame[1]) }, () => B.box(0.16, 0.2, 0.16, tone(P.flame[0], P.flame[1], P.flame[2]), 0.2, H - 0.52, 0));
      B.box(0.2, 0.04, 0.2, tri3(P.metal), 0.2, H - 0.33, 0);
      B.box(0.18, 0.03, 0.18, tri3(P.metal), 0.2, H - 0.55, 0);
    },
    stump(B, H) {
      B.cyl(0.2, 0.3, tone(W.mid, W.mid, W.dark), 0, 0, 0, 10, { topPal: W.end });
      ring(B, 0, 0, 0.308, 0.2, 0.03, solid(W.dark), 10);
      B.push(0.02, 0.3, 0, -Math.PI / 4);
      B.rot([0, 0, 1], 0.35);
      B.box(0.04, 0.26, 0.04, tone(W.mid, W.mid, W.dark), 0, -0.02, 0);
      B.box(0.03, 0.1, 0.14, tone(P.axe[0], P.axe[1], P.axe[2]), 0, -0.05, 0.07);
      B.pop(); B.pop();
    },
    ladder(B, H, v, ctx) {
      const drop = ctx.drop, z = -0.54;
      for (const x of [-0.17, 0.17]) B.box(0.03, drop + 0.05, 0.03, solid(P.rope), x, -drop, z);
      const n = 4;
      for (let i = 0; i < n; i++) {
        const y = -drop + 0.2 + (i * (drop - 0.3)) / (n - 1);
        B.at(0, y, z - 0.05, 0, () => { B.rot([0, 0, 1], Math.PI / 2); B.cyl(0.11, 0.4, tone(W.light, W.mid, W.dark), 0, -0.2, 0, 8, { topPal: W.end }); B.pop(); });
      }
      post(B, -0.2, -0.32, 0.3, 0.09);
      post(B, 0.2, -0.32, 0.3, 0.09);
    },
    scaffold(B, H, v, ctx) {
      const top = ctx.deck, s = 0.3, foot = 0.3;
      const pal = tone(W.light, W.mid, W.dark);
      B.rbox(0.9, foot, 0.9, 0.08, tone(P.sand.top, P.sand.edge, P.sand.lip), 0, 0, 0);
      for (const [x, z] of [[-s, -s], [s, -s], [s, s], [-s, s]]) B.box(0.12, top - foot, 0.12, pal, x, foot, z);
      const lo = foot + 0.15, hi = top - 0.3;
      bar(B, [-s, lo, s + 0.02], [s, hi, s + 0.02], 0.08, pal);
      bar(B, [s, lo, s + 0.02], [-s, hi, s + 0.02], 0.08, pal);
      bar(B, [s + 0.02, lo, s], [s + 0.02, hi, -s], 0.08, pal);
      bar(B, [s + 0.02, lo, -s], [s + 0.02, hi, s], 0.08, pal);
      B.rbox(0.86, 0.2, 0.86, 0.06, tone(W.light, W.mid, W.dark), 0, top - 0.2, 0);
      for (const [x, z] of [[s, -s], [s, s], [-s, s]]) B.at(x, top, z, 0, () => post(B, 0, 0, 0.2, 0.1));
      rope(B, [s, top + 0.14, -s], [s, top + 0.14, s], 0.04, 0.02);
      rope(B, [s, top + 0.14, s], [-s, top + 0.14, s], 0.04, 0.02);
    },
    star(B, H) {
      upright(B, starShape(0.22, 0.1), 0.09, tone(P.gold[0], P.gold[1], P.gold[1]), H * 0.5 + 0.1);
    },
    heart(B, H) {
      upright(B, heartShape(0.2), 0.09, tone(P.heart[0], P.heart[1], P.heart[2]), H * 0.5 + 0.1);
    },
  };

  function flame(B, x, y, z, r) {
    B.sway("flame", { amp: FLAME, root: [x, y, z], span: r * 2.6 }, () => {
      B.cone(r, 0, r * 2.6, tone(P.flame[0], P.flame[1], P.flame[2]), x, y, z, 6);
      B.cone(r * 0.55, 0, r * 1.6, tone(P.flame[0], P.flame[0], P.flame[1]), x + r * 0.2, y, z + r * 0.35, 5);
    });
  }

  const swayed = (fn, kind, opts) => (B, ...a) => B.sway(kind, opts, () => fn(B, ...a));
  PIECES.bush = swayed(PIECES.bush, "crown", { amp: LEAF, span: 0.6 });
  PIECES["bush-cluster"] = swayed(PIECES["bush-cluster"], "crown", { amp: LEAF, span: 0.8 });
  PIECES.flower = swayed(PIECES.flower, "crown", { amp: LEAF, span: 0.06 });
  return PIECES;
}

export const PIECES = makePieces();

export const SPIN = new Set(["coin", "gem", "star", "heart"]);
export { roundRect };
