#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  OFFICIAL_PDF_SOURCE_PROJECTION_PATH,
  validateOfficialPdfSourceProjection
} from "./lib/rcap-factory/materialization-planning.mjs";
import {
  canonicalSha256,
  canonicalStringify
} from "./lib/rcap-factory/canonical-json.mjs";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPOSITORY_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");
const DEFAULT_ASSIGNMENT_MANIFEST = "tmp/rcap-factory/job.json";
const RESULT_SCHEMA = "rcap-source-materialization-result/v1";
const REQUIREMENT_SCHEMA = "rcap-source-materialization-requirement/v1";
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const DOCUMENT_ID_PATTERN = /^(?!-)[^\u0000-\u001f\u007f]{1,200}$/u;
const SOURCE_IDENTITY_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const JURISDICTION_PATTERN = /^(?:[A-Z]{2}|NATIONWIDE)$/u;
const PORTABLE_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*$/u;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;
const ENCODED_TRAVERSAL_PATTERN =
  /%(?:2e|2f|5c)|%25(?:2e|2f|5c)/iu;
const SAFE_FILE_MODE = 0o444;
const COPY_BUFFER_BYTES = 64 * 1024;

export const SOURCE_MATERIALIZATION_STATES = Object.freeze({
  AUTHORITY_ASSET_KNOWN: "authority_asset_known",
  REGISTRY_METADATA_PRESENT: "registry_metadata_present",
  BINARY_MATERIALIZATION_REQUIRED: "binary_materialization_required",
  BINARY_MATERIALIZED: "binary_materialized",
  BINARY_HASH_VERIFIED: "binary_hash_verified",
  BINARY_HASH_MISMATCH: "binary_hash_mismatch",
  BINARY_SIZE_MISMATCH: "binary_size_mismatch",
  BINARY_MEDIA_TYPE_MISMATCH: "binary_media_type_mismatch",
  BINARY_UNAVAILABLE: "binary_unavailable",
  WORKER_READ_AUTHORIZED: "worker_read_authorized",
  WORKER_READY: "worker_ready"
});

export const SOURCE_MATERIALIZATION_REQUIREMENT_SCHEMA = REQUIREMENT_SCHEMA;
export const SOURCE_MATERIALIZATION_RESULT_SCHEMA = RESULT_SCHEMA;

export class SourceMaterializationError extends Error {
  constructor(code, message, result = null) {
    super(message);
    this.name = "SourceMaterializationError";
    this.code = code;
    this.state = result?.state ?? code;
    this.result = result;
  }
}

/**
 * Validate the complete, hash-bound descriptor consumed by an approved
 * materialization adapter. This descriptor is intentionally more complete
 * than registry metadata or a caller-provided path.
 */
export function validateMaterializationRequirement(requirement) {
  if (!isPlainObject(requirement)) {
    throw contractError(
      "invalid_materialization_requirement",
      "The source requirement must be an object."
    );
  }
  if (requirement.schemaVersion !== REQUIREMENT_SCHEMA) {
    throw contractError(
      "invalid_materialization_requirement",
      `schemaVersion must be ${REQUIREMENT_SCHEMA}.`
    );
  }
  for (const field of [
    "authorityEdition",
    "authorityArchiveSha256",
    "jurisdiction",
    "documentId",
    "documentRole",
    "canonicalAuthorityPath",
    "repositorySourcePath",
    "portableLocator",
    "materializationDestination",
    "expectedSha256",
    "expectedMediaType",
    "readOnlyTreatment",
    "verificationCommand",
    "retentionPolicy",
    "expectedMeasurementBasis",
    "identityBindingStatus",
    "assignmentJobId",
    "assignmentBaseCommit",
    "assignmentManifestSha256"
  ]) {
    assertNonemptyString(requirement[field], field);
  }
  if (!SHA256_PATTERN.test(requirement.authorityArchiveSha256)) {
    throw contractError(
      "invalid_materialization_requirement",
      "authorityArchiveSha256 must be a lowercase SHA-256."
    );
  }
  if (!JURISDICTION_PATTERN.test(requirement.jurisdiction)) {
    throw contractError(
      "invalid_materialization_requirement",
      "jurisdiction must be a two-letter code or NATIONWIDE."
    );
  }
  if (!DOCUMENT_ID_PATTERN.test(requirement.documentId)) {
    throw contractError(
      "invalid_materialization_requirement",
      "documentId contains unsupported characters."
    );
  }
  if (!DOCUMENT_ID_PATTERN.test(requirement.assignmentJobId)) {
    throw contractError(
      "invalid_materialization_requirement",
      "assignmentJobId contains unsupported characters."
    );
  }
  if (!/^[0-9a-f]{40}$/u.test(requirement.assignmentBaseCommit)) {
    throw contractError(
      "invalid_materialization_requirement",
      "assignmentBaseCommit must be a full lowercase Git commit."
    );
  }
  if (!SHA256_PATTERN.test(requirement.assignmentManifestSha256)) {
    throw contractError(
      "invalid_materialization_requirement",
      "assignmentManifestSha256 must be a lowercase SHA-256."
    );
  }
  if (
    !Number.isSafeInteger(requirement.expectedBytes) ||
    requirement.expectedBytes <= 0
  ) {
    throw contractError(
      "invalid_materialization_requirement",
      "expectedBytes must be a positive safe integer."
    );
  }
  if (!SHA256_PATTERN.test(requirement.expectedSha256)) {
    throw contractError(
      "invalid_materialization_requirement",
      "expectedSha256 must be a lowercase SHA-256."
    );
  }
  if (!supportedMediaType(requirement.expectedMediaType)) {
    throw contractError(
      "invalid_materialization_requirement",
      `Unsupported expectedMediaType: ${requirement.expectedMediaType}.`
    );
  }
  for (const [field, value] of [
    ["canonicalAuthorityPath", requirement.canonicalAuthorityPath],
    ["repositorySourcePath", requirement.repositorySourcePath],
    ["materializationDestination", requirement.materializationDestination]
  ]) {
    assertPortableRelativePath(value, field);
  }
  if (
    requirement.canonicalAuthorityPath.startsWith("private/") ||
    requirement.materializationDestination.startsWith("private/")
  ) {
    throw contractError(
      "factory_contract_incomplete",
      "Canonical authority and materialization paths may not use private/ as the portable interface."
    );
  }
  parsePortableLocator(requirement.portableLocator);
  if (requirement.readOnlyTreatment !== "worker_read_only_no_modify") {
    throw contractError(
      "invalid_materialization_requirement",
      "readOnlyTreatment must be worker_read_only_no_modify."
    );
  }
  if (
    requirement.retentionPolicy !==
    "retain_until_worker_integration_then_captain_managed_cleanup"
  ) {
    throw contractError(
      "invalid_materialization_requirement",
      "retentionPolicy must retain verified bytes through worker integration."
    );
  }
  if (requirement.identityBindingStatus !== "exact_pinned_identity") {
    throw contractError(
      "unknown_source_identity",
      "Only an exact pinned source identity may be materialized."
    );
  }
  if (requirement.authorityAssetState !== "authority_asset_known") {
    throw contractError(
      "unknown_source_identity",
      "authorityAssetState must be authority_asset_known."
    );
  }
  if (requirement.registryState !== "registry_metadata_present") {
    throw contractError(
      "unknown_source_identity",
      "registryState must be registry_metadata_present."
    );
  }
  if (
    requirement.expectedMeasurementBasis !==
    "carried_forward_registry_measurement"
  ) {
    throw contractError(
      "invalid_materialization_requirement",
      "expectedMeasurementBasis must preserve the carried-forward registry measurement."
    );
  }
  if (
    !Array.isArray(requirement.usageBindings) ||
    requirement.usageBindings.length === 0
  ) {
    throw contractError(
      "invalid_materialization_requirement",
      "usageBindings must identify at least one exact track/component use."
    );
  }
  for (const binding of requirement.usageBindings) {
    if (!isPlainObject(binding)) {
      throw contractError(
        "invalid_materialization_requirement",
        "Every usage binding must be an object."
      );
    }
    assertNonemptyString(binding.trackId, "usageBindings[].trackId");
    if (
      binding.componentId !== null &&
      binding.componentId !== undefined &&
      (typeof binding.componentId !== "string" ||
        binding.componentId.trim().length === 0)
    ) {
      throw contractError(
        "invalid_materialization_requirement",
        "usageBindings[].componentId must be null or a non-empty string."
      );
    }
  }
  if (!isPlainObject(requirement.provenance)) {
    throw contractError(
      "invalid_materialization_requirement",
      "provenance must be an object."
    );
  }
  assertNonemptyString(
    requirement.provenance.registryPath,
    "provenance.registryPath"
  );
  assertPortableRelativePath(
    requirement.provenance.registryPath,
    "provenance.registryPath"
  );
  if (
    requirement.provenance.freshLocalVerification !== false ||
    requirement.provenance.registryPresenceConfersReadiness !== false
  ) {
    throw contractError(
      "invalid_materialization_requirement",
      "Expectation provenance must not claim local verification or readiness."
    );
  }
  if (
    requirement.verificationCommand !==
    expectedVerificationCommand(requirement)
  ) {
    throw contractError(
      "invalid_materialization_requirement",
      "verificationCommand must exactly bind the document ID, SHA-256, and byte count."
    );
  }
  return requirement;
}

