#!/usr/bin/env node
/**
 * The hold that worker publication must not be able to clear.
 *
 * WHAT THIS EXISTS TO STOP
 *
 * Five routes carry a filing-format artifact a census-v1 build host produced
 * and a reviewer approved. The commercial path does not deliver that artifact.
 * For an ordinary paid Grade-A route the product composes at delivery --
 * `packetFulfillmentAuthority` -> `rcap_grade_a_composer_v1` ->
 * `buildGradeAArtifact` -> the CURRENT specification -> `composeGradeAPacket`
 * -> `assembleParticipantPacket` -- and Illinois composes the same way inside
 * the personalized worker.
 *
 * So while those routes were held for an unrelated reason -- no current worker
 * publication, therefore no observation -- the difference was invisible. Clear
 * that one gate and they would have gone commercially eligible on the strength
 * of an approval naming bytes the product no longer produces.
 *
 * The staleness check that publication clears runs AFTER `collectMissingProof`.
 * Putting this proof in the completeness gaps is therefore not a detail of
 * where the code sits: it is the reason publication cannot reach it. These
 * controls prove that ordering holds, by evaluating each record against a
 * FULLY CURRENT observation -- the state the repository will be in after the
 * next publication -- and requiring the five to stay closed anyway.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import { register } from "node:module";

register("./lib/ts-esm-loader.mjs", import.meta.url);
const { evaluateFulfillmentAuthority } = await import("../src/lib/rcap/fulfillment/grade-a-authority.ts");

const registry = JSON.parse(fs.readFileSync("data/rcap-grade-a/fulfillment-authority-registry.json", "utf8"));
const snapshot = JSON.parse(fs.readFileSync("data/rcap-grade-a/fulfillment-observation-snapshot.json", "utf8"));
const current = (routeId) => registry.records.find((r) => r.routeId === routeId && !r.supersededBy);

let passed = 0;
const check = (label, run) => { run(); passed += 1; console.log(`PASS ${label}`); };

const HELD = [
  "DC:dc_actual_innocence_expungement_16_803",
  "IL:felony-prostitution-relief",
  "MS:additional-justice-court-misdemeanor-relief-9-11-15-3",
  "MS:additional-municipal-court-misdemeanor-relief-21-23-7-6",
  "WY:felony-conviction-expungement-w-s-7-13-1502"
];
const MS_NONCONV = "MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";
const GAP = /the filing-format artifact is an adopted artifact/;

/**
 * The observation the repository will have once the worker is published: every
 * bound digest observed to match, and a provider digest present. Built from the
 * record itself so nothing here is stale by construction -- which is the point,
 * because a hold that only survives a stale world is not a hold.
 */
function observationAfterPublication(record) {
  const observed = snapshot.routes[record.routeId] ?? {};
  return {
    ...observed,
    observedAt: observed.observedAt,
    legalAuthority: {
      version: record.legalAuthority.version,
      status: record.legalAuthority.status,
      scopeSha256: record.legalAuthority.scopeSha256
    },
    packetSpecificationSha256: record.packetSpecification.sha256,
    officialSourceSha256ById: Object.fromEntries(
      record.officialSources.map((source) => [source.sourceId, source.sha256])),
    corpusReleaseId: observed.corpusReleaseId,
    corpusArchiveSha256: observed.corpusArchiveSha256,
    provider: { ...record.provider, imageDigest: `sha256:${"a".repeat(64)}` },
    fixtureSha256: record.fixture.sha256,
    artifactSha256: record.artifactValidation.artifactSha256,
    visualReviewEvidenceSha256: record.visualReview.evidenceSha256,
    outputLegalApprovalScopeSha256: record.outputLegalApproval.scopeSha256,
    finalVerificationBoundInputsSha256: record.finalVerification.boundInputsSha256,
    externalPublication: {
      ...(observed.externalPublication ?? {}),
      currentInputsEquivalent: true,
      workflowConclusion: "success"
    }
  };
}

/** A record with its provider digest present, as publication would leave it. */
function published(record) {
  return { ...record, provider: { ...record.provider, imageDigest: `sha256:${"a".repeat(64)}` } };
}

