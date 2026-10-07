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
  float x = clamp(l + wob + (vW.y - vC.y) * 0.18, 0.0, 1.0);
  vec3 col = mix(uTone0, uTone1, smoothstep(0.34, 0.4, x));
  col = mix(col, uTone2, smoothstep(0.55, 0.61, x));
  col = mix(col, uTone3, smoothstep(0.77, 0.83, x));
  float fres = 1.0 - clamp(dot(N, uView), 0.0, 1.0);
  float rim = smoothstep(0.55, 0.8, fres + (vnoise(vW * 4.0) - 0.5) * 0.15) * (0.35 + 0.65 * smoothstep(-0.3, 0.5, dot(N, uLight)));
  col = mix(col, uRim, rim * 0.7);
  float f = max(fogAt(vC.xz), smoothstep(uBase - 0.4, uBase - 2.6, vC.y) * 0.5);
  col = mix(col, uBg, f * 0.9);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

export function tones(I) {
  if (I.hue.r > I.hue.b + 0.15) return ["#9a5a52", "#d0907a", "#f2c6a6", "#fff0dc", "#ffe2b8"];
  return ["#7f8fc4", "#b3bfe6", "#e3e8f8", "#fffdf6", "#fff4dc"];
}

export function build(I) {
  const t = tones(I);
  return [buildBalls(I, ballLayout(I), {
    frag: FRAG,
    detail: 3,
    uniforms: { uTone0: { value: color(t[0]) }, uTone1: { value: color(t[1]) }, uTone2: { value: color(t[2]) }, uTone3: { value: color(t[3]) }, uRim: { value: color(t[4]) } },
    name: "clouds-painterly",
  })];
}
