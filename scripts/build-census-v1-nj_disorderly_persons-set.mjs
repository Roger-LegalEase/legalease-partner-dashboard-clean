#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertNoElectionIsMarked, readElectionMarks,
} from "./rcap-official-forms/rcap-election-mark-reading.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const familyId = "nj_disorderly_persons-set";
const out = "data/rcap-all50/overlays/census-v1/nj/nj-disorderly-persons-set--official-pdf-fill";

/*
 * FIX121, COMPONENT_SET.
 *
 * The packet-set manifest declares component 10, role `counting_disclosure`,
 * requirement `required`. This family's own manifestComponentDelivery marked it
 * "rendered" and pointed it at "## Where self-help ends" -- a section that
 * carries this route's 29 held self-help entries and no counting rule at all.
 * VF11 read that section in full and failed the obligation: the only place the
 * word count appears there is the stop line "Counting disputes at the
 * five-offence line.", which tells the participant to stop, and telling someone
 * to stop counting is not telling them how the count works.
 *
 * A required disclosure is not satisfied by a heading. The section below is the
 * disclosure itself, and every sentence of substance in it is CARRIED from a
 * committed record rather than composed here: the counting rule is the track
 * registry's own `mechanism` string, quoted whole; the caution about the
 * Judiciary's self-help phrasing is that track's own held openLegalQuestion,
 * quoted whole; and the intake question is the track's own generationRequirement
 * for the offence count. Nothing states a count for this participant, because
 * this packet performs no eligibility analysis and holds no offence history --
 * which the section says in terms rather than leaving to be inferred.
 */
