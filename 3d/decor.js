import * as THREE from "three";
import { CATALOG } from "../core/catalog.js";
import { cellAt, DIRS } from "../core/level.js";
import { Baker, bakedMaterial, solid } from "./baker.js";
import { PIECES, SPIN } from "./pieces.js";
import { surfaceY, WATER_DROP, liftLevel } from "./terrain.js";
import { applyXray } from "./xray.js";

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

export function buildDecor(L, view) {
  L = liftLevel(L);
  const group = new THREE.Group(), spinners = [];
  const mat = applyXray(bakedMaterial());
  const S = new Baker();
  for (const d of L.decor || []) {
    const spec = CATALOG[d.t];
    if (!spec) continue;
    const H = spec.height || 0.5;
    const make = PIECES[d.t] || fallback;
    const rot = d.rot || 0;
    const [fw, fd] = rot % 2 ? [spec.footprint[1], spec.footprint[0]] : spec.footprint;
    const base = baseOf(L, view, d, spec);
    const x = d.x + fw / 2 + (d.ox || 0), z = d.z + fd / 2 + (d.oz || 0);
    const ctx = contextFor(L, view, d, spec, base);
    if (SPIN.has(d.t)) {
      const b = new Baker();
      make(b, H, d.v || 0, ctx);
      const m = new THREE.Mesh(b.geometry(), mat);
      m.position.set(x, base, z);
      m.rotation.y = -rot * (Math.PI / 2);
      m.userData.decor = d;
      m.renderOrder = 1;
      spinners.push(m);
      group.add(m);
      continue;
    }
    S.at(x, base, z, -rot * (Math.PI / 2), () => make(S, H, d.v || 0, ctx));
  }
  if (!S.empty) {
    const m = new THREE.Mesh(S.geometry(), mat);
    m.name = "decor";
    group.add(m);
  }
  return { group, spinners };
}
