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
  SOURCE_AUTHORIZATION_VERDICTS,
  authorizationFor,
  buildSourceAuthorizationIndex,
  deriveSourceLifecycle,
  permitsGeneration
} from "./lib/rcap-factory/source-authorization.mjs";
import {
  ACQUISITION_BLOCKED_DISPOSITION,
  SUCCESS_DISPOSITIONS,
  assertAcquisitionPermitted,
  classifyAcquisitionResponse,
  detectAccessBlock
} from "./lib/rcap-factory/acquisition-response.mjs";
import {
  COMPLETION_CLASSIFICATIONS,
  candidateBranchKeys,
  readHeldAssignmentAliases,
  heldAliasFailures,
  discoverCompletions,
  factoryFetchRefspecs,
  planIntegrations
} from "./lib/rcap-factory/completion-discovery.mjs";
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
  validateFactoryJobClaims,
  validateNormalizationReadinessRecord
} from "./lib/rcap-factory/normalization-readiness.mjs";
import {
  validateLegalReviewMaterializationContract,
  validateOfficialPdfSourceProjection
} from "./lib/rcap-factory/materialization-planning.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const EXPECTED_BASE = "8df94fbaa66c06bf0ba677ee4f5fb417ad08cdc8";
// Advanced to the commit that carries the authorized Hawaii HCJDC scope
// correction. source-artifact-registry.json is again the only protected-path
// change between the previous base and this one, and it is the same false
// positive the Colorado correction addressed: a scope heuristic reading a
// mailing address as a court-specific marker, this time on a document that is
// not a court form at all. The guard still refuses any later change to a
// protected path; it does not refuse a correction an integrated authority
// decision established and a captain commit recorded.
const AUTHORIZED_INTEGRATED_CONTENT_BASE =
  "4a6c2b2f3edb02fa2acdd5dd84530a00444e4ef2";
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
  // 212 -> 223 with the eleven tracks integrated in the earlier wave: Hawaii
  // custom pleading 5, and the clean splits of Ohio 4 and Washington 2. 223 ->
  // 224 with Kentucky's clean marijuana/synthetic/salvia track, whose custom
  // unit is implemented; its AOC-334 component stays an open official-PDF
  // dependency and does not make the track packet-ready.
  assert.equal(reconciliation.implementationComplete, 224);
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
  // 5 Tranche 1 Mississippi tracks plus the 3 this wave's pleading built.
  assert.equal(completed.filter((entry) => entry.jurisdiction === "MS").length, 8);
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
  // A completed track may not be claimed by an active implementation job — with
  // one exception that is not a loophole. When a legal-design correction widens
  // an implementation lane after that lane was completed, the completed job is
  // reissued as an expansion of the same assignment: same module, same verifier,
  // same job id, one owner. Its already-built tracks stay listed because it owns
  // the file they live in, and it pins them in implementedTrackIds so the
  // reconciliation attributes them to the commit that produced them. Any active
  // job carrying a completed track *without* pinning it is still a second owner
  // for work already done, and still fails here.
  for (const track of completed) {
    const claimants = plan.jobs.filter(
      (job) =>
        ["planned", "ready", "blocked", "in_progress"].includes(job.status) &&
        implementationLanes.has(job.lane) &&
        job.strategyFamily !== "legal_design_adjudication" &&
        job.jurisdiction === track.jurisdiction &&
        job.trackIds.includes(track.trackId)
    );
    assert.equal(claimants.length <= 1, true, `${track.jurisdiction}:${track.trackId}`);
    for (const claimant of claimants) {
      assert.equal(
        (claimant.implementedTrackIds ?? []).includes(track.trackId),
        true,
        `${track.jurisdiction}:${track.trackId} claimed by ${claimant.jobId}`
      );
      assert.match(claimant.priorCompletionCommit ?? "", /^[0-9a-f]{40}$/u);
    }
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
  // 26 -> 25 and 63 -> 60 when the Indiana licence decision was applied. The
  // bare numbers are a consequence, not the invariant, so the invariant is
  // asserted directly against the live corpus: a jurisdiction whose licence
  // decision withholds generation contributes no exact worker assignment
  // anywhere in the plan. Assert the rule and the count follows; assert only
  // the count and the next withheld jurisdiction passes unnoticed.
  const authorizationIndex = buildSourceAuthorizationIndex(ROOT);
  const withheldJurisdictions = [...authorizationIndex.decisions]
    .filter(([, decision]) => !permitsGeneration(decision.verdict))
    .map(([jurisdiction]) => jurisdiction);
  assert.ok(
    withheldJurisdictions.length > 0,
    "the corpus must still contain at least one withholding licence decision"
  );
  for (const jurisdiction of withheldJurisdictions) {
    const assigned = officialJobs.filter(
      (job) => job.jurisdiction === jurisdiction
    );
    assert.equal(
      assigned.length,
      0,
      `${jurisdiction} withholds generation and must carry no exact identity assignment`
    );
    // The receipts are untouched by the withholding: possession is not
    // permission, and neither is the absence of permission a loss of evidence.
    const retained = plan.jobs.filter(
      (job) =>
        job.jurisdiction === jurisdiction &&
        job.sourceLifecycle?.binaryHashVerified === true
    );
    for (const job of retained) {
      assert.equal(job.sourceLifecycle.internalEvidenceRetained, true);
      assert.equal(job.sourceLifecycle.generationAllowed, false);
      assert.equal(job.sourceLifecycle.workerReady, false);
    }
  }
  const exactAssignments = officialJobs.reduce(
    (total, job) => total + job.officialPdfAssignment.identityKeys.length,
    0
  );
  assert.equal(officialJobs.length, 25);
  assert.equal(exactAssignments, 60);
  assert.ok(
    officialJobs.every(
      (job) => job.assignmentClaim?.ownerSession === "SESSION_E"
    )
  );
  // Unique keys track the same withholding: 63 -> 60 without Indiana's three.
  assert.equal(
    new Set(
      officialJobs.flatMap(
        (job) => job.officialPdfAssignment.identityKeys
      )
    ).size,
    60
  );
  const marylandMaterializationOnly = officialJobs
    .flatMap(
      (job) =>
        job.officialPdfAssignment
          .existingImplementationMaterializationOnlyIdentityKeys
    );
  assert.equal(marylandMaterializationOnly.length, 2);
  // 61 -> 58 for the same reason: Indiana's three are retained and verified,
  // and not assignable.
  assert.equal(
    officialJobs.flatMap(
      (job) => job.officialPdfAssignment.newImplementationIdentityKeys
    ).length,
    58
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
  // Receipts are evidence of custody, not permission to reproduce. Asserting
  // the receipt set equals the worker-ready set conflated the two, and made
  // deleting verified evidence the only way to satisfy a licence refusal.
  // The partition is stricter: every receipt accounted for, every worker-ready
  // identity backed by one, and every withheld one carrying a named blocker.
  const retention = plan.sourceEvidenceRetention;
  assert.ok(retention, "the plan carries no source-evidence retention record");
  assert.deepEqual(
    retention.records.map((entry) => `${entry.sourceIdentityKey}.json`).sort(),
    receiptFiles
  );
  assert.equal(retention.totals.receipts, receiptFiles.length);
  for (const identityKey of verifiedIdentityKeys) {
    assert.ok(
      receiptFiles.includes(`${identityKey}.json`),
      `${identityKey} is worker-ready with no receipt`
    );
  }
  for (const record of retention.records) {
    if (record.lifecycle.workerReady) continue;
    assert.equal(record.receiptVerified, true, record.sourceIdentityKey);
    assert.equal(record.lifecycle.internalEvidenceRetained, true);
    assert.equal(record.lifecycle.implementationAssignable, false);
    assert.equal(record.lifecycle.runtimeEnabled, false);
    // Withheld for one of two reasons, and they are not the same reason.
    //
    // No permission: generation stays off and a blocker names the open licence
    // question. Permission granted but something else unfinished: the licence
    // is genuinely resolved, so there is no licence blocker to name and
    // demanding one would force a doubt that does not exist. What must hold in
    // both is that nothing downstream moved — assignability and runtime are
    // already asserted off above, for either reason.
    if (record.lifecycle.workerReadAuthorized) {
      assert.equal(
        record.lifecycle.disposition,
        "materialized_evidence_permitted_pending_non_permission_gates",
        `${record.sourceIdentityKey} is permitted and not ready but does not say so`
      );
    } else {
      assert.equal(record.lifecycle.generationAllowed, false);
      assert.ok(
        typeof record.blocker === "string" && record.blocker.length > 0,
        `${record.sourceIdentityKey} withholds readiness and names no blocker`
      );
    }
  }
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
    // The job that materialized a source stays its owner. An implementation job
    // consumes the receipt without inheriting that role, so a receipt naming its
    // own recorded materialization owner is valid here too.
    assert.ok(
      receipt.assignmentJobId === job.jobId ||
        receipt.materializationOwnerJobId === receipt.assignmentJobId,
      `${receipt.assignmentJobId} owns neither ${job.jobId} nor itself`
    );
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
  // Every remaining normalization jurisdiction is now integrated.
  const integratedNormalizations = [...REMAINING_NORMALIZATION_JURISDICTIONS];
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

// --- source-materialization ownership ----------------------------------------
//
// The lane classifier wants a verified receipt before assigning a renderer
// family; a receipt names the job that owns the source; and no such job existed
// until a lane was assigned. New Jersey's CN-10557 and New York's CPL 160.59
// packet sat in that loop — exact, authority-manifested, externally verified and
// unownable. Source materialization is now its own lifecycle stage, which is
// what these cases hold in place.

await check("archive-only sources get a materialization owner before a lane", () => {
  const owners = plan.jobs.filter(
    (job) => job.strategyFamily === "authority_backed_source_materialization"
  );
  const projection = readJson(
    "data/record-clearing/production-factory/official-pdf-source-assignment-projection.json"
  );
  const receiptDir = "data/record-clearing/production-factory/source-materialization-receipts";

  // 1. A materialization owner needs no renderer family, field map,
  //    implementation job, private-corpus row or packet proof.
  for (const owner of owners) {
    assert.equal(owner.executionScope, "captain");
    assert.equal(owner.participantPacketProofRequired, false);
    assert.equal(owner.officialPdfAssignment, undefined);
    assert.equal(owner.regressionVerifier, undefined);
    assert.equal(owner.sourceMaterializationInputs.length, 1);
    // 2. It owns exactly its own receipt, and nothing else.
    assert.deepEqual(owner.ownedPaths, [
      owner.sourceMaterializationInputs[0].receiptOutput
    ]);
    assert.ok(owner.ownedPaths[0].startsWith(`${receiptDir}/`));
  }

  // 9. One identity cannot have two materialization owners.
  const ownedIdentities = owners.flatMap((owner) =>
    owner.sourceMaterializationInputs.map((input) => input.sourceIdentityKey)
  );
  assert.equal(new Set(ownedIdentities).size, ownedIdentities.length);

  // 3/4. A verified receipt's structure decides the family: New Jersey's and
  //      New York's packets are real AcroForms and reach the AcroForm lane,
  //      while Utah's flat forms reach the overlay lane on the same rule.
  const structureFor = (identityKey) =>
    readJson(`${receiptDir}/${identityKey}.json`).sourceStructure;
  const njStructure = structureFor("rcap-nj-cn-10557-814e1397cd");
  assert.equal(njStructure.structuralClass, "clean_acroform");
  assert.ok(njStructure.acroFormFieldCount > 0);
  const utStructure = structureFor("rcap-ut-1002ex-b9b0bf75a8");
  assert.equal(utStructure.structuralClass, "flat_pdf");
  assert.equal(utStructure.acroFormFieldCount, 0);
  const laneFor = (jurisdiction) =>
    plan.jobs
      .filter(
        (job) =>
          job.jurisdiction === jurisdiction &&
          ["acroform_fill", "flat_pdf_overlay"].includes(job.lane) &&
          (job.officialPdfAssignment?.identityKeys?.length ?? 0) > 0
      )
      .map((job) => job.lane);
  assert.ok(laneFor("NJ").includes("acroform_fill"));
  assert.ok(laneFor("UT").includes("flat_pdf_overlay"));

  // 5. Neither packet is claimed field-mapped or renderer-selected merely for
  //    being an AcroForm; that remains downstream implementation work.
  assert.equal(njStructure.fieldMappingEstablished, false);
  assert.equal(njStructure.rendererSelected, false);

  // 7. Private-corpus absence is not a blocker: both packets are retained only
  //    in the adopted archive and are nonetheless owned and receipted.
  const registry = readJson("data/record-clearing/source-artifact-registry.json");
  for (const documentId of ["CN-10557", "CPL-160.59-PRO-SE-PACKET"]) {
    assert.equal(
      (registry.artifacts ?? []).some((artifact) =>
        String(artifact.sourcePath ?? "").includes(documentId)
      ),
      false,
      `${documentId} is expected to have no private-corpus row`
    );
  }

  // 8. Every eligible identity is partitioned exactly once.
  const eligible = projection.identities.filter(
    (identity) => identity.assignmentEligible
  );
  const implementationOwned = new Set(
    plan.jobs.flatMap((job) => job.officialPdfAssignment?.identityKeys ?? [])
  );
  const materializationOwned = new Set(ownedIdentities);
  for (const identity of eligible) {
    const owners = [
      implementationOwned.has(identity.identityKey),
      materializationOwned.has(identity.identityKey)
    ].filter(Boolean).length;
    assert.ok(
      owners >= 1,
      `${identity.identityKey} has neither an implementation nor a materialization owner`
    );
  }

  // 10. The receipt-backed implementation jobs that predate this change still
  //     validate, including the Rhode Island receipt-first case.
  const ri = plan.jobs.find((job) => job.jobId === "rcap-ri-acroform-fill");
  assert.ok(
    ri.sourceMaterializationInputs.every(
      (input) => input.workerReadiness === "worker_ready"
    )
  );
  const ak = plan.jobs.find((job) => job.jobId === "rcap-ak-acroform-fill");
  assert.equal(ak.status, "completed");
});

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

  // 7. A coordination claim is not assignment substance, so reserving a job
  //    must not rename its branch. This is not hypothetical: North Dakota
  //    finished against ...-8e2164b3-eefc48ea, the captain added a SESSION_B
  //    claim while freezing the next wave, and the same byte-identical
  //    assignment started resolving to ...-8e2164b3-936d912d — a valid
  //    completion reading as a branch nobody had ever scaffolded.
  const claimed = structuredClone(job);
  claimed.assignmentClaim = {
    jobId: job.jobId,
    jurisdiction: job.jurisdiction,
    ownerSession: "SESSION_C",
    status: "reserved",
    targetType: "compiled_job"
  };
  assert.equal(
    scaffoldKeyFor(claimed.jobId, { job: claimed, model: claimed.model }),
    scaffoldKeyFor(job.jobId, { job, model: job.model }),
    "a coordination claim renamed the worker branch"
  );
  assert.equal(
    assignmentFingerprint(claimed, claimed.model),
    assignmentFingerprint(job, job.model)
  );
  // Re-reserving to a different session, or releasing the claim entirely, is
  // still coordination and still cannot move the branch.
  const reassigned = structuredClone(claimed);
  reassigned.assignmentClaim.ownerSession = "SESSION_D";
  reassigned.assignmentClaim.status = "in_progress";
  assert.equal(
    scaffoldKeyFor(reassigned.jobId, { job: reassigned, model: reassigned.model }),
    scaffoldKeyFor(job.jobId, { job, model: job.model })
  );

  // 8. Ratifying ownership is the only thing a late claim may do. Everything
  //    that describes the work still invalidates the assignment, so a claim
  //    cannot be used as a back door to change what was assigned.
  for (const mutate of [
    (entry) => { entry.trackIds = [...(entry.trackIds ?? []), "smuggled-track"]; },
    (entry) => { entry.ownedPaths = [...entry.ownedPaths, "src/lib/rcap/smuggled.ts"]; },
    (entry) => { entry.expectedOutputs = [...entry.expectedOutputs, "src/lib/rcap/smuggled.ts"]; },
    (entry) => { entry.commitSubject = "feat(record-clearing): something else entirely"; },
    (entry) => { entry.lane = "guidance_implementation"; },
    (entry) => { entry.forbiddenPaths = []; }
  ]) {
    const smuggled = structuredClone(claimed);
    mutate(smuggled);
    assert.notEqual(
      scaffoldKeyFor(smuggled.jobId, { job: smuggled, model: smuggled.model }),
      scaffoldKeyFor(job.jobId, { job, model: job.model }),
      "a substantive assignment change kept its branch identity"
    );
  }
});

