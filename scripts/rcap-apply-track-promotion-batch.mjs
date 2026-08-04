#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { buildFactoryStatus } from "./rcap-factory-status.mjs";

export const TRACK_PROMOTION_BATCH_SCHEMA =
  "rcap-track-promotion-batch/v1";
export const TRACK_PROMOTION_APPLICATION_SCHEMA =
  "rcap-track-promotion-application/v1";
export const TRACK_STAGE_PROOF_SCHEMA = "rcap-track-stage-proof/v1";
export const TRACK_STAGE_ARTIFACT_SCHEMA =
  "rcap-track-stage-artifact/v1";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(SCRIPT_DIR, "..");
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/u;
const BATCH_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,119}$/u;
const TRACK_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{1,159}$/u;
const JURISDICTION_PATTERN = /^[A-Z]{2}$/u;

const ADOPTION_RECORD_DIRECTORY =
  "data/record-clearing/template-families";
const AUTHORITY_PATH =
  "data/record-clearing/master-library/authority.json";
const TRACK_REGISTRY_PATH =
  "data/record-clearing/legal-design-track-registry.json";
const BLOCKER_LEDGER_PATH =
  "data/record-clearing/master-library/authoritative-blocker-ledger.json";
const SHARED_RUNTIME_PATHS = Object.freeze([
  "src/lib/rcap/packets/engines/pleading-templates.ts",
  "src/lib/rcap/packets/engines/process-guidance.ts",
  "src/lib/rcap/packets/registry.ts",
  "src/lib/rcap/jurisdictions/packet-capability.ts"
]);
const EVIDENCE_ARTIFACT_PREFIX =
  "data/record-clearing/production-factory/promotion-evidence/artifacts/";

const OPERATIONS = Object.freeze([
  "bind_adopted_tracks",
  "select_staging_tracks",
  "validate_staging_acceptance",
  "validate_production_promotion_eligibility"
]);
const APPLIER_ROLES = Object.freeze([
  "integration_captain",
  "staging_release_operator",
  "release_manager"
]);
const EVIDENCE_POLICIES = Object.freeze({
  packet_persistence: Object.freeze({
    pathPrefix:
      "data/record-clearing/production-factory/promotion-evidence/packet-persistence/",
    producerContract: "rcap-packet-persistence/v1",
    environment: "artifact_store",
    deployment: "not_applicable"
  }),
  staging_contract: Object.freeze({
    pathPrefix:
      "data/record-clearing/production-factory/promotion-evidence/staging-contract/",
    producerContract: "rcap-staging-contract/v1",
    environment: "staging",
    deployment: "contract_only"
  }),
  staging_acceptance: Object.freeze({
    pathPrefix:
      "data/record-clearing/production-factory/promotion-evidence/staging-acceptance/",
    producerContract: "rcap-staging-acceptance/v1",
    environment: "staging",
    deployment: "staging_applied_and_verified"
  })
});

const BATCH_KEYS = Object.freeze([
  "schemaVersion",
  "batchName",
  "appliedByRole",
  "appliedOn",
  "operation",
  "promotionLane",
  "targetEnvironment",
  "contract",
  "tracks",
  "safety"
]);
const CONTRACT_KEYS = Object.freeze([
  "selectionMode",
  "atomicBatch",
  "jurisdictionApprovalInferred",
  "currentStateMustBeAuthoredAndRecomputed",
  "materialHashDriftRequiresNewReview",
  "authorityEditionMustMatchCounselScope",
  "sharedRuntimeRegistrationMustBeCurrent",
  "nonCounselReleaseBlockersMustBeClosed",
  "stageEvidenceMustFormExactChain",
  "commercialLicenseExclusionsRemainBlocking",
  "externalDependenciesRequireExactEvidence",
  "nonReliefRoutesRemainDistinct",
  "operatorRoleAssertionGrantsAuthority",
  "applyCreatesReceiptOnly"
]);
const TRACK_KEYS = Object.freeze([
  "jurisdiction",
  "trackId",
  "adoptionBinding",
  "trackScopeSha256",
  "expectedState",
  "evidence",
  "notes"
]);
const ADOPTION_BINDING_KEYS = Object.freeze([
  "recordPath",
  "recordSha256",
  "familyId",
  "templateFamilySha256",
  "integratedImplementationCommit"
]);
const STATE_KEYS = Object.freeze([
  "authorityClearance",
  "sourcePinning",
  "implementationProof",
  "technicalProof",
  "visualProof",
  "counselAdoption",
  "packetPersistence",
  "stagingContract",
  "stagingAcceptance",
  "productionPromotion"
]);
const EVIDENCE_KEYS = Object.freeze([
  "packetPersistence",
  "stagingContract",
  "stagingAcceptance"
]);
const EVIDENCE_REFERENCE_KEYS = Object.freeze(["path", "sha256"]);
const EVIDENCE_DOCUMENT_KEYS = Object.freeze([
  "schemaVersion",
  "proofType",
  "status",
  "jurisdiction",
  "trackId",
  "trackScopeSha256",
  "producerContract",
  "environment",
  "predecessorEvidence",
  "artifactPins",
  "safety"
]);
const STAGE_ARTIFACT_PIN_KEYS = Object.freeze(["path", "sha256"]);
const STAGE_ARTIFACT_RECEIPT_KEYS = Object.freeze([
  "schemaVersion",
  "artifactType",
  "jurisdiction",
  "trackId",
  "trackScopeSha256",
  "status",
  "contentHashes"
]);
const PREDECESSOR_EVIDENCE_KEYS = Object.freeze([
  "packetPersistenceSha256",
  "stagingContractSha256"
]);
const EVIDENCE_SAFETY_KEYS = Object.freeze([
  "runtimePosture",
  "jurisdictionActivation",
  "productionPromotion",
  "deployment"
]);
const SAFETY_KEYS = Object.freeze([
  "runtimeDisableSwitchMustRemainOn",
  "generationPermissionMustRemainOff",
  "deliveryReadinessMustRemainOff",
  "jurisdictionActivationMustRemainOff",
  "productionActivationMustRemainOff",
  "publicRoutingMustRemainUnchanged"
]);

const REQUIRED_CONTRACT = Object.freeze({
  selectionMode: "exact_tracks_only",
  atomicBatch: true,
  jurisdictionApprovalInferred: false,
  currentStateMustBeAuthoredAndRecomputed: true,
  materialHashDriftRequiresNewReview: true,
  authorityEditionMustMatchCounselScope: true,
  sharedRuntimeRegistrationMustBeCurrent: true,
  nonCounselReleaseBlockersMustBeClosed: true,
  stageEvidenceMustFormExactChain: true,
  commercialLicenseExclusionsRemainBlocking: true,
  externalDependenciesRequireExactEvidence: true,
  nonReliefRoutesRemainDistinct: true,
  operatorRoleAssertionGrantsAuthority: false,
  applyCreatesReceiptOnly: true
});
const REQUIRED_SAFETY = Object.freeze({
  runtimeDisableSwitchMustRemainOn: true,
  generationPermissionMustRemainOff: true,
  deliveryReadinessMustRemainOff: true,
  jurisdictionActivationMustRemainOff: true,
  productionActivationMustRemainOff: true,
  publicRoutingMustRemainUnchanged: true
});
const PROTECTED_INPUT_KEYS = Object.freeze([
  ["packet", "_ready"].join(""),
  ["packet", "Ready"].join(""),
  ["enabled", "Jurisdictions"].join(""),
  ["jurisdiction", "Enabled"].join(""),
  ["production", "Enabled"].join(""),
  ["production", "_enabled"].join(""),
  ["runtime", "Enabled"].join(""),
  ["runtime", "_enabled"].join(""),
  ["live", "Enabled"].join(""),
  ["generation", "Allowed"].join("")
]);
const RECORD_PRODUCTION_KEY = ["production", "Enabled"].join("");
const RECORD_PACKET_KEY = ["packet", "Ready"].join("");
const RECORD_JURISDICTION_KEY = ["jurisdiction", "Enabled"].join("");
const RECORD_GENERATION_KEY = ["generation", "Allowed"].join("");

const OPERATION_PREREQUISITES = Object.freeze({
  bind_adopted_tracks: Object.freeze({
    sourcePinning: "pinned",
    implementationProof: "proven",
    technicalProof: "passed",
    visualProof: "passed",
    counselAdoption: "adopted"
  }),
  select_staging_tracks: Object.freeze({
    authorityClearance: "cleared",
    sourcePinning: "pinned",
    implementationProof: "proven",
    technicalProof: "passed",
    visualProof: "passed",
    counselAdoption: "adopted",
    packetPersistence: "proven",
    stagingContract: "satisfied"
  }),
  validate_staging_acceptance: Object.freeze({
    authorityClearance: "cleared",
    sourcePinning: "pinned",
    implementationProof: "proven",
    technicalProof: "passed",
    visualProof: "passed",
    counselAdoption: "adopted",
    packetPersistence: "proven",
    stagingContract: "satisfied",
    stagingAcceptance: "accepted"
  }),
  validate_production_promotion_eligibility: Object.freeze({
    authorityClearance: "cleared",
    sourcePinning: "pinned",
    implementationProof: "proven",
    technicalProof: "passed",
    visualProof: "passed",
    counselAdoption: "adopted",
    packetPersistence: "proven",
    stagingContract: "satisfied",
    stagingAcceptance: "accepted",
    productionPromotion: "not_promoted"
  })
});

export class TrackPromotionContractError extends Error {
  constructor(code, message, detail = {}) {
    super(message);
    this.name = "TrackPromotionContractError";
    this.code = code;
    this.detail = detail;
  }
}

export function canonicalJson(value) {
  // Keep this byte-compatible with the strict F-02 template-hash contract.
  // This plain-JavaScript entry point must remain runnable in factory
  // worktrees before TypeScript dependencies are installed.
  return serializeCanonical(value, "$", new Set());
}

export function canonicalJsonSha256(value) {
  return sha256(Buffer.from(canonicalJson(value), "utf8"));
}

