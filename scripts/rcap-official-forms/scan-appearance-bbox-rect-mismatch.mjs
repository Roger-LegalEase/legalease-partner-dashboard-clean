#!/usr/bin/env node
// WHICH FAMILIES ARE EXPOSED TO THE FLATTEN-TIME APPEARANCE SCALE DEFECT.
//
//   node scripts/rcap-official-forms/scan-appearance-bbox-rect-mismatch.mjs
//   node scripts/rcap-official-forms/scan-appearance-bbox-rect-mismatch.mjs --out <dir>
//
// READ-ONLY. It opens no artifact for writing, rebuilds nothing, changes no
// builder and touches no family's bytes. Its only writes are its own two report
// files.
//
// THE DEFECT IT COUNTS. ISO 32000-1 12.5.5 places a widget's appearance by
// transforming its /BBox by its /Matrix, taking the bounding box of the result,
// and fitting that box onto the annotation's /Rect. pdf-lib's PDFForm.flatten
// emits a translation and nothing else, so the fit never happens: an appearance
// whose transformed BBox is not its /Rect is stamped at the wrong size, in the
// wrong place, or both, and the packet then disagrees with what every
// conforming viewer draws from the same binary. Vermont's fee-waiver form
// 600-00228 field 15 is the measured instance -- BBox [0 0 18 18] against a
// /Rect of 14.4 x 14.4, a required scale of 0.8 never applied, a 17pt stroked
// square where the court's form draws a 13.6pt one.
//
// MEASURING A COHORT IS NOT FIXING IT. Every family listed here still carries
// whatever this finds. The remedy is opt-in per builder
// (fitAppearancesToRect), so a family named below is byte-unchanged by being
// named, and this file changes nothing about that.
//
// HOW A SOURCE IS RESOLVED, and why it matters. By CONTENT HASH across every
// mounted custody, never by the declared path. The declared path is a statement
// about a custody that may not be mounted in this container, and a scan that
// followed it would report a family unmeasurable because a directory is absent
// while its exact bytes sit in another custody a metre away. The receipt's
// sha256 is the identity; the path is only a hint. A source whose digest is in
// no mounted custody is NOT_MEASURABLE_HERE -- a positive statement of absence,
// never folded into a count of zero.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import { makeCorpusEntryResolver, MASTER_LIBRARY_CUSTODY } from "../lib/corpus-index-paths.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, PDFDict, PDFArray, PDFRef, PDFCheckBox, PDFRadioGroup } = require("pdf-lib");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OVERLAY_ROOT = "data/rcap-all50/overlays/census-v1";
const CORPUS_INDEX = "data/rcap-all50/local-source-corpus-index.json";
const MASTER_QUEUE = "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json";
const BUILDER_DIR = "scripts";
const DEFAULT_OUT = "data/rcap-grade-a/packet-factory-24h/fix61";

// The same threshold the repair itself uses, and for the same reason: a mapping
// that moves no corner by more than this cannot change a pixel at any raster
// resolution this factory uses. Vermont 600-00228 field 16 is why it is not
// zero -- its /Rect is 14.401 against a 14.400 BBox, which is the form's own
// rounding rather than a defect.
const TOLERANCE_PT = 0.05;

const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

function walk(dir) {
  const out = [];
  const step = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) step(full);
      else out.push(full);
    }
  };
  try { step(dir); } catch { return null; }
  return out;
}

/**
 * Every file in every MOUNTED custody, keyed by its OBSERVED digest.
 *
 * Observed, not declared: an index entry states what a file's digest ought to
 * be, and a scan that trusted that statement would resolve a source to bytes
 * that no longer match it. Hashing what is on disk is the only reading that
 * cannot be wrong about what it opened.
 */
