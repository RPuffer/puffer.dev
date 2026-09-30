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
  const aspect = aspectOf(P, types);
  if (aspect) return registerAspect(style, aspect);
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
  const aspect = aspectOf(level.palette, Object.keys(level.palette?.props || {}));
  if (aspect) return finishAspect(level, brief, h, aspect);
  if (brief.lens) return finishLens(level, brief, h);
}

const ASPECT_RE = {
  tooth: /^grain_/,
  lift: /^lift_/,
  volute: /^volute_/,
  trunks: /^trunk_(column|fork|mist|fallen|lintel|halo)/,
  roots: /^root_(knee|mycel|toadstool|duff|arch_gate|ember_bird)/,
};

function aspectOf(P, types) {
  if (P?.forestAspect && ASPECT_RE[P.forestAspect]) return P.forestAspect;
  return Object.keys(ASPECT_RE).find((a) => types.some((t) => ASPECT_RE[a].test(t))) || null;
}

const AC = {
  tooth: { paper: ["#f4ead4", "#dccdb0", "#bfae8e"], char: ["#46413d", "#35302c", "#25211e"], grey: ["#8a827a", "#6f6861", "#56504a"], sage: ["#a9b98e", "#8c9c73", "#6f7d5a"] },
  lift: { white: ["#f2f5f9", "#d9dfe8", "#bcc5d3"], ink: ["#353c52", "#282e40", "#1c2030"], putty: ["#a4b0c3", "#8793a8", "#6b778d"], crumb: ["#c3ccda", "#a4b0c3", "#8793a8"] },
  volute: { gilt: ["#e9bf55", "#cc9d35", "#a67c24"], cream: ["#f6e6c6", "#dfc89c", "#c4a878"], mint: ["#8fc7a2", "#72ab86", "#578b6b"], blush: ["#e0a498", "#c9877c", "#ab6a60"], flame: ["#ffd66e", "#f5ab3c", "#dc8624"] },
  trunks: { bark: ["#e4e1ec", "#c6c1d4", "#a7a1bb"], stroke: ["#5d5779", "#4a4563", "#38344e"], lichen: ["#b3cf7a", "#96b261", "#78924b"], mist: ["#f6f3fb", "#dcd6ea", "#c4bcd9"] },
  roots: { root: ["#8a5c3c", "#6e472e", "#523421"], dark: ["#5a3a26", "#452c1c", "#321f14"], moss: ["#6fb05a", "#579146", "#427236"], lichen: ["#d9d69a", "#bab77a", "#9a9860"], cap: ["#e0493a", "#c2352a", "#9c261e"], myc: ["#eaf8ff", "#c2e6f5", "#96cde2"], stem: ["#f2ead8", "#dccfb4", "#bcae90"] },
};

const BIRD = {
  tooth: { spirit: ["#4a4541", "#38332f", "#282420"], ember: ["#8a827a", "#6f6861", "#56504a"], flame: ["#e2d9c8", "#c9bfad", "#aca290"], beak: ["#fbf6ea", "#efe6d2", "#d8ccb2"], spiritEye: "#fbf6ea", grass: { top: "#f4ead4", fringe: "#dccdb0", fringeDark: "#bfae8e" } },
  lift: { spirit: ["#f4f6fa", "#dfe4ec", "#c3cad6"], ember: ["#b9c4d6", "#9aa6b9", "#7c889c"], flame: ["#ffffff", "#eef1f5", "#dbe1ea"], beak: ["#ffffff", "#eef1f5", "#dbe1ea"], spiritEye: "#141824", grass: { top: "#353c52", fringe: "#282e40", fringeDark: "#1c2030" } },
  volute: { spirit: ["#e9bf55", "#cc9d35", "#a67c24"], ember: ["#f7dc8a", "#e9bf55", "#cc9d35"], flame: ["#fff4c8", "#ffe08a", "#f2c14e"], beak: ["#fffaf0", "#f6e6c6", "#dfc89c"], spiritEye: "#3a2b3d", grass: { top: "#f6e6c6", fringe: "#dfc89c", fringeDark: "#c4a878" } },
  trunks: { spirit: ["#4a4563", "#38344e", "#27243a"], ember: ["#8a83a6", "#716a8d", "#5a5474"], flame: ["#eeeaff", "#d4cdee", "#b8b0d8"], beak: ["#ffffff", "#f1eefa", "#dcd6ea"], spiritEye: "#ffffff", grass: { top: "#e4e1ec", fringe: "#c6c1d4", fringeDark: "#a7a1bb" } },
  roots: { spirit: ["#5a3a2a", "#452c1f", "#321f15"], ember: ["#f08a3a", "#d46e24", "#b0561a"], flame: ["#ffcf6b", "#ffb13a", "#f08a1e"], beak: ["#fff4d6", "#f2dfb0", "#d8bf86"], spiritEye: "#1a1210", grass: { top: "#6fb05a", fringe: "#579146", fringeDark: "#427236" } },
};

function vplate(B, pts, c, { x = 0, y = 0, z = 0, d0 = -0.05, d1 = 0.05, yaw = Math.PI / 4 } = {}) {
  B.push(x, y, z, yaw);
  B.rot([1, 0, 0], -Math.PI / 2);
  B.prism(pts, d0, d1, pal(c), { bottom: true });
  B.pop(); B.pop();
}

function flameShape(w, h, lean = 0, n = 6) {
  const side = (sg) => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const s = i / n, hw = s < 0.3 ? (w / 2) * Math.sqrt(1 - ((0.3 - s) / 0.3) ** 2) : (w / 2) * Math.pow(1 - (s - 0.3) / 0.7, 1.2);
      pts.push([lean * s * s + sg * hw, s * h]);
    }
    return pts;
  };
  const L = side(-1), R = side(1);
  return [[0, 0], ...R.slice(1, -1), [lean, h], ...L.slice(1, -1).reverse()];
}

