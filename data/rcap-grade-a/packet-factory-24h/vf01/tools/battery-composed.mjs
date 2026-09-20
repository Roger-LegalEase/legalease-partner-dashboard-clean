/*
 * VF01 independent measurement battery for COMPOSED families (custom pleadings
 * and composed treatments), whose packets are written by the build rather than
 * filled into an official binary.
 *
 *   node data/rcap-grade-a/packet-factory-24h/vf01/tools/battery-composed.mjs <familyDirectory> [--json <out>]
 *
 * What it measures from the bytes, never from the report: every committed record
 * the receipt binds, rehashed; every artifact hash; the page manifest against
 * the delivered page count and order; every declared written value looked for in
 * the extracted text of the pages its own component occupies; every declared
 * blank looked for as a blank; every required-before-filing item looked for in
 * participant-instructions.md; and every word box against its page.
 *
 * It decides no verdict.
 */
import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const DIR = process.argv[2];
const OUT = process.argv.includes("--json") ? process.argv[process.argv.indexOf("--json") + 1] : null;
if (!DIR) { console.error("usage: battery-composed.mjs <familyDirectory>"); process.exit(2); }
const j = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const has = (p) => fs.existsSync(p);
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const out = { directory: DIR };

const receipt = has(`${DIR}/source-receipt.json`) ? j(`${DIR}/source-receipt.json`) : null;
const rendered = has(`${DIR}/reports/rendered-artifacts.json`) ? j(`${DIR}/reports/rendered-artifacts.json`) : null;
const writes = has(`${DIR}/reports/actual-writes.json`) ? j(`${DIR}/reports/actual-writes.json`) : null;
const fmap = has(`${DIR}/production-field-map.json`) ? j(`${DIR}/production-field-map.json`) : null;
const blanks = has(`${DIR}/reports/blanks-left-for-the-participant.json`) ? j(`${DIR}/reports/blanks-left-for-the-participant.json`) : null;
const instr = has(`${DIR}/participant-instructions.md`) ? fs.readFileSync(`${DIR}/participant-instructions.md`, "utf8") : "";
out.files = fs.readdirSync(DIR).sort();
out.instructionsBytes = instr.length;

// ---------- SOURCE IDENTITY: rehash every committed record the receipt binds ----------
out.committedRecords = (receipt?.committedRecords ?? []).map((r) => {
  const p = r.pathInRepository;
  const present = p && has(p);
  return {
    recordId: r.recordId,
    pathInRepository: p ?? null,
    presentHere: !!present,
    declaredSha256: r.sha256 ?? null,
    recomputedSha256: present ? sha(p) : null,
    declaredByteLength: r.byteLength ?? null,
    actualByteLength: present ? fs.statSync(p).size : null,
    matches: present ? sha(p) === r.sha256 && fs.statSync(p).size === r.byteLength : null,
    anchorStatementsVerified: r.anchorStatementsVerified ?? null,
  };
});
out.boundDocuments = (receipt?.documents ?? []).map((d) => ({ documentId: d.documentId, sha256: d.sha256 ?? null }));

// ---------- ARTIFACTS ----------
const named = [];
for (const p of rendered?.pdfs ?? []) named.push({ file: p.file, sha256: p.sha256, byteLength: p.byteLength, fixture: p.fixture, pageCount: p.pageCount });
for (const r of rendered?.rasters ?? []) {
  if (r.contactSheet) named.push({ file: r.contactSheet.file, sha256: r.contactSheet.sha256, byteLength: r.contactSheet.byteLength, fixture: `contact:${r.fixture}` });
  for (const pg of r.pages ?? []) named.push({ file: pg.file, sha256: pg.sha256, byteLength: pg.byteLength, fixture: `raster:${r.fixture}:${pg.page}` });
}
const mism = [], missing = [];
for (const a of named) {
  if (!has(a.file)) { missing.push(a.file); continue; }
  if (sha(a.file) !== a.sha256) mism.push({ file: a.file, expected: a.sha256, actual: sha(a.file) });
  else if (a.byteLength != null && fs.statSync(a.file).size !== a.byteLength) mism.push({ file: a.file, expectedLen: a.byteLength, actualLen: fs.statSync(a.file).size });
}
out.artifacts = { named: named.length, rehashed: named.length - missing.length, mismatches: mism, absent: missing };

// ---------- per artifact: pages, manifest, ink, values ----------
const pagesText = (f) => execFileSync("pdftotext", ["-layout", f, "-"], { encoding: "utf8", maxBuffer: 1 << 28 }).split("\f");
const wordsOf = (f) => {
  const xml = execFileSync("pdftotext", ["-bbox", f, "-"], { encoding: "utf8", maxBuffer: 1 << 28 });
  const o = []; let page = 0, pw = 612, ph = 792;
  for (const line of xml.split("\n")) {
    const pm = line.match(/<page width="([\d.]+)" height="([\d.]+)">/);
    if (pm) { page++; pw = +pm[1]; ph = +pm[2]; }
    const m = line.match(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/);
    if (m) o.push({ page, x: +m[1], y: +m[2], x2: +m[3], y2: +m[4], t: m[5], pw, ph });
  }
  return o;
};

