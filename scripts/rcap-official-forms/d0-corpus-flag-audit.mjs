// Audits the print-flag fix against the real source corpus, run by run.
//
// Run with: node scripts/rcap-official-forms/d0-corpus-flag-audit.mjs [packRoot ...]
//
// The canary proves the fix behaves correctly on a form built to exercise it.
// This proves it behaves correctly on the forms the D wave actually renders,
// which is the claim that matters: the review found non-printing ink in filed
// artifacts across five states, and a fix that removes the wrong thing would be
// worse than the defect it replaces.
//
// The comparison is deliberately old-path against new-path, both flattened. A
// naive comparison of the untouched source against the flattened output reports
// false differences, because flattening draws field values into page content
// and regroups the lines around them. Comparing the two flattened outputs
// isolates exactly what the flag test changed.
//
// Green when every removed text run sits inside a widget the source marks as
// not printing, and no run is added.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import { sanitizeAndFlatten, readAnnotationFlags } from "./rcap-active-content.mjs";
import { extractTextItems } from "./rcap-pdf-anchor-capture.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const EVIDENCE = path.join(rootDir, "data/rcap-all50/overlays/canary-d0/corpus-flag-audit.json");
const DEFAULT_ROOTS = ["/tmp/rcap-source-packs/ex-D1", "/tmp/rcap-source-packs/ex-D2", "/tmp/rcap-source-packs/ex-D3"];

function collectPdfs(roots) {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.pdf$/i.test(entry.name)) out.push(p);
    }
  };
  for (const root of roots) { if (fs.existsSync(root)) walk(root); }
  return out.sort();
}

/** Every text run in a document, keyed by page, string and rounded position. */
async function runsOf(bytes) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return doc.getPages().flatMap((page, i) =>
    extractTextItems(page).map((t) => ({ page: i + 1, text: t.text, x: Math.round(t.x), y: Math.round(t.y) })));
}
const runKey = (r) => `${r.page}|${r.text}|${r.x}|${r.y}`;

/** Does this run fall inside any of these widget rectangles, on its page? */
function insideAny(run, boxes) {
  return boxes.some((b) => b.page === run.page
    && run.x >= b.rect[0] - 2 && run.x <= b.rect[2] + 2
    && run.y >= b.rect[1] - 2 && run.y <= b.rect[3] + 2);
}

async function auditOne(file) {
  const bytes = fs.readFileSync(file);

  // Where the source says its non-printing widgets sit.
  const probe = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  let fields;
  try { fields = probe.getForm().getFields(); } catch { return null; }
  if (fields.length === 0) return null;

  const nonPrinting = [];
  const pageIndexOf = new Map(probe.getPages().map((p, i) => [p.ref?.tag ?? p.node, i + 1]));
  for (const field of fields) {
    let name = "(unnamed)";
    try { name = field.getName(); } catch { /* judged on flags regardless */ }
    for (const widget of field.acroField.getWidgets()) {
      const flags = readAnnotationFlags(widget.dict);
      if (flags.partOfFiledAppearance) continue;
      let rect = null;
      try { const r = widget.getRectangle(); rect = [r.x, r.y, r.x + r.width, r.y + r.height]; } catch { rect = null; }
      // Which page carries it: the widget's /P, or every page if it is absent.
      let page = null;
      try { page = pageIndexOf.get(probe.context.lookup(widget.dict.get(require("pdf-lib").PDFName.of("P")))) ?? null; } catch { page = null; }
      nonPrinting.push({ field: name, reason: flags.reason, rect, page });
    }
  }
  if (nonPrinting.length === 0) return null;

  // Old path: flatten everything, exactly as the previous factory did.
  const oldDoc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  let oldRuns;
  try {
    const form = oldDoc.getForm();
    form.updateFieldAppearances();
    form.flatten();
    oldRuns = await runsOf(await oldDoc.save({ useObjectStreams: false }));
  } catch (error) {
    return { file, skipped: `old path could not flatten: ${error.message.slice(0, 90)}` };
  }

  // New path.
  const newDoc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  let newRuns;
  let report;
  try {
    const out = await sanitizeAndFlatten(newDoc);
    report = out.report;
    newRuns = await runsOf(await out.clean.save({ useObjectStreams: false }));
  } catch (error) {
    return { file, skipped: `new path refused: ${error.name}: ${error.message.slice(0, 90)}` };
  }

  const newKeys = new Set(newRuns.map(runKey));
  const oldKeys = new Set(oldRuns.map(runKey));
  const removed = oldRuns.filter((r) => !newKeys.has(runKey(r)));
  const added = newRuns.filter((r) => !oldKeys.has(runKey(r)));

  // Every removal must be explained by a non-printing widget. A removal that
  // is not is the failure this audit exists to find.
  const boxes = nonPrinting.filter((n) => n.rect).map((n) => ({ page: n.page, rect: n.rect }));
  const unexplained = removed.filter((r) => !insideAny(r, boxes.map((b) => ({ ...b, page: b.page ?? r.page }))));

  return {
    file: path.basename(file),
    nonPrintingWidgets: nonPrinting.length,
    suppressedByFactory: (report.nonPrintingWidgetsSuppressed ?? []).length,
    runsOld: oldRuns.length,
    runsNew: newRuns.length,
    removed: removed.length,
    added: added.length,
    unexplainedRemovals: unexplained.length,
    removedSample: removed.slice(0, 8).map((r) => ({ page: r.page, text: r.text.slice(0, 40), x: r.x, y: r.y })),
    unexplainedSample: unexplained.slice(0, 8).map((r) => ({ page: r.page, text: r.text.slice(0, 40), x: r.x, y: r.y }))
  };
}

