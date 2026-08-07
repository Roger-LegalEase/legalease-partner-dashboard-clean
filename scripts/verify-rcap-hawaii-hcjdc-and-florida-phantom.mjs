#!/usr/bin/env node
// Two source findings that are easy to lose, and one shared failure mode.
//
// Hawaii: HCJDC-159 and HCJDC 159(b) are one document. They were carried as two
// acquisition identities, which is how a superseded 2019 revision stays
// selectable next to the current one. The same scope heuristic that scored
// Colorado's JDF 2371 court-specific did it again here, on a document that is
// not a court form at all — HCJDC is a statewide unit of the Department of the
// Attorney General and the application is filed by mail with that one office.
//
// Florida: FL-RULE-3.989-CONTINUATION names nothing. Rule 3.989 has four forms
// and no continuation page. Recorded as an ordinary unacquired source it reads
// as a document that exists and has merely not been obtained, which keeps a
// release blocker open against a phantom and sends acquisition after nothing.
//
// The shared failure mode is a record that asserts more than the evidence does.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd());
const read = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));

const HI_DECISION =
  "data/record-clearing/production-factory/source-acquisition/" +
  "rcap-hi-in-repo-identity-reconciliation-hcjdc-159.json";
const FL_DECISION =
  "data/record-clearing/production-factory/source-acquisition/" +
  "rcap-fl-source-identity-resolution-rule-3-989-continuation.json";
const REGISTRY = "data/record-clearing/source-artifact-registry.json";
const QUEUE = "data/record-clearing/master-library/source-acquisition-queue.json";

const CURRENT_HI_SHA256 =
  "1cb4f3acc20d569820379410c3aeb67c59fe3e24866932696371f25efaad935a";

const checks = [];
let failures = 0;

function check(name, run) {
  try {
    run();
    checks.push(`PASS ${name}`);
  } catch (error) {
    failures += 1;
    checks.push(`FAIL ${name}: ${error.message}`);
  }
}

const hawaii = read(HI_DECISION);
const florida = read(FL_DECISION);
const registry = read(REGISTRY);
const queue = read(QUEUE);
const artifactById = new Map(
  registry.artifacts.map((artifact) => [artifact.artifactId, artifact])
);

check("the two Hawaii keys resolve to one current document", () => {
  assert.equal(
    hawaii.terminalDisposition,
    "duplicate_identity_keys_resolved_to_one_document_authority_edition_amendment_required"
  );
  const resolved = hawaii.resolvedIdentity;
  assert.ok(resolved, "the decision records no resolved identity");
  assert.equal(resolved.singleDocument, true);
  assert.equal(resolved.officialDocumentId, "HCJDC 159(b)");
  assert.equal(resolved.officialTitle, "Expungement Application");
  assert.equal(resolved.scope, "statewide");
  assert.equal(resolved.currentRevision, "REV-2026-06-03");
  // Both historical keys are named as collapsing to it, which is what stops a
  // second acquisition identity re-appearing for the same document.
  assert.deepEqual(
    [...resolved.repositoryKeysThatCollapseToIt].sort(),
    ["HCJDC-159", "HCJDC-159B"]
  );
  const structure = hawaii.technicalStructure;
  assert.ok(structure, "the decision records no technical structure");
  assert.equal(structure.sha256, CURRENT_HI_SHA256);
  assert.equal(structure.bytes, 181711);
  assert.equal(structure.structuralClass, "flat_pdf");
  assert.equal(structure.logicalFields, 0);
  assert.equal(structure.terminalFields, 0);
  assert.equal(structure.xfa, false);
  assert.equal(structure.encrypted, false);
  // Widget geometry, page dimensions and rotation were outside the assignment.
  // They are named as not established rather than recorded as zero: for a
  // zero-field flat PDF the page geometry is exactly what an overlay renderer
  // would key on, so a fabricated zero would be worse than a gap.
  assert.deepEqual(
    [...structure.notEstablishedWithinThisAssignment.fields].sort(),
    ["page dimensions", "page rotation", "widget annotation count"]
  );
  for (const key of ["widgets", "pageWidthPt", "pageHeightPt", "rotation"]) {
    assert.equal(
      Object.hasOwn(structure, key),
      false,
      `${key} was recorded without being measured`
    );
  }
});

check("the superseded 2019 revision cannot be selected as current", () => {
  const superseded = artifactById.get("revised-exp-application-2019-11");
  const current = artifactById.get("expungement-application-rev-2026-06");
  assert.ok(superseded && current, "a Hawaii application row is missing");
  // Two rows still exist — the 2019 file is real and its row is history, not a
  // duplicate to be deleted. What must not happen is that it reads as current.
  assert.notEqual(superseded.artifactId, current.artifactId);
  assert.match(JSON.stringify(hawaii), /superseded/i);
  // The current revision is the one the decision pins by digest.
  assert.equal(
    JSON.stringify(hawaii).includes(CURRENT_HI_SHA256),
    true
  );
});

