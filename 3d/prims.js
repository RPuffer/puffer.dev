import * as THREE from "three";
import { lightFactor, sideBand, BACK } from "./style.js";

export const BIBLE = {
  face: { left: 0.88, right: 0.66, tol: 0.08 },
  ramp: { hueStep: 6, warm: 60, cool: 250, satStep: 0.05, lift: [0.3, 0.55] },
  corner: { frac: 0.1, min: 0.01, max: 0.09 },
  chamfer: { frac: 0.05, min: 0.012, max: 0.04 },
  detail: 0.15,
  highlight: 0.8,
  parts: { max: 12, min: 0.15, face: 0.08 },
  scale: { decor: [0.3, 2.4], focal: [1.5, 3] },
  head: [0.35, 0.45],
  ink: "#2a1f33",
  white: "#fffaf0",
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
export const rgbHex = (c) => "#" + c.map((v) => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, "0")).join("");
export const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const toLin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toSrgb = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);
export const lin = (c) => c.map(toLin);
export const enc = (c) => c.map((v) => toSrgb(clamp(v, 0, 1)));

function rgbHsv([r, g, b]) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d > 1e-9) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [((h * 60) + 360) % 360, mx ? d / mx : 0, mx];
}

function hsvRgb([h, s, v]) {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r + m, g + m, b + m];
}

function towards(h, target, deg) {
  const d = ((target - h + 540) % 360) - 180;
  return (h + Math.sign(d) * Math.min(Math.abs(d), deg) + 360) % 360;
}

function atLuma(h, s, want) {
  let lo = 0, hi = 1;
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (luma(hsvRgb([h, s, m])) < want) lo = m; else hi = m; }
  return hsvRgb([h, s, (lo + hi) / 2]);
}

const RAMPS = new Map();

export function ramp(hex) {
  const key = String(hex).toLowerCase();
  if (RAMPS.has(key)) return RAMPS.get(key);
  const R = BIBLE.ramp, F = BIBLE.face, base = hexRgb(key), Y = luma(base);
  const [h, s] = rgbHsv(base);
  const dark = (k, ratio) => rgbHex(atLuma(towards(h, R.cool, R.hueStep * k), clamp(s + R.satStep * k, 0, 1), Y * ratio));
  const light = (k) => {
    const c = hsvRgb([towards(h, R.warm, R.hueStep * k), s, rgbHsv(base)[2]]);
    return rgbHex(c.map((v) => v + (1 - v) * R.lift[k - 1]));
  };
  const out = [dark(2, F.right), dark(1, F.left), key, light(1), light(2)];
  RAMPS.set(key, out);
  return out;
}

export const mixHex = (a, b, t = 0.5) => rgbHex(hexRgb(a).map((v, i) => v + (hexRgb(b)[i] - v) * t));

const sizeOf = (min) => ({
  corner: clamp(min * BIBLE.corner.frac, BIBLE.corner.min, BIBLE.corner.max),
  chamfer: clamp(min * BIBLE.chamfer.frac, BIBLE.chamfer.min, BIBLE.chamfer.max),
});

function ring(x0, z0, x1, z1, r) {
  r = Math.min(r, (x1 - x0) / 2 - 1e-4, (z1 - z0) / 2 - 1e-4);
  return [[x1, z1 - r], [x1, z0 + r], [x1 - r, z0], [x0 + r, z0], [x0, z0 + r], [x0, z1 - r], [x0 + r, z1], [x1 - r, z1]];
}

const ngon = (x, z, r, n, a0 = Math.PI / n) => Array.from({ length: n }, (_, i) => { const a = a0 + (i / n) * Math.PI * 2; return [x + Math.sin(a) * r, z + Math.cos(a) * r]; });

const V3 = () => new THREE.Vector3();