export function buildTrackApprovalEntry({
  rootDir = DEFAULT_ROOT,
  trackId,
  evidence = emptyEvidence(),
  notes = []
}) {
  return buildTrackApprovalEntries({
    rootDir,
    entries: [{ trackId, evidence, notes }]
  })[0];
}

export function buildTrackApprovalEntries({
  rootDir = DEFAULT_ROOT,
  entries
}) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw contractError(
      "empty_track_batch",
      "At least one entry is required to build track approval inputs."
    );
  }
  const repository = loadRepositoryState(path.resolve(rootDir));
  return entries.map(({ trackId, evidence = emptyEvidence(), notes = [] }) =>
    buildEntryFromRepository(repository, trackId, evidence, notes)
  );
}

function buildEntryFromRepository(repository, trackId, evidence, notes) {
  const track = deriveTrackContext(repository, trackId);
  const evidenceResult = validateEvidenceSet(
    repository.rootDir,
    evidence,
    track
  );
  return {
    jurisdiction: track.projection.routeIdentity.jurisdiction,
    trackId,
    adoptionBinding: track.adoptionBinding,
    trackScopeSha256: track.trackScopeSha256,
    expectedState: deriveObservedState(track, evidenceResult),
    evidence: normalizeEvidenceReferences(evidence),
    notes: validateNotes(notes, `${trackId}.notes`)
  };
}

export function evaluateTrackPromotionBatch(
  batch,
  { rootDir = DEFAULT_ROOT } = {}
) {
  const root = path.resolve(rootDir);
  const refusals = [];
  let repository;

  try {
    canonicalJson(batch);
    validateBatchEnvelope(batch);
    repository = loadRepositoryState(root);
  } catch (error) {
    return refusedEvaluation(batch, [asRefusal(error)]);
  }

  const entries = [];
  const seenTrackIds = new Set();
  for (let index = 0; index < batch.tracks.length; index += 1) {
    const input = batch.tracks[index];
    try {
      validateTrackInput(input, index);
      if (seenTrackIds.has(input.trackId)) {
        throw contractError(
          "duplicate_track",
          `Track ${input.trackId} appears more than once.`
        );
      }
      seenTrackIds.add(input.trackId);

      const track = deriveTrackContext(repository, input.trackId);
      if (input.jurisdiction !== track.projection.routeIdentity.jurisdiction) {
        throw contractError(
          "jurisdiction_mismatch",
          `${input.trackId} belongs to ${track.projection.routeIdentity.jurisdiction}, not ${input.jurisdiction}.`
        );
      }
      assertCanonicalEqual(
        input.adoptionBinding,
        track.adoptionBinding,
        "adoption_binding_drift",
        `${input.trackId} adoption binding does not match the current record.`
      );
      if (input.trackScopeSha256 !== track.trackScopeSha256) {
        throw contractError(
          "track_scope_drift",
          `${input.trackId} trackScopeSha256 does not match the current route projection.`,
          {
            expected: track.trackScopeSha256,
            actual: input.trackScopeSha256
          }
        );
      }

      const evidence = validateEvidenceSet(
        repository.rootDir,
        input.evidence,
        track
      );
      const observedState = deriveObservedState(track, evidence);
      assertCanonicalEqual(
        input.expectedState,
        observedState,
        "state_claim_mismatch",
        `${input.trackId} expectedState does not match independently observed stages.`
      );

      if (
        batch.operation !== "bind_adopted_tracks" &&
        track.projection.routeIdentity.reliefCharacter === "non_relief"
      ) {
        throw contractError(
          "non_relief_route_ineligible",
          `${input.trackId} requires a separate non-relief delivery contract before staging.`
        );
      }
      if (
        batch.operation !== "bind_adopted_tracks" &&
        track.projection.sharedRuntimeRegistration.status !== "registered"
      ) {
        throw contractError(
          "shared_registration_missing",
          `${input.trackId} is not fully registered in the current shared packet runtime.`,
          {
            missing:
              track.projection.sharedRuntimeRegistration.missingRegistrations
          }
        );
      }
      const unmet = unmetPrerequisites(batch.operation, observedState);
      if (unmet.length > 0) {
        throw contractError(
          "operation_prerequisite_missing",
          `${input.trackId} is not eligible for ${batch.operation}.`,
          { unmet }
        );
      }
      if (
        batch.operation !== "bind_adopted_tracks" &&
        track.projection.releaseBlockerClosure.status !== "closed"
      ) {
        throw contractError(
          "non_counsel_release_blocker_open",
          `${input.trackId} retains an unresolved non-counsel release blocker.`,
          {
            blockers: track.projection.releaseBlockerClosure.openBlockers
          }
        );
      }

      entries.push({
        jurisdiction: input.jurisdiction,
        trackId: input.trackId,
        adoptionBinding: track.adoptionBinding,
        trackScopeSha256: track.trackScopeSha256,
        trackProjection: track.projection,
        observedState,
        evidence: evidence.summary,
        typedBlockers: deriveTypedBlockers(track, observedState),
        notes: [...input.notes]
      });
    } catch (error) {
      refusals.push({
        index,
        trackId:
          input && typeof input.trackId === "string" ? input.trackId : null,
        ...asRefusal(
          enrichMissingAdoptionRefusal(error, repository, input?.trackId)
        )
      });
    }
  }

  if (refusals.length > 0) return refusedEvaluation(batch, refusals);

  entries.sort(compareTrackEntries);
  const receipt = buildReceipt(batch, repository, entries);
  return {
    eligible: true,
    batchName: batch.batchName,
    operation: batch.operation,
    exactTrackCount: entries.length,
    refusals: [],
    receipt
  };
}

function loadRepositoryState(rootDir) {
  const authority = readJson(rootDir, AUTHORITY_PATH);
  if (
    authority.adoptionStatus !== "adopted" ||
    typeof authority.edition !== "string"
  ) {
    throw contractError(
      "authority_not_adopted",
      "The current Master Library authority is not adopted."
    );
  }

  const registry = readJson(rootDir, TRACK_REGISTRY_PATH);
  const tracks = asArray(registry.tracks);
  if (tracks.length !== 250) {
    throw contractError(
      "track_registry_invalid",
      `Expected 250 normalized tracks, found ${tracks.length}.`
    );
  }
  const tracksById = new Map();
  for (const track of tracks) {
    if (
      !track ||
      typeof track.trackId !== "string" ||
      typeof track.jurisdiction !== "string" ||
      tracksById.has(track.trackId)
    ) {
      throw contractError(
        "track_registry_invalid",
        "Normalized track identities are missing or duplicated."
      );
    }
    tracksById.set(track.trackId, track);
  }

  const blockerLedger = readJson(rootDir, BLOCKER_LEDGER_PATH);
  const blockerRows = asArray(blockerLedger.rows);
  const status = buildFactoryStatus({ rootDir });
  const statusByTrack = new Map(
    asArray(status.tracks).map((track) => [track.trackId, track])
  );
  const adoptedByTrack = new Map();
  const excludedByTrack = new Map();
  const adoptionDirectory = resolveRepositoryDirectory(
    rootDir,
    ADOPTION_RECORD_DIRECTORY
  );
  const physicalAdoptions = fs
    .readdirSync(adoptionDirectory, { withFileTypes: true })
    .filter(
      (entry) =>
        /^ADOPT-[0-9]+-[a-z0-9-]+-adoption\.json$/u.test(entry.name)
    )
    .map((entry) =>
      path.posix.join(ADOPTION_RECORD_DIRECTORY, entry.name)
    );
  const committedAdoptions = spawnSync(
    "git",
    [
      "ls-tree",
      "-r",
      "-z",
      "--name-only",
      "HEAD",
      "--",
      ADOPTION_RECORD_DIRECTORY
    ],
    { cwd: rootDir, encoding: "utf8", maxBuffer: 1024 * 1024 }
  );
  if (committedAdoptions.status !== 0) {
    throw contractError(
      "adoption_discovery_failed",
      "Could not enumerate committed counsel-adoption records."
    );
  }
  const adoptionRecordPaths = [
    ...new Set([
      ...physicalAdoptions,
      ...committedAdoptions.stdout
        .split("\0")
        .filter((relativePath) =>
          /^data\/record-clearing\/template-families\/ADOPT-[0-9]+-[a-z0-9-]+-adoption\.json$/u.test(
            relativePath
          )
        )
    ])
  ].sort();
  if (adoptionRecordPaths.length === 0) {
    throw contractError(
      "adoption_record_missing",
      "No committed counsel-adoption records were discovered."
    );
  }

  for (const recordPath of adoptionRecordPaths) {
    const absolutePath = resolveRepositoryFile(rootDir, recordPath);
    const recordBytes = fs.readFileSync(absolutePath);
    const record = JSON.parse(recordBytes.toString("utf8"));
    const recordSha256 = sha256(recordBytes);
    validateTrackedHeadFile(
      rootDir,
      recordPath,
      recordBytes,
      `${recordPath} counsel adoption`
    );
    validateAdoptionRecord(
      rootDir,
      recordPath,
      record,
      recordSha256,
      authority
    );

    for (const scope of record.completedScopes) {
      for (const trackId of scope.approvedRouteIds) {
        if (adoptedByTrack.has(trackId)) {
          throw contractError(
            "duplicate_adoption",
            `Track ${trackId} is adopted by more than one scope.`
          );
        }
        adoptedByTrack.set(trackId, {
          recordPath,
          recordSha256,
          record,
          scope
        });
      }
      for (const trackId of scope.excludedRouteIds) {
        excludedByTrack.set(trackId, {
          recordPath,
          familyId: scope.familyId,
          jurisdiction: scope.jurisdiction
        });
      }
    }
  }

  return {
    rootDir,
    authority,
    authoritySha256: fileSha256(rootDir, AUTHORITY_PATH),
    registry,
    tracks,
    tracksById,
    blockerRows,
    status,
    statusByTrack,
    adoptedByTrack,
    excludedByTrack,
    adoptionRecordPaths
  };
}

