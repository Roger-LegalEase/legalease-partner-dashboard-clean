#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildFactoryPlan,
  findOwnedPathOverlaps,
  pathsOverlap,
  validateFactoryPlan
} from "./lib/rcap-factory/index.mjs";
import { compileWorkerPrompt } from "./lib/rcap-factory/prompt.mjs";
import { buildScaffoldPlan } from "./lib/rcap-factory/scaffold.mjs";
import {
  ADOPTION_RECORD_PATHS,
  buildCurrentCounselAdoptionRecords
} from "./lib/rcap-counsel-adoption.mjs";
import { buildFactoryStatus } from "./rcap-factory-status.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
const fileSha256 = (relativePath) =>
  crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(ROOT, relativePath)))
    .digest("hex");

const productionPlan = readJson(
  "planning/record-clearing-100-percent/production-plan.json"
);
const acquisition = readJson(
  "planning/record-clearing-100-percent/acquisition-intelligence/documents.json"
);
const campaigns = readJson(
  "planning/record-clearing-100-percent/acquisition-intelligence/acquisition-campaign.json"
);
const authority = readJson(
  "data/record-clearing/master-library/authority.json"
);
const masterReconciliation = readJson(
  "data/record-clearing/master-library/reconciliation.json"
);
const trackSourceAudit = readJson(
  "data/record-clearing/master-library/track-source-audit.json"
);
const normalizedTracks = readJson(
  "data/record-clearing/legal-design-track-registry.json"
);
const guidanceRereviewQueue = readJson(
  "data/record-clearing/legal-design-guidance-rereview-queue.json"
);
const tranche1 = readJson(
  "data/record-clearing/implementation-tranches/tranche-1.json"
);
const tranche2 = readJson(
  "data/record-clearing/implementation-tranches/tranche-2.json"
);
const tranche2Pins = readJson(
  "data/record-clearing/implementation-tranches/tranche-2-authority-pins.json"
);
const tranche2Review = readJson(
  "data/record-clearing/implementation-tranches/tranche-2-review-manifest.json"
);
const tranche2Visual = readJson(
  "data/record-clearing/implementation-tranches/tranche-2-visual-review.json"
);
const tranche2Recommendation = readJson(
  "data/record-clearing/implementation-tranches/tranche-2-legal-output-recommendation.json"
);
const tranche3 = readJson(
  "data/record-clearing/implementation-tranches/tranche-3.json"
);
const tranche3Pins = readJson(
  "data/record-clearing/implementation-tranches/tranche-3-authority-pins.json"
);
const tranche3Review = readJson(
  "data/record-clearing/implementation-tranches/tranche-3-review-manifest.json"
);
const tranche3Visual = readJson(
  "data/record-clearing/implementation-tranches/tranche-3-visual-review.json"
);
const tranche3Recommendation = readJson(
  "data/record-clearing/implementation-tranches/tranche-3-legal-output-recommendation.json"
);
const georgiaFactoryReview = readJson(
  "data/record-clearing/production-factory/review-manifests/rcap-ga-custom-pleading.json"
);
const tranche4 = readJson(
  "data/record-clearing/implementation-tranches/tranche-4.json"
);
const tranche4Review = readJson(
  "data/record-clearing/implementation-tranches/tranche-4-review-manifest.json"
);
const tranche4Visual = readJson(
  "data/record-clearing/implementation-tranches/tranche-4-visual-review.json"
);
const tranche5 = readJson(
  "data/record-clearing/implementation-tranches/tranche-5.json"
);
const tranche5Review = readJson(
  "data/record-clearing/implementation-tranches/tranche-5-review-manifest.json"
);
const tranche5Recommendation = readJson(
  "data/record-clearing/implementation-tranches/tranche-5-legal-output-recommendation.json"
);
const dcFactoryReview = readJson(
  "data/record-clearing/production-factory/review-manifests/rcap-dc-custom-pleading.json"
);
const arkansasReconciliation = readJson(
  "data/record-clearing/production-factory/source-acquisition/rcap-ar-in-repo-identity-reconciliation-acic.json"
);
const arkansasPublicGaps = readJson(
  "data/record-clearing/production-factory/source-acquisition/rcap-ar-public-official-download-acic-gaps.json"
);
const alabamaCr65 = readJson(
  "data/record-clearing/production-factory/source-acquisition/rcap-al-in-repo-identity-reconciliation-cr-65.json"
);
const georgiaJailGuidance = readJson(
  "data/record-clearing/production-factory/guidance-specifications/ga-jail-k2-process-guidance-3.json"
);
const customPleadingAdoption = readJson(ADOPTION_RECORD_PATHS[0]);
const officialAcroformAdoption = readJson(ADOPTION_RECORD_PATHS[1]);
const expectedAdoptions = await buildCurrentCounselAdoptionRecords({
  rootDir: ROOT
});
const canonicalParentRecords = fs
  .readdirSync(
    path.join(ROOT, "planning/record-clearing-100-percent/jobs"),
    { withFileTypes: true }
  )
  .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
  .map((entry) => ({
    path: `planning/record-clearing-100-percent/jobs/${entry.name}`,
    data: readJson(`planning/record-clearing-100-percent/jobs/${entry.name}`)
  }))
  .sort((left, right) => left.data.jobId.localeCompare(right.data.jobId));
const staticMarylandJob = readJson(
  "planning/record-clearing-100-percent/jobs/IMP-OF-01-md-district-court-form-family.json"
);
const reviewJob = readJson(
  "planning/record-clearing-100-percent/jobs/REV-02-official-acroform-family-review.json"
);
const adoptionJob = readJson(
  "planning/record-clearing-100-percent/jobs/ADOPT-02-official-acroform-family-adoption.json"
);
const stagingJob = readJson(
  "planning/record-clearing-100-percent/jobs/STG-01-staging-promotion-partner-priority.json"
);
const productionJob = readJson(
  "planning/record-clearing-100-percent/jobs/PROD-02-production-promotion-wave-1.json"
);

