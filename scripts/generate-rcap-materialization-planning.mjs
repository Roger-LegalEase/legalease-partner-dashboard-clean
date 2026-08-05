#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  LEGAL_REVIEW_MATERIALIZATION_CONTRACT_PATH,
  OFFICIAL_PDF_SOURCE_PROJECTION_PATH,
  buildLegalReviewMaterializationContract,
  buildOfficialPdfSourceProjection,
  stableJson,
  validateLegalReviewMaterializationContract,
  validateOfficialPdfSourceProjection
} from "./lib/rcap-factory/materialization-planning.mjs";
import { buildFactoryPlan } from "./lib/rcap-factory/planner.mjs";
import {
  officialPdfProofPathFor,
  verifyOfficialPdfImplementationProof
} from "./lib/rcap-factory/official-pdf-proof.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const write = process.argv.includes("--write");
const unsupported = process.argv.slice(2).filter((argument) => argument !== "--write");
if (unsupported.length > 0) {
  throw new Error(`Unsupported arguments: ${unsupported.join(", ")}`);
}

const outputs = [
  {
    path: LEGAL_REVIEW_MATERIALIZATION_CONTRACT_PATH,
    value: buildLegalReviewMaterializationContract(ROOT),
    validate: validateLegalReviewMaterializationContract
  },
  {
    path: OFFICIAL_PDF_SOURCE_PROJECTION_PATH,
    value: buildOfficialPdfSourceProjection(ROOT),
    validate: validateOfficialPdfSourceProjection
  }
];

for (const output of outputs) {
  const issues = output.validate(output.value);
  if (issues.length > 0) {
    throw new Error(`${output.path} is invalid:\n- ${issues.join("\n- ")}`);
  }
  const serialized = stableJson(output.value);
  const absolutePath = path.join(ROOT, output.path);
  if (write) {
    fs.writeFileSync(absolutePath, serialized);
    process.stdout.write(`wrote ${output.path}\n`);
  } else {
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`${output.path} is missing; run with --write.`);
    }
    const current = fs.readFileSync(absolutePath, "utf8");
    if (current !== serialized) {
      throw new Error(`${output.path} is stale; run with --write.`);
    }
    process.stdout.write(`verified ${output.path}\n`);
  }
}

const productionPlanPath =
  "planning/record-clearing-100-percent/production-plan.json";
const productionPlanAbsolute = path.join(ROOT, productionPlanPath);
const productionPlan = JSON.parse(
  fs.readFileSync(productionPlanAbsolute, "utf8")
);
const recordedFactoryBase =
  productionPlan.factoryQueueReconciliation?.generatedAgainstCommit;
if (
  !write &&
  (typeof recordedFactoryBase !== "string" ||
    !/^[0-9a-f]{40}$/u.test(recordedFactoryBase))
) {
  throw new Error(
    `${productionPlanPath} has no valid recorded factory planning base.`
  );
}
const factoryPlan = buildFactoryPlan({
  rootDir: ROOT,
  ...(!write ? { baseCommit: recordedFactoryBase } : {})
});
const byStatus = tally(factoryPlan.jobs, (job) => job.status);
const byLane = Object.fromEntries(
  factoryPlan.lanes.map((lane) => [lane.lane, lane.jobIds.length])
);
const reviewContract = outputs[0].value;
const projection = outputs[1].value;
const reconciliation = JSON.parse(
  fs.readFileSync(
    path.join(
      ROOT,
      "data/record-clearing/production-factory/official-pdf-source-contract-reconciliation.json"
    ),
    "utf8"
  )
);
const officialJobs = factoryPlan.jobs.filter(
  (job) => (job.officialPdfAssignment?.identityKeys?.length ?? 0) > 0
);
const jobClaimsPath =
  "data/record-clearing/production-factory/job-claims.json";
