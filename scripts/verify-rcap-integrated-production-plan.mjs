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
import {
  officialPdfProofPathFor,
  verifyOfficialPdfImplementationProof
} from "./lib/rcap-factory/official-pdf-proof.mjs";
import {
  verifyTrackedReviewManifest
} from "./lib/rcap-factory/review-artifacts.mjs";
import { buildFactoryStatus } from "./rcap-factory-status.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
const fileSha256 = (relativePath) =>
  crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(ROOT, relativePath)))
    .digest("hex");
const sourceReceiptSha256 = (receipt) =>
  crypto
    .createHash("sha256")
    .update(
      canonicalJson(
        Object.fromEntries(
          Object.entries(receipt).filter(
            ([key]) =>
              key !== "receiptSha256" &&
              key !== "materializationAction"
          )
        )
      )
    )
    .digest("hex");
const canonicalJson = (value) => {
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
};

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
const sessionBReadinessBundlePath =
  "docs/record-clearing/normalization-readiness-research/session-b-ky-or.bundle.json";
const sessionBReadinessManifest = readJson(
  "docs/record-clearing/normalization-readiness-research/session-b-ky-or.manifest.json"
);
const sessionDReadinessBundlePath =
  "docs/record-clearing/normalization-readiness-research/session-d-ri-wy.bundle.json";
const sessionDReadinessManifest = readJson(
  "docs/record-clearing/normalization-readiness-research/session-d-ri-wy.manifest.json"
);
const sessionDAdjudicationPath =
  "docs/record-clearing/normalization-readiness-research/session-d-ri-wy.adjudication.json";
const sessionDAdjudicationManifestPath =
  "docs/record-clearing/normalization-readiness-research/session-d-ri-wy.adjudication.manifest.json";
const sessionDAdjudication = readJson(sessionDAdjudicationPath);
const sessionDAdjudicationManifest = readJson(
  sessionDAdjudicationManifestPath
);
const sessionDCounselAdoptionPath =
  "docs/record-clearing/normalization-readiness-research/session-d-ut-vt-wv.counsel-adoption.json";
const sessionDCounselAdoptionManifestPath =
  "docs/record-clearing/normalization-readiness-research/session-d-ut-vt-wv.counsel-adoption.manifest.json";
const sessionDCounselAdoption = readJson(sessionDCounselAdoptionPath);
const sessionDCounselAdoptionManifest = readJson(
  sessionDCounselAdoptionManifestPath
);
const officialPdfSourceContract = readJson(
  "data/record-clearing/production-factory/official-pdf-source-contract-reconciliation.json"
);
const officialPdfSourceProjection = readJson(
  "data/record-clearing/production-factory/official-pdf-source-assignment-projection.json"
);
const legalReviewMaterializationContract = readJson(
  "data/record-clearing/production-factory/legal-review-materialization-contract.json"
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
assert.equal(
  factoryPlan.jobs.length,
  productionPlan.factoryQueueReconciliation.jobs
);
assert.equal(
  factoryPlan.jobs.filter((entry) => entry.status === "ready").length,
  productionPlan.factoryQueueReconciliation.ready
);
assert.equal(
  factoryPlan.jobs.filter((entry) => entry.status === "blocked").length,
  productionPlan.factoryQueueReconciliation.blocked
);
assert.equal(
  factoryPlan.jobs.filter((entry) => entry.status === "completed").length,
  productionPlan.factoryQueueReconciliation.completed
);
assert.equal(
  factoryPlan.jobs.filter((entry) => entry.status === "in_progress").length,
  productionPlan.factoryQueueReconciliation.inProgress
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
assert.equal(
  factoryPlan.parentJobReconciliation.compiledChildJobs,
  factoryPlan.jobs.length
);
assert.equal(
  factoryPlan.parentJobReconciliation.childrenMappedExactlyOnce,
  factoryPlan.jobs.length
);
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
  assert.equal(
    child.participantPacketProofRequired,
    child.strategyFamily !== "legal_design_adjudication",
    child.jobId
  );
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
  (entry) => entry.strategyFamily === "legal_design_adjudication"
)) {
  assert.equal(child.participantPacketProofRequired, false, child.jobId);
  assert.equal(
    child.integrationOwnedOutputs.some((output) =>
      output.startsWith(
        "data/record-clearing/production-factory/packet-proofs/"
      )
    ),
    false,
    child.jobId
  );
}
const completedGuidanceJobs = factoryPlan.jobs.filter(
  (entry) =>
    entry.status === "completed" &&
    entry.lane === "guidance_implementation" &&
    entry.participantPacketProofRequired === true
);
assert.equal(completedGuidanceJobs.length, 21);
const expectedGuidanceCompletions = new Map([
  ["rcap-ak-guidance-implementation", ["36509c7377c5653db07fd5c43b3948aad079164a", 4]],
  ["rcap-ca-guidance-implementation", ["26b4661089849a67eb99bfae6598ba101f75cbbc", 3]],
  ["rcap-co-guidance-implementation", ["7be280c8be25bc19e497d668d48abaadfd89ca44", 2]],
  ["rcap-ct-guidance-implementation", ["fd9ef0bfc18f11d0b34d7504682a574e2a849d06", 6]],
  ["rcap-dc-guidance-implementation", ["03505f1659072e28b245dfd9677426a995960bdd", 2]],
  ["rcap-de-guidance-implementation", ["c7af8cf48d42c69590a966141f5373c4ab596675", 2]],
  ["rcap-ga-guidance-implementation", ["de0e2debc59aab9f82672876c42c9d542f3bcb18", 3]],
  ["rcap-il-guidance-implementation", ["fd8d51980cab60c67aa13de01da80035a3d7a6a0", 4]],
  ["rcap-la-guidance-implementation", ["df4a5976692134bde5d6033a4ee988f3c83bd432", 3]],
  ["rcap-md-guidance-implementation", ["8dfdc7ae28a6362825ae19621e8a7afd6d8cef6c", 5]],
  ["rcap-mi-guidance-implementation", ["7dbe89fe733474a90cc1ad20b5c11dc1a6520aa5", 6]],
  ["rcap-mn-guidance-implementation", ["bf6f368c8a4cd72e0fa488bd37336c073f116925", 7]],
  ["rcap-pa-guidance-implementation", ["8b996476aa44899b07643546688c60a2cbd09771", 3]],
  ["rcap-mo-guidance-implementation", ["1b598a7df58249d8d15dd3de207fc10ea186d723", 2]],
  ["rcap-fl-guidance-implementation", ["c20febac8959dd4345e678bd36bf56b5ed128f8a", 1]],
  ["rcap-ar-guidance-implementation", ["9a1930abbc0c15bf771b6c10170db982f859759a", 1]],
  ["rcap-hi-guidance-implementation", ["04484c319cd4a77dbd348661c0e20e28db1a8bd7", 1]],
  ["rcap-in-guidance-implementation", ["b2c10962970adc43fdf2f774787cfcfc9d88c7aa", 1]],
  ["rcap-ma-guidance-implementation", ["dc8f5182a9499362e8c07ade983fb40a2bbfbb02", 1]],
  ["rcap-me-guidance-implementation", ["253ad752bf597231dd9cb797544324cd604b49ee", 1]],
  ["rcap-mt-guidance-implementation", ["96dfa91f92a967b30b2dec6d94818131f20e022b", 1]]
]);
let verifiedGuidancePacketCount = 0;
let verifiedGuidancePageCount = 0;
for (const child of completedGuidanceJobs) {
  const expected = expectedGuidanceCompletions.get(child.jobId);
  assert.ok(expected, child.jobId);
  assert.equal(child.completionCommit, expected[0], child.jobId);
  assert.equal(child.trackIds.length, expected[1], child.jobId);
  const proofPath =
    `data/record-clearing/production-factory/packet-proofs/${child.jobId}.json`;
  assert.ok(child.integrationOwnedOutputs.includes(proofPath), child.jobId);
  const proof = readJson(proofPath);
  assert.equal(proof.jobId, child.jobId);
  assert.equal(proof.parentJobId, child.parentJobId);
  assert.equal(proof.completionCommit, child.completionCommit);
  assert.equal(proof.finalPdfCount, child.trackIds.length);
  assert.equal(proof.samplePackets.length, child.trackIds.length);
  assert.deepEqual(
    proof.samplePackets.map((packet) => packet.trackId).sort(),
    [...child.trackIds].sort(),
    child.jobId
  );
  assert.equal(
    proof.samplePackets.reduce(
      (total, packet) => total + packet.assembledPageCount,
      0
    ),
    proof.assembledPageCount,
    child.jobId
  );
  assert.equal(proof.verifier.path, child.regressionVerifier);
  assert.equal(proof.verifier.sha256, fileSha256(child.regressionVerifier));
  assert.equal(proof.verifier.result, "passed");
  assert.equal(proof.deterministic, true);
  assert.equal(proof.generatedPacketBytesTracked, false);
  assert.equal(proof.runtimeStatus, "runtime_disabled");
  assert.equal(proof.visualProof, "pending");
  assert.equal(proof.counselAdopted, false);
  assert.equal(proof.productionEnabled, false);
  verifiedGuidancePacketCount += proof.finalPdfCount;
  verifiedGuidancePageCount += proof.assembledPageCount;
}
assert.equal(verifiedGuidancePacketCount, 59);
assert.equal(verifiedGuidancePageCount, 178);
assert.deepEqual(productionPlan.participantPacketProofReconciliation, {
  schemaVersion: "rcap-participant-packet-proof/v1",
  completedGuidanceJobsRequiringProof: 21,
  proofsPresentAndVerified: 21,
  assignedTracks: 59,
  finalPackets: 59,
  assembledPages: 178,
  proofDirectory: "data/record-clearing/production-factory/packet-proofs",
  evidenceSource:
    "Each integration-owned proof is generated from its committed regression verifier output; worker-authored proof assertions are not accepted.",
  generatedPacketBytesTracked: false,
  runtimeStatus: "runtime_disabled",
  visualProof: "pending",
  counselAdopted: false,
  productionEnabled: false
});
const currentGuidanceImplementationJobs = factoryPlan.jobs.filter(
  (entry) =>
    entry.lane === "guidance_implementation" &&
    entry.strategyFamily !== "legal_design_adjudication"
);
const currentGuidanceAdjudicationJobs = factoryPlan.jobs.filter(
  (entry) =>
    entry.lane === "guidance_implementation" &&
    entry.strategyFamily === "legal_design_adjudication"
);
const completedGuidanceImplementationCount =
  currentGuidanceImplementationJobs.filter(
    (entry) => entry.status === "completed"
  ).length;
