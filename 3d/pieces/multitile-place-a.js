import * as THREE from "three";
import { Baker, bakedMaterial } from "../baker.js";
import { lockedKit } from "../prims.js";
import { PROPS, LOOK, register as registerFull } from "./multitile.js";
import { stamp, registerCatalog, CATALOG } from "../../core/catalog.js";

const SMALL = "-small";
const MODULE = "pieces/multitile-place-a.js";
const FULL = "pieces/multitile.js";

function small(type) {
  const p = PROPS[type], [w, d] = p.footprint, fw = Math.max(1, w - 1), fd = Math.max(1, d - 1), s = Math.min(fw / w, fd / d);
  return { ...p, footprint: [fw, fd], height: Math.max(1, Math.round(p.height * s)), scale: s };
}

export function register(style = {}) {
  const catalog = {}, builders = {};
  for (const type of Object.keys(PROPS)) {
    const p = small(type), [w, d] = p.footprint;
    catalog[type + SMALL] = stamp(p.footprint, Array.from({ length: w * d }, () => ({ pass: false, h: p.height })), { multitile: true });
    builders[type + SMALL] = (v, rot, st) => {
      const B = new Baker();
      B.push(0, 0, 0, 0, p.scale);
      const K = lockedKit(B, st || style, rot || 0);
      p.build(K, { ...LOOK, ...(st?.palette?.multitile || {}) });
      B.pop();
      const m = new THREE.Mesh(B.geometry(), bakedMaterial());
      m.userData.parts = K.parts.filter((q) => !q.face).map((q) => q.id);
      return m;
    };
  }
  return { catalog, builders };
}

function held(level, h) {
  const out = new Set(), add = (x, z, r) => { for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) out.add(h.key(x + a, z + b)); };
  for (const [x, z] of h.figure.cells) add(x, z, 1);
  add(...level.spawn, 1);
  const roles = level.palette?.props || {};
  for (const d of level.decor) {
    const spec = CATALOG[d.t];
    const fixed = d === h.lead || spec?.stamp || d.side || d.axis || ["lead", "threshold", "dais", "light"].includes(roles[d.t]?.role);
    if (!fixed) continue;
    const r = spec?.multitile ? 2 : spec?.stamp ? 0 : 1;
    for (const [x, z] of h.footprint(d)) add(x, z, r);
  }
  for (const t of level.things || []) {
    const [sw, sd] = t.size || [1, 1];
    for (let a = 0; a < sw; a++) for (let b = 0; b < sd; b++) add(t.x + a, t.z + b, 1);
    for (const [x, z] of [...(t.blocks || []), ...(t.threshold || [])]) add(x, z, 1);
  }
  return out;
}

function tint(level) {
  const P = level.palette || {}, d = P.dirt, s = P.stone, n = P.sand, r = P.rock;
  if (!P.wood || !d || !s || !n) return;
  const sat = (c) => { const v = parseInt(String(c).slice(1), 16), q = [v >> 16 & 255, v >> 8 & 255, v & 255], hi = Math.max(...q); return hi ? (hi - Math.min(...q)) / hi : 0; };
  const grey = Array.isArray(r) && r.length >= 4 && sat(n.top) < 0.5 && r.every((c) => sat(c) < 0.2);
  const w = grey ? { light: r[0], mid: r[1], dark: r[2], shadow: r[3] } : P.wood;
  const out = {};
  const set = (v, ...ks) => { if (v) for (const k of ks) out[k] = v; };
  set(w.light, "plank", "stallTop", "hullDeck");
  set(w.mid, "timber", "post", "spar", "trunk", "stall", "crate", "hull", "dock");
  set(w.dark, "postDark", "ridge", "root", "mast", "hullDark", "dockAlt");
  set(w.shadow, "door", "window");
  set(d.top, "roof", "shingle");
  set(d.patch, "roofAlt", "shingleAlt");
  set(s.top, "stone", "gate", "shrine");
  set(s.pebble, "stoneLight", "gateLight", "shrineLight");
  set(s.rim, "gateDark", "shrineDark");
  set(n.top, "infill", "sail", "goods");
  if (Array.isArray(r)) { set(r[1], "rock"); set(r[3], "slit"); }
  level.palette = { ...P, multitile: { ...(P.multitile || {}), ...out } };
}