/**
 * Resolve a portable path without permitting absolute paths, traversal,
 * backslash aliases, encoded traversal, or control characters.
 */
export function assertPortableRelativePath(value, label = "path") {
  assertNonemptyString(value, label);
  if (
    CONTROL_CHARACTER_PATTERN.test(value) ||
    value.includes("\\") ||
    ENCODED_TRAVERSAL_PATTERN.test(value) ||
    path.posix.isAbsolute(value) ||
    path.win32.isAbsolute(value) ||
    /^[A-Za-z]:/u.test(value)
  ) {
    throw contractError(
      "path_boundary_violation",
      `${label} must be a portable relative path.`
    );
  }
  const segments = value.split("/");
  if (
    segments.some(
      (segment) =>
        segment.length === 0 ||
        segment === "." ||
        segment === ".."
    )
  ) {
    throw contractError(
      "path_boundary_violation",
      `${label} contains an empty or traversal segment.`
    );
  }
  const normalized = path.posix.normalize(value);
  if (normalized !== value) {
    throw contractError(
      "path_boundary_violation",
      `${label} is not canonically normalized.`
    );
  }
  return normalized;
}

export function parsePortableLocator(locator) {
  assertNonemptyString(locator, "portableLocator");
  if (
    CONTROL_CHARACTER_PATTERN.test(locator) ||
    locator.includes("?") ||
    locator.includes("#") ||
    locator.includes("@")
  ) {
    throw contractError(
      "unsafe_portable_locator",
      "portableLocator may not contain credentials, query data, or fragments."
    );
  }
  const separator = locator.indexOf("://");
  if (separator <= 0) {
    throw contractError(
      "unsafe_portable_locator",
      "portableLocator must use an approved logical scheme."
    );
  }
  const scheme = locator.slice(0, separator);
  const entryPath = locator.slice(separator + 3);
  if (!PORTABLE_SCHEME_PATTERN.test(scheme)) {
    throw contractError(
      "unsafe_portable_locator",
      "portableLocator has an invalid scheme."
    );
  }
  assertPortableRelativePath(entryPath, "portableLocator entry");
  if (
    entryPath === "private" ||
    entryPath.startsWith("private/") ||
    entryPath.startsWith("workspaces/") ||
    entryPath.includes("/workspaces/")
  ) {
    throw contractError(
      "unsafe_portable_locator",
      "portableLocator may not encode private/ or a Codespace path."
    );
  }
  return Object.freeze({ scheme, entryPath });
}

/**
 * Return the fail-closed planning state before any local byte observation.
 */
export function initialMaterializationState(requirement) {
  validateMaterializationRequirement(requirement);
  return finalizeResult(requirement, {
    state: SOURCE_MATERIALIZATION_STATES.BINARY_MATERIALIZATION_REQUIRED,
    states: [
      SOURCE_MATERIALIZATION_STATES.AUTHORITY_ASSET_KNOWN,
      SOURCE_MATERIALIZATION_STATES.REGISTRY_METADATA_PRESENT,
      SOURCE_MATERIALIZATION_STATES.BINARY_MATERIALIZATION_REQUIRED
    ],
    ready: false,
    materializationAction: "none",
    localVerificationBasis: "not_locally_verified"
  });
}

/**
 * Inspect one already-materialized worker input. This function never writes,
 * changes permissions, downloads, or follows a symbolic link.
 */
export async function inspectMaterializedSource(
  requirement,
  { materializationRoot }
) {
  validateMaterializationRequirement(requirement);
  const resolved = resolveConfinedPath({
    root: materializationRoot,
    relativePath: requirement.materializationDestination,
    createParents: false,
    allowMissingLeaf: true,
    label: "materialization destination"
  });
  if (!resolved.exists) {
    return finalizeResult(requirement, {
      state: SOURCE_MATERIALIZATION_STATES.BINARY_UNAVAILABLE,
      states: [
        SOURCE_MATERIALIZATION_STATES.AUTHORITY_ASSET_KNOWN,
        SOURCE_MATERIALIZATION_STATES.REGISTRY_METADATA_PRESENT,
        SOURCE_MATERIALIZATION_STATES.BINARY_MATERIALIZATION_REQUIRED,
        SOURCE_MATERIALIZATION_STATES.BINARY_UNAVAILABLE
      ],
      ready: false,
      materializationAction: "none",
      localVerificationBasis: "not_locally_verified"
    });
  }
  return inspectExactFile(requirement, resolved.absolutePath, {
    materializationAction: "verified_existing_binary",
    requireReadOnly: true,
    workerBoundaryAuthorized: readOnlyBoundaryIsSealed({
      materializationRoot,
      destination: requirement.materializationDestination
    })
  });
}

/**
 * Fail unless an existing worker input is exact, locally verified, regular,
 * non-linked, and read-only.
 */
export async function assertMaterializedSource(requirement, options) {
  const result = await inspectMaterializedSource(requirement, options);
  if (!result.ready) {
    throw new SourceMaterializationError(
      result.state,
      `Source ${requirement.documentId} is not worker-ready: ${result.state}.`,
      result
    );
  }
  return result;
}

/**
 * Install one source from an already-resolved, approved portable locator.
 *
 * This is an integration/source-adapter primitive, not packet-worker
 * acquisition. The authorized catalog is mandatory and is expected to come
 * from an immutable scaffold assignment or another integration-owned trust
 * anchor.
 */
