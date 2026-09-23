import * as THREE from "three";
import { Baker, tone, solid, circle, bakedMaterial } from "../baker.js";

const TAU = Math.PI * 2;
const pick = (P, k, d) => (P && P[k]) || d;

function beam(B, a, b, r, pal, n = 6) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dx, dy, dz);
  if (len < 1e-6) return;
  B.push(a[0], a[1], a[2], Math.atan2(dx, dz));
  B.rot([1, 0, 0], Math.acos(Math.max(-1, Math.min(1, dy / len))));
  B.cyl(r, len, pal, 0, 0, 0, n);
  B.pop(); B.pop();
}

function taper(B, a, b, r0, r1, pal, n = 6) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dx, dy, dz);
  B.push(a[0], a[1], a[2], Math.atan2(dx, dz));
  B.rot([1, 0, 0], Math.acos(Math.max(-1, Math.min(1, dy / len))));
  B.frustum(circle(0, 0, r0, r0, n, Math.PI / n), circle(0, 0, r1, r1, n, Math.PI / n), 0, len, pal);
  B.pop(); B.pop();
}

function flame(w, h, lean = 0, n = 6) {
  const side = (sgn) => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      const hw = s < 0.3 ? (w / 2) * Math.sqrt(1 - ((0.3 - s) / 0.3) ** 2) : (w / 2) * Math.pow(1 - (s - 0.3) / 0.7, 1.25);
      pts.push([lean * s * s + sgn * hw, s * h]);
    }
    return pts;
  };
  const L = side(-1), R = side(1);
  return [[0, 0], ...R.slice(1, -1), [lean, h], ...L.slice(1, -1).reverse()];
}

function upright(B, pts, pal, { x = 0, y = 0, z = 0, d0 = -0.06, d1 = 0.06, yaw = Math.PI / 4 } = {}) {
  B.push(x, y, z, yaw);
  B.rot([1, 0, 0], -Math.PI / 2);
  B.prism(pts.map(([u, v]) => [u, v]), d0, d1, pal, { bottom: true });
  B.pop(); B.pop();
}

const mesh = (B) => new THREE.Mesh(B.geometry(), bakedMaterial());

