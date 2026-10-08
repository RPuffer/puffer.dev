import { readParams } from "./game.js";

export function nextSearch(next, from, arrive, search = location.search) {
  const q = new URLSearchParams(search);
  q.set("level", next);
  q.set("from", from);
  if (arrive) q.set("arrive", arrive); else q.delete("arrive");
  q.delete("spawn");
  q.delete("reset");
  return "?" + q.toString();
}

export function createRun(game, { prepare, unmount, mount } = {}) {
  let seq = 0, pre = null;
  const bakes = [];
  window.__swapCount = 0;
  window.__swapError = null;
  window.__bakes = bakes;

  const preload = (name) => {
    if (pre?.name === name) return pre.promise;
    const t0 = performance.now();
    const promise = Promise.resolve().then(() => prepare(name)).then((r) => ({ ...r, loadMs: performance.now() - t0 }));
    promise.catch(() => {});
    pre = { name, promise };
    return promise;
  };

  const watch = (state) => {
    state.things?.on((e) => { if (e.type === "ride" && e.next && state.params.nav !== "0") preload(e.next); });
  };

  const load = (prepared, opts) => {
    const t0 = performance.now();
    if (game.state.level) unmount?.(game.state);
    const state = game.load(prepared.level, { ...opts, navigate });
    mount?.(state, prepared);
    watch(state);
    const bakeMs = performance.now() - t0;
    bakes.push({ name: prepared.level.name, loadMs: Math.round(prepared.loadMs || 0), bakeMs: Math.round(bakeMs) });
    return state;
  };

  async function swap(name, { from, arrive, at = null, push = true } = {}) {
    const token = ++seq;
    let prepared;
    try { prepared = await preload(name); } finally { if (pre?.name === name) pre = null; }
    if (token !== seq) return false;
    const leaving = game.state.actor?.cell?.slice();
    if (push && leaving) history.replaceState({ ...(history.state || {}), at: leaving }, "");
    load(prepared, { from, arrive, at, reset: undefined, spawn: undefined });
    if (push) history.pushState(null, "", nextSearch(name, from, arrive));
    window.__swapCount++;
    window.__swapError = null;
    return true;
  }

  function navigate(next, from, arrive) {
    const things = game.state.things;
    swap(next, { from, arrive }).catch((e) => {
      window.__swapError = String(e?.message || e);
      console.warn("[run] swap failed: " + window.__swapError);
      if (game.state.things === things) things?.stall();
    });
  }

  addEventListener("popstate", (e) => {
    const q = readParams();
    if (!q.level) return;
    swap(q.level, { from: q.from, arrive: q.arrive, at: e.state?.at || null, push: false }).catch((err) => {
      window.__swapError = String(err?.message || err);
      location.reload();
    });
  });

  addEventListener("pageshow", (e) => { if (e.persisted) { seq++; pre = null; } });

  return {
    preload,
    swap,
    navigate,
    bakes,
    boot(prepared) {
      return load(prepared, {});
    },
  };
}
