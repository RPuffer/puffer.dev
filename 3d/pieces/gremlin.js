import * as THREE from "three";
import { Baker, tone, circle, bakedMaterial } from "../baker.js";

const SKINS = {
  artisan: {
    body: ["#f3eee4", "#ded7ca", "#b5ac9d"],
    shade: ["#d6ccb9", "#bdb29e", "#968b78"],
    ink: ["#3b2f2a", "#2c231f", "#1e1714"],
    orb: ["#d8fbff", "#8be9fd", "#3dc2ec"],
    band: ["#fae075", "#f5c83b", "#dc9407"],
    fin: ["#ff8e32", "#e0771e", "#b85410"],
  },
  warden: {
    body: ["#dfe8f0", "#c5d3e0", "#a9b9c9"],
    shade: ["#a9b9c9", "#8898a8", "#728191"],
    ink: ["#343d48", "#29303a", "#1d232b"],
    orb: ["#fff3b8", "#f7d25a", "#d4af42"],
    band: ["#5a6676", "#434d5a", "#343d48"],
    fin: ["#6ed7ed", "#2daecb", "#1f8ea8"],
  },
  stalker: {
    body: ["#ece6dc", "#d4c8b6", "#b3a38c"],
    shade: ["#c7b6a7", "#aba093", "#857b70"],
    ink: ["#45241e", "#361c17", "#27120e"],
    orb: ["#ffe08a", "#ffc23a", "#e0901a"],
    band: ["#784b42", "#59332c", "#45241e"],
    fin: ["#e06c19", "#c0560f", "#98400a"],
  },
};
const WOOD = ["#cf7834", "#b05e22", "#8c4414"];
const pal = (c) => tone(c[0], c[1], c[2]);
const mesh = (B) => new THREE.Mesh(B.geometry(), bakedMaterial());
const tonesOf = (P, t) => P.tones?.[t] || [];
const pick = (list, i, d) => list[i] || list[list.length - 1] || d;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

function seg(B, a, b, w, d, c) {
  const A = V(...a), dir = V(...b).sub(A), len = dir.length();
  const m = new THREE.Matrix4().compose(A, new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()), V(1, 1, 1));
  B.pushMatrix(m);
  B.box(w, len, d, pal(c), 0, 0, 0);
  B.pop();
}

function tilt(B, x, y, z, rx, ry, rz, fn) {
  const m = new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), V(1, 1, 1));
  B.pushMatrix(m);
  fn();
  B.pop();
}

function wedge(B, w, h, d, c, x = 0, y = 0, z = 0) {
  const x0 = x - w / 2, x1 = x + w / 2, zb = z - d / 2, zf = z + d / 2;
  const p = pal(c);
  B.quad([x0, y, zf], [x1, y, zf], [x1, y + h, zb], [x0, y + h, zb], p);
  B.quad([x0, y, zb], [x0, y + h, zb], [x1, y + h, zb], [x1, y, zb], p);
  B.tri([x0, y, zb], [x0, y, zf], [x0, y + h, zb], p);
  B.tri([x1, y, zb], [x1, y + h, zb], [x1, y, zf], p);
}

function plinth(B, r, h, lo, hi) {
  B.prism(circle(0, 0, r, r, 8, Math.PI / 8), 0, h * 0.55, pal(lo));
  B.prism(circle(0, 0, r * 0.86, r * 0.86, 8, Math.PI / 8), h * 0.55, h, pal(hi));
}

function foot(B, K, x, y, z, yaw) {
  B.at(x, y, z, yaw, () => {
    B.prism([[-0.26, 0.4], [-0.09, 0.46], [0.09, 0.46], [0.26, 0.4], [0.13, -0.08], [-0.13, -0.08]], 0, 0.08, pal(K.ink));
    for (const t of [-0.19, 0, 0.19]) B.box(0.08, 0.07, 0.14, pal(K.shade), t, 0.08, 0.38);
    B.box(0.24, 0.14, 0.24, pal(K.shade), 0, 0.06, 0.04);
  });
}