// --- session reservations --------------------------------------------------
//
// A reservation says who is doing a job, so two sessions do not pick up the
// same work. It is captain-owned state: a worker that could write it could
// reassign itself.

await check("captain reserves a job to a session and workers cannot rewrite it", () => {
  const claims = readJson(
    "data/record-clearing/production-factory/job-claims.json"
  );
  assert.equal(claims.schemaVersion, "rcap-factory-job-claims/v1");

  // Every session that coordinates work can hold a reservation, and Session C
  // is among them — the guidance lane had no reservation path at all, which is
  // why New York and Kentucky were scaffolded against an unreserved job.
  //
  // What matters is that the path exists, not that a reservation happens to be
  // outstanding right now: reservations are released as jobs complete, so a
  // wave that finished all its guidance work would otherwise fail this.
  const sessions = new Set(claims.claims.map((entry) => entry.ownerSession));
  for (const session of sessions) {
    assert.match(session, /^SESSION_[BCDEF]$/);
  }
  const guidanceReservation = {
    jobId: "rcap-example-guidance-implementation",
    jurisdiction: "XX",
    ownerSession: "SESSION_C",
    status: "reserved",
    targetType: "compiled_job"
  };
  const guidanceClaims = validateFactoryJobClaims({
    schemaVersion: claims.schemaVersion,
    claims: [...claims.claims, guidanceReservation]
  });
  assert.equal(
    guidanceClaims.ok,
    true,
    `Session C has no supported claim path: ${guidanceClaims.issues.join("; ")}`
  );

  // One job, one owner. A second claim on the same job is a collision, not a
  // handover, and the reader refuses it rather than picking one.
  const seen = new Set();
  for (const entry of claims.claims) {
    assert.equal(seen.has(entry.jobId), false, `${entry.jobId} claimed twice`);
    seen.add(entry.jobId);
    assert.match(entry.status, /^(reserved|in_progress)$/);
    assert.match(entry.targetType, /^(compiled_job|canonical_parent)$/);
  }

  // The claim reaches the compiled job, so a scaffold can check it before
  // handing the work out.
  const claimedJobIds = new Set(
    claims.claims
      .filter((entry) => entry.targetType === "compiled_job")
      .map((entry) => entry.jobId)
  );
  for (const entry of plan.jobs) {
    if (!claimedJobIds.has(entry.jobId)) {
      assert.equal(
        entry.assignmentClaim,
        undefined,
        `${entry.jobId} carries a claim no committed reservation supports`
      );
      continue;
    }
    assert.ok(entry.assignmentClaim, `${entry.jobId} lost its reservation`);
    assert.equal(entry.assignmentClaim.jobId, entry.jobId);
  }

  // Workers may never write the reservation file.
  for (const entry of plan.jobs) {
    if (entry.executionScope !== "worker") continue;
    for (const owned of entry.ownedPaths) {
      assert.notEqual(
        owned,
        "data/record-clearing/production-factory/job-claims.json",
        `${entry.jobId} owns the shared reservation file`
      );
    }
  }

  // A scaffold handed the wrong session is refused, and one handed the right
  // session is not.
  const reserved = plan.jobs.find(
    (entry) => entry.assignmentClaim?.ownerSession === "SESSION_C"
  );
  if (reserved) {
    assert.throws(
      () => assertClaimPermitsSession(reserved, "SESSION_B"),
      /reserved to SESSION_C/
    );
    assert.equal(assertClaimPermitsSession(reserved, "SESSION_C"), undefined);
  }
  // An unreserved job is not blocked by this gate; it is the reservation that
  // constrains, not its absence.
  const unreserved = plan.jobs.find((entry) => !entry.assignmentClaim);
  assert.equal(assertClaimPermitsSession(unreserved, "SESSION_F"), undefined);
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
  // 37 -> 41 with the New Jersey, Nevada, Texas and Vermont guidance packets.
  assert.equal(completedGuidance.length, 41);
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
    // Canonical samples are the legal coverage. A regression variant — South
    // Dakota's teaching-licence sheet is the one here — is extra technical
    // evidence for a branch of a track that already has a canonical sample, and
    // must not read as an extra track. A proof written before variants existed
    // carries no role and is canonical throughout.
    const canonicalPackets = proof.samplePackets.filter(
      (packet) => (packet.sampleRole ?? "canonical") === "canonical"
    );
    const variantPackets = proof.samplePackets.filter(
      (packet) => packet.sampleRole === "variant"
    );
    assert.equal(proof.finalPdfCount, job.trackIds.length);
    assert.equal(canonicalPackets.length, job.trackIds.length);
    assert.deepEqual(
      canonicalPackets.map((packet) => packet.trackId).sort(),
      [...job.trackIds].sort(),
      job.jobId
    );
    assert.equal(
      new Set(canonicalPackets.map((packet) => packet.trackId)).size,
      job.trackIds.length,
      job.jobId
    );
    for (const variant of variantPackets) {
      assert.ok(
        job.trackIds.includes(variant.variantOfTrackId ?? variant.trackId),
        `${job.jobId}: variant of an unassigned track`
      );
    }
    assert.equal(
      canonicalPackets.reduce(
        (total, packet) => total + packet.assembledPageCount,
        0
      ),
      proof.assembledPageCount,
      job.jobId
    );
    if (variantPackets.length > 0) {
      assert.equal(
        proof.samplePackets.reduce(
          (total, packet) => total + packet.assembledPageCount,
          0
        ),
        proof.technicalFixturePageCount,
        job.jobId
      );
    }
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
    // 77 -> 75: Kentucky's clean track left the source-pinned set when its
    // custom unit landed, and Wyoming's clean nonconviction route left it when
    // the published-source amendment retired the packet-components blocker.
    sourcePinned: 75,
    implementationProof: 17,
    finalDisposition: 0
  });
  assert.equal(status.totals.jurisdictions, 51);
  assert.equal(status.totals.tracks, normalizedRegistry.trackCount);
  assert.equal(status.totals.normalized, normalizedRegistry.trackCount);
  // 160 -> 171 with the eleven tracks the Hawaii, Ohio and Washington
  // implementations built (5 + 4 + 2), then 172 with Kentucky's clean track.
  assert.equal(status.totals.implementationComplete, 172);
  assert.equal(status.totals.technicalProofPassed, 172);
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