const factoryPlan = buildFactoryPlan({ rootDir: ROOT });
const factoryValidation = validateFactoryPlan(factoryPlan);
assert.equal(factoryValidation.ok, true, factoryValidation.issues.join("\n"));
assert.deepEqual(findOwnedPathOverlaps(factoryPlan.jobs), []);
assert.equal(factoryPlan.jobs.length, 197);
assert.equal(
  factoryPlan.jobs.filter((entry) => entry.status === "ready").length,
  68
);
assert.equal(
  factoryPlan.jobs.filter((entry) => entry.status === "blocked").length,
  116
);
assert.equal(
  factoryPlan.jobs.filter((entry) => entry.status === "completed").length,
  11
);
assert.equal(
  factoryPlan.jobs.filter((entry) => entry.status === "in_progress").length,
  2
);
assert.equal(
  productionPlan.factoryQueueReconciliation.jobs,
  factoryPlan.jobs.length
);
assert.equal(
  productionPlan.factoryQueueReconciliation.ready,
  factoryPlan.jobs.filter((entry) => entry.status === "ready").length
);
assert.equal(
  productionPlan.factoryQueueReconciliation.blocked,
  factoryPlan.jobs.filter((entry) => entry.status === "blocked").length
);
assert.equal(
  productionPlan.factoryQueueReconciliation.completed,
  factoryPlan.jobs.filter((entry) => entry.status === "completed").length
);
assert.equal(
  productionPlan.factoryQueueReconciliation.inProgress,
  factoryPlan.jobs.filter((entry) => entry.status === "in_progress").length
);
assert.deepEqual(
  productionPlan.factoryQueueReconciliation.byLane,
  Object.fromEntries(
    factoryPlan.lanes.map((entry) => [entry.lane, entry.jobIds.length])
  )
);

assert.equal(canonicalParentRecords.length, 72);
assert.equal(
  new Set(canonicalParentRecords.map(({ data }) => data.jobId)).size,
  72
);
assert.deepEqual(
  [...new Set(canonicalParentRecords.map(({ data }) => data.wave))].sort(),
  [0, 1, 2, 3, 4, 5, 6, 7]
);
assert.equal(
  new Set(canonicalParentRecords.map(({ data }) => data.lane)).size,
  11
);
assert.equal(factoryPlan.canonicalPlan.parentJobs, 72);
assert.equal(factoryPlan.parentJobReconciliation.compiledChildJobs, 197);
assert.equal(factoryPlan.parentJobReconciliation.childrenMappedExactlyOnce, 197);
assert.equal(factoryPlan.parentJobReconciliation.unmappedChildren, 0);
assert.equal(factoryPlan.parentJobReconciliation.unknownParentReferences, 0);
assert.deepEqual(
  factoryPlan.canonicalPlan.childMappingPolicy,
  productionPlan.factoryQueueReconciliation.canonicalParentMappingPolicy
);

const canonicalParentById = new Map(
  canonicalParentRecords.map((record) => [record.data.jobId, record])
);
for (const child of factoryPlan.jobs) {
  const parent = canonicalParentById.get(child.parentJobId);
  assert.ok(parent, `${child.jobId}: unknown canonical parent ${child.parentJobId}`);
  assert.equal(child.canonicalWave, parent.data.wave, child.jobId);
  assert.equal(child.canonicalLane, parent.data.lane, child.jobId);
  assert.ok(child.requiredInputs.includes(parent.path), child.jobId);
}
for (const child of factoryPlan.jobs.filter((entry) =>
  [
    "custom_pleading",
    "acroform_fill",
    "flat_pdf_overlay",
    "composed_route",
    "guidance_implementation"
  ].includes(entry.lane)
)) {
  assert.equal(child.participantPacketProofRequired, true, child.jobId);
  assert.ok(
    child.expectedOutputs.includes(child.regressionVerifier) ||
      child.integrationOwnedOutputs.includes(child.regressionVerifier),
    child.jobId
  );
  assert.ok(
    child.focusedValidation.includes(`node ${child.regressionVerifier}`),
    child.jobId
  );
}
for (const child of factoryPlan.jobs.filter(
  (entry) =>
    entry.strategyFamily === "official_pdf_fill" &&
    ["planned", "ready", "blocked", "in_progress"].includes(entry.status)
)) {
  assert.equal(child.status, "blocked", child.jobId);
  assert.ok(child.sourceMaterializationInputs.length > 0, child.jobId);
  assert.ok(
    child.sourceMaterializationInputs.every(
      (input) =>
        input.materializationState === "binary_materialization_required" &&
        input.workerReadiness === "binary_materialization_required"
    ),
    child.jobId
  );
}
const paNormalization = factoryPlan.jobs.find(
  (entry) => entry.jobId === "rcap-pa-legal-design-normalization"
);
assert.equal(paNormalization.status, "in_progress");
assert.equal(
  paNormalization.normalizationReadiness.readinessState,
  "normalization_in_progress"
);
assert.equal(paNormalization.assignmentClaim.ownerSession, "SESSION_B");
const remainingNormalizations = factoryPlan.jobs.filter(
  (entry) =>
    /-legal-design-normalization$/.test(entry.jobId) &&
    entry.jurisdiction !== "PA"
);
assert.equal(remainingNormalizations.length, 24);
assert.ok(
  remainingNormalizations.every(
    (entry) =>
      entry.status === "blocked" &&
      entry.normalizationReadiness.readinessState ===
        "legal_review_materialization_required" &&
      entry.normalizationReadiness.controllingReviewStatus ===
        "authority_asset_known" &&
      /^[0-9a-f]{64}$/.test(
        entry.normalizationReadiness.controllingReviewSha256
      ) &&
      entry.dependencies.includes(
        "rcap-nationwide-normalization-readiness-foundation"
      )
  )
);
assert.deepEqual(factoryPlan.normalizationReadiness, {
  expectedJurisdictions: 24,
  representedExactlyOnce: 24,
  bundlesReceived: 0,
  readyForNormalization: 0,
  blocked: 24,
  byReadinessState: {
    legal_review_materialization_required: 24
  }
});
assert.equal(
  factoryPlan.jobs.find(
    (entry) =>
      entry.jobId ===
      "rcap-nationwide-normalization-readiness-foundation"
  ).status,
  "in_progress"
);
assert.equal(
  factoryPlan.jobs.find(
    (entry) =>
      entry.jobId === "rcap-nationwide-source-materialization-contract"
  ).status,
  "completed"
);

const normalizedKeys = normalizedTracks.tracks
  .map((track) => `${track.jurisdiction}:${track.trackId}`)
  .sort();
assert.equal(normalizedKeys.length, 250);
assert.equal(new Set(normalizedKeys).size, 250);
const trackById = new Map(
  normalizedTracks.tracks.map((track) => [track.trackId, track])
);
assert.equal(trackById.size, 250, "Normalized track IDs must be globally unique.");
const parentTrackKeys = canonicalParentRecords.flatMap(({ data }) =>
  (data.tracks ?? []).map((trackId) => {
    const track = trackById.get(trackId);
    assert.ok(track, `${data.jobId}: invented canonical track ${trackId}`);
    return `${track.jurisdiction}:${trackId}`;
  })
);
const authorityOnlyKeys = canonicalParentRecords.flatMap(({ data }) =>
  (data.authorityOnlyRoutes ?? []).map((trackId) => {
    const track = trackById.get(trackId);
    assert.ok(track, `${data.jobId}: invented authority-only track ${trackId}`);
    return `${track.jurisdiction}:${trackId}`;
  })
);
const completedMississippiKeys = tranche1.selectedTracks.map(
  (track) => `${tranche1.jurisdiction}:${track.trackId}`
);
assert.equal(parentTrackKeys.length, 240);
assert.equal(authorityOnlyKeys.length, 5);
assert.equal(completedMississippiKeys.length, 5);
const canonicalTrackPartition = [
  ...parentTrackKeys,
  ...authorityOnlyKeys,
  ...completedMississippiKeys
].sort();
assert.equal(canonicalTrackPartition.length, 250);
assert.equal(new Set(canonicalTrackPartition).size, 250);
assert.deepEqual(canonicalTrackPartition, normalizedKeys);

