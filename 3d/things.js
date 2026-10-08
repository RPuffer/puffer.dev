import * as THREE from "three";
import { Baker, tone, bakedMaterial } from "./baker.js";
import { applyXray } from "./xray.js";
import { applyMotion } from "./motion.js";
import { surfaceY, liftLevel } from "./terrain.js";
import { createTweens, ease } from "./tween.js";
import { DIRS, OPPOSITE, cellAt, edgeHeight } from "../core/level.js";
import { rideUniforms } from "../core/sequence.js";

export const RISE = 2.4;
export const SHAFT = 32;
export const RUNG = 1.5;
const CAGE = 2.6;
const RUNG_LO = CAGE + 0.26 + RUNG;
let RUNGS = 0;
for (let y = RUNG_LO; y < SHAFT - 0.3; y += RUNG) RUNGS++;
export const RIDE = { speed: 10, extend: 12, stretch: 2.5 };
const t3 =(c) => (Array.isArray(c) ? tone(c[0], c[1] || c[0], c[2] || c[1] || c[0]) : tone(c, c, c));
const SIDE = [[0, 1], [1, 0], [0, -1], [-1, 0]];

function lookOf(style) {
  const P = style.palette, T = P.things || {};
  const rock = P.rock || ["#e8e5e1", "#cbc5be", "#9c948b"];
  const wood = P.wood || {};
  return {
    stone: T.stone || [rock[1], rock[2], rock[3] || rock[2]],
    ash: T.ash || ["#4a4650", "#3a3640", "#2c2830"],
    wood: T.wood || [wood.light || "#e07528", wood.mid || "#be5916", wood.dark || "#993f0b"],
    metal: T.metal || P.gold || ["#f0c438", "#cc9f1f", "#a07a14"],
    blade: T.blade || ["#e8eef4", "#c4ccd6", "#9aa4b0"],
    flame: T.flame || P.flame || ["#ffe082", "#ffb31d", "#ff831d"],
    core: T.core || ["#fffbe8", "#fff0bf", "#ffe08a"],
    lamp: T.lamp || T.flame || P.flame || ["#ffe082", "#ffb31d", "#ff831d"],
    deck: T.deck || [rock[0], rock[1], rock[2]],
    trim: T.trim || P.gold || ["#f0c438", "#cc9f1f", "#a07a14"],
    post: T.post || [rock[1], rock[2], rock[3] || rock[2]],
    cap: T.cap || T.trim || P.gold || ["#f0c438", "#cc9f1f", "#a07a14"],
  };
}

const flameSway = (B, h, fn) => B.sway("flame", { amp: 0.035, root: [0, 0, 0] }, fn);

function bonfireBase(B, k) {
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.3;
    B.at(Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3, a, () => B.rbox(0.17, 0.12, 0.13, 0.04, t3(k.stone), 0, 0, 0));
  }
  B.box(0.42, 0.04, 0.42, t3(k.ash), 0, 0, 0);
  B.at(0, 0.04, 0, 0.5, () => B.box(0.52, 0.09, 0.1, t3(k.wood), 0, 0, 0));
  B.at(0, 0.09, 0, -0.7, () => B.box(0.5, 0.09, 0.1, t3(k.wood), 0, 0, 0));
  B.at(0.02, 0.1, 0.02, 0.35, () => {
    B.rot([1, 0, 0], -0.22, 0, 0, 0);
    B.box(0.06, 0.66, 0.025, t3(k.blade), 0, 0, 0);
    B.box(0.2, 0.05, 0.06, t3(k.metal), 0, 0.62, 0);
    B.box(0.05, 0.16, 0.05, t3(k.wood), 0, 0.67, 0);
    B.pop();
  });
}

function bonfireFlame(B, k) {
  flameSway(B, 0.6, () => {
    B.cone(0.17, 0, 0.5, t3(k.flame), 0, 0.1, 0, 5);
    B.cone(0.1, 0, 0.34, t3(k.core), 0.03, 0.12, 0.03, 4);
    B.cone(0.07, 0, 0.26, t3(k.flame), -0.12, 0.12, 0.05, 4);
    B.cone(0.06, 0, 0.22, t3(k.flame), 0.1, 0.1, -0.08, 4);
  });
}

