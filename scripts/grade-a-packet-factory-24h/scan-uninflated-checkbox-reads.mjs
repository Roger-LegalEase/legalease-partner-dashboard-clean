#!/usr/bin/env node
/*
 * WHICH FAMILIES ASKED A PAGE FOR ITS CHECK BOXES WITHOUT DECOMPRESSING IT.
 *
 * scripts/lib/pdf-stroked-boxes.mjs checkboxCandidates() reads stroked paths out
 * of a page content stream. A caller that hands it `getContents()` hands it
 * FlateDecode OUTPUT -- compressed bytes -- in which no path operator appears.
 * The detector then returns zero, and zero is indistinguishable from "this form
 * draws no boxes".
 *
 * VF33 found it on wi_exp_cr266-set: CR-267's page is 4,913 characters
 * compressed and 29,736 inflated, and the detector returns 0 against 8. The
 * eight boxes are real, 9.24 x 9.24 pt at line width 0.72, at coordinates the
 * inflated stream states exactly. So field-census's strokedTickBoxesOnTheForm: 0
 * was never a measurement, and three delivered records plus a lane row rested a
 * "there is no measured box" rationale on it.
 *
 * This is the second detector today found reading undecompressed bytes -- the
 * inverted-widget-rectangle scan had the same defect and reported one painting
 * widget where 27 paint.
 *
 * THE REASON THIS MATTERS MORE THAN A COUNT. Two families do not merely report
 * the zero, they ACT on it in participant-facing prose: one tells the
 * participant to mark a gender box themselves because "those two tick boxes are
 * not strokes in the page's content stream -- checkboxCandidates and
 * strokedRectangles both find none anywhere on this page". If the boxes are
 * strokes and the read was blind, that sentence describes the form wrongly to
 * the person filing it.
 *
 * So this measures both readings on every pinned source of every family whose
 * builder names the detector, and reports the difference. A source whose page
 * content is not compressed reads the same both ways and is unaffected.
 *
 * Read-only. Writes one artifact, no packet byte, and changes no builder.
 */
import { readFileSync, writeFileSync, globSync, existsSync } from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { PDFDocument, PDFName, PDFArray } from "pdf-lib";
import { checkboxCandidates } from "../lib/pdf-stroked-boxes.mjs";

const OUT = "data/rcap-grade-a/packet-factory-24h/UNINFLATED_CHECKBOX_READS.json";
const LIBRARY = process.env.MASTER_LIBRARY_SOURCE_DIR
  ?? "/home/user/corpus-x/Expungement_AI_RCAP_Master_Library_Edition_1";

const callers = globSync("scripts/**/*.mjs")
  .filter((f) => !f.includes("pdf-stroked-boxes") && !f.includes("scan-uninflated"))
  .filter((f) => { try { return readFileSync(f, "utf8").includes("checkboxCandidates"); } catch { return false; } });

/* Every pinned source a family directory declares, by walking its receipt for
 * paths that exist. The receipt is the record of what was actually bound. */
const sourcesOf = (dir) => {
  const out = new Set();
  for (const name of ["source-receipt.json"]) {
    const p = path.join(dir, name);
    if (!existsSync(p)) continue;
    let parsed; try { parsed = JSON.parse(readFileSync(p, "utf8")); } catch { continue; }
    const walk = (node, depth = 0) => {
      if (depth > 8 || node === null || typeof node !== "object") return;
      if (Array.isArray(node)) { for (const v of node) walk(v, depth + 1); return; }
      for (const v of Object.values(node)) {
        if (typeof v === "string" && /\.pdf$/i.test(v)) {
          /* A receipt names a source by its path INSIDE THE ARCHIVE, not by a
           * repository path. My first version tested existsSync on the raw
           * string, resolved almost nothing, and reported 1 family measured and
           * 0 blind -- contradicting the one measurement I already had. */
          for (const candidate of [v, path.join(LIBRARY, v), path.join("private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1", v)]) {
            if (existsSync(candidate)) { out.add(candidate); break; }
          }
        } else walk(v, depth + 1);
      }
    };
    walk(parsed);
  }
  return [...out];
};