for (const child of factoryPlan.jobs) {
  for (const trackId of child.trackIds) {
    const track = trackById.get(trackId);
    assert.ok(track, `${child.jobId}: invented compiled track ${trackId}`);
    assert.equal(track.jurisdiction, child.jurisdiction, child.jobId);
  }
}
assert.deepEqual(
  productionPlan.factoryQueueReconciliation.byAuthorityFamily,
  Object.fromEntries(
    [...new Set(
      factoryPlan.jobs
        .filter((entry) => entry.lane === "source_acquisition")
        .map((entry) => entry.strategyFamily)
    )]
      .sort()
      .map((family) => [
        family,
        factoryPlan.jobs.filter(
          (entry) =>
            entry.lane === "source_acquisition" &&
            entry.strategyFamily === family
        ).length
      ])
  )
);

assert.deepEqual(productionPlan.integratedCommits, {
  factory: "333f39604b505c670b381f23f33a3132f69721eb",
  productionPlan: "071dcad3f622869c9c2a3a2ace18038bcd657038",
  acquisitionIntelligence: "052d91cd5834d1c93b5138db72d64cd9c9f0cde1",
  mississippiTranche1: "1fd2e122c30f7608817910583084e3b068bd5940",
  packetRoutePromotionGuard: "8df94fbaa66c06bf0ba677ee4f5fb417ad08cdc8",
  marylandTranche2: "e209f3469b1b426d30d6d05550e84dfb0b24c147",
  templateFamilyHashInfrastructure: "e89416d74f3f5653abb4e561704d5874fa14ef24",
  arkansasAcicIdentityReconciliation: "2784e3c85ba624c2f94dd8beb749fc0e9fd5e50f",
  georgiaTranche3: "080ed5d94e92442069b4000511f04194f734f36d",
  trackPromotionContract: "33ff72c8514d289152caa0ed846db0cdd1f79502",
  arkansasPublicAcicGaps: "d19f7ff100d6e240cc3ffb00ecfcdab1477527c3",
  alabamaCr65IdentityReconciliation: "62be8a3822e42f3f64533ac64820135f20c84e72",
  georgiaJailGuidanceSpecification: "ca5958590d1b52713c4489d58617586e82f33629",
  dcCustomPleadings: "a25306af0e095faac1ce4d36c60b0f04c9221b31",
  illinoisCustomPleadings: "20379e6e8f7fd41e1fda6714ab05a06183123368",
  sourceMaterializationContract: "a3b28545af4e8953146a97907d22a28c7aec6726"
});
assert.deepEqual(productionPlan.integrationEquivalents, {
  factory: "381abd95efd5370ef592e5ba25bc3368008f0330",
  productionPlan: "c18b9b91539ead0d6ff195520aef8e252d472f0d",
  acquisitionIntelligence: "e767098d8f7c86f1c02ff1427d73a31947209370",
  marylandTranche2: "4ccf8ce2f96b5aef19dc6e53715db35cc685776a",
  templateFamilyHashInfrastructure: "3b692331af5cc9b61051f8cebead28560665a63f",
  arkansasAcicIdentityReconciliation: "3259be303a82d7d27e72f84e31c72cdb15a7d94c",
  georgiaTranche3: "037d1a2ce2bccd0dffc243e213a26c5019865561",
  trackPromotionContract: "e5669f0931d2a54ba5c75d9eaf7138c02c049ecf",
  arkansasPublicAcicGaps: "de1402fe824797434fcb979f565d2ba0e139cc6e",
  alabamaCr65IdentityReconciliation: "845755cd5fe979c0ea5a50e2117aec06cc396b93",
  georgiaJailGuidanceSpecification: "05f306208b5345abac4952f784f762cc87481dcc",
  dcCustomPleadings: "7dd99311a44c871e52a0bee114cce25c5ef39584",
  illinoisCustomPleadings: "16290faef1865f48448a43baaa8728a5317384c1",
  sourceMaterializationContract: "37cb49b645bee42739d7dea32960a45b1927689f"
});
assert.equal(authority.edition, "1.2");
assert.equal(masterReconciliation.authority.edition, "1.2");
assert.equal(
  masterReconciliation.authority.archiveSha256,
  authority.retention.archiveSha256
);
assert.equal(
  masterReconciliation.authority.archiveSha256MatchesAuthorityRecord,
  true
);
assert.deepEqual(masterReconciliation.integrity.mismatches, []);
assert.deepEqual(masterReconciliation.integrity.missing, []);
assert.deepEqual(masterReconciliation.integrity.uncoveredFiles, []);
assert.equal(
  masterReconciliation.coverage.manifestRowsReconcileWithEditionSummary,
  true
);
assert.equal(masterReconciliation.coverage.stateCoverageReconciles.reconciles, true);
assert.equal(masterReconciliation.runtimePosture.assetsWithGenerationAllowed, 0);
assert.equal(masterReconciliation.runtimePosture.resolverSelectableAssets, 0);
assert.equal(trackSourceAudit.totals.tracksAudited, 250);
assert.equal(trackSourceAudit.totals.tracksCleared, 87);
assert.equal(trackSourceAudit.totals.tracksBlocked, 163);
assert.deepEqual(productionPlan.readinessMetrics.current, {
  authorityCleared: 87,
  authorityBlocked: 163,
  sourcePinned: 43,
  implementationProof: 17,
  finalDisposition: 0
});
assert.deepEqual(productionPlan.readinessMetrics.preMarylandBaseline, {
  authorityCleared: 87,
  authorityBlocked: 163,
  sourcePinned: 31,
  implementationProof: 5,
  finalDisposition: 0
});