function chestBase(B, k) {
  B.rbox(0.62, 0.34, 0.42, 0.04, t3(k.wood), 0, 0, 0);
  for (const x of [-0.2, 0.2]) B.box(0.07, 0.35, 0.44, t3(k.metal), x, 0, 0);
  B.box(0.11, 0.12, 0.03, t3(k.metal), 0, 0.22, 0.22);
}

function chestLid(B, k) {
  B.rbox(0.64, 0.15, 0.44, 0.05, t3(k.wood), 0, 0, 0.22);
  for (const x of [-0.2, 0.2]) B.box(0.07, 0.16, 0.46, t3(k.metal), x, 0, 0.22);
}

function gateFrame(B, k, span, half = 0.44) {
  B.push(0, 0, 0, span === "z" ? Math.PI / 2 : 0);
  for (const s of [-1, 1]) {
    B.rbox(0.2, 1.86, 0.24, 0.04, t3(k.post), s * half, 0, 0);
    B.box(0.26, 0.1, 0.3, t3(k.cap), s * half, 1.86, 0);
  }
  B.rbox(1.12, 0.18, 0.3, 0.04, t3(k.post), 0, 1.94, 0);
  B.box(0.16, 0.16, 0.06, t3(k.cap), 0, 1.95, 0.16);
  B.pop();
}

function gateBars(B, k, span, width = 0.78, height = 1.62) {
  B.push(0, 0, 0, span === "z" ? Math.PI / 2 : 0);
  const n = Math.max(4, Math.round(width / 0.17)), step = (width - 0.1) / (n - 1);
  for (let i = 0; i < n; i++) {
    const x = -(width - 0.1) / 2 + i * step;
    B.box(0.07, height, 0.07, t3(k.metal), x, 0.12, 0);
    B.cone(0.05, 0, 0.12, t3(k.metal), x, 0.02, 0, 4);
  }
  for (const y of [height * 0.3, height * 0.8]) B.box(width, 0.09, 0.09, t3(k.wood), 0, y, 0);
  B.box(width + 0.06, 0.1, 0.12, t3(k.post), 0, height + 0.08, 0);
  B.pop();
  return height + 0.18;
}

function elevatorFrame(B, k, out) {
  const [ox, oz] = out;
  const perp = [oz, ox];
  for (const s of [-1, 1]) {
    const x = ox * 0.44 + perp[0] * s * 0.44, z = oz * 0.44 + perp[1] * s * 0.44;
    B.rbox(0.16, CAGE + 0.3, 0.16, 0.03, t3(k.post), x, -0.3, z);
    B.box(0.2, 0.12, 0.2, t3(k.trim), x, CAGE, z);
  }
  B.box(Math.abs(perp[0]) * 0.92 + 0.16, 0.14, Math.abs(perp[1]) * 0.92 + 0.16, t3(k.post), ox * 0.44, CAGE + 0.12, oz * 0.44);
  B.box(0.12, 0.16, 0.12, t3(k.lamp), ox * 0.44, CAGE - 0.04, oz * 0.44);
}

function elevatorShaft(B, k, out) {
  const [ox, oz] = out;
  const perp = [oz, ox];
  for (const s of [-1, 1]) B.rbox(0.16, SHAFT - CAGE, 0.16, 0.03, t3(k.post), ox * 0.44 + perp[0] * s * 0.44, CAGE, oz * 0.44 + perp[1] * s * 0.44);
  const n0 = B.pos.length / 3;
  for (let y = RUNG_LO; y < SHAFT - 0.3; y += RUNG) B.box(Math.abs(perp[0]) * 0.92 + 0.08, 0.08, Math.abs(perp[1]) * 0.92 + 0.08, t3(k.trim), ox * 0.44, y, oz * 0.44);
  return n0;
}