export function kit(B, { light = null, rot = 0 } = {}) {
  const yaw = -rot * (Math.PI / 2), cy = Math.cos(yaw), sy = Math.sin(yaw);
  const A = V3(), Bv = V3(), C = V3(), n = V3(), cen = V3(), fc = V3();
  const parts = [];
  let cur = null;

  const tones = (base) => (Array.isArray(base) ? base : ramp(base));

  function shade(r, kind, two, nx, ny, nz) {
    const wx = nx * cy + nz * sy, wz = -nx * sy + nz * cy;
    let hex;
    if (kind === "rim") hex = r[3];
    else if (ny > 0.5) hex = r[2];
    else if (ny < -0.3) hex = r[0];
    else if (two) hex = r[1];
    else {
      const [a, b, u] = sideBand(wx, wz), pick = (k) => (k === "left" ? r[1] : k === "right" ? r[0] : mixHex(r[0], "#000000", 1 - Math.pow(BACK, 1 / 2.2)));
      hex = u < 0.3 ? pick(a) : u > 0.7 ? pick(b) : mixHex(pick(a), pick(b));
    }
    const L = light ? lightFactor(light, wx, ny, wz) : 1;
    const c = lin(hexRgb(hex)).map((v) => v / L);
    return new THREE.Color(c[0], c[1], c[2]);
  }

  function solid(faces, base, two = false) {
    const r = tones(base);
    if (cur && two) cur.two = true;
    cen.set(0, 0, 0);
    let k = 0;
    for (const f of faces) for (const p of f.pts) { cen.add(A.set(p[0], p[1], p[2]).applyMatrix4(B.m)); k++; }
    cen.divideScalar(k);
    for (const f of faces) {
      const P = f.pts;
      fc.set(0, 0, 0);
      for (const p of P) fc.add(A.set(p[0], p[1], p[2]).applyMatrix4(B.m));
      fc.divideScalar(P.length).sub(cen);
      for (let i = 1; i < P.length - 1; i++) {
        let a = P[0], b = P[i], c = P[i + 1];
        A.set(a[0], a[1], a[2]).applyMatrix4(B.m); Bv.set(b[0], b[1], b[2]).applyMatrix4(B.m); C.set(c[0], c[1], c[2]).applyMatrix4(B.m);
        n.subVectors(Bv, A).cross(C.clone().sub(A));
        if (n.lengthSq() < 1e-14) continue;
        n.normalize();
        if (n.dot(fc) < 0) { [b, c] = [c, b]; n.negate(); }
        B.tri(a, b, c, shade(r, f.kind, two, n.x, n.y, n.z), false);
      }
    }
  }

  function prismFaces(rings, top = "top") {
    const faces = [];
    for (let k = 0; k < rings.length - 1; k++) {
      const [p0, y0] = rings[k], [p1, y1] = rings[k + 1], m = p0.length;
      for (let i = 0; i < m; i++) {
        const j = (i + 1) % m;
        faces.push({ kind: p1 !== p0 && k === rings.length - 2 && top === "top" && rings.length > 2 ? "rim" : "side", pts: [[p0[i][0], y0, p0[i][1]], [p0[j][0], y0, p0[j][1]], [p1[j][0], y1, p1[j][1]], [p1[i][0], y1, p1[i][1]]] });
      }
    }
    const [pt, yt] = rings[rings.length - 1];
    if (top && pt.length > 2) faces.push({ kind: "top", pts: pt.map((q) => [q[0], yt, q[1]]) });
    return faces;
  }

  const isTwo = (...d) => Math.min(...d) < BIBLE.detail;

  const K = {
    B, light, rot, parts,
    ramp: tones,
    part(id, meta, fn) {
      const start = B.pos.length / 9;
      const prev = cur;
      cur = { id, ...meta, start };
      fn();
      cur.end = B.pos.length / 9;
      parts.push(cur);
      cur = prev;
    },
    rbox(w, h, d, base, x = 0, y = 0, z = 0, { chamfer = true } = {}) {
      const s = sizeOf(Math.min(w, d)), c = chamfer ? Math.min(s.chamfer, h * 0.3) : 0;
      const outer = ring(x - w / 2, z - d / 2, x + w / 2, z + d / 2, s.corner);
      const rings = [[outer, y]];
      if (c > 0) rings.push([outer, y + h - c], [ring(x - w / 2 + c, z - d / 2 + c, x + w / 2 - c, z + d / 2 - c, Math.max(s.corner - c, 0.002)), y + h]);
      else rings.push([outer, y + h]);
      solid(prismFaces(rings), base, isTwo(w, h, d));
    },
    box(w, h, d, base, x = 0, y = 0, z = 0) {
      const p = [[x + w / 2, z + d / 2], [x + w / 2, z - d / 2], [x - w / 2, z - d / 2], [x - w / 2, z + d / 2]];
      solid(prismFaces([[p, y], [p, y + h]]), base, isTwo(w, h, d));
    },
    cyl(r, h, base, x = 0, y = 0, z = 0, n = 8, { chamfer = true } = {}) {
      const c = chamfer ? Math.min(sizeOf(2 * r).chamfer, h * 0.3) : 0;
      const o = ngon(x, z, r, n);
      const rings = c > 0 ? [[o, y], [o, y + h - c], [ngon(x, z, r - c, n), y + h]] : [[o, y], [o, y + h]];
      solid(prismFaces(rings), base, isTwo(2 * r, h));
    },
    disc(r, h, base, x = 0, y = 0, z = 0, n = 10) { K.cyl(r, h, base, x, y, z, n); },
    cone(r0, r1, h, base, x = 0, y = 0, z = 0, n = 4) {
      const a = ngon(x, z, r0, n);
      if (r1 <= 0) {
        const faces = a.map((p, i) => { const q = a[(i + 1) % n]; return { kind: "side", pts: [[p[0], y, p[1]], [q[0], y, q[1]], [x, y + h, z]] }; });
        solid(faces, base, isTwo(2 * r0, h));
      } else solid(prismFaces([[a, y], [ngon(x, z, r1, n), y + h]]), base, isTwo(2 * r0, h));
    },
    taper(w0, d0, w1, d1, h, base, x = 0, y = 0, z = 0, dx = 0, dz = 0) {
      const q = (w, d, ox, oz) => [[x + ox + w / 2, z + oz + d / 2], [x + ox + w / 2, z + oz - d / 2], [x + ox - w / 2, z + oz - d / 2], [x + ox - w / 2, z + oz + d / 2]];
      solid(prismFaces([[q(w0, d0, 0, 0), y], [q(w1, d1, dx, dz), y + h]]), base, isTwo(Math.max(w0, w1), h, Math.max(d0, d1)));
    },
    wedge(w, h, d, base, x = 0, y = 0, z = 0) {
      const x0 = x - w / 2, x1 = x + w / 2, zb = z - d / 2, zf = z + d / 2;
      solid([
        { kind: "auto", pts: [[x0, y, zf], [x1, y, zf], [x1, y + h, zb], [x0, y + h, zb]] },
        { kind: "side", pts: [[x0, y, zb], [x0, y + h, zb], [x1, y + h, zb], [x1, y, zb]] },
        { kind: "side", pts: [[x0, y, zb], [x0, y, zf], [x0, y + h, zb]] },
        { kind: "side", pts: [[x1, y, zb], [x1, y + h, zb], [x1, y, zf]] },
      ], base, isTwo(w, h, d));
    },
    spike(w, h, d, base, x = 0, y = 0, z = 0, lean = 0) {
      const f = z + d / 2, b = z - d / 2, tip = x + lean;
      solid([
        { kind: "side", pts: [[x - w / 2, y, f], [x + w / 2, y, f], [tip, y + h, f]] },
        { kind: "side", pts: [[x - w / 2, y, b], [x + w / 2, y, b], [tip, y + h, b]] },
        { kind: "side", pts: [[x + w / 2, y, f], [x + w / 2, y, b], [tip, y + h, b], [tip, y + h, f]] },
        { kind: "side", pts: [[x - w / 2, y, f], [x - w / 2, y, b], [tip, y + h, b], [tip, y + h, f]] },
      ], base, isTwo(w, d));
    },
  };
  return K;
}

