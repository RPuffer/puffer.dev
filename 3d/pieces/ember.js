import * as THREE from "three";
import { Baker, tone, circle, bakedMaterial } from "../baker.js";

const HOT = {
  coal: ["#2e1a10", "#24140b", "#170c06"],
  soot: ["#42210c", "#361a09", "#261209"],
  hide: ["#8e3a1a", "#742e14", "#5a220d"],
  rust: ["#b0521f", "#933f16", "#733010"],
  brow: ["#724012", "#5c320d", "#452509"],
  horn: ["#7a5530", "#5e3f22", "#432c16"],
  hornDark: ["#5a3c1e", "#452d16", "#30200f"],
  skull: ["#a6601c", "#8a4c14", "#6c3a0e"],
  hornTip: ["#c7a46a", "#a8854e", "#836434"],
  red: ["#e2461c", "#c13612", "#98280b"],
  orange: ["#ff8824", "#e86c10", "#c4560a"],
  amber: ["#f7aa2d", "#e08e18", "#bb7010"],
  yellow: ["#fec632", "#eeae1a", "#cf9010"],
  pale: ["#fff0a8", "#ffde70", "#f4c448"],
  bone: ["#f0d4ad", "#d9b98e", "#b89770"],
  ink: ["#140a05", "#100804", "#0a0502"],
};
const pal = (c) => tone(c[0], c[1], c[2]);
const mesh = (B) => new THREE.Mesh(B.geometry(), bakedMaterial());
const tonesOf = (P, t) => P.tones?.[t] || [];
const pick = (list, i, d) => list[i] || list[list.length - 1] || d;

function wedge(B, w, h, d, c, x = 0, y = 0, z = 0) {
  const x0 = x - w / 2, x1 = x + w / 2, zb = z - d / 2, zf = z + d / 2;
  const p = pal(c);
  B.quad([x0, y, zf], [x1, y, zf], [x1, y + h, zb], [x0, y + h, zb], p);
  B.quad([x0, y, zb], [x0, y + h, zb], [x1, y + h, zb], [x1, y, zb], p);
  B.tri([x0, y, zb], [x0, y, zf], [x0, y + h, zb], p);
  B.tri([x1, y, zb], [x1, y + h, zb], [x1, y, zf], p);
}

function plinth(B, r, h, lo, hi) {
  B.prism(circle(0, 0, r, r, 8, Math.PI / 8), 0, h * 0.55, pal(lo));
  B.prism(circle(0, 0, r * 0.86, r * 0.86, 8, Math.PI / 8), h * 0.55, h, pal(hi));
}

function tongue(B, r, h, c, x, y, z, lean = 0) {
  if (!lean) return B.cone(r, 0, h, pal(c), x, y, z, 4);
  B.rot([0, 0, 1], lean, x, y, z);
  B.cone(r, 0, h, pal(c), 0, 0, 0, 4);
  B.pop();
}

function horn(B, side) {
  const segs = [[0.5, 0.62, 0.26, 0.24, 0.4, HOT.horn], [0.7, 0.62, 0.24, 0.22, -0.3, HOT.horn], [0.84, 0.46, 0.2, 0.22, -0.9, HOT.hornDark], [0.86, 0.24, 0.17, 0.2, -1.4, HOT.hornDark]];
  for (const [x, y, w, h, a, c] of segs) {
    B.rot([0, 0, 1], side * a, side * x, y, -0.02);
    B.box(w, h, w, pal(c), 0, -h / 2, 0);
    B.pop();
  }
  B.rot([0, 0, 1], side * -2.7, side * 0.8, 0.14, -0.02);
  B.cone(0.08, 0, 0.2, pal(HOT.hornTip), 0, 0, 0, 4);
  B.pop();
}

const POSE = {
  rest: { tiers: 0, yaw: 0.38, pitch: 0, hz: 0.02, hy: 0, skull: 1, tongue: false },
  rigid: { tiers: 2, yaw: 0.38, pitch: 0, hz: 0, hy: 0.06, skull: 1, tongue: false },
  lean: { tiers: 0, yaw: 0.38, pitch: 0.5, hz: 0.22, hy: -0.1, skull: 1, tongue: false },
  maw: { tiers: 1, yaw: 0.38, pitch: 0.15, hz: 0.04, hy: 0, skull: 1.18, tongue: true },
};

