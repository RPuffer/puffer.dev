import { HOME, BUST } from "./input.js";
import { startArt } from "./art.js";
const CSS = `
.iw-ui{position:fixed;right:max(10px,env(safe-area-inset-right,0px));bottom:max(10px,env(safe-area-inset-bottom,0px));z-index:20;display:flex;gap:7px;align-items:center;padding:7px;border-radius:14px;background:rgba(20,24,31,.55);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}
.iw-ui:empty,.iw-touch .iw-ui:not(.iw-inline){display:none}
.iw-ui.iw-inline{position:static;background:none;padding:0}
.iw-ui button{min-width:36px;height:34px;font:700 17px/1 system-ui,sans-serif;color:#f0ede6;background:#363e4d;border:0;border-radius:10px;padding:0 9px;cursor:pointer;box-shadow:0 3px 0 #1a1f28;touch-action:manipulation;transition:transform .08s,box-shadow .08s}
.iw-ui button:hover{box-shadow:0 3px 0 #1a1f28,0 0 0 2px #12c4f0}
.iw-ui button:active{transform:translateY(2px);box-shadow:0 1px 0 #1a1f28}
.iw-orb{--o:58px;position:fixed;left:50%;top:max(12px,env(safe-area-inset-top,0px));z-index:22;width:var(--o);height:var(--o);margin-left:calc(var(--o) / -2);padding:0;border:0;border-radius:50%;background:#262c37 center/cover no-repeat;box-shadow:0 0 0 4px #262c37,0 0 0 7px #12c4f0,0 6px 0 7px rgba(20,24,31,.55);cursor:pointer;touch-action:manipulation;transition:transform .5s cubic-bezier(.34,1.7,.5,1),opacity .18s;-webkit-tap-highlight-color:transparent}
.iw-orb:hover{transform:scale(1.07)}
.iw-home{position:fixed;left:calc(50% - 82px);top:calc(max(12px,env(safe-area-inset-top,0px)) + 11px);z-index:22;display:grid;place-items:center;width:36px;height:36px;border-radius:50%;background:#363e4d;color:#f0ede6;box-shadow:0 3px 0 #1a1f28;transition:transform .12s}
.iw-home:hover,.iw-home:focus-visible{transform:translateY(-1px);box-shadow:0 3px 0 #1a1f28,0 0 0 2px #12c4f0;outline:none}
.iw-home svg{width:20px;height:20px;fill:currentColor}
.iw-touch .iw-home{display:none}
@media (min-width:700px){.iw-home{left:calc(50% - 88px);top:calc(max(12px,env(safe-area-inset-top,0px)) + 14px)}}
.iw-orb.open{transform:scale(.5);opacity:0;pointer-events:none}
.iw-orb[hidden]{display:none}
.iw-orb:focus-visible{outline:3px solid #ffd36a;outline-offset:6px}
@media (min-width:700px){.iw-orb{--o:64px}}
.iw-mark{display:flex;gap:9%;align-items:center;justify-content:center;width:100%;height:100%}
.iw-mark i{display:block;width:20%;height:20%;border-radius:3px}
.iw-mark i:nth-child(1){background:#f5c243}.iw-mark i:nth-child(2){background:#e8873a}.iw-mark i:nth-child(3){background:#7cc56a}
.iw-nav{position:fixed;inset:0;z-index:30;background:rgba(10,12,18,0);transition:background .3s;touch-action:none;user-select:none;-webkit-user-select:none}
.iw-nav.open{background:rgba(10,12,18,.45)}
.iw-nav svg{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none}
.iw-nav line{stroke:rgba(240,237,230,.8);stroke-linecap:round}
.iw-nav .mol{position:absolute;width:0;height:0}
.iw-nav .node{position:absolute;left:0;top:0;width:var(--s);height:var(--s);margin:calc(var(--s) / -2) 0 0 calc(var(--s) / -2);padding:0;border:0;border-radius:50%;background:#262c37 center/cover no-repeat;box-shadow:0 0 0 3px #f0ede6,0 5px 0 3px rgba(20,24,31,.55);cursor:pointer;transform:translate(0,0) scale(0);transition:transform .62s cubic-bezier(.3,1.75,.5,1);touch-action:none;-webkit-tap-highlight-color:transparent}
.iw-nav .node.current{box-shadow:0 0 0 3px #ffd36a,0 0 0 9px rgba(255,211,106,.3),0 5px 0 3px rgba(20,24,31,.55)}
.iw-nav .node.sel{box-shadow:0 0 0 3px #12c4f0,0 5px 0 3px rgba(20,24,31,.55)}
.iw-nav .node.locked{cursor:not-allowed;filter:grayscale(1) brightness(.45)}
.iw-nav .node.locked::after{content:"\\1F512";position:absolute;inset:0;display:grid;place-items:center;font-size:calc(var(--s) * .34)}
.iw-nav .node:focus-visible{outline:3px solid #12c4f0;outline-offset:4px}
.iw-nav .node:hover:not(.locked){filter:brightness(1.12)}
.iw-nav .name{position:absolute;left:50%;top:calc(100% + 9px);transform:translateX(-50%);white-space:nowrap;padding:4px 9px;border-radius:999px;background:rgba(20,24,31,.88);color:#f0ede6;font:600 12px/1.2 system-ui,sans-serif;opacity:0;pointer-events:none;transition:opacity .2s}
.iw-nav .node.mid,.iw-nav .node:hover,.iw-nav .node:focus-visible{z-index:2}
.iw-nav .node:hover .name,.iw-nav .node:focus-visible .name,.iw-nav .node.mid .name{opacity:1}
.iw-nav .node.shake{animation:iw-shake .3s}
@keyframes iw-shake{25%{margin-left:calc(var(--s) / -2 - 6px)}75%{margin-left:calc(var(--s) / -2 + 6px)}}
.iw-sheet{position:fixed;inset:0;z-index:31;background:rgba(10,12,18,.5)}
.iw-panel{position:absolute;top:max(84px,calc(env(safe-area-inset-top,0px) + 84px));bottom:max(12px,env(safe-area-inset-bottom,0px));left:max(10px,calc(50vw - 560px));right:max(10px,calc(50vw - 560px));border-radius:18px;overflow:hidden;background:#404040;box-shadow:0 0 0 4px #262c37,0 0 0 7px #12c4f0,0 12px 30px rgba(0,0,0,.5);transform-origin:50% -60px;animation:iw-pop .5s cubic-bezier(.34,1.56,.64,1)}
.iw-panel iframe{display:block;width:100%;height:100%;border:0}
.iw-panel .x{position:absolute;right:10px;top:10px;width:36px;height:36px;padding:0;border:0;border-radius:50%;background:#262c37;color:#f0ede6;font:700 20px/36px system-ui,sans-serif;box-shadow:0 3px 0 #14181f;cursor:pointer}
@keyframes iw-pop{from{transform:scale(.15);opacity:0}}
.iw-veil{position:fixed;inset:0;z-index:29;pointer-events:none;opacity:0;transition:opacity .18s ease-in}
.iw-veil.on{opacity:1}
@media (prefers-reduced-motion:reduce){.iw-nav .node,.iw-orb{transition-duration:.01s}.iw-panel{animation:none}}
@property --iw-spin{syntax:"<angle>";inherits:true;initial-value:0deg}
@property --iw-flow{syntax:"<length>";inherits:true;initial-value:0px}
@keyframes iw-spin{to{--iw-spin:360deg}}
@keyframes iw-flow{to{--iw-flow:-24px}}
@keyframes iw-jelly{0%{transform:scale(1)}30%{transform:scale(1.18,.86)}50%{transform:scale(.9,1.12)}70%{transform:scale(1.06,.96)}100%{transform:scale(1)}}
@keyframes iw-gulp{0%{transform:scale(1)}35%{transform:scale(1.28)}60%{transform:scale(.9)}80%{transform:scale(1.06)}100%{transform:scale(1)}}
@keyframes iw-drop{from{transform:translateY(-8px) scale(.4);opacity:0}}
.iw-navkeys{display:none}
@media (hover:hover){
html:not(.iw-touch) .iw-ui{gap:10px;padding:10px 12px 22px;border-radius:22px;border:2px solid transparent;background:linear-gradient(rgba(22,18,34,.78),rgba(22,18,34,.78)) padding-box,conic-gradient(from var(--iw-spin),#12c4f0,#9a7ae0,#e86aa0,#f5c243,#7cc56a,#12c4f0) border-box;animation:iw-spin 9s linear infinite;box-shadow:0 8px 0 rgba(10,8,18,.45),0 0 26px rgba(154,122,224,.35)}
html:not(.iw-touch) .iw-ui.iw-inline{padding:0;border:0;background:none;box-shadow:none;animation:none}
html:not(.iw-touch) .iw-ui button{position:relative;min-width:42px;height:40px;border-radius:14px;font-size:19px;background:linear-gradient(160deg,#4a4170 0 48%,#3a3358 48%);box-shadow:0 4px 0 #1a1530;transition:transform .45s cubic-bezier(.34,1.9,.5,1),box-shadow .12s}
html:not(.iw-touch) .iw-ui button:nth-child(odd):hover{transform:translateY(-4px) rotate(-7deg) scale(1.08)}
html:not(.iw-touch) .iw-ui button:nth-child(even):hover{transform:translateY(-4px) rotate(7deg) scale(1.08)}
html:not(.iw-touch) .iw-ui button:hover{box-shadow:0 7px 0 #1a1530,0 0 0 2px #f5c243}
html:not(.iw-touch) .iw-ui button:active,html:not(.iw-touch) .iw-ui button.hit{transform:translateY(3px) scale(.94);box-shadow:0 1px 0 #1a1530,0 0 0 2px #12c4f0;transition-duration:.08s}
html:not(.iw-touch) .iw-ui button[data-key]::after{content:attr(data-key);position:absolute;left:50%;top:calc(100% + 6px);transform:translateX(-50%);min-width:15px;padding:1px 4px;border-radius:5px;background:#fff3e0;color:#1a1530;font:800 10px/13px ui-rounded,"SF Pro Rounded",system-ui,sans-serif;box-shadow:0 2px 0 #c9b8a0}
html:not(.iw-touch) .iw-orb{box-shadow:0 0 0 4px #1d1830,0 7px 0 6px rgba(14,10,24,.55),0 0 34px 6px rgba(232,106,160,.35);animation:iw-spin 7s linear infinite}
html:not(.iw-touch) .iw-orb::before{content:"";position:absolute;inset:-10px;border-radius:50%;background:conic-gradient(from var(--iw-spin),#12c4f0,#9a7ae0,#e86aa0,#f5c243,#7cc56a,#12c4f0);-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 6px),#000 calc(100% - 5px));mask:radial-gradient(farthest-side,transparent calc(100% - 6px),#000 calc(100% - 5px));pointer-events:none}
html:not(.iw-touch) .iw-orb::after{content:"I";position:absolute;right:-12px;bottom:-8px;min-width:18px;padding:2px 4px;border-radius:6px;background:#fff3e0;color:#1a1530;font:800 11px/14px ui-rounded,"SF Pro Rounded",system-ui,sans-serif;box-shadow:0 2px 0 #c9b8a0;transition:transform .4s cubic-bezier(.34,1.9,.5,1)}
html:not(.iw-touch) .iw-orb:hover{transform:scale(1.12) rotate(-6deg);animation-duration:1.6s}
html:not(.iw-touch) .iw-orb:hover::after{transform:translateY(-3px) rotate(10deg) scale(1.15)}
html:not(.iw-touch) .iw-orb.gulp{animation:iw-spin 7s linear infinite,iw-gulp .6s cubic-bezier(.3,1.6,.5,1)}
html:not(.iw-touch) .iw-home{width:42px;height:42px;background:linear-gradient(160deg,#ffd76a 0 48%,#f5c243 48%);color:#2a1f33;box-shadow:0 4px 0 #9a6b18,0 0 0 3px #1d1830;transition:transform .45s cubic-bezier(.34,1.9,.5,1),box-shadow .12s}
html:not(.iw-touch) .iw-home:hover,html:not(.iw-touch) .iw-home:focus-visible{transform:translateY(-4px) rotate(-12deg) scale(1.1);box-shadow:0 7px 0 #9a6b18,0 0 0 3px #1d1830,0 0 18px #f5c243}
html:not(.iw-touch) .iw-nav::before{content:"";position:absolute;inset:0;opacity:0;transition:opacity .45s;background:radial-gradient(ellipse 70% 55% at 50% 8%,rgba(154,122,224,.42),transparent 70%),radial-gradient(circle at 18% 70%,rgba(232,106,160,.18),transparent 40%),radial-gradient(circle at 84% 64%,rgba(18,196,240,.18),transparent 42%);pointer-events:none}
html:not(.iw-touch) .iw-nav.open::before{opacity:1}
html:not(.iw-touch) .iw-nav svg{animation:iw-flow .9s linear infinite;filter:drop-shadow(0 0 6px rgba(18,196,240,.8))}
html:not(.iw-touch) .iw-nav line{stroke:#bdf2ff;stroke-dasharray:1 11;stroke-dashoffset:var(--iw-flow)}
html:not(.iw-touch) .iw-nav{animation:iw-spin 5s linear infinite}
html:not(.iw-touch) .iw-nav .node::before{content:"";position:absolute;inset:-9px;border-radius:50%;background:conic-gradient(from var(--iw-spin),#12c4f0,#9a7ae0,#e86aa0,#f5c243,#7cc56a,#12c4f0);-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 5px),#000 calc(100% - 4px));mask:radial-gradient(farthest-side,transparent calc(100% - 5px),#000 calc(100% - 4px));opacity:0;transition:opacity .25s;pointer-events:none}
html:not(.iw-touch) .iw-nav .node.mid::before,html:not(.iw-touch) .iw-nav .node:hover:not(.locked)::before,html:not(.iw-touch) .iw-nav .node:focus-visible::before{opacity:1}
html:not(.iw-touch) .iw-nav .node:hover:not(.locked){filter:brightness(1.15) saturate(1.25)}
html:not(.iw-touch) .iw-nav .name{top:calc(100% + 14px);padding:5px 12px;border-radius:12px;background:#fff3e0;color:#1a1530;font:800 13px/1.2 ui-rounded,"SF Pro Rounded",system-ui,sans-serif;box-shadow:0 3px 0 #c9b8a0;transition:opacity .2s,transform .4s cubic-bezier(.34,1.9,.5,1);transform:translateX(-50%) translateY(-6px) scale(.7)}
html:not(.iw-touch) .iw-nav .node:hover .name,html:not(.iw-touch) .iw-nav .node:focus-visible .name,html:not(.iw-touch) .iw-nav .node.mid .name{transform:translateX(-50%)}
html:not(.iw-touch) .iw-navkeys{position:absolute;left:50%;transform:translateX(-50%);display:flex;gap:14px;align-items:center;pointer-events:none;color:rgba(255,243,224,.75);font:700 12px/1 ui-rounded,"SF Pro Rounded",system-ui,sans-serif}
.iw-navkeys span{display:flex;gap:4px;align-items:center;animation:iw-drop .5s cubic-bezier(.34,1.9,.5,1) both}
.iw-navkeys span:nth-child(2){animation-delay:.08s}.iw-navkeys span:nth-child(3){animation-delay:.16s}.iw-navkeys span:nth-child(4){animation-delay:.24s}
.iw-navkeys kbd{min-width:22px;padding:4px 6px;border-radius:7px;background:#fff3e0;color:#1a1530;font:800 12px/1 ui-rounded,"SF Pro Rounded",system-ui,sans-serif;text-align:center;box-shadow:0 3px 0 #c9b8a0}
.iw-arrive{position:fixed;left:50%;top:calc(max(12px,env(safe-area-inset-top,0px)) + 104px);z-index:21;display:grid;justify-items:center;gap:10px;pointer-events:none;transform:translateX(-50%)}
.iw-arrive .disc{position:relative;width:132px;height:132px;border-radius:50%;background:#1d1830 center/cover no-repeat;box-shadow:0 0 0 5px #1d1830,0 10px 0 5px rgba(14,10,24,.5),0 0 50px 10px rgba(232,106,160,.35);animation:iw-spin 3s linear infinite}
.iw-arrive .disc::before{content:"";position:absolute;inset:-14px;border-radius:50%;background:conic-gradient(from var(--iw-spin),#12c4f0,#9a7ae0,#e86aa0,#f5c243,#7cc56a,#12c4f0);-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 8px),#000 calc(100% - 7px));mask:radial-gradient(farthest-side,transparent calc(100% - 8px),#000 calc(100% - 7px))}
.iw-arrive .rays{position:absolute;left:50%;top:66px;width:520px;height:520px;margin:-260px 0 0 -260px;border-radius:50%;background:repeating-conic-gradient(from var(--iw-spin),rgba(245,194,67,.32) 0 6deg,transparent 6deg 18deg,rgba(232,106,160,.26) 18deg 24deg,transparent 24deg 36deg);-webkit-mask:radial-gradient(circle,#000 18%,transparent 66%);mask:radial-gradient(circle,#000 18%,transparent 66%);animation:iw-spin 14s linear infinite reverse;z-index:-1}
.iw-arrive .tag{display:flex;gap:10px;align-items:center;padding:8px 18px 8px 8px;border-radius:999px;background:#fff3e0;color:#1a1530;font:800 22px/1 ui-rounded,"SF Pro Rounded",system-ui,sans-serif;box-shadow:0 5px 0 #c9b8a0,0 0 0 3px #1d1830}
.iw-arrive .tag b{display:grid;place-items:center;min-width:34px;height:34px;padding:0 6px;border-radius:999px;background:#1d1830;color:#f5c243;font-size:18px}
.iw-arrive .disc,.iw-arrive .tag{transform:scale(0)}
.iw-arrive.in .disc{transform:scale(1);transition:transform .7s cubic-bezier(.3,1.75,.5,1)}
.iw-arrive.in .tag{transform:scale(1) rotate(-3deg);transition:transform .7s .14s cubic-bezier(.3,1.75,.5,1)}
.iw-arrive.in .rays{animation:iw-spin 14s linear infinite reverse,iw-drop .8s cubic-bezier(.3,1.6,.5,1) both}
.iw-arrive.out{transition:transform .55s cubic-bezier(.6,-0.4,.7,.6),opacity .5s .1s;transform:translate(-50%,var(--fly,-110px)) scale(.28);opacity:0}
.iw-finale{position:fixed;inset:0;z-index:28;display:grid;place-items:center;pointer-events:none;background:radial-gradient(circle at 50% 50%,rgba(29,24,48,.2),rgba(29,24,48,.72));opacity:0;transition:opacity .5s}
.iw-finale.in{opacity:1}
.iw-finale .ring{position:relative;width:min(70vmin,620px);height:min(70vmin,620px);animation:iw-spin 40s linear infinite}
.iw-finale .ring::before{content:"";position:absolute;inset:-12%;border-radius:50%;background:repeating-conic-gradient(from var(--iw-spin),rgba(245,194,67,.28) 0 5deg,transparent 5deg 15deg,rgba(18,196,240,.22) 15deg 20deg,transparent 20deg 30deg);-webkit-mask:radial-gradient(circle,#000 30%,transparent 70%);mask:radial-gradient(circle,#000 30%,transparent 70%)}
.iw-finale .moon{position:absolute;left:50%;top:50%;width:var(--m);height:var(--m);margin:calc(var(--m) / -2) 0 0 calc(var(--m) / -2);border-radius:50%;background:#1d1830 center/cover no-repeat;box-shadow:0 0 0 4px #fff3e0,0 6px 0 4px rgba(14,10,24,.5);transform:rotate(var(--a)) translateY(calc(var(--r) * -1)) rotate(calc(var(--a) * -1)) scale(0);transition:transform .8s cubic-bezier(.3,1.75,.5,1)}
.iw-finale.in .moon{transform:rotate(calc(var(--a) - var(--iw-spin) * 2)) translateY(calc(var(--r) * -1)) rotate(calc(var(--a) * -1 + var(--iw-spin) * 2)) scale(1)}
.iw-finale .core{position:absolute;left:50%;top:50%;display:grid;place-items:center;width:30%;height:30%;margin:-15% 0 0 -15%;border-radius:50%;background:linear-gradient(160deg,#ffd76a 0 48%,#f5c243 48%);color:#2a1f33;box-shadow:0 0 0 6px #1d1830,0 10px 0 6px rgba(14,10,24,.5),0 0 60px 18px rgba(245,194,67,.5);pointer-events:auto;transform:scale(0);transition:transform .9s .5s cubic-bezier(.3,1.75,.5,1)}
.iw-finale .core svg{width:46%;height:46%;fill:currentColor}
.iw-finale.in .core{transform:scale(1)}
.iw-finale .core:hover,.iw-finale .core:focus-visible{animation:iw-jelly .6s;outline:none}
}
@media (prefers-reduced-motion:reduce){.iw-ui,.iw-orb,.iw-nav,.iw-nav svg,.iw-arrive .disc,.iw-arrive .rays,.iw-finale .ring{animation:none!important}.iw-arrive .disc,.iw-arrive .tag,.iw-finale .moon,.iw-finale .core{transition-duration:.01s!important}}
`;

