const KEYS = {
  KeyW: "up", ArrowUp: "up", KeyS: "down", ArrowDown: "down",
  KeyA: "left", ArrowLeft: "left", KeyD: "right", ArrowRight: "right",
};
const TURNS = { KeyQ: -1, KeyE: 1 };
const ZOOM_KEYS = { Equal: 1, NumpadAdd: 1, Minus: -1, NumpadSubtract: -1 };
export const SWIPE = 64, PINCH = 1.3;

const BAND_CSS = `
.iw-band{--g:min(132px,19vh);position:fixed;left:0;right:0;bottom:0;height:max(25vh,150px);z-index:12;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;background:linear-gradient(to top,rgba(8,14,24,.52),rgba(8,14,24,.2) 72%,rgba(8,14,24,0));box-shadow:inset 0 2px 0 rgba(18,196,240,.22);transition:transform .4s cubic-bezier(.34,1.56,.64,1),opacity .25s}
.iw-band.off{transform:translateY(110%);opacity:0;pointer-events:none}
.iw-band .hit{position:absolute;left:12%;right:30%;top:0;bottom:0}
.iw-stick{position:absolute;left:50%;top:52%;width:var(--g);height:var(--g);margin:calc(var(--g) / -2) 0 0 calc(var(--g) / -2);border-radius:50%;background:rgba(38,44,55,.72);box-shadow:0 7px 0 rgba(20,24,31,.75),inset 0 0 0 4px rgba(18,196,240,.35);pointer-events:none}
.iw-stick .gate{position:absolute;inset:18%;background:rgba(54,62,77,.85);clip-path:polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%)}
.iw-stick .gate::before{content:"";position:absolute;left:50%;top:50%;width:16%;height:16%;margin:-8% 0 0 -8%;border-radius:50%;background:#1a1f28}
.iw-knob{position:absolute;left:50%;top:50%;width:46%;height:46%;margin:-23% 0 0 -23%;border-radius:50%;background:linear-gradient(160deg,#5fe3ff 0 46%,#12c4f0 46%);box-shadow:0 7px 0 #0a7c9c,0 9px 10px rgba(0,0,0,.35);transform:translate(0,0);transition:transform .32s cubic-bezier(.34,1.8,.64,1)}
.iw-knob::after{content:"";position:absolute;left:22%;top:16%;width:30%;height:18%;border-radius:50%;background:rgba(255,255,255,.75);transform:rotate(-24deg)}
.iw-band.held .iw-knob{transition:transform .07s ease-out}
.iw-act{--a:calc(var(--g) * .56);position:absolute;left:calc(75% + var(--g) / 4);top:52%;width:var(--a);height:var(--a);margin:calc(var(--a) / -2) 0 0 calc(var(--a) / -2);padding:0;border:0;border-radius:50%;background:linear-gradient(160deg,#ffd76a 0 46%,#f5c243 46%);box-shadow:0 0 0 5px rgba(38,44,55,.85),0 8px 0 5px rgba(20,24,31,.8);color:rgba(31,29,26,.55);font:800 calc(var(--a) * .3)/1 system-ui,sans-serif;touch-action:none;transition:transform .12s,box-shadow .12s;-webkit-tap-highlight-color:transparent}
.iw-act.on{transform:translateY(5px);box-shadow:0 0 0 5px rgba(38,44,55,.85),0 3px 0 5px rgba(20,24,31,.8)}
html[data-iw-act="1"] .iw-act{animation:iw-glow 1.1s ease-in-out infinite alternate}
@keyframes iw-glow{from{box-shadow:0 0 0 5px #12c4f0,0 8px 0 5px rgba(20,24,31,.8),0 0 6px 6px rgba(18,196,240,.25)}to{box-shadow:0 0 0 5px #5fe3ff,0 8px 0 5px rgba(20,24,31,.8),0 0 18px 10px rgba(18,196,240,.45)}}
@media (prefers-reduced-motion:reduce){.iw-knob,.iw-band{transition-duration:.01s}html[data-iw-act="1"] .iw-act{animation:none;box-shadow:0 0 0 5px #12c4f0,0 8px 0 5px rgba(20,24,31,.8)}}
`;