const jobClaimsAbsolute = path.join(ROOT, jobClaimsPath);
const materializationPlanningSnapshot = {
  legalReviewMaterialization: {
    contractPath: LEGAL_REVIEW_MATERIALIZATION_CONTRACT_PATH,
    ownerJobs: reviewContract.assignmentCount,
    readyJobs: factoryPlan.materializationPlanning.legalReviewMaterialization.readyJobs,
    blockedJobs:
      factoryPlan.materializationPlanning.legalReviewMaterialization.blockedJobs,
    completedJobs:
      factoryPlan.materializationPlanning.legalReviewMaterialization.completedJobs,
    externalArchiveStatus:
      factoryPlan.materializationPlanning.legalReviewMaterialization
        .externalArchiveStatus,
    materializedReviews:
      factoryPlan.materializationPlanning.legalReviewMaterialization
        .completedJobs
  },
  officialPdfAssignment: {
    projectionPath: OFFICIAL_PDF_SOURCE_PROJECTION_PATH,
    queueIdentities: projection.coverage.queueIdentityCount,
    exactSourceContracts: projection.coverage.exactSourceContractCount,
    exactWorkerAssignable: projection.coverage.assignmentEligibleCount,
    assignedToNewImplementationChildren:
      factoryPlan.materializationPlanning.officialPdfProjection
        .assignedToNewImplementationChildren,
    existingImplementationMaterializationOnly:
      factoryPlan.materializationPlanning.officialPdfProjection
        .existingImplementationMaterializationOnly,
    childJobsWithExactAssignments: officialJobs.length,
    readyFamilies:
      factoryPlan.materializationPlanning.officialPdfChildren
        .workerReadyFamilies,
    blockedFamilies:
      factoryPlan.materializationPlanning.officialPdfChildren.blockedFamilies,
    materializedSources:
      factoryPlan.materializationPlanning.officialPdfChildren
        .materializedSources,
    dispositionCounts: projection.coverage.countsByDisposition,
    projectionIsMaterialization: false,
    materializationIsImplementation: false,
    implementationIsApproval: false,
    approvalIsRuntimeEnablement: false
  }
};
const marylandShieldingSourceReady = officialJobs.some((job) =>
  (job.sourceMaterializationInputs ?? []).some(
    (input) =>
      input.documentId === "CC-DC-CR-148" &&
      input.workerReadiness === "worker_ready"
  )
);
const completedGuidanceTrackCount = factoryPlan.jobs
  .filter(
    (job) =>
      job.lane === "guidance_implementation" &&
      job.status === "completed" &&
      job.participantPacketProofRequired === true
  )
  .reduce((count, job) => count + job.trackIds.length, 0);
const participantPacketProofReconciliation =
  buildParticipantPacketProofReconciliation(factoryPlan);
const officialPdfImplementationProofReconciliation =
  buildOfficialPdfImplementationProofReconciliation(factoryPlan);
const guidanceImplementationJobs = factoryPlan.jobs.filter(
  (job) =>
    job.lane === "guidance_implementation" &&
    job.strategyFamily !== "legal_design_adjudication"
);
const guidanceAdjudicationJobs = factoryPlan.jobs.filter(
  (job) =>
    job.lane === "guidance_implementation" &&
    job.strategyFamily === "legal_design_adjudication"
);
const completedGuidanceImplementationJobs =
  guidanceImplementationJobs.filter(
    (job) => job.status === "completed"
  );
const guidanceImplementationPoolExhausted =
  guidanceImplementationJobs.length > 0 &&
  completedGuidanceImplementationJobs.length ===
    guidanceImplementationJobs.length;
const guidanceTechnicalPacketProofComplete =
  participantPacketProofReconciliation
    .completedGuidanceJobsRequiringProof ===
    completedGuidanceImplementationJobs.filter(
      (job) => job.participantPacketProofRequired === true
    ).length &&
  participantPacketProofReconciliation.proofsPresentAndVerified ===
    participantPacketProofReconciliation
      .completedGuidanceJobsRequiringProof;
const guidanceLaneReconciliation = {
  schemaVersion: "rcap-guidance-lane-reconciliation/v1",
  implementationJobs: guidanceImplementationJobs.length,
  completedImplementationJobs:
    completedGuidanceImplementationJobs.length,
  readyImplementationJobs: guidanceImplementationJobs.filter(
    (job) => job.status === "ready"
  ).length,
  implementationPoolExhausted:
    guidanceImplementationPoolExhausted,
  workerImplementationStatus:
    guidanceImplementationPoolExhausted ? "complete" : "incomplete",
  technicalPacketProofStatus:
    guidanceTechnicalPacketProofComplete ? "complete" : "incomplete",
  finalPackets: participantPacketProofReconciliation.finalPackets,
  assembledPages: participantPacketProofReconciliation.assembledPages,
  blockedAdjudications: guidanceAdjudicationJobs.filter(
    (job) => job.status === "blocked"
  ).length,
  blockedAdjudicationJobIds: guidanceAdjudicationJobs
    .filter((job) => job.status === "blocked")
    .map((job) => job.jobId)
    .sort(),
  formalVisualProofStatus: "pending",
  finalLegalOutputReviewStatus: "pending",
  counselAdopted: false,
  packetReady: false,
  runtimeStatus: "runtime_disabled",
  productionEnabled: false
};
const normalizationJobs = factoryPlan.jobs.filter(
  (job) =>
    /-legal-design-normalization$/u.test(job.jobId) &&
    job.jurisdiction !== "PA"
);
const normalizationReadyJobs = normalizationJobs
  .filter((job) => job.status === "ready")
  .map((job) => job.jobId)
  .sort();