const RIDE_HEAD = `uniform float uRide; uniform float uRideTime; uniform float uRideDir; uniform float uOn; uniform vec4 uRung;
attribute float aRung;
void main() {`;
const RIDE_MOVE = `#include <begin_vertex>
float rOn = uOn * step(0.001, uRide);
if (aRung > 0.0) {
  float rLo = uRung.x - uRung.w * rOn, rSpan = uRung.y + uRung.w * rOn;
  float rRel = aRung - rLo;
  float rC = rLo + mod(rRel - uRideTime * uRung.z * uRideDir * uOn, rSpan);
  transformed.y = rC + (transformed.y - aRung) * (1.0 + ${RIDE.stretch.toFixed(1)} * uRide * uOn);
} else if (transformed.y < ${(CAGE + 0.02).toFixed(2)}) {
  transformed.y -= uRung.w * rOn;
}`;

function shaftMat() {
  const m = underlayMat();
  const on = { value: 0 };
  m.userData.on = on;
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, rideUniforms, { uOn: on, uRung: { value: m.userData.rung } });
    shader.vertexShader = shader.vertexShader.replace("void main() {", RIDE_HEAD).replace("#include <begin_vertex>", RIDE_MOVE);
  };
  m.customProgramCacheKey = () => "shaft-ride1";
  return m;
}

function elevatorDeck(B, k) {
  B.rbox(0.86, 0.1, 0.86, 0.03, t3(k.deck), 0, 0.01, 0);
  for (const s of [-1, 1]) {
    B.box(0.86, 0.04, 0.08, t3(k.trim), 0, 0.11, s * 0.39);
    B.box(0.08, 0.04, 0.86, t3(k.trim), s * 0.39, 0.11, 0);
  }
  B.box(0.22, 0.03, 0.22, t3(k.lamp), 0, 0.11, 0);
}

export function gatePlace(LL, view, t) {
  if (!t.edge) return { x: t.x + 0.5, y: surfaceY(LL, view, t.x, t.z), z: t.z + 0.5, span: t.span || "x", width: t.width, height: t.height, frame: t.frame !== false, half: 0.44 };
  const [[ax, az], [bx, bz]] = t.edge;
  const dir = Object.keys(DIRS).find((d) => ax + DIRS[d][0] === bx && az + DIRS[d][1] === bz);
  const ca = cellAt(LL, ax, az), cb = cellAt(LL, bx, bz);
  const ha = ca && dir ? edgeHeight(ca, dir) : null, hb = cb && dir ? edgeHeight(cb, OPPOSITE[dir]) : null;
  const y = ha != null || hb != null ? Math.max(ha ?? -Infinity, hb ?? -Infinity) * view.tileH : Math.max(surfaceY(LL, view, ax, az), surfaceY(LL, view, bx, bz));
  return { x: (ax + bx) / 2 + 0.5, y, z: (az + bz) / 2 + 0.5, span: ax !== bx ? "z" : "x", width: 0.84, height: Math.min(t.height || 1.62, 1.62), frame: true, half: 0.48 };
}

const xrayMat = (reach = false) => applyMotion(applyXray(bakedMaterial(), reach));

export const ISLAND = 1;

function underlayMat() {
  const m = bakedMaterial();
  m.stencilWrite = true;
  m.stencilRef = ISLAND;
  m.stencilFunc = THREE.NotEqualStencilFunc;
  m.stencilFail = m.stencilZFail = m.stencilZPass = THREE.KeepStencilOp;
  return m;
}

function partMesh(build, light, k, at, rotY, reach = false) {
  const B = new Baker(light);
  build(B, k);
  const m = new THREE.Mesh(B.geometry(), xrayMat(reach));
  m.position.copy(at);
  m.rotation.y = rotY;
  m.userData.noMerge = true;
  return m;
}

export function bakeThingBases(S, L, view, style, P = S) {
  const LL = liftLevel(L), k = lookOf(style);
  for (const t of L.things || []) {
    const y = surfaceY(LL, view, t.x, t.z), x = t.x + 0.5, z = t.z + 0.5, r = -(t.rot || 0) * (Math.PI / 2);
    if (t.kind === "bonfire") S.at(x, y, z, r, () => bonfireBase(S, k));
    else if (t.kind === "chest") S.at(x, y, z, r, () => chestBase(S, k));
    else if (t.kind === "elevator") S.at(x, y, z, 0, () => elevatorFrame(S, k, SIDE[((t.rot || 0) % 4 + 4) % 4]));
    else if (t.kind === "gate") { const g = gatePlace(LL, view, t); if (g.frame) P.at(g.x, g.y, g.z, 0, () => gateFrame(P, k, g.span, g.half)); }
  }
}