function coil(B, r0, turns, th, c, cx, cy, n = 14) {
  B.push(0, 0, 0, Math.PI / 4);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), a = t * turns * Math.PI * 2, r = r0 * (1 - t * 0.75);
    B.box(th, th, th * 1.4, pal(c), cx + Math.cos(a) * r, cy + Math.sin(a) * r - th / 2, 0);
  }
  B.pop();
}

function band(B, span, rise, th, w, c, y0 = 0, n = 8) {
  const pt = (t) => [-Math.cos(Math.PI * t) * span / 2, y0 + Math.sin(Math.PI * t) * rise];
  for (let i = 0; i < n; i++) {
    const [x0, y1] = pt(i / n), [x1, y2] = pt((i + 1) / n);
    const len = Math.hypot(x1 - x0, y2 - y1) + th * 0.5;
    B.push((x0 + x1) / 2, (y1 + y2) / 2, 0, 0);
    B.rot([0, 0, 1], Math.atan2(y2 - y1, x1 - x0));
    B.box(len, th, w, pal(c), 0, -th / 2, 0);
    B.pop(); B.pop();
  }
}

function lintel(B, d, top, fn) {
  if (!d.side) return;
  const o = -d.side;
  B.at(d.axis === "x" ? 0 : o, top, d.axis === "x" ? o : 0, d.axis === "x" ? Math.PI / 2 : 0, fn);
}