function spirit(B, H, look, v, pose = "rest") {
  const Q = POSE[pose] || POSE.rest;
  const s = H / 2.6;
  B.push(0, 0, 0, 0, s);
  plinth(B, 0.94, 0.2, look.plinthLo, look.plinthHi);
  let lift = 0;
  for (let i = 0; i < Q.tiers; i++) {
    const r = 0.86 - i * 0.12;
    B.prism(circle(0, 0, r, r, 8, Math.PI / 8), 0.2 + lift, 0.36 + lift, pal(i % 2 ? HOT.coal : HOT.soot));
    B.box(r * 1.1, 0.04, 0.06, pal(HOT.orange), 0, 0.3 + lift, r * 0.92);
    lift += 0.16;
  }
  B.push(0, lift, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3;
    B.box(0.14, 0.08, 0.14, pal(i % 2 ? HOT.orange : HOT.yellow), Math.cos(a) * 0.7, 0.2, Math.sin(a) * 0.7);
  }
  const y0 = 0.2;
  B.at(0, y0, 0.06, 0.18, () => {
    B.push(0, 0, 0, 0, Q.skull);
    if (Q.tongue) {
      B.ball(0.16, pal(HOT.pale), 0, 0.02, 0.42, 1.4);
      B.cone(0.12, 0, 0.3, pal(HOT.yellow), 0, 0.12, 0.42, 5);
      B.box(0.34, 0.06, 0.3, pal(HOT.red), 0, -0.1, 0.34);
    }
    B.rbox(0.62, 0.3, 0.5, 0.06, pal(HOT.brow), 0, 0, 0.02);
    B.box(0.26, 0.34, 0.2, pal(HOT.pale), 0, 0.02, 0.26);
    B.box(0.16, 0.14, 0.1, pal(HOT.yellow), 0, 0, 0.4);
    for (const x of [-0.24, -0.1, 0.1, 0.24]) B.cone(0.045, 0, 0.14, pal(HOT.bone), x, 0.3, 0.24, 4);
    for (const x of [-0.2, 0.2]) B.cone(0.04, 0, 0.12, pal(HOT.bone), x, 0.02, 0.26, 4);
    B.rbox(0.9, 0.46, 0.7, 0.1, pal(HOT.skull), 0, 0.3, -0.04);
    B.box(0.7, 0.1, 0.12, pal(HOT.brow), 0, 0.3, 0.3);
    for (const x of [-0.2, 0.2]) {
      B.box(0.24, 0.18, 0.06, pal(HOT.ink), x, 0.46, 0.31);
      B.box(0.12, 0.08, 0.05, pal(HOT.yellow), x, 0.5, 0.34);
    }
    B.box(0.12, 0.12, 0.08, pal(HOT.ink), 0, 0.36, 0.33);
    wedge(B, 0.8, 0.14, 0.18, HOT.rust, 0, 0.66, 0.28);
    horn(B, -1);
    horn(B, 1);
    B.pop();
  });
  const fy = 0.96;
  B.cyl(0.5, 0.12, pal(HOT.red), 0, fy, 0.02, 7);
  B.cone(0.56, 0.3, 0.36, pal(HOT.orange), 0, fy + 0.12, 0.02, 7);
  for (const [x, z, r, h, c, l] of [[-0.5, 0.12, 0.13, 0.5, HOT.orange, 0.4], [0.5, 0.1, 0.13, 0.54, HOT.amber, -0.4], [-0.34, -0.28, 0.11, 0.56, HOT.red, 0.25], [0.34, -0.26, 0.11, 0.5, HOT.orange, -0.25], [-0.26, 0.36, 0.11, 0.4, HOT.yellow, 0.3], [0.28, 0.34, 0.11, 0.44, HOT.amber, -0.3], [0, -0.36, 0.12, 0.6, HOT.red, 0]]) tongue(B, r, h, c, x, fy + 0.06, z, l);
  B.cone(0.38, 0.18, 0.4, pal(HOT.amber), 0, fy + 0.48, 0.02, 7);
  B.box(0.3, 0.84, 0.26, pal(HOT.yellow), 0, fy + 0.26, 0.1);
  B.box(0.16, 0.84, 0.12, pal(HOT.pale), 0, fy + 0.28, 0.22);
  for (const [x, y, c] of [[-0.22, 1.3, HOT.orange], [0.22, 1.26, HOT.amber]]) tongue(B, 0.1, 0.32, c, x, y, 0.16, -x);
  const hy = fy + 1.02 + Q.hy;
  B.rot([1, 0, 0], Q.pitch, 0, hy, Q.hz);
  B.at(0, 0, 0, Q.yaw + (v % 2) * 0.08, () => {
    B.rbox(0.36, 0.3, 0.32, 0.05, pal(HOT.hide), 0, -0.26, -0.06);
    B.rbox(0.6, 0.4, 0.52, 0.08, pal(HOT.hide), 0, 0, -0.04);
    B.box(0.42, 0.12, 0.34, pal(HOT.rust), 0, 0.0, 0.3);
    B.box(0.2, 0.12, 0.16, pal(HOT.pale), 0, 0.0, 0.34);
    wedge(B, 0.4, 0.18, 0.36, HOT.rust, 0, 0.12, 0.3);
    B.box(0.3, 0.06, 0.08, pal(HOT.bone), 0, 0.1, 0.44);
    for (const x of [-0.15, 0.15]) {
      B.box(0.14, 0.06, 0.05, pal(HOT.yellow), x, 0.26, 0.21);
      B.box(0.04, 0.06, 0.03, pal(HOT.ink), x, 0.26, 0.24);
      wedge(B, 0.18, 0.07, 0.12, HOT.brow, x, 0.32, 0.18);
    }
    for (const [x, z, h, c, l] of [[0, -0.1, 0.62, HOT.hide, 0], [-0.16, -0.04, 0.5, HOT.rust, 0.3], [0.16, -0.04, 0.5, HOT.hide, -0.3], [-0.3, -0.12, 0.4, HOT.brow, 0.65], [0.3, -0.12, 0.4, HOT.rust, -0.65], [0, -0.28, 0.44, HOT.brow, 0], [-0.3, 0.08, 0.24, HOT.brow, 1.1], [0.3, 0.08, 0.24, HOT.brow, -1.1]]) tongue(B, 0.09, h, c, x, 0.34, z, l);
  });
  B.pop();
  B.pop();
  B.pop();
}

