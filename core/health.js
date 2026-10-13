export const MAX_HEARTS = 3;
export const HEARTS_KEY = "isoworld:hearts";

export function createHealth({ storage = globalThis.localStorage, max = MAX_HEARTS } = {}) {
  const read = () => {
    try { const v = Number(storage?.getItem(HEARTS_KEY)); return Number.isInteger(v) && v > 0 && v <= max ? v : max; } catch { return max; }
  };
  const save = () => { try { storage?.setItem(HEARTS_KEY, String(hearts)); } catch {} };
  let hearts = read(), warded = false;
  const listeners = new Set();
  const emit = (e) => { for (const f of [...listeners]) f({ ...e, hearts, max }); };
  return {
    max,
    get hearts() { return hearts; },
    get warded() { return warded; },
    on(f) { listeners.add(f); return () => listeners.delete(f); },
    ward(on = true) { if (warded === !!on) return false; warded = !!on; emit({ type: warded ? "ward" : "unward" }); return true; },
    absorb(cause) {
      if (!warded) return false;
      warded = false;
      emit({ type: "absorb", cause });
      return true;
    },
    hit(n = 1, cause = null) {
      if (!(n > 0)) return { absorbed: false, dead: false };
      if (this.absorb(cause)) return { absorbed: true, dead: false };
      hearts = Math.max(0, hearts - Math.max(0, n));
      save();
      emit({ type: "hurt", n, cause });
      return { absorbed: false, dead: hearts === 0 };
    },
    heal(n = 1) {
      const was = hearts;
      hearts = Math.min(max, hearts + Math.max(0, n));
      if (hearts === was) return false;
      save();
      emit({ type: "heal", n: hearts - was });
      return true;
    },
    refill(cause = null) {
      const was = hearts;
      hearts = max;
      save();
      emit({ type: "refill", n: max - was, cause });
      return was !== max;
    },
  };
}
