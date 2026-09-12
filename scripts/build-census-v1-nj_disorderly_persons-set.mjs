#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readElectionMarks } from "./rcap-official-forms/rcap-election-mark-reading.mjs";

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

**The rules engine counts only the factual convictions you supply and verify from the SBI history and court records.** It does not ask you to choose a statutory branch. Missing or disputed offense facts stop packet generation. What follows is the counting rule the engine applies; it is not a final eligibility finding.

### The held counting rule, quoted whole

> ${mechanism.split("\n").join("\n> ")}

Three things in that rule decide most records, and they are the three worth re-reading. The five-offence line is a **cap of five**, counted across disorderly persons offences, petty disorderly persons offences, or any combination of the two. The **same-day** route and the **interdependent-or-closely-related** route carry **no numeric cap at all**, so a record over five may still qualify under one of them. And any **crime** conviction — an indictable offence in New Jersey, a felony anywhere else — takes the record off this route entirely and onto N.J.S.A. 2C:52-2.

### A published figure that is not this route's figure

The committed record carries this caution about a number you are likely to meet first:

> ${String(countingCaution.question).split("\n").join("\n> ")}

So a published "up to three" is the cap for a different route, not for this one. The correction that this route's cap is **five** rather than four is itself a held legal-design item: "${capCorrection.statement}".

### What you will be asked, and where this stops

The intake question this route records for the count is: "${countQuestion.question}"

The ordinary five-offense count is encoded. A disputed count, a same-day or closely-related characterization that the records do not establish, or marijuana/hashish regrading is a self-help stop. Those conditions are listed again under "Where self-help ends" below.
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
    const notesMarker = "- Form A item (d) is completed and marked only after";
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
    if (raster.status === "RASTER_PENDING") {
      assert.deepEqual(raster.pages, [], `${raster.fixture}: pending raster record must not claim page evidence`);
      const sourcePdf = fs.readFileSync(abs(raster.sourcePdf));
      assert.equal(sha256(sourcePdf), raster.sourcePdfSha256,
        `${raster.sourcePdf}: pending raster must bind the exact current PDF bytes`);
      continue;
    }
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

function assertCurrentFactDerivedRepair() {
  assertPdfRecordsMatch();
  const map = readJson(`${out}/production-field-map.json`);
  const fields = map.documents[0].fields;
  const instructions = fs.readFileSync(abs(`${out}/participant-instructions.md`), "utf8");
  const writes = readJson(`${out}/reports/actual-writes.json`);
  const routeFacts = readJson(`${out}/reports/route-fact-classification.json`);

  for (const field of ["ExpungeCntyName", "arrest3Statute", "arrest4Statute", "arrest5Statute"]) {
    const row = fields.find((candidate) => candidate.field === field);
    assert.ok(row, `${field}: field-map row is absent`);
    assert.equal(row.decision, "refuse");
    assert.equal(row.blankTreatment, "REQUIRED_BEFORE_FILING");
    assert.equal(row.requiredBeforeFiling, true);
  }
  for (const field of ["guiltyDt", "guiltyOff1", "guiltyStatute", "guiltyFinal1", "guiltyCrt",
    "guiltyTimeType", "guiltyDocCmpltDt", "guiltyProbDt", "guiltyFineDt"]) {
    const row = fields.find((candidate) => candidate.field === field);
    assert.equal(row?.decision, "candidate_write", `${field}: complete conviction-row fact is not mapped`);
    for (const artifact of writes.artifacts) {
      assert.ok(artifact.written.some((write) => write.field === field),
        `${artifact.fixture}/${field}: fact is absent from delivered bytes`);
    }
  }
  const guilty = fields.find((field) => field.field === "guilty");
  assert.equal(guilty?.decision, "measured_route_selection");
  assert.equal(guilty?.selectionAuthorization, "NJ_CN10557_FACT_DERIVED_CONVICTION_SELECTIONS");
  assert.ok(writes.artifacts.every((artifact) => artifact.selections
    .some((selection) => (selection.control ?? selection.label) === "guilty")));
  assert.equal(routeFacts.missingOrUnsupportedTreatment, "STOP_NO_PACKET_AND_NO_ELECTION");
  assert.ok(routeFacts.fixtures.every((fixture) => fixture.synthetic
    && fixture.allRequiredFactsPresent && fixture.authorizedSelections.join() === "guilty"));

  for (const field of ["guiltyOff2", "guiltyFinal2"]) {
    const row = fields.find((candidate) => candidate.field === field);
    assert.equal(row?.decision, "refuse");
    assert.equal(row?.blankTreatment, "OPTIONAL_PARTICIPANT_CONTENT");
    assert.equal(row?.requiredBeforeFiling, false);
  }
  for (const heading of ["## What it costs to file", "## Where to file", "## Who must be served",
    "## Where self-help ends", COUNTING_DISCLOSURE_HEADING, "## Facts that control this packet route"]) {
    assert.ok(instructions.includes(heading), `${heading}: instruction section is absent`);
  }
  assert.ok(instructions.includes("You do not choose a legal route"));
  assert.ok(!instructions.includes("The item (d) conviction election on page 19 is withdrawn"));
  for (const artifact of writes.artifacts) {
    assert.deepEqual(artifact.proof.protectedInk, []);
    assert.deepEqual(artifact.proof.protectedVectorInk, []);
  }
}