export async function materializeVerifiedSource(
  requirement,
  {
    materializationRoot,
    locatorRoots,
    authorizedRequirements
  }
) {
  validateMaterializationRequirement(requirement);
  assertRequirementAuthorized(requirement, authorizedRequirements);
  assertTrustedAdapterRoot(materializationRoot, [requirement]);

  const destination = resolveConfinedPath({
    root: materializationRoot,
    relativePath: requirement.materializationDestination,
    createParents: true,
    allowMissingLeaf: true,
    label: "materialization destination"
  });
  if (destination.exists) {
    const existing = await inspectExactFile(
      requirement,
      destination.absolutePath,
      {
        materializationAction: "reused_verified_binary",
        requireReadOnly: true
      }
    );
    if (
      existing.hashAndMediaVerified &&
      existing.actualMode === SAFE_FILE_MODE
    ) {
      return existing;
    }
    throw new SourceMaterializationError(
      "existing_destination_rejected",
      `Existing source ${requirement.documentId} was preserved and rejected.`,
      existing
    );
  }

  const locator = parsePortableLocator(requirement.portableLocator);
  const locatorRoot = locatorRootFor(
    locatorRoots,
    locator.scheme,
    requirement
  );
  const source = resolveConfinedPath({
    root: locatorRoot,
    relativePath: locator.entryPath,
    createParents: false,
    allowMissingLeaf: true,
    label: "portable locator entry"
  });
  if (!source.exists) {
    const unavailable = finalizeResult(requirement, {
      state: SOURCE_MATERIALIZATION_STATES.BINARY_UNAVAILABLE,
      states: [
        SOURCE_MATERIALIZATION_STATES.AUTHORITY_ASSET_KNOWN,
        SOURCE_MATERIALIZATION_STATES.REGISTRY_METADATA_PRESENT,
        SOURCE_MATERIALIZATION_STATES.BINARY_MATERIALIZATION_REQUIRED,
        SOURCE_MATERIALIZATION_STATES.BINARY_UNAVAILABLE
      ],
      ready: false,
      materializationAction: "none",
      localVerificationBasis: "not_locally_verified"
    });
    throw new SourceMaterializationError(
      SOURCE_MATERIALIZATION_STATES.BINARY_UNAVAILABLE,
      `Approved bytes are unavailable for ${requirement.documentId}.`,
      unavailable
    );
  }

  const destinationDirectory = path.dirname(destination.absolutePath);
  const temporaryName =
    `.rcap-materialize-${process.pid}-${crypto.randomBytes(12).toString("hex")}`;
  const temporaryPath = path.join(destinationDirectory, temporaryName);
  let temporaryCreated = false;
  try {
    stagePortableSource({
      requirement,
      sourcePath: source.absolutePath,
      sourceRoot: locatorRoot,
      temporaryPath,
      materializationRoot
    });
    temporaryCreated = true;
    const staged = await inspectExactFile(requirement, temporaryPath, {
      materializationAction: "verified_staged_binary",
      requireReadOnly: true
    });
    if (
      !staged.hashAndMediaVerified ||
      staged.actualMode !== SAFE_FILE_MODE
    ) {
      throw new SourceMaterializationError(
        staged.state,
        `Staged source bytes failed verification for ${requirement.documentId}.`,
        staged
      );
    }

    try {
      fs.linkSync(temporaryPath, destination.absolutePath);
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      const concurrent = await inspectExactFile(
        requirement,
        destination.absolutePath,
        {
          materializationAction: "reused_concurrently_materialized_binary",
          requireReadOnly: true
        }
      );
      if (
        !concurrent.hashAndMediaVerified ||
        concurrent.actualMode !== SAFE_FILE_MODE
      ) {
        throw new SourceMaterializationError(
          "existing_destination_rejected",
          `Concurrent destination for ${requirement.documentId} was preserved and rejected.`,
          concurrent
        );
      }
      return concurrent;
    }
  } finally {
    if (temporaryCreated) {
      try {
        fs.unlinkSync(temporaryPath);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    }
  }
  const installed = await inspectExactFile(
    requirement,
    destination.absolutePath,
    {
      materializationAction: "materialized_verified_binary",
      requireReadOnly: true
    }
  );
  if (
    !installed.hashAndMediaVerified ||
    installed.actualMode !== SAFE_FILE_MODE
  ) {
    throw new SourceMaterializationError(
      installed.state,
      `Installed source failed final verification for ${requirement.documentId}.`,
      installed
    );
  }
  return installed;
}

/**
 * Materialize a set with all-of readiness and deterministic deduplication.
 */
export async function materializeVerifiedSourceSet(
  requirements,
  options
) {
  const normalized = deduplicateRequirements(requirements);
  assertTrustedAdapterRoot(
    options.materializationRoot,
    normalized.requirements
  );
  for (const requirement of normalized.requirements) {
    await materializeVerifiedSource(requirement, {
      ...options,
      authorizedRequirements: options.authorizedRequirements
    });
  }
  sealMaterializationBoundary(
    normalized.requirements,
    options.materializationRoot
  );
  return inspectMaterializedSourceSet(requirements, {
    materializationRoot: options.materializationRoot
  });
}

export async function inspectMaterializedSourceSet(
  requirements,
  options
) {
  const normalized = deduplicateRequirements(requirements);
  const results = [];
  for (const requirement of normalized.requirements) {
    results.push(await inspectMaterializedSource(requirement, options));
  }
  return aggregateReadiness({
    requiredSourceCount: requirements.length,
    uniqueSourceCount: normalized.requirements.length,
    duplicateBindingCount: normalized.duplicateBindingCount,
    results
  });
}

/**
 * Resolve a packet worker's exact requirement from its scaffold marker.
 * Caller-provided CLI fields are assertions, never identity authority.
 */
export async function loadAssignedMaterializationRequirement({
  rootDir = REPOSITORY_ROOT,
  manifestPath = DEFAULT_ASSIGNMENT_MANIFEST,
  sourceIdentityKey,
  documentId,
  expectedSha256,
  expectedBytes
}) {
  assertPortableRelativePath(manifestPath, "assignment manifest");
  const { marker, assignedJob } = loadAnchoredAssignment({
    rootDir,
    manifestPath
  });
  const claims = (assignedJob.sourceMaterializationInputs ?? []).filter(
    (claim) =>
      (sourceIdentityKey
        ? claim.sourceIdentityKey === sourceIdentityKey
        : claim.documentId === documentId) &&
      claim.expectedSha256 === expectedSha256 &&
      claim.expectedBytes === expectedBytes
  );
  const distinctClaims = uniqueCanonicalObjects(claims);
  if (distinctClaims.length !== 1) {
    throw contractError(
      "unknown_source_identity",
      "CLI assertions do not select exactly one assigned source identity."
    );
  }
  const claim = distinctClaims[0];
  if (
    !assignedJob.requiredInputs?.includes(claim.materializationDestination) ||
    !assignedJob.focusedValidation?.includes(claim.verificationCommand)
  ) {
    throw contractError(
      "unknown_source_identity",
      "The assigned source is not bound as a read-only input and focused check."
    );
  }
  const completeClaimFields = [
    "authorityEdition",
    "authorityArchiveSha256",
    "jurisdiction",
    "documentRole",
    "expectedMediaType",
    "readOnlyTreatment",
    "retentionPolicy",
    "expectedMeasurementBasis",
    "identityBindingStatus"
  ];
  if (
    completeClaimFields.some(
      (field) =>
        typeof claim[field] !== "string" || claim[field].trim().length === 0
    ) ||
    !Array.isArray(claim.usageBindings) ||
    claim.usageBindings.length === 0 ||
    !isPlainObject(claim.provenance) ||
    claim.authorityAssetState !== "authority_asset_known" ||
    claim.registryState !== "registry_metadata_present" ||
    claim.workerMayRead !== true ||
    claim.workerMayModify !== false
  ) {
    throw contractError(
      "factory_contract_incomplete",
      "The immutable assignment has not materialized the complete portable source descriptor."
    );
  }
  const projectionBound =
    typeof claim.sourceIdentityKey === "string" ||
    assignedJob.officialPdfAssignment !== undefined;
  if (
    projectionBound &&
    !SOURCE_IDENTITY_KEY_PATTERN.test(claim.sourceIdentityKey ?? "")
  ) {
    throw contractError(
      "factory_contract_incomplete",
      "The immutable assignment has no safe source identity key."
    );
  }
  if (
    claim.jurisdiction !== assignedJob.jurisdiction
  ) {
    throw contractError(
      "assignment_manifest_mismatch",
      "The source descriptor is not bound to this immutable scaffold assignment."
    );
  }

  const authorityPath =
    "data/record-clearing/master-library/authority.json";
  const registryPath =
    "data/record-clearing/source-artifact-registry.json";
  const authority = readJson(
    path.join(rootDir, authorityPath),
    "Master Library authority"
  );
  const registry = readJson(
    path.join(rootDir, registryPath),
    "source artifact registry"
  );
  let projectedIdentity = null;
  if (projectionBound) {
    const projectionPath =
      claim.provenance?.projectionPath ??
      assignedJob.officialPdfAssignment?.projectionPath;
    if (projectionPath !== OFFICIAL_PDF_SOURCE_PROJECTION_PATH) {
      throw contractError(
        "unknown_source_identity",
        "The immutable assignment does not name the canonical portable projection."
      );
    }
    const projection = readJson(
      path.join(rootDir, projectionPath),
      "official-PDF source assignment projection"
    );
    const projectionIssues = validateOfficialPdfSourceProjection(projection);
    if (projectionIssues.length > 0) {
      throw contractError(
        "unknown_source_identity",
        "The portable official-PDF projection is invalid."
      );
    }
    const projected = projection.identities.filter(
      (identity) =>
        identity.identityKey === claim.sourceIdentityKey &&
        identity.assignmentEligible === true &&
        identity.disposition === "exact_worker_assignable"
    );
    if (projected.length !== 1) {
      throw contractError(
        "unknown_source_identity",
        "The source identity is absent, unresolved, or terminally dispositioned."
      );
    }
    projectedIdentity = projected[0];
    const projectedSource = projectedIdentity.exactSourceContract;
    if (
      projectedIdentity.officialDocument.documentId !== claim.documentId ||
      projectedSource.expectedSha256 !== claim.expectedSha256 ||
      projectedSource.expectedBytes !== claim.expectedBytes ||
      projectedSource.expectedMime !== claim.expectedMediaType ||
      projectedSource.archiveRelativePath !== claim.canonicalAuthorityPath ||
      projectedSource.archiveRelativePath !== claim.repositorySourcePath ||
      projectedSource.portableSourceLocator !== claim.portableLocator ||
      projectedSource.materializationDestination !==
        claim.materializationDestination
    ) {
      throw contractError(
        "assignment_manifest_mismatch",
        "The immutable source descriptor does not match the portable projection."
      );
    }
  }
  const authorityEdition = claim.authorityEdition;
  if (
    authorityEdition !== marker.authorityVersion ||
    authorityEdition !== `master-library/${authority.edition}` ||
    authority.adoptionStatus !== "adopted" ||
    claim.authorityArchiveSha256 !== authority.retention?.archiveSha256 ||
    !SHA256_PATTERN.test(authority.retention?.archiveSha256 ?? "")
  ) {
    throw contractError(
      "unknown_source_identity",
      "The scaffold authority edition is not the adopted, hash-pinned edition."
    );
  }

  const artifactCandidates = (registry.artifacts ?? []).filter(
    (artifact) =>
      (!projectionBound
        ? artifact.artifactId === claim.documentId &&
          artifact.sourcePath === claim.repositorySourcePath
        // A projected claim deliberately uses its canonical archive path as
        // the portable source identity. The registry retains the separate
        // repository evidence path, so bind that evidence by the already
        // projection-pinned jurisdiction, hash, and byte count instead.
        : true) &&
      artifact.jurisdiction === assignedJob.jurisdiction &&
      artifact.sizeBytes === claim.expectedBytes &&
      (artifact.measuredSha256 ?? artifact.inventorySha256) ===
        claim.expectedSha256
  );
  let artifacts = uniqueCanonicalObjects(artifactCandidates);
  if (projectionBound && artifacts.length !== 1) {
    const freshlyMeasured = artifacts.filter(
      (artifact) =>
        artifact.presence === "present" &&
        artifact.hashState === "match" &&
        artifact.measuredSha256 === claim.expectedSha256
    );
    if (freshlyMeasured.length === 1) {
      artifacts = freshlyMeasured;
    }
  }
  if (artifacts.length !== 1) {
    throw contractError(
      "unknown_source_identity",
      "The assigned identity does not have one exact registry record."
    );
  }
  const artifact = artifacts[0];
  const expectedMediaType = mediaTypeForArtifact(artifact);
  if (expectedMediaType === null) {
    throw contractError(
      "unknown_source_identity",
      "The exact assigned source has no supported media-type binding."
    );
  }
  if (
    claim.documentRole !==
      (projectedIdentity?.officialDocument.documentRole ?? artifact.role) ||
    claim.expectedMediaType !== expectedMediaType
  ) {
    throw contractError(
      "unknown_source_identity",
      "The assigned role or media type does not match the exact registry identity."
    );
  }
  const requirement = {
    schemaVersion: REQUIREMENT_SCHEMA,
    ...(claim.sourceIdentityKey
      ? { sourceIdentityKey: claim.sourceIdentityKey }
      : {}),
    authorityEdition,
    authorityArchiveSha256: claim.authorityArchiveSha256,
    jurisdiction: claim.jurisdiction,
    documentId: claim.documentId,
    documentRole: claim.documentRole,
    canonicalAuthorityPath: claim.canonicalAuthorityPath,
    expectedSha256: claim.expectedSha256,
    expectedBytes: claim.expectedBytes,
    expectedMediaType: claim.expectedMediaType,
    repositorySourcePath: artifact.sourcePath,
    portableLocator: claim.portableLocator,
    materializationDestination: claim.materializationDestination,
    readOnlyTreatment: claim.readOnlyTreatment,
    verificationCommand: claim.verificationCommand,
    retentionPolicy: claim.retentionPolicy,
    expectedMeasurementBasis: claim.expectedMeasurementBasis,
    identityBindingStatus: claim.identityBindingStatus,
    authorityAssetState: "authority_asset_known",
    registryState: "registry_metadata_present",
    assignmentJobId: assignedJob.jobId,
    assignmentBaseCommit: marker.manifestBaseCommit,
    assignmentManifestSha256: marker.assignmentManifestSha256,
    usageBindings: structuredClone(claim.usageBindings),
    provenance: {
      ...structuredClone(claim.provenance),
      registryPath,
      registryArtifactId: artifact.artifactId,
      registryPresence: artifact.presence ?? "unknown",
      registryHashState: artifact.hashState ?? "unknown",
      sourcePackage: artifact.provenance?.package ?? null,
      sourceManifest: artifact.provenance?.manifest ?? null,
      freshLocalVerification: false,
      registryPresenceConfersReadiness: false
    }
  };
  return validateMaterializationRequirement(requirement);
}

/**
 * The captain verifies an already committed receipt without recreating a
 * worker-local scaffold marker. The receipt remains the identity authority;
 * CLI values are assertions and the current job ID must match its assignment.
 *
 * A source acquired under its own materialization job records that owner in
 * assignmentJobId and names the one implementation job authorised to read it
 * in downstreamImplementationConsumerJobId. Either of those two receipt-named
 * jobs may assert the identity; every other job still fails closed, so this
 * recognises the two-job source lifecycle without widening who may verify.
 */
export function loadCaptainMaterializationRequirement({
  rootDir = REPOSITORY_ROOT,
  sourceIdentityKey,
  expectedSha256,
  expectedBytes,
  assignmentJobId
}) {
  if (!SOURCE_IDENTITY_KEY_PATTERN.test(sourceIdentityKey ?? "")) {
    throw contractError(
      "unknown_source_identity",
      "Captain verification requires one safe source identity key."
    );
  }
  const receiptPath =
    `data/record-clearing/production-factory/source-materialization-receipts/` +
    `${sourceIdentityKey}.json`;
  const absoluteReceipt = path.join(rootDir, receiptPath);
  if (!fs.existsSync(absoluteReceipt)) {
    throw contractError(
      "unknown_source_identity",
      `The canonical source receipt is missing: ${receiptPath}`
    );
  }
  const receipt = JSON.parse(fs.readFileSync(absoluteReceipt, "utf8"));
  const receiptNamedJobs = [
    receipt.assignmentJobId,
    receipt.downstreamImplementationConsumerJobId
  ].filter((jobId) => typeof jobId === "string" && jobId.length > 0);
  if (
    receipt.provenance?.sourceIdentityKey !== sourceIdentityKey ||
    receipt.actualSha256 !== expectedSha256 ||
    receipt.actualBytes !== expectedBytes ||
    receipt.expectedSha256 !== expectedSha256 ||
    receipt.expectedBytes !== expectedBytes ||
    !receiptNamedJobs.includes(assignmentJobId) ||
    receipt.ready !== true ||
    receipt.workerReady !== true
  ) {
    throw contractError(
      "unknown_source_identity",
      "Captain assertions do not match one ready canonical source receipt."
    );
  }
  return validateMaterializationRequirement({
    schemaVersion: REQUIREMENT_SCHEMA,
    sourceIdentityKey,
    authorityEdition: receipt.authorityEdition,
    authorityArchiveSha256: receipt.authorityArchiveSha256,
    jurisdiction: receipt.jurisdiction,
    documentId: receipt.documentId,
    documentRole: receipt.documentRole,
    canonicalAuthorityPath: receipt.canonicalAuthorityPath,
    repositorySourcePath: receipt.repositorySourcePath,
    portableLocator: receipt.portableLocator,
    materializationDestination: receipt.materializationDestination,
    expectedSha256: receipt.expectedSha256,
    expectedBytes: receipt.expectedBytes,
    expectedMediaType: receipt.expectedMediaType,
    readOnlyTreatment: receipt.readOnlyTreatment,
    verificationCommand: receipt.verificationCommand,
    retentionPolicy: receipt.retentionPolicy,
    expectedMeasurementBasis: receipt.expectedMeasurementBasis,
    identityBindingStatus: receipt.identityBindingStatus,
    assignmentJobId: receipt.assignmentJobId,
    assignmentBaseCommit: receipt.assignmentBaseCommit,
    assignmentManifestSha256: receipt.assignmentManifestSha256,
    authorityAssetState: "authority_asset_known",
    registryState: "registry_metadata_present",
    usageBindings: receipt.usageBindings,
    provenance: {
      ...receipt.provenance,
      freshLocalVerification: false,
      registryPresenceConfersReadiness: false
    }
  });
}

export function canonicalJson(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (isPlainObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  if (
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  throw contractError(
    "non_canonical_value",
    "Receipt values must be deterministic JSON data."
  );
}

export function canonicalJsonSha256(value) {
  return crypto.createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function deduplicateRequirements(requirements) {
  if (!Array.isArray(requirements) || requirements.length === 0) {
    throw contractError(
      "binary_materialization_required",
      "At least one required source is necessary for worker readiness."
    );
  }
  const byIdentity = new Map();
  const destinationClaims = new Map();
  let duplicateBindingCount = 0;
  for (const requirement of requirements) {
    validateMaterializationRequirement(requirement);
    const identityKey =
      `${requirement.authorityEdition}\u0000${requirement.jurisdiction}` +
      `\u0000${requirement.documentId}`;
    const existingIdentity = byIdentity.get(identityKey);
    if (existingIdentity) {
      if (
        sourceIdentityDigest(existingIdentity) !==
        sourceIdentityDigest(requirement)
      ) {
        throw contractError(
          "conflicting_source_identity",
          `Conflicting requirements exist for ${requirement.documentId}.`
        );
      }
      existingIdentity.usageBindings = mergeUsageBindings(
        existingIdentity.usageBindings,
        requirement.usageBindings
      );
      duplicateBindingCount += 1;
      continue;
    }
    const destinationKey = requirement.materializationDestination.toLowerCase();
    const destinationClaim = destinationClaims.get(destinationKey);
    if (
      destinationClaim &&
      sourceIdentityDigest(destinationClaim) !==
        sourceIdentityDigest(requirement)
    ) {
      throw contractError(
        "conflicting_materialization_destination",
        "Two source identities claim the same materialization destination."
      );
    }
    const cloned = structuredClone(requirement);
    byIdentity.set(identityKey, cloned);
    destinationClaims.set(destinationKey, cloned);
  }
  return {
    requirements: [...byIdentity.values()].sort((left, right) =>
      compareCodeUnits(left.documentId, right.documentId)
    ),
    duplicateBindingCount
  };
}

function aggregateReadiness({
  requiredSourceCount,
  uniqueSourceCount,
  duplicateBindingCount,
  results
}) {
  const workerReady =
    uniqueSourceCount > 0 &&
    results.length === uniqueSourceCount &&
    results.every((result) => result.ready === true);
  const aggregate = {
    schemaVersion: "rcap-source-materialization-set/v1",
    requiredSourceCount,
    uniqueSourceCount,
    duplicateBindingCount,
    readinessState: workerReady
      ? SOURCE_MATERIALIZATION_STATES.WORKER_READY
      : SOURCE_MATERIALIZATION_STATES.BINARY_MATERIALIZATION_REQUIRED,
    workerReady,
    allRequiredSourcesVerified: workerReady,
    sources: [...results].sort((left, right) =>
      compareCodeUnits(left.documentId, right.documentId)
    )
  };
  return Object.freeze({
    ...aggregate,
    receiptSha256: canonicalJsonSha256(aggregate)
  });
}

function assertRequirementAuthorized(requirement, authorizedRequirements) {
  if (!Array.isArray(authorizedRequirements)) {
    throw contractError(
      "unknown_source_identity",
      "An immutable authorized source catalog is required."
    );
  }
  const digest = requirementAuthorizationDigest(requirement);
  let authorizedCatalog;
  try {
    authorizedCatalog = deduplicateRequirements(authorizedRequirements)
      .requirements;
  } catch {
    throw contractError(
      "unknown_source_identity",
      "The authorized source catalog is invalid."
    );
  }
  const matches = authorizedCatalog.filter(
    (authorized) => requirementAuthorizationDigest(authorized) === digest
  );
  if (matches.length !== 1) {
    throw contractError(
      "unknown_source_identity",
      "The requested source is absent from the exact authorized catalog."
    );
  }
}

function sourceIdentityDigest(requirement) {
  const identity = {
    schemaVersion: requirement.schemaVersion,
    authorityEdition: requirement.authorityEdition,
    authorityArchiveSha256: requirement.authorityArchiveSha256,
    jurisdiction: requirement.jurisdiction,
    documentId: requirement.documentId,
    documentRole: requirement.documentRole,
    canonicalAuthorityPath: requirement.canonicalAuthorityPath,
    expectedSha256: requirement.expectedSha256,
    expectedBytes: requirement.expectedBytes,
    expectedMediaType: requirement.expectedMediaType,
    repositorySourcePath: requirement.repositorySourcePath,
    portableLocator: requirement.portableLocator,
    materializationDestination: requirement.materializationDestination,
    readOnlyTreatment: requirement.readOnlyTreatment,
    retentionPolicy: requirement.retentionPolicy,
    identityBindingStatus: requirement.identityBindingStatus,
    assignmentJobId: requirement.assignmentJobId,
    assignmentBaseCommit: requirement.assignmentBaseCommit,
    assignmentManifestSha256: requirement.assignmentManifestSha256,
    verificationCommand: requirement.verificationCommand,
    expectedMeasurementBasis: requirement.expectedMeasurementBasis,
    provenance: requirement.provenance
  };
  return canonicalJsonSha256(identity);
}

function requirementAuthorizationDigest(requirement) {
  return canonicalJsonSha256(requirement);
}

async function inspectExactFile(
  requirement,
  absolutePath,
  {
    materializationAction,
    requireReadOnly,
    workerBoundaryAuthorized = null
  }
) {
  let observation;
  try {
    observation = await measureRegularFile(
      absolutePath,
      requirement.expectedBytes
    );
  } catch (error) {
    if (error instanceof SourceMaterializationError) throw error;
    throw contractError(
      "binary_unavailable",
      `Unable to inspect source ${requirement.documentId}.`
    );
  }
  const materializedStates = [
    SOURCE_MATERIALIZATION_STATES.AUTHORITY_ASSET_KNOWN,
    SOURCE_MATERIALIZATION_STATES.REGISTRY_METADATA_PRESENT,
    SOURCE_MATERIALIZATION_STATES.BINARY_MATERIALIZED
  ];
  if (observation.bytes !== requirement.expectedBytes) {
    return finalizeResult(requirement, {
      state: SOURCE_MATERIALIZATION_STATES.BINARY_SIZE_MISMATCH,
      states: [
        ...materializedStates,
        SOURCE_MATERIALIZATION_STATES.BINARY_SIZE_MISMATCH
      ],
      ready: false,
      hashAndMediaVerified: false,
      actualBytes: observation.bytes,
      actualSha256: observation.sha256,
      actualMediaType: observation.mediaType,
      materializationAction,
      localVerificationBasis: "fresh_local_measurement_rejected"
    });
  }
  if (observation.sha256 !== requirement.expectedSha256) {
    return finalizeResult(requirement, {
      state: SOURCE_MATERIALIZATION_STATES.BINARY_HASH_MISMATCH,
      states: [
        ...materializedStates,
        SOURCE_MATERIALIZATION_STATES.BINARY_HASH_MISMATCH
      ],
      ready: false,
      hashAndMediaVerified: false,
      actualBytes: observation.bytes,
      actualSha256: observation.sha256,
      actualMediaType: observation.mediaType,
      materializationAction,
      localVerificationBasis: "fresh_local_measurement_rejected"
    });
  }
  if (observation.mediaType !== requirement.expectedMediaType) {
    return finalizeResult(requirement, {
      state: SOURCE_MATERIALIZATION_STATES.BINARY_MEDIA_TYPE_MISMATCH,
      states: [
        ...materializedStates,
        SOURCE_MATERIALIZATION_STATES.BINARY_MEDIA_TYPE_MISMATCH
      ],
      ready: false,
      hashAndMediaVerified: false,
      actualBytes: observation.bytes,
      actualSha256: observation.sha256,
      actualMediaType: observation.mediaType,
      materializationAction,
      localVerificationBasis: "fresh_local_measurement_rejected"
    });
  }
  const hashVerifiedStates = [
    ...materializedStates,
    SOURCE_MATERIALIZATION_STATES.BINARY_HASH_VERIFIED
  ];
  if (!requireReadOnly) {
    return finalizeResult(requirement, {
      state: SOURCE_MATERIALIZATION_STATES.BINARY_HASH_VERIFIED,
      states: hashVerifiedStates,
      ready: false,
      hashAndMediaVerified: true,
      actualBytes: observation.bytes,
      actualSha256: observation.sha256,
      actualMediaType: observation.mediaType,
      actualMode: observation.mode,
      materializationAction,
      localVerificationBasis: "freshly_verified_locator_bytes"
    });
  }
  if (requireReadOnly && observation.mode !== SAFE_FILE_MODE) {
    return finalizeResult(requirement, {
      state: "worker_read_authorization_denied",
      states: [...hashVerifiedStates, "worker_read_authorization_denied"],
      ready: false,
      hashAndMediaVerified: true,
      actualBytes: observation.bytes,
      actualSha256: observation.sha256,
      actualMediaType: observation.mediaType,
      actualMode: observation.mode,
      materializationAction,
      localVerificationBasis: "freshly_verified_local_bytes"
    });
  }
  if (workerBoundaryAuthorized !== true) {
    return finalizeResult(requirement, {
      state:
        workerBoundaryAuthorized === false
          ? "worker_read_authorization_denied"
          : SOURCE_MATERIALIZATION_STATES.BINARY_HASH_VERIFIED,
      states:
        workerBoundaryAuthorized === false
          ? [...hashVerifiedStates, "worker_read_authorization_denied"]
          : hashVerifiedStates,
      ready: false,
      hashAndMediaVerified: true,
      actualBytes: observation.bytes,
      actualSha256: observation.sha256,
      actualMediaType: observation.mediaType,
      actualMode: observation.mode,
      materializationAction,
      localVerificationBasis: "freshly_verified_local_bytes"
    });
  }
  return finalizeResult(requirement, {
    state: SOURCE_MATERIALIZATION_STATES.WORKER_READY,
    states: [
      ...hashVerifiedStates,
      SOURCE_MATERIALIZATION_STATES.WORKER_READ_AUTHORIZED,
      SOURCE_MATERIALIZATION_STATES.WORKER_READY
    ],
    ready: true,
    hashAndMediaVerified: true,
    actualBytes: observation.bytes,
    actualSha256: observation.sha256,
    actualMediaType: observation.mediaType,
    actualMode: observation.mode,
    materializationAction,
    localVerificationBasis: "freshly_verified_local_bytes"
  });
}

function stagePortableSource({
  requirement,
  sourcePath,
  sourceRoot,
  temporaryPath,
  materializationRoot
}) {
  const readFlags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0);
  const writeFlags =
    fs.constants.O_WRONLY |
    fs.constants.O_CREAT |
    fs.constants.O_EXCL |
    (fs.constants.O_NOFOLLOW ?? 0);
  let sourceDescriptor;
  let temporaryDescriptor;
  let temporaryCreated = false;
  let completed = false;
  try {
    sourceDescriptor = fs.openSync(sourcePath, readFlags);
    assertOpenDescriptorInsideRoot(
      sourceDescriptor,
      sourceRoot,
      "portable source"
    );
    const before = fs.fstatSync(sourceDescriptor, { bigint: true });
    if (!before.isFile() || before.nlink !== 1n) {
      throw contractError(
        "unsafe_file_alias",
        "Portable source must be one regular, non-aliased file."
      );
    }
    if (before.size !== BigInt(requirement.expectedBytes)) {
      throw new SourceMaterializationError(
        SOURCE_MATERIALIZATION_STATES.BINARY_SIZE_MISMATCH,
        `Portable source size does not match ${requirement.documentId}.`,
        portableMismatchResult(
          requirement,
          SOURCE_MATERIALIZATION_STATES.BINARY_SIZE_MISMATCH,
          {
            actualBytes: Number(before.size),
            actualSha256: null,
            actualMediaType: null
          }
        )
      );
    }

    temporaryDescriptor = fs.openSync(
      temporaryPath,
      writeFlags,
      0o400
    );
    temporaryCreated = true;
    assertOpenDescriptorInsideRoot(
      temporaryDescriptor,
      materializationRoot,
      "materialization staging file"
    );

    const hash = crypto.createHash("sha256");
    const probe = Buffer.alloc(1024);
    let probeBytes = 0;
    let totalBytes = 0;
    while (totalBytes < requirement.expectedBytes) {
      const remaining = requirement.expectedBytes - totalBytes;
      const buffer = Buffer.allocUnsafe(
        Math.min(COPY_BUFFER_BYTES, remaining)
      );
      const bytesRead = fs.readSync(
        sourceDescriptor,
        buffer,
        0,
        buffer.length,
        null
      );
      if (bytesRead === 0) break;
      const chunk = buffer.subarray(0, bytesRead);
      hash.update(chunk);
      writeAllSync(temporaryDescriptor, chunk);
      if (probeBytes < probe.length) {
        const copied = Math.min(chunk.length, probe.length - probeBytes);
        chunk.copy(probe, probeBytes, 0, copied);
        probeBytes += copied;
      }
      totalBytes += bytesRead;
    }
    const extra = Buffer.allocUnsafe(1);
    const extraBytes = fs.readSync(
      sourceDescriptor,
      extra,
      0,
      1,
      null
    );
    const after = fs.fstatSync(sourceDescriptor, { bigint: true });
    for (const field of ["dev", "ino", "size", "mtimeNs", "ctimeNs"]) {
      if (before[field] !== after[field]) {
        throw contractError(
          "source_changed_during_materialization",
          "Portable source changed during bounded materialization."
        );
      }
    }
    if (
      totalBytes !== requirement.expectedBytes ||
      extraBytes !== 0
    ) {
      throw new SourceMaterializationError(
        SOURCE_MATERIALIZATION_STATES.BINARY_SIZE_MISMATCH,
        `Portable source size changed for ${requirement.documentId}.`,
        portableMismatchResult(
          requirement,
          SOURCE_MATERIALIZATION_STATES.BINARY_SIZE_MISMATCH,
          {
            actualBytes: totalBytes + extraBytes,
            actualSha256: null,
            actualMediaType: null
          }
        )
      );
    }
    const actualSha256 = hash.digest("hex");
    const actualMediaType = sniffMediaType(probe.subarray(0, probeBytes));
    if (actualSha256 !== requirement.expectedSha256) {
      throw new SourceMaterializationError(
        SOURCE_MATERIALIZATION_STATES.BINARY_HASH_MISMATCH,
        `Portable source hash does not match ${requirement.documentId}.`,
        portableMismatchResult(
          requirement,
          SOURCE_MATERIALIZATION_STATES.BINARY_HASH_MISMATCH,
          {
            actualBytes: totalBytes,
            actualSha256,
            actualMediaType
          }
        )
      );
    }
    if (actualMediaType !== requirement.expectedMediaType) {
      throw new SourceMaterializationError(
        SOURCE_MATERIALIZATION_STATES.BINARY_MEDIA_TYPE_MISMATCH,
        `Portable source media type does not match ${requirement.documentId}.`,
        portableMismatchResult(
          requirement,
          SOURCE_MATERIALIZATION_STATES.BINARY_MEDIA_TYPE_MISMATCH,
          {
            actualBytes: totalBytes,
            actualSha256,
            actualMediaType
          }
        )
      );
    }
    fs.fchmodSync(temporaryDescriptor, SAFE_FILE_MODE);
    fs.fsyncSync(temporaryDescriptor);
    completed = true;
  } finally {
    if (temporaryDescriptor !== undefined) {
      fs.closeSync(temporaryDescriptor);
    }
    if (sourceDescriptor !== undefined) fs.closeSync(sourceDescriptor);
    if (temporaryCreated && !completed) {
      try {
        fs.unlinkSync(temporaryPath);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    }
  }
}

function writeAllSync(descriptor, bytes) {
  let offset = 0;
  while (offset < bytes.length) {
    const written = fs.writeSync(
      descriptor,
      bytes,
      offset,
      bytes.length - offset,
      null
    );
    if (written <= 0) {
      throw contractError(
        "materialization_write_failed",
        "Exclusive materialization staging made no progress."
      );
    }
    offset += written;
  }
}

function portableMismatchResult(requirement, state, observation) {
  return finalizeResult(requirement, {
    state,
    states: [
      SOURCE_MATERIALIZATION_STATES.AUTHORITY_ASSET_KNOWN,
      SOURCE_MATERIALIZATION_STATES.REGISTRY_METADATA_PRESENT,
      SOURCE_MATERIALIZATION_STATES.BINARY_MATERIALIZATION_REQUIRED,
      state
    ],
    ready: false,
    hashAndMediaVerified: false,
    ...observation,
    materializationAction: "portable_source_rejected",
    localVerificationBasis: "fresh_local_measurement_rejected"
  });
}

function assertOpenDescriptorInsideRoot(descriptor, root, label) {
  const descriptorPath = `/proc/self/fd/${descriptor}`;
  let openedPath;
  try {
    openedPath = fs.realpathSync(descriptorPath);
  } catch {
    throw contractError(
      "path_boundary_verification_unavailable",
      `Cannot prove the open ${label} is inside its authorized root.`
    );
  }
  assertInsideRoot(fs.realpathSync(path.resolve(root)), openedPath, label);
}

async function measureRegularFile(absolutePath, expectedBytes) {
  const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0);
  let handle;
  try {
    handle = await fs.promises.open(absolutePath, flags);
    const before = await handle.stat({ bigint: true });
    if (!before.isFile()) {
      throw contractError(
        "binary_unavailable",
        "Materialized source must be a regular file."
      );
    }
    if (before.nlink !== 1n) {
      throw contractError(
        "unsafe_file_alias",
        "Materialized source may not be a hard-link alias."
      );
    }
    if (before.size !== BigInt(expectedBytes)) {
      const observedBytes = Number(before.size);
      return {
        bytes: Number.isSafeInteger(observedBytes) ? observedBytes : null,
        sha256: null,
        mediaType: null,
        mode: Number(before.mode & 0o777n)
      };
    }
    const hash = crypto.createHash("sha256");
    const probeChunks = [];
    let probeBytes = 0;
    let offset = 0;
    while (true) {
      const buffer = Buffer.allocUnsafe(COPY_BUFFER_BYTES);
      const { bytesRead } = await handle.read(
        buffer,
        0,
        buffer.length,
        offset
      );
      if (bytesRead === 0) break;
      const chunk = buffer.subarray(0, bytesRead);
      hash.update(chunk);
      if (probeBytes < 1024) {
        const remaining = 1024 - probeBytes;
        const probe = chunk.subarray(0, remaining);
        probeChunks.push(probe);
        probeBytes += probe.length;
      }
      offset += bytesRead;
    }
    const after = await handle.stat({ bigint: true });
    for (const field of ["dev", "ino", "size", "mtimeNs", "ctimeNs"]) {
      if (before[field] !== after[field]) {
        throw contractError(
          "source_changed_during_verification",
          "Source metadata changed during verification."
        );
      }
    }
    const bytes = Number(after.size);
    if (!Number.isSafeInteger(bytes)) {
      throw contractError(
        "binary_size_mismatch",
        "Source size exceeds the safe verification range."
      );
    }
    return {
      bytes,
      sha256: hash.digest("hex"),
      mediaType: sniffMediaType(Buffer.concat(probeChunks)),
      mode: Number(after.mode & 0o777n)
    };
  } catch (error) {
    if (error?.code === "ELOOP") {
      throw contractError(
        "path_boundary_violation",
        "Symbolic-link source paths are prohibited."
      );
    }
    throw error;
  } finally {
    await handle?.close();
  }
}

function resolveConfinedPath({
  root,
  relativePath,
  createParents,
  allowMissingLeaf,
  label
}) {
  assertNonemptyString(root, `${label} root`);
  const normalized = assertPortableRelativePath(relativePath, label);
  const rootAbsolute = path.resolve(root);
  let rootStat;
  try {
    rootStat = fs.lstatSync(rootAbsolute);
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw contractError(
        "materialization_root_unavailable",
        `${label} root must already exist.`
      );
    }
    throw error;
  }
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw contractError(
      "path_boundary_violation",
      `${label} root must be a real directory.`
    );
  }
  const rootReal = fs.realpathSync(rootAbsolute);
  if (rootReal !== rootAbsolute) {
    throw contractError(
      "path_boundary_violation",
      `${label} root may not traverse a symbolic link.`
    );
  }

  const segments = normalized.split("/");
  let current = rootAbsolute;
  for (const segment of segments.slice(0, -1)) {
    current = path.join(current, segment);
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if (error?.code === "ENOENT" && allowMissingLeaf && !createParents) {
        return {
          absolutePath: path.join(rootAbsolute, ...segments),
          exists: false
        };
      }
      if (error?.code !== "ENOENT" || !createParents) throw error;
      fs.mkdirSync(current, { mode: 0o700 });
      stat = fs.lstatSync(current);
    }
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw contractError(
        "path_boundary_violation",
        `${label} has an unsafe ancestor.`
      );
    }
    assertInsideRoot(rootReal, fs.realpathSync(current), label);
  }
  const absolutePath = path.join(rootAbsolute, ...segments);
  assertInsideRoot(rootReal, path.dirname(absolutePath), label);
  let leafStat;
  try {
    leafStat = fs.lstatSync(absolutePath);
  } catch (error) {
    if (error?.code === "ENOENT" && allowMissingLeaf) {
      return { absolutePath, exists: false };
    }
    throw error;
  }
  if (leafStat.isSymbolicLink() || !leafStat.isFile()) {
    throw contractError(
      "path_boundary_violation",
      `${label} must be a regular, non-symbolic-link file.`
    );
  }
  assertInsideRoot(rootReal, fs.realpathSync(absolutePath), label);
  return { absolutePath, exists: true };
}