function hand(B, K, x, y, z) {
  B.box(0.22, 0.1, 0.22, pal(K.ink), x, y, z);
  for (const t of [-0.07, 0, 0.07]) B.box(0.06, 0.06, 0.12, pal(K.ink), x + t, y, z + 0.14);
}

function tail(B, K) {
  const cy = 1.42, cz = -0.46, r = 0.86, n = 12;
  const pt = (a) => [0, cy + r * Math.sin(a), cz + r * Math.cos(a)];
  const a0 = -Math.PI * 0.62, a1 = -Math.PI * 1.66;
  let prev = [0, 0.72, -0.4];
  for (let i = 1; i <= n; i++) {
    const t = i / n, p = pt(a0 + (a1 - a0) * t), w = 0.26 - t * 0.12;
    seg(B, prev, p, w, w, i % 2 ? K.body : K.shade);
    if (i % 3 === 0) B.at(p[0], p[1] - 0.05, p[2], 0, () => B.box(w + 0.08, 0.1, w + 0.08, pal(K.band)));
    if (i === 5 || i === 7 || i === 9) B.at(p[0], p[1], p[2], 0, () => B.cone(0.09, 0, 0.26, pal(K.fin), 0, w * 0.45, 0, 4));
    prev = p;
  }
  const e = prev, j = [0.3, e[1] - 0.02, e[2] + 0.36], lens = [0.46, e[1] - 0.32, e[2] + 0.56];
  seg(B, e, j, 0.14, 0.14, K.ink);
  seg(B, j, lens, 0.12, 0.12, K.shade);
  B.box(0.2, 0.1, 0.2, pal(K.band), j[0], j[1] - 0.05, j[2]);
  B.cone(0.16, 0.07, 0.2, pal(K.ink), lens[0], lens[1] - 0.18, lens[2], 6);
  B.box(0.1, 0.05, 0.1, pal(K.orb), lens[0], lens[1] - 0.23, lens[2]);
}

function gremlin(B, K, H, look, v) {
  const s = H / 2.3;
  B.push(0, 0, 0, 0.2, s);
  plinth(B, 0.9, 0.2, look.plinthLo, look.plinthHi);
  const y0 = 0.2;
  foot(B, K, -0.4, y0, 0.02, -0.25);
  foot(B, K, 0.4, y0, 0.06, 0.3);
  for (const sx of [-1, 1]) {
    const hip = [sx * 0.26, y0 + 0.42, -0.2], knee = [sx * 0.44, y0 + 0.74, 0.24], ank = [sx * 0.4, y0 + 0.14, 0.08];
    seg(B, hip, knee, 0.28, 0.3, K.body);
    seg(B, knee, ank, 0.22, 0.22, K.shade);
    B.box(0.28, 0.12, 0.28, pal(K.ink), knee[0], knee[1] - 0.08, knee[2]);
  }
  B.rbox(0.66, 0.36, 0.54, 0.1, pal(K.shade), 0, y0 + 0.3, -0.24);
  for (const z of [-0.42, -0.28, -0.14]) B.box(0.68, 0.07, 0.07, pal(K.ink), 0, y0 + 0.58, z);
  tilt(B, 0, y0 + 0.6, -0.2, 0.42, 0, 0, () => {
    B.rbox(0.52, 0.6, 0.4, 0.1, pal(K.body), 0, 0, 0);
    wedge(B, 0.44, 0.34, 0.16, K.shade, 0, 0.1, 0.26);
    B.rbox(0.64, 0.18, 0.44, 0.08, pal(K.body), 0, 0.58, 0);
    B.box(0.2, 0.2, 0.18, pal(K.ink), 0, 0.72, 0.06);
  });
  B.box(0.2, 0.24, 0.2, pal(K.ink), 0, y0 + 1.1, 0.12);
  tilt(B, 0, y0 + 1.26, 0.2, 0.42, 0.42 + (v % 2) * 0.08, 0, () => {
    B.rbox(0.58, 0.56, 0.66, 0.16, pal(K.body), 0, 0.02, 0.04);
    B.rbox(0.5, 0.18, 0.58, 0.14, pal(K.body), 0, 0.58, 0.02);
    B.rbox(0.32, 0.1, 0.38, 0.1, pal(K.body), 0, 0.76, 0.0);
    B.box(0.12, 0.34, 0.06, pal(K.ink), 0, 0.02, 0.37);
    B.box(0.5, 0.07, 0.05, pal(K.shade), 0, 0.46, 0.36);
    for (const x of [-0.3, 0.3]) B.box(0.05, 0.3, 0.36, pal(K.shade), x, 0.1, 0.06);
  });
  const rs = [0.32, y0 + 0.98, 0.04], re = [0.56, y0 + 0.6, 0.3], rh = [0.5, y0 + 0.82, 0.62];
  seg(B, rs, re, 0.17, 0.17, K.body);
  seg(B, re, rh, 0.15, 0.15, K.shade);
  const orb = [0.52, y0 + 1.04, 0.68];
  B.box(0.24, 0.08, 0.24, pal(K.ink), orb[0], orb[1] - 0.25, orb[2]);
  for (const [dx, dz] of [[-0.12, 0], [0.12, 0], [0, 0.12]]) B.box(0.06, 0.2, 0.06, pal(K.ink), orb[0] + dx, orb[1] - 0.2, orb[2] + dz);
  B.ball(0.2, pal(K.orb), orb[0], orb[1], orb[2], 1, 1);
  for (const [dx, dy, dz] of [[0.3, 0.04, 0], [-0.28, 0.08, 0.04], [0.02, 0.3, 0.04], [0.06, -0.02, 0.28]]) B.box(0.06, 0.06, 0.06, pal(K.orb), orb[0] + dx, orb[1] + dy, orb[2] + dz);
  const ls = [-0.3, y0 + 0.98, 0.0], le = [-0.46, y0 + 0.5, 0.24], lh = [-0.3, y0 + 0.08, 0.5];
  seg(B, ls, le, 0.17, 0.17, K.body);
  seg(B, le, lh, 0.15, 0.15, K.shade);
  hand(B, K, lh[0], y0, lh[2]);
  tail(B, K);
  B.pop();
}