const ROLE_RE = [["threshold", /gate|arch|torii|threshold|portal/i], ["dais", /dais|altar|plinth|pedestal|roost|perch|throne|nest/i], ["light", /lantern|torch|brazier|lamp/i], ["offering", /pot|basket|bowl|offering|chest|cairn|urn/i], ["mass", /tree|pine|spire|pillar|monolith|rock|cliff|totem/i]];
const roleOf = (P, t) => P.props?.[t]?.role || (ROLE_RE.find(([, re]) => re.test(t)) || ["detail"])[0];
const poseOf = (p = "") => /lean|over the|feeding|igniting/i.test(p) ? "lean" : /jaw|grimac|tongue|parted/i.test(p) ? "maw" : /rigid|erect|hieratic|unmoving/i.test(p) ? "rigid" : "rest";

const LENS_KINDS = [
  ["hornMono", /horn/i],
  ["flick", /flick|tongue|flame_flick/i],
  ["jet", /jet|pillar|stream/i],
  ["fin", /fin|crest|blade|scale/i],
  ["bones", /bone|pile|calcined_b|ossuary/i],
  ["rib", /rib|fang|arch/i],
  ["vent", /vent|fissure|brazier|slag/i],
];
const lensKind = (t, role) => role === "lead" || role === "creature" ? null : (LENS_KINDS.find(([, re]) => re.test(t)) || [null])[0];

function beam(B, d, y, th, c, reach = 1.0) {
  if (!d.side) return;
  if (d.axis === "x") B.box(0.22, th, reach + 0.3, pal(c), 0, y, -d.side * (reach / 2 - 0.05));
  else B.box(reach + 0.3, th, 0.22, pal(c), -d.side * (reach / 2 - 0.05), y, 0);
}

function hornArc(B, H, side, lo, hi) {
  B.push(0, 0, 0, Math.PI / 4);
  const k = H / 1.8, R0 = 0.44 * k, cy = 0.2 + 0.62 * k, cx = side * 0.16;
  B.box(0.36, cy - 0.2, 0.36, pal(lo), cx - side * R0, 0.2, 0);
  const n = 10;
  let prev = [cx - side * R0, cy];
  for (let i = 1; i <= n; i++) {
    const t = i / n, th = Math.PI - t * Math.PI * 1.45, r = R0 * (1 - 0.42 * t);
    const p = [cx + side * r * Math.cos(th), cy + r * Math.sin(th)];
    const mx = (p[0] + prev[0]) / 2, my = (p[1] + prev[1]) / 2;
    const len = Math.hypot(p[0] - prev[0], p[1] - prev[1]) + 0.06;
    const w = 0.36 - 0.24 * t;
    B.rot([0, 0, 1], Math.atan2(p[1] - prev[1], p[0] - prev[0]), mx, my, 0);
    B.box(len, w, w, pal(i % 2 ? hi : lo), 0, -w / 2, 0);
    if (i % 3 === 0) B.box(0.04, w + 0.03, w + 0.03, pal(HOT.hornTip), len / 2 - 0.02, -w / 2 - 0.015, 0);
    B.pop();
    prev = p;
  }
  B.cone(0.07, 0, 0.18, pal(HOT.hornTip), prev[0], prev[1] - 0.14, 0, 4);
  B.pop();
}

function flames(B, spots) {
  B.sway("flame", { amp: 0.04, span: Math.max(...spots.map((s) => s[3])) }, () => {
    for (const [x, z, r, h, c, l] of spots) tongue(B, r, h, c, x, 0, z, l);
  });
}

