import { guardPageZoom } from "../core/nozoom.js";
import { loadLevel } from "../core/level.js";
import { createGame, readParams } from "../core/game.js";
import { createRun } from "../core/run.js";
import { CATALOG } from "../core/catalog.js";
import { createRenderer } from "./renderer.js";
import { loadPieces, loadGlbs, BUILDERS } from "./hooks.js";
import { makeStyle } from "./style.js";
import { mountUI } from "../core/ui.js";
import { loadClouds } from "./clouds/index.js";
import { createSequence } from "../core/sequence.js";
import { CLIP_DATA, DANCES } from "./clips.js";
import { RISE } from "./things.js";
import { motion } from "./motion.js";
import { createRideFx } from "./speedlines.js";
import { SKY, SKY_BG } from "./sky.js";
import { idle, warmIsland } from "../core/warm.js";

guardPageZoom();

const msg = document.getElementById("msg");
const params = readParams();
const BASE_CATALOG = { ...CATALOG };

async function knownLevels() {
  try {
    const res = await fetch(new URL("../levels/", import.meta.url));
    if (!res.ok) return [];
    return [...(await res.text()).matchAll(/href="([a-z0-9_-]+)\.json"/gi)].map((m) => m[1]);
  } catch { return []; }
}

const resetRegistry = () => {
  for (const k of Object.keys(CATALOG)) if (!(k in BASE_CATALOG)) delete CATALOG[k];
  Object.assign(CATALOG, BASE_CATALOG);
  for (const k of Object.keys(BUILDERS)) delete BUILDERS[k];
};

async function prepare(name) {
  const level = await loadLevel(name, { beforePrepare: async (raw) => { resetRegistry(); await loadPieces(raw); } });
  if (SKY !== "none") level.bg = SKY_BG;
  const style = makeStyle(level);
  await loadGlbs(level, style);
  return { level, style };
}

function holdAtExit(game, sequence, role = params.ride === "entry" ? "entry" : "exit") {
  const S = game.state, e = S.things?.things.find((t) => t.kind === "elevator" && t.role === role);
  if (!e) return;
  S.actor.path = [];
  S.actor.cell = [e.x, e.z];
  S.actor.pos.x = e.x + 0.5;
  S.actor.pos.z = e.z + 0.5;
  sequence.freeze("hold");
  let n = 0;
  const go = () => {
    if (!S.things.act()) { if (n++ < 60) requestAnimationFrame(go); return; }
    if (!sequence.active && role === "exit") requestAnimationFrame(() => holdAtExit(game, sequence, "entry"));
  };
  requestAnimationFrame(go);
}

try {
  const t0 = performance.now();
  const first = await prepare(params.level);
  first.loadMs = performance.now() - t0;
  const clouds = await loadClouds(params, first.style);
  const renderer = createRenderer(document.body);
  const game = createGame(renderer, params);
  renderer.addFx(clouds?.column());
  renderer.addFx(createRideFx());
  const run = createRun(game, {
    prepare,
    unmount: () => clouds?.unmount(renderer),
    detach: () => {
      const r = renderer.detach(), c = clouds?.detach();
      return () => { renderer.dispose(r); if (c) clouds.dispose(renderer, c); };
    },
    mount: (state, { style }) => {
      document.body.style.background = style.bg;
      renderer.adopt(clouds?.mount(renderer, state, style));
    },
  });
  window.__run = run;
  const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sequence = createSequence({
    game,
    run,
    view: renderer,
    rise: RISE,
    short: () => params.seq === "0" || params.hero === "0" || reduced() || !motion.auto,
    dances: DANCES.map((name) => ({ name, duration: CLIP_DATA[name].duration })),
  });
  run.use(sequence);
  game.canRotate = () => !sequence.active && !game.state.actor?.locked;
  game.canZoom = () => !sequence.active;
  renderer.onOrient((state) => clouds?.orient(state));
  run.boot(first);
  run.onLoad((state) => {
    if (params.nav === "0") return;
    const exit = state.things?.things.find((t) => t.kind === "elevator" && t.role === "exit");
    const order = state.level.runOrder || [], i = order.indexOf(state.level.name);
    const next = exit?.to || exit?.run?.[exit.run.indexOf(state.level.name) + 1] || (i >= 0 ? order[i + 1] : null);
    if (next) idle(() => { if (game.state === state) warmIsland(next).catch(() => {}); });
  });
  window.__ui = mountUI({
    rotate: (step) => game.rotate(step),
    zoom: (step) => game.zoom(step),
    nav: {
      current: () => game.state.level?.name,
      busy: () => sequence.active || !!game.state.actor?.locked,
      preload: (name) => run.preload(name).catch(() => {}),
      go: (name) => run.swap(name, { from: game.state.level.name }),
    },
  });
  if (params.seq === "hold") holdAtExit(game, sequence);
  if (params.debug) msg.textContent = `${game.state.level.name} ${game.state.level.size.join("x")} pitch ${params.pitch || "default"}`;
} catch (e) {
  console.error(e);
  const names = await knownLevels();
  msg.className = "err";
  msg.textContent = (e.message || String(e)) + (names.length ? `\nAvailable levels: ${names.join(", ")}, or gen&seed=N.` : "");
  window.__error = String(e.message || e);
}
