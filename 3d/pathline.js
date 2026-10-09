import * as THREE from "three";
import { surfaceHeight } from "../core/level.js";
import { liftAt } from "./terrain.js";
import { BEAM } from "./lift.js";

export const LINE = { half: 0.2, lift: 0.035, corner: 0.32, arc: 4, grow: 40, max: 1024, color: BEAM.color, hot: BEAM.hot, miss: "#ffb52e" };

const VERT = `attribute vec3 aU;
varying vec3 vU;
void main() {
  vU = aU;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}`;

const FRAG = `uniform float uTime, uHead, uLen, uGrow, uOn, uPulse, uGoal, uMiss;
uniform vec3 uCol, uHot, uWarn, uClear;
varying vec3 vU;
void main() {
  float a = 0.0, hot = 0.0;
  vec3 col = uCol;
  if (vU.z < 0.5) {
    float s = vU.x, v = abs(vU.y);
    if (s < uHead || s > uGrow) discard;
    float core = exp(-v * v * 70.0);
    float halo = exp(-v * v * 5.0);
    float ph = fract((s + v * 0.22) * 3.6 - uTime * 3.0);
    float chev = 0.5 * smoothstep(0.0, 0.05, ph) * (1.0 - smoothstep(0.36, 0.46, ph)) * (1.0 - smoothstep(0.55, 0.7, v)) * step(0.2, v);
    float lead = smoothstep(0.0, 0.45, s - uHead);
    float tail = 1.0 - smoothstep(uLen - 0.05, uLen + 0.02, s);
    float front = 1.0 - smoothstep(uGrow - 0.6, uGrow, s) * step(uGrow, uLen);
    float clear = smoothstep(uClear.z * 0.35, uClear.z * 0.6, distance(gl_FragCoord.xy, uClear.xy));
    a = (0.8 * core + 0.22 * halo + chev) * lead * tail * front * mix(1.0, clear, 0.85);
    hot = clamp(core + chev * 0.7, 0.0, 1.0);
  } else if (vU.z < 1.5) {
    float d = max(abs(vU.x), abs(vU.y));
    float t = uPulse / 0.55;
    if (t >= 1.0) discard;
    float r = mix(0.35, 0.98, 1.0 - pow(1.0 - t, 3.0));
    float ring = exp(-pow((d - r) * 16.0, 2.0));
    float fill = (1.0 - smoothstep(r - 0.02, r, d)) * 0.18;
    a = (ring + fill) * (1.0 - t);
    hot = ring * (1.0 - t);
    col = mix(uCol, uWarn, uMiss);
  } else {
    vec2 q = abs(vU.xy);
    float d = max(q.x, q.y);
    float r = 0.8 + 0.05 * sin(uTime * 5.0);
    float corners = exp(-pow((d - r) * 14.0, 2.0)) * step(r * 0.55, min(q.x, q.y));
    float dia = 1.0 - smoothstep(0.1, 0.14, q.x + q.y);
    a = (corners + 0.8 * dia) * uGoal;
    hot = dia;
  }
  if (a < 0.01) discard;
  gl_FragColor = vec4(mix(col, uHot, hot * 0.75), clamp(a, 0.0, 1.0) * uOn);
}`;