const LENS_BUILD = {
  hornMono(B, H, v, { role, d }) {
    const side = v % 2 ? -1 : 1;
    if (role === "threshold") {
      const ph = H * 0.62;
      B.box(0.5, 0.2, 0.5, pal(HOT.coal));
      B.box(0.34, ph * 0.5, 0.34, pal(HOT.hornDark), 0, 0.2, 0);
      B.box(0.3, ph * 0.5, 0.3, pal(HOT.horn), 0, 0.2 + ph * 0.5, 0);
      B.box(0.4, 0.1, 0.4, pal(HOT.orange), 0, 0.2 + ph, 0);
      B.push(0, ph - 0.12, 0, 0, 0.8);
      hornArc(B, 1.8, (d.side || side) * -1, HOT.horn, HOT.hornDark);
      B.pop();
      beam(B, d, ph + 0.02, 0.16, HOT.hornDark);
      beam(B, d, ph + 0.18, 0.08, HOT.amber);
      return;
    }
    B.rbox(0.72, 0.2, 0.62, 0.08, pal(HOT.coal), 0, 0, 0);
    B.box(0.5, 0.1, 0.44, pal(HOT.soot), 0, 0.2, 0);
    hornArc(B, H, side, HOT.horn, HOT.hornDark);
    B.box(0.2, 0.06, 0.2, pal(HOT.orange), side * 0.2, 0.2, 0.22);
  },
  flick(B, H, v, { role, d }) {
    if (role === "threshold") {
      B.box(0.48, 0.2, 0.48, pal(HOT.coal));
      B.box(0.3, H * 0.5, 0.3, pal(HOT.soot), 0, 0.2, 0);
      B.box(0.36, 0.08, 0.36, pal(HOT.orange), 0, 0.2 + H * 0.5, 0);
      B.push(0, 0.28 + H * 0.5, 0);
      flames(B, [[0, 0, 0.18, H * 0.42, HOT.orange, 0], [-0.1, 0.06, 0.1, H * 0.3, HOT.red, 0.35], [0.1, -0.04, 0.1, H * 0.34, HOT.amber, -0.35], [0.02, 0.1, 0.08, H * 0.26, HOT.yellow, 0]]);
      B.pop();
      beam(B, d, H * 0.62, 0.14, HOT.soot);
      beam(B, d, H * 0.62 + 0.14, 0.08, HOT.orange);
      return;
    }
    B.rbox(0.66, 0.14, 0.6, 0.08, pal(HOT.coal), 0, 0, 0);
    B.cyl(0.26, 0.06, pal(HOT.red), 0, 0.14, 0, 7);
    B.push(0, 0.16, 0);
    const k = v % 2 ? -1 : 1;
    flames(B, [[0, 0, 0.2, H * 0.8, HOT.orange, 0.12 * k], [-0.2, 0.08, 0.13, H * 0.55, HOT.red, 0.5], [0.2, -0.04, 0.14, H * 0.62, HOT.amber, -0.45], [0.08, 0.16, 0.1, H * 0.46, HOT.yellow, -0.2], [-0.1, -0.16, 0.12, H * 0.5, HOT.red, 0.3], [0.02, 0.06, 0.08, H * 0.36, HOT.pale, 0]]);
    B.pop();
  },
  jet(B, H, v) {
    B.cyl(0.32, 0.08, pal(HOT.coal), 0, 0, 0, 8);
    B.cyl(0.24, 0.05, pal(HOT.red), 0, 0.08, 0, 8);
    const st = [[0.34, HOT.red], [0.28, HOT.orange], [0.22, HOT.amber], [0.16, HOT.yellow], [0.1, HOT.pale]];
    const hh = (H - 0.1) / st.length;
    st.forEach(([r, c], i) => B.cone(r, r * 0.35, hh * 1.25, pal(c), (i % 2 ? 0.02 : -0.02) * (v % 2 ? -1 : 1), 0.1 + i * hh, 0, 6));
  },
  fin(B, H, v, { role, d }) {
    B.rbox(0.66, 0.18, 0.56, 0.08, pal(HOT.coal), 0, 0, 0);
    const cs = [HOT.hide, HOT.rust, HOT.brow];
    const k = v % 2 ? 0.08 : -0.08;
    let y = 0.18;
    [[0.5, 0.62], [0.42, 0.54], [0.32, 0.46]].forEach(([dd, hh], i) => {
      const h = hh * (H - 0.18) / 1.6;
      wedge(B, 0.18, h, dd, cs[i], k * i, y, -0.04 * i);
      wedge(B, 0.2, h * 0.3, dd * 0.4, HOT.orange, k * i, y, dd * 0.25 - 0.04 * i);
      y += h * 0.62;
    });
    B.cone(0.08, 0, 0.26, pal(HOT.hornTip), k * 3, y, -0.14, 4);
    if (role === "threshold") beam(B, d, H * 0.66, 0.16, HOT.hide);
  },
  bones(B, H, v) {
    B.rbox(0.8, 0.1, 0.68, 0.08, pal(HOT.coal), 0, 0, 0);
    const k = v % 2 ? -1 : 1;
    for (const [x, z, a, l] of [[-0.1, 0.1, 0.5, 0.62], [0.12, -0.08, -0.7, 0.56], [0, -0.2, 1.4, 0.5], [0.2, 0.16, 0.2, 0.4]]) {
      B.at(x * k, 0.1, z, a * k, () => {
        B.box(l, 0.1, 0.1, pal(HOT.bone), 0, 0, 0);
        for (const e of [-1, 1]) B.box(0.14, 0.14, 0.16, pal(HOT.bone), e * l / 2, 0, 0);
      });
    }
    B.at(-0.14 * k, 0.2, 0.02, 0.4 * k, () => {
      B.rbox(0.34, 0.26, 0.3, 0.08, pal(HOT.bone), 0, 0, 0);
      for (const x of [-0.07, 0.07]) B.box(0.08, 0.08, 0.04, pal(HOT.ink), x, 0.12, 0.14);
      B.box(0.2, 0.06, 0.04, pal(HOT.orange), 0, 0.03, 0.15);
    });
    B.box(0.12, 0.08, 0.12, pal(HOT.amber), 0.24 * k, 0.1, -0.2);
  },
  rib(B, H, v) {
    B.rbox(0.74, 0.16, 0.5, 0.08, pal(HOT.coal), 0, 0, 0);
    for (const z of [-0.14, 0.08]) for (const s of [-1, 1]) {
      let x = s * 0.28, y = 0.16;
      [[0.12, 0.34, 0.1], [0.1, 0.3, 0.35], [0.08, 0.26, 0.7], [0.06, 0.22, 1.1]].forEach(([w, h, a]) => {
        B.rot([0, 0, 1], s * a, x, y, z);
        B.box(w, h * H / 1.4, w, pal(HOT.bone), 0, 0, 0);
        B.pop();
        x -= s * Math.sin(a) * h * H / 1.4;
        y += Math.cos(a) * h * H / 1.4;
      });
    }
    B.box(0.16, 0.12, 0.3, pal(HOT.orange), 0, 0.16, -0.03);
  },
  vent(B, H, v) {
    B.prism(circle(0, 0, 0.46, 0.4, 7, 0.2), 0, 0.24, pal(HOT.coal));
    B.prism(circle(0, 0, 0.34, 0.3, 7, 0.2), 0.24, 0.3, pal(HOT.soot));
    B.sway("swatch", { rate: 0.35, duty: 0.5, root: [0, 0.26, 0], alt: pal(HOT.pale) }, () => B.cyl(0.26, 0.06, pal(HOT.yellow), 0, 0.26, 0, 7));
    B.sway("swatch", { rate: 0.35, duty: 0.5, root: [0, 0.26, 0], alt: pal(HOT.yellow) }, () => B.cyl(0.14, 0.04, pal(HOT.pale), 0, 0.3, 0, 7));
    B.push(0, 0.3, 0);
    flames(B, [[0, 0, 0.16, Math.max(0.3, H - 0.4), HOT.orange, 0], [-0.14, 0.06, 0.08, Math.max(0.2, H - 0.6), HOT.amber, 0.3], [0.14, -0.04, 0.08, Math.max(0.2, H - 0.7), HOT.yellow, -0.3]]);
    B.pop();
    for (const [x, z] of [[0.36, 0.1], [-0.3, -0.24]]) B.box(0.1, 0.06, 0.1, pal(HOT.orange), x, 0.24, z);
  },
};