const COUNTING_DISCLOSURE_HEADING = "## How the offence count works on this route";

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
    ["guiltyOff2", "Charges of (name of offense(s)) — continuation line"],
    ["guiltyStatute", "Statute(s) violated — selected conviction row"],
    ["guiltyFinal1", "Final sentence — selected conviction row, line 1"],
    ["guiltyFinal2", "Final sentence — selected conviction row, line 2"],
    ["guiltyTimeType", "Jail/prison/incarceration term or type"],
    ["guiltyDocCmpltDt", "Date jail/prison/incarceration was completed"],
    ["guiltyProbDt", "Date probation was completed"],
    ["guiltyFineDt", "Date fines were paid"],
  ]);
  for (const [field, label] of labels) {
    const index = fields.findIndex((row) => row.field === field);
    assert.notEqual(index, -1, `${field}: field-map row is absent`);
    const reason = field === "ExpungeCntyName"
      ? "REQUIRED_BEFORE_FILING: confirm the filing county and write it in all four caption widgets; the held residence-county value is not substituted for this filing-venue fact."
      : field.startsWith("arrest")
        ? "REQUIRED_BEFORE_FILING: this is a participant arrest-table statute cell, not a signature or date field; surface it to the participant and do not guess."
        : "REQUIRED_BEFORE_FILING: this blank belongs to the selected page-19 conviction row; surface the exact participant fact and do not leave a partially classified row.";
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

/**
 * The counting disclosure, rendered from this route's own committed record.
 *
 * Every quoted passage is read out of legal-design-track-registry.json at build
 * time and asserted present, so the section cannot silently drift away from the
 * record it claims to carry, and a registry edit is a build failure rather than
 * a stale page.
 */
function countingDisclosureSection() {
  const registry = readJson("data/record-clearing/legal-design-track-registry.json");
  const track = registry.tracks.find((candidate) => candidate.trackId === "nj_disorderly_persons");
  assert.ok(track, "nj_disorderly_persons legal-design track is absent");

  const mechanism = String(track.mechanism ?? "").trim();
  assert.ok(mechanism.includes("no more than five"),
    "the held mechanism no longer states the five-offence rule this disclosure carries");
  assert.ok(mechanism.includes("same day") && mechanism.includes("closely related"),
    "the held mechanism no longer states the uncapped same-day and closely-related routes");

  const countingCaution = (track.openLegalQuestions ?? [])
    .find((entry) => String(entry.question ?? "").includes("up to three disorderly persons offenses"));
  assert.ok(countingCaution, "the held counting-presentation open question is absent from the registry");

  const countQuestion = (track.generationRequirements ?? [])
    .find((entry) => entry.key === "dpoOffenceCount");
  assert.ok(countQuestion, "the held dpoOffenceCount intake question is absent from the registry");

  const capCorrection = (track.legalDesignLimitations ?? [])
    .find((entry) => String(entry.statement ?? "").includes("cap from four to five"));
  assert.ok(capCorrection, "the held disorderly-persons cap correction is absent from the registry");

  return `
${COUNTING_DISCLOSURE_HEADING}

**This packet does not count your offences and does not decide whether you are eligible.** It holds no offence history for you: the fingerprint-based State Police SBI record named above is what produces the count, and nobody has read it here. What follows is the counting rule as this route's committed legal-design record states it, so that you can apply it to your own record or take it to a lawyer.

### The held counting rule, quoted whole

> ${mechanism.split("\n").join("\n> ")}

Three things in that rule decide most records, and they are the three worth re-reading. The five-offence line is a **cap of five**, counted across disorderly persons offences, petty disorderly persons offences, or any combination of the two. The **same-day** route and the **interdependent-or-closely-related** route carry **no numeric cap at all**, so a record over five may still qualify under one of them. And any **crime** conviction — an indictable offence in New Jersey, a felony anywhere else — takes the record off this route entirely and onto N.J.S.A. 2C:52-2.

### A published figure that is not this route's figure

The committed record carries this caution about a number you are likely to meet first:

> ${String(countingCaution.question).split("\n").join("\n> ")}

So a published "up to three" is the cap for a different route, not for this one. The correction that this route's cap is **five** rather than four is itself a held legal-design item: "${capCorrection.statement}".

### What you will be asked, and where this stops

The intake question this route records for the count is: "${countQuestion.question}"

Counting is where this packet stops and a lawyer starts. "Counting disputes at the five-offence line.", "Any same-day or closely-related bundling argument." and "Marijuana regrading analysis." are all held self-help stop conditions on this route, and they are listed again under "Where self-help ends" below. Marijuana and hashish regrading can move a conviction between routes or off the count entirely, and this packet does not perform that analysis.
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

  /*
   * FIX121, COMPONENT_SET, second limb. VF11 recorded that this family's
   * "Who must be served" section names the notice list and says nothing
   * whatever about objections, while its three siblings each address them --
   * on a component the manifest declares as
   * `service_and_objection_instructions`. The registry answers it directly and
   * negatively, and the negative answer is carried rather than smoothed over.
   */
  if (!instructions.includes("On objections:")) {
    const registry = readJson("data/record-clearing/legal-design-track-registry.json");
    const track = registry.tracks.find((candidate) => candidate.trackId === "nj_disorderly_persons");
    assert.ok(track, "nj_disorderly_persons legal-design track is absent");
    const heldObjection = "The exact objection window is recorded as an open question.";
    assert.ok(String(track.rules?.notice ?? "").includes(heldObjection),
      "the held notice rule no longer records the objection window as an open question");
    const anchor = "Keep the existing rule below: complete service certificates only after service actually occurs.\n";
    assert.ok(instructions.includes(anchor), "the service anchor line is absent");
    instructions = instructions.replace(anchor, `${anchor}
On objections: the committed track record states, of this route's notice rule, that **"${heldObjection}"** No held source in this repository establishes how long a prosecutor or any other served party has to object, so this packet states no period and none should be inferred from its silence. Ask the Criminal Division office in the county of filing what the objection window is. "Prosecutor objection." is a held self-help stop condition on this route: if an objection is filed, this packet does not answer it.
`);
  }

  if (!instructions.includes(COUNTING_DISCLOSURE_HEADING)) {
    const marker = "\n## Exact facts still required before filing\n";
    assert.ok(instructions.includes(marker), "required-before-filing section marker is absent");
    instructions = instructions.replace(marker, `${countingDisclosureSection()}${marker}`);
  }

  if (!instructions.includes("## All 11 actions required before filing")) {
    const marker = "\n## Exact facts still required before filing\n";
    assert.ok(instructions.includes(marker), "required-before-filing section marker is absent");
    const registry = readJson("data/record-clearing/legal-design-track-registry.json");
    const track = registry.tracks.find((candidate) => candidate.trackId === "nj_disorderly_persons");
    assert.ok(track, "nj_disorderly_persons legal-design track is absent");
    const actions = track.packetSet.requiredBeforeFiling;
    assert.equal(actions.length, 11, "expected exactly 11 registry required-before-filing actions");
    const actionRows = actions.map((action) => `- ${action}`).join("\n");
    const actionSection = `
## All 11 actions required before filing

The legal-design track records the following 11 actions. Review every one before filing; do not treat the generated sample values as a substitute for these checks.

${actionRows}

For the two record checks, first compare the complete list of convictions against the fingerprint-based State Police SBI history and correct every disagreement. If the SBI history omits a matter or disposition, obtain that court's records and compare and correct the county, court and level, complaint or indictment number, docket number, offence and statute, disposition, and disposition date.

Complete and duly verify the petition before filing. Follow the Judiciary kit and eCourts verification workflow, including notarization when that workflow requires it; the participant must not write in the notary's own execution block. Leave the judge's signature line for the judge, but ensure the proposed order carries the exact monies-owed information the court requires. Post-entry service of the certified signed order occurs only after the judge signs it.
`;
    instructions = instructions.replace(marker, `${actionSection}${marker}`);
  }

  const requiredIntro = "The platform does not hold the facts below. Supply and verify each applicable item before filing; the build does not guess them.\n\n";
  assert.ok(instructions.includes(requiredIntro), "required-before-filing introduction is absent");
  const requiredFieldDisclosures = [
    ["ExpungeCntyName", "County (where you are filing); write the same confirmed county on pages 18, 27, 30, and 40"],
    ["arrest3Statute", "(statute) — arrest/custody row 3"],
    ["arrest4Statute", "(statute) — arrest/custody row 4"],
    ["arrest5Statute", "(statute) — arrest/custody row 5"],
    ["guiltyOff2", "Charges of (name of offense(s)) — continuation line on the selected page-19 conviction row"],
    ["guiltyStatute", "Statute(s) violated — selected page-19 conviction row"],
    ["guiltyFinal1", "Final sentence — selected page-19 conviction row, line 1"],
    ["guiltyFinal2", "Final sentence — selected page-19 conviction row, line 2"],
    ["guiltyTimeType", "Jail/prison/incarceration term or type — selected page-19 conviction row"],
    ["guiltyDocCmpltDt", "Date jail/prison/incarceration was completed — selected page-19 conviction row"],
    ["guiltyProbDt", "Date probation was completed — selected page-19 conviction row"],
    ["guiltyFineDt", "Date fines were paid — selected page-19 conviction row"],
  ];
  const missingDisclosures = requiredFieldDisclosures
    .filter(([field]) => !instructions.includes(`source field: \`${field}\``))
    .map(([field, label]) => `- ${label} (source field: \`${field}\`)`);
  if (missingDisclosures.length > 0) {
    instructions = instructions.replace(requiredIntro, `${requiredIntro}${missingDisclosures.join("\n")}\n`);
  }

  if (!instructions.includes("### Held `selfHelpBoundaries` (15 entries)")) {
    // FIX105: the family note this section is anchored to now states that the
    // item (d) election is withdrawn with its row, so the anchor moved with it.
    const notesMarker = "- The item (d) conviction election on page 19 is withdrawn with the row it states:";
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
  const instructions = fs.readFileSync(abs(`${out}/participant-instructions.md`), "utf8");
  for (const field of ["ExpungeCntyName", "arrest3Statute", "arrest4Statute", "arrest5Statute"]) {
    const row = fields.find((candidate) => candidate.field === field);
    assert.ok(row, `${field}: field-map row is absent`);
    assert.equal(row.decision, "refuse", `${field}: must not remain a candidate write`);
    assert.equal(row.blankTreatment, "REQUIRED_BEFORE_FILING", `${field}: blank treatment is wrong`);
    assert.equal(row.requiredBeforeFiling, true, `${field}: required flag is absent`);
  }

  const registry = readJson("data/record-clearing/legal-design-track-registry.json");
  const track = registry.tracks.find((candidate) => candidate.trackId === "nj_disorderly_persons");
  assert.ok(track, "nj_disorderly_persons legal-design track is absent");
  assert.equal(track.packetSet.requiredBeforeFiling.length, 11,
    "the focused repair is pinned to all 11 registry required-before-filing actions");
  for (const action of track.packetSet.requiredBeforeFiling) {
    assert.ok(instructions.includes(action), `registry required-before-filing action is absent: ${action}`);
  }

  const convictionRowRequiredFields = [
    "guiltyOff2",
    "guiltyStatute",
    "guiltyFinal1",
    "guiltyFinal2",
    "guiltyTimeType",
    "guiltyDocCmpltDt",
    "guiltyProbDt",
    "guiltyFineDt",
  ];
  for (const field of convictionRowRequiredFields) {
    const row = fields.find((candidate) => candidate.field === field);
    assert.ok(row, `${field}: page-19 conviction-row field is absent`);
    assert.equal(row.decision, "refuse", `${field}: must remain unwritten`);
    assert.equal(row.blankTreatment, "REQUIRED_BEFORE_FILING", `${field}: blank treatment is wrong`);
    assert.equal(row.requiredBeforeFiling, true, `${field}: required flag is absent`);
    assert.ok(instructions.includes(`source field: \`${field}\``),
      `${field}: participant disclosure is absent`);
  }
  for (const heading of ["## What it costs to file", "## Where to file", "## Who must be served", "## Where self-help ends", COUNTING_DISCLOSURE_HEADING]) {
    assert.ok(instructions.includes(heading), `${heading}: instruction section is absent`);
  }

  /*
   * FIX121, COMPONENT_SET. Checked on the delivered section rather than on the
   * declaration, because the declaration is exactly what was wrong before: the
   * component was marked "rendered" and pointed at a section that carried no
   * counting rule. A heading is not a disclosure, so the heading's presence is
   * checked above and the RULE's presence is checked here.
   */
  const countingSection = instructions.slice(
    instructions.indexOf(COUNTING_DISCLOSURE_HEADING),
    instructions.indexOf("\n## Exact facts still required before filing\n"),
  );
  assert.ok(countingSection.length > 0, "the counting disclosure section is empty");
  for (const held of [
    "no more than five",
    "same day",
    "closely related",
    "comparatively short period",
    "This packet does not count your offences",
  ]) {
    assert.ok(countingSection.includes(held),
      `the counting disclosure does not state the held rule: ${held}`);
  }
  assert.ok(instructions.includes("On objections:"),
    "the service-and-objection component does not address objections");
  assert.ok(instructions.includes("The exact objection window is recorded as an open question."),
    "the held objection-window answer is not carried to the participant");

  /*
   * FIX76, COMPONENT_SET: the other half of the shared host's component table.
   *
   * The host records, for every component the packet-set manifest declares,
   * either the delivered pages that carry it or the heading of the guide
   * section that does. Four of this family's guidance sections are written by
   * THIS script, after the host has finished, so the host cannot check them and
   * records them as delivered by this entrypoint instead. This is where that
   * claim is checked, against the file as the participant finally receives it.
   * A component recorded as delivered in a section that does not exist is a
   * report that describes a packet nobody built.
   */
  const rendered = readJson(`${out}/reports/rendered-artifacts.json`);
  const delivery = rendered.manifestComponentDelivery;
  assert.ok(delivery, "the manifest component-delivery table is absent from rendered-artifacts.json");
  assert.equal(delivery.packetSetId, familyId);
  assert.equal(delivery.declaredComponents, delivery.components.length);
  for (const component of delivery.components) {
    if (component.disposition === "not_generated") {
      assert.ok(component.why, `${component.componentId}: recorded as not generated with no reason`);
      continue;
    }
    assert.ok(component.deliveredIn, `${component.componentId}: recorded as rendered with no delivery`);
    if (!component.participantInstructionsHeading) continue;
    assert.ok(instructions.includes(`\n${component.participantInstructionsHeading}\n`),
      `${component.componentId}: the guide does not carry "${component.participantInstructionsHeading}"`);
  }
  for (const condition of [...selfHelpBoundaries, ...selfHelpStopConditions]) {
    assert.ok(instructions.includes(condition), `held self-help stop is absent: ${condition}`);
  }
  const selfHelp = instructions.slice(
    instructions.indexOf("## Where self-help ends"),
    instructions.indexOf("- The item (d) conviction election on page 19 is withdrawn"),
  );
  assert.equal(selfHelp.split("\n").filter((line) => line.startsWith("- ")).length, 29,
    "the self-help section must carry exactly 29 held entries");
  for (const field of ["ExpungeCntyName", "arrest3Statute", "arrest4Statute", "arrest5Statute"]) {
    assert.ok(instructions.includes(`source field: \`${field}\``), `${field}: participant disclosure is absent`);
  }

  const actualWrites = readJson(`${out}/reports/actual-writes.json`);
  const boundary = actualWrites.artifacts.find((artifact) => artifact.fixture === "boundary");
  assert.ok(boundary, "boundary actual-write evidence is absent");
  for (const artifact of actualWrites.artifacts) {
    for (const field of convictionRowRequiredFields) {
      assert.equal(artifact.written.some((row) => row.field === field), false,
        `${artifact.fixture}: ${field} must not be written`);
      assert.ok(artifact.refused.some((row) => row.field === field),
        `${artifact.fixture}: ${field} refusal evidence is absent`);
    }
  }
  for (const [field, widgetCount] of [["DefName", 20], ["DefAddrStr", 7]]) {
    const write = boundary.written.find((row) => row.field === field);
    assert.ok(write, `${field}: boundary prefill write is absent`);
    assert.equal(write.widgetFontSizes?.length, widgetCount,
      `${field}: every repeated widget must carry its own measured font size`);
    assert.ok(write.widgetFontSizes.every((size) => size >= 6),
      `${field}: a repeated widget fell below the six-point readability floor`);
    assert.equal(write.widgetsFittedIndividually, widgetCount,
      `${field}: every repeated appearance must use its widget-specific fit`);
  }
}

