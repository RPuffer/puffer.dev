const CSS = `
.iw-ui{position:fixed;right:max(8px,env(safe-area-inset-right,0px));bottom:max(8px,env(safe-area-inset-bottom,0px));z-index:20;display:flex;gap:6px;align-items:center;padding:6px 8px;border-radius:8px;background:rgba(30,30,30,.72);color:#eee;font:12px/1.2 system-ui,sans-serif;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}
.iw-ui.iw-inline{position:static;background:none;padding:0}
@media (max-width:560px){.iw-ui:not(.iw-inline){top:max(8px,env(safe-area-inset-top,0px));bottom:auto}}
.iw-ui button{font:15px/1 system-ui,sans-serif;color:#eee;background:#444;border:1px solid #555;border-radius:6px;padding:4px 8px;cursor:pointer;touch-action:manipulation}
.iw-ui button:active{background:#666}
.iw-ui a{font:inherit;color:#eee;background:#444;border:1px solid #555;border-radius:6px;padding:5px 9px;text-decoration:none}
.iw-ui .iw-nav-btn{width:30px;height:30px;padding:0;border-radius:50%;display:grid;place-items:center;font-size:16px}
.iw-ui .iw-nav-btn[aria-expanded=true]{background:#666}
.iw-nav{position:fixed;inset:0;z-index:30;background:rgba(10,12,18,0);transition:background .3s;touch-action:manipulation}
.iw-nav.open{background:rgba(10,12,18,.45)}
.iw-nav .mol{position:absolute;left:50%;top:50%;width:0;height:0}
.iw-nav .bond{position:absolute;left:0;top:0;height:4px;margin-top:-2px;border-radius:2px;background:rgba(240,240,240,.7);transform-origin:0 50%;transform:rotate(var(--a)) scaleX(0);transition:transform .32s cubic-bezier(.36,0,.66,-.56)}
.iw-nav.open .bond{transform:rotate(var(--a)) scaleX(1);transition:transform .5s cubic-bezier(.34,1.56,.64,1) var(--d)}
.iw-nav .node{position:absolute;left:0;top:0;width:var(--s);height:var(--s);margin:calc(var(--s) / -2) 0 0 calc(var(--s) / -2);padding:0;border-radius:50%;border:3px solid #eee;background:#222 center/cover no-repeat;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.45);transform:translate(0,0) scale(.2);opacity:0;transition:transform .32s cubic-bezier(.36,0,.66,-.56),opacity .3s;touch-action:manipulation}
.iw-nav.open .node{transform:translate(var(--x),var(--y)) scale(1);opacity:1;transition:transform .55s cubic-bezier(.34,1.56,.64,1) var(--d),opacity .2s var(--d)}
.iw-nav .node.current{border-color:#ffd36a;box-shadow:0 0 0 4px rgba(255,211,106,.35),0 4px 14px rgba(0,0,0,.45)}
.iw-nav .node.locked{cursor:not-allowed;filter:grayscale(1) brightness(.45);border-color:#777}
.iw-nav .node.locked::after{content:"\\1F512";position:absolute;inset:0;display:grid;place-items:center;font-size:calc(var(--s) * .32)}
.iw-nav .node:focus-visible{outline:3px solid #8cf;outline-offset:3px}
.iw-nav .node:hover:not(.locked){filter:brightness(1.12)}
.iw-nav .name{position:absolute;left:50%;top:calc(100% + 6px);transform:translateX(-50%);white-space:nowrap;padding:3px 7px;border-radius:6px;background:rgba(20,20,20,.85);color:#eee;font:12px/1.2 system-ui,sans-serif;opacity:0;pointer-events:none;transition:opacity .15s}
.iw-nav .node:hover .name,.iw-nav .node:focus-visible .name,.iw-nav .node.current .name{opacity:1}
.iw-nav .node.shake{animation:iw-shake .3s}
@keyframes iw-shake{25%{margin-left:calc(var(--s) / -2 - 5px)}75%{margin-left:calc(var(--s) / -2 + 5px)}}
.iw-veil{position:fixed;inset:0;z-index:29;pointer-events:none;opacity:0;transition:opacity .18s ease-in}
.iw-veil.on{opacity:1}
@media (prefers-reduced-motion:reduce){.iw-nav .node,.iw-nav .bond,.iw-nav.open .node,.iw-nav.open .bond{transition-duration:.01s}}
`;