// ---------------------------------------------------------------------------
// Captain completion discovery
//
// Every case below is a real one from the wave that produced this module. Nine
// of eleven assignments already had a valid pushed branch and every one of them
// read as absent, because the integration checkout had fetched only its own
// head. These fixtures reproduce that, and the shapes it hid behind.
// ---------------------------------------------------------------------------

await check("captain discovery fetches factory refs with a wildcard before testing existence", () => {
  const refspecs = factoryFetchRefspecs("feat/record-clearing-production-integration");
  assert.equal(refspecs.length, 2);
  assert.ok(
    refspecs.some((spec) => spec.includes("refs/heads/rcap-factory/*")),
    "the factory wildcard refspec is missing; a single-branch clone would report every worker branch as absent"
  );
  assert.ok(
    refspecs.some((spec) =>
      spec.includes("refs/heads/feat/record-clearing-production-integration:")
    ),
    "the integration branch is not fetched explicitly"
  );
  // A skipped fetch is reported, never silently treated as a clean result.
  const fixture = withDiscoveryFixture((repo) => {
    const plan = discoveryPlan([discoveryJob({ jobId: "rcap-zz-one" })], repo.tip);
    return discoverCompletions(plan, {
      rootDir: repo.captain,
      fetch: false,
      integrationRef: "HEAD"
    });
  });
  assert.equal(fixture.fetch.fetched, false);
  assert.match(fixture.fetch.detail, /skipped/u);
});

await check("captain discovery classifies every branch shape it has actually met", () => {
  const report = withDiscoveryFixture((repo) => {
    const jobs = [
      // Indiana: an incompatible legacy branch beside an exact current one.
      discoveryJob({ jobId: "rcap-in-custom-pleading" }),
      // Oklahoma, Tennessee, North Carolina: valid completions while the plan
      // still says ready.
      discoveryJob({ jobId: "rcap-ok-guidance-implementation" }),
      // Hawaii / Florida Session D and Session F: valid remote completions the
      // single-branch refspec hid entirely.
      discoveryJob({ jobId: "rcap-hi-stage-one-decision" }),
      // Already carried onto the integration branch.
      discoveryJob({ jobId: "rcap-vt-identity" }),
      // Nothing pushed at all.
      discoveryJob({ jobId: "rcap-zz-absent" }),
      // Pushed, but missing an output it promised.
      discoveryJob({ jobId: "rcap-zz-partial" }),
      // Pushed under a fingerprint no assignment this job has held produces.
      discoveryJob({ jobId: "rcap-zz-foreign" }),
      // Scaffolded and never worked: the branch still points at a commit in the
      // integration branch's own history.
      discoveryJob({ jobId: "rcap-zz-leased" })
    ];
    const plan = discoveryPlan(jobs, repo.tip);
    return discoverCompletions(plan, {
      rootDir: repo.captain,
      fetch: false,
      integrationRef: "HEAD"
    });
  });

  const byJob = new Map(report.jobs.map((entry) => [entry.jobId, entry]));
  assert.equal(byJob.get("rcap-zz-leased").classification, "baseline_lease");
  assert.equal(byJob.get("rcap-in-custom-pleading").classification, "exact_completion");
  assert.equal(byJob.get("rcap-ok-guidance-implementation").classification, "exact_completion");
  assert.equal(byJob.get("rcap-hi-stage-one-decision").classification, "exact_completion");
  assert.equal(byJob.get("rcap-vt-identity").classification, "integrated_completion");
  assert.equal(byJob.get("rcap-zz-absent").classification, "no_branch");
  assert.equal(byJob.get("rcap-zz-partial").classification, "partial_branch");
  assert.equal(byJob.get("rcap-zz-foreign").classification, "incompatible_branch");

  // Indiana's older branch is surfaced beside the current one and is refused;
  // the current one is still the completion.
  const indiana = byJob.get("rcap-in-custom-pleading");
  assert.equal(indiana.branches.length, 2);
  assert.equal(indiana.completionBranch, indiana.canonicalBranch);
  const legacy = indiana.branches.find(
    (branch) => branch.branch === indiana.legacyBranch
  );
  assert.equal(legacy.classification, "incompatible_branch");

  // A foreign-fingerprint branch fails on identity, not on shape.
  const foreign = byJob.get("rcap-zz-foreign");
  assert.ok(
    foreign.branches[0].failures.some(
      (failure) => failure.code === "assignment_marker_identity"
    )
  );

  for (const entry of report.jobs) {
    assert.ok(COMPLETION_CLASSIFICATIONS.includes(entry.classification));
  }
});

await check("captain discovery keys branches on the job digest, not the slug prefix", () => {
  // `rcap-fl-public-official-download` is a prefix of
  // `rcap-fl-public-official-download-fdle-fac-supersession`. Matching on the
  // slug made the second job's valid completion read as the first job's
  // incompatible branch.
  const shortKeys = candidateBranchKeys(
    discoveryJob({ jobId: "rcap-fl-public-official-download" })
  );
  const longKeys = candidateBranchKeys(
    discoveryJob({ jobId: "rcap-fl-public-official-download-fdle-fac-supersession" })
  );
  assert.notEqual(shortKeys.canonical, longKeys.canonical);
  assert.equal(
    longKeys.canonical.startsWith(shortKeys.legacy),
    false,
    "the longer job's branch key still starts with the shorter job's key"
  );
});

await check("captain integration planning distinguishes dispositions and changes nothing", () => {
  const { report, integration, statusBefore, statusAfter } = withDiscoveryFixture(
    (repo) => {
      const jobs = [
        discoveryJob({ jobId: "rcap-in-custom-pleading" }),
        discoveryJob({ jobId: "rcap-vt-identity" }),
        discoveryJob({ jobId: "rcap-zz-absent" }),
        discoveryJob({ jobId: "rcap-zz-partial" }),
        discoveryJob({ jobId: "rcap-zz-foreign" }),
        discoveryJob({ jobId: "rcap-zz-leased" })
      ];
      const plan = discoveryPlan(jobs, repo.tip);
      const before = spawnSync("git", ["status", "--porcelain=v1"], {
        cwd: repo.captain,
        encoding: "utf8"
      }).stdout;
      const discovered = discoverCompletions(plan, {
        rootDir: repo.captain,
        fetch: false,
        integrationRef: "HEAD"
      });
      const planned = planIntegrations(discovered, {
        activeWorkerJobIds: ["rcap-zz-absent"]
      });
      const after = spawnSync("git", ["status", "--porcelain=v1"], {
        cwd: repo.captain,
        encoding: "utf8"
      }).stdout;
      return {
        report: discovered,
        integration: planned,
        statusBefore: before,
        statusAfter: after
      };
    }
  );

  const byJob = new Map(integration.steps.map((step) => [step.jobId, step]));
  assert.equal(byJob.get("rcap-in-custom-pleading").disposition, "integrate");
  assert.equal(byJob.get("rcap-vt-identity").disposition, "already_integrated");
  assert.equal(byJob.get("rcap-zz-partial").disposition, "correction_required");
  assert.equal(byJob.get("rcap-zz-foreign").disposition, "blocked");
  assert.equal(byJob.get("rcap-zz-absent").disposition, "refused_active_worker");
  assert.equal(
    byJob.get("rcap-zz-leased").disposition,
    "refused_baseline_lease",
    "a leased worktree must never be integrated as a completion"
  );
  assert.match(byJob.get("rcap-zz-leased").reason, /carries no worker commit/u);
  assert.equal(byJob.get("rcap-in-custom-pleading").commit.length, 40);
  assert.ok(byJob.get("rcap-in-custom-pleading").branch.startsWith("rcap-factory/"));
  assert.ok(integration.independentJobIds.includes("rcap-in-custom-pleading"));
  assert.equal(report.totals.no_branch, 1);
  // Plan mode is a read.
  assert.equal(statusBefore, statusAfter);
});

await check("captain integration planning refuses two jobs claiming one owned path", () => {
  // planIntegrations is a pure function over a discovery report, so the
  // collision is stated directly rather than staged through a fixture repo that
  // could not produce it: two jobs cannot legitimately own one path, and the
  // planner has to catch the case where a reissued assignment produces one.
  const discovery = {
    schemaVersion: "rcap-captain-completion-discovery/v1",
    baseCommit: "0".repeat(40),
    fetch: { fetched: true, detail: null },
    jobs: [
      {
        jobId: "rcap-zz-first",
        lane: "custom_pleading",
        jurisdiction: "ZZ",
        classification: "exact_completion",
        completionBranch: "rcap-factory/rcap-zz-first-aaaaaaaa-bbbbbbbb",
        completionCommit: "1".repeat(40),
        ownedPaths: ["src/shared.ts"],
        branches: []
      },
      {
        jobId: "rcap-zz-second",
        lane: "custom_pleading",
        jurisdiction: "ZZ",
        classification: "exact_completion",
        completionBranch: "rcap-factory/rcap-zz-second-cccccccc-dddddddd",
        completionCommit: "2".repeat(40),
        ownedPaths: ["src/shared.ts"],
        branches: []
      }
    ]
  };
  const integration = planIntegrations(discovery);
  const conflicted = integration.steps.filter(
    (step) => step.sharedFileConflicts.length > 0
  );
  assert.equal(conflicted.length, 1);
  assert.equal(conflicted[0].jobId, "rcap-zz-second");
  assert.equal(conflicted[0].disposition, "blocked");
  assert.match(conflicted[0].reason, /already claimed/u);
  assert.deepEqual(integration.independentJobIds, ["rcap-zz-first"]);
});

/**
 * A minimal two-repository fixture: one bare "origin" carrying worker branches,
 * one captain clone. Built rather than mocked, because the defect this guards
 * against lived in git's own ref plumbing and a mock would have agreed with the
 * broken behaviour.
 */