function post(B, t, H, c0, c1, c2, d, K) {
  const tall = H * 0.66;
  B.box(0.48, 0.2, 0.48, pal(c2));
  B.box(0.36, tall * 0.5, 0.36, pal(c0), 0, 0.2, 0);
  B.box(0.3, tall * 0.5, 0.3, pal(c1), 0, 0.2 + tall * 0.5, 0);
  for (const f of [0.3, 0.55, 0.8]) B.box(0.4 - f * 0.08, 0.07, 0.4 - f * 0.08, pal(K.band), 0, 0.2 + tall * f, 0);
  const top = 0.2 + tall;
  B.box(0.4, 0.12, 0.4, pal(c2), 0, top, 0);
  if (/rib/i.test(t) && /pylon|spire/i.test(t)) {
    const lean = d.side ? -d.side * 0.35 : 0.3;
    const rz = d.axis === "x" ? 0 : lean, rx = d.axis === "x" ? -lean : 0;
    tilt(B, 0, top + 0.12, 0, rx, 0, rz, () => {
      B.box(0.26, 0.34, 0.26, pal(c0), 0, 0, 0);
      B.box(0.3, 0.06, 0.3, pal(K.band), 0, 0.3, 0);
      tilt(B, 0, 0.34, 0, rx, 0, rz, () => {
        B.box(0.2, 0.3, 0.2, pal(c1), 0, 0, 0);
        for (const a of [-0.45, 0.45]) tilt(B, 0, 0.28, 0, 0, 0, a, () => B.cone(0.07, 0, 0.26, pal(K.ink), 0, 0, 0, 4));
        B.cone(0.08, 0, 0.3, pal(K.fin), 0, 0.28, 0, 4);
      });
    });
    return;
  }
  if (/stele|flute/i.test(t)) {
    for (const [x, z] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) B.box(0.05, tall * 0.9, 0.05, pal(K.shade), x, 0.24, z);
    wedge(B, 0.44, 0.22, 0.3, c0, 0, top + 0.12, 0);
    B.box(0.14, 0.14, 0.14, pal(K.orb), 0, top + 0.16, 0.12);
  } else {
    B.at(0, top + 0.12, 0, 0, () => {
      for (const [a, h] of [[-0.5, 0.34], [0, 0.46], [0.5, 0.34]]) tilt(B, 0, 0, 0, 0, 0, a, () => B.cone(0.08, 0, h, pal(K.fin), 0, 0, 0, 4));
    });
  }
  if (d.side) {
    const reach = 1.0, beam = (y, th, c) => d.axis === "x" ? B.box(0.22, th, reach + 0.3, pal(c), 0, y, -d.side * (reach / 2 - 0.05)) : B.box(reach + 0.3, th, 0.22, pal(c), -d.side * (reach / 2 - 0.05), y, 0);
    beam(H * 0.72, 0.14, c0);
    beam(H * 0.72 + 0.14, 0.08, K.band);
  }
}