const RUN_URL = new URL("../levels/run.json", import.meta.url);
const thumb = (n) => new URL(`../assets/start/${n}.jpg`, import.meta.url).href;
const label = (n) => n.split("-")[0].replace(/^./, (c) => c.toUpperCase());
const reachedIn = (n) => { try { return !!JSON.parse(localStorage.getItem("isoworld:things:" + n) || "null"); } catch { return false; } };
const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

function mountNavigator({ current, go, busy = () => false, preload = null, reached = reachedIn }) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "iw-nav-btn";
  btn.textContent = "\u2B21";
  btn.title = "island navigator";
  btn.setAttribute("aria-label", "island navigator");
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-haspopup", "dialog");
  btn.hidden = true;
  let order = [], layer = null, closing = null, going = false;
  fetch(RUN_URL).then((r) => r.json()).then((j) => { order = Array.isArray(j.order) ? j.order : []; sync(); }).catch(() => {});

  const sync = () => {
    const show = !going && order.includes(current()) && !busy();
    if (btn.hidden === show) btn.hidden = !show;
    if (!show && layer && !going) close(false);
  };
  const timer = setInterval(sync, 200);

  const nodesFor = (at) => {
    const i = order.indexOf(at);
    const out = [];
    for (let k = -2; k <= 2; k++) { const n = order[i + k]; if (n) out.push({ n, k }); }
    return out;
  };

  function open() {
    if (layer || btn.hidden) return;
    const at = current();
    const step = Math.max(58, Math.min(92, (innerWidth - 100) / 4));
    const size = Math.round(Math.min(68, step * 0.82));
    const lay = document.createElement("div");
    lay.className = "iw-nav";
    lay.setAttribute("role", "dialog");
    lay.setAttribute("aria-label", "islands nearby");
    const mol = document.createElement("div");
    mol.className = "mol";
    lay.appendChild(mol);
    const items = nodesFor(at);
    const pos = (k) => [k * step, k % 2 ? -step * 0.42 : 0];
    for (const { k } of items) {
      if (k === 0) continue;
      const inner = k < 0 ? k + 1 : k - 1;
      const [x0, y0] = pos(inner), [x1, y1] = pos(k);
      const b = document.createElement("i");
      b.className = "bond";
      b.style.left = x0 + "px";
      b.style.top = y0 + "px";
      b.style.width = Math.hypot(x1 - x0, y1 - y0) + "px";
      b.style.setProperty("--a", Math.atan2(y1 - y0, x1 - x0) + "rad");
      b.style.setProperty("--d", (Math.abs(k) - 1) * 60 + "ms");
      mol.appendChild(b);
    }
    const buttons = [];
    for (const { n, k } of items) {
      const [x, y] = pos(k);
      const ok = k === 0 || reached(n);
      const b = document.createElement("button");
      b.type = "button";
      b.className = "node" + (k === 0 ? " current" : "") + (ok ? "" : " locked");
      b.dataset.level = n;
      b.dataset.offset = String(k);
      const s = k === 0 ? Math.round(size * 1.3) : size;
      b.style.setProperty("--s", s + "px");
      b.style.setProperty("--x", x + "px");
      b.style.setProperty("--y", y + "px");
      b.style.setProperty("--d", Math.abs(k) * 70 + "ms");
      b.style.backgroundImage = `url("${thumb(n)}")`;
      const name = `${order.indexOf(n) + 1}. ${label(n)}`;
      b.setAttribute("aria-label", name + (k === 0 ? " (here)" : ok ? "" : " (locked)"));
      if (!ok) b.setAttribute("aria-disabled", "true");
      const tag = document.createElement("span");
      tag.className = "name";
      tag.textContent = name + (k === 0 ? " \u00B7 here" : "");
      b.appendChild(tag);
      if (ok && k !== 0 && preload) { const warm = () => preload(n); b.addEventListener("pointerenter", warm, { once: true }); b.addEventListener("focus", warm, { once: true }); }
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        if (k === 0) return close();
        if (!ok) { b.classList.remove("shake"); void b.offsetWidth; b.classList.add("shake"); return; }
        jump(n);
      });
      mol.appendChild(b);
      buttons.push(b);
    }
    lay.addEventListener("click", (e) => { if (e.target === lay || e.target === mol) close(); });
    for (const ev of ["pointerdown", "pointerup", "touchstart", "touchend"]) lay.addEventListener(ev, (e) => e.stopPropagation(), { passive: ev.startsWith("touch") });
    lay.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key === "Tab") {
        const f = buttons.indexOf(document.activeElement);
        const nx = (f + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
        e.preventDefault();
        buttons[nx].focus();
        return;
      }
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        const f = Math.max(0, buttons.indexOf(document.activeElement));
        const d = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1;
        buttons[Math.min(buttons.length - 1, Math.max(0, f + d))].focus();
      }
    });
    lay.addEventListener("keyup", (e) => e.stopPropagation());
    document.body.appendChild(lay);
    layer = lay;
    closing = null;
    btn.setAttribute("aria-expanded", "true");
    lay.getBoundingClientRect();
    requestAnimationFrame(() => lay.classList.add("open"));
    (buttons.find((b) => b.classList.contains("current")) || buttons[0])?.focus({ preventScroll: true });
  }

  function close(refocus = true) {
    if (!layer || closing) return closing;
    const lay = layer;
    lay.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
    if (refocus && !btn.hidden) btn.focus({ preventScroll: true });
    closing = pause(380).then(() => { lay.remove(); if (layer === lay) layer = null; closing = null; });
    return closing;
  }

  async function jump(n) {
    if (going) return;
    going = true;
    window.__navJumps = (window.__navJumps || 0) + 1;
    const veil = document.createElement("div");
    veil.className = "iw-veil";
    veil.style.background = document.body.style.background || "#000";
    document.body.appendChild(veil);
    try {
      close(false);
      await frame();
      veil.classList.add("on");
      await pause(200);
      await go(n);
      veil.style.background = document.body.style.background || veil.style.background;
      await frame();
      veil.style.transition = "opacity .3s ease-out";
      veil.classList.remove("on");
      await pause(320);
    } catch (e) {
      veil.classList.remove("on");
      console.warn("[nav] jump failed: " + (e?.message || e));
    } finally {
      veil.remove();
      going = false;
      sync();
      if (!btn.hidden) btn.focus({ preventScroll: true });
    }
  }

  btn.addEventListener("pointerdown", (e) => e.stopPropagation());
  btn.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") e.stopPropagation(); });
  btn.addEventListener("click", (e) => { e.preventDefault(); if (layer && !closing) close(); else open(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && layer) close(); });
  return { button: btn, open, close, sync, get isOpen() { return !!layer && !closing; }, dispose() { clearInterval(timer); layer?.remove(); btn.remove(); } };
}

