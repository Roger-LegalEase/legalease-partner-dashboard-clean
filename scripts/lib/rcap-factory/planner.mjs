import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  FACTORY_LANES,
  FACTORY_SCHEMA_VERSION,
  assertValidFactoryPlan,
  normalizeRepoPath
} from "./schema.mjs";

export const FACTORY_INPUT_PATHS = Object.freeze({
  authority: "data/record-clearing/master-library/authority.json",
  normalizedTracks: "data/record-clearing/legal-design-track-registry.json",
  sourceRelationships: "data/record-clearing/legal-design-track-source-relationships.json",
  blockerLedger: "data/record-clearing/master-library/authoritative-blocker-ledger.json",
  sourceAcquisitionQueue: "data/record-clearing/master-library/source-acquisition-queue.json",
  implementationQueue: "data/record-clearing/legal-design-implementation-queue.json",
  packetSetManifests: "data/record-clearing/legal-design-packet-set-manifests.json",
  sourceArtifacts: "data/record-clearing/source-artifact-registry.json",
  allStateBuildStatus: "data/rcap-all50/all-state-build-manifest.json",
  promotionReadiness: "docs/record-clearing/promotion-readiness-matrix.json",
  runtimeRegistry: "src/lib/rcap/packets/registry.ts",
  packetCapabilityRegistry: "src/lib/rcap/jurisdictions/packet-capability.ts",
  statePromotionManifest: "src/lib/rcap/state-promotion-manifest.ts",
  all51ReviewSignoff: "docs/rcap-promotion/all51-final-review-signoff.json",
  trackSourceAudit: "data/record-clearing/master-library/track-source-audit.json",
  productionPlan: "planning/record-clearing-100-percent/production-plan.json",
  acquisitionDocuments:
    "planning/record-clearing-100-percent/acquisition-intelligence/documents.json",
  acquisitionCampaigns:
    "planning/record-clearing-100-percent/acquisition-intelligence/acquisition-campaign.json",
  acquisitionIssuers:
    "planning/record-clearing-100-percent/acquisition-intelligence/issuer-directory.json",
  acquisitionUnresolved:
    "planning/record-clearing-100-percent/acquisition-intelligence/unresolved.json",
  acquisitionReadme:
    "planning/record-clearing-100-percent/acquisition-intelligence/README.md"
});

export const GLOBAL_GENERATED_REGISTRIES = Object.freeze([
  "data/rcap-all50/all-state-build-manifest.json",
  "data/record-clearing/legal-design-batch-delta-report.json",
  "data/record-clearing/legal-design-guidance-rereview-queue.json",
  "data/record-clearing/legal-design-implementation-queue.json",
  "data/record-clearing/legal-design-legal-research-queue.json",
  "data/record-clearing/legal-design-packet-set-manifests.json",
  "data/record-clearing/legal-design-specifications.json",
  "data/record-clearing/legal-design-track-registry.json",
  "data/record-clearing/legal-design-track-source-relationships.json",
  "data/record-clearing/relief-track-registry.json",
  "data/record-clearing/source-artifact-registry.json",
  "data/record-clearing/production-factory/review-manifests",
  "src/lib/rcap/jurisdictions/packet-capability.ts",
  "src/lib/rcap/packets/registry.ts",
  "src/lib/rcap/state-promotion-manifest.ts",
  "src/lib/rcap/state-promotion-rules.ts"
]);

export const GLOBAL_WORKER_FORBIDDEN_PATHS = Object.freeze([
  ".env",
  ".env.development",
  ".env.development.local",
  ".env.local",
  ".env.production",
  ".env.production.local",
  ".env.test",
  ".env.test.local",
  ".github/workflows",
  "data/record-clearing/master-library/authority.json",
  "data/record-clearing/master-library/edition-1-2",
  "planning/record-clearing-100-percent/acquisition-intelligence",
  "planning/record-clearing-100-percent/jobs",
  "planning/record-clearing-100-percent/production-plan.json",
  "package-lock.json",
  "package.json",
  "supabase",
  ...GLOBAL_GENERATED_REGISTRIES
].sort());

export const WAVE_INTEGRATION_VALIDATION = Object.freeze([
  "npm run rcap:factory:test",
  "npm run rcap:verify-integrated-production-plan",
  "npm run rcap:verify-master-library-authority",
  "npm run typecheck",
  "npm test"
]);

const IMPLEMENTATION_DIR = "data/record-clearing/implementation-tranches";
const CANONICAL_JOBS_DIR = "planning/record-clearing-100-percent/jobs";
const REVIEW_MANIFEST_DIR = "data/record-clearing/production-factory/review-manifests";
const FACTORY_DATA_DIR = "data/record-clearing/production-factory";
const PACKET_IMPLEMENTATION_DIR = "src/lib/rcap/packets/jurisdictions";
const TERMINAL_INSTRUCTION =
  "Stop after focused validation and one commit containing only owned paths. " +
  "Do not regenerate global registries, stage broadly, deploy, or change packet_ready, " +
  "enabled-jurisdiction, launch, runtime, or promotion status.";
const TEMPLATE_HASH_WORKER_COMMIT =
  "e89416d74f3f5653abb4e561704d5874fa14ef24";
const ARKANSAS_ACIC_WORKER_COMMIT =
  "2784e3c85ba624c2f94dd8beb749fc0e9fd5e50f";
const GEORGIA_TRANCHE_WORKER_COMMIT =
  "080ed5d94e92442069b4000511f04194f734f36d";
const NO_DOWNLOAD_AUTHORITY_FAMILIES = new Set([
  "in_repo_identity_reconciliation",
  "local_form_scope_correction",
  "source_identity_resolution",
  "not_required_design_reconciliation",
  "superseded_source_replacement"
]);

const LANE_CONFIGURATION = Object.freeze({
  platform_foundation: {
    strategyFamily: "platform_foundation",
    model: "codex",
    effort: "xhigh",
    output() {
      return "src/lib/rcap/packets/template-hash.ts";
    },
    commitSubject() {
      return "feat(record-clearing): hash packet template families";
    },
    stopCondition:
      "Implement only the bounded template-hash and verifier outputs. Stop before editing shared " +
      "generated registries, package scripts, runtime status, promotion status, or legal data. " +
      TERMINAL_INSTRUCTION
  },
  legal_design_normalization: {
    strategyFamily: "legal_design",
    model: "opus",
    effort: "high",
    output(state) {
      return `data/record-clearing/legal-design-intake/${state.code}.memo.json`;
    },
    commitSubject(state) {
      return `feat(record-clearing): normalize ${state.code} legal design`;
    },
    stopCondition:
      "Stop if controlling authority is absent or a legal conclusion would need to be inferred. " +
      TERMINAL_INSTRUCTION
  },
  source_acquisition: {
    strategyFamily: "source_acquisition",
    model: "opus",
    effort: "high",
    output(state) {
      return `${FACTORY_DATA_DIR}/source-acquisition/${state.slug}.json`;
    },
    commitSubject(state) {
      return `chore(record-clearing): stage ${state.code} source acquisition`;
    },
    stopCondition:
      "Stop with an explicit unresolved disposition when identity, provenance, currentness, or " +
      "commercial-use authority cannot be established; never alter an adopted Master Library edition. " +
      TERMINAL_INSTRUCTION
  },
  custom_pleading: {
    strategyFamily: "custom_pleading",
    model: "codex",
    effort: "high",
    output(state) {
      return `${PACKET_IMPLEMENTATION_DIR}/${state.slug}/custom-pleading.ts`;
    },
    commitSubject(state) {
      return `feat(record-clearing): implement ${state.code} custom pleading`;
    },
    stopCondition:
      "Stop if the normalized track does not supply a complete pleading specification or if local " +
      "language would have to be invented. " +
      TERMINAL_INSTRUCTION
  },
  acroform_fill: {
    strategyFamily: "official_pdf_fill",
    model: "codex",
    effort: "high",
    output(state) {
      return `${PACKET_IMPLEMENTATION_DIR}/${state.slug}/acroform.ts`;
    },
    commitSubject(state) {
      return `feat(record-clearing): implement ${state.code} AcroForm fill`;
    },
    stopCondition:
      "Stop when a field's participant ownership or semantic meaning is uncertain; detectable PDF " +
      "fields are not silently approved. " +
      TERMINAL_INSTRUCTION
  },
  flat_pdf_overlay: {
    strategyFamily: "official_pdf_fill",
    model: "codex",
    effort: "high",
    output(state) {
      return `${PACKET_IMPLEMENTATION_DIR}/${state.slug}/overlay.ts`;
    },
    commitSubject(state) {
      return `feat(record-clearing): implement ${state.code} PDF overlay`;
    },
    stopCondition:
      "Stop with unconfirmed coordinates when visual placement or field ownership is uncertain; do " +
      "not mark an overlay visually approved. " +
      TERMINAL_INSTRUCTION
  },
  composed_route: {
    strategyFamily: "composed",
    model: "codex",
    effort: "high",
    output(state) {
      return `${PACKET_IMPLEMENTATION_DIR}/${state.slug}/composed.ts`;
    },
    commitSubject(state) {
      return `feat(record-clearing): implement ${state.code} composed routes`;
    },
    stopCondition:
      "Stop if composition order, branch predicate, or unit strategy is unresolved; never select the " +
      "first available unit as a fallback. " +
      TERMINAL_INSTRUCTION
  },
  guidance_implementation: {
    strategyFamily: "process_guidance",
    model: "codex",
    effort: "high",
    output(state) {
      return `${PACKET_IMPLEMENTATION_DIR}/${state.slug}/guidance.ts`;
    },
    commitSubject(state) {
      return `feat(record-clearing): implement ${state.code} guidance`;
    },
    stopCondition:
      "Stop if the normalized packet instructions do not answer the route; never turn guidance into " +
      "a court filing or add legal advice. " +
      TERMINAL_INSTRUCTION
  },
  legal_output_review: {
    strategyFamily: "legal_output_review",
    model: "opus",
    effort: "high",
    output(state) {
      return `${FACTORY_DATA_DIR}/legal-output-reviews/${state.slug}.json`;
    },
    commitSubject(state) {
      return `docs(record-clearing): review ${state.code} legal output`;
    },
    stopCondition:
      "Record a recommendation and exact defects only. Stop without adopting counsel approval or " +
      "editing packet text, legal conclusions, track strategy, or authority classification. " +
      TERMINAL_INSTRUCTION
  },
  staging_promotion: {
    strategyFamily: "staging_promotion",
    model: "codex",
    effort: "high",
    output(state) {
      return `${FACTORY_DATA_DIR}/staging/${state.slug}.json`;
    },
    commitSubject(state) {
      return `chore(record-clearing): stage ${state.code} promotion evidence`;
    },
    stopCondition:
      "Produce dry-run staging evidence only. Stop before any runtime, promotion, live-routing, " +
      "packet_ready, enabled-jurisdiction, deployment, or production-environment change. " +
      TERMINAL_INSTRUCTION
  }
});

