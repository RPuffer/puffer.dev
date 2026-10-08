import puppeteer from "puppeteer-core";
import path from "node:path";
import fs from "node:fs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.findIndex((a) => a === k || a.startsWith(k + "=")); if (i < 0) return d; const a = args[i]; if (a.includes("=")) { args.splice(i, 1); return a.split("=")[1]; } const v = args[i + 1]; args.splice(i, 2); return v; };
const BASE = opt("--base", "http://localhost:8765").replace(/\/$/, "");
const W = +opt("--w", 900), H = +opt("--h", 800);
const MIN_HERO = +opt("--min-hero", 0.3), MIN_FLOOR = +opt("--min-floor", 0.3), MAX_GAP = +opt("--max-gap", 1);
const jsonOut = opt("--json", null), QUERY = opt("--query", ""), YAW = opt("--yaw", "all");
const YAWS = YAW === "all" ? [45, 135, 225, 315] : YAW != null && YAW !== "none" ? [+YAW] : [null];
const names = (args[0] || "").split(",").filter(Boolean);
if (!names.length || names[0] === "all") {
  const run = JSON.parse(fs.readFileSync(path.join(root, "levels/run.json"), "utf8"));
  names.splice(0, names.length, ...(Array.isArray(run) ? run : run.order));
}

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  userDataDir: path.join(root, process.env.PP_PROFILE || ".pp-profile-vis"),
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-first-run", "--disable-background-networking", "--hide-scrollbars", "--disable-cache"],
});

