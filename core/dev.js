const K = "isoworld:unlock";
try {
  const q = new URLSearchParams(location.search);
  if (q.has("unlock")) q.get("unlock") === "0" ? localStorage.setItem(K, "0") : localStorage.setItem(K, "1");
} catch {}

export const unlocked = () => {
  let v = null;
  try { v = localStorage.getItem(K); } catch {}
  return v === "1" || (v !== "0" && location.port === "8766");
};

export const resetAll = () => {
  try { for (const k of Object.keys(localStorage)) if (k.startsWith("isoworld:") && k !== K) localStorage.removeItem(k); } catch {}
};
