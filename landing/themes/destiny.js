const css = `
body.t-destiny{--sky1:#151a3a;--sky2:#3b3f7a;--cloud:#c9c3ef;--cloud2:#9d95d6;color:#eef6ff}
.ds{max-width:1180px;margin:0 auto;padding:max(16px,env(safe-area-inset-top,0px)) 18px 96px;display:grid;grid-template-columns:1fr 22rem;grid-template-areas:"top top" "orbit side";gap:14px 26px}
.ds-cond{font-stretch:condensed;font-family:"Avenir Next Condensed","Roboto Condensed","Arial Narrow",var(--round);text-transform:uppercase;letter-spacing:.14em}
.ds-top{grid-area:top;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.ds-top h1{margin:0;font-size:22px;font-weight:700;letter-spacing:.24em}
.ds-top h1 small{display:block;font-size:11px;letter-spacing:.3em;color:#12c4f0;font-weight:600}
.ds-plate{display:flex;align-items:stretch;min-width:min(100%,330px);border-radius:12px;overflow:hidden;border:2px solid #2a1f33;box-shadow:inset 0 -4px 0 #0004;background:linear-gradient(90deg,#12c4f0,#0f8fb8 55%,#2a3a8a)}
.ds-plate img{width:58px;height:58px;object-fit:cover;object-position:50% 22%;border-right:2px solid #2a1f33}
.ds-plate div{flex:1;padding:6px 12px;display:flex;flex-direction:column;justify-content:center;color:#fff}
.ds-plate b{font-size:16px;letter-spacing:.1em}.ds-plate span{font-size:11px;opacity:.85}
.ds-plate em{font-style:normal;padding:0 12px;display:flex;align-items:center;font-size:22px;font-weight:700;color:#f5c243}
.ds-orbit{grid-area:orbit;position:relative;width:min(100%,560px,calc(100vh - 150px));min-width:min(100%,300px);aspect-ratio:1;justify-self:center}
.ds-ring{position:absolute;inset:var(--in);border-radius:50%;border:2px dashed #12c4f055}
.ds-spin{position:absolute;inset:0;animation:ds-spin 140s linear infinite}
@keyframes ds-spin{to{transform:rotate(360deg)}}
.ds-sun{position:absolute;left:50%;top:50%;width:24%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;overflow:hidden;border:3px solid #2a1f33;box-shadow:0 0 0 6px #f5c24355,0 0 60px #f5c24388}
.ds-sun img{width:100%;height:100%;object-fit:cover;object-position:50% 20%}
.ds-p{all:unset;position:absolute;left:var(--x);top:var(--y);width:var(--s);aspect-ratio:1;transform:translate(-50%,-50%);cursor:pointer}
.ds-p span{display:block;width:100%;height:100%;border-radius:50%;overflow:hidden;border:3px solid #2a1f33;box-shadow:inset 0 -6px 0 #0004,0 0 0 3px var(--h);background:#fff6ea}
.ds-in{position:absolute;inset:0;animation:ds-spin 140s linear infinite reverse}
.ds-p img{width:100%;height:100%;object-fit:cover;transform:scale(1.35)}
.ds-p b{position:absolute;left:50%;top:104%;transform:translateX(-50%);white-space:nowrap;font-size:11px;font-weight:700;padding:2px 7px;border-radius:6px;background:#2a1f33cc}
.ds-p[aria-pressed=true] span{box-shadow:inset 0 -6px 0 #0004,0 0 0 4px #12c4f0,0 0 26px #12c4f0}
.ds-p:focus-visible span{outline:3px solid #fff;outline-offset:4px}
.ds-side{grid-area:side;align-self:center;background:#151a3ae6;border:2px solid #2a1f33;border-radius:16px;padding:16px;box-shadow:inset 0 -5px 0 #0005}
.ds-side h2{margin:0;font-size:20px;color:var(--h)}
.ds-side p.ds-line{margin:2px 0 12px;font-size:13px;opacity:.75}
.ds-tree{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,52px);gap:6px;width:200px;margin:4px auto 12px}
.ds-n{all:unset;cursor:pointer;width:46px;height:46px;justify-self:center;align-self:center;transform:rotate(45deg);border-radius:10px;background:#2a1f33;border:3px solid var(--h);box-shadow:inset -5px -5px 0 #0005;display:grid;place-items:center}
.ds-n i{transform:rotate(-45deg);font-style:normal;font-weight:700;font-size:15px;color:var(--h)}
.ds-n:nth-child(1){grid-area:1/2}.ds-n:nth-child(2){grid-area:2/1}.ds-n:nth-child(3){grid-area:2/3}.ds-n:nth-child(4){grid-area:3/2}
.ds-n[aria-current=true]{background:var(--h)}.ds-n[aria-current=true] i{color:#2a1f33}
.ds-n:focus-visible{outline:3px solid #fff;outline-offset:3px}
.ds-tree::after{content:"";grid-area:2/2;width:22px;height:22px;justify-self:center;align-self:center;border-radius:50%;background:var(--h);box-shadow:0 0 18px var(--h)}
.ds-skill{font-size:15px;font-weight:700;margin:0 0 4px;letter-spacing:.1em}
.ds-desc{margin:0;min-height:4.4em;font-size:14px;line-height:1.45;color:#d6e6f6}
.ds-go{position:fixed;right:max(14px,env(safe-area-inset-right,0px));bottom:max(14px,env(safe-area-inset-bottom,0px));z-index:5;display:flex;gap:10px}
.ds-go a{display:block;text-align:center;padding:12px 26px;border-radius:12px;border:3px solid #2a1f33;background:#12c4f0;color:#0d1530;box-shadow:inset 0 -5px 0 #0b8fb3;text-decoration:none;font-weight:800;font-size:16px}
.ds-go a.alt{background:#eef6ff;box-shadow:inset 0 -5px 0 #b9c8e0}
.ds-go a:hover,.ds-go a:focus-visible{outline:3px solid #f5c243;outline-offset:3px}
.ds-go small{display:block;font-size:10px;letter-spacing:.08em}
@media (max-width:820px){.ds{grid-template-columns:1fr;grid-template-areas:"top" "orbit" "side";padding-bottom:110px}.ds-p b{font-size:9px;padding:1px 5px}.ds-go{left:0;right:0;bottom:0;padding:10px 12px max(12px,env(safe-area-inset-bottom,0px)) 120px;background:#151a3af2;border-top:2px solid #12c4f055}.ds-go a{flex:1;padding:11px 8px}}
`;
function mount(root, k) {
  const n = k.CLUSTERS.length;
  const planets = k.CLUSTERS.map((c, i) => {
    const r = i % 2 ? 40 : 30, a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return `<button type="button" class="ds-p ds-cond" data-i="${i}" aria-pressed="false" style="--h:${c.hue};--x:${50 + r * Math.cos(a)}%;--y:${50 + r * Math.sin(a)}%;--s:${i % 2 ? 15 : 17}%"><div class="ds-in"><span><img src="${k.thumb(c.thumb)}" alt=""></span><b>${c.name}</b></div></button>`;
  }).join("");
  root.innerHTML = `<div class="ds">
<header class="ds-top ds-cond"><h1><small>Director</small>Choose a destination</h1>
<div class="ds-plate"><img src="${k.bust}" alt=""><div><b>${k.PERSON.name}</b><span>${k.PERSON.cls}</span></div><em>&#10022; ${k.PERSON.level}</em></div></header>
<div class="ds-orbit"><div class="ds-ring" style="--in:20%"></div><div class="ds-ring" style="--in:10%"></div><div class="ds-spin">${planets}</div><div class="ds-sun" aria-hidden="true"><img src="${k.bust}" alt=""></div></div>
<section class="ds-side" aria-live="polite"><h2 class="ds-cond" id="ds-name"></h2><p class="ds-line" id="ds-line"></p><div class="ds-tree" id="ds-tree"></div><p class="ds-skill ds-cond" id="ds-skill"></p><p class="ds-desc" id="ds-desc"></p></section>
<div class="ds-go ds-cond"><a id="ds-cont" class="alt" href="#" hidden>Continue<small id="ds-where"></small></a><a id="ds-begin" href="#">Launch<small>first island</small></a></div></div>`;
  const ps = [...root.querySelectorAll(".ds-p")], tree = root.querySelector("#ds-tree"), side = root.querySelector(".ds-side");
  let at = 0;
  const node = (j) => { const c = k.CLUSTERS[at]; [...tree.children].forEach((b, x) => b.setAttribute("aria-current", x === j)); root.querySelector("#ds-skill").textContent = c.skills[j][0]; root.querySelector("#ds-desc").textContent = c.skills[j][1]; };
  const choose = (i, focus) => {
    at = (i + n) % n; const c = k.CLUSTERS[at];
    ps.forEach((p, j) => p.setAttribute("aria-pressed", j === at));
    side.style.setProperty("--h", c.hue);
    root.querySelector("#ds-name").textContent = c.name;
    root.querySelector("#ds-line").textContent = c.line;
    tree.innerHTML = c.skills.map(([s], j) => `<button type="button" class="ds-n" data-j="${j}" aria-label="${s}"><i>${s[0]}</i></button>`).join("");
    node(0); if (focus) ps[at].focus();
  };
  ps.forEach((p, i) => { k.on(p, "click", () => choose(i)); k.on(p, "focus", () => { if (at !== i) choose(i); }); });
  for (const ev of ["click", "focusin", "pointerover"]) k.on(tree, ev, (e) => { const b = e.target.closest(".ds-n"); if (b) node(+b.dataset.j); });
  k.on(document, "keydown", (e) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key) && !tree.contains(document.activeElement)) { e.preventDefault(); choose(at + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1), true); }
    else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) { e.preventDefault(); const map = { ArrowUp: 0, ArrowLeft: 1, ArrowRight: 2, ArrowDown: 3 }; tree.children[map[e.key]].focus(); }
  });
  choose(0);
  return { begin: root.querySelector("#ds-begin"), cont: root.querySelector("#ds-cont"), label: root.querySelector("#ds-where") };
}
export default { title: "director", css, mount };
