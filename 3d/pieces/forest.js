import * as THREE from "three";
import { Baker, tone, circle, bakedMaterial } from "../baker.js";
import { bakeParts } from "../../pipeline/a-transcribe/parts.js";
import { register as registerA } from "./forest-a.js";

const INK = {
  soot: ["#5a4d48", "#463b37", "#342b28"],
  char: ["#3e3431", "#2f2725", "#211b19"],
  ash: ["#9a9089", "#7f766f", "#665e58"],
  paper: ["#f2eee4", "#dcd6c8", "#bdb6a6"],
  birch: ["#eeebe2", "#d3cfc3", "#b1ac9f"],
  bark: ["#6e4a38", "#56382a", "#3f281e"],
  root: ["#7a5240", "#5f3e30", "#452c22"],
  ember: ["#ffb13a", "#f08a1e", "#cc6414"],
  flame: ["#ffe08a", "#ffc13d", "#f09a1e"],
  moss: ["#6fae5a", "#588f47", "#436f37"],
  lichen: ["#a9c77a", "#8aa862", "#6c864c"],
};
const pal = (c) => tone(c[0], c[1], c[2]);
const mesh = (B) => new THREE.Mesh(B.geometry(), bakedMaterial());
const tonesOf = (P, t) => P.tones?.[t] || [];
const pick = (list, i, d) => list[i] || d;

function wedge(B, w, h, d, c, x = 0, y = 0, z = 0) {
  const x0 = x - w / 2, x1 = x + w / 2, zb = z - d / 2, zf = z + d / 2;
  const p = pal(c);
  B.quad([x0, y, zf], [x1, y, zf], [x1, y + h, zb], [x0, y + h, zb], p);
  B.quad([x0, y, zb], [x0, y + h, zb], [x1, y + h, zb], [x1, y, zb], p);
  B.quad([x0, y, zf], [x0, y, zb], [x1, y, zb], [x1, y, zf], p);
  B.tri([x0, y, zb], [x0, y, zf], [x0, y + h, zb], p);
  B.tri([x1, y, zb], [x1, y + h, zb], [x1, y, zf], p);
}

function teeth(B, w, y, c, v) {
  const hs = v % 2 ? [0.16, 0.26, 0.1, 0.2] : [0.24, 0.12, 0.22, 0.14];
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b], i) => B.box(w * 0.4, hs[i], w * 0.4, pal(c), a * w * 0.26, y, b * w * 0.26));
}

function roots(B, n, r, c, v = 0) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.PI / 4 + v * 0.6;
    B.at(Math.sin(a) * r, 0, Math.cos(a) * r, a, () => { B.box(0.14, 0.16, 0.24, pal(c)); B.box(0.12, 0.08, 0.14, pal(c), 0, 0, 0.16); });
  }
}

function arch(B, span, rise, th, c, y = 0, n = 6) {
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = Math.PI * t;
    const x = -Math.cos(a) * span / 2, yy = Math.sin(a) * rise;
    B.box(th * 1.1, th, th, pal(c), x, y + yy, 0);
  }
}

