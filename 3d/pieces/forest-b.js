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
        trunk(B, H, 0.21, v * 1.7);
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
        B.cyl(0.46, 0.12, tone(P.moss[1], P.moss[1], P.moss[2]), 0, 0, 0, 12, { topPal: P.moss[2] });
        B.cyl(0.3, 0.04, tone(P.moss[1], P.moss[1], P.moss[2]), 0, 0.12, 0, 12, { topPal: P.moss[1] });
        B.push(0, 0.16, 0, -Math.PI / 4, k);
        for (const sx of [-0.15, 0.15]) {
          beam(B, [sx, 0.02, 0.05], [sx, 0.35, -0.02], 0.055, flameLo, 6);
          beam(B, [sx, 0.35, -0.02], [sx * 1.1, 0.72, 0.06], 0.075, flameMid, 6);
          for (const d of [-0.5, 0, 0.5]) taper(B, [sx, 0.03, 0.05], [sx + d * 0.1, 0.02, 0.26], 0.045, 0.01, flameLo, 4);
        }
        B.push(0, 0.95, -0.12);
        B.rot([1, 0, 0], -0.35);
        B.rbox(0.66, 0.5, 0.9, 0.2, flameMid, 0, -0.25, 0);
        B.pop(); B.pop();
        B.rbox(0.58, 0.55, 0.5, 0.18, flameLo, 0, 0.72, 0.22);
        B.rbox(0.46, 0.38, 0.44, 0.14, flameMid, 0, 1.2, 0.34);
        B.rbox(0.42, 0.34, 0.42, 0.13, flameLo, 0, 1.52, 0.42);
        B.rbox(0.5, 0.46, 0.56, 0.16, flameMid, 0, 1.8, 0.5);
        taper(B, [0, 2.12, 0.74], [0, 1.9, 1.02], 0.12, 0.06, t3(P.beak), 6);
        taper(B, [0, 1.9, 1.02], [0, 1.66, 1.02], 0.06, 0.0, t3(P.beak), 6);
        for (const sx of [-1, 1]) B.box(0.03, 0.09, 0.09, tone(P.eye, P.eye, P.eye), sx * 0.255, 2.02, 0.6);
        flame(B, 0, 2.2, 0.5, 0.15, 0.6, 0, -0.18, flameHi);
        flame(B, 0.12, 2.18, 0.4, 0.12, 0.5, 0.1, -0.28, flameMid);
        flame(B, -0.12, 2.18, 0.4, 0.12, 0.5, -0.1, -0.28, flameMid);
        flame(B, 0, 2.1, 0.3, 0.12, 0.42, 0, -0.42, flameHi);
        for (const [y, z] of [[0.62, 0.48], [0.95, 0.44], [1.3, 0.56], [1.62, 0.63]]) flame(B, 0, y, z, 0.13, 0.3, 0, -0.06, flameHi);
        for (const sx of [-1, 1]) {
          flame(B, sx * 0.34, 0.95, 0.1, 0.16, 0.62, sx * 0.1, -0.6, flameHi);
          flame(B, sx * 0.36, 0.78, -0.05, 0.14, 0.55, sx * 0.1, -0.62, flameMid);
          flame(B, sx * 0.3, 0.62, -0.2, 0.12, 0.45, sx * 0.08, -0.55, flameLo);
        }
        flame(B, 0, 0.95, -0.62, 0.2, 1.05, 0, -0.7, flameMid);
        flame(B, 0.16, 0.9, -0.6, 0.17, 0.9, 0.2, -0.78, flameHi);
        flame(B, -0.16, 0.9, -0.6, 0.17, 0.9, -0.2, -0.78, flameHi);
        flame(B, 0, 0.8, -0.6, 0.15, 0.55, 0, -1.05, flameLo);
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
        B.ball(0.46, moss, 0, 0.22, 0, 0.85, 1);
        B.cyl(0.42, 0.14, moss, 0, 0, 0, 12);
        const n = 12;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + 0.3, R = 0.85 + 0.3 * ((i * 7) % 3) / 2;
          arc(B, [Math.sin(a) * 0.3, 0.4, Math.cos(a) * 0.3], [Math.sin(a) * R, 0, Math.cos(a) * R], 0.3 + 0.12 * (i % 3), 0.085, root, 5);
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
