const meta = () => document.querySelector('meta[name="viewport"]');

function resetZoom() {
  const m = meta();
  if (!m || !window.visualViewport || window.visualViewport.scale <= 1.01) return;
  const base = m.content;
  m.content = base + ",maximum-scale=1";
  requestAnimationFrame(() => { m.content = base; });
}

export function guardPageZoom() {
  if (window.__noZoom) return;
  window.__noZoom = true;
  const st = document.createElement("style");
  st.textContent = "html,body,body *{touch-action:manipulation}canvas,.iw-band,.iw-band *{touch-action:none}html,body,body *{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}input,textarea,[contenteditable]{-webkit-user-select:text;user-select:text}";
  document.head.appendChild(st);
  for (const t of ["gesturestart", "gesturechange", "gestureend"]) document.addEventListener(t, (e) => e.preventDefault(), { passive: false });
  document.addEventListener("dblclick", (e) => e.preventDefault(), { passive: false });
  const editable = (n) => n instanceof Element && n.closest("input,textarea,[contenteditable]");
  document.addEventListener("selectstart", (e) => { if (!editable(e.target)) e.preventDefault(); });
  document.addEventListener("contextmenu", (e) => { if (!editable(e.target)) e.preventDefault(); });
  document.addEventListener("selectionchange", () => {
    const sel = document.getSelection();
    if (sel && !sel.isCollapsed && !editable(sel.anchorNode?.parentElement)) sel.removeAllRanges();
  });
  window.visualViewport?.addEventListener("resize", resetZoom);
  resetZoom();
}