export function buildThings(L, view, style, decorGroup) {
  const group = new THREE.Group();
  group.name = "things";
  const LL = liftLevel(L), k = lookOf(style), light = style.light;
  const tweens = createTweens();
  const parts = {};
  const shafts = {};
  const heads = {};
  let kept = null;
  decorGroup?.traverse((o) => { if (o.userData?.live?.thing) heads[o.userData.live.thing] = o; });
  for (const t of L.things || []) {
    const y = surfaceY(LL, view, t.x, t.z), x = t.x + 0.5, z = t.z + 0.5, r = -(t.rot || 0) * (Math.PI / 2);
    if (t.kind === "bonfire") {
      const m = partMesh(bonfireFlame, light, k, new THREE.Vector3(x, y, z), r);
      m.userData.thing = t.id;
      m.userData.scale = t.state === "lit" ? 1 : 0;
      m.visible = t.state === "lit";
      group.add(m);
      parts[t.id] = m;
    } else if (t.kind === "chest") {
      const piv = new THREE.Vector3(0, 0.34, -0.22).applyAxisAngle(new THREE.Vector3(0, 1, 0), r);
      const m = partMesh(chestLid, light, k, new THREE.Vector3(x + piv.x, y + 0.34, z + piv.z), r);
      m.rotation.order = "YXZ";
      m.userData.thing = t.id;
      m.userData.open = t.state === "open" ? 1 : 0;
      group.add(m);
      parts[t.id] = m;
    } else if (t.kind === "gate") {
      const g = gatePlace(LL, view, t);
      const top = (g.height || 1.62) + 0.18;
      const m = partMesh((B) => { B.push(0, -top, 0); gateBars(B, k, g.span, g.width, g.height); B.pop(); }, light, k, new THREE.Vector3(g.x, g.y + top, g.z), 0, true);
      m.userData.thing = t.id;
      m.userData.lift = t.state === "open" ? 1 : 0;
      m.userData.y0 = g.y + top;
      group.add(m);
      parts[t.id] = m;
    } else if (t.kind === "elevator") {
      const m = partMesh(elevatorDeck, light, k, new THREE.Vector3(x, y, z), 0);
      m.userData.thing = t.id;
      m.userData.y0 = y;
      group.add(m);
      parts[t.id] = m;
      const out = SIDE[((t.rot || 0) % 4 + 4) % 4];
      const sb = new Baker(light);
      const n0 = elevatorShaft(sb, k, out);
      const sg = sb.geometry(), sp = sg.attributes.position;
      const rung = new Float32Array(sp.count);
      for (let i = n0; i < sp.count; i++) rung[i] = RUNG_LO + RUNG * Math.round((sp.getY(i) - RUNG_LO) / RUNG) + 0.04;
      sg.setAttribute("aRung", new THREE.BufferAttribute(rung, 1));
      const sm = shaftMat();
      sm.userData.rung = new THREE.Vector4(RUNG_LO, RUNGS * RUNG, RIDE.speed, RIDE.extend);
      const s = new THREE.Mesh(sg, sm);
      s.position.set(x, y, z);
      s.renderOrder = 3;
      s.userData.noMerge = true;
      s.userData.thing = t.id;
      s.userData.shaft = true;
      s.frustumCulled = false;
      group.add(s);
      shafts[t.id] = s;
    } else if (t.kind === "watcher" && heads[t.id]) {
      const h = heads[t.id];
      h.userData.base = h.matrix.clone();
      h.userData.glow = 0;
      const live = h.userData.live;
      const col = h.geometry.attributes.color;
      if (live.flame && col) {
        const [a, b] = live.flame;
        h.userData.flameBase = Array.from(col.array.slice(a * 3, b * 3));
        h.userData.flameHot = live.hot || [0.92, 1, 1];
        const pos = h.geometry.attributes.position;
        h.userData.flamePos = Array.from(pos.array.slice(a * 3, b * 3));
      }
      parts[t.id] = h;
    }
  }

  const applyWatcher = (t, h) => {
    const live = h.userData.live || {};
    const rest = live.rest || 0;
    const delta = Math.atan2(Math.sin(t.target - rest), Math.cos(t.target - rest));
    const lim = live.limit ?? 1.4;
    const yaw = Math.max(-lim, Math.min(lim, delta)) * t.look;
    const pv = live.pivot || [0, 0, 0];
    const rot = new THREE.Matrix4().makeTranslation(pv[0], pv[1], pv[2]).multiply(new THREE.Matrix4().makeRotationY(yaw)).multiply(new THREE.Matrix4().makeTranslation(-pv[0], -pv[1], -pv[2]));
    h.matrix.copy(h.userData.base).multiply(rot);
    h.matrixWorldNeedsUpdate = true;
    const g = h.userData.glow;
    if (h.userData.flameBase && Math.abs(g - (h.userData.glowShown ?? -1)) > 1e-3) {
      const [a, b] = live.flame, col = h.geometry.attributes.color, pos = h.geometry.attributes.position;
      const base = h.userData.flameBase, hot = h.userData.flameHot, P0 = h.userData.flamePos, root = live.flameRoot || [0, 0, 0];
      const s = 1 + 0.6 * g;
      for (let i = 0; i < (b - a); i++) {
        for (let c = 0; c < 3; c++) col.array[(a + i) * 3 + c] = base[i * 3 + c] + (hot[c] * 1.15 - base[i * 3 + c]) * g;
        pos.array[(a + i) * 3] = root[0] + (P0[i * 3] - root[0]) * s;
        pos.array[(a + i) * 3 + 1] = root[1] + (P0[i * 3 + 1] - root[1]) * s;
        pos.array[(a + i) * 3 + 2] = root[2] + (P0[i * 3 + 2] - root[2]) * s;
      }
      col.needsUpdate = true;
      pos.needsUpdate = true;
      h.userData.glowShown = g;
    }
  };

  const onEvent = (e) => {
    const m = parts[e.thing?.id];
    if (!m) return;
    if (e.type === "lit") { m.visible = true; m.userData.scale = 0; tweens.to(m.userData, "scale", 1, { duration: 0.7 }); }
    if (e.type === "open") tweens.to(m.userData, "open", 1, { duration: 0.6 });
    if (e.type === "gate") tweens.to(m.userData, "lift", 1, { duration: 1.1 });
    if (e.type === "faced") tweens.to(m.userData, "glow", 1, { duration: 0.5 });
    if (e.type === "unwatch") tweens.to(m.userData, "glow", 0, { duration: 0.8, easing: ease.inOut });
  };

  return {
    group,
    parts,
    shafts,
    onEvent,
    rideOffset(state) {
      for (const t of state.things?.things || []) if (t.kind === "elevator" && t.lift != null) return t.lift;
      for (const t of state.things?.things || []) if (t.kind === "elevator" && t.ride > 0) return ease.inOut(t.ride) * RISE;
      return 0;
    },
    keep(id) { kept = id; },
    get kept() { return kept; },
    update(state, dt) {
      tweens.step(dt);
      for (const t of state.things?.things || []) {
        const m = parts[t.id];
        if (!m) continue;
        if (t.kind === "bonfire") m.scale.setScalar(Math.max(0.001, m.userData.scale));
        else if (t.kind === "chest") m.rotation.x = -1.95 * m.userData.open;
        else if (t.kind === "gate") { m.scale.y = Math.max(0.06, 1 - 0.86 * m.userData.lift); m.position.y = m.userData.y0 + 0.12 * m.userData.lift; }
        else if (t.kind === "elevator") {
          const pin = t.id === kept ? -group.position.y : 0;
          m.position.y = m.userData.y0 + (t.lift ?? ease.inOut(t.ride || 0) * RISE) + pin;
          if (shafts[t.id]) { shafts[t.id].position.y = m.userData.y0 + pin; shafts[t.id].material.userData.on.value = t.id === kept ? 1 : 0; }
        }
        else if (t.kind === "watcher") applyWatcher(t, m);
      }
    },
  };
}