const ABUILD = {
  tooth: {
    mass(B, H, v, C) {
      B.prism(circle(0, 0, 0.4, 0.36, 8, v * 0.3), 0, H * 0.48, pal(C.char));
      B.at(0.04, H * 0.48, -0.02, 0.4 + v * 0.3, () => B.prism(circle(0, 0, 0.3, 0.27, 8), 0, H * 0.36, pal(C.char)));
      B.at(-0.03, H * 0.84, 0.02, 0.9, () => B.prism(circle(0, 0, 0.18, 0.16, 6), 0, H * 0.16, pal(C.grey)));
      B.box(0.26, H * 0.3, 0.04, pal(C.grey), 0.02, H * 0.1, 0.36);
      for (const [x, z] of [[0.4, 0.2], [-0.3, 0.38], [0.36, -0.3]]) B.box(0.1, 0.08, 0.1, pal(C.char), x, 0, z);
    },
    pit(B, H, v, C) {
      B.prism(circle(0, 0, 0.38, 0.34, 10), 0, 0.05, pal(C.paper));
      B.prism(circle(0, 0, 0.25, 0.22, 10), 0.01, 0.07, pal(C.char));
      B.box(0.07, 0.05, 0.07, pal(C.char), 0.32, 0, v ? 0.2 : -0.18);
    },
    stick(B, H, v, C) {
      const r = 0.16;
      B.push(0, 0, 0, v ? 0.5 : -0.5);
      B.rot([0, 0, 1], Math.PI / 2, 0, r, 0);
      B.cyl(r, 0.72, pal(C.char), 0, -0.36, 0, 6);
      B.cyl(r + 0.02, 0.26, pal(C.paper), 0, -0.1, 0, 6);
      B.cone(r, 0.05, 0.1, pal(C.grey), 0, 0.36, 0, 6);
      B.pop(); B.pop();
    },
    light(B, H, v, C) {
      B.prism(circle(0, 0, 0.3, 0.3, 8), 0, 0.06, pal(C.char));
      B.cyl(0.19, H * 0.6, pal(C.paper), 0, 0.06, 0, 8);
      for (let i = 0; i < 4; i++) B.at(0, 0.14 + i * H * 0.13, 0, i * 0.8, () => B.box(0.16, 0.035, 0.04, pal(C.grey), 0, 0, 0.18));
      B.cone(0.19, 0.04, H * 0.34, pal(C.paper), 0, 0.06 + H * 0.6, 0, 8);
      B.cone(0.08, 0.0, H * 0.07, pal(C.char), 0, 0.06 + H * 0.87, 0, 8);
    },
    post(B, H, v, C) {
      B.box(0.46, 0.14, 0.46, pal(C.char));
      B.box(0.32, H * 0.5, 0.32, pal(C.char), 0, 0.14, 0);
      B.box(0.34, 0.2, 0.34, pal(C.paper), 0, 0.14 + H * 0.2, 0);
      B.box(0.28, H * 0.34, 0.28, pal(C.char), 0.02, 0.14 + H * 0.5, 0);
      return 0.14 + H * 0.84;
    },
    beam(B, C) {
      B.box(2.3, 0.08, 0.42, pal(C.paper), 0, 0, 0);
      for (const x of [-1.05, 1.05]) B.box(0.14, 0.08, 0.18, pal(C.paper), x + (x > 0 ? 0.08 : -0.08), 0, 0.12);
      B.box(0.9, 0.02, 0.16, pal(C.grey), 0.2, 0.08, -0.04);
    },
    perch(B, C) {
      let y = 0;
      [[1.9, 1.7, 0], [1.72, 1.58, 0.16], [1.56, 1.44, -0.12]].forEach(([w, d, a], i) => { B.at(0, y, 0, a, () => B.box(w, 0.13, d, pal(C.paper))); y += 0.13; });
      B.prism(circle(-0.5, 0.45, 0.22, 0.16, 8), y, y + 0.02, pal(C.char));
      return y;
    },
  },
  lift: {
    mass(B, H, v, C) {
      B.rbox(0.76, H * 0.42, 0.64, 0.2, pal(C.putty), 0, 0, 0);
      B.rbox(0.52, H * 0.32, 0.46, 0.16, pal(C.crumb), v ? 0.06 : -0.04, H * 0.42, 0.02);
      B.cone(0.16, 0.04, H * 0.24, pal(C.crumb), v ? 0.1 : -0.08, H * 0.74, 0, 5);
      B.box(0.3, H * 0.18, 0.04, pal(C.ink), 0.08, H * 0.12, 0.33);
      B.box(0.04, H * 0.14, 0.24, pal(C.ink), 0.39, H * 0.16, -0.06);
    },
    pit(B, H, v, C) {
      for (const [x, z, a, c] of [[-0.18, -0.08, 0.3, C.crumb], [0.14, 0.14, 1.2, C.putty], [0.2, -0.2, 2.1, C.crumb], [-0.08, 0.24, 0.8, C.ink]]) B.at(x, 0, z, a + v, () => B.rbox(0.22, 0.09, 0.1, 0.045, pal(c)));
    },
    stick(B, H, v, C) {
      B.rbox(0.84, H * 0.62, 0.68, 0.22, pal(C.ink), 0, 0, 0);
      B.rbox(0.56, H * 0.34, 0.46, 0.16, pal(C.ink), v ? 0.06 : -0.06, H * 0.62, 0);
      B.at(0, H * 0.96, 0, v ? 0.5 : -0.4, () => B.box(0.52, 0.03, 0.1, pal(C.white)));
      B.box(0.04, H * 0.4, 0.3, pal(C.white), 0.43, H * 0.1, 0);
    },
    light(B, H, v, C) {
      B.rbox(0.5, 0.08, 0.44, 0.12, pal(C.ink), 0, 0, 0);
      vplate(B, flameShape(0.66, H * 0.92, v ? 0.16 : -0.14, 7), C.ink, { y: 0.08, d0: -0.03, d1: 0.03 });
      for (const sg of [-1, 1]) {
        vplate(B, flameShape(0.52, H * 0.84, v ? 0.14 : -0.12, 7), C.white, { y: 0.1, d0: sg < 0 ? -0.1 : 0.03, d1: sg < 0 ? -0.03 : 0.1 });
        vplate(B, flameShape(0.2, H * 0.42, v ? 0.1 : -0.08, 5), C.crumb, { y: 0.16, d0: sg < 0 ? -0.12 : 0.1, d1: sg < 0 ? -0.1 : 0.12 });
      }
    },
    post(B, H, v, C) {
      B.rbox(0.5, 0.12, 0.46, 0.12, pal(C.ink));
      B.box(0.34, H * 0.8, 0.3, pal(C.white), 0, 0.12, 0);
      B.box(0.05, H * 0.8, 0.05, pal(C.ink), 0.17, 0.12, 0.15);
      B.box(0.05, H * 0.8, 0.05, pal(C.ink), -0.17, 0.12, 0.15);
      B.box(0.05, H * 0.8, 0.05, pal(C.ink), 0.17, 0.12, -0.15);
      return 0.12 + H * 0.8;
    },
    beam(B, C) {
      B.box(2.3, 0.18, 0.3, pal(C.white), 0, 0, 0);
      B.box(2.3, 0.05, 0.32, pal(C.ink), 0, -0.05, 0);
    },
    perch(B, C) {
      B.prism(circle(0, 0, 1.0, 0.92, 10, 0.2), 0, 0.14, pal(C.ink));
      B.prism(circle(0.1, -0.05, 0.72, 0.64, 10), 0.14, 0.24, pal(C.ink));
      for (const [x, z, a] of [[0.55, 0.45, 0.6], [-0.5, 0.6, -0.3], [0.7, -0.35, 1.3]]) B.at(x, 0.14, z, a, () => B.box(0.42, 0.03, 0.08, pal(C.white)));
      return 0.24;
    },
  },
  volute: {
    mass(B, H, v, C) {
      B.box(0.54, 0.2, 0.54, pal(C.cream));
      B.box(0.44, 0.1, 0.44, pal(C.blush), 0, 0.2, 0);
      const ch = H * 0.5;
      B.cyl(0.16, ch, pal(C.cream), 0, 0.3, 0, 8);
      for (let i = 0; i < 4; i++) B.at(0, 0.3, 0, (i * Math.PI) / 2 + Math.PI / 4, () => B.box(0.03, ch, 0.03, pal(C.gilt), 0, 0, 0.16));
      B.box(0.46, 0.12, 0.3, pal(C.gilt), 0, 0.3 + ch, 0);
      coil(B, 0.26, 1.3, 0.1, C.gilt, 0, 0.42 + ch + 0.27, 16);
      B.box(0.1, 0.1, 0.14, pal(C.gilt), 0, 0.42 + ch, 0);
    },
    pit(B, H, v, C) {
      B.box(0.42, 0.12, 0.3, pal(C.cream));
      B.push(0, 0.12, 0, Math.PI / 4);
      const n = 16;
      for (let i = 0; i < n; i++) {
        const t = (i / n) * Math.PI * 2, x = 0.24 * Math.sin(t) * Math.pow(Math.abs(Math.sin(t / 2)), 0.9), y = (H - 0.24) * 0.5 * (1 - Math.cos(t));
        B.box(0.09, 0.09, 0.12, pal(C.gilt), x, y, 0);
      }
      B.pop();
    },
    light(B, H, v, C) {
      B.box(0.36, 0.16, 0.36, pal(C.cream));
      B.cyl(0.1, 0.16, pal(C.cream), 0, 0.16, 0, 8);
      B.frustum(circle(0, 0, 0.14, 0.14, 8), circle(0, 0, 0.26, 0.26, 8), 0.32, 0.5, pal(C.cream));
      B.frustum(circle(0, 0, 0.26, 0.26, 8), circle(0, 0, 0.16, 0.16, 8), 0.5, 0.66, pal(C.cream));
      B.cyl(0.27, 0.05, pal(C.gilt), 0, 0.48, 0, 8);
      vplate(B, flameShape(0.3, H - 0.66, v ? 0.08 : -0.08, 6), C.flame, { y: 0.66, d0: -0.06, d1: 0.06 });
      vplate(B, flameShape(0.16, (H - 0.66) * 0.6, 0, 5), C.gilt, { y: 0.66, d0: 0.06, d1: 0.08 });
    },
    stick(B, H, v, C) {
      const n = 6, R = 0.34;
      for (let i = 0; i < n; i++) {
        const a = -0.3 + (i / (n - 1)) * Math.PI * 1.3 + (v ? Math.PI : 0);
        B.at(Math.cos(a) * R, 0, Math.sin(a) * R, -a, () => B.rbox(0.24, H, 0.28, 0.08, pal(C.mint)));
      }
      B.box(0.14, 0.1, 0.14, pal(C.blush), 0, 0, 0);
    },
    post(B, H, v, C) {
      B.box(0.48, 0.2, 0.48, pal(C.cream));
      B.box(0.3, H * 0.62, 0.3, pal(C.gilt), 0, 0.2, 0);
      B.box(0.4, 0.1, 0.4, pal(C.cream), 0, 0.2 + H * 0.62, 0);
      coil(B, 0.16, 1.2, 0.08, C.gilt, 0, 0.3 + H * 0.62 + 0.16, 10);
      return 0.3 + H * 0.62;
    },
    beam(B, C) {
      band(B, 2.0, 0.46, 0.16, 0.2, C.gilt, 0.08, 10);
      band(B, 2.0, 0.46, 0.05, 0.22, C.cream, 0.21, 10);
    },
    perch(B, C) {
      B.prism(circle(0, 0, 1.0, 0.96, 12), 0, 0.2, pal(C.cream));
      B.prism(circle(0, 0, 1.02, 0.98, 12), 0.2, 0.28, pal(C.gilt));
      B.prism(circle(0, 0, 0.8, 0.76, 12), 0.28, 0.46, pal(C.blush));
      B.prism(circle(0, 0, 0.82, 0.78, 12), 0.46, 0.5, pal(C.gilt));
      return 0.5;
    },
  },
  trunks: {
    mass(B, H, v, C) {
      roots(B, 4, 0.24, C.stroke, v);
      const segs = [[0.42, 0.36], [0.36, 0.34], [0.3, 0.3]];
      let y = 0;
      segs.forEach(([w, f], i) => {
        const hh = H * f * 0.94;
        B.box(w, hh, w, pal(C.bark), i % 2 ? 0.03 : -0.02, y, 0);
        B.box(0.06, hh * 0.8, 0.02, pal(C.stroke), (i % 2 ? 0.03 : -0.02) + 0.08 - i * 0.04, y + hh * 0.1, w / 2);
        B.box(0.02, hh * 0.6, 0.05, pal(C.stroke), (i % 2 ? 0.03 : -0.02) + w / 2, y + hh * 0.25, -0.06 + i * 0.05);
        y += hh;
      });
      const s = v % 2 ? 1 : -1;
      B.box(0.34, 0.12, 0.12, pal(C.bark), s * 0.3, H * 0.6, 0);
      B.box(0.12, 0.2, 0.12, pal(C.bark), s * 0.44, H * 0.6 + 0.08, 0);
      B.rbox(0.3, 0.1, 0.24, 0.05, pal(C.lichen), 0.06, H * 0.3, 0.12);
      teeth(B, 0.3, y, C.bark, v);
    },
    fork(B, H, v, C) {
      roots(B, 4, 0.26, C.stroke, v);
      B.box(0.5, 0.2, 0.5, pal(C.bark));
      const s = v % 2 ? 1 : -1, n = 5, hh = (H - 0.5) / n;
      for (let i = 0; i < n; i++) B.box(0.34 - i * 0.02, hh + 0.04, 0.34 - i * 0.02, pal(C.bark), s * i * 0.1, 0.2 + i * hh, -i * 0.04);
      const tx = s * n * 0.1, ty = 0.2 + n * hh;
      B.box(0.2, 0.34, 0.2, pal(C.bark), tx + s * 0.14, ty, 0);
      B.box(0.18, 0.28, 0.18, pal(C.bark), tx - s * 0.1, ty, -0.1);
      B.box(0.05, H * 0.4, 0.02, pal(C.stroke), 0.06, 0.3, 0.18);
    },
    light(B, H, v, C) {
      B.box(0.22, H * 0.5, 0.22, pal(C.stroke));
      [[0.72, 0.52, 0.06], [0.58, 0.44, -0.08], [0.44, 0.34, 0.04]].forEach(([w, d, o], i) => B.rbox(w, 0.08, d, 0.14, pal(C.mist), v ? o : -o, H * 0.5 + i * 0.14, -o));
      B.box(0.14, 0.14, 0.14, pal(["#ffffff", "#f6f3fb", "#e8e2ff"]), 0, H * 0.5 + 0.42, 0);
    },
    stick(B, H, v, C) {
      const r = Math.max(0.2, H * 0.5);
      B.push(0, 0, 0, v % 2 ? 0.3 : Math.PI / 2 - 0.3);
      B.box(0.96, r * 1.3, r * 1.4, pal(C.bark), 0, 0.02, 0);
      B.box(0.1, r * 1.2, r * 1.3, pal(C.stroke), 0.46, 0.06, 0);
      for (const x of [-0.26, 0.04, 0.3]) B.box(0.18, 0.03, 0.04, pal(C.stroke), x, r * 1.32, 0.1);
      B.rbox(0.34, 0.06, r * 1.1, 0.04, pal(C.lichen), -0.12, r * 1.32, 0);
      B.pop();
    },
    post(B, H, v, C) {
      roots(B, 4, 0.24, C.stroke, v);
      B.box(0.38, H * 0.82, 0.38, pal(C.bark));
      B.box(0.06, H * 0.6, 0.02, pal(C.stroke), 0.08, 0.1, 0.2);
      B.box(0.02, H * 0.5, 0.05, pal(C.stroke), 0.2, 0.2, -0.04);
      return H * 0.82;
    },
    beam(B, C) {
      B.rot([0, 0, 1], 0.1);
      B.box(2.5, 0.26, 0.3, pal(C.bark), 0, 0, 0);
      for (const x of [-0.7, 0.1, 0.8]) B.box(0.2, 0.03, 0.32, pal(C.stroke), x, 0.26, 0);
      B.box(0.18, 0.3, 0.18, pal(C.bark), 0.6, 0.26, 0);
      B.pop();
    },
    perch(B, C, k) {
      B.prism(circle(0, 0, 0.98, 0.94, 8, Math.PI / 8), 0, 0.2, pal(C.stroke));
      B.prism(circle(0, 0, 0.84, 0.8, 8, Math.PI / 8), 0.2, 0.38, pal(C.bark));
      const top = 0.38, back = 0.66;
      vplate(B, [[-0.12 * k, 0], [0.12 * k, 0], [0.12 * k, 1.2 * k], [-0.12 * k, 1.2 * k]], C.stroke, { y: top, d0: back, d1: back + 0.1 });
      const ring = [];
      for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; ring.push([Math.cos(a) * 0.95 * k - 0.1 * k, Math.sin(a) * 0.95 * k + 2.0 * k]); }
      vplate(B, ring, C.mist, { y: top, d0: back, d1: back + 0.06 });
      const inner = ring.map(([u, w]) => [(u + 0.1 * k) * 0.72 - 0.1 * k, (w - 2.0 * k) * 0.72 + 2.0 * k]);
      vplate(B, inner, ["#ffffff", "#fdfcff", "#f6f3fb"], { y: top, d0: back - 0.03, d1: back });
      return top;
    },
  },
  roots: {
    mass(B, H, v, C) {
      B.rbox(0.86, 0.1, 0.86, 0.12, pal(C.dark), 0, 0, 0);
      B.push(0, 0.04, 0, v % 2 ? 0.5 : -0.3);
      band(B, 0.92, H * 0.66, 0.24, 0.28, C.root, 0.08, 9);
      B.at(0, 0, 0, Math.PI / 2, () => band(B, 0.74, H * 0.42, 0.18, 0.22, C.dark, 0.06, 7));
      B.rbox(0.32, 0.08, 0.3, 0.06, pal(C.moss), 0, H * 0.66 + 0.1, 0);
      for (const [x, z] of [[0.46, 0.1], [-0.46, -0.08], [0.06, 0.4], [-0.04, -0.4]]) B.box(0.16, 0.12, 0.16, pal(C.root), x, 0, z);
      B.pop();
    },
    pit(B, H, v, C) {
      B.cyl(0.09, H * 0.6, pal(C.stem), 0, 0, 0, 6);
      B.frustum(circle(0, 0, 0.34, 0.34, 8), circle(0, 0, 0.12, 0.12, 8), H * 0.6, H * 0.95, pal(C.cap));
      B.box(0.14, 0.06, 0.14, pal(C.cap), 0, H * 0.95, 0);
      for (const [x, z] of [[0.18, 0.1], [-0.1, 0.2], [0.05, -0.18]]) B.box(0.07, 0.03, 0.07, pal(C.stem), x, H * 0.6 + 0.2 - Math.hypot(x, z) * 0.4, z);
      if (v) { B.cyl(0.06, H * 0.3, pal(C.stem), 0.28, 0, 0.18, 6); B.frustum(circle(0.28, 0.18, 0.18, 0.18, 8), circle(0.28, 0.18, 0.06, 0.06, 8), H * 0.3, H * 0.46, pal(C.cap)); }
    },
    light(B, H, v, C) {
      B.rbox(0.56, 0.1, 0.5, 0.12, pal(C.moss), 0, 0, 0);
      for (const [x, z, h, w] of [[-0.1, -0.06, H * 0.7, 0.32], [0.14, 0.1, H * 0.5, 0.26], [-0.06, 0.18, H * 0.34, 0.2]]) {
        B.cyl(0.05, h, pal(C.stem), x, 0.1, z, 6);
        B.rbox(w, 0.08, w, 0.08, pal(C.myc), x, 0.1 + h, z);
        B.box(w * 0.5, 0.05, w * 0.5, pal(["#ffffff", "#f2fbff", "#dcf1fa"]), x, 0.18 + h, z);
      }
    },
    stick(B, H, v, C) {
      B.rbox(0.74, H * 0.62, 0.64, 0.2, pal(C.moss), 0, 0, 0);
      B.rbox(0.44, H * 0.3, 0.4, 0.14, pal(C.moss), v ? 0.08 : -0.06, H * 0.62, 0);
      for (const [x, z] of [[0.2, 0.2], [-0.2, 0.1], [0.05, -0.2]]) B.rbox(0.14, 0.05, 0.14, 0.05, pal(C.lichen), x, H * 0.62 - 0.02, z);
      B.at(0.1, H * 0.9, 0, 0.6, () => B.box(0.36, 0.05, 0.05, pal(C.root)));
    },
    post(B, H, v, C) {
      roots(B, 5, 0.26, C.root, v);
      B.box(0.5, 0.18, 0.5, pal(C.dark));
      B.box(0.36, H * 0.6, 0.36, pal(C.root), 0, 0.18, 0);
      B.rbox(0.4, 0.1, 0.4, 0.06, pal(C.moss), 0, 0.18 + H * 0.6, 0);
      return 0.18 + H * 0.5;
    },
    beam(B, C) {
      band(B, 2.0, 0.6, 0.22, 0.28, C.root, 0.1, 12);
      B.rbox(0.4, 0.08, 0.3, 0.05, pal(C.moss), 0, 0.7, 0);
    },
    perch(B, C) {
      B.prism(circle(0, 0, 0.98, 0.94, 10), 0, 0.14, pal(C.dark));
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + 0.2;
        B.at(Math.cos(a) * 0.72, 0.06, Math.sin(a) * 0.72, -a + Math.PI / 2, () => band(B, 0.6, 0.34, 0.14, 0.18, C.root, 0.04, 5));
      }
      B.prism(circle(0, 0, 0.6, 0.58, 10), 0.14, 0.36, pal(C.root));
      B.prism(circle(0, 0, 0.46, 0.44, 10), 0.36, 0.44, pal(C.moss));
      return 0.44;
    },
  },
};