const BUILD = {
  charTrunk(B, H, v, c) {
    roots(B, 4, 0.22, c.dark, v);
    const segs = [[0.4, 0.34], [0.34, 0.33], [0.28, 0.33]];
    let y = 0;
    segs.forEach(([w, f], i) => {
      const hh = H * f * 0.92;
      B.box(w, hh, w, pal(i % 2 ? c.mid : c.dark), i % 2 ? 0.03 : -0.02, y, i % 2 ? -0.02 : 0.02);
      y += hh;
    });
    B.box(0.06, H * 0.5, 0.03, pal(INK.paper), 0.1, H * 0.2, 0.19);
    B.box(0.05, H * 0.3, 0.03, pal(INK.paper), -0.08, H * 0.55, 0.16);
    const s = v % 2 ? 1 : -1;
    B.box(0.34, 0.12, 0.12, pal(c.mid), s * 0.28, H * 0.62, 0);
    B.box(0.12, 0.2, 0.12, pal(c.mid), s * 0.42, H * 0.62 + 0.08, 0);
    B.box(0.12, 0.1, 0.28, pal(c.dark), 0, H * 0.78, -s * 0.22);
    teeth(B, 0.28, y, c.dark, v);
  },
  bole(B, H, v, c) {
    roots(B, 4, 0.2, c.dark, v);
    const n = 3, w0 = 0.36;
    let y = 0;
    for (let i = 0; i < n; i++) {
      const hh = (H - 0.2) / n;
      B.box(w0 - i * 0.05, hh, w0 - i * 0.05, pal(i % 2 ? c.mid : c.dark), 0, y, 0);
      y += hh;
    }
    for (const [yy, a, w] of [[0.45, 0, 0.3], [0.9, 2.2, 0.24], [1.5, 4.2, 0.2]]) {
      if (yy > H - 0.4) continue;
      B.at(0, yy, 0, a + v, () => wedge(B, w, 0.1, 0.22, INK.ember, 0, 0, 0.26));
    }
    B.at(0, H * 0.7, 0, v * 1.4, () => { B.box(0.44, 0.1, 0.1, pal(c.mid), 0.24, 0, 0); B.box(0.1, 0.18, 0.1, pal(c.mid), 0.42, 0.08, 0); });
    teeth(B, 0.24, y, c.dark, v);
  },
  birch(B, H, v) {
    B.box(0.34, 0.12, 0.34, pal(INK.birch), 0, 0, 0);
    const n = 4;
    let y = 0.12;
    for (let i = 0; i < n; i++) {
      const hh = (H - 0.7) / n, w = 0.24 - i * 0.02;
      B.box(w, hh, w, pal(INK.birch), i % 2 ? 0.02 : -0.01, y, 0);
      B.box(w * 0.55, 0.05, 0.03, pal(INK.char), (i % 2 ? 0.03 : -0.03), y + hh * 0.5, w / 2 + 0.01);
      B.box(0.03, 0.05, w * 0.45, pal(INK.char), w / 2 + 0.01, y + hh * 0.3, 0.02);
      y += hh;
    }
    const s = v % 2 ? 1 : -1;
    B.box(0.32, 0.08, 0.08, pal(INK.birch), s * 0.22, H * 0.45, 0);
    B.box(0.08, 0.08, 0.26, pal(INK.birch), 0, H * 0.62, -s * 0.18);
    B.rbox(0.44, 0.24, 0.44, 0.08, pal(INK.lichen), 0, y, 0);
    B.rbox(0.3, 0.2, 0.3, 0.06, pal(INK.moss), 0.04, y + 0.24, -0.02);
    B.box(0.14, 0.12, 0.14, pal(INK.lichen), -0.1, y + 0.44, 0.06);
  },
  leaning(B, H, v, c) {
    B.box(0.56, 0.26, 0.56, pal(c.dark));
    roots(B, 4, 0.34, c.dark, v);
    const s = v % 2 ? 1 : -1, n = 6, hh = (H - 0.5) / n;
    for (let i = 0; i < n; i++) B.box(0.32 - i * 0.02, hh + 0.04, 0.32 - i * 0.02, pal(i % 2 ? c.mid : c.dark), s * i * 0.11, 0.26 + i * hh, -i * 0.05);
    B.box(0.3, 0.1, 0.1, pal(c.mid), s * 0.5, 0.26 + H * 0.45, 0);
    B.at(0, 0.1, 0, 0.8, () => wedge(B, 0.22, 0.1, 0.2, INK.ember, s * 0.3, 0.26 + H * 0.3, 0.2));
    teeth(B, 0.2, 0.26 + n * hh, c.dark, v);
  },
  log(B, H, v, c) {
    const r = Math.max(0.18, H * 0.5);
    B.push(0, 0, 0, v % 2 ? 0.3 : Math.PI / 2 - 0.3);
    B.box(0.96, r * 1.3, r * 1.4, pal(c.mid), 0, 0.02, 0);
    B.box(0.1, r * 1.2, r * 1.3, pal(INK.paper), 0.46, 0.06, 0);
    B.box(0.12, r * 0.9, r, pal(c.dark), -0.5, 0.02, 0);
    for (const x of [-0.24, 0.02, 0.26]) B.box(0.04, 0.03, r * 1.42, pal(c.dark), x, r * 1.32, 0);
    B.rbox(0.34, 0.06, r * 1.1, 0.04, pal(INK.moss), -0.12, r * 1.32, 0);
    B.box(0.08, 0.3, 0.08, pal(c.mid), 0.18, r * 1.3, 0.04);
    B.pop();
  },
  rootArch(B, H, v, c) {
    B.rbox(0.62, 0.08, 0.36, 0.06, pal(c.dark), 0, 0, 0);
    B.push(0, 0.04, 0, v % 2 ? Math.PI / 2 : 0);
    arch(B, 0.66, H * 0.8, 0.13, c.mid, 0, 6);
    arch(B, 0.36, H * 0.46, 0.1, c.dark, 0, 4);
    B.box(0.03, 0.03, 0.14, pal(INK.paper), 0, H * 0.8 + 0.13, 0);
    B.pop();
  },
  tangle(B, H, v, c) {
    B.box(0.22, H * 0.9, 0.22, pal(c.dark), 0, 0, 0);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + v;
      B.at(Math.sin(a) * 0.2, 0, Math.cos(a) * 0.2, a, () => arch(B, 0.4, H * 0.7, 0.09, c.mid, 0, 4));
    }
    B.box(0.12, 0.12, 0.12, pal(INK.moss), 0, H * 0.9, 0);
  },
  mistSlab(B, H, v) {
    B.rbox(0.8, 0.07, 0.62, 0.14, pal(INK.paper), v % 2 ? 0.04 : -0.04, 0, 0);
    B.rbox(0.5, 0.06, 0.4, 0.12, pal(INK.paper), v % 2 ? -0.08 : 0.1, 0.07, v % 2 ? 0.06 : -0.05);
    B.box(0.14, 0.05, 0.08, pal(INK.ash), 0.16, 0.13, 0.04);
  },
  veil(B, H, v) {
    B.rbox(0.7, 0.06, 0.56, 0.14, pal(INK.paper), 0, 0, 0);
    B.box(0.14, H * 0.3, 0.14, pal(INK.ash), 0.08, 0.06, -0.1);
    B.box(0.1, H * 0.5, 0.1, pal(INK.ash), -0.12, 0.06, 0.12);
    B.rbox(0.84, 0.05, 0.3, 0.12, pal(INK.paper), v % 2 ? 0.04 : -0.04, H * 0.3, -0.18);
    B.rbox(0.9, 0.05, 0.28, 0.12, pal(INK.birch), v % 2 ? -0.06 : 0.06, H * 0.55, 0.06);
    B.rbox(0.6, 0.05, 0.24, 0.1, pal(INK.paper), v % 2 ? 0.1 : -0.08, H * 0.82, 0.22);
    B.box(0.08, 0.08, 0.08, pal(INK.ember), 0.1, H * 0.3 + 0.05, -0.18);
  },
  pebbles(B, H, v, c) {
    const g = v % 2 ? [[-0.18, -0.1, 0.24], [0.16, 0.08, 0.2], [0.02, 0.24, 0.14]] : [[0.14, -0.14, 0.22], [-0.16, 0.1, 0.24], [0.2, 0.2, 0.12]];
    g.forEach(([x, z, w], i) => B.rbox(w, H * (0.5 + i * 0.2), w * 0.9, 0.06, pal(i === 1 ? INK.paper : c.mid), x, 0, z));
  },
  stump(B, H, v, c) {
    roots(B, 4, 0.24, c.dark, v);
    B.box(0.46, H * 0.7, 0.46, pal(c.mid), 0, 0, 0);
    teeth(B, 0.46, H * 0.7, c.dark, v);
    B.box(0.22, 0.02, 0.22, pal(INK.char), 0, H * 0.7, 0);
  },
  emberStump(B, H, v, c) {
    BUILD.stump(B, H, v, c);
    B.box(0.18, 0.12, 0.18, pal(INK.ember), 0, H * 0.7, 0);
    B.box(0.08, 0.1, 0.08, pal(INK.flame), 0.02, H * 0.7 + 0.12, 0);
  },
  wisp(B, H, v) {
    B.rbox(0.4, 0.1, 0.4, 0.08, pal(INK.char), 0, 0, 0);
    const n = 5;
    for (let i = 0; i < n; i++) {
      const a = i * 1.3 + v, r = 0.08 + i * 0.02, w = 0.3 - i * 0.03;
      B.box(w, H * 0.16, w, pal(i < 2 ? INK.ember : INK.ash), Math.cos(a) * r, 0.1 + i * H * 0.17, Math.sin(a) * r);
    }
    for (let i = 0; i < 5; i++) { const a = i * 2.4; B.box(0.07, 0.07, 0.07, pal(INK.flame), Math.cos(a) * 0.26, 0.3 + i * H * 0.14, Math.sin(a) * 0.26); }
  },
  sprout(B, H, v) {
    B.rbox(0.44, 0.08, 0.36, 0.06, pal(INK.bark), 0, 0, 0);
    for (const [x, z, h, c] of [[-0.1, -0.04, H * 0.9, INK.ember], [0.12, 0.06, H * 0.65, INK.flame], [0.0, 0.14, H * 0.5, INK.ember]]) {
      B.box(0.12, h, 0.12, pal(c), x, 0.08, z);
      B.box(0.16, 0.06, 0.08, pal(c), x + 0.06, 0.08 + h * 0.6, z);
    }
  },
  gatePost(B, H, v, c, d, beamC, archBeam) {
    roots(B, 4, 0.24, c.dark, v);
    B.box(0.46, 0.2, 0.46, pal(c.dark));
    const top = 0.2 + H * 0.52;
    B.box(0.34, H * 0.52, 0.34, pal(c.mid), 0, 0.2, 0);
    B.box(0.05, H * 0.34, 0.03, pal(INK.paper), 0.08, 0.3, 0.18);
    if (d.side && archBeam) {
      teeth(B, 0.34, top, c.dark, v);
      B.at(d.axis === "x" ? 0 : -d.side * 0.5, H * 0.45, d.axis === "x" ? -d.side * 0.5 : 0, d.axis === "x" ? Math.PI / 2 : 0, () => { arch(B, 1.0, H * 0.42, 0.24, c.mid, 0, 7); arch(B, 1.0, H * 0.42, 0.08, INK.paper, 0.24, 7); });
    } else if (d.side) {
      const reach = 1.0, L = reach + 0.44, o = -d.side * (reach / 2);
      B.box(0.4, 0.06, 0.4, pal(c.dark), 0, top, 0);
      if (d.axis === "x") {
        B.box(0.3, 0.26, L, pal(beamC), 0, top + 0.06, o);
        B.box(0.26, 0.22, 0.04, pal(INK.paper), 0, top + 0.08, o - d.side * L / 2);
        B.box(0.22, 0.06, L * 0.4, pal(INK.moss), 0, top + 0.32, o);
      } else {
        B.box(L, 0.26, 0.3, pal(beamC), o, top + 0.06, 0);
        B.box(0.04, 0.22, 0.26, pal(INK.paper), o - d.side * L / 2, top + 0.08, 0);
        B.box(L * 0.4, 0.06, 0.22, pal(INK.moss), o, top + 0.32, 0);
      }
    } else teeth(B, 0.34, top, c.dark, v);
  },
};

