#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT,
  "data/rcap-all50/overlays/census-v1/pa/pa-6308-underage-set--official-pdf-fill");
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
const map = readJson(path.relative(ROOT, path.join(OUT, "production-field-map.json")));
const writes = readJson(path.relative(ROOT, path.join(OUT, "reports/actual-writes.json")));
const routeMap = readJson(path.relative(ROOT, path.join(OUT, "route-vehicle-map.json")));
const registry = readJson("data/record-clearing/legal-design-track-registry.json");
const memo = readJson("data/record-clearing/legal-design-intake/PA.memo.json");
const guide = fs.readFileSync(path.join(OUT, "participant-instructions.md"), "utf8");

const field = (documentId, name) => {
  const document = map.documents.find((row) => row.documentId === documentId);
  assert.ok(document, `missing field-map document ${documentId}`);
  const row = document.fields.find((candidate) => candidate.field === name);
  assert.ok(row, `missing field-map row ${documentId}/${name}`);
  return row;
};

test("PA 6308 keeps the complaint/citation date independent from the offense date", () => {
  for (const example of routeMap.syntheticFixtureExamples) {
    assert.equal(example.synthetic, true);
    assert.match(example.notice, /synthetic examples/i);
    assert.notEqual(example.routeExample.complaintOrCitationDate, example.routeExample.offenseDate);
    assert.match(example.routeExample.charge, /Section 6308.*underage alcohol.*SYNTHETIC FIXTURE/i);
    assert.equal(example.routeExample.offenseAge, 19);
    assert.equal(example.routeExample.currentAge21OrOver, true);
  }
  for (const documentId of ["PA-RCRIM-P-490-PETITION", "PA-RCRIM-P-790-PETITION"]) {
    assert.equal(field(documentId, "Date on Complaint").factId,
      "matter.complaint_or_citation_date");
    const artifact = writes.artifacts.find((row) => row.documentId === documentId);
    const proof = artifact.proof.writtenProof.find((row) => row.field === "Date on Complaint");
    const example = routeMap.syntheticFixtureExamples.find((row) => row.fixture === artifact.fixture);
    assert.equal(proof.factId, "matter.complaint_or_citation_date");
    assert.equal(proof.expectedValue, example.routeExample.complaintOrCitationDate);
    assert.notEqual(proof.expectedValue, example.routeExample.offenseDate);
    assert.equal(proof.exactValueObserved, true);
  }
});

test("PA 6308 classifies old-case record facts and future judicial acts by stage", () => {
  for (const documentId of ["PA-RCRIM-P-490-PETITION", "PA-RCRIM-P-790-PETITION"]) {
    for (const name of ["Judge", "JudgeAddr1", "JudgeAddr2", "JudgeAddrCity", "JudgeAddrState", "JudgeAddrZip",
      "Name of Affiant", "AffiantAddr1", "AffiantAddr2", "AffiantAddrCity", "AffiantAddrState", "AffiantAddrZip",
      "ReasonForMissingHistory"]) {
      const row = field(documentId, name);
      assert.equal(row.blankTreatment, "REQUIRED_BEFORE_FILING", `${documentId}/${name}`);
      assert.equal(row.requiredBeforeFiling, true, `${documentId}/${name}`);
      assert.equal(row.refusalClass, null, `${documentId}/${name}`);
    }
  }
  for (const documentId of ["PA-RCRIM-P-490-ORDER", "PA-RCRIM-P-790-ORDER"]) {
    const historicalJudge = field(documentId, "NameAddrOfJudge");
    assert.equal(historicalJudge.requiredBeforeFiling, true);
    assert.equal(historicalJudge.refusalClass, null);
    const disposition = field(documentId, "Disposition");
    assert.equal(disposition.requiredBeforeFiling, false);
    assert.equal(disposition.blankTreatment, null);
    assert.equal(disposition.refusalClass, "court_prosecutor_clerk_or_agency_owned");
  }
});