function siphon(B, H, c0, c1, K, v) {
  B.box(0.34, 0.16, 0.34, pal(K.shade));
  const n = 4, hh = (H - 0.56) / n;
  let x = 0;
  for (let i = 0; i < n; i++) {
    const nx = (i % 2 ? -1 : 1) * (v % 2 ? 0.06 : 0.08);
    seg(B, [x, 0.16 + i * hh, 0], [nx, 0.16 + (i + 1) * hh, 0.02], 0.16 - i * 0.015, 0.16 - i * 0.015, i % 2 ? c1 : c0);
    B.box(0.2, 0.05, 0.2, pal(K.band), nx, 0.14 + (i + 1) * hh, 0.02);
    x = nx;
  }
  const y = 0.16 + n * hh;
  B.cone(0.1, 0.24, 0.3, pal(c0), x, y, 0.02, 6);
  B.cyl(0.2, 0.04, pal(K.ink), x, y + 0.27, 0.02, 6);
  for (const a of [0, 2.1, 4.2]) B.box(0.05, 0.14, 0.05, pal(K.fin), x + Math.cos(a) * 0.2, y + 0.26, 0.02 + Math.sin(a) * 0.2);
}

function lamp(B, H, c0, c1, K, v) {
  B.box(0.3, 0.14, 0.3, pal(c0));
  B.box(0.16, H * 0.5, 0.16, pal(c0), 0, 0.14, 0);
  seg(B, [0, 0.14 + H * 0.5, 0], [0.18, H - 0.3, 0.06], 0.12, 0.12, K.band);
  B.box(0.2, 0.06, 0.2, pal(K.ink), 0.18, H - 0.46, 0.06);
  B.box(0.2, 0.2, 0.2, pal(K.orb), 0.18, H - 0.4, 0.06);
  B.cone(0.16, 0, 0.14, pal(c1), 0.18, H - 0.2, 0.06, 4);
  for (const x of [0.1, 0.26]) B.box(0.04, 0.2, 0.04, pal(K.band), x, H - 0.42, 0.06);
}

function spire(B, H, c0, c1, K, v) {
  const lean = v % 2 ? 0.16 : -0.14;
  B.box(0.56, 0.26, 0.52, pal(K.shade));
  tilt(B, 0, 0.26, 0, 0, 0, lean, () => {
    const n = 4, hh = (H - 0.6) / n;
    for (let i = 0; i < n; i++) {
      const w = 0.42 - i * 0.07;
      B.box(w, hh, w, pal(i % 2 ? c1 : c0), 0, i * hh, 0);
      B.box(w + 0.06, 0.07, w + 0.06, pal(K.band), 0, i * hh + hh - 0.05, 0);
    }
    B.cone(0.14, 0, 0.34, pal(c0), 0, n * hh, 0, 4);
  });
}

function trough(B, H, c0, K) {
  B.box(0.72, H * 0.7, 0.44, pal(c0));
  B.box(0.6, 0.03, 0.32, pal(["#6ed7ed", "#2daecb", "#1f8ea8"]), 0, H * 0.7, 0);
  B.box(0.12, 0.08, 0.12, pal(K.orb), 0.14, H * 0.7, 0.02);
  B.box(0.8, 0.1, 0.52, pal(K.band), 0, 0, 0);
}