const ROLE_KIND = { mass: "mass", detail: "pit", light: "light", approach: "stick", threshold: "post" };

function registerAspect(style, aspect) {
  const P = style.palette;
  const props = P.props || {};
  const C = AC[aspect], K = ABUILD[aspect];
  const A = registerA({ ...style, palette: { ...P, ...BIRD[aspect] } });
  const catalog = {}, builders = {};
  for (const t of Object.keys(props)) {
    const p = props[t], role = p.role;
    const lead = role === "lead" || role === "creature";
    const kind = lead ? "lead" : /fork/.test(t) && K.fork ? "fork" : ROLE_KIND[role] || "mass";
    catalog[t] = {
      footprint: lead ? [2, 2] : [1, 1],
      passable: lead ? false : kind === "pit" && p.passable !== false ? !!p.passable : !!p.passable,
      variants: 2,
      height: lead ? 3.0 : Math.min(2.7, Math.max(0.12, p.height || 1)),
    };
    builders[t] = (v, rot, st, ctx) => {
      const H = ctx.height, d = ctx.decor || {};
      if (kind === "lead") {
        const bh = aspect === "lift" ? 3.5 : aspect === "volute" ? 3.2 : 3.1, k = (bh - 0.22) / 2.4;
        const g = new THREE.Group();
        const B = new Baker();
        const top = K.perch(B, C, k);
        g.add(mesh(B));
        const bird = A.builders["fire-bird"](0, 0, st, { height: bh });
        const piv = new THREE.Group();
        piv.position.set(0, top, 0);
        if (aspect === "roots") piv.rotation.z = 0.1;
        piv.add(bird);
        g.add(piv);
        return g;
      }
      const B = new Baker();
      if (kind === "post" || d.side) {
        const top = K.post(B, H, v, C);
        if (d.side === 1) lintel(B, d, top, () => K.beam(B, C));
      } else K[kind](B, H, v, C);
      return mesh(B);
    };
  }
  return { catalog, builders };
}