export function register(style) {
  const P = style.palette;
  const props = P.props || {};
  const types = Object.keys(props);
  const daisT = types.find((t) => roleOf(P, t) === "dais");
  const dt = daisT ? tonesOf(P, daisT) : [];
  const look = { plinthLo: pick(dt, 0, HOT.coal), plinthHi: HOT.soot };
  const catalog = {};
  const builders = {};
  for (const t of types) {
    const p = props[t], role = roleOf(P, t);
    const lead = role === "lead" || role === "creature";
    const lens = lensKind(t, role);
    catalog[t] = { footprint: lead ? [2, 2] : role === "threshold" || lens ? [1, 1] : p.footprint || [1, 1], passable: lead ? false : !!p.passable, variants: 2, height: lead ? Math.min(3, Math.max(2.7, p.height || 2.7)) : Math.min(2.6, Math.max(0.3, p.height || 1)) };
    const tn = tonesOf(P, t);
    const c0 = pick(tn, 0, HOT.soot), c1 = pick(tn, 1, HOT.brow);
    const pose = poseOf(p.pose || "");
    builders[t] = (v, rot, st, ctx) => {
      const B = new Baker(), H = ctx.height, d = ctx.decor || {};
      if (lead) spirit(B, H, look, v, pose);
      else if (lens) LENS_BUILD[lens](B, H, v, { role, d });
      else if (role === "threshold") {
        const ph = H * 0.66;
        B.box(0.5, 0.22, 0.5, pal(HOT.coal));
        B.box(0.36, ph * 0.55, 0.36, pal(c0), 0, 0.22, 0);
        B.box(0.3, ph * 0.45, 0.3, pal(c1), 0.02, 0.22 + ph * 0.55, -0.01);
        const top = 0.22 + ph;
        B.box(0.42, 0.12, 0.42, pal(HOT.yellow), 0, top, 0);
        B.box(0.34, 0.14, 0.34, pal(HOT.soot), 0, top + 0.12, 0);
        for (const sx of [-1, 1]) {
          B.box(0.12, 0.12, 0.12, pal(HOT.horn), sx * 0.24, top + 0.16, 0);
          B.box(0.1, 0.14, 0.1, pal(HOT.horn), sx * 0.32, top + 0.28, 0);
          B.cone(0.06, 0, 0.16, pal(HOT.hornTip), sx * 0.34, top + 0.42, 0, 4);
        }
        B.cone(0.16, 0, 0.3, pal(HOT.orange), 0, top + 0.26, 0, 4);
        B.cone(0.09, 0, 0.2, pal(HOT.yellow), 0.02, top + 0.26, 0.04, 4);
        if (d.side) {
          const reach = 1.0, beam = (y, th, c) => d.axis === "x" ? B.box(0.22, th, reach + 0.3, pal(c), 0, y, -d.side * (reach / 2 - 0.05)) : B.box(reach + 0.3, th, 0.22, pal(c), -d.side * (reach / 2 - 0.05), y, 0);
          beam(ph * 0.92, 0.16, HOT.soot);
          beam(ph * 0.92 + 0.16, 0.08, HOT.orange);
        }
      } else if (role === "dais") {
        plinth(B, 0.42, H, c0, HOT.soot);
        B.cyl(0.26, 0.08, pal(HOT.orange), 0, H, 0, 8);
      } else if (role === "light") {
        B.box(0.28, 0.14, 0.28, pal(HOT.coal));
        B.box(0.14, H - 0.6, 0.14, pal(c0), 0, 0.14, 0);
        B.cyl(0.2, 0.14, pal(HOT.soot), 0, H - 0.46, 0, 6);
        B.cone(0.17, 0, 0.32, pal(HOT.orange), 0, H - 0.32, 0, 4);
        B.cone(0.09, 0, 0.22, pal(HOT.yellow), 0.02, H - 0.32, 0.03, 4);
      } else if (role === "offering") {
        B.cyl(0.22, H * 0.5, pal(c0), 0, 0, 0, 8);
        B.cyl(0.26, 0.06, pal(HOT.soot), 0, H * 0.5, 0, 8);
        B.box(0.14, 0.12, 0.14, pal(v % 2 ? HOT.orange : HOT.yellow), -0.05, H * 0.5 + 0.06, 0.02);
        B.box(0.1, 0.14, 0.1, pal(HOT.amber), 0.07, H * 0.5 + 0.06, -0.04);
      } else if (role === "mass") {
        const segs = v % 2 ? [0.66, 0.5, 0.36] : [0.6, 0.46, 0.32];
        const hh = (H - 0.34) / segs.length;
        segs.forEach((w, i) => B.box(w, hh, w, pal(i % 2 ? c1 : c0), (i % 2 ? 0.04 : -0.03), i * hh, (i % 2 ? -0.03 : 0.03)));
        B.cone(segs[2] * 0.7, 0, 0.34, pal(v % 2 ? HOT.orange : c1), 0, H - 0.34, 0, 4);
        B.box(0.08, 0.3, 0.02, pal(HOT.orange), 0.12, hh * 0.5, segs[0] / 2 + 0.01);
      } else {
        B.box(0.4, H * 0.5, 0.4, pal(c0));
        wedge(B, 0.4, H * 0.5, 0.4, c1, 0, H * 0.5, 0);
      }
      return mesh(B);
    };
  }
  return { catalog, builders };
}

