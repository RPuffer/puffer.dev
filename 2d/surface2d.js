import { cellAt } from "../core/level.js";

const C = { plaza: "#ffe082", mottle: "#f8d87c", rim: "#f4c41e", rimHi: "#f1b900", grid: "#f6d27a", patch: "#ffe087", patchEdge: "#f1d676" };

function hash(x, z, i) { let h = (x * 374761393 + z * 668265263 + i * 1442695041) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return (h & 0xffff) / 0xffff; }

const poly = (ctx, pts) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); };

export const plazaDirt = (L, x, z) => { const c = cellAt(L, x, z); return !!c && c.s === "dirt" && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => { const n = cellAt(L, x + dx, z + dz); return n && n.s === "dirt" && n.h === c.h && !n.lift; }); };

export function surfaceItems(L, T, px, topOf) {
  const out = [], [W, D] = L.size;
  const isDirt = (c, h) => c && c.s === "dirt" && c.h === h && !c.lift;
  for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    const c = L.cells[z][x];
    if (c.h < 1) continue;
    const y = topOf(c) * T, key = [x + z, 0, y + 0.006, x];
    const plaza = c.s === "dirt" && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => isDirt(cellAt(L, x + dx, z + dz), c.h));
    if (plaza) {
      const nb = (dx, dz) => isDirt(cellAt(L, x + dx, z + dz), c.h);
      const i0 = nb(-1, 0) ? 0 : 0.09, i1 = nb(1, 0) ? 0 : 0.09, j0 = nb(0, -1) ? 0 : 0.09, j1 = nb(0, 1) ? 0 : 0.09;
      out.push({ key, draw(ctx, ox, oy, k) {
        const s = (wx, wz) => { const p = px(wx, y, wz); return [ox + p.x * k, oy + p.y * k]; };
        const U = px(1, 0, 0).x * k;
        const rim = 0.05;
        ctx.fillStyle = C.rim; poly(ctx, [s(x + i0 - rim * !!i0, z + j0 - rim * !!j0), s(x + 1 - i1 + rim * !!i1, z + j0 - rim * !!j0), s(x + 1 - i1 + rim * !!i1, z + 1 - j1 + rim * !!j1), s(x + i0 - rim * !!i0, z + 1 - j1 + rim * !!j1)]); ctx.fill();
        ctx.fillStyle = C.plaza; poly(ctx, [s(x + i0, z + j0), s(x + 1 - i1, z + j0), s(x + 1 - i1, z + 1 - j1), s(x + i0, z + 1 - j1)]); ctx.fill();
        ctx.fillStyle = C.mottle;
        for (let n = 0; n < 5; n++) {
          const p = s(x + 0.15 + 0.7 * hash(x, z, n), z + 0.15 + 0.7 * hash(z, x, n + 9)), r = (0.05 + 0.05 * hash(x + 3, z, n)) * U;
          ctx.beginPath(); ctx.ellipse(p[0], p[1], r, r * 0.58, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.strokeStyle = C.grid; ctx.lineWidth = Math.max(1, 0.02 * U);
        ctx.beginPath();
        if (nb(1, 0)) { const a = s(x + 1, z + j0), b = s(x + 1, z + 1 - j1); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
        if (nb(0, 1)) { const a = s(x + i0, z + 1), b = s(x + 1 - i1, z + 1); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
        ctx.stroke();
      } });
      continue;
    }
    if (!(c.patch || c.s === "dirt")) continue;
    out.push({ key, draw(ctx, ox, oy, k) {
      const s = (wx, wz) => { const p = px(wx, y, wz); return [ox + p.x * k, oy + p.y * k]; };
      const n = 10, cx = x + 0.5 + (hash(x, z, 1) - 0.5) * 0.1, cz = z + 0.5 + (hash(x, z, 2) - 0.5) * 0.1;
      const pts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2, r = 0.36 + 0.1 * hash(x, z, i + 5);
        const ca = Math.cos(a), sa = Math.sin(a), m = Math.max(Math.abs(ca), Math.abs(sa));
        pts.push(s(cx + (ca / m) * r, cz + (sa / m) * r));
      }
      ctx.fillStyle = C.patchEdge; ctx.save(); ctx.translate(0, Math.max(1, k * 1.2)); poly(ctx, pts); ctx.fill(); ctx.restore();
      ctx.fillStyle = C.patch; poly(ctx, pts); ctx.fill();
    } });
  }
  return out;
}