const RUN_URL = new URL("../levels/run.json", import.meta.url);
const thumb = startArt;
const label = (n) => n.split("-")[0].replace(/^./, (c) => c.toUpperCase());
const reachedIn = (n) => { try { return !!JSON.parse(localStorage.getItem("isoworld:things:" + n) || "null"); } catch { return false; } };
const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const MARK = '<span class="iw-mark" aria-hidden="true"><i></i><i></i><i></i></span>';
const SLOT_SCALE = [1, 1, 0.8, 0.14];

export const startHref = () => new URL("../islands.html", import.meta.url).href;

const desk = () => !document.documentElement.classList.contains("iw-touch") && typeof matchMedia === "function" && matchMedia("(hover:hover)").matches;
const params = () => new URLSearchParams(location.search);
// Pixel-diffing QA tools load run islands under webdriver; the arrival and finale cards stay out of their frames unless fx=1 asks for them.
const fxOn = () => params().get("fx") === "1" || (params().get("fx") !== "0" && !navigator.webdriver);
const urlLevel = () => new URLSearchParams(location.search).get("level") || "home";
const hop = (n) => { const q = new URLSearchParams(location.search); q.set("level", n); q.delete("reset"); q.delete("spawn"); location.search = q.toString(); return new Promise(() => {}); };