test("PA 6308 carries composites where they fit and discloses partial answers", () => {
  for (const documentId of ["PA-RCRIM-P-490-ORDER", "PA-RCRIM-P-790-ORDER"]) {
    assert.equal(field(documentId, "PetitionersAddress").factId, "participant.address_one_line");
    assert.equal(field(documentId, "DateAndArrestingAgency").factId,
      "matter.complaint_or_arrest_date_and_arresting_agency");
  }
  const canonicalOrder = writes.artifacts.find((row) => row.documentId === "PA-RCRIM-P-490-ORDER");
  for (const name of ["PetitionersAddress", "DateAndArrestingAgency"]) {
    assert.ok(canonicalOrder.proof.writtenProof.some((row) => row.field === name && row.exactValueObserved));
  }
  const boundaryOrder = writes.artifacts.find((row) => row.documentId === "PA-RCRIM-P-790-ORDER");
  assert.ok(boundaryOrder.proof.writtenProof.some((row) =>
    row.field === "DateAndArrestingAgency" && row.exactValueObserved));
  assert.ok(boundaryOrder.heldButNotPrinted.some((row) =>
    row.field === "PetitionersAddress" && row.factId === "participant.address_one_line"));
  for (const documentId of ["PA-RCRIM-P-490-PETITION", "PA-RCRIM-P-790-PETITION"]) {
    const row = field(documentId, "Statute DescriptionRow1");
    assert.equal(row.decision, "refuse", `${documentId}/Statute DescriptionRow1`);
    assert.equal(row.factId, null, `${documentId}/Statute DescriptionRow1`);
    assert.equal(row.requiredBeforeFiling, true, `${documentId}/Statute DescriptionRow1`);
    assert.deepEqual(row.partialFactsHeldButNotPrinted, {
      factIds: ["matter.charge"],
      missingFacts: ["statutory title", "section", "subsection", "counts", "grade", "charge disposition"],
      whyNotWrittenHere: "row_integrity: all seven offense-row cells must be completed together from the participant's source records",
    }, `${documentId}/Statute DescriptionRow1`);
  }
  const expectedPartialCharge = {
    factIds: ["matter.charge"],
    missingFacts: ["charge disposition"],
    whyNotWrittenHere: "composite_integrity: the source asks for both the charge and its disposition, and the disposition is not held",
  };
  for (const [documentId, fieldName] of [
    ["PA-RCRIM-P-490-ORDER", "SpecificCharges"],
    ["PA-RCRIM-P-790-ORDER", "Text15"],
  ]) {
    const composite = field(documentId, fieldName);
    assert.equal(composite.decision, "refuse", `${documentId}/${fieldName}`);
    assert.equal(composite.factId, null, `${documentId}/${fieldName}`);
    assert.equal(composite.blankTreatment, "REQUIRED_BEFORE_FILING", `${documentId}/${fieldName}`);
    assert.equal(composite.requiredBeforeFiling, true, `${documentId}/${fieldName}`);
    assert.deepEqual(composite.partialFactsHeldButNotPrinted, expectedPartialCharge,
      `${documentId}/${fieldName}`);
    const artifact = writes.artifacts.find((row) => row.documentId === documentId);
    assert.ok(!artifact.proof.writtenProof.some((row) => row.field === fieldName),
      `${documentId}/${fieldName} must not print the held charge alone`);
    assert.ok(artifact.refused.some((row) => row.field === fieldName),
      `${documentId}/${fieldName} must remain an unwritten widget in the real artifact report`);
    const extracted = spawnSync("pdftotext", [path.join(ROOT, artifact.file), "-"], { encoding: "utf8" });
    assert.equal(extracted.status, 0, `${documentId}: pdftotext must read the real built PDF`);
    assert.doesNotMatch(extracted.stdout, /SYNTHETIC FIXTURE/i,
      `${documentId}/${fieldName} real PDF must not contain the charge without its disposition`);
    assert.match(guide,
      new RegExp(`${fieldName}.*holds ` + "`matter\\.charge`" + " but does not hold charge disposition", "i"));
  }
  assert.match(guide,
    /Before filing, copy the charge from the charging document and its applicable disposition from the docket or clerk-certified disposition; do not write the charge alone/i);
});

test("PA 6308 guide carries the governed questions, evidence, venue, cost, and all three stops", () => {
  const track = registry.tracks.find((row) => row.trackId === "pa_6308_underage");
  const intake = memo.tracks.find((row) => row.trackId === "pa_6308_underage");
  assert.deepEqual(routeMap.governedParticipantRequirements.generationRequirements,
    track.generationRequirements);
  assert.deepEqual(routeMap.governedParticipantRequirements.participantFilingRequirements,
    track.participantFilingRequirements);
  assert.deepEqual(routeMap.governedParticipantRequirements.selfHelpStopConditions,
    track.selfHelpStopConditions);
  assert.deepEqual(intake.participantInputs, track.generationRequirements);
  assert.deepEqual(intake.supportingDocuments, track.participantFilingRequirements);
  assert.deepEqual(intake.selfHelpStopConditions, track.selfHelpStopConditions);
  for (const row of track.generationRequirements) assert.ok(guide.includes(row.question));
  for (const row of track.participantFilingRequirements) {
    assert.ok(guide.includes(row.name));
    assert.ok(guide.includes(row.howToObtain));
    if (row.conditionDescription) assert.ok(guide.includes(row.conditionDescription));
  }
  for (const stop of track.selfHelpStopConditions) assert.ok(guide.includes(stop));
  assert.match(guide, /Clerk of the courts of the judicial district in which the charges were disposed/i);
  assert.ok(guide.includes(track.rules.fees));
  assert.ok(guide.includes(track.rules.feeWaiver));
  assert.match(guide, /correct the packet if they disagree/i);
});