function validateAdoptionRecord(
  rootDir,
  recordPath,
  record,
  recordSha256,
  authority
) {
  assertExactKeys(
    record,
    [
      "schemaVersion",
      "adoptionJobId",
      "status",
      "adoptedOn",
      "approvedByRole",
      "approvalBasis",
      "counselIdentityReference",
      "scopePolicy",
      "completedScopeCount",
      "approvedRouteCount",
      "completedScopes",
      "blanketFutureApproval",
      RECORD_PRODUCTION_KEY
    ],
    recordPath
  );
  if (
    record.schemaVersion !== "rcap-counsel-adoption/v1" ||
    record.status !== "counsel_adopted" ||
    record.approvedByRole !== "licensed_counsel" ||
    record.blanketFutureApproval !== false ||
    record[RECORD_PRODUCTION_KEY] !== false ||
    !Array.isArray(record.completedScopes) ||
    record.completedScopes.length === 0 ||
    record.completedScopeCount !== record.completedScopes.length ||
    !SHA256_PATTERN.test(recordSha256)
  ) {
    throw contractError(
      "adoption_record_invalid",
      `${recordPath} is not an exact fail-closed counsel adoption.`
    );
  }

  let routeCount = 0;
  for (const scope of record.completedScopes) {
    validateAdoptionScope(rootDir, recordPath, scope, authority);
    routeCount += scope.approvedRouteIds.length;
  }
  if (routeCount !== record.approvedRouteCount) {
    throw contractError(
      "adoption_record_invalid",
      `${recordPath} approvedRouteCount does not reconcile.`
    );
  }
}

function validateAdoptionScope(rootDir, recordPath, scope, authority) {
  const requiredFields = [
    "adoptionJobId",
    "reviewJobId",
    "familyId",
    "jurisdiction",
    "status",
    "adoptedOn",
    "approvedByRole",
    "approvalBasis",
    "sourceImplementationCommit",
    "integratedImplementationCommit",
    "approvedRouteIds",
    "excludedRouteIds",
    "hashBoundScope",
    "templateFamilySha256",
    "templateHashes",
    "sourceHashes",
    "mappingHashes",
    "legalDesignSpecificationHashes",
    "authorityPinsManifest",
    "reviewArtifacts",
    "representativePackets",
    "branchVariantCoverage",
    "boundArtifactHashes",
    "knownLimitations",
    "requiredBeforeFiling",
    "nonCounselReleaseBlockers",
    "runtime",
    "scopeCompletion",
    "fullCanonicalParentComplete"
  ];
  for (const field of requiredFields) {
    if (!Object.hasOwn(scope, field)) {
      throw contractError(
        "adoption_scope_invalid",
        `${recordPath} scope ${scope.familyId ?? "<unknown>"} is missing ${field}.`
      );
    }
  }
  if (
    typeof scope.familyId !== "string" ||
    !JURISDICTION_PATTERN.test(scope.jurisdiction ?? "") ||
    scope.status !== "counsel_adopted" ||
    scope.approvedByRole !== "licensed_counsel" ||
    typeof scope.approvalBasis !== "string" ||
    scope.approvalBasis.length === 0 ||
    typeof scope.adoptedOn !== "string" ||
    scope.scopeCompletion !== "exact_implemented_routes_complete" ||
    scope.fullCanonicalParentComplete !== false ||
    !COMMIT_PATTERN.test(scope.sourceImplementationCommit ?? "") ||
    !COMMIT_PATTERN.test(scope.integratedImplementationCommit ?? "") ||
    !Array.isArray(scope.approvedRouteIds) ||
    scope.approvedRouteIds.length === 0 ||
    !Array.isArray(scope.excludedRouteIds) ||
    hasDuplicates(scope.approvedRouteIds) ||
    hasDuplicates(scope.excludedRouteIds) ||
    scope.approvedRouteIds.some((trackId) =>
      scope.excludedRouteIds.includes(trackId)
    )
  ) {
    throw contractError(
      "adoption_scope_invalid",
      `${recordPath} contains an invalid adopted scope.`
    );
  }

  const runtime = scope.runtime;
  if (
    !runtime ||
    runtime.runtimeStatus !== "runtime_disabled" ||
    runtime[RECORD_GENERATION_KEY] !== false ||
    runtime[RECORD_PACKET_KEY] !== false ||
    runtime[RECORD_JURISDICTION_KEY] !== false ||
    runtime[RECORD_PRODUCTION_KEY] !== false
  ) {
    throw contractError(
      "adoption_runtime_widened",
      `${scope.familyId} no longer has the required disabled runtime posture.`
    );
  }
  if (
    scope.hashBoundScope?.schemaVersion !==
      "rcap-counsel-adoption-hash-scope/v1" ||
    scope.hashBoundScope.familyId !== scope.familyId ||
    canonicalJsonSha256(scope.hashBoundScope) !==
      scope.templateFamilySha256
  ) {
    throw contractError(
      "template_family_drift",
      `${scope.familyId} template-family hash does not match its canonical scope.`
    );
  }
  if (
    typeof authority.retention?.archiveSha256 !== "string" ||
    scope.hashBoundScope.authorityArchiveSha256 !==
      authority.retention.archiveSha256
  ) {
    throw contractError(
      "authority_scope_drift",
      `${scope.familyId} counsel adoption is not bound to the current authority archive.`
    );
  }
  for (const [familyField, scopeField] of [
    ["templates", "templateHashes"],
    ["sources", "sourceHashes"],
    ["mappings", "mappingHashes"],
    ["legalDesignSpecifications", "legalDesignSpecificationHashes"]
  ]) {
    if (
      canonicalJson(scope.hashBoundScope[familyField]) !==
      canonicalJson(scope[scopeField])
    ) {
      throw contractError(
        "template_family_drift",
        `${scope.familyId} ${scopeField} no longer matches its canonical family scope.`
      );
    }
  }

  validatePins(scope.templateHashes, `${scope.familyId}.templateHashes`, "id");
  validatePins(scope.sourceHashes, `${scope.familyId}.sourceHashes`, "id", {
    requiredExtra: "sourceRole"
  });
  validatePins(scope.mappingHashes, `${scope.familyId}.mappingHashes`, "id");
  validatePins(
    scope.legalDesignSpecificationHashes,
    `${scope.familyId}.legalDesignSpecificationHashes`,
    "trackId"
  );
  validateFilePin(rootDir, scope.authorityPinsManifest, "authorityPinsManifest");
  const authorityPins = readJson(rootDir, scope.authorityPinsManifest.path);
  if (
    authorityPins.authorityEdition !== authority.edition ||
    authorityPins.authorityArchiveSha256 !==
      authority.retention.archiveSha256
  ) {
    throw contractError(
      "authority_scope_drift",
      `${scope.familyId} authority pins do not match current Edition ${authority.edition}.`
    );
  }
  for (const pin of scope.reviewArtifacts) {
    validateFilePin(rootDir, pin, "reviewArtifact");
  }
  for (const pin of scope.boundArtifactHashes) {
    validateFilePin(rootDir, pin, "boundArtifact");
  }
  for (const packet of scope.representativePackets) {
    if (
      !packet ||
      typeof packet.fixtureId !== "string" ||
      typeof packet.trackId !== "string" ||
      !SHA256_PATTERN.test(packet.sha256 ?? "") ||
      !Number.isInteger(packet.pageCount) ||
      packet.pageCount < 1
    ) {
      throw contractError(
        "packet_pin_invalid",
        `${scope.familyId} contains an invalid representative packet pin.`
      );
    }
  }
  assertIntegratedCommit(rootDir, scope.integratedImplementationCommit);
}

function deriveTrackContext(repository, trackId) {
  if (
    typeof trackId !== "string" ||
    !TRACK_ID_PATTERN.test(trackId) ||
    trackId.includes("*")
  ) {
    throw contractError(
      "invalid_track_id",
      `Invalid explicit track ID: ${String(trackId)}.`
    );
  }
  const track = repository.tracksById.get(trackId);
  if (!track) {
    throw contractError("unknown_track", `Unknown normalized track ${trackId}.`);
  }
  const excluded = repository.excludedByTrack.get(trackId);
  if (excluded) {
    throw contractError(
      "route_explicitly_excluded",
      `${trackId} is explicitly excluded from ${excluded.familyId}.`
    );
  }
  const adoption = repository.adoptedByTrack.get(trackId);
  if (!adoption) {
    throw contractError(
      "counsel_adoption_missing",
      `${trackId} has no exact current counsel-adoption scope.`
    );
  }
  if (track.jurisdiction !== adoption.scope.jurisdiction) {
    throw contractError(
      "jurisdiction_mismatch",
      `${trackId} registry and adoption jurisdictions differ.`
    );
  }
  const status = repository.statusByTrack.get(trackId);
  if (!status) {
    throw contractError(
      "status_missing",
      `${trackId} has no independently derived production status.`
    );
  }

  const projection = buildTrackProjection(repository, track, adoption, status);
  const trackScopeSha256 = canonicalJsonSha256(projection);
  return {
    track,
    status,
    adoption,
    projection,
    trackScopeSha256,
    adoptionBinding: {
      recordPath: adoption.recordPath,
      recordSha256: adoption.recordSha256,
      familyId: adoption.scope.familyId,
      templateFamilySha256: adoption.scope.templateFamilySha256,
      integratedImplementationCommit:
        adoption.scope.integratedImplementationCommit
    }
  };
}

