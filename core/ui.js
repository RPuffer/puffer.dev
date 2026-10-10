const CSS = `
.iw-ui{position:fixed;right:max(10px,env(safe-area-inset-right,0px));bottom:max(10px,env(safe-area-inset-bottom,0px));z-index:20;display:flex;gap:7px;align-items:center;padding:7px;border-radius:14px;background:rgba(20,24,31,.55);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}
.iw-ui:empty,.iw-touch .iw-ui:not(.iw-inline){display:none}
.iw-ui.iw-inline{position:static;background:none;padding:0}
.iw-ui button{min-width:36px;height:34px;font:700 17px/1 system-ui,sans-serif;color:#f0ede6;background:#363e4d;border:0;border-radius:10px;padding:0 9px;cursor:pointer;box-shadow:0 3px 0 #1a1f28;touch-action:manipulation;transition:transform .08s,box-shadow .08s}
.iw-ui button:hover{box-shadow:0 3px 0 #1a1f28,0 0 0 2px #12c4f0}
.iw-ui button:active{transform:translateY(2px);box-shadow:0 1px 0 #1a1f28}
.iw-orb{--o:58px;position:fixed;left:50%;top:max(12px,env(safe-area-inset-top,0px));z-index:22;width:var(--o);height:var(--o);margin-left:calc(var(--o) / -2);padding:0;border:0;border-radius:50%;background:#262c37 center/cover no-repeat;box-shadow:0 0 0 4px #262c37,0 0 0 7px #12c4f0,0 6px 0 7px rgba(20,24,31,.55);cursor:pointer;touch-action:manipulation;transition:transform .5s cubic-bezier(.34,1.7,.5,1),opacity .18s;-webkit-tap-highlight-color:transparent}
.iw-orb:hover{transform:scale(1.07)}
.iw-orb.open{transform:scale(.5);opacity:0;pointer-events:none}
.iw-orb[hidden]{display:none}
.iw-orb:focus-visible{outline:3px solid #ffd36a;outline-offset:6px}
@media (min-width:700px){.iw-orb{--o:64px}}
.iw-mark{display:flex;gap:9%;align-items:center;justify-content:center;width:100%;height:100%}
.iw-mark i{display:block;width:20%;height:20%;border-radius:3px}
.iw-mark i:nth-child(1){background:#f5c243}.iw-mark i:nth-child(2){background:#e8873a}.iw-mark i:nth-child(3){background:#7cc56a}
.iw-nav{position:fixed;inset:0;z-index:30;background:rgba(10,12,18,0);transition:background .3s;touch-action:none;user-select:none;-webkit-user-select:none}
.iw-nav.open{background:rgba(10,12,18,.45)}
.iw-nav svg{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none}
.iw-nav line{stroke:rgba(240,237,230,.8);stroke-linecap:round}
.iw-nav .mol{position:absolute;width:0;height:0}
.iw-nav .node{position:absolute;left:0;top:0;width:var(--s);height:var(--s);margin:calc(var(--s) / -2) 0 0 calc(var(--s) / -2);padding:0;border:0;border-radius:50%;background:#262c37 center/cover no-repeat;box-shadow:0 0 0 3px #f0ede6,0 5px 0 3px rgba(20,24,31,.55);cursor:pointer;transform:translate(0,0) scale(0);transition:transform .62s cubic-bezier(.3,1.75,.5,1);touch-action:none;-webkit-tap-highlight-color:transparent}
.iw-nav .node.current{box-shadow:0 0 0 3px #ffd36a,0 0 0 9px rgba(255,211,106,.3),0 5px 0 3px rgba(20,24,31,.55)}
.iw-nav .node.sel{box-shadow:0 0 0 3px #12c4f0,0 5px 0 3px rgba(20,24,31,.55)}
.iw-nav .node.locked{cursor:not-allowed;filter:grayscale(1) brightness(.45)}
.iw-nav .node.locked::after{content:"\\1F512";position:absolute;inset:0;display:grid;place-items:center;font-size:calc(var(--s) * .34)}
.iw-nav .node:focus-visible{outline:3px solid #12c4f0;outline-offset:4px}
.iw-nav .node:hover:not(.locked){filter:brightness(1.12)}
.iw-nav .name{position:absolute;left:50%;top:calc(100% + 9px);transform:translateX(-50%);white-space:nowrap;padding:4px 9px;border-radius:999px;background:rgba(20,24,31,.88);color:#f0ede6;font:600 12px/1.2 system-ui,sans-serif;opacity:0;pointer-events:none;transition:opacity .2s}
.iw-nav .node.mid,.iw-nav .node:hover,.iw-nav .node:focus-visible{z-index:2}
.iw-nav .node:hover .name,.iw-nav .node:focus-visible .name,.iw-nav .node.mid .name{opacity:1}
.iw-nav .node.shake{animation:iw-shake .3s}
@keyframes iw-shake{25%{margin-left:calc(var(--s) / -2 - 6px)}75%{margin-left:calc(var(--s) / -2 + 6px)}}
.iw-sheet{position:fixed;inset:0;z-index:31;background:rgba(10,12,18,.5)}
.iw-panel{position:absolute;top:max(84px,calc(env(safe-area-inset-top,0px) + 84px));bottom:max(12px,env(safe-area-inset-bottom,0px));left:max(10px,calc(50vw - 560px));right:max(10px,calc(50vw - 560px));border-radius:18px;overflow:hidden;background:#404040;box-shadow:0 0 0 4px #262c37,0 0 0 7px #12c4f0,0 12px 30px rgba(0,0,0,.5);transform-origin:50% -60px;animation:iw-pop .5s cubic-bezier(.34,1.56,.64,1)}
.iw-panel iframe{display:block;width:100%;height:100%;border:0}
.iw-panel .x{position:absolute;right:10px;top:10px;width:36px;height:36px;padding:0;border:0;border-radius:50%;background:#262c37;color:#f0ede6;font:700 20px/36px system-ui,sans-serif;box-shadow:0 3px 0 #14181f;cursor:pointer}
@keyframes iw-pop{from{transform:scale(.15);opacity:0}}
.iw-veil{position:fixed;inset:0;z-index:29;pointer-events:none;opacity:0;transition:opacity .18s ease-in}
.iw-veil.on{opacity:1}
@media (prefers-reduced-motion:reduce){.iw-nav .node,.iw-orb{transition-duration:.01s}.iw-panel{animation:none}}
`;

