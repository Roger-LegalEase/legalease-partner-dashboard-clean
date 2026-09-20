#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { auditFamily } from "./rcap-packet-completeness/verify-packet-completeness.mjs";
import { readElectionMarks } from "./rcap-official-forms/rcap-election-mark-reading.mjs";

const ROOT = path.resolve(".");
const SOURCE_ROOT = path.join(ROOT,
  "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1");
const SOURCE_REL =
  "STATES/NJ/02_PACKET_FORMS/NJ__FORM__CN-10557__cn-10557-new-jersey-expungement-kit__REV-2020-06__EN.pdf";
const SOURCE_SHA = "c1dd37b5e27bd76ea2330b07f51847c420d359db8f10c0576682e6558d09c5f7";
const sourceBytes = fs.readFileSync(path.join(SOURCE_ROOT, SOURCE_REL));
const hash = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
assert.equal(hash(sourceBytes), SOURCE_SHA);

const REQUIRED_ROW_FIELDS = [
  "guiltyDt", "guiltyOff1", "guiltyStatute", "guiltyFinal1", "guiltyCrt",
  "guiltyTimeType", "guiltyDocCmpltDt", "guiltyProbDt", "guiltyFineDt",
];
const REQUIRED_ARREST_FIELDS = [
  "arrestOff1", "arrestStatute", "arrestMuni", "origCaseNums",
  "arrest1Dt", "arrest1Statute", "arrest1CaseNum", "ExpungeCntyName",
];
const zeroCounters = [
  "knownRequiredFieldsMissing", "requiredFactsNotCollected", "unclassifiedBlanks",
  "incompleteRows", "requiredOptionsMissing", "requiredComponentsMissing", "protectedWrites",
];