function buildTrackProjection(repository, track, adoption, status) {
  const scope = adoption.scope;
  const specification = exactOne(
    scope.legalDesignSpecificationHashes.filter(
      (entry) => entry.trackId === track.trackId
    ),
    `${track.trackId} legal-design specification`
  );
  const branchCoverage = exactOne(
    scope.branchVariantCoverage.filter(
      (entry) => entry.trackId === track.trackId
    ),
    `${track.trackId} branch coverage`
  );
  const components = scope.hashBoundScope.components
    .filter((entry) => entry.trackId === track.trackId)
    .sort(
      (left, right) =>
        left.order - right.order ||
        left.componentId.localeCompare(right.componentId)
    );
  if (components.length === 0) {
    throw contractError(
      "component_scope_missing",
      `${track.trackId} has no adopted ordered component closure.`
    );
  }
  const representativePackets = scope.representativePackets
    .filter((entry) => entry.trackId === track.trackId)
    .sort(comparePacketPins);
  if (representativePackets.length === 0) {
    throw contractError(
      "packet_scope_missing",
      `${track.trackId} has no representative packet proof.`
    );
  }

  const referencedTemplateIds = new Set(
    components.map((entry) => entry.templateId).filter(Boolean)
  );
  const templatePins = scope.templateHashes
    .filter((entry) => referencedTemplateIds.has(entry.id))
    .sort(comparePinIds);
  if (templatePins.length !== referencedTemplateIds.size) {
    throw contractError(
      "template_scope_missing",
      `${track.trackId} does not bind every referenced template.`
    );
  }

  const branchLogic = {
    components,
    branchVariantCoverage: branchCoverage
  };
  const sharedRuntimeRegistration = deriveSharedRuntimeRegistration(
    repository,
    track,
    scope,
    components
  );
  const releaseBlockerClosure = deriveReleaseBlockerClosure(
    scope,
    sharedRuntimeRegistration
  );
  return {
    schemaVersion: "rcap-track-hash-scope/v1",
    routeIdentity: {
      jurisdiction: track.jurisdiction,
      trackId: track.trackId,
      reliefCharacter: classifyTrackReliefCharacter(track),
      routeClassification: classifyRoute(track),
      outputStrategy: track.outputStrategy ?? null,
      legalDesignStatus: track.legalDesignStatus ?? null,
      legalStatus: track.legalStatus ?? null
    },
    authority: {
      edition: `master-library/${repository.authority.edition}`,
      authorityRecord: {
        path: AUTHORITY_PATH,
        sha256: repository.authoritySha256
      },
      authorityArchiveSha256:
        scope.hashBoundScope.authorityArchiveSha256,
      authorityPinsManifest: scope.authorityPinsManifest,
      sourcePins: [...scope.sourceHashes].sort(comparePinIds)
    },
    templateFamily: {
      familyId: scope.familyId,
      sha256: scope.templateFamilySha256,
      routeTemplatePins: templatePins
    },
    mappingPins: [...scope.mappingHashes].sort(comparePinIds),
    legalDesignSpecification: specification,
    branchLogic: {
      sha256: canonicalJsonSha256(branchLogic),
      ...branchLogic
    },
    sharedRuntimeRegistration,
    releaseBlockerClosure,
    reviewManifestPins: [...scope.reviewArtifacts].sort(comparePathPins),
    representativePacketPins: representativePackets,
    counselAdoption: {
      recordPath: adoption.recordPath,
      recordSha256: adoption.recordSha256,
      adoptionJobId: adoption.record.adoptionJobId,
      familyId: scope.familyId,
      status: scope.status,
      adoptedOn: scope.adoptedOn,
      approvedByRole: scope.approvedByRole,
      approvalBasis: scope.approvalBasis,
      scopeCompletion: scope.scopeCompletion,
      fullCanonicalParentComplete: scope.fullCanonicalParentComplete
    },
    implementationVersion: {
      sourceCommit: scope.sourceImplementationCommit,
      integratedCommit: scope.integratedImplementationCommit
    },
    exactRouteSets: {
      approvedRouteIds: [...scope.approvedRouteIds].sort(),
      excludedRouteIds: [...scope.excludedRouteIds].sort()
    },
    boundArtifactPins: [...scope.boundArtifactHashes].sort(comparePathPins),
    recordedAtAdoption: {
      knownLimitations: [...scope.knownLimitations],
      requiredBeforeFiling: [...scope.requiredBeforeFiling],
      nonCounselReleaseBlockers: [...scope.nonCounselReleaseBlockers]
    },
    runtimePosture: {
      runtimeStatus: scope.runtime.runtimeStatus,
      generationPermission: "withheld",
      deliveryReadiness: "not_ready",
      jurisdictionActivation: "inactive",
      productionPromotion: "not_promoted"
    },
    independentlyObservedProof: {
      authorityClearance: status.authorityCleared ? "cleared" : "blocked",
      sourcePinning: status.sourcePinned ? "pinned" : "unpinned",
      implementationProof: status.implementationComplete
        ? "proven"
        : "unproven",
      technicalProof: status.technicalProofPassed ? "passed" : "pending",
      visualProof: status.visualProofPassed ? "passed" : "pending",
      counselAdoption: status.counselAdopted ? "adopted" : "not_adopted"
    }
  };
}

function validateBatchEnvelope(batch) {
  assertNoProtectedInputKeys(batch);
  assertExactKeys(batch, BATCH_KEYS, "batch");
  if (batch.schemaVersion !== TRACK_PROMOTION_BATCH_SCHEMA) {
    throw contractError(
      "batch_schema_invalid",
      `Expected ${TRACK_PROMOTION_BATCH_SCHEMA}.`
    );
  }
  if (
    typeof batch.batchName !== "string" ||
    !BATCH_NAME_PATTERN.test(batch.batchName)
  ) {
    throw contractError("batch_name_invalid", "batchName is invalid.");
  }
  if (!APPLIER_ROLES.includes(batch.appliedByRole)) {
    throw contractError("applier_role_invalid", "appliedByRole is unsupported.");
  }
  if (!isCanonicalIsoTimestamp(batch.appliedOn)) {
    throw contractError(
      "application_date_invalid",
      "appliedOn must be an exact ISO-8601 timestamp."
    );
  }
  if (!OPERATIONS.includes(batch.operation)) {
    throw contractError("operation_invalid", "operation is unsupported.");
  }
  if (batch.promotionLane !== "packet_delivery") {
    throw contractError(
      "promotion_lane_invalid",
      "promotionLane must be packet_delivery."
    );
  }
  const expectedEnvironment =
    batch.operation === "validate_production_promotion_eligibility"
      ? "production"
      : "staging";
  if (batch.targetEnvironment !== expectedEnvironment) {
    throw contractError(
      "target_environment_invalid",
      `${batch.operation} requires ${expectedEnvironment}.`
    );
  }
  assertExactKeys(batch.contract, CONTRACT_KEYS, "batch.contract");
  assertCanonicalEqual(
    batch.contract,
    REQUIRED_CONTRACT,
    "batch_contract_invalid",
    "The exact-track atomic receipt contract is required."
  );
  assertExactKeys(batch.safety, SAFETY_KEYS, "batch.safety");
  assertCanonicalEqual(
    batch.safety,
    REQUIRED_SAFETY,
    "batch_safety_invalid",
    "The fail-closed safety declaration is required."
  );
  if (!Array.isArray(batch.tracks) || batch.tracks.length === 0) {
    throw contractError(
      "empty_track_batch",
      "At least one explicit track is required."
    );
  }
  if (batch.tracks.length > 250) {
    throw contractError(
      "track_batch_too_large",
      "A batch cannot exceed the normalized track count."
    );
  }
  const requiredRole =
    batch.operation === "validate_production_promotion_eligibility"
      ? "release_manager"
      : batch.operation === "validate_staging_acceptance"
        ? "staging_release_operator"
        : "integration_captain";
  if (batch.appliedByRole !== requiredRole) {
    throw contractError(
      "applier_role_invalid",
      `${batch.operation} requires ${requiredRole}.`
    );
  }
}

function validateTrackInput(input, index) {
  assertExactKeys(input, TRACK_KEYS, `tracks[${index}]`);
  if (
    !JURISDICTION_PATTERN.test(input.jurisdiction ?? "") ||
    !TRACK_ID_PATTERN.test(input.trackId ?? "") ||
    input.trackId.includes("*")
  ) {
    throw contractError(
      "track_identity_invalid",
      `tracks[${index}] must name one exact jurisdiction and track.`
    );
  }
  assertExactKeys(
    input.adoptionBinding,
    ADOPTION_BINDING_KEYS,
    `tracks[${index}].adoptionBinding`
  );
  if (
    !SHA256_PATTERN.test(input.adoptionBinding.recordSha256 ?? "") ||
    !SHA256_PATTERN.test(
      input.adoptionBinding.templateFamilySha256 ?? ""
    ) ||
    !COMMIT_PATTERN.test(
      input.adoptionBinding.integratedImplementationCommit ?? ""
    ) ||
    !SHA256_PATTERN.test(input.trackScopeSha256 ?? "")
  ) {
    throw contractError(
      "track_binding_invalid",
      `${input.trackId} contains a malformed hash or commit binding.`
    );
  }
  assertExactKeys(
    input.expectedState,
    STATE_KEYS,
    `tracks[${index}].expectedState`
  );
  assertExactKeys(
    input.evidence,
    EVIDENCE_KEYS,
    `tracks[${index}].evidence`
  );
  validateNotes(input.notes, `tracks[${index}].notes`);
}

function validateEvidenceSet(rootDir, evidence, track) {
  assertExactKeys(evidence, EVIDENCE_KEYS, `${track.track.trackId}.evidence`);
  const validated = {};
  for (const [field, proofType] of [
    ["packetPersistence", "packet_persistence"],
    ["stagingContract", "staging_contract"],
    ["stagingAcceptance", "staging_acceptance"]
  ]) {
    validated[field] = validateEvidenceReference(
      rootDir,
      proofType,
      evidence[field],
      track,
      evidence
    );
  }
  return {
    packetPersistence: validated.packetPersistence !== null,
    stagingContract: validated.stagingContract !== null,
    stagingAcceptance: validated.stagingAcceptance !== null,
    summary: validated
  };
}