const normalizationBlockedJobs = normalizationJobs.filter(
  (job) => job.status === "blocked"
);
const normalizationReadyForSession = (session) =>
  normalizationReadyJobs.filter((jobId) => {
    const job = normalizationJobs.find((candidate) => candidate.jobId === jobId);
    return job?.assignmentClaim?.ownerSession === session;
  });
const expectedRoutingReservations = {
  ...productionPlan.routingReservations,
  sessionB: {
    ...productionPlan.routingReservations.sessionB,
    preferredFirstJobs:
      normalizationReadyForSession("SESSION_B").slice(0, 4),
    status: "ready_for_normalization"
  },
  sessionD: {
    ...productionPlan.routingReservations.sessionD,
    preferredFirstJobs:
      normalizationReadyForSession("SESSION_D").slice(0, 4),
    status:
      normalizationBlockedJobs.length === 0
        ? "ready_for_normalization"
        : "partially_ready_with_typed_blockers"
  },
  normalizationReadiness: {
    ...productionPlan.routingReservations.normalizationReadiness,
    status:
      factoryPlan.jobs.find(
        (job) =>
          job.jobId ===
          "rcap-nationwide-normalization-readiness-foundation"
      )?.status ?? "blocked",
    jurisdictionsReady:
      factoryPlan.normalizationReadiness.readyForNormalization,
    jurisdictionsBlocked:
      factoryPlan.normalizationReadiness.blocked,
    blockedByState:
      factoryPlan.normalizationReadiness.byReadinessState,
    sessionDAdjudication: {
      ...productionPlan.routingReservations.normalizationReadiness
        .sessionDAdjudication,
      typedFailClosedStates: Object.fromEntries(
        normalizationJobs
          .filter(
            (job) =>
              job.assignmentClaim?.ownerSession === "SESSION_D" &&
              (job.normalizationReadiness?.readinessBlockers?.length ?? 0) > 0
          )
          .map((job) => [
            job.jurisdiction,
            job.normalizationReadiness.readinessBlockers
          ])
      )
    },
    firstSessionBJobsAfterReadiness:
      normalizationReadyForSession("SESSION_B").slice(0, 4),
    firstSessionDJobsAfterReadiness:
      normalizationReadyForSession("SESSION_D").slice(0, 4),
    scaffoldStatus:
      normalizationBlockedJobs.length === 0
        ? "ready_for_normalization"
        : "ready_except_typed_state_blockers",
    externalInput: {
      path:
        reviewContract.sourceArchive.portableLocator,
      expectedSha256:
        reviewContract.sourceArchive.expectedSha256,
      expectedBytes:
        reviewContract.sourceArchive.expectedBytes,
      status:
        factoryPlan.materializationPlanning.legalReviewMaterialization
          .externalArchiveStatus
    }
  }
};
const expectedNextDispatchWave = {
  ...productionPlan.nextDispatchWave,
  readyJobIds: normalizationReadyJobs,
  ownedPathOverlaps: 0,
  reason:
    `${normalizationReadyJobs.length} normalization jobs have exact verified ` +
    `Edition 1.2 review receipts; ${normalizationBlockedJobs.length} ` +
    `${normalizationBlockedJobs.length === 1 ? "remains" : "remain"} ` +
    "fail-closed on typed state-specific authority blockers."
};
const expectedPlanScope =
  "This integrated baseline includes both immutable normalization-research bundles, " +
  "Session D's controlling source-identity and typed-blocker adjudication, the " +
  "mechanism-inventory-v1 canonical denominator for all 24 readiness jurisdictions, " +
  "24 explicit portable legal-review materialization jobs, Pennsylvania normalization, " +
  `${completedGuidanceTrackCount} track-specific guidance implementations, ` +
  `${guidanceAdjudicationJobs.length} blocked guidance adjudications, ` +
  "Session E's 25-jurisdiction official-PDF " +
  "source-contract reconciliation, one integration-owned 192-identity portable projection, " +
  "18 exact Session E child assignments, and eleven bounded Session F authority results. " +
  `The exact Edition 1.2 archive ${
    factoryPlan.materializationPlanning.legalReviewMaterialization
      .externalArchiveStatus === "external_archive_not_materialized"
      ? "remains absent"
      : "is exact-input verified"
  }, and Maryland CC-DC-CR-148 ${
    marylandShieldingSourceReady
      ? "is materialized and locally verified"
      : "remains absent"
  }. The 24 review receipts are verified and ${
    normalizationReadyJobs.length
  } normalization jobs are data-derived ready; ${
    normalizationBlockedJobs.length
  } ${
    normalizationBlockedJobs.length === 1 ? "remains" : "remain"
  } fail-closed on typed state-specific authority blockers. Official-PDF ` +
  "implementation remains fail-closed. It publishes no edition, enables no route, " +
  "performs no promotion, and deploys nothing.";
