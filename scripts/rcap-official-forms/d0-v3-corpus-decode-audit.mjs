// Audits the D0-v3 fixes against the real forms that exposed them.
//
// Run with: node scripts/rcap-official-forms/d0-v3-corpus-decode-audit.mjs [packRoot ...]
//
// The canary proves the decoder and the rich-text conversion behave on files
// built to exercise them. This proves it on the five binaries independent
// review actually failed the wave over: four Washington forms dispositioned as
// having no extractable text layer, and Missouri CR-145, which produced no
// artifact of any kind.
//
// Green when every named form decodes to readable text, no run moves, and
// CR-145 finalizes clean with its participant value visible. Skips cleanly
// without the private packs.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import { extractTextItems, groupIntoLines, partitionDecodableAnchors } from "./rcap-pdf-anchor-capture.mjs";
import { sanitizeAndFlatten, scanBytesForActiveContent } from "./rcap-active-content.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument } = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const EVIDENCE = path.join(rootDir, "data/rcap-all50/overlays/canary-d0/corpus-decode-audit.json");
const DEFAULT_ROOTS = ["/tmp/rcap-source-packs/ex-D1", "/tmp/rcap-source-packs/ex-D2", "/tmp/rcap-source-packs/ex-D3"];

// The forms the wave failed on, and what each must now yield. Named explicitly:
// an audit that discovers its own subjects can pass by finding none.
const SUBJECTS = [
  { family: "WA:blake-006-form-en", match: /BLAKE-006/, kind: "decode", minReadableLines: 100,
    expect: ["Court of Washington", "Plaintiff", "Defendant"] },
  { family: "WA:blake-008-form-en", match: /BLAKE-008/, kind: "decode", minReadableLines: 100,
    expect: ["Court of Washington", "Plaintiff"] },
  { family: "WA:crrlj-09-0100-form-en", match: /CRRLJ-09\.0100/, kind: "decode", minReadableLines: 100,
    expect: ["Court of Washington", "Plaintiff"] },
  { family: "WA:crrlj-09-0870-form-en", match: /CRRLJ-09\.0870/, kind: "decode", minReadableLines: 30,
    expect: ["Court of Washington"] },
  { family: "MO:cr145-form-petition-en", match: /CR145/, kind: "finalize",
    expect: ["Petition for Expungement"] }
];

const roots = process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_ROOTS;
const files = [];
for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  const walk = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p); else if (/\.pdf$/i.test(e.name)) files.push(p);
  } };
  walk(root);
}
if (files.length === 0) {
  console.log(`d0-v3-corpus-decode-audit: no source packs at ${roots.join(", ")} — skipped (needs the private packs)`);
  process.exit(0);
}

const failures = [];
const results = [];

for (const subject of SUBJECTS) {
  const file = files.find((f) => subject.match.test(path.basename(f)));
  if (!file) { failures.push(`${subject.family}: source not found in the packs`); continue; }
  const bytes = fs.readFileSync(file);
  const row = { family: subject.family, source: path.basename(file), kind: subject.kind, checks: [] };
  const check = (ok, msg, detail) => {
    row.checks.push({ ok, msg, ...(detail !== undefined ? { detail } : {}) });
    if (!ok) failures.push(`${subject.family}: ${msg}`);
  };

  if (subject.kind === "decode") {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const lines = doc.getPages().flatMap((p) => groupIntoLines(extractTextItems(p)));
    const readable = lines.filter((l) => /[A-Za-z]{3,}/.test(l.text));
    const text = lines.map((l) => l.text).join("\n");
    const partition = partitionDecodableAnchors(lines);

    check(readable.length >= subject.minReadableLines,
      `decodes at least ${subject.minReadableLines} readable lines`, readable.length);
    for (const phrase of subject.expect) {
      check(text.includes(phrase), `the decoded text contains "${phrase}"`);
    }
    // Geometry: every usable anchor must carry exact metrics, or its position
    // is an estimate and a value placed against it could land in the next
    // column.
    check(partition.usable.every((l) => l.metricsExact !== false),
      "every anchor offered for placement rests on the document's own metrics");
    check(partition.usableLines > 0, "at least one anchor survives the decodability gate", partition.usableLines);

    row.totalLines = lines.length;
    row.readableLines = readable.length;
    row.usableAnchors = partition.usableLines;
    row.refusedAnchors = partition.refusedByReason;
    row.sample = readable.slice(0, 3).map((l) => l.text.slice(0, 70));
  } else {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const form = doc.getForm();
    let filled = null;
    for (const f of form.getFields()) {
      if (f.constructor.name !== "PDFTextField") continue;
      try { f.setText("CORPUS AUDIT VALUE"); filled = f.getName(); break; } catch { /* try the next */ }
    }
    let out = null;
    let report = null;
    let error = null;
    try {
      const res = await sanitizeAndFlatten(doc, { writtenFieldNames: new Set([filled]) });
      report = res.report;
      out = await res.clean.save({ useObjectStreams: false });
    } catch (e) { error = e; }

    check(out !== null, `finalizes instead of aborting (${error?.message?.slice(0, 80) ?? ""})`);
    if (out) {
      const scan = scanBytesForActiveContent(out);
      const text = (await PDFDocument.load(out, { ignoreEncryption: true })).getPages()
        .flatMap((p) => groupIntoLines(extractTextItems(p)).map((l) => l.text)).join("\n");
      check(scan.clean === true, "the finalized artifact is inspectable and free of active content", scan.verdict);
      check(text.includes("CORPUS AUDIT VALUE"), "the participant value written into it is visible");
      for (const phrase of subject.expect) check(text.includes(phrase), `the form's own text contains "${phrase}"`);
      check(!/\/RV/.test(Buffer.from(out).toString("latin1")), "no rich-text packet reaches the filed artifact");
      check((report.richTextFieldsNeutralized ?? []).length > 0,
        "the conversion is recorded", (report.richTextFieldsNeutralized ?? []).map((r) => r.field));
      row.pages = (await PDFDocument.load(out, { ignoreEncryption: true })).getPageCount();
      row.bytes = out.length;
      row.richTextFieldsNeutralized = report.richTextFieldsNeutralized;
    }
  }
  results.push(row);
}

const totals = {
  subjects: SUBJECTS.length,
  audited: results.length,
  checks: results.reduce((n, r) => n + r.checks.length, 0),
  failed: failures.length
};
fs.mkdirSync(path.dirname(EVIDENCE), { recursive: true });
fs.writeFileSync(EVIDENCE, `${JSON.stringify({ schema: "d0-v3-corpus-decode-audit/v1", totals, subjects: results }, null, 2)}\n`);

console.log(JSON.stringify(totals, null, 2));
for (const r of results) {
  console.log(`  ${r.family.padEnd(32)} ${r.kind === "decode"
    ? `readable=${r.readableLines}/${r.totalLines} usableAnchors=${r.usableAnchors}`
    : `pages=${r.pages ?? "-"} bytes=${r.bytes ?? "-"}`}`);
}
if (failures.length > 0) {
  console.error("\nd0-v3-corpus-decode-audit FAILED");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log(`\nd0-v3-corpus-decode-audit passed: ${totals.checks} checks across ${totals.audited} real forms.`);
