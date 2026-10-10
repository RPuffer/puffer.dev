import * as THREE from "three";
import { rideUniforms } from "../core/sequence.js";
import { mulberry32 } from "../core/rng.js";

export const LINES = { lines: 44, width: 0.14, streaks: 140, inner: 0.3 };
export const CLEAR = { radius: 1.2, inner: 0.9, outer: 1.15 };
export const STREAK = { count: 140, span: 12, speed: 16, radius: [1.3, 5], length: [0.9, 3.2], width: [0.008, 0.034] };

const lum = (c) => 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;

export function rideTone(style, out = { ink: new THREE.Color(), soft: new THREE.Color(), streak: new THREE.Color(), bg: new THREE.Color(), dark: false }) {
  const bg = new THREE.Color(style.bg), bgs = bg.clone().convertLinearToSRGB(), bl = lum(bgs);
  let best = null, bd = -1;
  const probe = new THREE.Color();
  for (const h of style.swatches || []) {
    probe.set(h).convertLinearToSRGB();
    const d = Math.abs(lum(probe) - bl);
    if (d > bd) { bd = d; best = h; }
  }
  const dark = bl < 0.45;
  const ink = new THREE.Color(best || (dark ? "#fffaf0" : "#2a1f33"));
  if (bd < 0.35) ink.set(dark ? "#fffaf0" : "#2a1f33");
  out.dark = dark;
  out.bg.copy(bg);
  out.ink.copy(ink).lerp(bg, 0.25);
  out.soft.copy(ink).lerp(bg, 0.6);
  out.streak.copy(ink).lerp(bg, dark ? 0.45 : 0.35);
  return out;
}

const OVERLAY_VERT = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const OVERLAY_FRAG = `
uniform vec2 uCenter; uniform vec2 uRes; uniform float uRide; uniform float uRideTime; uniform float uRideDir;
uniform vec3 uInk; uniform vec3 uSoft; uniform vec3 uDensity; uniform vec3 uClear;
float h1(float n) { return fract(sin(n * 127.1) * 43758.5453); }
void main() {
  vec2 p = gl_FragCoord.xy - uCenter;
  float m = min(uRes.x, uRes.y);
  vec2 q = vec2(p.x, p.y * 1.25) / m;
  float r = length(q);
  float a = atan(p.y, p.x) / 6.2831853 + 0.5;
  float x = a * uDensity.x;
  float i = floor(x), f = fract(x);
  float ep = floor(uRideTime * 7.0);
  float k = i + 17.0 * mod(ep, 5.0);
  float r1 = h1(k), r2 = h1(k + 31.7), r3 = h1(k + 71.3);
  float inner = mix(0.62, uDensity.z, uRide) * (0.85 + 0.5 * r2);
  float mask = step(inner, r);
  float on = step(r2, uRide * 1.15 - 0.1);
  float w = uDensity.y * (0.35 + 0.9 * r3) * smoothstep(inner, inner + 0.55, r);
  float c = 0.5 + (r1 - 0.5) * 0.5;
  float fw = fwidth(x);
  float line = 1.0 - smoothstep(w * 0.5 - fw, w * 0.5 + fw, abs(f - c));
  float dash = fract(r * (0.6 + r3) - uRideTime * uRideDir * (1.6 + 2.2 * r1) + r2 * 9.0);
  float dashed = step(dash, 0.62 + 0.3 * r1);
  float al = line * mask * on * dashed * smoothstep(uClear.z * ${CLEAR.inner.toFixed(3)}, uClear.z * ${CLEAR.outer.toFixed(3)}, distance(gl_FragCoord.xy, uClear.xy));
  if (al < 0.01) discard;
  bool strong = r3 > 0.5;
  vec3 hue = clamp(abs(mod(r1 * 6.0 + uRideTime * 0.8 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  vec3 rain = mix(hue, vec3(1.0), strong ? 0.12 : 0.35);
  gl_FragColor = vec4(rain, al * (strong ? 0.92 : 0.7));
  #include <colorspace_fragment>
}`;

