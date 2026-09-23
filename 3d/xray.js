export const xray = {
  uHero: { value: [-9999, -9999] },
  uRadius: { value: 0 },
  uDepth: { value: 0 },
  uDepthSoft: { value: 0.0003 },
  uFeet: { value: 0 },
};

const HEAD = `uniform vec2 uHero;
uniform float uRadius;
uniform float uDepth;
uniform float uDepthSoft;
uniform float uFeet;
varying float vXrayY;
float xrayBayer(vec2 p) {
  vec2 q = mod(floor(p), 4.0);
  float a = mod(q.x, 2.0), b = mod(q.y, 2.0), c = floor(q.x * 0.5), d = floor(q.y * 0.5);
  float v = 8.0 * mod(a + b, 2.0) + 4.0 * b + 2.0 * mod(c + d, 2.0) + d;
  return (v + 0.5) / 16.0;
}
void main() {`;

const CUT = `#include <clipping_planes_fragment>
  if (uRadius > 0.0) {
    float dd = distance(gl_FragCoord.xy, uHero);
    float radial = 1.0 - smoothstep(uRadius * 0.55, uRadius, dd);
    float nearer = smoothstep(0.0, uDepthSoft, uDepth - gl_FragCoord.z);
    float above = smoothstep(uFeet + 0.05, uFeet + 0.35, vXrayY);
    if (radial * nearer * above > xrayBayer(gl_FragCoord.xy)) discard;
  }`;

export function applyXray(material) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, { uHero: xray.uHero, uRadius: xray.uRadius, uDepth: xray.uDepth, uDepthSoft: xray.uDepthSoft, uFeet: xray.uFeet });
    shader.vertexShader = shader.vertexShader
      .replace("void main() {", "varying float vXrayY;\nvoid main() {")
      .replace("#include <project_vertex>", "#include <project_vertex>\n  vXrayY = (modelMatrix * vec4(transformed, 1.0)).y;");
    shader.fragmentShader = shader.fragmentShader.replace("void main() {", HEAD).replace("#include <clipping_planes_fragment>", CUT);
  };
  material.customProgramCacheKey = () => "xray2";
  return material;
}
