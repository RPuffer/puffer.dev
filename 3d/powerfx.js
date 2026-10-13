import * as THREE from "three";
import { Baker, bakedMaterial } from "./baker.js";
import { kit } from "./prims.js";
import { surfaceY, liftLevel } from "./terrain.js";
import { LANTERN_R, RUSH } from "../core/powers.js";

export const DASH = { streak: "#e9e2ff", core: "#ffffff", fade: 0.28, rows: [[0.22, 0.07, 0.55], [0.48, 0.1, 0.7], [0.74, 0.06, 0.45]] };
export const WARD = { plate: "#4fc3e0", rim: "#ffd76a", n: 3, radius: 0.55, life: 0.7 };
export const LANTERN = { brass: "#c9a24a", glass: "#ffd76a", flame: "#fff3b0", glow: "#ffe08a", glowOp: 0.34 };
export const RUSH_FX = { tint: [0.56, 0.66, 0.86], wash: 0.16, edge: 0.42, pulse: 0.8, trail: 0.09, keep: 6, ghost: "#9fb8ff", ghostOp: 0.32 };
export const CHARGE = { gem: "#ff4fa8", tip: "#ffd6ec", base: "#7a4dff", spin: 1.6 };

const mesh = (build) => {
  const B = new Baker(null), K = kit(B);
  build(K, B);
  const m = new THREE.Mesh(B.geometry(), bakedMaterial());
  m.frustumCulled = false;
  return m;
};

const scaled = (k, build) => {
  const m = mesh(build);
  m.geometry.scale(k, k, k);
  return m;
};

const streak = (hex) => {
  const m = mesh((K) => K.box(1, 0.05, 0.05, hex, 0.5, -0.025, 0));
  m.material = m.material.clone();
  m.material.transparent = true;
  m.material.depthWrite = false;
  return m;
};

const shield = () => mesh((K) => {
  K.rbox(0.34, 0.46, 0.06, WARD.plate, 0, 0, 0);
  K.box(0.07, 0.34, 0.02, WARD.rim, 0, 0.06, 0.04);
  K.box(0.24, 0.07, 0.02, WARD.rim, 0, 0.26, 0.04);
});

const RUSH_VERT = "void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }";
const RUSH_FRAG = `uniform vec2 uRes; uniform vec2 uCenter; uniform float uK; uniform float uPulse; uniform vec3 uTint; uniform vec2 uMix;
void main() {
  vec2 p = (gl_FragCoord.xy - uCenter) / min(uRes.x, uRes.y);
  vec2 q = gl_FragCoord.xy / uRes - 0.5;
  float edge = smoothstep(0.25, 0.75, length(q) * 1.25);
  float a = uK * (uMix.x + uMix.y * edge);
  float r = length(p);
  float ring = uPulse < 1.0 ? (1.0 - uPulse) * smoothstep(0.05, 0.0, abs(r - uPulse * 0.9)) : 0.0;
  gl_FragColor = vec4(mix(uTint, vec3(1.0), ring), clamp(a + ring * 0.55, 0.0, 0.85));
}`;

const lantern = () => scaled(1.6, (K) => {
  K.box(0.2, 0.03, 0.2, LANTERN.brass, 0, 0, 0);
  K.box(0.16, 0.2, 0.16, LANTERN.glass, 0, 0.03, 0);
  K.cone(0.05, 0, 0.12, LANTERN.flame, 0, 0.06, 0, 4);
  K.cone(0.13, 0.04, 0.07, LANTERN.brass, 0, 0.23, 0, 4);
  K.box(0.03, 0.08, 0.03, LANTERN.brass, 0, 0.3, 0);
});

const glow = () => {
  const m = mesh((K) => K.cyl(LANTERN_R + 0.5, 0.01, LANTERN.glow, 0, 0, 0, 16));
  m.material = m.material.clone();
  m.material.transparent = true;
  m.material.opacity = LANTERN.glowOp;
  m.material.depthWrite = false;
  return m;
};

