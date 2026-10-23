const CSS = `
.iw-card{position:fixed;left:50%;top:30%;z-index:24;width:min(340px,calc(100vw - 32px));box-sizing:border-box;padding:16px 20px 18px;border-radius:20px;background:linear-gradient(160deg,#2a1c5a,#120a30);box-shadow:0 0 0 3px #ff4fa8,0 0 0 6px #1a1230,0 10px 0 6px rgba(10,6,24,.6),0 0 40px rgba(255,79,168,.45);color:#f0ede6;font:600 15px/1.35 ui-rounded,"SF Pro Rounded",system-ui,sans-serif;text-align:center;pointer-events:none;transform:translate(-50%,-50%) scale(.6);opacity:0;transition:transform .45s cubic-bezier(.34,1.7,.5,1),opacity .2s}
.iw-card.in{transform:translate(-50%,-50%) scale(1);opacity:1}
.iw-card.out{transition:transform .5s cubic-bezier(.6,0,.4,1),opacity .5s ease-in;opacity:0}
.iw-card .k{display:block;color:#ff4fa8;font:900 11px/1 ui-rounded,system-ui,sans-serif;letter-spacing:.22em;text-transform:uppercase}
.iw-card .t{display:block;margin:8px 0 6px;color:#ffd76a;font:900 26px/1.05 ui-rounded,"SF Pro Rounded",system-ui,sans-serif;text-shadow:0 3px 0 #1a1230}
.iw-card .d{display:block;color:#d8cfe8}
.iw-status{position:fixed;z-index:21;display:flex;flex-direction:column;gap:6px;max-width:min(280px,calc(100vw - 28px));font:700 13px/1.3 ui-rounded,"SF Pro Rounded",system-ui,sans-serif;color:#f0ede6;-webkit-user-select:none;user-select:none}
.iw-status[hidden]{display:none}
.iw-status.r{align-items:flex-end}
.iw-status.l{align-items:flex-start}
.iw-status .pill{display:flex;align-items:center;gap:6px;height:34px;padding:0 12px 0 6px;border:0;border-radius:999px;background:rgba(22,18,34,.78);box-shadow:0 0 0 2px #ff4fa8;color:inherit;font:inherit;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}
.iw-status .pill .ic{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#ff4fa8;color:#1a1230;font:900 15px/1 ui-rounded,system-ui,sans-serif}
.iw-status .pill .n{max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.iw-status .pill .c{color:#ff9fd0}
.iw-status .pill .chev{display:inline-block;color:#ff9fd0;transition:transform .2s}
.iw-status.open .pill .chev{transform:rotate(180deg)}
.iw-status.pop .pill{animation:iw-status-pop .6s cubic-bezier(.3,1.7,.5,1)}
.iw-status .list{display:none;flex-direction:column;gap:8px;padding:10px 12px;border-radius:14px;background:rgba(22,18,34,.88);box-shadow:0 0 0 2px rgba(255,79,168,.55);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.iw-status.open .list{display:flex}
.iw-status .item b{display:block;color:#ffd76a;font-weight:900}
.iw-status .item span{display:block;color:#d8cfe8;font-weight:600}
@keyframes iw-status-pop{0%{transform:scale(.5)}60%{transform:scale(1.15)}100%{transform:scale(1)}}
@media (prefers-reduced-motion:reduce){.iw-card,.iw-card.out{transition-duration:.01s}.iw-status.pop .pill{animation-duration:.01s}}
`;

