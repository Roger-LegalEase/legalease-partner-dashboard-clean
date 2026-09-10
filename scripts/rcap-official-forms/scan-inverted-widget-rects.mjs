#!/usr/bin/env node
/**
 * HOW MANY OF THE FLEET'S PINNED SOURCES STORE A WIDGET RECTANGLE UPSIDE DOWN.
 *
 * ISO 32000-1 7.9.5: a rectangle array may be written with ANY two diagonally
 * opposite corners, and a consumer "shall normalise such rectangles in situ".
 * pdf-lib normalises nothing -- PDFAcroField.getRectangle() returns the raw
 * first corner as the origin and a signed width and height -- and
 * PDFForm.flatten() translates the widget's appearance to that raw corner. So a
 * widget whose /Rect is stored inverted has its appearance stamped exactly one
 * box height (or one box width) away from the control the form draws.
 *
 * That is invisible to every byte gate the fleet runs. The misplaced appearance
 * is usually a checkbox's own blank-state fill, which draws NO GLYPHS -- so
 * nonWhitespaceGlyphsOutsideMeasuredWriteBoxes is honestly zero -- and its
 * stream is byte-identical to the form's own /AP, so stroke-only source
 * accounting returns MATCHED. Only a directional raster difference against a
 * render of the pinned source finds it.
 *
 * THIS IS A BOUNDED MEASUREMENT OF ONE DEMONSTRATED DEFECT, not a national
 * audit. It answers exactly one question -- how many widgets in the sources the
 * fleet actually binds are stored this way -- and reports the number it finds,
 * including zero.
 *
 * Sources are resolved BY CONTENT DIGEST, never by filename: each family's
 * source-receipt.json declares a sha256 per bound document, and this indexes
 * custody by digest and looks each one up. A declared digest that resolves to
 * nothing is reported as unresolved rather than substituted for by a
 * similarly-named file.
 *
 * Usage:
 *   node scripts/rcap-official-forms/scan-inverted-widget-rects.mjs \
 *     [--custody <dir> ...] [--overlays <dir>] [--json <out>]
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFArray, PDFNumber, PDFDict, PDFStream, decodePDFRawStream } = require("pdf-lib");

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const args = process.argv.slice(2);
const valuesOf = (flag) => args.flatMap((a, i) => (a === flag ? [args[i + 1]] : []));
const custodyDirs = valuesOf("--custody").filter(Boolean);
const overlays = valuesOf("--overlays")[0] ?? path.join(ROOT, "data/rcap-all50/overlays/census-v1");
const jsonOut = valuesOf("--json")[0] ?? null;
if (custodyDirs.length === 0) {
  custodyDirs.push(path.join(ROOT, "private"));
  if (process.env.MASTER_LIBRARY_SOURCE_DIR) custodyDirs.push(process.env.MASTER_LIBRARY_SOURCE_DIR);
}

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

/** Every PDF under custody, indexed by content digest. Symlinks are followed:
 *  private/ is a mounted custody symlinked into the worktree, and a walk that
 *  does not follow it reports an empty custody and proves nothing. */
function indexCustody(dirs) {
  const byDigest = new Map();
  const seen = new Set();
  const walk = (dir, depth = 0) => {
    if (depth > 12) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      let real;
      try { real = fs.realpathSync(full); } catch { continue; }
      if (seen.has(real)) continue;
      let stat;
      try { stat = fs.statSync(real); } catch { continue; }
      if (stat.isDirectory()) { seen.add(real); walk(real, depth + 1); continue; }
      if (!/\.pdf$/i.test(entry.name)) continue;
      seen.add(real);
      let bytes;
      try { bytes = fs.readFileSync(real); } catch { continue; }
      const digest = sha256(bytes);
      if (!byDigest.has(digest)) byDigest.set(digest, { path: real, byteLength: bytes.length });
    }
  };
  for (const dir of dirs) walk(dir);
  return byDigest;
}