function assertInsideRoot(rootReal, candidate, label) {
  const relative = path.relative(rootReal, candidate);
  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw contractError(
      "path_boundary_violation",
      `${label} escapes its authorized root.`
    );
  }
}

function assertTrustedAdapterRoot(materializationRoot, requirements) {
  assertNonemptyString(materializationRoot, "materialization root");
  const rootAbsolute = path.resolve(materializationRoot);
  const stat = fs.lstatSync(rootAbsolute);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw contractError(
      "path_boundary_violation",
      "Materialization root must be a real directory."
    );
  }
  const mode = stat.mode & 0o777;
  if (mode === 0o700) return;
  if (
    mode === 0o555 &&
    requirements.every((requirement) =>
      fs.existsSync(
        path.join(
          rootAbsolute,
          ...requirement.materializationDestination.split("/")
        )
      )
    )
  ) {
    return;
  }
  throw contractError(
    "materialization_root_not_exclusive",
    "The pre-worker adapter requires mode 0700, or an already sealed complete root."
  );
}

function sealMaterializationBoundary(requirements, materializationRoot) {
  const rootAbsolute = path.resolve(materializationRoot);
  const directories = new Set([rootAbsolute]);
  for (const requirement of requirements) {
    let current = path.dirname(
      path.join(
        rootAbsolute,
        ...requirement.materializationDestination.split("/")
      )
    );
    while (current !== rootAbsolute) {
      assertInsideRoot(rootAbsolute, current, "materialization boundary");
      const stat = fs.lstatSync(current);
      if (!stat.isDirectory() || stat.isSymbolicLink()) {
        throw contractError(
          "path_boundary_violation",
          "Materialization boundary contains an unsafe directory."
        );
      }
      directories.add(current);
      current = path.dirname(current);
    }
  }
  for (const directory of [...directories].sort(
    (left, right) => right.length - left.length || compareCodeUnits(left, right)
  )) {
    fs.chmodSync(directory, 0o555);
  }
}

