#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import {
  FACTORY_LANES,
  REQUIRED_JOB_FIELDS,
  buildFactoryPlan,
  findOwnedPathOverlaps,
  loadFactoryPlan,
  loadJob,
  serializeFactoryPlan,
  stableStringify,
  validateFactoryPlan,
  validateJob
} from "./lib/rcap-factory/index.mjs";
import {
  compileWorkerPrompt
} from "./lib/rcap-factory/prompt.mjs";
import {
  buildScaffoldPlan
} from "./lib/rcap-factory/scaffold.mjs";
import {
  inspectPdfBytes
} from "./lib/rcap-factory/pdf-inspection.mjs";
import {
  generateJobReviewArtifacts,
  verifyTrackedReviewManifest
} from "./lib/rcap-factory/review-artifacts.mjs";
import {
  isWorkerScaffoldCheckout,
  validateChangedPaths,
  validateJobWorkspace,
  validateWorkerCommand
} from "./lib/rcap-factory/validation.mjs";
import {
  buildFactoryStatus
} from "./rcap-factory-status.mjs";
import {
  buildWaveIntegrationPlan,
  filterPermittedCaptainStatus,
  integrateWave
} from "./lib/rcap-factory/wave-integration.mjs";
import {
  assertAuthorityOutputContract
} from "./lib/rcap-factory/authority-output.mjs";
import {
  ADOPTION_RECORD_PATHS,
  buildCurrentCounselAdoptionRecords
} from "./lib/rcap-counsel-adoption.mjs";
import {
  NORMALIZATION_READINESS_FOUNDATION_JOB_ID,
  REMAINING_NORMALIZATION_JURISDICTIONS,
  assertClaimPermitsSession,
  deriveNormalizationReadinessRecord,
  inspectNormalizationBundle,
  legalReviewAssetsForTesting,
  mechanismInventoryCanonicalPayloadByteCount,
  mechanismInventorySha256,
  validateNormalizationReadinessRecord
} from "./lib/rcap-factory/normalization-readiness.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const EXPECTED_BASE = "8df94fbaa66c06bf0ba677ee4f5fb417ad08cdc8";
const AUTHORIZED_INTEGRATED_CONTENT_BASE =
  "1d8ed5a3302a055ffb5a590aa83dcb47f4a2df86";
const results = [];
const failures = [];

await check("job JSON Schema and manifest contract", () => {
  const schema = readJson(
    "data/record-clearing/production-factory/job-schema.json"
  );
  assert.deepEqual(schema.required, REQUIRED_JOB_FIELDS);
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.properties.lane.enum, FACTORY_LANES);
  assert.ok(
    schema.properties.strategyFamily.enum.includes(
      "legal_design_adjudication"
    )
  );
  assert.equal(schema.allOf.length, 7);
  assert.equal(
    schema.allOf[0].then.properties.requiredOutputFields.contains.const,
    "downloadedSourceCount"
  );
  assert.equal(
    schema.allOf[1].then.properties.requiredOutputFields.contains.const,
    "acquisitionIds"
  );
  assert.equal(
    schema.allOf[2].then.properties.requiredOutputFields.contains.const,
    "reconciliationIds"
  );
  assert.equal(
    schema.allOf[4].then.properties.participantPacketProofRequired.const,
    false
  );
});

let plan;
await check("deterministic plan covers all lanes and jurisdictions", () => {
  const first = buildFactoryPlan({ rootDir: ROOT });
  const second = buildFactoryPlan({ rootDir: ROOT });
  const firstBytes = serializeFactoryPlan(first);
  const secondBytes = serializeFactoryPlan(second);
  assert.equal(firstBytes, secondBytes);

  const validation = validateFactoryPlan(first);
  assert.equal(validation.ok, true, validation.issues.join("\n"));
  assert.equal(
    new Set(
      first.jobs
        .map((job) => job.jurisdiction)
        .filter((jurisdiction) => jurisdiction !== "NATIONWIDE")
    ).size,
    51
  );
  assert.ok(first.jobs.some((job) => job.jurisdiction === "NATIONWIDE"));
  assert.deepEqual(first.lanes.map((entry) => entry.lane), FACTORY_LANES);
  assert.ok(first.lanes.every((entry) => entry.jobIds.length > 0));
  assert.equal(first.waves.length, FACTORY_LANES.length);
  assert.equal(first.jobs.length, 210);
  assert.equal(first.jobs.filter((job) => job.status === "ready").length, 61);
  assert.equal(first.jobs.filter((job) => job.status === "blocked").length, 123);
  assert.equal(first.jobs.filter((job) => job.status === "in_progress").length, 1);
  assert.equal(first.jobs.filter((job) => job.status === "completed").length, 25);
  assert.equal(findOwnedPathOverlaps(first.jobs).length, 0);
  assert.ok(first.generatedFrom.length >= 8);
  assert.ok(first.generatedFrom.every((entry) => /^[0-9a-f]{64}$/.test(entry.sha256)));
  assert.equal(first.sourceSummary.runtime.normalizedPacketReadyTracks, 0);
  assert.equal(first.sourceSummary.runtime.enabledJurisdictions, 0);
  assert.deepEqual(first.sourceSummary.runtime.launchGates, ["red"]);
  for (const job of first.jobs) {
    for (const field of REQUIRED_JOB_FIELDS) assert.ok(field in job, `${job.jobId}: ${field}`);
    const reviewPath =
      `data/record-clearing/production-factory/review-manifests/${job.jobId}.json`;
    assert.ok(job.integrationOwnedOutputs.includes(reviewPath), job.jobId);
    assert.equal(job.ownedPaths.includes(reviewPath), false, job.jobId);
    assert.ok(job.forbiddenPaths.includes(
      "data/record-clearing/production-factory/review-manifests"
    ));
  }
  assert.deepEqual(first.canonicalPlan, {
    parentJobs: 72,
    waves: 8,
    lanes: 11,
    completedParentJobs: 4,
    childMappingPolicy: {
      cardinality: "exactly_one_execution_owner",
      implementationSelection:
        "canonical lane match, then greatest matching-track count, then lexical parentJobId",
      reviewSelection:
        "greatest represented implementation-family count, then lexical review parentJobId",
      aggregation:
        "A mechanical jurisdiction child may aggregate tracks represented by multiple canonical " +
        "family parents; its one parentJobId is the deterministic execution owner. Canonical " +
        "normalized-track representation is verified separately and is not inferred from child bundles."
    },
    jobIds: first.canonicalPlan.jobIds
  });
  assert.deepEqual(first.jobs[0].integrationValidation, [
    "npm run rcap:factory:test",
    "npm run rcap:verify-integrated-production-plan",
    "npm run rcap:verify-master-library-authority",
    "npm run typecheck",
    "npm test"
  ]);
  assert.equal(first.parentJobReconciliation.compiledChildJobs, 210);
  assert.equal(first.parentJobReconciliation.childrenMappedExactlyOnce, 210);
  assert.equal(first.parentJobReconciliation.unmappedChildren, 0);
  assert.equal(first.parentJobReconciliation.unknownParentReferences, 0);
  plan = first;
});

await check("terminal guidance and authority children preserve exact provenance", () => {
  const completions = new Map([
    ["rcap-ak-guidance-implementation", ["36509c7377c5653db07fd5c43b3948aad079164a", 4]],
    ["rcap-ca-guidance-implementation", ["26b4661089849a67eb99bfae6598ba101f75cbbc", 3]],
    ["rcap-ct-guidance-implementation", ["fd9ef0bfc18f11d0b34d7504682a574e2a849d06", 6]],
    ["rcap-dc-guidance-implementation", ["03505f1659072e28b245dfd9677426a995960bdd", 2]],
    ["rcap-md-guidance-implementation", ["8dfdc7ae28a6362825ae19621e8a7afd6d8cef6c", 5]],
    ["rcap-mi-guidance-implementation", ["7dbe89fe733474a90cc1ad20b5c11dc1a6520aa5", 6]],
    ["rcap-mn-guidance-implementation", ["bf6f368c8a4cd72e0fa488bd37336c073f116925", 7]],
    ["rcap-co-in-repo-identity-reconciliation-needs-edition-reclass-not-acquisition", ["6afe0d989bb079dbd1eab377b0547b9b6908d902", null]],
    ["rcap-ak-public-official-download", ["4acded00a77584b0ea9c9f00e490e2a6a92dd033", null]],
    ["rcap-me-public-official-download", ["6912e16bc73dbb85612dc5ede86c6a472e5c1e91", null]],
    ["rcap-mi-public-official-download", ["6ad135bcd8ef53b36a8c63948056fec546ba24d0", null]],
    ["rcap-id-public-official-download", ["95c47cdbf031b71164e8f2ea4fb71299f61aad9b", null]],
    ["rcap-il-public-official-download", ["17e9cad367543a4f7b21b30d754d09e51ffbd898", null]]
  ]);
  for (const [jobId, [completionCommit, trackCount]] of completions) {
    const completed = plan.jobs.find((job) => job.jobId === jobId);
    assert.ok(completed, jobId);
    assert.equal(completed.status, "completed", jobId);
    assert.equal(completed.completionCommit, completionCommit, jobId);
    if (trackCount !== null) {
      assert.equal(completed.trackIds.length, trackCount, jobId);
      assert.equal(completed.participantPacketProofRequired, true, jobId);
    } else {
      assert.notEqual(
        completed.participantPacketProofRequired,
        true,
        jobId
      );
      assert.equal(
        completed.integrationOwnedOutputs.some((output) =>
          output.startsWith(
            "data/record-clearing/production-factory/packet-proofs/"
          )
        ),
        false,
        jobId
      );
    }
  }
});

