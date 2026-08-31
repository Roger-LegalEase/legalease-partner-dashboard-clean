#!/usr/bin/env node
// Does this packet contain everything a filing needs?
//
//   node scripts/rcap-packet-completeness/verify-packet-completeness.mjs [--family <id>] [--write] [--mutations]
//
// The build verifiers ask whether every write was correct. This asks whether
// every write that was owed was made. Those are different questions, and only
// the second one catches a CR-180 that carries a case number, a defendant name,
// and five empty offence rows.
//
// A packet returns PASS only when all nine counters are zero. There is no
// partial credit and no "mostly complete": a filing with a blank offence code is
// not 97 percent filable, it is unfilable.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { BLANK_DISPOSITIONS, PASS_COUNTERS, RESULT_CLASSES, REFUSAL_CLASSES, classifyField, classifyBlank, rowKeyOf } from "./completeness-contract.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ARGS = process.argv.slice(2);
const WRITE = ARGS.includes("--write");
const MUTATIONS = ARGS.includes("--mutations");
const ONLY = ARGS.includes("--family") ? ARGS[ARGS.indexOf("--family") + 1] : null;
const OUT = "data/rcap-grade-a/packet-completeness/PACKET_COMPLETENESS_MATRIX.json";
const OVERLAYS = "data/rcap-all50/overlays/census-v1";

const readIf = (rel) => { const p = path.join(ROOT, rel); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null; };

/** Both field-map shapes reduced to one row: an id, a label, a name, a reason. */
const normalizeRow = (row, document = null) => ({
  id: row.fieldId ?? row.fieldName ?? row.field ?? row.id ?? null,
  name: row.fieldName ?? row.field ?? row.fieldId ?? "",
  label: row.effectiveLabel ?? row.semanticLabel ?? row.sourceLabel ?? row.printedLine ?? row.label ?? row.field ?? "",
  reason: row.reason ?? row.refusalReason ?? "",
  refusalClass: row.refusalClass ?? null,
  role: row.role ?? null,
  page: row.page ?? row.widgets?.[0]?.page ?? row.widgets?.[0]?.pageIndex ?? null,
  document: row.documentId ?? row.formNumber ?? document
});

/**
 * FIVE field-map schemas exist across 43 families, all in one return.
 *
 *   writes[] + refusals[]                          -- measured overlay and AcroForm
 *   documents[].fields[] with a decision word      -- New Jersey, New York
 *   documents[].writableAnchors[] + withheld[]     -- Washington
 *   maps[].canonicalWrites[] + canonicalRefusals[] -- West Virginia
 *
 * This is WEC-5 at fleet scale, and it is the reason nothing could check
 * completeness before: no single reader could see what any family had written.
 * Reading only the first shape reported twenty-one families as having zero
 * terminal fields, which would have passed them for having nothing to get
 * wrong. An unread schema is REFUSED as unauditable, never read as empty.
 */