function validateEvidenceReference(
  rootDir,
  proofType,
  reference,
  track,
  evidenceSet
) {
  if (reference === null) return null;
  const policy = EVIDENCE_POLICIES[proofType];
  assertExactKeys(
    reference,
    EVIDENCE_REFERENCE_KEYS,
    `${track.track.trackId}.${proofType}`
  );
  if (!SHA256_PATTERN.test(reference.sha256 ?? "")) {
    throw contractError(
      "evidence_hash_invalid",
      `${track.track.trackId} ${proofType} reference has an invalid SHA-256.`
    );
  }
  const relativePath = normalizeRepositoryPath(reference.path);
  if (
    !relativePath.startsWith(policy.pathPrefix) ||
    !relativePath.endsWith(".json")
  ) {
    throw contractError(
      "evidence_path_invalid",
      `${track.track.trackId} ${proofType} evidence must be a JSON receipt below ${policy.pathPrefix}.`
    );
  }
  const absolutePath = resolveRepositoryFile(rootDir, relativePath);
  const bytes = fs.readFileSync(absolutePath);
  if (sha256(bytes) !== reference.sha256) {
    throw contractError(
      "evidence_hash_drift",
      `${track.track.trackId} ${proofType} evidence bytes drifted.`
    );
  }
  const evidenceCommit = validateTrackedHeadFile(
    rootDir,
    relativePath,
    bytes,
    `${track.track.trackId} ${proofType} evidence`
  );
  let proof;
  try {
    proof = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw contractError(
      "evidence_json_invalid",
      `${relativePath} is not valid JSON: ${error.message}`
    );
  }
  assertNoProtectedInputKeys(proof);
  assertExactKeys(proof, EVIDENCE_DOCUMENT_KEYS, relativePath);
  assertExactKeys(proof.safety, EVIDENCE_SAFETY_KEYS, `${relativePath}.safety`);
  assertExactKeys(
    proof.predecessorEvidence,
    PREDECESSOR_EVIDENCE_KEYS,
    `${relativePath}.predecessorEvidence`
  );
  if (
    proof.schemaVersion !== TRACK_STAGE_PROOF_SCHEMA ||
    proof.proofType !== proofType ||
    proof.status !== "passed" ||
    proof.jurisdiction !== track.track.jurisdiction ||
    proof.trackId !== track.track.trackId ||
    proof.trackScopeSha256 !== track.trackScopeSha256 ||
    proof.producerContract !== policy.producerContract ||
    proof.environment !== policy.environment ||
    !Array.isArray(proof.artifactPins) ||
    proof.artifactPins.length === 0
  ) {
    throw contractError(
      "evidence_scope_invalid",
      `${relativePath} does not prove exact ${proofType} for ${track.track.trackId}.`
    );
  }
  const expectedPredecessors =
    proofType === "packet_persistence"
      ? {
          packetPersistenceSha256: null,
          stagingContractSha256: null
        }
      : proofType === "staging_contract"
        ? {
            packetPersistenceSha256:
              evidenceSet.packetPersistence?.sha256 ?? null,
            stagingContractSha256: null
          }
        : {
            packetPersistenceSha256:
              evidenceSet.packetPersistence?.sha256 ?? null,
            stagingContractSha256:
              evidenceSet.stagingContract?.sha256 ?? null
          };
  if (
    (proofType === "staging_contract" &&
      expectedPredecessors.packetPersistenceSha256 === null) ||
    (proofType === "staging_acceptance" &&
      (expectedPredecessors.packetPersistenceSha256 === null ||
        expectedPredecessors.stagingContractSha256 === null))
  ) {
    throw contractError(
      "evidence_chain_missing",
      `${relativePath} is missing its exact predecessor evidence reference.`
    );
  }
  assertCanonicalEqual(
    proof.predecessorEvidence,
    expectedPredecessors,
    "evidence_chain_drift",
    `${relativePath} does not bind the exact predecessor proof hashes.`
  );
  const artifactPins = proof.artifactPins.map((pin, index) => {
    assertExactKeys(
      pin,
      STAGE_ARTIFACT_PIN_KEYS,
      `${relativePath}.artifactPins[${index}]`
    );
    if (!SHA256_PATTERN.test(pin.sha256 ?? "")) {
      throw contractError(
        "evidence_artifact_pin_invalid",
        `${relativePath} contains an invalid artifact SHA-256.`
      );
    }
    const artifactPath = normalizeRepositoryPath(pin.path);
    if (
      artifactPath === relativePath ||
      !artifactPath.startsWith(EVIDENCE_ARTIFACT_PREFIX) ||
      !artifactPath.endsWith(".json")
    ) {
      throw contractError(
        "evidence_artifact_pin_invalid",
        `${relativePath} must cite a distinct JSON receipt below ${EVIDENCE_ARTIFACT_PREFIX}.`
      );
    }
    const artifactBytes = fs.readFileSync(
      resolveRepositoryFile(rootDir, artifactPath)
    );
    if (sha256(artifactBytes) !== pin.sha256) {
      throw contractError(
        "evidence_artifact_drift",
        `${artifactPath} no longer matches the stage-evidence pin.`
      );
    }
    let artifactReceipt;
    try {
      artifactReceipt = JSON.parse(artifactBytes.toString("utf8"));
    } catch (error) {
      throw contractError(
        "evidence_artifact_receipt_invalid",
        `${artifactPath} is not a valid stage-artifact receipt: ${error.message}`
      );
    }
    assertNoProtectedInputKeys(artifactReceipt);
    assertExactKeys(
      artifactReceipt,
      STAGE_ARTIFACT_RECEIPT_KEYS,
      artifactPath
    );
    if (
      artifactReceipt.schemaVersion !== TRACK_STAGE_ARTIFACT_SCHEMA ||
      artifactReceipt.artifactType !== proofType ||
      artifactReceipt.jurisdiction !== track.track.jurisdiction ||
      artifactReceipt.trackId !== track.track.trackId ||
      artifactReceipt.trackScopeSha256 !== track.trackScopeSha256 ||
      artifactReceipt.status !== "passed" ||
      !Array.isArray(artifactReceipt.contentHashes) ||
      artifactReceipt.contentHashes.length === 0 ||
      hasDuplicates(artifactReceipt.contentHashes) ||
      !artifactReceipt.contentHashes.every((value) =>
        SHA256_PATTERN.test(value)
      )
    ) {
      throw contractError(
        "evidence_artifact_receipt_invalid",
        `${artifactPath} does not bind exact ${proofType} artifact content for ${track.track.trackId}.`
      );
    }
    return {
      path: artifactPath,
      sha256: pin.sha256,
      contentHashes: [...artifactReceipt.contentHashes].sort(),
      repositoryCommit: validateTrackedHeadFile(
        rootDir,
        artifactPath,
        artifactBytes,
        `${track.track.trackId} ${proofType} artifact`
      )
    };
  });
  if (
    hasDuplicates(artifactPins.map((pin) => pin.path)) ||
    hasDuplicates(artifactPins.map((pin) => `${pin.path}:${pin.sha256}`))
  ) {
    throw contractError(
      "evidence_artifact_pin_invalid",
      `${relativePath} contains duplicate artifact pins.`
    );
  }
  assertCanonicalEqual(
    proof.safety,
    {
      runtimePosture: "disabled",
      jurisdictionActivation: "inactive",
      productionPromotion: "not_promoted",
      deployment: policy.deployment
    },
    "evidence_safety_invalid",
    `${relativePath} widens runtime, routing, or deployment posture.`
  );
  return {
    proofType,
    path: relativePath,
    sha256: reference.sha256,
    producerContract: policy.producerContract,
    environment: policy.environment,
    repositoryCommit: evidenceCommit,
    artifactPins: artifactPins.sort(comparePathPins)
  };
}

function deriveObservedState(track, evidence) {
  const status = track.status;
  return {
    authorityClearance: status.authorityCleared ? "cleared" : "blocked",
    sourcePinning: status.sourcePinned ? "pinned" : "unpinned",
    implementationProof: status.implementationComplete
      ? "proven"
      : "unproven",
    technicalProof: status.technicalProofPassed ? "passed" : "pending",
    visualProof: status.visualProofPassed ? "passed" : "pending",
    counselAdoption: status.counselAdopted ? "adopted" : "not_adopted",
    packetPersistence: evidence.packetPersistence ? "proven" : "not_proven",
    stagingContract: evidence.stagingContract
      ? "satisfied"
      : "not_satisfied",
    stagingAcceptance: evidence.stagingAcceptance
      ? "accepted"
      : "not_accepted",
    productionPromotion: status[RECORD_PRODUCTION_KEY]
      ? "promoted"
      : "not_promoted"
  };
}

function unmetPrerequisites(operation, observedState) {
  return Object.entries(OPERATION_PREREQUISITES[operation])
    .filter(([field, expected]) => observedState[field] !== expected)
    .map(([field, expected]) => ({
      field,
      expected,
      actual: observedState[field]
    }));
}

function deriveSharedRuntimeRegistration(
  repository,
  track,
  scope,
  components
) {
  const sharedFiles = Object.fromEntries(
    SHARED_RUNTIME_PATHS.map((relativePath) => [
      relativePath,
      {
        path: relativePath,
        sha256: fileSha256(repository.rootDir, relativePath),
        text: fs.readFileSync(
          resolveRepositoryFile(repository.rootDir, relativePath),
          "utf8"
        )
      }
    ])
  );
  const boundSources = scope.boundArtifactHashes
    .filter((pin) => pin.path.endsWith(".ts"))
    .map((pin) => ({
      ...pin,
      text: fs.readFileSync(
        resolveRepositoryFile(repository.rootDir, pin.path),
        "utf8"
      )
    }));
  const missingRegistrations = [];
  const routeSource = boundSources.find(
    (source) =>
      /\/registry-[^/]+\.ts$/u.test(source.path) &&
      source.text.includes(track.trackId)
  );
  const sharedRegistry =
    sharedFiles["src/lib/rcap/packets/registry.ts"].text;
  if (
    !routeSource ||
    !sharedRegistry.includes(
      path.posix.basename(routeSource.path, ".ts")
    )
  ) {
    missingRegistrations.push({
      kind: "track_registry",
      id: track.trackId,
      sourcePath: routeSource?.path ?? null
    });
  }

  for (const component of components.filter((entry) => entry.templateId)) {
    const source = boundSources.find(
      (candidate) =>
        /\/engines\/(?:pleading|guidance)-templates-[^/]+\.ts$/u.test(
          candidate.path
        ) && candidate.text.includes(component.templateId)
    );
    const aggregatorPath =
      component.outputStrategy === "custom_pleading"
        ? "src/lib/rcap/packets/engines/pleading-templates.ts"
        : "src/lib/rcap/packets/engines/process-guidance.ts";
    if (
      !source ||
      !sharedFiles[aggregatorPath].text.includes(
        path.posix.basename(source.path, ".ts")
      )
    ) {
      missingRegistrations.push({
        kind: "template_registry",
        id: component.templateId,
        sourcePath: source?.path ?? null,
        aggregatorPath
      });
    }
  }

  return {
    status:
      missingRegistrations.length === 0 ? "registered" : "not_registered",
    sharedFilePins: SHARED_RUNTIME_PATHS.map((relativePath) => ({
      path: relativePath,
      sha256: sharedFiles[relativePath].sha256
    })),
    missingRegistrations
  };
}