/*
 * Read the fact-derived item-(d) mark from the delivered bytes. The source's
 * flattened widget appearance remains blank because the mark is a bounded
 * vector overlay, so this pairs a complete source-widget read with the host's
 * saved-byte path proof. Any other participant or court selection stays blank.
 */
async function readFactDerivedElection() {
  const receipt = readJson(`${out}/source-receipt.json`);
  const document = receipt.documents.find((row) => row.documentId === "NJ-CN-10557");
  assert.ok(document, "NJ-C-CN-10557 is absent from the source receipt");
  const corpus = process.env.MASTER_LIBRARY_SOURCE_DIR;
  assert.ok(corpus && fs.existsSync(corpus), "MASTER_LIBRARY_SOURCE_DIR is required for the election reading");
  const sourceBytes = fs.readFileSync(path.join(corpus, document.pathInArchive));
  assert.equal(sha256(sourceBytes), document.sha256);
  const readings = {};
  const writes = readJson(`${out}/reports/actual-writes.json`);
  for (const fixture of ["canonical", "boundary"]) {
    const file = `${out}/fixtures/cn-10557-${fixture}.pdf`;
    const rows = await readElectionMarks(fs.readFileSync(abs(file)), { sourceBytes, pageOffset: 0 });
    assert.equal(rows.length, 22);
    /* The flattened official widget appearance remains blank. The route mark
     * is deliberately a pair of vector strokes laid into that source-owned
     * rectangle, so a text-only widget reader cannot see it. Pair the complete
     * 22-widget blank reading with the host's artifact-derived path proof. */
    assert.deepEqual(rows.filter((row) => row.nonWhitespaceGlyphs > 0), [],
      `${fixture}: a source widget appearance unexpectedly carries text`);
    const artifact = writes.artifacts.find((row) => row.fixture === fixture);
    assert.ok(artifact, `${fixture}: actual-write record is absent`);
    assert.deepEqual(artifact.selections.map((row) => row.control ?? row.label), ["guilty"],
      `${fixture}: only the fact-derived item (d) selection may be reported`);
    assert.equal(artifact.proof.selectionProof.length, 1,
      `${fixture}: exactly one artifact selection proof is required`);
    assert.equal(artifact.proof.selectionProof[0].control, "guilty");
    assert.equal(artifact.proof.selectionProof[0].markObservedInArtifactBytes, true,
      `${fixture}: item (d) vector mark is not observed in current bytes`);
    assert.equal(artifact.proof.selectionProof[0].artifactDerivedMarkPaths.length, 2,
      `${fixture}: item (d) must be exactly two inset diagonal strokes`);
    readings[fixture] = { widgets: rows, selectionProof: artifact.proof.selectionProof };
  }
  return readings;
}

function writeElectionDetermination(readings) {
  const summarise = ({ widgets, selectionProof }) => ({ widgets: widgets.map((row) => ({
    field: row.field, deliveredPage: row.deliveredPage, located: row.located,
    nonWhitespaceGlyphs: row.nonWhitespaceGlyphs,
  })), selectionProof });
  writeJson(`${out}/reports/election-readings.json`, {
    schemaVersion: "rcap-election-mark-readings/v2",
    familyId,
    measuredBy: "scripts/rcap-official-forms/rcap-election-mark-reading.mjs",
    electionsRead: readings.canonical.widgets.length + readings.boundary.widgets.length,
    electionsMarked: readings.canonical.selectionProof.length + readings.boundary.selectionProof.length,
    electionsUnreadable: [...readings.canonical.widgets, ...readings.boundary.widgets]
      .filter((row) => !row.located).length,
    fixtures: { canonical: summarise(readings.canonical), boundary: summarise(readings.boundary) },
    routeOptionsDetermination: {
      obligation: "ROUTE_OPTIONS",
      state: "REPAIRED_AWAITING_INDEPENDENT_REVIEW",
      bindingDecision: "NJ-DISORDERLY-PERSONS-FACTS-NOT-LEGAL-ELECTION",
      participantLegalElectionRequested: false,
      selectionSource: "Complete participant court-record facts are classified by the governed route rule; missing or unsupported facts stop generation without a mark.",
      markedControl: "guilty",
      allOtherParticipantAndCourtSelectionsBlank: true,
      commercialAuthority: false,
      runtimeSelectable: false,
    },
  });
}

const args = process.argv.slice(2);
process.chdir(rootDir);
const { runEastFamily } = await import("./build-census-v1-nj_arrest_no_conviction-set.mjs");
if (args.includes("--assert-fix13")) {
  assertCurrentFactDerivedRepair();
  writeElectionDetermination(await readFactDerivedElection());
  console.log(`${familyId}: fact-derived CN-10557 assertions complete`);
} else if (args.includes("--check") || args.includes("--check-nonvisual")) {
  await runEastFamily(familyId, ["--check-nonvisual"]);
  repairInstructions();
  assertCurrentFactDerivedRepair();
  writeElectionDetermination(await readFactDerivedElection());
  console.log(`${familyId}: CHECK PASS (fact-derived CN-10557 conviction route)`);
} else {
  await runEastFamily(familyId, ["--no-raster"]);
  repairInstructions();
  writeElectionDetermination(await readFactDerivedElection());
  assertCurrentFactDerivedRepair();
  console.log(`${familyId}: BUILD PASS (fact-derived CN-10557 conviction route; central raster pending)`);
}
