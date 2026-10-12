const data = await (await fetch(new URL("../classes.json", import.meta.url))).json();
const HERO_V = "2";
const heroArt = (id) => new URL(`../hero-${id}.jpg?v=${HERO_V}`, import.meta.url).href;

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
.sc-rows .sc-links{display:flex;gap:8px;justify-content:flex-end;overflow:visible}
.sc-links a{display:grid;place-items:center;width:38px;height:38px;border:2px solid rgba(255,243,224,.35);border-radius:11px;background:rgba(255,243,224,.06);color:#fff3e0;transition:transform .12s,color .12s,border-color .12s,background .12s}
.sc-links a:hover,.sc-links a:focus-visible{transform:translateY(-2px);color:var(--b);border-color:var(--b);background:rgba(255,243,224,.12);outline:none}
.sc-links svg{width:20px;height:20px;fill:currentColor}
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
.sc-att ul{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.sc-att li{display:grid;grid-template-columns:11.5em 1fr 2ch;align-items:center;gap:14px;font-weight:700}
.sc-bar{height:14px;border-radius:999px;background:var(--pan2);box-shadow:inset 0 2px 0 #0005;overflow:hidden}
.sc-bar b{display:block;height:100%;width:0;border-radius:999px;background:var(--b);box-shadow:inset 0 -4px 0 var(--b2);transition:width .6s cubic-bezier(.3,1.3,.5,1)}
.sc-att em{font-style:normal;text-align:right;color:var(--b)}
.sc-hero{grid-area:hero;margin:0;overflow:hidden;min-height:420px;position:relative}
.sc-hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 45%;animation:sc-idle 3.2s ease-in-out infinite}
@keyframes sc-idle{50%{transform:scale(1.025) translateY(-4px)}}
.sc-hero img.swap{animation:sc-hero .62s cubic-bezier(.3,1.6,.5,1)}
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
.sc-cosmos{display:none}
@property --sc-hue{syntax:"<angle>";inherits:true;initial-value:0deg}
@keyframes sc-spin{to{--sc-hue:360deg}}
@keyframes sc-pop{from{transform:translateY(34px) scale(.82) rotate(var(--tw,0deg));opacity:0}}
@keyframes sc-drift{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(4vw,-3vh) scale(1.12)}66%{transform:translate(-3vw,2vh) scale(.94)}}
@keyframes sc-jelly{0%{transform:scale(1)}30%{transform:scale(1.14,.88) rotate(-2deg)}50%{transform:scale(.93,1.08) rotate(1deg)}70%{transform:scale(1.04,.97)}100%{transform:scale(1)}}
@keyframes sc-hero{0%{transform:rotateX(var(--ry,0deg)) rotateY(var(--rx,0deg)) translateY(5%) scale(calc(var(--hs,1)*.84));opacity:.2}60%{transform:rotateX(var(--ry,0deg)) rotateY(var(--rx,0deg)) translateY(-1%) scale(calc(var(--hs,1)*1.05));opacity:1}100%{transform:rotateX(var(--ry,0deg)) rotateY(var(--rx,0deg)) scale(var(--hs,1))}}
@keyframes sc-swap{0%{transform:scale(.4) rotate(-8deg);opacity:0}60%{transform:scale(1.15) rotate(3deg);opacity:1}100%{transform:scale(1)}}
@keyframes sc-twinkle{50%{opacity:.25}}
@keyframes sc-wave{0%,100%{transform:rotate(0)}25%{transform:rotate(-10deg) scale(1.08)}75%{transform:rotate(8deg)}}
@media (min-width:821px) and (hover:hover){
body.t-souls{--sky1:#26193a;--sky2:#120c1c}
.sc{position:relative;z-index:1;max-width:1320px;min-height:100vh;align-content:center;padding:40px 40px 44px;gap:26px 34px;animation:sc-spin 12s linear infinite;--rim:conic-gradient(from var(--sc-hue),#12c4f0,#9a7ae0,#e86aa0,#f5c243,#7cc56a,#12c4f0)}
.sc-cosmos{display:block;position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none}
.sc-cosmos i{position:absolute;border-radius:50%;filter:blur(48px);opacity:.5;animation:sc-drift 22s ease-in-out infinite}
.sc-cosmos i:nth-child(1){left:-10vw;top:-16vh;width:52vw;height:52vw;background:radial-gradient(circle,#9a7ae0,#9a7ae000 68%)}
.sc-cosmos i:nth-child(2){right:-14vw;top:10vh;width:46vw;height:46vw;background:radial-gradient(circle,#e86aa0,#e86aa000 68%);animation-delay:-7s}
.sc-cosmos i:nth-child(3){left:24vw;bottom:-34vh;width:58vw;height:58vw;background:radial-gradient(circle,#12c4f0bb,#12c4f000 68%);animation-delay:-14s}
.sc-cosmos i:nth-child(4){left:62vw;bottom:4vh;width:22vw;height:22vw;background:radial-gradient(circle,#f5c243aa,#f5c24300 68%);animation-duration:15s}
.sc-cosmos b{position:absolute;inset:0;background-image:radial-gradient(1.5px 1.5px at 8% 18%,#fff9 50%,transparent),radial-gradient(1px 1px at 22% 74%,#fff8 50%,transparent),radial-gradient(2px 2px at 46% 9%,#f5c243 50%,transparent),radial-gradient(1px 1px at 63% 41%,#fff8 50%,transparent),radial-gradient(1.5px 1.5px at 81% 86%,#e86aa0 50%,transparent),radial-gradient(1px 1px at 92% 27%,#fff8 50%,transparent),radial-gradient(2px 2px at 35% 55%,#12c4f0 50%,transparent),radial-gradient(1px 1px at 72% 64%,#fff7 50%,transparent);animation:sc-twinkle 3.4s ease-in-out infinite}
.sc-cosmos b+b{transform:rotate(180deg) scale(1.3);animation-delay:-1.7s}
.sc-p{border-radius:28px;border:3px solid transparent;background:linear-gradient(var(--pan),var(--pan)) padding-box,linear-gradient(#ffffff14,#ffffff14) border-box;box-shadow:inset 0 -6px 0 var(--pan2),0 12px 0 #0a0612aa;animation:sc-pop .8s cubic-bezier(.3,1.55,.5,1) both;transition:transform .6s cubic-bezier(.34,1.8,.5,1),box-shadow .2s}
.sc-info{--tw:-3deg;animation-delay:.08s}.sc-att{--tw:3deg;animation-delay:.18s}.sc-hero{--tw:4deg;animation-delay:.28s}
.sc-info:hover,.sc-att:hover{background:linear-gradient(var(--pan),var(--pan)) padding-box,var(--rim) border-box}
.sc-head{animation:sc-pop .7s cubic-bezier(.3,1.6,.5,1) both}
.sc-head img{width:76px;height:76px;border-radius:24px;transition:transform .55s cubic-bezier(.34,1.9,.5,1)}
.sc-head img:hover{animation:sc-wave .7s ease-in-out}
.sc-head h1{font-size:40px;background:linear-gradient(100deg,#fff3e0 0 35%,#f5c243 50%,#e86aa0 65%,#9a7ae0 80%,#12c4f0);background-size:240% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:sc-shine 6s ease-in-out infinite alternate}
@keyframes sc-shine{to{background-position:100% 0}}
.sc-hero{min-height:560px;perspective:900px;background:linear-gradient(var(--pan),var(--pan)) padding-box,var(--rim) border-box;box-shadow:inset 0 -6px 0 var(--pan2),0 12px 0 #0a0612aa,0 0 60px #e86aa044}
.sc-hero img{--hs:1.06;transform:rotateX(var(--ry,0deg)) rotateY(var(--rx,0deg)) scale(var(--hs));transition:transform .7s cubic-bezier(.34,1.6,.5,1);animation:none}
.sc-hero:hover img{transition-duration:.25s}
.sc-links a{border-radius:14px;transition:transform .5s cubic-bezier(.34,1.9,.5,1),color .12s,border-color .12s,background .12s}
.sc-links a:hover,.sc-links a:focus-visible{transform:translateY(-6px) rotate(-10deg) scale(1.15)}
.sc-links a:nth-child(even):hover,.sc-links a:nth-child(even):focus-visible{transform:translateY(-6px) rotate(10deg) scale(1.15)}
.sc-rows .sc-class{background:linear-gradient(#2a2036,#2a2036) padding-box,var(--rim) border-box;border:2px solid transparent;box-shadow:0 0 24px #12c4f033}
.sc-arw{transition:transform .45s cubic-bezier(.34,1.9,.5,1)}
.sc-arw:hover{transform:scale(1.18)}
.sc-arw[data-d="-1"]:hover{transform:translateX(-3px) scale(1.18)}.sc-arw[data-d="1"]:hover{transform:translateX(3px) scale(1.18)}
.sc-arw:active,.sc-arw.hit{transform:scale(.85);transition-duration:.06s}
.sc-class output.swap{animation:sc-swap .5s cubic-bezier(.3,1.6,.5,1)}
.sc-go a{border-radius:18px;transition:transform .55s cubic-bezier(.34,1.9,.5,1),box-shadow .15s}
.sc-go a:hover,.sc-go a:focus-visible{transform:translateY(-5px) rotate(-2deg) scale(1.05);outline:none;box-shadow:inset 0 -4px 0 var(--b2),0 8px 0 #0008,0 0 0 3px #fff3e0,0 0 30px #12c4f088}
.sc-go a.alt:hover,.sc-go a.alt:focus-visible{transform:translateY(-5px) rotate(2deg) scale(1.05);box-shadow:inset 0 -4px 0 #d9c7ae,0 8px 0 #0008,0 0 0 3px #f5c243,0 0 30px #f5c24388}
.sc-go a.go{animation:sc-jelly .55s}
.sc-go a.reset,.sc-go a.reset:hover,.sc-go a.reset:focus-visible{flex:0 0 auto;align-self:center;min-width:0;padding:7px 12px;border-radius:10px;border:2px solid #fff3e033;background:none;color:var(--dim);box-shadow:none;font-size:11px;letter-spacing:.1em;transform:none}
.sc-bar{height:16px}
.sc-bar b{background:linear-gradient(90deg,#12c4f0,#9a7ae0 50%,#e86aa0);box-shadow:inset 0 -4px 0 #0003,0 0 12px #12c4f066;transition:width .9s cubic-bezier(.3,1.5,.5,1)}
.sc-att li:nth-child(2) .sc-bar b{transition-delay:.04s}.sc-att li:nth-child(3) .sc-bar b{transition-delay:.08s}.sc-att li:nth-child(4) .sc-bar b{transition-delay:.12s}.sc-att li:nth-child(5) .sc-bar b{transition-delay:.16s}.sc-att li:nth-child(6) .sc-bar b{transition-delay:.2s}
.sc-att em{font:900 18px/1 var(--round)}
.sc-keys{gap:28px;font-size:14px;animation:sc-pop .8s .4s cubic-bezier(.3,1.6,.5,1) both}
.sc-keys kbd{display:inline-block;padding:6px 9px;border-radius:9px;box-shadow:inset 0 -3px 0 #d9c7ae,0 3px 0 #0007;transition:transform .35s cubic-bezier(.34,1.9,.5,1),background .1s}
.sc-keys kbd.on{transform:translateY(3px) scale(.92);background:#12c4f0;color:#10202a;transition-duration:.05s}
}
@media (min-width:1600px) and (hover:hover){.sc{max-width:1480px;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr)}.sc-hero{min-height:640px}}
@media (prefers-reduced-motion:reduce){.sc-cosmos i,.sc-cosmos b,.sc,.sc-p,.sc-head,.sc-keys,.sc-hero img{animation:none!important}}
`;

const GLYPHS = {
  behance: "M16.969 16.927a2.561 2.561 0 0 0 1.901.677 2.501 2.501 0 0 0 1.531-.475c.362-.235.636-.584.779-.99h2.585a5.091 5.091 0 0 1-1.9 2.896 5.292 5.292 0 0 1-3.091.88 5.839 5.839 0 0 1-2.284-.433 4.871 4.871 0 0 1-1.723-1.211 5.657 5.657 0 0 1-1.08-1.874 7.057 7.057 0 0 1-.383-2.393c-.005-.8.129-1.595.396-2.349a5.313 5.313 0 0 1 5.088-3.604 4.87 4.87 0 0 1 2.376.563c.661.362 1.231.87 1.668 1.485a6.2 6.2 0 0 1 .943 2.133c.194.821.263 1.666.205 2.508h-7.699c-.063.79.184 1.574.688 2.187ZM6.947 4.084a8.065 8.065 0 0 1 1.928.198 4.29 4.29 0 0 1 1.49.638c.418.303.748.711.958 1.182.241.579.357 1.203.341 1.83a3.506 3.506 0 0 1-.506 1.961 3.726 3.726 0 0 1-1.503 1.287 3.588 3.588 0 0 1 2.027 1.437c.464.747.697 1.615.67 2.494a4.593 4.593 0 0 1-.423 2.032 3.945 3.945 0 0 1-1.163 1.413 5.114 5.114 0 0 1-1.683.807 7.135 7.135 0 0 1-1.928.259H0V4.084h6.947Zm-.235 12.9c.308.004.616-.029.916-.099a2.18 2.18 0 0 0 .766-.332c.228-.158.411-.371.534-.619.142-.317.208-.663.191-1.009a2.08 2.08 0 0 0-.642-1.715 2.618 2.618 0 0 0-1.696-.505h-3.54v4.279h3.471Zm13.635-5.967a2.13 2.13 0 0 0-1.654-.619 2.336 2.336 0 0 0-1.163.259 2.474 2.474 0 0 0-.738.62 2.359 2.359 0 0 0-.396.792c-.074.239-.12.485-.137.734h4.769a3.239 3.239 0 0 0-.679-1.785l-.002-.001Zm-13.813-.648a2.254 2.254 0 0 0 1.423-.433c.399-.355.607-.88.56-1.413a1.916 1.916 0 0 0-.178-.891 1.298 1.298 0 0 0-.495-.533 1.851 1.851 0 0 0-.711-.274 3.966 3.966 0 0 0-.835-.073H3.241v3.631h3.293v-.014ZM21.62 5.122h-5.976v1.527h5.976V5.122Z",
  github: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
  linkedin: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  soundcloud: "M23.999 14.165c-.052 1.796-1.612 3.169-3.4 3.169h-8.18a.68.68 0 0 1-.675-.683V7.862a.747.747 0 0 1 .452-.724s.75-.513 2.333-.513a5.364 5.364 0 0 1 2.763.755 5.433 5.433 0 0 1 2.57 3.54c.282-.08.574-.121.868-.12.884 0 1.73.358 2.347.992s.948 1.49.922 2.373ZM10.721 8.421c.247 2.98.427 5.697 0 8.672a.264.264 0 0 1-.53 0c-.395-2.946-.22-5.718 0-8.672a.264.264 0 0 1 .53 0ZM9.072 9.448c.285 2.659.37 4.986-.006 7.655a.277.277 0 0 1-.55 0c-.331-2.63-.256-5.02 0-7.655a.277.277 0 0 1 .556 0Zm-1.663-.257c.27 2.726.39 5.171 0 7.904a.266.266 0 0 1-.532 0c-.38-2.69-.257-5.21 0-7.904a.266.266 0 0 1 .532 0Zm-1.647.77a26.108 26.108 0 0 1-.008 7.147.272.272 0 0 1-.542 0 27.955 27.955 0 0 1 0-7.147.275.275 0 0 1 .55 0Zm-1.67 1.769c.421 1.865.228 3.5-.029 5.388a.257.257 0 0 1-.514 0c-.21-1.858-.398-3.549 0-5.389a.272.272 0 0 1 .543 0Zm-1.655-.273c.388 1.897.26 3.508-.01 5.412-.026.28-.514.283-.54 0-.244-1.878-.347-3.54-.01-5.412a.283.283 0 0 1 .56 0Zm-1.668.911c.4 1.268.257 2.292-.026 3.572a.257.257 0 0 1-.514 0c-.241-1.262-.354-2.312-.023-3.572a.283.283 0 0 1 .563 0Z",
};

function mount(root, k) {
  const P = data.person, C = data.classes;
  const years = new Date().getFullYear() - P.since;
  const links = P.links.map((l) => `<a href="${l.url}" target="_blank" rel="noopener" aria-label="${l.label}" title="${l.label}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${GLYPHS[l.icon] || ""}"/></svg></a>`).join("");
  root.innerHTML = `<div class="sc-cosmos" aria-hidden="true"><i></i><i></i><i></i><i></i><b></b><b></b></div><div class="sc">
<header class="sc-head"><img src="${k.bust}" alt="" width="480" height="540"><div><small>Create Character</small><h1>${P.name}</h1></div></header>
<section class="sc-info sc-p" aria-label="Details">
<dl class="sc-rows">
<div><dt>Name</dt><dd>${P.name}</dd></div>
<div><dt>Based</dt><dd>${P.location}</dd></div>
<div><dt>Email</dt><dd><a id="sc-mail" href="#">email</a></dd></div>
<div><dt>Level</dt><dd>${years} years building software</dd></div>
${links ? `<div><dt>Links</dt><dd class="sc-links">${links}</dd></div>` : ""}
<div class="sc-class"><dt>Class</dt><dd><button type="button" class="sc-arw" data-d="-1" aria-label="Previous class">&#9664;</button><output id="sc-cls" aria-live="polite"></output><button type="button" class="sc-arw" data-d="1" aria-label="Next class">&#9654;</button></dd></div>
</dl>
<div class="sc-go"><a id="sc-begin" href="#">Begin</a><a id="sc-cont" class="alt" href="#" hidden>Continue<small id="sc-where"></small></a></div>
</section>
<section class="sc-att sc-p" aria-label="Attributes"><ul id="sc-stats">${"<li><span></span><i class=\"sc-bar\"><b></b></i><em></em></li>".repeat(6)}</ul></section>
<figure class="sc-hero sc-p"><img id="sc-hero" alt="" width="900" height="1000"></figure>
<footer class="sc-keys"><span><kbd>&larr;</kbd><kbd>&rarr;</kbd>Class</span><span><kbd>F</kbd><kbd>Enter</kbd>Begin</span><span><kbd>Tab</kbd>Move</span></footer>
</div>`;
  const $ = (s) => root.querySelector(s);
  const mailEl = $("#sc-mail");
  if (mailEl && P.mail) { const m = atob(P.mail).split("").reverse().join(""); mailEl.textContent = m; mailEl.href = "mailto:" + m; }
  const cls = $("#sc-cls"), rows = [...$("#sc-stats").children], begin = $("#sc-begin");
  const q = new URLSearchParams(location.search).get("class");
  const stored = () => { try { return localStorage.getItem("isoworld:class"); } catch { return null; } };
  let at = Math.max(0, C.findIndex((c) => c.id === (q || stored() || data.default)));
  const heroImg = $("#sc-hero");
  const art = Object.fromEntries(C.map((c) => { const im = new Image(); im.src = heroArt(c.id); im.decode?.().catch(() => {}); return [c.id, im]; }));
  const show = (i, first) => {
    at = (i + C.length) % C.length;
    const c = C[at];
    cls.textContent = c.name;
    try { localStorage.setItem("isoworld:class", c.id); } catch {}
    heroImg.src = art[c.id].src;
    heroImg.alt = `${c.name} class hero on a golden island`;
    if (!first) { cls.classList.remove("swap"); heroImg.classList.remove("swap"); void cls.offsetWidth; cls.classList.add("swap"); heroImg.classList.add("swap"); }
    rows.forEach((r, j) => {
      const [n, v] = c.stats[j];
      r.children[0].textContent = n;
      r.children[2].textContent = v;
      r.setAttribute("aria-label", `${n} ${v} of 10`);
      requestAnimationFrame(() => requestAnimationFrame(() => { r.children[1].firstChild.style.width = v * 10 + "%"; }));
    });
  };
  root.querySelectorAll(".sc-arw").forEach((b) => k.on(b, "click", () => show(at + +b.dataset.d)));
  const caps = [...root.querySelectorAll(".sc-keys kbd")], arw = [...root.querySelectorAll(".sc-arw")];
  const CAP = { ArrowLeft: 0, ArrowUp: 0, ArrowRight: 1, ArrowDown: 1, f: 2, F: 2, Enter: 3, Tab: 4 };
  const press = (el) => { if (!el) return; el.classList.add("on", "hit"); setTimeout(() => el.classList.remove("on", "hit"), 140); };
  k.on(document, "keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    press(caps[CAP[e.key]]);
    if (CAP[e.key] === 0) press(arw[0]); else if (CAP[e.key] === 1) press(arw[1]);
    const d = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
    if (d) { e.preventDefault(); show(at + d); return; }
    const onLink = e.target instanceof HTMLAnchorElement || e.target instanceof HTMLButtonElement;
    if (e.key === "f" || e.key === "F" || (e.key === "Enter" && !onLink)) { e.preventDefault(); const t = $("#sc-cont").hidden ? begin : $("#sc-cont"); t.classList.add("go"); t.click(); }
  });
  const hero = $(".sc-hero");
  k.on(hero, "pointermove", (e) => {
    const r = hero.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    hero.style.setProperty("--rx", (x * 14).toFixed(2) + "deg");
    hero.style.setProperty("--ry", (y * -12).toFixed(2) + "deg");
  });
  k.on(hero, "pointerleave", () => { hero.style.removeProperty("--rx"); hero.style.removeProperty("--ry"); });
  show(at, true);
  return { begin, cont: $("#sc-cont"), label: $("#sc-where") };
}

export default { title: "Create Character", css, mount };