function deriveReleaseBlockerClosure(scope, sharedRuntimeRegistration) {
  const openBlockers = scope.nonCounselReleaseBlockers.filter((detail) => {
    if (
      /per-track promotion\/status application contract is not implemented/iu.test(
        detail
      )
    ) {
      return false;
    }
    if (
      /packet persistence and the staging contract are not implemented/iu.test(
        detail
      ) ||
      /staging and end-to-end acceptance have not passed/iu.test(detail) ||
      /runtime remains disabled and production promotion has not occurred/iu.test(
        detail
      )
    ) {
      return false;
    }
    if (/shared review-time registration follow-up remains open/iu.test(detail)) {
      return sharedRuntimeRegistration.status !== "registered";
    }
    return true;
  });
  return {
    status: openBlockers.length === 0 ? "closed" : "open",
    openBlockers
  };
}

function deriveTypedBlockers(track, state) {
  const blockers = [];
  for (const [field, passed, code, stage] of [
    ["authorityClearance", "cleared", "authority_not_cleared", "authority"],
    ["sourcePinning", "pinned", "source_not_pinned", "source"],
    [
      "implementationProof",
      "proven",
      "implementation_not_proven",
      "implementation"
    ],
    ["technicalProof", "passed", "technical_proof_pending", "technical_review"],
    ["visualProof", "passed", "visual_proof_pending", "visual_review"],
    ["counselAdoption", "adopted", "counsel_adoption_missing", "counsel"],
    [
      "packetPersistence",
      "proven",
      "packet_persistence_missing",
      "persistence"
    ],
    [
      "stagingContract",
      "satisfied",
      "staging_contract_missing",
      "staging_contract"
    ],
    [
      "stagingAcceptance",
      "accepted",
      "staging_acceptance_missing",
      "staging"
    ]
  ]) {
    if (state[field] !== passed) {
      blockers.push({
        code,
        stage,
        disposition: "open",
        detail:
          field === "authorityClearance" && track.status.exactBlocker
            ? track.status.exactBlocker
            : `${field} is ${state[field]}.`
      });
    }
  }
  if (state.productionPromotion !== "promoted") {
    blockers.push({
      code: "production_promotion_missing",
      stage: "production",
      disposition: "open",
      detail: "No exact production-promotion result is recorded."
    });
  }
  if (track.projection.routeIdentity.reliefCharacter === "non_relief") {
    blockers.push({
      code: "non_relief_route",
      stage: "route_classification",
      disposition: "separate_non_relief_delivery_contract_required",
      detail:
        "This normalized track is a supporting, routing, or verification action rather than substantive record-clearing relief."
    });
  }
  if (track.projection.sharedRuntimeRegistration.status !== "registered") {
    blockers.push({
      code: "shared_registration_missing",
      stage: "implementation",
      disposition: "integration_follow_up_required",
      detail:
        track.projection.sharedRuntimeRegistration.missingRegistrations
          .map((entry) => `${entry.kind}:${entry.id}`)
          .join(", ")
    });
  }
  for (const detail of track.projection.releaseBlockerClosure.openBlockers) {
    blockers.push({
      code: "non_counsel_release_blocker_open",
      stage: "release",
      disposition: "renewed_bound_review_required",
      detail
    });
  }
  for (const detail of track.adoption.scope.nonCounselReleaseBlockers) {
    if (/commercial|licen[cs]/iu.test(detail)) {
      blockers.push({
        code: "commercial_license_exclusion",
        stage: "source",
        disposition: "external_permission_required",
        detail
      });
    } else if (/unavailable|absent.*external|exact private/iu.test(detail)) {
      blockers.push({
        code: "external_dependency_unavailable",
        stage: "source",
        disposition: "external_input_required",
        detail
      });
    }
  }
  return uniqueByCanonical(blockers);
}

function buildReceipt(batch, repository, entries) {
  const jurisdictionAggregates = aggregateJurisdictions(repository, entries);
  const routeScopedSelection = entries.map((entry) => ({
    jurisdiction: entry.jurisdiction,
    trackId: entry.trackId,
    trackScopeSha256: entry.trackScopeSha256,
    adoptionRecordSha256: entry.adoptionBinding.recordSha256,
    templateFamilySha256: entry.adoptionBinding.templateFamilySha256,
    legalDesignSpecificationSha256:
      entry.trackProjection.legalDesignSpecification.sha256,
    branchLogicSha256: entry.trackProjection.branchLogic.sha256,
    reviewManifestPins: entry.trackProjection.reviewManifestPins,
    representativePacketPins:
      entry.trackProjection.representativePacketPins
  }));
  return {
    schemaVersion: TRACK_PROMOTION_APPLICATION_SCHEMA,
    batchName: batch.batchName,
    batchSha256: canonicalJsonSha256(batch),
    appliedByRole: batch.appliedByRole,
    appliedOn: batch.appliedOn,
    operation: batch.operation,
    promotionLane: batch.promotionLane,
    targetEnvironment: batch.targetEnvironment,
    applicationStatus: "eligibility_validated_receipt",
    eligibilityOnly: true,
    authorizesPromotion: false,
    exactTrackCount: entries.length,
    selectionMode: "exact_routes_only",
    routeScopedSelection,
    tracks: entries,
    jurisdictionAggregates,
    safety: {
      receiptOnly: true,
      sharedRegistryMutation: false,
      runtimeDisableSwitchChanged: false,
      generationPermissionChanged: false,
      deliveryReadinessChanged: false,
      jurisdictionActivationChanged: false,
      productionActivationChanged: false,
      publicRoutingChanged: false,
      deploymentApplied: false
    }
  };
}

function aggregateJurisdictions(repository, entries) {
  const selectedByJurisdiction = new Map();
  for (const entry of entries) {
    if (!selectedByJurisdiction.has(entry.jurisdiction)) {
      selectedByJurisdiction.set(entry.jurisdiction, []);
    }
    selectedByJurisdiction.get(entry.jurisdiction).push(entry.trackId);
  }
  return [...selectedByJurisdiction.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([jurisdiction, selected]) => {
      const normalized = repository.tracks
        .filter((track) => track.jurisdiction === jurisdiction)
        .map((track) => track.trackId)
        .sort();
      const adopted = [...repository.adoptedByTrack.entries()]
        .filter(([, adoption]) => adoption.scope.jurisdiction === jurisdiction)
        .map(([trackId]) => trackId)
        .sort();
      const selectedTrackIds = [...selected].sort();
      const allJurisdictionTracksSelected =
        canonicalJson(selectedTrackIds) === canonicalJson(normalized);
      return {
        jurisdiction,
        normalizedTrackCount: normalized.length,
        adoptedTrackCount: adopted.length,
        selectedTrackCount: selectedTrackIds.length,
        selectedTrackIds,
        allAdoptedTracksSelected:
          canonicalJson(selectedTrackIds) === canonicalJson(adopted),
        allJurisdictionTracksSelected,
        scope: allJurisdictionTracksSelected
          ? "full_normalized_track_set"
          : "partial_track_subset",
        jurisdictionApprovalInferred: false,
        blanketApproval: false
      };
    });
}

function enrichMissingAdoptionRefusal(error, repository, trackId) {
  if (
    !(error instanceof TrackPromotionContractError) ||
    error.code !== "counsel_adoption_missing" ||
    typeof trackId !== "string"
  ) {
    return error;
  }
  const track = repository.tracksById.get(trackId);
  const rows = repository.blockerRows.filter(
    (row) => row.trackId === trackId
  );
  const commercial = rows.find((row) =>
    /commercial|licen[cs]|copyright/iu.test(
      [
        row.blockerScope,
        row.blockerType,
        row.requiredResolution,
        row.currentRepositoryTreatment
      ].join(" ")
    )
  );
  if (commercial) {
    return contractError(
      "commercial_license_exclusion",
      `${trackId} remains excluded by unresolved commercial-use permission.`,
      {
        blockerScope: commercial.blockerScope,
        blockerType: commercial.blockerType
      }
    );
  }
  if (track?.outputStrategy === "process_guidance") {
    return contractError(
      "guidance_route_not_adopted",
      `${trackId} is a guidance route without an exact adoption.`
    );
  }
  if (!track?.outputStrategy) {
    return contractError(
      "output_strategy_unresolved",
      `${trackId} has no adopted participant-output strategy.`
    );
  }
  return error;
}

export function classifyTrackReliefCharacter(track) {
  const classificationText = [
    ...asArray(track.exclusions),
    ...asArray(track.scopeRestrictions),
    ...asArray(track.guidanceRationales),
    ...asArray(track.legalDesignLimitations).map(
      (entry) => entry?.statement ?? ""
    ),
    ...asArray(track.dispositions)
  ].join(" ");
  return /\bnon[-_ ]relief\b|\bnot relief\b|\bno participant filing exists\b|\bsupporting_action\b|\brouting_node\b|\bcompleted_or_verification\b/iu.test(
    classificationText
  )
    ? "non_relief"
    : "relief";
}

function classifyRoute(track) {
  const reliefCharacter = classifyTrackReliefCharacter(track);
  const delivery =
    track.outputStrategy === "process_guidance"
      ? "guidance"
      : track.outputStrategy === "official_pdf_fill"
        ? "official_form_packet"
        : track.outputStrategy === "custom_pleading"
          ? "custom_pleading_packet"
          : "output_unresolved";
  return `${reliefCharacter}_${delivery}`;
}

function refusedEvaluation(batch, refusals) {
  return {
    eligible: false,
    batchName:
      batch && typeof batch.batchName === "string" ? batch.batchName : null,
    operation:
      batch && typeof batch.operation === "string" ? batch.operation : null,
    exactTrackCount: 0,
    refusals,
    receipt: null
  };
}

