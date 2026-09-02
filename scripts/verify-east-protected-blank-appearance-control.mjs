#!/usr/bin/env node
// Control for ONE reproduced defect in the EAST shared host's protected-field
// ink gate.
//
// THE DEFECT. The gate asked "what painted paths does the finished artifact
// carry that the RAW source did not". For a protected BUTTON that is the wrong
// question. The raw source keeps its checkboxes and radios as live widgets
// whose blank /Off face lives in an /AP appearance stream rather than in the
// page content; the host's own normalization -- delete /V and /DV, force every
// button widget to /AS /Off, then flatten -- moves that untouched blank face
// INTO the page content. Rhode Island's DC-33 notary control `Group2` then read
// as 25 newly painted paths on page 4 and failed the gate, although the build
// had painted nothing: what it saw was the checkbox's own empty box and its
// hairlines. The family had been un-rebuildable through its owning script for
// exactly this reason.
//
// THE CORRECTION, under the owner decision of 2026-09-02, is a change of
// BASELINE and not of rule: compare against a ZERO-WRITE SOURCE-NORMALIZED
// FLATTENED BASELINE -- the same source through the same sanitizer, the same
// finalizer and the same flatten with every field classified unwritable -- and
// treat only paths BEYOND that baseline as artifact-added.
//
// WHAT THIS CONTROL PROVES. The decision is explicit that this is not
// authorization to ignore vector paths in protected fields generally, so the
// excuse has to be shown to be narrow:
//
//   POSITIVE -- the unchanged source-owned /Off appearance passes, and passes
//   with all six of the decision's conditions individually recorded.
//
//   NEGATIVE A -- a participant-like mark painted inside the very same widget
//   still fails the gate.
//
//   NEGATIVE B -- an on-state surviving into the flatten for the very same
//   field still fails the gate.
//
// Both negatives drive the SAME exported gate the build drives, on the SAME
// widget, so a control that stayed green would mean the excuse had swallowed
// the rule.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import {
  evaluateProtectedFieldInk, zeroWriteNormalizedBaseline,
} from "./build-census-v1-nj_arrest_no_conviction-set.mjs";
import { flattenedWidgets } from "./rcap-official-forms/pdf-flattened-widgets.mjs";

const require = createRequire(import.meta.url);
const { PDFDocument, PDFName, rgb } = require("pdf-lib");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const abs = (relative) => path.join(rootDir, relative);
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

// The reproduced defect, named exactly.
const FAMILY_DIR = "data/rcap-all50/overlays/census-v1/ri/ri-nonconviction-sealing-set--official-pdf-fill";
const DOCUMENT_ID = "RI-DC-33";
const PROTECTED_FIELD = "Group2";
const FIXTURE = "canonical";

let failures = 0;
const ok = (name, detail) => console.log(`  ok   ${name}${detail ? ` — ${detail}` : ""}`);
const bad = (name, detail) => { failures += 1; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); };
const control = async (name, fn) => {
  try { ok(name, await fn()); } catch (error) { bad(name, error.message); }
};

const census = readJson(abs(`${FAMILY_DIR}/field-census.census-v1.json`))
  .documents.find((row) => row.documentId === DOCUMENT_ID);
assert.ok(census, `${DOCUMENT_ID}: committed census is missing`);
const fieldMap = readJson(abs(`${FAMILY_DIR}/production-field-map.json`))
  .documents.find((row) => row.documentId === DOCUMENT_ID).fields;
const writes = readJson(abs(`${FAMILY_DIR}/reports/actual-writes.json`));
const artifact = writes.artifacts.find((row) => row.documentId === DOCUMENT_ID && row.fixture === FIXTURE);
assert.ok(artifact, `${DOCUMENT_ID}/${FIXTURE}: committed artifact record is missing`);
const artifactFile = abs(artifact.file);
const report = { written: artifact.written, selections: artifact.selections };

const protectedField = census.fields.find((row) => row.name === PROTECTED_FIELD);
assert.ok(protectedField, `${PROTECTED_FIELD}: the protected control is absent from the census`);