export const startHref = () => new URL("../islands.html", import.meta.url).href;

const framed = () => { try { return window.top !== window; } catch { return true; } };

export function mountUI({ container, rotate = null, nav = null } = {}) {
  const q = new URLSearchParams(location.search);
  if (!container && (framed() || q.get("ui") === "0" || q.get("hero") === "0")) return null;
  if (!document.getElementById("iw-ui-css")) {
    const st = document.createElement("style");
    st.id = "iw-ui-css";
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  const box = document.createElement("div");
  box.className = "iw-ui" + (container ? " iw-inline" : "");
  const islands = document.createElement("a");
  islands.textContent = "islands";
  islands.href = startHref();
  const turns = rotate ? [[-1, "⟲", "rotate left (Q)"], [1, "⟳", "rotate right (E)"]].map(([step, label, title]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.title = title;
    b.setAttribute("aria-label", title);
    b.dataset.rotate = String(step);
    b.addEventListener("pointerdown", (e) => e.stopPropagation());
    b.addEventListener("click", (e) => { e.preventDefault(); rotate(step); });
    return b;
  }) : [];
  const navigator = nav ? mountNavigator(nav) : null;
  box.append(...turns, ...(navigator ? [navigator.button] : []), islands);
  (container || document.body).appendChild(box);
  return { element: box, link: islands, turns, navigator };
}