function resurface(level, h) {
  const cells = [];
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) { const c = h.cell(x, z); if (h.land(c)) cells.push([x, z, c]); }
  const stone = cells.filter(([, , c]) => c.s === "stone");
  if (stone.length / Math.max(1, cells.length) <= 0.3) return;
  const sf = h.surf || {};
  const repl = [sf.ground, sf.raised].find((t) => t && t !== "stone") || "grass";
  const near = (x, z) => h.figure.cells.some(([a, b]) => Math.max(Math.abs(a - x), Math.abs(b - z)) <= 1);
  for (const [x, z, c] of stone) if (!near(x, z) && (x * 7 + z * 13) % 6 !== 0) c.s = repl;
  h.log.push(`resurface: ${stone.length} stone of ${cells.length} land to ${repl}, accents kept`);
}

function dropPuddles(level, h) {
  const seen = new Set();
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
    if (seen.has(h.key(x, z)) || h.cell(x, z)?.s !== "water") continue;
    const comp = [], st = [[x, z]];
    seen.add(h.key(x, z));
    while (st.length) {
      const [a, b] = st.pop();
      comp.push([a, b]);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = h.key(a + dx, b + dz);
        if (!seen.has(k) && h.cell(a + dx, b + dz)?.s === "water") { seen.add(k); st.push([a + dx, b + dz]); }
      }
    }
    if (comp.length >= 6) continue;
    for (const [a, b] of comp) h.set(a, b, { h: 0, s: "none" });
    h.log.push(`dropPuddles: ${comp.length} stray water cells to void`);
  }
}

