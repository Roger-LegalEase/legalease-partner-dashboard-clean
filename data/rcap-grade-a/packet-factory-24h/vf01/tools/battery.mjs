/*
 * VF01 independent measurement battery.
 *
 * Reads one packet family and measures, from the bytes in this worktree, the
 * things a verifier must not take from the builder's report: the source hash,
 * every artifact hash, the page order against the blank source, the ink this
 * build added, which of that ink lands inside a declared write box, which lands
 * in a protected or required-before-filing box, and whether every declared write
 * produced ink at all.
 *
 *   node data/rcap-grade-a/packet-factory-24h/vf01/tools/battery.mjs <familyDirectory> [--json <out>]
 *
 * It writes nothing except the optional --json dump. It decides no verdict:
 * every number it prints is an input to a verdict a person writes.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const DIR = process.argv[2];
const OUT = process.argv.includes("--json") ? process.argv[process.argv.indexOf("--json") + 1] : null;
const ML = process.env.MASTER_LIBRARY_SOURCE_DIR;
if (!DIR) { console.error("usage: battery.mjs <familyDirectory>"); process.exit(2); }
const j = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const has = (p) => fs.existsSync(p);
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const out = { directory: DIR };

// ---------- files present ----------
out.files = fs.readdirSync(DIR).sort();
const receipt = has(`${DIR}/source-receipt.json`) ? j(`${DIR}/source-receipt.json`) : null;
const wiring = has(`${DIR}/product-wiring.json`) ? j(`${DIR}/product-wiring.json`) : null;
const rendered = has(`${DIR}/reports/rendered-artifacts.json`) ? j(`${DIR}/reports/rendered-artifacts.json`) : null;
const writes = has(`${DIR}/reports/actual-writes.json`) ? j(`${DIR}/reports/actual-writes.json`) : null;
const fmap = has(`${DIR}/production-field-map.json`) ? j(`${DIR}/production-field-map.json`) : null;
const blanks = has(`${DIR}/reports/blanks-left-for-the-participant.json`) ? j(`${DIR}/reports/blanks-left-for-the-participant.json`) : null;
const instr = has(`${DIR}/participant-instructions.md`) ? fs.readFileSync(`${DIR}/participant-instructions.md`, "utf8") : "";
out.instructionsBytes = instr.length;

// ---------- SOURCE IDENTITY: recompute every bound source from the corpus ----------
out.sources = (receipt?.documents ?? []).map((d) => {
  const abs = d.pathInArchive ? path.join(ML ?? "", d.pathInArchive) : null;
  const present = abs && has(abs);
  return {
    documentId: d.documentId,
    pathInArchive: d.pathInArchive ?? null,
    declaredSha256: d.sha256 ?? null,
    presentInCorpus: !!present,
    recomputedSha256: present ? sha(abs) : null,
    declaredByteLength: d.byteLength ?? null,
    actualByteLength: present ? fs.statSync(abs).size : null,
    matches: present ? sha(abs) === d.sha256 && fs.statSync(abs).size === d.byteLength : null,
  };
});

// ---------- ARTIFACTS: rehash everything rendered-artifacts names ----------
const artFiles = [];
for (const p of rendered?.pdfs ?? []) artFiles.push({ role: `pdf:${p.fixture ?? p.documentId}`, file: p.file, sha256: p.sha256, byteLength: p.byteLength });
for (const r of rendered?.rasters ?? []) {
  if (r.contactSheet) artFiles.push({ role: `contact:${r.fixture}`, file: r.contactSheet.file, sha256: r.contactSheet.sha256, byteLength: r.contactSheet.byteLength });
  for (const pg of r.pages ?? []) artFiles.push({ role: `raster:${r.fixture}:${pg.page}`, file: pg.file, sha256: pg.sha256, byteLength: pg.byteLength });
}
const bad = [], absent = [];
for (const a of artFiles) {
  if (!has(a.file)) { absent.push(a.file); continue; }
  const h = sha(a.file), n = fs.statSync(a.file).size;
  if (h !== a.sha256) bad.push({ file: a.file, expected: a.sha256, actual: h });
  else if (a.byteLength !== undefined && n !== a.byteLength) bad.push({ file: a.file, expectedLen: a.byteLength, actualLen: n });
}
out.artifacts = { named: artFiles.length, rehashed: artFiles.length - absent.length, mismatches: bad, absent, componentsNotGenerated: rendered?.componentsNotGenerated ?? null };

// ---------- word boxes ----------
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
const pagesText = (file) => execFileSync("pdftotext", [file, "-"], { encoding: "utf8", maxBuffer: 1 << 28 }).split("\f");
const lead = (t) => t.replace(/\s+/g, " ").trim().split(" ").filter((w) => /[A-Za-z]/.test(w)).slice(0, 10).join(" ");

// the blank source, when there is exactly one and it is a PDF we can read
let srcWords = null, srcPages = null;
const oneSource = out.sources.length === 1 && out.sources[0].presentInCorpus && /\.pdf$/i.test(out.sources[0].pathInArchive ?? "");
if (oneSource) {
  const abs = path.join(ML, out.sources[0].pathInArchive);
  srcWords = wordsOf(abs); srcPages = pagesText(abs);
}
const srcKey = srcWords ? new Set(srcWords.map((w) => `${w.page}|${w.t}|${w.x.toFixed(1)}|${w.y.toFixed(1)}`)) : null;

// ---------- field map dispositions ----------
const allFields = (fmap?.documents ?? []).flatMap((d) => (d.fields ?? []).map((f) => ({ ...f, documentId: d.documentId })));
const byName = new Map(allFields.map((f) => [f.field, f]));
const tally = (fn) => { const t = {}; for (const f of allFields) { const k = fn(f); t[k] = (t[k] || 0) + 1; } return t; };
out.fieldMap = fmap ? {
  documents: (fmap.documents ?? []).map((d) => ({ documentId: d.documentId, fields: (d.fields ?? []).length })),
  decisions: tally((f) => f.decision ?? "<none>"),
  refusalClasses: tally((f) => f.refusalClass ?? "-"),
  blankTreatments: tally((f) => f.blankTreatment ?? "-"),
  requiredBeforeFiling: allFields.filter((f) => f.requiredBeforeFiling === true || f.blankTreatment === "REQUIRED_BEFORE_FILING").map((f) => f.field),
  protected: allFields.filter((f) => ["signature_or_date_participant_completion", "court_prosecutor_clerk_or_agency_owned"].includes(f.refusalClass)).map((f) => f.field),
  routeSelections: allFields.filter((f) => f.decision === "measured_route_selection").map((f) => f.field),
} : null;

// every REQUIRED_BEFORE_FILING field named in the participant instructions
if (out.fieldMap) {
  const undisclosed = out.fieldMap.requiredBeforeFiling.filter((f) => !instr.includes("`" + f + "`") && !instr.includes(f));
  out.requiredBeforeFilingUndisclosed = undisclosed;
}

// ---------- per fixture ----------
const inRects = (added, f) => {
  const hits = [];
  for (const wg of f.widgets ?? []) {
    const r = wg.rect, pg = wg.page;
    if (!r || !pg) continue;
    const ph = added.find((w) => w.page === pg)?.ph ?? 792;
    const top = ph - (r.y + r.height), bot = ph - r.y;
    for (const w of added) {
      if (w.page !== pg) continue;
      const cx = (w.x + w.x2) / 2, cy = (w.y + w.y2) / 2;
      if (cx >= r.x && cx <= r.x + r.width && cy >= top && cy <= bot) hits.push({ page: pg, word: w.t });
    }
  }
  return hits;
};

out.fixtures = [];
for (const art of writes?.artifacts ?? []) {
  if (!has(art.file)) { out.fixtures.push({ fixture: art.fixture, error: "file absent" }); continue; }
  const ws = wordsOf(art.file);
  const txt = pagesText(art.file);
  const added = srcKey ? ws.filter((w) => !srcKey.has(`${w.page}|${w.t}|${w.x.toFixed(1)}|${w.y.toFixed(1)}`)) : ws;
  const offPage = ws.filter((w) => w.x < -0.5 || w.x2 > w.pw + 0.5 || w.y < -0.5 || w.y2 > w.ph + 0.5);
  const declared = art.written ?? [];
  const noInk = [], overflow = [];
  for (const wr of declared) {
    const f = byName.get(wr.field);
    if (!f) { noInk.push({ field: wr.field, why: "not in field map" }); continue; }
    let seen = false;
    for (const wg of f.widgets ?? []) {
      const r = wg.rect, pg = wg.page;
      if (!r || !pg) continue;
      const ph = ws.find((w) => w.page === pg)?.ph ?? 792;
      const top = ph - (r.y + r.height), bot = ph - r.y;
      const band = added.filter((w) => w.page === pg && w.y2 > top - 1 && w.y < bot + 1 && w.x2 > r.x - 1 && w.x < r.x + r.width + 1);
      if (band.length) seen = true;
      for (const w of band) {
        const over = w.x2 - (r.x + r.width);
        if (over > 1) overflow.push({ field: wr.field, page: pg, word: w.t, over: +over.toFixed(2) });
      }
    }
    if (!seen) noInk.push({ field: wr.field, why: "no added ink in any declared widget rect" });
  }
  const protectedInk = (out.fieldMap?.protected ?? []).map((n) => ({ field: n, hits: inRects(added, byName.get(n) ?? {}) })).filter((x) => x.hits.length);
  const rbfInk = (out.fieldMap?.requiredBeforeFiling ?? []).map((n) => ({ field: n, hits: inRects(added, byName.get(n) ?? {}) })).filter((x) => x.hits.length);
  const pageOrder = srcPages ? (() => {
    const n = Math.min(srcPages.length, txt.length);
    const differ = [];
    for (let i = 0; i < n; i++) if (lead(srcPages[i] ?? "") !== lead(txt[i] ?? "")) differ.push(i + 1);
    return { sourcePages: srcPages.length - 1, artifactPages: txt.length - 1, pagesWhoseLeadTextDiffers: differ };
  })() : { note: "no single blank PDF source to compare against" };
  out.fixtures.push({
    fixture: art.fixture,
    file: art.file,
    declaredSha256: art.sha256,
    recomputedSha256: sha(art.file),
    shaMatches: sha(art.file) === art.sha256,
    declaredWrites: declared.length,
    addedWords: added.length,
    wordsOutsideMediaBox: offPage.length,
    wordsOutsideMediaBoxSample: offPage.slice(0, 8).map((w) => ({ page: w.page, word: w.t, x2: +w.x2.toFixed(2), pageWidth: w.pw })),
    declaredWritesWithNoInk: noInk,
    addedWordsPastTheirWidgetRect: overflow.length,
    addedWordsPastTheirWidgetRectSample: overflow.slice(0, 10),
    protectedFieldsCarryingAddedInk: protectedInk,
    requiredBeforeFilingBlanksCarryingAddedInk: rbfInk,
    fieldsBothWrittenAndRefused: declared.map((w) => w.field).filter((n) => (art.refused ?? []).some((r) => (r.field ?? r) === n)),
    heldButNotPrinted: (art.heldButNotPrinted ?? []).map((h) => h.field),
    selections: (art.selections ?? []).map((s) => ({ control: s.control, page: s.page, drewANewBox: s.drewANewBox, redrewTheCourtsBox: s.redrewTheCourtsBox })),
    pageOrder,
  });
}

const text = JSON.stringify(out, null, 1);
if (OUT) { fs.writeFileSync(OUT, `${text}\n`); console.log(`wrote ${OUT} (${text.length} bytes)`); }
else console.log(text);
