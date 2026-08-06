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
  compileWorkerPrompt,
  stableStringify as promptStableStringify
} from "./lib/rcap-factory/prompt.mjs";
import {
  canonicalSha256,
  canonicalStringify
} from "./lib/rcap-factory/canonical-json.mjs";
import {
  assignmentFingerprint,
  buildScaffoldPlan,
  buildWorktreeJobMarker,
  scaffoldKeyFor
} from "./lib/rcap-factory/scaffold.mjs";

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
import {
  inspectPdfBytes
} from "./lib/rcap-factory/pdf-inspection.mjs";
import {
  generateJobReviewArtifacts,
  verifyTrackedReviewManifest
} from "./lib/rcap-factory/review-artifacts.mjs";
import {
  officialPdfProofPathFor,
  verifyOfficialPdfImplementationProof
} from "./lib/rcap-factory/official-pdf-proof.mjs";
import {
  isWorkerScaffoldCheckout,
  validateWorkerCompletionCommit,
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
import {
  validateLegalReviewMaterializationContract,
  validateOfficialPdfSourceProjection
} from "./lib/rcap-factory/materialization-planning.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const EXPECTED_BASE = "8df94fbaa66c06bf0ba677ee4f5fb417ad08cdc8";
const AUTHORIZED_INTEGRATED_CONTENT_BASE =
  "2b82ffeeb3c22c8e1e9afa3258b624b3fd142920";
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
  assert.ok(
    schema.properties.strategyFamily.enum.includes(
      "normalization_readiness"
    )
  );
  assert.ok(
    schema.properties.strategyFamily.enum.includes(
      "legal_review_materialization"
    )
  );
  assert.equal(
    schema.properties.legalReviewMaterializationAssignment
      .additionalProperties,
    false
  );
  assert.equal(
    schema.properties.officialPdfAssignment.additionalProperties,
    false
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

await check("portable materialization contracts fail closed on identity or path drift", () => {
  const reviewContract = readJson(
    "data/record-clearing/production-factory/legal-review-materialization-contract.json"
  );
  assert.deepEqual(
    validateLegalReviewMaterializationContract(reviewContract),
    []
  );
  const escapingReview = structuredClone(reviewContract);
  escapingReview.assignments[0].activeReview.portableSourceLocator =
    "file:///workspaces/private/review.md";
  assert.ok(
    validateLegalReviewMaterializationContract(escapingReview).some(
      (issue) => /locators are not portable/u.test(issue)
    )
  );
  const addedAddendum = structuredClone(reviewContract);
  addedAddendum.assignments[0].expectedAddendumCount = 1;
  assert.ok(
    validateLegalReviewMaterializationContract(addedAddendum).some(
      (issue) => /cardinality/u.test(issue)
    )
  );
  const wrongJurisdiction = structuredClone(reviewContract);
  wrongJurisdiction.assignments[0].activeReview.archiveRelativePath =
    wrongJurisdiction.assignments[0].activeReview.archiveRelativePath.replace(
      "STATES/KY/",
      "STATES/NC/"
    );
  assert.ok(
    validateLegalReviewMaterializationContract(wrongJurisdiction).some(
      (issue) => /does not match the jurisdiction/u.test(issue)
    )
  );

  const projection = readJson(
    "data/record-clearing/production-factory/official-pdf-source-assignment-projection.json"
  );
  assert.deepEqual(validateOfficialPdfSourceProjection(projection), []);
  const unresolved = projection.identities.find(
    (identity) => identity.disposition === "unresolved_identity"
  );
  const promotedUnresolved = structuredClone(projection);
  promotedUnresolved.identities.find(
    (identity) => identity.identityKey === unresolved.identityKey
  ).assignmentEligible = true;
  assert.ok(
    validateOfficialPdfSourceProjection(promotedUnresolved).some(
      (issue) => /eligibility and disposition disagree/u.test(issue)
    )
  );
  const assignable = projection.identities.find(
    (identity) => identity.assignmentEligible
  );
  const absoluteSource = structuredClone(projection);
  absoluteSource.identities.find(
    (identity) => identity.identityKey === assignable.identityKey
  ).exactSourceContract.portableSourceLocator =
    "file:///home/user/source.pdf";
  assert.ok(
    validateOfficialPdfSourceProjection(absoluteSource).some(
      (issue) => /source MIME or locator contract is invalid/u.test(issue)
    )
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
  const recordedFactoryCounts = readJson(
    "planning/record-clearing-100-percent/production-plan.json"
  ).factoryQueueReconciliation;
  assert.equal(first.jobs.length, recordedFactoryCounts.jobs);
  assert.equal(
    first.jobs.filter((job) => job.status === "ready").length,
    recordedFactoryCounts.ready
  );
  assert.equal(
    first.jobs.filter((job) => job.status === "blocked").length,
    recordedFactoryCounts.blocked
  );
  assert.equal(
    first.jobs.filter((job) => job.status === "in_progress").length,
    recordedFactoryCounts.inProgress
  );
  assert.equal(
    first.jobs.filter((job) => job.status === "completed").length,
    recordedFactoryCounts.completed
  );
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
  assert.equal(
    first.parentJobReconciliation.compiledChildJobs,
    recordedFactoryCounts.jobs
  );
  assert.equal(
    first.parentJobReconciliation.childrenMappedExactlyOnce,
    recordedFactoryCounts.jobs
  );
  assert.equal(first.parentJobReconciliation.unmappedChildren, 0);
  assert.equal(first.parentJobReconciliation.unknownParentReferences, 0);
  plan = first;
});

await check("factory assignment canonicalization is locale-independent and round-trips", () => {
  const localeSensitive = {
    ä: "umlaut",
    a: "lower",
    Z: "upper-z",
    A: "upper-a",
    omitted: undefined,
    sequence: ["z", "A", undefined, null, 3, false]
  };
  assert.equal(
    canonicalStringify(localeSensitive, 0),
    '{"A":"upper-a","Z":"upper-z","a":"lower","sequence":["z","A",null,null,3,false],"ä":"umlaut"}'
  );
  assert.equal(
    promptStableStringify(localeSensitive, 0),
    stableStringify(localeSensitive, 0)
  );

  const assigned = plan.jobs.find(
    (job) =>
      job.status === "ready" &&
      (job.officialPdfAssignment?.identityKeys?.length ?? 0) === 0
  );
  const scaffold = buildScaffoldPlan({
    rootDir: ROOT,
    job: assigned,
    authorityVersion: plan.authorityVersion,
    model: assigned.model
  });
  const marker = buildWorktreeJobMarker({
    plan: scaffold,
    job: assigned,
    actualStartCommit: scaffold.scaffoldBaseCommit
  });
  assert.equal(marker.assignedJobSha256, canonicalSha256(marker.assignedJob));

  const markerPath = path.join(ROOT, "tmp/rcap-factory/job.json");
  const roundTripMarker = structuredClone(marker);
  delete roundTripMarker.assignmentManifestRelativePath;
  delete roundTripMarker.assignmentManifestSha256;
  assert.equal(fs.existsSync(markerPath), false, `${markerPath} already exists`);
  fs.mkdirSync(path.dirname(markerPath), { recursive: true });
  try {
    fs.writeFileSync(markerPath, `${JSON.stringify(roundTripMarker)}\n`);
    assert.deepEqual(
      loadJob(assigned.jobId, { rootDir: ROOT }),
      marker.assignedJob
    );

    const changed = structuredClone(roundTripMarker);
    changed.assignedJob.stopCondition += " Changed assignment content.";
    assert.notEqual(
      canonicalSha256(changed.assignedJob),
      roundTripMarker.assignedJobSha256
    );
    fs.writeFileSync(markerPath, `${JSON.stringify(changed)}\n`);
    assert.throws(
      () => loadJob(assigned.jobId, { rootDir: ROOT }),
      /assignedJobSha256 does not match/
    );
  } finally {
    fs.rmSync(markerPath, { force: true });
  }
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
    ["rcap-la-guidance-implementation", ["df4a5976692134bde5d6033a4ee988f3c83bd432", 3]],
    ["rcap-co-guidance-implementation", ["7be280c8be25bc19e497d668d48abaadfd89ca44", 2]],
    ["rcap-de-guidance-implementation", ["c7af8cf48d42c69590a966141f5373c4ab596675", 2]],
    ["rcap-ga-guidance-implementation", ["de0e2debc59aab9f82672876c42c9d542f3bcb18", 3]],
    ["rcap-il-guidance-implementation", ["fd8d51980cab60c67aa13de01da80035a3d7a6a0", 4]],
    ["rcap-pa-guidance-implementation", ["8b996476aa44899b07643546688c60a2cbd09771", 3]],
    ["rcap-mo-guidance-implementation", ["1b598a7df58249d8d15dd3de207fc10ea186d723", 2]],
    ["rcap-fl-guidance-implementation", ["c20febac8959dd4345e678bd36bf56b5ed128f8a", 1]],
    ["rcap-ar-guidance-implementation", ["9a1930abbc0c15bf771b6c10170db982f859759a", 1]],
    ["rcap-hi-guidance-implementation", ["04484c319cd4a77dbd348661c0e20e28db1a8bd7", 1]],
    ["rcap-in-guidance-implementation", ["b2c10962970adc43fdf2f774787cfcfc9d88c7aa", 1]],
    ["rcap-ma-guidance-implementation", ["dc8f5182a9499362e8c07ade983fb40a2bbfbb02", 1]],
    ["rcap-me-guidance-implementation", ["253ad752bf597231dd9cb797544324cd604b49ee", 1]],
    ["rcap-mt-guidance-implementation", ["96dfa91f92a967b30b2dec6d94818131f20e022b", 1]],
    ["rcap-co-in-repo-identity-reconciliation-needs-edition-reclass-not-acquisition", ["6afe0d989bb079dbd1eab377b0547b9b6908d902", null]],
    ["rcap-ak-public-official-download", ["4acded00a77584b0ea9c9f00e490e2a6a92dd033", null]],
    ["rcap-me-public-official-download", ["6912e16bc73dbb85612dc5ede86c6a472e5c1e91", null]],
    ["rcap-mi-public-official-download", ["6ad135bcd8ef53b36a8c63948056fec546ba24d0", null]],
    ["rcap-id-public-official-download", ["95c47cdbf031b71164e8f2ea4fb71299f61aad9b", null]],
    ["rcap-il-public-official-download", ["17e9cad367543a4f7b21b30d754d09e51ffbd898", null]],
    ["rcap-co-official-download-automation-blocked", ["2666e25fe748c021f5c668030fcabc7dac8b3fc4", null]],
    ["rcap-co-source-identity-resolution-jdf-417-order", ["124559c3a6c0010ed1d6883660268b0fcf4585fd", null]],
    ["rcap-ks-source-identity-resolution-criminal-cover-sheet", ["facfa75f6e25472181a4a40eac6c61c6809e720f", null]],
    ["rcap-ca-local-form-scope-correction-sdsc-crm-307", ["610f36c450173fc856fbbb188171d67e64f18845", null]],
    ["rcap-ks-commercial-license", ["b0cfdae005c897083180e2d49e48059b0f495463", null]]
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

await check("Session F terminal dispositions remain lossless and fail closed", () => {
  const coloradoCurrentness = readJson(
    "data/record-clearing/production-factory/source-acquisition/rcap-co-official-download-automation-blocked.json"
  );
  assert.equal(
    coloradoCurrentness.acquisitions[0].documentId,
    "JDF-684"
  );
  assert.equal(
    coloradoCurrentness.acquisitions[0].hashAgreementWithInventory,
    "exact_match"
  );
  assert.equal(coloradoCurrentness.trackEffect.componentCleared, false);
  assert.equal(
    coloradoCurrentness.trackEffect.runtimeEffect,
    "runtime_disabled"
  );

  const coloradoIdentity = readJson(
    "data/record-clearing/production-factory/source-acquisition/rcap-co-source-identity-resolution-jdf-417-order.json"
  );
  assert.equal(
    coloradoIdentity.identityResolution.verdict,
    "does_not_exist_as_an_issuer_form_number"
  );
  assert.equal(
    coloradoIdentity.identityResolution.classification,
    "normalization_artefact"
  );
  assert.equal(coloradoIdentity.criticalDistinction.jdf417.exists, true);
  assert.equal(
    coloradoIdentity.criticalDistinction.jdf417.assetClass,
    "packet_form"
  );
  assert.equal(
    coloradoIdentity.identifiedOrderCandidate.documentId,
    "JDF-418"
  );
  assert.equal(
    coloradoIdentity.unresolved.some(({ question }) =>
      /JDF 418 scoped specifically/.test(question)
    ),
    true
  );

  const kansasIdentity = readJson(
    "data/record-clearing/production-factory/source-acquisition/rcap-ks-source-identity-resolution-criminal-cover-sheet.json"
  );
  assert.equal(
    kansasIdentity.identityResolution.queueClaimAssessed.correctedValue,
    "document_identity_known_revision_conflicting"
  );
  assert.match(
    kansasIdentity.separateDefectRaised.assessment,
    /Rule 123\(a\)/
  );
  assert.match(
    kansasIdentity.separateDefectRaised.assessment,
    /not authority for a cover sheet/
  );

  const californiaScope = readJson(
    "data/record-clearing/production-factory/source-acquisition/rcap-ca-local-form-scope-correction-sdsc-crm-307.json"
  );
  assert.equal(californiaScope.scopeCorrection.scope, "local_court_form");
  assert.equal(
    californiaScope.scopeCorrection.isCaliforniaStatewidePrimaryFiling,
    false
  );
  assert.equal(californiaScope.runtimeEffect.stage1Available, true);
  assert.equal(californiaScope.runtimeEffect.stage2Available, false);
  assert.equal(californiaScope.runtimeEffect.trackRuntimeStatus, "runtime_disabled");

  const kansasLicense = readJson(
    "data/record-clearing/production-factory/source-acquisition/rcap-ks-commercial-license.json"
  );
  assert.equal(
    kansasLicense.terminalDisposition,
    "deliberately_excluded_commercial_license"
  );
  assert.equal(kansasLicense.dispositionIsCurrentAndTerminal, true);
  assert.equal(kansasLicense.excludedDocuments.length, 9);
  assert.equal(kansasLicense.generationAllowed, false);
  assert.equal(
    kansasLicense.runtimeEffect.kansasOfficialFormRoutesReleasable,
    false
  );
  assert.match(
    JSON.stringify(kansasLicense),
    /Relabelling the Kansas official-form routes as custom pleading/
  );

  for (const record of [
    coloradoCurrentness,
    coloradoIdentity,
    kansasIdentity,
    californiaScope,
    kansasLicense
  ]) {
    assert.equal(record.gates.packetReadyUnchanged, true);
    assert.equal(record.gates.enabledJurisdictionsUnchanged, true);
    assert.equal(record.gates.launchGateUnchanged, true);
    assert.equal(record.gates.runtimeStatusUnchanged, true);
    assert.equal(record.gates.binariesEnteringVersionControl, 0);
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
  const normalizedTrackCount = readJson(
    "data/record-clearing/legal-design-track-registry.json"
  ).trackCount;
  assert.equal(reconciliation.normalizedTracks, normalizedTrackCount);
  assert.equal(
    reconciliation.representedExactlyOnce,
    normalizedTrackCount
  );
  assert.equal(reconciliation.implementationComplete, 83);
  assert.equal(
    reconciliation.pendingProductionJob,
    normalizedTrackCount - reconciliation.implementationComplete
  );

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
  assert.equal(completed.filter((entry) => entry.jurisdiction === "AK").length, 7);
  assert.equal(completed.filter((entry) => entry.jurisdiction === "CT").length, 7);
  assert.equal(completed.filter((entry) => entry.jurisdiction === "GA").length, 13);
  assert.equal(completed.filter((entry) => entry.jurisdiction === "DC").length, 4);
  assert.equal(completed.filter((entry) => entry.jurisdiction === "IL").length, 6);
  assert.equal(completed.filter((entry) => entry.jurisdiction === "PA").length, 3);
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
          job.strategyFamily !== "legal_design_adjudication" &&
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
  assert.deepEqual(
    activeMarylandImplementation.map((job) => job.jobId),
    ["rcap-md-official-pdf-supporting-components"]
  );
  assert.deepEqual(activeMarylandImplementation[0].trackIds, [
    "md_10105_early",
    "md_10110_conviction",
    "md_cannabis_petition",
    "md_pardon_expungement"
  ]);
  assert.equal(
    activeMarylandImplementation[0].officialPdfAssignment
      .existingImplementationMaterializationOnlyIdentityKeys.length,
    2
  );
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
      (entry.officialPdfAssignment?.identityKeys?.length ?? 0) > 0
  );
  assert.ok(officialJobs.length > 0);
  // Regenerating the queue against the current integrated audit admitted eleven
  // more jurisdictions, so more jobs now carry exact identities.
  assert.equal(officialJobs.length, 26);
  assert.equal(
    officialJobs.reduce(
      (total, job) =>
        total + job.officialPdfAssignment.identityKeys.length,
      0
    ),
    71
  );
  assert.ok(
    officialJobs.every(
      (job) => job.assignmentClaim?.ownerSession === "SESSION_E"
    )
  );
  assert.equal(
    new Set(
      officialJobs.flatMap(
        (job) => job.officialPdfAssignment.identityKeys
      )
    ).size,
    71
  );
  const marylandMaterializationOnly = officialJobs
    .flatMap(
      (job) =>
        job.officialPdfAssignment
          .existingImplementationMaterializationOnlyIdentityKeys
    );
  assert.equal(marylandMaterializationOnly.length, 2);
  assert.equal(
    officialJobs.flatMap(
      (job) => job.officialPdfAssignment.newImplementationIdentityKeys
    ).length,
    69
  );
  const officialProjection = readJson(
    "data/record-clearing/production-factory/official-pdf-source-assignment-projection.json"
  );
  const projectedIdentityByKey = new Map(
    officialProjection.identities.map((identity) => [
      identity.identityKey,
      identity
    ])
  );
  const materiallyVerifiedSources = officialJobs.flatMap((job) =>
    job.sourceMaterializationInputs
      .filter(
        (source) =>
          source.materializationState ===
            "binary_materialized_hash_verified" &&
          source.workerReadiness === "worker_ready" &&
          source.provenance.freshLocalVerification === true
      )
      .map((source) => ({ job, source }))
  );
  const verifiedIdentityKeys = new Set(
    materiallyVerifiedSources.map(({ source }) => source.sourceIdentityKey)
  );
  assert.equal(
    plan.materializationPlanning.officialPdfChildren.materializedSources,
    verifiedIdentityKeys.size
  );
  assert.equal(verifiedIdentityKeys.size, materiallyVerifiedSources.length);
  const receiptDirectory =
    "data/record-clearing/production-factory/source-materialization-receipts";
  const receiptFiles = fs
    .readdirSync(path.join(ROOT, receiptDirectory), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort();
  assert.deepEqual(
    receiptFiles,
    [...verifiedIdentityKeys]
      .map((identityKey) => `${identityKey}.json`)
      .sort()
  );
  for (const { job, source } of materiallyVerifiedSources) {
    const identity = projectedIdentityByKey.get(source.sourceIdentityKey);
    assert.ok(identity, source.sourceIdentityKey);
    assert.equal(identity.assignmentEligible, true, source.sourceIdentityKey);
    assert.equal(identity.disposition, "exact_worker_assignable");
    assert.equal(identity.jurisdiction, job.jurisdiction);
    assert.equal(
      identity.officialDocument.documentId,
      source.documentId
    );
    assert.equal(
      identity.officialDocument.documentRole,
      source.documentRole
    );
    assert.equal(
      identity.exactSourceContract.archiveRelativePath,
      source.canonicalAuthorityPath
    );
    assert.equal(
      identity.exactSourceContract.expectedSha256,
      source.expectedSha256
    );
    assert.equal(
      identity.exactSourceContract.expectedBytes,
      source.expectedBytes
    );
    assert.equal(
      identity.exactSourceContract.expectedMime,
      source.expectedMediaType
    );
    assert.equal(
      identity.exactSourceContract.materializationDestination,
      source.materializationDestination
    );
    const receipt = readJson(source.receiptOutput);
    assert.equal(
      receipt.schemaVersion,
      "rcap-source-materialization-result/v1"
    );
    assert.equal(receipt.assignmentJobId, job.jobId);
    assert.equal(receipt.authorityEdition, source.authorityEdition);
    assert.equal(
      receipt.authorityArchiveSha256,
      source.authorityArchiveSha256
    );
    assert.equal(receipt.jurisdiction, source.jurisdiction);
    assert.equal(receipt.documentId, source.documentId);
    assert.equal(receipt.documentRole, source.documentRole);
    assert.equal(
      receipt.canonicalAuthorityPath,
      source.canonicalAuthorityPath
    );
    assert.equal(receipt.expectedSha256, source.expectedSha256);
    assert.equal(receipt.actualSha256, source.expectedSha256);
    assert.equal(receipt.expectedBytes, source.expectedBytes);
    assert.equal(receipt.actualBytes, source.expectedBytes);
    assert.equal(receipt.expectedMediaType, source.expectedMediaType);
    assert.equal(receipt.actualMediaType, source.expectedMediaType);
    assert.equal(receipt.portableLocator, source.portableLocator);
    assert.equal(
      receipt.materializationDestination,
      source.materializationDestination
    );
    assert.equal(receipt.actualMode, 0o444);
    assert.equal(receipt.hashAndMediaVerified, true);
    assert.equal(receipt.workerReady, true);
    assert.equal(receipt.ready, true);
    assert.equal(receipt.provenance.freshLocalVerification, true);
    assert.equal(
      receipt.provenance.registryPresenceConfersReadiness,
      false
    );
    assert.deepEqual(receipt.usageBindings, source.usageBindings);
    assert.equal(
      receipt.receiptSha256,
      sourceReceiptSha256(receipt)
    );
  }
  const expectedReadyFamilies = new Set(
    officialJobs
      .filter((job) => job.status === "ready")
      .map((job) => job.jurisdiction)
  );
  const expectedBlockedFamilies = new Set(
    officialJobs
      .filter((job) => job.status === "blocked")
      .map((job) => job.jurisdiction)
  );
  assert.equal(
    plan.materializationPlanning.officialPdfChildren.workerReadyFamilies,
    expectedReadyFamilies.size
  );
  assert.equal(
    plan.materializationPlanning.officialPdfChildren.blockedFamilies,
    expectedBlockedFamilies.size
  );
  for (const job of officialJobs) {
    assert.ok(job.sourceMaterializationInputs.length > 0, job.jobId);
    assert.equal(
      job.officialPdfAssignment.runtimeDisabledInvariant,
      true,
      job.jobId
    );
    assert.equal(
      job.officialPdfAssignment.workerMayAcquireOrMaterializeSources,
      false,
      job.jobId
    );
    const materializationReady =
      job.sourceMaterializationInputs.length ===
        job.officialPdfAssignment.identityKeys.length &&
      job.sourceMaterializationInputs.every(
        (input) =>
          input.materializationState ===
            "binary_materialized_hash_verified" &&
          input.workerReadiness === "worker_ready" &&
          input.provenance.freshLocalVerification === true
      );
    const projectionBlockers =
      job.officialPdfAssignment.identityKeys.flatMap((identityKey) => {
        const identity = projectedIdentityByKey.get(identityKey);
        assert.ok(identity, identityKey);
        assert.equal(identity.assignmentEligible, true, identityKey);
        return identity.assignmentBlockers.filter(
          (blocker) =>
            blocker !== "exact_source_archive_not_materialized" ||
            !materializationReady
        );
      });
    const terminalBlockers =
      job.officialPdfAssignment.unresolvedOrTerminalIdentities.map(
        (identity) => identity.disposition
      );
    const dependencyBlockers = job.dependencies
      .filter(
        (dependencyId) =>
          plan.jobs.find((candidate) => candidate.jobId === dependencyId)
            ?.status !== "completed"
      )
      .map((dependencyId) => `dependency_incomplete:${dependencyId}`);
    const expectedBlockers = [
      ...new Set([
        ...projectionBlockers,
        ...terminalBlockers,
        ...dependencyBlockers
      ])
    ].sort();
    assert.deepEqual(
      job.officialPdfAssignment.assignmentBlockers,
      expectedBlockers,
      job.jobId
    );
    const expectedReady =
      materializationReady &&
      job.officialPdfAssignment.unresolvedOrTerminalIdentities.length ===
        0 &&
      expectedBlockers.length === 0;
    const completedImplementation =
      typeof job.completionCommit === "string" &&
      job.status === "completed";
    assert.equal(
      job.status,
      completedImplementation
        ? "completed"
        : expectedReady
          ? "ready"
          : "blocked",
      job.jobId
    );
    assert.equal(
      job.officialPdfAssignment.assignmentState,
      completedImplementation
        ? "exact_pinned_assignment_implemented"
        : expectedReady
          ? "exact_pinned_assignment_worker_ready"
          : materializationReady
            ? "exact_pinned_assignment_blocked_non_source_dependencies"
            : "exact_pinned_assignment_blocked_external_materialization",
      job.jobId
    );
    for (const input of job.sourceMaterializationInputs) {
      assert.equal(input.authorityAssetState, "authority_asset_known");
      if (
        input.materializationState ===
        "binary_materialized_hash_verified"
      ) {
        assert.equal(input.workerReadiness, "worker_ready");
        assert.equal(input.provenance.freshLocalVerification, true);
        assert.equal(
          input.provenance.localVerificationState,
          "fresh_local_hash_size_mime_boundary_and_receipt_verified"
        );
      } else {
        assert.equal(
          input.materializationState,
          "binary_materialization_required"
        );
        assert.equal(
          input.workerReadiness,
          "binary_materialization_required"
        );
        assert.equal(input.provenance.freshLocalVerification, false);
      }
      assert.equal(input.workerMayRead, true);
      assert.equal(input.workerMayModify, false);
      assert.ok(job.requiredInputs.includes(input.materializationDestination));
      assert.ok(job.focusedValidation.includes(input.verificationCommand));
    }
  }
  const falselyReady = structuredClone(officialJobs[0]);
  falselyReady.status = "ready";
  falselyReady.sourceMaterializationInputs[0].materializationState =
    "binary_materialization_required";
  falselyReady.sourceMaterializationInputs[0].workerReadiness =
    "binary_materialization_required";
  assert.equal(validateJob(falselyReady).ok, false);

  const reviewMaterializers = plan.jobs.filter(
    (entry) => entry.strategyFamily === "legal_review_materialization"
  );
  assert.equal(reviewMaterializers.length, 24);
  assert.ok(
    reviewMaterializers.every(
      (job) =>
        job.status === "completed" &&
        ["SESSION_B", "SESSION_D"].includes(
          job.assignmentClaim?.ownerSession
        ) &&
        job.legalReviewMaterializationAssignment
          .expectedActiveReviewCount === 1 &&
        job.legalReviewMaterializationAssignment
          .expectedAddendumCount === 0
    )
  );
  for (const normalization of plan.jobs.filter(
    (entry) =>
      /-legal-design-normalization$/.test(entry.jobId) &&
      entry.jurisdiction !== "PA"
  )) {
    assert.ok(
      normalization.dependencies.includes(
        `rcap-${normalization.jurisdiction.toLowerCase()}-legal-review-materialization`
      ),
      normalization.jobId
    );
  }
  const completedSessionDNormalizations = new Map([
    [
      "rcap-wy-legal-design-normalization",
      {
        workerCommit:
          "c27e1d9d6bc732e159b4cbe68b3f4705ede0a9a3",
        completionCommit:
          "e49729d9f34adb3762a53b971ae23ab9389bdcfd",
        memoSha256:
          "8788564390c3d4ad1c9e9fd90e3dcf6311ccba4557b481a306790214f8d3c0bf"
      }
    ],
    [
      "rcap-sd-legal-design-normalization",
      {
        workerCommit:
          "f87c45c5939803068090c3c0e6f09b5ad6164b3d",
        completionCommit:
          "307a05d8279dbe43992b70ff65c4501e319fcb99",
        memoSha256:
          "8d088d48642f09802aa1582be9924642a36026e3721b7aa2de2c33aecac31ae7"
      }
    ],
    [
      "rcap-wi-legal-design-normalization",
      {
        originalWorkerCommit:
          "2180f1f5015f324aa92168fe43f13584209efe29",
        correctionCommit:
          "a592809c0bf0fc5814aa6e2fd7c966f8b1e1a5b5",
        workerCommit:
          "a592809c0bf0fc5814aa6e2fd7c966f8b1e1a5b5",
        completionCommit:
          "589db2c8c48114934b1ae58c7c8e096906889d35",
        memoSha256:
          "028ac578608bf73db912e355a18824d2100a2e3e8052d9ef3040d437dbf08c28"
      }
    ],
    [
      "rcap-ri-legal-design-normalization",
      {
        originalWorkerCommit:
          "07c675237a275971555250e4a33c7995d7d372de",
        correctionCommit:
          "51d0ec038b9ae1193dc6860d372a8c52b22a9a0b",
        workerCommit:
          "51d0ec038b9ae1193dc6860d372a8c52b22a9a0b",
        completionCommit:
          "2f091c7e1e60b317a225e6f53f201f79019c05f0",
        memoSha256:
          "918bdea81d68d75e072b8034dc22ba2cce0d6c86451c9ebdc3607b1225cfd62f"
      }
    ]
  ]);
  for (const [jobId, expected] of completedSessionDNormalizations) {
    const normalization = plan.jobs.find(
      (entry) => entry.jobId === jobId
    );
    assert.equal(normalization.status, "completed", jobId);
    assert.equal(
      normalization.completionCommit,
      expected.completionCommit,
      jobId
    );
    assert.equal(
      normalization.normalizationReadiness.readinessState,
      "normalization_complete",
      jobId
    );
    assert.deepEqual(
      normalization.normalizationReadiness.readinessBlockers,
      [],
      jobId
    );
    assert.equal(normalization.assignmentClaim, undefined, jobId);
    assert.match(
      normalization.executionNote,
      new RegExp(expected.workerCommit),
      jobId
    );
    assert.match(
      normalization.executionNote,
      new RegExp(expected.memoSha256),
      jobId
    );
    if (expected.correctionCommit) {
      assert.match(
        normalization.executionNote,
        new RegExp(expected.originalWorkerCommit),
        jobId
      );
      assert.match(
        normalization.executionNote,
        new RegExp(expected.correctionCommit),
        jobId
      );
    }
    assert.equal(
      plan.jobClaims.claims.some(
        (claim) =>
          claim.targetType === "compiled_job" &&
          claim.jobId === jobId
      ),
      false,
      jobId
    );
  }
  assert.equal(
    plan.jobs.find(
      (entry) => entry.jobId === "rcap-wy-custom-pleading"
    ).parentJobId,
    "NEW-02-custom-pleading-families"
  );
  assert.equal(
    plan.jobs.find(
      (entry) => entry.jobId === "rcap-sd-composed-route"
    ).parentJobId,
    "NEW-05-composed-routes"
  );
  assert.equal(
    plan.jobs.find(
      (entry) => entry.jobId === "rcap-sd-guidance-implementation"
    ).parentJobId,
    "NEW-06-guidance-routes"
  );
  assert.equal(
    plan.jobs.find(
      (entry) => entry.jobId === "rcap-wi-custom-pleading"
    ).parentJobId,
    "NEW-02-custom-pleading-families"
  );
  assert.equal(
    plan.jobs.find(
      (entry) => entry.jobId === "rcap-ri-composed-route"
    ).parentJobId,
    "NEW-05-composed-routes"
  );
  assert.equal(
    plan.jobs.find(
      (entry) => entry.jobId === "rcap-ri-guidance-implementation"
    ).parentJobId,
    "NEW-06-guidance-routes"
  );

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
  const paPardonApproval = plan.jobs.find(
    (entry) =>
      entry.jobId ===
      "rcap-pa-pardon-composed-unit-approval-adjudication"
  );
  // Counsel answered this on 2026-08-06 and the decision record is committed,
  // so the adjudication is closed rather than pending.
  assert.equal(paPardonApproval.status, "completed");
  assert.equal(
    paPardonApproval.strategyFamily,
    "legal_design_adjudication"
  );
  assert.deepEqual(paPardonApproval.trackIds, [
    "pa_pardon_expungement"
  ]);
  assert.deepEqual(paPardonApproval.dependencies, [
    "rcap-pa-legal-design-normalization"
  ]);
  assert.equal(
    paPardonApproval.parentJobId,
    "NORM-03-pod-2-mid-atlantic"
  );
  assert.equal(
    paPardonApproval.participantPacketProofRequired,
    false
  );
  assert.ok(
    paPardonApproval.requiredInputs.includes(
      "data/record-clearing/legal-design-composed-unit-approvals.json"
    )
  );
  assert.match(
    paPardonApproval.stopCondition,
    /exact unit structure, unit destinations, unit availability/
  );
  assert.match(
    paPardonApproval.stopCondition,
    /Do not fabricate an approval/
  );
  const paComposedRoute = plan.jobs.find(
    (entry) => entry.jobId === "rcap-pa-composed-route"
  );
  assert.ok(
    paComposedRoute.dependencies.includes(
      paPardonApproval.jobId
    )
  );
  const gaRfoAdjudication = plan.jobs.find(
    (entry) =>
      entry.jobId ===
      "rcap-ga-rfo-post-consent-petition-adjudication"
  );
  assert.equal(gaRfoAdjudication.status, "blocked");
  assert.equal(
    gaRfoAdjudication.strategyFamily,
    "legal_design_adjudication"
  );
  assert.deepEqual(gaRfoAdjudication.trackIds, ["ga-rfo"]);
  assert.deepEqual(gaRfoAdjudication.dependencies, [
    "rcap-ga-guidance-implementation"
  ]);
  assert.equal(gaRfoAdjudication.participantPacketProofRequired, false);
  assert.ok(
    gaRfoAdjudication.requiredInputs.includes(
      "data/record-clearing/legal-design-intake/GA.memo.json"
    )
  );
  assert.match(
    gaRfoAdjudication.stopCondition,
    /After the required prosecutor consent is obtained/
  );
  assert.match(
    gaRfoAdjudication.stopCondition,
    /does not obtain or negotiate prosecutor consent/
  );
  assert.match(
    gaRfoAdjudication.stopCondition,
    /Do not invent consent, generate a post-consent petition/
  );
  const gaReview = plan.jobs.find(
    (entry) => entry.jobId === "rcap-ga-legal-output-review"
  );
  assert.ok(
    gaReview.dependencies.includes(gaRfoAdjudication.jobId)
  );
  const maOcpAdjudication = plan.jobs.find(
    (entry) =>
      entry.jobId ===
      "rcap-ma-pre-2024-autoseal-ocp-request-adjudication"
  );
  assert.equal(maOcpAdjudication.status, "blocked");
  assert.equal(
    maOcpAdjudication.strategyFamily,
    "legal_design_adjudication"
  );
  assert.deepEqual(maOcpAdjudication.trackIds, []);
  assert.deepEqual(maOcpAdjudication.dependencies, [
    "rcap-ma-guidance-implementation"
  ]);
  assert.equal(
    maOcpAdjudication.parentJobId,
    "IMP-GU-01-automatic-relief-guidance-clean-slate"
  );
  assert.equal(
    maOcpAdjudication.participantPacketProofRequired,
    false
  );
  assert.ok(
    maOcpAdjudication.requiredInputs.includes(
      "data/record-clearing/legal-design-intake/MA.memo.json"
    )
  );
  assert.match(
    maOcpAdjudication.executionNote,
    /legal-design normalization is preserved/
  );
  assert.match(
    maOcpAdjudication.stopCondition,
    /pre-March 11, 2024 record/
  );
  assert.match(
    maOcpAdjudication.stopCondition,
    /supporting action, a correction route, or a component of ma-autoseal/
  );
  assert.match(
    maOcpAdjudication.stopCondition,
    /Do not generate an OCP request, invent a normalized node or official form/
  );
  assert.ok(
    plan.jobs
      .find((entry) => entry.jobId === "rcap-ma-legal-output-review")
      .dependencies.includes(maOcpAdjudication.jobId)
  );
  const gaRfoReconciliation = plan.trackReconciliation.assignments.find(
    (entry) =>
      entry.jurisdiction === "GA" && entry.trackId === "ga-rfo"
  );
  assert.equal(
    gaRfoReconciliation.disposition,
    "implementation_complete"
  );
  assert.equal(
    gaRfoReconciliation.completionCommit,
    "de0e2debc59aab9f82672876c42c9d542f3bcb18"
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
  assert.equal(
    otherNormalizations.length,
    REMAINING_NORMALIZATION_JURISDICTIONS.length
  );
  // Integrated waves. Each of these carries an exact worker memo blob through a
  // captain-equivalent commit; the rest are still awaiting a normalization
  // worker. The ready count is derived rather than hardcoded so landing a wave
  // moves both sides of the identity together.
  const integratedNormalizations = [
    "KY",
    "NC",
    "ND",
    "NE",
    "RI",
    "SC",
    "SD",
    "TN",
    "TX",
    "UT",
    "VA",
    "VT",
    "WA",
    "WI",
    "WV",
    "WY"
  ];
  assert.deepEqual(
    otherNormalizations
      .filter((entry) => entry.status === "completed")
      .map((entry) => entry.jurisdiction)
      .sort(),
    integratedNormalizations
  );
  assert.equal(
    otherNormalizations.filter((entry) => entry.status === "ready").length,
    REMAINING_NORMALIZATION_JURISDICTIONS.length - integratedNormalizations.length
  );
  // Tennessee's codification-authority blocker is cleared by the verified
  // package receipt, so no normalization job is left blocked on state-specific
  // authority.
  assert.deepEqual(
    otherNormalizations
      .filter((entry) => entry.status === "blocked")
      .map((entry) => entry.jurisdiction),
    []
  );
  assert.deepEqual(
    otherNormalizations.map((entry) => entry.jurisdiction).sort(),
    REMAINING_NORMALIZATION_JURISDICTIONS
  );
  for (const entry of otherNormalizations) {
    const readiness = entry.normalizationReadiness;
    assert.equal(readiness.jurisdiction, entry.jurisdiction);
    const expectedState = integratedNormalizations.includes(entry.jurisdiction)
      ? "normalization_complete"
      : "ready_for_normalization";
    assert.equal(
      readiness.readinessState,
      expectedState
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
    assert.deepEqual(readiness.readinessBlockers, []);
    assert.equal(
      readiness.reviewMaterialization.materializationState,
      "binary_hash_verified"
    );
    assert.equal(
      readiness.reviewMaterialization.verificationStatus,
      "binary_hash_and_size_verified"
    );
    assert.equal(
      readiness.reviewMaterialization.expectedBytes,
      readiness.reviewMaterialization.observedBytes
    );
    const readinessValidation =
      validateNormalizationReadinessRecord(readiness);
    assert.equal(
      readinessValidation.ok,
      true,
      `${entry.jurisdiction}: ${readinessValidation.issues.join("\n")}`
    );
    assert.ok(
      entry.dependencies.includes(
        NORMALIZATION_READINESS_FOUNDATION_JOB_ID
      )
    );
    if (entry.status === "completed") {
      assert.equal(entry.assignmentClaim, undefined);
    } else {
      assert.equal(entry.assignmentClaim.status, "reserved");
      assert.doesNotThrow(() =>
        assertClaimPermitsSession(entry, entry.assignmentClaim.ownerSession)
      );
      assert.throws(
        () => assertClaimPermitsSession(entry, "SESSION_C"),
        /is reserved to/
      );
    }
  }
  for (const jurisdiction of ["UT", "VT", "WV"]) {
    const readiness = otherNormalizations.find(
      (entry) => entry.jurisdiction === jurisdiction
    ).normalizationReadiness;
    assert.equal(
      readiness.denominatorAdjudication.status,
      "keyed_denominator_reconciled"
    );
    // West Virginia has since been normalized and integrated, so its readiness
    // record now reads complete. The counsel structure it was adopted under is
    // asserted below either way — integration must not drop it.
    assert.equal(
      readiness.readinessState,
      integratedNormalizations.includes(jurisdiction)
        ? "normalization_complete"
        : "ready_for_normalization"
    );
    assert.equal(
      readiness.counselStructureAdoption.adoptionSha256,
      "2510b9a9b095f279fc8e7277f10d4c712a45175e75f48b5d30bd410e20419561"
    );
    assert.equal(
      readiness.counselStructureAdoption.manifestSha256,
      "76875b3d4f689c3303863f4e408dceab8c4fa3bee24a2c1bcdffdb399f0e8fdb"
    );
    assert.equal(
      readiness.counselStructureAdoption.normalizationExecutionAuthorized,
      false
    );
    assert.equal(readiness.counselStructureAdoption.runtimeEffect, "none");
    assert.equal(readiness.counselStructureAdoption.productionEffect, "none");
    assert.ok(readiness.counselStructureAdoption.preservedBlockers.length > 0);
    assert.equal(
      readiness.readinessBlockers.includes(
        "mechanism_count_counsel_addendum_required"
      ),
      false
    );
  }
  for (const jurisdiction of ["SC", "TN", "VT", "WY"]) {
    const readiness = otherNormalizations.find(
      (entry) => entry.jurisdiction === jurisdiction
    ).normalizationReadiness;
    assert.ok(
      readiness.authorityRefreshFlags.includes(
        "session_d_adjudication_source_identity_adopted"
      )
    );
    assert.equal(
      readiness.adjudicationEvidence.adjudicationSha256,
      "911e68f8455184a7926e7bfee5f327a3df7e60ceb115c206dcf71b0b442dc9a2"
    );
    assert.equal(
      readiness.adjudicationEvidence.manifestSha256,
      "b4e2a75b7abf49ea3e8be3d589091193cbec6474b06a5713baf3830aa4398924"
    );
    assert.equal(
      readiness.adjudicationEvidence.sourceCommit,
      "6ecee4740f7bec047c250ca5c2d6c5a941cba87a"
    );
    assert.equal(readiness.adjudicationEvidence.productionEffect, "none");
  }
  const sessionDAdjudication = readJson(
    "docs/record-clearing/normalization-readiness-research/session-d-ri-wy.adjudication.json"
  );
  const counselAdoptionPath =
    "docs/record-clearing/normalization-readiness-research/session-d-ut-vt-wv.counsel-adoption.json";
  const counselAdoptionManifestPath =
    "docs/record-clearing/normalization-readiness-research/session-d-ut-vt-wv.counsel-adoption.manifest.json";
  const counselAdoptionBytes = fs.readFileSync(
    path.join(ROOT, counselAdoptionPath)
  );
  const counselAdoption = JSON.parse(counselAdoptionBytes);
  const counselAdoptionManifest = readJson(counselAdoptionManifestPath);
  assert.equal(
    crypto.createHash("sha256").update(counselAdoptionBytes).digest("hex"),
    "2510b9a9b095f279fc8e7277f10d4c712a45175e75f48b5d30bd410e20419561"
  );
  assert.equal(
    crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(ROOT, counselAdoptionManifestPath)))
      .digest("hex"),
    "76875b3d4f689c3303863f4e408dceab8c4fa3bee24a2c1bcdffdb399f0e8fdb"
  );
  assert.equal(counselAdoptionManifest.filePath, counselAdoptionPath);
  assert.equal(
    counselAdoptionManifest.fileSha256,
    "2510b9a9b095f279fc8e7277f10d4c712a45175e75f48b5d30bd410e20419561"
  );
  assert.equal(counselAdoption.scope.normalizationStructureAuthorized, true);
  assert.equal(counselAdoption.scope.normalizationExecutionAuthorized, false);
  assert.equal(counselAdoption.scope.packetReadyAuthorized, false);
  assert.equal(counselAdoption.scope.runtimeEnablementAuthorized, false);
  assert.equal(counselAdoption.scope.deploymentAuthorized, false);
  assert.equal(sessionDAdjudication.productionEffect, "none");
  assert.equal(
    sessionDAdjudication.parentResearchCommit,
    "e341927a42ea54abb8b03e587493a5826fa3e0d3"
  );
  assert.equal(sessionDAdjudication.scOfficialSourceMap.statutes.length, 10);
  assert.equal(sessionDAdjudication.scOfficialSourceMap.forms.length, 4);
  assert.equal(
    sessionDAdjudication.scOfficialSourceMap.coverage,
    "10 of 10 statutes and 4 of 4 forms located against official state government sources."
  );
  assert.match(
    JSON.stringify(sessionDAdjudication.scOfficialSourceMap),
    /SCCA ?223A1/
  );
  assert.match(
    JSON.stringify(sessionDAdjudication.scOfficialSourceMap),
    /SCCA ?223D1/
  );
  assert.match(
    JSON.stringify(sessionDAdjudication.scOfficialSourceMap),
    /2029-03-07/
  );
  assert.match(
    JSON.stringify(sessionDAdjudication.scOfficialSourceMap),
    /completion of (?:all terms and conditions of )?sentence/i
  );
  assert.match(
    JSON.stringify(sessionDAdjudication.scOfficialSourceMap),
    /not a section 17-1-65/i
  );
  assert.match(
    JSON.stringify(sessionDAdjudication),
    /amended, not created/
  );
  assert.match(
    JSON.stringify(sessionDAdjudication.tnOfficialSourceMap),
    /court-staff/
  );
  assert.match(
    JSON.stringify(sessionDAdjudication.tnOfficialSourceMap),
    /participant-facing packet CANNOT/
  );
  const utah = otherNormalizations.find(
    (entry) => entry.jurisdiction === "UT"
  ).normalizationReadiness;
  assert.equal(utah.mechanismInventory.length, 14);
  assert.equal(
    utah.mechanismInventory.some(({ sourceId }) =>
      ["UT-COMMON", "UT-ADJ-01"].includes(sourceId)
    ),
    false
  );
  assert.match(utah.openQuestions.join("\n"), /UT-PET-10/);
  assert.deepEqual(
    {
      sourceSlots:
        counselAdoption.jurisdictions.UT.authoritativeSourceSlots,
      reliefTracks:
        counselAdoption.jurisdictions.UT
          .authoritativeSubstantiveReliefTracks,
      normalizedNodes:
        counselAdoption.jurisdictions.UT.authoritativeNormalizedNodes,
      automatic: counselAdoption.jurisdictions.UT.crosswalk.filter(
        ({ bucket }) => bucket === "automatic"
      ).length,
      ordinaryPetition:
        counselAdoption.jurisdictions.UT.crosswalk.filter(
          ({ bucket }) => bucket === "ordinary_petition"
        ).length,
      appellate: counselAdoption.jurisdictions.UT.crosswalk.filter(
        ({ bucket }) => bucket === "appellate"
      ).length,
      routingNodes: counselAdoption.jurisdictions.UT.crosswalk.filter(
        ({ disposition }) => disposition === "routing_node"
      ).length
    },
    {
      sourceSlots: 15,
      reliefTracks: 14,
      normalizedNodes: 15,
      automatic: 3,
      ordinaryPetition: 10,
      appellate: 1,
      routingNodes: 1
    }
  );
  assert.equal(
    counselAdoption.jurisdictions.UT.sharedProcedures[0].sourceId,
    "UT-COMMON"
  );
  const vermont = otherNormalizations.find(
    (entry) => entry.jurisdiction === "VT"
  ).normalizationReadiness;
  assert.equal(vermont.mechanismInventory.length, 14);
  assert.equal(
    vermont.mechanismInventory.filter(
      ({ sourceId }) => sourceId === "VT-SEAL-04"
    ).length,
    1
  );
  assert.equal(
    new Set(
      counselAdoption.jurisdictions.VT.crosswalk.map(
        ({ sourceId }) => sourceId
      )
    ).size,
    14
  );
  assert.equal(
    counselAdoption.jurisdictions.VT.crosswalk.find(
      ({ sourceId }) => sourceId === "VT-SEAL-04"
    ).standalonePaidReliefTrack,
    false
  );
  assert.ok(
    counselAdoption.jurisdictions.VT.crosswalk
      .filter(({ sourceId }) =>
        ["VT-SEAL-05", "VT-SEAL-06", "VT-SEAL-07"].includes(sourceId)
      )
      .every(
        ({ compositionMode }) => compositionMode === "alternative"
      )
  );
  assert.ok(
    vermont.officialAuthorityRefreshRequirements.every(({ officialUrl }) =>
      officialUrl.startsWith("https://legislature.vermont.gov/")
    )
  );
  const westVirginia = otherNormalizations.find(
    (entry) => entry.jurisdiction === "WV"
  ).normalizationReadiness;
  assert.deepEqual(westVirginia.reviewDateEvidence, {
    filenameAsOf: "2026-08-02",
    internalReviewDate: "2026-08-01",
    status: "reconciled"
  });
  assert.equal(westVirginia.reviewedThrough, "2026-08-01");
  assert.equal(
    westVirginia.readinessBlockers.includes(
      "reviewed_through_librarian_correction_required"
    ),
    false
  );
  assert.deepEqual(
    counselAdoption.jurisdictions.WV.sharedProcedureNodes.map(
      ({ sourceId }) => sourceId
    ).sort(),
    ["WV-COMMON-CONV", "WV-COMMON-NC"]
  );
  assert.equal(
    counselAdoption.jurisdictions.WV.crosswalk.filter(
      ({ sourceId }) => ["WV-DUI-01", "WV-DUI-02"].includes(sourceId)
    ).every(({ alreadyIncludedInSubstantiveCount }) =>
      alreadyIncludedInSubstantiveCount === true
    ),
    true
  );
  const wyoming = otherNormalizations.find(
    (entry) => entry.jurisdiction === "WY"
  ).normalizationReadiness;
  assert.ok(
    wyoming.officialAuthorityRefreshRequirements.every(({ officialUrl }) =>
      officialUrl.startsWith("https://wyoleg.gov/")
    )
  );
  assert.doesNotMatch(
    JSON.stringify(
      wyoming.officialAuthorityRefreshRequirements.map(
        ({ officialUrl }) => officialUrl
      )
    ),
    /Justia|FindLaw/i
  );
  assert.deepEqual(plan.normalizationReadiness, {
    expectedJurisdictions: 24,
    representedExactlyOnce: 24,
    bundlesReceived: 24,
    readyForNormalization: 24,
    blocked: 0,
    byReadinessState: {
      ready_for_normalization: 24
    }
  });
  const readinessFoundation = plan.jobs.find(
    (entry) => entry.jobId === NORMALIZATION_READINESS_FOUNDATION_JOB_ID
  );
  assert.equal(readinessFoundation.status, "completed");
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
      verificationStatus: "binary_hash_and_size_verified",
      cleanupPolicy:
        "captain_managed_cleanup_after_normalization_worker_integration"
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

// --- adopted source-slot denominator ------------------------------------------
//
// Utah's adoption dispositions fifteen source slots against fourteen
// substantive relief mechanisms, and separately carries UT-COMMON as shared
// procedure. Compilation used to emit only the hash-bound relief inventory, so
// the Session D worker would have received a fourteen-slot assignment against a
// fifteen-slot denominator, with UT-COMMON absent from the compiled record.
//
// The inventory itself is deliberately still fourteen: it is hash-bound to the
// controlling review and `expectedSourceIds` must keep reconciling to it
// exactly. The adopted denominator sits beside it.

await check("adopted source-slot denominators compile onto the assignment", () => {
  const readinessFor = (code) =>
    plan.jobs.find((job) => job.jobId === `rcap-${code}-legal-design-normalization`)
      ?.normalizationReadiness;

  const ut = readinessFor("ut");
  assert.ok(ut, "Utah normalization job is absent from the plan");
  const slots = ut.sourceSlotAccounting;
  assert.ok(slots, "Utah assignment carries no adopted source-slot accounting");

  // The three adopted counts, exactly.
  assert.equal(slots.expectedSourceSlots, 15);
  assert.equal(slots.substantiveReliefMechanisms, 14);
  assert.equal(slots.expectedNormalizedNodes, 15);
  assert.equal(slots.expectedSourceSlotIds.length, 15);

  // UT-ADJ-01 is present, is the routing node, and is not relief or a packet.
  const adj = [...slots.nonStandaloneSourceSlots, ...slots.sharedProcedureDispositions].find(
    (entry) => entry.sourceId === "UT-ADJ-01"
  );
  assert.ok(adj, "UT-ADJ-01 was dropped from the compiled source-slot accounting");
  assert.equal(adj.disposition, "routing_node");
  assert.equal(adj.routingNode, true);
  assert.equal(adj.standaloneReliefTrack, false);
  assert.equal(adj.reliefContribution, "none");
  assert.equal(adj.participantPacket, false);
  assert.equal(slots.substantiveReliefMechanismIds.includes("UT-ADJ-01"), false);
  assert.ok(slots.expectedSourceSlotIds.includes("UT-ADJ-01"));

  // UT-COMMON is recorded as shared procedure: not a track, not a node, not a
  // packet, and never counted as relief.
  const common = slots.sharedProcedureDispositions.find(
    (entry) => entry.sourceId === "UT-COMMON"
  );
  assert.ok(common, "UT-COMMON was omitted from the compiled source-slot accounting");
  assert.equal(common.disposition, "shared_procedure_not_track_or_node");
  assert.equal(common.standaloneReliefTrack, false);
  assert.equal(common.reliefContribution, "none");
  assert.equal(common.normalizedNode, false);
  assert.equal(common.participantPacket, false);
  assert.equal(slots.substantiveReliefMechanismIds.includes("UT-COMMON"), false);

  // The hash-bound inventory is untouched, and Utah's existing route question
  // survives the repair.
  assert.equal(ut.mechanismInventory.length, 14);
  assert.deepEqual(ut.expectedSourceIds, slots.substantiveReliefMechanismIds);
  assert.equal(slots.reliefMechanismInventoryReconciles, true);
  // Utah has since been normalized and integrated; the adopted denominator it
  // was assigned under must survive that, which is what the checks above prove.
  assert.equal(ut.readinessState, "normalization_complete");
  assert.ok(ut.openQuestions.some((question) => /^UT-PET-10:/.test(question)));

  // Vermont merges slots into existing mechanisms — the three no-conviction
  // sealing branches into one alternative composition, and the stipulation into
  // the applicable post-conviction petitions — so its standalone tally is below
  // its adopted relief count on purpose. Those slots must not be mislabelled as
  // contributing no relief, which is the mistake that would turn a merge into a
  // dropped mechanism.
  const vt = readinessFor("vt").sourceSlotAccounting;
  assert.equal(vt.expectedSourceSlots, 14);
  assert.equal(vt.substantiveReliefMechanisms, 11);
  assert.deepEqual(
    vt.nonStandaloneSourceSlots
      .filter(
        (entry) => entry.reliefContribution === "merged_into_adopted_relief_mechanism"
      )
      .map((entry) => entry.sourceId),
    ["VT-SEAL-04", "VT-SEAL-05", "VT-SEAL-06", "VT-SEAL-07"]
  );
  assert.equal(vt.nonStandaloneSourceSlots.every((entry) => entry.routingNode === false), true);

  // West Virginia's two shared-procedure entries are nodes, unlike UT-COMMON.
  const wv = readinessFor("wv").sourceSlotAccounting;
  assert.equal(wv.expectedSourceSlots, 10);
  assert.equal(wv.substantiveReliefMechanisms, 10);
  assert.equal(wv.expectedNormalizedNodes, 12);
  assert.deepEqual(
    wv.sharedProcedureDispositions.map((entry) => entry.sourceId),
    ["WV-COMMON-CONV", "WV-COMMON-NC"]
  );
  assert.ok(wv.sharedProcedureDispositions.every((entry) => entry.normalizedNode === true));
  assert.ok(wv.sharedProcedureDispositions.every((entry) => entry.participantPacket === false));
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
  const job =
    plan.jobs.find(
      (entry) =>
        entry.status === "ready" &&
        !entry.jobId.endsWith("-legal-design-normalization")
    ) ?? plan.jobs[0];
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
  const completedJob = plan.jobs.find(
    (entry) =>
      entry.status === "completed" && entry.executionScope === "worker"
  );
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

// --- worker branch identity ---------------------------------------------------
//
// The branch key used to be sha256(jobId) alone, so reissuing a job under a
// rebuilt assignment aimed the new worker at the branch the previous worker's
// commit already occupied. Kentucky, North Carolina and New Mexico all needed a
// hand-suffixed replacement branch because of it. The key now carries the
// canonical assignment fingerprint as well, which makes a changed assignment a
// different branch and leaves the superseded one in place, unrewritten.

await check("worker branch identity follows the assignment, not just the job", () => {
  const job = plan.jobs.find((entry) => entry.status === "ready") ?? plan.jobs[0];
  const options = {
    rootDir: ROOT,
    job,
    authorityVersion: plan.authorityVersion,
    model: job.model
  };

  // 1. Same job, same assignment: one stable name, however often it is compiled.
  const first = buildScaffoldPlan(options);
  const second = buildScaffoldPlan(options);
  assert.equal(first.branch, second.branch);
  assert.equal(
    first.branch,
    `rcap-factory/${scaffoldKeyFor(job.jobId, { job, model: job.model })}`
  );

  // The baseline alone must not be the key: the same assignment planned at a
  // different HEAD is still the same assignment and keeps the same branch.
  const rebased = structuredClone(job);
  rebased.baseCommit = "0".repeat(40);
  assert.equal(
    scaffoldKeyFor(rebased.jobId, { job: rebased, model: rebased.model }),
    scaffoldKeyFor(job.jobId, { job, model: job.model })
  );
  // Nor may lifecycle movement rename a branch out from under a live worker.
  const advanced = structuredClone(job);
  advanced.status = "completed";
  advanced.completionCommit = "1".repeat(40);
  assert.equal(
    scaffoldKeyFor(advanced.jobId, { job: advanced, model: advanced.model }),
    first.branch.slice("rcap-factory/".length)
  );

  // 2. Same job, changed assignment: a distinct branch.
  const reissued = structuredClone(job);
  reissued.trackIds = [...(reissued.trackIds ?? []), "reissued-track"];
  const replacement = buildScaffoldPlan({ ...options, job: reissued });
  assert.notEqual(replacement.branch, first.branch);
  assert.notEqual(
    assignmentFingerprint(reissued, reissued.model),
    assignmentFingerprint(job, job.model)
  );

  // 3. Both names remain available at once, so the superseded branch is
  //    preserved rather than force-pushed or deleted to make room.
  assert.ok(first.branch.startsWith(`rcap-factory/`));
  assert.ok(replacement.branch.startsWith(`rcap-factory/`));
  assert.equal(new Set([first.branch, replacement.branch]).size, 2);
  assert.equal(first.worktreePath === replacement.worktreePath, false);
  assert.equal(first.workspacePath === replacement.workspacePath, false);

  // 4. Broadening the assignment is still a different assignment, so it cannot
  //    reuse the narrower assignment's branch and quietly inherit its claim.
  const broadened = structuredClone(job);
  broadened.ownedPaths = [...broadened.ownedPaths, "data/record-clearing/"];
  assert.notEqual(
    scaffoldKeyFor(broadened.jobId, { job: broadened, model: broadened.model }),
    scaffoldKeyFor(job.jobId, { job, model: job.model })
  );

  // 5. The legacy job-only key is still derivable, which is how branches
  //    scaffolded before this change stay resolvable, and it is never what a
  //    new scaffold produces.
  const legacy = scaffoldKeyFor(job.jobId);
  assert.match(legacy, /^[a-z0-9-]+-[0-9a-f]{8}$/);
  assert.notEqual(`rcap-factory/${legacy}`, first.branch);
  assert.ok(first.branch.endsWith(assignmentFingerprint(job, job.model).slice(0, 8)));

  // 6. A fingerprint that is not a canonical digest is refused outright rather
  //    than silently producing a branch nobody can reproduce.
  assert.throws(
    () => scaffoldKeyFor(job.jobId, "not-a-digest"),
    /canonical assignment fingerprint/
  );
});

// --- worker commit subjects ------------------------------------------------
//
// Four Session D normalization commits reached the remote with
// `feat(legal-design): normalize Utah` where the factory pins
// `feat(record-clearing): normalize UT legal design`. A pushed worker commit is
// never amended, so each had to be integrated through a captain-equivalent
// commit. The gate below is what stops that happening again, while the ordinary
// integration path stays strict about the subject it accepts.

await check("worker commit subjects are gated before push", () => {
  const job = plan.jobs.find((entry) => entry.status === "ready") ?? plan.jobs[0];
  assert.ok(job.commitSubject, "every job must pin a commit subject");

  // The prompt renders the same field the gate and the planner compare, so the
  // three cannot drift apart.
  const prompt = compileWorkerPrompt({
    job,
    authorityVersion: plan.authorityVersion,
    model: job.model
  });
  assert.match(prompt, new RegExp(escapeRegExp(job.commitSubject)));
  assert.match(prompt, /rcap-factory-verify-worker-commit\.mjs/);
  // Rendered verbatim in its own section rather than paraphrased, so the worker
  // reads the exact string the gate requires.
  assert.match(prompt, /Use this subject verbatim/);

  // A correct subject passes the subject rule; a wrong one is rejected by it.
  const captainHead = git(["show", "-s", "--format=%s", "HEAD"]).trim();
  const matching = validateWorkerCompletionCommit(
    { ...job, commitSubject: captainHead },
    { rootDir: ROOT, commit: "HEAD" }
  );
  assert.equal(
    matching.failures.some((entry) => entry.code === "commit_subject_mismatch"),
    false,
    "an exactly matching subject must not raise a subject failure"
  );
  const mismatched = validateWorkerCompletionCommit(
    { ...job, commitSubject: "feat(legal-design): normalize Utah" },
    { rootDir: ROOT, commit: "HEAD" }
  );
  assert.equal(
    mismatched.failures.some((entry) => entry.code === "commit_subject_mismatch"),
    true,
    "a wrong subject must be rejected before push"
  );
  assert.equal(mismatched.passed, false);

  // A job with no pinned subject cannot pass by omission.
  const unpinned = validateWorkerCompletionCommit(
    { ...job, commitSubject: "" },
    { rootDir: ROOT, commit: "HEAD" }
  );
  assert.equal(
    unpinned.failures.some((entry) => entry.code === "commit_subject_unassigned"),
    true
  );

  // The report names both sides, so a captain-equivalent integration records
  // what the worker wrote and what the factory required.
  assert.equal(mismatched.requiredCommitSubject, "feat(legal-design): normalize Utah");
  assert.equal(mismatched.actualCommitSubject, captainHead);

  // The ordinary integration path is unchanged: it still compares the pushed
  // subject against the pinned one and blocks on any difference.
  const integrationSource = fs.readFileSync(
    path.join(ROOT, "scripts/lib/rcap-factory/wave-integration.mjs"),
    "utf8"
  );
  assert.match(integrationSource, /commitSubject !== job\.commitSubject/);
  assert.match(integrationSource, /commit subject mismatch/);
});

await check("official-PDF scaffold marker is exact, portable, and cannot broaden", () => {
  const assigned = structuredClone(
    plan.jobs.find(
      (entry) =>
        (entry.officialPdfAssignment?.identityKeys?.length ?? 0) > 0
    )
  );
  assigned.status = "ready";
  assigned.officialPdfAssignment.assignmentState =
    "exact_pinned_assignment_worker_ready";
  for (const input of assigned.sourceMaterializationInputs) {
    input.materializationState = "binary_materialized_hash_verified";
    input.workerReadiness = "worker_ready";
  }
  const scaffold = buildScaffoldPlan({
    rootDir: ROOT,
    job: assigned,
    authorityVersion: plan.authorityVersion,
    model: assigned.model
  });
  const marker = buildWorktreeJobMarker({
    plan: scaffold,
    job: assigned,
    actualStartCommit: scaffold.scaffoldBaseCommit
  });
  assert.equal(marker.markerPath, "tmp/rcap-factory/job.json");
  assert.equal(marker.exactAssignment.jobId, assigned.jobId);
  assert.equal(
    marker.exactAssignment.projectionPath,
    "data/record-clearing/production-factory/official-pdf-source-assignment-projection.json"
  );
  assert.deepEqual(
    marker.exactAssignment.sourceIdentities.map(
      (identity) => identity.sourceIdentityKey
    ),
    assigned.officialPdfAssignment.identityKeys
  );
  assert.equal(marker.exactAssignment.runtimeDisabledInvariant, true);
  const ignoredMarker = spawnSync(
    "git",
    ["check-ignore", "-q", "tmp/rcap-factory/job.json"],
    { cwd: ROOT, encoding: "utf8" }
  );
  assert.equal(
    ignoredMarker.status,
    0
  );
  assert.equal(
    fs.existsSync(path.join(ROOT, "tmp/rcap-factory/job.json")),
    false
  );

  const broadened = structuredClone(assigned);
  broadened.officialPdfAssignment.exactTrackIds.push(
    "invented-broadened-track"
  );
  assert.throws(
    () =>
      buildScaffoldPlan({
        rootDir: ROOT,
        job: broadened,
        authorityVersion: plan.authorityVersion,
        model: broadened.model
      }),
    /broadens the exact portable assignment/
  );

  const substituted = structuredClone(assigned);
  substituted.sourceMaterializationInputs[0].documentId =
    "CROSS-DOCUMENT-SUBSTITUTION";
  assert.throws(
    () =>
      buildScaffoldPlan({
        rootDir: ROOT,
        job: substituted,
        authorityVersion: plan.authorityVersion,
        model: substituted.model
      }),
    /broadens or substitutes/
  );

  const noExactAssignment = structuredClone(assigned);
  noExactAssignment.officialPdfAssignment.identityKeys = [];
  noExactAssignment.sourceMaterializationInputs = [];
  assert.throws(
    () =>
      buildScaffoldPlan({
        rootDir: ROOT,
        job: noExactAssignment,
        authorityVersion: plan.authorityVersion,
        model: noExactAssignment.model
      }),
    /non-empty exact assignment/
  );
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
  if (assignedJob.assignmentClaim) {
    assignedJob.assignmentClaim.jobId = assignedJob.jobId;
  }
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
  assert.equal(completedGuidance.length, 21);
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

await check("completed official-PDF proofs preserve variants and no-document outcomes", async () => {
  const expectations = new Map([
    [
      "rcap-ak-acroform-fill",
      {
        commit: "27210a0ee9f2fa01b907ba54c91ed9040dd04c2d",
        tracks: 3,
        fixtures: 3,
        pages: 6,
        noDocument: 1
      }
    ],
    [
      "rcap-ct-acroform-fill",
      {
        commit: "777ca177419b934e61c40ea7776526d1ad605bdb",
        tracks: 1,
        fixtures: 2,
        pages: 4,
        noDocument: 0
      }
    ],
    [
      "rcap-ga-flat-pdf-overlay",
      {
        commit: "f2f2c2c4de39d631bdd04e78563265519f8d21bd",
        tracks: 1,
        fixtures: 1,
        pages: 4,
        noDocument: 0
      }
    ]
  ]);
  let positiveRenderedFixtures = 0;
  let renderedPages = 0;
  let expectedNoDocumentBranches = 0;
  for (const [jobId, expected] of expectations) {
    const officialJob = plan.jobs.find((entry) => entry.jobId === jobId);
    assert.equal(officialJob.status, "completed", jobId);
    assert.equal(officialJob.completionCommit, expected.commit, jobId);
    assert.equal(officialJob.trackIds.length, expected.tracks, jobId);
    assert.equal(
      officialJob.officialPdfAssignment.assignmentState,
      "exact_pinned_assignment_implemented",
      jobId
    );
    const proofPath = officialPdfProofPathFor(jobId);
    assert.ok(
      officialJob.integrationOwnedOutputs.includes(proofPath),
      jobId
    );
    const verification = verifyOfficialPdfImplementationProof(
      ROOT,
      officialJob,
      {
        proofPath,
        authorityEdition: plan.authorityEdition
      }
    );
    assert.equal(
      verification.passed,
      true,
      verification.failures.join("\n")
    );
    const proof = verification.proof;
    assert.equal(
      proof.totals.positiveRenderedFixtures,
      expected.fixtures,
      jobId
    );
    assert.equal(proof.totals.renderedPages, expected.pages, jobId);
    assert.equal(
      proof.totals.expectedNoDocumentBranches,
      expected.noDocument,
      jobId
    );
    assert.equal(proof.formalVisualApprovalStatus, "pending", jobId);
    assert.equal(proof.completedOutputLegalReviewStatus, "pending", jobId);
    assert.equal(proof.counselAdopted, false, jobId);
    assert.equal(proof.packetReady, false, jobId);
    assert.equal(proof.runtimeStatus, "runtime_disabled", jobId);
    assert.equal(proof.productionEnabled, false, jobId);
    const review = verifyTrackedReviewManifest(ROOT, officialJob);
    assert.equal(review.passed, true, review.failures.join("\n"));
    assert.equal(
      review.manifest.participantPacketProof.sourceType,
      "integration_owned_official_pdf_implementation_proof",
      jobId
    );
    assert.equal(
      review.manifest.officialPdfImplementationProof.verified,
      true,
      jobId
    );
    assert.equal(review.manifest.visualProofPassed, false, jobId);
    positiveRenderedFixtures += expected.fixtures;
    renderedPages += expected.pages;
    expectedNoDocumentBranches += expected.noDocument;
  }
  const alaskaProof = readJson(
    officialPdfProofPathFor("rcap-ak-acroform-fill")
  );
  const noDocument = alaskaProof.fixtures.find(
    (fixture) =>
      fixture.fixtureId === "ak-courtview-already-absent"
  );
  assert.equal(noDocument.expectedOutputStatus, "no_document_required");
  assert.equal(noDocument.generatedPdf, false);
  assert.equal(noDocument.outputSha256, null);
  assert.equal(noDocument.assembledPageCount, 0);
  assert.equal(noDocument.legalOrBranchResult, "passed");

  const connecticutProof = readJson(
    officialPdfProofPathFor("rcap-ct-acroform-fill")
  );
  assert.equal(connecticutProof.assignments.trackIds.length, 1);
  assert.deepEqual(
    connecticutProof.fixtures.map((fixture) => fixture.variant).sort(),
    ["optional_contact_blank", "standard"]
  );
  assert.ok(
    connecticutProof.fixtures.every(
      (fixture) => fixture.trackId === "ct-cleanslate-petition"
    )
  );
  assert.equal(positiveRenderedFixtures, 6);
  assert.equal(renderedPages, 14);
  assert.equal(expectedNoDocumentBranches, 1);
});

await check("dashboard reports all 51 and preserves the red launch posture", () => {
  const status = buildFactoryStatus({ rootDir: ROOT });
  const trackSourceAudit = readJson(
    "data/record-clearing/master-library/track-source-audit.json"
  );
  const normalizedRegistry = readJson(
    "data/record-clearing/legal-design-track-registry.json"
  );
  assert.deepEqual(status.readinessMetrics, {
    authorityCleared: trackSourceAudit.totals.tracksCleared,
    authorityBlocked: trackSourceAudit.totals.tracksBlocked,
    sourcePinned: 67,
    implementationProof: 17,
    finalDisposition: 0
  });
  assert.equal(status.totals.jurisdictions, 51);
  assert.equal(status.totals.tracks, normalizedRegistry.trackCount);
  assert.equal(status.totals.normalized, normalizedRegistry.trackCount);
  assert.equal(status.totals.implementationComplete, 33);
  assert.equal(status.totals.technicalProofPassed, 33);
  assert.equal(status.totals.visualProofPassed, 17);
  assert.equal(status.totals.legalRecommendationComplete, 19);
  assert.equal(status.totals.counselAdopted, 15);
  assert.equal(status.totals.stagingPassed, 0);
  assert.equal(status.totals.packetReady, 0);
  assert.equal(status.totals.enabledJurisdictions, 0);
  assert.equal(status.totals.productionEnabled, 0);
  assert.equal(status.totals.launchGate, "red");
  assert.equal(
    status.tracks.filter((track) => track.normalized).length,
    normalizedRegistry.trackCount
  );
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
    "data/record-clearing/master-library/authority.json",
    "data/record-clearing/master-library/edition-1-2",
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

function sourceReceiptSha256(receipt) {
  const payload = Object.fromEntries(
    Object.entries(receipt).filter(
      ([key]) =>
        key !== "receiptSha256" &&
        key !== "materializationAction"
    )
  );
  return crypto
    .createHash("sha256")
    .update(canonicalJson(payload))
    .digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalJson(value[key])}`
      )
      .join(",")}}`;
  }
  return JSON.stringify(value);
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
