import { execSync } from "node:child_process";
import sharp from "sharp";

const API = "https://generativelanguage.googleapis.com/v1beta";
const RATE = { in: 0.5 / 1e6, out: 3.0 / 1e6 };

export const key = () => {
  try { return execSync("security find-generic-password -s dev.blacksmith.generator -a gemini -w", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); }
  catch { return process.env.GEMINI_API_KEY || ""; }
};

let cached;
export async function pickModel() {
  if (process.env.PIPELINE_VISION_MODEL) return process.env.PIPELINE_VISION_MODEL;
  if (cached) return cached;
  const r = await fetch(`${API}/models?pageSize=500&key=${key()}`);
  const j = await r.json();
  const ok = (j.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    .map((n) => [n, n.match(/^gemini-(\d+(?:\.\d+)?)-flash$/)])
    .filter(([, m]) => m)
    .sort((a, b) => +b[1][1] - +a[1][1]);
  if (!ok.length) throw new Error("no flash vision model listed");
  return (cached = ok[0][0]);
}

export async function imagePart(file, max = 1024, enlarge = false) {
  const buf = await sharp(file).flatten({ background: "#ffffff" }).resize(max, max, { fit: "inside", withoutEnlargement: !enlarge, kernel: enlarge ? "nearest" : "lanczos3" }).jpeg({ quality: 90 }).toBuffer();
  return { inlineData: { mimeType: "image/jpeg", data: buf.toString("base64") } };
}

export const spend = { calls: 0, inTok: 0, outTok: 0, get usd() { return this.inTok * RATE.in + this.outTok * RATE.out; } };

export async function askJSON(parts, validate, { temperature = 0.2, retries = 1 } = {}) {
  const model = await pickModel();
  let last = "";
  for (let attempt = 0; attempt <= retries; attempt++) {
    const extra = attempt && last ? [{ text: `Your previous answer failed validation: ${last}. Return the full corrected JSON only.` }] : [];
    const r = await fetch(`${API}/models/${model}:generateContent?key=${key()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [...parts, ...extra] }], generationConfig: { responseMimeType: "application/json", temperature, maxOutputTokens: 32768 } }),
    });
    const j = await r.json();
    spend.calls++;
    spend.inTok += j.usageMetadata?.promptTokenCount || 0;
    spend.outTok += (j.usageMetadata?.candidatesTokenCount || 0) + (j.usageMetadata?.thoughtsTokenCount || 0);
    const raw = j.candidates?.[0]?.content?.parts?.filter((p) => p.text && !p.thought).map((p) => p.text).join("") || "";
    if (!raw) { last = `empty response ${JSON.stringify(j.error || j.promptFeedback || {}).slice(0, 200)}`; continue; }
    let data;
    if (process.env.PIPELINE_DEBUG) (await import("node:fs")).writeFileSync(`${process.env.PIPELINE_DEBUG}.${attempt}.txt`, `${j.candidates?.[0]?.finishReason}\n${raw}`);
    try { data = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, "")); } catch (e) { last = `invalid JSON (${e.message})`; continue; }
    const errs = validate(data);
    if (!errs.length) return { data, model };
    last = errs.slice(0, 12).join("; ");
  }
  throw new Error(`vision model output invalid after ${retries + 1} tries: ${last}`);
}
