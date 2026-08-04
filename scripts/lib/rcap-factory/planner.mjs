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
  all51ReviewSignoff: "docs/rcap-promotion/all51-final-review-signoff.json"
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
  "package-lock.json",
  "package.json",
  "supabase",
  ...GLOBAL_GENERATED_REGISTRIES
].sort());

export const WAVE_INTEGRATION_VALIDATION = Object.freeze([
  "npm run typecheck",
  "npm test",
  "npm run rcap:verify-state-promotion",
  "npm run rcap:verify-state-promotion-routes",
  "npm run rcap:verify-packet-capability-registry",
  "npm run rcap:verify-packet-delivery-ready-jurisdictions"
]);

const IMPLEMENTATION_DIR = "data/record-clearing/implementation-tranches";
const REVIEW_MANIFEST_DIR = "data/record-clearing/production-factory/review-manifests";
const FACTORY_DATA_DIR = "data/record-clearing/production-factory";
const PACKET_IMPLEMENTATION_DIR = "src/lib/rcap/packets/jurisdictions";
const TERMINAL_INSTRUCTION =
  "Stop after focused validation and one commit containing only owned paths. " +
  "Do not regenerate global registries, stage broadly, deploy, or change packet_ready, " +
  "enabled-jurisdiction, launch, runtime, or promotion status.";

