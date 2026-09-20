/*
 * VF01: measure a family's added ink against the write boxes its own field
 * census holds, for families whose field map carries no widget geometry.
 *
 *   node .../census-box-check.mjs <familyDirectory> <censusFile>
 *
 * Word boxes come from pdftotext -bbox on the blank source and on each artifact;
 * the difference is the ink this build added. Each added word is then tested
 * against every census widget rect on its page: is it inside one, and does it
 * stay inside the one it starts in.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const DIR = process.argv[2];
const CENSUS = process.argv[3] ?? `${DIR}/field-census.census-v1.json`;
const ML = process.env.MASTER_LIBRARY_SOURCE_DIR;
const j = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const receipt = j(`${DIR}/source-receipt.json`);
const census = j(CENSUS);
const rendered = j(`${DIR}/reports/rendered-artifacts.json`);
const fmap = j(`${DIR}/production-field-map.json`);

const wordsOf = (file) => {
  const xml = execFileSync("pdftotext", ["-bbox", file, "-"], { encoding: "utf8", maxBuffer: 1 << 28 });
  const o = []; let page = 0, pw = 612, ph = 792;
  for (const line of xml.split("\n")) {
    const pm = line.match(/<page width="([\d.]+)" height="([\d.]+)">/);
    if (pm) { page++; pw = +pm[1]; ph = +pm[2]; }
    const m = line.match(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/);
    if (m) o.push({ page, x: +m[1], y: +m[2], x2: +m[3], y2: +m[4], t: m[5], pw, ph });
  }
  return o;
};

const src = wordsOf(path.join(ML, receipt.documents[0].pathInArchive));
const srcKey = new Set(src.map((w) => `${w.page}|${w.t}|${w.x.toFixed(1)}|${w.y.toFixed(1)}`));
const pageH = new Map();
for (const g of census.documents[0].pageGeometry ?? []) pageH.set(g.page, g.height);

const boxes = [];
for (const f of census.documents[0].fields ?? []) {
  for (const w of f.widgets ?? []) {
    const ph = pageH.get(w.page) ?? 792;
    boxes.push({ field: f.name, page: w.page, x0: w.rect.x, x1: w.rect.x + w.rect.width, top: ph - (w.rect.y + w.rect.height), bot: ph - w.rect.y });
  }
}
const decision = new Map((fmap.documents[0].fields ?? []).map((f) => [f.field, f.decision]));
console.log(`census boxes: ${boxes.length} over ${census.documents[0].fieldCount} fields`);

for (const art of rendered.artifacts ?? rendered.pdfs ?? []) {
  const ws = wordsOf(art.file);
  const added = ws.filter((w) => !srcKey.has(`${w.page}|${w.t}|${w.x.toFixed(1)}|${w.y.toFixed(1)}`));
  const offPage = ws.filter((w) => w.x < -0.5 || w.x2 > w.pw + 0.5 || w.y < -0.5 || w.y2 > w.ph + 0.5);
  const outside = [], over = [], touched = new Set();
  for (const w of added) {
    const cy = (w.y + w.y2) / 2;
    const hit = boxes.filter((b) => b.page === w.page && cy >= b.top - 1 && cy <= b.bot + 1 && w.x2 > b.x0 - 1 && w.x < b.x1 + 1);
    if (!hit.length) { outside.push({ page: w.page, word: w.t, at: [+w.x.toFixed(1), +w.y.toFixed(1)] }); continue; }
    for (const b of hit) touched.add(b.field);
    const best = hit.reduce((a, b) => ((b.x1 - b.x0) > (a.x1 - a.x0) ? a : b));
    const dx = w.x2 - best.x1;
    if (dx > 1) over.push({ field: best.field, page: w.page, word: w.t, over: +dx.toFixed(2) });
  }
  const refusedTouched = [...touched].filter((n) => decision.get(n) && decision.get(n) !== "write");
  console.log(`\n=== ${art.fixture} (builder reports ${art.fieldsWritten ?? "?"} written, ${art.fieldsRefused ?? "?"} refused)`);
  console.log("  added words:", added.length, "| outside every census write box:", outside.length, JSON.stringify(outside.slice(0, 8)));
  console.log("  added words past the box they sit in:", over.length, JSON.stringify(over.slice(0, 8)));
  console.log("  words outside the page MediaBox:", offPage.length, JSON.stringify(offPage.slice(0, 5).map((w) => ({ page: w.page, word: w.t, x2: +w.x2.toFixed(1), pw: w.pw }))));
  console.log("  census boxes that received ink:", touched.size, "| of them REFUSED by the map:", JSON.stringify(refusedTouched));
}