const readyGuidanceImplementationCount =
  currentGuidanceImplementationJobs.filter(
    (entry) => entry.status === "ready"
  ).length;
const guidanceImplementationPoolExhausted =
  completedGuidanceImplementationCount ===
  currentGuidanceImplementationJobs.length;
assert.deepEqual(productionPlan.guidanceLaneReconciliation, {
  schemaVersion: "rcap-guidance-lane-reconciliation/v1",
  implementationJobs: currentGuidanceImplementationJobs.length,
  completedImplementationJobs: completedGuidanceImplementationCount,
  readyImplementationJobs: readyGuidanceImplementationCount,
  implementationPoolExhausted: guidanceImplementationPoolExhausted,
  workerImplementationStatus:
    guidanceImplementationPoolExhausted ? "complete" : "incomplete",
  technicalPacketProofStatus: "complete",
  finalPackets: 59,
  assembledPages: 178,
  blockedAdjudications: currentGuidanceAdjudicationJobs.filter(
    (entry) => entry.status === "blocked"
  ).length,
  blockedAdjudicationJobIds: currentGuidanceAdjudicationJobs
    .filter((entry) => entry.status === "blocked")
    .map((entry) => entry.jobId)
    .sort(),
  formalVisualProofStatus: "pending",
  finalLegalOutputReviewStatus: "pending",
  counselAdopted: false,
  packetReady: false,
  runtimeStatus: "runtime_disabled",
  productionEnabled: false
});
const expectedAuthorityCompletions = new Map([
  ["rcap-co-in-repo-identity-reconciliation-needs-edition-reclass-not-acquisition", "6afe0d989bb079dbd1eab377b0547b9b6908d902"],
  ["rcap-ak-public-official-download", "4acded00a77584b0ea9c9f00e490e2a6a92dd033"],
  ["rcap-me-public-official-download", "6912e16bc73dbb85612dc5ede86c6a472e5c1e91"],
  ["rcap-mi-public-official-download", "6ad135bcd8ef53b36a8c63948056fec546ba24d0"],
  ["rcap-id-public-official-download", "95c47cdbf031b71164e8f2ea4fb71299f61aad9b"],
  ["rcap-il-public-official-download", "17e9cad367543a4f7b21b30d754d09e51ffbd898"],
  ["rcap-co-official-download-automation-blocked", "2666e25fe748c021f5c668030fcabc7dac8b3fc4"],
  ["rcap-co-source-identity-resolution-jdf-417-order", "124559c3a6c0010ed1d6883660268b0fcf4585fd"],
  ["rcap-ks-source-identity-resolution-criminal-cover-sheet", "facfa75f6e25472181a4a40eac6c61c6809e720f"],
  ["rcap-ca-local-form-scope-correction-sdsc-crm-307", "610f36c450173fc856fbbb188171d67e64f18845"],
  ["rcap-ks-commercial-license", "b0cfdae005c897083180e2d49e48059b0f495463"]
]);
for (const [jobId, completionCommit] of expectedAuthorityCompletions) {
  const child = factoryPlan.jobs.find((entry) => entry.jobId === jobId);
  assert.ok(child, jobId);
  assert.equal(child.status, "completed", jobId);
  assert.equal(child.completionCommit, completionCommit, jobId);
  assert.notEqual(child.participantPacketProofRequired, true, jobId);
  assert.equal(
    child.integrationOwnedOutputs.some((output) =>
      output.startsWith(
        "data/record-clearing/production-factory/packet-proofs/"
      )
    ),
    false,
    jobId
  );
}
const coloradoJdf684Disposition = readJson(
  "data/record-clearing/production-factory/source-acquisition/rcap-co-official-download-automation-blocked.json"
);
const coloradoJdf417Disposition = readJson(
  "data/record-clearing/production-factory/source-acquisition/rcap-co-source-identity-resolution-jdf-417-order.json"
);
const kansasCoverSheetDisposition = readJson(
  "data/record-clearing/production-factory/source-acquisition/rcap-ks-source-identity-resolution-criminal-cover-sheet.json"
);
const californiaCrm307Disposition = readJson(
  "data/record-clearing/production-factory/source-acquisition/rcap-ca-local-form-scope-correction-sdsc-crm-307.json"
);
const kansasCommercialDisposition = readJson(
  "data/record-clearing/production-factory/source-acquisition/rcap-ks-commercial-license.json"
);
assert.equal(
  coloradoJdf684Disposition.acquisitions[0].hashAgreementWithInventory,
  "exact_match"
);
assert.equal(coloradoJdf684Disposition.trackEffect.componentCleared, false);
assert.equal(
  coloradoJdf417Disposition.identityResolution.classification,
  "normalization_artefact"
);
assert.equal(
  coloradoJdf417Disposition.criticalDistinction.jdf417.exists,
  true
);
assert.equal(
  coloradoJdf417Disposition.identifiedOrderCandidate.documentId,
  "JDF-418"
);
assert.equal(
  kansasCoverSheetDisposition.identityResolution.queueClaimAssessed
    .correctedValue,
  "document_identity_known_revision_conflicting"
);
assert.match(
  kansasCoverSheetDisposition.separateDefectRaised.assessment,
  /Rule 123\(a\)/
);
assert.equal(
  californiaCrm307Disposition.scopeCorrection.scope,
  "local_court_form"
);
assert.equal(californiaCrm307Disposition.runtimeEffect.stage1Available, true);
assert.equal(californiaCrm307Disposition.runtimeEffect.stage2Available, false);
assert.equal(
  kansasCommercialDisposition.terminalDisposition,
  "deliberately_excluded_commercial_license"
);
assert.equal(kansasCommercialDisposition.excludedDocuments.length, 9);
assert.equal(kansasCommercialDisposition.generationAllowed, false);
// Regenerated against the current integrated audit: the queue admits every
// audited jurisdiction that has an official-form component, not the 25 it
// carried when Pennsylvania was still a supplemental lane.
assert.deepEqual(officialPdfSourceContract.queueCoverage.totals, {
  tracks: 242,
  components: 653,
  documentIdentities: 303,
  exactSourceRequirements: 117,
  unresolvedSourceIdentities: 186
});
assert.equal(officialPdfSourceContract.familyCount, 39);
// Eleven newly admitted families have no authored source-requirements scaffold
// yet; each of their queue documents is recorded as an explicit gap rather than
// dropped from coverage.
assert.equal(
  officialPdfSourceContract.families.filter(
    (family) => family.sourceRequirementsScaffoldPresent === false
  ).length,
  14
);
assert.equal(
  officialPdfSourceContract.families
    .filter((family) => family.sourceRequirementsScaffoldPresent !== false)
    .reduce((total, family) => total + family.queueCoverageGaps.length, 0),
  0
);
assert.equal(officialPdfSourceContract.totals.contractSafetyGaps, 0);
assert.equal(
  officialPdfSourceContract.totals.normativeAssignedRequirements,
  0
);
assert.equal(officialPdfSourceContract.totals.pendingAssignmentFamilies, 0);
assert.equal(officialPdfSourceContract.totals.projectedDocumentIdentities, 303);
assert.equal(
  officialPdfSourceContract.totals.projectedExactWorkerAssignments,
  71
);
assert.equal(
  officialPdfSourceContract.totals.materializationBlockedFamilies,
  officialPdfSourceContract.families.filter(
    (family) => family.workerReady === false
  ).length
);
assert.equal(
  officialPdfSourceContract.totals.workerReadyFamilies,
  officialPdfSourceContract.families.filter(
    (family) => family.workerReady === true
  ).length
);
assert.equal(officialPdfSourceContract.verifierBoundary.packetModuleCount, 51);
assert.equal(
  officialPdfSourceContract.verifierBoundary.packetWorkerMaterializationPaths,
  0
);
assert.equal(
  officialPdfSourceContract.verifierBoundary
    .packetImplementationNetworkAcquisitionPaths,
  0
);
assert.equal(
  factoryPlan.jobs.some((entry) =>
    entry.integrationOwnedOutputs.includes(
      officialPdfSourceContract.normativeContract.assignmentMarker
    )
  ),
  false
);
assert.equal(
  productionPlan.officialPdfSourceContractIntegration.projectionPath,
  "data/record-clearing/production-factory/official-pdf-source-assignment-projection.json"
);
assert.equal(
  productionPlan.officialPdfSourceContractIntegration
    .projectedDocumentIdentities,
  303
);
assert.equal(
  productionPlan.officialPdfSourceContractIntegration
    .projectedExactWorkerAssignments,
  71
);
assert.equal(
  productionPlan.officialPdfSourceContractIntegration
    .unresolvedSourceIdentities,
  186
);
assert.equal(
  productionPlan.officialPdfSourceContractIntegration
    .projectedUnresolvedIdentities,
  152
);
assert.equal(
  productionPlan.officialPdfSourceContractIntegration
    .pendingAssignmentFamilies,
  0
);
assert.equal(
  productionPlan.officialPdfSourceContractIntegration.assignmentMarker.status,
  "generated_worker_local_untracked_by_factory_scaffold"
);
assert.equal(
  productionPlan.officialPdfSourceContractIntegration.assignmentMarker
    .integrationCheckoutMarkerCreated,
  false
);
assert.equal(
  productionPlan.officialPdfSourceContractIntegration.portableProjection
    .status,
  "integration_owned_projection_present"
);
assert.equal(
  productionPlan.officialPdfSourceContractIntegration.materializedSourceCount,
  factoryPlan.materializationPlanning.officialPdfChildren
    .materializedSources
);
assert.equal(
  productionPlan.officialPdfSourceContractIntegration.activatedRendererCount,
  0
);
const readyOfficialPdfFamilies = new Set(
  factoryPlan.jobs
    .filter(
      (child) =>
        (child.officialPdfAssignment?.identityKeys?.length ?? 0) > 0 &&
        child.status === "ready"
    )
    .map((child) => child.jurisdiction)
);
const blockedOfficialPdfFamilies = new Set(
  factoryPlan.jobs
    .filter(
      (child) =>
        (child.officialPdfAssignment?.identityKeys?.length ?? 0) > 0 &&
        child.status === "blocked"
    )
    .map((child) => child.jurisdiction)
);
assert.equal(
  productionPlan.officialPdfSourceContractIntegration.workerReadyFamilies,
  readyOfficialPdfFamilies.size
);
assert.equal(
  productionPlan.materializationPlanning.officialPdfAssignment.readyFamilies,
  readyOfficialPdfFamilies.size
);
assert.equal(
  productionPlan.materializationPlanning.officialPdfAssignment.blockedFamilies,
  blockedOfficialPdfFamilies.size
);
assert.equal(
  productionPlan.officialPdfSourceContractIntegration.runtimeStatus,
  "runtime_disabled"
);
assert.equal(officialPdfSourceProjection.coverage.queueIdentityCount, 303);
assert.equal(officialPdfSourceProjection.coverage.assignmentEligibleCount, 71);
assert.deepEqual(
  officialPdfSourceProjection.coverage.countsByDisposition,
  {
    deliberately_excluded_commercial_license: 9,
    exact_worker_assignable: 71,
    // Completed acquisition decisions settled these identities; the adopted
    // edition manifests no asset for them, so there is no portable contract to
    // assign and they are not eligible.
    identity_resolved_materialization_required: 26,
    legal_design_or_technical_policy_blocked: 13,
    local_scope_identity: 1,
    role_mismatch: 3,
    source_gated_identity: 28,
    unresolved_identity: 152
  }
);
assert.equal(legalReviewMaterializationContract.assignmentCount, 24);
assert.equal(
  factoryPlan.jobs.filter(
    (entry) => entry.strategyFamily === "legal_review_materialization"
  ).length,
  24
);
assert.ok(
  factoryPlan.jobs
    .filter(
      (entry) => entry.strategyFamily === "legal_review_materialization"
    )
    .every((entry) => entry.status === "completed")
);
const exactOfficialPdfChildren = factoryPlan.jobs.filter(
  (entry) =>
    (entry.officialPdfAssignment?.identityKeys?.length ?? 0) > 0 &&
    ["planned", "ready", "blocked", "in_progress", "completed"].includes(
      entry.status
    )
);
const assignedOfficialPdfIdentityKeys = exactOfficialPdfChildren.flatMap(
  (child) => child.officialPdfAssignment.identityKeys
);
assert.equal(assignedOfficialPdfIdentityKeys.length, 71);
assert.equal(new Set(assignedOfficialPdfIdentityKeys).size, 71);
assert.deepEqual(
  [...assignedOfficialPdfIdentityKeys].sort(),
  officialPdfSourceProjection.identities
    .filter((identity) => identity.assignmentEligible)
    .map((identity) => identity.identityKey)
    .sort()
);
assert.equal(
  exactOfficialPdfChildren.flatMap(
    (child) =>
      child.officialPdfAssignment.newImplementationIdentityKeys
  ).length,
  69
);
assert.equal(
  exactOfficialPdfChildren.flatMap(
    (child) =>
      child.officialPdfAssignment
        .existingImplementationMaterializationOnlyIdentityKeys
  ).length,
  2
);
for (const child of exactOfficialPdfChildren) {
  assert.ok(child.sourceMaterializationInputs.length > 0, child.jobId);
  assert.equal(
    child.officialPdfAssignment.runtimeDisabledInvariant,
    true,
    child.jobId
  );
  assert.equal(
    child.officialPdfAssignment.workerMayAcquireOrMaterializeSources,
    false,
    child.jobId
  );
  const materializationReady =
    child.sourceMaterializationInputs.length ===
      child.officialPdfAssignment.identityKeys.length &&
    child.sourceMaterializationInputs.every(
      (input) =>
        input.materializationState ===
          "binary_materialized_hash_verified" &&
        input.workerReadiness === "worker_ready" &&
        input.provenance.freshLocalVerification === true
    );
  const projectionBlockers =
    child.officialPdfAssignment.identityKeys.flatMap((identityKey) => {
      const identity = officialPdfSourceProjection.identities.find(
        (candidate) => candidate.identityKey === identityKey
      );
      assert.ok(identity, identityKey);
      assert.equal(identity.assignmentEligible, true, identityKey);
      return identity.assignmentBlockers.filter(
        (blocker) =>
          blocker !== "exact_source_archive_not_materialized" ||
          !materializationReady
      );
    });
  const terminalBlockers =
    child.officialPdfAssignment.unresolvedOrTerminalIdentities.map(
      (identity) => identity.disposition
    );
  const dependencyBlockers = child.dependencies
    .filter(
      (dependencyId) =>
        factoryPlan.jobs.find(
          (candidate) => candidate.jobId === dependencyId
        )?.status !== "completed"
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
    child.officialPdfAssignment.assignmentBlockers,
    expectedBlockers,
    child.jobId
  );
  const expectedReady =
    materializationReady &&
    child.officialPdfAssignment.unresolvedOrTerminalIdentities.length ===
      0 &&
    expectedBlockers.length === 0;
  if (child.status === "completed") {
    assert.equal(expectedReady, true, child.jobId);
    assert.equal(
      child.officialPdfAssignment.assignmentState,
      "exact_pinned_assignment_implemented",
      child.jobId
    );
  } else {
    assert.equal(
      child.status,
      expectedReady ? "ready" : "blocked",
      child.jobId
    );
    assert.equal(
      child.officialPdfAssignment.assignmentState,
      expectedReady
        ? "exact_pinned_assignment_worker_ready"
        : materializationReady
          ? "exact_pinned_assignment_blocked_non_source_dependencies"
          : "exact_pinned_assignment_blocked_external_materialization",
      child.jobId
    );
  }
  for (const input of child.sourceMaterializationInputs) {
    const identity = officialPdfSourceProjection.identities.find(
      (candidate) =>
        candidate.identityKey === input.sourceIdentityKey
    );
    assert.ok(identity, input.sourceIdentityKey);
    assert.equal(identity.assignmentEligible, true);
    assert.equal(identity.disposition, "exact_worker_assignable");
    assert.equal(identity.jurisdiction, child.jurisdiction);
    assert.equal(
      identity.officialDocument.documentId,
      input.documentId
    );
    assert.equal(
      identity.officialDocument.documentRole,
      input.documentRole
    );
    assert.equal(
      identity.exactSourceContract.archiveRelativePath,
      input.canonicalAuthorityPath
    );
    assert.equal(
      identity.exactSourceContract.expectedSha256,
      input.expectedSha256
    );
    assert.equal(
      identity.exactSourceContract.expectedBytes,
      input.expectedBytes
    );
    assert.equal(
      identity.exactSourceContract.expectedMime,
      input.expectedMediaType
    );
    assert.equal(
      identity.exactSourceContract.materializationDestination,
      input.materializationDestination
    );
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
      const receipt = readJson(input.receiptOutput);
      assert.equal(
        receipt.schemaVersion,
        "rcap-source-materialization-result/v1"
      );
      assert.equal(receipt.assignmentJobId, child.jobId);
      assert.equal(receipt.authorityEdition, input.authorityEdition);
      assert.equal(
        receipt.authorityArchiveSha256,
        input.authorityArchiveSha256
      );
      assert.equal(receipt.jurisdiction, input.jurisdiction);
      assert.equal(receipt.documentId, input.documentId);
      assert.equal(receipt.documentRole, input.documentRole);
      assert.equal(
        receipt.canonicalAuthorityPath,
        input.canonicalAuthorityPath
      );
      assert.equal(receipt.expectedSha256, input.expectedSha256);
      assert.equal(receipt.actualSha256, input.expectedSha256);
      assert.equal(receipt.expectedBytes, input.expectedBytes);
      assert.equal(receipt.actualBytes, input.expectedBytes);
      assert.equal(receipt.expectedMediaType, input.expectedMediaType);
      assert.equal(receipt.actualMediaType, input.expectedMediaType);
      assert.equal(receipt.portableLocator, input.portableLocator);
      assert.equal(
        receipt.materializationDestination,
        input.materializationDestination
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
      assert.deepEqual(receipt.usageBindings, input.usageBindings);
      assert.equal(
        receipt.receiptSha256,
        sourceReceiptSha256(receipt)
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
  }
}
const verifiedOfficialPdfIdentityKeys = exactOfficialPdfChildren.flatMap(
  (child) =>
    child.sourceMaterializationInputs
      .filter(
        (input) =>
          input.materializationState ===
            "binary_materialized_hash_verified" &&
          input.workerReadiness === "worker_ready" &&
          input.provenance.freshLocalVerification === true
      )
      .map((input) => input.sourceIdentityKey)
);
assert.equal(
  new Set(verifiedOfficialPdfIdentityKeys).size,
  verifiedOfficialPdfIdentityKeys.length
);
assert.equal(
  productionPlan.officialPdfSourceContractIntegration
    .materializedSourceCount,
  verifiedOfficialPdfIdentityKeys.length
);
assert.deepEqual(
  fs
    .readdirSync(
      path.join(
        ROOT,
        "data/record-clearing/production-factory/source-materialization-receipts"
      ),
      { withFileTypes: true }
    )
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort(),
  verifiedOfficialPdfIdentityKeys
    .map((identityKey) => `${identityKey}.json`)
    .sort()
);
const completedOfficialPdfExpectations = new Map([
  [
    "rcap-ak-acroform-fill",
    {
      commit: "27210a0ee9f2fa01b907ba54c91ed9040dd04c2d",
      tracks: 3,
      positiveRenderedFixtures: 3,
      renderedPages: 6,
      expectedNoDocumentBranches: 1
    }
  ],
  [
    "rcap-ct-acroform-fill",
    {
      commit: "777ca177419b934e61c40ea7776526d1ad605bdb",
      tracks: 1,
      positiveRenderedFixtures: 2,
      renderedPages: 4,
      expectedNoDocumentBranches: 0
    }
  ],
  [
    "rcap-ga-flat-pdf-overlay",
    {
      commit: "f2f2c2c4de39d631bdd04e78563265519f8d21bd",
      tracks: 1,
      positiveRenderedFixtures: 1,
      renderedPages: 4,
      expectedNoDocumentBranches: 0
    }
  ]
]);
let officialPdfPositiveRenderedFixtures = 0;
let officialPdfRenderedPages = 0;
let officialPdfExpectedNoDocumentBranches = 0;
for (const [jobId, expected] of completedOfficialPdfExpectations) {
  const completedJob = factoryPlan.jobs.find((entry) => entry.jobId === jobId);
  assert.ok(completedJob, jobId);
  assert.equal(completedJob.status, "completed", jobId);
  assert.equal(completedJob.completionCommit, expected.commit, jobId);
  assert.equal(completedJob.trackIds.length, expected.tracks, jobId);
  assert.equal(
    completedJob.officialPdfAssignment.assignmentState,
    "exact_pinned_assignment_implemented",
    jobId
  );
  const proofPath = officialPdfProofPathFor(jobId);
  assert.ok(completedJob.integrationOwnedOutputs.includes(proofPath), jobId);
  const proofVerification = verifyOfficialPdfImplementationProof(
    ROOT,
    completedJob,
    {
      proofPath,
      authorityEdition: factoryPlan.authorityEdition
    }
  );
  assert.equal(
    proofVerification.passed,
    true,
    proofVerification.failures.join("\n")
  );
  const proof = proofVerification.proof;
  assert.equal(
    proof.totals.positiveRenderedFixtures,
    expected.positiveRenderedFixtures,
    jobId
  );
  assert.equal(proof.totals.renderedPages, expected.renderedPages, jobId);
  assert.equal(
    proof.totals.expectedNoDocumentBranches,
    expected.expectedNoDocumentBranches,
    jobId
  );
  assert.equal(proof.formalVisualApprovalStatus, "pending", jobId);
  assert.equal(proof.completedOutputLegalReviewStatus, "pending", jobId);
  assert.equal(proof.counselAdopted, false, jobId);
  assert.equal(proof.packetReady, false, jobId);
  assert.equal(proof.runtimeStatus, "runtime_disabled", jobId);
  assert.equal(proof.productionEnabled, false, jobId);
  const reviewVerification = verifyTrackedReviewManifest(ROOT, completedJob);
  assert.equal(
    reviewVerification.passed,
    true,
    reviewVerification.failures.join("\n")
  );
  assert.equal(
    reviewVerification.manifest.participantPacketProof.sourceType,
    "integration_owned_official_pdf_implementation_proof",
    jobId
  );
  assert.equal(reviewVerification.manifest.visualProofPassed, false, jobId);
  assert.equal(reviewVerification.manifest.counselAdopted, false, jobId);
  officialPdfPositiveRenderedFixtures +=
    expected.positiveRenderedFixtures;
  officialPdfRenderedPages += expected.renderedPages;
  officialPdfExpectedNoDocumentBranches +=
    expected.expectedNoDocumentBranches;
}
assert.deepEqual(
  productionPlan.officialPdfImplementationProofReconciliation,
  {
    schemaVersion: "rcap-official-pdf-implementation-proof/v1",
    completedOfficialPdfJobsRequiringProof: 3,
    proofsPresentAndVerified: 3,
    completedJobIds: [...completedOfficialPdfExpectations.keys()].sort(),
    assignedTracks: 5,
    positiveRenderedFixtures: officialPdfPositiveRenderedFixtures,
    renderedPages: officialPdfRenderedPages,
    expectedNoDocumentBranches: officialPdfExpectedNoDocumentBranches,
    proofDirectory:
      "data/record-clearing/production-factory/official-pdf-proofs",
    sourceReceiptsVerified: true,
    sourceMutationDetected: false,
    generatedParticipantPdfBytesTracked: false,
    formalVisualApprovalStatus: "pending",
    completedOutputLegalReviewStatus: "pending",
    counselAdopted: false,
    packetReady: false,
    runtimeStatus: "runtime_disabled",
    productionEnabled: false
  }
);
const paNormalization = factoryPlan.jobs.find(
  (entry) => entry.jobId === "rcap-pa-legal-design-normalization"
);
assert.equal(paNormalization.status, "completed");
assert.equal(
  paNormalization.normalizationReadiness.readinessState,
  "normalization_complete"
);
assert.equal(
  paNormalization.completionCommit,
  "387656ac31a49f7338bd9d1e3e170df929659d98"
);
assert.equal(paNormalization.assignmentClaim ?? null, null);
const paTrack11Adjudication = factoryPlan.jobs.find(
  (entry) =>
    entry.jobId === "rcap-pa-clean-slate-correction-adjudication"
);
assert.equal(paTrack11Adjudication.status, "blocked");
assert.equal(paTrack11Adjudication.lane, "legal_design_normalization");
assert.equal(
  paTrack11Adjudication.strategyFamily,
  "legal_design_adjudication"
);
assert.deepEqual(paTrack11Adjudication.trackIds, []);
assert.deepEqual(paTrack11Adjudication.dependencies, [
  "rcap-pa-legal-design-normalization"
]);
assert.equal(
  paTrack11Adjudication.parentJobId,
  "NORM-03-pod-2-mid-atlantic"
);
assert.equal(paTrack11Adjudication.participantPacketProofRequired, false);
assert.equal(paTrack11Adjudication.regressionVerifier, undefined);
assert.match(
  paTrack11Adjudication.stopCondition,
  /packet identity and legal effect from controlling authority/
);
assert.match(
  paTrack11Adjudication.stopCondition,
  /Do not invent a normalized track, filing, or remedy/
);
const gaRfoPostConsentAdjudication = factoryPlan.jobs.find(
  (entry) =>
    entry.jobId ===
    "rcap-ga-rfo-post-consent-petition-adjudication"
);
assert.equal(gaRfoPostConsentAdjudication.status, "blocked");
assert.equal(
  gaRfoPostConsentAdjudication.strategyFamily,
  "legal_design_adjudication"
);
assert.deepEqual(gaRfoPostConsentAdjudication.trackIds, ["ga-rfo"]);
assert.deepEqual(gaRfoPostConsentAdjudication.dependencies, [
  "rcap-ga-guidance-implementation"
]);
assert.equal(
  gaRfoPostConsentAdjudication.participantPacketProofRequired,
  false
);
assert.ok(
  gaRfoPostConsentAdjudication.requiredInputs.includes(
    "data/record-clearing/legal-design-intake/GA.memo.json"
  )
);
assert.match(
  gaRfoPostConsentAdjudication.stopCondition,
  /After the required prosecutor consent is obtained/
);
assert.match(
  gaRfoPostConsentAdjudication.stopCondition,
  /does not obtain or negotiate prosecutor consent/
);
assert.match(
  gaRfoPostConsentAdjudication.stopCondition,
  /Do not invent consent, generate a post-consent petition/
);
assert.ok(
  factoryPlan.jobs
    .find((entry) => entry.jobId === "rcap-ga-legal-output-review")
    .dependencies.includes(gaRfoPostConsentAdjudication.jobId)
);
const maOcpAdjudication = factoryPlan.jobs.find(
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
  factoryPlan.jobs
    .find((entry) => entry.jobId === "rcap-ma-legal-output-review")
    .dependencies.includes(maOcpAdjudication.jobId)
);
const gaRfoTrackReconciliation =
  factoryPlan.trackReconciliation.assignments.find(
    (entry) =>
      entry.jurisdiction === "GA" && entry.trackId === "ga-rfo"
  );
assert.equal(
  gaRfoTrackReconciliation.disposition,
  "implementation_complete"
);
assert.equal(
  gaRfoTrackReconciliation.completionCommit,
  "de0e2debc59aab9f82672876c42c9d542f3bcb18"
);
// Normalization waves already integrated from an exact worker memo blob through
// a captain-equivalent commit. Everything else is still awaiting a worker.
const INTEGRATED_NORMALIZATIONS = [
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
const remainingNormalizations = factoryPlan.jobs.filter(
  (entry) =>
    /-legal-design-normalization$/.test(entry.jobId) &&
    entry.jurisdiction !== "PA"
);
assert.equal(remainingNormalizations.length, 24);
assert.ok(
  remainingNormalizations.every(
    (entry) => {
      const integrated = INTEGRATED_NORMALIZATIONS.includes(
        entry.jurisdiction
      );
      const expectedStatus = integrated ? "completed" : "ready";
      const expectedReadinessState = integrated
        ? "normalization_complete"
        : "ready_for_normalization";
      return (
        entry.status === expectedStatus &&
        entry.normalizationReadiness.readinessState ===
          expectedReadinessState &&
        entry.normalizationReadiness.controllingReviewStatus ===
          "checksum_verified" &&
        /^[0-9a-f]{64}$/.test(
          entry.normalizationReadiness.controllingReviewSha256
        ) &&
        entry.normalizationReadiness.canonicalizationVersion ===
          "mechanism-inventory-v1" &&
        /^[0-9a-f]{64}$/.test(
          entry.normalizationReadiness
            .canonicalMechanismInventorySha256
        ) &&
        entry.normalizationReadiness.reviewMaterialization
          .readOnly === true &&
        entry.normalizationReadiness.reviewMaterialization
          .materializationState === "binary_hash_verified" &&
        entry.normalizationReadiness.reviewMaterialization
          .verificationStatus ===
          "binary_hash_and_size_verified" &&
        entry.dependencies.includes(
          "rcap-nationwide-normalization-readiness-foundation"
        )
      );
    }
  )
);
assert.deepEqual(
  remainingNormalizations
    .filter((entry) => ["UT", "VT", "WV"].includes(entry.jurisdiction))
    .map((entry) => entry.jurisdiction)
    .sort(),
  ["UT", "VT", "WV"]
);
for (const jurisdiction of ["UT", "VT", "WV"]) {
  const readiness = remainingNormalizations.find(
    (entry) => entry.jurisdiction === jurisdiction
  ).normalizationReadiness;
  assert.equal(
    readiness.readinessState,
    INTEGRATED_NORMALIZATIONS.includes(jurisdiction)
      ? "normalization_complete"
      : "ready_for_normalization"
  );
  assert.equal(
    readiness.denominatorAdjudication.status,
    "keyed_denominator_reconciled"
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
}
assert.equal(
  remainingNormalizations.reduce(
    (total, entry) =>
      total + entry.normalizationReadiness.mechanismInventory.length,
    0
  ),
  313
);
assert.deepEqual(factoryPlan.normalizationReadiness, {
  expectedJurisdictions: 24,
  representedExactlyOnce: 24,
  bundlesReceived: 24,
  readyForNormalization: 24,
  blocked: 0,
  byReadinessState: {
    ready_for_normalization: 24
  }
});
assert.deepEqual(
  productionPlan.routingReservations.normalizationReadiness.blockedByState,
  factoryPlan.normalizationReadiness.byReadinessState
);
assert.deepEqual(
  productionPlan.routingReservations.normalizationReadiness
    .sessionDCounselStructureAdoption,
  {
    adoptionDate: sessionDCounselAdoption.adoptionDate,
    adoptedBy: sessionDCounselAdoption.adoptedBy,
    adoptionPath: sessionDCounselAdoptionPath,
    adoptionSha256: fileSha256(sessionDCounselAdoptionPath),
    manifestPath: sessionDCounselAdoptionManifestPath,
    manifestSha256: fileSha256(sessionDCounselAdoptionManifestPath),
    parentAdjudicationSha256:
      sessionDCounselAdoption.parentAdjudication.sha256,
    structureCounts: {
      UT: {
        sourceSlots:
          sessionDCounselAdoption.jurisdictions.UT
            .authoritativeSourceSlots,
        substantiveReliefTracks:
          sessionDCounselAdoption.jurisdictions.UT
            .authoritativeSubstantiveReliefTracks,
        normalizedNodes:
          sessionDCounselAdoption.jurisdictions.UT
            .authoritativeNormalizedNodes
      },
      VT: {
        sourceSlots:
          sessionDCounselAdoption.jurisdictions.VT
            .authoritativeSourceSlots,
        substantiveReliefTracks:
          sessionDCounselAdoption.jurisdictions.VT
            .authoritativeSubstantiveReliefTracks,
        normalizedNodes:
          sessionDCounselAdoption.jurisdictions.VT
            .authoritativeNormalizedNodes
      },
      WV: {
        sourceSlots:
          sessionDCounselAdoption.jurisdictions.WV
            .authoritativeSourceSlots,
        substantiveReliefTracks:
          sessionDCounselAdoption.jurisdictions.WV
            .authoritativeSubstantiveReliefTracks,
        normalizedNodes:
          sessionDCounselAdoption.jurisdictions.WV
            .authoritativeNormalizedNodes,
        reviewedThrough:
          sessionDCounselAdoption.jurisdictions.WV.reviewedThrough,
        packagingDate:
          sessionDCounselAdoption.jurisdictions.WV.packagingDate
      }
    },
    normalizationStructureAuthorized: true,
    normalizationExecutionAuthorized: false,
    packetReadyChanged: false,
    runtimeEffect: "none",
    productionEffect: "none"
  }
);
assert.deepEqual(
  {
    sha256: fileSha256(sessionBReadinessBundlePath),
    bytes: fs.statSync(path.join(ROOT, sessionBReadinessBundlePath)).size,
    jurisdictions: sessionBReadinessManifest.jurisdictionCount,
    slots: sessionBReadinessManifest.inventorySlotCount
  },
  {
    sha256: "d9a97ca8401193b775f09224860bb764a7eda00d7303a032ff525d0bf10bd3df",
    bytes: 631596,
    jurisdictions: 12,
    slots: 182
  }
);
assert.deepEqual(
  {
    sha256: fileSha256(sessionDReadinessBundlePath),
    bytes: fs.statSync(path.join(ROOT, sessionDReadinessBundlePath)).size,
    jurisdictions: sessionDReadinessManifest.jurisdictionCount,
    slots: sessionDReadinessManifest.inventorySlotCount
  },
  {
    sha256: "f5271ad2958341abd31c3ab82603c946e4d485a30f0ee384703e3b96c9a20860",
    bytes: 48071,
    jurisdictions: 12,
    slots: 131
  }
);
assert.deepEqual(
  {
    sha256: fileSha256(sessionDAdjudicationPath),
    manifestSha256: fileSha256(sessionDAdjudicationManifestPath),
    parentResearchCommit: sessionDAdjudication.parentResearchCommit,
    productionEffect: sessionDAdjudication.productionEffect
  },
  {
    sha256: "911e68f8455184a7926e7bfee5f327a3df7e60ceb115c206dcf71b0b442dc9a2",
    manifestSha256: "b4e2a75b7abf49ea3e8be3d589091193cbec6474b06a5713baf3830aa4398924",
    parentResearchCommit: "e341927a42ea54abb8b03e587493a5826fa3e0d3",
    productionEffect: "none"
  }
);
assert.equal(
  sessionDAdjudicationManifest.fileSha256,
  fileSha256(sessionDAdjudicationPath)
);
assert.deepEqual(
  {
    sha256: fileSha256(sessionDCounselAdoptionPath),
    manifestSha256: fileSha256(sessionDCounselAdoptionManifestPath),
    manifestFileSha256:
      sessionDCounselAdoptionManifest.fileSha256,
    parentAdjudicationSha256:
      sessionDCounselAdoption.parentAdjudication.sha256,
    normalizationStructureAuthorized:
      sessionDCounselAdoption.scope.normalizationStructureAuthorized,
    normalizationExecutionAuthorized:
      sessionDCounselAdoption.scope.normalizationExecutionAuthorized,
    runtimeEnablementAuthorized:
      sessionDCounselAdoption.scope.runtimeEnablementAuthorized,
    deploymentAuthorized:
      sessionDCounselAdoption.scope.deploymentAuthorized
  },
  {
    sha256: "2510b9a9b095f279fc8e7277f10d4c712a45175e75f48b5d30bd410e20419561",
    manifestSha256: "76875b3d4f689c3303863f4e408dceab8c4fa3bee24a2c1bcdffdb399f0e8fdb",
    manifestFileSha256:
      "2510b9a9b095f279fc8e7277f10d4c712a45175e75f48b5d30bd410e20419561",
    parentAdjudicationSha256:
      "911e68f8455184a7926e7bfee5f327a3df7e60ceb115c206dcf71b0b442dc9a2",
    normalizationStructureAuthorized: true,
    normalizationExecutionAuthorized: false,
    runtimeEnablementAuthorized: false,
    deploymentAuthorized: false
  }
);
const sessionDReadinessByJurisdiction = new Map(
  remainingNormalizations
    .filter((entry) =>
      ["RI", "SC", "SD", "TN", "TX", "UT", "VA", "VT", "WA", "WI", "WV", "WY"]
        .includes(entry.jurisdiction)
    )
    .map((entry) => [entry.jurisdiction, entry.normalizationReadiness])
);
assert.deepEqual(
  Object.fromEntries(
    [...sessionDReadinessByJurisdiction].map(([jurisdiction, readiness]) => [
      jurisdiction,
      readiness.readinessBlockers
    ])
  ),
  {
    RI: [],
    SC: [],
    SD: [],
    TN: [],
    TX: [],
    UT: [],
    VA: [],
    VT: [],
    WA: [],
    WI: [],
    WV: [],
    WY: []
  }
);
assert.equal(sessionDAdjudication.scOfficialSourceMap.statutes.length, 10);
assert.equal(sessionDAdjudication.scOfficialSourceMap.forms.length, 4);
assert.equal(sessionDAdjudication.utCountResult.controllingCount, null);
assert.equal(sessionDAdjudication.vtCountResult.controllingCount, null);
assert.equal(sessionDAdjudication.wvCountResult.controllingCount, null);
assert.equal(sessionDAdjudication.wvDateResult.resolvableFromDocumentAlone, false);
assert.deepEqual(
  {
    UT: {
      sourceSlots:
        sessionDCounselAdoption.jurisdictions.UT
          .authoritativeSourceSlots,
      reliefTracks:
        sessionDCounselAdoption.jurisdictions.UT
          .authoritativeSubstantiveReliefTracks,
      normalizedNodes:
        sessionDCounselAdoption.jurisdictions.UT
          .authoritativeNormalizedNodes
    },
    VT: {
      sourceSlots:
        sessionDCounselAdoption.jurisdictions.VT
          .authoritativeSourceSlots,
      reliefTracks:
        sessionDCounselAdoption.jurisdictions.VT
          .authoritativeSubstantiveReliefTracks,
      normalizedNodes:
        sessionDCounselAdoption.jurisdictions.VT
          .authoritativeNormalizedNodes
    },
    WV: {
      sourceSlots:
        sessionDCounselAdoption.jurisdictions.WV
          .authoritativeSourceSlots,
      reliefTracks:
        sessionDCounselAdoption.jurisdictions.WV
          .authoritativeSubstantiveReliefTracks,
      normalizedNodes:
        sessionDCounselAdoption.jurisdictions.WV
          .authoritativeNormalizedNodes,
      reviewedThrough:
        sessionDCounselAdoption.jurisdictions.WV.reviewedThrough,
      packagingDate:
        sessionDCounselAdoption.jurisdictions.WV.packagingDate
    }
  },
  {
    UT: { sourceSlots: 15, reliefTracks: 14, normalizedNodes: 15 },
    VT: { sourceSlots: 14, reliefTracks: 11, normalizedNodes: 11 },
    WV: {
      sourceSlots: 10,
      reliefTracks: 10,
      normalizedNodes: 12,
      reviewedThrough: "2026-08-01",
      packagingDate: "2026-08-02"
    }
  }
);
assert.match(
  sessionDReadinessByJurisdiction.get("UT").openQuestions.join("\n"),
  /UT-PET-10/
);
assert.deepEqual(
  sessionDReadinessByJurisdiction.get("WV").reviewDateEvidence,
  {
    filenameAsOf: "2026-08-02",
    internalReviewDate: "2026-08-01",
    status: "reconciled"
  }
);
assert.ok(
  sessionDReadinessByJurisdiction
    .get("VT")
    .officialAuthorityRefreshRequirements.every(({ officialUrl }) =>
      officialUrl.startsWith("https://legislature.vermont.gov/")
    )
);
assert.ok(
  sessionDReadinessByJurisdiction
    .get("WY")
    .officialAuthorityRefreshRequirements.every(({ officialUrl }) =>
      officialUrl.startsWith("https://wyoleg.gov/")
    )
);
assert.equal(
  factoryPlan.jobs.find(
    (entry) =>
      entry.jobId ===
      "rcap-nationwide-normalization-readiness-foundation"
  ).status,
  "completed"
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
const normalizedTrackCount = normalizedKeys.length;
assert.equal(new Set(normalizedKeys).size, normalizedTrackCount);
const trackById = new Map(
  normalizedTracks.tracks.map((track) => [track.trackId, track])
);
assert.equal(
  trackById.size,
  normalizedTrackCount,
  "Normalized track IDs must be globally unique."
);
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
assert.equal(parentTrackKeys.length, 250);
assert.equal(authorityOnlyKeys.length, 5);
assert.equal(completedMississippiKeys.length, 5);
const staticCanonicalTrackPartition = [
  ...parentTrackKeys,
  ...authorityOnlyKeys,
  ...completedMississippiKeys
].sort();
assert.equal(
  new Set(staticCanonicalTrackPartition).size,
  staticCanonicalTrackPartition.length
);
const staticCanonicalTrackKeys = new Set(staticCanonicalTrackPartition);
const dynamicallyResolvedTrackKeys = normalizedKeys.filter(
  (trackKey) => !staticCanonicalTrackKeys.has(trackKey)
);
// Every track that no static canonical-parent record claims must belong to a
// normalization wave integrated after those records were authored — and every
// track of such a wave must appear here. Stated as an identity rather than as a
// frozen list, so a wave landing cannot quietly leave a track unaccounted for
// and a hand-edited list cannot drift from the registry.
const dynamicallyResolvedJurisdictions = [
  ...new Set(dynamicallyResolvedTrackKeys.map((key) => key.split(":")[0]))
].sort();
assert.deepEqual(
  dynamicallyResolvedJurisdictions,
  INTEGRATED_NORMALIZATIONS.filter((jurisdiction) =>
    normalizedKeys.some((key) => key.startsWith(`${jurisdiction}:`))
  )
);
assert.deepEqual(
  dynamicallyResolvedTrackKeys,
  normalizedKeys
    .filter((key) =>
      dynamicallyResolvedJurisdictions.includes(key.split(":")[0])
    )
    .sort()
);
assert.equal(
  staticCanonicalTrackPartition.length +
    dynamicallyResolvedTrackKeys.length,
  normalizedTrackCount
);

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
  sourceMaterializationContract: "a3b28545af4e8953146a97907d22a28c7aec6726",
  normalizationReadinessFoundation: "203b8931391d5636fda3a3fcfc35c0423c2bf9e3",
  sessionBNormalizationResearch: "f54348b5dc5f448e5a5b3916ca98388f84c7f704",
  sessionDNormalizationResearch: "e341927a42ea54abb8b03e587493a5826fa3e0d3",
  sessionDNormalizationAdjudication: "6ecee4740f7bec047c250ca5c2d6c5a941cba87a",
  sessionEOfficialPdfSourceContract: "967847cc2e617defd2d87b18e42bb692cb39cab6",
  michiganGuidance: "7dbe89fe733474a90cc1ad20b5c11dc1a6520aa5",
  pennsylvaniaNormalization: "387656ac31a49f7338bd9d1e3e170df929659d98",
  dcGuidance: "03505f1659072e28b245dfd9677426a995960bdd",
  minnesotaGuidance: "bf6f368c8a4cd72e0fa488bd37336c073f116925",
  connecticutGuidance: "fd9ef0bfc18f11d0b34d7504682a574e2a849d06",
  marylandGuidance: "8dfdc7ae28a6362825ae19621e8a7afd6d8cef6c",
  alaskaGuidance: "36509c7377c5653db07fd5c43b3948aad079164a",
  californiaGuidance: "26b4661089849a67eb99bfae6598ba101f75cbbc",
  louisianaGuidance: "df4a5976692134bde5d6033a4ee988f3c83bd432",
  coloradoGuidance: "7be280c8be25bc19e497d668d48abaadfd89ca44",
  delawareGuidance: "c7af8cf48d42c69590a966141f5373c4ab596675",
  georgiaGuidance: "de0e2debc59aab9f82672876c42c9d542f3bcb18",
  illinoisGuidance: "fd8d51980cab60c67aa13de01da80035a3d7a6a0",
  pennsylvaniaGuidance: "8b996476aa44899b07643546688c60a2cbd09771",
  coloradoIdentityReconciliation: "6afe0d989bb079dbd1eab377b0547b9b6908d902",
  alaskaPublicOfficialDownload: "4acded00a77584b0ea9c9f00e490e2a6a92dd033",
  mainePublicOfficialDownload: "6912e16bc73dbb85612dc5ede86c6a472e5c1e91",
  michiganPublicOfficialDownload: "6ad135bcd8ef53b36a8c63948056fec546ba24d0",
  idahoPublicOfficialDownload: "95c47cdbf031b71164e8f2ea4fb71299f61aad9b",
  illinoisPublicOfficialDownload: "17e9cad367543a4f7b21b30d754d09e51ffbd898",
  coloradoAutomationBlockedDisposition: "2666e25fe748c021f5c668030fcabc7dac8b3fc4",
  coloradoJdf417IdentityAdjudication: "124559c3a6c0010ed1d6883660268b0fcf4585fd",
  kansasCoverSheetIdentityAdjudication: "facfa75f6e25472181a4a40eac6c61c6809e720f",
  californiaCrm307ScopeAdjudication: "610f36c450173fc856fbbb188171d67e64f18845",
  kansasCommercialLicenseDisposition: "b0cfdae005c897083180e2d49e48059b0f495463"
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
  sourceMaterializationContract: "37cb49b645bee42739d7dea32960a45b1927689f",
  normalizationReadinessFoundation: "203b8931391d5636fda3a3fcfc35c0423c2bf9e3",
  sessionBNormalizationResearch: "2cda74784c8fc31752cedcf9f371ac22979aa730",
  sessionDNormalizationResearch: "e48d3dc6c859735f8422d491c29cdf43c964457a",
  sessionDNormalizationAdjudication: "6c49a80ff3f8d9007b01a0bb3e8270041708c300",
  sessionEOfficialPdfSourceContract: "ebac8bf04adeafd994840b44b6116908c9b887a2",
  michiganGuidance: "e54449dd7ac5eb21c6b54273ca468cb08f89d78d",
  pennsylvaniaNormalization: "50cabd1631c2df656200815b0238ec1f9398c1a5",
  dcGuidance: "6bd7d2e4d3d587453ecea391e484631d7e9bbce9",
  minnesotaGuidance: "6ae18ce82c1e7fb36aa47ff6fc291c22c91284a2",
  connecticutGuidance: "e8b071aef4160a3e4841d4af880bd9e4fad840fc",
  marylandGuidance: "0c7e522e7ff6d88fec17fd1adff9e9103c808dd9",
  alaskaGuidance: "e6b094f5ffabda47afd29242035e54dd2e0a2b9b",
  californiaGuidance: "489a620e4c9d2e8b3ec8d9e5137aa71532ae63d4",
  louisianaGuidance: "600c7d8c7cc14223ab9a787ce3790e12de2c8970",
  coloradoGuidance: "6b534760fa831799d307628fe17a857efc404cde",
  delawareGuidance: "d2a4ea1129a98ee953e75c11728fef81888e1789",
  georgiaGuidance: "c11b14d90fdd484664149ab914896102493d2062",
  illinoisGuidance: "b023d0ecca422c27b7c4324c6f1ced45f8230024",
  pennsylvaniaGuidance: "e285071728b92809a36b4e445b21442c2202f2f5",
  coloradoIdentityReconciliation: "2cd68354efa3ee36683f17a2d5719df5e7c22159",
  alaskaPublicOfficialDownload: "ac007a0e030c1e9a741273eea2de7dd4e602168e",
  mainePublicOfficialDownload: "9fd0122e3896c528398dbbc88d473391cbfac7e1",
  michiganPublicOfficialDownload: "8411cb87f1b7e4b59cf505f78887f30e78bed38b",
  idahoPublicOfficialDownload: "a0b2a08384ede082da4a41ef960f46a0f54ba970",
  illinoisPublicOfficialDownload: "402d6287ad935b98c1bfa7cf870cc2fd4c3e2666",
  coloradoAutomationBlockedDisposition: "e7d2933cbca620b2921f982a7415408815ea1f46",
  coloradoJdf417IdentityAdjudication: "6f490c12dbd11709f5d77705eb2b36bad0e174b5",
  kansasCoverSheetIdentityAdjudication: "e30abd00e152d69af1ada17e1b8ae64e66e449aa",
  californiaCrm307ScopeAdjudication: "51d7d8c8536ac7c914a542bff505719745c3802b",
  kansasCommercialLicenseDisposition: "ddb90b6f199c5b07f61f8fedfcf6fd7f5157f842"
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
assert.equal(trackSourceAudit.totals.tracksAudited, normalizedTrackCount);
assert.equal(
  trackSourceAudit.totals.tracksCleared +
    trackSourceAudit.totals.tracksBlocked,
  normalizedTrackCount
);
assert.deepEqual(productionPlan.readinessMetrics.current, {
  authorityCleared: trackSourceAudit.totals.tracksCleared,
  authorityBlocked: trackSourceAudit.totals.tracksBlocked,
  sourcePinned: 67,
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

assert.equal(
  factoryPlan.trackReconciliation.normalizedTracks,
  normalizedTrackCount
);
assert.equal(
  factoryPlan.trackReconciliation.representedExactlyOnce,
  normalizedTrackCount
);
assert.equal(factoryPlan.trackReconciliation.implementationComplete, 83);
assert.equal(
  factoryPlan.trackReconciliation.pendingProductionJob,
  normalizedTrackCount -
    factoryPlan.trackReconciliation.implementationComplete
);
assert.equal(
  productionPlan.baselineVerification.confirmed.implementedTracksAwaitingReview,
  52
);
assert.equal(
  productionPlan.baselineVerification.confirmed.tracksAwaitingLegalRecommendation,
  50
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
)).size, normalizedTrackCount);

const completed = factoryPlan.trackReconciliation.assignments.filter(
  (entry) => entry.disposition === "implementation_complete"
);
assert.equal(completed.filter((entry) => entry.jurisdiction === "MS").length, 5);
assert.equal(completed.filter((entry) => entry.jurisdiction === "GA").length, 13);
assert.equal(completed.filter((entry) => entry.jurisdiction === "IL").length, 6);
assert.equal(completed.filter((entry) => entry.jurisdiction === "PA").length, 3);
assert.deepEqual(
  completed
    .filter((entry) => entry.jurisdiction === "MD")
    .map((entry) => entry.trackId)
    .sort(),
  [
    "md_10103_1_automatic",
    "md_10103_legacy_police",
    "md_10104_pre_service",
    "md_10105_1_automatic",
    "md_10112_dpscs_cannabis",
    "md_second_chance_shielding"
  ]
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
        entry.strategyFamily !== "legal_design_adjudication" &&
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
  ["rcap-md-official-pdf-supporting-components"]
);
assert.equal(
  activeMarylandImplementation[0].officialPdfAssignment
    .existingImplementationMaterializationOnlyIdentityKeys.length,
  2
);
assert.equal(activeMarylandImplementation[0].status, "blocked");
assert.equal(
  activeMarylandImplementation[0].officialPdfAssignment.assignmentState,
  "exact_pinned_assignment_blocked_non_source_dependencies"
);
assert.equal(
  activeMarylandImplementation[0].trackIds.includes("md_second_chance_shielding"),
  false
);
assert.ok(
  activeMarylandImplementation[0].trackIds.every((trackId) =>
    staticMarylandJob.authorityOnlyRoutes.includes(trackId)
  )
);
assert.deepEqual(
  activeMarylandImplementation[0].officialPdfAssignment.unresolvedOrTerminalIdentities.map(
    (entry) => entry.disposition
  ),
  ["source_gated_identity", "source_gated_identity", "source_gated_identity"]
);

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
const readyNormalizationJobsForSession = (session) =>
  factoryPlan.jobs
    .filter(
      (entry) =>
        /-legal-design-normalization$/u.test(entry.jobId) &&
        entry.status === "ready" &&
        entry.assignmentClaim?.ownerSession === session
    )
    .map((entry) => entry.jobId)
    .sort()
    .slice(0, 4);
const firstSessionBNormalizationJobs =
  readyNormalizationJobsForSession("SESSION_B");
const firstSessionDNormalizationJobs =
  readyNormalizationJobsForSession("SESSION_D");
assert.deepEqual(
  productionPlan.nextSessionAssignments.map((assignment) => ({
    session: assignment.session,
    jobId: assignment.jobId
  })),
  []
);
assert.deepEqual(
  productionPlan.routingReservations.sessionB.preferredFirstJobs,
  firstSessionBNormalizationJobs
);
assert.deepEqual(
  productionPlan.routingReservations.sessionD.preferredFirstJobs,
  firstSessionDNormalizationJobs
);
assert.equal(
  productionPlan.routingReservations.normalizationReadiness.bundlesReceived,
  24
);
assert.equal(
  productionPlan.routingReservations.normalizationReadiness.jurisdictionsBlocked,
  0
);
assert.deepEqual(
  productionPlan.routingReservations.normalizationReadiness
    .firstSessionBJobsAfterReadiness,
  firstSessionBNormalizationJobs
);
assert.deepEqual(
  productionPlan.routingReservations.normalizationReadiness
    .firstSessionDJobsAfterReadiness,
  firstSessionDNormalizationJobs
);
assert.deepEqual(
  productionPlan.routingReservations.sessionF.canonicalParentJobIds,
  [
    "AUTH-01-in-repo-authority-pinning",
    "EXC-01-ks-commercial-use-determination"
  ]
);
assert.equal(
  factoryPlan.jobClaims.claims.length,
  readJson(
    "data/record-clearing/production-factory/job-claims.json"
  ).claims.length
);
assert.equal(
  new Set(factoryPlan.jobClaims.claims.map((claim) => claim.jobId)).size,
  factoryPlan.jobClaims.claims.length
);
assert.ok(factoryPlan.jobClaims.claims.every((claim) => claim.status === "reserved"));
assert.equal(
  factoryPlan.jobClaims.claims.filter(
    (claim) => claim.ownerSession === "SESSION_E"
  ).length,
  26
);
const reservedNextJobIds = new Set([
  ...productionPlan.routingReservations.sessionB.preferredFirstJobs,
  ...productionPlan.routingReservations.sessionD.preferredFirstJobs
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
  authorityCleared: trackSourceAudit.totals.tracksCleared,
  authorityBlocked: trackSourceAudit.totals.tracksBlocked,
  sourcePinned: 67,
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
  // 40 before the Session D wave-2 and Session B wave-1 integrations, 51 after
  // them, and 55 once Session D's final wave (UT, VT, TX, TN) landed.
  55
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
assert.equal(status.totals.tracks, normalizedTrackCount);
assert.equal(status.totals.normalized, normalizedTrackCount);
assert.equal(status.totals.implementationComplete, 33);
assert.equal(status.totals.technicalProofPassed, 33);
assert.equal(status.totals.visualProofPassed, 17);
assert.equal(status.totals.legalRecommendationComplete, 19);
assert.equal(status.totals.counselAdopted, 15);
assert.equal(status.totals.stagingPassed, 0);
assert.equal(status.totals.productionEnabled, 0);
assert.equal(status.totals.packetReady, 0);
assert.equal(status.totals.enabledJurisdictions, 0);
assert.equal(status.totals.launchGate, "red");
assert.equal(
  factoryPlan.sourceSummary.authority.clearedTracks,
  trackSourceAudit.totals.tracksCleared
);
assert.equal(
  factoryPlan.sourceSummary.authority.blockedTracks,
  trackSourceAudit.totals.tracksBlocked
);

console.log("Integrated RCAP production plan verification passed.");
console.log("  PASS tracked Master Library 1.2 reconciliation remains internally consistent");
console.log("  PASS 109 acquisition records represented exactly once");
console.log("  PASS 313 official evidence records and 32 issuer campaigns preserved");
console.log(`  PASS ${normalizedTrackCount} normalized tracks represented exactly once`);
console.log("  PASS 83 engineering-complete tracks excluded from pending implementation");
console.log("  PASS 15 exact implemented routes counsel-adopted by hash");
console.log("  PASS packet_ready=0 enabled_jurisdictions=0 launch_gate=red");
