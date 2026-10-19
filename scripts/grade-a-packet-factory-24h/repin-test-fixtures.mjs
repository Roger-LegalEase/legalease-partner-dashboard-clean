// Test fixtures built from a historical receipt must measure one drift at a time. A record refreshed
// separately later (the 2026-10-19 census landing) would otherwise ride into the plan under test.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

// Every pin except keepPath whose bytes have moved since the receipt was written is set, lexically, to
// the bytes on disk; the receipt text is otherwise untouched, so escaped receipts stay byte-exact.
export function isolateDrift(text, keepPath, root) {
  const pins = [];
  const walk = (x) => {
    if (Array.isArray(x)) return x.forEach(walk);
    if (!x || typeof x !== "object") return;
    const at = x.pathInRepository ?? x.path;
    if (typeof at === "string" && typeof x.sha256 === "string") pins.push({ at, sha256: x.sha256, byteLength: x.byteLength });
    Object.values(x).forEach(walk);
  };
  walk(JSON.parse(text));
  let out = text;
  for (const pin of pins) {
    if (pin.at === keepPath) continue;
    let bytes;
    try { bytes = fs.readFileSync(path.join(root, pin.at)); } catch { continue; } // unmounted custody stays as recorded
    const now = sha256(bytes);
    if (now === pin.sha256) continue;
    const re = typeof pin.byteLength === "number"
      ? new RegExp(`"sha256": "${pin.sha256}"(,\\s*"byteLength": )${pin.byteLength}(?!\\d)`, "g")
      : new RegExp(`"sha256": "${pin.sha256}"`, "g");
    const hits = out.match(re) ?? [];
    if (hits.length !== 1) throw new Error(`cannot isolate the drift of ${pin.at}: ${hits.length} lexical matches`);
    out = out.replace(re, typeof pin.byteLength === "number" ? `"sha256": "${now}"$1${bytes.length}` : `"sha256": "${now}"`);
  }
  return out;
}
