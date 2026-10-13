import * as THREE from "three";
import { Baker, tone, bakedMaterial } from "./baker.js";
import { applyXray } from "./xray.js";
import { applyMotion } from "./motion.js";
import { ramp } from "./prims.js";
import { surfaceY, liftLevel } from "./terrain.js";
import { DIRS } from "../core/level.js";
import { BEAT } from "../core/traps/kinds.js";

const pal = (hex) => { const r = ramp(hex); return tone(r[2], r[1], r[0]); };
const C = {
  iron: "#5a5866", ironDark: "#34323c", steel: "#c9cfd8", stone: "#b9b1a6", stoneDark: "#857c72", slab: "#d6cbb8",
  bone: "#ece2c8", boneDark: "#b8aa86", wood: "#9a6436", rust: "#a8532c", brute: "#7f8f5a", bruteDark: "#55603c", hide: "#8a5a3a",
  plate: "#cfc3ad", gold: "#f0c438", ember: "#ff8a3d", crack: "#3a3036", void: "#14121a", coil: "#c46a2c", disc: "#8fa0b8", ink: "#2a1f33",
};

const mat = () => applyMotion(applyXray(bakedMaterial(), false));
function bake(build, light) {
  const B = new Baker(light);
  build(B);
  const m = new THREE.Mesh(B.geometry(), mat());
  m.userData.noMerge = true;
  return m;
}
const glowMat = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
const same = (a, b) => !!a && !!b && a[0] === b[0] && a[1] === b[1];

