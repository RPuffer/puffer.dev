import { ballLayout, buildBalls, color } from "./balls.js";

const FRAG = `
uniform vec3 uTone0;
uniform vec3 uTone1;
uniform vec3 uTone2;
uniform vec3 uTone3;
uniform vec3 uRim;
void main() {
  vec3 N = normalize(vN);
  float l = dot(N, uLight) * 0.5 + 0.5;
  float wob = (vnoise(vW * 2.1) - 0.5) * 0.3 + (vnoise(vW * 7.0 + 3.1) - 0.5) * 0.12;
  float x = clamp(l * 1.15 - 0.22 + wob + (vW.y - vC.y) * 0.22, 0.0, 1.0);
  vec3 col = mix(uTone0, uTone1, smoothstep(0.34, 0.4, x));
  col = mix(col, uTone2, smoothstep(0.55, 0.61, x));
  col = mix(col, uTone3, smoothstep(0.77, 0.83, x));
  float fres = 1.0 - clamp(dot(N, uView), 0.0, 1.0);
  float rim = smoothstep(0.5, 0.78, fres + (vnoise(vW * 4.0) - 0.5) * 0.2) * (1.0 - smoothstep(0.45, 0.8, x));
  col = mix(col, uRim, rim * 0.85);
  float f = max(fogAt(vC.xz), smoothstep(uBase - 0.4, uBase - 2.6, vC.y) * 0.5);
  col = mix(col, uBg, f * 0.9);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

export function tones(I) {
  if (I.hue.r > I.hue.b + 0.15) return ["#8a4a4a", "#c98272", "#f0bf9c", "#fff1df", "#ffc27a"];
  return ["#6e7db8", "#a6b3e2", "#dde3f6", "#fffaf0", "#ffd9a0"];
}

export function build(I) {
  const t = tones(I);
  return [buildBalls(I, ballLayout(I), {
    frag: FRAG,
    detail: 2,
    uniforms: { uTone0: { value: color(t[0]) }, uTone1: { value: color(t[1]) }, uTone2: { value: color(t[2]) }, uTone3: { value: color(t[3]) }, uRim: { value: color(t[4]) } },
    name: "clouds-painterly",
  })];
}