function asRefusal(error) {
  if (error instanceof TrackPromotionContractError) {
    return {
      code: error.code,
      message: error.message,
      detail: error.detail
    };
  }
  return {
    code: "unexpected_contract_error",
    message: error instanceof Error ? error.message : String(error),
    detail: {}
  };
}

function normalizeEvidenceReferences(evidence) {
  return Object.fromEntries(
    Object.entries(evidence).map(([field, reference]) => [
      field,
      reference === null
        ? null
        : {
            path: normalizeRepositoryPath(reference.path),
            sha256: reference.sha256
          }
    ])
  );
}

function emptyEvidence() {
  return {
    packetPersistence: null,
    stagingContract: null,
    stagingAcceptance: null
  };
}

function validatePins(entries, context, identityField, options = {}) {
  if (!Array.isArray(entries) || hasDuplicates(entries.map((entry) => entry?.[identityField]))) {
    throw contractError("hash_pin_invalid", `${context} is missing or duplicated.`);
  }
  for (const entry of entries) {
    if (
      !entry ||
      typeof entry[identityField] !== "string" ||
      !SHA256_PATTERN.test(entry.sha256 ?? "") ||
      (options.requiredExtra &&
        typeof entry[options.requiredExtra] !== "string")
    ) {
      throw contractError("hash_pin_invalid", `${context} contains an invalid pin.`);
    }
  }
}

function validateFilePin(rootDir, pin, context) {
  if (
    !pin ||
    typeof pin.path !== "string" ||
    !SHA256_PATTERN.test(pin.sha256 ?? "")
  ) {
    throw contractError("file_pin_invalid", `${context} is invalid.`);
  }
  const relativePath = normalizeRepositoryPath(pin.path);
  if (fileSha256(rootDir, relativePath) !== pin.sha256) {
    throw contractError(
      "bound_artifact_drift",
      `${relativePath} no longer matches its adopted SHA-256.`
    );
  }
}

function assertIntegratedCommit(rootDir, commit) {
  const exists = spawnSync("git", ["cat-file", "-e", `${commit}^{commit}`], {
    cwd: rootDir,
    encoding: "utf8"
  });
  const ancestor = spawnSync(
    "git",
    ["merge-base", "--is-ancestor", commit, "HEAD"],
    { cwd: rootDir, encoding: "utf8" }
  );
  if (exists.status !== 0 || ancestor.status !== 0) {
    throw contractError(
      "implementation_commit_not_integrated",
      `Integrated implementation commit ${commit} is not in HEAD ancestry.`
    );
  }
}

function validateTrackedHeadFile(rootDir, relativePath, bytes, context) {
  const tree = spawnSync(
    "git",
    ["ls-tree", "-z", "HEAD", "--", relativePath],
    {
      cwd: rootDir,
      maxBuffer: 1024 * 1024
    }
  );
  const records =
    tree.status === 0
      ? tree.stdout
          .toString("utf8")
          .split("\0")
          .filter(Boolean)
      : [];
  const match =
    records.length === 1
      ? records[0].match(/^([0-9]{6}) blob ([0-9a-f]{40,64})\t(.+)$/u)
      : null;
  if (
    !match ||
    !["100644", "100755"].includes(match[1]) ||
    match[3] !== relativePath
  ) {
    throw contractError(
      "evidence_not_committed",
      `${context} must be a regular file committed at HEAD.`
    );
  }
  const committed = spawnSync("git", ["cat-file", "blob", match[2]], {
    cwd: rootDir,
    maxBuffer: 32 * 1024 * 1024
  });
  if (
    committed.status !== 0 ||
    !Buffer.isBuffer(committed.stdout) ||
    !Buffer.from(committed.stdout).equals(bytes)
  ) {
    throw contractError(
      "evidence_worktree_drift",
      `${context} differs from its committed HEAD bytes.`
    );
  }
  const commit = spawnSync(
    "git",
    ["log", "-1", "--format=%H", "HEAD", "--", relativePath],
    { cwd: rootDir, encoding: "utf8", maxBuffer: 1024 * 1024 }
  );
  const commitSha = commit.stdout?.trim();
  if (commit.status !== 0 || !COMMIT_PATTERN.test(commitSha ?? "")) {
    throw contractError(
      "evidence_provenance_missing",
      `${context} has no committed provenance.`
    );
  }
  return commitSha;
}

function exactOne(entries, context) {
  if (entries.length !== 1) {
    throw contractError(
      "route_projection_ambiguous",
      `Expected exactly one ${context}, found ${entries.length}.`
    );
  }
  return entries[0];
}

function validateNotes(notes, context) {
  if (
    !Array.isArray(notes) ||
    !notes.every(
      (note) =>
        typeof note === "string" &&
        note.trim().length > 0 &&
        note.length <= 500
    )
  ) {
    throw contractError("notes_invalid", `${context} must be short strings.`);
  }
  return [...notes];
}

function assertNoProtectedInputKeys(value, location = "$") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertNoProtectedInputKeys(entry, `${location}[${index}]`)
    );
    return;
  }
  if (!isPlainObject(value)) return;
  for (const [key, entry] of Object.entries(value)) {
    if (PROTECTED_INPUT_KEYS.includes(key)) {
      throw contractError(
        "unsafe_state_override",
        `Unsafe state override ${location}.${key} is forbidden.`
      );
    }
    assertNoProtectedInputKeys(entry, `${location}.${key}`);
  }
}

function assertExactKeys(value, expected, context) {
  if (!isPlainObject(value)) {
    throw contractError("object_shape_invalid", `${context} must be an object.`);
  }
  const actualKeys = Object.keys(value).sort();
  const expectedKeys = [...expected].sort();
  if (canonicalJson(actualKeys) !== canonicalJson(expectedKeys)) {
    throw contractError(
      "object_shape_invalid",
      `${context} fields do not match the contract.`,
      { expected: expectedKeys, actual: actualKeys }
    );
  }
}

function assertCanonicalEqual(actual, expected, code, message) {
  if (canonicalJson(actual) !== canonicalJson(expected)) {
    throw contractError(code, message, {
      expectedSha256: canonicalJsonSha256(expected),
      actualSha256: canonicalJsonSha256(actual)
    });
  }
}

function serializeCanonical(value, location, ancestors) {
  if (value === null) return "null";
  switch (typeof value) {
    case "string":
      return JSON.stringify(value);
    case "boolean":
      return value ? "true" : "false";
    case "number":
      if (!Number.isFinite(value)) {
        throw nonCanonical(location, "numbers must be finite");
      }
      return Object.is(value, -0) ? "0" : JSON.stringify(value);
    case "undefined":
    case "function":
    case "symbol":
    case "bigint":
      throw nonCanonical(
        location,
        `${typeof value} values cannot be represented in canonical JSON`
      );
    case "object":
      break;
    default:
      throw nonCanonical(location, `unsupported value type ${typeof value}`);
  }

  if (ancestors.has(value)) {
    throw nonCanonical(location, "cyclic values are not hashable");
  }
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) {
        throw nonCanonical(location, "only ordinary arrays are hashable");
      }
      const names = Object.getOwnPropertyNames(value);
      const expectedNames = [
        ...Array.from({ length: value.length }, (_, index) => String(index)),
        "length"
      ];
      if (
        names.length !== expectedNames.length ||
        expectedNames.some((name) => !names.includes(name)) ||
        Object.getOwnPropertySymbols(value).length > 0
      ) {
        throw nonCanonical(
          location,
          "arrays must be dense and may not carry extra properties"
        );
      }
      const entries = [];
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(
          value,
          String(index)
        );
        if (
          !descriptor ||
          !descriptor.enumerable ||
          !Object.hasOwn(descriptor, "value")
        ) {
          throw nonCanonical(
            `${location}[${index}]`,
            "array entries must be enumerable data properties"
          );
        }
        entries.push(
          serializeCanonical(
            descriptor.value,
            `${location}[${index}]`,
            ancestors
          )
        );
      }
      return `[${entries.join(",")}]`;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw nonCanonical(location, "only plain objects are hashable");
    }
    if (Object.getOwnPropertySymbols(value).length > 0) {
      throw nonCanonical(
        location,
        "symbol-keyed properties are not hashable"
      );
    }
    const entries = Object.getOwnPropertyNames(value)
      .sort()
      .map((key) => {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (
          !descriptor ||
          !descriptor.enumerable ||
          !Object.hasOwn(descriptor, "value")
        ) {
          throw nonCanonical(
            `${location}.${key}`,
            "properties must be enumerable data properties"
          );
        }
        return `${JSON.stringify(key)}:${serializeCanonical(
          descriptor.value,
          `${location}[${JSON.stringify(key)}]`,
          ancestors
        )}`;
      });
    return `{${entries.join(",")}}`;
  } finally {
    ancestors.delete(value);
  }
}

function nonCanonical(location, reason) {
  return contractError(
    "non_canonical_value",
    `Cannot hash ${location}: ${reason}.`,
    { path: location, reason }
  );
}

function isPlainObject(value) {
  if (!value || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isCanonicalIsoTimestamp(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)
  ) {
    return false;
  }
  const date = new Date(value);
  return !Number.isNaN(date.valueOf()) && date.toISOString() === value;
}

function hasDuplicates(values) {
  return new Set(values).size !== values.length;
}

