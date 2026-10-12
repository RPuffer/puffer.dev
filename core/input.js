const KEYS = {
  KeyW: "up", ArrowUp: "up", KeyS: "down", ArrowDown: "down",
  KeyA: "left", ArrowLeft: "left", KeyD: "right", ArrowRight: "right",
};
const TURNS = { KeyQ: -1, KeyE: 1 };
const ZOOM_KEYS = { Equal: 1, NumpadAdd: 1, Minus: -1, NumpadSubtract: -1 };
export const SWIPE = 64, PINCH = 1.3;
export const HOLD = 0.28;
export const ROSE_TILT = Math.sin(35.264 * Math.PI / 180);
export const ROSE_DIRS = ["n", "e", "s", "w"];

export const HOME = new URL("../landing/index.html", import.meta.url).href;
export const BUST = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0z"/></svg>';

const BAND_CSS = `
.iw-band{--g:min(132px,19vh);--a:calc(var(--g) * .56);--m:max(16px,env(safe-area-inset-right,0px));position:fixed;left:0;right:0;bottom:0;height:max(25vh,150px);z-index:12;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;background:linear-gradient(to top,rgba(8,14,24,.52),rgba(8,14,24,.2) 72%,rgba(8,14,24,0));box-shadow:inset 0 2px 0 rgba(18,196,240,.22);transition:transform .4s cubic-bezier(.34,1.56,.64,1),opacity .25s}
@supports ((backdrop-filter:brightness(1)) or (-webkit-backdrop-filter:brightness(1))){.iw-band{-webkit-backdrop-filter:brightness(.62) saturate(1.7);backdrop-filter:brightness(.62) saturate(1.7);border-top:2px solid rgba(18,196,240,.35)}}
@supports not ((backdrop-filter:brightness(1)) or (-webkit-backdrop-filter:brightness(1))){.iw-band{background:rgba(10,16,30,.6);border-top:2px solid rgba(18,196,240,.35)}}
.iw-band.off{transform:translateY(110%);opacity:0;pointer-events:none}
.iw-band .hit{position:absolute;left:12%;right:30%;top:0;bottom:0}
.iw-stick{position:absolute;left:50%;top:52%;width:var(--g);height:var(--g);margin:calc(var(--g) / -2) 0 0 calc(var(--g) / -2);border-radius:50%;background:rgba(38,44,55,.72);box-shadow:0 7px 0 rgba(20,24,31,.75),inset 0 0 0 4px rgba(18,196,240,.35);pointer-events:none}
.iw-stick .gate{position:absolute;inset:18%;background:rgba(54,62,77,.85);clip-path:polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%)}
.iw-stick .gate::before{content:"";position:absolute;left:50%;top:50%;width:16%;height:16%;margin:-8% 0 0 -8%;border-radius:50%;background:#1a1f28}
.iw-knob{position:absolute;left:50%;top:50%;width:46%;height:46%;margin:-23% 0 0 -23%;border-radius:50%;background:linear-gradient(160deg,#5fe3ff 0 46%,#12c4f0 46%);box-shadow:0 7px 0 #0a7c9c,0 9px 10px rgba(0,0,0,.35);transform:translate(0,0);transition:transform .32s cubic-bezier(.34,1.8,.64,1)}
.iw-knob::after{content:"";position:absolute;left:22%;top:16%;width:30%;height:18%;border-radius:50%;background:rgba(255,255,255,.75);transform:rotate(-24deg)}
.iw-band.held .iw-knob{transition:transform .07s ease-out}
.iw-act{position:absolute;left:calc(100% - var(--m) - var(--a) / 2);top:67%;width:var(--a);height:var(--a);margin:calc(var(--a) / -2) 0 0 calc(var(--a) / -2);padding:0;border:0;border-radius:50%;background:linear-gradient(160deg,#ffd76a 0 46%,#f5c243 46%);box-shadow:0 0 0 5px rgba(38,44,55,.85),0 8px 0 5px rgba(20,24,31,.8);color:rgba(31,29,26,.55);font:800 calc(var(--a) * .3)/1 system-ui,sans-serif;touch-action:none;transition:transform .12s,box-shadow .12s;-webkit-tap-highlight-color:transparent}
.iw-act.on{transform:translateY(5px);box-shadow:0 0 0 5px rgba(38,44,55,.85),0 3px 0 5px rgba(20,24,31,.8)}
.iw-pow{--p:calc(var(--a) * .8);--c:0;position:absolute;left:calc(100% - var(--m) - var(--a) / 2);top:23%;width:var(--p);height:var(--p);margin:calc(var(--p) / -2) 0 0 calc(var(--p) / -2);padding:4px;border:0;border-radius:50%;background:conic-gradient(#ff4fa8 calc(var(--c) * 1turn),rgba(38,44,55,.9) 0);box-shadow:0 6px 0 rgba(20,24,31,.8);touch-action:none;transition:transform .12s,box-shadow .12s;-webkit-tap-highlight-color:transparent}
.iw-pow i{display:block;width:100%;height:100%;border-radius:50%;background:linear-gradient(160deg,#c59bff 0 46%,#9a7ae0 46%) center/62% no-repeat;transition:filter .2s}
.iw-pow i svg{display:block;width:62%;height:62%;margin:19%}
.iw-pow b{position:absolute;right:-4px;top:-4px;min-width:20px;height:20px;padding:0 4px;border-radius:10px;background:#262c37;color:#fff3e0;font:800 12px/20px system-ui,sans-serif;box-shadow:0 0 0 2px #ff4fa8}
.iw-pow b:empty{display:none}
.iw-pow.wait i{filter:grayscale(.75) brightness(.7)}
.iw-pow.up{box-shadow:0 6px 0 rgba(20,24,31,.8),0 0 14px 4px rgba(255,79,168,.55)}
.iw-pow.on{transform:translateY(4px);box-shadow:0 2px 0 rgba(20,24,31,.8)}
.iw-pow.no{animation:iw-no .3s}
@keyframes iw-no{25%{margin-left:calc(var(--p) / -2 - 5px)}75%{margin-left:calc(var(--p) / -2 + 5px)}}
html[data-iw-act="1"] .iw-act{animation:iw-glow 1.1s ease-in-out infinite alternate}
@keyframes iw-glow{from{box-shadow:0 0 0 5px #12c4f0,0 8px 0 5px rgba(20,24,31,.8),0 0 6px 6px rgba(18,196,240,.25)}to{box-shadow:0 0 0 5px #5fe3ff,0 8px 0 5px rgba(20,24,31,.8),0 0 18px 10px rgba(18,196,240,.45)}}
.iw-rose{--r:min(calc(var(--g) * 1.67),47vw);position:absolute;left:clamp(calc(var(--r) / 2 + 12px),calc(100% - var(--m) - var(--a) - 40px - var(--r) / 2),50%);top:50%;width:var(--r);height:calc(var(--r) * .636);margin:calc(var(--r) * -.318) 0 0 calc(var(--r) / -2);pointer-events:none}
.iw-rose svg{display:block;width:100%;height:100%;overflow:visible}
.iw-rose .hit-r{position:absolute;inset:-14% -8%;pointer-events:auto;touch-action:none}
.iw-rose .ring{transition:transform .62s cubic-bezier(.34,1.56,.64,1)}
.iw-rose .pet{fill:url(#iw-pg);stroke:#1a1230;stroke-width:5;stroke-linejoin:round;transition:fill .12s}
.iw-rose .side{fill:#0b0820;stroke:#0b0820;stroke-width:5;stroke-linejoin:round}
.iw-rose .lift{transition:transform .34s cubic-bezier(.34,1.9,.64,1)}
.iw-rose .chg{fill:none;stroke:#ffd76a;stroke-width:6;stroke-linecap:round;stroke-dasharray:100 100;stroke-dashoffset:100;opacity:0}
.iw-rose .on .lift{transform:translateY(5px);transition:transform .07s ease-out}
.iw-rose .on .pet{fill:#f5c243;filter:drop-shadow(0 0 6px rgba(255,215,106,.85))}
.iw-rose .on .chg{opacity:1;animation:iw-chg var(--hold) linear forwards}
.iw-rose .on.rep .chg{stroke:#fff6c8}
@keyframes iw-chg{to{stroke-dashoffset:0}}
@media (prefers-reduced-motion:reduce){.iw-rose .ring,.iw-rose .lift{transition-duration:.01s}}
@media (prefers-reduced-motion:reduce){.iw-knob,.iw-band{transition-duration:.01s}html[data-iw-act="1"] .iw-act{animation:none;box-shadow:0 0 0 5px #12c4f0,0 8px 0 5px rgba(20,24,31,.8)}}
`;