function withDiscoveryFixture(callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-completion-discovery-"));
  try {
    const origin = path.join(root, "origin");
    const worker = path.join(root, "worker");
    const captain = path.join(root, "captain");
    run(["init", "--quiet", "--bare", "--initial-branch=main", origin]);
    run(["init", "--quiet", "--initial-branch=main", worker]);
    const inWorker = (args) => run(["-C", worker, ...args]);
    inWorker(["config", "user.email", "fixture@example.invalid"]);
    inWorker(["config", "user.name", "RCAP fixture"]);
    fs.mkdirSync(path.join(worker, "owned"), { recursive: true });
    fs.writeFileSync(path.join(worker, "README"), "base\n");
    inWorker(["add", "README"]);
    inWorker(["commit", "--quiet", "-m", "base"]);
    inWorker(["remote", "add", "origin", origin]);
    inWorker(["push", "--quiet", "origin", "main"]);
    const base = run(["-C", worker, "rev-parse", "HEAD"]).trim();

    const commitOwned = (branch, job, files, subject) => {
      inWorker(["checkout", "--quiet", "-B", branch, base]);
      for (const [name, body] of Object.entries(files)) {
        fs.mkdirSync(path.dirname(path.join(worker, name)), { recursive: true });
        fs.writeFileSync(path.join(worker, name), body);
        inWorker(["add", name]);
      }
      inWorker(["commit", "--quiet", "-m", subject ?? job.commitSubject]);
      inWorker(["push", "--quiet", "origin", branch]);
      return run(["-C", worker, "rev-parse", "HEAD"]).trim();
    };

    const keysFor = (jobId, overrides) =>
      candidateBranchKeys(discoveryJob({ jobId, ...overrides }));

    // Indiana: current assignment, plus an older branch under the legacy key
    // carrying somebody else's subject and path.
    const indiana = discoveryJob({ jobId: "rcap-in-custom-pleading" });
    const indianaKeys = keysFor("rcap-in-custom-pleading");
    commitOwned(
      `rcap-factory/${indianaKeys.canonical}`,
      indiana,
      { "owned/rcap-in-custom-pleading.txt": "indiana\n" },
      undefined
    );
    commitOwned(
      `rcap-factory/${indianaKeys.legacy}`,
      indiana,
      { "owned/unrelated.txt": "stale\n" },
      "feat(record-clearing): something else entirely"
    );

    for (const jobId of ["rcap-ok-guidance-implementation", "rcap-hi-stage-one-decision"]) {
      const job = discoveryJob({ jobId });
      commitOwned(
        `rcap-factory/${keysFor(jobId).canonical}`,
        job,
        { [`owned/${jobId}.txt`]: `${jobId}\n` },
        undefined
      );
    }

    // Vermont: pushed, and its blob is already the blob on the captain branch.
    const vermont = discoveryJob({ jobId: "rcap-vt-identity" });
    commitOwned(
      `rcap-factory/${keysFor("rcap-vt-identity").canonical}`,
      vermont,
      { "owned/rcap-vt-identity.txt": "vermont\n" },
      undefined
    );

    // Partial: correct subject, only owned paths touched, and one of the two
    // outputs it promised never written.
    const partial = discoveryJob({ jobId: "rcap-zz-partial" });
    commitOwned(
      `rcap-factory/${keysFor("rcap-zz-partial").canonical}`,
      partial,
      { "owned/rcap-zz-partial.txt": "partial\n" },
      undefined
    );

    // Foreign: right job id, a fingerprint suffix no assignment produces.
    const foreign = discoveryJob({ jobId: "rcap-zz-foreign" });
    commitOwned(
      `rcap-factory/${scaffoldKeyFor("rcap-zz-foreign")}-deadbeef`,
      foreign,
      { "owned/rcap-zz-foreign.txt": "foreign\n" },
      undefined
    );

    // Leased: the worktree was scaffolded and nothing was committed on it, so
    // the branch still points at an integration commit.
    const leased = discoveryJob({ jobId: "rcap-zz-leased" });
    inWorker(["checkout", "--quiet", "-B", `rcap-factory/${keysFor("rcap-zz-leased").canonical}`, base]);
    inWorker(["push", "--quiet", "origin", `rcap-factory/${keysFor("rcap-zz-leased").canonical}`]);
    void leased;

    // The captain clone starts from main only — exactly the single-branch state
    // that hid nine completions — and then fetches with the wildcard.
    run(["clone", "--quiet", "--branch", "main", "--single-branch", origin, captain]);
    run([
      "-C",
      captain,
      "fetch",
      "origin",
      "--prune",
      "+refs/heads/rcap-factory/*:refs/remotes/origin/rcap-factory/*"
    ]);
    const inCaptain = (args) => run(["-C", captain, ...args]);
    inCaptain(["config", "user.email", "fixture@example.invalid"]);
    inCaptain(["config", "user.name", "RCAP fixture"]);
    fs.mkdirSync(path.join(captain, "owned"), { recursive: true });
    fs.writeFileSync(
      path.join(captain, "owned/rcap-vt-identity.txt"),
      "vermont\n"
    );
    inCaptain(["add", "owned/rcap-vt-identity.txt"]);
    inCaptain(["commit", "--quiet", "-m", "captain: adopt the Vermont blob"]);
    const tip = run(["-C", captain, "rev-parse", "HEAD"]).trim();

    return callback({ root, origin, worker, captain, base, tip });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }

  function run(args) {
    const result = spawnSync("git", args, { encoding: "utf8" });
    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout || `git ${args.join(" ")} failed`);
    }
    return result.stdout;
  }
}

/** A job manifest with only the fields discovery reads. */
function discoveryJob(overrides = {}) {
  const jobId = overrides.jobId ?? "rcap-zz-one";
  return {
    jobId,
    lane: "legal_design_normalization",
    jurisdiction: "ZZ",
    status: "ready",
    model: "opus",
    trackIds: [],
    dependencies: [],
    baseCommit: "0".repeat(40),
    commitSubject: `feat(record-clearing): ${jobId}`,
    ownedPaths:
      jobId === "rcap-zz-partial"
        ? [`owned/${jobId}.txt`, `owned/${jobId}-verifier.txt`]
        : [`owned/${jobId}.txt`],
    expectedOutputs:
      jobId === "rcap-zz-partial"
        ? [`owned/${jobId}.txt`, `owned/${jobId}-verifier.txt`]
        : [`owned/${jobId}.txt`],
    forbiddenPaths: [],
    focusedValidation: [],
    ...overrides
  };
}

function discoveryPlan(jobs, baseCommit) {
  return { schemaVersion: "rcap-production-factory/v1", baseCommit, jobs };
}


// ---------------------------------------------------------------------------
// Acquisition-response validation
//
// Every case below is a real one. Minnesota's official channel answers
// automation with a Cloudflare managed challenge; Delaware's answers with
// HTTP 200 and a 247-byte F5 rejection page. A pipeline that reads 2xx as
// success pins the rejection page as the official form. No live network call
// is made here — the responses are constructed.
// ---------------------------------------------------------------------------

const MINIMAL_PDF = Buffer.from(
  [
    "%PDF-1.4",
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >> endobj",
    "trailer << /Root 1 0 R >>",
    "%%EOF",
    ""
  ].join("\n"),
  "utf8"
);

const F5_REJECTION = (supportId) =>
  Buffer.from(
    "<html><head><title>Request Rejected</title></head><body>" +
      "The requested URL was rejected. Please consult with your administrator.<br><br>" +
      `Your support ID is: ${supportId}<br><br>` +
      "<a href='javascript:history.back();'>[Go Back]</a></body></html>",
    "utf8"
  );

await check("HTTP status alone can never establish an acquisition", () => {
  // 1. A real PDF, served correctly.
  const good = classifyAcquisitionResponse({
    status: 200,
    headers: { "content-type": "application/pdf" },
    body: MINIMAL_PDF,
    expectedAsset: { kind: "pdf", expectedPageCount: 1 }
  });
  assert.equal(good.acquired, true);
  assert.equal(good.disposition, "acquired_public_official_download");
  assert.match(good.contentSha256, /^[0-9a-f]{64}$/u);
  assert.equal(good.receiptEligible, true);
  assert.equal(good.structure.pageCount, 1);

  // 2. Cloudflare managed challenge — Minnesota.
  const cloudflare = classifyAcquisitionResponse({
    status: 403,
    headers: { "cf-mitigated": "challenge", "content-type": "text/html" },
    body: Buffer.from(
      "<html><head><title>Just a moment...</title></head><body>" +
        "<script src='/cdn-cgi/challenge-platform/h/b/orchestrate/chl_page'></script>" +
        "</body></html>",
      "utf8"
    ),
    expectedAsset: { kind: "pdf" }
  });
  assert.equal(cloudflare.acquired, false);
  assert.equal(cloudflare.disposition, ACQUISITION_BLOCKED_DISPOSITION);
  assert.equal(cloudflare.block.vendor, "cloudflare");
  assert.ok(cloudflare.block.signals.includes("cf_mitigated_challenge"));
  assert.equal(cloudflare.contentSha256, null);
  assert.equal(cloudflare.receiptEligible, false);
  assert.equal(cloudflare.workerReadyContract, false);

  // 3. F5/BIG-IP rejection at HTTP 200 — Delaware. This is the case that made
  //    status-only validation dangerous rather than merely incomplete.
  const f5 = classifyAcquisitionResponse({
    status: 200,
    headers: { "content-type": "text/html" },
    body: F5_REJECTION("18364827364512345678"),
    expectedAsset: { kind: "pdf" }
  });
  assert.equal(f5.acquired, false);
  assert.equal(f5.disposition, ACQUISITION_BLOCKED_DISPOSITION);
  assert.equal(f5.block.vendor, "f5_big_ip");
  assert.equal(f5.contentSha256, null);
  assert.equal(f5.receiptEligible, false);
  for (const forbidden of SUCCESS_DISPOSITIONS) {
    assert.notEqual(f5.disposition, forbidden);
  }
  assert.throws(() => assertAcquisitionPermitted(f5), /attended_retrieval_required/u);

  // 4. HTML accepted only where the assignment expects HTML — Louisiana's
  //    statutory text is published as HTML and nothing else.
  const html = classifyAcquisitionResponse({
    status: 200,
    headers: { "content-type": "text/html" },
    body: Buffer.from("<html><body><h1>Art. 993</h1></body></html>", "utf8"),
    expectedAsset: { kind: "html" }
  });
  assert.equal(html.acquired, true);
  // The same bytes do not satisfy a PDF assignment.
  const htmlForPdf = classifyAcquisitionResponse({
    status: 200,
    headers: { "content-type": "text/html" },
    body: Buffer.from("<html><body><h1>Art. 993</h1></body></html>", "utf8"),
    expectedAsset: { kind: "pdf" }
  });
  assert.equal(htmlForPdf.acquired, false);

  // 5. Wrong MIME, real PDF: accepted under the explicit policy, with the
  //    mismatch recorded rather than normalised away.
  const wrongMime = classifyAcquisitionResponse({
    status: 200,
    headers: { "content-type": "application/octet-stream" },
    body: MINIMAL_PDF,
    expectedAsset: { kind: "pdf" }
  });
  assert.equal(wrongMime.acquired, true);
  assert.equal(wrongMime.findings.length, 1);
  assert.equal(
    wrongMime.findings[0].finding,
    "content_type_mismatch_body_parseable"
  );
  const refusedMime = classifyAcquisitionResponse({
    status: 200,
    headers: { "content-type": "application/octet-stream" },
    body: MINIMAL_PDF,
    expectedAsset: { kind: "pdf" },
    wrongMimeButParseablePolicy: "refuse"
  });
  assert.equal(refusedMime.acquired, false);

  // 6. Truncated PDF: right signature, no trailer.
  const truncated = classifyAcquisitionResponse({
    status: 200,
    headers: { "content-type": "application/pdf" },
    body: MINIMAL_PDF.subarray(0, 40),
    expectedAsset: { kind: "pdf" }
  });
  assert.equal(truncated.acquired, false);
  assert.equal(truncated.contentSha256, null);
  assert.ok(
    truncated.failures.some((entry) => entry.check === "parser_opens")
  );

  // 7. Rotating support IDs must classify identically. Hashing the raw body
  //    would make every rejection a different "identity".
  const first = classifyAcquisitionResponse({
    status: 200,
    headers: { "content-type": "text/html" },
    body: F5_REJECTION("11111111111111111111"),
    expectedAsset: { kind: "pdf" }
  });
  const second = classifyAcquisitionResponse({
    status: 200,
    headers: { "content-type": "text/html" },
    body: F5_REJECTION("99999999999999999999"),
    expectedAsset: { kind: "pdf" }
  });
  assert.equal(first.disposition, second.disposition);
  assert.equal(
    first.block.blockFingerprint,
    second.block.blockFingerprint,
    "a rotating support ID must not produce an unstable block identity"
  );
  assert.equal(first.contentSha256, null);
  assert.equal(second.contentSha256, null);
});