const expectedFactoryQueue = {
  ...productionPlan.factoryQueueReconciliation,
  generatedAgainstCommit: factoryPlan.baseCommit,
  jobs: factoryPlan.jobs.length,
  ready: byStatus.ready ?? 0,
  blocked: byStatus.blocked ?? 0,
  inProgress: byStatus.in_progress ?? 0,
  completed: byStatus.completed ?? 0,
  activeOwnedPathOverlaps: 0,
  acquisitionRecordsRepresented:
    factoryPlan.acquisitionReconciliation.researchedDocuments,
  acquisitionDuplicateAssignments:
    factoryPlan.acquisitionReconciliation.duplicateAssignments,
  acquisitionOmissions:
    factoryPlan.acquisitionReconciliation.omissions,
  normalizedTracksRepresentedExactlyOnce:
    factoryPlan.trackReconciliation.representedExactlyOnce,
  completedTracksRegeneratedAsPending: 0,
  canonicalParentMappingPolicy:
    factoryPlan.canonicalPlan.childMappingPolicy,
  byLane
};
const expectedReadinessMetrics = {
  ...productionPlan.readinessMetrics,
  current: {
    ...productionPlan.readinessMetrics.current,
    authorityCleared:
      factoryPlan.sourceSummary.authority.clearedTracks,
    authorityBlocked:
      factoryPlan.sourceSummary.authority.blockedTracks
  }
};
const expectedOfficial = {
  ...productionPlan.officialPdfSourceContractIntegration,
  reconciliationPath:
    "data/record-clearing/production-factory/official-pdf-source-contract-reconciliation.json",
  projectionPath: OFFICIAL_PDF_SOURCE_PROJECTION_PATH,
  projectedDocumentIdentities:
    reconciliation.totals.projectedDocumentIdentities,
  projectedExactWorkerAssignments:
    reconciliation.totals.projectedExactWorkerAssignments,
  unresolvedSourceIdentities:
    reconciliation.queueCoverage.totals.unresolvedSourceIdentities,
  projectedUnresolvedIdentities:
    projection.coverage.countsByDisposition.unresolved_identity,
  terminallyDispositionedOrBlockedIdentities:
    projection.coverage.queueIdentityCount -
    projection.coverage.assignmentEligibleCount,
  normativeAssignedRequirements:
    reconciliation.totals.normativeAssignedRequirements,
  pendingAssignmentFamilies:
    reconciliation.totals.pendingAssignmentFamilies,
  materializationBlockedFamilies:
    reconciliation.totals.materializationBlockedFamilies,
  assignmentMarker: {
    contractPath: "tmp/rcap-factory/job.json",
    status: "generated_worker_local_untracked_by_factory_scaffold",
    owner: "SESSION_E",
    canonicalChildCount: officialJobs.length,
    integrationCheckoutMarkerCreated: false
  },
  portableProjection: {
    path: OFFICIAL_PDF_SOURCE_PROJECTION_PATH,
    status: "integration_owned_projection_present",
    owner: "SESSION_A",
    queueIdentityCount: projection.coverage.queueIdentityCount,
    exactWorkerAssignable: projection.coverage.assignmentEligibleCount,
    dispositionCounts: projection.coverage.countsByDisposition
  },
  materializedSourceCount:
    factoryPlan.materializationPlanning.officialPdfChildren
      .materializedSources,
  activatedRendererCount: 0,
  workerReadyFamilies:
    factoryPlan.materializationPlanning.officialPdfChildren
      .workerReadyFamilies,
  runtimeStatus: "runtime_disabled"
};