const acquisitionIds = acquisition.documents.map((entry) => entry.acquisitionId);
assert.equal(acquisitionIds.length, 109);
assert.equal(new Set(acquisitionIds).size, 109);
assert.equal(
  acquisition.documents.reduce(
    (total, entry) => total + (entry.evidence?.length ?? 0),
    0
  ),
  313
);
assert.equal(campaigns.campaigns.length, 32);
assert.equal(
  acquisition.documents.filter((entry) => entry.alreadyRetainedAs).length,
  18
);
assert.deepEqual(acquisition.totals.byStatus, {
  public_official_download: 60,
  official_download_automation_blocked: 20,
  official_request_required: 5,
  official_index_only: 0,
  local_court_selection_required: 1,
  commercial_license_required: 13,
  identity_unresolved: 4,
  not_required_custom_pleading: 3,
  not_required_no_filing_route: 2,
  superseded: 1,
  excluded: 0
});

assert.equal(factoryPlan.acquisitionReconciliation.researchedDocuments, 109);
assert.equal(factoryPlan.acquisitionReconciliation.dispositionedDocuments, 109);
assert.equal(factoryPlan.acquisitionReconciliation.evidenceRecords, 313);
assert.equal(factoryPlan.acquisitionReconciliation.duplicateAssignments, 0);
assert.equal(factoryPlan.acquisitionReconciliation.omissions, 0);
assert.equal(
  new Set(
    factoryPlan.acquisitionReconciliation.records.map(
      (entry) => entry.acquisitionId
    )
  ).size,
  109
);

const job = (jobId) => {
  const value = factoryPlan.jobs.find((entry) => entry.jobId === jobId);
  assert.ok(value, `Missing factory job ${jobId}`);
  return value;
};
const expectJob = (jobId, family, documentCount) => {
  const value = job(jobId);
  assert.equal(value.strategyFamily, family, jobId);
  assert.equal(value.acquisitionIds?.length ?? 0, documentCount, jobId);
  return value;
};

assert.equal(
  expectJob(
    "rcap-ar-in-repo-identity-reconciliation-acic",
    "in_repo_identity_reconciliation",
    17
  ).trackIds.length,
  11
);
assert.equal(job("rcap-ar-in-repo-identity-reconciliation-acic").status, "completed");
assert.equal(
  job("rcap-ar-in-repo-identity-reconciliation-acic").completionCommit,
  "2784e3c85ba624c2f94dd8beb749fc0e9fd5e50f"
);
assert.equal(arkansasReconciliation.acquisitionIds.length, 17);
assert.equal(new Set(arkansasReconciliation.acquisitionIds).size, 17);
assert.equal(arkansasReconciliation.downloadedSourceCount, 0);
assert.equal(arkansasReconciliation.totals.reconciled, 17);
assert.equal(arkansasReconciliation.totals.retainedArtifactsUsed, 18);
assert.equal(arkansasReconciliation.totals.redundantDownloadsEliminated, 17);
assert.equal(arkansasReconciliation.totals.unresolved, 0);
assert.match(arkansasReconciliation.method.byteVerification, /carried forward/);
assert.deepEqual(
  expectJob(
    "rcap-ar-public-official-download-acic-gaps",
    "public_official_download",
    3
  ).acquisitionIds,
  [
    "acquire:AR:acic-order-veterans-court",
    "acquire:AR:acic-petition-dismiss-and-seal-first-offenders",
    "acquire:AR:acic-uniform-petition-to-seal"
  ]
);
assert.match(
  job("rcap-ar-public-official-download-acic-gaps").stopCondition,
  /preserve and bind the already-retained felony half/
);
assert.match(
  job("rcap-ar-public-official-download-acic-gaps").stopCondition,
  /Retrieve and hash only the missing misdemeanor half/
);
assert.equal(job("rcap-ar-public-official-download-acic-gaps").status, "completed");
assert.equal(arkansasPublicGaps.downloadedSourceCount, 3);
assert.equal(arkansasPublicGaps.method.issuerContactsMade, 0);
assert.equal(arkansasPublicGaps.totals.retainedIdentitiesPreserved, 1);
assert.equal(arkansasPublicGaps.totals.revisionsUnconfirmed, 1);
const mixedFooterJob = job("rcap-ar-acic-mixed-footer-revision-adjudication");
assert.equal(mixedFooterJob.status, "blocked");
assert.equal(mixedFooterJob.downloadedSourceCount, 0);
assert.deepEqual(mixedFooterJob.trackIds, ["ar-act346"]);
assert.equal(
  expectJob(
    "rcap-md-in-repo-identity-reconciliation-cc-dc-cr-072",
    "in_repo_identity_reconciliation",
    4
  ).trackIds.length,
  5
);
assert.equal(
  expectJob(
    "rcap-al-in-repo-identity-reconciliation-cr-65",
    "in_repo_identity_reconciliation",
    1
  ).trackIds.length,
  8
);
assert.equal(job("rcap-al-in-repo-identity-reconciliation-cr-65").status, "completed");
assert.equal(job("rcap-al-in-repo-identity-reconciliation-cr-65").model, "codex");
assert.match(
  job("rcap-al-in-repo-identity-reconciliation-cr-65").executionNote,
  /user-directed override/
);
assert.equal(alabamaCr65.downloadedSourceCount, 0);
assert.equal(alabamaCr65.totals.retainedArtifactsUsed, 1);
assert.equal(alabamaCr65.totals.componentsBound, 17);
assert.equal(alabamaCr65.totals.tracksBound, 8);
assert.match(alabamaCr65.method.byteVerification, /Not re-measured/);
assert.equal(
  expectJob(
    "rcap-hi-in-repo-identity-reconciliation-hcjdc-159",
    "in_repo_identity_reconciliation",
    2
  ).trackIds.length,
  8
);
assert.equal(
  expectJob(
    "rcap-fl-public-official-download-fdle-fac-supersession",
    "public_official_download",
    4
  ).status,
  "ready"
);
assert.equal(
  job("rcap-il-in-repo-identity-reconciliation-rule-298").trackIds.length,
  9
);
assert.equal(
  expectJob("rcap-ks-commercial-license", "commercial_license", 9).stopCondition.includes(
    "never relabel the route as custom pleading"
  ),
  true
);
assert.equal(
  expectJob("rcap-in-commercial-license", "commercial_license", 4).trackIds.length,
  5
);
assert.match(
  job("rcap-in-commercial-license").stopCondition,
  /four logical dossier identities resolve to two shared licensed PDF bundles/
);
assert.match(
  job("rcap-ks-source-identity-resolution-criminal-cover-sheet").stopCondition,
  /does not clear the Kansas Judicial Council commercial-license gate/
);
assert.equal(
  expectJob("rcap-mo-direct-issuer-request", "direct_issuer_request", 4)
    .acquisitionIds.length,
  4
);
assert.equal(
  expectJob(
    "rcap-mo-official-download-automation-blocked",
    "official_download_automation_blocked",
    3
  ).stopCondition.includes("403/WAF"),
  true
);
assert.equal(
  expectJob(
    "rcap-mo-superseded-source-replacement",
    "superseded_source_replacement",
    1
  ).acquisitionIds[0],
  "acquire:MO:fi-05"
);
assert.deepEqual(
  expectJob("rcap-de-direct-issuer-request", "direct_issuer_request", 1)
    .acquisitionIds,
  ["acquire:DE:de-sbi-mandatory-expungement-application"]
);
assert.equal(
  expectJob(
    "rcap-ca-local-form-scope-correction-sdsc-crm-307",
    "local_form_scope_correction",
    1
  ).stopCondition.includes("Do not promote a local form statewide"),
  true
);