const roots = process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_ROOTS;
const pdfs = collectPdfs(roots);
if (pdfs.length === 0) {
  console.log(`d0-corpus-flag-audit: no source packs at ${roots.join(", ")} — skipped (this audit needs the private packs)`);
  process.exit(0);
}

const results = [];
for (const file of pdfs) {
  const r = await auditOne(file);
  if (r) results.push(r);
}

const audited = results.filter((r) => !r.skipped);
const totals = {
  packRoots: roots,
  pdfsScanned: pdfs.length,
  formsCarryingNonPrintingWidgets: results.length,
  formsAudited: audited.length,
  formsSkipped: results.length - audited.length,
  runsRemovedTotal: audited.reduce((n, r) => n + r.removed, 0),
  runsAddedTotal: audited.reduce((n, r) => n + r.added, 0),
  formsWithUnexplainedRemovals: audited.filter((r) => r.unexplainedRemovals > 0).length,
  unexplainedRemovalsTotal: audited.reduce((n, r) => n + r.unexplainedRemovals, 0)
};

fs.mkdirSync(path.dirname(EVIDENCE), { recursive: true });
fs.writeFileSync(EVIDENCE, `${JSON.stringify({ schema: "d0-corpus-flag-audit/v1", totals, forms: results }, null, 2)}\n`);

console.log(JSON.stringify(totals, null, 2));
for (const r of results.filter((x) => x.skipped)) console.log(`  SKIPPED ${r.file ?? r.file}: ${r.skipped}`);

const failed = totals.unexplainedRemovalsTotal > 0 || totals.runsAddedTotal > 0;
if (failed) {
  console.error("\nd0-corpus-flag-audit FAILED: the flag test changed text it cannot account for");
  for (const r of audited.filter((x) => x.unexplainedRemovals > 0 || x.added > 0)) {
    console.error(` - ${r.file}: ${r.unexplainedRemovals} unexplained removal(s), ${r.added} addition(s)`);
    for (const s of r.unexplainedSample) console.error(`     p${s.page} @(${s.x},${s.y}) ${JSON.stringify(s.text)}`);
  }
  process.exit(1);
}
console.log(`\nd0-corpus-flag-audit passed: ${totals.runsRemovedTotal} run(s) removed across `
  + `${totals.formsAudited} form(s), every one inside a widget the source marks as not printing; 0 added.`);
