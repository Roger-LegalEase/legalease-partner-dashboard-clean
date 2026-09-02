#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const familyId = "nj_disorderly_persons-set";
const out = "data/rcap-all50/overlays/census-v1/nj/nj-disorderly-persons-set--official-pdf-fill";

const selfHelpBoundaries = Object.freeze([
  "Counting disputes at the five-offence line.",
  "Marijuana regrading analysis.",
  "Early pathway compelling circumstances.",
  "Prosecutor objection.",
  "Any conviction that might sit on the N.J.S.A. 2C:52-2(b) or (c) non-expungeable list.",
  "Any classification or out-of-state equivalency question.",
  "Any same-day or closely-related bundling argument.",
  "Prior expungement, which N.J.S.A. 2C:52-14(e) bars except on the Clean Slate route.",
  "Pending charges.",
  "Unpaid financial assessments and the willfulness question.",
  "The participant cannot assemble complete case identifiers.",
  "Federal, out-of-state or tribal records. They are not reachable, but they count toward eligibility and toward the offense counts.",
  "Immigration exposure. New Jersey expungement has no federal immigration effect.",
  "Any Title 39 motor vehicle matter, including DWI, which N.J.S.A. 2C:52-28 puts outside the chapter entirely.",
  "Compelling-circumstances showings and diversion dismissals",
]);

const selfHelpStopConditions = Object.freeze([
  "Counting disputes at the five-offence line.",
  "Marijuana regrading analysis.",
  "Early pathway compelling circumstances.",
  "Prosecutor objection.",
  "Any conviction that might sit on the N.J.S.A. 2C:52-2(b) or (c) non-expungeable list.",
  "Any classification or out-of-state equivalency question.",
  "Any same-day or closely-related bundling argument.",
  "Prior expungement, which N.J.S.A. 2C:52-14(e) bars except on the Clean Slate route.",
  "Pending charges.",
  "Unpaid financial assessments and the willfulness question.",
  "The participant cannot assemble complete case identifiers.",
  "Federal, out-of-state or tribal records. They are not reachable, but they count toward eligibility and toward the offense counts.",
  "Immigration exposure. New Jersey expungement has no federal immigration effect.",
  "Any Title 39 motor vehicle matter, including DWI, which N.J.S.A. 2C:52-28 puts outside the chapter entirely.",
]);

function abs(relativePath) {
  return path.join(rootDir, relativePath);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(abs(relativePath), "utf8"));
}