const KINDS = [
  ["wisp", /wisp|smoke|column/i],
  ["sprout", /sprout|fungus|ember_s/i],
  ["birch", /birch/i],
  ["bole", /bole/i],
  ["leaning", /leaning/i],
  ["charTrunk", /trunk/i],
  ["rootArch", /root_arch|taproot|nest/i],
  ["tangle", /tangle|root/i],
  ["mistSlab", /mist_slab|eraser/i],
  ["veil", /veil|mist/i],
  ["pebbles", /pebble|scatter/i],
  ["emberStump", /scorched/i],
  ["stump", /stump/i],
  ["log", /log|timber/i],
];

function lensOf(types) {
  if (types.some((t) => /birch/.test(t))) return "composition";
  if (types.some((t) => /taproot|bole/.test(t))) return "subject";
  return "medium";
}

function perch(B, lens) {
  if (lens === "medium") {
    B.prism(circle(0, 0, 0.98, 0.9, 8, Math.PI / 8), 0, 0.14, pal(INK.char));
    B.prism(circle(0, 0, 0.8, 0.74, 8, Math.PI / 8), 0.14, 0.3, pal(INK.soot));
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; B.box(0.16, 0.06, 0.16, pal(i % 2 ? INK.ember : INK.paper), Math.cos(a) * 0.86, 0.14, Math.sin(a) * 0.8); }
    return 0.3;
  }
  if (lens === "subject") {
    B.prism(circle(0, 0, 0.96, 0.96, 8, Math.PI / 8), 0, 0.22, pal(INK.bark));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      B.at(Math.cos(a) * 0.78, 0.1, Math.sin(a) * 0.78, -a, () => arch(B, 0.5, 0.3, 0.12, INK.root, 0, 4));
    }
    B.prism(circle(0, 0, 0.66, 0.66, 8, Math.PI / 8), 0.22, 0.5, pal(INK.root));
    B.prism(circle(0, 0, 0.5, 0.5, 8, Math.PI / 8), 0.5, 0.62, pal(INK.moss));
    return 0.62;
  }
  const steps = [[0.96, 0.18, INK.bark], [0.78, 0.18, INK.birch], [0.6, 0.18, INK.bark], [0.46, 0.14, INK.birch]];
  let y = 0;
  steps.forEach(([r, hh, c], i) => { B.at(0, 0, 0, i * 0.4, () => B.prism(circle(0, 0, r, r, 6, 0), y, y + hh, pal(c))); y += hh; });
  return y;
}