const identityJobs = factoryPlan.jobs
  .filter(
    (entry) =>
      entry.strategyFamily === "source_identity_resolution" &&
      (entry.acquisitionIds?.length ?? 0) > 0
  )
  .map((entry) => entry.jobId)
  .sort();
assert.deepEqual(identityJobs, [
  "rcap-co-source-identity-resolution-jdf-417-order",
  "rcap-fl-source-identity-resolution-rule-3-989-continuation",
  "rcap-ia-source-identity-resolution-certification-of-service",
  "rcap-ks-source-identity-resolution-criminal-cover-sheet"
]);

const publication = job(
  "rcap-nationwide-master-library-edition-1-3-publication"
);
assert.equal(publication.executionScope, "captain");
assert.equal(publication.status, "blocked");
assert.ok(
  publication.forbiddenPaths.includes(
    "data/record-clearing/master-library/edition-1-2"
  )
);

assert.equal(factoryPlan.trackReconciliation.normalizedTracks, 250);
assert.equal(factoryPlan.trackReconciliation.representedExactlyOnce, 250);
assert.equal(factoryPlan.trackReconciliation.implementationComplete, 19);
assert.equal(factoryPlan.trackReconciliation.pendingProductionJob, 231);
assert.equal(
  productionPlan.baselineVerification.confirmed.implementedTracksAwaitingReview,
  2
);
assert.equal(
  productionPlan.baselineVerification.confirmed.tracksAwaitingCounselAdoption,
  4
);
assert.equal(
  productionPlan.baselineVerification.confirmed.legalRecommendationCompleteTracks,
  19
);
assert.equal(
  productionPlan.baselineVerification.confirmed.counselAdoptedTracks,
  15
);
assert.equal(new Set(factoryPlan.trackReconciliation.assignments.map(
  (entry) => `${entry.jurisdiction}:${entry.trackId}`
)).size, 250);

const completed = factoryPlan.trackReconciliation.assignments.filter(
  (entry) => entry.disposition === "implementation_complete"
);
assert.equal(completed.filter((entry) => entry.jurisdiction === "MS").length, 5);
assert.equal(completed.filter((entry) => entry.jurisdiction === "GA").length, 9);
assert.deepEqual(
  completed
    .filter((entry) => entry.jurisdiction === "MD")
    .map((entry) => entry.trackId),
  ["md_second_chance_shielding"]
);
const activeStatuses = new Set(["planned", "ready", "blocked", "in_progress"]);
for (const completedTrack of completed) {
  assert.equal(
    factoryPlan.jobs.some(
      (entry) =>
        activeStatuses.has(entry.status) &&
        [
          "custom_pleading",
          "acroform_fill",
          "flat_pdf_overlay",
          "composed_route",
          "guidance_implementation"
        ].includes(entry.lane) &&
        entry.jurisdiction === completedTrack.jurisdiction &&
        entry.trackIds.includes(completedTrack.trackId)
    ),
    false,
    `${completedTrack.jurisdiction}:${completedTrack.trackId}`
  );
}
assert.equal(tranche1.implementationStatus, "implemented_and_internally_proved");
assert.equal(tranche2.implementationStatus, "implemented_and_internally_proved");
assert.equal(tranche3.implementationStatus, "implemented_and_internally_proved");
assert.deepEqual(
  tranche2Pins.sourceRelationshipPinsWritten.map((entry) => ({
    documentId: entry.officialFormId,
    sha256: entry.sha256
  })),
  [
    {
      documentId: "CC-DC-CR-148",
      sha256: "abcafbc298d56937ad41ba44675147942b1ab540325898917efafed3f5b43e3f"
    },
    {
      documentId: "MDJ-008",
      sha256: "42510792803b979974b3967dfd0f871271e7518cf64e226d5a80e22b67a6e369"
    }
  ]
);
assert.deepEqual(
  tranche2Review.samplePackets.map((entry) => entry.assembledSha256),
  [
    "52481ba715e9edba96d9196e01b5cc18578b0d713829b13b174f102e902b49c0",
    "46e87678153f74c26559deca00b6f3af776996539d8200f291533ad1113b5c81",
    "0c926ced39bafb23cf8062d72bf3088ff75a9dc213707ca9e1f7f7970a08b853",
    "37095031a18fc4c1cb6b15581c5767ac178327ef36455ee5b06a0e16258f6914"
  ]
);
assert.ok(tranche2Review.samplePackets.every((entry) => entry.assembledPageCount === 6));
assert.equal(tranche2Review.technicalResult, "passed");
assert.deepEqual(tranche2Review.technicalDetail, {
  assembledPacketsGenerated: 4,
  boundaryFixturesStopped: 9,
  thirdPartyFieldsWritten: 0,
  deterministic: true,
  unresolvedIssues: 0
});
assert.equal(tranche2Review.thirdPartyOwnershipFixture.injectedFactKeys, 22);
assert.equal(tranche2Visual.result, "passed_no_unresolved_defects");
assert.equal(tranche2Visual.pagesRendered, 24);
assert.equal(tranche2Visual.pagesInspected, 24);
assert.equal(tranche2Visual.pagesInspectedDirectlyAsImages, 8);
assert.equal(tranche2Visual.unresolvedDefects.length, 0);
assert.equal(
  tranche2Recommendation.recommendations[0].status,
  "recommended_for_counsel_adoption"
);
assert.equal(tranche2Recommendation.humanLegalReviewStatus, "awaiting_counsel_adoption");
assert.equal(tranche2Review.runtimeStatus, "runtime_disabled");
assert.equal(tranche2Review.packetReady, 0);
assert.equal(tranche2Review.enabledJurisdictions, 0);
assert.equal(staticMarylandJob.status, "completed");
assert.equal(
  staticMarylandJob.completedAtCommit,
  "e209f3469b1b426d30d6d05550e84dfb0b24c147"
);
assert.deepEqual(staticMarylandJob.tracks, ["md_second_chance_shielding"]);
const implementationLanes = new Set([
  "custom_pleading",
  "acroform_fill",
  "flat_pdf_overlay",
  "composed_route",
  "guidance_implementation"
]);
const completedMarylandChild = job("rcap-md-second-chance-shielding-completed");
assert.equal(completedMarylandChild.status, "completed");
assert.equal(
  completedMarylandChild.parentJobId,
  "IMP-OF-01-md-district-court-form-family"
);
assert.deepEqual(completedMarylandChild.trackIds, ["md_second_chance_shielding"]);
const activeMarylandImplementation = factoryPlan.jobs.filter(
  (entry) =>
    entry.jurisdiction === "MD" &&
    implementationLanes.has(entry.lane) &&
    ["planned", "ready", "blocked", "in_progress"].includes(entry.status)
);
assert.deepEqual(
  activeMarylandImplementation.map((entry) => entry.jobId),
  ["rcap-md-guidance-implementation"]
);
assert.deepEqual(activeMarylandImplementation[0].trackIds, [
  "md_10103_1_automatic",
  "md_10103_legacy_police",
  "md_10104_pre_service",
  "md_10105_1_automatic",
  "md_10112_dpscs_cannabis"
]);
const forbiddenMarylandRegenerationTracks = new Set([
  "md_second_chance_shielding",
  ...staticMarylandJob.authorityOnlyRoutes
]);
for (const entry of activeMarylandImplementation) {
  assert.equal(
    entry.trackIds.some((trackId) => forbiddenMarylandRegenerationTracks.has(trackId)),
    false,
    entry.jobId
  );
}