await check("integrated acquisition intelligence is lossless and action-specific", () => {
  const reconciliation = plan.acquisitionReconciliation;
  assert.equal(reconciliation.researchedDocuments, 109);
  assert.equal(reconciliation.dispositionedDocuments, 109);
  assert.equal(reconciliation.evidenceRecords, 313);
  assert.equal(reconciliation.issuerCampaigns, 32);
  assert.equal(reconciliation.duplicateAssignments, 0);
  assert.equal(reconciliation.omissions, 0);
  assert.deepEqual(reconciliation.byFinalResearchStatus, {
    commercial_license_required: 13,
    identity_unresolved: 4,
    local_court_selection_required: 1,
    not_required_custom_pleading: 3,
    not_required_no_filing_route: 2,
    official_download_automation_blocked: 20,
    official_request_required: 5,
    public_official_download: 60,
    superseded: 1
  });

  const job = (jobId) => plan.jobs.find((entry) => entry.jobId === jobId);
  assert.equal(
    job("rcap-ar-in-repo-identity-reconciliation-acic").acquisitionIds.length,
    17
  );
  assert.deepEqual(
    job("rcap-ar-public-official-download-acic-gaps").acquisitionIds,
    [
      "acquire:AR:acic-order-veterans-court",
      "acquire:AR:acic-petition-dismiss-and-seal-first-offenders",
      "acquire:AR:acic-uniform-petition-to-seal"
    ]
  );
  assert.equal(
    job("rcap-md-in-repo-identity-reconciliation-cc-dc-cr-072").acquisitionIds.length,
    4
  );
  assert.equal(
    job("rcap-al-in-repo-identity-reconciliation-cr-65").acquisitionIds.length,
    1
  );
  assert.equal(
    job("rcap-hi-in-repo-identity-reconciliation-hcjdc-159").acquisitionIds.length,
    2
  );
  assert.equal(
    job("rcap-fl-public-official-download-fdle-fac-supersession").acquisitionIds.length,
    4
  );
  assert.equal(job("rcap-ks-commercial-license").acquisitionIds.length, 9);
  assert.equal(job("rcap-in-commercial-license").acquisitionIds.length, 4);
  assert.match(job("rcap-in-commercial-license").stopCondition, /two shared licensed PDF bundles/);
  assert.equal(job("rcap-mo-direct-issuer-request").acquisitionIds.length, 4);
  assert.equal(job("rcap-mo-superseded-source-replacement").acquisitionIds.length, 1);
  assert.equal(job("rcap-de-direct-issuer-request").acquisitionIds.length, 1);
  assert.equal(
    job("rcap-ca-local-form-scope-correction-sdsc-crm-307").acquisitionIds.length,
    1
  );

  const identityJobs = plan.jobs.filter(
    (entry) =>
      entry.strategyFamily === "source_identity_resolution" &&
      (entry.acquisitionIds?.length ?? 0) > 0
  );
  assert.deepEqual(
    identityJobs.map((entry) => entry.jobId).sort(),
    [
      "rcap-co-source-identity-resolution-jdf-417-order",
      "rcap-fl-source-identity-resolution-rule-3-989-continuation",
      "rcap-ia-source-identity-resolution-certification-of-service",
      "rcap-ks-source-identity-resolution-criminal-cover-sheet"
    ]
  );

  const ga = job("rcap-ga-custom-pleading");
  assert.equal(ga.model, "opus");
  assert.equal(ga.effort, "xhigh");
  assert.equal(ga.status, "completed");
  assert.equal(ga.trackIds.length, 9);
  assert.ok(
    ga.expectedOutputs.includes(
      "scripts/verify-rcap-ga-superior-court-pleading-family-packets.mjs"
    )
  );
  assert.match(ga.stopCondition, /nine deterministic participant packets/);
  const gaJail = job("rcap-ga-guidance-specification-jail-k2");
  assert.equal(gaJail.status, "completed");
  assert.equal(gaJail.completionCommit, "ca5958590d1b52713c4489d58617586e82f33629");
  assert.equal(gaJail.parentJobId, "IMP-CP-02-guidance-spec-unblock-family");
  assert.deepEqual(gaJail.trackIds, ["ga-jail-k2"]);
  assert.match(gaJail.stopCondition, /ga-jail-k2-process-guidance-3/);
  assert.match(gaJail.stopCondition, /not a complete packet/);
  assert.equal(job("rcap-ga-jail-k2-packet-implementation").status, "blocked");
});

await check("all normalized tracks reconcile exactly once and completed tranches stay complete", () => {
  const reconciliation = plan.trackReconciliation;
  assert.equal(reconciliation.normalizedTracks, 260);
  assert.equal(reconciliation.representedExactlyOnce, 260);
  assert.equal(reconciliation.implementationComplete, 52);
  assert.equal(reconciliation.pendingProductionJob, 208);

  const implementationLanes = new Set([
    "custom_pleading",
    "acroform_fill",
    "flat_pdf_overlay",
    "composed_route",
    "guidance_implementation"
  ]);
  const completed = reconciliation.assignments.filter(
    (entry) => entry.disposition === "implementation_complete"
  );
  assert.equal(completed.filter((entry) => entry.jurisdiction === "MS").length, 5);
  assert.equal(completed.filter((entry) => entry.jurisdiction === "GA").length, 9);
  assert.equal(completed.filter((entry) => entry.jurisdiction === "DC").length, 4);
  assert.equal(completed.filter((entry) => entry.jurisdiction === "IL").length, 2);
  assert.deepEqual(
    completed
      .filter((entry) => entry.jurisdiction === "MD")
      .map((entry) => entry.trackId),
    [
      "md_10103_1_automatic",
      "md_10103_legacy_police",
      "md_10104_pre_service",
      "md_10105_1_automatic",
      "md_10112_dpscs_cannabis",
      "md_second_chance_shielding"
    ]
  );
  for (const track of completed) {
    assert.equal(
      plan.jobs.some(
        (job) =>
          ["planned", "ready", "blocked", "in_progress"].includes(job.status) &&
          implementationLanes.has(job.lane) &&
          job.jurisdiction === track.jurisdiction &&
          job.trackIds.includes(track.trackId)
      ),
      false,
      `${track.jurisdiction}:${track.trackId}`
    );
  }
  const completedMarylandJob = plan.jobs.find(
    (job) => job.jobId === "rcap-md-second-chance-shielding-completed"
  );
  assert.equal(completedMarylandJob.status, "completed");
  assert.deepEqual(completedMarylandJob.trackIds, ["md_second_chance_shielding"]);
  const activeMarylandImplementation = plan.jobs.filter(
    (job) =>
      ["planned", "ready", "blocked", "in_progress"].includes(job.status) &&
      implementationLanes.has(job.lane) &&
      job.jurisdiction === "MD"
  );
  assert.deepEqual(activeMarylandImplementation, []);
});

