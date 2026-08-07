#!/usr/bin/env node
// Vermont's fee-waiver form has two live binaries. The issuer's current
// pointer serves the 04/2026 revision; a legacy static path still returns
// HTTP 200 and a well-formed 129-field AcroForm from 11/2019. Retained
// availability is not currency, and a binding built against the old object
// would fail silently rather than loudly, because it is a valid PDF with a
// valid form — just the wrong one.
//
// These cases hold the contract that the adopted source is the current
// revision and that the superseded one cannot satisfy it under any of the
// facts that make it superficially attractive: it resolves, it is the same
// form number, it has the same page count, and it has more fields.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));

const LEGAL_DESIGN_DECISION =
  "data/record-clearing/production-factory/legal-design-decisions/" +
  "vt-600-00228-source-identity-resolution.json";
const ACQUISITION_DECISION =
  "data/record-clearing/production-factory/source-acquisition/" +
  "rcap-vt-600-00228-source-identity-resolution.json";
const PROJECTION =
  "data/record-clearing/production-factory/official-pdf-source-assignment-projection.json";
const IDENTITY_KEY = "rcap-vt-600-00228-fb7ffbfd76";

const CURRENT = Object.freeze({
  revision: "04/2026",
  revisionCode: "REV-2026-04",
  sha256: "263d4e196cbca1bfba14ec730368fcc897dd2bb667d6a43ade7f612d42541654",
  bytes: 2871072,
  pageCount: 2,
  acroFormFieldCount: 80
});
const SUPERSEDED = Object.freeze({
  revision: "11/2019",
  sha256: "40fb571156ab73707b418b503d0291d900e2d614cd2b8e2b605b30dd07f50191",
  bytes: 1391726,
  pageCount: 2,
  acroFormFieldCount: 129,
  url: "https://www.vtcourts.gov/sites/default/files/documents/600-00228.pdf",
  httpStatus: 200
});

let checks = 0;
const check = (name, fn) => {
  fn();
  checks += 1;
};

const design = readJson(LEGAL_DESIGN_DECISION);
const acquisition = readJson(ACQUISITION_DECISION);
const projection = readJson(PROJECTION);
const row = acquisition.reconciliations[0];
const identity = (projection.identities ?? []).find(
  (candidate) => candidate.identityKey === IDENTITY_KEY
);

check("the adopted source is the current 04/2026 revision", () => {
  assert.equal(design.form600_00228.revision.current, CURRENT.revision);
  assert.equal(design.form600_00228.revision.currentCode, CURRENT.revisionCode);
  assert.equal(design.form600_00228.measuredBinary.sha256, CURRENT.sha256);
  assert.equal(design.form600_00228.measuredBinary.bytes, CURRENT.bytes);
  assert.equal(design.form600_00228.measuredBinary.pageCount, CURRENT.pageCount);
  assert.equal(
    design.form600_00228.measuredBinary.acroFormFieldCount,
    CURRENT.acroFormFieldCount
  );
  assert.equal(row.resolvedRevision, CURRENT.revisionCode);
  assert.equal(row.sha256, CURRENT.sha256);
  assert.equal(row.sizeBytes, CURRENT.bytes);
  assert.equal(row.retainedArtifact.fieldCount, CURRENT.acroFormFieldCount);
  assert.equal(row.retainedArtifact.archiveEntrySha256, CURRENT.sha256);
  assert.equal(row.retainedArtifact.archiveEntryBytes, CURRENT.bytes);
});

check("the 11/2019 revision is recorded as superseded, not as an option", () => {
  const superseded = design.supersessionTreatment.supersededRevision;
  assert.equal(superseded.revision, SUPERSEDED.revision);
  assert.equal(superseded.sha256, SUPERSEDED.sha256);
  assert.equal(superseded.bytes, SUPERSEDED.bytes);
  assert.equal(superseded.acroFormFieldCount, SUPERSEDED.acroFormFieldCount);
  assert.equal(superseded.treatment, "must_not_be_bound_as_current");
  assert.equal(
    design.terminalDispositionDetail["600-00228_prior_revision_11_2019"],
    "superseded_by_current_revision_of_the_same_form"
  );
  assert.equal(
    row.supersededRevision.disposition,
    "superseded_by_current_revision_of_the_same_form"
  );
  assert.equal(row.supersededRevision.treatment, "must_not_be_bound_as_current");
});

