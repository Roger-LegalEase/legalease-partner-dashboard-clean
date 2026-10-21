import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { extractTextItems } from "../rcap-official-forms/rcap-pdf-anchor-capture.mjs";
import {
  DEFAULT_SOURCE, EXPECTED_SOURCE_LENGTH, EXPECTED_SOURCE_SHA256, FIXTURES, OUT,
  SOURCE_PLACEMENTS, assertGuidanceRequirements, assertHeldNameParts,
  assertOfficialOverlayPlacements, assertPlacementItems, assertSourceOutputMeasurement,
  certifiedStatementName, courtStageRequirements, joinedLegalName, maps,
  measureSourceOutputDifference, run, sourceBytes
} from "../build-census-v1-fl-10yr-bridge-set.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts } = require("pdf-lib");
const hash = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const output = rel => path.join(ROOT, OUT, rel);

function snapshotTree(directory) {
  const rows = [];
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else {
        const stat = fs.statSync(absolute);
        rows.push([path.relative(directory, absolute), hash(fs.readFileSync(absolute)), stat.size, stat.mode, stat.mtimeMs, stat.ctimeMs]);
      }
    }
  };
  walk(directory);
  return rows.sort(([left], [right]) => left.localeCompare(right));
}

test("governed default source and explicit repository override resolve to the same exact bytes", () => {
  const previous = process.env.PF17_FL_FDLE_SOURCE;
  try {
    delete process.env.PF17_FL_FDLE_SOURCE;
    const defaultResult = sourceBytes();
    assert.equal(defaultResult.custodyPath, DEFAULT_SOURCE);
    assert.equal(defaultResult.bytes.length, EXPECTED_SOURCE_LENGTH);
    assert.equal(hash(defaultResult.bytes), EXPECTED_SOURCE_SHA256);
    process.env.PF17_FL_FDLE_SOURCE = path.join(ROOT, DEFAULT_SOURCE);
    const overrideResult = sourceBytes();
    assert.equal(overrideResult.custodyPath, DEFAULT_SOURCE);
    assert.deepEqual(overrideResult.bytes, defaultResult.bytes);
  } finally {
    if (previous === undefined) delete process.env.PF17_FL_FDLE_SOURCE;
    else process.env.PF17_FL_FDLE_SOURCE = previous;
  }
});

test("exact source guard refuses a same-length altered PDF", () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "fl-bridge-source-"));
  const corrupt = path.join(temporary, "corrupt.pdf");
  const bytes = Buffer.from(fs.readFileSync(path.join(ROOT, DEFAULT_SOURCE)));
  bytes[100] ^= 1;
  fs.writeFileSync(corrupt, bytes);
  const previous = process.env.PF17_FL_FDLE_SOURCE;
  try {
    process.env.PF17_FL_FDLE_SOURCE = corrupt;
    assert.throws(() => sourceBytes(), /BLOCKED_SOURCE.*SHA-256/);
  } finally {
    if (previous === undefined) delete process.env.PF17_FL_FDLE_SOURCE;
    else process.env.PF17_FL_FDLE_SOURCE = previous;
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});

test("legal names preserve held parts and page 2 uses Last, First Middle", () => {
  assert.equal(joinedLegalName(FIXTURES.canonical), "Jordan Avery Reyes");
  assert.equal(certifiedStatementName(FIXTURES.canonical), "Reyes, Jordan Avery");
  assert.equal(joinedLegalName(FIXTURES.boundary), "Maria-Alejandra Isabel O'Shaughnessy-Whitfield");
  assert.equal(certifiedStatementName(FIXTURES.boundary), "O'Shaughnessy-Whitfield, Maria-Alejandra Isabel");
  assertHeldNameParts(FIXTURES.boundary);
  for (const mutate of [
    facts => { facts["participant.middle_name"] = ""; },
    facts => { facts["participant.full_name"] = "Maria-Alejandra O'Shaughnessy-Whitfield"; }
  ]) {
    const changed = structuredClone(FIXTURES.boundary);
    mutate(changed);
    assert.throws(() => assertHeldNameParts(changed), /legal-name part|preserve held/);
  }
});

test("both repaired PDFs carry exact name order, complete boundary name, and source-measured placement", async () => {
  for (const fixtureName of ["canonical", "boundary"]) {
    const bytes = fs.readFileSync(output(`fixtures/${fixtureName}.pdf`));
    const result = await assertOfficialOverlayPlacements(bytes, FIXTURES[fixtureName]);
    assert.equal(result.pageCount, 8);
  }
});

test("old colliding source positions and omitted middle name fail measured placement", async () => {
  const bytes = fs.readFileSync(output("fixtures/boundary.pdf"));
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  const items = pdf.getPages().map(page => extractTextItems(page));
  assertPlacementItems(items, FIXTURES.boundary);
  const moved = structuredClone(items);
  const last = moved[0].find(item => item.text === FIXTURES.boundary["participant.last_name"]
    && Math.abs(item.x - SOURCE_PLACEMENTS.page1_last_name.x) < 0.02);
  last.y = 686;
  assert.throws(() => assertPlacementItems(moved, FIXTURES.boundary), /measured source blank/);
  const omitted = structuredClone(items);
  omitted[1] = omitted[1].filter(item => item.text !== certifiedStatementName(FIXTURES.boundary));
  assert.throws(() => assertPlacementItems(omitted, FIXTURES.boundary), /Last, First Middle/);
});

