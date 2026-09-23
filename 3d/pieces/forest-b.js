import * as THREE from "three";
import { Baker, tone, circle, bakedMaterial } from "../baker.js";

const DEF = {
  bark: ["#4a3228", "#3c2824", "#281818"],
  lean: ["#7c4c30", "#684028", "#4c2c1c"],
  log: ["#b07a4c", "#98643c", "#7c4c30"],
  logEnd: ["#c8986a", "#98643c"],
  root: ["#a87650", "#9c6c48", "#7c5034"],
  stump: ["#6c5038", "#483420", "#382818"],
  moss: ["#5c8830", "#547c28", "#44662c"],
  mist: ["#8c98a0", "#808c94", "#6c7880"],
  flame: ["#fcd468", "#fc9c2c", "#fc8028", "#e8641c"],
  beak: ["#f8c858", "#e8b040", "#b88020"],
  eye: "#2a1a14",
};

const t3 = (a) => tone(a[0], a[1], a[2]);
const mesh = (B) => new THREE.Mesh(B.geometry(), bakedMaterial());

function beam(B, a, b, r, pal, n = 6) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dx, dy, dz);
  if (len < 1e-6) return;
  const yaw = Math.atan2(dx, dz), pitch = Math.acos(Math.max(-1, Math.min(1, dy / len)));
  B.push(a[0], a[1], a[2], yaw);
  B.rot([1, 0, 0], pitch);
  B.cyl(r, len, pal, 0, 0, 0, n);
  B.pop(); B.pop();
}

function taper(B, a, b, r0, r1, pal, n = 6) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dx, dy, dz);
  if (len < 1e-6) return;
  const yaw = Math.atan2(dx, dz), pitch = Math.acos(Math.max(-1, Math.min(1, dy / len)));
  B.push(a[0], a[1], a[2], yaw);
  B.rot([1, 0, 0], pitch);
  B.cone(r0, r1, len, pal, 0, 0, 0, n);
  B.pop(); B.pop();
}

function arc(B, a, b, peak, r, pal, seg = 4) {
  let prev = a;
  for (let i = 1; i <= seg; i++) {
    const t = i / seg, y = a[1] + (b[1] - a[1]) * t + peak * 4 * t * (1 - t);
    const p = [a[0] + (b[0] - a[0]) * t, y, a[2] + (b[2] - a[2]) * t];
    beam(B, prev, p, r, pal);
    prev = p;
  }
}