check("the old revision is rejected on hash, size and field structure", () => {
  // Each of these is on its own a sufficient refusal: a source contract that
  // accepted any one of them would accept the wrong binary.
  assert.notEqual(SUPERSEDED.sha256, CURRENT.sha256);
  assert.notEqual(SUPERSEDED.bytes, CURRENT.bytes);
  assert.notEqual(SUPERSEDED.acroFormFieldCount, CURRENT.acroFormFieldCount);
  // The row keeps the superseded revision as named historical evidence. What
  // must stay clean of it is the current-source binding itself, so the
  // supersededRevision block is the one place it is allowed to appear.
  const { supersededRevision, ...currentBinding } = row;
  assert.ok(supersededRevision, "the historical evidence must be preserved");
  for (const candidate of [
    currentBinding,
    row.retainedArtifact,
    identity.officialDocument
  ]) {
    const serialized = JSON.stringify(candidate ?? {});
    assert.equal(
      serialized.includes(SUPERSEDED.sha256),
      false,
      "the superseded hash must not appear in a current-source binding"
    );
    assert.equal(
      serialized.includes(String(SUPERSEDED.bytes)),
      false,
      "the superseded byte count must not appear in a current-source binding"
    );
  }
  // The page count is deliberately equal on both revisions, so a contract that
  // relied on page count alone would not tell them apart.
  assert.equal(SUPERSEDED.pageCount, CURRENT.pageCount);
});

check("HTTP 200 on the legacy path does not make it the current source", () => {
  assert.equal(row.supersededRevision.httpStatus, SUPERSEDED.httpStatus);
  assert.equal(row.supersededRevision.url, SUPERSEDED.url);
  assert.notEqual(row.directOfficialUrl, SUPERSEDED.url);
  assert.notEqual(design.form600_00228.officialSource.controllingBinaryUrl, SUPERSEDED.url);
  assert.equal(
    design.supersessionTreatment.disposition,
    "prior_revision_of_the_same_form_superseded_legacy_path_still_resolvable"
  );
});

check("600-00229 carries no identity, acquisition target or source gap", () => {
  assert.equal(design.form600_00229.exists, false);
  assert.equal(design.form600_00229.terminalDisposition, "numbering_typo_confirmed");
  const closed = (acquisition.closedIdentities ?? []).find(
    (entry) => entry.documentId === "600-00229"
  );
  assert.ok(closed, "600-00229 must be recorded as a closed identity");
  assert.equal(closed.disposition, "numbering_typo_confirmed");
  assert.equal(closed.acquisitionTarget, false);
  assert.equal(closed.sourceGap, false);
  assert.deepEqual(closed.componentIds, []);
  // And it must not have become an identity of its own anywhere downstream.
  assert.equal(
    (projection.identities ?? []).some((candidate) =>
      String(candidate.officialDocument?.documentId ?? "").includes("600-00229")
    ),
    false
  );
});

check("the resolved identity is not claimed worker-assignable", () => {
  assert.ok(identity, `${IDENTITY_KEY} is absent from the projection`);
  // The blocker narrowed once the adopted manifest's own measurement reached the
  // source contract: the identity is exact and its renderer lane is AcroForm,
  // and what withholds it is the manifest classifying a participant-completed
  // fillable application as supporting_process with packet_candidate no. That
  // is role_mismatch, which is stricter than the measurement-shaped disposition
  // it replaced, and still ineligible.
  assert.equal(identity.disposition, "role_mismatch");
  assert.equal(identity.sourceIdentityState, "exact_source_requirement_ready");
  assert.equal(identity.assignmentEligible, false);
  assert.equal(acquisition.gates.sourceMaterialized, false);
  assert.equal(acquisition.gates.sourceReceiptCreated, false);
  assert.equal(acquisition.gates.editionAmendmentRequired, true);
  assert.equal(acquisition.gates.runtimeStatus, "runtime_disabled");
  assert.equal(acquisition.gates.productionEnabled, false);
});

check("the seven fee-waiver components are bound exactly once", () => {
  const expected = [
    "vt_exp_decriminalized-fee-waiver-application-3",
    "vt_seal_18_to_21-fee-waiver-application-3",
    "vt_seal_dui-fee-waiver-application-3",
    "vt_seal_felony-fee-waiver-application-3",
    "vt_seal_misdemeanor-fee-waiver-application-3",
    "vt_seal_nonconviction-fee-waiver-application-5",
    "vt_seal_pardon-fee-waiver-application-3"
  ];
  assert.deepEqual([...row.sharedFormBinding.componentIds].sort(), expected);
  assert.deepEqual([...identity.componentIds].sort(), expected);
  assert.equal(row.sharedFormBinding.componentCount, expected.length);
  assert.equal(row.sharedFormBinding.trackCount, 7);
});

console.log(`Vermont 600-00228 source contract verified: ${checks} checks.`);
console.log(
  `  current    REV-2026-04  ${CURRENT.bytes} bytes  ${CURRENT.acroFormFieldCount} fields  ${CURRENT.sha256}`
);
console.log(
  `  superseded 11/2019      ${SUPERSEDED.bytes} bytes  ${SUPERSEDED.acroFormFieldCount} fields  rejected as current`
);
console.log("  600-00229  numbering typo, no identity, no acquisition target");