// The source binary the family is bound to, located through the committed
// corpus index rather than through any private path in this script.
const corpusIndex = readJson(abs("data/rcap-all50/local-source-corpus-index.json"));
const sourceEntry = corpusIndex.entries.find((row) => row.sha256 === census.sourceSha256);
assert.ok(sourceEntry, `${DOCUMENT_ID}: the bound source is absent from the corpus index`);
const corpusRoot = process.env.MASTER_LIBRARY_SOURCE_DIR;
assert.ok(corpusRoot && fs.existsSync(corpusRoot),
  "MASTER_LIBRARY_SOURCE_DIR must point to the verified Master Library; this control reads the bound source first-hand");
const sourceBytes = fs.readFileSync(path.join(corpusRoot, sourceEntry.path));
assert.equal(sha256(sourceBytes), census.sourceSha256, `${DOCUMENT_ID}: bound source drift`);

const baselineRow = await zeroWriteNormalizedBaseline({
  sourceBytes, expectedSha256: census.sourceSha256,
  census: census.fields, documentTextLines: [],
});
const normalizedBaseline = async () => baselineRow;

/** Run the real gate over a set of artifact bytes. */
async function runGate(bytes, { preFlattenBytes = baselineRow.preparedSourceBytes, label } = {}) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-protected-control-"));
  try {
    const file = path.join(scratch, "artifact.pdf");
    fs.writeFileSync(file, bytes);
    return await evaluateProtectedFieldInk({
      artifactFile: file, artifactBytes: bytes,
      appearances: await flattenedWidgets(file),
      census, fieldMap, report, sourceBytes, normalizedBaseline, preFlattenBytes, label,
    });
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

const rowFor = (rows) => rows.find((row) => row.field === PROTECTED_FIELD) ?? null;

console.log("EAST protected-field ink gate — source-owned blank appearance");

const completedBytes = fs.readFileSync(artifactFile);
assert.equal(sha256(completedBytes), artifact.sha256, "the committed artifact has drifted from its recorded hash");

// ---------------------------------------------------------------- POSITIVE --
let positive = null;
await control("POSITIVE: the unchanged source-owned /Off appearance passes the gate", async () => {
  positive = await runGate(completedBytes, { label: "positive" });
  assert.deepEqual(positive.protectedVectorInk, [],
    `the completed artifact still reports protected vector ink: ${JSON.stringify(positive.protectedVectorInk).slice(0, 400)}`);
  assert.deepEqual(positive.protectedInk, [], "the completed artifact reports protected drawn text");
  const excused = rowFor(positive.protectedSourceOwnedAppearances);
  assert.ok(excused, `${PROTECTED_FIELD} is not recorded as a source-owned blank appearance, so the control is not exercising the defect`);
  return `${PROTECTED_FIELD}: ${excused.pathsMatchingNormalizedBaseline} paths, all matching the zero-write baseline`;
});

await control("POSITIVE: all six of the decision's conditions are individually recorded", () => {
  const excused = rowFor(positive.protectedSourceOwnedAppearances);
  const c = excused.conditions;
  assert.equal(c.buildWroteNoParticipantValue, true, "condition 1 is not recorded");
  assert.ok(c.preFlattenFieldValue === null || /Off$/.test(c.preFlattenFieldValue),
    `condition 2 fails: pre-flatten value is ${c.preFlattenFieldValue}`);
  assert.ok(c.preFlattenWidgetAppearanceStates.length > 0
    && c.preFlattenWidgetAppearanceStates.every((state) => state === null || /Off$/.test(state)),
    `condition 3 fails: ${JSON.stringify(c.preFlattenWidgetAppearanceStates)}`);
  assert.equal(c.zeroWriteNormalizedBaselineSha256, baselineRow.sha256, "condition 4 names no baseline");
  assert.equal(c.pathsBeyondNormalizedBaseline, 0, "condition 5 fails on paths");
  assert.deepEqual(c.drawnTextInsideProtectedWidget, [], "condition 5 fails on text");
  assert.equal(c.focusedRegionRaster.length, protectedField.widgets.length,
    "condition 6 did not compare every widget of the protected control");
  assert.ok(c.focusedRegionRaster.every((row) => row.identical && row.comparedPixels > 0
    && row.artifactRegionSha256 === row.baselineRegionSha256),
    "condition 6 fails: a protected region is not pixel-identical to the zero-write baseline");
  return `raster identical over ${c.focusedRegionRaster.reduce((n, r) => n + r.comparedPixels, 0)} px at ${c.focusedRegionRaster[0].dpi} DPI`;
});

// -------------------------------------------------------------- NEGATIVE A --
// A participant-like mark painted inside the very same protected widget.
await control("NEGATIVE A: a participant-like mark inside the protected widget still fails the gate", async () => {
  const widget = protectedField.widgets[0];
  const pdf = await PDFDocument.load(completedBytes, { ignoreEncryption: true, updateMetadata: false });
  const page = pdf.getPages()[widget.page - 1];
  const inset = 2;
  const line = { thickness: 1, color: rgb(0, 0, 0) };
  page.drawLine({
    start: { x: widget.rect.x + inset, y: widget.rect.y + inset },
    end: { x: widget.rect.x + widget.rect.width - inset, y: widget.rect.y + widget.rect.height - inset },
    ...line,
  });
  page.drawLine({
    start: { x: widget.rect.x + inset, y: widget.rect.y + widget.rect.height - inset },
    end: { x: widget.rect.x + widget.rect.width - inset, y: widget.rect.y + inset },
    ...line,
  });
  const marked = Buffer.from(await pdf.save({ useObjectStreams: false, updateMetadata: false }));
  assert.notEqual(sha256(marked), sha256(completedBytes), "the mutation changed nothing");
  const result = await runGate(marked, { label: "negative-a" });
  const flagged = rowFor(result.protectedVectorInk);
  assert.ok(flagged, "THE GATE DID NOT FIRE: an X drawn inside the protected notary control passed");
  assert.equal(flagged.reason, "painted_paths_beyond_the_zero_write_normalized_baseline",
    `the gate fired for the wrong reason: ${flagged.reason}`);
  assert.equal(rowFor(result.protectedSourceOwnedAppearances), null,
    "a marked protected widget was still excused as a source-owned blank appearance");
  return `${flagged.vectorPaths.length} paths beyond the baseline`;
});

// -------------------------------------------------------------- NEGATIVE B --
// The same field carrying an on-state into the flatten. The host neutralizes
// /V, /DV and /AS before flattening precisely so this cannot happen; this
// control removes that support and proves the gate refuses what is left.
await control("NEGATIVE B: an on-state surviving into the flatten still fails the gate", async () => {
  const prepared = await PDFDocument.load(baselineRow.preparedSourceBytes,
    { ignoreEncryption: true, updateMetadata: false });
  const field = prepared.getForm().getFields().find((row) => row.getName() === PROTECTED_FIELD);
  assert.ok(field, `${PROTECTED_FIELD} is absent from the pre-flatten bytes`);
  const widget = field.acroField.getWidgets()[0];
  const onState = Object.keys(widget.getAppearances()?.normal?.dict?.asMap?.() ?? {})
    .map((key) => String(key)).find((key) => key !== "/Off")
    ?? [...(widget.dict.lookup(PDFName.of("AP"))?.lookup(PDFName.of("N"))?.keys() ?? [])]
      .map((key) => String(key)).find((key) => key !== "/Off");
  assert.ok(onState, `${PROTECTED_FIELD}: the control has no on-state to select`);
  const on = PDFName.of(onState.replace(/^\//, ""));
  field.acroField.dict.set(PDFName.of("V"), on);
  widget.dict.set(PDFName.of("AS"), on);
  const onStateBytes = Buffer.from(await prepared.save({ useObjectStreams: false, updateMetadata: false }));
  const result = await runGate(completedBytes, { preFlattenBytes: onStateBytes, label: "negative-b" });
  const flagged = rowFor(result.protectedVectorInk);
  assert.ok(flagged, `THE GATE DID NOT FIRE: ${PROTECTED_FIELD} carried ${onState} into the flatten and passed`);
  assert.ok(["pre_flatten_field_value_is_neither_absent_nor_off",
    "pre_flatten_widget_appearance_state_is_neither_absent_nor_off"].includes(flagged.reason),
  `the gate fired for the wrong reason: ${flagged.reason}`);
  assert.equal(rowFor(result.protectedSourceOwnedAppearances), null,
    "a field carrying an on-state was still excused as a source-owned blank appearance");
  return `${flagged.reason} (${onState})`;
});

console.log(failures === 0
  ? "verify-east-protected-blank-appearance-control: PASS"
  : `verify-east-protected-blank-appearance-control: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