function readOnlyBoundaryIsSealed({
  materializationRoot,
  destination
}) {
  const rootAbsolute = path.resolve(materializationRoot);
  let current = path.dirname(
    path.join(rootAbsolute, ...destination.split("/"))
  );
  while (true) {
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch {
      return false;
    }
    if (
      !stat.isDirectory() ||
      stat.isSymbolicLink() ||
      (stat.mode & 0o777) !== 0o555
    ) {
      return false;
    }
    if (current === rootAbsolute) return true;
    if (path.dirname(current) === current) return false;
    current = path.dirname(current);
  }
}

function locatorRootFor(locatorRoots, scheme, requirement) {
  const resolution =
    locatorRoots instanceof Map
      ? locatorRoots.get(scheme)
      : isPlainObject(locatorRoots)
        ? locatorRoots[scheme]
        : undefined;
  if (
    !isPlainObject(resolution) ||
    typeof resolution.root !== "string" ||
    resolution.root.trim().length === 0 ||
    resolution.authorityEdition !== requirement.authorityEdition ||
    resolution.authorityArchiveSha256 !==
      requirement.authorityArchiveSha256 ||
    resolution.verificationBasis !==
      "freshly_verified_read_only_authority_container"
  ) {
    throw contractError(
      "portable_locator_unavailable",
      `No exact hash-verified resolver is configured for locator scheme ${scheme}.`
    );
  }
  return resolution.root;
}

