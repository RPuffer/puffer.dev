import { cellAt } from "../core/level.js";

const C = {
  deep: "#00d4ff", deepR: "#00c3f2", streakA: "#5fe8ff", streakB: "#a0eeff", streakC: "#00c7ff",
  rimTop: "#00c7ff", foam: "#daf7ff", foamS: "#a0eeff", foamD: "#6fdcf5",
  bark: "#dc7016", barkHi: "#ff831d", barkLo: "#bd4c0b", barkSh: "#a04b14", cap: "#f6d881", capRim: "#dc9a4a", rope: "#f1dca0",
};

export const waterLevel = (c) => (!c ? null : c.s === "water" ? c.h + (c.lift || 0) : c.s === "bridge" && c.w != null ? c.w + (c.lift || 0) : null);

const poly = (ctx, pts) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); };

function hash(x, z, i) { let h = (x * 374761393 + z * 668265263 + i * 2147483647) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return (h & 0xffff) / 0xffff; }

export function waterItems(L, T, px) {
  const out = [], [W, D] = L.size;
  const S = (ox, oy, k) => (p) => [ox + p.x * k, oy + p.y * k];
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const c = L.cells[z][x], wl = waterLevel(c);
    if (!wl) continue;
    const faces = [];
    for (const [dx, dz] of [[1, 0], [0, 1]]) {
      const n = cellAt(L, x + dx, z + dz), nl = waterLevel(n);
      if (nl != null && nl < wl) faces.push([dx, dz, nl]);
    }
    if (!faces.length) continue;
    const top = wl * T;
    if (c.s === "bridge") out.push({ key: [x + z, 0, top + 0.015, x], draw(ctx, ox, oy, k) {
      const s = S(ox, oy, k), i = 0.06;
      const q = [px(x + i, top, z + i), px(x + 1 - i, top, z + i), px(x + 1 - i, top, z + 1 - i), px(x + i, top, z + 1 - i)].map(s);
      const r = [px(x, top, z), px(x + 1, top, z), px(x + 1, top, z + 1), px(x, top, z + 1)].map(s);
      ctx.fillStyle = C.rimTop; poly(ctx, r); ctx.fill();
      ctx.fillStyle = C.deep; poly(ctx, q); ctx.fill();
    } });
    for (const [dx, dz, nl] of faces) {
      const bot = nl * T, along = dz ? [1, 0] : [0, 1];
      const e0 = dz ? [x, z + 1] : [x + 1, z], e1 = [e0[0] + along[0], e0[1] + along[1]];
      out.push({ key: [x + z, 0, top + 0.02, x], draw(ctx, ox, oy, k) {
        const s = S(ox, oy, k);
        const pts = [px(e0[0], top, e0[1]), px(e1[0], top, e1[1]), px(e1[0], bot, e1[1]), px(e0[0], bot, e0[1])].map(s);
        ctx.fillStyle = dz ? C.deep : C.deepR; poly(ctx, pts); ctx.fill();
        const lw = Math.max(1, 0.035 * k * px(1, 0, 0).x);
        const streaks = dz ? [[0.08, C.streakB, 1.2], [0.2, C.streakA, 1], [0.46, C.streakA, 0.8], [0.72, C.streakC, 1]] : [[0.3, C.streakC, 1], [0.62, C.streakA, 0.8], [0.88, C.streakC, 1]];
        for (const [f, col, w] of streaks) {
          const a = s(px(e0[0] + along[0] * f, top - 0.05, e0[1] + along[1] * f)), b = s(px(e0[0] + along[0] * f, bot + (hash(x, z, f * 10) * 0.4 + 0.1) * T, e0[1] + along[1] * f));
          ctx.strokeStyle = col; ctx.lineWidth = lw * w; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        }
      } });
      const fx = x + dx, fz = z + dz;
      out.push({ key: [fx + fz, 1, fx + fz, -1], draw(ctx, ox, oy, k) {
        const s = S(ox, oy, k), U = px(1, 0, 0).x * k;
        const blob = (wx, wz, r, h) => {
          const b = s(px(wx, bot + h, wz));
          ctx.fillStyle = C.foamD; ctx.beginPath(); ctx.ellipse(b[0], b[1] + r * U * 0.35, r * U, r * U * 0.55, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = C.foam; ctx.beginPath(); ctx.ellipse(b[0], b[1], r * U, r * U * 0.55, 0, 0, Math.PI * 2); ctx.fill();
        };
        for (let j = 0; j < 5; j++) {
          const f = 0.1 + j * 0.2, off = 0.06 + hash(x, z, j) * 0.08;
          blob(e0[0] + along[0] * f + dx * off, e0[1] + along[1] * f + dz * off, 0.1 + hash(z, x, j) * 0.06, 0.02);
        }
        if (dz) {
          const cx = e0[0] + 0.3, cz = e0[1] + 0.22;
          for (const [h, r] of [[0.02, 0.4], [0.16, 0.32], [0.3, 0.22], [0.42, 0.12]]) blob(cx, cz, r, h * T);
        }
      } });
    }
  }
  return out;
}

