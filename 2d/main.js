import { loadLevel } from "../core/level.js";
import { start, readParams } from "../core/game.js";
import { loadSprites } from "./sprites.js";
import { createRenderer } from "./renderer.js";

const msg = document.getElementById("msg");
const params = readParams();
try {
  const [level, sprites] = await Promise.all([loadLevel(params.level), loadSprites(new URL("./assets/", import.meta.url))]);
  document.body.style.background = level.bg || "#404040";
  const renderer = createRenderer(document.body, sprites);
  start(level, renderer, { params });
  if (params.debug) msg.textContent = `${level.name} ${level.size.join("x")}`;
} catch (e) {
  console.error(e);
  msg.textContent = "ERR " + (e.message || e);
  window.__error = String(e.message || e);
}