export function createInput(el, { touch = "auto", controls = "rose" } = {}) {
  const listeners = new Set();
  const emit = (intent) => { for (const f of listeners) f(intent); };
  const held = [];
  const setHeld = (press) => emit({ kind: "hold", dir: held.length ? held[held.length - 1] : null, ...(press ? { press } : {}) });
  const press = (d) => { if (!held.includes(d)) { held.push(d); setHeld(d); } };
  const release = (d) => { const i = held.indexOf(d); if (i >= 0) { held.splice(i, 1); setHeld(); } };

  const onKeyDown = (e) => {
    if (e.code === "KeyR" && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); if (!e.repeat) emit({ kind: "power" }); return; }
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
  const onBlur = () => { held.length = 0; setHeld(); stickId = petalId = null; stickTo(null); };
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

  const STICK_DEAD = 0.22, STICK_CROSS = 14 * Math.PI / 180;
  const useStick = controls === "stick";
  let band = null, knob = null, sector = null, stickId = null, busy = false;
  let petals = null, ringEl = null, petal = null, petalId = null;
  const stickTo = (s) => {
    if (!useStick) return petalTo(null);
    if (s === sector) return;
    sector = s;
    const v = s == null ? null : [Math.cos(s * Math.PI / 4), Math.sin(s * Math.PI / 4)];
    if (knob) knob.style.transform = v ? `translate(${(v[0] * 62).toFixed(1)}%,${(v[1] * 62).toFixed(1)}%)` : "";
    emit({ kind: "stick", vec: v });
  };
  const petalTo = (i) => {
    if (i === petal) return;
    petal = i;
    petals?.forEach((p, k) => { p.classList.toggle("on", k === i); p.classList.remove("rep"); });
    emit({ kind: "petal", i });
  };
  let ringYaw = null, ringAt = 0, ringV = 0, ringTo = 0, ringRaf = 0, ringLast = 0;
  const drawRing = () => ringEl?.setAttribute("transform", `rotate(${ringAt.toFixed(2)})`);
  const springRing = (now) => {
    const dt = Math.min(0.05, (now - ringLast) / 1000 || 0.016);
    ringLast = now;
    ringV += (170 * (ringTo - ringAt) - 15 * ringV) * dt;
    ringAt += ringV * dt;
    if (Math.abs(ringTo - ringAt) < 0.05 && Math.abs(ringV) < 0.5) { ringAt = ringTo; ringV = 0; ringRaf = 0; drawRing(); return; }
    drawRing();
    ringRaf = requestAnimationFrame(springRing);
  };
  const setYaw = (yaw) => {
    if (yaw == null || yaw === ringYaw) return;
    if (ringYaw == null) { ringTo = ringAt = yaw - 45; ringYaw = yaw; drawRing(); return; }
    ringTo += ((yaw - ringYaw + 540) % 360) - 180;
    ringYaw = yaw;
    if (!ringRaf) { ringLast = performance.now(); ringRaf = requestAnimationFrame(springRing); }
  };
  const roseMarkup = () => {
    const k = ROSE_TILT.toFixed(4), plane = (r) => `scale(1 ${k}) rotate(${r})`;
    const leaf = "M0 -96 Q32 -34 0 0 Q-32 -34 0 -96 Z";
    const glyphs = {
      n: '<circle r="6.5" fill="#ffd76a"/><path d="M0 -15V-10M0 10V15M-15 0H-10M10 0H15M-10.6 -10.6L-7 -7M7 7L10.6 10.6M-10.6 10.6L-7 7M7 -7L10.6 -10.6" stroke="#ffd76a" stroke-width="3.2" stroke-linecap="round"/>',
      e: '<path d="M4 -10.2A11 11 0 1 0 4 10.2A12 12 0 0 1 4 -10.2Z" fill="#5fe3ff"/>',
      s: '<path d="M0 -13L3.6 -3.6L13 0L3.6 3.6L0 13L-3.6 3.6L-13 0L-3.6 -3.6Z" fill="#ff4fa8"/>',
      w: '<path d="M-13 0Q0 -11 13 0Q0 11 -13 0Z" fill="#a6f04b"/><circle r="4.2" fill="#1a1230"/>',
    };
    const ring = ROSE_DIRS.map((d, j) => `<g class="iw-glyph" data-dir="${d}" transform="rotate(${j * 90}) translate(0 -117) scale(1.2)"><g stroke="#1a1230" stroke-width="2.5" stroke-linejoin="round" paint-order="stroke">${glyphs[d]}</g></g>`).join("");
    const pets = [0, 1, 2, 3].map((i) => `<g class="iw-petal" data-i="${i}"><path class="side" transform="translate(0 8) ${plane(45 + 90 * i)}" d="${leaf}"/><g class="lift"><path class="pet" transform="${plane(45 + 90 * i)}" d="${leaf}"/><path class="chg" pathLength="100" transform="${plane(45 + 90 * i)}" d="${leaf}"/></g></g>`).join("");
    return `<div class="iw-rose" style="--hold:${HOLD}s"><svg viewBox="-140 -84 280 178" aria-hidden="true"><defs><linearGradient id="iw-pg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff4fa8"/><stop offset=".5" stop-color="#7a4dff"/><stop offset="1" stop-color="#12c4f0"/></linearGradient><radialGradient id="iw-rg"><stop offset="0" stop-color="#2a1c5a"/><stop offset="1" stop-color="#120a30"/></radialGradient></defs><ellipse cx="0" cy="9" rx="137" ry="${(137 * ROSE_TILT).toFixed(1)}" fill="rgba(6,4,20,.7)"/><g transform="${plane(45)}"><circle r="134" fill="url(#iw-rg)" stroke="#1a1230" stroke-width="5"/><circle r="104" fill="none" stroke="#5fe3ff" stroke-width="2" stroke-dasharray="3 8" opacity=".8"/><circle r="62" fill="none" stroke="#ffd76a" stroke-width="2" opacity=".55"/><g class="ring">${ring}</g></g>${pets}<ellipse rx="13" ry="${(13 * ROSE_TILT).toFixed(1)}" fill="#1a1230"/><ellipse rx="6" ry="${(6 * ROSE_TILT).toFixed(1)}" fill="#fff"/></svg><div class="hit-r" role="group" aria-label="compass rose"></div></div>`;
  };
  const showBand = () => {
    if (band) return;
    document.documentElement.classList.add("iw-touch");
    const style = document.createElement("style");
    style.textContent = BAND_CSS;
    document.head.appendChild(style);
    band = document.createElement("div");
    band.className = "iw-band" + (busy ? " off" : "") + (useStick ? " stick" : " rose");
    const pad = useStick ? `<div class="iw-stick" aria-hidden="true"><div class="gate"></div><div class="iw-knob"></div></div><div class="hit" role="slider" aria-label="joystick"></div>` : roseMarkup();
    band.innerHTML = `${pad}<button type="button" class="iw-pow" aria-label="power"><i></i><b></b></button><button type="button" class="iw-act" aria-label="use">✦</button>`;
    const act = band.querySelector(".iw-act");
    if (useStick) {
      knob = band.querySelector(".iw-knob");
      const stick = band.querySelector(".iw-stick"), hit = band.querySelector(".hit");
      const aim = (e) => {
        const r = stick.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        const a = Math.atan2(dy, dx), k = Math.round((a - Math.PI / 4) / (Math.PI / 2));
        const off = Math.abs(a - (Math.PI / 4 + k * Math.PI / 2));
        stickTo(Math.hypot(dx, dy) < r.width * STICK_DEAD || off > Math.PI / 4 - STICK_CROSS ? null : (((2 * k + 1) % 8) + 8) % 8);
      };
      hit.addEventListener("pointerdown", (e) => { e.preventDefault(); stickId = e.pointerId; hit.setPointerCapture?.(e.pointerId); band.classList.add("held"); aim(e); });
      hit.addEventListener("pointermove", (e) => { if (e.pointerId === stickId) aim(e); });
      const letGo = (e) => { if (e.pointerId !== stickId) return; stickId = null; band.classList.remove("held"); stickTo(null); };
      hit.addEventListener("pointerup", letGo);
      hit.addEventListener("pointercancel", letGo);
    } else {
      const rose = band.querySelector(".iw-rose"), hit = rose.querySelector(".hit-r");
      petals = [...rose.querySelectorAll(".iw-petal")];
      ringEl = rose.querySelector(".ring");
      drawRing();
      const aim = (e) => {
        const r = rose.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = (e.clientY - (r.top + r.height / 2)) / ROSE_TILT;
        if (Math.hypot(dx, dy) < r.width * 0.07) return petalTo(petal);
        const a = Math.atan2(dy, dx) * 180 / Math.PI, i = Math.floor((((a + 90) % 360) + 360) % 360 / 90);
        if (petal != null && i !== petal) { const off = Math.abs(((a - (-45 + 90 * petal)) % 360 + 540) % 360 - 180); if (off < 55) return; }
        petalTo(i);
      };
      hit.addEventListener("pointerdown", (e) => { e.preventDefault(); if (petalId != null) return; petalId = e.pointerId; hit.setPointerCapture?.(e.pointerId); aim(e); });
      hit.addEventListener("pointermove", (e) => { if (e.pointerId === petalId) aim(e); });
      const letGo = (e) => { if (e.pointerId !== petalId) return; petalId = null; petalTo(null); };
      hit.addEventListener("pointerup", letGo);
      hit.addEventListener("pointercancel", letGo);
    }
    act.addEventListener("pointerdown", (e) => { e.preventDefault(); act.classList.add("on"); emit({ kind: "act" }); });
    const pow = band.querySelector(".iw-pow");
    pow.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); pow.classList.add("on"); emit({ kind: "power" }); });
    for (const ev of ["pointerup", "pointercancel", "pointerleave"]) pow.addEventListener(ev, () => pow.classList.remove("on"));
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
    controls: useStick ? "stick" : "rose",
    setYaw,
    repeating(on) { if (petal != null) petals?.[petal]?.classList.toggle("rep", !!on); },
    setBusy(b) {
      b = !!b;
      if (b === busy) return;
      busy = b;
      band?.classList.toggle("off", b);
      if (b) { stickId = petalId = null; band?.classList.remove("held"); stickTo(null); }
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
      cancelAnimationFrame(ringRaf);
      band?.remove();
    },
  };
}