function uniqueByCanonical(values) {
  const seen = new Set();
  return values.filter((value) => {
    const key = canonicalJson(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function compareTrackEntries(left, right) {
  return (
    left.jurisdiction.localeCompare(right.jurisdiction) ||
    left.trackId.localeCompare(right.trackId)
  );
}

function comparePinIds(left, right) {
  return String(left.id ?? left.trackId).localeCompare(
    String(right.id ?? right.trackId)
  );
}

function comparePathPins(left, right) {
  return (
    String(left.role ?? "").localeCompare(String(right.role ?? "")) ||
    left.path.localeCompare(right.path)
  );
}

function comparePacketPins(left, right) {
  return (
    left.fixtureId.localeCompare(right.fixtureId) ||
    left.sha256.localeCompare(right.sha256)
  );
}

function normalizeRepositoryPath(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw contractError("path_invalid", "Repository path is required.");
  }
  if (/[\u0000-\u001f\u007f]/u.test(value)) {
    throw contractError(
      "path_invalid",
      "Repository paths may not contain control characters."
    );
  }
  const raw = value.trim().replaceAll("\\", "/").replace(/^\.\/+/u, "");
  if (path.posix.isAbsolute(raw) || /^[A-Za-z]:\//u.test(raw)) {
    throw contractError("path_invalid", `Absolute path is forbidden: ${value}.`);
  }
  const normalized = path.posix.normalize(raw);
  if (
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    throw contractError("path_invalid", `Path escapes the repository: ${value}.`);
  }
  return normalized;
}

function resolveRepositoryFile(rootDir, relativePath) {
  const normalized = normalizeRepositoryPath(relativePath);
  const absolutePath = path.resolve(rootDir, normalized);
  assertInside(rootDir, absolutePath);
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    throw contractError("file_missing", `${normalized} is missing.`);
  }
  const realPath = fs.realpathSync(absolutePath);
  assertInside(rootDir, realPath);
  if (path.resolve(realPath) !== path.resolve(absolutePath)) {
    throw contractError(
      "path_alias_forbidden",
      `${normalized} may not resolve through a symbolic-link alias.`
    );
  }
  return realPath;
}

function resolveRepositoryDirectory(rootDir, relativePath) {
  const normalized = normalizeRepositoryPath(relativePath);
  const absolutePath = path.resolve(rootDir, normalized);
  assertInside(rootDir, absolutePath);
  if (
    !fs.existsSync(absolutePath) ||
    !fs.lstatSync(absolutePath).isDirectory() ||
    fs.lstatSync(absolutePath).isSymbolicLink()
  ) {
    throw contractError(
      "directory_missing",
      `${normalized} must be a real repository directory.`
    );
  }
  const realPath = fs.realpathSync(absolutePath);
  assertInside(rootDir, realPath);
  if (path.resolve(realPath) !== path.resolve(absolutePath)) {
    throw contractError(
      "path_alias_forbidden",
      `${normalized} may not resolve through a symbolic-link alias.`
    );
  }
  return realPath;
}

function assertInside(rootDir, candidate) {
  const relative = path.relative(path.resolve(rootDir), path.resolve(candidate));
  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw contractError(
      "path_escape",
      `${candidate} resolves outside the repository.`
    );
  }
}

function readJson(rootDir, relativePath) {
  const absolutePath = resolveRepositoryFile(rootDir, relativePath);
  try {
    return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch (error) {
    throw contractError(
      "json_invalid",
      `${relativePath} is invalid JSON: ${error.message}`
    );
  }
}

function fileSha256(rootDir, relativePath) {
  return sha256(fs.readFileSync(resolveRepositoryFile(rootDir, relativePath)));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function contractError(code, message, detail = {}) {
  return new TrackPromotionContractError(code, message, detail);
}

function parseArgs(argv) {
  const options = { dryRun: false, apply: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--file") options.file = argv[++index];
    else if (arg === "--out") options.out = argv[++index];
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--apply") options.apply = true;
    else throw contractError("argument_invalid", `Unsupported argument: ${arg}.`);
  }
  if (!options.file) {
    throw contractError("argument_invalid", "Missing --file.");
  }
  if (options.dryRun === options.apply) {
    throw contractError(
      "argument_invalid",
      "Specify exactly one of --dry-run or --apply."
    );
  }
  if (options.apply && !options.out) {
    throw contractError("argument_invalid", "--apply requires --out.");
  }
  if (options.dryRun && options.out) {
    throw contractError("argument_invalid", "--dry-run cannot use --out.");
  }
  return options;
}

function readBatchFile(rootDir, file) {
  const relativePath = normalizeRepositoryPath(file);
  const absolutePath = resolveRepositoryFile(rootDir, relativePath);
  const bytes = fs.readFileSync(absolutePath);
  let batch;
  try {
    batch = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw contractError(
      "batch_json_invalid",
      `${relativePath} is invalid JSON: ${error.message}`
    );
  }
  return {
    relativePath,
    absolutePath,
    bytes,
    sha256: sha256(bytes),
    batch
  };
}

function resolveOutputPath(rootDir, value) {
  const relativePath = normalizeRepositoryPath(value);
  if (
    !relativePath.startsWith("tmp/rcap-track-promotion/") &&
    !relativePath.startsWith("docs/rcap-promotion/track-applications/")
  ) {
    throw contractError(
      "output_path_invalid",
      "--out must be below tmp/rcap-track-promotion/ or docs/rcap-promotion/track-applications/."
    );
  }
  if (!relativePath.endsWith(".json")) {
    throw contractError("output_path_invalid", "--out must name a JSON file.");
  }
  const absolutePath = path.resolve(rootDir, relativePath);
  assertInside(rootDir, absolutePath);
  validateOutputAncestry(rootDir, path.dirname(absolutePath), {
    allowMissing: true
  });
  return { relativePath, absolutePath };
}

function validateOutputAncestry(
  rootDir,
  parentPath,
  { allowMissing = false } = {}
) {
  const root = path.resolve(rootDir);
  const parent = path.resolve(parentPath);
  assertInside(root, parent);
  const relative = path.relative(root, parent);
  let current = root;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    if (!fs.existsSync(current)) {
      if (allowMissing) return;
      throw contractError(
        "output_path_invalid",
        `Output parent ${path.relative(root, current)} is missing.`
      );
    }
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw contractError(
        "output_path_invalid",
        `Output parent ${path.relative(root, current)} must be a real directory.`
      );
    }
  }
}

function prepareOutputParent(rootDir, outputPath) {
  const root = path.resolve(rootDir);
  const parent = path.dirname(path.resolve(outputPath));
  assertInside(root, parent);
  const relative = path.relative(root, parent);
  let current = root;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    if (!fs.existsSync(current)) {
      try {
        fs.mkdirSync(current, { mode: 0o700 });
      } catch (error) {
        throw contractError(
          "output_path_invalid",
          `Could not create output directory ${path.relative(root, current)}: ${error.message}`
        );
      }
    }
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw contractError(
        "output_path_invalid",
        `Output parent ${path.relative(root, current)} must be a real directory.`
      );
    }
  }
  validateOutputAncestry(root, parent);
  const realParent = fs.realpathSync(parent);
  if (path.resolve(realParent) !== parent) {
    throw contractError(
      "output_path_invalid",
      "--out may not resolve through a symbolic-link alias."
    );
  }
}

function writeReceiptAtomically(outputPath, receipt) {
  const serialized = `${JSON.stringify(receipt, null, 2)}\n`;
  if (fs.existsSync(outputPath)) {
    if (fs.lstatSync(outputPath).isSymbolicLink()) {
      throw contractError(
        "output_path_invalid",
        "Existing output may not be a symbolic link."
      );
    }
    if (
      fs.statSync(outputPath).isFile() &&
      fs.readFileSync(outputPath, "utf8") === serialized
    ) {
      return { idempotent: true, bytes: Buffer.byteLength(serialized) };
    }
    throw contractError(
      "output_exists_with_different_content",
      "Existing output differs; refusing to overwrite it."
    );
  }
  const temporaryPath = `${outputPath}.tmp-${process.pid}-${crypto.randomUUID()}`;
  fs.writeFileSync(temporaryPath, serialized, { flag: "wx", mode: 0o600 });
  try {
    fs.linkSync(temporaryPath, outputPath);
  } finally {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
  }
  return { idempotent: false, bytes: Buffer.byteLength(serialized) };
}

function runCli() {
  const rootDir = DEFAULT_ROOT;
  try {
    const args = parseArgs(process.argv.slice(2));
    const firstRead = readBatchFile(rootDir, args.file);
    const firstEvaluation = evaluateTrackPromotionBatch(firstRead.batch, {
      rootDir
    });
    if (!firstEvaluation.eligible) {
      process.stdout.write(`${JSON.stringify(firstEvaluation, null, 2)}\n`);
      process.exitCode = 1;
      return;
    }
    if (args.dryRun) {
      process.stdout.write(
        `${JSON.stringify(
          {
            mode: "dry_run",
            inputPath: firstRead.relativePath,
            inputSha256: firstRead.sha256,
            ...firstEvaluation
          },
          null,
          2
        )}\n`
      );
      return;
    }

    const output = resolveOutputPath(rootDir, args.out);
    if (path.resolve(firstRead.absolutePath) === path.resolve(output.absolutePath)) {
      throw contractError(
        "output_path_invalid",
        "Input and output paths must differ."
      );
    }

    const secondRead = readBatchFile(rootDir, args.file);
    const secondEvaluation = evaluateTrackPromotionBatch(secondRead.batch, {
      rootDir
    });
    if (
      firstRead.sha256 !== secondRead.sha256 ||
      !secondEvaluation.eligible ||
      canonicalJson(firstEvaluation.receipt) !==
        canonicalJson(secondEvaluation.receipt)
    ) {
      throw contractError(
        "application_input_drift",
        "Batch or repository proof changed during validation; nothing was written."
      );
    }

    prepareOutputParent(rootDir, output.absolutePath);
    const finalRead = readBatchFile(rootDir, args.file);
    const finalEvaluation = evaluateTrackPromotionBatch(finalRead.batch, {
      rootDir
    });
    if (
      secondRead.sha256 !== finalRead.sha256 ||
      !finalEvaluation.eligible ||
      canonicalJson(secondEvaluation.receipt) !==
        canonicalJson(finalEvaluation.receipt)
    ) {
      throw contractError(
        "application_state_drift",
        "Batch or repository proof changed immediately before receipt creation; no receipt was written."
      );
    }
    const writeResult = writeReceiptAtomically(
      output.absolutePath,
      finalEvaluation.receipt
    );
    process.stdout.write(
      `${JSON.stringify(
        {
          mode: "apply_receipt",
          inputPath: finalRead.relativePath,
          inputSha256: finalRead.sha256,
          outputPath: output.relativePath,
          idempotent: writeResult.idempotent,
          outputBytes: writeResult.bytes,
          ...finalEvaluation
        },
        null,
        2
      )}\n`
    );
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({ error: asRefusal(error) }, null, 2)}\n`
    );
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  runCli();
}