test("held sworn, sealing-order verification, and hearing-stop guidance are mandatory", () => {
  const requirements = courtStageRequirements();
  const instructions = fs.readFileSync(output("participant-instructions.md"), "utf8");
  assertGuidanceRequirements(instructions, requirements);
  for (const phrase of [
    "ordinary declaration and signature line printed on the petition is not the required sworn affidavit",
    "complete a separate sworn affidavit",
    "notarized unless you swear it before a deputy clerk",
    "Obtain the currently accepted affidavit format from the circuit clerk or an attorney before filing",
    "clerk of the court that sealed the record for a certified copy of the sealing order",
    "Compare your answer to \"On what date was the record sealed by court order?\" against that certified copy, and correct the packet if they disagree",
    "any hearing is required or set"
  ]) assert.throws(() => assertGuidanceRequirements(instructions.replaceAll(phrase, "[omitted]"), requirements), /omit held requirement/);
  assert.match(instructions, /ordinary declaration and signature line printed on the petition is not the required sworn affidavit/);
  assert.match(instructions, /Obtain the currently accepted affidavit format from the circuit clerk or an attorney before filing/);
  assert.doesNotMatch(instructions, /four-component|fifth affidavit component|does not contain or invent/);
  assert.match(instructions, /> Certificate of service at the court stage\./);
  assert.match(instructions, /prepare the certificate and file it with the petition/);
});

test("map records ten measured writes, four held actions, and the unchanged four-component contract", () => {
  const fieldMap = JSON.parse(fs.readFileSync(output("production-field-map.json"), "utf8"));
  assert.deepEqual(fieldMap.sourceMeasuredPlacements, SOURCE_PLACEMENTS);
  assert.equal(Object.keys(fieldMap.sourceMeasuredPlacements).length, 10);
  assert.equal(Object.keys(fieldMap.sourceWriteBoxes).length, 28);
  assert.equal(Object.keys(fieldMap.courtStagePrerequisites).filter(key => key !== "hearingStop" && key !== "statedBy").length, 4);
  assert.deepEqual(fieldMap.componentSet, [
    "FDLE-CERTIFICATE-OF-ELIGIBILITY-APPLICATION", "FL-RULE-3.989-PETITION", "FL-RULE-3.989-ORDER"
  ]);
  assert.equal(maps().flatMap(entry => entry.canonicalWrites).length, 44);
  const actual = JSON.parse(fs.readFileSync(output("reports/actual-writes.json"), "utf8"));
  for (const [fixture, glyphs] of [["canonical", 249], ["boundary", 425]]) {
    const document = actual.documents.find(entry => entry.fixture === fixture);
    assert.equal(document.actualWrites.filter(write => write.placementVerifiedInFinalBytes === true).length, 10);
    const phone = document.actualWrites.find(write => write.field.endsWith(".page1_phone"));
    assert.match(phone.drawnText, /separately around the source-printed parentheses/);
    assert.equal(document.addedGlyphsReadFromOutputBytes, glyphs);
    assert.equal(document.sourceOutputDifferenceMeasurement.addedTextRunsReadFromOutputBytes, 29);
    assert.equal(document.sourceOutputDifferenceMeasurement.declaredWritesVerifiedFromFinalBytes, 44);
    assert.equal(document.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, 0);
    assert.equal(document.flattenedWidgetAppearancesReadFromOutputBytes, 0);
    assert.equal(document.sourceOutputDifferenceMeasurement.widgetMeasurement.status, "MEASURED_NO_WIDGET_APPEARANCES");
  }
});

test("real source/output measurement rejects undeclared out-of-box added ink", async () => {
  const source = fs.readFileSync(path.join(ROOT, DEFAULT_SOURCE));
  const current = await PDFDocument.load(fs.readFileSync(output("fixtures/canonical.pdf")), {
    ignoreEncryption: true, updateMetadata: false
  });
  const font = await current.embedFont(StandardFonts.Helvetica);
  current.getPages()[0].drawText("STRAYINK", { x: 20, y: 300, size: 8, font });
  const changed = Buffer.from(await current.save({ useObjectStreams: false, updateMetadata: false }));
  const fieldMaps = maps();
  const measurement = await measureSourceOutputDifference(source, changed, FIXTURES.canonical, fieldMaps);
  assert.equal(measurement.outsideAddedTextRuns.length, 1);
  assert.equal(measurement.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, 8);
  assert.throws(() => assertSourceOutputMeasurement(measurement, 44), /undeclared or out-of-box added ink/);
});

test("real --check inspects current artifacts and is byte- and metadata-read-only", async () => {
  const directory = path.join(ROOT, OUT);
  const before = snapshotTree(directory);
  const result = await run(["--check"]);
  const after = snapshotTree(directory);
  assert.deepEqual(after, before);
  assert.equal(result.status, "CHECK_ONLY");
  assert.equal(result.wroteFiles, 0);
  assert.equal(result.artifactsInspected.length, 2);
  assert.equal(result.requiredCourtStageActionsInspected, 4);
  assert.equal(result.selfHelpStopInspected, "Any hearing.");
});