export function register(style) {
  const P = style.palette;
  const props = P.props || {};
  const types = Object.keys(props);
  const lens = lensOf(types);
  const A = registerA(style);
  const catalog = {};
  const builders = {};
  const gateT = types.find((t) => props[t].role === "threshold");
  for (const t of types) {
    const p = props[t], role = p.role;
    const lead = role === "lead" || role === "creature";
    catalog[t] = {
      footprint: lead ? [2, 2] : role === "threshold" ? [1, 1] : p.footprint || [1, 1],
      passable: lead ? false : !!p.passable,
      variants: 2,
      height: lead ? 3.0 : /root_arch|fallen_timber|diagonal_log/.test(t) ? 1.5 : Math.min(2.7, Math.max(0.3, p.height || 1)),
    };
    const tn = tonesOf(P, t);
    const c = lens === "composition"
      ? { dark: INK.bark, mid: /birch|log/.test(t) ? INK.birch : INK.root }
      : lens === "subject" ? { dark: INK.char, mid: INK.bark } : { dark: INK.char, mid: INK.soot };
    if (!c.mid) c.mid = pick(tn, 1, INK.soot);
    const kind = lead ? "lead" : role === "threshold" ? "gatePost" : (KINDS.find(([, re]) => re.test(t)) || ["parts"])[0];
    builders[t] = (v, rot, st, ctx) => {
      const H = ctx.height, d = ctx.decor || {};
      if (kind === "lead") {
        const g = new THREE.Group();
        const B = new Baker();
        const top = perch(B, lens);
        g.add(mesh(B));
        const bird = A.builders["fire-bird"](0, 0, st, { height: lens === "composition" ? 2.3 : 2.4 });
        const piv = new THREE.Group();
        piv.position.set(0, top, 0);
        piv.rotation.y = lens === "subject" ? 0.2 : lens === "composition" ? -0.15 : 0;
        if (lens === "subject") piv.rotation.z = 0.12;
        piv.add(bird);
        g.add(piv);
        return g;
      }
      const B = new Baker();
      if (kind === "gatePost" || d.side) BUILD.gatePost(B, H, v, c, d, lens === "composition" ? INK.birch : INK.bark, lens === "medium");
      else if (kind === "parts" && p.parts?.length) bakeParts(B, p.parts, { height: H, fallback: pick(tn, 0, INK.soot) });
      else if (BUILD[kind]) BUILD[kind](B, H, v, c);
      else B.box(0.4, H, 0.4, pal(INK.soot));
      return mesh(B);
    };
  }
  return { catalog, builders };
}

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function rimCells(level, h, route) {
  const onRoute = new Set(route.map(([x, z]) => h.key(x, z)));
  const [ax, az] = h.figure.anchor;
  const out = [];
  level.cells.forEach((row, z) => row.forEach((c, x) => {
    if (!h.land(c) || c.s === "ramp" || onRoute.has(h.key(x, z)) || h.isFig(x, z) || h.decorAt(x, z).length) return;
    if (Math.max(Math.abs(x - ax - 0.5), Math.abs(z - az - 0.5)) < 2.6) return;
    const rim = N4.some(([dx, dz]) => { const q = h.cell(x + dx, z + dz); return !q || q.s === "none" || q.h < 1; });
    if (rim) out.push([x, z]);
  }));
  return out;
}