const georgiaTrackIds = tranche3.selectedTracks
  .map((entry) => entry.trackId)
  .sort();
assert.equal(georgiaTrackIds.length, 9);
assert.equal(new Set(georgiaTrackIds).size, 9);
assert.deepEqual(
  tranche3Pins.tracks.map((entry) => entry.trackId).sort(),
  georgiaTrackIds
);
assert.equal(tranche3Review.implementedTrackCount, 9);
assert.equal(tranche3Review.samplePackets.length, 9);
assert.equal(tranche3Review.assembledPageCount, 69);
assert.equal(
  tranche3Review.samplePackets.reduce(
    (total, entry) => total + entry.assembledPageCount,
    0
  ),
  69
);
assert.ok(
  tranche3Review.samplePackets.every((entry) =>
    /^[0-9a-f]{64}$/.test(entry.assembledSha256)
  )
);
assert.equal(tranche3Review.boundaryFixtures.length, 9);
const georgiaJailStop = tranche3Review.boundaryFixtures.find(
  (entry) => entry.trackId === "ga-jail-k2"
);
assert.deepEqual(
  {
    expected: georgiaJailStop.expected,
    outcome: georgiaJailStop.outcome,
    detail: georgiaJailStop.detail,
    passed: georgiaJailStop.passed
  },
  {
    expected: "track_unavailable",
    outcome: "track_unavailable",
    detail: "ga-jail-k2-process-guidance-3",
    passed: true
  }
);
assert.equal(tranche3Review.technicalReview.passed, true);
assert.equal(tranche3Visual.result, "passed_no_unresolved_defects");
assert.equal(tranche3Visual.pagesRendered, 69);
assert.equal(tranche3Visual.pagesInspected, 69);
assert.equal(tranche3Recommendation.humanLegalReviewStatus, "awaiting_counsel_adoption");
assert.ok(
  tranche3Recommendation.recommendations.every(
    (entry) => entry.status === "recommended_for_counsel_adoption"
  )
);
assert.deepEqual(
  tranche3Recommendation.questionsForCounsel.map((entry) => entry.id),
  [
    "filing-fee-and-waiver",
    "combined-restriction-and-sealing-motion",
    "municipal-court-reach",
    "otn-absent-at-generation",
    "balancing-posture",
    "hearing-request-in-the-alternative"
  ]
);
assert.equal(tranche3.runtimeStatus, "runtime_disabled");
assert.equal(tranche3.packetReady, false);
assert.equal(tranche3.generationAllowed, false);
assert.equal(tranche3.jurisdictionEnabled, false);
assert.deepEqual(
  customPleadingAdoption,
  expectedAdoptions.get(ADOPTION_RECORD_PATHS[0])
);
assert.deepEqual(
  officialAcroformAdoption,
  expectedAdoptions.get(ADOPTION_RECORD_PATHS[1])
);
assert.equal(customPleadingAdoption.status, "counsel_adopted");
assert.equal(customPleadingAdoption.approvedRouteCount, 14);
assert.equal(officialAcroformAdoption.status, "counsel_adopted");
assert.equal(officialAcroformAdoption.approvedRouteCount, 1);
assert.equal(productionPlan.counselAdoptionReconciliation.status, "counsel_adopted");
assert.equal(productionPlan.counselAdoptionReconciliation.approvedRouteCount, 15);
assert.equal(
  productionPlan.counselAdoptionReconciliation.legalRecommendationCompleteTracks,
  15
);
assert.equal(
  productionPlan.counselAdoptionReconciliation.counselAdoptedTracks,
  15
);
assert.deepEqual(
  productionPlan.counselAdoptionReconciliation.records.map((record) => record.path),
  ADOPTION_RECORD_PATHS
);
for (const record of productionPlan.counselAdoptionReconciliation.records) {
  assert.equal(record.sha256, fileSha256(record.path), record.path);
}
assert.deepEqual(
  productionPlan.counselAdoptionReconciliation.records
    .flatMap((record) => record.families)
    .map(({ jurisdiction, templateFamilySha256 }) => ({
      jurisdiction,
      templateFamilySha256
    }))
    .sort((left, right) => left.jurisdiction.localeCompare(right.jurisdiction)),
  [...customPleadingAdoption.completedScopes, ...officialAcroformAdoption.completedScopes]
    .map(({ jurisdiction, templateFamilySha256 }) => ({
      jurisdiction,
      templateFamilySha256
    }))
    .sort((left, right) => left.jurisdiction.localeCompare(right.jurisdiction))
);
assert.deepEqual(
  productionPlan.counselAdoptionReconciliation.excludedRoutes,
  [
    {
      trackId: "ga-jail-k2",
      reason: "unavailable_typed_stop_pending_templates_release_questions_and_counsel",
      integratedSpecification: "ga-jail-k2-process-guidance-3",
      missingComponents: [
        "ga-jail-k2-primary-filing-1",
        "ga-jail-k2-attachment-2"
      ]
    }
  ]
);
assert.equal(
  customPleadingAdoption.completedScopes.reduce(
    (total, scope) => total + scope.approvedRouteIds.length,
    0
  ) + officialAcroformAdoption.approvedRouteCount,
  15
);
assert.deepEqual(
  customPleadingAdoption.completedScopes.find(
    (scope) => scope.jurisdiction === "GA"
  ).excludedRouteIds,
  ["ga-jail-k2"]
);
assert.ok(
  [...customPleadingAdoption.completedScopes, ...officialAcroformAdoption.completedScopes]
    .every(
      (scope) =>
        scope.runtime.runtimeStatus === "runtime_disabled" &&
        scope.runtime.packetReady === false &&
        scope.runtime.productionEnabled === false &&
        scope.fullCanonicalParentComplete === false
    )
);
const completedGeorgiaChild = job("rcap-ga-custom-pleading");
assert.equal(completedGeorgiaChild.status, "completed");
assert.equal(
  completedGeorgiaChild.completionCommit,
  "080ed5d94e92442069b4000511f04194f734f36d"
);
assert.deepEqual([...completedGeorgiaChild.trackIds].sort(), georgiaTrackIds);
assert.equal(completedGeorgiaChild.trackIds.includes("ga-jail-k2"), false);
const georgiaGuidanceJob = job("rcap-ga-guidance-specification-jail-k2");
assert.equal(georgiaGuidanceJob.status, "completed");
assert.equal(
  georgiaGuidanceJob.completionCommit,
  "ca5958590d1b52713c4489d58617586e82f33629"
);
assert.equal(
  georgiaGuidanceJob.parentJobId,
  "IMP-CP-02-guidance-spec-unblock-family"
);
assert.deepEqual(georgiaGuidanceJob.trackIds, ["ga-jail-k2"]);
assert.equal(job("rcap-ga-jail-k2-packet-implementation").status, "blocked");
assert.equal(georgiaJailGuidance.componentId, "ga-jail-k2-process-guidance-3");
assert.equal(georgiaJailGuidance.statusAssertions.typedStopWeakened, false);
assert.equal(georgiaJailGuidance.unresolvedQuestionsPreserved.length, 2);
assert.equal(
  georgiaJailGuidance.blockerStatus.remainingBeforeGaJailK2CanRender.some(
    (entry) => /Template implementation/.test(entry)
  ),
  true
);
assert.equal(georgiaFactoryReview.participantPacketProof.verified, true);
assert.equal(georgiaFactoryReview.participantPacketProof.finalPdfCount, 9);
assert.equal(georgiaFactoryReview.participantPacketProof.assembledPageCount, 69);
assert.deepEqual(
  georgiaFactoryReview.participantPacketProof.packets.map((entry) => entry.sha256),
  tranche3Review.samplePackets.map((entry) => entry.assembledSha256)
);