function mountNavigator({ current = urlLevel, go = hop, busy = () => false, preload = null, reached = reachedIn } = {}) {
  const orb = document.createElement("button");
  orb.type = "button";
  orb.className = "iw-orb";
  orb.title = "islands";
  orb.setAttribute("aria-label", "islands");
  orb.setAttribute("aria-expanded", "false");
  orb.setAttribute("aria-haspopup", "dialog");
  orb.hidden = true;
  document.body.appendChild(orb);
  let order = [], loaded = false, layer = null, closing = null, going = false, sheet = null, shown = null, landed = null, card = null, party = null;
  let center = 0, step = 80, size = 62, nodes = new Map(), raf = 0, drag = null, dragged = false, wheelAcc = 0;
  fetch(RUN_URL).then((r) => r.json()).then((j) => { order = Array.isArray(j.order) ? j.order : []; loaded = true; sync(); }).catch(() => {});
  const list = () => ["@islands", ...order];

  const sync = () => {
    const cur = current();
    const show = loaded && !going && !busy();
    if (orb.hidden === show) orb.hidden = !show;
    if (show && cur !== shown) {
      shown = cur;
      const known = order.includes(cur);
      orb.innerHTML = known ? "" : MARK;
      orb.style.backgroundImage = known ? `url("${thumb(cur)}")` : "";
      orb.setAttribute("aria-label", known ? `islands (here: ${label(cur)})` : "islands");
      const first = landed === null;
      if (known && cur !== landed && fxOn() && desk() && (!first || (order.indexOf(cur) === 0 && params().get("reset") === "1"))) arrive(cur, order.indexOf(cur) === 0);
      landed = cur;
    }
    if (!show && layer && !going) close(false);
    if (!show && sheet) closePanel(false);
  };
  const timer = setInterval(sync, 200);

  function arrive(n, start) {
    card?.remove();
    const el = document.createElement("div");
    el.className = "iw-arrive" + (start ? " start" : "");
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = `${start ? '<i class="rays"></i>' : ""}<i class="disc"></i><span class="tag"><b>${order.indexOf(n) + 1}</b>${label(n)}</span>`;
    el.querySelector(".disc").style.backgroundImage = `url("${thumb(n)}")`;
    document.body.appendChild(el);
    card = el;
    el.getBoundingClientRect();
    requestAnimationFrame(() => el.classList.add("in"));
    setTimeout(() => {
      if (card !== el) return;
      const o = orb.getBoundingClientRect(), d = el.querySelector(".disc").getBoundingClientRect();
      el.style.setProperty("--fly", Math.round(o.top + o.height / 2 - (d.top + d.height / 2)) + "px");
      el.classList.add("out");
      setTimeout(() => { orb.classList.remove("gulp"); void orb.offsetWidth; orb.classList.add("gulp"); }, 420);
      setTimeout(() => { el.remove(); if (card === el) card = null; }, 700);
    }, start ? 2600 : 1900);
  }

  function finale() {
    if (party || !fxOn() || !desk() || !order.length) return;
    const el = document.createElement("div");
    el.className = "iw-finale";
    const ring = document.createElement("div");
    ring.className = "ring";
    order.forEach((n, i) => {
      const m = document.createElement("i");
      m.className = "moon";
      m.style.cssText = `--a:${(360 / order.length) * i}deg;--r:calc(min(70vmin,620px) * .42);--m:calc(min(70vmin,620px) * .15);background-image:url("${thumb(n)}");transition-delay:${i * 70}ms`;
      ring.appendChild(m);
    });
    const core = document.createElement("a");
    core.className = "core";
    core.href = HOME;
    core.setAttribute("aria-label", "character select");
    core.innerHTML = BUST;
    ring.appendChild(core);
    el.appendChild(ring);
    document.body.appendChild(el);
    party = el;
    el.getBoundingClientRect();
    requestAnimationFrame(() => el.classList.add("in"));
    const end = () => {
      if (party !== el) return;
      party = null;
      removeEventListener("keydown", onAny, true);
      removeEventListener("pointerdown", onAny, true);
      el.classList.remove("in");
      setTimeout(() => el.remove(), 600);
    };
    const onAny = (e) => { if (e.target?.closest?.(".iw-finale .core")) return; end(); };
    setTimeout(() => { addEventListener("keydown", onAny, true); addEventListener("pointerdown", onAny, true); }, 900);
    setTimeout(end, 12000);
  }

  const slot = (k) => {
    const a = Math.abs(k), sx = Math.sign(k);
    const x = a <= 2 ? k * step : sx * Math.min(2.42 * step, innerWidth / 2 - 6);
    return [x, a % 2 ? step * 0.45 : 0, SLOT_SCALE[Math.min(a, 3)]];
  };
  const place = (el, k, { s = null, delay = 0 } = {}) => {
    const [x, y, sc] = slot(k);
    el.style.transitionDelay = delay + "ms";
    el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${s ?? sc})`;
    el.dataset.slot = String(k);
  };
  const makeNode = (i) => {
    const L = list(), n = L[i], b = document.createElement("button");
    b.type = "button";
    b.className = "node";
    b.dataset.index = String(i);
    b.style.setProperty("--s", size + "px");
    const tag = document.createElement("span");
    tag.className = "name";
    if (i === 0) {
      b.classList.add("sel");
      b.dataset.level = "@islands";
      b.innerHTML = MARK;
      tag.textContent = "all islands";
      b.setAttribute("aria-label", "all islands");
    } else {
      const here = n === current(), ok = here || reached(n);
      b.dataset.level = n;
      if (here) b.classList.add("current");
      if (!ok) { b.classList.add("locked"); b.setAttribute("aria-disabled", "true"); }
      b.style.backgroundImage = `url("${thumb(n)}")`;
      const name = `${i}. ${label(n)}`;
      tag.textContent = name + (here ? " · here" : "");
      b.setAttribute("aria-label", name + (here ? " (here)" : ok ? "" : " (locked)"));
      if (ok && !here && preload) { const warm = () => preload(n); b.addEventListener("pointerenter", warm, { once: true }); b.addEventListener("focus", warm, { once: true }); }
    }
    b.appendChild(tag);
    return b;
  };

  const render = () => {
    const L = list(), mol = layer.querySelector(".mol");
    for (const [i, el] of nodes) {
      const k = i - center;
      if (Math.abs(k) <= 3) continue;
      if (!el.dataset.leaving) {
        el.dataset.leaving = "1";
        place(el, Math.sign(k) * 3, { s: 0 });
        el.tabIndex = -1;
        setTimeout(() => { if (el.dataset.leaving) { el.remove(); nodes.delete(i); } }, 650);
      }
    }
    for (let k = -3; k <= 3; k++) {
      const i = center + k;
      if (i < 0 || i >= L.length) continue;
      let el = nodes.get(i);
      if (!el) {
        el = makeNode(i);
        mol.appendChild(el);
        nodes.set(i, el);
        place(el, k, { s: 0 });
        el.getBoundingClientRect();
      }
      delete el.dataset.leaving;
      place(el, k);
      el.classList.toggle("mid", k === 0);
      el.tabIndex = Math.abs(k) <= 2 ? 0 : -1;
      el.setAttribute("aria-hidden", Math.abs(k) <= 2 ? "false" : "true");
    }
  };
  const setCenter = (c) => {
    const L = list();
    c = Math.max(0, Math.min(L.length - 1, c));
    if (c === center || !layer) return false;
    center = c;
    window.__navScrolls = (window.__navScrolls || 0) + 1;
    render();
    return true;
  };

  const drawBonds = () => {
    if (!layer) return;
    const svg = layer.querySelector("svg"), pts = [];
    for (const [i, el] of [...nodes].sort((a, b) => a[0] - b[0])) {
      const r = el.getBoundingClientRect();
      pts.push({ i, x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width / size });
    }
    let html = "";
    for (let j = 1; j < pts.length; j++) {
      const a = pts[j - 1], b = pts[j];
      if (b.i !== a.i + 1) continue;
      const w = Math.min(a.w, b.w) * 6;
      if (w < 0.4) continue;
      html += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke-width="${w.toFixed(2)}"/>`;
    }
    svg.innerHTML = html;
    raf = requestAnimationFrame(drawBonds);
  };

  const visibleNodes = () => [...nodes.values()].filter((el) => !el.dataset.leaving && Math.abs(+el.dataset.slot) <= 2).sort((a, b) => +a.dataset.slot - +b.dataset.slot);
  const focusMid = () => nodes.get(center)?.focus({ preventScroll: true });

  function activate(el) {
    const i = +el.dataset.index, n = list()[i];
    if (Math.abs(i - center) > 2) return;
    if (i === 0) return openPanel();
    if (n === current()) return close();
    if (!reached(n)) { el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); return; }
    jump(n);
  }

  function open() {
    if (layer || orb.hidden) return;
    const cur = current(), L = list();
    const big = desk() && innerWidth >= 1000;
    step = Math.max(60, Math.min(big ? 150 : 116, (innerWidth - 24) / 4.7));
    size = Math.round(Math.min(big ? 104 : 78, step * (big ? 0.7 : 0.78)));
    center = Math.max(0, L.indexOf(cur));
    const lay = document.createElement("div");
    lay.className = "iw-nav";
    lay.setAttribute("role", "dialog");
    lay.setAttribute("aria-label", "island selector");
    lay.innerHTML = '<svg aria-hidden="true"></svg><div class="mol"></div><div class="iw-navkeys" aria-hidden="true"><span><kbd>&larr;</kbd><kbd>&rarr;</kbd></span><span><kbd>1</kbd><kbd>9</kbd></span><span><kbd>&crarr;</kbd></span><span><kbd>Esc</kbd></span></div>';
    const r = orb.getBoundingClientRect(), mol = lay.querySelector(".mol");
    mol.style.left = r.left + r.width / 2 + "px";
    const my = Math.max(r.top + r.height / 2, size / 2 + 18);
    mol.style.top = my + "px";
    lay.querySelector(".iw-navkeys").style.top = Math.round(my + step * 0.45 + size / 2 + 62) + "px";
    layer = lay;
    nodes = new Map();
    document.body.appendChild(lay);
    for (let k = -3; k <= 3; k++) {
      const i = center + k;
      if (i < 0 || i >= L.length) continue;
      const el = makeNode(i);
      mol.appendChild(el);
      nodes.set(i, el);
      el.style.transition = "none";
      el.style.transform = `translate(0,0) scale(${k === 0 ? 0.95 : 0.3})`;
    }
    lay.getBoundingClientRect();
    for (const el of nodes.values()) el.style.transition = "";
    for (const [i, el] of nodes) { const k = i - center; place(el, k, { delay: Math.abs(k) * 55 }); el.classList.toggle("mid", k === 0); el.tabIndex = Math.abs(k) <= 2 ? 0 : -1; }
    setTimeout(() => { for (const el of nodes.values()) el.style.transitionDelay = ""; }, 400);
    lay.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      drag = { id: e.pointerId, x: e.clientX, c: center };
      dragged = false;
    });
    lay.addEventListener("pointermove", (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 8) dragged = true;
      if (dragged) setCenter(drag.c - Math.round(dx / (step * 0.85)));
    });
    const endDrag = (e) => { if (drag && e.pointerId === drag.id) drag = null; };
    lay.addEventListener("pointerup", endDrag);
    lay.addEventListener("pointercancel", endDrag);
    for (const ev of ["pointerup", "touchstart", "touchend"]) lay.addEventListener(ev, (e) => e.stopPropagation(), { passive: ev.startsWith("touch") });
    lay.addEventListener("click", (e) => {
      e.stopPropagation();
      if (dragged) { dragged = false; return; }
      const el = e.target.closest?.(".node");
      if (el) activate(el); else close();
    });
    lay.addEventListener("wheel", (e) => {
      e.preventDefault();
      e.stopPropagation();
      wheelAcc += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(wheelAcc) < 50) return;
      setCenter(center + Math.sign(wheelAcc));
      wheelAcc = 0;
    }, { passive: false });
    lay.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); setCenter(center - 1); focusMid(); return; }
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); setCenter(center + 1); focusMid(); return; }
      if (e.key === "Home" || e.key === "End") { e.preventDefault(); setCenter(e.key === "Home" ? 0 : list().length - 1); focusMid(); return; }
      if (/^[1-9]$/.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); setCenter(+e.key); focusMid(); return; }
      if (e.key === "i" || e.key === "I") { e.preventDefault(); close(); return; }
      if (e.key === "Tab") {
        const vis = visibleNodes(), at = vis.indexOf(document.activeElement);
        e.preventDefault();
        vis[(at + (e.shiftKey ? -1 : 1) + vis.length) % vis.length]?.focus({ preventScroll: true });
      }
    });
    lay.addEventListener("keyup", (e) => e.stopPropagation());
    orb.classList.add("open");
    orb.setAttribute("aria-expanded", "true");
    requestAnimationFrame(() => lay.classList.add("open"));
    raf = requestAnimationFrame(drawBonds);
    focusMid();
  }

  function close(refocus = true) {
    if (!layer) return closing;
    if (closing) return closing;
    const lay = layer;
    lay.classList.remove("open");
    for (const [i, el] of nodes) { el.style.transitionDelay = (3 - Math.min(3, Math.abs(i - center))) * 40 + "ms"; el.style.transform = "translate(0,0) scale(0.3)"; }
    orb.classList.remove("open");
    orb.setAttribute("aria-expanded", "false");
    if (refocus && !orb.hidden) orb.focus({ preventScroll: true });
    closing = pause(420).then(() => { cancelAnimationFrame(raf); lay.remove(); if (layer === lay) { layer = null; nodes = new Map(); } closing = null; });
    return closing;
  }

  function openPanel() {
    if (sheet) return;
    close(false);
    sheet = document.createElement("div");
    sheet.className = "iw-sheet";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-label", "all islands");
    const panel = document.createElement("div");
    panel.className = "iw-panel";
    const frameEl = document.createElement("iframe");
    frameEl.title = "all islands";
    frameEl.src = startHref() + "?embed=1";
    const x = document.createElement("button");
    x.type = "button";
    x.className = "x";
    x.textContent = "×";
    x.setAttribute("aria-label", "close");
    panel.append(frameEl, x);
    sheet.appendChild(panel);
    for (const ev of ["pointerdown", "pointerup", "touchstart", "touchend", "wheel"]) sheet.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    sheet.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Escape") closePanel(); });
    sheet.addEventListener("click", (e) => { e.stopPropagation(); if (e.target === sheet || e.target === x) closePanel(); });
    document.body.appendChild(sheet);
    orb.classList.add("open");
    x.focus({ preventScroll: true });
  }
  function closePanel(refocus = true) {
    if (!sheet) return;
    sheet.remove();
    sheet = null;
    orb.classList.remove("open");
    if (refocus && !orb.hidden) orb.focus({ preventScroll: true });
  }
  const onMessage = (e) => { if (e.data?.iw === "close") closePanel(); };
  addEventListener("message", onMessage);

  async function jump(n) {
    if (going) return;
    going = true;
    window.__navJumps = (window.__navJumps || 0) + 1;
    const veil = document.createElement("div");
    veil.className = "iw-veil";
    veil.style.background = document.body.style.background || "#000";
    document.body.appendChild(veil);
    try {
      close(false);
      await frame();
      veil.classList.add("on");
      await pause(200);
      await go(n);
      veil.style.background = document.body.style.background || veil.style.background;
      await frame();
      veil.style.transition = "opacity .3s ease-out";
      veil.classList.remove("on");
      await pause(320);
    } catch (e) {
      veil.classList.remove("on");
      console.warn("[nav] jump failed: " + (e?.message || e));
    } finally {
      veil.remove();
      going = false;
      sync();
      if (!orb.hidden) orb.focus({ preventScroll: true });
    }
  }

  for (const ev of ["pointerdown", "pointerup"]) orb.addEventListener(ev, (e) => e.stopPropagation());
  orb.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") e.stopPropagation(); });
  orb.addEventListener("click", (e) => { e.preventDefault(); if (layer && !closing) close(); else open(); });
  const onKey = (e) => {
    if ((e.key === "i" || e.key === "I") && !e.metaKey && !e.ctrlKey && !e.altKey && !e.repeat && !sheet && !(e.target instanceof HTMLInputElement)) { if (layer && !closing) close(); else if (!orb.hidden) open(); return; }
    if (e.key !== "Escape") return; if (sheet) closePanel(); else if (layer) close();
  };
  addEventListener("keydown", onKey);
  return {
    button: orb,
    orb,
    open,
    close,
    sync,
    openPanel,
    closePanel,
    scroll: (d) => setCenter(center + d),
    setCenter,
    get center() { return center; },
    get isOpen() { return !!layer && !closing; },
    get panelOpen() { return !!sheet; },
    arrive,
    finale,
    dispose() { party?.remove(); card?.remove(); clearInterval(timer); cancelAnimationFrame(raf); removeEventListener("keydown", onKey); removeEventListener("message", onMessage); layer?.remove(); sheet?.remove(); orb.remove(); },
  };
}