function bench(B, H, c1, K, v) {
  B.box(0.66, 0.1, 0.5, pal(WOOD), 0, H * 0.5, 0);
  for (const [x, z] of [[-0.26, -0.18], [0.26, -0.18], [-0.26, 0.18], [0.26, 0.18]]) B.box(0.1, H * 0.5, 0.1, pal(WOOD), x, 0, z);
  B.cyl(0.18, 0.1, pal(K.band), -0.08, H * 0.5 + 0.1, 0, 8);
  B.box(0.1, 0.1, 0.1, pal(K.orb), -0.08, H * 0.5 + 0.2, 0);
  B.box(0.09, 0.09, 0.09, pal(K.orb), 0.2, H * 0.5 + 0.1, 0.1);
  B.box(0.08, 0.08, 0.08, pal(v % 2 ? K.fin : K.orb), 0.18, H * 0.5 + 0.1, -0.12);
}

function bloom(B, H, c0, c1, K, v) {
  B.box(0.34, 0.14, 0.34, pal(K.shade));
  B.box(0.1, H * 0.45, 0.1, pal(["#7da65b", "#628943", "#4b6e31"]), 0, 0.14, 0);
  const y = 0.14 + H * 0.45;
  for (let i = 0; i < 4; i++) B.at(0, y, 0, i * Math.PI / 2 + (v % 2) * 0.4, () => tilt(B, 0, 0, 0.06, 0.7, 0, 0, () => B.cone(0.1, 0, H * 0.4, pal(i % 2 ? c0 : K.fin), 0, 0, 0, 4)));
  B.box(0.14, 0.14, 0.14, pal(K.orb), 0, y - 0.02, 0);
}

const ROLE_RE = [["threshold", /gate|arch|torii|threshold|portal|stele/i], ["dais", /dais|altar|plinth|pedestal|perch|throne|crag/i], ["light", /lantern|torch|brazier|lamp|pylon/i], ["offering", /pot|basket|bowl|offering|chest|cairn|urn|trough/i], ["mass", /tree|pine|spire|pillar|monolith|rock|cliff|totem/i]];
const roleOf = (P, t) => P.props?.[t]?.role || (ROLE_RE.find(([, re]) => re.test(t)) || ["detail"])[0];
const skinOf = (t) => (/artisan|craft|sphere/i.test(t) ? "artisan" : /warden|pearl|vigil|oracle|sightless/i.test(t) ? "warden" : "stalker");