if (write) {
  fs.writeFileSync(jobClaimsAbsolute, stableJson(factoryPlan.jobClaims));
  process.stdout.write(`wrote ${jobClaimsPath}\n`);
  productionPlan.factoryQueueReconciliation = expectedFactoryQueue;
  productionPlan.readinessMetrics = expectedReadinessMetrics;
  productionPlan.participantPacketProofReconciliation =
    participantPacketProofReconciliation;
  productionPlan.officialPdfImplementationProofReconciliation =
    officialPdfImplementationProofReconciliation;
  productionPlan.guidanceLaneReconciliation =
    guidanceLaneReconciliation;
  productionPlan.officialPdfSourceContractIntegration = expectedOfficial;
  productionPlan.materializationPlanning = materializationPlanningSnapshot;
  productionPlan.routingReservations = expectedRoutingReservations;
  productionPlan.nextDispatchWave = expectedNextDispatchWave;
  let productionPlanSource = fs.readFileSync(productionPlanAbsolute, "utf8");
  productionPlanSource = upsertTopLevelJsonProperty(
    productionPlanSource,
    "planScope",
    expectedPlanScope
  );
  productionPlanSource = upsertTopLevelJsonProperty(
    productionPlanSource,
    "factoryQueueReconciliation",
    expectedFactoryQueue
  );
  productionPlanSource = upsertTopLevelJsonProperty(
    productionPlanSource,
    "readinessMetrics",
    expectedReadinessMetrics
  );
  productionPlanSource = upsertTopLevelJsonProperty(
    productionPlanSource,
    "participantPacketProofReconciliation",
    participantPacketProofReconciliation
  );
  productionPlanSource = upsertTopLevelJsonProperty(
    productionPlanSource,
    "officialPdfImplementationProofReconciliation",
    officialPdfImplementationProofReconciliation
  );
  productionPlanSource = upsertTopLevelJsonProperty(
    productionPlanSource,
    "guidanceLaneReconciliation",
    guidanceLaneReconciliation
  );
  productionPlanSource = upsertTopLevelJsonProperty(
    productionPlanSource,
    "officialPdfSourceContractIntegration",
    expectedOfficial
  );
  productionPlanSource = upsertTopLevelJsonProperty(
    productionPlanSource,
    "materializationPlanning",
    materializationPlanningSnapshot
  );
  productionPlanSource = upsertTopLevelJsonProperty(
    productionPlanSource,
    "routingReservations",
    expectedRoutingReservations
  );
  productionPlanSource = upsertTopLevelJsonProperty(
    productionPlanSource,
    "nextDispatchWave",
    expectedNextDispatchWave
  );
  fs.writeFileSync(
    productionPlanAbsolute,
    productionPlanSource
  );
  process.stdout.write(`wrote ${productionPlanPath}\n`);
} else {
  const committedClaims = JSON.parse(
    fs.readFileSync(jobClaimsAbsolute, "utf8")
  );
  if (stableJson(committedClaims) !== stableJson(factoryPlan.jobClaims)) {
    throw new Error(`${jobClaimsPath} exact assignment claims are stale.`);
  }
  if (
    productionPlan.planScope !== expectedPlanScope ||
    stableJson(productionPlan.factoryQueueReconciliation) !==
      stableJson(expectedFactoryQueue) ||
    stableJson(productionPlan.readinessMetrics) !==
      stableJson(expectedReadinessMetrics) ||
    stableJson(productionPlan.participantPacketProofReconciliation) !==
      stableJson(participantPacketProofReconciliation) ||
    stableJson(productionPlan.officialPdfImplementationProofReconciliation) !==
      stableJson(officialPdfImplementationProofReconciliation) ||
    stableJson(productionPlan.guidanceLaneReconciliation) !==
      stableJson(guidanceLaneReconciliation) ||
    stableJson(productionPlan.officialPdfSourceContractIntegration) !==
      stableJson(expectedOfficial) ||
    stableJson(productionPlan.materializationPlanning) !==
      stableJson(materializationPlanningSnapshot) ||
    stableJson(productionPlan.routingReservations) !==
      stableJson(expectedRoutingReservations) ||
    stableJson(productionPlan.nextDispatchWave) !==
      stableJson(expectedNextDispatchWave)
  ) {
    throw new Error(`${productionPlanPath} factory planning snapshot is stale.`);
  }
  process.stdout.write(`verified ${productionPlanPath}\n`);
}

