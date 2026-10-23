export const TILE = { drop: 1.5, wobble: 0.14, gravity: 42, rise: 0.35, sink: 0.3, height: 1 };

const key = (x, z) => x + "," + z;

export function dropDepth(t) {
  const u = Math.max(0, t - TILE.wobble);
  return 0.5 * TILE.gravity * u * u;
}

export function createTiles(level) {
  const gone = new Map(), risen = new Map(), listeners = new Set();
  const emit = (e) => { for (const f of [...listeners]) f(e); };
  const api = {
    get gone() { return gone; },
    get risen() { return risen; },
    on(f) { listeners.add(f); return () => listeners.delete(f); },
    isGone: (c) => gone.has(key(c[0], c[1])),
    isRisen: (c) => !!risen.get(key(c[0], c[1]))?.up,
    drop(c, { ride = false } = {}) {
      const k = key(c[0], c[1]);
      if (gone.has(k)) return false;
      const row = level.cells[c[1]];
      if (!row?.[c[0]]) return false;
      gone.set(k, { cell: [c[0], c[1]], orig: row[c[0]], t: 0, ride });
      row[c[0]] = { h: 0, s: "none" };
      emit({ type: "drop", cell: [c[0], c[1]], ride });
      return true;
    },
    rise(c) {
      const k = key(c[0], c[1]);
      const r = risen.get(k);
      if (r?.up) return false;
      risen.set(k, { cell: [c[0], c[1]], t: r ? r.t : 0, up: true });
      level.blocked.add(k);
      emit({ type: "rise", cell: [c[0], c[1]] });
      return true;
    },
    lower(c) {
      const k = key(c[0], c[1]);
      const r = risen.get(k);
      if (!r?.up) return false;
      r.up = false;
      level.blocked.delete(k);
      emit({ type: "lower", cell: [c[0], c[1]] });
      return true;
    },
    height(c) {
      const r = risen.get(key(c[0], c[1]));
      if (!r) return 0;
      return TILE.height * Math.min(1, r.t / TILE.rise);
    },
    depth(c) {
      const g = gone.get(key(c[0], c[1]));
      return g ? dropDepth(g.t) : 0;
    },
    update(dt) {
      for (const g of gone.values()) if (g.t < TILE.drop) g.t = Math.min(TILE.drop, g.t + dt);
      for (const [k, r] of risen) {
        if (r.up) r.t = Math.min(TILE.rise, r.t + dt);
        else { r.t = Math.max(0, r.t - dt * (TILE.rise / TILE.sink)); if (!r.t) risen.delete(k); }
      }
    },
    dispose() {
      for (const g of gone.values()) level.cells[g.cell[1]][g.cell[0]] = g.orig;
      for (const [k, r] of risen) if (r.up) level.blocked.delete(k);
      gone.clear();
      risen.clear();
      listeners.clear();
    },
  };
  return api;
}