await check("a real document is never mistaken for an access block", () => {
  // A PDF whose text layer contains a block phrase must still acquire: block
  // scanning is gated on the body being small and not binary-signatured.
  const withPhrase = Buffer.concat([
    MINIMAL_PDF,
    Buffer.from("\n% The requested URL was rejected\n", "utf8")
  ]);
  assert.equal(detectAccessBlock({ headers: {}, body: withPhrase }), null);
  const result = classifyAcquisitionResponse({
    status: 200,
    headers: { "content-type": "application/pdf" },
    body: withPhrase,
    expectedAsset: { kind: "pdf" }
  });
  assert.equal(result.acquired, true);

  // An OOXML container must be a real package, not any ZIP.
  const notOoxml = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
  const docx = classifyAcquisitionResponse({
    status: 200,
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    },
    body: notOoxml,
    expectedAsset: { kind: "docx" }
  });
  assert.equal(docx.acquired, false);
  assert.ok(
    docx.failures.some((entry) => entry.check === "expected_structure")
  );
});

await check("no integrated acquisition decision claims success from a block", () => {
  const directory = path.join(
    ROOT,
    "data/record-clearing/production-factory/source-acquisition"
  );
  let checked = 0;
  let blockedChannels = 0;
  for (const name of fs.readdirSync(directory).sort()) {
    if (!name.endsWith(".json")) continue;
    const decision = readJson(
      `data/record-clearing/production-factory/source-acquisition/${name}`
    );
    if (decision.strategyFamily !== "official_download_automation_blocked") {
      continue;
    }
    checked += 1;
    // The rule is about the channel's recorded state, not the job's family
    // name. A job in this family may legitimately have downloaded something
    // when the recorded block turns out not to reproduce on retest — Colorado
    // is exactly that case, and its JDF 684 retrieval is real. What may never
    // happen is a download claimed from a channel the same decision records as
    // still blocking.
    const stillBlocked =
      decision.method?.automatedRetrievalBlocked === true ||
      /blocked|refused|rejected|challenge/iu.test(
        decision.terminalDisposition ?? ""
      );
    if (!stillBlocked) continue;
    blockedChannels += 1;
    assert.equal(
      decision.downloadedSourceCount,
      0,
      `${name} claims downloads from a channel it records as blocked`
    );
    for (const acquisition of decision.acquisitions ?? []) {
      assert.equal(
        SUCCESS_DISPOSITIONS.includes(acquisition.disposition),
        false,
        `${name} records ${acquisition.disposition} against a blocked channel`
      );
      assert.equal(
        typeof acquisition.sha256 === "string",
        false,
        `${name} pins a digest obtained from a blocked channel`
      );
    }
  }
  assert.ok(checked >= 2, "expected the Minnesota and Delaware decisions");
  assert.ok(
    blockedChannels >= 2,
    "expected Minnesota and Delaware to record channels that are still blocked"
  );
});


// ---------------------------------------------------------------------------
// Source materialization versus generation authorization
//
// Colorado is the case: twelve receipts whose bytes, hashes, sizes and modes
// all verify, against a terminal `written_permission_required`. Both are true.
// Before these, byte verification alone produced worker_ready, so the only way
// to honour the licence was to delete the evidence.
// ---------------------------------------------------------------------------

function authorizationFixture(rootDir, decisions, { holdCommercialUse = [] } = {}) {
  const directory = path.join(
    rootDir,
    "data/record-clearing/production-factory/source-acquisition"
  );
  fs.mkdirSync(directory, { recursive: true });
  for (const [name, decision] of Object.entries(decisions)) {
    fs.writeFileSync(
      path.join(directory, `${name}.json`),
      `${JSON.stringify(decision, null, 2)}\n`
    );
  }
  const libraryDir = path.join(rootDir, "data/record-clearing/master-library");
  fs.mkdirSync(libraryDir, { recursive: true });
  fs.writeFileSync(
    path.join(libraryDir, "pending-edition-amendments.json"),
    `${JSON.stringify(
      {
        candidates: holdCommercialUse.map((jurisdiction) => ({
          jurisdiction,
          disposition: "hold_commercial_use"
        }))
      },
      null,
      2
    )}\n`
  );
  return buildSourceAuthorizationIndex(rootDir);
}