function torches(level, h, r, t, g, max = 4, every = 3, gap = 1) {
  const onRoute = new Set(r.map(([x, z]) => h.key(x, z)));
  const far = (x, z) => h.figure.cells.every(([a, b]) => Math.max(Math.abs(a - x), Math.abs(b - z)) > gap);
  const D4 = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  let n = 0, last = -9;
  for (let i = 1; i < r.length && n < max; i++) {
    if (i - last < every) continue;
    const [x, z] = r[i];
    if (g && Math.abs(g[0] - x) + Math.abs(g[1] - z) <= 1) continue;
    for (const [dx, dz] of n % 2 ? [...D4].reverse() : D4) {
      const a = x + dx, b = z + dz, c = h.cell(a, b);
      if (onRoute.has(h.key(a, b)) || !h.land(c) || c.s === "ramp" || h.decorAt(a, b).length || !far(a, b)) continue;
      if (D4.some(([p, q]) => { const n = h.cell(a + p, b + q); if (n?.s !== "ramp") return false; const [rx, rz] = h.DIRS[n.d]; return Math.abs(rx) === Math.abs(p) && Math.abs(rz) === Math.abs(q); })) continue;
      const miss0 = h.reach().missing.length;
      if (!h.put(t, a, b)) continue;
      if (h.reach().missing.length > miss0) { level.decor.pop(); continue; }
      n++; last = i;
      break;
    }
  }
  h.log.push(`torches ${t} x${n}`);
}

const SCORCH = { top: "#9a2e14", fringe: "#7a2410", fringeDark: "#5c1a0a", speck: "#ff8a2a" };

function scatter(level, h, r, t, n) {
  if (!t || n <= 0) return;
  const onRoute = new Set(r.map(([x, z]) => h.key(x, z)));
  const free = (x, z) => { for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (h.decorAt(x + dx, z + dz).length || onRoute.has(h.key(x + dx, z + dz)) && !(dx || dz)) return false; return true; };
  const cells = [];
  for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) { const c = h.cell(x, z); if (h.land(c) && c.s !== "ramp" && !onRoute.has(h.key(x, z)) && !h.isFig(x, z)) cells.push([x, z, (x * 17 + z * 31) % 13]); }
  cells.sort((a, b) => a[2] - b[2]);
  let k = 0;
  for (const [x, z] of cells) {
    if (k >= n) break;
    if (!free(x, z)) continue;
    const miss0 = h.reach().missing.length;
    if (!h.put(t, x, z)) continue;
    if (h.reach().missing.length > miss0) { level.decor.pop(); continue; }
    k++;
  }
  h.log.push(`scatter ${t} x${k}`);
}