let assertions = 1;
for (const familyId of ["nj_disorderly_persons-set", "nj_indictable_conviction-set"]) {
  const out = `data/rcap-all50/overlays/census-v1/nj/${familyId.replaceAll("_", "-")}--official-pdf-fill`;
  const read = (file) => JSON.parse(fs.readFileSync(path.join(ROOT, out, file), "utf8"));
  const map = read("production-field-map.json");
  const writes = read("reports/actual-writes.json");
  const rendered = read("reports/rendered-artifacts.json");
  const receipt = read("source-receipt.json");
  const route = read("reports/route-fact-classification.json");
  const guide = fs.readFileSync(path.join(ROOT, out, "participant-instructions.md"), "utf8");
  const fields = map.documents[0].fields;

  assert.equal(receipt.documents[0].sha256, SOURCE_SHA); assertions += 1;
  assert.equal(route.bindingDecision, familyId === "nj_disorderly_persons-set"
    ? "NJ-DISORDERLY-PERSONS-FACTS-NOT-LEGAL-ELECTION"
    : "NJ-INDICTABLE-FACTS-NOT-LEGAL-ELECTION"); assertions += 1;
  const expectedSelections = familyId === "nj_indictable_conviction-set"
    ? ["guilty", "seekJuvNever"] : ["guilty"];
  assert.ok(route.fixtures.every((row) => row.synthetic && row.allRequiredFactsPresent
    && row.authorizedSelections.join() === expectedSelections.join()
    && Object.values(row.aliasedNarrativeBranchesInactive).every(Boolean))); assertions += 1;
  for (const field of REQUIRED_ROW_FIELDS) {
    const row = fields.find((candidate) => candidate.field === field);
    assert.equal(row?.decision, "candidate_write", `${familyId}/${field}`); assertions += 1;
  }
  const routeControl = fields.find((row) => row.field === "guilty");
  assert.equal(routeControl?.selectionAuthorization,
    "NJ_CN10557_FACT_DERIVED_CONVICTION_SELECTIONS"); assertions += 1;
  for (const field of ["seek5yrs", "seek34degree", "changeName"]
    .concat(familyId === "nj_disorderly_persons-set" ? ["seekJuvNever"] : [])) {
    const row = fields.find((candidate) => candidate.field === field);
    assert.equal(row?.completenessDisposition, "NOT_APPLICABLE_ON_THIS_ROUTE",
      `${familyId}/${field}`); assertions += 1;
    assert.equal(row?.requiredBeforeFiling, false, `${familyId}/${field}`); assertions += 1;
  }
  if (familyId === "nj_indictable_conviction-set") {
    const verification = fields.find((candidate) => candidate.field === "seekJuvNever");
    assert.equal(verification?.decision, "measured_route_selection"); assertions += 1;
    assert.match(verification?.decisionBasis ?? "", /no-prior-criminal-expungement/); assertions += 1;
  }
  for (const field of ["guiltyOff2", "guiltyFinal2"]) {
    const row = fields.find((candidate) => candidate.field === field);
    assert.equal(row?.completenessDisposition, "OPTIONAL_PARTICIPANT_CONTENT"); assertions += 1;
    assert.equal(row?.sourceOptional?.sourceSha256, SOURCE_SHA); assertions += 1;
  }
  const alias = fields.find((row) => row.field === "seek5yrsDetails");
  assert.equal(alias?.completenessDisposition, "NOT_APPLICABLE_ON_THIS_ROUTE"); assertions += 1;
  assert.equal(alias?.widgets.length, 3); assertions += 1;
  const postOrderAlias = fields.find((row) => row.field === "FamDivAddr2");
  assert.equal(postOrderAlias?.completenessDisposition, "PARTICIPANT_LATER_COMPLETION"); assertions += 1;
  assert.equal(postOrderAlias?.widgets.length, 2); assertions += 1;
  assert.equal(postOrderAlias?.sourceStage?.familyId, familyId); assertions += 1;
  assert.match(guide, /do not type one digital field value into both/); assertions += 1;
  for (const internal of ["obligation:", "source field:", "source-stage:",
    "legal-design-track-registry", "registry path", "track id", "AcroForm"]) {
    assert.ok(!guide.toLowerCase().includes(internal.toLowerCase()), `${familyId}/${internal}`);
    assertions += 1;
  }
  const later = fields.filter((row) => row.completenessDisposition === "PARTICIPANT_LATER_COMPLETION");
  assert.ok(later.length >= 20, `${familyId}: expected complete later-stage recipient inventory`); assertions += 1;
  assert.ok(later.every((row) => row.sourceStage?.familyId === familyId)); assertions += 1;
  assert.ok(later.every((row) => guide.includes(row.effectiveLabel))); assertions += 1;
  const inactive = fields.filter((row) => row.caseApplicability === "INACTIVE_IN_CURRENT_COMPLETE_SYNTHETIC_RECORD");
  assert.ok(inactive.length >= 20); assertions += 1;
  assert.ok(inactive.every((row) => row.completenessDisposition === "NOT_APPLICABLE_ON_THIS_ROUTE"
    && row.refusalClass == null)); assertions += 1;

  assert.equal(writes.artifacts.length, 2); assertions += 1;
  for (const artifact of writes.artifacts) {
    assert.equal(artifact.written.length, 27); assertions += 1;
    for (const field of [...REQUIRED_ROW_FIELDS, ...REQUIRED_ARREST_FIELDS]) {
      assert.ok(artifact.written.some((row) => row.field === field),
        `${familyId}/${artifact.fixture}/${field}`); assertions += 1;
    }
    const offense = artifact.proof.writtenProof.find((row) => row.field === "guiltyOff1");
    assert.match(offense?.expectedValue ?? "", familyId === "nj_disorderly_persons-set"
      ? /^Disorderly conduct/ : /^Third-degree theft/); assertions += 1;
    assert.doesNotMatch(offense?.expectedValue ?? "", /controlled substance/i); assertions += 1;
    assert.deepEqual(artifact.flatAnchorWrites?.map((row) => row.factId), ["matter.arrest_date"]); assertions += 1;
    assert.ok(artifact.flatAnchorWrites.every((row) => row.outcome === "fit" && row.fontSize >= 6)); assertions += 1;
    assert.deepEqual(artifact.selections.map((row) => row.control), expectedSelections); assertions += 1;
    assert.equal(artifact.proof.selectionProof.length, expectedSelections.length); assertions += 1;
    assert.ok(artifact.proof.selectionProof.every((row) => row.markObservedInArtifactBytes === true)); assertions += 1;
    assert.ok(artifact.proof.selectionProof.every((row) => row.artifactDerivedMarkPaths.length === 2)); assertions += 1;
    assert.deepEqual(artifact.proof.protectedInk, []); assertions += 1;
    assert.deepEqual(artifact.proof.protectedVectorInk, []); assertions += 1;
    assert.deepEqual(artifact.proof.missingWrittenInk, []); assertions += 1;
    assert.deepEqual(artifact.proof.wrongWrittenValues, []); assertions += 1;
    assert.ok(artifact.addedGlyphsReadFromOutputBytes > 0); assertions += 1;
    assert.ok(artifact.flattenedWidgetAppearancesReadFromOutputBytes > 0); assertions += 1;
    assert.equal(artifact.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, null); assertions += 1;

    const pdfRecord = rendered.pdfs.find((row) => row.fixture === artifact.fixture);
    const pdfBytes = fs.readFileSync(path.join(ROOT, pdfRecord.file));
    assert.equal(hash(pdfBytes), pdfRecord.sha256); assertions += 1;
    const widgets = await readElectionMarks(pdfBytes, { sourceBytes, pageOffset: 0 });
    assert.equal(widgets.length, 22); assertions += 1;
    assert.ok(widgets.every((row) => row.located && row.nonWhitespaceGlyphs === 0),
      `${familyId}/${artifact.fixture}: source widget appearances must stay blank; the one fact-derived mark is a separately proved vector overlay`); assertions += 1;
  }

  const prior = process.env.MASTER_LIBRARY_SOURCE_DIR;
  process.env.MASTER_LIBRARY_SOURCE_DIR = SOURCE_ROOT;
  const audit = auditFamily(out, familyId);
  if (prior === undefined) delete process.env.MASTER_LIBRARY_SOURCE_DIR;
  else process.env.MASTER_LIBRARY_SOURCE_DIR = prior;
  for (const counter of zeroCounters) {
    assert.equal(audit.counters[counter], 0, `${familyId}/${counter}`); assertions += 1;
  }
  assert.equal(audit.counters.invisibleWrites, 0); assertions += 1;
  assert.equal(audit.counters.visualDefects, null); assertions += 1;
}

console.log(`NJ_CN10557_CONVICTION_OUTPUT_PASS assertions=${assertions}`);
