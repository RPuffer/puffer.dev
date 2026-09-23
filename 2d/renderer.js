import { cellAt } from "../core/level.js";
import { levelScreenBounds } from "../core/iso.js";
import { CATALOG } from "../core/catalog.js";
import { view2d } from "./view.js";
import { scaledSprite } from "./scale.js";
import { ALIAS, MUL, expandDecor } from "./decor2d.js";
import { waterItems, bridgeLogItems, waterLevel } from "./water2d.js";
import { surfaceItems, plazaDirt } from "./surface2d.js";

const SURFACE = { grass: "tile-grass", sand: "tile-sand", dirt: "tile-dirt", stone: "tile-stone", water: "tile-water", none: "tile-cliff" };
const WATER_SLAB = 16;
const STRIP_ROWS = [112, 120];
const STRIP_FROM = 118;
const FACING = ["front", "right", "back", "left"];

export function createRenderer(container, sprites) {
  const canvas = document.createElement("canvas");
  container.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  const M = sprites.manifest;
  let S, V, scale = 1, dpr = 1, cw = 0, ch = 0, T = 1, P = 1, maxH = 0;
  const focus = { x: 0, y: 0 };
  let statics = [];
  const off = document.createElement("canvas"), offCtx = off.getContext("2d");

  const px = (x, y, z) => { const s = S.proj.project(x, y, z, P); return { x: s.sx, y: s.sy }; };

  const resize = () => {
    dpr = Math.min(3, devicePixelRatio || 1);
    cw = container.clientWidth || innerWidth; ch = container.clientHeight || innerHeight;
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    if (!V) return;
    if (V.fit) { const b = levelScreenBounds(S.level, S.proj, P); scale = 0.95 * Math.min(cw / (b.maxX - b.minX), ch / (b.maxY - b.minY)); }
    else scale = V.scale * Math.min(cw / V.frame[0], ch / V.frame[1]);
  };

  const item = (sp, ax, ay, key, crop) => ({ sp, ax, ay, key, crop });

  const wlf = (c) => (c && c.lift) || 0;
  const lf = (c) => (c && c.s !== "bridge" && c.lift) || 0;
  const cellTop = (c) => (c.s === "ramp" ? c.h - 0.5 : c.h) + lf(c);
  const heroLift = (a) => lf(cellAt(S.level, Math.floor(a.pos.x), Math.floor(a.pos.z)));

  const buildStatics = () => {
    const L = S.level, [W, D] = L.size, out = [];
    const B = M.blockStep / (S.proj.up[1] * P), base = -0.4;
    const falls = [];
    for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
      const c = L.cells[z][x], diag = x + z;
      const push = (id, y, crop, lvl = y, sp = sprites.get(id)) => { if (!sp) return; const p = px(x + 0.5, y, z + 0.5); out.push(item(sp, p.x, p.y, [diag, 0, lvl, x], crop)); };
      const floorY = (topY) => {
        let f = topY - B;
        for (const [dx, dz] of [[1, 0], [0, 1]]) {
          const void0 = (c2) => !c2 || (c2.h === 0 && c2.s === "none");
          let n = cellAt(L, x + dx, z + dz), skip = 0;
          for (let j = 2; j <= 3 && void0(n); j++) { n = cellAt(L, x + j * dx, z + j * dz); skip = B; }
          if (void0(n)) { if (c.h >= 3) f = Math.min(f, 0.3 * T); continue; }
          if (skip && (n.h < 1 || n.s === "water" || (n.s === "bridge" && n.w == null))) continue;
          if (n.s === "bridge" && n.w == null) continue;
          const ny = (n.s === "bridge" ? (n.w != null ? (n.w + wlf(n)) * T : topY - B) : n.s === "ramp" ? (n.h - 1 + lf(n)) * T : (n.h + lf(n)) * T) - skip;
          f = Math.min(f, ny);
        }
        return Math.max(base, f);
      };
      const column = (topY, id, fillId = id) => {
        const fl = floorY(topY);
        const sp = sprites.get(id), fill = sprites.get(fillId);
        if (topY - B > fl + 0.02 && fill) {
          const bottomTop = fl + B;
          push(fillId, bottomTop, undefined, bottomTop);
          const a = px(x + 0.5, topY, z + 0.5), b = px(x + 0.5, bottomTop, z + 0.5);
          const y0 = a.y - fill.anchor[1] + STRIP_FROM, y1 = b.y - fill.anchor[1] + STRIP_ROWS[1];
          if (y1 > y0) out.push({ sp: fill, ax: a.x, ay: a.y, key: [diag, 0, topY + 0.005, x], strip: [STRIP_ROWS[0], STRIP_ROWS[1], y0, y1] });
        }
        push(id, topY);
      };
      const water = (h0) => { const h = h0 + wlf(c); return h >= 1 ? column(h * T, "tile-water") : push("tile-water", h * T, M.topFaceHeight + WATER_SLAB); };
      if (c.s === "bridge") {
        if (c.w != null) water(c.w);
        const nb = (dx, dz) => { const n = cellAt(L, x + dx, z + dz); return n && n.h >= 1 && n.s !== "water"; };
        const axis = nb(1, 0) || nb(-1, 0) ? "x" : "z";
        if (c.m === "logs") out.push(bridgeLogItems(L, T, px, x, z, axis));
        else push("tile-bridge-" + axis, c.h * T, undefined, c.h * T + 0.01);
      } else if (c.h === 0) {
        if (c.s === "water") water(0);
        else if (c.s !== "none") push(SURFACE[c.s], 0, M.topFaceHeight + WATER_SLAB);
      } else if (c.s === "water") {
        water(c.h);
      } else if (c.s === "ramp" && c.m === "stone") {
        column((c.h - 0.65 + lf(c)) * T, "tile-stone");
      } else if (c.s === "ramp") {
        column((c.h + lf(c)) * T - B, "tile-cliff");
        const id = c.m && sprites.get(`tile-ramp-${c.d}-${c.m}`) ? `tile-ramp-${c.d}-${c.m}` : "tile-ramp-" + c.d;
        push(id, (c.h + lf(c)) * T, undefined, (c.h + lf(c)) * T);
      } else {
        column((c.h + lf(c)) * T, c.s === "dirt" && !plazaDirt(L, x, z) ? "tile-grass" : SURFACE[c.s] || "tile-cliff");
      }
    }
    for (const [i, d] of expandDecor(L.decor).entries()) {
      const spec = CATALOG[d.base || d.t] || CATALOG[d.t];
      const c = cellAt(L, d.x, d.z);
      if (d.t === "waterfall") {
        const r = (d.rot || 0) % 4, [bx, bz] = [[0, -1], [1, 0], [0, 1], [-1, 0]][r];
        const src = cellAt(L, d.x + bx, d.z + bz);
        if (waterLevel(src) != null) continue;
        const srcY = src ? (src.s === "bridge" ? (src.w ?? 0) : src.h) * T : c.h * T + 1;
        const footY = cellTop(c) * T, fall = Math.max(B, srcY - footY);
        const sp = sprites.decor("waterfall", 0, r % 2);
        if (!sp) continue;
        const p = px(d.x + 0.5, srcY, d.z + 0.5), p2 = px(d.x + 0.5, srcY - (fall - B), d.z + 0.5);
        out.push(item(sp, p2.x, p2.y, [d.x + d.z, 0, srcY - 0.02, d.x]));
        out.push(item(sp, p.x, p.y, [d.x + d.z, 0, srcY - 0.01, d.x], sp.h - 40));
        continue;
      }
      const al = ALIAS[d.t];
      const sp = al && !sprites.byType.has(d.t) ? sprites.decor(al.t, al.v, d.rot || 0) : sprites.decor(d.t, d.v || 0, d.rot || 0);
      if (!sp) continue;
      const mul = (al && !sprites.byType.has(d.t) ? al.mul : 1) * (MUL[d.t] || 1);
      const [fw, fd] = (d.rot || 0) % 2 ? [spec.footprint[1], spec.footprint[0]] : spec.footprint;
      let wx = d.x + fw / 2 + (d.ox || 0), wz = d.z + fd / 2 + (d.oz || 0), y = cellTop(c) * T;
      if (spec.attach === "cliff") { const r = (d.rot || 0) % 4, e = [[0, -0.5], [0.5, 0], [0, 0.5], [-0.5, 0]][r]; wx += e[0]; wz += e[1]; }
      if (spec.attach === "under") y = ((c.s === "bridge" ? (c.w ?? 0) : 0) + wlf(c)) * T;
      const p = px(wx, y, wz);
      const it = item(sp, p.x, p.y, [frontDiag(wx, wz, y / T, d.x + d.z), 1, wx + wz, i]);
      it.mul = mul;
      if (spec.attach === "cliff") it.anchor = [sp.anchor[0], 6];
      out.push(it);
    }
    out.push(...waterItems(L, T, px), ...surfaceItems(L, T, px, cellTop));
    return out;
  };

  const frontDiag = (wx, wz, y, own) => {
    const L = S.level, r = 0.3;
    let best = own;
    for (const [dx, dz] of [[r, r], [r, -r], [-r, r]]) {
      const cx = Math.floor(wx + dx), cz = Math.floor(wz + dz), c = cellAt(L, cx, cz);
      if (c && cellTop(c) <= y + 0.01 && cx + cz > best && Math.abs(cx - Math.floor(wx)) + Math.abs(cz - Math.floor(wz)) <= 1) best = cx + cz;
    }
    return best;
  };

  const heroSprite = (a) => {
    const q = ((Math.round(a.facing / (Math.PI / 2)) % 4) + 4) % 4;
    const frame = a.moving ? Math.floor(a.walkPhase / Math.PI) & 1 : 0;
    return sprites.get(`hero-${FACING[q]}-${frame}`);
  };

  const target = () => {
    const a = S.actor;
    if (S.params.hero === "0" && V.center) { const p = px(V.center[0], V.center[1], V.center[2]); return { x: p.x + V.nudge[0], y: p.y + V.nudge[1] }; }
    const p = px(a.pos.x, (a.y + heroLift(a) + 0.4) * T, a.pos.z);
    const b = levelScreenBounds(S.level, S.proj, P), hw = cw / 2 / scale, hh = ch / 2 / scale;
    const clamp = (v, lo, hi, half) => (hi - lo <= 2 * half ? (lo + hi) / 2 : Math.min(hi - half, Math.max(lo + half, v)));
    return { x: clamp(p.x, b.minX, b.maxX, hw), y: clamp(p.y, b.minY, b.maxY, hh) };
  };

  const cmp = (a, b) => { for (let i = 0; i < 4; i++) if (a.key[i] !== b.key[i]) return a.key[i] - b.key[i]; return 0; };

  return {
    element: canvas,
    init(state) {
      S = state;
      const r = S.proj.project(1, 0, 0, 1);
      P = M.tileWidth / 2 / Math.abs(r.sx);
      V = view2d(state.level, state.params, P);
      T = S.view.tileH;
      for (const row of S.level.cells) for (const c of row) maxH = Math.max(maxH, c.h);
      resize();
      addEventListener("resize", resize);
      statics = buildStatics().sort(cmp);
      const t = target(); focus.x = t.x; focus.y = t.y;
      window.__r2d = { get focus() { return focus; }, get scale() { return scale; }, P, T, toScreen: (x, y, z) => { const p = px(x, y, z); return [(p.x - focus.x) * scale + cw / 2, (p.y - focus.y) * scale + ch / 2]; } };
    },
    update(state, dt) {
      const t = target(), k = dt > 0 ? 1 - Math.exp(-dt * 5) : 1;
      focus.x += (t.x - focus.x) * k; focus.y += (t.y - focus.y) * k;
    },
    render() {
      const k = scale * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = S.level.bg || "#404040";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = !Number.isInteger(k) || k < 1;
      ctx.imageSmoothingQuality = "high";
      const ox = canvas.width / 2 - focus.x * k, oy = canvas.height / 2 - focus.y * k;
      const a = S.actor;
      let list = statics, hero = null;
      if (S.params.hero !== "0") {
        const hl = a.y + heroLift(a), sp = heroSprite(a), p = px(a.pos.x, hl * T, a.pos.z);
        hero = item(sp, p.x, p.y, [frontDiag(a.pos.x, a.pos.z, hl, Math.floor(a.pos.x) + Math.floor(a.pos.z)), 1, a.pos.x + a.pos.z, 1e9]);
        list = statics.slice();
        let lo = 0, hi = list.length;
        while (lo < hi) { const m = (lo + hi) >> 1; if (cmp(list[m], hero) < 0) lo = m + 1; else hi = m; }
        list.splice(lo, 0, hero);
      }
      let hx = 0, hy = 0, hr = 0, after = false;
      if (hero && S.params.xray !== "0") { hx = ox + hero.ax * k; hy = oy + (hero.ay - hero.sp.anchor[1] * 0.55) * k; hr = hero.sp.h * 0.62 * k; }
      for (const it of list) {
        if (it.draw) { it.draw(ctx, ox, oy, k); continue; }
        const km = k * (it.mul || 1), an = it.anchor || it.sp.anchor;
        const sc = scaledSprite(it.sp, km);
        const dx = Math.round(ox + it.ax * k - an[0] * km * sc.fx), dy = Math.round(oy + it.ay * k - an[1] * km * sc.fy);
        const sh = it.crop ? Math.min(sc.h, Math.round(it.crop * km * sc.fy)) : sc.h;
        if (it.strip) {
          const [r0, r1, y0, y1] = it.strip, sy0 = r0 * k * sc.fy, sh2 = (r1 - r0) * k * sc.fy;
          const t0 = Math.round(oy + y0 * k), t1 = Math.round(oy + y1 * k);
          if (t1 > t0) ctx.drawImage(sc.c, 0, sy0, sc.w, sh2, dx, t0, sc.w, t1 - t0);
          continue;
        }
        if (it === hero) { after = true; ctx.drawImage(sc.c, 0, 0, sc.w, sh, dx, dy, sc.w, sh); continue; }
        if (after && hr > 0 && it.key[1] === 1 && dx < hx + hr && dx + sc.w > hx - hr && dy < hy + hr && dy + sh > hy - hr) {
          off.width = sc.w; off.height = sh;
          offCtx.globalCompositeOperation = "source-over";
          offCtx.drawImage(sc.c, 0, 0);
          offCtx.globalCompositeOperation = "destination-out";
          const g = offCtx.createRadialGradient(hx - dx, hy - dy, hr * 0.55, hx - dx, hy - dy, hr);
          g.addColorStop(0, "rgba(0,0,0,0.72)"); g.addColorStop(1, "rgba(0,0,0,0)");
          offCtx.fillStyle = g; offCtx.fillRect(0, 0, sc.w, sh);
          ctx.drawImage(off, dx, dy);
          continue;
        }
        ctx.drawImage(sc.c, 0, 0, sc.w, sh, dx, dy, sc.w, sh);
      }
    },
    pick(x, y) {
      const k = scale;
      const wx = (x - cw / 2) / k + focus.x, wy = (y - ch / 2) / k + focus.y;
      const levels = [...new Set(S.level.cells.flat().filter((c) => c.h >= 1 && c.s !== "none" && c.s !== "water").map(cellTop))].sort((a, b) => b - a);
      let best = null;
      for (const yy of levels) {
        const g = S.proj.unprojectGround(wx, wy, yy * T, P);
        const cx = Math.floor(g.x), cz = Math.floor(g.z), c = cellAt(S.level, cx, cz);
        if (c && c.h >= 1 && c.s !== "none" && c.s !== "water" && Math.abs(cellTop(c) - yy) < 1e-6 && (!best || cx + cz > best[0] + best[1])) best = [cx, cz];
      }
      return best;
    },
  };
}