function readFieldRows(fieldMap) {
  if (Array.isArray(fieldMap.writes) || Array.isArray(fieldMap.refusals)) {
    return {
      writes: (fieldMap.writes ?? []).map((r) => normalizeRow(r)),
      blanks: (fieldMap.refusals ?? []).map((r) => normalizeRow(r)),
      schema: "writes-and-refusals"
    };
  }
  if (Array.isArray(fieldMap.documents)) {
    const writes = []; const blanks = [];
    let shape = null;
    for (const doc of fieldMap.documents) {
      const id = doc.documentId ?? doc.formNumber ?? null;
      // decision-per-field (New Jersey, New York)
      for (const f of doc.fields ?? []) {
        shape = "documents-and-decisions";
        const row = normalizeRow(f, id);
        const decision = String(f.decision ?? "").toLowerCase();
        if (decision === "refuse" || decision === "") blanks.push(row);
        else writes.push(row);
      }
      // anchors-and-withheld (Washington)
      for (const a of doc.writableAnchors ?? []) {
        shape = shape ?? "anchors-and-withheld";
        writes.push(normalizeRow({ fieldId: a.blankId, label: a.label ?? a.printedCaption, page: a.page }, id));
      }
      for (const w of doc.withheld ?? []) {
        shape = shape ?? "anchors-and-withheld";
        blanks.push(normalizeRow({ fieldId: w.blankId, label: w.printedCaption ?? w.label, reason: w.reason, refusalClass: w.category, page: w.page }, id));
      }
    }
    if (shape) return { writes, blanks, schema: shape };
  }
  // maps-with-canonical-and-boundary (West Virginia)
  if (Array.isArray(fieldMap.maps)) {
    const writes = []; const blanks = [];
    for (const map of fieldMap.maps) {
      const id = map.formNumber ?? null;
      for (const w of map.canonicalWrites ?? []) writes.push(normalizeRow({ fieldId: w.field, label: w.field, ...w }, id));
      for (const r of map.canonicalRefusals ?? []) blanks.push(normalizeRow({ fieldId: r.field, label: r.regionHeading ? `${r.regionHeading} ${r.field}` : r.field, reason: r.reason, refusalClass: r.category }, id));
      for (const r of map.roleRefusals ?? []) blanks.push(normalizeRow({ fieldId: r.field, label: r.field, reason: r.why, refusalClass: r.class }, id));
      for (const c of map.selectionControls ?? []) {
        if (String(c.disposition ?? "").toLowerCase().startsWith("select")) writes.push(normalizeRow({ fieldId: c.selectionId, label: c.field }, id));
        else blanks.push(normalizeRow({ fieldId: c.selectionId, label: `${c.field} (selection)`, reason: c.reason, refusalClass: c.kind }, id));
      }
    }
    return { writes, blanks, schema: "maps-with-canonical-and-boundary" };
  }
  return { writes: [], blanks: [], schema: null };
}