const bothReadings = async (file) => {
  const doc = await PDFDocument.load(readFileSync(file), { ignoreEncryption: true, updateMetadata: false });
  const ctx = doc.context;
  let raw = 0, inflated = 0, pagesCompressed = 0, pages = 0;
  doc.getPages().forEach((page) => {
    pages += 1;
    const contents = page.node.get(PDFName.of("Contents"));
    const refs = contents instanceof PDFArray ? contents.asArray() : contents ? [contents] : [];
    let rawText = "", inflatedText = "";
    for (const ref of refs) {
      let bytes; try { bytes = Buffer.from(ctx.lookup(ref).contents); } catch { continue; }
      rawText += bytes.toString("latin1");
      let out = bytes;
      try { out = zlib.inflateSync(bytes); } catch { /* already flat */ }
      if (out.length !== bytes.length) pagesCompressed += 1;
      inflatedText += out.toString("latin1");
    }
    try { raw += rawText ? checkboxCandidates(rawText).length : 0; } catch { /* detector refused */ }
    try { inflated += inflatedText ? checkboxCandidates(inflatedText).length : 0; } catch { /* detector refused */ }
  });
  return { pages, pagesCompressed, boxesFromRawBytes: raw, boxesFromInflatedBytes: inflated };
};

const rows = [];
for (const caller of callers) {
  const family = path.basename(caller).replace(/^build-census-v1-/, "").replace(/\.mjs$/, "");
  const slug = family.replace(/_/g, "-").toLowerCase();
  const dirs = globSync("data/rcap-all50/overlays/census-v1/*/*")
    .filter((d) => path.basename(d).toLowerCase().startsWith(`${slug}--`));
  const sources = [...new Set(dirs.flatMap(sourcesOf))];
  if (!sources.length) { rows.push({ caller, family, sourcesResolved: 0, note: "no pinned source resolved on disk from this family's receipt" }); continue; }
  let raw = 0, inflated = 0, compressed = 0, unreadable = 0;
  for (const file of sources) {
    try { const r = await bothReadings(file); raw += r.boxesFromRawBytes; inflated += r.boxesFromInflatedBytes; compressed += r.pagesCompressed; }
    catch { unreadable += 1; }
  }
  rows.push({
    caller, family, sourcesResolved: sources.length, compressedPages: compressed, unreadableSources: unreadable,
    boxesFromRawBytes: raw, boxesFromInflatedBytes: inflated, boxesTheRawReadingMisses: inflated - raw,
  });
}

const blind = rows.filter((r) => (r.boxesTheRawReadingMisses ?? 0) > 0);
writeFileSync(OUT, JSON.stringify({
  schemaVersion: "rcap-uninflated-checkbox-reads/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/scan-uninflated-checkbox-reads.mjs",
  generatedAt: new Date().toISOString(),
  question: "For every family whose builder names checkboxCandidates, how many stroked check boxes does its pinned source carry when the page is decompressed, against how many the detector sees when handed getContents() output directly?",
  whyItMatters: "A zero from a compressed page is indistinguishable from a form that draws no boxes. On wi_exp_cr266-set the detector returned 0 against 8, and three delivered records plus a lane row rested a 'there is no measured box' rationale on that zero. Two other builders put a version of that sentence in PARTICIPANT-FACING PROSE.",
  secondInstanceToday: "The inverted-widget-rectangle scan had the same defect this morning and reported one painting widget where 27 paint. A detector handed raw stored bytes is now a named class.",
  whatThisIsNot: "Not a page defect list. On wi_exp_cr266-set all eight boxes deliver unmarked -- 1,043 source dark pixels and exactly 1,043 delivered -- so the conclusion those records reached was right and the reasoning was not. The remedy is a reader fix and a record correction, and a rebuild moves bytes and owes a fresh raster.",
  totals: {
    callersNamingTheDetector: callers.length,
    familiesMeasured: rows.filter((r) => r.sourcesResolved).length,
    familiesWhoseRawReadingIsBlind: blind.length,
    boxesMissedInTotal: blind.reduce((n, r) => n + r.boxesTheRawReadingMisses, 0),
  },
  familiesWhoseRawReadingIsBlind: blind,
  everyCallerMeasured: rows,
  grantsNothing: "A measurement promotes nothing, demotes nothing and approves no packet.",
}, null, 2) + "\n");

console.log(`callers naming the detector:      ${callers.length}`);
console.log(`families measured:                ${rows.filter((r) => r.sourcesResolved).length}`);
console.log(`whose raw reading is blind:       ${blind.length}`);
for (const r of blind) console.log(`   misses ${String(r.boxesTheRawReadingMisses).padStart(3)}  ${r.family}  (raw ${r.boxesFromRawBytes} vs inflated ${r.boxesFromInflatedBytes})`);