const framed = () => { try { return window.top !== window; } catch { return true; } };

export function mountUI({ container, rotate = null, zoom = null, nav = {} } = {}) {
  const q = new URLSearchParams(location.search);
  if (!container && (framed() || q.get("ui") === "0" || q.get("hero") === "0")) return null;
  if (!document.getElementById("iw-ui-css")) {
    const st = document.createElement("style");
    st.id = "iw-ui-css";
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  const box = document.createElement("div");
  box.className = "iw-ui" + (container ? " iw-inline" : "");
  const button = (label, title, data, act) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.title = title;
    b.setAttribute("aria-label", title);
    Object.assign(b.dataset, data);
    b.addEventListener("pointerdown", (e) => e.stopPropagation());
    b.addEventListener("click", (e) => { e.preventDefault(); act(); });
    return b;
  };
  const zooms = zoom ? [[-1, "−", "zoom out (-)", "-"], [1, "+", "zoom in (+)", "+"]].map(([step, label, title, key]) => button(label, title, { zoom: String(step), key }, () => zoom(step))) : [];
  const turns = rotate ? [[-1, "⟲", "rotate left (Q)", "Q"], [1, "⟳", "rotate right (E)", "E"]].map(([step, label, title, key]) => button(label, title, { rotate: String(step), key }, () => rotate(step))) : [];
  const KEYED = { Minus: zooms[0], NumpadSubtract: zooms[0], Equal: zooms[1], NumpadAdd: zooms[1], KeyQ: turns[0], KeyE: turns[1] };
  const flash = (e) => {
    const b = KEYED[e.code];
    if (!b || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    b.classList.remove("hit");
    void b.offsetWidth;
    b.classList.add("hit");
    setTimeout(() => b.classList.remove("hit"), 160);
  };
  if (!container) addEventListener("keydown", flash);
  const navigator = nav && !container ? mountNavigator(nav) : null;
  if (!container && !document.querySelector(".iw-home")) {
    const home = document.createElement("a");
    home.className = "iw-home";
    home.href = HOME;
    home.title = "character select";
    home.setAttribute("aria-label", "character select");
    home.innerHTML = BUST;
    home.addEventListener("pointerdown", (e) => e.stopPropagation());
    document.body.appendChild(home);
  }
  box.append(...zooms, ...turns);
  (container || document.body).appendChild(box);
  return { element: box, turns, zooms, navigator, finale: () => navigator?.finale() };
}