function mountedCustodyIndex(corpusIndex) {
  const resolver = makeCorpusEntryResolver(corpusIndex, { repoRoot: ROOT });
  const custodies = corpusIndex?.custodies?.length
    ? corpusIndex.custodies
    : [{ id: MASTER_LIBRARY_CUSTODY, root: resolver.rootFor(MASTER_LIBRARY_CUSTODY) }];
  const byDigest = new Map();
  const mounted = [];
  const notMounted = [];
  for (const custody of custodies) {
    const root = custody.id === MASTER_LIBRARY_CUSTODY
      ? resolver.rootFor(MASTER_LIBRARY_CUSTODY)
      : path.resolve(ROOT, custody.root);
    const files = root && fs.existsSync(root) ? walk(root) : null;
    if (files === null) { notMounted.push({ custody: custody.id, root }); continue; }
    mounted.push({ custody: custody.id, root, files: files.length });
    for (const file of files) {
      let digest;
      try { digest = sha256(file); } catch { continue; }
      if (!byDigest.has(digest)) byDigest.set(digest, { path: file, custody: custody.id });
    }
  }
  return { byDigest, mounted, notMounted };
}

/** The bounding box of `bbox` after `matrix`, per ISO 32000-1 8.10.2. */
function boundingBoxAfterMatrix(bbox, matrix) {
  const [x0, y0, x1, y1] = bbox;
  const [a, b, c, d, e, f] = matrix;
  const corners = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
    .map(([x, y]) => [a * x + c * y + e, b * x + d * y + f]);
  const xs = corners.map((p) => p[0]);
  const ys = corners.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

function numbersOf(ctx, dict, key, count) {
  const raw = dict.get(PDFName.of(key));
  if (raw === undefined) return null;
  const arr = ctx.lookup(raw);
  if (!(arr instanceof PDFArray) || arr.size() !== count) return null;
  return arr.asArray().map((n) => n.asNumber());
}

/**
 * Every widget in one official PDF whose appearance would be stamped at a size
 * its /Rect does not have.
 *
 * The appearance examined is the one pdf-lib's flatten() would place, resolved
 * the way PDFForm.findWidgetAppearanceRef resolves it, and read WITHOUT calling
 * getNormalAppearance -- which installs an empty /AP on a widget that has none,
 * and this scan writes nothing into anything.
 */
async function scanDocument(file) {
  const doc = await PDFDocument.load(fs.readFileSync(file), { ignoreEncryption: true, updateMetadata: false });
  const ctx = doc.context;
  const pageIndex = new Map();
  doc.getPages().forEach((p, i) => pageIndex.set(p.ref.toString(), i + 1));

  const result = { widgets: 0, appearancesExamined: 0, mismatched: 0, worstDisplacementPt: 0,
    noPlaceableAppearance: 0, degenerateGeometry: 0, fields: [] };

  for (const field of doc.getForm().getFields()) {
    for (const widget of field.acroField.getWidgets()) {
      result.widgets += 1;
      const ap = widget.dict.lookup(PDFName.of("AP"));
      if (!(ap instanceof PDFDict)) { result.noPlaceableAppearance += 1; continue; }
      const n = ap.get(PDFName.of("N"));
      if (n === undefined) { result.noPlaceableAppearance += 1; continue; }
      const resolved = ctx.lookup(n);
      let ref = null;
      if (resolved instanceof PDFDict) {
        if (!(field instanceof PDFCheckBox || field instanceof PDFRadioGroup)) { result.noPlaceableAppearance += 1; continue; }
        const value = field.acroField.getValue();
        const chosen = resolved.get(value) ?? resolved.get(PDFName.of("Off"));
        if (!(chosen instanceof PDFRef)) { result.noPlaceableAppearance += 1; continue; }
        ref = chosen;
      } else if (n instanceof PDFRef) {
        ref = n;
      } else { result.noPlaceableAppearance += 1; continue; }

      const stream = ctx.lookup(ref);
      const dict = stream?.dict;
      if (!dict) { result.noPlaceableAppearance += 1; continue; }
      const raw = numbersOf(ctx, dict, "BBox", 4);
      if (!raw) { result.noPlaceableAppearance += 1; continue; }
      const bbox = [Math.min(raw[0], raw[2]), Math.min(raw[1], raw[3]), Math.max(raw[0], raw[2]), Math.max(raw[1], raw[3])];
      const matrix = numbersOf(ctx, dict, "Matrix", 6) ?? [1, 0, 0, 1, 0, 0];
      result.appearancesExamined += 1;

      const rect = widget.getRectangle();
      const rectWidth = Math.abs(rect.width);
      const rectHeight = Math.abs(rect.height);
      const [bx0, by0, bx1, by1] = boundingBoxAfterMatrix(bbox, matrix);
      if (!(bx1 - bx0 > 0) || !(by1 - by0 > 0) || !(rectWidth > 0) || !(rectHeight > 0)) {
        result.degenerateGeometry += 1;
        continue;
      }
      // How far the flattened corners actually land from the widget box. Size
      // AND origin: an appearance the right size at the wrong offset is the same
      // defect wearing different numbers.
      const displacement = Math.max(Math.abs(bx0), Math.abs(bx1 - rectWidth),
        Math.abs(by0), Math.abs(by1 - rectHeight));
      if (displacement <= TOLERANCE_PT) continue;

      result.mismatched += 1;
      result.worstDisplacementPt = Math.max(result.worstDisplacementPt, displacement);
      const pref = widget.dict.get(PDFName.of("P"));
      result.fields.push({
        field: field.getName(),
        page: pref ? pageIndex.get(pref.toString()) ?? null : null,
        appearanceBBox: bbox,
        appearanceMatrix: matrix,
        transformedSize: { width: +(bx1 - bx0).toFixed(4), height: +(by1 - by0).toFixed(4) },
        widgetRect: { width: +rectWidth.toFixed(4), height: +rectHeight.toFixed(4) },
        requiredScale: { x: +(rectWidth / (bx1 - bx0)).toFixed(6), y: +(rectHeight / (by1 - by0)).toFixed(6) },
        displacementPt: +displacement.toFixed(4)
      });
    }
  }
  result.worstDisplacementPt = +result.worstDisplacementPt.toFixed(4);
  return result;
}

/** Whether this family's builder passes the opt-in, read from the builder itself. */
function builderOptsIn(familyId) {
  const candidates = fs.readdirSync(path.join(ROOT, BUILDER_DIR))
    .filter((f) => f.startsWith("build-census-v1-") && f.endsWith(".mjs"))
    .filter((f) => f.slice("build-census-v1-".length, -".mjs".length) === familyId);
  if (candidates.length === 0) return { builder: null, optsIn: null, why: "no builder named for this familyId" };
  const file = path.join(BUILDER_DIR, candidates[0]);
  const text = fs.readFileSync(path.join(ROOT, file), "utf8");
  return {
    builder: file,
    optsIn: /^\s*fitAppearancesToRect:\s*true\b/m.test(text),
    why: null
  };
}

async function main() {
  const outArg = process.argv.indexOf("--out");
  const outDir = outArg > -1 ? process.argv[outArg + 1] : DEFAULT_OUT;

  const corpusIndex = JSON.parse(fs.readFileSync(path.join(ROOT, CORPUS_INDEX), "utf8"));
  const custody = mountedCustodyIndex(corpusIndex);
  const queue = JSON.parse(fs.readFileSync(path.join(ROOT, MASTER_QUEUE), "utf8"));
  const queueState = new Map((queue.families ?? []).map((f) => [f.familyId, f.state ?? null]));

  const receipts = [];
  const overlayRoot = path.join(ROOT, OVERLAY_ROOT);
  for (const state of fs.readdirSync(overlayRoot, { withFileTypes: true })) {
    if (!state.isDirectory()) continue;
    for (const family of fs.readdirSync(path.join(overlayRoot, state.name), { withFileTypes: true })) {
      if (!family.isDirectory()) continue;
      const receipt = path.join(overlayRoot, state.name, family.name, "source-receipt.json");
      if (fs.existsSync(receipt)) receipts.push({ state: state.name, dir: family.name, receipt });
    }
  }
  receipts.sort((a, b) => a.receipt.localeCompare(b.receipt));

  const families = [];
  for (const r of receipts) {
    const receipt = JSON.parse(fs.readFileSync(r.receipt, "utf8"));
    const familyId = receipt.familyId ?? r.dir;
    const familyDirectory = path.relative(ROOT, path.dirname(r.receipt)).split(path.sep).join("/");
    const documents = [];
    for (const doc of receipt.documents ?? []) {
      const digest = String(doc.sha256 ?? "");
      const held = /^[0-9a-f]{64}$/.test(digest) ? custody.byDigest.get(digest) : undefined;
      if (!held) {
        documents.push({
          formNumber: doc.formNumber ?? null, sourceIds: doc.sourceIds ?? [], sha256: digest || null,
          resolution: "NOT_MEASURABLE_HERE",
          why: /^[0-9a-f]{64}$/.test(digest)
            ? "this digest is in no custody mounted in this container"
            : "the receipt declares no usable sha256 for this document",
          declaredPathNotFollowed: doc.pathInArchive ?? null
        });
        continue;
      }
      let scan;
      try {
        scan = await scanDocument(held.path);
      } catch (error) {
        documents.push({
          formNumber: doc.formNumber ?? null, sourceIds: doc.sourceIds ?? [], sha256: digest,
          resolution: "NOT_MEASURABLE_HERE", why: `the bytes could not be read as a PDF form: ${error.message}`,
          resolvedIn: held.custody
        });
        continue;
      }
      documents.push({
        formNumber: doc.formNumber ?? null, sourceIds: doc.sourceIds ?? [], sha256: digest,
        resolution: "RESOLVED_BY_CONTENT_HASH", resolvedIn: held.custody,
        widgets: scan.widgets, appearancesExamined: scan.appearancesExamined,
        widgetsWithMismatchedAppearance: scan.mismatched,
        worstDisplacementPt: scan.worstDisplacementPt,
        widgetsWithNoPlaceableAppearance: scan.noPlaceableAppearance,
        widgetsWithDegenerateGeometry: scan.degenerateGeometry,
        mismatchedFields: scan.fields
      });
    }
    const measured = documents.filter((d) => d.resolution === "RESOLVED_BY_CONTENT_HASH");
    const builder = builderOptsIn(familyId);
    families.push({
      familyId, jurisdiction: receipt.jurisdiction ?? r.state.toUpperCase(), familyDirectory,
      implementationStrategy: receipt.implementationStrategy ?? null,
      masterQueueState: queueState.get(familyId) ?? null,
      builder: builder.builder, builderOptsIn: builder.optsIn, builderNote: builder.why,
      documentsDeclared: (receipt.documents ?? []).length,
      documentsMeasured: measured.length,
      documentsNotMeasurableHere: documents.length - measured.length,
      widgets: measured.reduce((n, d) => n + d.widgets, 0),
      appearancesExamined: measured.reduce((n, d) => n + d.appearancesExamined, 0),
      widgetsWithMismatchedAppearance: measured.reduce((n, d) => n + d.widgetsWithMismatchedAppearance, 0),
      worstDisplacementPt: measured.reduce((n, d) => Math.max(n, d.worstDisplacementPt), 0),
      exposed: measured.some((d) => d.widgetsWithMismatchedAppearance > 0),
      documents
    });
  }

  const exposed = families.filter((f) => f.exposed);
  const report = {
    schemaVersion: "rcap-appearance-scale-cohort/v1",
    generatedBy: "scripts/rcap-official-forms/scan-appearance-bbox-rect-mismatch.mjs",
    lane: "FIX61",
    question: "Which families bind an official PDF whose widget appearance would be flattened at a size or "
      + "position its /Rect does not have, because pdf-lib's flatten() never applies the ISO 32000-1 12.5.5 "
      + "BBox-to-Rect mapping?",
    tolerancePt: TOLERANCE_PT,
    readOnly: "This scan opens no artifact for writing, rebuilds nothing and changes no builder. Naming a "
      + "family here repairs nothing about it: the remedy is opt-in per builder (fitAppearancesToRect) and "
      + "every family below still carries what is counted here unless its own row says its builder opts in.",
    whatThisDoesNotClaim: "It counts SOURCE widgets exposed to the behaviour, read from the pinned binaries, "
      + "and it does not claim any of them reaches a delivered page. Whether a widget survives to be flattened "
      + "depends on that family's own writes and appearance dispositions -- restrictWidgetContributions drops "
      + "controls, unwritten participant inputs, unselected choices and widgets the source marks Hidden or "
      + "NoView before flatten runs -- and this scan does not open a single packet artifact. A row here is a "
      + "reason to measure that family's delivered bytes, never a finding about them. Nor does it read the "
      + "appearance's CONTENT: a stream that paints nothing is counted the same as one that strokes a box, "
      + "because the placement is wrong either way and only a raster can say whether it shows.",
    sourceResolution: {
      method: "content hash across every mounted custody, never the declared path",
      custodiesMounted: custody.mounted,
      custodiesNotMountedHere: custody.notMounted.map((c) => c.custody),
      filesIndexedByObservedDigest: custody.byDigest.size
    },
    totals: {
      familiesWithASourceReceipt: families.length,
      familiesFullyMeasurable: families.filter((f) => f.documentsNotMeasurableHere === 0).length,
      familiesWithAtLeastOneSourceNotMeasurableHere: families.filter((f) => f.documentsNotMeasurableHere > 0).length,
      familiesExposed: exposed.length,
      familiesExposedWhoseBuilderOptsIn: exposed.filter((f) => f.builderOptsIn === true).length,
      familiesExposedStillOnTheDefault: exposed.filter((f) => f.builderOptsIn !== true).length,
      widgetsExposed: exposed.reduce((n, f) => n + f.widgetsWithMismatchedAppearance, 0),
      documentsMeasured: families.reduce((n, f) => n + f.documentsMeasured, 0),
      documentsNotMeasurableHere: families.reduce((n, f) => n + f.documentsNotMeasurableHere, 0)
    },
    exposedByJurisdiction: Object.fromEntries(
      [...new Set(exposed.map((f) => f.jurisdiction))].sort()
        .map((j) => [j, exposed.filter((f) => f.jurisdiction === j).map((f) => f.familyId).sort()])
    ),
    families
  };

  fs.mkdirSync(path.join(ROOT, outDir), { recursive: true });
  const jsonPath = path.join(outDir, "APPEARANCE_SCALE_COHORT.json");
  const mdPath = path.join(outDir, "APPEARANCE_SCALE_COHORT.md");
  fs.writeFileSync(path.join(ROOT, jsonPath), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(ROOT, mdPath), markdown(report));

  console.log(`${report.totals.familiesExposed} of ${report.totals.familiesWithASourceReceipt} families exposed`
    + ` (${report.totals.widgetsExposed} widget(s)); ${report.totals.familiesExposedStillOnTheDefault} still on the default;`
    + ` ${report.totals.documentsNotMeasurableHere} source(s) NOT_MEASURABLE_HERE`);
  console.log(`wrote ${jsonPath}`);
  console.log(`wrote ${mdPath}`);
}

function markdown(report) {
  const t = report.totals;
  const rows = report.families.filter((f) => f.exposed || f.documentsNotMeasurableHere > 0)
    .sort((a, b) => (b.widgetsWithMismatchedAppearance - a.widgetsWithMismatchedAppearance)
      || a.familyId.localeCompare(b.familyId));
  const lines = [];
  lines.push("# Appearance scale cohort — ISO 32000-1 12.5.5 BBox-to-Rect fit");
  lines.push("");
  lines.push("Generated by `scripts/rcap-official-forms/scan-appearance-bbox-rect-mismatch.mjs` (lane FIX61).");
  lines.push("This is the JSON twin of `APPEARANCE_SCALE_COHORT.json`; the JSON is the record.");
  lines.push("");
  lines.push("## What is counted");
  lines.push("");
  lines.push("pdf-lib's `PDFForm.flatten()` places each widget appearance with a translation only and never applies");
  lines.push("the BBox-to-Rect mapping ISO 32000-1 12.5.5 requires. A widget whose appearance BBox, transformed by");
  lines.push(`its /Matrix, lands more than ${report.tolerancePt}pt from its own /Rect is therefore stamped at the wrong size, the`);
  lines.push("wrong place, or both.");
  lines.push("");
  lines.push("**Naming a family here repairs nothing about it.** The remedy is opt-in per builder");
  lines.push("(`fitAppearancesToRect`), and every family below still carries what is counted here unless its row says");
  lines.push("its builder opts in.");
  lines.push("");
  lines.push("**What this does not claim.** " + report.whatThisDoesNotClaim);
  lines.push("");
  lines.push("## Totals");
  lines.push("");
  lines.push(`| measure | count |`);
  lines.push(`| --- | ---: |`);
  lines.push(`| families with a source receipt | ${t.familiesWithASourceReceipt} |`);
  lines.push(`| families fully measurable here | ${t.familiesFullyMeasurable} |`);
  lines.push(`| families with a source NOT_MEASURABLE_HERE | ${t.familiesWithAtLeastOneSourceNotMeasurableHere} |`);
  lines.push(`| **families exposed** | **${t.familiesExposed}** |`);
  lines.push(`| exposed, builder opts in | ${t.familiesExposedWhoseBuilderOptsIn} |`);
  lines.push(`| exposed, still on the default | ${t.familiesExposedStillOnTheDefault} |`);
  lines.push(`| widgets exposed | ${t.widgetsExposed} |`);
  lines.push(`| documents measured | ${t.documentsMeasured} |`);
  lines.push(`| documents NOT_MEASURABLE_HERE | ${t.documentsNotMeasurableHere} |`);
  lines.push("");
  lines.push("## Source resolution");
  lines.push("");
  lines.push(`Method: ${report.sourceResolution.method}. `
    + `${report.sourceResolution.filesIndexedByObservedDigest} file(s) indexed by observed digest.`);
  lines.push("");
  for (const c of report.sourceResolution.custodiesMounted) lines.push(`- mounted: \`${c.custody}\` (${c.files} files)`);
  for (const c of report.sourceResolution.custodiesNotMountedHere) lines.push(`- NOT mounted here: \`${c}\``);
  lines.push("");
  lines.push("## Exposed families, and families with an unmeasurable source");
  lines.push("");
  lines.push("| family | juris. | widgets mismatched | worst displacement (pt) | MASTER_QUEUE state | builder opts in | sources not measurable |");
  lines.push("| --- | --- | ---: | ---: | --- | --- | ---: |");
  for (const f of rows) {
    lines.push(`| \`${f.familyId}\` | ${f.jurisdiction} | ${f.widgetsWithMismatchedAppearance} |`
      + ` ${f.worstDisplacementPt} | ${f.masterQueueState ?? "—"} |`
      + ` ${f.builderOptsIn === null ? "no builder found" : f.builderOptsIn ? "yes" : "no"} |`
      + ` ${f.documentsNotMeasurableHere} |`);
  }
  lines.push("");
  lines.push("## The mismatched widgets, per family");
  lines.push("");
  for (const f of rows.filter((x) => x.exposed)) {
    lines.push(`### \`${f.familyId}\``);
    lines.push("");
    for (const d of f.documents.filter((x) => x.mismatchedFields?.length)) {
      lines.push(`**${d.formNumber ?? d.sha256}** — ${d.widgets} widget(s), ${d.widgetsWithMismatchedAppearance} mismatched`);
      lines.push("");
      lines.push("| field | page | appearance BBox | /Matrix | transformed size | /Rect size | required scale | displacement (pt) |");
      lines.push("| --- | ---: | --- | --- | --- | --- | --- | ---: |");
      for (const m of d.mismatchedFields) {
        lines.push(`| \`${m.field}\` | ${m.page ?? "—"} | [${m.appearanceBBox.join(" ")}] |`
          + ` [${m.appearanceMatrix.join(" ")}] | ${m.transformedSize.width} × ${m.transformedSize.height} |`
          + ` ${m.widgetRect.width} × ${m.widgetRect.height} | ${m.requiredScale.x} × ${m.requiredScale.y} |`
          + ` ${m.displacementPt} |`);
      }
      lines.push("");
    }
  }
  const unmeasurable = report.families.filter((f) => f.documentsNotMeasurableHere > 0);
  lines.push("## NOT_MEASURABLE_HERE");
  lines.push("");
  if (unmeasurable.length === 0) lines.push("Every declared source resolved by content hash in this container.");
  for (const f of unmeasurable) {
    for (const d of f.documents.filter((x) => x.resolution === "NOT_MEASURABLE_HERE")) {
      lines.push(`- \`${f.familyId}\` — ${d.formNumber ?? "(no form number)"} \`${d.sha256 ?? "no digest"}\`: ${d.why}`);
    }
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

await main();