/*
 * FIX168, ROUTE_OPTIONS. THE ELECTION GUARD, AND WHY IT READS THE BYTES.
 *
 * VF11 failed this family on ROUTE_OPTIONS and the failure still reproduces:
 * `guilty`, the one control this family's own field map calls a
 * measured_route_selection, is unmade on both fixtures, so nothing on the
 * delivered petition states which statutory route it is, and the delivered
 * canonical is byte-identical to nj_indictable_conviction-set's and
 * nj_ordinance-set's. FIX121 established -- and this lane re-derived
 * independently, from the pinned binary and from the committed NJ intake -- that
 * the election cannot be made: item (d) is one compound sworn sentence whose
 * final sentence, incarceration-term type and fines-paid date are collected by
 * NO question on ANY of the three tracks, and the term dropdown the court
 * published offers only ["  ", "jail time", "prison time", "incarceration
 * time"], with no "none". Marking the box would swear to a sentence and a
 * custodial term this repository would have had to invent.
 *
 * So the withdrawal stays, and the counter stays at 1. What was missing is the
 * guard. Every assertion above checks item (d)'s eight TEXT cells; not one
 * checked the BOX. A later lane under pressure to move requiredOptionsMissing
 * from 1 to 0 could mark it and this suite would still pass.
 *
 * The guard therefore reads the DELIVERED BYTES, not the build's own report of
 * them, and covers EVERY election the pinned kit declares -- not only item (d),
 * but the dismissal, acquittal, diversion, early-pathway and prior-expungement
 * elections that belong to the participant's oath, and the four Form C
 * elections on delivered pages 30 and 32 that belong to the judge. An
 * appearance it cannot locate or decode is a refusal, never a pass.
 */