const RUN_URL = new URL("../levels/run.json", import.meta.url);
const thumb = (n) => new URL(`../assets/start/${n}.jpg`, import.meta.url).href;
const label = (n) => n.split("-")[0].replace(/^./, (c) => c.toUpperCase());
const reachedIn = (n) => { try { return !!JSON.parse(localStorage.getItem("isoworld:things:" + n) || "null"); } catch { return false; } };
const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const MARK = '<span class="iw-mark" aria-hidden="true"><i></i><i></i><i></i></span>';
const SLOT_SCALE = [1, 1, 0.8, 0.14];

export const startHref = () => new URL("../islands.html", import.meta.url).href;

const urlLevel = () => new URLSearchParams(location.search).get("level") || "home";
const hop = (n) => { const q = new URLSearchParams(location.search); q.set("level", n); q.delete("reset"); q.delete("spawn"); location.search = q.toString(); return new Promise(() => {}); };

function mountNavigator({ current = urlLevel, go = hop, busy = () => false, preload = null, reached = reachedIn } = {}) {
  const orb = document.createElement("button");
  orb.type = "button";
  orb.className = "iw-orb";
  orb.title = "islands";
  orb.setAttribute("aria-label", "islands");
  orb.setAttribute("aria-expanded", "false");
  orb.setAttribute("aria-haspopup", "dialog");
  orb.hidden = true;
  document.body.appendChild(orb);
  let order = [], loaded = false, layer = null, closing = null, going = false, sheet = null, shown = null;
  let center = 0, step = 80, size = 62, nodes = new Map(), raf = 0, drag = null, dragged = false, wheelAcc = 0;
  fetch(RUN_URL).then((r) => r.json()).then((j) => { order = Array.isArray(j.order) ? j.order : []; loaded = true; sync(); }).catch(() => {});
  const list = () => ["@islands", ...order];

  const sync = () => {
    const cur = current();
    const show = loaded && !going && !busy();
    if (orb.hidden === show) orb.hidden = !show;
    if (show && cur !== shown) {
      shown = cur;
      const known = order.includes(cur);
      orb.innerHTML = known ? "" : MARK;
      orb.style.backgroundImage = known ? `url("${thumb(cur)}")` : "";
      orb.setAttribute("aria-label", known ? `islands (here: ${label(cur)})` : "islands");
    }
    if (!show && layer && !going) close(false);
    if (!show && sheet) closePanel(false);
  };
  const timer = setInterval(sync, 200);

  const slot = (k) => {
    const a = Math.abs(k), sx = Math.sign(k);
    const x = a <= 2 ? k * step : sx * Math.min(2.42 * step, innerWidth / 2 - 6);
    return [x, a % 2 ? step * 0.45 : 0, SLOT_SCALE[Math.min(a, 3)]];
  };
  const place = (el, k, { s = null, delay = 0 } = {}) => {
    const [x, y, sc] = slot(k);
    el.style.transitionDelay = delay + "ms";
    el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${s ?? sc})`;
    el.dataset.slot = String(k);
  };
  const makeNode = (i) => {
    const L = list(), n = L[i], b = document.createElement("button");
    b.type = "button";
    b.className = "node";
    b.dataset.index = String(i);
    b.style.setProperty("--s", size + "px");
    const tag = document.createElement("span");
    tag.className = "name";
    if (i === 0) {
      b.classList.add("sel");
      b.dataset.level = "@islands";
      b.innerHTML = MARK;
      tag.textContent = "all islands";
      b.setAttribute("aria-label", "all islands");
    } else {
      const here = n === current(), ok = here || reached(n);
      b.dataset.level = n;
      if (here) b.classList.add("current");
      if (!ok) { b.classList.add("locked"); b.setAttribute("aria-disabled", "true"); }
      b.style.backgroundImage = `url("${thumb(n)}")`;
      const name = `${i}. ${label(n)}`;
      tag.textContent = name + (here ? " · here" : "");
      b.setAttribute("aria-label", name + (here ? " (here)" : ok ? "" : " (locked)"));
      if (ok && !here && preload) { const warm = () => preload(n); b.addEventListener("pointerenter", warm, { once: true }); b.addEventListener("focus", warm, { once: true }); }
    }
    b.appendChild(tag);
    return b;
  };

  const render = () => {
    const L = list(), mol = layer.querySelector(".mol");
    for (const [i, el] of nodes) {
      const k = i - center;
      if (Math.abs(k) <= 3) continue;
      if (!el.dataset.leaving) {
        el.dataset.leaving = "1";
        place(el, Math.sign(k) * 3, { s: 0 });
        el.tabIndex = -1;
        setTimeout(() => { if (el.dataset.leaving) { el.remove(); nodes.delete(i); } }, 650);
      }
    }
    for (let k = -3; k <= 3; k++) {
      const i = center + k;
      if (i < 0 || i >= L.length) continue;
      let el = nodes.get(i);
      if (!el) {
        el = makeNode(i);
        mol.appendChild(el);
        nodes.set(i, el);
        place(el, k, { s: 0 });
        el.getBoundingClientRect();
      }
      delete el.dataset.leaving;
      place(el, k);
      el.classList.toggle("mid", k === 0);
      el.tabIndex = Math.abs(k) <= 2 ? 0 : -1;
      el.setAttribute("aria-hidden", Math.abs(k) <= 2 ? "false" : "true");
    }
  };
  const setCenter = (c) => {
    const L = list();
    c = Math.max(0, Math.min(L.length - 1, c));
    if (c === center || !layer) return false;
    center = c;
    window.__navScrolls = (window.__navScrolls || 0) + 1;
    render();
    return true;
  };

  const drawBonds = () => {
    if (!layer) return;
    const svg = layer.querySelector("svg"), pts = [];
    for (const [i, el] of [...nodes].sort((a, b) => a[0] - b[0])) {
      const r = el.getBoundingClientRect();
      pts.push({ i, x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width / size });
    }
    let html = "";
    for (let j = 1; j < pts.length; j++) {
      const a = pts[j - 1], b = pts[j];
      if (b.i !== a.i + 1) continue;
      const w = Math.min(a.w, b.w) * 6;
      if (w < 0.4) continue;
      html += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke-width="${w.toFixed(2)}"/>`;
    }
    svg.innerHTML = html;
    raf = requestAnimationFrame(drawBonds);
  };

  const visibleNodes = () => [...nodes.values()].filter((el) => !el.dataset.leaving && Math.abs(+el.dataset.slot) <= 2).sort((a, b) => +a.dataset.slot - +b.dataset.slot);
  const focusMid = () => nodes.get(center)?.focus({ preventScroll: true });

  function activate(el) {
    const i = +el.dataset.index, n = list()[i];
    if (Math.abs(i - center) > 2) return;
    if (i === 0) return openPanel();
    if (n === current()) return close();
    if (!reached(n)) { el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); return; }
    jump(n);
  }

  function open() {
    if (layer || orb.hidden) return;
    const cur = current(), L = list();
    step = Math.max(60, Math.min(116, (innerWidth - 24) / 4.7));
    size = Math.round(Math.min(78, step * 0.78));
    center = Math.max(0, L.indexOf(cur));
    const lay = document.createElement("div");
    lay.className = "iw-nav";
    lay.setAttribute("role", "dialog");
    lay.setAttribute("aria-label", "island selector");
    lay.innerHTML = '<svg aria-hidden="true"></svg><div class="mol"></div>';
    const r = orb.getBoundingClientRect(), mol = lay.querySelector(".mol");
    mol.style.left = r.left + r.width / 2 + "px";
    mol.style.top = r.top + r.height / 2 + "px";
    layer = lay;
    nodes = new Map();
    document.body.appendChild(lay);
    for (let k = -3; k <= 3; k++) {
      const i = center + k;
      if (i < 0 || i >= L.length) continue;
      const el = makeNode(i);
      mol.appendChild(el);
      nodes.set(i, el);
      el.style.transition = "none";
      el.style.transform = `translate(0,0) scale(${k === 0 ? 0.95 : 0.3})`;
    }
    lay.getBoundingClientRect();
    for (const el of nodes.values()) el.style.transition = "";
    for (const [i, el] of nodes) { const k = i - center; place(el, k, { delay: Math.abs(k) * 55 }); el.classList.toggle("mid", k === 0); el.tabIndex = Math.abs(k) <= 2 ? 0 : -1; }
    setTimeout(() => { for (const el of nodes.values()) el.style.transitionDelay = ""; }, 400);
    lay.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      drag = { id: e.pointerId, x: e.clientX, c: center };
      dragged = false;
    });
    lay.addEventListener("pointermove", (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 8) dragged = true;
      if (dragged) setCenter(drag.c - Math.round(dx / (step * 0.85)));
    });
    const endDrag = (e) => { if (drag && e.pointerId === drag.id) drag = null; };
    lay.addEventListener("pointerup", endDrag);
    lay.addEventListener("pointercancel", endDrag);
    for (const ev of ["pointerup", "touchstart", "touchend"]) lay.addEventListener(ev, (e) => e.stopPropagation(), { passive: ev.startsWith("touch") });
    lay.addEventListener("click", (e) => {
      e.stopPropagation();
      if (dragged) { dragged = false; return; }
      const el = e.target.closest?.(".node");
      if (el) activate(el); else close();
    });
    lay.addEventListener("wheel", (e) => {
      e.preventDefault();
      e.stopPropagation();
      wheelAcc += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(wheelAcc) < 50) return;
      setCenter(center + Math.sign(wheelAcc));
      wheelAcc = 0;
    }, { passive: false });
    lay.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); setCenter(center - 1); focusMid(); return; }
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); setCenter(center + 1); focusMid(); return; }
      if (e.key === "Tab") {
        const vis = visibleNodes(), at = vis.indexOf(document.activeElement);
        e.preventDefault();
        vis[(at + (e.shiftKey ? -1 : 1) + vis.length) % vis.length]?.focus({ preventScroll: true });
      }
    });
    lay.addEventListener("keyup", (e) => e.stopPropagation());
    orb.classList.add("open");
    orb.setAttribute("aria-expanded", "true");
    requestAnimationFrame(() => lay.classList.add("open"));
    raf = requestAnimationFrame(drawBonds);
    focusMid();
  }

  function close(refocus = true) {
    if (!layer) return closing;
    if (closing) return closing;
    const lay = layer;
    lay.classList.remove("open");
    for (const [i, el] of nodes) { el.style.transitionDelay = (3 - Math.min(3, Math.abs(i - center))) * 40 + "ms"; el.style.transform = "translate(0,0) scale(0.3)"; }
    orb.classList.remove("open");
    orb.setAttribute("aria-expanded", "false");
    if (refocus && !orb.hidden) orb.focus({ preventScroll: true });
    closing = pause(420).then(() => { cancelAnimationFrame(raf); lay.remove(); if (layer === lay) { layer = null; nodes = new Map(); } closing = null; });
    return closing;
  }

  function openPanel() {
    if (sheet) return;
    close(false);
    sheet = document.createElement("div");
    sheet.className = "iw-sheet";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-label", "all islands");
    const panel = document.createElement("div");
    panel.className = "iw-panel";
    const frameEl = document.createElement("iframe");
    frameEl.title = "all islands";
    frameEl.src = startHref() + "?embed=1";
    const x = document.createElement("button");
    x.type = "button";
    x.className = "x";
    x.textContent = "×";
    x.setAttribute("aria-label", "close");
    panel.append(frameEl, x);
    sheet.appendChild(panel);
    for (const ev of ["pointerdown", "pointerup", "touchstart", "touchend", "wheel"]) sheet.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    sheet.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Escape") closePanel(); });
    sheet.addEventListener("click", (e) => { e.stopPropagation(); if (e.target === sheet || e.target === x) closePanel(); });
    document.body.appendChild(sheet);
    orb.classList.add("open");
    x.focus({ preventScroll: true });
  }
  function closePanel(refocus = true) {
    if (!sheet) return;
    sheet.remove();
    sheet = null;
    orb.classList.remove("open");
    if (refocus && !orb.hidden) orb.focus({ preventScroll: true });
  }
  const onMessage = (e) => { if (e.data?.iw === "close") closePanel(); };
  addEventListener("message", onMessage);

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
      if (!orb.hidden) orb.focus({ preventScroll: true });
    }
  }

  for (const ev of ["pointerdown", "pointerup"]) orb.addEventListener(ev, (e) => e.stopPropagation());
  orb.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") e.stopPropagation(); });
  orb.addEventListener("click", (e) => { e.preventDefault(); if (layer && !closing) close(); else open(); });
  const onKey = (e) => { if (e.key !== "Escape") return; if (sheet) closePanel(); else if (layer) close(); };
  addEventListener("keydown", onKey);
  return {
    button: orb,
    orb,
    open,
    close,
    sync,
    openPanel,
    closePanel,
    scroll: (d) => setCenter(center + d),
    setCenter,
    get center() { return center; },
    get isOpen() { return !!layer && !closing; },
    get panelOpen() { return !!sheet; },
    dispose() { clearInterval(timer); cancelAnimationFrame(raf); removeEventListener("keydown", onKey); removeEventListener("message", onMessage); layer?.remove(); sheet?.remove(); orb.remove(); },
  };
}

const framed = () => { try { return window.top !== window; } catch { return true; } };

export function mountUI({ container, rotate = null, zoom = null, nav = {} } = {}) {
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
  const button = (label, title, data, act) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.title = title;
    b.setAttribute("aria-label", title);
    Object.assign(b.dataset, data);
    b.addEventListener("pointerdown", (e) => e.stopPropagation());
    b.addEventListener("click", (e) => { e.preventDefault(); act(); });
    return b;
  };
  const zooms = zoom ? [[-1, "−", "zoom out (-)"], [1, "+", "zoom in (+)"]].map(([step, label, title]) => button(label, title, { zoom: String(step) }, () => zoom(step))) : [];
  const turns = rotate ? [[-1, "⟲", "rotate left (Q)"], [1, "⟳", "rotate right (E)"]].map(([step, label, title]) => button(label, title, { rotate: String(step) }, () => rotate(step))) : [];
  const navigator = nav && !container ? mountNavigator(nav) : null;
  box.append(...zooms, ...turns);
  (container || document.body).appendChild(box);
  return { element: box, turns, zooms, navigator };
}