function finalizeResult(requirement, values) {
  const locator = parsePortableLocator(requirement.portableLocator);
  const receipt = {
    schemaVersion: RESULT_SCHEMA,
    authorityEdition: requirement.authorityEdition,
    authorityArchiveSha256: requirement.authorityArchiveSha256,
    jurisdiction: requirement.jurisdiction,
    documentId: requirement.documentId,
    documentRole: requirement.documentRole,
    canonicalAuthorityPath: requirement.canonicalAuthorityPath,
    repositorySourcePath: requirement.repositorySourcePath,
    expectedSha256: requirement.expectedSha256,
    expectedBytes: requirement.expectedBytes,
    expectedMediaType: requirement.expectedMediaType,
    portableLocator: requirement.portableLocator,
    portableLocatorSha256: canonicalJsonSha256(requirement.portableLocator),
    materializationDestination: requirement.materializationDestination,
    locatorScheme: locator.scheme,
    readOnlyTreatment: requirement.readOnlyTreatment,
    retentionPolicy: requirement.retentionPolicy,
    expectedMeasurementBasis: requirement.expectedMeasurementBasis,
    identityBindingStatus: requirement.identityBindingStatus,
    verificationCommand: requirement.verificationCommand,
    assignmentJobId: requirement.assignmentJobId,
    assignmentBaseCommit: requirement.assignmentBaseCommit,
    assignmentManifestSha256: requirement.assignmentManifestSha256,
    localVerificationBasis: values.localVerificationBasis,
    state: values.state,
    states: values.states,
    actualSha256: values.actualSha256 ?? null,
    actualBytes: values.actualBytes ?? null,
    actualMediaType: values.actualMediaType ?? null,
    actualMode: values.actualMode ?? null,
    hashAndMediaVerified: values.hashAndMediaVerified ?? false,
    workerReady: values.ready,
    ready: values.ready,
    usageBindings: [...requirement.usageBindings].sort(compareUsageBindings),
    provenance: {
      ...structuredClone(requirement.provenance),
      registryPath: requirement.provenance.registryPath,
      registryArtifactId: requirement.provenance.registryArtifactId ?? null,
      registryPresence: requirement.provenance.registryPresence ?? "unknown",
      registryHashState: requirement.provenance.registryHashState ?? "unknown",
      registryPresenceConfersReadiness: false,
      freshLocalVerification:
        values.localVerificationBasis === "freshly_verified_local_bytes"
    }
  };
  return Object.freeze({
    ...receipt,
    materializationAction: values.materializationAction,
    receiptSha256: canonicalJsonSha256(receipt)
  });
}

