const KEYS = {
  KeyW: "up", ArrowUp: "up", KeyS: "down", ArrowDown: "down",
  KeyA: "left", ArrowLeft: "left", KeyD: "right", ArrowRight: "right",
};

const PAD_CSS = `
.iso-dpad{position:fixed;left:18px;bottom:18px;width:132px;height:132px;z-index:10;touch-action:none;user-select:none;-webkit-user-select:none}
.iso-dpad button{position:absolute;width:44px;height:44px;border:0;border-radius:12px;background:rgba(255,255,255,.18);color:#fff;font:18px/44px system-ui;padding:0;backdrop-filter:blur(4px)}
.iso-dpad button.on{background:rgba(255,255,255,.4)}
.iso-dpad [data-d=up]{left:44px;top:0}.iso-dpad [data-d=down]{left:44px;bottom:0}
.iso-dpad [data-d=left]{left:0;top:44px}.iso-dpad [data-d=right]{right:0;top:44px}
`;

export function createInput(el, { dpad = "auto" } = {}) {
  const listeners = new Set();
  const emit = (intent) => { for (const f of listeners) f(intent); };
  const held = [];
  const setHeld = () => emit({ kind: "hold", dir: held.length ? held[held.length - 1] : null });
  const press = (d) => { if (!held.includes(d)) { held.push(d); setHeld(); } };
  const release = (d) => { const i = held.indexOf(d); if (i >= 0) { held.splice(i, 1); setHeld(); } };

  const onKeyDown = (e) => {
    const d = KEYS[e.code];
    if (!d || e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    if (!e.repeat) press(d);
  };
  const onKeyUp = (e) => { const d = KEYS[e.code]; if (d) release(d); };
  const onBlur = () => { held.length = 0; setHeld(); };
  addEventListener("keydown", onKeyDown);
  addEventListener("keyup", onKeyUp);
  addEventListener("blur", onBlur);

  let down = null;
  const onPointerDown = (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; };
  const onPointerUp = (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 12) return;
    const r = el.getBoundingClientRect();
    emit({ kind: "tap", x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height });
  };
  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointerup", onPointerUp);

  let pad = null;
  const showPad = () => {
    if (pad) return;
    const style = document.createElement("style");
    style.textContent = PAD_CSS;
    document.head.appendChild(style);
    pad = document.createElement("div");
    pad.className = "iso-dpad";
    for (const [d, label] of [["up", "▲"], ["down", "▼"], ["left", "◀"], ["right", "▶"]]) {
      const b = document.createElement("button");
      b.dataset.d = d;
      b.textContent = label;
      b.setAttribute("aria-label", d);
      const on = (e) => { e.preventDefault(); e.stopPropagation(); b.classList.add("on"); press(d); };
      const off = (e) => { e.preventDefault(); b.classList.remove("on"); release(d); };
      b.addEventListener("pointerdown", on);
      b.addEventListener("pointerup", off);
      b.addEventListener("pointercancel", off);
      b.addEventListener("pointerleave", off);
      pad.appendChild(b);
    }
    document.body.appendChild(pad);
  };
  const coarse = matchMedia?.("(pointer: coarse)").matches || "ontouchstart" in window;
  if (dpad === true || (dpad === "auto" && coarse)) showPad();
  const onTouch = () => { if (dpad === "auto") showPad(); };
  addEventListener("touchstart", onTouch, { once: true, passive: true });

  return {
    on(f) { listeners.add(f); return () => listeners.delete(f); },
    showPad,
    dispose() {
      removeEventListener("keydown", onKeyDown);
      removeEventListener("keyup", onKeyUp);
      removeEventListener("blur", onBlur);
      removeEventListener("touchstart", onTouch);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointerup", onPointerUp);
      pad?.remove();
    },
  };
}