export function register(style) {
  const P = style.palette;
  const bark = pick(P, "bark", ["#9a8fa0", "#7b7185", "#5f5669"]);
  const barkPal = tone(bark[0], bark[1], bark[2]);
  const root = pick(P, "rootWood", ["#7a6070", "#5f4858", "#4a3845"]);
  const rootPal = tone(root[0], root[1], root[2]);
  const moss = P.grass?.speck || "#5ea85e";
  const flameC = pick(P, "flame", ["#ffe082", "#ffb31d", "#ff831d"]);
  const spirit = pick(P, "spirit", ["#ff9a3c", "#f06a1e", "#c9481a"]);
  const ember = pick(P, "ember", ["#ffcf4a", "#f5a51d", "#dd7a12"]);
  const pale = pick(P, "beak", ["#fff4d6", "#f2dfb0", "#d8bf86"]);
  const mist = pick(P, "mist", ["#b9c3d6", "#9aa5bc", "#808ba3"]);
  const eye = pick(P, "spiritEye", "#2a2230");
  const end = P.wood?.end || "#b88a69";

  function trunk(B, H, v) {
    const segs = v % 3 === 2 ? 2 : 3;
    const widths = [0.34, 0.28, 0.23].slice(0, segs), hs = segs === 2 ? [0.55, 0.45] : [0.4, 0.33, 0.27];
    const endPal = tone(end, bark[1], bark[2]);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 4 + v * 0.5;
      B.at(Math.sin(a) * 0.2, 0, Math.cos(a) * 0.2, a, () => B.box(0.1, 0.12, 0.14, rootPal));
    }
    let y = 0;
    for (let i = 0; i < segs; i++) {
      const w = widths[i], h = H * hs[i], dx = i ? ((v + i) % 2 ? 0.025 : -0.025) : 0;
      B.at(dx, y, 0, i * 0.18 * (v % 2 ? 1 : -1), () => B.box(w, h + 0.02, w, barkPal));
      if (i > 0 || segs === 2) {
        const side = (v + i) % 4, a = side * Math.PI / 2 + 0.3;
        const len = 0.22 + 0.06 * (i % 2);
        B.at(Math.sin(a) * (w / 2 + len / 2 - 0.02), y + h * 0.35, Math.cos(a) * (w / 2 + len / 2 - 0.02), a, () => {
          B.box(0.12, 0.11, len, barkPal);
          B.box(0.1, 0.16, 0.1, barkPal, 0, 0.1, len / 2 - 0.05);
        });
      }
      y += h;
    }
    B.box(widths[segs - 1] - 0.02, 0.03, widths[segs - 1] - 0.02, endPal, 0, y, 0);
    return y;
  }

  function fireBird(B, H) {
    const k = (H - 0.22) / 2.4;
    const orange = tone(spirit[0], spirit[1], spirit[2]);
    const gold = tone(ember[0], ember[1], ember[2]);
    const hot = tone(flameC[0], flameC[1], flameC[2]);
    const beak = tone(pale[0], pale[1], pale[2]);
    const S = (pts) => pts.map(([u, v]) => [u * k, v * k]);
    const G = P.grass || {};
    const mound = tone(G.top || "#4b8c4b", G.fringe || "#3f7643", G.fringeDark || "#2f5734");
    B.prism(circle(0.05, 0, 0.92, 0.86, 12), 0, 0.12, mound);
    B.prism(circle(0, 0.05, 0.62, 0.58, 10), 0.12, 0.22, mound);
    B.push(0, 0.22, 0, 0);
    for (const [u, d] of [[-0.12, -0.14], [0.12, 0.1]]) {
      upright(B, S(flame(0.2, 0.9, 0.05, 4)).map(([a, b]) => [a + u * k, b]), orange, { d0: d - 0.05, d1: d + 0.05 });
      upright(B, S([[-0.2, 0], [0.16, 0], [0.12, 0.08], [-0.16, 0.08]]).map(([a, b]) => [a + u * k, b]), gold, { d0: d - 0.09, d1: d + 0.09 });
    }
    const body = S([[0, 0.7], [0.3, 0.72], [0.55, 0.85], [0.8, 1.1], [0.85, 1.35], [0.6, 1.4], [0.2, 1.55], [-0.2, 1.6], [-0.4, 1.45], [-0.42, 1.1], [-0.25, 0.8]]);
    upright(B, body, orange, { d0: -0.2, d1: 0.2 });
    const wing = S([[-0.1, 1.05], [0.25, 1.0], [0.55, 1.12], [0.7, 1.3], [0.4, 1.38], [0.05, 1.35], [-0.2, 1.25]]);
    upright(B, wing, gold, { d0: 0.2, d1: 0.28 });
    upright(B, S([[0, 0.95], [0.3, 0.95], [0.4, 1.1], [0.1, 1.2], [-0.15, 1.1]]), hot, { d0: 0.28, d1: 0.32 });
    for (const [u, w, h, lean, dd] of [[0.62, 0.34, 0.95, 0.35, 0], [0.78, 0.26, 0.75, 0.4, 0.12], [0.5, 0.22, 0.6, 0.3, -0.12]]) {
      upright(B, S(flame(w, h, lean, 5)).map(([a, b]) => [a + u * k, b + 1.15 * k]), dd ? gold : orange, { d0: dd - 0.07, d1: dd + 0.07 });
    }
    upright(B, S(flame(0.36, 0.95, -0.12, 5)).map(([a, b]) => [a - 0.28 * k, b + 1.3 * k]), orange, { d0: -0.12, d1: 0.12 });
    const head = S([[-0.52, 1.95], [-0.4, 1.8], [-0.15, 1.78], [0, 1.95], [-0.02, 2.12], [-0.2, 2.2], [-0.45, 2.1]]);
    upright(B, head, gold, { d0: -0.14, d1: 0.14 });
    upright(B, S([[-0.5, 1.9], [-0.78, 1.83], [-0.5, 2.05]]), beak, { d0: -0.07, d1: 0.07 });
    upright(B, S([[-0.33, 1.96], [-0.26, 1.96], [-0.26, 2.04], [-0.33, 2.04]]), solid(eye), { d0: 0.14, d1: 0.17 });
    upright(B, S([[-0.33, 1.96], [-0.26, 1.96], [-0.26, 2.04], [-0.33, 2.04]]), solid(eye), { d0: -0.17, d1: -0.14 });
    for (const [u, w, h, lean, dd, pal] of [[-0.3, 0.16, 0.42, -0.1, 0, hot], [-0.16, 0.18, 0.5, 0.02, 0.05, gold], [-0.04, 0.14, 0.34, 0.12, -0.05, hot]]) {
      upright(B, S(flame(w, h, lean, 4)).map(([a, b]) => [a + u * k, b + 2.06 * k]), pal, { d0: dd - 0.05, d1: dd + 0.05 });
    }
    B.pop();
  }

  const catalog = {
    "bare-trunk": { footprint: [1, 1], passable: false, variants: 3, height: 2.5 },
    "leaning-trunk": { footprint: [1, 1], passable: false, variants: 2, height: 2.4, rotates: true },
    "root-tangle": { footprint: [1, 1], passable: true, variants: 2, height: 0.3, rotates: true },
    "fallen-log": { footprint: [1, 1], passable: false, variants: 2, height: 0.5, rotates: true },
    "mist-bank": { footprint: [1, 1], passable: true, variants: 2, height: 0.1 },
    "flame-wisp": { footprint: [1, 1], passable: false, variants: 1, height: 0.8 },
    "fire-bird": { footprint: [2, 2], passable: false, variants: 1, height: 3.0, rotates: true },
  };

  const builders = {
    "bare-trunk"(v, rot, st, ctx) {
      const B = new Baker();
      trunk(B, ctx.height * [1, 0.86, 0.74][v % 3], v);
      return mesh(B);
    },
    "leaning-trunk"(v, rot, st, ctx) {
      const B = new Baker();
      B.box(0.6, 0.42, 0.6, barkPal);
      B.box(0.52, 0.04, 0.52, tone(end, bark[1], bark[2]), 0, 0.42, 0);
      for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + Math.PI / 4; B.at(Math.sin(a) * 0.36, 0, Math.cos(a) * 0.36, a, () => B.box(0.14, 0.18, 0.18, rootPal)); }
      B.push(0, 0.4, 0, v ? -Math.PI / 3 : Math.PI / 3);
      B.rot([0, 0, 1], 0.3);
      trunk(B, ctx.height, v + 1);
      B.pop(); B.pop();
      return mesh(B);
    },
    "root-tangle"(v, rot, st, ctx) {
      const B = new Baker();
      const n = v ? 3 : 4, hh = ctx.height;
      B.rbox(0.22, hh * 0.7, 0.22, 0.07, rootPal, 0, 0, 0);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + v * 0.7 + 0.3, r = 0.44 - (i % 2) * 0.08;
        const p0 = [0, hh * 0.45, 0], mid = [Math.sin(a) * r * 0.55, hh * 0.55, Math.cos(a) * r * 0.55], p1 = [Math.sin(a + 0.35) * r, -0.03, Math.cos(a + 0.35) * r];
        beam(B, p0, mid, 0.07, rootPal, 6);
        beam(B, mid, p1, 0.06, rootPal, 6);
      }
      return mesh(B);
    },
    "fallen-log"(v, rot, st, ctx) {
      const B = new Baker();
      const r = ctx.height / 2, len = 0.94;
      B.rot([0, 0, 1], Math.PI / 2, 0, r + 0.02, 0);
      B.cyl(r, len, barkPal, 0, -len / 2, 0, 8);
      B.cyl(r * 0.8, 0.01, solid(end), 0, len / 2, 0, 8);
      B.pop();
      for (const [x, w] of v ? [[-0.2, 0.26], [0.22, 0.16]] : [[0.05, 0.32]]) B.rbox(w, 0.05, r * 1.1, 0.04, tone(moss, P.grass?.fringe || moss, P.grass?.fringeDark || moss), x, r * 1.88, 0);
      beam(B, [0.18, r * 1.6, 0.05], [0.3, r * 2.4, 0.22], 0.04, barkPal, 5);
      return mesh(B);
    },
    "mist-bank"(v, rot, st, ctx) {
      const B = new Baker();
      const pal = tone(mist[0], mist[1], mist[2]);
      const lobes = v ? [[-0.12, -0.08, 0.42, 0.3], [0.22, 0.16, 0.26, 0.22]] : [[0.02, 0.02, 0.46, 0.36], [-0.2, 0.22, 0.24, 0.18]];
      lobes.forEach(([x, z, rx, rz], i) => B.prism(circle(x, z, rx, rz, 12), 0.02 + i * 0.03, 0.05 + i * 0.03, pal));
      const m = new THREE.Mesh(B.geometry(), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false }));
      m.userData.noMerge = true;
      return m;
    },
    "flame-wisp"(v, rot, st, ctx) {
      const B = new Baker();
      const k = ctx.height / 0.8;
      upright(B, flame(0.36 * k, 0.7 * k, 0.1 * k, 5), tone(spirit[0], spirit[1], spirit[2]), { y: 0.1 * k, d0: -0.1, d1: 0.1 });
      upright(B, flame(0.22 * k, 0.45 * k, 0.06 * k, 4), tone(flameC[0], flameC[1], flameC[2]), { y: 0.12 * k, d0: 0.1, d1: 0.14 });
      for (const u of [-0.06, 0.06]) upright(B, [[u - 0.025, 0.36], [u + 0.025, 0.36], [u + 0.025, 0.42], [u - 0.025, 0.42]].map(([a, b]) => [a * k, b * k]), solid(eye), { d0: 0.14, d1: 0.16 });
      return mesh(B);
    },
    "fire-bird"(v, rot, st, ctx) {
      const B = new Baker();
      fireBird(B, ctx.height);
      return mesh(B);
    },
  };
  return { catalog, builders };
}