export function mountStatus({ anchor = () => document.querySelector(".iw-hearts"), busy = () => false, hold = 3.2 } = {}) {
  if (!document.getElementById("iw-status-css")) {
    const st = document.createElement("style");
    st.id = "iw-status-css";
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  const items = new Map();
  const queue = [];
  let card = null, waitRaf = 0;
  const box = document.createElement("div");
  box.className = "iw-status r";
  box.hidden = true;
  box.innerHTML = `<button type="button" class="pill" aria-expanded="false"><span class="ic">!</span><span class="n"></span><span class="c"></span><span class="chev">▾</span></button><div class="list" role="list"></div>`;
  const pill = box.querySelector(".pill"), list = box.querySelector(".list");
  document.body.appendChild(box);

  const place = () => {
    const a = anchor()?.getBoundingClientRect();
    const right = !a || a.left + a.width / 2 > innerWidth / 2;
    box.classList.toggle("r", right);
    box.classList.toggle("l", !right);
    box.style.top = `${Math.round(a ? a.bottom + 8 : 70)}px`;
    box.style.right = right ? `${Math.round(a ? innerWidth - a.right : 14)}px` : "";
    box.style.left = right ? "" : `${Math.round(a ? a.left : 14)}px`;
  };
  const setOpen = (on) => { box.classList.toggle("open", on); pill.setAttribute("aria-expanded", String(on)); };
  const render = () => {
    const docked = [...items.values()].filter((it) => it.docked);
    box.hidden = !docked.length;
    if (!docked.length) { setOpen(false); return; }
    place();
    box.querySelector(".n").textContent = docked[0].title;
    box.querySelector(".c").textContent = docked.length > 1 ? `+${docked.length - 1}` : "";
    pill.setAttribute("aria-label", `${docked.length} active: ${docked.map((it) => it.title).join(", ")}`);
    list.innerHTML = "";
    for (const it of docked) {
      const row = document.createElement("div");
      row.className = "item";
      row.setAttribute("role", "listitem");
      const b = document.createElement("b"), s = document.createElement("span");
      b.textContent = it.title;
      s.textContent = it.text || "";
      row.append(b, s);
      list.appendChild(row);
    }
  };
  const pop = () => { box.classList.remove("pop"); void box.offsetWidth; box.classList.add("pop"); };
  const dock = (it) => {
    if (!items.has(it.id)) return;
    it.docked = true;
    render();
    pop();
  };
  const showCard = (it) => {
    card = document.createElement("div");
    card.className = "iw-card";
    card.setAttribute("role", "status");
    const k = document.createElement("span"), t = document.createElement("span"), d = document.createElement("span");
    k.className = "k"; t.className = "t"; d.className = "d";
    k.textContent = it.kind || "Island debuff";
    t.textContent = it.title;
    d.textContent = it.text || "";
    card.append(k, t, d);
    document.body.appendChild(card);
    requestAnimationFrame(() => card?.classList.add("in"));
    const el = card;
    setTimeout(() => {
      place();
      const r = box.getBoundingClientRect(), c = el.getBoundingClientRect();
      const x = (box.classList.contains("r") ? innerWidth - parseFloat(box.style.right || 0) - 60 : parseFloat(box.style.left || 0) + 60) - (c.left + c.width / 2);
      const y = (box.hidden ? parseFloat(box.style.top) + 17 : r.top + 17) - (c.top + c.height / 2);
      el.classList.add("out");
      el.style.transform = `translate(calc(-50% + ${x}px),calc(-50% + ${y}px)) scale(.15)`;
      setTimeout(() => { el.remove(); if (card === el) card = null; dock(it); next(); }, 480);
    }, hold * 1000);
  };
  const next = () => {
    if (card || waitRaf) return;
    const it = queue.shift();
    if (!it) return;
    if (!items.has(it.id)) { next(); return; }
    let calm = 0, last = performance.now();
    const wait = (now) => {
      calm = busy() ? 0 : calm + (now - last);
      last = now;
      if (calm < 600) { waitRaf = requestAnimationFrame(wait); return; }
      waitRaf = 0;
      showCard(it);
    };
    waitRaf = requestAnimationFrame(wait);
  };

  pill.addEventListener("click", (e) => { e.stopPropagation(); setOpen(!box.classList.contains("open")); });
  document.addEventListener("pointerdown", (e) => { if (!box.contains(e.target)) setOpen(false); }, true);
  addEventListener("resize", () => { if (!box.hidden) place(); });

  return {
    el: box,
    announce(id, { title, text = "", kind } = {}) {
      if (items.has(id)) return;
      const it = { id, title, text, kind, docked: false };
      items.set(id, it);
      queue.push(it);
      next();
    },
    set(id, { title, text = "" } = {}) {
      items.set(id, { id, title, text, docked: true });
      render();
    },
    remove(id) { items.delete(id); render(); },
    clear() {
      items.clear();
      queue.length = 0;
      cancelAnimationFrame(waitRaf);
      waitRaf = 0;
      card?.remove();
      card = null;
      render();
    },
    items: () => [...items.values()].map(({ id, title, text, docked }) => ({ id, title, text, docked })),
  };
}