await check("packet, source-materialization, and normalization readiness fail closed", () => {
  const packetLanes = new Set([
    "custom_pleading",
    "acroform_fill",
    "flat_pdf_overlay",
    "composed_route",
    "guidance_implementation"
  ]);
  for (const job of plan.jobs.filter((entry) => packetLanes.has(entry.lane))) {
    assert.equal(
      job.participantPacketProofRequired,
      job.strategyFamily !== "legal_design_adjudication",
      job.jobId
    );
    assert.match(job.regressionVerifier, /^scripts\/verify-rcap-.+\.mjs$/, job.jobId);
    assert.ok(
      job.expectedOutputs.includes(job.regressionVerifier) ||
        job.integrationOwnedOutputs.includes(job.regressionVerifier),
      job.jobId
    );
    assert.ok(
      job.focusedValidation.includes(`node ${job.regressionVerifier}`),
      job.jobId
    );
  }
  const adjudicationJobs = plan.jobs.filter(
    (entry) => entry.strategyFamily === "legal_design_adjudication"
  );
  assert.ok(adjudicationJobs.length >= 3);
  for (const job of adjudicationJobs) {
    assert.equal(job.participantPacketProofRequired, false, job.jobId);
    assert.equal(
      job.integrationOwnedOutputs.some((output) =>
        output.startsWith(
          "data/record-clearing/production-factory/packet-proofs/"
        )
      ),
      false,
      job.jobId
    );
  }
  const packetWithoutVerifier = structuredClone(
    plan.jobs.find(
      (entry) =>
        entry.lane === "guidance_implementation" &&
        entry.strategyFamily !== "legal_design_adjudication"
    )
  );
  delete packetWithoutVerifier.regressionVerifier;
  assert.equal(validateJob(packetWithoutVerifier).ok, false);
  const packetWithoutProof = structuredClone(packetWithoutVerifier);
  packetWithoutProof.regressionVerifier =
    plan.jobs.find(
      (entry) =>
        entry.lane === "guidance_implementation" &&
        entry.strategyFamily !== "legal_design_adjudication"
    ).regressionVerifier;
  packetWithoutProof.participantPacketProofRequired = false;
  assert.equal(validateJob(packetWithoutProof).ok, false);

  const adjudicationWithoutExplicitProof = structuredClone(
    adjudicationJobs[0]
  );
  delete adjudicationWithoutExplicitProof.participantPacketProofRequired;
  assert.equal(validateJob(adjudicationWithoutExplicitProof).ok, false);
  const adjudicationClaimingProof = structuredClone(adjudicationJobs[0]);
  adjudicationClaimingProof.participantPacketProofRequired = true;
  adjudicationClaimingProof.integrationOwnedOutputs.push(
    `data/record-clearing/production-factory/packet-proofs/${adjudicationClaimingProof.jobId}.json`
  );
  assert.equal(validateJob(adjudicationClaimingProof).ok, false);

  const officialJobs = plan.jobs.filter(
    (entry) =>
      entry.strategyFamily === "official_pdf_fill" &&
      ["planned", "ready", "blocked", "in_progress"].includes(entry.status)
  );
  assert.ok(officialJobs.length > 0);
  for (const job of officialJobs) {
    assert.equal(job.status, "blocked", job.jobId);
    assert.ok(job.sourceMaterializationInputs.length > 0, job.jobId);
    for (const input of job.sourceMaterializationInputs) {
      assert.equal(input.authorityAssetState, "authority_asset_known");
      assert.equal(input.materializationState, "binary_materialization_required");
      assert.equal(input.workerReadiness, "binary_materialization_required");
      assert.equal(input.workerMayRead, true);
      assert.equal(input.workerMayModify, false);
      assert.ok(job.requiredInputs.includes(input.materializationDestination));
      assert.ok(job.focusedValidation.includes(input.verificationCommand));
    }
  }
  const falselyReady = structuredClone(officialJobs[0]);
  falselyReady.status = "ready";
  assert.equal(validateJob(falselyReady).ok, false);

  const pa = plan.jobs.find(
    (entry) => entry.jobId === "rcap-pa-legal-design-normalization"
  );
  assert.equal(pa.status, "completed");
  assert.equal(
    pa.normalizationReadiness.readinessState,
    "normalization_complete"
  );
  assert.equal(
    pa.completionCommit,
    "387656ac31a49f7338bd9d1e3e170df929659d98"
  );
  assert.equal(pa.assignmentClaim, undefined);
  const paTrack11 = plan.jobs.find(
    (entry) =>
      entry.jobId === "rcap-pa-clean-slate-correction-adjudication"
  );
  assert.equal(paTrack11.status, "blocked");
  assert.equal(paTrack11.lane, "legal_design_normalization");
  assert.equal(paTrack11.strategyFamily, "legal_design_adjudication");
  assert.deepEqual(paTrack11.trackIds, []);
  assert.deepEqual(paTrack11.dependencies, [
    "rcap-pa-legal-design-normalization"
  ]);
  assert.equal(
    paTrack11.parentJobId,
    "NORM-03-pod-2-mid-atlantic"
  );
  assert.equal(paTrack11.participantPacketProofRequired, false);
  assert.equal(paTrack11.regressionVerifier, undefined);
  assert.match(paTrack11.stopCondition, /packet identity and legal effect/);
  assert.match(paTrack11.stopCondition, /Do not invent a normalized track/);
  assert.match(paTrack11.stopCondition, /do not inherit standing counsel adoption/);
  assert.ok(
    paTrack11.requiredInputs.includes(
      "data/record-clearing/legal-design-intake/PA.memo.json"
    )
  );
  assert.match(
    pa.normalizationReadiness.controllingReviewAssetPath,
    /^STATES\/PA\/01_LEGAL_REVIEW\//
  );
  assert.match(
    pa.normalizationReadiness.controllingReviewSha256,
    /^[0-9a-f]{64}$/
  );
  assert.equal(
    Object.hasOwn(
      pa.normalizationReadiness,
      "approvedMechanismInventory"
    ),
    false
  );
  const otherNormalizations = plan.jobs.filter(
    (entry) =>
      /-legal-design-normalization$/.test(entry.jobId) &&
      entry.jurisdiction !== "PA"
  );
  assert.equal(otherNormalizations.length, 24);
  assert.ok(otherNormalizations.every((entry) => entry.status === "blocked"));
  assert.deepEqual(
    otherNormalizations.map((entry) => entry.jurisdiction).sort(),
    REMAINING_NORMALIZATION_JURISDICTIONS
  );
  for (const entry of otherNormalizations) {
    const readiness = entry.normalizationReadiness;
    assert.equal(readiness.jurisdiction, entry.jurisdiction);
    const countConflict = ["UT", "VT", "WV"].includes(entry.jurisdiction);
    assert.equal(
      readiness.readinessState,
      countConflict
        ? "mechanism_inventory_count_conflict"
        : "legal_review_materialization_required"
    );
    assert.equal(readiness.controllingReviewStatus, "checksum_verified");
    assert.match(readiness.controllingReviewAssetPath, /^STATES\/[A-Z]{2}\//);
    assert.match(readiness.controllingReviewSha256, /^[0-9a-f]{64}$/);
    assert.match(readiness.controllingReviewRevision, /^ASOF-\d{4}-\d{2}-\d{2}$/);
    assert.match(readiness.reviewedThrough, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(readiness.mechanismInventory.length > 0);
    assert.match(readiness.mechanismInventorySha256, /^[0-9a-f]{64}$/);
    assert.equal(
      readiness.canonicalMechanismInventorySha256,
      readiness.mechanismInventorySha256
    );
    assert.equal(readiness.canonicalizationVersion, "mechanism-inventory-v1");
    assert.ok(readiness.canonicalPayloadByteCount > 0);
    assert.equal(
      new Set(readiness.expectedSourceIds).size,
      readiness.expectedSourceIds.length
    );
    assert.ok(
      readiness.readinessBlockers.includes(
        countConflict
          ? "mechanism_inventory_count_conflict"
          : "legal_review_materialization_required"
      )
    );
    assert.ok(
      entry.dependencies.includes(
        NORMALIZATION_READINESS_FOUNDATION_JOB_ID
      )
    );
    assert.equal(entry.assignmentClaim.status, "reserved");
    assert.doesNotThrow(() =>
      assertClaimPermitsSession(entry, entry.assignmentClaim.ownerSession)
    );
    assert.throws(
      () => assertClaimPermitsSession(entry, "SESSION_C"),
      /is reserved to/
    );
  }
  for (const jurisdiction of ["UT", "VT", "WV"]) {
    const readiness = otherNormalizations.find(
      (entry) => entry.jurisdiction === jurisdiction
    ).normalizationReadiness;
    assert.equal(
      readiness.denominatorAdjudication.status,
      "count_conflict_unresolved"
    );
  }
  for (const jurisdiction of ["SC", "TN"]) {
    const readiness = otherNormalizations.find(
      (entry) => entry.jurisdiction === jurisdiction
    ).normalizationReadiness;
    assert.ok(
      readiness.authorityRefreshFlags.includes(
        "official_url_discovery_required"
      )
    );
  }
  const wyoming = otherNormalizations.find(
    (entry) => entry.jurisdiction === "WY"
  ).normalizationReadiness;
  assert.ok(
    wyoming.authorityRefreshFlags.includes(
      "official_authority_refresh_required"
    )
  );
  assert.deepEqual(plan.normalizationReadiness, {
    expectedJurisdictions: 24,
    representedExactlyOnce: 24,
    bundlesReceived: 24,
    readyForNormalization: 0,
    blocked: 24,
    byReadinessState: {
      legal_review_materialization_required: 21,
      mechanism_inventory_count_conflict: 3
    }
  });
  const readinessFoundation = plan.jobs.find(
    (entry) => entry.jobId === NORMALIZATION_READINESS_FOUNDATION_JOB_ID
  );
  assert.equal(readinessFoundation.status, "in_progress");
  assert.equal(
    readinessFoundation.parentJobId,
    "F-01-batch-3-expected-track-ids"
  );
  assert.equal(readinessFoundation.executionScope, "captain");
  assert.equal(
    plan.jobs.find(
      (entry) => entry.jobId === "rcap-nationwide-source-materialization-contract"
    ).status,
    "completed"
  );
});

await check("normalization readiness inventories are hash-bound and data-derived", () => {
  const authority = readJson(
    "data/record-clearing/master-library/authority.json"
  );
  const input = readJson(
    "data/record-clearing/production-factory/normalization-readiness-input.json"
  );
  const audit = readJson(
    "data/record-clearing/master-library/repository-asset-audit.json"
  );
  const reviewAsset = legalReviewAssetsForTesting(audit).get("KY")[0];
  const inventory = [
    {
      sourceId: "ky-review-slot-02",
      reviewSlot: "TRACK 2",
      legalMechanismName: "Candidate non-filing mechanism",
      classification: "non_relief",
      candidateFilingActor: "none",
      candidateDestination: "not_applicable",
      referencedStatutesOrRules: ["Ky. Rev. Stat. § example-2"],
      referencedOfficialForms: [],
      unresolvedQuestions: ["Whether current agency guidance changes the route."]
    },
    {
      sourceId: "ky-review-slot-01",
      reviewSlot: "TRACK 1",
      legalMechanismName: "Candidate petition mechanism",
      classification: "relief",
      candidateFilingActor: "participant",
      candidateDestination: "court",
      referencedStatutesOrRules: ["Ky. Rev. Stat. § example-1"],
      referencedOfficialForms: ["AOC-EXAMPLE"],
      unresolvedQuestions: []
    }
  ];
  const inventoryHash = mechanismInventorySha256({
    authorityEdition: input.authorityEdition,
    jurisdiction: "KY",
    controllingReviewSha256: reviewAsset.sha256,
    mechanismInventory: inventory
  });
  assert.equal(
    mechanismInventorySha256({
      authorityEdition: input.authorityEdition,
      jurisdiction: "KY",
      controllingReviewSha256: reviewAsset.sha256,
      mechanismInventory: [...inventory].reverse()
    }),
    inventoryHash
  );
  const reorderedKeys = inventory.map((row) =>
    Object.fromEntries(Object.entries(row).reverse())
  );
  assert.equal(
    mechanismInventorySha256({ mechanismInventory: reorderedKeys }),
    inventoryHash
  );
  const reorderedScalarArrays = structuredClone(inventory);
  reorderedScalarArrays[0].referencedStatutesOrRules.reverse();
  reorderedScalarArrays[0].unresolvedQuestions.reverse();
  assert.equal(
    mechanismInventorySha256({
      mechanismInventory: reorderedScalarArrays
    }),
    inventoryHash
  );
  const volatileMetadata = structuredClone(inventory);
  volatileMetadata[0].retrievalTimestamp = "2099-01-01T00:00:00Z";
  volatileMetadata[0].materializationDestination =
    "tmp/rcap-factory/materialized-authority/volatile.md";
  assert.equal(
    mechanismInventorySha256({ mechanismInventory: volatileMetadata }),
    inventoryHash
  );
  assert.notEqual(
    mechanismInventorySha256({ mechanismInventory: [inventory[0]] }),
    inventoryHash
  );
  assert.throws(
    () =>
      mechanismInventorySha256({
        mechanismInventory: [
          {
            ...inventory[0],
            evidencePath: "/workspaces/another-codespace/review.md"
          }
        ]
      }),
    /absolute (?:filesystem )?path/
  );
  const materializationDestination =
    `tmp/rcap-factory/materialized-authority/legal-reviews/KY/` +
    path.posix.basename(reviewAsset.canonicalRelativePath);
  const bundle = {
    schemaVersion: "rcap-normalization-readiness-bundle/v1",
    authorityEdition: input.authorityEdition,
    jurisdiction: "KY",
    controllingReviewAssetPath: reviewAsset.canonicalRelativePath,
    controllingReviewSha256: reviewAsset.sha256,
    controllingReviewStatus: "checksum_verified",
    controllingReviewRevision: reviewAsset.revision,
    reviewedThrough: "2026-08-02",
    reviewDateEvidence: {
      filenameAsOf: "2026-08-02",
      internalReviewDate: "2026-08-02",
      status: "reconciled"
    },
    legalReviewPrecedence:
      "The single active original Master Library legal review controls when no addendum exists.",
    precedenceStatus: "resolved",
    reviewMaterialization: {
      archiveLocator: input.authorityArchive.portableLocator,
      archiveSha256: input.authorityArchive.sha256,
      archiveEntryPath: reviewAsset.canonicalRelativePath,
      expectedSha256: reviewAsset.sha256,
      expectedBytes: 1234,
      observedSha256: reviewAsset.sha256,
      observedBytes: 1234,
      materializationMethod: "portable_archive_entry",
      materializationDestination,
      materializationState: "binary_hash_verified",
      readOnly: true,
      readOnlyTreatment: "worker_read_only_no_modify",
      verificationCommand:
        "node scripts/verify-rcap-normalization-readiness.mjs --jurisdiction KY",
      verificationProvenance: "freshly_verified",
      researchVerificationResult: "fixture_hash_verified",
      verificationStatus: "verified",
      cleanupPolicy: "delete_after_worker_integration"
    },
    mechanismInventory: inventory,
    mechanismInventorySha256: inventoryHash,
    canonicalizationVersion: "mechanism-inventory-v1",
    researchSuppliedInventorySha256: inventoryHash,
    canonicalMechanismInventorySha256: inventoryHash,
    canonicalPayloadByteCount:
      mechanismInventoryCanonicalPayloadByteCount(inventory),
    denominatorAdjudication: {
      status: "keyed_denominator_reconciled",
      reviewSummaryCount: 2,
      keyedBodyCount: 2,
      resolution: "accepted_unique_fixture_mechanisms",
      unresolvedQuestion: null
    },
    expectedReviewSlots: ["TRACK 1", "TRACK 2"],
    expectedSourceIds: ["ky-review-slot-01", "ky-review-slot-02"],
    retainedForms: ["AOC-EXAMPLE"],
    retainedFormAvailability: "retained_form_assets_recorded",
    openQuestions: [
      "Whether current agency guidance changes the route."
    ],
    officialAuthorityRefreshStatus: "recorded",
    authorityRefreshFlags: [],
    officialAuthorityRefreshRequirements: [
      {
        officialUrl: "https://legislature.ky.gov/example",
        issuingDomain: "legislature.ky.gov",
        sectionIdentifier: "Ky. Rev. Stat. § example-1",
        retrievalMethod: "shell_download",
        retrievalDate: "2026-08-04",
        capturedSourceSha256: null,
        retrievalState: "shell_download_blocked",
        alternateOfficialRetrievalChannel:
          "Approved browser Web Search / Fetch against the same official URL"
      },
      {
        officialUrl: "https://legislature.ky.gov/example",
        issuingDomain: "legislature.ky.gov",
        sectionIdentifier: "Ky. Rev. Stat. § example-1",
        retrievalMethod: "approved_browser_web_search_fetch",
        retrievalDate: "2026-08-04",
        capturedSourceSha256:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        retrievalState: "browser_official_retrieval_available",
        alternateOfficialRetrievalChannel:
          "Same official issuing page accessed through the browser channel"
      }
    ],
    retrievalMethods: [
      {
        method: "portable_archive_entry",
        locator: input.authorityArchive.portableLocator,
        issuingDomain: "integration-provided-authority-archive",
        status: "binary_hash_verified",
        alternateOfficialRetrievalChannel: null
      },
      {
        method: "approved_browser_web_search_fetch",
        locator: "https://legislature.ky.gov/example",
        issuingDomain: "legislature.ky.gov",
        status: "captured_source_hash_verified",
        alternateOfficialRetrievalChannel:
          "Official browser retrieval used because shell download was blocked"
      }
    ]
  };

  const inspection = inspectNormalizationBundle({
    bundle,
    authorityEdition: input.authorityEdition,
    authorityArchive: input.authorityArchive,
    reviewAsset
  });
  assert.equal(inspection.ok, true, inspection.issues.join("\n"));
  const ready = deriveNormalizationReadinessRecord({
    jurisdiction: "KY",
    authorityEdition: input.authorityEdition,
    authorityArchive: input.authorityArchive,
    reviewAsset,
    bundle,
    claim: null
  });
  assert.equal(ready.readinessState, "ready_for_normalization");
  assert.deepEqual(ready.readinessBlockers, []);
  assert.equal(
    validateNormalizationReadinessRecord(ready).ok,
    true
  );
  assert.deepEqual(
    ready.mechanismInventory.map((row) => row.sourceId),
    ["ky-review-slot-01", "ky-review-slot-02"]
  );

  const withoutInventory = structuredClone(bundle);
  withoutInventory.mechanismInventory = [];
  withoutInventory.expectedReviewSlots = [];
  withoutInventory.expectedSourceIds = [];
  assert.equal(
    inspectNormalizationBundle({
      bundle: withoutInventory,
      authorityEdition: input.authorityEdition,
      authorityArchive: input.authorityArchive,
      reviewAsset
    }).ok,
    false
  );
  const inventoryBlocked = deriveNormalizationReadinessRecord({
    jurisdiction: "KY",
    authorityEdition: input.authorityEdition,
    authorityArchive: input.authorityArchive,
    reviewAsset,
    bundle: withoutInventory,
    claim: null
  });
  assert.equal(
    inventoryBlocked.readinessState,
    "mechanism_inventory_required"
  );

  const wrongHash = structuredClone(bundle);
  wrongHash.mechanismInventorySha256 =
    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  assert.ok(
    inspectNormalizationBundle({
      bundle: wrongHash,
      authorityEdition: input.authorityEdition,
      authorityArchive: input.authorityArchive,
      reviewAsset
    }).issues.some((issue) => /mechanismInventorySha256/.test(issue))
  );

  const omittedSlot = structuredClone(bundle);
  omittedSlot.expectedReviewSlots = ["TRACK 1"];
  assert.ok(
    inspectNormalizationBundle({
      bundle: omittedSlot,
      authorityEdition: input.authorityEdition,
      authorityArchive: input.authorityArchive,
      reviewAsset
    }).issues.some((issue) => /expectedReviewSlots/.test(issue))
  );

  const duplicatedSource = structuredClone(bundle);
  duplicatedSource.mechanismInventory[1].sourceId =
    duplicatedSource.mechanismInventory[0].sourceId;
  assert.ok(
    inspectNormalizationBundle({
      bundle: duplicatedSource,
      authorityEdition: input.authorityEdition,
      authorityArchive: input.authorityArchive,
      reviewAsset
    }).issues.some((issue) => /duplicate sourceId/.test(issue))
  );

  assert.match(ready.legalReviewPrecedence, /original Master Library legal review/);
  assert.equal(
    ready.officialAuthorityRefreshRequirements.some(
      (requirement) =>
        requirement.retrievalState ===
        "browser_official_retrieval_available"
    ),
    true
  );
});

await check("counsel adoption is exact, hash-bound, and separate from engineering review", async () => {
  const expected = await buildCurrentCounselAdoptionRecords({ rootDir: ROOT });
  let adoptedRoutes = 0;
  for (const relativePath of ADOPTION_RECORD_PATHS) {
    const actual = readJson(relativePath);
    assert.deepEqual(actual, expected.get(relativePath), relativePath);
    assert.equal(actual.status, "counsel_adopted");
    assert.equal(actual.blanketFutureApproval, false);
    assert.equal(actual.productionEnabled, false);
    for (const scope of actual.completedScopes) {
      adoptedRoutes += scope.approvedRouteIds.length;
      assert.equal(scope.runtime.runtimeStatus, "runtime_disabled");
      assert.equal(scope.runtime.packetReady, false);
      assert.equal(scope.runtime.productionEnabled, false);
      assert.equal(scope.fullCanonicalParentComplete, false);
      assert.equal(
        scope.hashBoundScope.schemaVersion,
        "rcap-counsel-adoption-hash-scope/v1"
      );
      assert.equal(Object.hasOwn(scope, "coverage"), false);
      assert.equal(
        scope.legalDesignSpecificationHashes.length,
        scope.approvedRouteIds.length
      );
    }
  }
  assert.equal(adoptedRoutes, 15);
  const custom = expected.get(ADOPTION_RECORD_PATHS[0]);
  assert.deepEqual(
    custom.completedScopes.find((scope) => scope.jurisdiction === "GA")
      .excludedRouteIds,
    ["ga-jail-k2"]
  );
  assert.equal(
    custom.completedScopes.find((scope) => scope.jurisdiction === "GA")
      .preservedCounselQuestions.length,
    6
  );
});

await check("overlap and owned/forbidden conflicts fail closed", () => {
  const overlapping = structuredClone(plan);
  const active = overlapping.jobs.filter((entry) =>
    ["planned", "ready", "blocked", "in_progress"].includes(entry.status)
  );
  assert.ok(active.length >= 2);
  active[1].ownedPaths[0] = active[0].ownedPaths[0];
  assert.ok(findOwnedPathOverlaps(overlapping.jobs).length > 0);
  const result = validateFactoryPlan(overlapping);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.includes("overlapping owned paths")));

  const conflicted = structuredClone(active[0]);
  conflicted.forbiddenPaths.push(conflicted.ownedPaths[0]);
  const jobResult = validateJob(conflicted);
  assert.equal(jobResult.ok, false);
  assert.ok(jobResult.issues.some((issue) => issue.includes("overlaps forbidden path")));
});