const ASPECT_SET = {
  tooth: { gate: "grain_clip_gate", pass: ["grain_stick", "grain_stick"], mass: "grain_lump", massN: 6, light: "grain_stump" },
  lift: { gate: "lift_cut_gate", pass: ["lift_smear", "lift_putty"], mass: "lift_putty", massN: 5, light: "lift_rim" },
  volute: { gate: "volute_gate", pass: ["volute_curl_hedge", "volute_tear", "volute_curl_hedge"], mass: "volute_scroll", massN: 6, light: "volute_urn" },
  trunks: { gate: "trunk_lintel", pass: ["trunk_fallen", "trunk_fork"], mass: "trunk_column", massN: 11, light: "trunk_mist" },
  roots: { gate: "root_arch_gate", pass: ["root_duff", "root_toadstool", "root_duff"], mass: "root_knee", massN: 6, light: "root_mycel" },
};

const LOOK = {
  tooth: {
    bg: "#c9bda6", light: { dir: [-0.8, 0.7, 0.35], ambient: 0.8, sun: 0.36 },
    sand: { top: "#f1e6cf", lip: "#d6c6a4", edge: "#e2d4b6", dots: "#f8f0de" },
    dirt: { top: "#57514b", patch: "#4a4540", mottle: "#3f3a36", border: "#34302c", path: "#625b54" },
    stone: { top: "#e4ddd0", pebble: "#f4efe6", pebbleShade: "#c9c0b0", rim: "#a9a090" },
    grass: { top: "#a9b98e", fringe: "#8c9c73", fringeDark: "#6f7d5a", speck: "#c3d0a8" },
    cliffUpper: { left: "#e6dcc6", right: "#cfc3aa", seam: "#b3a68c" },
    cliffLower: { left: "#4a4541", right: "#38332f", seam: "#282420", speck: "#5c5650" },
  },
  lift: {
    bg: "#141824", light: { dir: [-0.35, 1, 0.55], ambient: 0.82, sun: 0.3 },
    sand: { top: "#eef1f5", lip: "#c9d0db", edge: "#dbe1ea", dots: "#f7f9fc" },
    dirt: { top: "#3a4258", patch: "#2f364a", mottle: "#272d3e", border: "#1f2433", path: "#454e66" },
    stone: { top: "#bcc6d6", pebble: "#d7dfeb", pebbleShade: "#9aa6b9", rim: "#7c889c" },
    grass: { top: "#8fb0c8", fringe: "#7394ad", fringeDark: "#58778f", speck: "#b3cde0" },
    cliffUpper: { left: "#2c3348", right: "#222838", seam: "#171b28" },
    cliffLower: { left: "#1f2433", right: "#171b27", seam: "#10131c", speck: "#2c3348" },
  },
  volute: {
    bg: "#3a2b3d", light: { dir: [-0.6, 1, 0.3], ambient: 0.86, sun: 0.3 },
    sand: { top: "#f4e2bf", lip: "#dcc294", edge: "#e8d2a9", dots: "#fbeed4" },
    dirt: { top: "#dc9a86", patch: "#c9846f", mottle: "#d18f7b", border: "#9f5f4d", path: "#e4a894" },
    stone: { top: "#e9efe6", pebble: "#f7faf4", pebbleShade: "#cbd6c8", rim: "#a8b8a6" },
    grass: { top: "#8fc7a2", fringe: "#72ab86", fringeDark: "#578b6b", speck: "#b4dcc0" },
    cliffUpper: { left: "#d99a8e", right: "#c07f74", seam: "#a3665c" },
    cliffLower: { left: "#b58a4c", right: "#97703a", seam: "#79582b", speck: "#c9a060" },
  },
  trunks: {
    bg: "#bdb6d4", light: { dir: [0.2, 1, -0.6], ambient: 0.88, sun: 0.26 },
    sand: { top: "#e9e4f2", lip: "#cbc4db", edge: "#dad4e7", dots: "#f4f1f9" },
    dirt: { top: "#8c84a8", patch: "#7c7498", mottle: "#847ca0", border: "#5d5779", path: "#9890b2" },
    stone: { top: "#d6d3e0", pebble: "#e8e6ef", pebbleShade: "#b9b5c7", rim: "#9994ab" },
    grass: { top: "#b3cf7a", fringe: "#96b261", fringeDark: "#78924b", speck: "#cfe29e" },
    cliffUpper: { left: "#8a83a6", right: "#716a8d", seam: "#5a5474" },
    cliffLower: { left: "#5d5779", right: "#4a4563", seam: "#38344e", speck: "#6e6689" },
  },
  roots: {
    bg: "#18261e", light: { dir: [-0.35, 1, 0.55], ambient: 0.84, sun: 0.22 },
    sand: { top: "#d9d69a", lip: "#bab77a", edge: "#c9c68a", dots: "#e8e6b8" },
    dirt: { top: "#7a5236", patch: "#6a462e", mottle: "#704b31", border: "#4b301f", path: "#865c3e" },
    stone: { top: "#c7c1b0", pebble: "#dcd7c8", pebbleShade: "#a9a393", rim: "#8b8575" },
    grass: { top: "#6fb05a", fringe: "#579146", fringeDark: "#427236", speck: "#95cc7d" },
    cliffUpper: { left: "#6e4a32", right: "#583a26", seam: "#432b1b" },
    cliffLower: { left: "#4d3322", right: "#3b2619", seam: "#2a1a10", speck: "#6a462e" },
  },
};