const EXTENT = {
  rbox: ([w, h, d]) => [w, h, d],
  box: ([w, h, d]) => [w, h, d],
  wedge: ([w, h, d]) => [w, h, d],
  spike: ([w, h, d]) => [w, h, d],
  cyl: ([r, h]) => [2 * r, h, 2 * r],
  disc: ([r, h]) => [2 * r, h, 2 * r],
  cone: ([r0, r1, h]) => [2 * Math.max(r0, r1), h, 2 * Math.max(r0, r1)],
  taper: ([w0, d0, w1, d1, h, dx = 0, dz = 0]) => [Math.max(w0, w1) + Math.abs(dx), h, Math.max(d0, d1) + Math.abs(dz)],
};

const extentOf = (p) => (p.prim === "chain" ? p.links.reduce((m, l) => EXTENT[l.prim || "rbox"](l.dims).map((v, i) => Math.max(m[i], v)), [0, 0, 0]) : EXTENT[p.prim](p.dims));

function layout(spec) {
  const placed = new Map();
  for (const p of spec.parts) {
    const [w, h, d] = extentOf(p);
    const on = p.on ? placed.get(p.on) : null;
    if (p.on && !on) throw new Error(`figure ${spec.name}: part ${p.id} sits on unknown ${p.on}`);
    const at = p.at || [0, 0, 0];
    const y = (on ? on.top : 0) + at[1];
    const top = p.prim === "chain" ? y + Math.max(...p.links.map((l) => (l.at?.[1] || 0) + EXTENT[l.prim || "rbox"](l.dims)[1])) : y + h;
    placed.set(p.id, { ...p, x: at[0], y, z: at[2], size: [w, h, d], top });
  }
  return placed;
}

