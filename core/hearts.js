const CSS = `
.iw-hearts{position:fixed;left:max(14px,env(safe-area-inset-left,0px));top:max(14px,env(safe-area-inset-top,0px));z-index:21;display:flex;gap:6px;align-items:center;padding:7px 10px;border-radius:999px;background:rgba(22,18,34,.62);pointer-events:none;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}
.iw-hearts svg{display:block;width:26px;height:24px;overflow:visible}
.iw-hearts .h path{fill:#e8445f;stroke:#2a1f33;stroke-width:2.4;stroke-linejoin:round;transition:fill .2s}
.iw-hearts .h .shine{fill:#ffd1da;stroke:none}
.iw-hearts .h.empty path{fill:#3b3346}
.iw-hearts .h.empty .shine{display:none}
.iw-hearts .h.lost{animation:iw-heart-lost .5s cubic-bezier(.3,1.5,.5,1)}
.iw-hearts .h.gain{animation:iw-heart-gain .45s cubic-bezier(.3,1.6,.5,1)}
.iw-hearts.ward{box-shadow:0 0 0 2px #5fe3ff,0 0 14px rgba(95,227,255,.6)}
.iw-hearts.shake{animation:iw-hearts-shake .35s linear}
.iw-hurt{position:fixed;inset:0;z-index:19;pointer-events:none;opacity:0;background:radial-gradient(ellipse at center,rgba(232,68,95,0) 45%,rgba(232,68,95,.55) 100%)}
.iw-hurt.on{animation:iw-hurt .55s ease-out}
.iw-touch .iw-hearts{left:auto;right:max(14px,env(safe-area-inset-right,0px));top:calc(max(12px,env(safe-area-inset-top,0px)) + 10px);gap:4px;padding:6px 8px}
.iw-touch .iw-hearts svg{width:22px;height:20px}
@keyframes iw-heart-lost{0%{transform:scale(1)}30%{transform:scale(1.45) rotate(-12deg)}100%{transform:scale(1)}}
@keyframes iw-heart-gain{0%{transform:scale(.4)}70%{transform:scale(1.2)}100%{transform:scale(1)}}
@keyframes iw-hearts-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
@keyframes iw-hurt{0%{opacity:1}100%{opacity:0}}
@media (prefers-reduced-motion:reduce){.iw-hearts .h,.iw-hearts,.iw-hurt.on{animation-duration:.01s}}
`;

const HEART = '<svg viewBox="0 0 26 24" aria-hidden="true"><path d="M13 22 C4 15 1 11 1 7 C1 3.5 3.7 1 7 1 C9.6 1 11.6 2.5 13 4.6 C14.4 2.5 16.4 1 19 1 C22.3 1 25 3.5 25 7 C25 11 22 15 13 22 Z"/><ellipse class="shine" cx="7.5" cy="6.5" rx="2.6" ry="1.8"/></svg>';

export function mountHearts(health) {
  if (!health || typeof document === "undefined") return null;
  if (!document.getElementById("iw-hearts-css")) {
    const st = document.createElement("style");
    st.id = "iw-hearts-css";
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  const box = document.createElement("div");
  box.className = "iw-hearts";
  box.setAttribute("role", "status");
  const hurt = document.createElement("div");
  hurt.className = "iw-hurt";
  const icons = [];
  for (let i = 0; i < health.max; i++) {
    const h = document.createElement("i");
    h.className = "h";
    h.innerHTML = HEART;
    icons.push(h);
    box.appendChild(h);
  }
  document.body.append(hurt, box);
  const replay = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  let shown = health.hearts;
  const draw = () => {
    const n = health.hearts;
    icons.forEach((h, i) => {
      const full = i < n;
      h.classList.toggle("empty", !full);
      if (!full && i < shown) replay(h, "lost");
      if (full && i >= shown) replay(h, "gain");
    });
    shown = n;
    box.dataset.hearts = String(n);
    box.setAttribute("aria-label", `${n} of ${health.max} hearts`);
    box.classList.toggle("ward", !!health.warded);
  };
  draw();
  const off = health.on((e) => {
    if (e.type === "hurt") { replay(hurt, "on"); replay(box, "shake"); }
    draw();
  });
  return { element: box, draw, dispose() { off(); box.remove(); hurt.remove(); } };
}