function mediaTypeForArtifact(artifact) {
  if (artifact.fileType === "pdf") return "application/pdf";
  return null;
}

function supportedMediaType(mediaType) {
  return mediaType === "application/pdf";
}

function sniffMediaType(bytes) {
  const ascii = bytes.toString("latin1");
  if (ascii.startsWith("%PDF-")) return "application/pdf";
  return "application/octet-stream";
}

function mergeUsageBindings(left, right) {
  const byKey = new Map();
  for (const binding of [...left, ...right]) {
    const key = `${binding.trackId}\u0000${binding.componentId ?? ""}`;
    byKey.set(key, structuredClone(binding));
  }
  return [...byKey.values()].sort(compareUsageBindings);
}

function compareUsageBindings(left, right) {
  return (
    compareCodeUnits(left.trackId, right.trackId) ||
    compareCodeUnits(
      String(left.componentId ?? ""),
      String(right.componentId ?? "")
    )
  );
}

function uniqueCanonicalObjects(values) {
  const byCanonical = new Map();
  for (const value of values) {
    byCanonical.set(canonicalJson(value), value);
  }
  return [...byCanonical.values()];
}

function loadAnchoredAssignment({ rootDir, manifestPath }) {
  const markerResolution = resolveConfinedPath({
    root: rootDir,
    relativePath: manifestPath,
    createParents: false,
    allowMissingLeaf: false,
    label: "scaffold assignment marker"
  });
  const marker = readJsonNoFollow(
    markerResolution.absolutePath,
    "scaffold assignment marker"
  );
  if (!isPlainObject(marker.assignedJob)) {
    throw contractError(
      "unknown_source_identity",
      "The scaffold marker has no assigned job."
    );
  }
  if (
    canonicalSha256(marker.assignedJob) !== marker.assignedJobSha256
  ) {
    throw contractError(
      "assignment_manifest_mismatch",
      "The scaffold assignment self-hash does not match."
    );
  }
  if (
    typeof marker.assignmentManifestRelativePath !== "string" ||
    !SHA256_PATTERN.test(marker.assignmentManifestSha256 ?? "")
  ) {
    throw contractError(
      "assignment_manifest_mismatch",
      "The scaffold has no valid captain-owned assignment anchor."
    );
  }
  const anchorPath = path.resolve(
    rootDir,
    marker.assignmentManifestRelativePath
  );
  const normalizedAnchor = anchorPath.replaceAll("\\", "/");
  let anchorRealPath = null;
  try {
    anchorRealPath = fs.realpathSync(anchorPath);
  } catch {
    // Report the same fail-closed anchor state without exposing a host path.
  }
  if (
    !normalizedAnchor.includes("/tmp/rcap-factory/jobs/") ||
    !normalizedAnchor.endsWith("/job.json") ||
    anchorRealPath !== anchorPath
  ) {
    throw contractError(
      "assignment_manifest_mismatch",
      "The assignment anchor is outside the captain-owned scaffold workspace."
    );
  }
  const anchorBytes = readFileNoFollow(
    anchorPath,
    "captain-owned assignment anchor"
  );
  if (
    crypto.createHash("sha256").update(anchorBytes).digest("hex") !==
    marker.assignmentManifestSha256
  ) {
    throw contractError(
      "assignment_manifest_mismatch",
      "The captain-owned assignment anchor hash does not match."
    );
  }
  let anchoredJob;
  try {
    anchoredJob = JSON.parse(anchorBytes.toString("utf8"));
  } catch {
    throw contractError(
      "assignment_manifest_mismatch",
      "The captain-owned assignment anchor is invalid JSON."
    );
  }
  if (
    canonicalStringify(anchoredJob, 0) !==
      canonicalStringify(marker.assignedJob, 0) ||
    anchoredJob.jobId !== marker.jobId ||
    anchoredJob.baseCommit !== marker.manifestBaseCommit ||
    !/^[0-9a-f]{40}$/u.test(marker.manifestBaseCommit ?? "")
  ) {
    throw contractError(
      "assignment_manifest_mismatch",
      "The local assignment does not match its captain-owned anchor."
    );
  }
  return { marker, assignedJob: structuredClone(anchoredJob) };
}

