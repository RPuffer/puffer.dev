import * as THREE from "three";
import { Baker, bakedMaterial } from "./baker.js";
import { HERO } from "./palette.js";
import { kit, audit } from "./prims.js";
import { buildClips, toClip, CLIP_DATA, REST, JOINTS } from "./clips.js";
import { HEROES } from "./heroes.js";
import { motion } from "./motion.js";

const baseOf = (v) => (Array.isArray(v) ? v[0] : v?.top || v);
const mat = bakedMaterial();
const D = Math.PI / 180;
const FADE = 0.2;

export const JOINT_TREE = {
  hips: [null, [0, 0.3, 0]],
  torso: ["hips", [0, 0.36, 0]],
  head: ["torso", [0, 0.55, 0]],
  hair: ["head", [0, 0.55, 0]],
  eyes: ["head", [0, 0.55, 0]],
  brow: ["head", [0, 0.55, 0]],
  mouth: ["head", [0, 0.55, 0]],
  upperArmL: ["torso", [-0.21, 0.52, 0]],
  lowerArmL: ["upperArmL", [-0.215, 0.42, 0]],
  handL: ["lowerArmL", [-0.215, 0.33, 0]],
  upperArmR: ["torso", [0.21, 0.52, 0]],
  lowerArmR: ["upperArmR", [0.215, 0.42, 0]],
  handR: ["lowerArmR", [0.215, 0.33, 0]],
  upperLegL: ["hips", [-0.085, 0.29, 0]],
  lowerLegL: ["upperLegL", [-0.085, 0.19, 0]],
  footL: ["lowerLegL", [-0.085, 0.09, 0]],
  upperLegR: ["hips", [0.085, 0.29, 0]],
  lowerLegR: ["upperLegR", [0.085, 0.19, 0]],
  footR: ["lowerLegR", [0.085, 0.09, 0]],
};

export function heroSpec(style = null) {
  const H = { ...HERO, ...(style?.hero || {}) };
  const c = Object.fromEntries(Object.entries(H).map(([k, v]) => [k, baseOf(v)]));
  const side = (s, n) => [
    { id: `foot${n}`, prim: "rbox", dims: [0.13, 0.07, 0.14], at: [0.085 * s, 0.02, 0.025], base: c.boot },
    { id: `lowerLeg${n}`, prim: "rbox", dims: [0.105, 0.11, 0.105], at: [0.085 * s, 0.085, 0], base: c.pants },
    { id: `upperLeg${n}`, prim: "rbox", dims: [0.115, 0.1, 0.115], at: [0.085 * s, 0.19, 0], base: c.pants },
    { id: `upperArm${n}`, prim: "rbox", dims: [0.085, 0.11, 0.085], at: [0.215 * s, 0.42, 0], base: c.shirt },
    { id: `lowerArm${n}`, prim: "rbox", dims: [0.075, 0.09, 0.075], at: [0.215 * s, 0.33, 0], base: c.skin },
    { id: `hand${n}`, prim: "rbox", dims: [0.085, 0.075, 0.085], at: [0.215 * s, 0.255, 0], base: c.hand },
  ];
  return {
    name: "hero",
    parts: [
      ...side(-1, "L"),
      ...side(1, "R"),
      { id: "hips", prim: "chain", base: c.pants, at: [0, 0.26, 0], links: [{ prim: "rbox", dims: [0.3, 0.08, 0.22], at: [0, 0, 0] }, { prim: "box", dims: [0.32, 0.04, 0.24], at: [0, 0.06, 0], base: c.belt }] },
      { id: "torso", prim: "rbox", dims: [0.32, 0.2, 0.22], at: [0, 0.35, 0], base: c.shirt },
      { id: "head", role: "head", prim: "rbox", dims: [0.36, 0.34, 0.34], at: [0, 0.55, 0], base: c.skin },
      { id: "hair", prim: "chain", base: c.hair, at: [0, 0.55, 0], links: [{ prim: "rbox", dims: [0.4, 0.12, 0.38], at: [0, 0.26, -0.01] }, { prim: "rbox", dims: [0.4, 0.2, 0.1], at: [0, 0.11, -0.16] }] },
      { id: "eyes", face: true, prim: "chain", base: c.eye, at: [0, 0.55, 0], links: [-1, 1].map((s) => ({ prim: "box", dims: [0.05, 0.08, 0.02], at: [0.075 * s, 0.1, 0.175] })) },
      { id: "brow", face: true, prim: "chain", base: c.hair, at: [0, 0.55, 0], links: [-1, 1].map((s) => ({ prim: "box", dims: [0.07, 0.022, 0.02], at: [0.075 * s, 0.2, 0.175] })) },
      { id: "mouth", face: true, prim: "box", dims: [0.07, 0.024, 0.02], at: [0, 0.6, 0.175], base: c.mouth },
    ],
  };
}