function writeJson(relativePath, value) {
  fs.writeFileSync(abs(relativePath), `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function requiredBeforeFilingRow(row, effectiveLabel, reason) {
  return {
    field: row.field,
    decision: "refuse",
    factId: null,
    blankTreatment: "REQUIRED_BEFORE_FILING",
    requiredBeforeFiling: true,
    routeDetermined: false,
    identity: `NJ-CN-10557 field ${row.field}`,
    effectiveLabel,
    reason,
    completesAfterService: false,
    widgets: row.widgets,
  };
}

function repairFieldMapAndWriteReport() {
  const mapFile = `${out}/production-field-map.json`;
  const map = readJson(mapFile);
  assert.equal(map.familyId, familyId);
  const fields = map.documents.find((document) => document.documentId === "NJ-CN-10557")?.fields;
  assert.ok(fields, "NJ-CN-10557 field map is absent");

  const labels = new Map([
    ["ExpungeCntyName", "County (where you are filing)"],
    ["arrest3Statute", "(statute) — arrest/custody row 3"],
    ["arrest4Statute", "(statute) — arrest/custody row 4"],
    ["arrest5Statute", "(statute) — arrest/custody row 5"],
  ]);
  for (const [field, label] of labels) {
    const index = fields.findIndex((row) => row.field === field);
    assert.notEqual(index, -1, `${field}: field-map row is absent`);
    const reason = field === "ExpungeCntyName"
      ? "REQUIRED_BEFORE_FILING: confirm the filing county and write it in all four caption widgets; the held residence-county value is not substituted for this filing-venue fact."
      : "REQUIRED_BEFORE_FILING: this is a participant arrest-table statute cell, not a signature or date field; surface it to the participant and do not guess.";
    fields[index] = requiredBeforeFilingRow(fields[index], label, reason);
  }
  writeJson(mapFile, map);

  const writesFile = `${out}/reports/actual-writes.json`;
  const writes = readJson(writesFile);
  for (const artifact of writes.artifacts) {
    const refusal = artifact.refused.find((row) => row.field === "ExpungeCntyName");
    assert.ok(refusal, `${artifact.fixture}: ExpungeCntyName refusal is absent`);
    refusal.reason = "classified_unwritable_by_role";
    refusal.category = "role";
    delete refusal.regionHeading;
  }
  writeJson(writesFile, writes);
}

function selfHelpSection() {
  const boundaryRows = selfHelpBoundaries.map((condition) => `- ${condition}`).join("\n");
  const stopRows = selfHelpStopConditions.map((condition) => `- ${condition}`).join("\n");
  return `\n## Where self-help ends

The committed track record at \`data/record-clearing/legal-design-track-registry.json\`, track \`nj_disorderly_persons\`, exposes two held stop lists. Both are carried below word for word so all 29 held entries remain auditable. Stop and get help from a lawyer or legal-aid office before filing if any entry applies.

### Held \`selfHelpBoundaries\` (15 entries)

${boundaryRows}

### Held \`selfHelpStopConditions\` (14 entries)

${stopRows}
`;
}

function repairInstructions() {
  const file = `${out}/participant-instructions.md`;
  let instructions = fs.readFileSync(abs(file), "utf8");
  const oldConfirmation = "- Confirm current revision, filing destination, local procedures, fees, attachments, service, and proposed-order requirements before filing.";
  const newConfirmation = "- Confirm current revision, local procedures, attachments, and proposed-order requirements before filing. Where to file, cost, and who must be served are each answered in their own section below.";
  if (instructions.includes(oldConfirmation)) instructions = instructions.replace(oldConfirmation, newConfirmation);
  assert.ok(instructions.includes(newConfirmation), "the filing-confirmation line was not repaired");

  if (!instructions.includes("## What it costs to file")) {
    const marker = "\n## Exact facts still required before filing\n";
    assert.ok(instructions.includes(marker), "required-before-filing section marker is absent");
    const filingSections = `
## What it costs to file

There is **no court filing fee**. New Jersey Courts states **"It's free"**, and the Judiciary kit was updated in June 2020 to remove the filing fee. Because there is no court filing fee, there is no court filing fee to waive and no court-fee waiver form is needed for this petition.

The New Jersey State Police separately charges for the SBI criminal history record. That record charge is not a court filing fee and is not waived by the no-court-fee treatment above.

## Where to file

File with the **Superior Court, Criminal Division**, in the county where the participant resides or a county where one or more convictions were adjudged. File through the **eCourts Expungement System** or on the New Jersey Judiciary kit forms in this packet; do not submit both routes for the same petition.

## Who must be served

Serve the petition as required and, after entry, serve a certified copy of the signed order on every record-holding agency. The held notice list is: **the county prosecutor, the Attorney General, the State Police, the courts involved, the arresting agency, probation, and any relevant municipal court**. Keep the existing rule below: complete service certificates only after service actually occurs.
`;
    instructions = instructions.replace(marker, `${filingSections}${marker}`);
  }

  const requiredIntro = "The platform does not hold the facts below. Supply and verify each applicable item before filing; the build does not guess them.\n\n";
  if (!instructions.includes("source field: `ExpungeCntyName`")) {
    assert.ok(instructions.includes(requiredIntro), "required-before-filing introduction is absent");
    const additions = [
      "- County (where you are filing); write the same confirmed county on pages 18, 27, 30, and 40 (source field: `ExpungeCntyName`)",
      "- (statute) — arrest/custody row 3 (source field: `arrest3Statute`)",
      "- (statute) — arrest/custody row 4 (source field: `arrest4Statute`)",
      "- (statute) — arrest/custody row 5 (source field: `arrest5Statute`)",
    ].join("\n");
    instructions = instructions.replace(requiredIntro, `${requiredIntro}${additions}\n`);
  }

  if (!instructions.includes("### Held `selfHelpBoundaries` (15 entries)")) {
    const notesMarker = "- The measured conviction control is marked; no clean-slate or marijuana election is made.";
    assert.ok(instructions.includes(notesMarker), "family note marker is absent");
    instructions = instructions.replace(notesMarker, `${selfHelpSection()}\n${notesMarker}`);
  }
  fs.writeFileSync(abs(file), instructions.endsWith("\n") ? instructions : `${instructions}\n`);
}

function assertPdfRecordsMatch() {
  const rendered = readJson(`${out}/reports/rendered-artifacts.json`);
  for (const pdf of rendered.pdfs) {
    const bytes = fs.readFileSync(abs(pdf.file));
    assert.equal(sha256(bytes), pdf.sha256, `${pdf.file}: hash differs from rendered-artifact record`);
    assert.equal(bytes.length, pdf.byteLength, `${pdf.file}: byte length differs from rendered-artifact record`);
  }
  for (const raster of rendered.rasters) {
    const contactSheet = fs.readFileSync(abs(raster.contactSheet.file));
    assert.equal(sha256(contactSheet), raster.contactSheet.sha256,
      `${raster.contactSheet.file}: contact-sheet hash differs from its receipt`);
    assert.equal(contactSheet.length, raster.contactSheet.byteLength,
      `${raster.contactSheet.file}: contact-sheet length differs from its receipt`);
    for (const page of raster.pages) {
      const pageBytes = fs.readFileSync(abs(page.file));
      assert.equal(sha256(pageBytes), page.sha256, `${page.file}: raster hash differs from its receipt`);
      assert.equal(pageBytes.length, page.byteLength, `${page.file}: raster length differs from its receipt`);
    }
  }
}

function assertFix13Repair() {
  assertPdfRecordsMatch();
  const map = readJson(`${out}/production-field-map.json`);
  const fields = map.documents[0].fields;
  for (const field of ["ExpungeCntyName", "arrest3Statute", "arrest4Statute", "arrest5Statute"]) {
    const row = fields.find((candidate) => candidate.field === field);
    assert.ok(row, `${field}: field-map row is absent`);
    assert.equal(row.decision, "refuse", `${field}: must not remain a candidate write`);
    assert.equal(row.blankTreatment, "REQUIRED_BEFORE_FILING", `${field}: blank treatment is wrong`);
    assert.equal(row.requiredBeforeFiling, true, `${field}: required flag is absent`);
  }
  const instructions = fs.readFileSync(abs(`${out}/participant-instructions.md`), "utf8");
  for (const heading of ["## What it costs to file", "## Where to file", "## Who must be served", "## Where self-help ends"]) {
    assert.ok(instructions.includes(heading), `${heading}: instruction section is absent`);
  }
  for (const condition of [...selfHelpBoundaries, ...selfHelpStopConditions]) {
    assert.ok(instructions.includes(condition), `held self-help stop is absent: ${condition}`);
  }
  const selfHelp = instructions.slice(
    instructions.indexOf("## Where self-help ends"),
    instructions.indexOf("- The measured conviction control is marked"),
  );
  assert.equal(selfHelp.split("\n").filter((line) => line.startsWith("- ")).length, 29,
    "the self-help section must carry exactly 29 held entries");
  for (const field of ["ExpungeCntyName", "arrest3Statute", "arrest4Statute", "arrest5Statute"]) {
    assert.ok(instructions.includes(`source field: \`${field}\``), `${field}: participant disclosure is absent`);
  }
}

const args = process.argv.slice(2);
process.chdir(rootDir);
if (args.includes("--assert-fix13")) {
  assertFix13Repair();
  console.log(`${familyId}: FIX13 focused assertions complete; independent verification pending`);
} else if (args.includes("--check")) {
  const { runEastFamily } = await import("./build-census-v1-nj_arrest_no_conviction-set.mjs");
  await runEastFamily(familyId, ["--check"]);
  assertFix13Repair();
  console.log(`${familyId}: FIX13 focused assertions complete; independent verification pending`);
} else {
  if (!args.includes("--repair-only")) {
    const { runEastFamily } = await import("./build-census-v1-nj_arrest_no_conviction-set.mjs");
    await runEastFamily(familyId, args.filter((arg) => arg !== "--repair-only"));
  }
  repairFieldMapAndWriteReport();
  repairInstructions();
  assertFix13Repair();
  console.log(`${familyId}: FIX13 participant-instruction repair built; PDF and raster receipts preserved; independent verification pending`);
}