function spots(level, h, route, o = {}) {
  const onRoute = new Set(route.map(([x, z]) => h.key(x, z)));
  const [ax, az] = h.figure.anchor;
  const voidAt = (x, z) => { const q = h.cell(x, z); return !q || q.s === "none" || q.h < 1; };
  const out = [];
  level.cells.forEach((row, z) => row.forEach((c, x) => {
    if (!h.land(c) || c.s === "ramp" || onRoute.has(h.key(x, z)) || h.isFig(x, z) || h.decorAt(x, z).length) return;
    if (N4.some(([dx, dz]) => h.cell(x + dx, z + dz)?.s === "ramp")) return;
    const front = [h.cell(x + 1, z), h.cell(x, z + 1)];
    if (front.some((q) => q && q.h > c.h)) return;
    if (o.tall && [[1, 0], [0, 1]].some(([dx, dz]) => voidAt(x + dx, z + dz))) return;
    const d = Math.max(Math.abs(x - ax - 0.5), Math.abs(z - az - 0.5));
    if (d < (o.near ?? 0) || d > (o.far ?? 99)) return;
    const back = [[-1, 0], [0, -1]].some(([dx, dz]) => voidAt(x + dx, z + dz));
    if (o.backRim && !back) return;
    if (o.behind && x + z > ax + az + 1) return;
    out.push([x, z, d]);
  }));
  return out.sort((a, b) => (o.sort === "near" ? a[2] - b[2] : ((a[0] * 7 + a[1] * 13) % 17) - ((b[0] * 7 + b[1] * 13) % 17))).map(([x, z]) => [x, z]);
}

