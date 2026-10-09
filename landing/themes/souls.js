const css = `
body.t-souls{--sky1:#3b2a4a;--sky2:#8a4a52;--cloud:#e9cfc0;--cloud2:#c79f97;color:#fff3e0}
.sl{max-width:1160px;margin:0 auto;padding:max(18px,env(safe-area-inset-top,0px)) 18px 90px;display:grid;grid-template-columns:15rem 1fr 21rem;grid-template-areas:"top top top" "org hero att" "go go go";gap:14px 22px;align-items:start}
.sl-top{grid-area:top;display:flex;justify-content:space-between;align-items:center;gap:12px;border-bottom:2px solid #f5c24366;padding-bottom:8px}
.sl-top h1{margin:0;font:600 13px/1 Georgia,"Iowan Old Style",serif;letter-spacing:.34em;text-transform:uppercase;color:#f5c243}
.sl-top span{font-size:13px;opacity:.8;letter-spacing:.06em}
.sl h2{margin:0 0 8px;font:600 12px/1 Georgia,serif;letter-spacing:.3em;text-transform:uppercase;color:#f5c243cc;display:flex;align-items:center;gap:8px}
.sl h2::after{content:"";flex:1;height:2px;background:linear-gradient(90deg,#f5c24399,transparent)}
.sl-org{grid-area:org;display:grid;gap:6px}
.sl-org button{all:unset;cursor:pointer;display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:12px;background:#2a1f33cc;border:2px solid #2a1f33;box-shadow:inset 0 -4px 0 #00000040;font-weight:600}
.sl-org button i{width:12px;height:12px;border-radius:4px;transform:rotate(45deg);background:var(--h);box-shadow:inset -3px -3px 0 #0003}
.sl-org button[aria-pressed=true]{background:linear-gradient(90deg,#f5c24355,#2a1f33cc 80%);border-color:#f5c243;color:#fff}
.sl-org button:focus-visible{outline:3px solid #12c4f0;outline-offset:2px}
.sl-hero{grid-area:hero;position:relative;display:grid;place-items:center;padding-top:6px}
.sl-hero figure{margin:0;width:min(100%,360px);aspect-ratio:9/10;border-radius:46% 46% 22px 22px/36% 36% 22px 22px;overflow:hidden;border:3px solid #2a1f33;box-shadow:0 0 0 4px #f5c24355,0 24px 0 -8px #2a1f3366;animation:sl-turn 8s ease-in-out infinite}
.sl-hero img{display:block;width:100%;height:100%;object-fit:cover}
.sl-hero::after{content:"";position:absolute;bottom:-14px;width:62%;height:26px;border-radius:50%;background:radial-gradient(closest-side,#f5c24399,transparent);animation:sl-glow 2.8s ease-in-out infinite}
@keyframes sl-turn{0%,100%{transform:perspective(900px) rotateY(-8deg)}50%{transform:perspective(900px) rotateY(8deg)}}
@keyframes sl-glow{50%{opacity:.5}}
.sl-att{grid-area:att;background:#2a1f33d9;border:2px solid #2a1f33;border-radius:16px;padding:14px 14px 12px;box-shadow:inset 0 -5px 0 #00000045}
#sl-thumb{display:block;width:100%;height:96px;object-fit:cover;border-radius:10px;border:2px solid #2a1f33;margin:0 0 10px;background:#fff6ea}
.sl-stat{display:grid;grid-template-columns:auto 1fr;gap:2px 14px;font-size:14px;margin-bottom:10px}
.sl-stat dt{opacity:.7}.sl-stat dd{margin:0;text-align:right;font-weight:600}
.sl-row{all:unset;box-sizing:border-box;width:100%;cursor:pointer;display:flex;align-items:center;gap:10px;padding:7px 8px;border-radius:9px;font-size:15px}
.sl-row::before{content:"";width:8px;height:8px;transform:rotate(45deg);background:var(--h);flex:none}
.sl-row:hover,.sl-row:focus-visible{background:linear-gradient(90deg,#f5c24333,transparent);outline:none}
.sl-row[aria-current=true]{color:#f5c243}
.sl-desc{margin:10px 0 0;min-height:4.4em;padding:10px 12px;border-radius:10px;background:#00000038;border:1px solid #f5c24355;font:italic 14px/1.45 Georgia,serif;color:#f3e3cf}
.sl-go{grid-area:go;display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.sl-go a{min-width:12em;text-align:center;padding:12px 22px;border-radius:14px;border:3px solid #2a1f33;background:#f5c243;color:#2a1f33;box-shadow:inset 0 -5px 0 #dd9200;text-decoration:none;font-weight:800;letter-spacing:.2em;text-transform:uppercase}
.sl-go a.alt{background:#fff3e0;box-shadow:inset 0 -5px 0 #e2c9ad}
.sl-go a:hover,.sl-go a:focus-visible{outline:3px solid #12c4f0;outline-offset:3px}
.sl-go small{display:block;font-size:11px;letter-spacing:.04em;text-transform:none;font-weight:600}
.sl-keys{grid-area:go;margin-top:64px;text-align:center;font-size:12px;opacity:.7;letter-spacing:.06em}
.sl-band{position:fixed;inset:38% 0 auto;z-index:8;padding:22px 0;text-align:center;background:linear-gradient(90deg,transparent,#2a1f33ee 20%,#2a1f33ee 80%,transparent);font:600 clamp(20px,4vw,34px)/1 Georgia,serif;letter-spacing:.32em;text-transform:uppercase;color:#f5c243;pointer-events:none;animation:sl-band 2.4s ease forwards}
@keyframes sl-band{0%{opacity:0;letter-spacing:.6em}25%,70%{opacity:1;letter-spacing:.32em}100%{opacity:0;visibility:hidden}}
@media (max-width:820px){.sl{grid-template-columns:1fr;grid-template-areas:"top" "hero" "org" "att" "go";padding-bottom:150px}.sl-hero figure{width:56%;max-width:230px}.sl-org{grid-template-columns:1fr 1fr}.sl-org button{padding:8px 10px;font-size:14px}.sl-go{position:fixed;left:0;right:0;bottom:0;z-index:5;padding:10px 12px max(12px,env(safe-area-inset-bottom,0px)) 120px;background:#2a1f33f2;border-top:2px solid #f5c24366}.sl-go a{flex:1;min-width:0;padding:11px 8px}.sl-keys{display:none}}
`;
function mount(root, k) {
  root.innerHTML = `<div class="sl">
<header class="sl-top"><h1>Character creation</h1><span>${k.PERSON.name} &middot; Level ${k.PERSON.level}</span></header>
<nav class="sl-org" aria-label="Origin"></nav>
<div class="sl-hero" aria-hidden="true"><figure><img src="${k.hero}" alt="" width="900" height="1000"></figure></div>
<section class="sl-att" aria-label="Attributes">
<dl class="sl-stat"><dt>Class</dt><dd>${k.PERSON.cls}</dd><dt>Level</dt><dd>${k.PERSON.level} years</dd><dt>Covenant</dt><dd>None yet</dd></dl>
<img id="sl-thumb" alt="" width="300" height="267"><h2 id="sl-oname"></h2><div id="sl-rows"></div><p class="sl-desc" id="sl-desc" aria-live="polite"></p></section>
<div class="sl-go"><a id="sl-begin" href="#">Arise<small>new game</small></a><a id="sl-cont" class="alt" href="#" hidden>Continue<small id="sl-where"></small></a></div>
<p class="sl-keys">&uarr; &darr; origin &nbsp; &larr; &rarr; attribute &nbsp; Tab to Arise &nbsp; T theme</p></div>
<div class="sl-band">Choose an origin</div>`;
  const org = root.querySelector(".sl-org"), rows = root.querySelector("#sl-rows"), desc = root.querySelector("#sl-desc");
  let at = 0;
  org.innerHTML = k.CLUSTERS.map((c, i) => `<button type="button" data-i="${i}" style="--h:${c.hue}" aria-pressed="false"><i></i>${c.name}</button>`).join("");
  const btns = [...org.children];
  const say = (i) => { const c = k.CLUSTERS[at]; [...rows.children].forEach((r, j) => r.setAttribute("aria-current", j === i)); desc.textContent = c.skills[i][1]; };
  const choose = (i, focus) => {
    at = (i + btns.length) % btns.length; const c = k.CLUSTERS[at];
    btns.forEach((b, j) => b.setAttribute("aria-pressed", j === at));
    root.querySelector("#sl-oname").textContent = c.line; root.querySelector("#sl-thumb").src = k.thumb(c.thumb);
    rows.innerHTML = c.skills.map(([n], j) => `<button type="button" class="sl-row" data-j="${j}" style="--h:${c.hue}">${n}</button>`).join("");
    say(0); if (focus) btns[at].focus();
  };
  btns.forEach((b, i) => k.on(b, "click", () => choose(i)));
  k.on(rows, "click", (e) => { const r = e.target.closest(".sl-row"); if (r) say(+r.dataset.j); });
  k.on(rows, "focusin", (e) => { const r = e.target.closest(".sl-row"); if (r) say(+r.dataset.j); });
  k.on(rows, "pointerover", (e) => { const r = e.target.closest(".sl-row"); if (r) say(+r.dataset.j); });
  k.on(document, "keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); choose(at + (e.key === "ArrowDown" ? 1 : -1), true); }
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); const r = [...rows.children]; const cur = r.findIndex((x) => x.getAttribute("aria-current") === "true"); const n = (cur + (e.key === "ArrowRight" ? 1 : r.length - 1)) % r.length; r[n].focus(); say(n); }
  });
  choose(0);
  return { begin: root.querySelector("#sl-begin"), cont: root.querySelector("#sl-cont"), label: root.querySelector("#sl-where") };
}
export default { title: "character creation", css, mount };