const STREAK_VERT = `
uniform float uRide; uniform float uRideTime; uniform float uRideDir; uniform vec3 uStreak;
attribute vec4 aS; attribute vec4 aT;
varying float vY; varying float vA;
void main() {
  vec3 c = vec3(cos(aS.x) * aS.y, 0.0, sin(aS.x) * aS.y);
  float y = mod(aS.z - uRideTime * uStreak.y * aT.y * uRideDir, uStreak.x) - uStreak.x * 0.5;
  float len = aS.w * (0.2 + 0.8 * uRide);
  vec3 R = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
  vec3 w = c + vec3(0.0, y, 0.0) + R * position.x * aT.x + vec3(0.0, 1.0, 0.0) * position.y * len;
  vY = (position.y + 0.5) * uRideDir;
  vA = step(aT.z, uRide);
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(w, 1.0);
}`;
const STREAK_FRAG = `
uniform vec3 uColor; uniform float uAlpha; uniform vec3 uClear;
varying float vY; varying float vA;
void main() {
  if (vA < 0.5) discard;
  float t = vY < 0.0 ? 1.0 + vY : vY;
  float clear = smoothstep(uClear.z * ${CLEAR.inner.toFixed(3)}, uClear.z * ${CLEAR.outer.toFixed(3)}, distance(gl_FragCoord.xy, uClear.xy));
  if (clear < 0.01) discard;
  vec3 hue = clamp(abs(mod(gl_FragCoord.x * 0.004 + gl_FragCoord.y * 0.002 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  gl_FragColor = vec4(mix(hue, uColor, 0.25), uAlpha * clear * (t > 0.55 ? 0.45 : 1.0));
  #include <colorspace_fragment>
}`;

export function createRideFx() {
  const D = LINES;
  const tone = { ink: new THREE.Color(), soft: new THREE.Color(), streak: new THREE.Color(), bg: new THREE.Color(), dark: false };
  const res = new THREE.Vector2(1, 1), center = new THREE.Vector2(), clear = new THREE.Vector3(-1e5, -1e5, 1);

  const overlay = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: { ...rideUniforms, uCenter: { value: center }, uRes: { value: res }, uInk: { value: tone.ink }, uSoft: { value: tone.soft }, uDensity: { value: new THREE.Vector3(D.lines, D.width, D.inner) }, uClear: { value: clear } },
    vertexShader: OVERLAY_VERT,
    fragmentShader: OVERLAY_FRAG,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  }));
  overlay.frustumCulled = false;
  overlay.renderOrder = 1000;
  overlay.name = "ride-lines";
  overlay.visible = false;

  const N = STREAK.count, rng = mulberry32(7331);
  const geo = new THREE.PlaneGeometry(1, 1);
  const aS = new Float32Array(N * 4), aT = new Float32Array(N * 4);
  const lerp = ([a, b], t) => a + (b - a) * t;
  for (let i = 0; i < N; i++) {
    aS.set([rng() * Math.PI * 2, lerp(STREAK.radius, rng() ** 1.4), rng() * STREAK.span, lerp(STREAK.length, rng())], i * 4);
    aT.set([lerp(STREAK.width, rng() ** 2), 0.7 + 0.6 * rng(), rng() * 0.9, 0], i * 4);
  }
  geo.setAttribute("aS", new THREE.InstancedBufferAttribute(aS, 4));
  geo.setAttribute("aT", new THREE.InstancedBufferAttribute(aT, 4));
  const streakColor = new THREE.Color(), alpha = { value: 1 };
  const streaks = new THREE.InstancedMesh(geo, new THREE.ShaderMaterial({
    uniforms: { ...rideUniforms, uStreak: { value: new THREE.Vector3(STREAK.span, STREAK.speed, 0) }, uColor: { value: streakColor }, uAlpha: alpha, uClear: { value: clear } },
    vertexShader: STREAK_VERT,
    fragmentShader: STREAK_FRAG,
    transparent: true,
    depthWrite: false,
  }), N);
  streaks.count = D.streaks;
  streaks.frustumCulled = false;
  streaks.renderOrder = 5;
  streaks.name = "ride-streaks";
  streaks.visible = false;

  let toned = null;
  return {
    objects: [streaks, overlay],
    tone,
    update(ctx) {
      const ride = rideUniforms.uRide.value;
      if (ride <= 0.001) {
        overlay.visible = streaks.visible = false;
        if (ctx.style && ctx.style !== toned) {
          toned = ctx.style;
          rideTone(ctx.style, tone);
          streakColor.copy(tone.streak);
          streaks.material.blending = tone.dark ? THREE.AdditiveBlending : THREE.NormalBlending;
          alpha.value = tone.dark ? 0.6 : 0.7;
        }
        return;
      }
      overlay.visible = streaks.visible = true;
      res.set(ctx.w, ctx.h);
      center.set(ctx.sx, ctx.sy);
      if (ctx.hero) clear.set(ctx.sx, ctx.sy, CLEAR.radius * ctx.zoom); else clear.set(-1e5, -1e5, 1);
      streaks.position.set(ctx.x, ctx.y + 0.5, ctx.z);
    },
    dispose() {
      overlay.geometry.dispose(); overlay.material.dispose();
      geo.dispose(); streaks.material.dispose(); streaks.dispose();
    },
  };
}