function plant(level, h, t, n, cells) {
  let k = 0;
  for (const [x, z] of cells) {
    if (k >= n) break;
    if (h.decorAt(x, z).length) continue;
    const m0 = h.reach().missing.length;
    if (!h.put(t, x, z, { v: (x + z) % 2 })) continue;
    if (h.reach().missing.length > m0) { h.removeDecor((d) => d.t === t && d.x === x && d.z === z); continue; }
    k++;
  }
  h.log.push(`plant ${t} ${k}/${n}`);
  return k;
}

function fixRamps(level, h) {
  const at = (x, z) => level.cells[z]?.[x];
  for (let z = 0; z < level.cells.length; z++) for (let x = 0; x < level.cells[z].length; x++) {
    const c = at(x, z);
    if (!c || c.s !== "ramp") continue;
    const [dx, dz] = h.DIRS[c.d], up = at(x - dx, z - dz);
    if (up && up.h === c.h && up.s !== "ramp") continue;
    const up2 = at(x - 2 * dx, z - 2 * dz), D = at(x + dx, z + dz), D2 = at(x + 2 * dx, z + 2 * dz);
    const flat = (q, hh) => q && q.h === hh && q.s !== "ramp" && h.land(q);
    if (up && up.h === c.h + 1 && flat(up2, up.h) && flat(D, c.h - 1) && flat(D2, c.h - 1) && !h.isFig(x + dx, z + dz) && !h.isFig(x - dx, z - dz)) {
      level.cells[z - dz][x - dx] = { h: up.h, s: "ramp", d: c.d, m: c.m || "stone" };
      level.cells[z][x] = { h: c.h, s: h.surf.path };
      level.cells[z + dz][x + dx] = { h: c.h, s: "ramp", d: c.d, m: c.m || "stone" };
      h.clear(x - dx, z - dz); h.clear(x + dx, z + dz);
      for (const [sx, sz] of [[dz, dx], [-dz, -dx]].filter(([p, q]) => p + q > 0)) {
        const X = x - dx + sx, Z = z - dz + sz, n = at(X, Z), f = at(X + dx, Z + dz);
        if (flat(n, up.h) && f && f.h < up.h && !h.isFig(X, Z)) level.cells[Z][X] = { h: up.h - 1, s: n.s };
      }
    } else level.cells[z][x] = { h: c.h, s: h.surf.path };
  }
}

