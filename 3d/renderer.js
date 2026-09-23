import * as THREE from "three";
import { buildTerrain } from "./terrain.js";
import { buildDecor } from "./decor.js";
import { buildCharacter } from "./character.js";
import { levelScreenBounds } from "../core/iso.js";
import { xray } from "./xray.js";

export function createRenderer(container = document.body) {
  const gl = new THREE.WebGLRenderer({ antialias: true });
  gl.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  container.appendChild(gl.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
  const raycaster = new THREE.Raycaster();
  let spinT = 0, S, pickables = [], spinners = [], hero, bounds, zoom = 60;
  const focus = new THREE.Vector3();

  const resize = () => {
    const w = container.clientWidth || innerWidth, h = container.clientHeight || innerHeight;
    gl.setSize(w, h, false);
    if (!S) return;
    zoom = S.view.zoom > 0 ? S.view.zoom : fitZoom(w, h);
    camera.left = -w / 2 / zoom; camera.right = w / 2 / zoom;
    camera.top = h / 2 / zoom; camera.bottom = -h / 2 / zoom;
    camera.updateProjectionMatrix();
  };

  const fitZoom = (w, h) => Math.min(w / (bounds.maxX - bounds.minX), h / (bounds.maxY - bounds.minY));

  const placeCamera = (target) => {
    const P = S.proj, s = P.project(target.x, target.y, target.z);
    const hw = (camera.right - camera.left) / 2, hh = (camera.top - camera.bottom) / 2;
    const clampAxis = (v, lo, hi, half) => (hi - lo <= 2 * half ? (lo + hi) / 2 : Math.min(hi - half, Math.max(lo + half, v)));
    const sx = clampAxis(s.sx, bounds.minX, bounds.maxX, hw), sy = clampAxis(s.sy, bounds.minY, bounds.maxY, hh);
    const [r, u, d] = [P.right, P.up, P.dir];
    const px = r[0] * sx - u[0] * sy, py = r[1] * sx - u[1] * sy, pz = r[2] * sx - u[2] * sy;
    camera.position.set(px + d[0] * 200, py + d[1] * 200, pz + d[2] * 200);
    camera.up.set(0, 1, 0);
    camera.lookAt(px, py, pz);
  };

  const heroTarget = (a) => {
    const c = S.params.hero === "0" && (String(S.params.center || "").split(",").map(Number).filter((n) => !isNaN(n)).length === 3 ? S.params.center.split(",").map(Number) : S.level.view?.center);
    if (S.params.hero === "0" && Array.isArray(c) && c.length === 3) return new THREE.Vector3(c[0], c[1], c[2]);
    return new THREE.Vector3(a.pos.x, a.y * S.view.tileH + 0.4, a.pos.z);
  };

  return {
    element: gl.domElement,
    three: { gl, scene, camera },
    init(state) {
      S = state;
      const L = state.level, seed = state.params.seed;
      scene.background = new THREE.Color(L.bg || "#404040");
      const terrain = buildTerrain(L, state.view, seed);
      scene.add(terrain.group);
      pickables = terrain.pickables;
      const decor = buildDecor(L, state.view);
      scene.add(decor.group);
      spinners = decor.spinners;
      hero = buildCharacter(1);
      hero.visible = state.params.hero !== "0";
      scene.add(hero);
      bounds = levelScreenBounds(L, state.proj);
      resize();
      addEventListener("resize", resize);
      focus.copy(heroTarget(state.actor));
    },
    update(state, dt) {
      const a = state.actor;
      hero.position.set(a.pos.x, a.y * state.view.tileH, a.pos.z);
      hero.userData.animate(a, dt);
      spinT += dt;
      for (const s of spinners) s.rotation.y = -(s.userData.decor.rot || 0) * (Math.PI / 2) + Math.sin(spinT * 1.6 + s.position.x) * 0.25;
      const t = heroTarget(a), k = dt > 0 ? 1 - Math.exp(-dt * 4) : 1;
      focus.lerp(t, k);
    },
    render() {
      placeCamera(focus);
      camera.updateMatrixWorld();
      const a = S.actor, v = new THREE.Vector3(a.pos.x, a.y * S.view.tileH + 0.45, a.pos.z).project(camera);
      const px = gl.getPixelRatio(), w = gl.domElement.width, h = gl.domElement.height;
      xray.uHero.value = [(v.x * 0.5 + 0.5) * w, (v.y * 0.5 + 0.5) * h];
      xray.uDepth.value = v.z * 0.5 + 0.5 - 0.0005;
      xray.uRadius.value = hero.visible ? 0.6 * zoom * px : 0;
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