check("an agency mailing address does not make a statewide form local", () => {
  for (const id of [
    "expungement-application-rev-2026-06",
    "revised-exp-application-2019-11"
  ]) {
    const row = artifactById.get(id);
    assert.ok(row, `${id} is absent`);
    // The marker stays: the document really does carry an address block. What
    // changed is that the block no longer decides the scope.
    assert.deepEqual(row.geographicMarkers, ["service_city_state_zip"]);
    assert.equal(row.geographicScope, "statewide", id);
    assert.notEqual(row.currency, "local_only", id);
    assert.equal(row.scannerGeographicScope, "court_specific", id);
    assert.match(row.geographicScopeCorrectionBasis, /HCJDC|statewide/i);
  }
  assert.equal(hawaii.scopeFinding.verdict, "statewide_scope_confirmed");
});

check("no unrelated Hawaii scope row moved", () => {
  const corrected = registry.artifacts
    .filter((artifact) => artifact.geographicScopeCorrectionBasis !== undefined)
    .map((artifact) => artifact.artifactId)
    .sort();
  // Colorado's JDF 2371 plus exactly these two. The marker list itself is
  // deliberately unchanged, so nothing else was rescoped by side effect.
  assert.deepEqual(corrected, [
    "expungement-application-rev-2026-06",
    "jdf-2371-motion-to-seal-conviction-records-conduct-no-longer-prohibited-rev-2025-07-01",
    "revised-exp-application-2019-11"
  ]);
});

check("no Hawaii source receipt exists before the edition admits the asset", () => {
  const receiptDirectory =
    "data/record-clearing/production-factory/source-materialization-receipts";
  const receipts = fs
    .readdirSync(path.join(ROOT, receiptDirectory))
    .filter((name) => name.endsWith(".json"));
  const hawaiiReceipts = receipts.filter((name) => /(^|-)hi-/.test(name));
  assert.deepEqual(
    hawaiiReceipts,
    [],
    "a Hawaii receipt exists before Edition 1.3 admits the asset"
  );
  assert.equal(hawaii.edition13Impact.requiresNewBytes, true);
  assert.equal(hawaii.edition13Impact.publicationPerformed ?? false, false);
});

check("the Florida continuation names no document", () => {
  assert.equal(
    florida.terminalDisposition,
    "normalization_artefact_no_such_official_document_component_rescope_required"
  );
  assert.equal(florida.terminalDispositionDetail.acquisitionRequired, false);
  // Not "we could not get it". Answered in the negative, with evidence.
  assert.notEqual(
    florida.terminalDisposition,
    "identity_established_binary_unavailable"
  );
  assert.match(
    florida.terminalDispositionDetail.stoppedRatherThanMapped,
    /No similar file was mapped in/
  );
});

check("the phantom leaves acquisition rather than staying unacquired", () => {
  const row = queue.rows.find(
    (entry) => entry.acquisitionKey === "acquire:FL:fl-rule-3-989-continuation"
  );
  assert.ok(row, "the Florida continuation row is absent from the queue");
  assert.equal(
    row.edition12Disposition,
    "normalization_artifact_no_document_exists"
  );
  assert.equal(row.acquisitionRequired, false);
  assert.equal(
    row.resolvedByDecisionJobId,
    "rcap-fl-source-identity-resolution-rule-3-989-continuation"
  );
  assert.ok(
    queue.dispositionMeanings.normalization_artifact_no_document_exists,
    "the disposition has no recorded meaning"
  );
  // Exactly one. A phantom disposition applied broadly would hide real gaps.
  assert.equal(queue.totals.phantomIdentities, 1);
});

check("no Florida continuation binary or receipt was invented", () => {
  const receiptDirectory = path.join(
    ROOT,
    "data/record-clearing/production-factory/source-materialization-receipts"
  );
  for (const name of fs.readdirSync(receiptDirectory)) {
    assert.equal(
      /continuation/i.test(name),
      false,
      `${name} materializes a document that does not exist`
    );
  }
  assert.equal(florida.edition13Impact.requiresNewBytes, false);
  assert.match(
    florida.terminalDispositionDetail.acquisitionRequiredRationale,
    /never promulgated/
  );
});

check("FDLE 40-021 stays a separate agency application", () => {
  const text = JSON.stringify(florida);
  assert.match(text, /40-021/);
  // The decision considered it and rejected it as a substitute rather than
  // quietly mapping it in.
  assert.match(text, /rejected|separate|distinct/i);
});

process.stdout.write(`${checks.join("\n")}\n`);
if (failures > 0) {
  process.stderr.write(
    `\nHawaii/Florida source regression failed: ${failures} check(s).\n`
  );
  process.exitCode = 1;
} else {
  process.stdout.write("\nHawaii/Florida source regression passed.\n");
}