export function createInput(el, { touch = "auto" } = {}) {
  const listeners = new Set();
  const emit = (intent) => { for (const f of listeners) f(intent); };
  const held = [];
  const setHeld = (press) => emit({ kind: "hold", dir: held.length ? held[held.length - 1] : null, ...(press ? { press } : {}) });
  const press = (d) => { if (!held.includes(d)) { held.push(d); setHeld(d); } };
  const release = (d) => { const i = held.indexOf(d); if (i >= 0) { held.splice(i, 1); setHeld(); } };

  const onKeyDown = (e) => {
    const r = TURNS[e.code];
    if (r && !e.metaKey && !e.ctrlKey && !e.altKey) { if (!e.repeat) setTimeout(() => { if (!e.defaultPrevented) emit({ kind: "rotate", step: r }); }, 0); return; }
    const z = ZOOM_KEYS[e.code];
    if (z && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); if (!e.repeat) emit({ kind: "zoom", step: z }); return; }
    const d = KEYS[e.code];
    if (!d || e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    if (!e.repeat) press(d);
  };
  const onKeyUp = (e) => { const d = KEYS[e.code]; if (d) release(d); };
  const onBlur = () => { held.length = 0; setHeld(); stickTo(null); };
  addEventListener("keydown", onKeyDown);
  addEventListener("keyup", onKeyUp);
  addEventListener("blur", onBlur);
  addEventListener("pagehide", onBlur);

  const pts = new Map();
  let down = null, pinch = null;
  const two = () => { const [a, b] = [...pts.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; };
  const onPointerDown = (e) => {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) down = { x: e.clientX, y: e.clientY, t: performance.now(), touch: e.pointerType !== "mouse", multi: false, turned: false };
    else if (pts.size === 2) { if (down) down.multi = true; pinch = { ...two(), turned: false }; }
  };
  const onPointerMove = (e) => {
    const p = pts.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX; p.y = e.clientY;
    if (pts.size === 2 && pinch) {
      const g = two(), r = g.d / pinch.d;
      if (r > PINCH || r < 1 / PINCH) { emit({ kind: "zoom", step: r > 1 ? 1 : -1 }); pinch.d = g.d; }
      const dx = g.cx - pinch.cx;
      if (!pinch.turned && Math.abs(dx) > SWIPE && Math.abs(dx) > 1.5 * Math.abs(g.cy - pinch.cy) && Math.abs(r - 1) < 0.2) { pinch.turned = true; emit({ kind: "rotate", step: dx > 0 ? -1 : 1, swipe: true }); }
      return;
    }
    if (pts.size === 1 && down && down.touch && !down.multi && !down.turned) {
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (Math.abs(dx) > SWIPE && Math.abs(dx) > 1.5 * Math.abs(dy)) { down.turned = true; emit({ kind: "rotate", step: dx > 0 ? -1 : 1, swipe: true }); }
    }
  };
  const onPointerUp = (e) => {
    const had = pts.delete(e.pointerId);
    if (!pts.size) pinch = null;
    if (!had || !down) return;
    const d = down;
    if (!pts.size) down = null;
    if (d.multi || d.turned || pts.size) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 12) return;
    const r = el.getBoundingClientRect();
    emit({ kind: "tap", x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height });
  };
  const onPointerCancel = (e) => { pts.delete(e.pointerId); if (!pts.size) { pinch = null; down = null; } };
  let wheelAcc = 0, wheelAt = 0;
  const onWheel = (e) => {
    e.preventDefault();
    const now = performance.now();
    if (now - wheelAt > 400) wheelAcc = 0;
    wheelAt = now;
    wheelAcc += (e.deltaMode === 1 ? 40 : 1) * e.deltaY * (e.ctrlKey ? 6 : 1);
    if (Math.abs(wheelAcc) < 90) return;
    emit({ kind: "zoom", step: wheelAcc < 0 ? 1 : -1 });
    wheelAcc = 0;
  };
  el.addEventListener("wheel", onWheel, { passive: false });
  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointermove", onPointerMove);
  el.addEventListener("pointerup", onPointerUp);
  el.addEventListener("pointercancel", onPointerCancel);

  let band = null, knob = null, sector = null, stickId = null, busy = false;
  const stickTo = (s) => {
    if (s === sector) return;
    sector = s;
    const v = s == null ? null : [Math.cos(s * Math.PI / 4), Math.sin(s * Math.PI / 4)];
    if (knob) knob.style.transform = v ? `translate(${(v[0] * 62).toFixed(1)}%,${(v[1] * 62).toFixed(1)}%)` : "";
    emit({ kind: "stick", vec: v });
  };
  const showBand = () => {
    if (band) return;
    document.documentElement.classList.add("iw-touch");
    const style = document.createElement("style");
    style.textContent = BAND_CSS;
    document.head.appendChild(style);
    band = document.createElement("div");
    band.className = "iw-band" + (busy ? " off" : "");
    band.innerHTML = `<div class="iw-stick" aria-hidden="true"><div class="gate"></div><div class="iw-knob"></div></div><div class="hit" role="slider" aria-label="joystick"></div><button type="button" class="iw-act" aria-label="use">✦</button>`;
    knob = band.querySelector(".iw-knob");
    const stick = band.querySelector(".iw-stick"), hit = band.querySelector(".hit"), act = band.querySelector(".iw-act");
    const aim = (e) => {
      const r = stick.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      stickTo(Math.hypot(dx, dy) < r.width * 0.14 ? null : (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8);
    };
    hit.addEventListener("pointerdown", (e) => { e.preventDefault(); stickId = e.pointerId; hit.setPointerCapture?.(e.pointerId); band.classList.add("held"); aim(e); });
    hit.addEventListener("pointermove", (e) => { if (e.pointerId === stickId) aim(e); });
    const letGo = (e) => { if (e.pointerId !== stickId) return; stickId = null; band.classList.remove("held"); stickTo(null); };
    hit.addEventListener("pointerup", letGo);
    hit.addEventListener("pointercancel", letGo);
    act.addEventListener("pointerdown", (e) => { e.preventDefault(); act.classList.add("on"); emit({ kind: "act" }); });
    for (const ev of ["pointerup", "pointercancel", "pointerleave"]) act.addEventListener(ev, () => act.classList.remove("on"));
    band.addEventListener("contextmenu", (e) => e.preventDefault());
    document.body.appendChild(band);
  };
  const coarse = matchMedia?.("(pointer: coarse)").matches || "ontouchstart" in window;
  if (touch === true || (touch === "auto" && coarse)) showBand();
  const onTouch = () => { if (touch === "auto") showBand(); };
  addEventListener("touchstart", onTouch, { once: true, passive: true });

  return {
    on(f) { listeners.add(f); return () => listeners.delete(f); },
    showBand,
    get band() { return band; },
    setBusy(b) {
      b = !!b;
      if (b === busy) return;
      busy = b;
      band?.classList.toggle("off", b);
      if (b) { stickId = null; band?.classList.remove("held"); stickTo(null); }
    },
    dispose() {
      removeEventListener("keydown", onKeyDown);
      removeEventListener("keyup", onKeyUp);
      removeEventListener("blur", onBlur);
      removeEventListener("pagehide", onBlur);
      removeEventListener("touchstart", onTouch);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerCancel);
      band?.remove();
    },
  };
}