async function assertNoElectionIsMade() {
  const receipt = readJson(`${out}/source-receipt.json`);
  const document = receipt.documents.find((row) => row.documentId === "NJ-CN-10557");
  assert.ok(document, "NJ-CN-10557 is absent from the source receipt");
  const corpus = process.env.MASTER_LIBRARY_SOURCE_DIR;
  assert.ok(corpus && fs.existsSync(corpus),
    "MASTER_LIBRARY_SOURCE_DIR is required: the election guard measures against the pinned court binary, "
    + "never against a field map");
  const sourceBytes = fs.readFileSync(path.join(corpus, document.pathInArchive));
  assert.equal(sha256(sourceBytes), document.sha256,
    "NJ-CN-10557: the pinned source no longer hashes to its receipt; the election rectangles are not the court's");

  const readings = {};
  for (const fixture of ["canonical", "boundary"]) {
    const file = `${out}/fixtures/cn-10557-${fixture}.pdf`;
    const rows = await readElectionMarks(fs.readFileSync(abs(file)), { sourceBytes, pageOffset: 0 });
    /* The kit declares 19 checkbox FIELDS but 22 checkbox WIDGETS, and the
     * difference matters: `dismissPlea` is the Yes/No pair under "Was the
     * dismissal a result of a plea bargain?" and is two widgets on delivered
     * page 18, `contDismissPlea` is the same pair on page 20, and `contOwe` is
     * placed twice, on pages 19 and 21. A guard counting fields would read 19
     * and silently never look at three boxes. Pinning the widget count keeps a
     * narrowed reading from passing as a clean one. */
    assert.equal(rows.length, 22,
      `${fixture}: expected the 22 election widgets CN-10557 declares, read ${rows.length}`);
    assertNoElectionIsMarked(rows, `cn-10557-${fixture}.pdf`);
    readings[fixture] = rows;
  }
  return readings;
}