await check(
  "a successor permission decision authorizes the same receipt without touching it",
  () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-successor-permission-"));
    try {
      // The denial and the grant coexist. This is Colorado in August: a terminal
      // `written_permission_required` that was correct when it was written, and
      // a later grant that supersedes it. The denial is the reason the grant was
      // sought, so erasing it would erase why the authorization exists.
      const denial = {
        jobId: "rcap-zz-family-commercial-license",
        jurisdiction: "ZZ",
        strategyFamily: "commercial_license",
        terminalDisposition: "written_permission_required",
        licenseAdopted: false,
        generationAllowed: false
      };
      const grant = {
        jobId: "rcap-zz-written-permission-authorization",
        jurisdiction: "ZZ",
        strategyFamily: "commercial_license",
        supersedes: { decisionJobId: "rcap-zz-family-commercial-license" },
        terminalDisposition: "authorized",
        licenseAdopted: true,
        generationAllowed: true
      };

      // Sorted by filename the denial reads last, so a last-writer index would
      // resolve to the denial and the grant would silently do nothing.
      const index = authorizationFixture(root, {
        "rcap-zz-written-permission-authorization": grant,
        "rcap-zz-family-commercial-license": denial
      });

      const resolved = authorizationFor(index, { jurisdiction: "ZZ" });
      assert.equal(resolved.verdict, "authorized");
      assert.equal(resolved.generationAllowed, true);
      assert.equal(
        resolved.decisionJobId,
        "rcap-zz-written-permission-authorization",
        "the successor must win over the decision it supersedes"
      );

      // The historical denial is still on disk, unedited. A successor records a
      // new fact; it does not rewrite the record of the old one.
      const denialPath = path.join(
        root,
        "data/record-clearing/production-factory/source-acquisition",
        "rcap-zz-family-commercial-license.json"
      );
      assert.ok(fs.existsSync(denialPath));
      const retained = JSON.parse(fs.readFileSync(denialPath, "utf8"));
      assert.equal(retained.terminalDisposition, "written_permission_required");
      assert.equal(retained.generationAllowed, false);
      assert.equal(retained.licenseAdopted, false);

      // The point of the whole exercise: one verified receipt, unchanged, goes
      // from withheld to worker-ready purely because permission arrived. The
      // evidence facts are identical on both sides — same receipt, not a new one.
      const receipt = { receiptVerified: true };
      // The denial-only world needs its own root. `authorizationFixture` writes
      // decisions into a directory and never clears it, so reusing `root` here
      // would leave the grant sitting alongside the denial and "before" would
      // resolve to the grant — the test would then compare the granted state
      // against itself and pass while proving nothing.
      const denialOnlyRoot = fs.mkdtempSync(
        path.join(os.tmpdir(), "rcap-successor-permission-denial-")
      );
      let before;
      try {
        before = deriveSourceLifecycle({
          ...receipt,
          authorization: authorizationFor(
            authorizationFixture(denialOnlyRoot, {
              "rcap-zz-family-commercial-license": denial
            }),
            { jurisdiction: "ZZ" }
          )
        });
      } finally {
        fs.rmSync(denialOnlyRoot, { recursive: true, force: true });
      }
      const after = deriveSourceLifecycle({ ...receipt, authorization: resolved });

      for (const fact of [
        "sourceIdentityExact",
        "binaryMaterialized",
        "binaryHashVerified",
        "internalEvidenceRetained"
      ]) {
        assert.equal(before[fact], true, `${fact} must hold under the denial`);
        assert.equal(
          after[fact],
          before[fact],
          `${fact} is evidence and must not move when permission changes`
        );
      }

      assert.equal(before.generationAllowed, false);
      assert.equal(before.workerReady, false);
      assert.equal(before.implementationAssignable, false);
      assert.equal(after.generationAllowed, true);
      assert.equal(after.workerReady, true);
      assert.equal(after.implementationAssignable, true);

      // Release stays independent of both.
      assert.equal(after.runtimeEnabled, false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
);

await check(
  "Wyoming splits its clean route and keeps the two unencoded rules blocked",
  () => {
    const registry = JSON.parse(
      fs.readFileSync(
        path.join(ROOT, "data/record-clearing/legal-design-track-registry.json"),
        "utf8"
      )
    );
    const tracks = Array.isArray(registry)
      ? registry
      : registry.tracks ?? Object.values(registry).find(Array.isArray);
    const designBlockers = (trackId) =>
      (tracks.find((entry) => entry.trackId === trackId)?.blockers ?? []).filter((b) =>
        /legal_design/u.test(b.kind ?? "")
      );

    // The published-source amendment retired the packet-components question to
    // release level. It had been a build blocker on all three tracks, including
    // the clean one, and a stale derived registry kept it there.
    for (const trackId of ["wy_nc_1401", "wy_misd_1501", "wy_fel_1502"]) {
      assert.ok(
        !designBlockers(trackId).some((b) => /packet_components/u.test(b.statement ?? "")),
        `${trackId} must not still carry the retired packet-components build blocker`
      );
    }
    assert.equal(designBlockers("wy_nc_1401").length, 0, "wy_nc_1401 is clean");
    assert.ok(
      designBlockers("wy_misd_1501").some((b) => /7-1-107\(b\)\(iii\)|status-offense/u.test(b.statement ?? "")),
      "the status-offence/waiting-period blocker stays on wy_misd_1501"
    );
    assert.ok(
      designBlockers("wy_fel_1502").some((b) => /7-13-1502|deferral/u.test(b.statement ?? "")),
      "the exclusion-list and deferral blockers stay on wy_fel_1502"
    );

    // The local-practice survey stays open at release level and gates nothing.
    const plan = buildFactoryPlan({ rootDir: ROOT });
    const survey = plan.jobs.find(
      (job) => job.jobId === "rcap-wy-local-template-and-handout-survey"
    );
    assert.equal(survey.status, "ready", "the survey is open, not complete");

    // An assignment containing a blocked track is never worker-ready.
    const whole = plan.jobs.find((job) => job.jobId === "rcap-wy-custom-pleading");
    assert.equal(whole.status, "cancelled", "the whole-state assignment is superseded");
    assert.deepEqual(whole.trackIds.sort(), ["wy_fel_1502", "wy_misd_1501"]);
    assert.ok((whole.supersededBy ?? []).includes("rcap-wy-custom-pleading-clean-tracks"));

    const clean = plan.jobs.find(
      (job) => job.jobId === "rcap-wy-custom-pleading-clean-tracks"
    );
    assert.equal(clean.status, "ready");
    assert.deepEqual(clean.trackIds, ["wy_nc_1401"]);
    assert.ok(!clean.trackIds.includes("wy_misd_1501"));
    assert.ok(!clean.trackIds.includes("wy_fel_1502"));

    // One owner for both remaining rules, and it owns the memo.
    const owner = plan.jobs.find(
      (job) => job.jobId === "rcap-wy-remaining-track-legal-design-amendment"
    );
    assert.ok(owner);
    assert.deepEqual(owner.ownedPaths, [
      "data/record-clearing/legal-design-intake/WY.memo.json"
    ]);
    assert.ok(/Standing counsel adoption does not substitute/u.test(owner.stopCondition));
  }
);

await check(
  "Kentucky implements two of three components and claims no more",
  () => {
    const plan = buildFactoryPlan({ rootDir: ROOT });
    const clean = plan.jobs.find(
      (job) => job.jobId === "rcap-ky-custom-pleading-clean-tracks"
    );
    assert.equal(clean.status, "completed");
    assert.deepEqual(clean.trackIds, ["ky_void_seal_marijuana_synthetic_salvia"]);

    // The blocked sibling is not implemented and keeps its own blocker.
    const whole = plan.jobs.find((job) => job.jobId === "rcap-ky-custom-pleading");
    assert.equal(whole.status, "cancelled");
    assert.deepEqual(whole.trackIds, ["ky_void_seal_controlled_substance"]);

    // AOC-334 is official_pdf_fill and stays an open dependency: the proof must
    // not read as a complete participant filing packet.
    const proof = JSON.parse(
      fs.readFileSync(
        path.join(
          ROOT,
          "data/record-clearing/production-factory/packet-proofs/rcap-ky-custom-pleading-clean-tracks.json"
        ),
        "utf8"
      )
    );
    assert.equal(proof.counselAdopted, false);
    assert.equal(proof.packetReady, false);
    assert.equal(proof.productionEnabled, false);
    assert.equal(proof.runtimeStatus, "runtime_disabled");
  }
);

await check(
  "a held assignment alias recovers exactly one delivered branch and nothing else",
  () => {
    // The captain corrected a defect in this job's own metadata after a worker
    // had already delivered against it, which changed the branch key. The alias
    // is the written-down way back. Every pin on it is load-bearing, so each is
    // broken here in turn and each must fail closed on its own.
    const aliases = readHeldAssignmentAliases(ROOT);
    const recorded = aliases.find(
      (entry) =>
        entry.jobId === "rcap-wy-published-source-filing-requirements-memo-amendment"
    );
    assert.ok(recorded, "the Wyoming held alias must exist");
    // The live entry is consumed once its delivery is integrated, which is the
    // point of a one-time alias. The acceptance path is exercised against an
    // available copy so this test asserts the mechanism rather than the current
    // consumption state; the consumed case is asserted explicitly below.
    const alias = { ...recorded, status: "available" };

    const plan = buildFactoryPlan({ rootDir: ROOT });
    const job = plan.jobs.find((entry) => entry.jobId === alias.jobId);
    assert.ok(job);

    const good = {
      alias,
      job,
      branch: alias.historicalBranch,
      commit: alias.expectedWorkerCommit,
      subject: alias.expectedCommitSubject,
      parents: [alias.acceptedParentCommit],
      changedPaths: [...alias.expectedChangedPaths],
      outputSha256: alias.expectedOutputSha256,
      outputBlob: alias.expectedOutputGitBlob
    };
    assert.deepEqual(heldAliasFailures(good), [], "the exact delivery must pass");

    // 3. An arbitrary historical fingerprint is not admitted: the alias is
    //    matched by its exact branch, not by shape.
    assert.ok(
      heldAliasFailures({ ...good, branch: `${alias.historicalBranch}-deadbeef` }).some(
        (failure) => failure.code === "held_alias_branch"
      )
    );
    // 4. Same job, different commit.
    assert.ok(
      heldAliasFailures({ ...good, commit: "0".repeat(40) }).some(
        (failure) => failure.code === "held_alias_commit"
      )
    );
    // 5. Same commit, different path.
    assert.ok(
      heldAliasFailures({
        ...good,
        changedPaths: ["data/record-clearing/legal-design-intake/CO.memo.json"]
      }).some((failure) => failure.code === "held_alias_changed_paths")
    );
    // 6. Right path, wrong blob.
    assert.ok(
      heldAliasFailures({ ...good, outputSha256: "f".repeat(64) }).some(
        (failure) => failure.code === "held_alias_output_digest"
      )
    );
    // 7. Wrong subject.
    assert.ok(
      heldAliasFailures({ ...good, subject: "chore: something else" }).some(
        (failure) => failure.code === "held_alias_subject"
      )
    );
    // 8. Parent outside the accepted ancestry.
    assert.ok(
      heldAliasFailures({ ...good, parents: ["1".repeat(40)] }).some(
        (failure) => failure.code === "held_alias_parent"
      )
    );
    // 9. A consumed alias is one-time and cannot be replayed. The live entry is
    //    consumed, so this is asserted against the record as it actually stands.
    assert.equal(recorded.status, "consumed", "the Wyoming delivery is integrated");
    assert.ok(
      heldAliasFailures({ ...good, alias: recorded }).some(
        (failure) => failure.code === "held_alias_consumed"
      )
    );
    // The alias must still describe what the corrected job actually wants.
    assert.ok(
      heldAliasFailures({
        ...good,
        job: { ...job, ownedPaths: ["data/record-clearing/legal-design-intake/ZZ.memo.json"] }
      }).some((failure) => failure.code === "held_alias_output_contract")
    );
  }
);

await check(
  "held aliases are explicit, never inferred, and leave canonical keys alone",
  () => {
    const plan = buildFactoryPlan({ rootDir: ROOT });
    const job = plan.jobs.find(
      (entry) =>
        entry.jobId === "rcap-wy-published-source-filing-requirements-memo-amendment"
    );
    // Available copies: a consumed alias is deliberately not offered as a
    // candidate branch, so availability is what this test is about.
    const aliases = readHeldAssignmentAliases(ROOT).map((entry) => ({
      ...entry,
      status: "available"
    }));

    // 1/2. With the registry the historical branch is a candidate; without it
    //      the branch is unreachable and the delivery cannot be recovered.
    const withAliases = candidateBranchKeys(job, aliases);
    const without = candidateBranchKeys(job, []);
    assert.equal(withAliases.held.length, 1);
    assert.equal(without.held.length, 0);

    // 11. An alias never displaces or alters the current canonical key, so new
    //     workers scaffold against the current fingerprint exactly as before.
    assert.equal(withAliases.canonical, without.canonical);
    assert.equal(withAliases.preClaim, without.preClaim);
    assert.equal(withAliases.legacy, without.legacy);
    assert.ok(!withAliases.held.includes(withAliases.canonical));

    // A job with no alias gets none: aliases are not inferred from job ids.
    const other = plan.jobs.find((entry) => entry.jobId === "rcap-ky-custom-pleading-clean-tracks");
    assert.equal(candidateBranchKeys(other, aliases).held.length, 0);

    // 12. A coordination-only change does not need an alias, because the claim
    //     is already outside the fingerprint.
    assert.equal(
      candidateBranchKeys({ ...job, assignmentClaim: { ownerSession: "SESSION_D" } }, aliases)
        .canonical,
      withAliases.canonical
    );
  }
);

await check(
  "correcting ownedPaths does not complete a memo job on file presence",
  () => {
    // The memo exists whatever happens, so presence cannot mean delivered. This
    // is the regression for the bug that briefly hid a real Session D delivery
    // from discovery: the job read completed the moment its path was corrected.
    const plan = buildFactoryPlan({ rootDir: ROOT });
    const job = plan.jobs.find(
      (entry) =>
        entry.jobId === "rcap-wy-published-source-filing-requirements-memo-amendment"
    );
    assert.ok(job);
    assert.deepEqual(job.ownedPaths, [
      "data/record-clearing/legal-design-intake/WY.memo.json"
    ]);
    const memoPath = path.join(ROOT, "data/record-clearing/legal-design-intake/WY.memo.json");
    assert.ok(fs.existsSync(memoPath), "the memo exists regardless of delivery");
    const delivered =
      crypto.createHash("sha256").update(fs.readFileSync(memoPath)).digest("hex") ===
      "1789f299766709081cc98492c25d3641f22ecce75f9449439db54b12319ced3f";
    assert.equal(
      job.status,
      delivered ? "completed" : "ready",
      "completion must follow the delivered digest, not the file's existence"
    );
  }
);

await check(
  "the Kansas project-owner attestation authorizes exactly the nine covered forms",
  () => {
    // This test previously asserted that Kansas stayed fail-closed while a
    // reported grant had no readable scope. The project owner then stated the
    // scope and determined the attestation is controlling. The fact changed, so
    // the assertion changed; what stays constant is that the grant reaches
    // exactly the documents it names and nothing else.
    const index = buildSourceAuthorizationIndex(ROOT);
    const kansas = index.decisions.get("KS");
    assert.ok(kansas);
    assert.equal(
      kansas.decisionJobId,
      "rcap-ks-project-owner-permission-authorization"
    );
    assert.equal(kansas.verdict, "authorized");
    assert.equal(
      kansas.supersedes,
      "rcap-ks-commercial-license",
      "the grant must name the exclusion it supersedes rather than replacing it silently"
    );
    assert.equal(kansas.scopedDocumentIds.size, 9);

    // Covered: authorized. Uncovered: fail-closed, and by the open
    // jurisdiction-level question rather than by silence.
    const covered = authorizationFor(index, {
      jurisdiction: "KS",
      documentId: "KSJC-PETITION-EXPUNGEMENT-CONVICTION-OR-DIVERSION-08-2022"
    });
    assert.equal(covered.generationAllowed, true);
    assert.equal(covered.licenseAdopted, true);
    assert.equal(covered.workerReadAuthorized, true);
    const uncovered = authorizationFor(index, {
      jurisdiction: "KS",
      documentId: "SOME-OTHER-PUBLISHERS-FORM"
    });
    assert.equal(uncovered.generationAllowed, false);
    assert.equal(uncovered.workerReadAuthorized, false);

    // Asking about the jurisdiction without naming a document is a question the
    // scoped decision cannot answer. It must not answer it with a permission,
    // and it must not report Kansas as licence-unresolved either.
    const unnamed = authorizationFor(index, { jurisdiction: "KS" });
    assert.equal(unnamed.verdict, "scoped_decision_document_not_named");
    assert.equal(unnamed.generationAllowed, false);
    assert.equal(
      unnamed.decisionJobId,
      "rcap-ks-project-owner-permission-authorization"
    );

    const grant = JSON.parse(
      fs.readFileSync(
        path.join(
          ROOT,
          "data/record-clearing/production-factory/source-acquisition",
          "rcap-ks-project-owner-permission-authorization.json"
        ),
        "utf8"
      )
    );

    // Honest about its basis. An attestation is not a document and must not
    // read as one: no issuer, signer, date or letter text is asserted.
    assert.equal(grant.provenance.evidenceType, "project_owner_attestation");
    assert.equal(grant.provenance.repositoryCopyAvailable, false);
    assert.equal(grant.provenance.documentHashAvailable, false);
    assert.equal(grant.gates.evidenceFabricated, false);

    // The superseded exclusion and the historical worker decision both survive.
    for (const [file, field, value] of [
      ["rcap-ks-commercial-license.json", "terminalDisposition", "deliberately_excluded_commercial_license"],
      ["rcap-ks-hard-copy-permission-evidence-pending.json", "terminalDisposition", "reported_grant_without_evidence_no_authorization_derived"]
    ]) {
      const retained = JSON.parse(
        fs.readFileSync(
          path.join(
            ROOT,
            "data/record-clearing/production-factory/source-acquisition",
            file
          ),
          "utf8"
        )
      );
      assert.equal(retained[field], value, `${file} must not be rewritten`);
    }
    assert.equal(grant.gates.priorDecisionRewritten, false);
    assert.equal(grant.gates.priorDecisionDeleted, false);
    assert.equal(grant.historicalDecisionPreserved.recordedThen.permissionObtained, false);

    // Permission buys permission. Everything a court or an outside party writes
    // stays outside it, and so does anyone else's form.
    for (const excluded of [
      "filling judicial findings",
      "filling judge signatures",
      "filling clerk fields",
      "filling prosecutor fields",
      "filling court dates",
      "filling service-completion facts",
      "filling outside-party attestations",
      "changing official legal text",
      "claiming endorsement by Kansas",
      "applying this permission to forms issued by another publisher"
    ]) {
      assert.ok(
        grant.boundaries.notGranted.includes(excluded),
        `${excluded} must stay outside the grant`
      );
    }
    assert.equal(grant.gates.judicialFieldsAuthorized, false);
    assert.equal(grant.gates.outsidePartyFieldsAuthorized, false);

    // A licence answer must not disturb evidence.
    assert.equal(grant.receiptTreatment.receiptsDeleted, 0);
    assert.equal(grant.receiptTreatment.receiptsRewritten, 0);
    assert.equal(grant.receiptTreatment.bytesRehashed, false);

    // Runtime is untouched by any of it.
    assert.equal(grant.gates.productionEnabled, false);
    assert.equal(grant.gates.counselAdopted, false);
  }
);

await check(
  "Kansas currentness is owned separately from Kansas permission",
  () => {
    // Two gates that look alike from a distance. Permission answers whether the
    // forms may be reproduced; currentness answers whether these are still the
    // forms. A grant would settle the first and leave the second exactly where
    // it was, so the currentness owner must not depend on the licence.
    const plan = buildFactoryPlan({ rootDir: ROOT });
    const currentness = plan.jobs.find(
      (job) => job.jobId === "rcap-ks-form-currentness-verification"
    );
    assert.ok(currentness, "Kansas must carry a currentness owner");
    assert.equal(currentness.jurisdiction, "KS");
    assert.deepEqual(
      currentness.dependencies,
      [],
      "currentness must not wait on the licence question"
    );
    assert.ok(
      /Permission is not currentness/u.test(currentness.stopCondition),
      "the owner must say that a grant does not make a revision current"
    );
    assert.ok(
      /do not set generationAllowed/u.test(currentness.stopCondition),
      "a currentness owner must not be able to adopt a licence"
    );

    // Nothing Kansas is releasable, whatever was reported.
    for (const job of plan.jobs.filter((entry) => entry.jurisdiction === "KS")) {
      assert.notEqual(job.status, "in_progress");
    }
    const staging = plan.jobs.find(
      (job) => job.jobId === "rcap-ks-staging-promotion"
    );
    assert.equal(staging.status, "blocked");
  }
);

await check(
  "the live Colorado grant authorizes twelve preserved receipts",
  () => {
    const index = buildSourceAuthorizationIndex(ROOT);
    const colorado = index.decisions.get("CO");
    assert.ok(colorado, "Colorado must carry a licence decision");
    assert.equal(colorado.verdict, "authorized");
    assert.equal(
      colorado.decisionJobId,
      "rcap-co-written-permission-authorization"
    );
    assert.equal(
      colorado.supersedes,
      "rcap-co-jdf-family-commercial-license",
      "the grant must name the denial it supersedes rather than replacing it silently"
    );

    // The superseded denial is still in the corpus and still says no.
    const denial = JSON.parse(
      fs.readFileSync(
        path.join(
          ROOT,
          "data/record-clearing/production-factory/source-acquisition",
          "rcap-co-jdf-family-commercial-license.json"
        ),
        "utf8"
      )
    );
    assert.equal(denial.terminalDisposition, "written_permission_required");
    assert.equal(denial.generationAllowed, false);

    // The grant is honest about what backs it. No document was supplied, so no
    // hash is asserted. An authorization must not read as better evidenced than
    // it is.
    const grant = JSON.parse(
      fs.readFileSync(
        path.join(
          ROOT,
          "data/record-clearing/production-factory/source-acquisition",
          "rcap-co-written-permission-authorization.json"
        ),
        "utf8"
      )
    );
    assert.equal(grant.provenance.kind, "project_owner_attestation");
    assert.equal(grant.provenance.evidenceDocumentPresent, false);
    assert.equal(grant.provenance.evidenceDocumentSha256, null);
    assert.equal(grant.gates.evidenceFabricated, false);
    assert.equal(grant.gates.priorDecisionRewritten, false);
    assert.equal(grant.receiptTreatment.receiptsPreserved, 12);
    assert.equal(grant.receiptTreatment.receiptsDeleted, 0);
    assert.equal(grant.receiptTreatment.receiptsRewritten, 0);
    assert.equal(grant.receiptTreatment.bytesRehashed, false);

    // The grant is scoped. Reproduce and prefill only; everything a court or an
    // outside party writes stays outside it.
    for (const excluded of [
      "altering the legal text of a form",
      "sublicensing",
      "resale of blank forms"
    ]) {
      assert.ok(
        grant.authorizedScope.notGranted.includes(excluded),
        `${excluded} must stay outside the grant`
      );
    }
    assert.equal(grant.gates.counselAdoptionRecorded, false);
    assert.equal(grant.gates.packetReadyUnchanged, true);
  }
);

await check("materialization evidence never establishes generation permission", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-source-authorization-"));
  try {
    const index = authorizationFixture(root, {
      "rcap-zz-commercial-license": {
        jobId: "rcap-zz-commercial-license",
        jurisdiction: "ZZ",
        strategyFamily: "commercial_license",
        licenseAdopted: true,
        generationAllowed: true,
        terminalDisposition: "license_adopted"
      },
      "rcap-yy-commercial-license": {
        jobId: "rcap-yy-commercial-license",
        jurisdiction: "YY",
        strategyFamily: "commercial_license",
        licenseAdopted: false,
        generationAllowed: false,
        terminalDisposition: "written_permission_required"
      },
      "rcap-xx-commercial-license": {
        jobId: "rcap-xx-commercial-license",
        jurisdiction: "XX",
        strategyFamily: "commercial_license",
        licenseAdopted: false,
        generationAllowed: false,
        terminalDisposition: "deliberately_excluded_commercial_license",
        excludedDocuments: [{ documentId: "XX-FORM-1" }]
      }
    }, { holdCommercialUse: ["WW"] });

    for (const verdict of [
      "authorized",
      "written_permission_required",
      "deliberately_excluded_commercial_license",
      "license_unresolved",
      "no_license_restriction"
    ]) {
      assert.ok(SOURCE_AUTHORIZATION_VERDICTS.includes(verdict));
    }

    // 1. Materialized plus permission: worker-ready where other gates pass.
    const authorized = authorizationFor(index, { jurisdiction: "ZZ" });
    assert.equal(authorized.verdict, "authorized");
    const okLifecycle = deriveSourceLifecycle({
      receiptVerified: true,
      authorization: authorized
    });
    assert.equal(okLifecycle.workerReady, true);
    assert.equal(okLifecycle.implementationAssignable, true);
    assert.equal(okLifecycle.runtimeEnabled, false, "runtime stays independent");

    // 2. Materialized plus written_permission_required: evidence kept,
    //    readiness withheld. This is Colorado.
    const permissionRequired = authorizationFor(index, { jurisdiction: "YY" });
    assert.equal(permissionRequired.verdict, "written_permission_required");
    const withheld = deriveSourceLifecycle({
      receiptVerified: true,
      authorization: permissionRequired
    });
    assert.deepEqual(
      {
        sourceIdentityExact: withheld.sourceIdentityExact,
        binaryMaterialized: withheld.binaryMaterialized,
        binaryHashVerified: withheld.binaryHashVerified,
        internalEvidenceRetained: withheld.internalEvidenceRetained,
        generationAllowed: withheld.generationAllowed,
        licenseAdopted: withheld.licenseAdopted,
        workerReady: withheld.workerReady,
        implementationAssignable: withheld.implementationAssignable,
        runtimeEnabled: withheld.runtimeEnabled,
        disposition: withheld.disposition,
        blocker: withheld.blocker
      },
      {
        sourceIdentityExact: true,
        binaryMaterialized: true,
        binaryHashVerified: true,
        internalEvidenceRetained: true,
        generationAllowed: false,
        licenseAdopted: false,
        workerReady: false,
        implementationAssignable: false,
        runtimeEnabled: false,
        disposition: "materialized_evidence_generation_permission_required",
        blocker: "written_permission_required"
      }
    );

    // 3. Deliberate commercial exclusion, scoped to named documents.
    const excluded = authorizationFor(index, {
      jurisdiction: "XX",
      documentId: "XX-FORM-1"
    });
    assert.equal(excluded.verdict, "deliberately_excluded_commercial_license");
    const excludedLifecycle = deriveSourceLifecycle({
      receiptVerified: true,
      authorization: excluded
    });
    assert.equal(excludedLifecycle.workerReady, false);
    assert.equal(excludedLifecycle.internalEvidenceRetained, true);

    // 4. Licence required by a recorded hold, no decision: fail closed.
    const unresolved = authorizationFor(index, { jurisdiction: "WW" });
    assert.equal(unresolved.verdict, "license_unresolved");
    const unresolvedLifecycle = deriveSourceLifecycle({
      receiptVerified: true,
      authorization: unresolved
    });
    assert.equal(unresolvedLifecycle.workerReady, false);
    assert.equal(unresolvedLifecycle.sourceIdentityExact, true);

    // 5. Permission granted but the bytes drifted: evidence fails, so does
    //    readiness. Permission never rescues a hash mismatch.
    const drifted = deriveSourceLifecycle({
      receiptVerified: false,
      authorization: authorized
    });
    assert.equal(drifted.workerReady, false);
    assert.equal(drifted.binaryHashVerified, false);

    // 6. Permission revoked after the fact: readiness is withdrawn from the
    //    same receipt, deterministically, with nothing deleted or recopied.
    const before = deriveSourceLifecycle({
      receiptVerified: true,
      authorization: authorized
    });
    const after = deriveSourceLifecycle({
      receiptVerified: true,
      authorization: permissionRequired
    });
    assert.equal(before.workerReady, true);
    assert.equal(after.workerReady, false);
    assert.equal(after.implementationAssignable, false);
    assert.equal(after.binaryHashVerified, before.binaryHashVerified);
    assert.equal(after.internalEvidenceRetained, true);

    // 7. Permission granted later: the same verified receipt becomes eligible
    //    without recopying bytes.
    const restored = deriveSourceLifecycle({
      receiptVerified: true,
      authorization: authorized
    });
    assert.equal(restored.workerReady, true);

    // 8. No decision where no licence question was ever raised: no artificial
    //    blocker. A jurisdiction nobody asked about is not thereby refused.
    const unrestricted = authorizationFor(index, { jurisdiction: "VV" });
    assert.equal(unrestricted.verdict, "no_license_restriction");
    assert.equal(permitsGeneration(unrestricted.verdict), true);

    // A scoped exclusion does not reach a document it does not name, and the
    // jurisdiction-level question decides instead.
    const outOfScope = authorizationFor(index, {
      jurisdiction: "XX",
      documentId: "XX-FORM-UNLISTED"
    });
    assert.equal(outOfScope.verdict, "no_license_restriction");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

await check("retained evidence is auditable but never participant-facing", () => {
  const retention = plan.sourceEvidenceRetention;
  assert.ok(retention);

  // 10. Counts derive from the live receipt set. Nothing asserts 13, and a
  //     missing record is never invented to satisfy an expected total.
  const receiptFiles = fs
    .readdirSync(
      path.join(
        ROOT,
        "data/record-clearing/production-factory/source-materialization-receipts"
      )
    )
    .filter((name) => name.endsWith(".json"))
    .sort();
  assert.equal(retention.totals.receipts, receiptFiles.length);
  assert.equal(retention.records.length, receiptFiles.length);

  // 9. Internal-evidence-only sources stay available to validators and never
  //    reach participant-packet generation.
  const withheld = retention.records.filter(
    (entry) => entry.receiptVerified && !entry.lifecycle.workerReadAuthorized
  );
  assert.ok(withheld.length > 0, "expected at least one withheld source");
  const assignableIdentityKeys = new Set(
    plan.jobs.flatMap((job) =>
      (job.sourceMaterializationInputs ?? []).map(
        (input) => input.sourceIdentityKey
      )
    )
  );
  for (const record of withheld) {
    assert.equal(record.lifecycle.internalEvidenceRetained, true);
    assert.equal(record.lifecycle.generationAllowed, false);
    assert.equal(record.lifecycle.implementationAssignable, false);
    assert.equal(record.lifecycle.runtimeEnabled, false);
    assert.equal(
      assignableIdentityKeys.has(record.sourceIdentityKey),
      false,
      `${record.sourceIdentityKey} is withheld yet reaches an implementation job`
    );
    assert.ok(fs.existsSync(path.join(ROOT, record.receiptPath)));
  }

  // Colorado specifically. This asserted that every Colorado receipt was
  // withheld on written permission, which was the truth for as long as the
  // answer was no. The grant arrived on 2026-08-08 and the assertion became a
  // record of a fact that had expired — the failure mode this suite exists to
  // catch, appearing in the suite itself.
  //
  // What survives the change is the part that was never about the answer: the
  // receipts. Twelve of them, verified, on disk, unedited, through a denial and
  // a grant. Permission moved; evidence did not. That is the invariant worth
  // holding, so it is what is asserted now, alongside whichever verdict is
  // currently live rather than a verdict frozen into the test.
  const colorado = retention.records.filter(
    (entry) => entry.jurisdiction === "CO"
  );
  assert.ok(colorado.length > 0);
  for (const record of colorado) {
    assert.equal(record.receiptVerified, true);
    assert.equal(record.lifecycle.internalEvidenceRetained, true);
    assert.ok(fs.existsSync(path.join(ROOT, record.receiptPath)));
    assert.equal(record.lifecycle.runtimeEnabled, false);
    if (record.authorizationVerdict === "authorized") {
      // Granted. Permission is real and buys exactly permission: the source is
      // still not assignable, because a licence is not a field map.
      assert.equal(record.lifecycle.generationAllowed, true);
      assert.equal(record.lifecycle.workerReadAuthorized, true);
      assert.equal(record.lifecycle.implementationAssignable, false);
      assert.equal(
        record.lifecycle.disposition,
        "materialized_evidence_permitted_pending_non_permission_gates"
      );
    } else {
      assert.equal(record.authorizationVerdict, "written_permission_required");
      assert.equal(record.blocker, "written_permission_required");
      assert.equal(record.lifecycle.generationAllowed, false);
      assert.equal(
        record.lifecycle.disposition,
        "materialized_evidence_generation_permission_required"
      );
    }
  }
  assert.equal(
    retention.totals.byJurisdictionWithheld.CO ?? 0,
    colorado.filter((entry) => !entry.lifecycle.workerReadAuthorized).length,
    "the withheld tally must derive from the live Colorado receipt set"
  );
});


// ---------------------------------------------------------------------------
// Review-lane ownership
//
// One job used to ask a single worker for a page-by-page visual review and a
// completed-output legal review, into one file. Those are different
// competencies and different accountabilities, and one artifact for both meant
// technical approval could read as legal approval.
// ---------------------------------------------------------------------------

await check("technical and legal review are independently owned", () => {
  const technical = plan.jobs.filter(
    (job) => job.strategyFamily === "technical_visual_review"
  );
  const legal = plan.jobs.filter(
    (job) => job.strategyFamily === "completed_output_legal_review"
  );
  assert.ok(technical.length > 0 && legal.length > 0);
  assert.equal(technical.length, legal.length, "every family needs both reads");

  // 1-3. Different paths, and neither may write the other's result.
  const technicalPaths = new Set(technical.flatMap((job) => job.ownedPaths));
  const legalPaths = new Set(legal.flatMap((job) => job.ownedPaths));
  for (const owned of technicalPaths) {
    assert.equal(legalPaths.has(owned), false, owned);
    assert.match(owned, /technical-visual-reviews/u);
  }
  for (const owned of legalPaths) {
    assert.equal(technicalPaths.has(owned), false, owned);
    assert.match(owned, /legal-output-reviews/u);
  }
  for (const job of technical) {
    assert.match(job.stopCondition, /not a legal review/iu);
    assert.equal(
      job.ownedPaths.some((owned) => owned.includes("legal-output-reviews")),
      false
    );
  }
  for (const job of legal) {
    assert.match(job.stopCondition, /not a technical review/iu);
    assert.equal(
      job.ownedPaths.some((owned) =>
        owned.includes("technical-visual-reviews")
      ),
      false
    );
  }

  // 4-6. Neither result advances adoption or readiness, and neither may
  //      record adoption at all.
  for (const job of [...technical, ...legal]) {
    assert.match(job.stopCondition, /do not mark counsel adoption/iu);
    assert.match(job.stopCondition, /packet-ready/iu);
    assert.match(job.stopCondition, /do not enable runtime/iu);
  }
  assert.equal(
    plan.sourceSummary.runtime.normalizedPacketReadyTracks,
    0,
    "a recorded review must not advance packet readiness"
  );

  // 7. Correction-required output blocks the legal read of that output.
  const correctionRequired = new Set(
    plan.trackReconciliation.assignments
      .filter((entry) => entry.currentOutputStatus === "correction_required")
      .map((entry) => entry.correctionJobId)
      .filter(Boolean)
  );
  assert.ok(correctionRequired.size > 0, "expected open corrections");
  for (const correctionJobId of correctionRequired) {
    const implementationJobId = correctionJobId.replace(
      /-technical-review-correction$/u,
      ""
    );
    const legalJob = legal.find(
      (job) => job.jobId === `${implementationJobId}-completed-output-review`
    );
    assert.ok(legalJob, implementationJobId);
    // A legal read never happens against output known defective, so while the
    // correction is open the job is blocked. Once the correction lands and the
    // re-review approves it, the family is back in the adopted design and the
    // standing counsel adoption satisfies it — cancelled, not ready, and never
    // a Session R recommendation nobody wrote. Both are correct; what must
    // never happen is `ready`, which would commission the read regardless.
    assert.ok(
      ["blocked", "cancelled"].includes(legalJob.status),
      `${implementationJobId}: legal review must wait for the corrected packet or be satisfied by standing adoption, not ${legalJob.status}`
    );
  }

  // 12. No two active review jobs own one path.
  const active = plan.jobs.filter((job) =>
    ["ready", "blocked", "in_progress", "planned"].includes(job.status)
  );
  const owners = new Map();
  for (const job of active) {
    for (const owned of job.ownedPaths) {
      const existing = owners.get(owned);
      assert.equal(
        existing === undefined || existing === job.jobId,
        true,
        `${owned} is owned by both ${existing} and ${job.jobId}`
      );
      owners.set(owned, job.jobId);
    }
  }
});

await check("a legacy combined artifact is never counted as legal review", () => {
  const legalDir =
    "data/record-clearing/production-factory/legal-output-reviews/completed-output";
  const technicalDir =
    "data/record-clearing/production-factory/technical-visual-reviews/completed-output";
  const migrated = [
    "rcap-in-custom-pleading",
    "rcap-ms-custom-pleading",
    "rcap-nc-guidance-implementation",
    "rcap-ok-guidance-implementation",
    "rcap-tn-guidance-implementation"
  ];
  for (const implementationJobId of migrated) {
    // 11. The artifact at the legal path is a migration marker, not a review.
    const marker = readJson(`${legalDir}/${implementationJobId}.json`);
    assert.equal(
      marker.schemaVersion,
      "rcap-legacy-combined-review-migration/v1"
    );
    assert.equal(marker.completedOutputLegalReviewPerformed, false);
    assert.equal(marker.technicalOnly, true);
    assert.equal(marker.counselAdopted, false);
    assert.equal(marker.packetReady, false);
    assert.match(marker.originalWorkerBranch, /^rcap-factory\//u);
    assert.match(marker.originalWorkerCommit, /^[0-9a-f]{40}$/u);

    // The technical findings survive in full, under the right owner.
    const technical = readJson(`${technicalDir}/${implementationJobId}.json`);
    assert.equal(technical.reviewKind, "technical_visual_review");
    // A technical reviewer records that it did not do the legal read. Workers
    // have said that as "pending" and as "not_performed_by_this_job"; both mean
    // the same thing, and the assertion is that a technical record never claims
    // the legal read, not which words it declines in.
    assert.ok(
      ["pending", "not_performed_by_this_job"].includes(
        technical.completedOutputLegalReview
      ),
      `technical record must not claim the legal read: ${technical.completedOutputLegalReview}`
    );
    assert.equal(technical.counselAdopted, false);
    assert.equal(technical.packetReady, false);
    assert.equal(technical.productionEnabled, false);
    assert.equal(technical.runtimeStatus, "runtime_disabled");
    // A re-review that replaces a correction-required read records the commit
    // it supersedes rather than one it "originally" produced, which is the more
    // accurate word for what happened. Either field carries it; what matters is
    // that the record names the exact commit it replaces.
    assert.equal(
      technical.provenance.originalWorkerCommit ??
        technical.provenance.supersededWorkerCommit,
      marker.originalWorkerCommit
    );
    assert.ok(Array.isArray(technical.packets) && technical.packets.length > 0);
    // The migrated record keeps its original result until a re-review replaces
    // it. Indiana and Mississippi were corrected and re-reviewed, so their
    // records now read technical_approved — and a replacement must say what it
    // replaced rather than quietly overwriting the history the marker records.
    if (technical.result !== marker.originalTechnicalResult) {
      assert.equal(
        technical.provenance.supersededWorkerCommit,
        marker.originalWorkerCommit,
        "a re-review must name the exact record it supersedes"
      );
      assert.ok(
        typeof technical.provenance.supersededArtifact === "string",
        "a re-review must name the superseded artifact"
      );
    }
  }

  // §4.2 dispositions, read from the migrated records rather than asserted.
  // Read from the records, which is what this check is for. Indiana was
  // corrected, re-reviewed and approved. Mississippi was corrected and
  // re-reviewed and still reads correction_required — the re-review is not a
  // formality and did not clear it, so its legal review stays blocked and the
  // standing counsel adoption does not reach it.
  const expected = {
    "rcap-in-custom-pleading": "technical_approved",
    "rcap-ms-custom-pleading": "correction_required",
    "rcap-ok-guidance-implementation": "technical_approved",
    "rcap-tn-guidance-implementation": "technical_approved",
    "rcap-nc-guidance-implementation": "technical_approved"
  };
  for (const [implementationJobId, result] of Object.entries(expected)) {
    assert.equal(
      readJson(`${technicalDir}/${implementationJobId}.json`).result,
      result,
      implementationJobId
    );
  }
});

await check("an implementation correction reissues rather than competes", () => {
  const corrections = plan.jobs.filter(
    (job) => job.strategyFamily === "implementation_correction"
  );
  assert.ok(corrections.length > 0);
  for (const correction of corrections) {
    const implementationJobId = correction.jobId.replace(
      /-technical-review-correction$/u,
      ""
    );
    const implementation = plan.jobs.find(
      (job) => job.jobId === implementationJobId
    );
    assert.ok(implementation, implementationJobId);
    // Same module and verifier: one owner, not two.
    assert.deepEqual(
      [...correction.ownedPaths].sort(),
      [...implementation.expectedOutputs].sort(),
      `${correction.jobId} must own exactly the implementation's paths`
    );
    // The historical completion stays on the record.
    assert.equal(implementation.status, "completed");
    // Pinned to the evidence the reviewer actually read.
    assert.match(correction.executionNote, /Pinned to the exact evidence/u);
    assert.match(correction.stopCondition, /do not carry the/iu);
    assert.equal(correction.participantPacketProofRequired, true);
  }
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