function pickSpawn(level, h, o = {}) {
  const lo = o.min ?? 10, hi = o.max ?? 16, [px, pz] = o.pref || [-1, 1];
  const figDist = ([x, z]) => Math.min(...h.figure.cells.map(([a, b]) => Math.max(Math.abs(a - x), Math.abs(b - z))));
  const voidAt = (x, z) => { const q = h.cell(x, z); return !q || q.s === "none" || q.h < 1; };
  const blocked = h.blockedSet();
  let best = null;
  level.cells.forEach((row, z) => row.forEach((c, x) => {
    if (!h.land(c) || c.s === "ramp" || h.isFig(x, z) || blocked.has(h.key(x, z))) return;
    if (!N4.some(([dx, dz]) => voidAt(x + dx, z + dz))) return;
    const q = h.approach({ from: [x, z] });
    if (q.length < lo - 2) return;
    let gates = 0, inner = 0;
    q.forEach(([a, b], i) => {
      const nb = q[i - 1] || q[i + 1];
      if (!N4.some(([dx, dz]) => voidAt(a + dx, b + dz))) inner++;
      if (i < 2 || i > q.length - 2 || figDist([a, b]) < 2 || h.cell(a, b).s === "ramp") return;
      const sides = nb[0] !== a ? [[a, b - 1], [a, b + 1]] : [[a - 1, b], [a + 1, b]];
      if (sides.every(([u, w]) => { const k = h.cell(u, w); return h.land(k) && k.s !== "ramp" && k.h === h.cell(a, b).h && !q.some(([p2, q2]) => p2 === u && q2 === w) && !h.isFig(u, w); })) gates++;
    });
    const cx = x - level.size[0] / 2, cz = z - level.size[1] / 2;
    const sc = (gates ? 0 : 12) + Math.max(0, lo - q.length, q.length - hi) * 1.5 - (inner / q.length) * 6 - (cx * px + cz * pz) * 0.25;
    if (!best || sc < best[0]) best = [sc, x, z, gates, q.length];
  }));
  if (best) { h.clear(best[1], best[2]); level.spawn = [best[1], best[2]]; h.log.push(`pickSpawn ${best.slice(1).join(" ")}`); }
  return h.approach();
}

function gateAny(level, h, t, r) {
  for (const frac of [0.55, 0.4, 0.7, 0.3, 0.8, 0.2, 0.9]) {
    const g = h.gate(t, { route: r, frac, figGap: 1 });
    if (g) return g;
  }
  const m0 = h.reach().missing.length;
  for (const frac of [0.5, 0.35, 0.65, 0.25, 0.8]) {
    const snap = level.decor.slice();
    const g = h.gate(t, { route: r, frac, figGap: 1, safe: false });
    if (g && h.reach().missing.length - m0 <= 4 && h.approach().length) { h.log.push(`gate ${t} at ${g} loses ${h.reach().missing.length - m0}`); return g; }
    level.decor.length = 0; level.decor.push(...snap);
  }
  return null;
}

const LENS_SET = {
  medium: { gate: "charcoal_root_arch", pass: ["scumble_log", "scumble_log"], mass: "charcoal_trunk", massN: 9, drop: /tree-round|bush|tree-pine/, pref: [-1, 1] },
  subject: { gate: "fallen_timber", pass: ["stump", "taproot_nest"], mass: "charred_bole", massN: 9, drop: /bush|tree-round/, pref: [-1, 1] },
  composition: { gate: "diagonal_log", pass: ["root_tangle", "mushroom"], mass: "slender_birch", massN: 6, drop: /tree-pine|tree-round|bush/, pref: [-1, 1] },
};