function look(level, aspect) {
  const L = LOOK[aspect], P = level.palette;
  P.forestAspect = aspect;
  for (const k of ["sand", "dirt", "stone", "grass", "cliffUpper", "cliffLower"]) P[k] = { ...P[k], ...L[k] };
  P.stone.side = [P.stone.rim, P.stone.pebbleShade, P.stone.rim];
  P.stone.pebbleEdge = P.stone.pebbleShade;
  P.bg = L.bg;
  level.bg = L.bg;
  level.light = { ...L.light };
}

function finishAspect(level, brief, h, aspect) {
  const S = ASPECT_SET[aspect];
  h.dryRim();
  bridgeEnds(level, h);
  crown(level, h);
  h.removeDecor((d) => d.t === S.gate || d.t === S.light || S.pass.includes(d.t) || !ASPECT_RE[aspect].test(d.t));
  let r = pickSpawn(level, h, { min: 13, max: 18, pref: [-1, 1] });
  if (r.length) h.path(r);
  r = h.approach();
  fixRamps(level, h);
  r = h.approach();
  const g = gateAny(level, h, S.gate, r);
  const [ax, az] = h.figure.anchor;
  for (const [x, z] of [[ax - 1, az], [ax - 1, az + 1], [ax - 1, az + 2], [ax - 2, az + 1], [ax, az + 2], [ax + 1, az + 2], [ax + 2, az], [ax + 2, az + 1], [ax + 2, az + 2]]) h.removeDecor((d) => d.t !== S.gate && d.x === x && d.z === z);
  const posts = level.decor.filter((d) => d.t === S.gate);
  h.removeDecor((d) => d.t !== S.gate && catalogTall(level, d.t) && (posts.some((q) => Math.abs(q.x - d.x) <= 1 && Math.abs(q.z - d.z) <= 1) || (g && Math.abs(g[0] - d.x) <= 1 && Math.abs(g[1] - d.z) <= 1)));
  const masses = level.decor.filter((d) => d.t === S.mass);
  if (masses.length > S.massN) {
    const inner = masses.filter((d) => !N4.some(([dx, dz]) => { const q = h.cell(d.x + dx, d.z + dz); return !q || q.s === "none"; }));
    const cut = new Set(inner.slice(0, masses.length - S.massN));
    h.removeDecor((d) => cut.has(d));
  }
  h.along(S.pass, { route: r });
  h.lights(S.light, { route: r, every: 3, skip: 2, max: 4, avoid: g ? [g] : [], keep: [S.gate, ...S.pass] });
  const nl = level.decor.filter((d) => d.t === S.light).length;
  if (nl < 2) {
    const onR = new Set(r.map(([x, z]) => h.key(x, z)));
    plant(level, h, S.light, 2 - nl, spots(level, h, r, { near: 2, far: 6 }).filter(([x, z]) => N4.some(([dx, dz]) => onR.has(h.key(x + dx, z + dz)))));
  }
  h.ledges({ keep: [S.gate] });
  const have = level.decor.filter((d) => d.t === S.mass).length;
  if (have < S.massN) plant(level, h, S.mass, S.massN - have, spots(level, h, r, { near: 2.5, tall: level.palette.props?.[S.mass]?.height >= 1.4 }));
  h.repair({ keep: [S.gate] });
  h.pruneRamps({ route: h.approach() });
  h.pruneRamps({ all: true, slotsOnly: true });
  h.openRamps();
  h.pruneRamps({ all: true, nearFig: 1 });
  if (h.walkN() < 84) h.thin(84, { keep: [S.gate, S.light] });
  if (h.walkN() < 84) h.grow(84);
  unhide(level, h);
  if (level.decor.filter((d) => d.t === S.gate).length !== 2) {
    h.removeDecor((d) => d.t === S.gate);
    const g2 = gateAny(level, h, S.gate, h.approach());
    if (g2) h.removeDecor((d) => d.t !== S.gate && catalogTall(level, d.t) && Math.abs(g2[0] - d.x) <= 1 && Math.abs(g2[1] - d.z) <= 1);
  }
  h.rampTone();
  look(level, aspect);
  h.log.push(`aspect ${aspect}: approach ${h.approach().length}, walk ${h.walkN()}`);
}