export function register(style) {
  const P = { ...DEF, ...(style.palette.forestB || {}) };
  const bark = t3(P.bark), lean = t3(P.lean), log = tone(P.log[0], P.log[1], P.log[2]);
  const root = t3(P.root), moss = t3(P.moss), mist = t3(P.mist);
  const fl = P.flame, flameHi = tone(fl[0], fl[0], fl[1]), flameMid = tone(fl[1], fl[1], fl[2]), flameLo = tone(fl[2], fl[2], fl[3]);

  function trunk(B, H, r, seed) {
    B.cyl(r * 1.35, 0.14, bark, 0, 0, 0, 10, { topPal: P.bark[1] });
    B.cyl(r, H, bark, 0, 0, 0, 10, { topPal: P.bark[0] });
    const stubs = [[0.5, 0.6, 1], [0.62, 2.5, -1], [0.74, 4.3, 1], [0.84, 1.3, -1]];
    for (const [f, ang, s] of stubs) {
      const a = ang + seed, y = H * f, l = 0.3 + 0.06 * s;
      const dx = Math.sin(a), dz = Math.cos(a);
      taper(B, [dx * r * 0.5, y, dz * r * 0.5], [dx * (r + l), y + l * 0.8, dz * (r + l)], 0.075, 0.05, bark, 6);
    }
  }

  function flame(B, x, y, z, r, h, lx, lz, pal) {
    taper(B, [x, y, z], [x + lx, y + h, z + lz], r, 0, pal, 6);
  }

  const path = t3(P.path || [P.log[1], P.log[1], P.log[2]]);
  return {
    catalog: {
      "bare-trunk": { footprint: [1, 1], passable: false, variants: 3, height: 4.6 },
      "leaning-trunk": { footprint: [1, 1], passable: false, variants: 1, height: 4.3 },
      "fire-bird": { footprint: [1, 1], passable: false, variants: 1, height: 3.2 },
      "flame-wisp": { footprint: [1, 1], passable: true, variants: 1, height: 0.5, floats: true },
      "mist": { footprint: [1, 1], passable: true, variants: 2, height: 0.3, floats: true },
      "root-tangle": { footprint: [1, 1], passable: true, variants: 1, height: 0.6 },
      "mossy-stump": { footprint: [1, 1], passable: false, variants: 2, height: 0.5 },
      "fallen-logs": { footprint: [1, 1], passable: false, variants: 2, height: 0.45, rotates: true },
      "dirt-path": { footprint: [1, 1], passable: true, variants: 2, height: 0.02, rotates: true },
      "dirt-stairs": { footprint: [1, 1], passable: true, variants: 1, height: 1, rotates: true },
      "island-skirt": { footprint: [1, 1], passable: true, variants: 1, height: 0.01 },
    },
    builders: {
      "dirt-path"(v, rot, s, ctx) {
        const B = new Baker();
        const w = 0.6, x0 = v === 1 ? -0.3 : -0.5, x1 = 0.5;
        B.rbox(x1 - x0, 0.02, w, v === 1 ? 0.2 : 0.03, path, (x0 + x1) / 2, 0.004, 0);
        return mesh(B);
      },
      "dirt-stairs"(v, rot, s, ctx) {
        const B = new Baker();
        const T = ctx.decor?.tileH || 1.2, n = 3, w = 0.6;
        const side = tone(s.palette.grass.top, s.palette.grass.fringe, s.palette.grass.fringeDark);
        for (let i = 0; i < n; i++) {
          const xa = -0.5 + i / n, xb = -0.5 + (i + 1) / n, top = 0.5 * T - (i * T) / n;
          B.box(xb - xa, top + 0.5 * T, w, path, (xa + xb) / 2, -0.5 * T, 0);
          for (const sz of [-1, 1]) B.box(xb - xa, top + 0.5 * T + 0.05, (1 - w) / 2, side, (xa + xb) / 2, -0.5 * T, sz * (w + (1 - w) / 2) / 2);
        }
        return mesh(B);
      },
      "island-skirt"(v, rot, s, ctx) {
        const B = new Baker();
        const q = ctx.decor, C = s.palette.cliffLower, pal = tone(C.left, C.left, C.right, C.seam);
        for (const [dx, dz] of q.cells || []) B.rbox(0.98, q.y1 - q.y0, 0.98, 0.06, pal, dx, q.y0, dz, { top: false });
        return mesh(B);
      },
      "bare-trunk"(v, rot, s, ctx) {
        const B = new Baker();
        const H = ctx.decor?.ht || ctx.height * [1, 0.94, 1.08][v % 3];
        trunk(B, H, ctx.decor?.r || 0.21, v * 1.7);
        const f = ctx.decor?.fork;
        if (f) {
          const dx = Math.sin(f[1]), dz = Math.cos(f[1]);
          taper(B, [dx * 0.1, f[0] - 0.35, dz * 0.1], [dx * 0.46, f[0] + 0.12, dz * 0.46], 0.11, 0.07, bark, 6);
          taper(B, [-dz * 0.1, f[0] - 0.2, dx * 0.1], [-dz * 0.36, f[0] + 0.25, dx * 0.36], 0.08, 0.05, bark, 6);
        }
        return mesh(B);
      },
      "leaning-trunk"(v, rot, s, ctx) {
        const B = new Baker();
        const d = ctx.decor?.lean || [-3.28, 4.29, 0];
        const r = 0.2;
        for (const a of [0.6, 2.2, 3.9, 5.2]) beam(B, [0, 0.18, 0], [Math.sin(a) * 0.42, 0, Math.cos(a) * 0.42], 0.08, lean);
        B.cyl(0.3, 0.2, lean, 0, 0, 0, 8, { topPal: P.lean[1] });
        beam(B, [0, 0.05, 0], d, r, lean, 8);
        B.cyl(r, 0.001, lean, d[0], d[1], d[2], 8, { topPal: P.lean[0], sides: false });
        const m = (f) => [d[0] * f, d[1] * f, d[2] * f];
        const s1 = m(0.55), s2 = m(0.78);
        beam(B, s1, [s1[0] + 0.1, s1[1] + 0.25, s1[2] - 0.35], 0.06, lean);
        beam(B, s2, [s2[0] - 0.05, s2[1] + 0.3, s2[2] + 0.35], 0.06, lean);
        return mesh(B);
      },
      "fire-bird"(v, rot, s, ctx) {
        const B = new Baker();
        const k = ctx.height / 3.2;
        const wedge = (x, y, z, ang, len, w, pal, th = 0.07) => {
          const sa = Math.sin(ang), ca = Math.cos(ang), px = -ca, pz = sa;
          const pts = [[-px * w / 2, -pz * w / 2], [len * 0.45 * sa + px * w * 0.42, len * 0.45 * ca + pz * w * 0.42], [len * sa, len * ca], [len * 0.45 * sa - px * w * 0.3, len * 0.45 * ca - pz * w * 0.3], [px * w / 2, pz * w / 2]];
          B.push(x, y, z, Math.PI / 2);
          B.rot([1, 0, 0], -Math.PI / 2);
          B.prism(pts.reverse(), -th / 2, th / 2, pal, { bottom: true });
          B.pop(); B.pop();
        };
        B.cyl(0.46, 0.12, tone(P.moss[1], P.moss[1], P.moss[2]), 0, 0, 0, 12, { topPal: P.moss[2] });
        B.cyl(0.3, 0.04, tone(P.moss[1], P.moss[1], P.moss[2]), 0, 0.12, 0, 12, { topPal: P.moss[1] });
        B.push(0, 0.16, 0, -Math.PI / 4, k);
        for (const sx of [-0.13, 0.13]) {
          beam(B, [sx, 0.02, 0.04], [sx, 0.42, -0.04], 0.045, flameLo, 6);
          beam(B, [sx, 0.42, -0.04], [sx, 0.78, 0.04], 0.065, flameMid, 6);
          for (const d of [-0.5, 0, 0.5]) taper(B, [sx, 0.03, 0.04], [sx + d * 0.1, 0.02, 0.24], 0.04, 0.01, flameLo, 4);
        }
        B.push(0, 1.02, -0.1);
        B.rot([1, 0, 0], -0.3);
        B.rbox(0.54, 0.44, 0.84, 0.18, flameMid, 0, -0.22, 0);
        B.pop(); B.pop();
        B.rbox(0.46, 0.5, 0.4, 0.15, flameLo, 0, 0.9, 0.2);
        const neck = [[0.38, 0.3, 1.34, 0.28, flameMid], [0.34, 0.3, 1.6, 0.36, flameLo], [0.31, 0.3, 1.86, 0.43, flameMid], [0.3, 0.28, 2.12, 0.5, flameLo]];
        for (const [w, h, y, z, pal] of neck) B.rbox(w, h, w, 0.09, pal, 0, y, z);
        B.rbox(0.4, 0.38, 0.46, 0.13, flameMid, 0, 2.36, 0.57);
        taper(B, [0, 2.6, 0.78], [0, 2.44, 1.08], 0.1, 0.05, t3(P.beak), 6);
        taper(B, [0, 2.44, 1.08], [0, 2.24, 1.06], 0.05, 0, t3(P.beak), 6);
        for (const sx of [-1, 1]) B.box(0.03, 0.08, 0.08, tone(P.eye, P.eye, P.eye), sx * 0.205, 2.58, 0.66);
        wedge(0, 2.68, 0.62, 0.15, 0.62, 0.2, flameHi);
        wedge(0.05, 2.66, 0.5, 0.45, 0.66, 0.2, flameMid);
        wedge(-0.05, 2.62, 0.4, 0.75, 0.6, 0.2, flameHi);
        wedge(0, 2.52, 0.32, 1.05, 0.5, 0.18, flameLo);
        for (const [y, z] of [[0.95, 0.42], [1.3, 0.46], [1.62, 0.54], [1.9, 0.6]]) wedge(0, y, z, -0.25, 0.26, 0.14, flameHi, 0.36);
        for (const sx of [-1, 1]) {
          wedge(sx * 0.3, 1.0, 0.18, 1.05, 0.72, 0.3, flameHi);
          wedge(sx * 0.32, 0.86, 0.05, 1.3, 0.62, 0.26, flameMid);
        }
        const tail = [[0, 0.62, 1.35, flameMid, 0.34], [0.08, 0.8, 1.2, flameHi, 0.3], [-0.08, 0.95, 1.05, flameLo, 0.28], [0, 1.15, 0.9, flameHi, 0.24], [0.04, 1.35, 0.7, flameMid, 0.2]];
        for (const [x, ang, len, pal, w] of tail) wedge(x, 0.95, -0.5, ang, len, w, pal);
        B.pop();
        return mesh(B);
      },
      "flame-wisp"(v, rot, s, ctx) {
        const B = new Baker();
        const at = ctx.decor?.at || [0, 0, 0];
        B.push(at[0], at[1], at[2]);
        const y = 0.85;
        B.ball(0.13, flameMid, 0, y, 0, 1.1, 1);
        taper(B, [0, y + 0.08, 0], [0.04, y + 0.42, -0.05], 0.1, 0, flameHi, 6);
        B.ball(0.06, flameHi, 0.28, y + 0.35, -0.1, 1.2, 0);
        taper(B, [0.28, y + 0.38, -0.1], [0.3, y + 0.55, -0.12], 0.05, 0, flameHi, 5);
        B.pop();
        return mesh(B);
      },
      "mist"(v, rot, s, ctx) {
        const B = new Baker();
        const y = ctx.decor?.y ?? 0.8, w = ctx.decor?.w || 1.9;
        const bumps = v % 2 ? [[-0.34, 0.2], [-0.04, 0.3], [0.3, 0.22]] : [[-0.36, 0.18], [-0.1, 0.26], [0.18, 0.32], [0.4, 0.18]];
        const pts = [[w / 2, 0]];
        for (let i = bumps.length - 1; i >= 0; i--) {
          const [cx, r] = bumps[i];
          for (let j = 0; j <= 6; j++) { const a = (j / 6) * Math.PI; pts.push([cx * w + Math.cos(a) * r * w * 0.5, Math.sin(a) * r * 1.3 + 0.08]); }
        }
        pts.push([-w / 2, 0]);
        const at = ctx.decor?.at || [0, 0, 0];
        B.push(at[0], y + at[1], at[2], Math.PI / 4);
        B.rot([1, 0, 0], -Math.PI / 2);
        B.prism(pts.reverse(), -0.06, 0.06, tone(P.mist[1], P.mist[1], P.mist[2]), { bottom: true });
        B.pop(); B.pop();
        return new THREE.Mesh(B.geometry(), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false }));
      },
      "root-tangle"(v, rot, s, ctx) {
        const B = new Baker();
        B.ball(0.5, moss, 0, 0.24, 0, 0.85, 1);
        B.cyl(0.42, 0.14, moss, 0, 0, 0, 12);
        const n = 12;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + 0.3, R = 0.72 + 0.22 * ((i * 7) % 3) / 2;
          arc(B, [Math.sin(a) * 0.3, 0.4, Math.cos(a) * 0.3], [Math.sin(a) * R, 0, Math.cos(a) * R], 0.3 + 0.12 * (i % 3), 0.12, root, 6);
        }
        return mesh(B);
      },
      "mossy-stump"(v, rot, s, ctx) {
        const B = new Baker();
        const st = t3(P.stump), h = 0.46 + 0.1 * (v % 2), r = 0.28;
        for (const a of [0.4, 2.1, 3.8, 5.3]) beam(B, [0, 0.18, 0], [Math.sin(a) * 0.44, 0, Math.cos(a) * 0.44], 0.08, st);
        B.cyl(r, h, st, 0, 0, 0, 10, { topPal: P.log[1] });
        taper(B, [0.14, h, 0.1], [0.18, h + 0.26, 0.12], 0.1, 0, st, 5);
        taper(B, [-0.12, h, -0.14], [-0.14, h + 0.18, -0.16], 0.09, 0, st, 5);
        taper(B, [0.12, h, -0.14], [0.14, h + 0.12, -0.18], 0.07, 0, st, 5);
        B.cyl(r + 0.01, 0.12, moss, 0, h * 0.3, 0, 10, { top: false });
        B.cyl(0.14, 0.05, moss, -0.04, h, 0.04, 8, { topPal: P.moss[0] });
        return mesh(B);
      },
      "fallen-logs"(v, rot, s, ctx) {
        const B = new Baker();
        const one = (x, z, len, r) => {
          B.push(x, r, z);
          B.rot([1, 0, 0], Math.PI / 2);
          B.cyl(r, len, log, 0, -len / 2, 0, 8, { topPal: P.logEnd[0], bottom: true });
          B.cyl(r * 0.55, 0.012, tone(P.logEnd[1], P.logEnd[1], P.logEnd[1]), 0, len / 2, 0, 8, { sides: false });
          B.pop(); B.pop();
        };
        if (v % 2 === 0) {
          one(-0.24, 0, 1.3, 0.19);
          one(0.2, 0.08, 1.3, 0.19);
          beam(B, [-0.24, 0.3, -0.5], [-0.3, 0.52, -0.62], 0.05, log);
        } else {
          one(0, 0.1, 1.4, 0.2);
        }
        return mesh(B);
      },
    },
  };
}