export function buildFactoryPlan(options = {}) {
  const rootDir = resolveRoot(options);
  const inputs = readFactoryInputs(rootDir);
  const baseCommit = resolveBaseCommit(rootDir, options.baseCommit);
  const authorityEdition = String(inputs.authority.edition);
  const authorityVersion = `master-library/${authorityEdition}`;

  const states = canonicalStates(inputs);
  const stateByCode = new Map(states.map((state) => [state.code, state]));
  const jobs = [];
  const jobsByLaneAndState = new Map();

  const addJob = ({
    lane,
    jurisdiction,
    trackIds = [],
    dependencies = [],
    requiredInputs = [],
    jobId: requestedJobId,
    strategyFamily,
    expectedOutputs,
    ownedPaths,
    acquisitionIds = [],
    reconciliationIds = [],
    requiredOutputFields,
    downloadedSourceCount,
    completionCommit,
    model,
    effort,
    executionScope = "worker",
    status,
    focusedValidation,
    commitSubject,
    stopCondition
  }) => {
    const state =
      jurisdiction === "NATIONWIDE"
        ? { code: "NATIONWIDE", name: "Nationwide", slug: "nationwide" }
        : stateByCode.get(jurisdiction);
    if (!state) throw new Error(`Planner produced a job for unknown jurisdiction ${jurisdiction}.`);
    const config = LANE_CONFIGURATION[lane];
    if (!config) throw new Error(`Planner produced an unknown lane ${lane}.`);

    const jobId = requestedJobId ?? jobIdFor(jurisdiction, lane);
    const outputs = (expectedOutputs ?? [config.output(state)]).map((output) =>
      normalizeRepoPath(output, `${jobId} output`)
    );
    const reviewManifest = `${REVIEW_MANIFEST_DIR}/${jobId}.json`;
    const resolvedStrategyFamily = strategyFamily ?? config.strategyFamily;
    const assignmentField =
      acquisitionIds.length > 0
        ? "acquisitionIds"
        : reconciliationIds.length > 0
          ? "reconciliationIds"
          : null;
    const job = {
      jobId,
      lane,
      jurisdiction,
      trackIds: sortedUnique(trackIds.filter(Boolean)),
      strategyFamily: resolvedStrategyFamily,
      baseCommit,
      dependencies: sortedUnique(dependencies),
      ownedPaths: sortedUnique(ownedPaths ?? outputs),
      integrationOwnedOutputs: [reviewManifest],
      forbiddenPaths: [...GLOBAL_WORKER_FORBIDDEN_PATHS],
      requiredInputs: sortedUnique(requiredInputs),
      expectedOutputs: outputs,
      requiredOutputFields: sortedUnique(
        requiredOutputFields ??
          (lane === "source_acquisition" &&
          resolvedStrategyFamily !== "edition_publication" &&
          assignmentField
            ? [assignmentField, "downloadedSourceCount"]
            : [])
      ),
      focusedValidation:
        focusedValidation ??
        [`node scripts/rcap-factory-plan.mjs --check-job ${jobId}`],
      integrationValidation: [...WAVE_INTEGRATION_VALIDATION],
      model: model ?? config.model,
      effort: effort ?? config.effort,
      executionScope,
      status: status ?? (dependencies.length > 0 ? "blocked" : "ready"),
      commitSubject: commitSubject ?? config.commitSubject(state),
      stopCondition: stopCondition ?? config.stopCondition
    };
    if (acquisitionIds.length > 0) {
      job.acquisitionIds = sortedUnique(acquisitionIds);
    }
    if (reconciliationIds.length > 0) {
      job.reconciliationIds = sortedUnique(reconciliationIds);
    }
    if (Number.isInteger(downloadedSourceCount)) {
      job.downloadedSourceCount = downloadedSourceCount;
    }
    if (completionCommit) {
      job.completionCommit = completionCommit;
    }

    jobs.push(job);
    const stateKey = `${lane}:${jurisdiction}`;
    jobsByLaneAndState.set(stateKey, [...(jobsByLaneAndState.get(stateKey) ?? []), job]);
    return job;
  };

  const jobsFor = (lane, jurisdiction) =>
    jobsByLaneAndState.get(`${lane}:${jurisdiction}`) ?? [];
  const firstJobFor = (lane, jurisdiction) => jobsFor(lane, jurisdiction)[0];

  addJob({
    lane: "platform_foundation",
    jurisdiction: "NATIONWIDE",
    jobId: "rcap-nationwide-template-family-hash-infrastructure",
    expectedOutputs: [
      "src/lib/rcap/packets/template-hash.ts",
      "scripts/verify-rcap-template-family-coverage.mjs"
    ],
    ownedPaths: [
      "src/lib/rcap/packets/template-hash.ts",
      "scripts/verify-rcap-template-family-coverage.mjs"
    ],
    requiredInputs: [
      FACTORY_INPUT_PATHS.normalizedTracks,
      FACTORY_INPUT_PATHS.packetSetManifests,
      FACTORY_INPUT_PATHS.packetCapabilityRegistry
    ],
    status: "completed",
    completionCommit: TEMPLATE_HASH_WORKER_COMMIT,
    stopCondition:
      `Terminal completed child: source commit ${TEMPLATE_HASH_WORKER_COMMIT} is integrated. ` +
      "Do not scaffold, execute, or regenerate this template-family hashing work."
  });
  addJob({
    lane: "platform_foundation",
    jurisdiction: "NATIONWIDE",
    jobId: "rcap-nationwide-track-promotion-contract",
    dependencies: ["rcap-nationwide-template-family-hash-infrastructure"],
    status: "ready",
    expectedOutputs: [
      "docs/rcap-promotion/track-approval-template.json",
      "scripts/rcap-apply-track-promotion-batch.mjs",
      "scripts/verify-rcap-track-promotion.mjs"
    ],
    ownedPaths: [
      "docs/rcap-promotion/track-approval-template.json",
      "scripts/rcap-apply-track-promotion-batch.mjs",
      "scripts/verify-rcap-track-promotion.mjs"
    ],
    requiredInputs: [
      "src/lib/rcap/packets/template-hash.ts",
      "data/record-clearing/template-families/ADOPT-01-custom-pleading-family-adoption.json",
      "data/record-clearing/template-families/ADOPT-02-official-acroform-family-adoption.json",
      "docs/rcap-promotion/batch-approval-template.json",
      FACTORY_INPUT_PATHS.normalizedTracks,
      FACTORY_INPUT_PATHS.packetCapabilityRegistry,
      FACTORY_INPUT_PATHS.statePromotionManifest
    ],
    model: "codex",
    effort: "xhigh",
    focusedValidation: [
      "node scripts/rcap-factory-plan.mjs --check-job rcap-nationwide-track-promotion-contract",
      "node scripts/verify-rcap-track-promotion.mjs"
    ],
    commitSubject: "feat(record-clearing): add the per-track promotion contract",
    stopCondition:
      "Implement only the fail-closed, hash-bound per-track approval batch format, dry-run/apply " +
      "contract, route-scoped staging selection contract, and focused verifier. Use the current " +
      "counsel-adoption records as immutable test fixtures; a jurisdiction-wide staging child may " +
      "not widen an adopted subset. Do not apply any adoption or promotion, change a track status, enable runtime, " +
      "modify shared generated registries, deploy, or touch Supabase. " +
      TERMINAL_INSTRUCTION
  });

  const normalizedTracks = [...inputs.normalizedTracks.tracks].sort(compareTracks);
  const tracksByState = groupBy(normalizedTracks, (track) => track.jurisdiction);
  const outstanding = sortedUnique(inputs.implementationQueue.outstandingJurisdictions ?? []);

  for (const jurisdiction of outstanding) {
    addJob({
      lane: "legal_design_normalization",
      jurisdiction,
      requiredInputs: [
        FACTORY_INPUT_PATHS.authority,
        FACTORY_INPUT_PATHS.blockerLedger,
        "data/record-clearing/master-library/edition-1-2-legal-design-reconciliation-queue.json",
        FACTORY_INPUT_PATHS.allStateBuildStatus
      ]
    });
  }

  const authorityGroups = acquisitionAuthorityGroups(inputs);
  for (const group of authorityGroups) {
    const normalization = firstJobFor("legal_design_normalization", group.jurisdiction);
    addJob({
      lane: "source_acquisition",
      jurisdiction: group.jurisdiction,
      jobId: group.jobId,
      trackIds: group.trackIds,
      strategyFamily: group.strategyFamily,
      acquisitionIds: group.acquisitionIds,
      reconciliationIds: group.reconciliationIds,
      downloadedSourceCount: NO_DOWNLOAD_AUTHORITY_FAMILIES.has(
        group.strategyFamily
      )
        ? 0
        : undefined,
      dependencies: normalization ? [normalization.jobId] : [],
      expectedOutputs: [
        `${FACTORY_DATA_DIR}/source-acquisition/${group.jobId}.json`
      ],
      requiredInputs: [
        FACTORY_INPUT_PATHS.authority,
        FACTORY_INPUT_PATHS.sourceRelationships,
        FACTORY_INPUT_PATHS.blockerLedger,
        FACTORY_INPUT_PATHS.sourceAcquisitionQueue,
        FACTORY_INPUT_PATHS.sourceArtifacts,
        FACTORY_INPUT_PATHS.acquisitionDocuments,
        FACTORY_INPUT_PATHS.acquisitionCampaigns,
        FACTORY_INPUT_PATHS.acquisitionUnresolved
      ],
      model:
        group.jobId === "rcap-al-in-repo-identity-reconciliation-cr-65"
          ? "codex"
          : group.model,
      effort:
        group.jobId === "rcap-al-in-repo-identity-reconciliation-cr-65"
          ? "xhigh"
          : group.effort,
      commitSubject: group.commitSubject,
      stopCondition: authorityStopCondition(group.strategyFamily, group),
      status:
        group.jobId === "rcap-ar-in-repo-identity-reconciliation-acic"
          ? "completed"
          : undefined,
      completionCommit:
        group.jobId === "rcap-ar-in-repo-identity-reconciliation-acic"
          ? ARKANSAS_ACIC_WORKER_COMMIT
          : undefined
    });
  }

  const authorityJobs = jobs.filter((job) => job.lane === "source_acquisition");
  const editionPublication = addJob({
    lane: "source_acquisition",
    jurisdiction: "NATIONWIDE",
    jobId: "rcap-nationwide-master-library-edition-1-3-publication",
    strategyFamily: "edition_publication",
    dependencies: authorityJobs.map((job) => job.jobId),
    expectedOutputs: [
      `${FACTORY_DATA_DIR}/authority/master-library-edition-1-3-publication.json`
    ],
    requiredInputs: [
      FACTORY_INPUT_PATHS.authority,
      FACTORY_INPUT_PATHS.trackSourceAudit,
      FACTORY_INPUT_PATHS.productionPlan,
      FACTORY_INPUT_PATHS.acquisitionDocuments
    ],
    model: "opus",
    effort: "xhigh",
    executionScope: "captain",
    commitSubject: "docs(record-clearing): prepare Master Library Edition 1.3 publication",
    stopCondition:
      "Prepare the bounded Edition 1.3 publication record only after every authority dependency has " +
      "a final disposition. Never amend or overwrite Edition 1.2, never infer a legal conclusion, " +
      "and stop before publication, generation enablement, promotion, or deployment. " +
      TERMINAL_INSTRUCTION
  });

  addCompletedMarylandChild({ addJob });
  addCompletedGeorgiaChild({ addJob });

  const implementedTrackIds = implementedTracks(inputs.implementationRecords);
  const pendingTracks = normalizedTracks.filter(
    (track) =>
      !implementedTrackIds.has(`${track.jurisdiction}:${track.trackId}`) &&
      !isMarylandAuthorityOnlyRoute(track, inputs.canonicalParentJobs) &&
      !isCanonicalNonImplementationTrack(track, inputs.canonicalParentJobs) &&
      !isGeorgiaJailGuidanceSpecificationTrack(track)
  );
  const classifications = classifyOfficialPdfTracks(inputs, pendingTracks);

  addTrackLaneJobs({
    lane: "custom_pleading",
    tracks: pendingTracks.filter(
      (track) => track.outputStrategy === "custom_pleading" && !isComposedTrack(track)
    ),
    inputs,
    addJob,
    jobsByLaneAndState
  });
  addGeorgiaJailGuidanceSpecificationChild({ addJob });
  addTrackLaneJobs({
    lane: "acroform_fill",
    tracks: classifications.acroform,
    inputs,
    addJob,
    jobsByLaneAndState
  });
  addTrackLaneJobs({
    lane: "flat_pdf_overlay",
    tracks: classifications.overlay,
    inputs,
    addJob,
    jobsByLaneAndState
  });
  addTrackLaneJobs({
    lane: "composed_route",
    tracks: pendingTracks.filter(isComposedTrack),
    inputs,
    addJob,
    jobsByLaneAndState
  });
  addTrackLaneJobs({
    lane: "guidance_implementation",
    tracks: pendingTracks.filter(
      (track) => track.outputStrategy === "process_guidance" && !isComposedTrack(track)
    ),
    inputs,
    addJob,
    jobsByLaneAndState
  });

  const implementationLanes = [
    "legal_design_normalization",
    "custom_pleading",
    "acroform_fill",
    "flat_pdf_overlay",
    "composed_route",
    "guidance_implementation"
  ];
  for (const [jurisdiction, tracks] of [...tracksByState.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const dependencies = implementationLanes
      .flatMap((lane) =>
        (jobsByLaneAndState.get(`${lane}:${jurisdiction}`) ?? []).map((job) => job.jobId)
      );
    dependencies.push(
      ...(jobsByLaneAndState.get(`source_acquisition:${jurisdiction}`) ?? []).map(
        (job) => job.jobId
      )
    );
    dependencies.push(editionPublication.jobId);

    const review = addJob({
      lane: "legal_output_review",
      jurisdiction,
      trackIds: tracks.map((track) => track.trackId),
      dependencies,
      requiredInputs: [
        FACTORY_INPUT_PATHS.authority,
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.packetSetManifests,
        FACTORY_INPUT_PATHS.blockerLedger,
        ...dependencies.flatMap((jobId) => jobs.find((job) => job.jobId === jobId)?.expectedOutputs ?? [])
      ]
    });
    addJob({
      lane: "staging_promotion",
      jurisdiction,
      trackIds: tracks.map((track) => track.trackId),
      dependencies: [review.jobId],
      requiredInputs: [
        review.expectedOutputs[0],
        `${REVIEW_MANIFEST_DIR}/${review.jobId}.json`,
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.runtimeRegistry,
        FACTORY_INPUT_PATHS.packetCapabilityRegistry,
        FACTORY_INPUT_PATHS.statePromotionManifest,
        FACTORY_INPUT_PATHS.promotionReadiness
      ]
    });
  }

  attachCanonicalParents(jobs, inputs.canonicalParentJobs);
  jobs.sort(compareJobs);
  const lanes = FACTORY_LANES.map((lane) => ({
    lane,
    jobIds: jobs.filter((job) => job.lane === lane).map((job) => job.jobId)
  }));
  const waves = lanes.map((entry, index) => ({
    waveId: `wave-${String(index + 1).padStart(2, "0")}-${entry.lane.replaceAll("_", "-")}`,
    jobIds: entry.jobIds,
    integrationValidation: [...WAVE_INTEGRATION_VALIDATION]
  }));

  const plan = {
    schemaVersion: FACTORY_SCHEMA_VERSION,
    authorityVersion,
    authorityEdition,
    baseCommit,
    generatedFrom: inputs.generatedFrom,
    sourceSummary: buildSourceSummary(inputs, classifications),
    canonicalPlan: buildCanonicalPlanSummary(inputs.canonicalParentJobs),
    parentJobReconciliation: buildParentJobReconciliation(
      inputs.canonicalParentJobs,
      jobs
    ),
    authorityJobFamilies: [...AUTHORITY_FAMILY_LABELS],
    acquisitionReconciliation: buildAcquisitionReconciliation(inputs, jobs),
    trackReconciliation: buildTrackReconciliation(
      normalizedTracks,
      jobs,
      inputs.implementationRecords
    ),
    lanes,
    waves,
    jobs
  };

  return assertValidFactoryPlan(plan);
}

export function readFactoryInputs(rootDir) {
  const json = (key) => readJson(rootDir, FACTORY_INPUT_PATHS[key]);
  const authority = json("authority");
  const normalizedTracks = json("normalizedTracks");
  const sourceRelationships = json("sourceRelationships");
  const blockerLedger = json("blockerLedger");
  const sourceAcquisitionQueue = json("sourceAcquisitionQueue");
  const implementationQueue = json("implementationQueue");
  const packetSetManifests = json("packetSetManifests");
  const sourceArtifacts = json("sourceArtifacts");
  const allStateBuildStatus = json("allStateBuildStatus");
  const promotionReadiness = json("promotionReadiness");
  const all51ReviewSignoff = json("all51ReviewSignoff");
  const trackSourceAudit = json("trackSourceAudit");
  const productionPlan = json("productionPlan");
  const acquisitionDocuments = json("acquisitionDocuments");
  const acquisitionCampaigns = json("acquisitionCampaigns");
  const acquisitionIssuers = json("acquisitionIssuers");
  const acquisitionUnresolved = json("acquisitionUnresolved");

  // Runtime and promotion records are TypeScript only because the application
  // imports them directly. Read them as data without executing application code.
  const runtimeRegistrySource = readText(rootDir, FACTORY_INPUT_PATHS.runtimeRegistry);
  const packetCapabilitySource = readText(rootDir, FACTORY_INPUT_PATHS.packetCapabilityRegistry);
  const promotionManifestSource = readText(rootDir, FACTORY_INPUT_PATHS.statePromotionManifest);
  const statePromotionRecords = parseEmbeddedPromotionManifest(promotionManifestSource);

  const implementationPaths = listJsonFiles(rootDir, IMPLEMENTATION_DIR);
  const canonicalJobPaths = listJsonFiles(rootDir, CANONICAL_JOBS_DIR);
  const canonicalParentJobs = canonicalJobPaths.map((file) => ({
    path: file,
    data: readJson(rootDir, file)
  }));
  const implementationRecords = implementationPaths
    .filter((file) => /^tranche-\d+\.json$/.test(path.posix.basename(file)))
    .map((file) => ({ path: file, data: readJson(rootDir, file) }));
  const reviewRecords = implementationPaths
    .filter((file) => /(?:review-manifest|visual-review)\.json$/.test(file))
    .map((file) => ({ path: file, data: readJson(rootDir, file) }));

  const generatedFromPaths = [
    ...Object.values(FACTORY_INPUT_PATHS),
    ...implementationPaths,
    ...canonicalJobPaths
  ];
  const generatedFrom = sortedUnique(generatedFromPaths).map((relativePath) => ({
    path: relativePath,
    sha256: sha256File(path.join(rootDir, relativePath))
  }));

  return {
    authority,
    normalizedTracks,
    sourceRelationships,
    blockerLedger,
    sourceAcquisitionQueue,
    implementationQueue,
    packetSetManifests,
    sourceArtifacts,
    allStateBuildStatus,
    promotionReadiness,
    all51ReviewSignoff,
    trackSourceAudit,
    productionPlan,
    acquisitionDocuments,
    acquisitionCampaigns,
    acquisitionIssuers,
    acquisitionUnresolved,
    runtimeRegistrySource,
    packetCapabilitySource,
    statePromotionRecords,
    canonicalParentJobs,
    implementationRecords,
    reviewRecords,
    generatedFrom
  };
}

function addTrackLaneJobs({ lane, tracks, inputs, addJob, jobsByLaneAndState }) {
  const groups = groupBy(tracks, (track) => track.jurisdiction);
  for (const [jurisdiction, stateTracks] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const sourceJobs = ["acroform_fill", "flat_pdf_overlay", "composed_route"].includes(lane)
      ? (jobsByLaneAndState.get(`source_acquisition:${jurisdiction}`) ?? []).filter(
          (job) =>
            job.trackIds.length === 0 ||
            job.trackIds.some((trackId) =>
              stateTracks.some((track) => track.trackId === trackId)
            )
        )
      : [];
    const overrides = implementationJobOverrides(lane, jurisdiction);
    const requiredInputs = [
      FACTORY_INPUT_PATHS.authority,
      FACTORY_INPUT_PATHS.normalizedTracks,
      FACTORY_INPUT_PATHS.sourceRelationships,
      FACTORY_INPUT_PATHS.blockerLedger,
      FACTORY_INPUT_PATHS.packetSetManifests,
      FACTORY_INPUT_PATHS.sourceArtifacts,
      ...inputs.implementationRecords.map((record) => record.path),
      ...(overrides.requiredInputs ?? [])
    ];
    const { requiredInputs: _overrideInputs, ...jobOverrides } = overrides;
    addJob({
      lane,
      jurisdiction,
      trackIds: stateTracks.map((track) => track.trackId),
      dependencies: sourceJobs.map((job) => job.jobId),
      requiredInputs,
      ...jobOverrides
    });
  }
}

function implementationJobOverrides(lane, jurisdiction) {
  if (lane === "custom_pleading" && jurisdiction === "IL") {
    const tranchePrefix =
      "data/record-clearing/implementation-tranches/tranche-4";
    return {
      model: "opus",
      effort: "xhigh",
      expectedOutputs: [
        "src/lib/rcap/packets/jurisdictions/illinois/custom-pleading.ts",
        "src/lib/rcap/packets/registry-il-custom-pleading.ts",
        `${tranchePrefix}.json`,
        `${tranchePrefix}-authority-pins.json`,
        `${tranchePrefix}-component-guidance.json`,
        `${tranchePrefix}-field-ownership.json`,
        `${tranchePrefix}-fixtures.json`,
        `${tranchePrefix}-review-manifest.json`,
        `${tranchePrefix}-visual-review.json`,
        `${tranchePrefix}-legal-output-recommendation.json`,
        "scripts/rcap-generate-il-custom-pleading-review.mjs",
        "scripts/verify-rcap-il-custom-pleading-packets.mjs"
      ],
      requiredInputs: [
        "data/record-clearing/implementation-tranches/tranche-1.json",
        "data/record-clearing/implementation-tranches/tranche-3.json",
        "src/lib/rcap/packets/assemble.ts",
        "src/lib/rcap/packets/engines/custom-pleading.ts",
        "src/lib/rcap/packets/registry-ga-superior-court-pleading-family.ts"
      ],
      focusedValidation: [
        "node scripts/rcap-factory-plan.mjs --check-job rcap-il-custom-pleading",
        "node scripts/verify-rcap-il-custom-pleading-packets.mjs"
      ],
      stopCondition:
        "Generate one deterministic final participant-facing PDF for each assigned Illinois custom-" +
        "pleading track through the real persistence and assembly path, with positive and typed-stop " +
        "fixtures, technical proof, rendered-page visual proof, and a legal recommendation awaiting " +
        "counsel adoption. Reuse the Mississippi and Georgia architecture without editing any live " +
        "Illinois generator, shared generated registry, runtime route, packet_ready, enablement, or " +
        "promotion state. " +
        TERMINAL_INSTRUCTION
    };
  }
  return {};
}

function georgiaTrancheOutputs() {
  const tranchePrefix = "data/record-clearing/implementation-tranches/tranche-3";
  return [
    "src/lib/rcap/packets/registry-ga-superior-court-pleading-family.ts",
    "src/lib/rcap/packets/engines/pleading-templates-ga.ts",
    "src/lib/rcap/packets/engines/guidance-templates-ga.ts",
    `${tranchePrefix}.json`,
    `${tranchePrefix}-authority-pins.json`,
    `${tranchePrefix}-component-guidance.json`,
    `${tranchePrefix}-field-ownership.json`,
    `${tranchePrefix}-fixtures.json`,
    `${tranchePrefix}-review-manifest.json`,
    `${tranchePrefix}-visual-review.json`,
    `${tranchePrefix}-legal-output-recommendation.json`,
    "scripts/rcap-generate-ga-superior-court-pleading-family-review.mjs",
    "scripts/verify-rcap-ga-superior-court-pleading-family-packets.mjs"
  ];
}

function addCompletedGeorgiaChild({ addJob }) {
  const outputs = georgiaTrancheOutputs();
  addJob({
    lane: "custom_pleading",
    jurisdiction: "GA",
    jobId: "rcap-ga-custom-pleading",
    trackIds: [
      "ga-felony-j1",
      "ga-vacated-j2",
      "ga-deaddocket-j3",
      "ga-misd-j4",
      "ga-fugitive-j5",
      "ga-pardon-j7",
      "ga-seal-m",
      "ga-fo-active-pre2026",
      "ga-fo-discharged-pre2026"
    ],
    status: "completed",
    model: "opus",
    effort: "xhigh",
    completionCommit: GEORGIA_TRANCHE_WORKER_COMMIT,
    expectedOutputs: outputs,
    ownedPaths: outputs,
    requiredInputs: [
      "planning/record-clearing-100-percent/jobs/IMP-CP-01-ga-superior-court-pleading-family.json",
      "data/record-clearing/implementation-tranches/tranche-1.json",
      "src/lib/rcap/packets/assemble.ts",
      "src/lib/rcap/packets/engines/custom-pleading.ts",
      "src/lib/rcap/packets/registry-mississippi.ts"
    ],
    focusedValidation: [
      "node scripts/rcap-factory-plan.mjs --check-job rcap-ga-custom-pleading",
      "node scripts/verify-rcap-ga-superior-court-pleading-family-packets.mjs"
    ],
    commitSubject: "feat(record-clearing): implement GA custom pleading",
    stopCondition:
      `Terminal completed child: source commit ${GEORGIA_TRANCHE_WORKER_COMMIT} is integrated. ` +
      "Preserve the nine deterministic participant packets, technical and visual proof, legal " +
      "recommendations awaiting counsel adoption, runtime-disabled posture, and packet_ready=false. " +
      "Do not scaffold, execute, regenerate, or promote this Georgia engineering."
  });
}

function addGeorgiaJailGuidanceSpecificationChild({ addJob }) {
  addJob({
    lane: "legal_design_normalization",
    jurisdiction: "GA",
    jobId: "rcap-ga-guidance-specification-jail-k2",
    trackIds: ["ga-jail-k2"],
    strategyFamily: "legal_design",
    model: "opus",
    effort: "xhigh",
    expectedOutputs: [
      `${FACTORY_DATA_DIR}/guidance-specifications/ga-jail-k2-process-guidance-3.json`
    ],
    requiredInputs: [
      "planning/record-clearing-100-percent/jobs/IMP-CP-02-guidance-spec-unblock-family.json",
      "data/record-clearing/implementation-tranches/tranche-3.json",
      "data/record-clearing/implementation-tranches/tranche-3-component-guidance.json",
      "data/record-clearing/implementation-tranches/tranche-3-review-manifest.json",
      "data/record-clearing/implementation-tranches/tranche-3-legal-output-recommendation.json"
    ],
    focusedValidation: [
      "node scripts/rcap-factory-plan.mjs --check-job rcap-ga-guidance-specification-jail-k2"
    ],
    commitSubject: "docs(record-clearing): specify GA jail restriction guidance",
    stopCondition:
      "Draft only the bounded legal guidance specification for exact component " +
      "ga-jail-k2-process-guidance-3. Do not implement or generate a packet, edit shared legal-design " +
      "registries, infer unresolved timing or local-form conclusions, alter the completed Georgia " +
      "tranche, enable runtime, or promote a route. " +
      TERMINAL_INSTRUCTION
  });
}

function isGeorgiaJailGuidanceSpecificationTrack(track) {
  return track.jurisdiction === "GA" && track.trackId === "ga-jail-k2";
}

function addCompletedMarylandChild({ addJob }) {
  addJob({
    lane: "acroform_fill",
    jurisdiction: "MD",
    jobId: "rcap-md-second-chance-shielding-completed",
    trackIds: ["md_second_chance_shielding"],
    status: "completed",
    model: "opus",
    effort: "xhigh",
    expectedOutputs: [
      "data/record-clearing/implementation-tranches/tranche-2.json",
      "data/record-clearing/implementation-tranches/tranche-2-authority-pins.json",
      "data/record-clearing/implementation-tranches/tranche-2-component-guidance.json",
      "data/record-clearing/implementation-tranches/tranche-2-field-ownership.json",
      "data/record-clearing/implementation-tranches/tranche-2-fixtures.json",
      "data/record-clearing/implementation-tranches/tranche-2-review-manifest.json",
      "data/record-clearing/implementation-tranches/tranche-2-visual-review.json",
      "data/record-clearing/implementation-tranches/tranche-2-legal-output-recommendation.json",
      "src/lib/rcap/packets/registry-maryland.ts",
      "src/lib/rcap/packets/tranche-2-maryland-facts.ts",
      "src/lib/rcap/packets/engines/guidance-templates-maryland.ts",
      "scripts/rcap-generate-tranche-2-review.mjs",
      "scripts/verify-rcap-tranche-2-packets.mjs"
    ],
    ownedPaths: [
      "data/record-clearing/implementation-tranches/tranche-2.json",
      "data/record-clearing/implementation-tranches/tranche-2-authority-pins.json",
      "data/record-clearing/implementation-tranches/tranche-2-component-guidance.json",
      "data/record-clearing/implementation-tranches/tranche-2-field-ownership.json",
      "data/record-clearing/implementation-tranches/tranche-2-fixtures.json",
      "data/record-clearing/implementation-tranches/tranche-2-review-manifest.json",
      "data/record-clearing/implementation-tranches/tranche-2-visual-review.json",
      "data/record-clearing/implementation-tranches/tranche-2-legal-output-recommendation.json",
      "src/lib/rcap/packets/registry-maryland.ts",
      "src/lib/rcap/packets/tranche-2-maryland-facts.ts",
      "src/lib/rcap/packets/engines/guidance-templates-maryland.ts",
      "scripts/rcap-generate-tranche-2-review.mjs",
      "scripts/verify-rcap-tranche-2-packets.mjs"
    ],
    requiredInputs: [
      "planning/record-clearing-100-percent/jobs/IMP-OF-01-md-district-court-form-family.json",
      "data/record-clearing/implementation-tranches/tranche-2-authority-pins.json",
      "data/record-clearing/implementation-tranches/tranche-2-review-manifest.json",
      "data/record-clearing/implementation-tranches/tranche-2-visual-review.json",
      "data/record-clearing/implementation-tranches/tranche-2-legal-output-recommendation.json"
    ],
    focusedValidation: [
      "node scripts/verify-rcap-tranche-2-packets.mjs"
    ],
    commitSubject: "feat(record-clearing): implement MD official-form routes",
    stopCondition:
      "Terminal completed child only: source commit e209f3469b1b426d30d6d05550e84dfb0b24c147 " +
      "is integrated by patch-equivalent commit 4ccf8ce2f96b5aef19dc6e53715db35cc685776a. " +
      "Do not scaffold, execute, regenerate, alter, or promote this Maryland engineering. Preserve its " +
      "technical, visual, final-PDF, and legal-recommendation proof while counsel adoption, staging, " +
      "and production remain outstanding."
  });
}

const FACTORY_TO_CANONICAL_IMPLEMENTATION_LANE = Object.freeze({
  custom_pleading: "implementation-pleading",
  acroform_fill: "implementation-acroform",
  flat_pdf_overlay: "implementation-overlay",
  composed_route: "implementation-composed",
  guidance_implementation: "implementation-guidance"
});

const REVIEW_PARENT_BY_IMPLEMENTATION_LANE = Object.freeze({
  "implementation-pleading": "REV-01-custom-pleading-family-review",
  "implementation-acroform": "REV-02-official-acroform-family-review",
  "implementation-overlay": "REV-03-overlay-family-review",
  "implementation-guidance": "REV-04-guidance-family-review",
  "implementation-composed": "REV-05-composed-family-review"
});

const PARTNER_PRIORITY_STAGING_JURISDICTIONS = new Set([
  "MS",
  "GA",
  "MD",
  "CA",
  "DC",
  "IL"
]);

function attachCanonicalParents(jobs, canonicalParentRecords) {
  const parents = canonicalParentRecords.map((record) => record.data);
  const parentById = new Map(parents.map((parent) => [parent.jobId, parent]));
  assertCanonicalParentPlan(parents);

  for (const job of jobs) {
    const parentJobId = resolveCanonicalParentJobId(job, parents);
    if (!parentById.has(parentJobId)) {
      throw new Error(
        `${job.jobId} resolved unknown canonical parent ${parentJobId ?? "none"}.`
      );
    }
    const parentRecord = canonicalParentRecords.find(
      (record) => record.data.jobId === parentJobId
    );
    job.parentJobId = parentJobId;
    job.canonicalWave = parentRecord.data.wave;
    job.canonicalLane = parentRecord.data.lane;
    job.requiredInputs = sortedUnique([
      ...job.requiredInputs,
      parentRecord.path
    ]);
  }
}

function assertCanonicalParentPlan(parents) {
  if (parents.length !== 72) {
    throw new Error(`Canonical plan must contain 72 parent jobs; found ${parents.length}.`);
  }
  const ids = parents.map((parent) => parent.jobId);
  if (new Set(ids).size !== 72 || ids.some((jobId) => typeof jobId !== "string")) {
    throw new Error("Canonical parent job IDs must be present and unique.");
  }
  const waves = new Set(parents.map((parent) => parent.wave));
  if (
    waves.size !== 8 ||
    [...waves].some((wave) => !Number.isInteger(wave) || wave < 0 || wave > 7)
  ) {
    throw new Error("Canonical parent plan must retain waves 0 through 7.");
  }
  const lanes = new Set(parents.map((parent) => parent.lane));
  if (lanes.size !== 11) {
    throw new Error(`Canonical parent plan must retain 11 lanes; found ${lanes.size}.`);
  }
}

function resolveCanonicalParentJobId(job, parents) {
  if (job.jobId === "rcap-nationwide-track-promotion-contract") {
    return "F-03-track-promotion-contract";
  }
  if (job.jobId === "rcap-ga-guidance-specification-jail-k2") {
    return "IMP-CP-02-guidance-spec-unblock-family";
  }
  if (job.lane === "platform_foundation") {
    return "F-02-template-family-hash-infrastructure";
  }
  if (job.lane === "legal_design_normalization") {
    const matches = parents.filter(
      (parent) =>
        parent.lane === "normalization" &&
        (parent.jurisdictions ?? []).includes(job.jurisdiction)
    );
    if (matches.length !== 1) {
      throw new Error(
        `${job.jobId} must map to one canonical normalization parent; found ${matches.length}.`
      );
    }
    return matches[0].jobId;
  }
  if (job.lane === "source_acquisition") {
    return canonicalAuthorityParentJobId(job);
  }
  if (Object.hasOwn(FACTORY_TO_CANONICAL_IMPLEMENTATION_LANE, job.lane)) {
    return canonicalImplementationParentJobId(job, parents);
  }
  if (job.lane === "legal_output_review") {
    return canonicalReviewParentJobId(job, parents);
  }
  if (job.lane === "staging_promotion") {
    return PARTNER_PRIORITY_STAGING_JURISDICTIONS.has(job.jurisdiction)
      ? "STG-01-staging-promotion-partner-priority"
      : "STG-02-staging-promotion-remainder";
  }
  throw new Error(`${job.jobId} has no canonical parent mapping rule.`);
}

function canonicalAuthorityParentJobId(job) {
  if (job.strategyFamily === "edition_publication") {
    return "AUTH-04-edition-1-3-publication";
  }
  if (job.jurisdiction === "KS") {
    return "EXC-01-ks-commercial-use-determination";
  }
  if (
    (job.reconciliationIds?.length ?? 0) > 0 &&
    ["IL", "IA", "IN"].includes(job.jurisdiction)
  ) {
    return "AUTH-02-component-remap-corrections";
  }
  if (["AR", "AL", "HI", "MO", "FL"].includes(job.jurisdiction)) {
    return "AUTH-03-acquisition-campaign-tier-1";
  }
  if (["AZ", "IA", "IN", "DE", "MA", "MN", "LA"].includes(job.jurisdiction)) {
    return "AUTH-05-acquisition-campaign-tier-2";
  }
  if (["MD", "MT"].includes(job.jurisdiction)) {
    return "AUTH-06-source-gate-clearance";
  }
  return "AUTH-01-in-repo-authority-pinning";
}

function canonicalImplementationParentJobId(job, parents) {
  const requestedLane = FACTORY_TO_CANONICAL_IMPLEMENTATION_LANE[job.lane];
  const candidates = parents
    .filter((parent) => String(parent.lane ?? "").startsWith("implementation-"))
    .map((parent) => ({
      parent,
      matchingTracks: job.trackIds.filter((trackId) =>
        (parent.tracks ?? []).includes(trackId)
      ).length,
      laneMatch: parent.lane === requestedLane
    }))
    .filter((candidate) => candidate.matchingTracks > 0)
    .sort(
      (left, right) =>
        Number(right.laneMatch) - Number(left.laneMatch) ||
        right.matchingTracks - left.matchingTracks ||
        left.parent.jobId.localeCompare(right.parent.jobId)
    );
  if (candidates.length === 0) {
    throw new Error(`${job.jobId} has no canonical implementation parent.`);
  }
  return candidates[0].parent.jobId;
}

function canonicalReviewParentJobId(job, parents) {
  const scores = new Map();
  for (const parent of parents.filter((entry) =>
    String(entry.lane ?? "").startsWith("implementation-")
  )) {
    const count = job.trackIds.filter((trackId) =>
      (parent.tracks ?? []).includes(trackId)
    ).length;
    if (count > 0) {
      const reviewParent = REVIEW_PARENT_BY_IMPLEMENTATION_LANE[parent.lane];
      scores.set(reviewParent, (scores.get(reviewParent) ?? 0) + count);
    }
  }
  const ranked = [...scores.entries()].sort(
    ([leftId, leftCount], [rightId, rightCount]) =>
      rightCount - leftCount || leftId.localeCompare(rightId)
  );
  if (ranked.length === 0) {
    throw new Error(`${job.jobId} has no canonical family-review parent.`);
  }
  return ranked[0][0];
}

function buildCanonicalPlanSummary(canonicalParentRecords) {
  const parents = canonicalParentRecords.map((record) => record.data);
  assertCanonicalParentPlan(parents);
  return {
    parentJobs: parents.length,
    waves: new Set(parents.map((parent) => parent.wave)).size,
    lanes: new Set(parents.map((parent) => parent.lane)).size,
    completedParentJobs: parents.filter((parent) => parent.status === "completed")
      .length,
    childMappingPolicy: {
      cardinality: "exactly_one_execution_owner",
      implementationSelection:
        "canonical lane match, then greatest matching-track count, then lexical parentJobId",
      reviewSelection:
        "greatest represented implementation-family count, then lexical review parentJobId",
      aggregation:
        "A mechanical jurisdiction child may aggregate tracks represented by multiple canonical " +
        "family parents; its one parentJobId is the deterministic execution owner. Canonical " +
        "250-track representation is verified separately and is not inferred from child bundles."
    },
    jobIds: parents.map((parent) => parent.jobId).sort()
  };
}

function buildParentJobReconciliation(canonicalParentRecords, jobs) {
  const parentIds = canonicalParentRecords.map((record) => record.data.jobId).sort();
  const known = new Set(parentIds);
  const mapped = jobs.filter(
    (job) => typeof job.parentJobId === "string" && known.has(job.parentJobId)
  );
  const byParentJob = Object.fromEntries(
    parentIds.map((parentJobId) => [
      parentJobId,
      mapped.filter((job) => job.parentJobId === parentJobId).length
    ])
  );
  return {
    canonicalParentJobs: parentIds.length,
    compiledChildJobs: jobs.length,
    childrenMappedExactlyOnce: mapped.length,
    unmappedChildren: jobs.length - mapped.length,
    unknownParentReferences: jobs.filter(
      (job) => !known.has(job.parentJobId)
    ).length,
    parentsWithCompiledChildren: Object.values(byParentJob).filter(
      (count) => count > 0
    ).length,
    byParentJob
  };
}

const AUTHORITY_FAMILY_BY_RESEARCH_STATUS = Object.freeze({
  public_official_download: "public_official_download",
  official_download_automation_blocked: "official_download_automation_blocked",
  official_request_required: "direct_issuer_request",
  commercial_license_required: "commercial_license",
  local_court_selection_required: "local_form_scope_correction",
  identity_unresolved: "source_identity_resolution",
  not_required_custom_pleading: "not_required_design_reconciliation",
  not_required_no_filing_route: "not_required_design_reconciliation",
  superseded: "superseded_source_replacement"
});

const AUTHORITY_FAMILY_LABELS = Object.freeze([
  "in_repo_identity_reconciliation",
  "public_official_download",
  "official_download_automation_blocked",
  "direct_issuer_request",
  "commercial_license",
  "local_form_scope_correction",
  "source_identity_resolution",
  "not_required_design_reconciliation",
  "superseded_source_replacement",
  "edition_publication"
]);

function acquisitionAuthorityGroups(inputs) {
  const documents = inputs.acquisitionDocuments.documents ?? [];
  if (documents.length !== 109) {
    throw new Error(
      `Acquisition intelligence must contain 109 documents; found ${documents.length}.`
    );
  }

  const byId = new Map();
  for (const document of documents) {
    if (!document?.acquisitionId || byId.has(document.acquisitionId)) {
      throw new Error(
        `Acquisition intelligence has a missing or duplicate acquisitionId ${document?.acquisitionId}.`
      );
    }
    byId.set(document.acquisitionId, document);
  }

  const groups = [];
  const assigned = new Set();
  const addGroup = ({
    jobId,
    jurisdiction,
    strategyFamily,
    acquisitionIds = [],
    reconciliationIds = [],
    trackIds,
    model = "opus",
    effort = "high",
    commitSubject
  }) => {
    const ids = sortedUnique(acquisitionIds);
    for (const acquisitionId of ids) {
      if (!byId.has(acquisitionId)) {
        throw new Error(`${jobId} names unknown acquisition record ${acquisitionId}.`);
      }
      if (assigned.has(acquisitionId)) {
        throw new Error(`${acquisitionId} is assigned to more than one authority job.`);
      }
      assigned.add(acquisitionId);
    }
    const records = ids.map((acquisitionId) => byId.get(acquisitionId));
    groups.push({
      jobId,
      jurisdiction,
      strategyFamily,
      acquisitionIds: ids,
      reconciliationIds: sortedUnique(reconciliationIds),
      trackIds: sortedUnique(
        trackIds ?? records.flatMap((record) => record.trackIds ?? [])
      ),
      model,
      effort,
      commitSubject:
        commitSubject ??
        `chore(record-clearing): reconcile ${jurisdiction} ${strategyFamily.replaceAll("_", " ")}`
    });
  };
  const take = (predicate) =>
    documents
      .filter((document) => !assigned.has(document.acquisitionId) && predicate(document))
      .map((document) => document.acquisitionId);

  const arkansasPublicGaps = new Set([
    "acquire:AR:acic-order-veterans-court",
    "acquire:AR:acic-petition-dismiss-and-seal-first-offenders",
    "acquire:AR:acic-uniform-petition-to-seal"
  ]);
  addGroup({
    jobId: "rcap-ar-in-repo-identity-reconciliation-acic",
    jurisdiction: "AR",
    strategyFamily: "in_repo_identity_reconciliation",
    acquisitionIds: take(
      (document) =>
        document.jurisdiction === "AR" &&
        !arkansasPublicGaps.has(document.acquisitionId)
    ),
    effort: "xhigh",
    commitSubject: "chore(record-clearing): reconcile retained Arkansas ACIC identities"
  });
  addGroup({
    jobId: "rcap-ar-public-official-download-acic-gaps",
    jurisdiction: "AR",
    strategyFamily: "public_official_download",
    acquisitionIds: take((document) =>
      arkansasPublicGaps.has(document.acquisitionId)
    ),
    effort: "xhigh",
    commitSubject: "chore(record-clearing): acquire three missing Arkansas ACIC sources"
  });
  addGroup({
    jobId: "rcap-md-in-repo-identity-reconciliation-cc-dc-cr-072",
    jurisdiction: "MD",
    strategyFamily: "in_repo_identity_reconciliation",
    acquisitionIds: take((document) => document.jurisdiction === "MD"),
    effort: "xhigh",
    commitSubject: "chore(record-clearing): reconcile retained Maryland petition identities"
  });
  addGroup({
    jobId: "rcap-al-in-repo-identity-reconciliation-cr-65",
    jurisdiction: "AL",
    strategyFamily: "in_repo_identity_reconciliation",
    acquisitionIds: take(
      (document) => document.acquisitionId === "acquire:AL:cr-65"
    ),
    effort: "xhigh",
    commitSubject: "chore(record-clearing): reconcile retained Alabama CR-65 identity"
  });
  addGroup({
    jobId: "rcap-hi-in-repo-identity-reconciliation-hcjdc-159",
    jurisdiction: "HI",
    strategyFamily: "in_repo_identity_reconciliation",
    acquisitionIds: take((document) => document.jurisdiction === "HI"),
    effort: "xhigh",
    commitSubject: "chore(record-clearing): reconcile Hawaii shared HCJDC source"
  });
  addGroup({
    jobId: "rcap-fl-public-official-download-fdle-fac-supersession",
    jurisdiction: "FL",
    strategyFamily: "public_official_download",
    acquisitionIds: take(
      (document) =>
        document.jurisdiction === "FL" &&
        document.documentId?.startsWith("FDLE-") &&
        document.finalResearchStatus === "public_official_download"
    ),
    effort: "xhigh",
    commitSubject: "chore(record-clearing): acquire Florida FAC forms and record supersession"
  });

  const exactIdentityJobs = new Map([
    [
      "acquire:CO:jdf-417-order",
      "rcap-co-source-identity-resolution-jdf-417-order"
    ],
    [
      "acquire:FL:fl-rule-3-989-continuation",
      "rcap-fl-source-identity-resolution-rule-3-989-continuation"
    ],
    [
      "acquire:IA:certification-of-service-by-mailing-or-delivery",
      "rcap-ia-source-identity-resolution-certification-of-service"
    ],
    [
      "acquire:KS:ks-criminal-cover-sheet-10-14-2025",
      "rcap-ks-source-identity-resolution-criminal-cover-sheet"
    ]
  ]);
  for (const [acquisitionId, jobId] of exactIdentityJobs) {
    const document = byId.get(acquisitionId);
    addGroup({
      jobId,
      jurisdiction: document.jurisdiction,
      strategyFamily: "source_identity_resolution",
      acquisitionIds: take((entry) => entry.acquisitionId === acquisitionId),
      effort: "xhigh",
      commitSubject: `docs(record-clearing): resolve ${document.documentId} source identity`
    });
  }

  addGroup({
    jobId: "rcap-ca-local-form-scope-correction-sdsc-crm-307",
    jurisdiction: "CA",
    strategyFamily: "local_form_scope_correction",
    acquisitionIds: take(
      (document) => document.acquisitionId === "acquire:CA:sdsc-crm-307"
    ),
    effort: "xhigh",
    commitSubject: "docs(record-clearing): correct San Diego CRM-307 source scope"
  });

  const remainingBuckets = groupBy(
    documents.filter((document) => !assigned.has(document.acquisitionId)),
    (document) => {
      const family = AUTHORITY_FAMILY_BY_RESEARCH_STATUS[document.finalResearchStatus];
      if (!family) {
        throw new Error(
          `${document.acquisitionId} has unsupported finalResearchStatus ${document.finalResearchStatus}.`
        );
      }
      return `${document.jurisdiction}:${family}`;
    }
  );
  for (const [bucket, records] of [...remainingBuckets.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    const [jurisdiction, strategyFamily] = bucket.split(":");
    const suffix = strategyFamily.replaceAll("_", "-");
    addGroup({
      jobId: `rcap-${jurisdiction.toLowerCase()}-${suffix}`,
      jurisdiction,
      strategyFamily,
      acquisitionIds: records.map((record) => record.acquisitionId),
      effort: ["commercial_license", "source_identity_resolution"].includes(strategyFamily)
        ? "xhigh"
        : "high"
    });
  }

  const exclusions = inputs.acquisitionDocuments.inventoryDerivation?.excludedFromScope ?? [];
  const exclusionBuckets = groupBy(exclusions, (entry) => {
    if (
      entry.acquisitionKey ===
      "acquire:IL:ill-s-ct-r-298-application-for-waiver-of-court-fees"
    ) {
      return "IL:rule-298";
    }
    return `${entry.jurisdiction}:${entry.exclusionReason}`;
  });
  for (const [bucket, records] of [...exclusionBuckets.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    const jurisdiction = records[0].jurisdiction;
    const specialIllinois = bucket === "IL:rule-298";
    addGroup({
      jobId: specialIllinois
        ? "rcap-il-in-repo-identity-reconciliation-rule-298"
        : `rcap-${jurisdiction.toLowerCase()}-in-repo-identity-reconciliation-${slugify(
            records[0].exclusionReason
          )}`,
      jurisdiction,
      strategyFamily: "in_repo_identity_reconciliation",
      reconciliationIds: records.map((record) => record.acquisitionKey),
      trackIds: sortedUnique(
        (inputs.sourceAcquisitionQueue.rows ?? [])
          .filter((row) =>
            records.some((record) => record.acquisitionKey === row.acquisitionKey)
          )
          .map((row) => row.trackId)
          .filter(Boolean)
      ),
      effort: specialIllinois ? "xhigh" : "high",
      commitSubject: specialIllinois
        ? "chore(record-clearing): reconcile Illinois Rule 298 retained identity"
        : undefined
    });
  }

  if (assigned.size !== documents.length) {
    const missing = documents
      .filter((document) => !assigned.has(document.acquisitionId))
      .map((document) => document.acquisitionId);
    throw new Error(
      `Acquisition aggregation omitted ${missing.length} records: ${missing.join(", ")}.`
    );
  }

  return groups.sort((left, right) => left.jobId.localeCompare(right.jobId));
}

function authorityStopCondition(strategyFamily, group = {}) {
  const byFamily = {
    in_repo_identity_reconciliation:
      "Use retained repository assets and deterministic identity mapping only. Do not download, " +
      "contact an issuer, alter legal design, or edit any adopted Master Library edition.",
    public_official_download:
      "Use only the assigned public official sources, record provenance and hashes, and stop if " +
      "identity, revision, or issuer authority is uncertain. Do not alter legal conclusions.",
    official_download_automation_blocked:
      "Preserve the 403/WAF or automation-blocked disposition distinctly. Record attended-retrieval " +
      "evidence only; never relabel the source as generically missing or infer an alternative.",
    direct_issuer_request:
      "Prepare a bounded issuer request and record its exact disposition. Do not send it without " +
      "separate authorization, and never relabel a direct-request source as a failed download.",
    commercial_license:
      "Treat availability and commercial permission as separate gates. generationAllowed must remain " +
      "false unless a written adopted license is present; never relabel the route as custom pleading.",
    local_form_scope_correction:
      "Set legalDesignReconciliationRequired=true and preserve the form's local scope. Do not promote " +
      "a local form statewide or modify the jurisdiction memo.",
    source_identity_resolution:
      "Resolve only the assigned identity from official evidence. Stop unresolved rather than guessing, " +
      "mapping a similar file, or changing legal design.",
    not_required_design_reconciliation:
      "Preserve the exact not-required reason, including custom pleading versus no participant filing. " +
      "Do not collapse it into source missing or alter an adopted strategy.",
    superseded_source_replacement:
      "Keep the supersession chain explicit and prevent the superseded identity from remaining the active " +
      "target. Do not silently discard either identity."
  };
  const instruction = byFamily[strategyFamily];
  if (!instruction) {
    throw new Error(`No authority safeguard is defined for ${strategyFamily}.`);
  }
  const jobSpecific = {
    "rcap-ar-public-official-download-acic-gaps":
      "For ACIC-UNIFORM-PETITION-TO-SEAL, preserve and bind the already-retained felony half. " +
      "Retrieve and hash only the missing misdemeanor half; do not re-download or replace the " +
      "retained felony identity.",
    "rcap-ks-source-identity-resolution-criminal-cover-sheet":
      "Resolving the cover-sheet identity does not clear the Kansas Judicial Council commercial-license gate. " +
      "Keep generation disallowed and do not substitute a custom pleading.",
    "rcap-in-commercial-license":
      "The four logical dossier identities resolve to two shared licensed PDF bundles. Acquire or license each " +
      "bundle once, retain all four identity mappings, and do not duplicate binaries."
  }[group.jobId];
  return `${instruction}${jobSpecific ? ` ${jobSpecific}` : ""} ${TERMINAL_INSTRUCTION}`;
}

function isMarylandAuthorityOnlyRoute(track, canonicalParentRecords) {
  if (track.jurisdiction !== "MD") return false;
  const completedMarylandParent = canonicalParentRecords.find(
    ({ data }) => data.jobId === "IMP-OF-01-md-district-court-form-family"
  )?.data;
  return (completedMarylandParent?.authorityOnlyRoutes ?? []).includes(track.trackId);
}

function isCanonicalNonImplementationTrack(track, canonicalParentRecords) {
  const matchingParents = canonicalParentRecords
    .map(({ data }) => data)
    .filter((parent) => (parent.tracks ?? []).includes(track.trackId));
  return (
    matchingParents.length > 0 &&
    matchingParents.every(
      (parent) => !String(parent.lane ?? "").startsWith("implementation-")
    )
  );
}

function classifyOfficialPdfTracks(inputs, tracks) {
  const relationshipsByTrack = groupBy(
    inputs.sourceRelationships.relationships ?? [],
    (relationship) => `${relationship.jurisdiction}:${relationship.trackId}`
  );
  const artifactsByState = groupBy(
    (inputs.sourceArtifacts.artifacts ?? []).filter(
      (artifact) =>
        artifact.fileType === "pdf" &&
        artifact.presence === "present" &&
        artifact.currency !== "reference_only"
    ),
    (artifact) => artifact.jurisdiction
  );
  const acroform = [];
  const overlay = [];
  const unclassified = [];

  for (const track of tracks.filter(
    (entry) => entry.outputStrategy === "official_pdf_fill" && !isComposedTrack(entry)
  )) {
    const relationships = relationshipsByTrack.get(`${track.jurisdiction}:${track.trackId}`) ?? [];
    const artifacts = artifactsByState.get(track.jurisdiction) ?? [];
    const classes = new Set();
    for (const relationship of relationships) {
      for (const artifact of artifacts) {
        if (relationshipMatchesArtifact(relationship, artifact)) {
          classes.add(artifact.technicalClass);
        }
      }
    }

    if ([...classes].some((value) => ["flat_pdf", "scanned_pdf"].includes(value))) {
      overlay.push(track);
    } else if (
      [...classes].some((value) => ["clean_acroform", "dirty_acroform"].includes(value))
    ) {
      acroform.push(track);
    } else if (
      classes.size === 0 ||
      ![...classes].some((value) =>
        ["clean_acroform", "dirty_acroform", "flat_pdf", "scanned_pdf"].includes(value)
      )
    ) {
      unclassified.push(track);
    }
  }

  return {
    acroform: acroform.sort(compareTracks),
    overlay: overlay.sort(compareTracks),
    unclassified: unclassified.sort(compareTracks)
  };
}

function relationshipMatchesArtifact(relationship, artifact) {
  const relationshipKeys = [
    relationship.officialFormId,
    urlBasename(relationship.officialSourceUrl)
  ]
    .map(identityKey)
    .filter((value) => value.length >= 3);
  const artifactKeys = [
    artifact.artifactId,
    artifact.fileName,
    path.posix.basename(artifact.fileName ?? "", path.posix.extname(artifact.fileName ?? "")),
    artifact.officialTitle
  ]
    .map(identityKey)
    .filter(Boolean);

  return relationshipKeys.some((left) =>
    artifactKeys.some(
      (right) =>
        left === right ||
        (left.length >= 5 && right.includes(left)) ||
        (right.length >= 5 && left.includes(right))
    )
  );
}

function buildAcquisitionReconciliation(inputs, jobs) {
  const documents = inputs.acquisitionDocuments.documents ?? [];
  const records = documents
    .map((document) => {
      const assigned = jobs.filter((job) =>
        (job.acquisitionIds ?? []).includes(document.acquisitionId)
      );
      if (assigned.length !== 1) {
        throw new Error(
          `${document.acquisitionId} must map to exactly one job; found ${assigned.length}.`
        );
      }
      return {
        acquisitionId: document.acquisitionId,
        jurisdiction: document.jurisdiction,
        documentId: document.documentId,
        finalResearchStatus: document.finalResearchStatus,
        authorityJobFamily: assigned[0].strategyFamily,
        jobId: assigned[0].jobId
      };
    })
    .sort((left, right) => left.acquisitionId.localeCompare(right.acquisitionId));
  const evidenceRecords = documents.reduce(
    (count, document) => count + (document.evidence?.length ?? 0),
    0
  );
  const duplicateAssignments =
    records.length -
    new Set(records.map((record) => record.acquisitionId)).size;
  return {
    researchedDocuments: documents.length,
    dispositionedDocuments: records.length,
    evidenceRecords,
    issuerCampaigns: inputs.acquisitionCampaigns.campaigns?.length ?? 0,
    duplicateAssignments,
    omissions: documents.length - records.length,
    byFinalResearchStatus: tally(
      documents,
      (document) => document.finalResearchStatus
    ),
    records
  };
}

function buildTrackReconciliation(normalizedTracks, jobs, implementationRecords) {
  const implemented = new Map();
  for (const { path: recordPath, data } of implementationRecords) {
    if (!String(data.implementationStatus ?? "").includes("implemented")) continue;
    for (const track of data.selectedTracks ?? []) {
      if (!track?.trackId) continue;
      implemented.set(`${data.jurisdiction}:${track.trackId}`, {
        trancheId: data.trancheId,
        evidencePath: recordPath
      });
    }
  }

  const implementationLanes = new Set([
    "custom_pleading",
    "acroform_fill",
    "flat_pdf_overlay",
    "composed_route",
    "guidance_implementation"
  ]);
  const assignments = normalizedTracks.map((track) => {
    const key = `${track.jurisdiction}:${track.trackId}`;
    const completion = implemented.get(key);
    if (completion) {
      return {
        jurisdiction: track.jurisdiction,
        trackId: track.trackId,
        disposition: "implementation_complete",
        trancheId: completion.trancheId,
        evidencePath: completion.evidencePath
      };
    }

    const guidanceSpecificationJob = jobs.find(
      (job) =>
        job.jobId === "rcap-ga-guidance-specification-jail-k2" &&
        job.jurisdiction === track.jurisdiction &&
        job.trackIds.includes(track.trackId)
    );
    if (guidanceSpecificationJob) {
      return {
        jurisdiction: track.jurisdiction,
        trackId: track.trackId,
        disposition: "pending_production_job",
        jobId: guidanceSpecificationJob.jobId
      };
    }

    const implementationJobs = jobs
      .filter(
        (job) =>
          implementationLanes.has(job.lane) &&
          job.jurisdiction === track.jurisdiction &&
          job.trackIds.includes(track.trackId)
      )
      .sort(compareJobs);
    if (implementationJobs.length > 1) {
      throw new Error(
        `${key} appears in multiple pending implementation jobs: ${implementationJobs
          .map((job) => job.jobId)
          .join(", ")}.`
      );
    }
    if (implementationJobs.length === 1) {
      return {
        jurisdiction: track.jurisdiction,
        trackId: track.trackId,
        disposition: "pending_production_job",
        jobId: implementationJobs[0].jobId
      };
    }

    const authorityJobs = jobs
      .filter(
        (job) =>
          job.lane === "source_acquisition" &&
          job.jurisdiction === track.jurisdiction &&
          job.trackIds.includes(track.trackId)
      )
      .sort((left, right) => authorityPriority(left) - authorityPriority(right) || left.jobId.localeCompare(right.jobId));
    const reviewJob = jobs.find(
      (job) =>
        job.lane === "legal_output_review" &&
        job.jurisdiction === track.jurisdiction &&
        job.trackIds.includes(track.trackId)
    );
    const selected = authorityJobs[0] ?? reviewJob;
    if (!selected) {
      throw new Error(`${key} has no production job or final disposition.`);
    }
    return {
      jurisdiction: track.jurisdiction,
      trackId: track.trackId,
      disposition: "pending_production_job",
      jobId: selected.jobId
    };
  });

  const completed = assignments.filter(
    (assignment) => assignment.disposition === "implementation_complete"
  );
  const pending = assignments.filter(
    (assignment) => assignment.disposition === "pending_production_job"
  );
  return {
    normalizedTracks: assignments.length,
    representedExactlyOnce:
      new Set(
        assignments.map(
          (assignment) => `${assignment.jurisdiction}:${assignment.trackId}`
        )
      ).size,
    implementationComplete: completed.length,
    pendingProductionJob: pending.length,
    assignments
  };
}

function authorityPriority(job) {
  const order = [
    "in_repo_identity_reconciliation",
    "public_official_download",
    "official_download_automation_blocked",
    "direct_issuer_request",
    "commercial_license",
    "local_form_scope_correction",
    "source_identity_resolution",
    "not_required_design_reconciliation",
    "superseded_source_replacement"
  ];
  const index = order.indexOf(job.strategyFamily);
  return index === -1 ? order.length : index;
}

function buildSourceSummary(inputs, classifications) {
  const normalizedTracks = inputs.normalizedTracks.tracks ?? [];
  const implementationStatuses = tally(
    inputs.implementationRecords.map((record) => record.data),
    (record) => record.implementationStatus ?? "unknown"
  );
  const reviewTechnical = tally(
    inputs.reviewRecords.map((record) => record.data),
    (record) => record.technicalResult ?? record.result ?? "not_recorded"
  );
  const reviewVisual = tally(
    inputs.reviewRecords.map((record) => record.data),
    (record) => record.visualResult ?? record.result ?? "not_recorded"
  );
  const trancheRuntime = tally(
    inputs.implementationRecords.map((record) => record.data),
    (record) => record.runtimeStatus ?? "not_recorded"
  );
  const launchGates = sortedUnique(
    inputs.reviewRecords.map((record) => record.data.launchGate).filter(Boolean)
  );
  const enabledByTrancheReview = Math.max(
    0,
    ...inputs.reviewRecords.map((record) =>
      Number.isFinite(Number(record.data.enabledJurisdictions))
        ? Number(record.data.enabledJurisdictions)
        : 0
    )
  );

  return {
    authority: {
      edition: String(inputs.authority.edition),
      adoptionStatus: inputs.authority.adoptionStatus,
      cutoffDate: inputs.authority.cutoffDate,
      adoptedAgainstCommit: inputs.authority.adoptedAgainstCommit,
      clearedTracks: inputs.trackSourceAudit.totals?.tracksCleared ?? 0,
      blockedTracks: inputs.trackSourceAudit.totals?.tracksBlocked ?? 0
    },
    normalization: {
      trackCount: inputs.normalizedTracks.trackCount ?? normalizedTracks.length,
      jurisdictionsReceived: inputs.normalizedTracks.jurisdictionsReceived,
      jurisdictionsOutstanding: inputs.normalizedTracks.jurisdictionsOutstanding
    },
    sourceAcquisition: {
      rows: inputs.sourceAcquisitionQueue.rows?.length ?? 0,
      openRows: (inputs.sourceAcquisitionQueue.rows ?? []).filter(
        (row) => row.edition12Disposition !== "acquired_and_adopted"
      ).length,
      researchedDocuments: inputs.acquisitionDocuments.documents?.length ?? 0,
      dispositionCounts: inputs.acquisitionDocuments.totals?.byStatus ?? {},
      evidenceRecords: (inputs.acquisitionDocuments.documents ?? []).reduce(
        (count, document) => count + (document.evidence?.length ?? 0),
        0
      ),
      issuerCampaigns: inputs.acquisitionCampaigns.campaigns?.length ?? 0,
      blockerRows: inputs.blockerLedger.rows?.length ?? 0,
      officialPdfTracksClassifiedAsAcroform: classifications.acroform.length,
      officialPdfTracksClassifiedAsOverlay: classifications.overlay.length,
      officialPdfTracksAwaitingTechnicalClassification: classifications.unclassified.length
    },
    implementation: {
      packetImplementationRecordCount: inputs.implementationRecords.length,
      statuses: implementationStatuses,
      implementedTrackCount: implementedTracks(inputs.implementationRecords).size
    },
    review: {
      manifestCount: inputs.reviewRecords.length,
      technicalResults: reviewTechnical,
      visualResults: reviewVisual
    },
    runtime: {
      normalizedPacketReadyTracks: inputs.normalizedTracks.packetReadyCount ?? 0,
      normalizedRuntimeDisabledTracks: normalizedTracks.filter(
        (track) => typeof track.runtimeDisabledReason === "string"
      ).length,
      trancheRuntimeStatuses: trancheRuntime,
      enabledJurisdictions: enabledByTrancheReview,
      launchGates
    },
    promotion: {
      readinessMatrixStatuses: inputs.promotionReadiness.statusCounts ?? {},
      legacyStatePromotionRecords: inputs.statePromotionRecords.length,
      legacyStatePromotionLiveEnabled: inputs.statePromotionRecords.filter(
        (record) => record.liveEnabled === true
      ).length,
      buildManifestApprovedForLive: (inputs.allStateBuildStatus.states ?? []).filter(
        (state) => state.liveRouting?.approvedForLive === true
      ).length,
      buildManifestLive: (inputs.allStateBuildStatus.states ?? []).filter(
        (state) => state.liveRouting?.live === true
      ).length
    }
  };
}

function implementedTracks(records) {
  const result = new Set();
  for (const { data } of records) {
    if (!String(data.implementationStatus ?? "").includes("implemented")) continue;
    for (const track of data.selectedTracks ?? []) {
      if (track?.trackId) result.add(`${data.jurisdiction}:${track.trackId}`);
    }
  }
  return result;
}

function canonicalStates(inputs) {
  const states = (inputs.allStateBuildStatus.states ?? []).map((state) => ({
    code: state.code,
    name: state.name,
    slug: state.slug
  }));
  if (states.length !== 51) {
    throw new Error(`Expected 51 jurisdictions in all-state build status; found ${states.length}.`);
  }
  const codes = new Set();
  for (const state of states) {
    if (!/^(?:[A-Z]{2}|DC)$/.test(state.code) || !state.slug || codes.has(state.code)) {
      throw new Error(`Invalid or duplicate jurisdiction identity in all-state build status: ${state.code}.`);
    }
    codes.add(state.code);
  }
  return states.sort((a, b) => a.code.localeCompare(b.code));
}

function parseEmbeddedPromotionManifest(source) {
  const startMarker = "/* PROMOTION_MANIFEST_START */";
  const endMarker = "/* PROMOTION_MANIFEST_END */";
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  if (start === -1 || end === -1 || start >= end) {
    throw new Error("State promotion manifest markers are missing or malformed.");
  }
  return JSON.parse(source.slice(start + startMarker.length, end).trim());
}

function resolveRoot(options) {
  const requested = options.rootDir ?? options.root ?? process.cwd();
  return path.resolve(requested);
}

function resolveBaseCommit(rootDir, requested) {
  if (requested !== undefined) {
    const value = String(requested).trim().toLowerCase();
    if (!/^[0-9a-f]{40}$/.test(value)) {
      throw new Error(`Invalid base commit ${JSON.stringify(requested)}.`);
    }
    return value;
  }

  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: rootDir,
    encoding: "utf8"
  });
  const value = result.status === 0 ? result.stdout.trim().toLowerCase() : "";
  if (!/^[0-9a-f]{40}$/.test(value)) {
    throw new Error("Could not determine a 40-character Git base commit; pass baseCommit explicitly.");
  }
  return value;
}

function readJson(rootDir, relativePath) {
  const text = readText(rootDir, relativePath);
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON in ${relativePath}: ${error.message}`);
  }
}

function readText(rootDir, relativePath) {
  const file = path.join(rootDir, normalizeRepoPath(relativePath));
  if (!fs.existsSync(file)) throw new Error(`Required factory input not found: ${relativePath}.`);
  return fs.readFileSync(file, "utf8");
}

function listJsonFiles(rootDir, relativeDir) {
  const absolute = path.join(rootDir, relativeDir);
  if (!fs.existsSync(absolute)) {
    throw new Error(`Required implementation-record directory not found: ${relativeDir}.`);
  }
  return fs
    .readdirSync(absolute, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => `${relativeDir}/${entry.name}`)
    .sort();
}

function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function urlBasename(value) {
  if (!value) return "";
  try {
    return path.posix.basename(decodeURIComponent(new URL(value).pathname));
  } catch {
    return "";
  }
}

function identityKey(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isComposedTrack(track) {
  return (
    track.outputStrategyDeclared === "composed" ||
    track.compositionMode === "sequential" ||
    track.compositionMode === "alternative" ||
    (Array.isArray(track.units) && track.units.length > 0)
  );
}

function jobIdFor(jurisdiction, lane) {
  return `rcap-${jurisdiction.toLowerCase()}-${lane.replaceAll("_", "-")}`;
}

function groupBy(values, keyOf) {
  const groups = new Map();
  for (const value of values) {
    const key = keyOf(value);
    const list = groups.get(key) ?? [];
    list.push(value);
    groups.set(key, list);
  }
  return groups;
}

function sortedUnique(values) {
  return [...new Set(values)].sort((a, b) => String(a).localeCompare(String(b)));
}

function compareTracks(a, b) {
  return a.jurisdiction.localeCompare(b.jurisdiction) || a.trackId.localeCompare(b.trackId);
}

function compareJobs(a, b) {
  return (
    FACTORY_LANES.indexOf(a.lane) - FACTORY_LANES.indexOf(b.lane) ||
    a.jurisdiction.localeCompare(b.jurisdiction) ||
    a.jobId.localeCompare(b.jobId)
  );
}

function tally(values, keyOf) {
  const counts = {};
  for (const value of values) {
    const key = String(keyOf(value));
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}