function catalogTall(level, t) {
  return (level.palette.props?.[t]?.height || 0) >= 1;
}

function crown(level, h) {
  if (level.cells.flat().some((c) => h.land(c) && c.h === 3)) return;
  const fc = h.figure.cells, fh = h.cell(...fc[0]).h;
  if (fh !== 2) return;
  const dist = (x, z) => Math.min(...fc.map(([a, b]) => Math.max(Math.abs(a - x), Math.abs(b - z))));
  const before = h.walkN(), saved = level.cells.map((row) => row.map((c) => ({ ...c })));
  const ring = [];
  level.cells.forEach((row, z) => row.forEach((c, x) => { if (h.land(c) && c.s !== "ramp" && c.h === 2 && dist(x, z) <= 2) { ring.push([x, z]); } }));
  for (const [x, z] of ring) level.cells[z][x] = { ...level.cells[z][x], h: 3 };
  const inRing = (x, z) => ring.some(([a, b]) => a === x && b === z);
  const cand = [];
  for (const [x, z] of ring) {
    if (h.isFig(x, z) || dist(x, z) !== 2) continue;
    for (const d of ["s", "e", "w", "n"]) {
      const [dx, dz] = h.DIRS[d], lo = h.cell(x + dx, z + dz), hi = h.cell(x - dx, z - dz);
      if (!lo || !h.land(lo) || lo.s === "ramp" || lo.h !== 2 || inRing(x + dx, z + dz)) continue;
      if (!hi || hi.h !== 3 || hi.s === "ramp" || h.isFig(x - dx, z - dz)) continue;
      cand.push([x, z, d, (d === "s" || d === "e" ? 0 : 5) + (x + z) * -0.1]);
    }
  }
  cand.sort((a, b) => a[3] - b[3]);
  for (const [x, z, d] of cand) {
    const c = level.cells[z][x];
    level.cells[z][x] = { h: 3, s: "ramp", d, m: "stone" };
    h.clear(x, z);
    if (h.walkN() >= before - 1) { h.log.push(`crown ${ring.length} cells h3, ramp ${x},${z}${d}`); return; }
    level.cells[z][x] = c;
  }
  saved.forEach((row, z) => row.forEach((c, x) => { level.cells[z][x] = c; }));
  h.log.push("crown reverted");
}

