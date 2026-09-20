// Independent positional diff: poppler bbox of the official source vs the delivered artifact.
import { execFileSync } from "node:child_process";
const words = (f) => {
  const xml = execFileSync("pdftotext", ["-bbox", f, "-"], { encoding: "utf8", maxBuffer: 1 << 28 });
  const out = []; let page = 0;
  for (const line of xml.split("\n")) {
    if (/<page /.test(line)) page++;
    const m = line.match(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/);
    if (m) out.push({ page, x: +m[1], y: +m[2], x2: +m[3], y2: +m[4], t: m[5] });
  }
  return out;
};
const [a, b] = [words(process.argv[2]), words(process.argv[3])];
const key = (w) => `${w.page}|${w.t}`;
const byKey = new Map();
for (const w of a) { if (!byKey.has(key(w))) byKey.set(key(w), []); byKey.get(key(w)).push(w); }
let moved = 0, matched = 0; const samples = [];
for (const w of b) {
  const cands = byKey.get(key(w)); if (!cands || !cands.length) continue;
  let best = null, bd = Infinity;
  for (const c of cands) { const d = Math.hypot(c.x - w.x, c.y - w.y); if (d < bd) { bd = d; best = c; } }
  matched++;
  if (bd > 3) { moved++; if (samples.length < 12) samples.push({ page: w.page, word: w.t, official: [best.x, best.y], delivered: [w.x, w.y], dx: +(w.x - best.x).toFixed(1), dy: +(w.y - best.y).toFixed(1) }); }
  const i = cands.indexOf(best); cands.splice(i, 1);
}
const offPage = b.filter(w => w.x < 0 || w.x2 > 612.5);
console.log(JSON.stringify({ officialWords: a.length, deliveredWords: b.length, matched, movedMoreThan3pt: moved, offLeftOrRightEdge: offPage.length, offPageSample: offPage.slice(0, 8), samples }, null, 1));