function spikesBase(B, k) {
  B.box(0.86, 0.03, 0.86, pal(C.ironDark), 0, 0, 0);
  for (const [x, z] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22], [0, 0]]) B.cyl(0.075, 0.035, pal(C.ink), x, 0.005, z, 6);
}
function spikeTips(B) {
  for (const [x, z] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22], [0, 0]]) B.cone(0.07, 0, 0.42, pal(C.steel), x, 0, z, 5);
}
function slab(B, w, h, col, y = 0) { B.rbox(w, h, w, 0.04, pal(col), 0, y, 0); }
function arrow(B) {
  B.box(0.03, 0.03, 0.5, pal(C.wood), 0, 0, 0);
  B.cone(0.05, 0, 0.12, pal(C.steel), 0, 0, 0.25, 4);
  B.box(0.09, 0.012, 0.08, pal(C.bone), 0, 0, -0.22);
}
function slitWall(B, n) {
  for (let i = 0; i < n; i++) {
    B.rbox(0.98, 0.5, 0.2, 0.03, pal(C.stone), i, 0, 0);
    B.box(0.5, 0.06, 0.04, pal(C.ink), i, 0.24, 0.09);
  }
}
function brute(B, part) {
  const body = pal(C.brute), dark = pal(C.bruteDark), hide = pal(C.hide), bone = pal(C.bone);
  if (part === "leg") { B.rbox(0.2, 0.5, 0.22, 0.05, dark, 0, -0.5, 0); B.rbox(0.26, 0.12, 0.34, 0.04, hide, 0, -0.58, 0.05); return; }
  B.rbox(0.2, 0.5, 0.22, 0.05, dark, -0.15, 0, 0);
  B.rbox(0.26, 0.12, 0.34, 0.04, hide, -0.15, 0, 0.05);
  B.rbox(0.62, 0.6, 0.5, 0.12, body, 0, 0.45, 0);
  B.rbox(0.66, 0.2, 0.54, 0.06, hide, 0, 0.45, 0);
  B.rbox(0.36, 0.32, 0.34, 0.08, body, 0, 1.02, 0.04);
  B.box(0.24, 0.05, 0.04, pal(C.ink), 0, 1.15, 0.21);
  for (const s of [-1, 1]) {
    B.cone(0.06, 0, 0.22, bone, s * 0.16, 1.28, 0.02, 4);
    B.rbox(0.18, 0.5, 0.18, 0.05, body, s * 0.42, 0.55, 0.04);
    B.rbox(0.2, 0.16, 0.2, 0.05, dark, s * 0.42, 0.48, 0.04);
  }
}
function chariot(B) {
  const bone = pal(C.bone), dark = pal(C.boneDark), wood = pal(C.wood), iron = pal(C.iron);
  B.rbox(0.7, 0.36, 0.6, 0.04, wood, 0, 0.32, 0);
  B.rbox(0.74, 0.08, 0.64, 0.03, iron, 0, 0.66, 0);
  B.at(0, 0.34, 0, 0, () => {
    B.rot([0, 0, 1], Math.PI / 2, 0, 0, 0);
    for (const s of [-1, 1]) { B.cyl(0.34, 0.08, iron, 0, s * 0.38, 0, 10); B.cyl(0.12, 0.1, dark, 0, s * 0.39, 0, 6); }
    B.pop();
  });
  B.rbox(0.12, 0.5, 0.12, 0.03, bone, 0, 0.7, -0.15);
  B.ball(0.15, bone, 0, 1.3, -0.15, 1, 0);
  B.box(0.18, 0.04, 0.03, pal(C.ink), 0, 1.31, -0.01);
  B.rbox(0.42, 0.3, 0.1, 0.03, dark, 0, 0.95, -0.15);
  B.box(0.08, 0.08, 0.7, wood, 0, 0.45, 0.6);
  B.ball(0.2, bone, 0, 0.6, 0.98, 0.8, 0);
  for (const s of [-1, 1]) B.cone(0.05, 0, 0.18, dark, s * 0.12, 0.72, 0.98, 4);
}
function rut(B, n) {
  for (const s of [-0.28, 0.28]) B.box(0.09, 0.012, n, pal(C.crack), s, 0, (n - 1) / 2);
}
function cracks(B, stage, seed) {
  const r = (i) => ((Math.sin(seed * 12.9 + i * 78.2) * 43758.5) % 1 + 1) % 1;
  const n = stage === 1 ? 2 : stage === 2 ? 5 : 8;
  for (let i = 0; i < n; i++) B.at((r(i) - 0.5) * 0.6, 0, (r(i + 9) - 0.5) * 0.6, r(i + 3) * Math.PI, () => B.box(0.04, 0.012, 0.22 + r(i + 5) * 0.3, pal(C.crack), 0, 0, 0));
}
function pressPlate(B, col) { B.rbox(0.66, 0.06, 0.66, 0.04, pal(col), 0, 0, 0); B.rbox(0.44, 0.02, 0.44, 0.03, pal(C.stoneDark), 0, 0.06, 0); }
function lampPost(B) { B.rbox(0.12, 0.62, 0.12, 0.03, pal(C.iron), 0, 0, 0); B.box(0.22, 0.05, 0.22, pal(C.ironDark), 0, 0.62, 0); }
function springBase(B) {
  B.box(0.8, 0.02, 0.8, pal(C.ironDark), 0, 0, 0);
  for (let i = 0; i < 4; i++) B.cyl(0.26 - (i % 2) * 0.05, 0.05, pal(C.coil), 0, 0.02 + i * 0.06, 0, 8);
}
function turntable(B) {
  B.cyl(0.46, 0.05, pal(C.disc), 0, 0, 0, 16);
  B.cyl(0.08, 0.02, pal(C.ink), 0, 0.05, 0, 8);
  for (let i = 0; i < 4; i++) B.at(0, 0.05, 0, (i * Math.PI) / 2, () => { B.box(0.06, 0.012, 0.22, pal(C.gold), 0.28, 0, 0); B.cone(0.08, 0, 0.1, pal(C.gold), 0.28, 0, 0.14, 3); });
}
function star(B) { for (let i = 0; i < 5; i++) B.at(0, 0, 0, (i * Math.PI * 2) / 5, () => B.cone(0.06, 0, 0.26, pal(C.gold), 0, 0, 0, 3)); }