function bridgeEnds(level, h) {
  let n = 0;
  level.cells.forEach((row, z) => row.forEach((b, x) => {
    if (b.s !== "bridge") return;
    for (const d of ["s", "e", "w", "n"]) {
      const [dx, dz] = h.DIRS[d], ex = x - dx, ez = z - dz, e = h.cell(ex, ez);
      if (!e || e.s !== "ramp" || e.d !== d || e.h !== b.h + 1) continue;
      const bk = h.cell(ex - dx, ez - dz), up = h.cell(ex - 2 * dx, ez - 2 * dz);
      const before = h.walkN();
      const saved = [[ex, ez, e], [ex - dx, ez - dz, bk]];
      level.cells[ez][ex] = { h: b.h, s: h.surf.path };
      if (bk && h.land(bk) && bk.s !== "ramp" && bk.h === e.h && up && h.land(up) && up.s !== "ramp" && up.h === e.h && !h.isFig(ex - dx, ez - dz)) {
        level.cells[ez - dz][ex - dx] = { h: e.h, s: "ramp", d, m: e.m || "dirt" };
        h.clear(ex - dx, ez - dz);
      }
      if (h.walkN() < before - 1) saved.forEach(([a, c, v]) => { if (v) level.cells[c][a] = v; });
      else n++;
    }
  }));
  h.log.push(`bridgeEnds ${n}`);
}
