import fs from "node:fs";
import { createRequire } from "node:module";
import { extractTextItems, groupIntoLines } from "/home/user/legalease-partner-dashboard-clean/.claude/worktrees/kspath/scripts/rcap-official-forms/rcap-pdf-anchor-capture.mjs";
const require = createRequire("/home/user/legalease-partner-dashboard-clean/package.json");
const { PDFDocument } = require("pdf-lib");
const KEYS = [
  "obligation:track-pathway:KS:ks-12-4516-municipal:municipal-conviction-or-diversion-expungement-under-12-4516",
  "obligation:track-pathway:KS:ks-12-4516a-municipal-arrest:municipal-arrest-record-expungement-under-12-4516a",
];
const LABELS = [
  "Municipal conviction or diversion expungement - K.S.A. 12-4516",
  "Municipal arrest record expungement - K.S.A. 12-4516a",
];
const textOf = async (f) => {
  const doc = await PDFDocument.load(fs.readFileSync(f), { ignoreEncryption: true, updateMetadata: false });
  return doc.getPages().flatMap((p) => groupIntoLines(extractTextItems(p)).map((l) => (l.text ?? "").toString().trim()).filter(Boolean));
};
/* Remove the whole printed route footer, however it wrapped: the `Route:` line
 * (or `Route: <label>` on one line), then any continuation lines that
 * concatenate into one of the declared machine keys. Everything else must match. */
const stripRouteFooter = (lines) => {
  const out = []; const found = [];
  for (let i = 0; i < lines.length; i += 1) {
    const t = lines[i];
    const oneLine = LABELS.find((l) => t === `Route: ${l}`);
    if (oneLine) { found.push(oneLine); continue; }
    if (t !== "Route:") { out.push(t); continue; }
    let acc = ""; let j = i + 1;
    while (j < lines.length && KEYS.some((k) => k.startsWith(acc + lines[j]))) { acc += lines[j]; j += 1; }
    if (!KEYS.includes(acc)) throw new Error(`a Route: footer at line ${i} did not reconstruct a declared key: ${JSON.stringify(acc)}`);
    found.push(acc); i = j - 1;
  }
  return { lines: out, found };
};
const [a, b] = process.argv.slice(2);
const A = stripRouteFooter(await textOf(a)), B = stripRouteFooter(await textOf(b));
let diffs = 0;
const n = Math.max(A.lines.length, B.lines.length);
for (let i = 0; i < n; i += 1) if (A.lines[i] !== B.lines[i]) { if (diffs < 5) console.log(`  [${i}] OLD ${JSON.stringify(A.lines[i])} / NEW ${JSON.stringify(B.lines[i])}`); diffs += 1; }
console.log(`${a.split("/").slice(-2).join("/")}: non-footer lines ${A.lines.length} -> ${B.lines.length}, differences ${diffs}; footers old ${A.found.length} new ${B.found.length}`);
