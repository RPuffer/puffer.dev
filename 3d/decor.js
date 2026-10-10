import * as THREE from "three";
import { CATALOG } from "../core/catalog.js";
import { cellAt, DIRS } from "../core/level.js";
import { Baker, bakedMaterial, solid } from "./baker.js";
import { makePieces, SPIN } from "./pieces.js";
import { makeStyle } from "./style.js";
import { BUILDERS, GLBS } from "./hooks.js";
import { extractTris, bakeInto } from "./bake.js";
import { surfaceY, WATER_DROP, liftLevel } from "./terrain.js";
import { applyXray } from "./xray.js";
import { applyMotion } from "./motion.js";

const SIDE = ["n", "e", "s", "w"];

function fallback(B, H) { B.box(0.4, H, 0.4, solid("#ff00ff")); }

function baseOf(L, view, d, spec) {
  const c = cellAt(L, d.x, d.z), T = view.tileH;
  if (!c) return 0;
  if (spec.attach === "under" && c.s === "bridge") return (c.w ?? 0) * T - WATER_DROP;
  if (c.s === "bridge") return c.h * T;
  if (c.s === "stone") return c.h * T + 0.07;
  if (c.s === "ramp" && c.m === "stone") return (c.h - 1) * T + 0.48;
  return surfaceY(L, view, d.x, d.z);
}

function contextFor(L, view, d, spec, base) {
  const T = view.tileH, rot = ((d.rot || 0) % 4 + 4) % 4;
  const c = cellAt(L, d.x, d.z);
  const ctx = { drop: T, deck: T };
  if (d.t === "waterfall") {
    const [dx, dz] = DIRS[SIDE[rot]];
    const n = cellAt(L, d.x + dx, d.z + dz);
    const src = n ? (n.s === "bridge" ? (n.w ?? n.h) : n.h) * T - WATER_DROP : base + T;
    ctx.drop = Math.max(0.3, src - base);
  }
  if (d.t === "ladder") {
    const [dx, dz] = DIRS[SIDE[rot]];
    const n = cellAt(L, d.x + dx, d.z + dz);
    ctx.drop = Math.max(0.3, base - (n && n.h >= 1 && n.s !== "none" ? n.h * T : 0));
  }
  if (d.t === "scaffold" && c) ctx.deck = Math.max(0.5, c.h * T - 0.02 - base);
  return ctx;
}

function makerFor(d, spec, H, rot, style, pieces, extrasFor, copy) {
  const glb = GLBS[d.t];
  if (glb) return (B) => { B.pushMatrix(glb.fit); bakeInto(B, glb, extrasFor(B), copy); B.pop(); };
  const build = BUILDERS[d.t];
  if (build) return (B, H, v, ctx) => {
    const obj = build(v, rot, style, { ...ctx, height: H, decor: d });
    if (obj) bakeInto(B, extractTris(obj, { shade: spec.shade ?? null }), extrasFor(B), copy);
  };
  return pieces[d.t] || fallback;
}

const xrayCopy = (m) => applyMotion(applyXray(m.clone()));
const reachCopy = (m) => applyMotion(applyXray(m.clone(), true));

export function buildDecor(L, view, style = makeStyle(L), { bakeExtra } = {}) {
  L = liftLevel(L);
  const pieces = makePieces(style);
  const group = new THREE.Group(), spinners = [];
  const mat = applyMotion(applyXray(bakedMaterial()));
  const S = new Baker(style.light), P = new Baker(style.light);
  let spinMesh = null;
  const extrasFor = (B) => (B === S || B === P ? group : spinMesh);
  for (const d of L.decor || []) {
    const spec = CATALOG[d.t];
    if (!spec) continue;
    const H = spec.height || 0.5;
    const rot = d.rot || 0;
    const post = d.gapX != null;
    const make = makerFor(d, spec, H, rot, style, pieces, extrasFor, post ? reachCopy : xrayCopy);
    const [fw, fd] = rot % 2 ? [spec.footprint[1], spec.footprint[0]] : spec.footprint;
    const base = baseOf(L, view, d, spec);
    const x = d.x + fw / 2 + (d.ox || 0), z = d.z + fd / 2 + (d.oz || 0);
    const ctx = contextFor(L, view, d, spec, base);
    if (SPIN.has(d.t) || spec.spin) {
      const b = new Baker(style.light);
      const m = new THREE.Mesh(undefined, mat);
      spinMesh = m;
      b.sway("pickup", { amp: 0.05, phase: ((x * 12.9898 + z * 78.233) % 6.2832 + 6.2832) % 6.2832 }, () => make(b, H, d.v || 0, ctx));
      m.geometry = b.geometry();
      m.position.set(x, base, z);
      m.rotation.y = -rot * (Math.PI / 2);
      m.userData.decor = d;
      m.renderOrder = 1;
      spinners.push(m);
      group.add(m);
      continue;
    }
    const T = post ? P : S;
    T.at(x, base, z, -rot * (Math.PI / 2), () => make(T, H, d.v || 0, ctx));
  }
  if (bakeExtra) bakeExtra(S, L, P);
  if (!S.empty) {
    const m = new THREE.Mesh(S.geometry(), mat);
    m.name = "decor";
    group.add(m);
  }
  if (!P.empty) {
    const m = new THREE.Mesh(P.geometry(), applyMotion(applyXray(bakedMaterial(), true)));
    m.name = "posts";
    group.add(m);
  }
  return { group, spinners };
}
