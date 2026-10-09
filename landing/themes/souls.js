const data = await (await fetch(new URL("../classes.json", import.meta.url))).json();

const css = `
body.t-souls{--sky1:#2e2129;--sky2:#160f15;color:#fff3e0}
body.t-souls .bed{display:none}
.sc{--pan:#34262f;--pan2:#1f161d;--edge:#110b10;--dim:#fff3e09c;--b:#12c4f0;--b2:#0a86ad;max-width:1180px;margin:0 auto;padding:max(26px,env(safe-area-inset-top,0px)) 28px 28px;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);grid-template-areas:"head head" "info hero" "att hero" "keys keys";gap:20px 26px}
.sc-p{background:var(--pan);border:2px solid var(--edge);border-radius:20px;box-shadow:inset 0 -6px 0 var(--pan2)}
.sc-head{grid-area:head;display:flex;align-items:center;gap:16px}
.sc-head img{width:64px;height:64px;object-fit:cover;object-position:50% 30%;border-radius:16px;border:2px solid var(--edge);box-shadow:inset 0 -4px 0 #0004}
.sc-head small{display:block;font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:var(--dim)}
.sc-head h1{margin:2px 0 0;font:800 28px/1.1 var(--round);letter-spacing:.02em}
.sc-info{grid-area:info;padding:18px 20px 20px;display:grid;gap:16px}
.sc-rows{margin:0;display:grid;grid-template-columns:1fr 1fr;gap:6px 24px}
.sc-rows div{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:40px;padding:0 12px;border-radius:12px}
.sc-rows dt{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--dim)}
.sc-rows dd{margin:0;font-weight:700;text-align:right;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sc-rows a{color:inherit;text-decoration:none;border-bottom:2px solid #12c4f066}
.sc-rows a:hover,.sc-rows a:focus-visible{border-color:var(--b);outline:none}
.sc-rows .sc-class{grid-column:1/-1;background:#12c4f022;box-shadow:inset 0 0 0 2px #12c4f088}
.sc-class dd{display:flex;align-items:center;gap:8px}
.sc-class output{min-width:11em;text-align:center;font-size:17px}
.sc-arw{all:unset;cursor:pointer;display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:var(--b);color:#10202a;font-weight:900;box-shadow:inset 0 -3px 0 var(--b2)}
.sc-arw:focus-visible,.sc-arw:hover{outline:3px solid #fff3e0;outline-offset:2px}
.sc-go{display:flex;gap:12px;justify-content:flex-end}
.sc-go a{min-width:9.5em;text-align:center;padding:11px 20px;border-radius:14px;border:2px solid var(--edge);background:var(--b);color:#10202a;box-shadow:inset 0 -4px 0 var(--b2);text-decoration:none;font-weight:800;letter-spacing:.16em;text-transform:uppercase}
.sc-go a.alt{background:#fff3e0;box-shadow:inset 0 -4px 0 #d9c7ae}
.sc-go a:hover,.sc-go a:focus-visible{outline:3px solid #fff3e0;outline-offset:3px}
.sc-go small{display:block;font-size:11px;letter-spacing:.04em;text-transform:none;font-weight:600}
.sc-att{grid-area:att;padding:18px 22px 20px}
.sc-line{margin:0 0 14px;min-height:1.4em;color:var(--dim);transition:opacity .25s}
.sc-line.out{opacity:0}
.sc-att ul{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.sc-att li{display:grid;grid-template-columns:11.5em 1fr 2ch;align-items:center;gap:14px;font-weight:700}
.sc-bar{height:14px;border-radius:999px;background:var(--pan2);box-shadow:inset 0 2px 0 #0005;overflow:hidden}
.sc-bar b{display:block;height:100%;width:0;border-radius:999px;background:var(--b);box-shadow:inset 0 -4px 0 var(--b2);transition:width .6s cubic-bezier(.3,1.3,.5,1)}
.sc-att em{font-style:normal;text-align:right;color:var(--b)}
.sc-hero{grid-area:hero;margin:0;overflow:hidden;min-height:420px;position:relative}
.sc-hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 45%;animation:sc-idle 3.2s ease-in-out infinite}
@keyframes sc-idle{50%{transform:scale(1.025) translateY(-4px)}}
.sc-keys{grid-area:keys;display:flex;gap:22px;justify-content:flex-start;font-size:13px;color:var(--dim)}
.sc-keys kbd{font:700 12px/1 var(--round);padding:4px 7px;margin-right:6px;border-radius:7px;background:#fff3e0;color:var(--edge);box-shadow:inset 0 -2px 0 #d9c7ae}
@media (max-width:820px){
.sc{grid-template-columns:1fr;grid-template-areas:"head" "hero" "info" "att";padding:18px 16px 96px;gap:14px}
.sc-head img{width:52px;height:52px}.sc-head h1{font-size:23px}
.sc-hero{min-height:0;aspect-ratio:16/10}
.sc-rows{grid-template-columns:1fr}.sc-rows div:first-child{display:none}.sc-rows div{padding:0 10px}
.sc-class output{min-width:0;flex:1;font-size:16px}.sc-class dd{flex:1;justify-content:flex-end}.sc-rows .sc-class{gap:8px}
.sc-att li{grid-template-columns:1fr 2ch;gap:6px 10px}.sc-bar{grid-column:1/-1;grid-row:2}
.sc-go{position:fixed;left:0;right:0;bottom:0;z-index:5;padding:10px 12px max(10px,env(safe-area-inset-bottom,0px));background:#160f15f2;border-top:2px solid var(--edge)}
.sc-go a{flex:1;min-width:0;padding:12px 8px}
.sc-keys{display:none}}
`;