export function audit(spec) {
  const placed = [...layout(spec).values()];
  const B = BIBLE.parts;
  const big = placed.filter((p) => !p.face && Math.max(...p.size) >= B.min);
  const stray = placed.filter((p) => !p.face && Math.max(...p.size) < B.face);
  const height = Math.max(...placed.map((p) => p.top));
  const head = placed.find((p) => p.role === "head");
  const xs = [], zs = [];
  for (const p of placed) {
    const r = Math.hypot(p.size[0], p.size[2]) / 2;
    xs.push(p.x - r, p.x + r); zs.push(p.z - r, p.z + r);
    if (p.prim === "chain") for (const l of p.links) { xs.push(p.x + l.at[0]); zs.push(p.z + l.at[2]); }
  }
  const headRatio = head ? head.size[1] / height : null;
  const errors = [];
  const max = spec.budget || B.max;
  if (big.length > max) errors.push(`${big.length} parts over ${B.min} tile, budget ${max}`);
  if (stray.length) errors.push(`parts under ${B.face} tile off the face: ${stray.map((p) => p.id).join(", ")}`);
  const band = spec.head || BIBLE.head;
  if (headRatio != null && (headRatio < band[0] - 1e-6 || headRatio > band[1] + 1e-6)) errors.push(`head ${headRatio.toFixed(2)} of height, rule ${band.join(" to ")}`);
  return { name: spec.name, parts: big.length, ids: big.map((p) => p.id), face: placed.length - big.length, height, headRatio, width: Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)), ok: !errors.length, errors };
}

export function figure(K, spec) {
  const a = audit(spec);
  if (!a.ok) throw new Error(`figure ${spec.name}: ${a.errors.join("; ")}`);
  for (const p of layout(spec).values()) {
    K.part(p.id, { role: p.role || null, face: !!p.face, chain: p.prim === "chain" }, () => {
      const draw = (prim, dims, base, x, y, z, ry = 0) => {
        const B = K.B;
        B.push(x, y, z, ry);
        K[prim](...dims.slice(0, prim === "cone" ? 3 : prim === "cyl" || prim === "disc" ? 2 : 3), base, 0, 0, 0, ...(prim === "spike" ? [dims[3] || 0] : prim === "cone" ? [dims[3] || 4] : []));
        B.pop();
      };
      const g = p.group && spec.groups?.[p.group];
      if (g) K.B.push(g.pivot[0], 0, g.pivot[1], g.ry || 0);
      const ox = g ? -g.pivot[0] : 0, oz = g ? -g.pivot[1] : 0;
      if (p.prim === "chain") p.links.forEach((l, i) => K.part(`${p.id}.${i}`, { chainOf: p.id }, () => draw(l.prim || "rbox", l.dims, l.base || p.base, ox + p.x + l.at[0], p.y + l.at[1], oz + p.z + l.at[2], l.ry || 0)));
      else draw(p.prim, p.dims, p.base, ox + p.x, p.y, oz + p.z, p.ry || 0);
      if (g) K.B.pop();
    });
  }
  return a;
}

export const lockedKit = (B, style, rot = 0) => kit(B, { light: style?.light || null, rot });