const LANE_CONFIGURATION = Object.freeze({
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

  const addJob = ({ lane, jurisdiction, trackIds = [], dependencies = [], requiredInputs = [] }) => {
    const state = stateByCode.get(jurisdiction);
    if (!state) throw new Error(`Planner produced a job for unknown jurisdiction ${jurisdiction}.`);
    const config = LANE_CONFIGURATION[lane];
    if (!config) throw new Error(`Planner produced an unknown lane ${lane}.`);

    const jobId = jobIdFor(jurisdiction, lane);
    const output = normalizeRepoPath(config.output(state), `${jobId} output`);
    const reviewManifest = `${REVIEW_MANIFEST_DIR}/${jobId}.json`;
    const job = {
      jobId,
      lane,
      jurisdiction,
      trackIds: sortedUnique(trackIds.filter(Boolean)),
      strategyFamily: config.strategyFamily,
      baseCommit,
      dependencies: sortedUnique(dependencies),
      ownedPaths: sortedUnique([output, reviewManifest]),
      forbiddenPaths: [...GLOBAL_WORKER_FORBIDDEN_PATHS],
      requiredInputs: sortedUnique(requiredInputs),
      expectedOutputs: [output],
      focusedValidation: [`node scripts/rcap-factory-plan.mjs --check-job ${jobId}`],
      integrationValidation: [...WAVE_INTEGRATION_VALIDATION],
      model: config.model,
      effort: config.effort,
      status: dependencies.length > 0 ? "blocked" : "ready",
      commitSubject: config.commitSubject(state),
      stopCondition: config.stopCondition
    };

    jobs.push(job);
    jobsByLaneAndState.set(`${lane}:${jurisdiction}`, job);
    return job;
  };

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

  const sourceWork = sourceWorkByJurisdiction(inputs, normalizedTracks);
  for (const jurisdiction of [...sourceWork.keys()].sort()) {
    const normalization = jobsByLaneAndState.get(`legal_design_normalization:${jurisdiction}`);
    addJob({
      lane: "source_acquisition",
      jurisdiction,
      trackIds: sourceWork.get(jurisdiction),
      dependencies: normalization ? [normalization.jobId] : [],
      requiredInputs: [
        FACTORY_INPUT_PATHS.authority,
        FACTORY_INPUT_PATHS.sourceRelationships,
        FACTORY_INPUT_PATHS.blockerLedger,
        FACTORY_INPUT_PATHS.sourceAcquisitionQueue,
        FACTORY_INPUT_PATHS.sourceArtifacts
      ]
    });
  }

  const implementedTrackIds = implementedTracks(inputs.implementationRecords);
  const pendingTracks = normalizedTracks.filter(
    (track) => !implementedTrackIds.has(`${track.jurisdiction}:${track.trackId}`)
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
    "custom_pleading",
    "acroform_fill",
    "flat_pdf_overlay",
    "composed_route",
    "guidance_implementation"
  ];
  for (const [jurisdiction, tracks] of [...tracksByState.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const dependencies = implementationLanes
      .map((lane) => jobsByLaneAndState.get(`${lane}:${jurisdiction}`)?.jobId)
      .filter(Boolean);
    const sourceJob = jobsByLaneAndState.get(`source_acquisition:${jurisdiction}`);
    if (sourceJob) dependencies.push(sourceJob.jobId);

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

  // Runtime and promotion records are TypeScript only because the application
  // imports them directly. Read them as data without executing application code.
  const runtimeRegistrySource = readText(rootDir, FACTORY_INPUT_PATHS.runtimeRegistry);
  const packetCapabilitySource = readText(rootDir, FACTORY_INPUT_PATHS.packetCapabilityRegistry);
  const promotionManifestSource = readText(rootDir, FACTORY_INPUT_PATHS.statePromotionManifest);
  const statePromotionRecords = parseEmbeddedPromotionManifest(promotionManifestSource);

  const implementationPaths = listJsonFiles(rootDir, IMPLEMENTATION_DIR);
  const implementationRecords = implementationPaths
    .filter((file) => /^tranche-\d+\.json$/.test(path.posix.basename(file)))
    .map((file) => ({ path: file, data: readJson(rootDir, file) }));
  const reviewRecords = implementationPaths
    .filter((file) => /(?:review-manifest|visual-review)\.json$/.test(file))
    .map((file) => ({ path: file, data: readJson(rootDir, file) }));

  const generatedFromPaths = [
    ...Object.values(FACTORY_INPUT_PATHS),
    ...implementationPaths
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
    runtimeRegistrySource,
    packetCapabilitySource,
    statePromotionRecords,
    implementationRecords,
    reviewRecords,
    generatedFrom
  };
}

function addTrackLaneJobs({ lane, tracks, inputs, addJob, jobsByLaneAndState }) {
  const groups = groupBy(tracks, (track) => track.jurisdiction);
  for (const [jurisdiction, stateTracks] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const source = jobsByLaneAndState.get(`source_acquisition:${jurisdiction}`);
    addJob({
      lane,
      jurisdiction,
      trackIds: stateTracks.map((track) => track.trackId),
      dependencies: source ? [source.jobId] : [],
      requiredInputs: [
        FACTORY_INPUT_PATHS.authority,
        FACTORY_INPUT_PATHS.normalizedTracks,
        FACTORY_INPUT_PATHS.sourceRelationships,
        FACTORY_INPUT_PATHS.blockerLedger,
        FACTORY_INPUT_PATHS.packetSetManifests,
        FACTORY_INPUT_PATHS.sourceArtifacts,
        ...inputs.implementationRecords.map((record) => record.path)
      ]
    });
  }
}

function sourceWorkByJurisdiction(inputs, normalizedTracks) {
  const grouped = new Map();
  const add = (jurisdiction, trackId) => {
    if (!jurisdiction) return;
    const list = grouped.get(jurisdiction) ?? [];
    if (trackId) list.push(trackId);
    grouped.set(jurisdiction, list);
  };

  for (const row of inputs.sourceAcquisitionQueue.rows ?? []) {
    if (row.edition12Disposition !== "acquired_and_adopted") {
      add(row.jurisdiction, row.trackId);
    }
  }
  for (const row of inputs.blockerLedger.rows ?? []) {
    if (
      row.impact !== "resolved" &&
      [
        "master_library_source_gap",
        "source_acquisition_blocker",
        "source_currentness_blocker",
        "source_or_currentness_blocker",
        "source_provenance_blocker",
        "commercial_use_blocker"
      ].includes(row.blockerScope)
    ) {
      add(row.jurisdiction, row.trackId);
    }
  }

  const classifications = classifyOfficialPdfTracks(inputs, normalizedTracks);
  for (const track of classifications.unclassified) add(track.jurisdiction, track.trackId);

  for (const [jurisdiction, trackIds] of grouped) {
    grouped.set(jurisdiction, sortedUnique(trackIds));
  }
  return grouped;
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

    if ([...classes].some((value) => ["clean_acroform", "dirty_acroform"].includes(value))) {
      acroform.push(track);
    }
    if ([...classes].some((value) => ["flat_pdf", "scanned_pdf"].includes(value))) {
      overlay.push(track);
    }
    if (
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
      adoptedAgainstCommit: inputs.authority.adoptedAgainstCommit
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