function auditFamily(dir, familyId) {
  const fieldMap = readIf(`${dir}/production-field-map.json`);
  const actualWrites = readIf(`${dir}/reports/actual-writes.json`);
  const rendered = readIf(`${dir}/reports/rendered-artifacts.json`);
  const receipt = readIf(`${dir}/source-receipt.json`);
  const approval = readIf(`${dir}/approval-request.json`);

  const counters = Object.fromEntries(PASS_COUNTERS.map((c) => [c, 0]));
  const findings = [];
  const note = (counter, detail) => { counters[counter] += 1; findings.push({ counter, ...detail }); };

  if (!fieldMap) {
    return {
      familyId, directory: dir, result: "FAIL_COMPONENT_SET", counters,
      totals: { terminalFields: 0, written: 0, blank: 0, blanksByDisposition: {}, rowsInspected: 0 },
      findings: [{ counter: "requiredComponentsMissing", why: "the family has no production-field-map.json, so nothing states what it was supposed to write" }],
      auditable: false
    };
  }

  const { writes, blanks, schema } = readFieldRows(fieldMap);
  if (schema === null) {
    return {
      familyId, directory: dir, result: "FAIL_COMPONENT_SET", counters,
      totals: { terminalFields: 0, written: 0, blank: 0, blanksByDisposition: {}, rowsInspected: 0 },
      findings: [{ counter: "requiredComponentsMissing", why: `the field map uses a schema this verifier does not read (${Object.keys(fieldMap).join(", ")}); it is refused rather than read as empty` }],
      auditable: false
    };
  }

  // ---- every blank earns its blankness ------------------------------------------
  const blankLedger = [];
  for (const blank of blanks) {
    const verdict = classifyBlank(blank, blank.reason, blank.refusalClass);
    blankLedger.push({ ...blank, ...verdict });
    const spec = BLANK_DISPOSITIONS[verdict.disposition];
    if (spec.allowed) continue;
    if (verdict.disposition === "KNOWN_FACT_NOT_WRITTEN") {
      note("knownRequiredFieldsMissing", { field: blank.id, label: blank.label, disposition: verdict.disposition, basis: verdict.basis, reasonGiven: blank.reason || null });
    } else if (verdict.disposition === "ROUTE_OPTION_NOT_SELECTED") {
      note("requiredOptionsMissing", { field: blank.id, label: blank.label, disposition: verdict.disposition, basis: verdict.basis, reasonGiven: blank.reason || null });
    } else {
      note("unclassifiedBlanks", { field: blank.id, label: blank.label, disposition: verdict.disposition, basis: verdict.basis, reasonGiven: blank.reason || null });
    }
  }

  // A REQUIRED_BEFORE_FILING blank is only allowed when the packet actually tells
  // the participant to supply it. Nothing in these families does, so a required
  // fact the platform does not hold is counted as not collected rather than
  // quietly forgiven.
  const instructions = fs.existsSync(path.join(ROOT, `${dir}/participant-instructions.md`))
    ? fs.readFileSync(path.join(ROOT, `${dir}/participant-instructions.md`), "utf8") : "";
  for (const b of blankLedger.filter((x) => x.disposition === "REQUIRED_BEFORE_FILING")) {
    if (!instructions || !new RegExp(String(b.label).slice(0, 24).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(instructions)) {
      note("requiredFactsNotCollected", { field: b.id, label: b.label, why: "classified required-before-filing but not surfaced to the participant anywhere in the packet" });
    }
  }

  // ---- rows are complete or they are not rows -----------------------------------
  const rows = new Map();
  for (const f of [...writes.map((w) => ({ ...w, written: true })), ...blanks.map((b) => ({ ...b, written: false }))]) {
    const key = rowKeyOf(f);
    if (!key) continue;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(f);
  }
  for (const [key, cells] of rows) {
    const anyWritten = cells.some((c) => c.written);
    if (!anyWritten) continue;
    const missing = cells.filter((c) => !c.written && classifyField(c.label).requirement === "REQUIRED_KNOWN");
    if (missing.length > 0) {
      note("incompleteRows", { row: key, missingCells: missing.map((m) => m.label).slice(0, 6), why: "the row carries written cells beside required cells left blank, which reads as a finished row that is not one" });
    }
  }

  // ---- a write with no ink is not a write ---------------------------------------
  for (const artifact of actualWrites?.artifacts ?? []) {
    const reported = artifact.valuesReportedByFinalizer ?? artifact.finalizerWritten ?? null;
    const glyphs = artifact.addedGlyphsReadFromOutputBytes ?? null;
    const appearances = artifact.flattenedWidgetAppearancesReadFromOutputBytes ?? null;
    const visible = (typeof glyphs === "number" ? glyphs : 0) + (typeof appearances === "number" ? appearances : 0);
    if (typeof reported === "number" && reported > 0 && visible === 0) {
      note("invisibleWrites", { fixture: artifact.fixture, reportedByFinalizer: reported, glyphsInOutput: glyphs, appearancesInOutput: appearances, why: "the finalizer reported values but the output bytes carry no glyph and no flattened appearance" });
    }
    const outsideBoxes = artifact.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes;
    if (typeof outsideBoxes === "number" && outsideBoxes > 0) {
      note("visualDefects", { fixture: artifact.fixture, glyphsOutsideMeasuredBoxes: outsideBoxes, why: "ink landed outside every measured write box, which is an overlap or a stray mark" });
    }
    for (const refused of artifact.refusedFieldsWithInk ?? []) {
      note("protectedWrites", { fixture: artifact.fixture, field: refused.fieldId ?? refused, why: "a field the map refused carries ink in the output" });
    }
  }
  for (const w of writes) {
    if (classifyField(w.label).requirement === "PROTECTED") {
      note("protectedWrites", { field: w.id, label: w.label, why: "a protected field was written" });
    }
  }

  // ---- the component set ---------------------------------------------------------
  // A component the packet MAPS but never RENDERS is the missing-companion-form
  // defect: the field map knows the document exists and the participant never
  // receives it. Checked in that direction, from the map to the render, because
  // the map is what claims the document belongs in the packet.
  const renderedText = JSON.stringify(rendered ?? {}).toLowerCase()
    + JSON.stringify((rendered?.packets ?? []).flatMap((p) => p.documents ?? [])).toLowerCase();
  const mappedDocuments = new Set([...writes, ...blanks].map((f) => f.document).filter(Boolean));
  const receiptDocuments = new Set([...(receipt?.sources ?? []), ...(receipt?.documents ?? [])]
    .map((d) => d.documentId ?? d.formNumber).filter(Boolean));
  const renderedFileNames = fs.existsSync(path.join(ROOT, `${dir}/fixtures`))
    ? fs.readdirSync(path.join(ROOT, `${dir}/fixtures`), { recursive: true }).join(" ").toLowerCase() : "";
  const componentAppears = (id) => {
    const needle = String(id).toLowerCase();
    const loose = needle.replace(/[^a-z0-9]/g, "");
    return renderedText.includes(needle) || renderedFileNames.includes(needle)
      || renderedText.replace(/[^a-z0-9]/g, "").includes(loose)
      || renderedFileNames.replace(/[^a-z0-9]/g, "").includes(loose);
  };
  if (rendered && (rendered.packets ?? []).length > 0 && (rendered.packets ?? []).every((p) => (p.documents ?? []).length === 0)) {
    note("requiredComponentsMissing", { why: "the family reports rendered packets with no documents in them" });
  }
  for (const docId of new Set([...mappedDocuments, ...receiptDocuments])) {
    if (!componentAppears(docId)) {
      note("requiredComponentsMissing", { component: docId, why: "the field map or source receipt names this document as part of the packet, and it appears in no rendered artifact" });
    }
  }

  // ---- currentness ---------------------------------------------------------------
  //
  // Two receipt schemas: sources[] with allSourcesExact, and documents[] with a
  // per-document sha256. A first pass treated the ABSENT flag on the second
  // schema as a failure and reported 32 families defective for using a different
  // record shape -- absent is not false, and reading it that way would have
  // buried the real findings under noise. Currentness now resolves from whichever
  // shape is present, and only a receipt that states nothing about its sources is
  // reported as unknown.
  let currentness = "UNKNOWN";
  if (receipt) {
    if (typeof receipt.allSourcesExact === "boolean") {
      currentness = receipt.allSourcesExact ? "EXACT" : "NOT_EXACT";
    } else if (Array.isArray(receipt.documents) && receipt.documents.length > 0) {
      currentness = receipt.documents.every((d) => typeof d.sha256 === "string" && d.sha256.length === 64) ? "EXACT" : "NOT_EXACT";
    } else if (Array.isArray(receipt.sources) && receipt.sources.length > 0) {
      currentness = receipt.sources.every((d) => d.sha256Exact === true) ? "EXACT" : "NOT_EXACT";
    }
  }
  if (currentness === "NOT_EXACT") {
    note("visualDefects", { why: "the family's own source receipt does not bind every source to an exact SHA-256" });
  }

  const failed = PASS_COUNTERS.filter((c) => counters[c] > 0);
  let result = "PASS_COMPLETE";
  if (counters.protectedWrites > 0) result = "FAIL_PROTECTED_WRITE";
  else if (counters.invisibleWrites > 0 || counters.visualDefects > 0) result = "FAIL_VISIBLE_APPEARANCE";
  else if (counters.knownRequiredFieldsMissing > 0 || counters.incompleteRows > 0 || counters.requiredFactsNotCollected > 0) result = "FAIL_MISSING_REQUIRED_FACTS";
  else if (counters.requiredOptionsMissing > 0) result = "FAIL_ROUTE_SELECTION";
  else if (counters.unclassifiedBlanks > 0) result = "FAIL_MISSING_PREFILLS";
  else if (counters.requiredComponentsMissing > 0) result = "FAIL_COMPONENT_SET";
  else if (currentness !== "EXACT") result = "FAIL_CURRENTNESS";

  return {
    familyId, directory: dir, result, auditable: true,
    counters, failedCounters: failed,
    totals: {
      terminalFields: writes.length + blanks.length,
      written: writes.length,
      blank: blanks.length,
      blanksByDisposition: blankLedger.reduce((acc, b) => { acc[b.disposition] = (acc[b.disposition] ?? 0) + 1; return acc; }, {}),
      rowsInspected: rows.size,
      fieldMapSchema: schema
    },
    outputApprovalStatus: approval?.status ?? null,
    sourceCurrentness: currentness,
    // Not truncated. A completeness record that elides findings is the same
    // failure it exists to catch: the reader sees a short list and assumes the
    // list is the problem. The repair specification needs every field.
    findings,
    findingsTruncated: 0
  };
}

// ---- enumerate ---------------------------------------------------------------------
const families = [];
for (const state of fs.readdirSync(path.join(ROOT, OVERLAYS))) {
  const stateDir = path.join(ROOT, OVERLAYS, state);
  if (!fs.statSync(stateDir).isDirectory()) continue;
  for (const entry of fs.readdirSync(stateDir)) {
    const dir = `${OVERLAYS}/${state}/${entry}`;
    if (!fs.existsSync(path.join(ROOT, dir, "approval-request.json"))) continue;
    const familyId = readIf(`${dir}/approval-request.json`)?.familyId ?? entry.replace(/--[a-z-]+$/, "");
    families.push({ dir, familyId });
  }
}

const c11 = readIf("data/rcap-grade-a/launch-control/C11_RETURN_REVIEW.json");
const built = new Set((c11?.families ?? []).filter((f) => f.classification === "BUILT").map((f) => f.familyId));
const targets = families.filter((f) => built.has(f.familyId) && (!ONLY || f.familyId === ONLY));

const results = targets.map((t) => auditFamily(t.dir, t.familyId))
  .sort((a, b) => a.familyId.localeCompare(b.familyId));

const byResult = results.reduce((acc, r) => { acc[r.result] = (acc[r.result] ?? 0) + 1; return acc; }, {});
const totals = Object.fromEntries(PASS_COUNTERS.map((c) => [c, results.reduce((n, r) => n + (r.counters[c] ?? 0), 0)]));

const doc = {
  schemaVersion: "rcap-packet-completeness-matrix/v1",
  generatedBy: "scripts/rcap-packet-completeness/verify-packet-completeness.mjs",
  contract: "scripts/rcap-packet-completeness/completeness-contract.mjs",
  question: "Does every built packet contain everything a filing needs, or only everything the build chose to write?",
  whatTheOldPassProved:
    "That every write was correct: bound to exact source bytes, inside a measured box, off every protected field. It never asked what was owed, so a family could pass having written 6 of 187 fields.",
  passRule: `A family returns PASS_COMPLETE only when all ${PASS_COUNTERS.length} counters are zero: ${PASS_COUNTERS.join(", ")}.`,
  resultClasses: RESULT_CLASSES,
  familiesAudited: results.length,
  byResult,
  counterTotals: totals,
  results
};

const outPath = path.join(ROOT, OUT);
for (const r of results) {
  const mark = r.result === "PASS_COMPLETE" ? "ok  " : "FAIL";
  console.log(`  ${mark} ${r.familyId.padEnd(46)} ${r.result.padEnd(28)} ${r.totals.written}/${r.totals.terminalFields} written`);
}
console.log(`\n  ${results.length} famil(ies) audited · ${byResult.PASS_COMPLETE ?? 0} PASS_COMPLETE`);
for (const [k, v] of Object.entries(byResult).filter(([k]) => k !== "PASS_COMPLETE")) console.log(`  ${String(v).padStart(3)} ${k}`);
console.log(`\n  counters: ${PASS_COUNTERS.map((c) => `${c} ${totals[c]}`).join(" · ")}`);

if (WRITE) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(doc, null, 2) + "\n");
  console.log(`\nWrote ${OUT}`);
}

