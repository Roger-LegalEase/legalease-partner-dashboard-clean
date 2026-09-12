#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { PDFDocument, PDFName, PDFDict, decodePDFRawStream } from "pdf-lib";

const root = path.resolve(new URL("../..", import.meta.url).pathname);
const source = path.join(root,
  "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1/STATES/IN/02_PACKET_FORMS/"
  + "IN__FORM__CCA-SECTION1-INSERTS__section-1-non-conviction-expungement-facts-findings-and-exhibit-inserts__REV-2020-01__EN.pdf");
const families = [
  { id: "in-arrest-no-charges-set", expected: ["Check Box19", "Check Box25"] },
  { id: "in-section1-petition-set", expected: ["Check Box25"] }
];
const participantUnknown = ["Check Box15", "Check Box17", "Check Box21", "Check Box23", "Check Box26", "Check Box29"];
const courtOwned = ["Check Box16", "Check Box18", "Check Box20", "Check Box22", "Check Box24", "Check Box27", "Check Box28", "Check Box30"];
let assertions = 0;
const equal = (...args) => { assertions += 1; assert.equal(...args); };
const deepEqual = (...args) => { assertions += 1; assert.deepEqual(...args); };
const ok = (...args) => { assertions += 1; assert.ok(...args); };
const throws = (...args) => { assertions += 1; assert.throws(...args); };
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
async function sourceCheckedAppearanceGlyphs() {
  const pdf = await PDFDocument.load(fs.readFileSync(source), { ignoreEncryption: true, updateMetadata: false });
  const glyphs = new Map();
  for (const field of pdf.getForm().getFields()) {
    if (!["Check Box19", "Check Box25"].includes(field.getName())) continue;
    const widget = field.acroField.getWidgets()[0];
    const normal = widget.dict.lookup(PDFName.of("AP"), PDFDict).lookup(PDFName.of("N"), PDFDict);
    const onEntry = [...normal.entries()].find(([name]) => name.asString() !== "/Off");
    ok(onEntry, `${field.getName()}: source has no checked appearance`);
    const stream = pdf.context.lookup(onEntry[1]);
    const text = Buffer.from(decodePDFRawStream(stream).decode()).toString("latin1");
    const match = text.match(/\(([^)]*)\)\s*Tj/);
    ok(match, `${field.getName()}: source checked appearance has no readable glyph`);
    glyphs.set(field.getName(), match[1]);
  }
  return glyphs;
}

function classify(file) {
  const json = path.join(os.tmpdir(), `in-two-selection-${process.pid}-${Math.random()}.json`);
  try {
    execFileSync(process.execPath, [
      path.join(root, "scripts/grade-a-packet-factory-24h/classify-flattened-widget-appearances.mjs"),
      file, "--source", source, "--json", json
    ], { cwd: root, stdio: "ignore" });
    return JSON.parse(fs.readFileSync(json, "utf8"));
  } finally { fs.rmSync(json, { force: true }); }
}

function assertSelections(result, expected, label) {
  const byField = new Map(result.appearances.filter((row) => row.sourceWidgetField)
    .map((row) => [row.sourceWidgetField, row]));
  for (const field of expected) {
    const row = byField.get(field);
    ok(row, `${label}/${field}: flattened appearance absent`);
    equal(row.page, 1, `${label}/${field}: settled mark moved off participant FACTS page`);
    equal(row.drawnText, "4", `${label}/${field}: checked source glyph absent`);
    equal(row.showTextOperators, 1, `${label}/${field}: checked appearance not uniquely measurable`);
  }
  for (const field of [...participantUnknown, ...courtOwned]) {
    if (expected.includes(field)) continue;
    const row = byField.get(field);
    ok(row, `${label}/${field}: source blank appearance absent`);
    equal(row.drawnText, "", `${label}/${field}: unknown participant election or court finding was marked`);
    equal(row.showTextOperators, 0, `${label}/${field}: blank selection carries a text mark`);
  }
  equal(result.summary.appearancesNotPlacedAtTheirOwnSourceWidget, 0,
    `${label}: a flattened source appearance moved away from its own widget`);
  return byField;
}

const proof = [];
const sourceCheckedGlyphs = await sourceCheckedAppearanceGlyphs();
for (const family of families) {
  const out = path.join(root, "data/rcap-all50/overlays/census-v1/in", `${family.id}--official-pdf-fill`);
  const map = JSON.parse(fs.readFileSync(path.join(out, "production-field-map.json"), "utf8"));
  const insert = map.documents.find((row) => row.documentId === "IN-CCA-SECTION1-NONCONVICTION-INSERT-FORMS");
  ok(insert, `${family.id}: insert map absent`);
  const mapped = insert.writeBoxes.filter((row) => row.writeKind === "selection_settled_from_held_facts");
  deepEqual(mapped.map((row) => row.field).sort(), [...family.expected].sort());
  for (const row of mapped) ok(row.selectionBasis, `${family.id}/${row.field}: selection basis absent`);

  const guide = fs.readFileSync(path.join(out, "participant-instructions.md"), "utf8");
  for (const field of family.expected) ok(guide.includes(`\`${field}\` — **`), `${family.id}/${field}: guide omits premark`);
  equal(guide.includes("Every blank on all four insert pages is yours to fill"), false);
  equal(guide.includes("writes nothing at all on the four insert pages"), false);

  for (const fixture of ["canonical", "boundary"]) {
    const file = path.join(out, "fixtures", `inserts-${fixture}-filled.pdf`);
    const result = classify(file);
    const byField = assertSelections(result, family.expected, `${family.id}/${fixture}`);
    for (const field of family.expected) {
      equal(byField.get(field).drawnText, sourceCheckedGlyphs.get(field),
        `${family.id}/${fixture}/${field}: checked appearance glyph differs from the official source's own checked glyph`);
    }

    // Negative controls exercise the same saved-byte classifier result: one
    // missing participant mark and one injected court mark must both fail.
    const missing = structuredClone(result);
    missing.appearances.find((row) => row.sourceWidgetField === family.expected[0]).drawnText = "";
    throws(() => assertSelections(missing, family.expected, `${family.id}/${fixture}/missing-control`),
      /checked source glyph absent/);
    const courtMarked = structuredClone(result);
    const courtRow = courtMarked.appearances.find((row) => row.sourceWidgetField === "Check Box20");
    courtRow.drawnText = "4";
    throws(() => assertSelections(courtMarked, family.expected, `${family.id}/${fixture}/court-control`),
      /court finding was marked/);

    proof.push({ familyId: family.id, fixture, file: path.relative(root, file), sha256: sha256(file),
      expectedSelections: family.expected, selectedGlyphs: family.expected.map((field) => byField.get(field).drawnText),
      officialCheckedAppearanceGlyphsMatched: family.expected.length,
      courtFieldsBlank: courtOwned.length, unknownParticipantFieldsBlank: participantUnknown.length,
      allSourceAppearancesAtOwnWidgets: result.summary.appearancesNotPlacedAtTheirOwnSourceWidget === 0 });
  }
}

equal(proof[0].sha256, proof[1].sha256, "arrest fixture variants should agree on route/date selections");
equal(proof[2].sha256, proof[3].sha256, "section1 fixture variants should agree on route/date selections");
assertions += 1;
assert.notEqual(proof[0].sha256, proof[2].sha256,
  "the route-specific no-charges participant statement must distinguish the insert bytes");

console.log(JSON.stringify({ result: "PASS", assertions, artifactsChecked: proof.length,
  selectedMarksReadFromBytes: proof.reduce((n, row) => n + row.expectedSelections.length, 0),
  negativeControlsRejected: proof.length * 2, proof }));
