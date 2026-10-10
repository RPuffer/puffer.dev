import { register as forestA } from "./forest-a.js";

export function register(style) {
  const P = style.palette;
  const t = P.tones?.["fire-bird"] || [];
  const warm = t.filter((x) => x[0] !== "#ffffff");
  const pale = t.find((x) => x[0] === "#ffffff");
  const bird = forestA({
    ...style,
    palette: {
      ...P,
      spirit: warm[0] || P.spirit,
      ember: warm[2] || P.ember,
      flame: warm[3] || P.flame,
      beak: pale || P.beak,
    },
  });
  return {
    catalog: { "fire-bird": bird.catalog["fire-bird"] },
    builders: {
      "fire-bird"(v, rot, st, ctx) {
        const m = bird.builders["fire-bird"](v, 0, st, ctx);
        m.geometry.rotateY((rot * Math.PI) / 2);
        return m;
      },
    },
  };
}