function finishLens(level, brief, h) {
  const kind = /composition/.test(level.name || "") ? "composition" : /subject/.test(level.name || "") ? "subject" : "medium";
  const S = LENS_SET[kind];
  h.dryRim();
  const daisTypes = h.ofRole("dais");
  h.removeDecor((d) => daisTypes.includes(d.t));
  const gateT = S.gate;
  const lightT = h.ofRole("light")[0];
  const passT = S.pass.filter((t) => t !== gateT);
  h.removeDecor((d) => d.t === gateT || d.t === lightT || passT.includes(d.t) || S.drop.test(d.t));
  let r = pickSpawn(level, h, { min: 10, max: 16, pref: S.pref });
  if (r.length) h.path(r);
  r = h.approach();
  fixRamps(level, h);
  r = h.approach();
  const g = gateAny(level, h, gateT, r);
  const [ax, az] = h.figure.anchor;
  for (const [x, z] of [[ax - 1, az], [ax - 1, az + 1], [ax - 1, az + 2], [ax - 2, az + 1], [ax, az + 2], [ax + 1, az + 2]]) h.removeDecor((d) => d.t !== gateT && d.x === x && d.z === z);
  const posts = level.decor.filter((d) => d.t === gateT);
  h.removeDecor((d) => /trunk|bole|birch|tree|pine/i.test(d.t) && (posts.some((q) => Math.abs(q.x - d.x) <= 1 && Math.abs(q.z - d.z) <= 1) || (g && Math.abs(g[0] - d.x) <= 2 && Math.abs(g[1] - d.z) <= 2)));
  const masses = level.decor.filter((d) => d.t === S.mass);
  if (masses.length > S.massN) {
    const rimSet = new Set(rimCells(level, h, r).map(([x, z]) => h.key(x, z)));
    const inner = masses.filter((d) => !N4.some(([dx, dz]) => { const q = h.cell(d.x + dx, d.z + dz); return !q || q.s === "none"; }));
    const cut = new Set(inner.slice(0, masses.length - S.massN));
    h.removeDecor((d) => cut.has(d));
  }
  const have = level.decor.filter((d) => d.t === S.mass).length;
  if (have < S.massN) plant(level, h, S.mass, S.massN - have, rimCells(level, h, r).sort((a, b) => (a[0] + a[1]) - (b[0] + b[1])).reverse());
  h.along(passT, { route: r });
  if (lightT) h.lights(lightT, { route: r, every: kind === "medium" ? 2 : 3, skip: kind === "medium" ? 1 : 2, max: 4, avoid: g ? [g] : [], keep: [gateT, ...passT] });
  h.ledges({ keep: [gateT] });
  if (kind === "subject") {
    const n = level.decor.filter((d) => d.t === lightT).length;
    plant(level, h, lightT, Math.max(0, 2 - n), spots(level, h, r, { near: 1.5, far: 3.5, behind: true, sort: "near" }));
    plant(level, h, "taproot_nest", 2, spots(level, h, r, { near: 1.5, far: 3, sort: "near" }));
  }
  const have2 = level.decor.filter((d) => d.t === S.mass).length;
  if (have2 < S.massN) plant(level, h, S.mass, S.massN - have2, spots(level, h, r, { near: 3, tall: true, backRim: kind === "composition" }));
  h.repair({ keep: [gateT] });
  h.pruneRamps({ route: h.approach() });
  h.pruneRamps({ all: true, slotsOnly: true });
  h.openRamps();
  h.pruneRamps({ all: true, nearFig: 1 });
  if (h.walkN() < 84) h.thin(84, { keep: [gateT, lightT] });
  if (h.walkN() < 84) h.grow(84);
  unhide(level, h);
  h.rampTone();
  tint(level, kind);
}

function unhide(level, h) {
  let n = 0;
  level.cells.forEach((row, z) => row.forEach((c, x) => {
    if (!h.land(c) || c.s === "ramp" || h.isFig(x, z)) return;
    const f = [h.cell(x + 1, z), h.cell(x + 1, z + 1)];
    if (!f.every((q) => q && h.land(q) && q.s !== "ramp" && q.h > c.h)) return;
    if (N4.some(([dx, dz]) => h.cell(x + dx, z + dz)?.s === "ramp")) return;
    const before = h.walkN(), saved = c, to = Math.min(...f.map((q) => q.h));
    level.cells[z][x] = { ...c, h: to };
    if (h.walkN() < before - 1 || !h.approach().length) level.cells[z][x] = saved;
    else { h.clear(x, z); n++; }
  }));
  h.log.push(`unhide ${n}`);
}

function tint(level, kind) {
  const P = level.palette;
  if (kind === "medium") {
    Object.assign(P.dirt, { top: "#8a7d72", patch: "#7a6e64", mottle: "#6a5f56", border: "#584e46", path: "#968a7e" });
    Object.assign(P.grass, { top: "#7f9c6c", fringe: "#66805a", fringeDark: "#4d6245", speck: "#a3bb8e" });
    Object.assign(P.stone, { top: "#e6e1d6", pebble: "#f4f0e7", pebbleShade: "#c8c1b3", rim: "#a39c8f" });
  }
}

export function finish(level, brief, h) {
  if (brief.lens) return finishLens(level, brief, h);
}
