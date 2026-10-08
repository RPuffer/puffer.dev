import * as THREE from "three";
import { buildTerrain } from "./terrain.js";
import { buildDecor } from "./decor.js";
import { buildCharacter } from "./character.js";
import { levelScreenBounds } from "../core/iso.js";
import { xray } from "./xray.js";
import { liftAt } from "./terrain.js";
import { makeStyle } from "./style.js";
import { initMotion, stepMotion } from "./motion.js";
import { buildThings, bakeThingBases, ISLAND } from "./things.js";
import { GLBS } from "./hooks.js";

const FRAME = [351, 390];

export function disposeTree(root, keep = new Set()) {
  root.traverse((o) => {
    if (o.geometry && !keep.has(o.geometry)) o.geometry.dispose();
    for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) {
      for (const u of Object.values(m.uniforms || {})) if (u?.value?.isDataTexture) u.value.dispose();
      m.dispose();
    }
  });
}

export function createRenderer(container = document.body) {
  const gl = new THREE.WebGLRenderer({ antialias: true, stencil: true });
  gl.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  container.appendChild(gl.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
  const raycaster = new THREE.Raycaster();
  let lift = 0, S, pickables = [], hero, bounds, zoom = 60, base = 60, things = null, ride = 0, mounted = [], adopted = [];
  let seqK = 0, drop = 0, jitter = 0, bgT = 1;
  const focus = new THREE.Vector3(), aim = new THREE.Vector3(), bgFrom = new THREE.Color(), bgTo = new THREE.Color();
  const HERO_H = 0.93;
  let heroFrac = 0.3;

  const resize = () => {
    const w = container.clientWidth || innerWidth, h = container.clientHeight || innerHeight;
    gl.setSize(w, h, false);
    if (!S) return;
    base = S.view.zoom > 0 ? S.view.zoom * (Number(S.params.zoom) > 0 ? 1 : Math.min(w / FRAME[0], h / FRAME[1])) : fitZoom(w, h);
    frame();
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
    element: gl.domElement,
    three: { gl, scene, camera },
    mount(state, style = makeStyle(state.level)) {
      S = state;
      initMotion(state.params);
      const L = state.level, seed = state.params.seed;
      scene.background = new THREE.Color(style.bg);
      const terrain = buildTerrain(L, state.view, seed, style);
      scene.add(terrain.group);
      pickables = terrain.pickables;
      const hasThings = !!L.things?.length;
      const decor = buildDecor(L, state.view, style, hasThings ? { bakeExtra: (B, _, P) => bakeThingBases(B, L, state.view, style, P) } : {});
      scene.add(decor.group);
      mounted = [terrain.group, decor.group];
      things = null;
      ride = 0;
      if (hasThings) {
        things = buildThings(L, state.view, style, decor.group);
        scene.add(things.group);
        mounted.push(things.group);
        state.things?.on(things.onEvent);
      }
      hero = buildCharacter(1, style);
      hero.visible = state.params.hero !== "0";
      scene.add(hero);
      for (const g of [terrain.group, decor.group, things?.group, hero]) g?.traverse((o) => {
        if (!o.material || o.userData.shaft) return;
        for (const m of [].concat(o.material)) { m.stencilWrite = true; m.stencilRef = ISLAND; m.stencilFunc = THREE.AlwaysStencilFunc; m.stencilZPass = THREE.ReplaceStencilOp; }
      });
      bounds = levelScreenBounds(L, state.proj);
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
      const old = { groups: mounted, hero };
      if (scene.background) bgFrom.copy(scene.background);
      for (const g of mounted) g.visible = false;
      if (hero) scene.remove(hero);
      mounted = [];
      adopted = [];
      pickables = [];
      things = null;
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
    adopt(objects) {
      for (const o of objects || []) adopted.push(o);
      applyDrop();
    },
    get hero() { return hero; },
    get things() { return things; },
    get zoomScale() { return zoom / base; },
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
    fadeBg() { bgTo.copy(scene.background); scene.background.copy(bgFrom); bgT = 0; },
    snap() {
      const a = S.actor;
      lift = liftAt(S.level, a.pos.x, a.pos.z);
      if (things) { things.update(S, 0); ride = things.rideOffset(S); }
      focus.copy(heroTarget(a));
    },
    compile() { gl.compile(scene, camera); },
    update(state, dt) {
      const a = state.actor;
      lift += (liftAt(state.level, a.pos.x, a.pos.z) - lift) * Math.min(1, dt * 12);
      if (things) { things.update(state, dt); ride = things.rideOffset(state); }
      hero.position.set(a.pos.x, (a.y + lift) * state.view.tileH + ride, a.pos.z);
      if (jitter > 0) hero.position.x += (Math.random() - 0.5) * 2 * jitter, hero.position.z += (Math.random() - 0.5) * 2 * jitter;
      hero.userData.animate(a, dt);
      stepMotion(dt);
      if (bgT < 1) { bgT = Math.min(1, bgT + dt / 0.6); scene.background.copy(bgFrom).lerp(bgTo, bgT); }
      const t = heroTarget(a), k = dt > 0 ? 1 - Math.exp(-dt * (4 + 26 * seqK)) : 1;
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
      xray.uRadius.value = hero.visible && S.params.xray !== "0" ? 1.2 * zoom * px : 0;
      gl.render(scene, camera);
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
