const CSS = `
.iw-ui{position:fixed;right:max(8px,env(safe-area-inset-right,0px));bottom:max(8px,env(safe-area-inset-bottom,0px));z-index:20;display:flex;gap:6px;align-items:center;padding:6px 8px;border-radius:8px;background:rgba(30,30,30,.72);color:#eee;font:12px/1.2 system-ui,sans-serif;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}
.iw-ui.iw-inline{position:static;background:none;padding:0}
@media (max-width:560px){.iw-ui:not(.iw-inline){top:max(8px,env(safe-area-inset-top,0px));bottom:auto}}
.iw-ui input,.iw-ui button,.iw-ui a{font:inherit;color:#eee;background:#444;border:1px solid #555;border-radius:6px;padding:5px 9px;text-decoration:none}
.iw-ui input{width:6.5em}
.iw-ui button{background:#f5c243;color:#222;border-color:#f5c243;cursor:pointer}
`;

export const randomSeed = () => String(1 + Math.floor(Math.random() * 999999));

export function islandQuery(seed, keep = "") {
  const q = new URLSearchParams(keep);
  for (const k of ["level", "seed", "spawn", "center"]) q.delete(k);
  q.set("level", "gen");
  q.set("seed", String(seed).trim() || randomSeed());
  return "?" + q.toString();
}

export function homeQuery(keep = "") {
  const q = new URLSearchParams(keep);
  for (const k of ["level", "seed", "spawn", "center"]) q.delete(k);
  q.set("level", "home");
  q.set("seed", "1");
  return "?" + q.toString();
}

const framed = () => { try { return window.top !== window; } catch { return true; } };

export function mountUI({ container, navigate } = {}) {
  const q = new URLSearchParams(location.search);
  if (!container && (framed() || q.get("ui") === "0" || q.get("hero") === "0")) return null;
  const keep = () => location.search;
  const go = navigate || ((s) => { location.search = s; });
  if (!document.getElementById("iw-ui-css")) {
    const st = document.createElement("style");
    st.id = "iw-ui-css";
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  const box = document.createElement("div");
  box.className = "iw-ui" + (container ? " iw-inline" : "");
  const label = document.createElement("label");
  label.textContent = "seed ";
  const input = document.createElement("input");
  input.inputMode = "numeric";
  input.value = q.get("seed") || "";
  input.setAttribute("aria-label", "island seed");
  label.appendChild(input);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "new island";
  const home = document.createElement("a");
  home.textContent = "home";
  home.href = homeQuery(keep());
  box.append(label, btn, home);
  input.addEventListener("change", () => { if (input.value.trim()) go(islandQuery(input.value, keep())); });
  btn.addEventListener("click", () => { const s = randomSeed(); input.value = s; go(islandQuery(s, keep())); });
  home.addEventListener("click", (e) => { e.preventDefault(); input.value = "1"; go(homeQuery(keep())); });
  (container || document.body).appendChild(box);
  return { element: box, input, setSeed: (s) => { input.value = s; } };
}