const ARGC = { rbox: 3, box: 3, wedge: 3, spike: 3, cyl: 2, disc: 2, cone: 3, taper: 5 };
const E = new THREE.Euler(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), ONE = new THREE.Vector3(1, 1, 1);

function drawPart(K, p) {
  const B = K.B;
  const draw = (l, base, x, y, z) => {
    const n = ARGC[l.prim];
    B.pushMatrix(new THREE.Matrix4().compose(P.set(x, y, z), Q.setFromEuler(E.set(l.rx || 0, l.ry || 0, l.rz || 0, "YXZ")), ONE));
    K[l.prim](...l.dims.slice(0, n), base, 0, 0, 0, ...l.dims.slice(n));
    B.pop();
  };
  if (p.prim === "chain") for (const l of p.links) draw({ prim: "rbox", ...l }, l.base || p.base, p.at[0] + l.at[0], p.at[1] + l.at[1], p.at[2] + l.at[2]);
  else draw(p, p.base, ...p.at);
}

export function classSpec(cls) {
  const make = HEROES[cls];
  return make ? make() : null;
}

export function buildCharacter(scale = 1, style = null, cls = null) {
  const custom = classSpec(cls);
  const spec = custom || heroSpec(style);
  const tree = { ...JOINT_TREE, ...(custom?.tree || {}) };
  const report = audit(spec);
  if (!report.ok) throw new Error(`hero ${spec.name}: ${report.errors.join("; ")}`);
  const root = new THREE.Group();
  root.name = "hero";
  root.userData.heroClass = custom ? cls : null;
  const joints = {};
  for (const [id, [parent, pivot]] of Object.entries(tree)) {
    const g = new THREE.Group();
    g.name = id;
    const pp = parent ? tree[parent][1] : [0, 0, 0];
    g.position.set(pivot[0] - pp[0], pivot[1] - pp[1], pivot[2] - pp[2]);
    const r = REST[id];
    if (r) g.rotation.set(r[0] * D, r[1] * D, r[2] * D);
    (parent ? joints[parent] : root).add(g);
    joints[id] = g;
  }
  const moving = new Set([...JOINTS, ...Object.keys(REST), ...Object.values(custom?.clips || {}).flatMap((c) => Object.keys(c.tracks).map((k) => k.split(".")[0]))]);
  const host = (j) => { while (j && !moving.has(j)) j = tree[j][0]; return j; };
  const groups = new Map();
  for (const p of spec.parts) {
    const j = host(p.joint || p.id), key = `${j}|${p.blink || ""}`;
    if (!groups.has(key)) groups.set(key, { j, blink: p.blink, parts: [] });
    groups.get(key).parts.push(p);
  }
  const blinks = [];
  for (const { j, blink: bl, parts } of groups.values()) {
    const B = new Baker(style?.light || null);
    const K = kit(B, { light: style?.light || null });
    for (const p of parts) drawPart(K, p);
    const m = new THREE.Mesh(B.geometry(), mat);
    m.renderOrder = 2;
    m.name = j || "root";
    const pivot = j ? tree[j][1] : [0, 0, 0];
    m.position.set(-pivot[0], -pivot[1], -pivot[2]);
    (j ? joints[j] : root).add(m);
    if (bl) blinks.push([m, ...bl]);
  }
  const blink = () => { const t = motion.uTime.value; for (const [m, hz, ph, duty] of blinks) m.visible = (((t * hz + ph) % 1) + 1) % 1 < duty; };
  root.scale.setScalar(scale);

  const mixer = new THREE.AnimationMixer(root);
  const rest = { hips: joints.hips.position.toArray() };
  const clips = buildClips(rest);
  const k = custom?.armSpread;
  if (k) for (const [n, c] of Object.entries(CLIP_DATA)) {
    const tracks = Object.fromEntries(Object.entries(c.tracks).map(([key, keys]) => [key, /^upperArm[LR]\.quaternion$/.test(key) ? keys.map(([t, x, y, z]) => [t, x, y, z * k]) : keys]));
    clips[n] = toClip({ ...c, tracks }, rest);
  }
  for (const [n, c] of Object.entries(custom?.clips || {})) clips[n] = toClip(c, rest, Object.keys(tree));
  const actions = {};
  for (const [name, clip] of Object.entries(clips)) {
    const a = mixer.clipAction(clip);
    a.setLoop(clip.userData.loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    a.clampWhenFinished = !clip.userData.loop;
    actions[name] = a;
  }
  actions.walk.timeScale = 0;
  const q = typeof location !== "undefined" ? new URLSearchParams(location.search).get("clip") : null;
  const forced = q && actions[q] ? q : null;
  if (forced) actions[forced].setLoop(THREE.LoopRepeat, Infinity);
  let cur = null, oneShot = null, yaw = 0;
  mixer.addEventListener("finished", (e) => { if (e.action === actions.land && oneShot === "land") oneShot = null; });

  const go = (name, fade) => {
    const next = actions[name];
    if (cur === next) return;
    next.reset();
    next.play();
    if (cur && fade > 0) cur.crossFadeTo(next, fade, false);
    else if (cur) cur.stop();
    cur = next;
  };
  go(forced || "idle", 0);
  mixer.update(0);
  blink();

  root.userData.mixer = mixer;
  root.userData.actions = actions;
  root.userData.joints = joints;
  root.userData.audit = report;
  root.userData.clip = () => cur?.getClip().name || null;
  root.userData.play = (name, { fade, at } = {}) => {
    if (!actions[name] || forced) return false;
    oneShot = name;
    go(name, fade ?? (motion.auto ? FADE : 0));
    if (at != null) { actions[name].time = Math.min(at, actions[name].getClip().duration); mixer.update(0); }
    return true;
  };
  root.userData.pose = (name, t) => {
    mixer.stopAllAction();
    cur = null;
    go(name, 0);
    actions[name].time = t;
    mixer.update(0);
    blink();
  };
  root.userData.animate = (actor, dt) => {
    let diff = actor.facing - yaw;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    yaw += diff * Math.min(1, dt * 14);
    root.rotation.y = yaw;
    if (actor.moving) oneShot = null;
    const want = forced || (actor.moving ? "walk" : oneShot || "idle");
    const live = motion.auto;
    go(want, live ? FADE : 0);
    if (actor.moving) actions.walk.time = (((actor.walkPhase / (Math.PI * 2)) % 1) + 1) % 1 * actions.walk.getClip().duration;
    if (!live && cur !== actions.walk) {
      const d = cur.getClip().duration, t = motion.uTime.value;
      cur.time = cur.loop === THREE.LoopOnce ? Math.min(t, d) : t % d;
      mixer.update(0);
    } else mixer.update(dt);
    blink();
  };
  return root;
}
