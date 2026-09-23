export const xray = {
  uHero: { value: [-9999, -9999] },
  uRadius: { value: 0 },
  uDepth: { value: 0 },
};

export function applyXray(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uHero = xray.uHero;
    shader.uniforms.uRadius = xray.uRadius;
    shader.uniforms.uDepth = xray.uDepth;
    shader.fragmentShader = shader.fragmentShader
      .replace("void main() {", "uniform vec2 uHero;\nuniform float uRadius;\nuniform float uDepth;\nvoid main() {")
      .replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>
      {
        float dd = distance(gl_FragCoord.xy, uHero);
        if (gl_FragCoord.z < uDepth && dd < uRadius) {
          vec2 cell = mod(floor(gl_FragCoord.xy), 2.0);
          float edge = smoothstep(uRadius * 0.75, uRadius, dd);
          if (edge < 0.5 || cell.x == cell.y) discard;
        }
      }`);
  };
  material.customProgramCacheKey = () => "xray";
  return material;
}