function buildParticipantPacketProofReconciliation(factoryPlan) {
  const completed = factoryPlan.jobs.filter(
    (job) =>
      job.lane === "guidance_implementation" &&
      job.status === "completed" &&
      job.participantPacketProofRequired === true
  );
  let finalPackets = 0;
  let assembledPages = 0;
  for (const job of completed) {
    const proofPath =
      `data/record-clearing/production-factory/packet-proofs/${job.jobId}.json`;
    if (!(job.integrationOwnedOutputs ?? []).includes(proofPath)) {
      throw new Error(`${job.jobId} does not reserve ${proofPath}.`);
    }
    const absoluteProofPath = path.join(ROOT, proofPath);
    if (!fs.existsSync(absoluteProofPath)) {
      throw new Error(`${proofPath} is missing.`);
    }
    const proof = JSON.parse(fs.readFileSync(absoluteProofPath, "utf8"));
    const expectedTracks = [...job.trackIds].sort();
    const actualTracks = (proof.samplePackets ?? [])
      .map((packet) => packet.trackId)
      .sort();
    if (
      proof.schemaVersion !== "rcap-participant-packet-proof/v1" ||
      proof.jobId !== job.jobId ||
      proof.parentJobId !== job.parentJobId ||
      proof.completionCommit !== job.completionCommit ||
      proof.verifier?.path !== job.regressionVerifier ||
      proof.verifier?.result !== "passed" ||
      proof.finalPdfCount !== job.trackIds.length ||
      proof.samplePackets?.length !== job.trackIds.length ||
      JSON.stringify(actualTracks) !== JSON.stringify(expectedTracks) ||
      proof.samplePackets.some(
        (packet) =>
          !/^[0-9a-f]{64}$/u.test(packet.assembledSha256 ?? "") ||
          !Number.isInteger(packet.assembledPageCount) ||
          packet.assembledPageCount < 1
      ) ||
      proof.assembledPageCount !==
        proof.samplePackets.reduce(
          (count, packet) => count + packet.assembledPageCount,
          0
        ) ||
      proof.deterministic !== true ||
      proof.generatedPacketBytesTracked !== false ||
      proof.runtimeStatus !== "runtime_disabled" ||
      proof.visualProof !== "pending" ||
      proof.counselAdopted !== false ||
      proof.productionEnabled !== false
    ) {
      throw new Error(`${proofPath} does not reconcile to ${job.jobId}.`);
    }
    finalPackets += proof.finalPdfCount;
    assembledPages += proof.assembledPageCount;
  }
  return {
    schemaVersion: "rcap-participant-packet-proof/v1",
    completedGuidanceJobsRequiringProof: completed.length,
    proofsPresentAndVerified: completed.length,
    assignedTracks: completedGuidanceTrackCount,
    finalPackets,
    assembledPages,
    proofDirectory:
      "data/record-clearing/production-factory/packet-proofs",
    evidenceSource:
      "Each integration-owned proof is generated from its committed regression verifier output; " +
      "worker-authored proof assertions are not accepted.",
    generatedPacketBytesTracked: false,
    runtimeStatus: "runtime_disabled",
    visualProof: "pending",
    counselAdopted: false,
    productionEnabled: false
  };
}