const charge = () => scaled(1.5, (K) => {
  K.cyl(0.13, 0.03, CHARGE.base, 0, 0, 0, 6);
  K.cone(0.11, 0, 0.16, CHARGE.gem, 0, 0.2, 0, 4);
  K.cone(0.11, 0, -0.14, CHARGE.gem, 0, 0.2, 0, 4);
  K.cone(0.04, 0, 0.06, CHARGE.tip, 0, 0.33, 0, 4);
});

export function createPowerFx(game, view) {
  const S = game.state;
  const group = new THREE.Group();
  group.name = "power-fx";
  const gems = new THREE.Group();
  gems.name = "charge-pickups";
  const lamp = lantern(), pool = glow();
  lamp.visible = pool.visible = false;
  const live = [];
  const shields = [];
  for (let i = 0; i < WARD.n; i++) { const s = shield(); s.visible = false; group.add(s); shields.push(s); }
  group.add(gems, lamp, pool);
  const rushU = { uRes: { value: new THREE.Vector2(1, 1) }, uCenter: { value: new THREE.Vector2() }, uK: { value: 0 }, uPulse: { value: 1 }, uTint: { value: new THREE.Vector3(...RUSH_FX.tint) }, uMix: { value: new THREE.Vector2(RUSH_FX.wash, RUSH_FX.edge) } };
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms: rushU, vertexShader: RUSH_VERT, fragmentShader: RUSH_FRAG, transparent: true, depthTest: false, depthWrite: false }));
  veil.frustumCulled = false;
  veil.renderOrder = 999;
  veil.name = "rush-veil";
  veil.visible = false;
  const trail = [];
  const ghostMat = new THREE.MeshBasicMaterial({ color: RUSH_FX.ghost, transparent: true, opacity: RUSH_FX.ghostOp, depthWrite: false });
  let rushAt = null, lastTrail = 0;
  let gemKey = "", burst = null;
  const now = () => S.time;
  const cellY = (c) => surfaceY(liftLevel(S.level), S.view, c[0], c[1]);
  const spawn = (obj, life, step) => { group.add(obj); live.push({ obj, t0: now(), life, step }); };
  const streaks = DASH.rows.map(([, , op], i) => { const m = streak(i === 1 ? DASH.core : DASH.streak); m.visible = false; m.userData.op = op; group.add(m); return m; });
  let dash = null;
  const spawnSpark = (c) => {
    const g = charge();
    const y = cellY(c);
    g.position.set(c[0] + 0.5, y + 0.1, c[1] + 0.5);
    spawn(g, 0.5, (u) => { g.position.y = y + 0.1 + 0.9 * u; g.rotation.y = u * 9; g.scale.setScalar(Math.max(0.001, 1 - u * u)); });
  };
  const syncGems = () => {
    const list = S.powers?.pickups || [];
    const k = (S.level?.name || "") + ":" + list.map((c) => c.id).join(",");
    if (k === gemKey) return;
    gemKey = k;
    while (gems.children.length) { const c = gems.children.pop(); c.geometry.dispose(); c.material.dispose(); }
    for (const c of list) {
      const g = charge();
      g.userData.cell = [c.x, c.z];
      g.userData.phase = (c.x * 12.9898 + c.z * 78.233) % 6.2832;
      gems.add(g);
    }
  };
  game.powers.on((e) => {
    if (e.type === "ink") dash = { from: e.from, to: e.to, end: null };
    if (e.type === "land" && dash) dash.end = now();
    if (e.type === "absorb") burst = { t0: now() };
    if (e.type === "pickup") spawnSpark(e.cell);
    if (e.type === "rush") rushAt = now();
  });
  return {
    objects: [group, veil],
    update(ctx) {
      if (!S.level || !S.actor) return;
      const t = now(), dy = view.drop || 0;
      group.position.y = dy;
      syncGems();
      for (const g of gems.children) {
        const [x, z] = g.userData.cell, ph = g.userData.phase;
        g.position.set(x + 0.5, cellY(g.userData.cell) + 0.12 + 0.06 * Math.sin(t * 2.4 + ph), z + 0.5);
        g.rotation.y = t * CHARGE.spin + ph;
      }
      const on = !!S.powers?.lit && ctx.hero;
      lamp.visible = pool.visible = on;
      if (on) {
        const a = Math.atan2(Math.sin(S.actor.facing), Math.cos(S.actor.facing));
        lamp.position.set(ctx.x + 0.32 * Math.sin(a + 1.2), ctx.y - dy + 0.95 + 0.03 * Math.sin(t * 5), ctx.z + 0.32 * Math.cos(a + 1.2));
        lamp.rotation.z = 0.12 * Math.sin(t * 3.1);
        pool.position.set(ctx.x, ctx.y - dy + 0.03, ctx.z);
        pool.material.opacity = LANTERN.glowOp * (0.85 + 0.15 * Math.sin(t * 7.3) * Math.sin(t * 3.1));
      }
      for (let i = live.length - 1; i >= 0; i--) {
        const L = live[i], age = t - L.t0, u = Math.min(1, age / L.life);
        L.step(u, age);
        if (u >= 1) { group.remove(L.obj); L.obj.geometry.dispose(); L.obj.material.dispose(); live.splice(i, 1); }
      }
      if (dash && (dash.end == null || t - dash.end < DASH.fade)) {
        view.ghost?.(dash.end == null);
        const k = dash.end == null ? 1 : 1 - (t - dash.end) / DASH.fade;
        const fx = dash.from[0] + 0.5, fz = dash.from[1] + 0.5, hx = S.actor.pos.x, hz = S.actor.pos.z;
        const sx = dash.end == null ? fx : fx + (hx - fx) * (1 - k), sz = dash.end == null ? fz : fz + (hz - fz) * (1 - k);
        const len = Math.hypot(hx - sx, hz - sz), ang = Math.atan2(-(hz - sz), hx - sx);
        streaks.forEach((m, i) => {
          const [h, w] = DASH.rows[i];
          m.visible = len > 0.02;
          m.position.set(sx, ctx.y - dy + h, sz);
          m.rotation.set(0, ang, 0);
          m.scale.set(Math.max(0.001, len), w / 0.05, w / 0.05);
          m.material.opacity = m.userData.op * k;
        });
      } else if (dash) { dash = null; view.ghost?.(false); for (const m of streaks) m.visible = false; }
      const k = 1 - (S.timeScale ?? 1);
      const rk = Math.min(1, k / (1 - RUSH.scale));
      veil.visible = rk > 0.001 || (rushAt != null && t - rushAt < RUSH_FX.pulse);
      if (veil.visible) {
        rushU.uRes.value.set(ctx.w, ctx.h);
        rushU.uCenter.value.set(ctx.sx, ctx.sy);
        rushU.uK.value = rk;
        rushU.uPulse.value = rushAt != null ? Math.min(1, (t - rushAt) / RUSH_FX.pulse) : 1;
      }
      const hero = view.hero;
      if (rk > 0.05 && hero && ctx.hero && t - lastTrail >= RUSH_FX.trail && (S.actor.moving || S.actor.path.length)) {
        lastTrail = t;
        const stash = [];
        hero.traverse((o) => { stash.push([o, o.userData]); o.userData = o.userData?.highlightPass ? { highlightPass: o.userData.highlightPass } : {}; });
        let g;
        try { g = hero.clone(true); } finally { for (const [o, u] of stash) o.userData = u; }
        g.traverse((o) => { if (o.userData?.highlightPass) o.visible = false; else if (o.isMesh) o.material = ghostMat; });
        g.userData.t0 = t;
        group.parent?.add(g);
        trail.push(g);
        while (trail.length > RUSH_FX.keep) { const o = trail.shift(); o.parent?.remove(o); }
      }
      for (let i = trail.length - 1; i >= 0; i--) {
        const g = trail[i], u = (t - g.userData.t0) / (RUSH_FX.trail * RUSH_FX.keep);
        if (u >= 1) { g.parent?.remove(g); trail.splice(i, 1); continue; }
        g.scale.setScalar(hero ? hero.scale.x * (1 - 0.15 * u) : 1);
        g.visible = true;
        g.userData.fade = 1 - u;
      }
      ghostMat.opacity = RUSH_FX.ghostOp * (trail.length ? 0.6 + 0.4 * rk : 0);
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
