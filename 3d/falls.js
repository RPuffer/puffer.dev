import * as THREE from "three";
import { PRAT_S } from "../core/life.js";
import { TEETER_S } from "../core/actor.js";
import { DIRS } from "../core/level.js";

const STEP_OUT = 0.22;
const ease = (u) => 1 - Math.pow(1 - Math.min(1, Math.max(0, u)), 3);
const tiltQ = new THREE.Quaternion(), axis = new THREE.Vector3(), yQ = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);

function lean(hero, d, angle) {
  if (!angle) return;
  axis.set(d[1], 0, -d[0]);
  if (axis.lengthSq() < 1e-6) return;
  axis.normalize();
  tiltQ.setFromAxisAngle(axis, angle);
  hero.quaternion.premultiply(tiltQ);
}

function spin(hero, a) {
  yQ.setFromAxisAngle(UP, a);
  hero.quaternion.premultiply(yQ);
}

function bang() {
  const g = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({ color: "#ff5a3d", depthTest: false, transparent: true });
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.14), m);
  const dot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), m);
  bar.position.y = 0.36;
  bar.renderOrder = dot.renderOrder = 10;
  g.add(bar, dot);
  g.visible = false;
  return g;
}

function puffs() {
  const g = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), new THREE.MeshBasicMaterial({ color: "#f4f6fa", transparent: true, opacity: 0.9, depthWrite: false }));
    m.userData.a = (i / 8) * Math.PI * 2;
    g.add(m);
  }
  g.visible = false;
  return g;
}

export function fallBody(fx, view) {
  const d = fx.dir || [0, 0], T = view.tileH, y0 = (fx.y || 0) * T, t = fx.t, out = (k) => [fx.from[0] + d[0] * k, fx.from[1] + d[1] * k];
  const step = ease(t / STEP_OUT);
  if (fx.variant === "pause") {
    const hang = 0.75, drop = Math.max(0, t - STEP_OUT - hang);
    const [x, z] = out(0.85 * step);
    const bob = drop ? 0 : Math.sin(Math.min(1, t / STEP_OUT) * Math.PI) * 0.25;
    return { x, z, y: y0 + bob - 34 * drop * drop, sx: drop ? 0.8 : 1, sy: drop ? 1.35 : 1, tilt: drop ? 0.15 : 0, spin: 0, bang: t > STEP_OUT && !drop, look: !drop };
  }
  if (fx.variant === "spin") {
    const u = Math.max(0, t - 0.05);
    const [x, z] = out(0.4 + 1.6 * ease(u / 0.9));
    return { x, z, y: y0 + Math.sin(Math.min(1, u / 0.5) * Math.PI) * 0.7 - 16 * Math.max(0, u - 0.35) ** 2, sx: 1, sy: 1, tilt: u * 9, spin: u * 14, bang: false };
  }
  const shrink = Math.max(0, t - STEP_OUT) / (fx.dur - STEP_OUT - 0.3);
  const [x, z] = out(0.75 * step);
  const s = Math.max(0.001, 1 - shrink);
  return { x, z, y: y0 - 7 * ease(shrink), sx: s, sy: s, tilt: Math.sin(t * 9) * 0.35, spin: t * 3, bang: false, poof: shrink >= 1 };
}

export function buildFalls(state) {
  const group = new THREE.Group();
  group.name = "falls";
  const mark = bang(), cloud = puffs();
  group.add(mark, cloud);
  let poof = null, poofed = null;
  const api = {
    group,
    pose(hero, a, view, base) {
      const fx = a.fx;
      mark.visible = false;
      if (fx?.kind === "fall") {
        const b = fallBody(fx, view);
        hero.position.set(b.x, b.y, b.z);
        hero.scale.set(base * b.sx, base * b.sy, base * b.sx);
        hero.userData.fallPose = { d: fx.dir, tilt: b.tilt, spin: b.spin };
        if (b.bang) { mark.visible = true; mark.position.set(b.x, b.y + 1.45, b.z); }
        if (b.poof && poofed !== fx) { poofed = fx; poof = { t: 0, at: [b.x, b.y, b.z] }; }
        return true;
      }
      hero.userData.fallPose = null;
      if (a.teeter && !fx) {
        const T = a.teeter, d = DIRS[T.dir] || [0, 0];
        const fade = Math.min(1, (TEETER_S - T.t) / 0.25);
        hero.position.x += d[0] * 0.24 * fade;
        hero.position.z += d[1] * 0.24 * fade;
        hero.userData.fallPose = { d, tilt: (0.42 + Math.sin(T.t * 13) * 0.26) * fade, spin: Math.sin(T.t * 7) * 0.25 * fade };
        if (T.t < 1.0) { mark.visible = true; mark.position.set(hero.position.x, hero.position.y + 1.4 + Math.abs(Math.sin(T.t * 10)) * 0.12, hero.position.z); }
        return true;
      }
      if (a.pratfall > 0 && !fx) {
        const u = 1 - a.pratfall / PRAT_S;
        const drop = Math.max(0, 1 - u / 0.3);
        hero.position.y += drop * drop * 3.2;
        const squash = u < 0.3 ? 1 : 1 - Math.sin(Math.min(1, (u - 0.3) / 0.5) * Math.PI) * 0.35;
        hero.scale.set(base * (2 - squash), base * squash, base * (2 - squash));
        hero.userData.fallPose = { d: [Math.sin(a.facing), Math.cos(a.facing)], tilt: u < 0.3 ? 0 : -Math.sin(Math.min(1, (u - 0.3) / 0.6) * Math.PI) * 0.9, spin: 0 };
        return true;
      }
      return false;
    },
    limbs(hero, a) {
      const p = hero.userData.fallPose;
      if (p) { lean(hero, p.d, p.tilt); if (p.spin) spin(hero, p.spin); }
      const J = hero.userData.joints;
      if (!J) return;
      const fx = a.fx, falling = fx?.kind === "fall" || fx?.kind === "knock";
      if (!falling && !a.teeter) return;
      const t = falling ? fx.t : a.teeter.t;
      const ph = t * (falling ? 22 : 15);
      J.upperArmL?.rotation.set(0.2, 0, -ph);
      J.upperArmR?.rotation.set(0.2, 0, ph);
      J.lowerArmL?.rotation.set(0, 0, -0.6);
      J.lowerArmR?.rotation.set(0, 0, 0.6);
      if (falling) {
        J.upperLegL?.rotation.set(Math.sin(t * 24) * 0.9, 0, -0.2);
        J.upperLegR?.rotation.set(-Math.sin(t * 24) * 0.9, 0, 0.2);
        J.head?.rotation.set(-0.3, Math.sin(t * 9) * 0.4, 0);
      } else {
        J.upperLegL?.rotation.set(Math.max(0, Math.sin(t * 13)) * 0.5, 0, 0);
        J.torso?.rotation.set(0, 0, Math.sin(t * 13) * 0.12);
      }
    },
    update(dt) {
      cloud.visible = !!poof;
      if (!poof) return;
      poof.t += dt;
      const u = Math.min(1, poof.t / 0.8);
      for (const m of cloud.children) {
        m.position.set(poof.at[0] + Math.sin(m.userData.a) * u * 0.9, poof.at[1] + 0.2 + u * 0.5, poof.at[2] + Math.cos(m.userData.a) * u * 0.9);
        m.scale.setScalar(1 + u * 2);
        m.material.opacity = 0.9 * (1 - u);
      }
      if (u >= 1) poof = null;
    },
    dispose() { group.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); }); },
  };
  return api;
}