function buildOfficialPdfImplementationProofReconciliation(factoryPlan) {
  const completed = factoryPlan.jobs.filter(
    (job) =>
      ["acroform_fill", "flat_pdf_overlay", "composed_route"].includes(
        job.lane
      ) &&
      job.status === "completed" &&
      (job.integrationOwnedOutputs ?? []).includes(
        officialPdfProofPathFor(job.jobId)
      )
  );
  let assignedTracks = 0;
  let positiveRenderedFixtures = 0;
  let renderedPages = 0;
  let expectedNoDocumentBranches = 0;
  const completedJobIds = [];
  for (const job of completed) {
    const proofPath = officialPdfProofPathFor(job.jobId);
    const verification = verifyOfficialPdfImplementationProof(
      ROOT,
      job,
      {
        proofPath,
        authorityEdition: factoryPlan.authorityEdition
      }
    );
    if (!verification.passed) {
      throw new Error(
        `${proofPath} does not reconcile to ${job.jobId}:\n- ` +
          verification.failures.join("\n- ")
      );
    }
    const proof = verification.proof;
    assignedTracks += job.trackIds.length;
    positiveRenderedFixtures +=
      proof.totals.positiveRenderedFixtures;
    renderedPages += proof.totals.renderedPages;
    expectedNoDocumentBranches +=
      proof.totals.expectedNoDocumentBranches;
    completedJobIds.push(job.jobId);
  }
  return {
    schemaVersion: "rcap-official-pdf-implementation-proof/v1",
    completedOfficialPdfJobsRequiringProof: completed.length,
    proofsPresentAndVerified: completed.length,
    completedJobIds: completedJobIds.sort(),
    assignedTracks,
    positiveRenderedFixtures,
    renderedPages,
    expectedNoDocumentBranches,
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
  };
}

function tally(values, keyFor) {
  const result = {};
  for (const value of values) {
    const key = keyFor(value);
    result[key] = (result[key] ?? 0) + 1;
  }
  return result;
}

function upsertTopLevelJsonProperty(source, property, value) {
  const span = topLevelJsonPropertyValueSpan(source, property);
  const serialized = JSON.stringify(value, null, 2).replaceAll("\n", "\n  ");
  if (span) {
    return `${source.slice(0, span.start)}${serialized}${source.slice(span.end)}`;
  }
  const close = source.lastIndexOf("}");
  if (close === -1 || source.slice(close + 1).trim() !== "") {
    throw new Error("production-plan.json is not a top-level JSON object.");
  }
  const prefix = source.slice(0, close).trimEnd();
  const separator = prefix.endsWith("{") ? "" : ",";
  return (
    `${prefix}${separator}\n\n  ${JSON.stringify(property)}: ` +
    `${serialized}\n${source.slice(close)}`
  );
}

function topLevelJsonPropertyValueSpan(source, property) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === "\"") {
        inString = false;
      }
      continue;
    }
    if (character === "\"") {
      const stringStart = index;
      inString = true;
      let end = index + 1;
      let stringEscaped = false;
      for (; end < source.length; end += 1) {
        const stringCharacter = source[end];
        if (stringEscaped) {
          stringEscaped = false;
        } else if (stringCharacter === "\\") {
          stringEscaped = true;
        } else if (stringCharacter === "\"") {
          break;
        }
      }
      if (depth === 1) {
        const token = JSON.parse(source.slice(stringStart, end + 1));
        let cursor = end + 1;
        while (/\s/u.test(source[cursor] ?? "")) cursor += 1;
        if (token === property && source[cursor] === ":") {
          cursor += 1;
          while (/\s/u.test(source[cursor] ?? "")) cursor += 1;
          return {
            start: cursor,
            end: jsonValueEnd(source, cursor)
          };
        }
      }
      index = end;
      inString = false;
      continue;
    }
    if (character === "{" || character === "[") depth += 1;
    if (character === "}" || character === "]") depth -= 1;
  }
  return null;
}

function jsonValueEnd(source, start) {
  const opening = source[start];
  if (opening !== "{" && opening !== "[") {
    let cursor = start;
    let inString = false;
    let escaped = false;
    for (; cursor < source.length; cursor += 1) {
      const character = source[cursor];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === "\"") inString = false;
      } else if (character === "\"") {
        inString = true;
      } else if (character === "," || character === "}") {
        return cursor;
      }
    }
    return cursor;
  }
  const closing = opening === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let cursor = start; cursor < source.length; cursor += 1) {
    const character = source[cursor];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === "\"") inString = false;
      continue;
    }
    if (character === "\"") {
      inString = true;
    } else if (character === opening) {
      depth += 1;
    } else if (character === closing) {
      depth -= 1;
      if (depth === 0) return cursor + 1;
    }
  }
  throw new Error(`Unterminated JSON value for ${opening}.`);
}
