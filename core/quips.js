import { QUIPS } from "./quips-lines.js";

export const DEATHS_KEY = "isoworld:deaths";
export const QUIP_S = 3.6;
const DEATHS = new Set(["fall", "knock", "flop"]);

export function createQuips({ storage = globalThis.localStorage, random = Math.random, lines = QUIPS } = {}) {
  const read = () => {
    try {
      const v = JSON.parse(storage?.getItem(DEATHS_KEY) || "null");
      if (v && typeof v === "object") return { run: Number(v.run) || 0, islands: v.islands || {}, last: v.last || {} };
    } catch {}
    return { run: 0, islands: {}, last: {} };
  };
  const save = (v) => { try { storage?.setItem(DEATHS_KEY, JSON.stringify(v)); } catch {} };
  const bags = new Map();
  let said = null;
  const draw = (id, list) => {
    let bag = bags.get(id);
    if (!bag || !bag.length) {
      bag = list.slice();
      for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
      if (bag.length > 1 && bag[bag.length - 1] === said) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
      bags.set(id, bag);
    }
    let line = bag.pop();
    if (line === said && bag.length) { const next = bag.pop(); bag.unshift(line); line = next; }
    said = line;
    return line;
  };
  const near = (a, b) => Array.isArray(a) && Array.isArray(b) && Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) <= 1;
  return {
    get said() { return said; },
    counts: read,
    death({ island, kind, cell }) {
      const v = read();
      v.run++;
      v.islands[island] = (v.islands[island] || 0) + 1;
      const again = near(v.last[island], cell);
      v.last[island] = cell ? [cell[0], cell[1]] : null;
      save(v);
      const n = v.islands[island];
      const fresh = (l) => l && l.some((x) => x !== said);
      let bucket, list;
      if (fresh(lines.island[n])) { bucket = `island:${n}`; list = lines.island[n]; }
      else if (fresh(lines.run[v.run])) { bucket = `run:${v.run}`; list = lines.run[v.run]; }
      else if (again) { bucket = "again"; list = lines.again; }
      else if (random() < 0.45) { bucket = "generic"; list = lines.generic; }
      else { bucket = kind === "flop" ? "heart" : "edge"; list = lines[bucket]; }
      return { line: draw(bucket, list), bucket, island: n, run: v.run };
    },
  };
}

const CSS = `
.iw-quip{position:fixed;left:50%;top:calc(max(12px,env(safe-area-inset-top,0px)) + max(150px,26vh));z-index:20;box-sizing:border-box;max-width:min(calc(100vw - 32px),540px);padding:10px 18px;border-radius:16px;background:rgba(22,18,34,.74);color:#fff3e0;font:800 17px/1.25 ui-rounded,"SF Rounded",system-ui,sans-serif;letter-spacing:.01em;text-align:center;text-wrap:balance;pointer-events:none;box-shadow:0 0 0 2px rgba(232,68,95,.55),0 6px 0 rgba(10,8,18,.45);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);opacity:0;transform:translateX(-50%) scale(.9);transition:opacity .35s ease-in,transform .35s ease-in}
.iw-quip[hidden]{display:none}
.iw-quip.on{opacity:1;transform:translateX(-50%) rotate(-1deg);transition:none;animation:iw-quip-in .32s cubic-bezier(.3,1.45,.5,1)}
@keyframes iw-quip-in{0%{opacity:0;transform:translateX(-50%) scale(.6) rotate(-4deg)}100%{opacity:1;transform:translateX(-50%) rotate(-1deg)}}
@media (max-width:480px){.iw-quip{font-size:15px;padding:9px 14px}}
@media (prefers-reduced-motion:reduce){.iw-quip.on{animation-duration:.01s}.iw-quip{transition-duration:.01s}}
`;

export function mountQuips(run, { storage = globalThis.localStorage, random = Math.random } = {}) {
  if (!document.getElementById("iw-quip-css")) {
    const st = document.createElement("style");
    st.id = "iw-quip-css";
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  const quips = createQuips({ storage, random });
  const el = document.createElement("div");
  el.className = "iw-quip";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.hidden = true;
  document.body.appendChild(el);
  let timer = 0, hide = 0, off = null;
  const show = (text) => {
    clearTimeout(timer); clearTimeout(hide);
    el.hidden = false;
    el.textContent = text;
    el.classList.remove("on");
    void el.offsetWidth;
    el.classList.add("on");
    timer = setTimeout(() => { el.classList.remove("on"); hide = setTimeout(() => { el.hidden = true; }, 400); }, QUIP_S * 1000);
  };
  const api = { element: el, quips, last: null, show };
  const offLoad = run.onLoad((state) => {
    off?.();
    clearTimeout(timer); clearTimeout(hide);
    el.classList.remove("on");
    el.hidden = true;
    off = state.life?.on((e) => {
      if (!DEATHS.has(e.type)) return;
      const r = quips.death({ island: state.level.name, kind: e.type, cell: state.actor?.cell });
      api.last = { ...r, kind: e.type, cause: e.cause || null };
      show(r.line);
    }) || null;
  });
  api.dispose = () => { off?.(); offLoad?.(); clearTimeout(timer); clearTimeout(hide); el.remove(); };
  return api;
}