export function register(style) {
  const P = style.palette;
  const props = P.props || {};
  const types = Object.keys(props);
  const leadT = types.find((t) => roleOf(P, t) === "lead") || "";
  const K = SKINS[skinOf(leadT)];
  const daisT = types.find((t) => roleOf(P, t) === "dais");
  const dt = daisT ? tonesOf(P, daisT) : [];
  const look = { plinthLo: pick(dt, 1, K.shade), plinthHi: pick(dt, 0, K.body) };
  const catalog = {};
  const builders = {};
  for (const t of types) {
    const p = props[t], role = p.role;
    const lead = role === "lead" || role === "creature";
    catalog[t] = { footprint: lead ? [2, 2] : p.footprint || [1, 1], passable: lead ? false : !!p.passable, variants: 2, height: lead ? 2.7 : Math.min(2.6, Math.max(0.3, p.height || 1)) };
    const tn = tonesOf(P, t);
    const c0 = pick(tn, 0, K.body), c1 = pick(tn, 1, K.shade), c2 = pick(tn, 2, K.band);
    builders[t] = (v, rot, st, ctx) => {
      const B = new Baker(), H = ctx.height, d = ctx.decor || {};
      if (lead) gremlin(B, K, H, look, v);
      else if (/trough|cistern/i.test(t)) trough(B, H, c0, K);
      else if (/bench|station|basin/i.test(t)) bench(B, H, c1, K, v);
      else if (/bloom|flower/i.test(t)) bloom(B, H, c0, c1, K, v);
      else if (/siphon|tendril|conduit-pole/i.test(t)) siphon(B, H, c0, c1, K, v);
      else if (/rib/i.test(t) && /pylon|spire/i.test(t)) post(B, t, H, c0, c1, c2, d, K);
      else if (role === "threshold") post(B, t, H, c0, c1, c2, d, K);
      else if (role === "dais") plinth(B, 0.42, H, c1, c0);
      else if (role === "light") lamp(B, H, c0, c1, K, v);
      else if (role === "offering") {
        B.cyl(0.2, H * 0.55, pal(c0), 0, 0, 0, 8);
        B.cyl(0.24, 0.06, pal(K.band), 0, H * 0.55, 0, 8);
        B.box(0.14, 0.14, 0.14, pal(K.orb), -0.05, H * 0.55 + 0.06, 0.02);
      } else if (role === "mass") spire(B, H, c0, c1, K, v);
      else {
        B.box(0.4, H * 0.5, 0.4, pal(c0));
        wedge(B, 0.4, H * 0.5, 0.4, c1, 0, H * 0.5, 0);
      }
      return mesh(B);
    };
  }
  return { catalog, builders };
}

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function grow(h, want) {
  for (let pass = 0; pass < 60 && h.reach().reached < want; pass++) {
    let best = null, score = -1;
    for (let z = 1; z < h.D - 1; z++) for (let x = 1; x < h.W - 1; x++) {
      const c = h.cell(x, z);
      if (!c || c.s !== "none") continue;
      const nb = N4.map(([a, b]) => h.cell(x + a, z + b)).filter((n) => h.land(n) && n.s !== "ramp");
      const low = nb.filter((n) => n.h === 1).length;
      if (!low) continue;
      const sc = low * 2 + nb.length + ((x * 7 + z * 5) % 3) * 0.3;
      if (sc > score) { score = sc; best = [x, z]; }
    }
    if (!best) break;
    h.set(best[0], best[1], { h: 1, s: h.surf.ground === "stone" ? "grass" : h.surf.ground });
  }
}

const walled = (h, x, z) => [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1]].some(([a, b]) => { const n = h.cell(x + a, z + b); return n && n.h > h.cell(x, z).h; });

function moveSpawn(level, h, lo, hi) {
  let best = null;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!h.land(c) || c.s === "ramp" || h.isFig(x, z) || h.decorAt(x, z).length || walled(h, x, z)) continue;
    const q = h.approach({ from: [x, z] });
    if (q.length < lo || q.length > hi) continue;
    const sc = q.length + 0.5 * (x + z);
    if (!best || sc > best[0]) best = [sc, x, z];
  }
  if (best) { level.spawn = [best[1], best[2]]; h.log.push(`spawn moved to ${best[1]},${best[2]}`); } else h.log.push(`spawn kept: no approach of ${lo} to ${hi}`);
}

function fixRamps(level, h) {
  const at = (x, z) => level.cells[z]?.[x];
  for (let z = 0; z < level.cells.length; z++) for (let x = 0; x < level.cells[z].length; x++) {
    const c = at(x, z);
    if (!c || c.s !== "ramp") continue;
    const [dx, dz] = h.DIRS[c.d], up = at(x - dx, z - dz);
    if (up && up.h === c.h && up.s !== "ramp") continue;
    level.cells[z][x] = { h: c.h, s: h.surf.path === "stone" ? "sand" : h.surf.path };
  }
}

function rampTone(level, h) {
  level.cells.forEach((row, z) => row.forEach((c, x) => {
    if (!c || c.s !== "ramp") return;
    const [dx, dz] = h.DIRS[c.d], up = level.cells[z - dz]?.[x - dx];
    const lo = level.cells[z + dz]?.[x + dx], soft = ["sand", "grass", "dirt"];
    if (up && soft.includes(up.s)) c.m = up.s;
    else if (lo && soft.includes(lo.s)) c.m = lo.s;
  }));
}

