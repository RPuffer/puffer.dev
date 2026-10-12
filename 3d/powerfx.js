import * as THREE from "three";
import { Baker, bakedMaterial } from "./baker.js";
import { kit } from "./prims.js";
import { surfaceY, liftLevel } from "./terrain.js";

export const INK = { puddle: "#3a2a5c", drop: "#5b3d8f", gloss: "#c59bff", life: 0.9 };
export const WARD = { plate: "#4fc3e0", rim: "#ffd76a", n: 3, radius: 0.46, life: 0.7 };
export const BRASS = { plate: "#c9a24a", bolt: "#8a6a2a" };

const mesh = (build) => {
  const B = new Baker(null), K = kit(B);
  build(K, B);
  const m = new THREE.Mesh(B.geometry(), bakedMaterial());
  m.frustumCulled = false;
  return m;
};

const puddle = () => mesh((K) => {
  K.cyl(0.36, 0.03, INK.puddle, 0, 0, 0, 9);
  K.cyl(0.13, 0.035, INK.gloss, -0.1, 0.005, -0.08, 6);
  for (const [x, z, r] of [[0.38, 0.12, 0.07], [-0.3, 0.3, 0.06], [0.14, -0.4, 0.05]]) K.cyl(r, 0.03, INK.puddle, x, 0, z, 6);
});

const drop = () => mesh((K) => { K.cone(0.09, 0, 0.16, INK.drop, 0, 0.08, 0, 5); K.cone(0.09, 0.05, 0.08, INK.drop, 0, 0, 0, 5); });

const shield = () => mesh((K) => {
  K.rbox(0.26, 0.36, 0.05, WARD.plate, 0, 0, 0);
  K.box(0.05, 0.26, 0.02, WARD.rim, 0, 0.05, 0.035);
  K.box(0.18, 0.05, 0.02, WARD.rim, 0, 0.2, 0.035);
});

const plate = () => mesh((K) => {
  K.rbox(0.78, 0.05, 0.78, BRASS.plate, 0, 0, 0);
  for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) K.cyl(0.05, 0.04, BRASS.bolt, x, 0.05, z, 6);
  K.box(0.5, 0.02, 0.07, BRASS.bolt, 0, 0.05, 0);
});

export function createPowerFx(game, view) {
  const S = game.state;
  const group = new THREE.Group();
  group.name = "power-fx";
  const plates = new THREE.Group();
  plates.name = "unjam-plates";
  const live = [];
  const shields = [];
  for (let i = 0; i < WARD.n; i++) { const s = shield(); s.visible = false; group.add(s); shields.push(s); }
  group.add(plates);
  let plateKey = "", burst = null;
  const now = () => S.time;
  const cellY = (c) => surfaceY(liftLevel(S.level), S.view, c[0], c[1]);
  const spawn = (obj, life, step) => { group.add(obj); live.push({ obj, t0: now(), life, step }); };
  const inkAt = (c, delay) => {
    const p = puddle();
    p.position.set(c[0] + 0.5, cellY(c) + 0.02, c[1] + 0.5);
    p.scale.setScalar(0.001);
    spawn(p, INK.life + delay, (u, age) => { const k = age < delay ? 0 : Math.min(1, (age - delay) / 0.12); p.scale.setScalar(Math.max(0.001, k * (1 - Math.max(0, (age - delay) / INK.life) ** 3))); });
  };
  const dropsAlong = (from, to) => {
    for (let i = 0; i < 5; i++) {
      const d = drop(), f = (i + 1) / 6;
      const x = from[0] + 0.5 + (to[0] - from[0]) * f, z = from[1] + 0.5 + (to[1] - from[1]) * f;
      const y0 = Math.max(cellY(from), cellY(to)) + 0.55 + 0.25 * Math.sin(f * Math.PI);
      d.position.set(x, y0, z);
      spawn(d, 0.55, (u) => { d.position.y = y0 - 0.9 * u * u; d.scale.setScalar(Math.max(0.001, 1 - u)); });
    }
  };
  const syncPlates = () => {
    const traps = S.traps, list = traps ? traps.all().filter((t) => t.disarmed) : [];
    const k = (S.level?.name || "") + ":" + list.map((t) => t.id).join(",");
    if (k === plateKey) return false;
    plateKey = k;
    while (plates.children.length) { const c = plates.children.pop(); c.geometry.dispose(); c.material.dispose(); }
    const L = S.level;
    for (const t of list) for (const c of t.cells) {
      const cl = L.cells[c[1]]?.[c[0]];
      if (!cl || cl.h < 1 || cl.s === "water" || cl.s === "none") continue;
      const p = plate();
      p.position.set(c[0] + 0.5, cellY(c) + 0.012, c[1] + 0.5);
      p.userData.cell = c.slice();
      p.userData.t0 = now();
      plates.add(p);
    }
    return true;
  };
  game.powers.on((e) => {
    if (e.type === "ink") { inkAt(e.from, 0); inkAt(e.to, 0.3); dropsAlong(e.from, e.to); }
    if (e.type === "absorb") burst = { t0: now() };
    if (e.type === "unjam") { plateKey = ""; syncPlates(); for (const p of plates.children) if (p.userData.cell[0] === e.cell[0] && p.userData.cell[1] === e.cell[1]) p.userData.drop = now(); }
  });
  return {
    objects: [group],
    update(ctx) {
      if (!S.level || !S.actor) return;
      const t = now(), dy = view.drop || 0;
      group.position.y = dy;
      syncPlates();
      for (const p of plates.children) {
        const a = p.userData.drop != null ? Math.min(1, (t - p.userData.drop) / 0.35) : 1;
        p.position.y = cellY(p.userData.cell) + 0.012 + 0.6 * (1 - a) * (1 - a);
        p.scale.setScalar(a < 1 ? 0.7 + 0.3 * a + 0.08 * Math.sin(a * Math.PI) : 1);
      }
      for (let i = live.length - 1; i >= 0; i--) {
        const L = live[i], age = t - L.t0, u = Math.min(1, age / L.life);
        L.step(u, age);
        if (u >= 1) { group.remove(L.obj); L.obj.geometry.dispose(); L.obj.material.dispose(); live.splice(i, 1); }
      }
      const raised = !!S.powers?.raised && ctx.hero;
      const b = burst && t - burst.t0 < WARD.life ? (t - burst.t0) / WARD.life : null;
      if (!b) burst = null;
      shields.forEach((s, i) => {
        s.visible = raised || b != null;
        if (!s.visible) return;
        const a = t * 1.6 + (i * 2 * Math.PI) / WARD.n, r = WARD.radius + (b != null ? 0.9 * b : 0);
        s.position.set(ctx.x + Math.sin(a) * r, ctx.y - dy + 0.35 + 0.05 * Math.sin(t * 3 + i) + (b != null ? 0.4 * b : 0), ctx.z + Math.cos(a) * r);
        s.rotation.set(b != null ? b * 4 : 0, a, b != null ? b * 3 : 0);
        s.scale.setScalar(b != null ? Math.max(0.001, 1 - b) : 1);
      });
    },
    dispose() { group.traverse((o) => { if (o.geometry) { o.geometry.dispose(); o.material.dispose(); } }); },
  };
}
