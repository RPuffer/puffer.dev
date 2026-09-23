import * as THREE from "three";
const mats = new Map();
const mat = (hex) => {
  if (!mats.has(hex)) mats.set(hex, new THREE.MeshLambertMaterial({ color: hex, flatShading: true }));
  return mats.get(hex);
};

const SKIN = "#ffd9b0", SHIRT = "#ff6a5a", PANTS = "#3a4a8a", DARK = "#2a2230", HAIR = "#6b3d24";

export function buildCharacter(scale = 1) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.16, 3, 8), mat(SHIRT));
  torso.position.y = 0.36;
  body.add(torso);

  const head = new THREE.Group();
  head.position.y = 0.68;
  const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), mat(SKIN));
  head.add(skull);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.235, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.45), mat(HAIR));
  hair.rotation.x = -0.25;
  head.add(hair);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.07, 0.03), mat(DARK));
    eye.position.set(0.075 * s, -0.01, 0.2);
    head.add(eye);
  }
  body.add(head);

  const limb = (r, len, hex) => {
    const pivot = new THREE.Group();
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 2, 6), mat(hex));
    m.position.y = -len / 2 - r * 0.3;
    pivot.add(m);
    return pivot;
  };
  const legs = [-1, 1].map((s) => { const l = limb(0.075, 0.1, PANTS); l.position.set(0.085 * s, 0.22, 0); body.add(l); return l; });
  const arms = [-1, 1].map((s) => { const a = limb(0.06, 0.12, SKIN); a.position.set(0.215 * s, 0.46, 0); a.rotation.z = 0.25 * s; body.add(a); return a; });

  root.scale.setScalar(scale);
  root.traverse((o) => { if (o.isMesh) o.renderOrder = 2; });

  let yaw = 0;
  root.userData.animate = (actor, dt) => {
    let diff = actor.facing - yaw;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    yaw += diff * Math.min(1, dt * 14);
    root.rotation.y = yaw;
    const ph = actor.walkPhase, w = actor.moving ? 1 : 0;
    body.position.y = w * Math.abs(Math.sin(ph)) * 0.07;
    body.rotation.z = w * Math.sin(ph) * 0.05;
    legs[0].rotation.x = w * Math.sin(ph) * 0.7;
    legs[1].rotation.x = -w * Math.sin(ph) * 0.7;
    arms[0].rotation.x = -w * Math.sin(ph) * 0.8;
    arms[1].rotation.x = w * Math.sin(ph) * 0.8;
    head.rotation.z = w * Math.sin(ph * 0.5) * 0.04;
  };
  return root;
}