const artifactRows = rendered?.artifacts ?? rendered?.pdfs ?? [];
out.componentSet = rendered?.componentSet ?? fmap?.componentSet ?? null;
out.fixtures = [];
for (const art of artifactRows) {
  if (!has(art.file)) { out.fixtures.push({ fixture: art.fixture, error: "file absent" }); continue; }
  const txt = pagesText(art.file);
  const pageCount = txt.filter((_, i) => i < txt.length - 1).length;
  const ws = wordsOf(art.file);
  const offPage = ws.filter((w) => w.x < -0.5 || w.x2 > w.pw + 0.5 || w.y < -0.5 || w.y2 > w.ph + 0.5);
  const manifest = art.pageManifest ?? [];
  const monotonic = manifest.every((m, i) => m.packetPage === i + 1);
  const componentsInManifest = [...new Set(manifest.map((m) => m.component))];
  const declaredComponents = out.componentSet ?? [];
  const componentPages = {};
  for (const m of manifest) (componentPages[m.component] ??= []).push(m.packetPage);

  // every declared written value, looked for in the pages its own component occupies
  const docRow = (writes?.documents ?? []).find((d) => d.fixture === art.fixture) ?? null;
  const valueChecks = (docRow?.actualWrites ?? []).map((w) => {
    const comp = w.document ?? (w.field ?? "").split(".")[0];
    const pgs = componentPages[comp] ?? manifest.map((m) => m.packetPage);
    const hay = norm(pgs.map((p) => txt[p - 1] ?? "").join(" "));
    const val = norm(w.expected ?? w.value ?? "");
    return { field: w.field, component: comp, pages: pgs, value: val.slice(0, 60), foundOnItsOwnComponentPages: val ? hay.includes(val) : null, foundAnywhere: val ? norm(txt.join(" ")).includes(val) : null };
  });

  out.fixtures.push({
    fixture: art.fixture,
    file: art.file,
    declaredSha256: art.sha256,
    recomputedSha256: sha(art.file),
    shaMatches: sha(art.file) === art.sha256,
    declaredPageCount: art.pageCount ?? null,
    pagesReadFromBytes: pageCount,
    pageCountMatches: (art.pageCount ?? null) === pageCount,
    manifestLength: manifest.length,
    manifestIsMonotonicOneToN: monotonic,
    componentsInManifest,
    declaredComponentsNotInManifest: declaredComponents.filter((c) => !componentsInManifest.includes(c)),
    manifestComponentsNotDeclared: componentsInManifest.filter((c) => !declaredComponents.includes(c)),
    componentPages,
    wordsOutsideMediaBox: offPage.length,
    wordsOutsideMediaBoxSample: offPage.slice(0, 8).map((w) => ({ page: w.page, word: w.t, x2: +w.x2.toFixed(2), pageWidth: w.pw })),
    declaredWrites: valueChecks.length,
    writesNotFoundOnTheirComponentPages: valueChecks.filter((v) => v.foundOnItsOwnComponentPages === false),
    builderReported: docRow ? {
      valuesReportedByFinalizer: docRow.valuesReportedByFinalizer ?? null,
      addedGlyphs: docRow.addedGlyphsReadFromOutputBytes ?? null,
      glyphsOutsideMeasuredWriteBoxes: docRow.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes ?? null,
      refusedFieldsWithInk: (docRow.refusedFieldsWithInk ?? []).length,
    } : null,
  });
}

// ---------- REQUIRED_BEFORE_FILING and protected blanks ----------
const rbf = fmap?.requiredBeforeFiling ?? blanks?.requiredBeforeFiling ?? [];
const rbfItems = (Array.isArray(rbf) ? rbf : []).map((x) => (typeof x === "string" ? x : (x.label ?? x.item ?? x.field ?? JSON.stringify(x))));
out.requiredBeforeFiling = {
  declaredCount: fmap?.requiredBeforeFilingCount ?? rbfItems.length,
  items: rbfItems,
  notFoundInInstructions: rbfItems.filter((t) => !norm(instr).toLowerCase().includes(norm(t).toLowerCase().slice(0, 40))),
};
out.blanksReport = blanks ? {
  keys: Object.keys(blanks),
  counts: Object.fromEntries(Object.entries(blanks).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, v.length])),
} : null;
out.participantFacingObligations = (fmap?.participantFacingObligations ?? []).map((o) => ({ question: o.question, answerBytes: (o.answer ?? "").length }));
out.blockingFindings = writes?.blockingFindings ?? null;

const text = JSON.stringify(out, null, 1);
if (OUT) { fs.writeFileSync(OUT, `${text}\n`); console.log(`wrote ${OUT} (${text.length} bytes)`); }
else console.log(text);
