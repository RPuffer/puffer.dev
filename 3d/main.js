import { loadLevel } from "../core/level.js";
import { start, readParams } from "../core/game.js";
import { createRenderer } from "./renderer.js";
import { loadPieces, loadGlbs } from "./hooks.js";
import { makeStyle } from "./style.js";
import { mountUI } from "../core/ui.js";
import { loadClouds } from "./clouds/index.js";

const msg = document.getElementById("msg");
const params = readParams();

async function knownLevels() {
  try {
    const res = await fetch(new URL("../levels/", import.meta.url));
    if (!res.ok) return [];
    return [...(await res.text()).matchAll(/href="([a-z0-9_-]+)\.json"/gi)].map((m) => m[1]);
  } catch { return []; }
}

try {
  const level = await loadLevel(params.level, { beforePrepare: loadPieces });
  const style = makeStyle(level);
  await loadGlbs(level, style);
  const clouds = await loadClouds(params, style);
  document.body.style.background = style.bg;
  const renderer = createRenderer(document.body);
  const game = start(level, renderer, { params });
  clouds?.mount(renderer, game.state);
  mountUI();
  if (params.debug) msg.textContent = `${level.name} ${level.size.join("x")} pitch ${params.pitch || "default"}`;
} catch (e) {
  console.error(e);
  const names = await knownLevels();
  msg.className = "err";
  msg.textContent = (e.message || String(e)) + (names.length ? `\nAvailable levels: ${names.join(", ")}, or gen&seed=N.` : "");
  window.__error = String(e.message || e);
}