function repaint(level, h, keep) {
  const cells = [];
  level.cells.forEach((row, z) => row.forEach((c, x) => { if (c && h.land(c) && c.s !== "ramp") cells.push([x, z, c]); }));
  const stone = cells.filter(([, , c]) => c.s === "stone");
  if (stone.length < cells.length * 0.25) return;
  const soft = [h.surf.ground, h.surf.raised, h.surf.path, "grass"].filter((s) => s && s !== "stone");
  const low = soft[0] || "grass", high = soft.find((s) => s !== low) || (low === "grass" ? "sand" : "grass");
  const wet = (x, z) => N4.some(([dx, dz]) => level.cells[z + dz]?.[x + dx]?.s === "water");
  let n = 0;
  for (const [x, z, c] of stone) {
    if (keep.has(h.key(x, z)) || (!wet(x, z) && (x * 7 + z * 3) % 11 === 0)) continue;
    level.cells[z][x] = { h: c.h, s: c.h >= 2 ? high : low };
    n++;
  }
  h.log.push(`repaint: ${n}/${stone.length} stone cells`);
}

function rimWater(h) {
  const lip = h.surf.ground === "stone" ? "grass" : h.surf.ground;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (c && c.s === "water" && N4.some(([a, b]) => { const n = h.cell(x + a, z + b); return !n || n.s === "none"; })) h.set(x, z, { h: 1, s: lip });
  }
  h.removeDecor((d) => /tree|pine|spire|pump/i.test(d.t) && N4.some(([a, b]) => h.cell(d.x + a, d.z + b)?.s === "water"));
}

function pruneRamps(level, h, route) {
  const on = new Set(route.map(([x, z]) => h.key(x, z)));
  let n = 0;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!c || c.s !== "ramp" || on.has(h.key(x, z))) continue;
    const [dx, dz] = h.DIRS[c.d], lo = h.cell(x + dx, z + dz);
    if (!h.land(lo)) continue;
    const old = { ...c }, before = h.reach().missing.length;
    h.set(x, z, { h: lo.h, s: lo.s === "stone" ? "grass" : lo.s });
    if (h.reach().missing.length > before) h.set(x, z, old); else n++;
  }
  if (n) h.log.push(`pruneRamps: ${n} side ramps flattened`);
}

function ledges(h, types, level) {
  const drop = (x, z) => [[1, 0], [0, 1]].some(([a, b]) => { const n = h.cell(x + a, z + b); const c = h.cell(x, z); return !h.land(n) || n.h <= c.h - 2 || (c.h >= 3 && n.h < c.h); });
  const hid = (x, z) => [[1, 0], [0, 1], [1, 1]].some(([a, b]) => { const n = h.cell(x + a, z + b); return n && n.h > h.cell(x, z).h && n.s !== "ramp"; });
  const n = h.removeDecor((d) => types.includes(d.t) && (drop(d.x, d.z) || hid(d.x, d.z)));
  if (n) h.log.push(`ledges: ${n} tall props off cliff lips`);
}

function lowerFront(level, h) {
  const fc = h.figure.cells, sum = Math.max(...fc.map(([x, z]) => x + z));
  let n = 0;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    const c = h.cell(x, z);
    if (!c || x + z < sum + 4 || c.h < 3 || !(h.land(c) || c.s === "ramp")) continue;
    h.set(x, z, { h: 2, s: c.s === "ramp" ? (h.surf.raised === "stone" ? "dirt" : h.surf.raised || "dirt") : c.s });
    n++;
  }
  if (n) h.log.push(`lowerFront: ${n} near wall cells to h2`);
}

function moreLights(level, h, t, route, want) {
  const on = new Set(route.map(([x, z]) => h.key(x, z)));
  const lit = () => level.decor.filter((d) => d.t === t);
  const fig = h.figure.cells;
  for (const [x, z] of route) {
    if (lit().length >= want) break;
    for (const [a, b] of N4) {
      const X = x + a, Z = z + b, c = h.cell(X, Z);
      if (!h.land(c) || c.s === "ramp" || on.has(h.key(X, Z)) || h.decorAt(X, Z).length || c.h !== h.cell(x, z).h) continue;
      if (N4.some(([p, q]) => h.cell(X + p, Z + q)?.s === "ramp")) continue;
      if (fig.some(([fx, fz]) => Math.abs(fx - X) <= 2 && Math.abs(fz - Z) <= 2)) continue;
      if (lit().some((d) => Math.abs(d.x - X) + Math.abs(d.z - Z) < 3)) continue;
      if (h.put(t, X, Z)) break;
    }
  }
}