const completedIllinoisChild = job("rcap-il-custom-pleading");
assert.equal(completedIllinoisChild.status, "completed");
assert.equal(
  completedIllinoisChild.completionCommit,
  "20379e6e8f7fd41e1fda6714ab05a06183123368"
);
assert.deepEqual(
  tranche4.selectedTracks.map((entry) => entry.trackId).sort(),
  ["il-immediate-seal", "il-prostitution-j-vacate"]
);
assert.equal(tranche4.implementationStatus, "implemented_and_internally_proved");
assert.equal(tranche4.humanLegalReviewStatus, "awaiting_counsel_adoption");
assert.equal(tranche4Review.implementedTrackCount, 2);
assert.equal(tranche4Review.assembledPacketCount, 3);
assert.equal(tranche4Review.assembledPageCount, 13);
assert.equal(tranche4Visual.result, "passed_no_unresolved_defects");
assert.equal(tranche4.runtimeStatus, "runtime_disabled");
assert.equal(guidanceRereviewQueue.deliveryModelReconciliationCount, 1);
const immediateSealReconciliation =
  guidanceRereviewQueue.deliveryModelReconciliations[0];
assert.equal(immediateSealReconciliation.trackId, "il-immediate-seal");
assert.equal(immediateSealReconciliation.controllingTreatment, null);
assert.equal(
  immediateSealReconciliation.releaseStatus,
  "blocked_pending_controlling_treatment"
);

const completedDcChild = job("rcap-dc-custom-pleading");
assert.equal(completedDcChild.status, "completed");
assert.equal(
  completedDcChild.completionCommit,
  "a25306af0e095faac1ce4d36c60b0f04c9221b31"
);
assert.deepEqual(
  tranche5.selectedTracks.map((entry) => entry.trackId).sort(),
  ["dc_correct_misattributed_arrest", "dc_innocence_expungement"]
);
assert.equal(tranche5Review.implementedTrackCount, 2);
assert.equal(tranche5Review.blockedTrackCount, 4);
assert.equal(tranche5Review.assembledPacketCount, 2);
assert.equal(tranche5Review.assembledPageCount, 5);
assert.equal(tranche5Review.sourcePinnedCount, 0);
assert.equal(tranche5.runtimeStatus, "runtime_disabled");
assert.equal(tranche5.humanLegalReviewStatus, "awaiting_counsel_adoption");
assert.equal(
  tranche5Recommendation.humanLegalReviewStatus,
  "awaiting_counsel_adoption"
);
assert.equal(tranche5Recommendation.recommendations.length, 2);
assert.equal(dcFactoryReview.participantPacketProof.verified, true);
assert.equal(dcFactoryReview.participantPacketProof.finalPdfCount, 2);
assert.equal(dcFactoryReview.participantPacketProof.assembledPageCount, 5);

assert.ok(reviewJob.dependencies.includes(staticMarylandJob.jobId));
assert.ok(adoptionJob.dependencies.includes(reviewJob.jobId));
assert.ok(stagingJob.jurisdictions.includes("MD"));
assert.ok(stagingJob.dependencies.includes(adoptionJob.jobId));
assert.ok(productionJob.jurisdictions.includes("MD"));
assert.ok(
  readJson(
    "planning/record-clearing-100-percent/jobs/PROD-03-production-promotion-remainder.json"
  ).dependencies.includes("STG-02-staging-promotion-remainder")
);
assert.equal(
  productionPlan.criticalPath.chain.includes(staticMarylandJob.jobId),
  false
);
assert.match(
  productionPlan.criticalPath.longestUncompressibleSegment,
  /Kansas Judicial Council commercial-license exemplar/
);
assert.ok(productionPlan.criticalPath.chain.some((entry) => /source pinning/.test(entry)));
assert.ok(
  productionPlan.criticalPath.chain.some((entry) => /completed template-family hash/.test(entry))
);
assert.ok(
  productionPlan.criticalPath.chain.some((entry) => /packet-persistence/.test(entry))
);
assert.equal(productionPlan.sourceAcquisition.oldAllExternalAssumptionRetired, true);

