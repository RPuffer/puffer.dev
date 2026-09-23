import * as THREE from "three";
import { Baker, tone, solid, bakedMaterial } from "./baker.js";

const SKIN = tone("#ffd9b0", "#ffd9b0", "#e8b98e");
const SHIRT = tone("#ff6a5a", "#ff6a5a", "#d9483f");
const PANTS = tone("#4a5fb0", "#4a5fb0", "#34448a");
const HAIR = tone("#8a4a28", "#7a3f22", "#5e2f18");
const BOOT = tone("#6b3a1a", "#6b3a1a", "#4f2a12");
const EYE = solid("#2a2230");

const mat = bakedMaterial();
const part = (fn) => { const b = new Baker(); fn(b); const m = new THREE.Mesh(b.geometry(), mat); m.renderOrder = 2; return m; };

export function buildCharacter(scale = 1) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  body.add(part((b) => { b.rbox(0.34, 0.3, 0.24, 0.06, SHIRT, 0, 0.24, 0); b.box(0.36, 0.05, 0.26, tone("#6b3a1a", "#6b3a1a", "#4f2a12"), 0, 0.24, 0); }));

  const head = new THREE.Group();
  head.position.y = 0.54;
  head.add(part((b) => {
    b.rbox(0.36, 0.32, 0.34, 0.08, SKIN, 0, 0, 0);
    b.rbox(0.4, 0.12, 0.38, 0.08, HAIR, 0, 0.27, -0.01);
    b.rbox(0.4, 0.2, 0.1, 0.04, HAIR, 0, 0.12, -0.16);
    for (const s of [-1, 1]) b.box(0.05, 0.08, 0.02, EYE, 0.075 * s, 0.12, 0.175);
  }));
  body.add(head);

  const limb = (w, len, pal, foot) => {
    const pivot = new THREE.Group();
    pivot.add(part((b) => { b.rbox(w, len, w, 0.03, pal, 0, -len, 0); if (foot) b.rbox(w + 0.02, 0.07, w + 0.06, 0.03, BOOT, 0, -len - 0.02, 0.02); }));
    return pivot;
  };
  const legs = [-1, 1].map((s) => { const l = limb(0.12, 0.2, PANTS, true); l.position.set(0.085 * s, 0.25, 0); body.add(l); return l; });
  const arms = [-1, 1].map((s) => { const a = limb(0.09, 0.22, SKIN, false); a.position.set(0.22 * s, 0.52, 0); a.rotation.z = 0.12 * s; body.add(a); return a; });

  root.scale.setScalar(scale);

  let yaw = 0;
  root.userData.animate = (actor, dt) => {
    let diff = actor.facing - yaw;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    yaw += diff * Math.min(1, dt * 14);
    root.rotation.y = yaw;
    const ph = actor.walkPhase, w = actor.moving ? 1 : 0;
    body.position.y = w * Math.abs(Math.sin(ph)) * 0.06;
    body.rotation.z = w * Math.sin(ph) * 0.05;
    legs[0].rotation.x = w * Math.sin(ph) * 0.7;
    legs[1].rotation.x = -w * Math.sin(ph) * 0.7;
    arms[0].rotation.x = -w * Math.sin(ph) * 0.8;
    arms[1].rotation.x = w * Math.sin(ph) * 0.8;
    head.rotation.z = w * Math.sin(ph * 0.5) * 0.04;
  };
  return root;
}