function readJsonNoFollow(filePath, label) {
  const bytes = readFileNoFollow(filePath, label);
  try {
    const parsed = JSON.parse(bytes.toString("utf8"));
    if (!isPlainObject(parsed)) throw new Error("not an object");
    return parsed;
  } catch {
    throw contractError(
      "required_contract_input_unavailable",
      `Unable to parse ${label}.`
    );
  }
}

function readFileNoFollow(filePath, label) {
  const flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0);
  let descriptor;
  try {
    descriptor = fs.openSync(filePath, flags);
    const stat = fs.fstatSync(descriptor);
    if (!stat.isFile() || stat.nlink !== 1) {
      throw contractError(
        "path_boundary_violation",
        `${label} must be one regular, non-aliased file.`
      );
    }
    return fs.readFileSync(descriptor);
  } catch (error) {
    if (error instanceof SourceMaterializationError) throw error;
    throw contractError(
      "required_contract_input_unavailable",
      `Unable to read ${label}.`
    );
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    throw contractError(
      "required_contract_input_unavailable",
      `Unable to read ${label}.`
    );
  }
}

function expectedVerificationCommand(requirement) {
  const selector = requirement.sourceIdentityKey
    ? `--source-identity-key ${requirement.sourceIdentityKey}`
    : `--document-id ${requirement.documentId}`;
  return (
    "node scripts/verify-rcap-materialized-source.mjs " +
    `${selector} ` +
    `--sha256 ${requirement.expectedSha256} ` +
    `--bytes ${requirement.expectedBytes}`
  );
}

function compareCodeUnits(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertNonemptyString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw contractError(
      "invalid_materialization_requirement",
      `${label} must be a non-empty string.`
    );
  }
}

function contractError(code, message) {
  return new SourceMaterializationError(code, message);
}

function parseCliArguments(rawArguments) {
  const values = {};
  for (let index = 0; index < rawArguments.length; index += 1) {
    const argument = rawArguments[index];
    if (argument === "--help" || argument === "-h") {
      values.help = true;
      continue;
    }
    if (!argument.startsWith("--")) {
      throw contractError(
        "invalid_cli_arguments",
        `Unexpected positional argument: ${argument}.`
      );
    }
    const key = argument.slice(2);
    if (
      ![
        "document-id",
        "source-identity-key",
        "sha256",
        "bytes",
        "manifest",
        "materialization-root"
      ].includes(key)
    ) {
      throw contractError(
        "invalid_cli_arguments",
        `Unsupported argument: ${argument}.`
      );
    }
    const value = rawArguments[index + 1];
    if (!value || value.startsWith("--")) {
      throw contractError(
        "invalid_cli_arguments",
        `${argument} requires a value.`
      );
    }
    if (values[key] !== undefined) {
      throw contractError(
        "invalid_cli_arguments",
        `${argument} may be specified only once.`
      );
    }
    values[key] = value;
    index += 1;
  }
  return values;
}

function cliHelp() {
  return [
    "Usage:",
    "  node scripts/verify-rcap-materialized-source.mjs \\",
    "    --source-identity-key <assigned-key> --sha256 <lowercase-sha256> --bytes <count>",
    "    [--manifest tmp/rcap-factory/job.json] --materialization-root <local-root>",
    "",
    "RCAP_SOURCE_MATERIALIZATION_ROOT may supply the required local root.",
    "This worker command verifies an assigned read-only binary. It never downloads,",
    "extracts, copies, reconstructs, overwrites, or changes source permissions.",
    ""
  ].join("\n");
}

async function main() {
  const args = parseCliArguments(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(cliHelp());
    return;
  }
  if (!args["source-identity-key"] && !args["document-id"]) {
    throw contractError(
      "invalid_cli_arguments",
      "--source-identity-key (or legacy --document-id) is required."
    );
  }
  if (
    args["source-identity-key"] &&
    !SOURCE_IDENTITY_KEY_PATTERN.test(args["source-identity-key"])
  ) {
    throw contractError(
      "invalid_cli_arguments",
      "--source-identity-key must be safe kebab case."
    );
  }
  if (!SHA256_PATTERN.test(args.sha256 ?? "")) {
    throw contractError(
      "invalid_cli_arguments",
      "--sha256 must be a lowercase SHA-256."
    );
  }
  const expectedBytes = Number(args.bytes);
  if (!Number.isSafeInteger(expectedBytes) || expectedBytes <= 0) {
    throw contractError(
      "invalid_cli_arguments",
      "--bytes must be a positive safe integer."
    );
  }
  const markerPath = path.join(
    REPOSITORY_ROOT,
    args.manifest ?? DEFAULT_ASSIGNMENT_MANIFEST
  );
  const captainIntegration =
    process.env.RCAP_FACTORY_VALIDATION_SCOPE === "integration" &&
    !fs.existsSync(markerPath);
  const requirement = captainIntegration
    ? loadCaptainMaterializationRequirement({
        rootDir: REPOSITORY_ROOT,
        sourceIdentityKey: args["source-identity-key"],
        expectedSha256: args.sha256,
        expectedBytes,
        assignmentJobId: process.env.RCAP_FACTORY_JOB_ID
      })
    : await loadAssignedMaterializationRequirement({
        rootDir: REPOSITORY_ROOT,
        manifestPath: args.manifest ?? DEFAULT_ASSIGNMENT_MANIFEST,
        sourceIdentityKey: args["source-identity-key"],
        documentId: args["document-id"],
        expectedSha256: args.sha256,
        expectedBytes
      });
  const materializationRoot =
    args["materialization-root"] ??
    process.env.RCAP_SOURCE_MATERIALIZATION_ROOT;
  if (
    typeof materializationRoot !== "string" ||
    materializationRoot.trim().length === 0
  ) {
    throw contractError(
      "materialization_root_required",
      "An explicit local materialization root is required."
    );
  }
  const result = await assertMaterializedSource(requirement, {
    materializationRoot
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  main().catch((error) => {
    const result = error?.result;
    const safeFailure = {
      schemaVersion: RESULT_SCHEMA,
      state: result?.state ?? error?.code ?? "source_verification_failed",
      documentId: result?.documentId ?? null,
      workerReady: false
    };
    process.stderr.write(`${JSON.stringify(safeFailure)}\n`);
    process.exitCode = 1;
  });
}
