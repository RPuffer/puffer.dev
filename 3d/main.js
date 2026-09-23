import { loadLevel } from "../core/level.js";
import { start, readParams } from "../core/game.js";
import { createRenderer } from "./renderer.js";
import { mountUI } from "../core/ui.js";

const msg = document.getElementById("msg");
const params = readParams();
try {
  const level = await loadLevel(params.level);
  document.body.style.background = level.bg || "#404040";
  const renderer = createRenderer(document.body);
  start(level, renderer, { params });
  mountUI();
  if (params.debug) msg.textContent = `${level.name} ${level.size.join("x")} pitch ${params.pitch || "default"}`;
} catch (e) {
  console.error(e);
  msg.textContent = "ERR " + (e.message || e);
  window.__error = String(e.message || e);
}
