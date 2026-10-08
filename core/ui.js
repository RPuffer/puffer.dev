const CSS = `
.iw-ui{position:fixed;right:max(8px,env(safe-area-inset-right,0px));bottom:max(8px,env(safe-area-inset-bottom,0px));z-index:20;display:flex;gap:6px;align-items:center;padding:6px 8px;border-radius:8px;background:rgba(30,30,30,.72);color:#eee;font:12px/1.2 system-ui,sans-serif;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}
.iw-ui.iw-inline{position:static;background:none;padding:0}
@media (max-width:560px){.iw-ui:not(.iw-inline){top:max(8px,env(safe-area-inset-top,0px));bottom:auto}}
.iw-ui button{font:15px/1 system-ui,sans-serif;color:#eee;background:#444;border:1px solid #555;border-radius:6px;padding:4px 8px;cursor:pointer;touch-action:manipulation}
.iw-ui button:active{background:#666}
.iw-ui a{font:inherit;color:#eee;background:#444;border:1px solid #555;border-radius:6px;padding:5px 9px;text-decoration:none}
`;

export const startHref = () => new URL("../index.html", import.meta.url).href;

const framed = () => { try { return window.top !== window; } catch { return true; } };

export function mountUI({ container, rotate = null } = {}) {
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
  const islands = document.createElement("a");
  islands.textContent = "islands";
  islands.href = startHref();
  const turns = rotate ? [[-1, "⟲", "rotate left (Q)"], [1, "⟳", "rotate right (E)"]].map(([step, label, title]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.title = title;
    b.setAttribute("aria-label", title);
    b.dataset.rotate = String(step);
    b.addEventListener("pointerdown", (e) => e.stopPropagation());
    b.addEventListener("click", (e) => { e.preventDefault(); rotate(step); });
    return b;
  }) : [];
  box.append(...turns, islands);
  (container || document.body).appendChild(box);
  return { element: box, link: islands, turns };
}