/** Widgets whose /Rect is stored with its corners in the inverted order. */
async function invertedRectsIn(file) {
  const doc = await PDFDocument.load(fs.readFileSync(file), { ignoreEncryption: true, updateMetadata: false });
  const ctx = doc.context;
  const pages = doc.getPages();
  let widgets = 0;
  const inverted = [];
  for (const field of doc.getForm().getFields()) {
    for (const widget of field.acroField.getWidgets()) {
      widgets += 1;
      const array = ctx.lookup(widget.dict.get(PDFName.of("Rect")));
      if (!(array instanceof PDFArray) || array.size() !== 4) continue;
      const values = [];
      for (let i = 0; i < 4; i += 1) {
        const entry = ctx.lookup(array.get(i));
        if (!(entry instanceof PDFNumber)) { values.length = 0; break; }
        values.push(entry.asNumber());
      }
      if (values.length !== 4) continue;
      const [x1, y1, x2, y2] = values;
      const xInverted = x2 < x1;
      const yInverted = y2 < y1;
      if (!xInverted && !yInverted) continue;
      let pageIndex = null;
      const p = widget.dict.get(PDFName.of("P"));
      pages.forEach((pg, i) => { if (p && pg.ref.tag === p.tag) pageIndex = i; });
      /* Whether the misplaced appearance PAINTS anything decides whether the
       * defect is visible today. A stream carrying no painting operator moves
       * nothing on the page; one that fills or strokes prints a box in the
       * wrong place. Both are reported -- a silent one becomes visible the day
       * the field is written. */
      let paints = false;
      const ap = widget.dict.lookupMaybe(PDFName.of("AP"), PDFDict);
      const streams = [];
      if (ap) {
        const normal = ctx.lookup(ap.get(PDFName.of("N")));
        if (normal instanceof PDFStream) streams.push(normal);
        else if (normal instanceof PDFDict) for (const [, v] of normal.entries()) {
          const s = ctx.lookup(v); if (s instanceof PDFStream) streams.push(s);
        }
      }
      for (const stream of streams) {
        let text = "";
        /*
         * INFLATE BEFORE READING, OR THIS TEST MEASURES COMPRESSION.
         *
         * Both calls below return the stream's RAW STORED BYTES with /Filter
         * never applied, so on a FlateDecode appearance the regex ran over
         * deflate output and found no operator. FIX132 caught it: re-running
         * this same regex with every stream inflated turns "1 of 46 paints"
         * into "27 of 46", and the 27 are EXACTLY the FlateDecode ones while
         * the 19 that do not are EXACTLY the ones stored uncompressed.
         *
         * Alabama's CR-65 Check Box10.2 -- the widget that stamped a white
         * rectangle over the word "expired" -- is the only inverted widget in
         * the fleet whose appearance is stored uncompressed. That is the sole
         * reason this scan could see it, and it is why the earlier reading
         * "exactly one paints today" was a property of stream compression
         * rather than a fact about appearances.
         */
        try { text = Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1"); } catch { text = ""; }
        if (!text) { try { text = stream.getContentsString(); } catch { text = ""; } }
        if (!text) { try { text = Buffer.from(stream.getContents()).toString("latin1"); } catch { text = ""; } }
        if (/(^|[\s])(f\*?|F|B\*?|b\*?|S|s|sh|Do|Tj|TJ)([\s]|$)/.test(text)) { paints = true; break; }
      }
      inverted.push({
        field: field.getName(), pageIndex, rect: values, xInverted, yInverted,
        misplacementPoints: { x: Math.abs(x1 - Math.min(x1, x2)), y: Math.abs(y1 - Math.min(y1, y2)) },
        appearancePaints: paints
      });
    }
  }
  return { widgets, inverted };
}



// Every source the fleet binds, by digest, with the families that bind it.
const bound = new Map();
for (const state of fs.readdirSync(overlays, { withFileTypes: true })) {
  if (!state.isDirectory()) continue;
  for (const family of fs.readdirSync(path.join(overlays, state.name), { withFileTypes: true })) {
    if (!family.isDirectory()) continue;
    const receipt = path.join(overlays, state.name, family.name, "source-receipt.json");
    if (!fs.existsSync(receipt)) continue;
    let doc;
    try { doc = JSON.parse(fs.readFileSync(receipt, "utf8")); } catch { continue; }
    /* Receipt shapes differ across the corpus: `sources` is an array in most
     * families and a documentId-keyed object in others. Both are read rather
     * than one being treated as malformed. */
    const rows = Array.isArray(doc.sources) ? doc.sources
      : (doc.sources && typeof doc.sources === "object") ? Object.values(doc.sources) : [];
    for (const source of rows) {
      if (!source || typeof source !== "object") continue;
      if (!source.sha256) continue;
      if (!bound.has(source.sha256)) bound.set(source.sha256, { sourceIds: new Set(), declaredPaths: new Set(), families: new Set() });
      const row = bound.get(source.sha256);
      if (source.sourceId) row.sourceIds.add(source.sourceId);
      if (source.path) row.declaredPaths.add(source.path);
      row.families.add(doc.familyId ?? family.name);
    }
  }
}


const custody = indexCustody(custodyDirs);

/*
 * TWO SCOPES, REPORTED SEPARATELY, because they answer two different questions
 * and only one of them is "the fleet".
 *
 * The RECEIPT scope is every source a family's source-receipt.json binds BY
 * DIGEST. That is the set the fleet's builders actually open. It is smaller
 * than the family count: most overlay receipts carry `sources: null` because
 * their families are custom pleadings or guidance packets with no official PDF
 * to bind, so a count over families would overstate what was measured.
 *
 * The CUSTODY scope is every AcroForm PDF held, bound or not. A form that is
 * held but not yet bound by digest carries the same defect the day a family
 * binds it, so counting only the bound set would report a smaller population
 * than exists and call it the answer.
 */
if (args.includes("--custody-wide")) {
  const rows = [];
  let scanned = 0, widgets = 0, invertedCount = 0, unreadable = 0;
  for (const [digest, held] of custody) {
    let result;
    try { result = await invertedRectsIn(held.path); } catch { unreadable += 1; continue; }
    if (result.widgets === 0) continue;
    scanned += 1; widgets += result.widgets; invertedCount += result.inverted.length;
    if (result.inverted.length > 0) rows.push({ sha256: digest, heldAt: held.path, widgets: result.widgets,
      invertedRectCount: result.inverted.length, boundByAFamilyReceipt: bound.has(digest),
      familiesBinding: bound.has(digest) ? [...bound.get(digest).families].sort() : [], inverted: result.inverted });
  }
  console.log(JSON.stringify({ scope: "custody-wide", pdfsIndexedByDigest: custody.size,
    acroFormPdfsScanned: scanned, pdfsNotReadable: unreadable, widgetsScanned: widgets,
    invertedRectWidgets: invertedCount, sourcesCarryingAnInvertedRect: rows.length, rows }, null, 1));
  process.exit(0);
}
const perSource = [];
let unresolved = 0, widgetsScanned = 0, invertedTotal = 0, notAcroForm = 0;
for (const [digest, row] of [...bound.entries()].sort()) {
  const held = custody.get(digest);
  const base = { sha256: digest, sourceIds: [...row.sourceIds].sort(), declaredPaths: [...row.declaredPaths].sort(),
    familiesBinding: [...row.families].sort() };
  if (!held) { unresolved += 1; perSource.push({ ...base, resolved: false, whyNot: "no file under the searched custody has this content digest" }); continue; }
  let result;
  try { result = await invertedRectsIn(held.path); }
  catch (error) { notAcroForm += 1; perSource.push({ ...base, resolved: true, heldAt: held.path, scanned: false, whyNot: error.message }); continue; }
  widgetsScanned += result.widgets;
  invertedTotal += result.inverted.length;
  perSource.push({ ...base, resolved: true, heldAt: held.path, scanned: true, widgets: result.widgets,
    invertedRectCount: result.inverted.length, inverted: result.inverted });
}

const withInverted = perSource.filter((s) => (s.invertedRectCount ?? 0) > 0);
const summary = {
  schemaVersion: "rcap-inverted-widget-rect-scan/v1",
  whatThisMeasures: "widgets in the fleet's pinned bound sources whose /Rect stores its corners in the inverted order, which pdf-lib's flatten() places one box away from the control the form draws",
  custodySearched: custodyDirs, pdfsIndexedByDigest: custody.size,
  boundSourcesDeclared: bound.size, boundSourcesResolvedByDigest: bound.size - unresolved,
  boundSourcesUnresolved: unresolved, boundSourcesNotReadableAsAcroForm: notAcroForm,
  widgetsScanned, invertedRectWidgets: invertedTotal,
  sourcesCarryingAnInvertedRect: withInverted.length,
  familiesBindingASourceWithAnInvertedRect: [...new Set(withInverted.flatMap((s) => s.familiesBinding))].sort(),
  perSourceWithInvertedRects: withInverted
};
console.log(JSON.stringify(summary, null, 1));
if (jsonOut) fs.writeFileSync(jsonOut, `${JSON.stringify({ ...summary, perSource }, null, 2)}\n`);