export function finish(level, brief, h) {
  const daisTypes = h.ofRole("dais");
  h.removeDecor((d) => daisTypes.includes(d.t));
  const gateT = h.ofRole("threshold").find((t) => !/trough|cistern/i.test(t)) || h.ofRole("mass").find((t) => /rib|pylon|gate/i.test(t));
  const lightT = h.ofRole("light")[0] || (brief.motifs || []).map((m) => m.type || m.name).find((t) => t === "torch" || t === "lantern") || "lantern";
  const posts = () => level.decor.filter((d) => d.t === gateT);
  h.removeDecor((d) => d.t === gateT || d.t === lightT || d.t === "torch" || d.t === "lantern");
  rimWater(h);
  if (/-3$/.test(level.name || "")) lowerFront(level, h);
  grow(h, 88);
  let raised = 0;
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) { const c = h.cell(x, z); if (h.land(c) && c.h >= 2 && !h.isFig(x, z)) raised++; }
  if (raised < 6) h.dais({ ring: 1, h: 2, s: "stone" });
  let r = h.approach();
  if (r.length < 12 || walled(h, ...level.spawn)) { moveSpawn(level, h, 12, 20); r = h.approach(); }
  if (r.length) h.path(r);
  fixRamps(level, h);
  r = h.approach();
  pruneRamps(level, h, r);
  const near = (d) => r.some(([x, z]) => Math.abs(x - d.x) + Math.abs(z - d.z) <= 1);
  h.removeDecor((d) => /tree|pine|spire|pump/i.test(d.t) && near(d));
  const keep = new Set(r.map(([x, z]) => h.key(x, z)));
  for (const [x, z] of h.figure.cells) for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) keep.add(h.key(x + a, z + b));
  repaint(level, h, keep);
  const snap = () => level.cells.map((row) => row.map((c) => c.h).join()).join("|");
  const tryGate = (frac, strict) => {
    const before = snap(), saved = level.cells.map((row) => row.map((c) => ({ ...c }))), dec = level.decor.slice();
    const miss = h.reach().missing.length;
    const g = h.gate(gateT, { route: h.approach(), frac });
    const ok = g && posts().length === 2 && new Set(posts().map((d) => h.cell(d.x, d.z).h)).size === 1 && h.reach().missing.length <= miss;
    if (ok && (!strict || snap() === before)) return g;
    level.cells.splice(0, level.cells.length, ...saved);
    level.decor.splice(0, level.decor.length, ...dec);
    return null;
  };
  h.repair();
  let g = null;
  if (gateT) for (const strict of [true, false]) for (const frac of [0.55, 0.45, 0.65, 0.35, 0.75]) if (!g) g = tryGate(frac, strict);
  ledges(h, [...h.ofRole("mass"), ...h.ofRole("detail"), ...h.ofRole("offering"), "rock-big", "tree-round", "tree-pine", "tree-orange", "well"].filter((t) => t !== gateT), level);
  h.lights(lightT, { route: h.approach(), every: 2, skip: 1, max: 6, avoid: g ? [g] : [], keep: [gateT] });
  moreLights(level, h, lightT, h.approach(), 4);
  h.repair({ keep: [gateT] });
  const bad = () => posts().length !== 2 || new Set(posts().map((d) => h.cell(d.x, d.z).h)).size > 1 || h.reach().missing.length > 0;
  if (gateT && bad()) { h.removeDecor((d) => d.t === gateT); h.repair(); }
  rampTone(level, h);
  h.log.push(`approach ${h.approach().length} posts ${posts().map((d) => d.x + "," + d.z).join(" ")} reach ${h.reach().reached}/${h.reach().total}`);
}