function sight(h) {
  const r = h.readability();
  h.log.pop();
  return r;
}

function spots(level, h, type, route, o) {
  const spec = CATALOG[type], res = held(level, h), onR = new Set(route.map(([x, z]) => h.key(x, z)));
  const ramps = new Set();
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) if (h.cell(x, z)?.s === "ramp") for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) ramps.add(h.key(x + a, z + b));
  const span = route.slice(0, Math.max(1, Math.ceil(route.length * (o.span ?? 0.75))));
  const ring = (x, z, cs) => Math.min(...cs.map(([a, b]) => Math.max(Math.abs(a - x), Math.abs(b - z))));
  const fc = h.figure.cells;
  const out = [];
  for (const rot of spec.footprint[0] === spec.footprint[1] ? [0] : [0, 1]) {
    const [w, d] = rot ? [spec.footprint[1], spec.footprint[0]] : spec.footprint;
    for (let z = 0; z + d <= h.D; z++) for (let x = 0; x + w <= h.W; x++) {
      const cs = [];
      for (let b = 0; b < d; b++) for (let a = 0; a < w; a++) cs.push([x + a, z + b]);
      const c0 = h.cell(x, z);
      if (!h.land(c0)) continue;
      if (cs.some(([a, b]) => { const q = h.cell(a, b); return !h.land(q) || q.s === "ramp" || q.s === "bridge" || q.h !== c0.h || res.has(h.key(a, b)) || onR.has(h.key(a, b)) || ramps.has(h.key(a, b)); })) continue;
      if (Math.min(...cs.map(([a, b]) => ring(a, b, fc))) < (o.figGap ?? 2)) continue;
      if (cs.some(([a, b]) => fc.some(([u, v]) => a + b > u + v && Math.abs(a - b - (u - v)) <= 2))) continue;
      const hide = route.filter(([a, b]) => cs.some(([u, v]) => u + v > a + b && u + v <= a + b + 3 && Math.abs(u - v - (a - b)) <= 1)).length;
      const dr = Math.min(...cs.map(([a, b]) => ring(a, b, span)));
      const at = o.at ? Math.min(...cs.map(([a, b]) => Math.max(Math.abs(a - o.at[0]), Math.abs(b - o.at[1])))) : 0;
      const busy = cs.reduce((s, [a, b]) => s + h.decorAt(a, b).length, 0);
      out.push({ x, z, rot, score: hide * 2 + Math.abs(dr - (o.near ?? 2)) * 1.5 + at + busy * 0.3 });
    }
  }
  return out.sort((a, b) => a.score - b.score);
}

export function placeGeneric(level, h, type, o = {}) {
  registerCatalog(registerFull().catalog);
  registerCatalog(register().catalog);
  const route = h.approach();
  const before = sight(h), m0 = h.reach().missing.length, len0 = route.length;
  for (const t of [type, type + SMALL]) {
    for (const c of spots(level, h, t, route, o)) {
      const S = h.snapshot();
      if (!h.put(t, c.x, c.z, { rot: c.rot, v: 0 })) { h.restore(S); continue; }
      const after = sight(h);
      const ok = h.reach().missing.length <= m0 && h.approach().length === len0 && after.walks && after.xrayRun <= Math.max(3, before.xrayRun) && after.tallerInFront.length <= before.tallerInFront.length;
      if (!ok) { h.restore(S); continue; }
      const mod = t === type ? FULL : MODULE;
      level.pieces = [...new Set([...(level.pieces || []), mod])];
      tint(level);
      h.log.push(`generic ${t} at ${c.x},${c.z} rot ${c.rot} h${h.cell(c.x, c.z).h}${t !== type ? " (footprint shrunk one step)" : ""}`);
      return { t, ...c };
    }
  }
  h.log.push(`generic ${type}: no flat clear footprint`);
  return null;
}