function mount(root, k) {
  const P = data.person, C = data.classes;
  const years = new Date().getFullYear() - P.since;
  const links = P.links.map((l) => `<a href="${l.url}" target="_blank" rel="noopener">${l.label}</a>`).join(" &middot; ");
  root.innerHTML = `<div class="sc">
<header class="sc-head"><img src="${k.bust}" alt="" width="480" height="540"><div><small>Create Character</small><h1>${P.name}</h1></div></header>
<section class="sc-info sc-p" aria-label="Details">
<dl class="sc-rows">
<div><dt>Name</dt><dd>${P.name}</dd></div>
<div><dt>Based</dt><dd>${P.location}</dd></div>
<div><dt>Email</dt><dd><a href="mailto:${P.email}">${P.email}</a></dd></div>
<div><dt>Level</dt><dd>${years} years building software</dd></div>
${links ? `<div><dt>Links</dt><dd>${links}</dd></div>` : ""}
<div class="sc-class"><dt>Class</dt><dd><button type="button" class="sc-arw" data-d="-1" aria-label="Previous class">&#9664;</button><output id="sc-cls" aria-live="polite"></output><button type="button" class="sc-arw" data-d="1" aria-label="Next class">&#9654;</button></dd></div>
</dl>
<div class="sc-go"><a id="sc-begin" href="#">Begin</a><a id="sc-cont" class="alt" href="#" hidden>Continue<small id="sc-where"></small></a></div>
</section>
<section class="sc-att sc-p" aria-label="Attributes"><p class="sc-line" id="sc-line"></p><ul id="sc-stats">${"<li><span></span><i class=\"sc-bar\"><b></b></i><em></em></li>".repeat(6)}</ul></section>
<figure class="sc-hero sc-p"><img src="${k.hero}" alt="Ryne's character standing on a golden island" width="900" height="1000"></figure>
<footer class="sc-keys"><span><kbd>&larr;</kbd><kbd>&rarr;</kbd>Class</span><span><kbd>F</kbd><kbd>Enter</kbd>Begin</span><span><kbd>Tab</kbd>Move</span></footer>
</div>`;
  const $ = (s) => root.querySelector(s);
  const cls = $("#sc-cls"), line = $("#sc-line"), rows = [...$("#sc-stats").children], begin = $("#sc-begin");
  const q = new URLSearchParams(location.search).get("class");
  let at = Math.max(0, C.findIndex((c) => c.id === (q || data.default)));
  const show = (i, first) => {
    at = (i + C.length) % C.length;
    const c = C[at];
    cls.textContent = c.name;
    line.classList.add("out");
    setTimeout(() => { line.textContent = c.line; line.classList.remove("out"); }, first ? 0 : 200);
    rows.forEach((r, j) => {
      const [n, v] = c.stats[j];
      r.children[0].textContent = n;
      r.children[2].textContent = v;
      r.setAttribute("aria-label", `${n} ${v} of 10`);
      requestAnimationFrame(() => requestAnimationFrame(() => { r.children[1].firstChild.style.width = v * 10 + "%"; }));
    });
  };
  root.querySelectorAll(".sc-arw").forEach((b) => k.on(b, "click", () => show(at + +b.dataset.d)));
  k.on(document, "keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const d = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
    if (d) { e.preventDefault(); show(at + d); return; }
    const onLink = e.target instanceof HTMLAnchorElement || e.target instanceof HTMLButtonElement;
    if (e.key === "f" || e.key === "F" || (e.key === "Enter" && !onLink)) { e.preventDefault(); begin.click(); }
  });
  show(at, true);
  return { begin, cont: $("#sc-cont"), label: $("#sc-where") };
}

export default { title: "Create Character", css, mount };
