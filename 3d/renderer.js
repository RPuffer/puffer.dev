import * as THREE from "three";
import { createSky } from "./sky.js";
import { buildTerrain } from "./terrain.js";
import { buildDecor } from "./decor.js";
import { buildCharacter } from "./character.js";
import { heroClass } from "./heroes.js";
import { levelScreenBounds, PLAY_PITCH } from "../core/iso.js";
import { xray } from "./xray.js";
import { highlight, unhighlight } from "./highlight.js";
import { liftAt } from "./terrain.js";
import { makeStyle } from "./style.js";
import { initMotion, stepMotion } from "./motion.js";
import { buildThings, bakeThingBases } from "./things.js";
import { beamClear } from "./lift.js";
import { CLEAR } from "./speedlines.js";
import { GLBS } from "./hooks.js";
import { createPathLine } from "./pathline.js";
import { buildTraps, heroFx, tileKeys } from "./traps.js";
import { buildFalls } from "./falls.js";

const FRAME = [351, 390];

export const DASH_GHOST = { body: 0.12, outline: { color: "#f4f9ff", width: 5, through: true, inner: { color: "#7a4dff", width: 2 } } };
export const HERO_OUTLINE = { color: "#12c4f0", width: 4, through: "hidden", inner: { color: "#1b1f27", width: 1.5 } };
export const HERO_FILL = { color: "#12c4f0", opacity: 0.45, through: "hidden" };
export const RIDE_GLOW = { outline: { color: "#ffffff", width: 5, through: true, effect: "rainbow", inner: { color: "#1b1f27", width: 1.5 } }, fill: { effect: "rainbow", color: "#ffffff", opacity: 0.32, through: true } };

export function occludeModes(v) {
  const t = String(v || "outline,fill").toLowerCase().split(/[,+ ]/).filter(Boolean);
  const has = (k) => t.includes(k) || (t.includes("both") && (k === "circle" || k === "outline")) || (t.includes("all") && k !== "none");
  return { circle: has("circle"), outline: has("outline"), fill: has("fill") };
}

export function disposeTree(root, keep = new Set()) {
  root.traverse((o) => {
    if (o.geometry && !keep.has(o.geometry)) o.geometry.dispose();
    for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) {
      for (const u of Object.values(m.uniforms || {})) if (u?.value?.isDataTexture) u.value.dispose();
      for (const v of Object.values(m)) if (v?.isCanvasTexture || v?.isDataTexture) v.dispose();
      m.dispose();
    }
  });
}

export const ZOOMS = [1, 1.5, 2, 3, 4], ZOOM_DEFAULT = 3, ZOOM_KEY = "isoworld:zoom";
export const TOUCH_ZOOMS = [1, 1.5, 2, 3, 4, 5, 6, 7], TOUCH_ZOOM_DEFAULT = 5, TOUCH_ZOOM_KEY = "isoworld:zoom:touch";
export const touchView = (params = {}) => params.touch === "1" || params.dpad === "1" || (params.touch !== "0" && typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches);
const zoomSet = (touch) => touch ? [TOUCH_ZOOMS, TOUCH_ZOOM_DEFAULT, TOUCH_ZOOM_KEY] : [ZOOMS, ZOOM_DEFAULT, ZOOM_KEY];
export function savedZoom(storage = globalThis.localStorage, touch = false) {
  const [Z, D, K] = zoomSet(touch);
  try { const v = Number(storage?.getItem(K)); return Z.includes(v) ? v : D; } catch { return D; }
}
export function saveZoom(v, storage = globalThis.localStorage, touch = false) {
  try { storage?.setItem(zoomSet(touch)[2], String(v)); } catch {}
}