if (MUTATIONS) {
  console.log("\nmutations — each injects a defect the old PASS definition accepted:");
  const sample = targets[0];
  const original = fs.readFileSync(path.join(ROOT, `${sample.dir}/production-field-map.json`));
  const originalWrites = fs.existsSync(path.join(ROOT, `${sample.dir}/reports/actual-writes.json`))
    ? fs.readFileSync(path.join(ROOT, `${sample.dir}/reports/actual-writes.json`)) : null;
  const cases = [
    { name: "a missing participant name is caught", counter: "knownRequiredFieldsMissing", mutate: (m) => { m.refusals.push({ fieldId: "mut-name", effectiveLabel: "DEFENDANT:", reason: "No allowlisted, source-supported fact is offered to this terminal field." }); return m; } },
    { name: "a missing mailing address is caught", counter: "knownRequiredFieldsMissing", mutate: (m) => { m.refusals.push({ fieldId: "mut-addr", effectiveLabel: "MAILING ADDRESS:", reason: "No allowlisted, source-supported fact is offered to this terminal field." }); return m; } },
    { name: "a missing court identity is caught", counter: "knownRequiredFieldsMissing", mutate: (m) => { m.refusals.push({ fieldId: "mut-court", effectiveLabel: "SUPERIOR COURT OF CALIFORNIA, COUNTY OF", reason: "never prefilled by this build" }); return m; } },
    { name: "an incomplete offence row is caught", counter: "incompleteRows", mutate: (m) => { m.writes.push({ fieldId: "mut-row-a", fieldName: "Item9[0].Row7[0].CaseNo[0]", effectiveLabel: "CASE NUMBER:" }); m.refusals.push({ fieldId: "mut-row-b", fieldName: "Item9[0].Row7[0].Section[0]", effectiveLabel: "Section", reason: "No allowlisted, source-supported fact is offered to this terminal field." }); return m; } },
    { name: "a missing route checkbox is caught", counter: "requiredOptionsMissing", mutate: (m) => { m.refusals.push({ fieldId: "mut-route", effectiveLabel: "Eligible for reduction to misdemeanor under Penal Code, § 17(b) (yes or no)", reason: "Legal election or conditional choice not established by this evidence variant" }); return m; } },
    { name: "a missing companion form is caught", counter: "requiredComponentsMissing", mutate: (m) => { m.writes.push({ fieldId: "mut-comp", effectiveLabel: "CASE NUMBER:", documentId: "MUT-COMPANION-FORM-NOT-RENDERED" }); return m; } },
    { name: "a protected write is caught", counter: "protectedWrites", mutate: (m) => { m.writes.push({ fieldId: "mut-sig", effectiveLabel: "Petitioner's Signature" }); return m; } },
    { name: "an unexplained blank is caught", counter: "unclassifiedBlanks", mutate: (m) => { m.refusals.push({ fieldId: "mut-blank", effectiveLabel: "Zzqx unmatched terminal", reason: "" }); return m; } }
  ];
  const writeCases = originalWrites ? [
    { name: "an invisible field value is caught", counter: "invisibleWrites", mutate: (a) => { a.artifacts[0].valuesReportedByFinalizer = 12; a.artifacts[0].addedGlyphsReadFromOutputBytes = 0; a.artifacts[0].flattenedWidgetAppearancesReadFromOutputBytes = 0; return a; } },
    { name: "an unintended graphic outside every write box is caught", counter: "visualDefects", mutate: (a) => { a.artifacts[0].nonWhitespaceGlyphsOutsideMeasuredWriteBoxes = 4; return a; } }
  ] : [];
  const baseline = auditFamily(sample.dir, sample.familyId);
  let undetected = 0;
  const run = (file, originalBuf, testCase) => {
    fs.writeFileSync(file, JSON.stringify(testCase.mutate(JSON.parse(originalBuf.toString("utf8"))), null, 2) + "\n");
    const after = auditFamily(sample.dir, sample.familyId);
    fs.writeFileSync(file, originalBuf);
    const caught = after.counters[testCase.counter] > baseline.counters[testCase.counter];
    console.log(`  ${caught ? "detected " : "MISSED   "} ${testCase.name}`);
    if (!caught) undetected += 1;
  };
  try {
    for (const c of cases) run(path.join(ROOT, `${sample.dir}/production-field-map.json`), original, c);
    for (const c of writeCases) run(path.join(ROOT, `${sample.dir}/reports/actual-writes.json`), originalWrites, c);
  } finally {
    fs.writeFileSync(path.join(ROOT, `${sample.dir}/production-field-map.json`), original);
    if (originalWrites) fs.writeFileSync(path.join(ROOT, `${sample.dir}/reports/actual-writes.json`), originalWrites);
  }
  const restored = fs.readFileSync(path.join(ROOT, `${sample.dir}/production-field-map.json`)).equals(original);
  console.log(`\n  sample family: ${sample.familyId}`);
  console.log(`  every mutated file restored byte-for-byte: ${restored}`);
  if (!restored || undetected > 0) { console.error("the completeness verifier proves less than it claims."); process.exit(1); }
  console.log(`\nOK completeness mutations — ${cases.length + writeCases.length} case(s), every injected defect caught.`);
}