async function probe(name, yaw = null) {
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  const problems = [];
  page.on("pageerror", (e) => problems.push(e.message));
  await page.goto(`${BASE}/3d/index.html?level=${name}&reset=1&ui=0&nav=0${yaw != null ? "&yaw=" + yaw : ""}${QUERY ? "&" + QUERY : ""}`);
  const ok = await page.waitForFunction(() => window.__done || window.__error, { timeout: 30000, polling: 100 }).then(() => page.evaluate(() => !window.__error)).catch(() => false);
  if (!ok) { await page.close(); return { name, error: problems[0] || "page did not load" }; }
  const res = await page.evaluate(async (MIN_HERO, MIN_FLOOR, MAX_GAP) => {
    const THREE = await import("three");
    const { findPath } = await import("/core/path.js");
    const { CATALOG, footprintCells } = await import("/core/catalog.js");
    const { surfaceHeight, isWalkable, canStep, DIRS, OPPOSITE: OPP } = await import("/core/level.js");
    const { edgeKey } = await import("/core/interact.js");
    const g = window.__game;
    g.stop();
    const S = g.state, L = S.level, a = S.actor;
    const { gl, scene, camera } = g.renderer.three;
    const tileH = S.view.tileH;
    const things = S.things?.things || L.things || [];
    for (const t of things) if (t.kind === "gate") { for (const [x, z] of t.blocks || []) L.blocked.delete(x + "," + z); if (t.edge && L.edges) L.edges.delete(edgeKey(t.edge[0], t.edge[1])); }
    const key = (c) => c[0] + "," + c[1];
    const spawn = L.spawn.slice();
    const entry = things.find((t) => t.kind === "elevator" && t.role === "entry");
    const exit = things.find((t) => t.kind === "elevator" && t.role === "exit");
    const watcher = things.find((t) => t.kind === "watcher");
    const gate = things.find((t) => t.kind === "gate");
    const lead = watcher && L.decor.find((d) => d.watch === watcher.id);
    const figCells = lead ? footprintCells(lead.t, lead.x, lead.z, lead.rot || 0) : [];
    const roles = new Map();
    const add = (c, role) => { if (!c) return; const k = key(c); if (!roles.has(k)) roles.set(k, { cell: c.slice(), roles: [], views: [] }); const r = roles.get(k); if (!r.roles.includes(role)) r.roles.push(role); };
    const setPrev = (c, p, why = "step") => { const r = roles.get(key(c)); if (r && p && !r.views.some((v) => key(v.from) === key(p))) r.views.push({ from: p.slice(), why }); };
    const goal = exit ? [exit.x, exit.z] : null;
    let court = null;
    if (figCells.length) {
      let best = null;
      for (let z = 0; z < L.size[1]; z++) for (let x = 0; x < L.size[0]; x++) {
        if (!isWalkable(L, x, z)) continue;
        const d = Math.min(...figCells.map(([fx, fz]) => Math.max(Math.abs(fx - x), Math.abs(fz - z))));
        if (d !== 1) continue;
        const p = findPath(L, spawn, [x, z]);
        if (p && (!best || p.length < best.length)) best = p;
      }
      if (best) court = best[best.length - 1];
    }
    add(spawn, "spawn");
    const main = goal ? findPath(L, spawn, goal) : court ? findPath(L, spawn, court) : null;
    if (main) main.forEach((c, i) => { add(c, "route"); setPrev(c, main[i - 1]); });
    if (entry) {
      const e = [entry.x, entry.z];
      add(e, "entry");
      const p = findPath(L, e, goal || spawn) || findPath(L, e, spawn);
      if (p && p[1]) { add(p[1], "entry-step"); setPrev(p[1], e); }
    }
    if (exit) {
      const e = [exit.x, exit.z];
      add(e, "exit");
      if (main && main.length > 1) { const s = main[main.length - 2]; add(s, "exit-step"); setPrev(e, s); }
    }
    for (const c of gate?.threshold || []) add(c, "threshold");
    if (gate?.edge) { add(gate.edge[1], "gate-far"); const r = roles.get(key(gate.edge[1])); r.views = r.views.filter((v) => key(v.from) !== key(gate.edge[0])); }
    if (court) add(court, "court");

    const hero = scene.children.find((o) => o.userData?.animate);
    const magenta = new THREE.MeshBasicMaterial({ color: 0xff00ff });
    const cyan = new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide });
    const heroMeshes = []; hero.traverse((o) => { if (o.isMesh) heroMeshes.push([o, o.material]); });
    const marker = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.56, 4, 4).rotateX(-Math.PI / 2), cyan);
    marker.renderOrder = 3; marker.visible = false; scene.add(marker);
    const others = scene.children.filter((o) => o !== hero && o !== marker);
    const gateIds = new Set(things.filter((t) => t.kind === "gate").map((t) => t.id));
    const lifts = new Set(things.filter((t) => t.kind === "elevator").map((t) => key([t.x, t.z])));
    const gateMeshes = []; scene.getObjectByName("things")?.traverse((o) => { if (gateIds.has(o.userData?.thing)) gateMeshes.push(o); });
    const shut = (on) => { for (const o of gateMeshes) o.visible = on; };
    const before = new Set();
    if (main && gate?.edge) { const gi = main.findIndex((c) => key(c) === key(gate.edge[0])); if (gi >= 0) main.slice(0, gi).forEach((c) => before.add(key(c))); }
    const glc = gl.getContext();
    const dpr = gl.getPixelRatio();
    const place = (c) => {
      a.cell = c.slice(); a.path = []; a.held = null; a.tapDir = null; a.moving = false; a.walkPhase = 0;
      a.pos.x = c[0] + 0.5; a.pos.z = c[1] + 0.5; a.y = surfaceHeight(L, a.pos.x, a.pos.z);
      g.renderer.update(S, 1); g.renderer.update(S, 0); g.renderer.render(S, 0);
    };
    const grab = (match, box) => {
      const W0 = glc.drawingBufferWidth, H0 = glc.drawingBufferHeight;
      const x0 = Math.max(0, Math.floor(box[0] * dpr)), y0 = Math.max(0, Math.floor(box[1] * dpr));
      const x1 = Math.min(W0, Math.ceil(box[2] * dpr)), y1 = Math.min(H0, Math.ceil(box[3] * dpr));
      if (x1 <= x0 || y1 <= y0) return new Uint8Array(0);
      const w = x1 - x0, h = y1 - y0, buf = new Uint8Array(w * h * 4), out = new Uint8Array(w * h);
      glc.readPixels(x0, H0 - y1, w, h, glc.RGBA, glc.UNSIGNED_BYTE, buf);
      for (let i = 0; i < out.length; i++) out[i] = match(buf[i * 4], buf[i * 4 + 1], buf[i * 4 + 2]) ? 1 : 0;
      return out;
    };
    const sum = (m) => m.reduce((n, v) => n + v, 0);
    const both = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] && b[i]) n++; return n; };
    const isMag = (r, gg, b) => r > 200 && gg < 70 && b > 200;
    const isCyan = (r, gg, b) => r < 70 && gg > 200 && b > 200;
    const screenBox = (cx, y0, cz, y1, pad = 0.45) => {
      const el = gl.domElement, w = el.clientWidth, h = el.clientHeight;
      let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
      for (const [dx, dz] of [[-pad, -pad], [pad, -pad], [-pad, pad], [pad, pad]]) for (const y of [y0, y1]) {
        const v = new THREE.Vector3(cx + dx, y, cz + dz).project(camera);
        const sx = (v.x * 0.5 + 0.5) * w, sy = (-v.y * 0.5 + 0.5) * h;
        bx0 = Math.min(bx0, sx); by0 = Math.min(by0, sy); bx1 = Math.max(bx1, sx); by1 = Math.max(by1, sy);
      }
      return [bx0 - 2, by0 - 2, bx1 + 2, by1 + 2];
    };
    const render = (xray) => { S.params.xray = xray ? "1" : "0"; g.renderer.render(S, 0); };
    const solo = (on) => { for (const o of others) { if (on) { o.userData.__vis = o.visible; o.visible = false; } else o.visible = o.userData.__vis; } };
    const heroFrac = (c) => {
      place(c); shut(before.has(key(c)));
      for (const [m] of heroMeshes) m.material = magenta;
      const y = hero.position.y, box = screenBox(hero.position.x, y, hero.position.z, y + 1.0, 0.35);
      solo(true); render(false); const mask = grab(isMag, box), total = sum(mask); solo(false);
      render(false); const direct = both(mask, grab(isMag, box));
      render(true); const xr = both(mask, grab(isMag, box));
      for (const [m, mat] of heroMeshes) m.material = mat;
      return { total, direct: total ? direct / total : 0, xray: total ? xr / total : 0, offscreen: !total };
    };
    const facesAway = (c) => {
      const cl = L.cells[c[1]][c[0]];
      if (cl.s !== "ramp") return false;
      const [dx, dz] = DIRS[cl.d];
      return dx * tileH * S.proj.dir[0] + S.proj.dir[1] + dz * tileH * S.proj.dir[2] <= 0.05;
    };
    const floorFrac = (c, from, closed = before.has(key(from))) => {
      if (facesAway(c)) return { total: 0, frac: 0, away: true };
      shut(closed);
      place(from);
      const lift = lifts.has(key(c)) ? 0.25 : 0.15, pos = marker.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setY(i, surfaceHeight(L, c[0] + 0.5 + pos.getX(i), c[1] + 0.5 + pos.getZ(i)) * tileH + lift);
      pos.needsUpdate = true; marker.geometry.computeBoundingSphere();
      marker.position.set(c[0] + 0.5, 0, c[1] + 0.5); marker.visible = true;
      const top = surfaceHeight(L, c[0] + 0.5, c[1] + 0.5) * tileH + lift;
      const box = screenBox(c[0] + 0.5, top - tileH, c[1] + 0.5, top + tileH, 0.3);
      solo(true); hero.visible = false; render(false); const mask = grab(isCyan, box), total = sum(mask); hero.visible = true; solo(false);
      for (const [m] of heroMeshes) m.visible = false;
      render(true); const seen = both(mask, grab(isCyan, box));
      for (const [m] of heroMeshes) m.visible = true;
      marker.visible = false;
      return { total, frac: total ? seen / total : 0 };
    };
    const P = S.proj, dir = P.dir;
    const topAt = (x, z) => { const c = L.cells[z]?.[x]; return c && c.s !== "none" ? (c.h || 0) * tileH : 0; };
    const decorTop = new Map();
    for (const d of L.decor) {
      const sp = CATALOG[d.t]; if (!sp) continue;
      for (const [fx, fz] of footprintCells(d.t, d.x, d.z, d.rot || 0)) {
        const t = topAt(fx, fz) + (sp.height || 1) * tileH;
        const k = fx + "," + fz; if (!decorTop.has(k) || decorTop.get(k).top < t) decorTop.set(k, { top: t, name: `${d.t}@${d.x},${d.z}` });
      }
    }
    const occluder = (c, y0) => {
      let best = null;
      for (let t = 0.3; t < 30; t += 0.1) {
        const px = c[0] + 0.5 + dir[0] * t, py = y0 + dir[1] * t, pz = c[1] + 0.5 + dir[2] * t;
        const x = Math.floor(px), z = Math.floor(pz);
        if (x < 0 || z < 0 || x >= L.size[0] || z >= L.size[1]) { if (px > L.size[0] + 1 || pz > L.size[1] + 1 || px < -1 || pz < -1) break; continue; }
        if (x === c[0] && z === c[1]) continue;
        const ter = topAt(x, z), dec = decorTop.get(x + "," + z);
        if (dec && dec.top > py && (!best || dec.top > best.top)) best = { top: dec.top, name: dec.name };
        else if (ter > py && (!best || ter > best.top)) best = { top: ter, name: `terrain ${x},${z} h${L.cells[z][x].h}` };
      }
      return best?.name || null;
    };
    const out = [];
    for (const r of roles.values()) {
      const hf = heroFrac(r.cell);
      const views = r.views.map((v) => ({ ...v, ...floorFrac(r.cell, v.from) }));
      const how = hf.direct >= MIN_HERO ? "direct" : hf.xray >= MIN_HERO ? "x-ray" : null;
      const hidden = views.filter((v) => v.frac < MIN_FLOOR);
      const yh = surfaceHeight(L, r.cell[0] + 0.5, r.cell[1] + 0.5) * tileH;
      const occ = !how ? occluder(r.cell, yh + 0.45) : hidden.length ? (facesAway(r.cell) ? "ramp faces away from the camera" : occluder(r.cell, yh + 0.15)) : hf.direct < MIN_HERO ? occluder(r.cell, yh + 0.45) : null;
      const ramp = L.cells[r.cell[1]][r.cell[0]].s === "ramp";
      let forced = false;
      if (ramp && r.roles.includes("route") && (goal || court)) { const k = key(r.cell), had = L.blocked.has(k); L.blocked.add(k); forced = !findPath(L, spawn, goal || court); if (!had) L.blocked.delete(k); }
      out.push({ cell: r.cell, roles: r.roles, hero: hf, views, how, hidden: hidden.map((v) => v.from), pass: !!how && !hidden.length, occluder: occ, ramp, forced });
    }
    const landings = [];
    const landing = (role, from, to) => {
      const p = to && findPath(L, from, to);
      if (!p || p.length < 2) return;
      let ti = Math.min(6, p.length - 1);
      for (let i = 1; i <= ti; i++) if (L.cells[p[i][1]][p[i][0]].s === "ramp") { ti = i; break; }
      const target = p[ti];
      const toGoal = new Map([[key(to), 0]]), gq = [to];
      while (gq.length) { const c = gq.shift(); for (const k of Object.keys(DIRS)) { const n = [c[0] + DIRS[k][0], c[1] + DIRS[k][1]]; if (toGoal.has(key(n)) || !canStep(L, n[0], n[1], OPP[k])) continue; toGoal.set(key(n), toGoal.get(key(c)) + 1); gq.push(n); } }
      const need = toGoal.get(key(from)) - ti;
      const done = (c) => key(c) === key(target) || (toGoal.get(key(c)) ?? 1e9) <= need;
      const seen = new Map(), frac = (c, p = from) => { const k = key(c) + "<" + key(p); if (!seen.has(k)) seen.set(k, floorFrac(c, p, role === "entry").frac); return seen.get(k); };
      const sk = (c, g) => key(c) + "|" + g;
      const prevOf = new Map([[sk(from, 0), null]]), dist = new Map([[sk(from, 0), 0]]), q = [[from, 0]];
      let hit = null;
      while (q.length && !hit) {
        const [c, gaps] = q.shift(), d = dist.get(sk(c, gaps));
        if (d >= ti + 2) continue;
        for (const k of Object.keys(DIRS)) {
          if (!canStep(L, c[0], c[1], k)) continue;
          const n = [c[0] + DIRS[k][0], c[1] + DIRS[k][1]];
          const hidden = Math.max(frac(n), frac(n, c)) < MIN_FLOOR, ng = gaps + (hidden ? 1 : 0);
          if (hidden && (ng > MAX_GAP || L.cells[n[1]][n[0]].s === "ramp" || done(n))) continue;
          if (prevOf.has(sk(n, ng))) continue;
          prevOf.set(sk(n, ng), [c, gaps]); dist.set(sk(n, ng), d + 1); q.push([n, ng]);
          if (done(n)) { hit = [n, ng]; break; }
        }
      }
      if (hit) {
        const path = []; for (let st = hit; st; st = prevOf.get(sk(st[0], st[1]))) path.unshift(st[0]);
        landings.push({ role, from, target: hit[0], pass: true, path: path.slice(1).map((c, i) => ({ cell: c, frac: frac(c), step: frac(c, path[i]) })) });
      } else {
        const cells = p.slice(1, ti + 1).map((c) => ({ cell: c, frac: frac(c) }));
        const yh = (c) => surfaceHeight(L, c[0] + 0.5, c[1] + 0.5) * tileH + 0.15;
        landings.push({ role, from, target, pass: false, path: cells.map((c) => ({ ...c, occluder: c.frac < MIN_FLOOR ? (facesAway(c.cell) ? "ramp faces away from the camera" : occluder(c.cell, yh(c.cell))) : null })) });
      }
    };
    if (entry) landing("entry", [entry.x, entry.z], goal || spawn);
    if (exit) landing("exit", [exit.x, exit.z], spawn);
    return { cells: out, landings, route: main ? main.length : 0 };
  }, MIN_HERO, MIN_FLOOR, MAX_GAP);
  await page.close();
  return { name, ...res, problems };
}

