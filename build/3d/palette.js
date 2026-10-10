import { PALETTE as CORE } from "../core/catalog.js";

export const PALETTE = {
  ...CORE,
  stone: { ...CORE.stone, side: ["#ddbb71", "#dab667", "#e3c583"], pebbleEdge: "#e4c98e" },
  dirt: { ...CORE.dirt, path: "#f6d881" },
  water: { ...CORE.water, foamShade: "#c6f2ff" },
  rope: "#f6d881",
  ropeShade: "#dcc070",
  interior: "#6b3a1a",
  flowerBlue: ["#6ad7ff", "#3fb4e6"],
  stem: "#64c960",
  heart: ["#fe738f", "#f45f7d", "#d9435f"],
  axe: ["#ffffff", "#e3e3e3", "#ababab"],
  crate: ["#f6a24a", "#dc7016", "#bd4c0b"],
  pot: ["#e98b5a", "#d0704a", "#a95236"],
  flame: ["#ffe082", "#ffb31d", "#ff831d"],
  cap: ["#fe738f", "#f45f7d", "#d9435f"],
  capGold: ["#f1cd52", "#f1b900", "#dd9200"],
  capSpot: "#ffffff",
  mushroomStem: ["#fff0c3", "#e8dab1"],
  wellMortar: "#9d9173",
  gem: [["#8fffc2", "#00e09b", "#00a568"], ["#ffb3d0", "#fe738f", "#d9435f"]],
  metal: ["#8f8f8f", "#6f6f6f", "#555555"],
};

export const HERO = {
  skin: ["#ffd9b0", "#ffd9b0", "#e8b98e"],
  shirt: ["#ff6a5a", "#ff6a5a", "#d9483f"],
  pants: ["#4a5fb0", "#4a5fb0", "#34448a"],
  hair: ["#8a4a28", "#7a3f22", "#5e2f18"],
  boot: ["#6b3a1a", "#6b3a1a", "#4f2a12"],
  belt: ["#6b3a1a", "#6b3a1a", "#4f2a12"],
  eye: "#2a2230",
  hand: ["#ffd9b0", "#ffd9b0", "#e8b98e"],
  mouth: "#2a1f33",
};
