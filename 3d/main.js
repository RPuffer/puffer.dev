import { guardPageZoom } from "../core/nozoom.js";
import { loadLevel } from "../core/level.js";
import { createGame, readParams } from "../core/game.js";
import { createRun } from "../core/run.js";
import { CATALOG } from "../core/catalog.js";
import { createRenderer } from "./renderer.js";
import { heroClass, CLASS_KEY } from "./heroes.js";
import { loadPieces, loadGlbs, BUILDERS } from "./hooks.js";
import { makeStyle } from "./style.js";
import { mountUI } from "../core/ui.js";
import { mountHearts } from "../core/hearts.js";
import { mountStatus } from "../core/status.js";
import { loadClouds } from "./clouds/index.js";
import { createSequence } from "../core/sequence.js";
import { CLIP_DATA, DANCES } from "./clips.js";
import { RISE } from "./things.js";
import { motion } from "./motion.js";
import { createRideFx } from "./speedlines.js";
import { createPowerFx } from "./powerfx.js";
import { mountPowerHud } from "../core/powers-ui.js";
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
  const level = await loadLevel(name, { beforePrepare: async (raw) => { resetRegistry(); await loadPieces(raw); if (params.fences === "0") raw.decor = (raw.decor || []).filter((d) => !/^rail-/.test(d.t)); } });
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
  renderer.addFx(createPowerFx(game, renderer));
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
  const q = new URLSearchParams(location.search);
  const status = q.get("ui") === "0" || q.get("hero") === "0" ? null : mountStatus({ busy: () => sequence.active || !!game.state.actor?.locked });
  window.__status = status;
  run.onLoad((state) => {
    status?.clear();
    const things = state.things, toast = things?.say?.bind(things);
    let said = null;
    if (status && things && toast) {
      // Debuffs say their rule and then emit "banner" in the same tick; holding the toast for a microtask lets the banner claim the text for the status card instead of a duplicate toast.
      things.say = (text) => { said = text; queueMicrotask(() => { if (said === text) toast(text); said = null; }); };
    }
    state.traps?.on((e) => {
      if (e.type !== "banner" || !status) return;
      const text = said;
      said = null;
      status.announce(e.trap.id, { title: e.trap.meta?.name || "Island debuff", text: text || "" });
    });
    state.things?.on((e) => { if (e.type === "stub" && e.thing.role === "exit") window.__ui?.finale(); });
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
    character: {
      busy: () => sequence.active || !!game.state.actor?.locked,
      current: () => renderer.hero?.userData.heroClass || heroClass(params),
      onOpen: () => game.pause(),
      onClose: () => game.resume(),
      pick: (id) => {
        try { localStorage.setItem(CLASS_KEY, id); } catch {}
        const cls = heroClass({ class: id });
        if (!cls) return;
        game.state.params.class = cls;
        params.class = cls;
        renderer.swapHero(cls);
        window.__classSwaps = (window.__classSwaps || 0) + 1;
      },
    },
  });
  if (window.__ui) window.__hearts = mountHearts(game.state.health);
  window.__powerHud = mountPowerHud(game);
  if (params.seq === "hold") holdAtExit(game, sequence);
  if (params.debug) msg.textContent = `${game.state.level.name} ${game.state.level.size.join("x")} pitch ${params.pitch || "default"}`;
} catch (e) {
  console.error(e);
  const names = await knownLevels();
  msg.className = "err";
  msg.textContent = (e.message || String(e)) + (names.length ? `\nAvailable levels: ${names.join(", ")}, or gen&seed=N.` : "");
  window.__error = String(e.message || e);
}