function finishLens(level, brief, h) {
  const L = brief.lens?.name || brief.lens_name || (/ember-(\w+)/.exec(level.name || "") || [])[1] || "";
  const props = level.palette?.props || {};
  if (level.palette?.grass && (brief.surface_mix?.surfaces || []).some((m) => m.s === "grass")) {
    Object.assign(level.palette.grass, SCORCH);
    h.log.push("grass repainted as scorched crust");
  }
  h.dryRim();
  dropPuddles(level, h);
  const daisTypes = h.ofRole("dais");
  h.removeDecor((d) => daisTypes.includes(d.t));
  const isLead = (t) => props[t]?.role === "lead" || props[t]?.role === "creature";
  const gateT = brief.threshold?.prop || h.ofRole("threshold")[0];
  const lightT = h.ofRole("light").find((t) => props[t]) || "torch";
  const lineT = h.ofRole("approach").filter((t) => props[t] && t !== gateT);
  if (gateT && !props[gateT]) {
    props[gateT] = { role: "threshold", footprint: [1, 1], height: 1.7, passable: false, summary: "ember brazier gate post" };
    h.log.push(`${gateT} rebuilt as ember brazier gate post`);
  }
  const offT = h.ofRole("offering");
  const offs = level.decor.filter((d) => offT.includes(d.t));
  const near = (d, e) => e !== d && Math.max(Math.abs(e.x - d.x), Math.abs(e.z - d.z)) <= 1;
  const kept = [];
  for (const d of offs) if (kept.length < 3 && !level.decor.some((e) => !offs.includes(e) && near(d, e)) && !kept.some((e) => near(d, e))) kept.push(d);
  h.removeDecor((d) => offs.includes(d) && !kept.includes(d));
  const passT = h.passes().filter((t) => t !== gateT && t !== lightT && !daisTypes.includes(t) && !isLead(t) && !lineT.includes(t));
  h.removeDecor((d) => d.t === gateT || d.t === lightT || passT.includes(d.t) || lineT.includes(d.t));
  let r = h.spawnAt({ min: 9, max: 16 });
  if (r.length) h.path(r);
  r = h.approach();
  let g = null;
  for (const frac of [0.6, 0.45, 0.75, 0.3]) if (!g && gateT) g = h.gate(gateT, { route: r, frac });
  const posts = level.decor.filter((d) => d.t === gateT);
  const avoid = g ? [g] : [];
  h.along(passT, { route: r });
  for (const t of lineT) torches(level, h, r, t, g, 5, 1);
  if (props[lightT] && lightT !== gateT && !h.lights(lightT, { route: r, every: 4, skip: 2, max: 4, avoid, keep: [gateT, ...passT, ...lineT] })) torches(level, h, r, lightT, g, 3, 3);
  const gateN = (brief.motifs || []).find((m) => m.name === gateT || m.type === gateT)?.count || 0;
  if (g && gateN >= 4) {
    const gi = r.findIndex(([x, z]) => x === g[0] && z === g[1]);
    for (const i of [gi - 3, gi - 4, gi + 3, gi - 2]) {
      if (i < 1 || i >= r.length - 1) continue;
      const snap = level.decor.length;
      if (h.gate(gateT, { route: r, at: r[i] })) { posts.push(...level.decor.slice(snap).filter((d) => d.t === gateT)); break; }
    }
  }
  scatter(level, h, r, offT[0], 4 - kept.length);
  for (const q of posts) if (!level.decor.includes(q) && !level.decor.some((d) => d.t === gateT && d.x === q.x && d.z === q.z)) { h.clear(q.x, q.z); level.decor.push(q); h.log.push(`gate post restored ${q.x},${q.z}`); }
  h.ledges({ keep: [gateT] });
  h.repair({ keep: [gateT, ...lineT] });
  h.pruneRamps({ route: h.approach() });
  h.pruneRamps({ all: true, slotsOnly: true });
  h.openRamps();
  h.pruneRamps({ all: true, nearFig: 1 });
  if (h.walkN() < 84) h.grow(84);
  if (h.walkN() < 84) h.thin(84, { keep: [gateT, lightT, ...lineT] });
  h.rampTone();
}

export function finish(level, brief, h) {
  if (brief.lens) return finishLens(level, brief, h);
  resurface(level, h);
  dropPuddles(level, h);
  const daisTypes = h.ofRole("dais");
  h.removeDecor((d) => daisTypes.includes(d.t));
  const gateT = h.ofRole("threshold")[0];
  const lightT = h.ofRole("light")[0] || (brief.motifs || []).map((m) => m.type).find((t) => t === "torch" || t === "lantern") || "torch";
  h.removeDecor((d) => d.t === gateT || (d.t === lightT && !!level.palette?.props?.[lightT]));
  let r = h.approach();
  if (r.length < 7) {
    const [ax, az] = h.figure.anchor;
    let best = null;
    for (let z = 0; z < h.D; z++) for (let x = 0; x < h.W; x++) {
      const c = h.cell(x, z);
      if (!h.land(c) || c.h !== 1 || c.s === "ramp" || h.decorAt(x, z).length) continue;
      const sc = Math.abs(x - ax) + Math.abs(z - az) + (z - x) * 0.1;
      if (!best || sc > best[2]) best = [x, z, sc];
    }
    if (best) {
      level.spawn = [best[0], best[1]];
      h.log.push(`spawn moved to ${best[0]},${best[1]}`);
      r = h.approach();
    }
  }
  if (r.length) h.path(r);
  r = h.approach();
  let g = null;
  for (const frac of [0.55, 0.4, 0.7, 0.25, 0.85]) if (!g && gateT) g = h.gate(gateT, { route: r, frac, figGap: 1 });
  if (g) h.removeDecor((d) => /^tree/.test(d.t) && d.x - g[0] >= -1 && d.x - g[0] <= 2 && d.z - g[1] >= -1 && d.z - g[1] <= 2);
  if (!h.lights(lightT, { route: r, every: 3, skip: 1, max: 6, avoid: g ? [g] : [], keep: [gateT] })) torches(level, h, r, lightT, g);
  const lit = level.decor.filter((d) => d.t === lightT || d.t === "torch" || d.t === "lantern");
  const dr = (d) => Math.min(...r.map(([x, z]) => Math.abs(x - d.x) + Math.abs(z - d.z)));
  const drop = lit.sort((a, b) => dr(a) - dr(b)).slice(6);
  if (drop.length) h.removeDecor((d) => drop.includes(d));
  h.repair({ keep: [gateT] });
}