export function buildTraps(state, style) {
  const L = state.level, view = state.view, light = style.light;
  const LL = liftLevel(L);
  const T = state.traps;
  const group = new THREE.Group();
  group.name = "traps";
  const items = [];
  const Y = (c) => surfaceY(LL, view, c[0], c[1]);
  const place = (m, c, dy = 0, rot = 0) => { m.position.set(c[0] + 0.5, Y(c) + dy, c[1] + 0.5); m.rotation.y = rot; group.add(m); return m; };
  const yawOf = (d) => Math.atan2(d[0], d[1]);
  const dirOf = (a, b) => [Math.sign(b[0] - a[0]), Math.sign(b[1] - a[1])];
  let fog = null, puff = null;

  for (const t of T.list) {
    const it = { t, update: null };
    if (t.kind === "t03") {
      for (const c of t.cells) place(bake((B) => spikesBase(B), light), c, 0.004);
      const tips = t.cells.map((c) => place(bake((B) => spikeTips(B), light), c, -0.44));
      it.update = () => {
        const warn = !t.disarmed && t.beat === 1 ? 0.06 * Math.max(0, Math.sin((T.time % BEAT) / BEAT * Math.PI)) : 0;
        const up = t.disarmed ? 0 : t.up;
        for (const [i, m] of tips.entries()) m.position.y = Y(t.cells[i]) - 0.44 + up * 0.44 + warn;
      };
    } else if (t.kind === "t25") {
      const d = dirOf(t.cells[0], t.cells[t.cells.length - 1]);
      const side = DIRS[t.side] || [-d[1], d[0]];
      const plate = place(bake((B) => slab(B, 0.78, 0.07, C.slab), light), t.plate, 0.0);
      const wall = bake((B) => slitWall(B, t.cells.length), light);
      const th = Math.atan2(-side[0], -side[1]), xd = [Math.cos(th), -Math.sin(th)];
      const start = t.cells.slice().sort((p, q) => (p[0] * xd[0] + p[1] * xd[1]) - (q[0] * xd[0] + q[1] * xd[1]))[0];
      wall.position.set(start[0] + 0.5 + side[0] * 0.4, Y(start), start[1] + 0.5 + side[1] * 0.4);
      wall.rotation.y = th;
      group.add(wall);
      const glow = t.cells.map((c) => { const g = new THREE.Mesh(new THREE.BoxGeometry(d[0] ? 0.5 : 0.04, 0.06, d[0] ? 0.04 : 0.5), glowMat(C.ember)); g.position.set(c[0] + 0.5 + side[0] * 0.29, Y(c) + 0.24, c[1] + 0.5 + side[1] * 0.29); group.add(g); return g; });
      const arrows = t.cells.map((c) => { const a = bake((B) => arrow(B), light); a.rotation.y = yawOf([-side[0], -side[1]]); a.position.set(c[0] + 0.5, Y(c) + 0.32, c[1] + 0.5); group.add(a); return a; });
      it.update = () => {
        plate.position.y = Y(t.plate) - (t.pressed ? 0.05 : 0);
        const tell = t.fireAt != null;
        for (const g of glow) g.visible = tell && Math.floor(T.time * 12) % 2 === 0;
        const v = t.volley;
        for (const [i, a] of arrows.entries()) {
          a.visible = v >= 0 && v < 0.45 && !same(t.cells[i], t.plate);
          const u = Math.max(0, v) / 0.35, c = t.cells[i];
          a.position.x = c[0] + 0.5 + side[0] * (0.25 - u * 1.9);
          a.position.z = c[1] + 0.5 + side[1] * (0.25 - u * 1.9);
        }
      };
    } else if (t.kind === "t02") {
      const stages = t.cells.map((c, i) => [1, 2, 3].map((s) => { const m = place(bake((B) => cracks(B, s, i + c[0] * 7 + c[1] * 3), light), c, 0.006); m.visible = false; return m; }));
      const holes = t.cells.map((c) => { const m = place(bake((B) => { B.box(0.94, 0.02, 0.94, pal(C.void), 0, 0, 0); }, light), c, 0.008); m.visible = false; return m; });
      const debris = t.cells.flatMap((c, i) => [0, 1, 2].map((j) => { const m = place(bake((B) => B.rbox(0.28, 0.12, 0.24, 0.03, pal(C.stone), 0, 0, 0), light), c, 0); m.userData.c = c; m.userData.o = [(j - 1) * 0.25, ((i + j) % 3 - 1) * 0.2]; m.visible = false; return m; }));
      let fall = -1;
      T.on((e) => { if (e.trap === t && e.type === "collapse") fall = 0; if (e.type === "reset") fall = -1; });
      it.update = (dt) => {
        const k = t.broken ? 3 : Math.min(3, t.crossings || 0);
        stages.forEach((s) => s.forEach((m, i) => { m.visible = !t.broken && k >= i + 1; }));
        for (const h of holes) h.visible = !!t.broken;
        if (fall >= 0) fall += dt;
        for (const m of debris) {
          m.visible = fall >= 0 && fall < 1.6;
          const c = m.userData.c, o = m.userData.o;
          m.position.set(c[0] + 0.5 + o[0], Y(c) - 4 * fall * fall, c[1] + 0.5 + o[1]);
          m.rotation.x = fall * 4;
        }
      };
    } else if (t.kind === "t24") {
      const face = dirOf(t.boss, t.kick);
      const body = place(bake((B) => brute(B, "body"), light), t.boss, 0, yawOf(face));
      body.scale.setScalar(1.35);
      const leg = bake((B) => brute(B, "leg"), light);
      leg.position.set(0.15, 0.5, 0);
      body.add(leg);
      const bang = new THREE.Group();
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), glowMat("#ff5a3d"));
      const dot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), glowMat("#ff5a3d"));
      bar.position.y = 0.22;
      bang.add(bar, dot);
      place(bang, t.boss, 2.1);
      const swoosh = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.62, 16, 1, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
      place(swoosh, t.kick, 0.45, yawOf(face) - Math.PI / 2);
      it.update = () => {
        const f = t.disarmed ? 0 : t.leg || 0;
        leg.rotation.x = f <= 1 ? f * 1.3 : 1.3 - (f - 1) * 3;
        const hop = t.state === "recover" ? Math.abs(Math.sin(t.timer * 8)) * 0.3 * Math.max(0, 1 - t.timer / 1.4) : 0;
        body.position.y = Y(t.boss) + hop + (t.state === "windup" ? 0.08 * f : 0);
        body.rotation.x = t.state === "windup" ? -0.25 * f : t.state === "kick" ? 0.2 : 0;
        body.rotation.z = t.state === "recover" ? Math.sin(t.timer * 8) * 0.2 : 0;
        bang.visible = t.state === "windup" && Math.floor(t.timer * 10) % 2 === 0;
        bang.rotation.y = -body.rotation.y;
        swoosh.material.opacity = t.state === "kick" ? 0.85 * (1 - t.timer / 0.25) : 0;
      };
    } else if (t.kind === "t26") {
      const d = dirOf(t.cells[0], t.cells[1]);
      const ruts = place(bake((B) => rut(B, t.cells.length), light), t.cells[0], 0.006, yawOf(d));
      const plate = place(bake((B) => pressPlate(B, C.bone), light), t.plate, 0.0);
      const car = bake((B) => chariot(B), light);
      car.rotation.y = yawOf(d);
      group.add(car);
      it.update = () => {
        plate.position.y = Y(t.plate) - (t.awake ? 0.04 : 0) + (t.awake && t.pos == null ? (Math.random() - 0.5) * 0.02 : 0);
        car.visible = t.pos != null;
        if (t.pos == null) return;
        const c0 = t.cells[0], u = t.pos;
        const end = t.cells.length - 1;
        const at = [c0[0] + d[0] * u, c0[1] + d[1] * u];
        const cl = [Math.max(0, Math.min(end, Math.round(u)))].map((i) => t.cells[i])[0];
        const over = u > end + 0.5 ? (u - end - 0.5) : 0;
        car.position.set(at[0] + 0.5, Y(cl) - over * over * 3, at[1] + 0.5);
        car.rotation.x = over * 0.8;
      };
      void ruts;
    } else if (t.kind === "t21") {
      const c = t.cells[0];
      const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.96, 1.0, 0.96)), new THREE.LineBasicMaterial({ color: "#5fe3ff", transparent: true }));
      place(box, c, 0.5);
      const pop = bake((B) => star(B), light);
      group.add(pop);
      it.update = () => {
        box.visible = !!(t.revealed || t.chalk);
        box.material.opacity = t.solid || t.disarmed ? 1 : 0.35;
        box.material.color.set(t.solid || t.disarmed ? "#5fe3ff" : "#f4efe4");
        pop.visible = t.star >= 0;
        if (pop.visible) { const s = 0.4 + t.star * 1.4; pop.scale.setScalar(s); pop.position.set(c[0] + 0.5, Y(c) + 0.9 + t.star * 0.5, c[1] + 0.5); pop.rotation.y = t.star * 6; }
      };
    } else if (t.kind === "t33") {
      fog = { t, canvas: null };
    } else if (t.kind === "t40") {
      const plates = t.plates.map((c) => place(bake((B) => pressPlate(B, C.plate), light), c, 0));
      const lamps = t.plates.map((c, i) => {
        const o = t.lamps?.[i] || [0.38, -0.38];
        const post = bake((B) => lampPost(B), light);
        post.position.set(c[0] + 0.5 + o[0], Y(c), c[1] + 0.5 + o[1]);
        group.add(post);
        const g = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), glowMat("#6b5a40"));
        g.position.set(post.position.x, post.position.y + 0.76, post.position.z);
        group.add(g);
        return g;
      });
      const on = new THREE.Color(C.gold), off = new THREE.Color("#5a4c3a"), bad = new THREE.Color("#e84a5f");
      it.update = () => {
        t.plates.forEach((c, i) => {
          plates[i].position.y = Y(c) - (t.lit?.[i] && t.show == null ? 0.04 : 0);
          lamps[i].material.color.copy(t.wrong >= 0 ? bad : t.lit?.[i] ? on : off);
          lamps[i].scale.setScalar(t.lit?.[i] ? 1.3 : 1);
        });
      };
    } else if (t.kind === "t18") {
      const c = t.cells[0];
      place(bake((B) => springBase(B), light), c, 0.002);
      const top = place(bake((B) => slab(B, 0.74, 0.06, C.slab), light), c, 0.26);
      it.update = () => {
        const b = t.boing;
        top.position.y = Y(c) + (t.spent && b < 0 ? 0.02 : b >= 0 ? 0.26 + Math.sin(Math.min(1, b / 0.25) * Math.PI) * 0.45 : 0.26);
      };
    } else if (t.kind === "t22") {
      const c = t.cells[0];
      const P = state.level, open = (dx, dz) => { const q = P.cells[c[1] + dz]?.[c[0] + dx]; return q && q.s !== "none" && q.h >= 1; };
      const across = open(1, 0) || open(-1, 0) ? [0, 1] : [1, 0];
      place(bake((B) => {
        for (const s2 of [-1, 1]) B.rbox(0.14, 2.1, 0.14, 0.03, pal(C.stoneDark), across[0] * s2 * 0.43, 0, across[1] * s2 * 0.43);
        B.rbox(across[0] ? 1.06 : 0.2, 0.16, across[0] ? 0.2 : 1.06, 0.03, pal(C.stone), 0, 2.1, 0);
      }, light), c, 0);
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: C.ink, transparent: true, opacity: 0, depthWrite: false }));
      place(shadow, c, 0.012);
      const stone = place(bake((B) => { B.rbox(0.74, 0.5, 0.74, 0.08, pal(C.stone), 0, 0, 0); B.box(0.5, 0.02, 0.5, pal(C.stoneDark), 0, 0.5, 0); }, light), c, 1.55);
      it.update = () => {
        const d = t.disarmed ? 0 : t.drop || 0;
        stone.position.y = Y(c) + 1.55 * (1 - d) + 0.01;
        shadow.material.opacity = t.disarmed ? 0 : 0.15 + 0.5 * (t.shadow || 0);
        shadow.scale.setScalar(0.6 + 0.4 * (t.shadow || 0));
      };
    } else if (t.kind === "t23") {
      const c = t.cells[0];
      const disc = place(bake((B) => turntable(B), light), c, 0.004);
      it.update = () => { disc.rotation.y = -(t.spin || 0); };
    }
    items.push(it);
  }

  if (fog) {
    const cv = document.createElement("canvas");
    cv.className = "iw-fog";
    cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:5";
    document.body.appendChild(cv);
    fog.canvas = cv;
  }

  const puffMesh = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), glowMat("#f4efe4", 0.9));
    m.userData.a = (i / 7) * Math.PI * 2;
    puffMesh.add(m);
  }
  puffMesh.visible = false;
  group.add(puffMesh);
  const offLife = state.life?.on((e) => { if (e.type === "flop") puff = { t: 0, at: [state.actor.pos.x, state.actor.y * view.tileH, state.actor.pos.z] }; });

  const v3 = new THREE.Vector3();
  return {
    group,
    update(S, dt) {
      for (const it of items) if (it.update) it.update(dt);
      if (puff) {
        puff.t += dt;
        const u = (puff.t - 0.7) / 0.6;
        puffMesh.visible = u > 0 && u < 1;
        if (puffMesh.visible) for (const m of puffMesh.children) {
          m.position.set(puff.at[0] + Math.sin(m.userData.a) * u * 0.7, puff.at[1] + 0.3 + u * 0.4, puff.at[2] + Math.cos(m.userData.a) * u * 0.7);
          m.scale.setScalar(1 + u * 1.5);
          m.material.opacity = 0.9 * (1 - u);
        }
        if (u >= 1) puff = null;
      }
    },
    render(camera, w, h) {
      if (!fog?.canvas) return;
      const cv = fog.canvas, dpr = Math.min(2, devicePixelRatio || 1);
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      const g = cv.getContext("2d");
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = "source-over";
      g.clearRect(0, 0, cv.width, cv.height);
      const thick = fog.t.disarmed ? 0 : fog.t.thick ?? 1;
      cv.style.display = thick < 0.01 ? "none" : "";
      if (thick < 0.01) return;
      g.fillStyle = `rgba(214,220,226,${(0.94 * thick).toFixed(3)})`;
      g.fillRect(0, 0, cv.width, cv.height);
      g.globalCompositeOperation = "destination-out";
      const proj = (x, y, z) => { v3.set(x, y, z).project(camera); return [(v3.x + 1) / 2 * cv.width, (1 - v3.y) / 2 * cv.height]; };
      const cellPx = (() => { const a = proj(0, 0, 0), b = proj(1, 0, 0); return Math.hypot(b[0] - a[0], b[1] - a[1]); })();
      const hole = (p, r, soft = 0.45) => {
        const gr = g.createRadialGradient(p[0], p[1], r * (1 - soft), p[0], p[1], r);
        gr.addColorStop(0, "rgba(0,0,0,1)");
        gr.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = gr;
        g.beginPath();
        g.arc(p[0], p[1], r, 0, Math.PI * 2);
        g.fill();
      };
      const a = state.actor;
      hole(proj(a.pos.x, a.y * view.tileH + 0.4, a.pos.z), cellPx * 3.2);
      for (const q of state.things?.things || []) {
        if (q.kind === "bonfire") hole(proj(q.x + 0.5, Y([q.x, q.z]) + 0.3, q.z + 0.5), cellPx * (q.state === "lit" ? 3.2 : 0.9));
        else if (q.kind === "watcher") hole(proj(q.x + q.size[0] / 2, Y([q.x, q.z]) + 1.5, q.z + q.size[1] / 2), cellPx * 1.6, 0.7);
        else if (q.kind === "elevator") hole(proj(q.x + 0.5, Y([q.x, q.z]) + 0.4, q.z + 0.5), cellPx * 0.8, 0.7);
      }
      for (const d of L.decor || []) if (/waymark|lamp|lantern/.test(d.t)) hole(proj(d.x + 0.5, Y([d.x, d.z]) + 1, d.z + 0.5), cellPx * 0.7, 0.8);
    },
    dispose() {
      offLife?.();
      fog?.canvas?.remove();
    },
  };
}

export function heroFx(hero, a, view, base) {
  const fx = a.fx;
  hero.rotation.x = 0;
  hero.rotation.z = 0;
  hero.scale.setScalar(base);
  if (!fx) return;
  const u = Math.min(1, fx.t / fx.dur);
  if (fx.kind === "hop") { hero.position.y += (fx.lift || 0) * view.tileH; return; }
  if (fx.kind === "knock") {
    const [dx, dz] = fx.dir || [0, 0];
    const push = Math.min(u * 3, 1) * 1.6 + u * 1.2;
    hero.position.x = fx.from[0] + dx * push;
    hero.position.z = fx.from[1] + dz * push;
    hero.position.y += Math.sin(Math.min(1, u * 3) * Math.PI) * 0.5 - Math.pow(Math.max(0, u - 0.2), 2) * 26;
    hero.rotation.z = Math.sin(u * 40) * 0.6;
    hero.rotation.x = u * 3;
    return;
  }
  if (fx.kind === "flop") {
    hero.rotation.x = -Math.min(1, u * 4) * Math.PI / 2;
    hero.scale.setScalar(base * (u < 0.55 ? 1 : Math.max(0.001, 1 - (u - 0.55) / 0.2)));
  }
}