export function createRenderer(container = document.body) {
  const gl = new THREE.WebGLRenderer({ antialias: true, stencil: true });
  gl.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  container.appendChild(gl.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
  const raycaster = new THREE.Raycaster();
  const line = createPathLine();
  scene.add(line.mesh);
  const sky = createSky();
  if (sky) scene.add(sky.mesh);
  let lift = 0, S, pickables = [], hero, bounds, zoom = 60, base = 60, things = null, ride = 0, mounted = [], adopted = [], traps = null, falls = null;
  let glowing = false, heroStyle = null, ghostMats = null;
  const heroHl = () => {
    if (!hero) return;
    if (glowing) highlight(hero, RIDE_GLOW);
    else if (occ.outline || occ.fill) highlight(hero, { outline: occ.outline && HERO_OUTLINE, fill: occ.fill && { ...HERO_FILL, effect: S.params.fillfx || "holo" } });
    else unhighlight(hero);
  };
  let occ = occludeModes(), seqK = 0, drop = 0, jitter = 0, bgT = 1, flashT = 1, held = null;
  const fx = [], fxCtx = { x: 0, y: 0, z: 0, sx: 0, sy: 0, w: 1, h: 1, zoom: 1, hero: false, style: null };
  const flashBase = new THREE.Color(), WHITE = new THREE.Color(1, 1, 1);
  let warmed = false, oriented = null;
  const orients = [];
  const reveal = (f) => {
    const objs = fx.flatMap((x) => x.objects), vis = objs.map((o) => o.visible);
    for (const o of objs) o.visible = true;
    const r = f();
    objs.forEach((o, i) => { o.visible = vis[i]; });
    return r;
  };
  const warm = () => {
    warmed = true;
    const upload = () => reveal(() => {
      const rt = new THREE.WebGLRenderTarget(1, 1);
      gl.setRenderTarget(rt);
      gl.render(scene, camera);
      gl.setRenderTarget(null);
      rt.dispose();
    });
    reveal(() => gl.compileAsync(scene, camera)).then(upload, upload);
  };
  const focus = new THREE.Vector3(), aim = new THREE.Vector3(), bgFrom = new THREE.Color(), bgTo = new THREE.Color();
  const HERO_H = 0.93;
  let heroFrac = 0.3;

  const resize = () => {
    const w = container.clientWidth || innerWidth, h = container.clientHeight || innerHeight;
    gl.setSize(w, h, false);
    if (!S) return;
    fitBase = S.view.zoom > 0 ? S.view.zoom * (Number(S.params.zoom) > 0 ? 1 : Math.min(w / FRAME[0], h / FRAME[1])) : fitZoom(w, h);
    rebase();
  };
  const rebase = () => {
    const w = container.clientWidth || innerWidth, h = container.clientHeight || innerHeight;
    base = cam === "close" ? Math.max(fitBase, CLOSE_PX * Math.min(1, Math.max(0.6, Math.min(w / 1200, h / 800)))) : fitBase * mul;
    frame();
  };

  const CLOSE_PX = 1200 / (10 * Math.SQRT2), lead = new THREE.Vector3(), leadTo = new THREE.Vector3();
  let cam = "", fitBase = 60, mul = 1, mulTo = 1;
  const setCam = (v, smooth = false) => {
    cam = String(v || "");
    mulTo = Number(cam) > 0 ? Number(cam) : 1;
    if (!smooth) mul = mulTo;
    if (S) rebase();
  };
  const closeZoom = () => heroFrac * (container.clientHeight || innerHeight) / HERO_H;

  const frame = () => {
    const w = container.clientWidth || innerWidth, h = container.clientHeight || innerHeight;
    zoom = seqK > 0 ? base * Math.pow(closeZoom() / base, seqK) : base;
    camera.left = -w / 2 / zoom; camera.right = w / 2 / zoom;
    camera.top = h / 2 / zoom; camera.bottom = -h / 2 / zoom;
    camera.updateProjectionMatrix();
  };

  addEventListener("resize", resize);

  const fitZoom = (w, h) => Math.min(w / (bounds.maxX - bounds.minX), h / (bounds.maxY - bounds.minY));

  const placeCamera = (target) => {
    const P = S.proj, s = P.project(target.x, target.y, target.z);
    const hw = (camera.right - camera.left) / 2, hh = (camera.top - camera.bottom) / 2;
    const clampAxis = (v, lo, hi, half) => (hi - lo <= 2 * half ? (lo + hi) / 2 : Math.min(hi - half, Math.max(lo + half, v)));
    let sx = clampAxis(s.sx, bounds.minX, bounds.maxX, hw), sy = clampAxis(s.sy, bounds.minY, bounds.maxY, hh);
    if (seqK > 0) { sx += (s.sx - sx) * seqK; sy += (s.sy - sy) * seqK; }
    const [r, u, d] = [P.right, P.up, P.dir];
    const px = r[0] * sx - u[0] * sy, py = r[1] * sx - u[1] * sy, pz = r[2] * sx - u[2] * sy;
    camera.position.set(px + d[0] * 200, py + d[1] * 200, pz + d[2] * 200);
    camera.up.set(0, 1, 0);
    camera.lookAt(px, py, pz);
  };

  const heroTarget = (a) => {
    const c = S.params.hero === "0" && (String(S.params.center || "").split(",").map(Number).filter((n) => !isNaN(n)).length === 3 ? S.params.center.split(",").map(Number) : S.level.view?.center);
    if (S.params.hero === "0" && Array.isArray(c) && c.length === 3) return new THREE.Vector3(c[0], c[1], c[2]);
    return aim.set(a.pos.x, (a.y + lift) * S.view.tileH + ride + 0.4 + 0.1 * seqK, a.pos.z);
  };

  const island = () => [...mounted, ...adopted];
  const applyDrop = () => {
    for (const o of island()) o.position.y = drop;
  };

  return {
    viewBase: { pitch: PLAY_PITCH },
    element: gl.domElement,
    three: { gl, scene, camera },
    sky,
    mount(state, st = makeStyle(state.level)) {
      const style = st;
      heroStyle = style;
      S = state;
      setCam(state.params.cam != null && state.params.cam !== "" ? state.params.cam : state.params.hero === "0" ? 1 : savedZoom(undefined, touchView(state.params)));
      initMotion(state.params);
      const L = state.level, seed = state.params.seed;
      scene.background = new THREE.Color(style.bg);
      const terrain = buildTerrain(L, state.view, seed, style, { loose: state.traps ? tileKeys(state.traps) : null });
      scene.add(terrain.group);
      pickables = terrain.pickables;
      const hasThings = !!L.things?.length;
      const decor = buildDecor(L, state.view, style, hasThings ? { bakeExtra: (B, _, P) => bakeThingBases(B, L, state.view, style, P) } : {});
      scene.add(decor.group);
      mounted = [terrain.group, decor.group];
      things = null;
      ride = 0;
      if (hasThings) {
        things = buildThings(L, state.view, style, decor.group, state.things?.things);
        scene.add(things.group);
        mounted.push(things.group);
        state.things?.on(things.onEvent);
      }
      traps = null;
      if (state.traps) {
        traps = buildTraps(state, style, terrain.tiles);
        scene.add(traps.group);
        mounted.push(traps.group);
      }
      falls?.dispose();
      falls = buildFalls(state);
      scene.add(falls.group);
      mounted.push(falls.group);
      hero = buildCharacter(1, style, heroClass(state.params));
      hero.visible = state.params.hero !== "0";
      occ = occludeModes(state.params.occlude);
      heroHl();
      scene.add(hero);
      line.reset(state);
      bounds = levelScreenBounds(L, state.proj);
      oriented = state.proj;
      fxCtx.style = style;
      adopted = [];
      applyDrop();
      resize();
      lift = liftAt(L, state.actor.pos.x, state.actor.pos.z);
      focus.copy(heroTarget(state.actor));
    },
    unmount() {
      this.dispose(this.detach());
    },
    detach() {
      this.release();
      if (things?.kept) {
        const d = things.parts[things.kept], sh = things.shafts[things.kept], gy = things.group.position.y;
        if (d && sh) {
          for (const o of [d, sh]) { things.group.remove(o); o.position.y += gy; scene.add(o); }
          held = { deck: d, shaft: sh, dy: d.position.y - sh.position.y };
        }
      }
      const old = { groups: mounted, hero };
      if (scene.background) bgFrom.copy(scene.background);
      for (const g of mounted) g.visible = false;
      if (hero) scene.remove(hero);
      mounted = [];
      adopted = [];
      pickables = [];
      things = null;
      traps?.dispose();
      traps = null;
      hero = null;
      return old;
    },
    dispose(old) {
      if (!old) return;
      const keep = new Set();
      for (const g of Object.values(GLBS)) for (const e of g.extras || []) if (e.geometry) keep.add(e.geometry);
      for (const group of old.groups) {
        scene.remove(group);
        disposeTree(group, keep);
      }
      old.hero?.traverse((o) => { if (o.geometry && !keep.has(o.geometry)) o.geometry.dispose(); });
    },
    glow(on) {
      if (glowing === !!on) return;
      glowing = !!on;
      heroHl();
    },
    get glowing() { return glowing; },
    release() {
      if (!held) return;
      for (const o of [held.deck, held.shaft]) { scene.remove(o); o.geometry.dispose(); o.material.dispose(); }
      held = null;
      if (things?.kept) for (const o of [things.parts[things.kept], things.shafts[things.kept]]) if (o) o.visible = true;
    },
    addFx(f) {
      if (!f) return;
      fx.push(f);
      for (const o of f.objects) scene.add(o);
    },
    flash(amount = 0.15) {
      if (!scene.background) return;
      if (flashT >= 1) flashBase.copy(scene.background);
      flashT = 0;
      this.flashAmount = amount;
    },
    flashAmount: 0.15,
    holdBg() { bgTo.copy(scene.background); scene.background.copy(bgFrom); bgT = 1; },
    adopt(objects) {
      for (const o of objects || []) adopted.push(o);
      applyDrop();
    },
    get hero() { return hero; },
    ghost(on) {
      if (!hero || !!on === !!ghostMats) return;
      if (on) {
        ghostMats = [];
        const seen = new Set();
        hero.traverse((o) => { if (!o.isMesh || o.userData.highlightPass) return; for (const m of [].concat(o.material)) { if (seen.has(m)) continue; seen.add(m); ghostMats.push([m, m.transparent, m.opacity, m.depthWrite]); m.transparent = true; m.opacity = DASH_GHOST.body; m.depthWrite = false; m.needsUpdate = true; } });
        highlight(hero, { outline: DASH_GHOST.outline });
      } else {
        for (const [m, t, op, dw] of ghostMats) { m.transparent = t; m.opacity = op; m.depthWrite = dw; m.needsUpdate = true; }
        ghostMats = null;
        heroHl();
      }
    },
    swapHero(cls) {
      if (!hero || !S) return null;
      const old = hero, next = buildCharacter(1, heroStyle, cls);
      next.visible = old.visible;
      next.position.copy(old.position);
      next.rotation.copy(old.rotation);
      scene.remove(old);
      unhighlight(old);
      old.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      hero = next;
      heroHl();
      scene.add(hero);
      hero.userData.animate(S.actor, 0);
      return hero;
    },
    get pathLine() { return line.mesh; },
    get things() { return things; },
    get traps() { return traps; },
    get zoomScale() { return zoom / base; },
    get cam() { return cam; },
    setCam(v) { setCam(v); resize(); },
    zoomStep(step) {
      if (!step || !S) return false;
      const touch = touchView(S.params), Z = zoomSet(touch)[0];
      const cur = Number(cam) > 0 ? mulTo : 1;
      let i = Z.findIndex((z) => z >= cur - 1e-6);
      if (i < 0) i = Z.length - 1;
      else if (step < 0 && Z[i] > cur + 1e-6) i--;
      const to = Z[Math.max(0, Math.min(Z.length - 1, i + Math.sign(step)))];
      if (to === cur && cam !== "close") return false;
      setCam(to, true);
      saveZoom(to, undefined, touch);
      return true;
    },
    get drop() { return drop; },
    seq({ k = seqK, y = drop, keep, shake = jitter, frac } = {}) {
      if (frac > 0) heroFrac = frac;
      const kc = Math.max(0, Math.min(1, k));
      if (kc !== seqK) { seqK = kc; frame(); }
      if (y !== drop) { drop = y; applyDrop(); }
      if (keep !== undefined) things?.keep(keep);
      jitter = shake;
    },
    dropSpan() {
      const P = S.proj, hh = (container.clientHeight || innerHeight) / closeZoom();
      return ((bounds.maxY - bounds.minY) + 2 * hh + 4) / Math.max(0.3, P.up[1]);
    },
    fadeBg() { bgT = 0; },
    snap() {
      const a = S.actor;
      lift = liftAt(S.level, a.pos.x, a.pos.z);
      if (things) { things.update(S, 0); ride = things.rideOffset(S); }
      focus.copy(heroTarget(a));
    },
    compile() { gl.compile(scene, camera); },
    onOrient(f) { orients.push(f); },
    update(state, dt) {
      const a = state.actor;
      if (state.proj !== oriented) {
        oriented = state.proj;
        bounds = levelScreenBounds(state.level, state.proj);
        resize();
        for (const f of orients) f(state);
      }
      lift += (liftAt(state.level, a.pos.x, a.pos.z) - lift) * Math.min(1, dt * 12);
      const wdt = dt * (state.timeScale ?? 1);
      if (things) { things.update(state, wdt); ride = things.rideOffset(state); }
      if (held && things?.kept) {
        const d = things.parts[things.kept], sh = things.shafts[things.kept], gy = things.group.position.y;
        if (d && sh) {
          d.visible = sh.visible = false;
          held.deck.position.set(d.position.x, d.position.y + gy, d.position.z);
          held.shaft.position.set(sh.position.x, d.position.y + gy - held.dy, sh.position.z);
        }
      }
      hero.position.set(a.pos.x, (a.y + lift) * state.view.tileH + ride, a.pos.z);
      if (traps) traps.update(state, wdt);
      heroFx(hero, a, state.view, hero.userData.baseScale ??= hero.scale.x);
      falls?.pose(hero, a, state.view, hero.userData.baseScale);
      if (state.params.hero !== "0") hero.visible = !(a.blink > 0 && Math.floor(a.blink * 14) % 2);
      if (jitter > 0) hero.position.x += (Math.random() - 0.5) * 2 * jitter, hero.position.z += (Math.random() - 0.5) * 2 * jitter;
      hero.userData.animate(a, dt);
      falls?.limbs(hero, a);
      falls?.update(dt);
      line.update(state, dt, { clear: beamClear.value, drop, show: hero.visible && !a.locked && seqK === 0 });
      stepMotion(wdt);
      if (mul !== mulTo) {
        mul += (mulTo - mul) * (dt > 0 ? 1 - Math.exp(-dt * 12) : 1);
        if (Math.abs(mul - mulTo) < 1e-3 * mulTo) mul = mulTo;
        rebase();
      }
      if (bgT < 1) { bgT = Math.min(1, bgT + dt / 0.6); scene.background.copy(bgFrom).lerp(bgTo, bgT); }
      if (flashT < 1) {
        flashT = Math.min(1, flashT + dt / 0.12);
        scene.background.copy(flashBase).lerp(WHITE, flashT < 1 ? this.flashAmount : 0);
      }
      const t = heroTarget(a), k = dt > 0 ? 1 - Math.exp(-dt * (4 + 26 * seqK)) : 1;
      if (cam && seqK === 0) {
        const L = a.moving && !a.locked ? 1.4 : 0;
        lead.lerp(leadTo.set(Math.sin(a.facing) * L, 0, Math.cos(a.facing) * L), dt > 0 ? 1 - Math.exp(-dt * 2.5) : 1);
        t.add(lead);
      } else lead.set(0, 0, 0);
      focus.lerp(t, k);
    },
    render() {
      placeCamera(focus);
      camera.updateMatrixWorld();
      const a = S.actor, feet = (a.y + lift) * S.view.tileH + ride, v = new THREE.Vector3(a.pos.x, feet + 0.45, a.pos.z).project(camera);
      const px = gl.getPixelRatio(), w = gl.domElement.width, h = gl.domElement.height;
      xray.uHero.value = [(v.x * 0.5 + 0.5) * w, (v.y * 0.5 + 0.5) * h];
      xray.uDepth.value = v.z * 0.5 + 0.5 - 0.35 / (camera.far - camera.near);
      xray.uDepthSoft.value = 0.3 / (camera.far - camera.near);
      xray.uSlack.value = 0.35 / (camera.far - camera.near);
      xray.uFeet.value = feet;
      xray.uRadius.value = hero.visible && occ.circle && S.params.xray !== "0" ? 1.2 * zoom * px : 0;
      if (hero.visible) beamClear.value.set(xray.uHero.value[0], xray.uHero.value[1], CLEAR.radius * zoom * px); else beamClear.value.set(-1e5, -1e5, 1);
      if (fx.length) {
        fxCtx.x = a.pos.x; fxCtx.y = feet; fxCtx.z = a.pos.z;
        fxCtx.sx = xray.uHero.value[0]; fxCtx.sy = xray.uHero.value[1]; fxCtx.w = w; fxCtx.h = h; fxCtx.zoom = zoom * px; fxCtx.hero = hero.visible;
        for (const f of fx) f.update(fxCtx);
        if (!warmed) warm();
      }
      if (sky) {
        const ch = container.clientHeight || innerHeight, p = S.proj.project(focus.x, focus.y, focus.z);
        sky.update({ w: gl.domElement.width, h: gl.domElement.height, yaw: S.view.yaw, panX: p.sx * zoom / ch, panY: -p.sy * zoom / ch, bg: scene.background });
      }
      gl.render(scene, camera);
      traps?.render(camera, container.clientWidth || innerWidth, container.clientHeight || innerHeight);
    },
    pick(x, y, w, h) {
      raycaster.setFromCamera(new THREE.Vector2((x / w) * 2 - 1, -(y / h) * 2 + 1), camera);
      const hit = raycaster.intersectObjects(pickables, false)[0];
      if (!hit) return null;
      const n = hit.face.normal;
      return [Math.floor(hit.point.x - n.x * 0.01), Math.floor(hit.point.z - n.z * 0.01)];
    },
  };
}