const all = [];
const score = (c) => (c.pass ? 2 : 0) + (c.how === "direct" ? 1 : 0) + (c.hero?.direct || 0) + Math.min(...(c.views || []).map((v) => v.frac), 1);
function report(name, r) {
  console.log(`== ${name}${r.yaw != null ? " yaw " + r.yaw : ""} (route ${r.route} cells)`);
  if (!r.route) r.landings.push({ role: "route", from: "spawn", target: "exit", pass: false, path: [] });
  for (const c of r.cells) {
    const h = `hero ${Math.round(c.hero.direct * 100)}%/${Math.round(c.hero.xray * 100)}%`;
    const f = c.views.map((v) => ` floor-from ${v.from} ${Math.round(v.frac * 100)}%`).join("");
    const why = c.pass ? (c.how === "x-ray" ? " via x-ray" : "") : !c.how ? (c.hero.offscreen ? " hero off screen" : " hero hidden") : ` floor hidden from ${c.hidden.join(" ")}`;
    console.log(`${c.pass ? "PASS" : "FAIL"} ${name} ${c.cell} [${c.roles.join(" ")}] ${h}${f}${why}${c.occluder ? " occluder " + c.occluder : ""}`);
  }
  for (const l of r.landings) {
    const cells = l.path.map((c) => `${c.cell}:${Math.round(c.frac * 100)}%${c.step != null && c.frac < MIN_FLOOR ? "/" + Math.round(c.step * 100) + "%" : ""}${c.occluder ? "(" + c.occluder + ")" : ""}`).join(" ");
    console.log(`${l.pass ? "PASS" : "FAIL"} ${name} ${l.role} landing ${l.from} way off to ${l.target}: ${l.pass ? "visible path" : "hidden on shortest path"} ${cells}`);
  }
  const n = r.cells.length + r.landings.length, p = r.cells.filter((c) => c.pass).length + r.landings.filter((l) => l.pass).length, x = r.cells.filter((c) => c.pass && c.how === "x-ray").length;
  console.log(`${name}${r.yaw != null ? " yaw " + r.yaw : ""} ${p}/${n} pass (${x} via x-ray), ${n - p} fail`);
  return { n, p };
}
function merge(name, runs) {
  const base = runs[0], key = (c) => String(c);
  const cells = base.cells.map((c) => {
    const per = runs.map((r) => ({ yaw: r.yaw, c: r.cells.find((d) => key(d.cell) === key(c.cell)) })).filter((x) => x.c);
    const best = per.reduce((a, b) => (score(b.c) > score(a.c) ? b : a));
    const pick = c.pass ? per[0] : best;
    return { cell: c.cell, roles: c.roles, pass: c.pass, rotated: per.some((x) => x.c.pass), forced: !!c.forced, best: pick.yaw, per: per.map((x) => ({ yaw: x.yaw, pass: x.c.pass, how: x.c.how })) };
  });
  const landings = base.landings.map((l, i) => {
    const per = runs.map((r) => ({ yaw: r.yaw, l: r.landings[i] })).filter((x) => x.l && x.l.role === l.role);
    const ok = per.find((x) => x.l.pass);
    return { role: l.role, from: l.from, pass: l.pass, rotated: !!ok, best: l.pass ? per[0].yaw : ok?.yaw ?? null, per: per.map((x) => ({ yaw: x.yaw, pass: x.l.pass })) };
  });
  const marks = (per) => per.map((x) => `${x.yaw}:${x.pass ? (x.how === "x-ray" ? "x" : "P") : "-"}`).join(" ");
  console.log(`== ${name} all yaws`);
  for (const c of cells) { c.fail = !c.rotated && c.forced; c.warn = !c.rotated && !c.forced; }
  for (const l of landings) l.warn = !l.rotated;
  const tag = (x) => (x.pass ? "PASS" : x.rotated ? "TURN" : x.fail ? "FAIL" : "WARN");
  for (const c of cells) console.log(`${tag(c)} ${name} ${c.cell} [${c.roles.join(" ")}] ${marks(c.per)}${c.pass ? "" : c.rotated ? " best yaw " + c.best : c.fail ? " forced ramp hidden at every yaw" : " hidden at every yaw (sneaky route)"}`);
  for (const l of landings) console.log(`${tag(l)} ${name} ${l.role} landing ${l.from} ${marks(l.per)}${l.pass ? "" : l.rotated ? " best yaw " + l.best : " hidden at every yaw (sneaky route)"}`);
  const n = cells.length + landings.length, d = cells.filter((c) => c.pass).length + landings.filter((l) => l.pass).length, w = cells.filter((c) => c.rotated).length + landings.filter((l) => l.rotated).length;
  const warn = cells.filter((c) => c.warn).length + landings.filter((l) => l.warn).length, fail = cells.filter((c) => c.fail).length;
  console.log(`${name} default yaw ${base.yaw} ${d}/${n}, reachable with rotation ${w}/${n}, warn ${warn}, fail ${fail}`);
  return { name, yaws: runs.map((r) => r.yaw), cells, landings, n, d, w, warn, fail };
}
const merged = [];
try {
  for (const name of names) {
    const runs = [];
    for (const yaw of YAWS) {
      const r = await probe(name, yaw);
      r.yaw = yaw;
      all.push(r);
      if (r.error) { console.log(`FAIL ${name}${yaw != null ? " yaw " + yaw : ""} ${r.error}`); continue; }
      report(name, r);
      runs.push(r);
    }
    if (YAWS.length > 1 && runs.length === YAWS.length) merged.push(merge(name, runs));
  }
} finally {
  await browser.close();
}
const tally = all.map((r) => `${r.name}${r.yaw != null ? " yaw " + r.yaw : ""} ` + (r.error ? "error" : `${r.cells.filter((c) => c.pass).length + r.landings.filter((l) => l.pass).length}/${r.cells.length + r.landings.length}`));
console.log("\n" + tally.join("\n"));
if (merged.length) {
  console.log("\nwith rotation (default yaw / any yaw):");
  for (const m of merged) console.log(`${m.name} ${m.d}/${m.n} -> ${m.w}/${m.n} warn ${m.warn} fail ${m.fail}`);
  const N = merged.reduce((a, m) => a + m.n, 0), D = merged.reduce((a, m) => a + m.d, 0), Wn = merged.reduce((a, m) => a + m.w, 0);
  console.log(`TOTAL default ${D}/${N}, reachable with rotation ${Wn}/${N}, warn ${merged.reduce((a, m) => a + m.warn, 0)}, fail ${merged.reduce((a, m) => a + m.fail, 0)}`);
}
if (jsonOut) { fs.mkdirSync(path.dirname(path.resolve(root, jsonOut)), { recursive: true }); fs.writeFileSync(path.resolve(root, jsonOut), JSON.stringify(merged.length ? { runs: all, merged } : all, null, 1)); }
process.exitCode = merged.length ? (merged.some((m) => m.fail) || all.some((r) => r.error) ? 1 : 0) : all.some((r) => r.error || r.cells.some((c) => !c.pass) || r.landings.some((l) => !l.pass)) ? 1 : 0;