await check("worker prompt is short, stable, and contains only contract sections", () => {
  const job = plan.jobs.find((entry) => entry.status === "ready") ?? plan.jobs[0];
  const options = {
    job,
    authorityVersion: plan.authorityVersion,
    model: "codex"
  };
  const first = compileWorkerPrompt(options);
  const second = compileWorkerPrompt(options);
  assert.equal(first, second);
  assert.ok(Buffer.byteLength(first) < 12_000);

  const headings = [...first.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
  assert.deepEqual(headings, [
    "Mission",
    "Authority version",
    "Assigned job manifest",
    "Owned paths",
    "Integration-owned outputs — do not create or commit",
    "Forbidden paths",
    "Required outputs",
    "Focused acceptance command",
    "Scaffold worktree",
    "Commit subject",
    "Stop condition"
  ]);
  assert.ok(
    first.includes(`npm run rcap:factory:validate-job -- ${job.jobId}`)
  );
  assert.equal(
    (first.match(/npm run rcap:factory:validate-job/g) ?? []).length,
    1
  );
  assert.equal(first.includes("npm test"), false);
  assert.match(first, /complete linked Git worktree/);
  assert.match(first, /never delete or treat the worktree as disposable output/);

  const acquisitionJob = plan.jobs.find(
    (entry) => entry.jobId === "rcap-al-in-repo-identity-reconciliation-cr-65"
  );
  const promptAcquisitionJob = {
    ...acquisitionJob,
    status: "ready"
  };
  delete promptAcquisitionJob.completionCommit;
  const acquisitionPrompt = compileWorkerPrompt({
    job: promptAcquisitionJob,
    authorityVersion: plan.authorityVersion,
    model: promptAcquisitionJob.model
  });
  assert.match(acquisitionPrompt, /"acquisitionIds": \[/);
  assert.match(acquisitionPrompt, /"downloadedSourceCount": 0/);
  assert.match(
    acquisitionPrompt,
    /required top-level fields: acquisitionIds, downloadedSourceCount/
  );
  assert.ok(
    acquisitionJob.acquisitionIds.every((acquisitionId) =>
      acquisitionPrompt.includes(acquisitionId)
    )
  );
  const authorityFixture = {
    acquisitionIds: acquisitionJob.acquisitionIds,
    downloadedSourceCount: 0
  };
  assert.doesNotThrow(() =>
    assertAuthorityOutputContract(
      acquisitionJob,
      "authority-fixture.json",
      authorityFixture
    )
  );
  for (const missingField of ["acquisitionIds", "downloadedSourceCount"]) {
    const invalid = { ...authorityFixture };
    delete invalid[missingField];
    assert.throws(
      () =>
        assertAuthorityOutputContract(
          acquisitionJob,
          "authority-fixture.json",
          invalid
        ),
      new RegExp(`missing required top-level field ${missingField}`)
    );
  }
  assert.throws(
    () =>
      assertAuthorityOutputContract(
        acquisitionJob,
        "authority-fixture.json",
        {
          ...authorityFixture,
          acquisitionIds: [
            ...authorityFixture.acquisitionIds,
            authorityFixture.acquisitionIds[0]
          ]
        }
      ),
    /unique string acquisitionIds/
  );

  const captainJob = plan.jobs.find(
    (entry) => entry.executionScope === "captain"
  );
  assert.ok(captainJob);
  assert.throws(
    () =>
      compileWorkerPrompt({
        job: captainJob,
        authorityVersion: plan.authorityVersion,
        model: captainJob.model
      }),
    /cannot compile a worker prompt/i
  );
  assert.throws(
    () =>
      buildScaffoldPlan({
        rootDir: ROOT,
        job: captainJob,
        authorityVersion: plan.authorityVersion,
        model: captainJob.model
      }),
    /only worker-scoped jobs/i
  );
  const completedJob = plan.jobs.find((entry) => entry.status === "completed");
  assert.throws(
    () =>
      compileWorkerPrompt({
        job: completedJob,
        authorityVersion: plan.authorityVersion,
        model: completedJob.model
      }),
    /status completed.*only ready/i
  );
});

await check("scaffold is deterministic, isolated, and dry-run by default", () => {
  const job = plan.jobs.find((entry) => entry.status === "ready") ?? plan.jobs[0];
  const options = {
    rootDir: ROOT,
    job,
    authorityVersion: plan.authorityVersion,
    model: job.model
  };
  const first = buildScaffoldPlan(options);
  const second = buildScaffoldPlan(options);
  assert.deepEqual(first, second);
  assert.equal(first.safety.explicitApplyRequired, true);
  assert.equal(first.worktreeKind, "complete_git_worktree");
  assert.equal(first.worktreeDisposable, false);
  assert.equal(first.retainUntilIntegration, true);
  assert.equal(first.safety.completeGitWorktree, true);
  assert.equal(first.safety.disposableOutput, false);
  assert.equal(first.safety.staging, false);
  assert.equal(first.safety.deployment, false);
  assert.ok(first.worktreePath.startsWith("tmp/rcap-factory/worktrees/"));
  assert.ok(first.artifacts.worktreeMarker.endsWith("/tmp/rcap-factory/job.json"));
  assert.equal(first.manifestBaseCommit, job.baseCommit);
  assert.equal(first.scaffoldBaseCommit, git(["rev-parse", "HEAD"]).trim());
  assert.equal(first.command.at(-1), first.scaffoldBaseCommit);
  const help = spawnSync(
    "node",
    ["scripts/rcap-factory-scaffold.mjs", "--help"],
    { cwd: ROOT, encoding: "utf8" }
  );
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /complete linked Git worktree/);
  assert.match(help.stdout, /not the checkout or disposable output/);
});

await check("scaffold marker pins plan and job provenance", () => {
  const job = plan.jobs.find((entry) => entry.status === "ready") ?? plan.jobs[0];
  const markerPath = path.join(ROOT, "tmp/rcap-factory/job.json");
  assert.equal(fs.existsSync(markerPath), false, `${markerPath} already exists`);
  fs.mkdirSync(path.dirname(markerPath), { recursive: true });
  try {
    fs.writeFileSync(
      markerPath,
      `${JSON.stringify({
        jobId: job.jobId,
        manifestBaseCommit: EXPECTED_BASE
      })}\n`
    );
    assert.equal(
      loadFactoryPlan({ rootDir: ROOT }).baseCommit,
      EXPECTED_BASE
    );
    assert.equal(
      loadJob(job.jobId, { rootDir: ROOT }).baseCommit,
      EXPECTED_BASE
    );
    assert.throws(
      () => loadJob("rcap-wy-staging-promotion", { rootDir: ROOT }),
      /scaffold is assigned/i
    );
  } finally {
    fs.rmSync(markerPath, { force: true });
  }
});

await check("completed jobs validate against a captain-anchored immutable scaffold assignment", () => {
  const markerPath = path.join(ROOT, "tmp/rcap-factory/job.json");
  const anchorDirectory = path.join(
    ROOT,
    "tmp/rcap-factory/jobs/immutable-completion-regression"
  );
  const anchorPath = path.join(anchorDirectory, "job.json");
  assert.equal(fs.existsSync(markerPath), false, `${markerPath} already exists`);
  const assignedJob = structuredClone(
    plan.jobs.find((entry) => entry.status === "ready")
  );
  assignedJob.jobId = "rcap-final-pending-completion-regression";
  const anchorBytes = `${JSON.stringify(assignedJob, null, 2)}\n`;
  const marker = {
    jobId: assignedJob.jobId,
    manifestBaseCommit: assignedJob.baseCommit,
    assignedJob,
    assignedJobSha256: crypto
      .createHash("sha256")
      .update(stableStringify(assignedJob, 0))
      .digest("hex"),
    assignmentManifestRelativePath: path.relative(ROOT, anchorPath),
    assignmentManifestSha256: crypto
      .createHash("sha256")
      .update(anchorBytes)
      .digest("hex")
  };
  fs.mkdirSync(path.dirname(markerPath), { recursive: true });
  fs.mkdirSync(anchorDirectory, { recursive: true });
  try {
    fs.writeFileSync(anchorPath, anchorBytes);
    fs.writeFileSync(markerPath, `${JSON.stringify(marker)}\n`);
    const loaded = loadJob(assignedJob.jobId, { rootDir: ROOT });
    assert.deepEqual(loaded, assignedJob);

    const tamperedJob = {
      ...assignedJob,
      stopCondition: `${assignedJob.stopCondition} Worker-expanded scope.`
    };
    const tamperedMarker = {
      ...marker,
      assignedJob: tamperedJob,
      assignedJobSha256: crypto
        .createHash("sha256")
        .update(stableStringify(tamperedJob, 0))
        .digest("hex")
    };
    fs.writeFileSync(markerPath, `${JSON.stringify(tamperedMarker)}\n`);
    assert.throws(
      () => loadJob(assignedJob.jobId, { rootDir: ROOT }),
      /captain-owned anchor/
    );
  } finally {
    fs.rmSync(markerPath, { force: true });
    fs.rmSync(anchorDirectory, { recursive: true, force: true });
  }
});

await check("scaffold marker preserves the complete non-disposable worktree contract", () => {
  const job = plan.jobs.find((entry) => entry.status === "ready") ?? plan.jobs[0];
  const markerPath = path.join(ROOT, "tmp/rcap-factory/job.json");
  const currentHead = git(["rev-parse", "HEAD"]).trim();
  const currentBranch = git(["branch", "--show-current"]).trim();
  const marker = {
    jobId: job.jobId,
    manifestBaseCommit: job.baseCommit,
    scaffoldBaseCommit: currentHead,
    workerBaseCommit: currentHead,
    branch: currentBranch,
    worktreeKind: "complete_git_worktree",
    worktreeDisposable: false,
    retainUntilIntegration: true,
    ownedPaths: job.ownedPaths,
    forbiddenPaths: job.forbiddenPaths,
    focusedValidation: job.focusedValidation
  };
  assert.equal(fs.existsSync(markerPath), false, `${markerPath} already exists`);
  fs.mkdirSync(path.dirname(markerPath), { recursive: true });
  try {
    const validateMarker = (value) => {
      fs.writeFileSync(markerPath, `${JSON.stringify(value)}\n`);
      return validateJobWorkspace(job, {
        rootDir: ROOT,
        changedPaths: [],
        runCommands: false,
        requireExpectedOutputs: false
      });
    };
    assert.equal(validateMarker(marker).passed, true);
    for (const [field, invalid] of [
      ["worktreeKind", "marker_directory"],
      ["worktreeDisposable", true],
      ["retainUntilIntegration", false]
    ]) {
      const report = validateMarker({ ...marker, [field]: invalid });
      assert.equal(report.passed, false, field);
      assert.ok(
        report.failures.some(
          (entry) =>
            entry.code === "scaffold_contract_mismatch" &&
            entry.message.includes(field)
        ),
        field
      );
    }
  } finally {
    fs.rmSync(markerPath, { force: true });
  }
});

await check("worker scaffolds cannot generate integration-owned packet proofs", () => {
  const markerPath = path.join(ROOT, "tmp/rcap-factory/job.json");
  const job = plan.jobs.find(
    (entry) =>
      entry.status === "completed" &&
      entry.participantPacketProofRequired === true &&
      entry.lane === "guidance_implementation"
  );
  assert.ok(job);
  assert.equal(fs.existsSync(markerPath), false, `${markerPath} already exists`);
  fs.mkdirSync(path.dirname(markerPath), { recursive: true });
  try {
    fs.writeFileSync(
      markerPath,
      `${JSON.stringify({ jobId: job.jobId, worktreeKind: "complete_git_worktree" })}\n`
    );
    const result = spawnSync(
      process.execPath,
      ["scripts/rcap-factory-generate-packet-proof.mjs", job.jobId],
      { cwd: ROOT, encoding: "utf8" }
    );
    assert.notEqual(result.status, 0);
    assert.match(
      `${result.stdout}\n${result.stderr}`,
      /integration-owned; refusing generation from a worker scaffold/
    );
  } finally {
    fs.rmSync(markerPath, { force: true });
  }
});

await check("worker checkout cannot bypass the scaffold contract by deleting its marker", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-worker-marker-"));
  try {
    const run = (args) =>
      spawnSync("git", args, { cwd: tempRoot, encoding: "utf8" });
    assert.equal(run(["init"]).status, 0);
    assert.equal(run(["config", "user.email", "factory-test@example.invalid"]).status, 0);
    assert.equal(run(["config", "user.name", "Factory Test"]).status, 0);
    fs.writeFileSync(path.join(tempRoot, "seed.txt"), "seed\n");
    assert.equal(run(["add", "seed.txt"]).status, 0);
    assert.equal(run(["commit", "-m", "test: seed"]).status, 0);
    assert.equal(run(["switch", "-c", "rcap-factory/missing-marker-test"]).status, 0);
    assert.equal(isWorkerScaffoldCheckout(tempRoot), true);
    const workerJob = {
      ...(plan.jobs.find((entry) => entry.status === "ready") ?? plan.jobs[0]),
      baseCommit: run(["rev-parse", "HEAD"]).stdout.trim()
    };
    const report = validateJobWorkspace(workerJob, {
      rootDir: tempRoot,
      changedPaths: [],
      runCommands: false,
      requireExpectedOutputs: false
    });
    assert.equal(report.passed, false);
    assert.ok(
      report.failures.some((entry) => entry.code === "missing_scaffold_marker")
    );
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

await check("captain worktree permits only the exact untracked private symlink", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-private-symlink-"));
  try {
    fs.symlinkSync("unavailable-private-target", path.join(tempRoot, "private"));
    assert.deepEqual(
      filterPermittedCaptainStatus(tempRoot, [
        "?? private",
        " M package.json",
        "?? private/not-a-symlink.pdf"
      ]),
      [" M package.json", "?? private/not-a-symlink.pdf"]
    );
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

await check("path and command safeguards reject forbidden worker behavior", () => {
  const job = plan.jobs.find((entry) => entry.jurisdiction === "AK") ?? plan.jobs[0];
  const owned = validateChangedPaths(job, [job.ownedPaths[0]]);
  assert.equal(owned.ok, true);

  const otherMemo = validateChangedPaths(job, [
    "data/record-clearing/legal-design-intake/WY.memo.json"
  ]);
  assert.equal(otherMemo.ok, false);
  assert.ok(
    otherMemo.violations.some((entry) => entry.code === "other_jurisdiction_memo")
  );

  for (const changedPath of [
    "data/record-clearing/legal-design-track-registry.json",
    "data/record-clearing/master-library/edition-1-2/edition.json",
    "src/lib/rcap/jurisdictions/packet-capability.ts",
    "src/app/api/rcap/documents/mississippi/create/route.ts"
  ]) {
    assert.equal(validateChangedPaths(job, [changedPath]).ok, false, changedPath);
  }
  const reviewManifest = job.integrationOwnedOutputs[0];
  const reviewChange = validateChangedPaths(job, [reviewManifest]);
  assert.equal(reviewChange.ok, false);
  assert.ok(
    reviewChange.violations.some(
      (entry) => entry.code === "global_generated_output"
    )
  );

  assert.equal(validateWorkerCommand("git add .").ok, false);
  assert.equal(validateWorkerCommand("npm test").ok, false);
  assert.equal(
    validateWorkerCommand(
      `node scripts/rcap-factory-validate-job.mjs ${job.jobId}`
    ).ok,
    false
  );
  assert.equal(
    validateWorkerCommand(
      `node scripts/rcap-factory-plan.mjs --check-job ${job.jobId}`
    ).ok,
    true
  );

  const baselineOverride = validateJobWorkspace(
    {
      jobId: "factory-baseline-proof",
      jurisdiction: "AK",
      baseCommit: plan.baseCommit,
      ownedPaths: ["docs/record-clearing/RCAP_PRODUCTION_FACTORY.md"],
      forbiddenPaths: [],
      requiredInputs: [],
      expectedOutputs: [],
      focusedValidation: []
    },
    {
      rootDir: ROOT,
      baselineCommit: "dfbae78102e6bc9c4202b34a60a547bd7bdb0837",
      changedPaths: [],
      runCommands: false,
      requireExpectedOutputs: false
    }
  );
  assert.equal(baselineOverride.passed, false);
  assert.ok(
    baselineOverride.failures.some(
      (entry) => entry.code === "baseline_override_rejected"
    )
  );
});

await check("focused validation runs only its bounded command", () => {
  const job = {
    jobId: "factory-focused-proof",
    jurisdiction: "AK",
    baseCommit: plan.baseCommit,
    ownedPaths: ["docs/record-clearing/RCAP_PRODUCTION_FACTORY.md"],
    forbiddenPaths: [],
    requiredInputs: ["docs/record-clearing/RCAP_PRODUCTION_FACTORY.md"],
    expectedOutputs: ["docs/record-clearing/RCAP_PRODUCTION_FACTORY.md"],
    focusedValidation: [
      "node -e \"if (process.env.RCAP_FACTORY_VALIDATION_SCOPE !== 'focused') process.exit(7)\""
    ]
  };
  const report = validateJobWorkspace(job, {
    rootDir: ROOT,
    changedPaths: ["docs/record-clearing/RCAP_PRODUCTION_FACTORY.md"],
    runCommands: true
  });
  assert.equal(report.passed, true, JSON.stringify(report.failures));
  assert.equal(report.scope, "focused");
  assert.equal(report.commandResults.length, 1);
  assert.equal(report.commandResults[0].passed, true);
});

await check("PDF inspection is deterministic and ownership remains proposed", async () => {
  const bytes = await createInspectionFixture();
  const source = {
    kind: "fixture",
    value: "synthetic-inspection.pdf",
    fileName: "synthetic-inspection.pdf"
  };
  const first = await inspectPdfBytes(bytes, { source });
  const second = await inspectPdfBytes(bytes, { source });
  assert.deepEqual(first, second);
  assert.equal(first.structureClass, "clean_acroform");
  assert.equal(first.pageCount, 1);
  assert.ok(first.acroFormFieldCount >= 4);
  assert.ok(first.pageCoordinates.length >= 4);
  assert.ok(first.widgetTypes.includes("checkbox"));
  assert.ok(first.widgetTypes.includes("radio"));
  assert.ok(first.multilineFields.includes("Petitioner.Statement"));
  assert.ok(first.probableParticipantFields.length >= 2);
  assert.ok(first.probableThirdPartyFields.length >= 1);
  assert.ok(first.signatureBlocks.some((entry) => entry.fieldName === "Judge.Signature"));
  assert.equal(first.ownershipProposal.approved, false);
  assert.equal(first.ownershipProposal.requiresHumanApproval, true);
  assert.match(first.sha256, /^[0-9a-f]{64}$/);
});

await check("review PDFs, page images, hashes, and checklists reproduce", async () => {
  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "rcap-factory-review-test-")
  );
  try {
    const expectedOutput = "expected/sample-output.ts";
    fs.mkdirSync(path.join(temporaryRoot, "expected"), { recursive: true });
    fs.writeFileSync(
      path.join(temporaryRoot, expectedOutput),
      "export const reviewFixture = true;\n"
    );
    const job = {
      jobId: "factory-review-proof",
      lane: "custom_pleading",
      jurisdiction: "AK",
      trackIds: ["ak-fixture-one", "ak-fixture-two"],
      strategyFamily: "custom_pleading",
      baseCommit: plan.baseCommit,
      ownedPaths: [expectedOutput],
      integrationOwnedOutputs: [
        "data/record-clearing/production-factory/review-manifests/factory-review-proof.json"
      ],
      expectedOutputs: [expectedOutput]
    };
    const options = {
      rootDir: temporaryRoot,
      authorityVersion: plan.authorityVersion,
      authorityEdition: plan.authorityEdition,
      validationReport: {
        passed: true,
        commandResults: [],
        failures: []
      },
      performValidation: false,
      write: true
    };
    const first = await generateJobReviewArtifacts(job, options);
    const firstManifestBytes = fs.readFileSync(
      path.join(temporaryRoot, first.manifestPath)
    );
    const second = await generateJobReviewArtifacts(job, options);
    const secondManifestBytes = fs.readFileSync(
      path.join(temporaryRoot, second.manifestPath)
    );
    const requiredProofResult = await generateJobReviewArtifacts(
      {
        ...job,
        participantPacketProofRequired: true
      },
      {
        ...options,
        write: false
      }
    );

    assert.deepEqual(first.manifest, second.manifest);
    assert.deepEqual(firstManifestBytes, secondManifestBytes);
    assert.equal(first.manifest.packet.pageCount, 2);
    assert.equal(first.renderedPages.length, 2);
    assert.equal(first.manifest.technicalProofPassed, true);
    assert.equal(first.manifest.visualProofPassed, false);
    assert.equal(first.manifest.counselAdopted, false);
    assert.equal(first.manifest.runtimeStatus, "runtime_disabled");
    assert.equal(first.manifest.productionEnabled, false);
    assert.equal(
      first.manifest.participantPacketProof.status,
      "not_applicable"
    );
    assert.match(first.manifest.packet.sha256, /^[0-9a-f]{64}$/);
    assert.equal(
      first.manifest.technicalChecklist.items.find(
        (item) => item.id === "participant-packet-proof"
      ).status,
      "not_applicable"
    );
    assert.equal(requiredProofResult.manifest.technicalProofPassed, false);
    assert.equal(
      requiredProofResult.manifest.participantPacketProof,
      null
    );
    assert.equal(
      requiredProofResult.manifest.technicalChecklist.items.find(
        (item) => item.id === "participant-packet-proof"
      ).status,
      "failed"
    );

    const pdfPath = path.join(
      temporaryRoot,
      first.artifactDirectory,
      "synthetic-review.pdf"
    );
    assert.equal(fs.readFileSync(pdfPath, { encoding: null }).subarray(0, 5).toString(), "%PDF-");
    for (const page of first.renderedPages) {
      const signature = fs
        .readFileSync(path.join(temporaryRoot, page.relativePath))
        .subarray(0, 8);
      assert.deepEqual(
        signature,
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      );
    }
    const verified = verifyTrackedReviewManifest(
      temporaryRoot,
      job,
      first.manifestPath
    );
    assert.equal(verified.passed, true, verified.failures.join("\n"));
    assert.equal(
      spawnSync(
        "git",
        [
          "check-ignore",
          "--quiet",
          "--no-index",
          "artifacts/rcap-factory/reviews/factory-review-proof/synthetic-review.pdf"
        ],
        { cwd: ROOT }
      ).status,
      0
    );
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

await check("implementation-tranche packet proof formats reconcile", async () => {
  for (const jobId of [
    "rcap-il-custom-pleading",
    "rcap-md-second-chance-shielding-completed"
  ]) {
    const job = plan.jobs.find((entry) => entry.jobId === jobId);
    const result = await generateJobReviewArtifacts(job, {
      rootDir: ROOT,
      authorityVersion: plan.authorityVersion,
      authorityEdition: plan.authorityEdition,
      validationReport: {
        passed: true,
        commandResults: [],
        failures: []
      },
      performValidation: false,
      write: false
    });
    assert.equal(
      result.manifest.participantPacketProof.sourceType,
      "implementation_tranche_review_manifest",
      jobId
    );
    assert.equal(result.manifest.participantPacketProof.verified, true, jobId);
    assert.equal(result.manifest.technicalProofPassed, true, jobId);
    assert.equal(result.manifest.runtimeStatus, "runtime_disabled", jobId);
    assert.equal(result.manifest.productionEnabled, false, jobId);
  }
});

await check("completed guidance packet proofs are exact and review-consumable", async () => {
  const completedGuidance = plan.jobs.filter(
    (entry) =>
      entry.status === "completed" &&
      entry.lane === "guidance_implementation" &&
      entry.participantPacketProofRequired === true
  );
  assert.equal(completedGuidance.length, 7);
  for (const job of completedGuidance) {
    const proofPath =
      `data/record-clearing/production-factory/packet-proofs/${job.jobId}.json`;
    assert.ok(job.integrationOwnedOutputs.includes(proofPath), job.jobId);
    const proof = readJson(proofPath);
    assert.equal(
      proof.schemaVersion,
      "rcap-participant-packet-proof/v1",
      job.jobId
    );
    assert.equal(proof.jobId, job.jobId);
    assert.equal(proof.parentJobId, job.parentJobId);
    assert.equal(proof.jurisdiction, job.jurisdiction);
    assert.equal(proof.completionCommit, job.completionCommit);
    assert.equal(proof.authorityEdition, plan.authorityEdition);
    assert.equal(proof.finalPdfCount, job.trackIds.length);
    assert.equal(proof.samplePackets.length, job.trackIds.length);
    assert.deepEqual(
      proof.samplePackets.map((packet) => packet.trackId).sort(),
      [...job.trackIds].sort(),
      job.jobId
    );
    assert.equal(
      new Set(proof.samplePackets.map((packet) => packet.trackId)).size,
      job.trackIds.length,
      job.jobId
    );
    assert.equal(
      proof.samplePackets.reduce(
        (total, packet) => total + packet.assembledPageCount,
        0
      ),
      proof.assembledPageCount,
      job.jobId
    );
    assert.ok(
      proof.samplePackets.every(
        (packet) =>
          typeof packet.assembledFileName === "string" &&
          /^[0-9a-f]{64}$/.test(packet.assembledSha256) &&
          Number.isInteger(packet.assembledPageCount) &&
          packet.assembledPageCount > 0
      ),
      job.jobId
    );
    assert.equal(proof.verifier.path, job.regressionVerifier);
    assert.equal(proof.verifier.result, "passed");
    assert.equal(
      proof.verifier.sha256,
      sha256File(path.join(ROOT, job.regressionVerifier)),
      job.jobId
    );
    assert.deepEqual(
      proof.implementationOutputs.map((output) => output.path).sort(),
      [...job.expectedOutputs].sort(),
      job.jobId
    );
    for (const output of proof.implementationOutputs) {
      assert.equal(
        output.sha256,
        sha256File(path.join(ROOT, output.path)),
        `${job.jobId}:${output.path}`
      );
    }
    assert.equal(proof.deterministic, true);
    assert.equal(proof.generatedPacketBytesTracked, false);
    assert.equal(proof.runtimeStatus, "runtime_disabled");
    assert.equal(proof.visualProof, "pending");
    assert.equal(proof.counselAdopted, false);
    assert.equal(proof.productionEnabled, false);
  }

  const sampleJob = completedGuidance[0];
  const review = await generateJobReviewArtifacts(sampleJob, {
    rootDir: ROOT,
    authorityVersion: plan.authorityVersion,
    authorityEdition: plan.authorityEdition,
    validationReport: {
      passed: true,
      commandResults: [],
      failures: []
    },
    performValidation: false,
    write: false
  });
  assert.equal(
    review.manifest.participantPacketProof.sourceType,
    "integration_owned_factory_packet_proof"
  );
  assert.equal(review.manifest.participantPacketProof.verified, true);
  assert.equal(review.manifest.technicalProofPassed, true);
  assert.equal(review.manifest.runtimeStatus, "runtime_disabled");
  assert.equal(review.manifest.visualProofPassed, false);
  assert.equal(review.manifest.counselAdopted, false);
  assert.equal(review.manifest.productionEnabled, false);
});

await check("dashboard reports all 51 and preserves the red launch posture", () => {
  const status = buildFactoryStatus({ rootDir: ROOT });
  assert.deepEqual(status.readinessMetrics, {
    authorityCleared: 87,
    authorityBlocked: 173,
    sourcePinned: 48,
    implementationProof: 17,
    finalDisposition: 0
  });
  assert.equal(status.totals.jurisdictions, 51);
  assert.equal(status.totals.tracks, 260);
  assert.equal(status.totals.normalized, 260);
  assert.equal(status.totals.implementationComplete, 19);
  assert.equal(status.totals.technicalProofPassed, 19);
  assert.equal(status.totals.visualProofPassed, 17);
  assert.equal(status.totals.legalRecommendationComplete, 19);
  assert.equal(status.totals.counselAdopted, 15);
  assert.equal(status.totals.stagingPassed, 0);
  assert.equal(status.totals.packetReady, 0);
  assert.equal(status.totals.enabledJurisdictions, 0);
  assert.equal(status.totals.productionEnabled, 0);
  assert.equal(status.totals.launchGate, "red");
  assert.equal(status.tracks.filter((track) => track.normalized).length, 260);
  assert.equal(
    status.tracks.filter((track) => track.productionEnabled).length,
    0
  );
  assert.ok(status.jurisdictions.every((entry) => entry.exactBlocker));
  assert.match(status.definitionOfComplete, /every track.*terminal disposition/i);
});

await check("wave integration dry run is stable and captain-only", async () => {
  const wave = plan.waves.find((entry) => entry.jobIds.length > 0);
  const statusBefore = git(["status", "--porcelain=v1"]);
  const first = buildWaveIntegrationPlan(plan, wave.waveId, {
    rootDir: ROOT
  });
  const second = buildWaveIntegrationPlan(plan, wave.waveId, {
    rootDir: ROOT
  });
  assert.deepEqual(first, second);
  assert.ok(first.captainRegeneration.length > 0);
  assert.ok(first.integrationValidation.includes("npm test"));
  assert.equal(first.captainRegeneration.includes("npm test"), false);
  assert.equal(first.safety.fullSuiteScope, "wave_integration_only");
  assert.equal(first.safety.integrationOwnedReviewManifestRequired, true);
  const activeWave = plan.waves.find((entry) =>
    entry.jobIds.some(
      (jobId) => plan.jobs.find((job) => job.jobId === jobId)?.status === "ready"
    )
  );
  const activeWavePlan = buildWaveIntegrationPlan(plan, activeWave.waveId, {
    rootDir: ROOT
  });
  assert.equal(
    activeWavePlan.readinessBlockers.some((entry) =>
      /review manifest.*worker commit/i.test(entry)
    ),
    false
  );

  const result = await integrateWave(plan, wave.waveId, {
    rootDir: ROOT,
    execute: false
  });
  assert.equal(result.dryRun, true);
  assert.equal(result.executed, false);
  assert.equal(result.passed, true);
  assert.deepEqual(result.commandResults, []);
  assert.deepEqual(result.integratedJobs, []);
  assert.equal(git(["status", "--porcelain=v1"]), statusBefore);

  const completedMarylandJobId = "rcap-md-second-chance-shielding-completed";
  const marylandWave = plan.waves.find((entry) =>
    entry.jobIds.includes(completedMarylandJobId)
  );
  const marylandIntegrationPlan = buildWaveIntegrationPlan(
    plan,
    marylandWave.waveId,
    { rootDir: ROOT }
  );
  assert.ok(marylandIntegrationPlan.completedJobs.includes(completedMarylandJobId));
  assert.equal(
    marylandIntegrationPlan.jobs.some(
      (entry) => entry.jobId === completedMarylandJobId
    ),
    false
  );
});

await check("immutable authority and runtime paths are byte-unchanged", () => {
  const protectedPaths = [
    "data/record-clearing/master-library",
    "data/record-clearing/relief-track-registry.json",
    "data/record-clearing/source-artifact-registry.json",
    "src/app/api/rcap",
    "src/lib/rcap/packets/registry.ts",
    "src/lib/rcap/state-promotion-manifest.ts"
  ];
  const result = spawnSync(
    "git",
    ["diff", "--quiet", AUTHORIZED_INTEGRATED_CONTENT_BASE, "--", ...protectedPaths],
    { cwd: ROOT, encoding: "utf8" }
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

if (failures.length > 0) {
  console.error("RCAP production factory tests failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("RCAP production factory tests passed.");
for (const result of results) console.log(`  PASS ${result}`);

async function check(name, callback) {
  try {
    await callback();
    results.push(name);
  } catch (error) {
    failures.push(`${name}: ${error.stack ?? error.message ?? error}`);
  }
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
}

function sha256File(absolutePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(absolutePath))
    .digest("hex");
}

function git(args) {
  const result = spawnSync("git", args, {
    cwd: ROOT,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `git ${args.join(" ")} failed`);
  }
  return result.stdout;
}

async function createInspectionFixture() {
  const document = await PDFDocument.create();
  document.setTitle("RCAP deterministic inspection fixture");
  document.setAuthor("LegalEase");
  document.setCreator("RCAP production factory test");
  document.setProducer("RCAP production factory test");
  document.setCreationDate(new Date("2000-01-01T00:00:00.000Z"));
  document.setModificationDate(new Date("2000-01-01T00:00:00.000Z"));

  const page = document.addPage([612, 792]);
  const font = await document.embedFont(StandardFonts.Helvetica);
  page.drawText("RCAP PDF inspection fixture", {
    x: 48,
    y: 744,
    size: 14,
    font,
    color: rgb(0, 0, 0)
  });

  const form = document.getForm();
  const participantName = form.createTextField("Petitioner.FullName");
  participantName.addToPage(page, {
    x: 48,
    y: 690,
    width: 240,
    height: 24
  });

  const statement = form.createTextField("Petitioner.Statement");
  statement.enableMultiline();
  statement.addToPage(page, {
    x: 48,
    y: 590,
    width: 300,
    height: 80
  });

  const consent = form.createCheckBox("Applicant.Consent");
  consent.addToPage(page, {
    x: 48,
    y: 548,
    width: 18,
    height: 18
  });

  const decision = form.createRadioGroup("Judge.Decision");
  decision.addOptionToPage("Granted", page, {
    x: 48,
    y: 506,
    width: 18,
    height: 18
  });
  decision.addOptionToPage("Denied", page, {
    x: 98,
    y: 506,
    width: 18,
    height: 18
  });

  const signature = form.createTextField("Judge.Signature");
  signature.addToPage(page, {
    x: 48,
    y: 450,
    width: 240,
    height: 24
  });

  form.updateFieldAppearances(font);
  return Buffer.from(
    await document.save({
      addDefaultPage: false,
      objectsPerTick: 50,
      updateFieldAppearances: false,
      useObjectStreams: false
    })
  );
}
