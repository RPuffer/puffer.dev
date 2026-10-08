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

export function createRun(game, { prepare, unmount, mount, detach } = {}) {
  let seq = 0, pre = null, sequence = null;
  const loaders = new Set();
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

  const load = (prepared, opts, keep = false) => {
    const t0 = performance.now();
    let retire = null;
    if (game.state.level) { if (keep && detach) retire = detach(game.state); else unmount?.(game.state); }
    const state = game.load(prepared.level, { ...opts, navigate, keep: !!retire });
    mount?.(state, prepared);
    watch(state);
    for (const f of loaders) f(state);
    const bakeMs = performance.now() - t0;
    const entry = { name: prepared.level.name, loadMs: Math.round(prepared.loadMs || 0), bakeMs: Math.round(bakeMs), frameMs: null };
    bakes.push(entry);
    requestAnimationFrame(() => requestAnimationFrame(() => { entry.frameMs = Math.round(performance.now() - t0); }));
    state.retire = retire;
    return state;
  };

  const leave = () => {
    const leaving = game.state.actor?.cell?.slice();
    if (leaving) history.replaceState({ ...(history.state || {}), at: leaving }, "");
  };

  function stager(prepared, { from, arrive }) {
    const token = ++seq;
    let retire = null;
    return [
      () => {
        if (token !== seq) return;
        if (pre?.name === prepared.level.name) pre = null;
        leave();
        const state = load(prepared, { from, arrive, reset: undefined, spawn: undefined }, true);
        retire = state.retire;
        delete state.retire;
      },
      () => game.renderer.compile?.(),
      () => { retire?.(); retire = null; },
    ];
  }

  function commit(name, from, arrive) {
    history.pushState(null, "", nextSearch(name, from, arrive));
    window.__swapCount++;
    window.__swapError = null;
  }

  async function swap(name, { from, arrive, at = null, push = true } = {}) {
    const token = ++seq;
    let prepared;
    try { prepared = await preload(name); } finally { if (pre?.name === name) pre = null; }
    if (token !== seq) return false;
    if (push) leave();
    const state = load(prepared, { from, arrive, at, reset: undefined, spawn: undefined }, true);
    game.renderer.compile?.();
    state.retire?.();
    delete state.retire;
    if (push) history.pushState(null, "", nextSearch(name, from, arrive));
    window.__swapCount++;
    window.__swapError = null;
    return true;
  }

  function navigate(next, from, arrive) {
    if (sequence?.navigate(next, from, arrive)) return;
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
    sequence?.abort();
    swap(q.level, { from: q.from, arrive: q.arrive, at: e.state?.at || null, push: false }).catch((err) => {
      window.__swapError = String(err?.message || err);
      location.reload();
    });
  });

  addEventListener("pageshow", (e) => { if (e.persisted) { seq++; pre = null; sequence?.abort(); } });

  return {
    preload,
    swap,
    navigate,
    bakes,
    stager,
    commit,
    onLoad(f) { loaders.add(f); if (game.state.level) f(game.state); return () => loaders.delete(f); },
    use(s) { sequence = s; },
    boot(prepared) {
      return load(prepared, {});
    },
  };
}
