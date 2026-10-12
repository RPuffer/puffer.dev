export const GLYPHS = {
  "ink-step": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5C9 7 6 10.4 6 14a6 6 0 0 0 12 0c0-3.6-3-7-6-11.5Z" fill="#2a1f33"/><path d="M9.2 14.2a3 3 0 0 0 2.6 3.2" stroke="#fffaf0" stroke-width="1.6" stroke-linecap="round" fill="none"/></svg>',
  ward: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 4.5 5.4v5.8c0 4.6 3.2 8.6 7.5 10.3 4.3-1.7 7.5-5.7 7.5-10.3V5.4Z" fill="#2a1f33"/><path d="M12 6.2v11.6M7.6 10.4h8.8" stroke="#ffd76a" stroke-width="1.8" stroke-linecap="round"/></svg>',
  "waypoint-run": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5a6.5 6.5 0 0 0-6.5 6.5c0 4.8 6.5 12.5 6.5 12.5S18.5 13.8 18.5 9A6.5 6.5 0 0 0 12 2.5Z" fill="#2a1f33"/><circle cx="12" cy="9" r="2.4" fill="#a6f04b"/></svg>',
  unjam: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.6 3.2a5 5 0 0 0-5.3 6.9l-7 7a1.9 1.9 0 0 0 2.7 2.7l7-7a5 5 0 0 0 6.9-5.3l-3 3-2.9-.6-.6-2.9Z" fill="#2a1f33"/></svg>',
};

const CSS = `
.iw-power{position:fixed;left:max(16px,env(safe-area-inset-left,0px));bottom:max(16px,env(safe-area-inset-bottom,0px));z-index:20;display:flex;gap:11px;align-items:center;padding:7px 16px 7px 7px;border-radius:999px;background:rgba(20,24,31,.62);color:#fff3e0;font:800 14px/1.15 ui-rounded,"SF Pro Rounded",system-ui,sans-serif;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);pointer-events:none}
.iw-touch .iw-power{display:none}
.iw-power .ring{--c:0;flex:none;width:50px;height:50px;padding:4px;box-sizing:border-box;border-radius:50%;background:conic-gradient(#ff4fa8 calc(var(--c) * 1turn),rgba(54,62,77,.95) 0)}
.iw-power .face{width:100%;height:100%;border-radius:50%;background:linear-gradient(160deg,#c59bff 0 46%,#9a7ae0 46%);transition:filter .2s}
.iw-power .face svg{display:block;width:62%;height:62%;margin:19%}
.iw-power.wait .face{filter:grayscale(.75) brightness(.7)}
.iw-power.up .ring{box-shadow:0 0 14px 3px rgba(255,79,168,.55)}
.iw-power .name{display:block;font-size:15px}
.iw-power .sub{display:flex;gap:6px;align-items:center;margin-top:3px;color:#d8cfe8;font-weight:700;font-size:12px}
.iw-power kbd{display:inline-block;min-width:16px;padding:1px 5px;border-radius:6px;background:linear-gradient(160deg,#ffd76a 0 48%,#f5c243 48%);color:#2a1f33;font:900 11px/15px ui-rounded,system-ui,sans-serif;text-align:center;box-shadow:0 2px 0 #9a6b18}
.iw-power.no{animation:iw-pno .3s}
@keyframes iw-pno{25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
`;

const framed = () => { try { return window.top !== window; } catch { return true; } };

export function statusOf(powers) {
  const p = powers.power;
  if (p.passive) return { text: "tap a cell", charge: 1, wait: false, up: false, badge: "" };
  if (powers.raised) return { text: "raised", charge: 1, wait: false, up: true, badge: "" };
  if (powers.ready) return { text: "ready", charge: 1, wait: false, up: false, badge: "" };
  const n = powers.left;
  return { text: `${n} step${n === 1 ? "" : "s"}`, charge: powers.charge, wait: true, up: false, badge: String(n) };
}

export function mountPowerHud(game, { params = game.state.params } = {}) {
  const powers = game.powers;
  const show = !(framed() || params.ui === "0" || params.hero === "0");
  let chip = null, ring = null, face = null, name = null, sub = null;
  if (show) {
    if (!document.getElementById("iw-power-css")) {
      const st = document.createElement("style");
      st.id = "iw-power-css";
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    chip = document.createElement("div");
    chip.className = "iw-power";
    chip.setAttribute("role", "status");
    chip.innerHTML = '<div class="ring"><div class="face"></div></div><div><span class="name"></span><span class="sub"><kbd>R</kbd><span class="st"></span></span></div>';
    ring = chip.querySelector(".ring"); face = chip.querySelector(".face"); name = chip.querySelector(".name"); sub = chip.querySelector(".st");
    document.body.appendChild(chip);
  }
  let shown = "", glyph = "", btnKey = "", btnGlyph = "";
  const nudge = (el) => { if (!el) return; el.classList.remove("no"); void el.offsetWidth; el.classList.add("no"); };
  const off = powers.on((e) => {
    if (e.type === "wait" || e.type === "fail") { nudge(chip); nudge(game.input.band?.querySelector(".iw-pow")); }
  });
  const draw = () => {
    if (!game.state.actor) return;
    const p = powers.power, s = statusOf(powers);
    const k = [p.id, s.text, s.charge.toFixed(2), s.up].join("|");
    if (chip && k !== shown) {
      shown = k;
      if (glyph !== p.id) { glyph = p.id; face.innerHTML = GLYPHS[p.id] || ""; }
      name.textContent = p.name;
      sub.textContent = s.text;
      ring.style.setProperty("--c", s.charge.toFixed(3));
      chip.classList.toggle("wait", s.wait);
      chip.classList.toggle("up", s.up);
      chip.dataset.power = p.id;
      chip.querySelector("kbd").hidden = !!p.passive;
    }
    const btn = game.input.band?.querySelector(".iw-pow");
    if (btn && k !== btnKey) {
      btnKey = k;
      const i = btn.querySelector("i");
      if (btnGlyph !== p.id || !i.firstChild) { btnGlyph = p.id; i.innerHTML = GLYPHS[p.id] || ""; }
      btn.style.setProperty("--c", s.charge.toFixed(3));
      btn.querySelector("b").textContent = s.badge;
      btn.classList.toggle("wait", s.wait);
      btn.classList.toggle("up", s.up);
      btn.dataset.power = p.id;
      btn.setAttribute("aria-label", `${p.name}: ${s.text}`);
    }
  };
  const untick = game.onTick(draw);
  draw();
  return { element: chip, draw, dispose() { untick(); off(); chip?.remove(); } };
}