export function createPathLine() {
  const MAX = LINE.max;
  const QUADS = 8;
  const pos = new Float32Array((QUADS + 2 * MAX) * 3), uv = new Float32Array((QUADS + 2 * MAX) * 3);
  const idx = new Uint16Array(12 + (MAX - 1) * 6);
  for (let q = 0; q < 2; q++) {
    const b = q * 4, o = q * 6;
    idx.set([b, b + 1, b + 2, b, b + 2, b + 3], o);
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (let i = 0; i < 4; i++) uv.set([corners[i][0], corners[i][1], q + 1], (b + i) * 3);
  }
  for (let i = 0; i < MAX - 1; i++) {
    const v = QUADS + 2 * i;
    idx.set([v, v + 1, v + 2, v + 1, v + 3, v + 2], 12 + i * 6);
  }
  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
  const uvAttr = new THREE.BufferAttribute(uv, 3).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute("position", posAttr);
  geo.setAttribute("aU", uvAttr);
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.setDrawRange(0, 12);
  const U = {
    uTime: { value: 0 }, uHead: { value: 0 }, uLen: { value: 0 }, uGrow: { value: 0 }, uOn: { value: 0 },
    uPulse: { value: 9 }, uGoal: { value: 0 }, uMiss: { value: 0 },
    uCol: { value: new THREE.Color(LINE.color) }, uHot: { value: new THREE.Color(LINE.hot) }, uWarn: { value: new THREE.Color(LINE.miss) },
    uClear: { value: new THREE.Vector3(-1e5, -1e5, 1) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = "path-line";
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  mesh.visible = false;

  const cs = new Float32Array(512);
  let n = 0, ncell = 0, seen = -1, markSeen = null, markT = 9, born = 0, len = 0, segs = 0, goalOn = 0;
  let L = null, T = 1;

  const top = (x, z) => (surfaceHeight(L, x, z) + liftAt(L, x, z)) * T + LINE.lift;
  const vert = (i, x, y, z, s, side) => {
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    uv[i * 3] = s; uv[i * 3 + 1] = side; uv[i * 3 + 2] = 0;
  };
  const sample = (x, z, s, dx, dz, y = top(x, z)) => {
    if (n >= MAX) return;
    const h = LINE.half, i = QUADS + 2 * n;
    vert(i, x - dz * h, y, z + dx * h, s, -1);
    vert(i + 1, x + dz * h, y, z - dx * h, s, 1);
    n++;
  };
  const quad = (q, cx, cz, half, y) => {
    const b = q * 4, c = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (let i = 0; i < 4; i++) { const k = (b + i) * 3; pos[k] = cx + c[i][0] * half; pos[k + 1] = y; pos[k + 2] = cz + c[i][1] * half; }
  };

  const rebuild = (route) => {
    n = 0; ncell = 0; len = 0;
    const m = route.length;
    if (m < 2) { segs = 0; return; }
    const E = 0.02, R = LINE.corner;
    let s = 0;
    for (let k = 0; k < m; k++) {
      const cx = route[k][0] + 0.5, cz = route[k][1] + 0.5;
      const ix = k > 0 ? Math.sign(route[k][0] - route[k - 1][0]) : 0, iz = k > 0 ? Math.sign(route[k][1] - route[k - 1][1]) : 0;
      const ox = k < m - 1 ? Math.sign(route[k + 1][0] - route[k][0]) : ix, oz = k < m - 1 ? Math.sign(route[k + 1][1] - route[k][1]) : iz;
      const dx0 = k > 0 ? ix : ox, dz0 = k > 0 ? iz : oz;
      if (k > 0) {
        const ex = cx - dx0 * 0.5, ez = cz - dz0 * 0.5;
        const y0 = top(ex - dx0 * E, ez - dz0 * E), y1 = top(ex + dx0 * E, ez + dz0 * E);
        sample(ex - dx0 * E, ez - dz0 * E, s - 0.5, dx0, dz0, y0);
        s += Math.abs(y1 - y0);
        sample(ex + dx0 * E, ez + dz0 * E, s - 0.5, dx0, dz0, y1);
      }
      const turn = k > 0 && k < m - 1 && (ix !== ox || iz !== oz);
      if (!turn) {
        if (ncell < cs.length) cs[ncell++] = s;
        sample(cx, cz, s, dx0, dz0);
      } else {
        const ax = cx - ix * R, az = cz - iz * R, arcLen = R * Math.PI / 2;
        const px = cx - ix * R + ox * R, pz = cz - iz * R + oz * R;
        const s0 = s - R;
        sample(ax, az, s0, ix, iz);
        for (let j = 1; j <= LINE.arc; j++) {
          const t = (j / LINE.arc) * Math.PI / 2;
          const ux = -ox * Math.cos(t) + ix * Math.sin(t), uz = -oz * Math.cos(t) + iz * Math.sin(t);
          const tx = ix * Math.cos(t) + ox * Math.sin(t), tz = iz * Math.cos(t) + oz * Math.sin(t);
          const ss = s0 + arcLen * (j / LINE.arc);
          if (j === LINE.arc / 2 && ncell < cs.length) cs[ncell++] = ss;
          sample(px + ux * R, pz + uz * R, ss, tx, tz);
        }
        s = s0 + arcLen - R;
      }
      if (k < m - 1) s += 1;
    }
    len = cs[ncell - 1];
    segs = Math.max(0, n - 1);
  };

  const headOf = (route, actor) => {
    const k = route.length - actor.path.length - 1;
    if (k < 0 || k + 1 >= ncell) return k + 1 >= ncell ? len : 0;
    const nx = route[k + 1][0] + 0.5, nz = route[k + 1][1] + 0.5;
    const f = Math.max(0, Math.min(1, 1 - Math.hypot(nx - actor.pos.x, nz - actor.pos.z)));
    return cs[k] + (cs[k + 1] - cs[k]) * f;
  };

  return {
    mesh,
    reset(state) { L = state.level; T = state.view.tileH; seen = -1; markSeen = state.mark; markT = 9; goalOn = 0; segs = 0; geo.setDrawRange(0, 12); U.uHead.value = U.uLen.value + 1; },
    update(state, dt, { clear, drop = 0, show = true } = {}) {
      if (!L) return;
      const route = state.route, actor = state.actor;
      U.uTime.value += dt;
      markT += dt;
      if (route.version !== seen) {
        seen = route.version;
        if (route.active) {
          rebuild(route);
          born = 0;
          const g = route[route.length - 1];
          quad(1, g[0] + 0.5, g[1] + 0.5, 0.5, top(g[0] + 0.5, g[1] + 0.5) + 0.004);
        }
        posAttr.needsUpdate = uvAttr.needsUpdate = true;
        geo.setDrawRange(0, 12 + segs * 6);
        U.uLen.value = len;
      }
      if (state.mark && state.mark !== markSeen) {
        markSeen = state.mark;
        markT = 0;
        const [mx, mz] = state.mark.cell, c = L.cells[mz]?.[mx];
        const y = c ? Math.max(c.h, 0) * T + (liftAt(L, mx + 0.5, mz + 0.5)) * T + LINE.lift + 0.006 : LINE.lift;
        quad(0, mx + 0.5, mz + 0.5, 0.5, c && c.s === "ramp" ? top(mx + 0.5, mz + 0.5) + 0.006 : y);
        U.uMiss.value = state.mark.ok ? 0 : 1;
        posAttr.needsUpdate = true;
      }
      born += dt;
      U.uPulse.value = markT;
      U.uGrow.value = route.active ? headOf(route, actor) + born * LINE.grow : U.uGrow.value;
      if (route.active) U.uHead.value = headOf(route, actor);
      const target = route.active ? 1 : 0;
      goalOn += (target - goalOn) * Math.min(1, dt * (target ? 10 : 6));
      U.uGoal.value = goalOn;
      U.uOn.value = show ? 1 : 0;
      if (clear) U.uClear.value.copy(clear);
      mesh.position.y = drop;
      mesh.visible = show;
      if (!route.active) U.uHead.value = U.uLen.value + 1;
    },
    dispose() { geo.dispose(); mat.dispose(); },
  };
}