export function bridgeLogItems(L, T, px, x, z, axis) {
  const c = L.cells[z][x], isLog = (n) => n && n.s === "bridge" && n.m === "logs";
  const [ax, az] = axis === "x" ? [1, 0] : [0, 1];
  let a = 0, b = 0;
  while (isLog(cellAt(L, x - (a + 1) * ax, z - (a + 1) * az))) a++;
  while (isLog(cellAt(L, x + (b + 1) * ax, z + (b + 1) * az))) b++;
  const span = a + b + 1, base = c.h * T - 0.12;
  const sag = (u) => 0.22 * Math.sin(Math.PI * Math.min(1, Math.max(0, u)));
  const at = (f) => { const u = (a + f) / span; return base - sag(u); };
  return { key: [x + z, 0, c.h * T + 0.01, x], draw(ctx, ox, oy, k) {
    const s = (p) => [ox + p.x * k, oy + p.y * k], U = px(1, 0, 0).x * k;
    const P = (along, across, y) => s(axis === "x" ? px(x + along, y, z + across) : px(x + across, y, z + along));
    ctx.lineCap = "round";
    for (const r of [0.22, 0.78]) {
      const p0 = P(0, r, at(0) + 0.1), p1 = P(1, r, at(1) + 0.1), pm = P(0.5, r, at(0.5) + 0.1);
      ctx.strokeStyle = C.rope; ctx.lineWidth = Math.max(1, 0.035 * U);
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.quadraticCurveTo(2 * pm[0] - (p0[0] + p1[0]) / 2, 2 * pm[1] - (p0[1] + p1[1]) / 2, p1[0], p1[1]); ctx.stroke();
    }
    const d = 0.5 * U;
    for (const f of [0.27, 0.73]) {
      const y = at(f), A = P(f, 0.36, y), B = P(f, 0.7, y);
      ctx.strokeStyle = C.barkSh; ctx.lineWidth = d; ctx.beginPath(); ctx.moveTo(A[0], A[1] + d * 0.12); ctx.lineTo(B[0], B[1] + d * 0.12); ctx.stroke();
      ctx.strokeStyle = C.bark; ctx.lineWidth = d * 0.82; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
      ctx.strokeStyle = C.barkHi; ctx.lineWidth = d * 0.3; ctx.beginPath(); ctx.moveTo(A[0], A[1] - d * 0.2); ctx.lineTo(B[0], B[1] - d * 0.2); ctx.stroke();
      const E = B;
      ctx.fillStyle = C.capRim; ctx.beginPath(); ctx.ellipse(E[0], E[1] + d * 0.04, d * 0.5, d * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.cap; ctx.beginPath(); ctx.ellipse(E[0] - d * 0.04, E[1], d * 0.36, d * 0.38, 0, 0, Math.PI * 2); ctx.fill();
    }
  } };
}