/*
 * FIX168. The determination, in the family's own record.
 *
 * FIX121's finding lived in a commit message and a lane row. A reader who opens
 * this family sees a petition, a guide that discloses a withheld election, and
 * no statement of what that withholding costs. This writes the readings the
 * guard took and the determination they support into the family directory, so
 * the block is visible where the family is read, and so the next lane does not
 * re-litigate it -- or "fix" it by marking the box.
 */
function writeElectionDetermination(readings) {
  const summarise = (rows) => rows.map((row) => ({
    field: row.field,
    deliveredPage: row.deliveredPage,
    located: row.located,
    nonWhitespaceGlyphs: row.nonWhitespaceGlyphs,
  }));
  writeJson(`${out}/reports/election-readings.json`, {
    schemaVersion: "rcap-election-mark-readings/v1",
    familyId,
    measuredBy: "scripts/rcap-official-forms/rcap-election-mark-reading.mjs",
    measuredOn: "the delivered fixture bytes, at the checkbox rectangles CN-10557 itself declares",
    everyValueIsAReading: true,
    whatANullMeans: "the appearance at that declared rectangle could not be located or decoded, so nothing was "
      + "measured there. It is never written as 0, and the guard refuses on it.",
    electionsRead: readings.canonical.length + readings.boundary.length,
    /* A reading, summed over both fixtures, not a literal: if it were a literal
     * it could never move when a mark appeared, and the guard above would be the
     * only thing standing between this record and a false zero. */
    electionsMarked: [...readings.canonical, ...readings.boundary]
      .filter((row) => row.nonWhitespaceGlyphs > 0).length,
    electionsUnreadable: [...readings.canonical, ...readings.boundary]
      .filter((row) => !row.located).length,
    fixtures: {
      canonical: summarise(readings.canonical),
      boundary: summarise(readings.boundary),
    },
    routeOptionsDetermination: {
      obligation: "ROUTE_OPTIONS",
      state: "FAILING, AND BLOCKED ON LEGAL AND INTAKE INPUT RATHER THAN ON BUILD CODE",
      failedFirstBy: "VF11 at df524f2fd; re-derived at this base by FIX168 without relying on that row",
      theDefect: "Nothing on the delivered petition states which statutory route it is. `guilty` is this family's "
        + "only measured_route_selection and it is unmade on both fixtures, so the delivered canonical is "
        + "byte-identical to nj_indictable_conviction-set's and nj_ordinance-set's.",
      whyTheElectionIsNotMadeInstead: [
        "Item (d) of Form A is one compound sworn sentence with nine blanks. Marking its box swears the whole "
          + "sentence.",
        "Three of those blanks are collected by no question on any of the three New Jersey conviction tracks: the "
          + "final sentence (guiltyFinal1/guiltyFinal2), the jail/prison/incarceration term (guiltyTimeType), and "
          + "the date the fines were paid (guiltyFineDt). The intake asks WHETHER every fine was paid, never WHEN.",
        "guiltyTimeType is a dropdown whose options, read first-hand from the pinned binary, are exactly "
          + "[\"  \", \"jail time\", \"prison time\", \"incarceration time\"]. There is no option for a route whose "
          + "participants commonly served no custodial term.",
        "So the row cannot be completed from anything this repository holds, and completing it would mean inventing "
          + "a sentence and a custodial term into a verified petition.",
      ],
      whatWouldActuallyCureIt: "An intake and legal-design decision, not a build change: either the three "
        + "uncollected facts are collected and the no-custodial-term case is given a truthful treatment, or "
        + "CN-10557 Form A is found unable to serve this route as a self-help fill and the family moves to a "
        + "different delivery. Either is outside a packet-build lane.",
      whatThisRecordDoesNotClaim: "It does not cure ROUTE_OPTIONS, does not move requiredOptionsMissing off 1, "
        + "and grants no route, no promotion and no commercial authority.",
    },
  });
}

const args = process.argv.slice(2);
process.chdir(rootDir);
if (args.includes("--assert-fix13")) {
  assertFix13Repair();
  writeElectionDetermination(await assertNoElectionIsMade());
  console.log(`${familyId}: FIX13 focused assertions complete; independent verification pending`);
} else if (args.includes("--check")) {
  const { runEastFamily } = await import("./build-census-v1-nj_arrest_no_conviction-set.mjs");
  await runEastFamily(familyId, ["--check"]);
  assertFix13Repair();
  writeElectionDetermination(await assertNoElectionIsMade());
  console.log(`${familyId}: FIX13 focused assertions complete; independent verification pending`);
} else {
  if (!args.includes("--repair-only")) {
    const { runEastFamily } = await import("./build-census-v1-nj_arrest_no_conviction-set.mjs");
    await runEastFamily(familyId, args.filter((arg) => arg !== "--repair-only"));
  }
  repairFieldMapAndWriteReport();
  repairInstructions();
  assertFix13Repair();
  writeElectionDetermination(await assertNoElectionIsMade());
  console.log(`${familyId}: FIX13 participant-instruction repair built; PDF and raster receipts preserved; independent verification pending`);
}
