const css = `
body.t-deck{--sky1:#bfe6f2;--sky2:#fbe3cf}
.dk{max-width:1180px;margin:0 auto;padding:max(16px,env(safe-area-inset-top,0px)) 18px 110px;display:grid;grid-template-columns:1fr 15rem;grid-template-areas:"top top" "pick list" "hand hand";gap:14px 24px}
.dk-top{grid-area:top;display:flex;align-items:center;gap:14px}
.dk-top img{width:64px;height:64px;border-radius:50%;object-fit:cover;object-position:50% 20%;border:3px solid var(--ink);box-shadow:0 0 0 4px var(--paper)}
.dk-top h1{margin:0;font-size:clamp(20px,3vw,28px);font-weight:800}
.dk-top p{margin:0;font-size:13px;opacity:.75}
.dk-pick{grid-area:pick;display:grid;grid-template-columns:minmax(0,10.5rem) 1fr;gap:20px;align-items:center;background:#fffaf0d9;border:3px solid var(--ink);border-radius:20px;padding:16px;box-shadow:inset 0 -6px 0 #eadbc6}
.dk-pick h2{margin:0;font-size:24px;font-weight:800}
.dk-pick .dk-line{margin:0 0 10px;font-size:14px;opacity:.7}
.dk-pick ol{margin:0;padding:0;list-style:none;display:grid;gap:8px}
.dk-pick li{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:14px;line-height:1.4}
.dk-pick li b{grid-column:2;font-size:15px}.dk-pick li span{grid-column:2}
.dk-pick li::before{content:"";grid-row:1/3;width:12px;height:12px;margin-top:4px;border-radius:4px;transform:rotate(45deg);background:var(--h)}
.dk-card{position:relative;width:100%;aspect-ratio:5/7;border-radius:16px;border:3px solid var(--ink);background:var(--paper);box-shadow:inset 0 -6px 0 #e7dccb,0 8px 0 -2px #2a1f3333;overflow:hidden;display:flex;flex-direction:column}
.dk-card .art{flex:1;min-height:0;margin:8px 8px 0;border-radius:10px;border:2px solid var(--ink);overflow:hidden;background:#fff6ea}
.dk-card .art img{width:100%;height:100%;object-fit:cover;transform:scale(1.3)}
.dk-card .nm{margin:8px 8px 10px;padding:6px 8px;border-radius:9px;background:var(--h);color:var(--ink);font-weight:800;font-size:15px;text-align:center;box-shadow:inset 0 -4px 0 #0002}
.dk-card .gem{position:absolute;z-index:1;top:2px;left:2px;width:26px;height:26px;border-radius:50%;background:var(--h);border:3px solid var(--ink);display:grid;place-items:center;font-weight:800;font-size:12px}
.dk-list{grid-area:list;background:#2a1f33;color:var(--paper);border-radius:16px;padding:12px;box-shadow:inset 0 -5px 0 #0006;align-self:start}
.dk-list h3{margin:0 0 8px;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:var(--beam)}
.dk-list ol{margin:0;padding:0;list-style:none;counter-reset:d;display:grid;gap:4px}
.dk-list li{counter-increment:d;display:flex;gap:8px;font-size:13px;padding:5px 8px;border-radius:8px;background:#ffffff12}
.dk-list li::before{content:counter(d);color:var(--sun);font-weight:800;min-width:1.2em}
.dk-hand{grid-area:hand;display:flex;justify-content:center;padding:30px 0 4px}
.dk-hand button{all:unset;cursor:pointer;width:clamp(96px,13vw,150px);margin:0 -10px;transform:rotate(var(--r)) translateY(var(--y));transform-origin:50% 120%;transition:transform .2s}
.dk-hand button:hover,.dk-hand button:focus-visible,.dk-hand button[aria-pressed=true]{transform:rotate(0) translateY(-22px) scale(1.06);z-index:2}
.dk-hand button:focus-visible .dk-card{outline:3px solid var(--beam);outline-offset:3px}
.dk-hand button[aria-pressed=true] .dk-card{box-shadow:inset 0 -6px 0 #e7dccb,0 0 0 4px var(--beam)}
.dk-hand button .dk-card{animation:dk-bob 3.6s ease-in-out infinite;animation-delay:var(--d)}
.dk-hand .nm{font-size:12px;padding:4px}
@keyframes dk-bob{50%{transform:translateY(-4px) rotate(.6deg)}}
.dk-go{position:fixed;right:max(14px,env(safe-area-inset-right,0px));bottom:max(14px,env(safe-area-inset-bottom,0px));z-index:5;display:flex;gap:10px}
.dk-go a{padding:12px 24px;border-radius:14px;border:3px solid var(--ink);background:var(--sun);color:var(--ink);box-shadow:inset 0 -5px 0 #dd9200;text-decoration:none;font-weight:800;text-align:center}
.dk-go a.alt{background:var(--paper);box-shadow:inset 0 -5px 0 #e7dccb}
.dk-go a:hover,.dk-go a:focus-visible{outline:3px solid var(--beam);outline-offset:3px}
.dk-go small{display:block;font-size:11px;font-weight:600}
@media (max-width:820px){.dk{grid-template-columns:1fr;grid-template-areas:"top" "hand" "pick" "list";padding-bottom:120px}.dk-pick{grid-template-columns:1fr}#dk-big{display:none}.dk-hand{justify-content:flex-start;overflow-x:auto;padding:26px 16px 8px;margin:0 -18px;scroll-snap-type:x mandatory}.dk-hand button{flex:none;width:104px;margin:0 4px;scroll-snap-align:center;--r:0deg!important;--y:0px!important}.dk-go{left:0;right:0;bottom:0;padding:10px 12px max(12px,env(safe-area-inset-bottom,0px)) 120px;background:#fffaf0f2;border-top:3px solid var(--ink)}.dk-go a{flex:1;padding:11px 8px}}
`;
const card = (k, c, i) => `<div class="dk-card" style="--h:${c.hue}"><span class="gem">${i + 1}</span><div class="art"><img src="${k.thumb(c.thumb)}" alt=""></div><div class="nm">${c.name}</div></div>`;
function mount(root, k) {
  const n = k.CLUSTERS.length, mid = (n - 1) / 2;
  root.innerHTML = `<div class="dk">
<header class="dk-top"><img src="${k.bust}" alt=""><div><h1>Draft a build</h1><p>${k.PERSON.name} &middot; ${k.PERSON.cls} &middot; ${k.PERSON.level} years in production</p></div></header>
<section class="dk-pick" aria-live="polite"><div id="dk-big"></div><div><h2 id="dk-name"></h2><p class="dk-line" id="dk-line"></p><ol id="dk-sk"></ol></div></section>
<aside class="dk-list"><h3>Deck</h3><ol>${k.TOP.map((t) => `<li>${t}</li>`).join("")}</ol></aside>
<div class="dk-hand" role="group" aria-label="Hand">${k.CLUSTERS.map((c, i) => `<button type="button" data-i="${i}" aria-pressed="false" aria-label="${c.name}" style="--r:${(i - mid) * 5}deg;--y:${Math.abs(i - mid) * 7}px;--d:${-i * 0.6}s">${card(k, c, i)}</button>`).join("")}</div>
<div class="dk-go"><a id="dk-cont" class="alt" href="#" hidden>Resume run<small id="dk-where"></small></a><a id="dk-begin" href="#">Play<small>new run</small></a></div></div>`;
  const hand = [...root.querySelectorAll(".dk-hand button")];
  let at = 0;
  const choose = (i, focus) => {
    at = (i + n) % n; const c = k.CLUSTERS[at];
    hand.forEach((b, j) => b.setAttribute("aria-pressed", j === at));
    root.querySelector("#dk-big").outerHTML = `<div id="dk-big">${card(k, c, at)}</div>`;
    root.querySelector("#dk-name").textContent = c.name;
    root.querySelector("#dk-line").textContent = c.line;
    const ol = root.querySelector("#dk-sk"); ol.style.setProperty("--h", c.hue);
    ol.innerHTML = c.skills.map(([s, p]) => `<li><b>${s}</b><span>${p}</span></li>`).join("");
    if (focus) { hand[at].focus(); hand[at].scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" }); }
  };
  hand.forEach((b, i) => { k.on(b, "click", () => choose(i)); k.on(b, "focus", () => { if (at !== i) choose(i); }); });
  k.on(document, "keydown", (e) => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); choose(at + (e.key === "ArrowRight" ? 1 : -1), true); } });
  choose(0);
  return { begin: root.querySelector("#dk-begin"), cont: root.querySelector("#dk-cont"), label: root.querySelector("#dk-where") };
}
export default { title: "draft", css, mount };