for (const jobId of productionPlan.nextDispatchWave.readyJobIds) {
  assert.equal(job(jobId).status, "ready", jobId);
}
assert.deepEqual(
  productionPlan.nextSessionAssignments.map((assignment) => ({
    session: assignment.session,
    jobId: assignment.jobId
  })),
  []
);
assert.equal(
  productionPlan.routingReservations.sessionB.jobId,
  "rcap-pa-legal-design-normalization"
);
assert.equal(
  productionPlan.routingReservations.sessionC.jobId,
  "rcap-dc-guidance-implementation"
);
assert.equal(
  productionPlan.routingReservations.nextWaveInputs.michiganGuidanceImplementation.commit,
  "7dbe89fe733474a90cc1ad20b5c11dc1a6520aa5"
);
assert.equal(
  productionPlan.routingReservations.normalizationReadiness.bundlesReceived,
  0
);
assert.equal(
  productionPlan.routingReservations.normalizationReadiness.jurisdictionsBlocked,
  24
);
assert.deepEqual(
  productionPlan.routingReservations.normalizationReadiness
    .firstSessionBJobsAfterReadiness,
  [
    "rcap-ky-legal-design-normalization",
    "rcap-nc-legal-design-normalization",
    "rcap-nd-legal-design-normalization",
    "rcap-ne-legal-design-normalization"
  ]
);
assert.deepEqual(
  productionPlan.routingReservations.normalizationReadiness
    .firstSessionDJobsAfterReadiness,
  [
    "rcap-ri-legal-design-normalization",
    "rcap-sc-legal-design-normalization",
    "rcap-sd-legal-design-normalization",
    "rcap-tn-legal-design-normalization"
  ]
);
assert.deepEqual(
  productionPlan.routingReservations.sessionF.canonicalParentJobIds,
  [
    "AUTH-01-in-repo-authority-pinning",
    "EXC-01-ks-commercial-use-determination"
  ]
);
assert.equal(factoryPlan.jobClaims.claims.length, 28);
assert.equal(
  new Set(factoryPlan.jobClaims.claims.map((claim) => claim.jobId)).size,
  28
);
const reservedNextJobIds = new Set([
  productionPlan.routingReservations.sessionB.jobId,
  productionPlan.routingReservations.sessionC.jobId
]);
assert.ok(
  productionPlan.nextSessionAssignments.every(
    (assignment) => !reservedNextJobIds.has(assignment.jobId)
  )
);
const scaffoldPlans = [];
for (const assignment of productionPlan.nextSessionAssignments) {
  const assignedJob = job(assignment.jobId);
  assert.equal(assignedJob.status, "ready", assignment.jobId);
  assert.equal(assignedJob.parentJobId, assignment.parentJobId, assignment.jobId);
  assert.equal(assignedJob.model, assignment.model, assignment.jobId);
  assert.equal(assignedJob.effort, assignment.effort, assignment.jobId);
  assert.equal(assignedJob.executionScope, "worker", assignment.jobId);
  const firstPrompt = compileWorkerPrompt({
    job: assignedJob,
    authorityVersion: factoryPlan.authorityVersion,
    model: assignment.model
  });
  const secondPrompt = compileWorkerPrompt({
    job: assignedJob,
    authorityVersion: factoryPlan.authorityVersion,
    model: assignment.model
  });
  assert.equal(firstPrompt, secondPrompt, assignment.jobId);
  const scaffold = buildScaffoldPlan({
    rootDir: ROOT,
    job: assignedJob,
    authorityVersion: factoryPlan.authorityVersion,
    model: assignment.model
  });
  assert.equal(scaffold.branch, assignment.branch, assignment.jobId);
  assert.equal(scaffold.worktreeKind, "complete_git_worktree", assignment.jobId);
  assert.equal(scaffold.worktreeDisposable, false, assignment.jobId);
  scaffoldPlans.push({ assignment, scaffold, job: assignedJob });
}
for (let left = 0; left < scaffoldPlans.length; left += 1) {
  for (let right = left + 1; right < scaffoldPlans.length; right += 1) {
    for (const leftPath of scaffoldPlans[left].job.ownedPaths) {
      for (const rightPath of scaffoldPlans[right].job.ownedPaths) {
        assert.equal(
          pathsOverlap(leftPath, rightPath),
          false,
          `${scaffoldPlans[left].assignment.session}/${scaffoldPlans[right].assignment.session}: ` +
            `${leftPath} overlaps ${rightPath}`
        );
      }
    }
  }
}

const status = buildFactoryStatus({ rootDir: ROOT });
assert.deepEqual(status.readinessMetrics, {
  authorityCleared: 87,
  authorityBlocked: 163,
  sourcePinned: 43,
  implementationProof: 17,
  finalDisposition: 0
});
assert.equal(
  status.tracks.filter(
    (track) =>
      track.sourcePinned &&
      !(
        (track.jurisdiction === "MD" &&
          track.trackId === "md_second_chance_shielding") ||
        (track.jurisdiction === "GA" &&
          georgiaTrackIds.includes(track.trackId)) ||
        (track.jurisdiction === "IL" &&
          ["il-immediate-seal", "il-prostitution-j-vacate"].includes(
            track.trackId
          ))
      )
  )
    .length,
  31
);
assert.deepEqual(
  status.tracks
    .filter((track) => track.sourcePinned && track.jurisdiction === "MD")
    .map((track) => track.trackId),
  [
    "md_10103_legacy_police",
    "md_10104_pre_service",
    "md_10105_1_automatic",
    "md_second_chance_shielding"
  ]
);
assert.equal(status.totals.tracks, 250);
assert.equal(status.totals.normalized, 250);
assert.equal(status.totals.implementationComplete, 19);
assert.equal(status.totals.technicalProofPassed, 19);
assert.equal(status.totals.visualProofPassed, 17);
assert.equal(status.totals.legalRecommendationComplete, 19);
assert.equal(status.totals.counselAdopted, 15);
assert.equal(status.totals.stagingPassed, 0);
assert.equal(status.totals.productionEnabled, 0);
assert.equal(status.totals.packetReady, 0);
assert.equal(status.totals.enabledJurisdictions, 0);
assert.equal(status.totals.launchGate, "red");
assert.equal(factoryPlan.sourceSummary.authority.clearedTracks, 87);
assert.equal(factoryPlan.sourceSummary.authority.blockedTracks, 163);

console.log("Integrated RCAP production plan verification passed.");
console.log("  PASS tracked Master Library 1.2 reconciliation remains internally consistent");
console.log("  PASS 109 acquisition records represented exactly once");
console.log("  PASS 313 official evidence records and 32 issuer campaigns preserved");
console.log("  PASS 250 normalized tracks represented exactly once");
console.log("  PASS 19 completed tracks excluded from pending implementation");
console.log("  PASS 15 exact implemented routes counsel-adopted by hash");
console.log("  PASS packet_ready=0 enabled_jurisdictions=0 launch_gate=red");