for (const routeId of HELD) {
  const record = current(routeId);
  check(`${routeId}: the record says its artifact is not the commercial one`, () => {
    const artifact = record.packetCompleteness.filingFormatArtifact;
    assert.equal(artifact.isCurrentCommercialArtifact, false);
    assert.equal(artifact.currentCommercialArtifactReview.state, "pending_owner_review");
    assert.equal(artifact.currentCommercialArtifactReview.approval, null);
  });
  check(`${routeId}: held today, and the reason is the composed artifact`, () => {
    const decision = evaluateFulfillmentAuthority(record, null, routeId);
    assert.equal(decision.authorized, false);
    assert.equal(decision.state, "INCOMPLETE");
    assert.ok(decision.missingProof.some((gap) => GAP.test(gap)), decision.missingProof.join("; "));
  });
  check(`${routeId}: STILL held against a fully current observation`, () => {
    const decision = evaluateFulfillmentAuthority(
      published(record), observationAfterPublication(published(record)), routeId);
    assert.equal(decision.commercialStatus, "not_commercially_eligible");
    assert.equal(decision.state, "INCOMPLETE", "publication must not turn this into a staleness question");
    assert.ok(decision.missingProof.some((gap) => GAP.test(gap)),
      `publication cleared the composed-artifact hold: ${decision.missingProof.join("; ")}`);
  });
}

check("Mississippi non-conviction is not held by this proof", () => {
  const record = current(MS_NONCONV);
  const artifact = record.packetCompleteness.filingFormatArtifact;
  // Roger approved these exact assembled bytes, and they are what the current
  // provider composes -- so this route clears through publication as intended.
  assert.equal(artifact.isCurrentCommercialArtifact, true);
  assert.ok(String(artifact.producedBy.renderer).startsWith("rcap_grade_a_document_v1"));
  const decision = evaluateFulfillmentAuthority(record, null, MS_NONCONV);
  assert.equal(decision.missingProof.some((gap) => GAP.test(gap)), false, decision.missingProof.join("; "));
  /*
   * The exact list, so nothing else can hold this route unnoticed.
   *
   * It used to be one line: the provider digest. The shared Fees & Costs
   * correction then moved two of the artifacts Roger approved on 2026-09-20,
   * which refuses that approval and drops the record to the pre-successor
   * candidate -- so the route now waits on an owner decision and, without the
   * successor binding, on a final verification and an official source too.
   *
   * None of that is the composed-artifact hold, which is what this control is
   * about and which is still absent. The list is pinned rather than sampled
   * because "not held by THIS proof" is only worth asserting alongside what the
   * route IS held by.
   */
  assert.deepEqual(decision.missingProof.map((gap) => gap.split(":")[0]).sort(),
    ["final_verification", "official_sources", "owner_decision", "provider"]);
  assert.match(decision.missingProof.find((gap) => gap.startsWith("owner_decision:")),
    /MS-NONCONV-PAID-CONSUMER-SUCCESSOR-20260920 names artifact bytes the product no longer composes/);
});

check("a record cannot claim the commercial artifact without the commercial renderer", () => {
  const record = structuredClone(current(MS_NONCONV));
  record.packetCompleteness.filingFormatArtifact.producedBy.renderer =
    "scripts/build-census-v1-something.mjs@sha256:0";
  const decision = evaluateFulfillmentAuthority(record, null, MS_NONCONV);
  assert.ok(decision.missingProof.some((gap) => /is not rcap_grade_a_document_v1/.test(gap)),
    decision.missingProof.join("; "));
});

check("a record that does not answer the question at all is incomplete", () => {
  const record = structuredClone(current(MS_NONCONV));
  delete record.packetCompleteness.filingFormatArtifact.isCurrentCommercialArtifact;
  const decision = evaluateFulfillmentAuthority(record, null, MS_NONCONV);
  assert.ok(decision.missingProof.some((gap) => /does not say whether the filing-format artifact is the one/.test(gap)),
    decision.missingProof.join("; "));
});

check("an approval that names no bytes does not clear the hold", () => {
  const record = structuredClone(current(HELD[0]));
  record.packetCompleteness.filingFormatArtifact.currentCommercialArtifactReview = {
    state: "approved", composedBy: "x",
    approval: { path: "somewhere.json", sha256: "", recordId: "R", artifactSha256: "" },
    why: "claimed"
  };
  const decision = evaluateFulfillmentAuthority(record, null, HELD[0]);
  assert.ok(decision.missingProof.some((gap) => /names neither the approved bytes nor its own record digest/.test(gap)),
    decision.missingProof.join("; "));
});

console.log(`${passed}/${passed} current-commercial-artifact controls passed; publication clears the observation and never this hold.`);
