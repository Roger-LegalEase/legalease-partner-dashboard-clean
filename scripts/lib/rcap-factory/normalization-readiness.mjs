import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const NORMALIZATION_READINESS_INPUT_SCHEMA =
  "rcap-normalization-readiness-input/v1";
export const NORMALIZATION_READINESS_BUNDLE_SCHEMA =
  "rcap-normalization-readiness-bundle/v1";
export const NORMALIZATION_READINESS_RECORD_SCHEMA =
  "rcap-normalization-readiness-record/v1";
export const NORMALIZATION_JOB_CLAIMS_SCHEMA =
  "rcap-factory-job-claims/v1";
export const MECHANISM_INVENTORY_SCHEMA =
  "rcap-normalization-mechanism-inventory/v1";
export const MECHANISM_INVENTORY_CANONICALIZATION_VERSION =
  "mechanism-inventory-v1";

export const NORMALIZATION_READINESS_FOUNDATION_JOB_ID =
  "rcap-nationwide-normalization-readiness-foundation";

export const REMAINING_NORMALIZATION_JURISDICTIONS = Object.freeze([
  "KY",
  "NC",
  "ND",
  "NE",
  "NH",
  "NJ",
  "NM",
  "NV",
  "NY",
  "OH",
  "OK",
  "OR",
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
]);

export const NORMALIZATION_READINESS_STATES = Object.freeze([
  "legal_review_materialization_required",
  "legal_review_hash_mismatch",
  "mechanism_inventory_count_conflict",
  "mechanism_inventory_required",
  "mechanism_inventory_hash_mismatch",
  "expected_source_ids_required",
  "official_authority_refresh_required",
  "ready_for_normalization",
  "normalization_in_progress",
  "normalization_complete"
]);

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const JURISDICTION_PATTERN = /^[A-Z]{2}$/;
const JOB_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PORTABLE_ARCHIVE_SCHEME = "attorney-review-package://";
const MATERIALIZATION_PREFIX =
  "tmp/rcap-factory/materialized-authority/legal-reviews";
const ORIGINAL_REVIEW_PRECEDENCE =
  "The single active original Master Library legal review controls when no addendum exists.";

const REQUIRED_INVENTORY_ROW_FIELDS = Object.freeze([
  "sourceId",
  "reviewSlot",
  "legalMechanismName",
  "classification",
  "candidateFilingActor",
  "candidateDestination",
  "referencedStatutesOrRules",
  "referencedOfficialForms",
  "unresolvedQuestions"
]);

const READINESS_BLOCKER_ORDER = Object.freeze([
  "mechanism_inventory_count_conflict",
  "legal_review_hash_mismatch",
  "legal_review_materialization_required",
  "mechanism_inventory_hash_mismatch",
  "mechanism_inventory_required",
  "expected_source_ids_required",
  "official_authority_refresh_required"
]);

const VOLATILE_MECHANISM_FIELDS = new Set([
  "retrievalTimestamp",
  "retrievedAt",
  "retrievalDate",
  "materializationDestination",
  "verifiedTemporaryDestination"
]);

export function canonicalStringify(value) {
  return JSON.stringify(canonicalizeObject(value));
}

export function canonicalizeMechanismInventory(rows) {
  if (!Array.isArray(rows)) {
    throw new Error("mechanismInventory must be an array.");
  }

  const sourceIds = new Set();
  const canonicalRows = rows.map((row, index) => {
    const prefix = `mechanismInventory[${index}]`;
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error(`${prefix} must be an object.`);
    }
    rejectAbsoluteWorkspacePaths(row, prefix);
    const sourceId = requiredString(row.sourceId, `${prefix}.sourceId`);
    if (sourceIds.has(sourceId)) {
      throw new Error(`mechanismInventory contains duplicate sourceId ${sourceId}.`);
    }
    sourceIds.add(sourceId);
    return canonicalizeMechanismValue({ ...row, sourceId });
  });

  return canonicalRows.sort((left, right) =>
    left.sourceId.localeCompare(right.sourceId)
  );
}

export function mechanismInventorySha256({
  mechanismInventory
}) {
  return crypto
    .createHash("sha256")
    .update(mechanismInventoryCanonicalPayload(mechanismInventory))
    .digest("hex");
}

export function mechanismInventoryCanonicalPayload(mechanismInventory) {
  return canonicalStringify(canonicalizeMechanismInventory(mechanismInventory));
}

export function mechanismInventoryCanonicalPayloadByteCount(
  mechanismInventory
) {
  return Buffer.byteLength(
    mechanismInventoryCanonicalPayload(mechanismInventory),
    "utf8"
  );
}

export function materializeNormalizationResearchInputs({
  input,
  rootDir,
  repositoryAssetAudit
}) {
  const expanded = structuredClone(input);
  const descriptors = expanded.researchInputs ?? [];
  if (!Array.isArray(descriptors)) {
    throw new Error("normalization readiness researchInputs must be an array.");
  }
  if (descriptors.length === 0) return expanded;

  const reviewAssets = legalReviewAssetsByJurisdiction(repositoryAssetAudit);
  const bundles = new Map(
    (expanded.bundles ?? []).map((bundle) => [bundle.jurisdiction, bundle])
  );
  const ingestionResults = [];

  for (const descriptor of descriptors) {
    if (!["SESSION_B", "SESSION_D"].includes(descriptor?.session)) {
      throw new Error(
        `Unsupported normalization research session ${descriptor?.session ?? "missing"}.`
      );
    }
    const bundleBytes = readRepositoryResearchFile(
      rootDir,
      descriptor.bundlePath
    );
    const manifestBytes = readRepositoryResearchFile(
      rootDir,
      descriptor.manifestPath
    );
    const actualBundleSha256 = sha256Bytes(bundleBytes);
    if (actualBundleSha256 !== descriptor.bundleSha256) {
      throw new Error(
        `${descriptor.bundlePath} SHA-256 ${actualBundleSha256} does not match ` +
          `${descriptor.bundleSha256}.`
      );
    }
    if (bundleBytes.length !== descriptor.bundleByteCount) {
      throw new Error(
        `${descriptor.bundlePath} byte count ${bundleBytes.length} does not match ` +
          `${descriptor.bundleByteCount}.`
      );
    }

    const manifest = JSON.parse(manifestBytes.toString("utf8"));
    const research = JSON.parse(bundleBytes.toString("utf8"));
    const validateEnvelope =
      descriptor.session === "SESSION_B"
        ? validateSessionBResearchEnvelope
        : validateSessionDResearchEnvelope;
    validateEnvelope({
      descriptor,
      manifest,
      research,
      actualBundleSha256,
      bundleByteCount: bundleBytes.length
    });

    for (const researchRecord of research.jurisdictions) {
      if (bundles.has(researchRecord.jurisdiction)) {
        throw new Error(
          `Normalization research duplicates ${researchRecord.jurisdiction}.`
        );
      }
      const reviewRows = reviewAssets.get(researchRecord.jurisdiction) ?? [];
      if (reviewRows.length !== 1) {
        throw new Error(
          `${researchRecord.jurisdiction} must have exactly one controlling review; ` +
            `found ${reviewRows.length}.`
        );
      }
      const buildBundle =
        descriptor.session === "SESSION_B"
          ? buildSessionBNormalizationBundle
          : buildSessionDNormalizationBundle;
      bundles.set(
        researchRecord.jurisdiction,
        buildBundle({
          descriptor,
          researchRecord,
          reviewAsset: reviewRows[0],
          authorityArchive: expanded.authorityArchive
        })
      );
    }

    ingestionResults.push({
      session: descriptor.session,
      sourceCommit: descriptor.sourceCommit,
      bundlePath: descriptor.bundlePath,
      bundleSha256: actualBundleSha256,
      bundleByteCount: bundleBytes.length,
      jurisdictionCount: research.jurisdictionCount,
      inventorySlotCount: research.inventorySlotCount,
      status: "research_evidence_ingested"
    });
  }

  expanded.bundles = [...bundles.values()].sort((left, right) =>
    left.jurisdiction.localeCompare(right.jurisdiction)
  );
  expanded.researchIngestionResults = ingestionResults.sort((left, right) =>
    left.session.localeCompare(right.session)
  );
  return expanded;
}

function buildSessionBNormalizationBundle({
  descriptor,
  researchRecord,
  reviewAsset,
  authorityArchive
}) {
  const jurisdiction = researchRecord.jurisdiction;
  if (
    researchRecord.authorityEdition !== "1.2" ||
    researchRecord.controllingReviewAssetPath !==
      reviewAsset.canonicalRelativePath ||
    researchRecord.controllingReviewSha256 !== reviewAsset.sha256 ||
    researchRecord.controllingReviewRevision !== reviewAsset.revision
  ) {
    throw new Error(
      `${jurisdiction} research review identity does not match Edition 1.2.`
    );
  }
  const mechanismInventory = canonicalizeMechanismInventory(
    researchRecord.mechanismInventory
  );
  const expectedSourceIds = mechanismInventory.map((row) => row.sourceId);
  if (
    canonicalStringify(
      [...researchRecord.expectedSourceIds].sort((left, right) =>
        left.localeCompare(right)
      )
    ) !==
    canonicalStringify(expectedSourceIds)
  ) {
    throw new Error(
      `${jurisdiction} expected source IDs do not reconcile to its mechanism denominator.`
    );
  }
  const researchSuppliedInventorySha256 =
    researchRecord.mechanismInventorySha256;
  if (
    sessionBResearchInventorySha256(researchRecord.mechanismInventory) !==
    researchSuppliedInventorySha256
  ) {
    throw new Error(
      `${jurisdiction} research-supplied inventory SHA-256 does not reproduce.`
    );
  }
  const canonicalMechanismInventorySha256 = mechanismInventorySha256({
    mechanismInventory
  });
  const canonicalPayloadByteCount =
    mechanismInventoryCanonicalPayloadByteCount(mechanismInventory);
  const retainedForms = [
    ...new Set(
      researchRecord.retainedForms
        .map((record) => record?.documentId)
        .filter((documentId) => typeof documentId === "string" && documentId)
    )
  ].sort();

  return {
    schemaVersion: NORMALIZATION_READINESS_BUNDLE_SCHEMA,
    authorityEdition: "1.2",
    jurisdiction,
    controllingReviewAssetPath: reviewAsset.canonicalRelativePath,
    controllingReviewSha256: reviewAsset.sha256,
    controllingReviewStatus: "checksum_verified",
    controllingReviewRevision: reviewAsset.revision,
    reviewedThrough: researchRecord.reviewedThrough,
    reviewDateEvidence: {
      filenameAsOf: reviewedThroughForRevision(reviewAsset.revision),
      internalReviewDate: researchRecord.reviewedThrough,
      status: "reconciled"
    },
    legalReviewPrecedence: ORIGINAL_REVIEW_PRECEDENCE,
    precedenceStatus: "resolved",
    reviewMaterialization: {
      archiveLocator: authorityArchive.portableLocator,
      archiveSha256: authorityArchive.sha256,
      archiveEntryPath: reviewAsset.canonicalRelativePath,
      expectedSha256: reviewAsset.sha256,
      expectedBytes: null,
      observedSha256: reviewAsset.sha256,
      observedBytes: null,
      materializationMethod: "portable_archive_entry",
      materializationDestination: materializationDestinationFor(
        jurisdiction,
        reviewAsset.canonicalRelativePath
      ),
      materializationState: "binary_materialization_required",
      readOnly: true,
      readOnlyTreatment: "worker_read_only_no_modify",
      verificationCommand:
        `node scripts/verify-rcap-normalization-readiness.mjs --jurisdiction ${jurisdiction}`,
      verificationProvenance:
        "carried_forward_session_b_research_measurement",
      researchVerificationResult:
        "review_hash_reported_verified_in_research_codespace",
      verificationStatus: "expected_byte_count_required",
      cleanupPolicy:
        "captain_managed_cleanup_after_normalization_worker_integration"
    },
    mechanismInventory,
    expectedReviewSlots: expectedSourceIds,
    expectedSourceIds,
    canonicalizationVersion: MECHANISM_INVENTORY_CANONICALIZATION_VERSION,
    researchSuppliedInventorySha256,
    canonicalMechanismInventorySha256,
    canonicalPayloadByteCount,
    mechanismInventorySha256: canonicalMechanismInventorySha256,
    denominatorAdjudication: {
      status: "keyed_denominator_reconciled",
      reviewSummaryCount: mechanismInventory.length,
      keyedBodyCount: mechanismInventory.length,
      resolution: "accepted_unique_research_mechanisms",
      unresolvedQuestion: null
    },
    retainedForms,
    retainedFormAvailability: ["NV", "OH", "OK"].includes(jurisdiction)
      ? "official_form_availability_unknown_or_none"
      : "retained_form_assets_recorded",
    openQuestions: [...researchRecord.reviewOpenQuestions].sort(),
    officialAuthorityRefreshStatus: "recorded",
    officialAuthorityRefreshRequirements: [
      {
        officialUrl: null,
        issuingDomain: null,
        sectionIdentifier: `${jurisdiction} current primary authority`,
        retrievalMethod: "official_url_discovery_required",
        retrievalDate: null,
        capturedSourceSha256: null,
        retrievalState: "unavailable",
        alternateOfficialRetrievalChannel:
          "Normalize the research refresh notes into exact official shell or browser retrievals and capture content hashes before adopting conclusions."
      }
    ],
    authorityRefreshFlags: ["official_authority_refresh_required"],
    retrievalMethods: [
      {
        method: "portable_archive_entry",
        locator: authorityArchive.portableLocator,
        issuingDomain: "integration-provided-authority-archive",
        status: "binary_materialization_required",
        alternateOfficialRetrievalChannel: null
      }
    ],
    portableArchiveLocator: authorityArchive.portableLocator,
    researchEvidence: {
      session: descriptor.session,
      sourceCommit: descriptor.sourceCommit,
      bundlePath: descriptor.bundlePath,
      bundleSha256: descriptor.bundleSha256,
      legalReviewPrecedence: researchRecord.legalReviewPrecedence,
      authorityRefreshRequirementCount:
        researchRecord.officialAuthorityRefreshRequirements.length,
      researchHashAlgorithm:
        "sha256(compact recursively-key-sorted research mechanismInventory JSON)"
    }
  };
}

function buildSessionDNormalizationBundle({
  descriptor,
  researchRecord,
  reviewAsset,
  authorityArchive
}) {
  const jurisdiction = researchRecord.jurisdiction;
  if (
    researchRecord.controllingReviewAssetPath !==
      reviewAsset.canonicalRelativePath ||
    researchRecord.controllingReviewSha256 !== reviewAsset.sha256
  ) {
    throw new Error(
      `${jurisdiction} research review identity does not match Edition 1.2.`
    );
  }
  const mechanismInventory = researchRecord.mechanismKeys.map((sourceId) => ({
    sourceId
  }));
  const canonicalMechanismInventorySha256 = mechanismInventorySha256({
    mechanismInventory
  });
  const canonicalPayloadByteCount =
    mechanismInventoryCanonicalPayloadByteCount(mechanismInventory);
  const researchSuppliedInventorySha256 =
    researchRecord.mechanismInventorySha256;
  const computedResearchHash = sessionDResearchInventorySha256({
    jurisdiction,
    controllingReviewSha256: reviewAsset.sha256,
    mechanismKeys: researchRecord.mechanismKeys
  });
  if (computedResearchHash !== researchSuppliedInventorySha256) {
    throw new Error(
      `${jurisdiction} research-supplied inventory SHA-256 does not reproduce.`
    );
  }

  const denominatorAdjudication =
    sessionDDenominatorAdjudication(researchRecord);
  const reviewDateEvidence = sessionDReviewDateEvidence(researchRecord);
  const officialAuthority = sessionDAuthorityRequirements(researchRecord);
  const openQuestions = [
    ...(denominatorAdjudication.unresolvedQuestion
      ? [denominatorAdjudication.unresolvedQuestion]
      : []),
    ...(reviewDateEvidence.status === "conflict"
      ? [
          `Preserve both reviewed-through values: filename ${reviewDateEvidence.filenameAsOf}; ` +
            `internal header ${reviewDateEvidence.internalReviewDate}.`
        ]
      : [])
  ];

  return {
    schemaVersion: NORMALIZATION_READINESS_BUNDLE_SCHEMA,
    authorityEdition: "1.2",
    jurisdiction,
    controllingReviewAssetPath: reviewAsset.canonicalRelativePath,
    controllingReviewSha256: reviewAsset.sha256,
    controllingReviewStatus: "checksum_verified",
    controllingReviewRevision: reviewAsset.revision,
    reviewedThrough: reviewDateEvidence.internalReviewDate,
    reviewDateEvidence,
    legalReviewPrecedence: ORIGINAL_REVIEW_PRECEDENCE,
    precedenceStatus: "resolved",
    reviewMaterialization: {
      archiveLocator: authorityArchive.portableLocator,
      archiveSha256: authorityArchive.sha256,
      archiveEntryPath: reviewAsset.canonicalRelativePath,
      expectedSha256: reviewAsset.sha256,
      expectedBytes: null,
      observedSha256: reviewAsset.sha256,
      observedBytes: null,
      materializationMethod: "portable_archive_entry",
      materializationDestination: materializationDestinationFor(
        jurisdiction,
        reviewAsset.canonicalRelativePath
      ),
      materializationState: "binary_materialization_required",
      readOnly: true,
      readOnlyTreatment: "worker_read_only_no_modify",
      verificationCommand:
        `node scripts/verify-rcap-normalization-readiness.mjs --jurisdiction ${jurisdiction}`,
      verificationProvenance:
        "carried_forward_session_d_research_measurement",
      researchVerificationResult:
        "raw_review_hash_matched_edition_1_2_checksums_in_research_codespace",
      verificationStatus: "expected_byte_count_required",
      cleanupPolicy:
        "captain_managed_cleanup_after_normalization_worker_integration"
    },
    mechanismInventory,
    expectedReviewSlots: mechanismInventory.map((row) => row.sourceId),
    expectedSourceIds: mechanismInventory.map((row) => row.sourceId),
    canonicalizationVersion: MECHANISM_INVENTORY_CANONICALIZATION_VERSION,
    researchSuppliedInventorySha256,
    canonicalMechanismInventorySha256,
    canonicalPayloadByteCount,
    mechanismInventorySha256: canonicalMechanismInventorySha256,
    denominatorAdjudication,
    retainedForms: [...researchRecord.expectedSourceIds].sort(),
    retainedFormAvailability:
      researchRecord.expectedSourceIds.length === 0
        ? "official_form_availability_unknown_or_none"
        : "retained_form_assets_recorded",
    openQuestions,
    officialAuthorityRefreshStatus: "recorded",
    officialAuthorityRefreshRequirements: officialAuthority.requirements,
    authorityRefreshFlags: officialAuthority.flags,
    retrievalMethods: [
      {
        method: "portable_archive_entry",
        locator: authorityArchive.portableLocator,
        issuingDomain: "integration-provided-authority-archive",
        status: "binary_materialization_required",
        alternateOfficialRetrievalChannel: null
      }
    ],
    portableArchiveLocator: authorityArchive.portableLocator,
    researchEvidence: {
      session: descriptor.session,
      sourceCommit: descriptor.sourceCommit,
      bundlePath: descriptor.bundlePath,
      bundleSha256: descriptor.bundleSha256,
      researchHashAlgorithm:
        "sha256(jurisdiction + newline + reviewSha256 + newline + ordered sourceIds + newline)"
    }
  };
}

export function validateNormalizationReadinessInput({
  input,
  authority,
  repositoryAssetAudit,
  claims
}) {
  const issues = [];
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    input.schemaVersion !== NORMALIZATION_READINESS_INPUT_SCHEMA
  ) {
    return {
      ok: false,
      issues: [
        `normalization readiness input schemaVersion must equal ${NORMALIZATION_READINESS_INPUT_SCHEMA}.`
      ]
    };
  }

  if (String(input.authorityEdition) !== String(authority?.edition)) {
    issues.push(
      `normalization readiness authorityEdition ${input.authorityEdition ?? "missing"} ` +
        `does not match adopted Edition ${authority?.edition ?? "missing"}.`
    );
  }
  if (
    input.canonicalizationVersion !==
    MECHANISM_INVENTORY_CANONICALIZATION_VERSION
  ) {
    issues.push(
      "normalization readiness canonicalizationVersion must be mechanism-inventory-v1."
    );
  }
  validateAuthorityArchive(input.authorityArchive, authority, issues);

  const expected = canonicalStringArray(
    input.expectedJurisdictions,
    "expectedJurisdictions"
  );
  if (
    canonicalStringify(expected) !==
    canonicalStringify(REMAINING_NORMALIZATION_JURISDICTIONS)
  ) {
    issues.push(
      "expectedJurisdictions must contain the exact 24 remaining non-Pennsylvania jurisdictions."
    );
  }

  validateReservationPartition(input.bundleOwners, expected, issues);

  const reviewAssets = legalReviewAssetsByJurisdiction(repositoryAssetAudit);
  for (const jurisdiction of expected) {
    const assets = reviewAssets.get(jurisdiction) ?? [];
    if (assets.length !== 1) {
      issues.push(
        `${jurisdiction} must have exactly one committed active legal review; found ${assets.length}.`
      );
    }
  }
  validateReviewIdentityConfirmations(
    input.reviewIdentityConfirmations,
    reviewAssets,
    issues
  );

  const bundles = Array.isArray(input.bundles) ? input.bundles : [];
  if (!Array.isArray(input.bundles)) {
    issues.push("bundles must be an array.");
  }
  const seenBundles = new Set();
  for (const bundle of bundles) {
    const jurisdiction = bundle?.jurisdiction;
    if (!expected.includes(jurisdiction)) {
      issues.push(
        `normalization bundle names unexpected jurisdiction ${jurisdiction ?? "missing"}.`
      );
      continue;
    }
    if (seenBundles.has(jurisdiction)) {
      issues.push(`normalization bundle duplicates jurisdiction ${jurisdiction}.`);
      continue;
    }
    seenBundles.add(jurisdiction);
    const asset = (reviewAssets.get(jurisdiction) ?? [])[0];
    const inspection = inspectNormalizationBundle({
      bundle,
      authorityEdition: String(input.authorityEdition),
      authorityArchive: input.authorityArchive,
      reviewAsset: asset
    });
    issues.push(
      ...inspection.issues
        .filter((issue) => !isRecordedReadinessBlockerIssue(issue))
        .map((issue) => `${jurisdiction}: ${issue}`)
    );
  }

  const claimValidation = validateFactoryJobClaims(claims);
  issues.push(...claimValidation.issues);

  return { ok: issues.length === 0, issues };
}

export function inspectNormalizationBundle({
  bundle,
  authorityEdition,
  authorityArchive,
  reviewAsset
}) {
  const issues = [];
  if (
    !bundle ||
    typeof bundle !== "object" ||
    Array.isArray(bundle) ||
    bundle.schemaVersion !== NORMALIZATION_READINESS_BUNDLE_SCHEMA
  ) {
    return {
      ok: false,
      issues: [
        `bundle schemaVersion must equal ${NORMALIZATION_READINESS_BUNDLE_SCHEMA}.`
      ]
    };
  }

  const jurisdiction = bundle.jurisdiction;
  if (!JURISDICTION_PATTERN.test(jurisdiction ?? "")) {
    issues.push("jurisdiction must be a two-letter uppercase code.");
  }
  if (String(bundle.authorityEdition) !== String(authorityEdition)) {
    issues.push("authorityEdition does not match the readiness input.");
  }
  if (!reviewAsset) {
    issues.push("the committed authority audit has no controlling review asset.");
  } else {
    if (
      bundle.controllingReviewAssetPath !==
      reviewAsset.canonicalRelativePath
    ) {
      issues.push("controllingReviewAssetPath does not match Edition 1.2.");
    }
    if (bundle.controllingReviewSha256 !== reviewAsset.sha256) {
      issues.push("controllingReviewSha256 does not match Edition 1.2.");
    }
    if (bundle.controllingReviewRevision !== reviewAsset.revision) {
      issues.push("controllingReviewRevision does not match Edition 1.2.");
    }
  }
  if (bundle.controllingReviewStatus !== "checksum_verified") {
    issues.push("controllingReviewStatus must be checksum_verified.");
  }
  if (!DATE_PATTERN.test(bundle.reviewedThrough ?? "")) {
    issues.push("reviewedThrough must be YYYY-MM-DD.");
  }
  if (reviewAsset) {
    const revisionDate = reviewedThroughForRevision(reviewAsset.revision);
    if (bundle.reviewDateEvidence) {
      if (
        bundle.reviewDateEvidence.filenameAsOf !== revisionDate ||
        bundle.reviewDateEvidence.internalReviewDate !== bundle.reviewedThrough
      ) {
        issues.push(
          "reviewDateEvidence does not reconcile the review revision and internal date."
        );
      }
    } else if (bundle.reviewedThrough !== revisionDate) {
      issues.push(
        "reviewedThrough does not match the controlling review revision."
      );
    }
  }
  if (
    typeof bundle.legalReviewPrecedence !== "string" ||
    bundle.legalReviewPrecedence.trim().length === 0
  ) {
    issues.push("legalReviewPrecedence must be a non-empty string.");
  } else if (bundle.legalReviewPrecedence !== ORIGINAL_REVIEW_PRECEDENCE) {
    issues.push(
      "legalReviewPrecedence must preserve the original active review when no addendum exists."
    );
  }
  if (bundle.precedenceStatus !== "resolved") {
    issues.push("precedenceStatus must be resolved.");
  }

  validateReviewMaterialization(
    bundle.reviewMaterialization,
    authorityArchive,
    reviewAsset,
    jurisdiction,
    issues
  );

  let inventory = [];
  try {
    inventory = canonicalizeMechanismInventory(bundle.mechanismInventory);
  } catch (error) {
    issues.push(error.message);
  }
  if (inventory.length === 0) {
    issues.push("mechanismInventory must contain at least one reviewed slot.");
  }
  const expectedReviewSlots = safeCanonicalStringArray(
    bundle.expectedReviewSlots,
    "expectedReviewSlots",
    issues
  );
  const actualReviewSlots = inventory
    .map((row) => row.reviewSlot ?? row.sourceId)
    .sort();
  if (
    expectedReviewSlots.length === 0 ||
    canonicalStringify(expectedReviewSlots) !==
      canonicalStringify(actualReviewSlots)
  ) {
    issues.push(
      "expectedReviewSlots must reconcile exactly to the mechanism inventory."
    );
  }

  const expectedSourceIds = safeCanonicalStringArray(
    bundle.expectedSourceIds,
    "expectedSourceIds",
    issues
  );
  const inventorySourceIds = inventory.map((row) => row.sourceId).sort();
  if (
    expectedSourceIds.length === 0 ||
    canonicalStringify(expectedSourceIds) !==
      canonicalStringify(inventorySourceIds)
  ) {
    issues.push(
      "expectedSourceIds must reconcile exactly to the mechanism inventory."
    );
  }

  if (reviewAsset && inventory.length > 0) {
    const actualHash = mechanismInventorySha256({
      mechanismInventory: inventory
    });
    if (bundle.mechanismInventorySha256 !== actualHash) {
      issues.push("mechanismInventorySha256 does not match the canonical inventory.");
    }
    if (
      bundle.canonicalMechanismInventorySha256 !== undefined &&
      bundle.canonicalMechanismInventorySha256 !== actualHash
    ) {
      issues.push(
        "canonicalMechanismInventorySha256 does not match the canonical inventory."
      );
    }
    if (
      bundle.canonicalizationVersion !== undefined &&
      bundle.canonicalizationVersion !==
        MECHANISM_INVENTORY_CANONICALIZATION_VERSION
    ) {
      issues.push("canonicalizationVersion is not mechanism-inventory-v1.");
    }
    if (
      bundle.canonicalPayloadByteCount !== undefined &&
      bundle.canonicalPayloadByteCount !==
        mechanismInventoryCanonicalPayloadByteCount(inventory)
    ) {
      issues.push(
        "canonicalPayloadByteCount does not match the canonical inventory bytes."
      );
    }
  } else if (!SHA256_PATTERN.test(bundle.mechanismInventorySha256 ?? "")) {
    issues.push("mechanismInventorySha256 must be a lowercase SHA-256.");
  }
  if (
    bundle.researchSuppliedInventorySha256 !== undefined &&
    !SHA256_PATTERN.test(bundle.researchSuppliedInventorySha256)
  ) {
    issues.push(
      "researchSuppliedInventorySha256 must be a lowercase SHA-256."
    );
  }
  if (
    bundle.denominatorAdjudication?.status === "count_conflict_unresolved"
  ) {
    issues.push("mechanism inventory denominator has an unresolved count conflict.");
  }

  safeCanonicalStringArray(bundle.retainedForms, "retainedForms", issues);
  safeCanonicalStringArray(bundle.openQuestions, "openQuestions", issues);
  if (bundle.officialAuthorityRefreshStatus !== "recorded") {
    issues.push("officialAuthorityRefreshStatus must be recorded.");
  }
  validateAuthorityRefreshRequirements(
    bundle.officialAuthorityRefreshRequirements,
    issues
  );
  validateRetrievalMethods(bundle.retrievalMethods, issues);
  rejectAbsoluteWorkspacePaths(bundle, "bundle", issues);

  return { ok: issues.length === 0, issues };
}

export function buildNormalizationReadinessRecords({
  input,
  authority,
  repositoryAssetAudit,
  claims,
  outstandingJurisdictions
}) {
  const validation = validateNormalizationReadinessInput({
    input,
    authority,
    repositoryAssetAudit,
    claims
  });
  if (!validation.ok) {
    throw new Error(
      `Invalid normalization readiness integration input:\n- ${validation.issues.join(
        "\n- "
      )}`
    );
  }

  const bundles = new Map(
    (input.bundles ?? []).map((bundle) => [bundle.jurisdiction, bundle])
  );
  const reviews = legalReviewAssetsByJurisdiction(repositoryAssetAudit);
  const claimsByJobId = new Map(
    (claims.claims ?? [])
      .filter((claim) => claim.targetType === "compiled_job")
      .map((claim) => [claim.jobId, claim])
  );
  const records = new Map();

  for (const jurisdiction of [...outstandingJurisdictions].sort()) {
    const reviewAssets = reviews.get(jurisdiction) ?? [];
    if (reviewAssets.length !== 1) {
      throw new Error(
        `${jurisdiction} must resolve exactly one controlling legal review; found ${reviewAssets.length}.`
      );
    }
    const reviewAsset = reviewAssets[0];
    const jobId = normalizationJobId(jurisdiction);
    const claim = claimsByJobId.get(jobId) ?? null;
    const bundle = bundles.get(jurisdiction) ?? null;
    const record = deriveNormalizationReadinessRecord({
      jurisdiction,
      authorityEdition: String(input.authorityEdition),
      authorityArchive: input.authorityArchive,
      reviewAsset,
      bundle,
      claim
    });
    records.set(jurisdiction, record);
  }

  return records;
}

export function deriveNormalizationReadinessRecord({
  jurisdiction,
  authorityEdition,
  authorityArchive,
  reviewAsset,
  bundle,
  claim
}) {
  const reviewedThrough = reviewedThroughForRevision(reviewAsset.revision);
  const base = {
    schemaVersion: NORMALIZATION_READINESS_RECORD_SCHEMA,
    authorityEdition: String(authorityEdition),
    jurisdiction,
    controllingReviewAssetPath: reviewAsset.canonicalRelativePath,
    controllingReviewSha256: reviewAsset.sha256,
    controllingReviewStatus: "authority_asset_known",
    controllingReviewRevision: reviewAsset.revision,
    reviewedThrough,
    reviewDateEvidence: {
      filenameAsOf: reviewedThrough,
      internalReviewDate: reviewedThrough,
      status: "reconciled"
    },
    legalReviewPrecedence: ORIGINAL_REVIEW_PRECEDENCE,
    precedenceStatus: "resolved",
    mechanismInventory: [],
    mechanismInventorySha256: null,
    canonicalizationVersion: MECHANISM_INVENTORY_CANONICALIZATION_VERSION,
    researchSuppliedInventorySha256: null,
    canonicalMechanismInventorySha256: null,
    canonicalPayloadByteCount: null,
    denominatorAdjudication: {
      status: "mechanism_inventory_required",
      reviewSummaryCount: null,
      keyedBodyCount: null,
      resolution: null,
      unresolvedQuestion: "Materialize the controlling review denominator."
    },
    expectedSourceIds: [],
    retainedForms: [],
    retainedFormAvailability: "not_yet_reconciled",
    openQuestions: [],
    officialAuthorityRefreshRequirements: [],
    officialAuthorityRefreshStatus: "required",
    authorityRefreshFlags: [],
    retrievalMethods: [
      {
        method: "portable_archive_entry",
        locator: authorityArchive.portableLocator,
        issuingDomain: "integration-provided-authority-archive",
        status: "binary_materialization_required",
        alternateOfficialRetrievalChannel: null
      }
    ],
    reviewMaterialization: {
      archiveLocator: authorityArchive.portableLocator,
      archiveSha256: authorityArchive.sha256,
      archiveEntryPath: reviewAsset.canonicalRelativePath,
      expectedSha256: reviewAsset.sha256,
      expectedBytes: null,
      observedSha256: null,
      observedBytes: null,
      materializationMethod: "portable_archive_entry",
      materializationDestination: materializationDestinationFor(
        jurisdiction,
        reviewAsset.canonicalRelativePath
      ),
      materializationState: "binary_materialization_required",
      readOnly: true,
      readOnlyTreatment: "worker_read_only_no_modify",
      verificationCommand:
        `node scripts/verify-rcap-normalization-readiness.mjs --jurisdiction ${jurisdiction}`,
      verificationProvenance: "not_yet_verified_in_worker_codespace",
      researchVerificationResult: "not_available",
      verificationStatus: "expected_byte_count_required",
      cleanupPolicy:
        "captain_managed_cleanup_after_normalization_worker_integration"
    },
    portableArchiveLocator: authorityArchive.portableLocator,
    readinessState: "legal_review_materialization_required",
    readinessBlockers: [
      "legal_review_materialization_required",
      "mechanism_inventory_required",
      "expected_source_ids_required",
      "official_authority_refresh_required"
    ]
  };

  if (bundle) {
    const inspection = inspectNormalizationBundle({
      bundle,
      authorityEdition,
      authorityArchive,
      reviewAsset
    });
    const blockers = blockersForBundleInspection(bundle, inspection.issues);
    const record = {
      ...base,
      controllingReviewStatus:
        blockers.includes("legal_review_hash_mismatch")
          ? "legal_review_hash_mismatch"
          : bundle.controllingReviewStatus,
      reviewedThrough: bundle.reviewedThrough,
      reviewDateEvidence:
        bundle.reviewDateEvidence ?? base.reviewDateEvidence,
      legalReviewPrecedence: bundle.legalReviewPrecedence,
      precedenceStatus: bundle.precedenceStatus,
      mechanismInventory: canonicalizeMechanismInventory(
        bundle.mechanismInventory ?? []
      ),
      mechanismInventorySha256: bundle.mechanismInventorySha256 ?? null,
      canonicalizationVersion:
        bundle.canonicalizationVersion ??
        MECHANISM_INVENTORY_CANONICALIZATION_VERSION,
      researchSuppliedInventorySha256:
        bundle.researchSuppliedInventorySha256 ?? null,
      canonicalMechanismInventorySha256:
        bundle.canonicalMechanismInventorySha256 ??
        bundle.mechanismInventorySha256 ??
        null,
      canonicalPayloadByteCount:
        bundle.canonicalPayloadByteCount ?? null,
      denominatorAdjudication:
        bundle.denominatorAdjudication ?? base.denominatorAdjudication,
      expectedSourceIds: [...(bundle.expectedSourceIds ?? [])].sort(),
      retainedForms: [...(bundle.retainedForms ?? [])].sort(),
      retainedFormAvailability:
        bundle.retainedFormAvailability ??
        (bundle.retainedForms?.length > 0
          ? "retained_form_assets_recorded"
          : "official_form_availability_unknown_or_none"),
      openQuestions: [...(bundle.openQuestions ?? [])].sort(),
      officialAuthorityRefreshRequirements:
        bundle.officialAuthorityRefreshRequirements ?? [],
      officialAuthorityRefreshStatus:
        bundle.officialAuthorityRefreshStatus ?? "required",
      authorityRefreshFlags: [...(bundle.authorityRefreshFlags ?? [])].sort(),
      retrievalMethods: bundle.retrievalMethods ?? [],
      reviewMaterialization:
        bundle.reviewMaterialization ?? base.reviewMaterialization,
      readinessState:
        blockers.length === 0
          ? "ready_for_normalization"
          : firstReadinessBlocker(blockers),
      readinessBlockers: blockers
    };
    return canonicalizeObject(record);
  }

  if (claim?.status === "in_progress") {
    return canonicalizeObject({
      ...base,
      readinessState: "normalization_in_progress",
      readinessBlockers: [
        ...base.readinessBlockers,
        "active_assignment_predates_readiness_materialization_contract"
      ]
    });
  }

  return canonicalizeObject(base);
}

export function normalizationFoundationComplete(input) {
  const expected = new Set(REMAINING_NORMALIZATION_JURISDICTIONS);
  const bundles = input?.bundles ?? [];
  const received = new Set(
    bundles.map((bundle) => bundle?.jurisdiction).filter(Boolean)
  );
  return (
    received.size === expected.size &&
    [...expected].every((jurisdiction) => received.has(jurisdiction)) &&
    bundles.every((bundle) => {
      const receipt = bundle?.reviewMaterialization;
      return (
        bundle?.denominatorAdjudication?.status !==
          "mechanism_inventory_count_conflict" &&
        receipt?.materializationState === "binary_hash_verified" &&
        receipt?.verificationStatus === "verified" &&
        Number.isInteger(receipt?.expectedBytes) &&
        receipt.expectedBytes > 0 &&
        receipt.observedBytes === receipt.expectedBytes &&
        receipt.observedSha256 === receipt.expectedSha256
      );
    })
  );
}

export function validateNormalizationReadinessRecord(record) {
  const issues = [];
  const requiredFields = [
    "schemaVersion",
    "authorityEdition",
    "jurisdiction",
    "controllingReviewAssetPath",
    "controllingReviewSha256",
    "controllingReviewStatus",
    "controllingReviewRevision",
    "reviewedThrough",
    "reviewDateEvidence",
    "legalReviewPrecedence",
    "precedenceStatus",
    "mechanismInventory",
    "mechanismInventorySha256",
    "canonicalizationVersion",
    "researchSuppliedInventorySha256",
    "canonicalMechanismInventorySha256",
    "canonicalPayloadByteCount",
    "denominatorAdjudication",
    "expectedSourceIds",
    "retainedForms",
    "retainedFormAvailability",
    "openQuestions",
    "officialAuthorityRefreshRequirements",
    "officialAuthorityRefreshStatus",
    "authorityRefreshFlags",
    "retrievalMethods",
    "reviewMaterialization",
    "portableArchiveLocator",
    "readinessState",
    "readinessBlockers"
  ];
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return { ok: false, issues: ["normalizationReadiness must be an object."] };
  }
  for (const field of requiredFields) {
    if (!Object.hasOwn(record, field)) {
      issues.push(`normalizationReadiness is missing ${field}.`);
    }
  }
  if (record.schemaVersion !== NORMALIZATION_READINESS_RECORD_SCHEMA) {
    issues.push(
      `normalizationReadiness.schemaVersion must equal ${NORMALIZATION_READINESS_RECORD_SCHEMA}.`
    );
  }
  if (!JURISDICTION_PATTERN.test(record.jurisdiction ?? "")) {
    issues.push("normalizationReadiness.jurisdiction is invalid.");
  }
  if (!NORMALIZATION_READINESS_STATES.includes(record.readinessState)) {
    issues.push("normalizationReadiness.readinessState is invalid.");
  }
  if (
    ![
      "authority_asset_known",
      "checksum_verified",
      "legal_review_hash_mismatch",
      "authority_archive_inconsistent"
    ].includes(record.controllingReviewStatus)
  ) {
    issues.push("normalizationReadiness.controllingReviewStatus is invalid.");
  }
  if (
    typeof record.controllingReviewAssetPath !== "string" ||
    record.controllingReviewAssetPath.trim().length === 0
  ) {
    issues.push(
      "normalizationReadiness.controllingReviewAssetPath must be non-empty."
    );
  }
  if (!SHA256_PATTERN.test(record.controllingReviewSha256 ?? "")) {
    issues.push(
      "normalizationReadiness.controllingReviewSha256 must be a lowercase SHA-256."
    );
  }
  if (!/^ASOF-\d{4}-\d{2}-\d{2}$/.test(record.controllingReviewRevision ?? "")) {
    issues.push(
      "normalizationReadiness.controllingReviewRevision must be ASOF-YYYY-MM-DD."
    );
  }
  if (!DATE_PATTERN.test(record.reviewedThrough ?? "")) {
    issues.push("normalizationReadiness.reviewedThrough must be YYYY-MM-DD.");
  }
  if (
    !record.reviewDateEvidence ||
    typeof record.reviewDateEvidence !== "object" ||
    Array.isArray(record.reviewDateEvidence) ||
    !DATE_PATTERN.test(record.reviewDateEvidence.filenameAsOf ?? "") ||
    !DATE_PATTERN.test(record.reviewDateEvidence.internalReviewDate ?? "") ||
    !["reconciled", "conflict"].includes(record.reviewDateEvidence.status)
  ) {
    issues.push("normalizationReadiness.reviewDateEvidence is invalid.");
  }
  if (
    typeof record.legalReviewPrecedence !== "string" ||
    record.legalReviewPrecedence.trim().length === 0
  ) {
    issues.push(
      "normalizationReadiness.legalReviewPrecedence must be non-empty."
    );
  }
  if (record.precedenceStatus !== "resolved") {
    issues.push("normalizationReadiness.precedenceStatus must be resolved.");
  }

  let canonicalInventory = [];
  try {
    canonicalInventory = canonicalizeMechanismInventory(
      record.mechanismInventory
    );
  } catch (error) {
    issues.push(error.message);
  }
  if (canonicalInventory.length === 0) {
    if (record.mechanismInventorySha256 !== null) {
      issues.push(
        "normalizationReadiness.mechanismInventorySha256 must be null when the inventory is empty."
      );
    }
  } else if (!SHA256_PATTERN.test(record.mechanismInventorySha256 ?? "")) {
    issues.push(
      "normalizationReadiness.mechanismInventorySha256 must be a lowercase SHA-256."
    );
  } else {
    const canonicalHash = mechanismInventorySha256({
      mechanismInventory: canonicalInventory
    });
    if (record.mechanismInventorySha256 !== canonicalHash) {
      issues.push(
        "normalizationReadiness.mechanismInventorySha256 does not match canonical rows."
      );
    }
    if (record.canonicalMechanismInventorySha256 !== canonicalHash) {
      issues.push(
        "normalizationReadiness.canonicalMechanismInventorySha256 does not match canonical rows."
      );
    }
    if (
      record.canonicalPayloadByteCount !==
      mechanismInventoryCanonicalPayloadByteCount(canonicalInventory)
    ) {
      issues.push(
        "normalizationReadiness.canonicalPayloadByteCount does not match canonical bytes."
      );
    }
  }
  if (
    record.canonicalizationVersion !==
    MECHANISM_INVENTORY_CANONICALIZATION_VERSION
  ) {
    issues.push(
      "normalizationReadiness.canonicalizationVersion must be mechanism-inventory-v1."
    );
  }
  if (
    record.researchSuppliedInventorySha256 !== null &&
    !SHA256_PATTERN.test(record.researchSuppliedInventorySha256 ?? "")
  ) {
    issues.push(
      "normalizationReadiness.researchSuppliedInventorySha256 must be null or SHA-256."
    );
  }
  if (
    !record.denominatorAdjudication ||
    typeof record.denominatorAdjudication !== "object" ||
    Array.isArray(record.denominatorAdjudication)
  ) {
    issues.push("normalizationReadiness.denominatorAdjudication is invalid.");
  }
  safeCanonicalStringArray(
    record.expectedSourceIds,
    "normalizationReadiness.expectedSourceIds",
    issues
  );
  safeCanonicalStringArray(
    record.retainedForms,
    "normalizationReadiness.retainedForms",
    issues
  );
  safeCanonicalStringArray(
    record.openQuestions,
    "normalizationReadiness.openQuestions",
    issues
  );
  safeCanonicalStringArray(
    record.authorityRefreshFlags,
    "normalizationReadiness.authorityRefreshFlags",
    issues
  );
  safeCanonicalStringArray(
    record.readinessBlockers,
    "normalizationReadiness.readinessBlockers",
    issues
  );
  validateAuthorityRefreshRequirements(
    record.officialAuthorityRefreshRequirements,
    issues
  );
  validateRetrievalMethods(record.retrievalMethods, issues);

  if (
    !record.reviewMaterialization ||
    typeof record.reviewMaterialization !== "object" ||
    Array.isArray(record.reviewMaterialization)
  ) {
    issues.push("normalizationReadiness.reviewMaterialization must be an object.");
  } else {
    const materialization = record.reviewMaterialization;
    if (
      ![
        "binary_materialization_required",
        "binary_hash_verified",
        "binary_hash_mismatch",
        "binary_unavailable"
      ].includes(materialization.materializationState)
    ) {
      issues.push(
        "normalizationReadiness.reviewMaterialization.materializationState is invalid."
      );
    }
    if (materialization.readOnly !== true) {
      issues.push(
        "normalizationReadiness.reviewMaterialization.readOnly must be true."
      );
    }
    if (
      typeof materialization.materializationDestination !== "string" ||
      !materialization.materializationDestination.startsWith(
        `${MATERIALIZATION_PREFIX}/`
      )
    ) {
      issues.push(
        "normalizationReadiness.reviewMaterialization.materializationDestination is invalid."
      );
    }
    if (
      typeof materialization.verificationCommand !== "string" ||
      materialization.verificationCommand.trim().length === 0
    ) {
      issues.push(
        "normalizationReadiness.reviewMaterialization.verificationCommand is required."
      );
    }
    if (
      materialization.expectedBytes !== null &&
      (!Number.isSafeInteger(materialization.expectedBytes) ||
        materialization.expectedBytes <= 0)
    ) {
      issues.push(
        "normalizationReadiness.reviewMaterialization.expectedBytes is invalid."
      );
    }
  }

  if (
    typeof record.portableArchiveLocator !== "string" ||
    !record.portableArchiveLocator.startsWith(PORTABLE_ARCHIVE_SCHEME)
  ) {
    issues.push(
      "normalizationReadiness.portableArchiveLocator must be portable."
    );
  }
  rejectAbsoluteWorkspacePaths(record, "normalizationReadiness", issues);

  if (record.readinessState === "ready_for_normalization") {
    if (record.controllingReviewStatus !== "checksum_verified") {
      issues.push(
        "ready_for_normalization requires a checksum-verified controlling review."
      );
    }
    if (
      record.reviewMaterialization?.materializationState !==
      "binary_hash_verified"
    ) {
      issues.push(
        "ready_for_normalization requires a hash-verified materialized review."
      );
    }
    if (
      canonicalInventory.length === 0 ||
      !SHA256_PATTERN.test(record.mechanismInventorySha256 ?? "")
    ) {
      issues.push(
        "ready_for_normalization requires a hash-bound mechanism inventory."
      );
    }
    if (
      canonicalInventory.length > 0 &&
      SHA256_PATTERN.test(record.controllingReviewSha256 ?? "") &&
      record.mechanismInventorySha256 !==
        mechanismInventorySha256({
          mechanismInventory: canonicalInventory
        })
    ) {
      issues.push(
        "ready_for_normalization mechanismInventorySha256 does not match canonical rows."
      );
    }
    if (
      (record.expectedSourceIds?.length ?? 0) === 0 ||
      canonicalStringify(record.expectedSourceIds) !==
        canonicalStringify(canonicalInventory.map((row) => row.sourceId).sort())
    ) {
      issues.push(
        "ready_for_normalization requires expected source IDs to reconcile exactly."
      );
    }
    if (record.officialAuthorityRefreshStatus !== "recorded") {
      issues.push(
        "ready_for_normalization requires recorded authority-refresh requirements."
      );
    }
    if ((record.readinessBlockers?.length ?? 0) !== 0) {
      issues.push("ready_for_normalization may not carry readiness blockers.");
    }
    if (
      !Number.isSafeInteger(record.reviewMaterialization?.expectedBytes) ||
      record.reviewMaterialization.expectedBytes <= 0 ||
      record.reviewMaterialization.observedBytes !==
        record.reviewMaterialization.expectedBytes ||
      record.reviewMaterialization.verificationStatus !==
        "binary_hash_and_size_verified"
    ) {
      issues.push(
        "ready_for_normalization requires a hash-and-size-verified review receipt."
      );
    }
  }

  return { ok: issues.length === 0, issues };
}

export function validateFactoryJobClaims(claims) {
  const issues = [];
  if (
    !claims ||
    typeof claims !== "object" ||
    Array.isArray(claims) ||
    claims.schemaVersion !== NORMALIZATION_JOB_CLAIMS_SCHEMA
  ) {
    return {
      ok: false,
      issues: [
        `job claims schemaVersion must equal ${NORMALIZATION_JOB_CLAIMS_SCHEMA}.`
      ]
    };
  }
  if (!Array.isArray(claims.claims)) {
    return { ok: false, issues: ["job claims must be an array."] };
  }

  const seenJobIds = new Set();
  const normalizationJurisdictions = new Map();
  for (const [index, claim] of claims.claims.entries()) {
    const prefix = `claims[${index}]`;
    if (!claim || typeof claim !== "object" || Array.isArray(claim)) {
      issues.push(`${prefix} must be an object.`);
      continue;
    }
    if (!["compiled_job", "canonical_parent"].includes(claim.targetType)) {
      issues.push(`${prefix}.targetType is invalid.`);
    }
    if (
      typeof claim.jobId !== "string" ||
      !/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(claim.jobId)
    ) {
      issues.push(`${prefix}.jobId is invalid.`);
    } else if (seenJobIds.has(claim.jobId)) {
      issues.push(`job claim duplicates exact job ${claim.jobId}.`);
    } else {
      seenJobIds.add(claim.jobId);
    }
    if (!["SESSION_B", "SESSION_C", "SESSION_D", "SESSION_F"].includes(
      claim.ownerSession
    )) {
      issues.push(`${prefix}.ownerSession is invalid.`);
    }
    if (!["reserved", "in_progress"].includes(claim.status)) {
      issues.push(`${prefix}.status is invalid.`);
    }
    if (
      claim.targetType === "compiled_job" &&
      /-legal-design-normalization$/.test(claim.jobId ?? "")
    ) {
      if (!JURISDICTION_PATTERN.test(claim.jurisdiction ?? "")) {
        issues.push(`${prefix}.jurisdiction is required for normalization claims.`);
      } else if (normalizationJurisdictions.has(claim.jurisdiction)) {
        issues.push(
          `${claim.jurisdiction} has more than one normalization claim ` +
            `(${normalizationJurisdictions.get(claim.jurisdiction)} and ${claim.ownerSession}).`
        );
      } else {
        normalizationJurisdictions.set(
          claim.jurisdiction,
          claim.ownerSession
        );
      }
    }
  }

  return { ok: issues.length === 0, issues };
}

export function assertClaimPermitsSession(job, session) {
  const claim = job?.assignmentClaim;
  if (!claim) return;
  if (session !== claim.ownerSession) {
    throw new Error(
      `${job.jobId} is reserved to ${claim.ownerSession}; ` +
        `scaffold it with --session ${claim.ownerSession}.`
    );
  }
}

export function normalizationJobId(jurisdiction) {
  return `rcap-${String(jurisdiction).toLowerCase()}-legal-design-normalization`;
}

function blockersForBundleInspection(bundle, issues) {
  const blockers = new Set();
  if (
    bundle?.denominatorAdjudication?.status === "count_conflict_unresolved"
  ) {
    blockers.add("mechanism_inventory_count_conflict");
  }
  for (const issue of issues) {
    if (/denominator.*count conflict/i.test(issue)) {
      blockers.add("mechanism_inventory_count_conflict");
    } else if (
      /controllingReviewAssetPath|controllingReviewSha256|controllingReviewRevision|archiveSha256|archiveEntryPath|expectedSha256|observedSha256/.test(
        issue
      )
    ) {
      blockers.add("legal_review_hash_mismatch");
    } else if (
      /reviewMaterialization|materialization|checksum_verified|readOnly/.test(
        issue
      )
    ) {
      blockers.add("legal_review_materialization_required");
    } else if (
      /mechanismInventorySha256|canonicalMechanismInventorySha256|canonicalPayloadByteCount|canonicalizationVersion/.test(
        issue
      )
    ) {
      blockers.add("mechanism_inventory_hash_mismatch");
    } else if (/mechanismInventory|expectedReviewSlots/.test(issue)) {
      blockers.add("mechanism_inventory_required");
    } else if (/expectedSourceIds/.test(issue)) {
      blockers.add("expected_source_ids_required");
    } else if (
      /officialAuthorityRefresh|retrieval|official source/.test(issue)
    ) {
      blockers.add("official_authority_refresh_required");
    } else {
      blockers.add("mechanism_inventory_required");
    }
  }

  if (!bundle?.mechanismInventory?.length) {
    blockers.add("mechanism_inventory_required");
  }
  if (!bundle?.expectedSourceIds?.length) {
    blockers.add("expected_source_ids_required");
  }
  if (bundle?.officialAuthorityRefreshStatus !== "recorded") {
    blockers.add("official_authority_refresh_required");
  }
  const refreshRequirements =
    bundle?.officialAuthorityRefreshRequirements ?? [];
  for (const requirement of refreshRequirements) {
    if (
      ["authority_absent", "authority_archive_inconsistent"].includes(
        requirement?.retrievalState
      )
    ) {
      blockers.add("official_authority_refresh_required");
    }
    if (requirement?.retrievalState === "shell_download_blocked") {
      const alternateSatisfied = refreshRequirements.some(
        (candidate) =>
          candidate?.sectionIdentifier === requirement.sectionIdentifier &&
          ["browser_official_retrieval_available", "official_authority_hash_verified"].includes(
            candidate?.retrievalState
          ) &&
          SHA256_PATTERN.test(candidate?.capturedSourceSha256 ?? "")
      );
      if (!alternateSatisfied) {
        blockers.add("official_authority_refresh_required");
      }
    }
  }
  return READINESS_BLOCKER_ORDER.filter((blocker) => blockers.has(blocker));
}

function isRecordedReadinessBlockerIssue(issue) {
  return (
    /reviewMaterialization\.(?:expectedBytes|observedBytes|materializationState|verificationStatus)/.test(
      issue
    ) ||
    /mechanism inventory denominator has an unresolved count conflict/.test(
      issue
    )
  );
}

function firstReadinessBlocker(blockers) {
  return (
    READINESS_BLOCKER_ORDER.find((blocker) => blockers.includes(blocker)) ??
    "mechanism_inventory_required"
  );
}

function validateAuthorityArchive(archive, authority, issues) {
  if (!archive || typeof archive !== "object" || Array.isArray(archive)) {
    issues.push("authorityArchive must be an object.");
    return;
  }
  if (
    typeof archive.portableLocator !== "string" ||
    !archive.portableLocator.startsWith(PORTABLE_ARCHIVE_SCHEME)
  ) {
    issues.push(
      `authorityArchive.portableLocator must use ${PORTABLE_ARCHIVE_SCHEME}.`
    );
  }
  if (archive.sha256 !== authority?.retention?.archiveSha256) {
    issues.push("authorityArchive.sha256 does not match adopted authority.");
  }
  if (archive.bytes !== authority?.retention?.archiveBytes) {
    issues.push("authorityArchive.bytes does not match adopted authority.");
  }
  if (archive.materializationRoot !== MATERIALIZATION_PREFIX) {
    issues.push(
      `authorityArchive.materializationRoot must equal ${MATERIALIZATION_PREFIX}.`
    );
  }
}

function validateReservationPartition(bundleOwners, expected, issues) {
  if (!bundleOwners || typeof bundleOwners !== "object" || Array.isArray(bundleOwners)) {
    issues.push("bundleOwners must be an object.");
    return;
  }
  const assigned = [];
  for (const session of ["SESSION_B", "SESSION_D"]) {
    const jurisdictions = safeCanonicalStringArray(
      bundleOwners[session],
      `bundleOwners.${session}`,
      issues
    );
    assigned.push(...jurisdictions.map((jurisdiction) => `${jurisdiction}:${session}`));
  }
  const jurisdictions = assigned.map((entry) => entry.split(":")[0]);
  if (
    new Set(jurisdictions).size !== expected.length ||
    canonicalStringify([...new Set(jurisdictions)].sort()) !==
      canonicalStringify(expected)
  ) {
    issues.push(
      "SESSION_B and SESSION_D bundle ownership must partition the 24 jurisdictions exactly once."
    );
  }
}

function validateReviewIdentityConfirmations(confirmations, reviewAssets, issues) {
  if (!Array.isArray(confirmations)) {
    issues.push("reviewIdentityConfirmations must be an array.");
    return;
  }
  const seen = new Set();
  for (const [index, confirmation] of confirmations.entries()) {
    const prefix = `reviewIdentityConfirmations[${index}]`;
    if (
      !confirmation ||
      typeof confirmation !== "object" ||
      Array.isArray(confirmation)
    ) {
      issues.push(`${prefix} must be an object.`);
      continue;
    }
    const jurisdiction = confirmation.jurisdiction;
    if (seen.has(jurisdiction)) {
      issues.push(`reviewIdentityConfirmations duplicates ${jurisdiction}.`);
      continue;
    }
    seen.add(jurisdiction);
    const reviewAsset = (reviewAssets.get(jurisdiction) ?? [])[0];
    if (!reviewAsset) {
      issues.push(`${prefix} names an unknown controlling review.`);
      continue;
    }
    if (confirmation.sha256 !== reviewAsset.sha256) {
      issues.push(`${prefix}.sha256 does not match Edition 1.2.`);
    }
    if (
      confirmation.reviewedThrough !==
      reviewedThroughForRevision(reviewAsset.revision)
    ) {
      issues.push(`${prefix}.reviewedThrough does not match Edition 1.2.`);
    }
    if (confirmation.confirmedBySession !== "SESSION_B") {
      issues.push(`${prefix}.confirmedBySession must be SESSION_B.`);
    }
    if (
      confirmation.portabilityStatus !==
      "portable_materialization_receipt_required"
    ) {
      issues.push(`${prefix}.portabilityStatus is invalid.`);
    }
  }
}

function validateReviewMaterialization(
  materialization,
  authorityArchive,
  reviewAsset,
  jurisdiction,
  issues
) {
  if (
    !materialization ||
    typeof materialization !== "object" ||
    Array.isArray(materialization)
  ) {
    issues.push("reviewMaterialization must be an object.");
    return;
  }
  if (materialization.archiveLocator !== authorityArchive?.portableLocator) {
    issues.push("reviewMaterialization.archiveLocator does not match.");
  }
  if (materialization.archiveSha256 !== authorityArchive?.sha256) {
    issues.push("reviewMaterialization.archiveSha256 does not match.");
  }
  if (materialization.archiveEntryPath !== reviewAsset?.canonicalRelativePath) {
    issues.push("reviewMaterialization.archiveEntryPath does not match.");
  }
  if (materialization.expectedSha256 !== reviewAsset?.sha256) {
    issues.push("reviewMaterialization.expectedSha256 does not match.");
  }
  if (
    !Number.isSafeInteger(materialization.expectedBytes) ||
    materialization.expectedBytes <= 0
  ) {
    issues.push(
      "reviewMaterialization.expectedBytes must be a positive byte count."
    );
  }
  if (materialization.observedSha256 !== reviewAsset?.sha256) {
    issues.push("reviewMaterialization.observedSha256 does not match.");
  }
  if (
    !Number.isSafeInteger(materialization.observedBytes) ||
    materialization.observedBytes <= 0 ||
    materialization.observedBytes !== materialization.expectedBytes
  ) {
    issues.push(
      "reviewMaterialization.observedBytes must match expectedBytes."
    );
  }
  const expectedDestination = materializationDestinationFor(
    jurisdiction,
    reviewAsset?.canonicalRelativePath ?? "missing.md"
  );
  if (materialization.materializationDestination !== expectedDestination) {
    issues.push(
      "reviewMaterialization.materializationDestination is not the portable assigned path."
    );
  }
  if (materialization.materializationState !== "binary_hash_verified") {
    issues.push(
      "reviewMaterialization.materializationState must be binary_hash_verified."
    );
  }
  if (materialization.readOnly !== true) {
    issues.push("reviewMaterialization.readOnly must be true.");
  }
  if (materialization.materializationMethod !== "portable_archive_entry") {
    issues.push(
      "reviewMaterialization.materializationMethod must be portable_archive_entry."
    );
  }
  if (materialization.readOnlyTreatment !== "worker_read_only_no_modify") {
    issues.push(
      "reviewMaterialization.readOnlyTreatment must be worker_read_only_no_modify."
    );
  }
  if (
    typeof materialization.verificationCommand !== "string" ||
    materialization.verificationCommand.trim().length === 0
  ) {
    issues.push("reviewMaterialization.verificationCommand is required.");
  }
  if (
    ![
      "freshly_verified",
      "carried_forward_verified_receipt",
      "carried_forward_session_b_research_measurement",
      "carried_forward_session_d_research_measurement"
    ].includes(materialization.verificationProvenance)
  ) {
    issues.push("reviewMaterialization.verificationProvenance is invalid.");
  }
  if (
    materialization.verificationStatus !== "binary_hash_and_size_verified"
  ) {
    issues.push(
      "reviewMaterialization.verificationStatus must be binary_hash_and_size_verified."
    );
  }
  if (
    materialization.cleanupPolicy !==
    "captain_managed_cleanup_after_normalization_worker_integration"
  ) {
    issues.push("reviewMaterialization.cleanupPolicy is invalid.");
  }
}

function validateAuthorityRefreshRequirements(requirements, issues) {
  if (!Array.isArray(requirements)) {
    issues.push("officialAuthorityRefreshRequirements must be an array.");
    return;
  }
  for (const [index, requirement] of requirements.entries()) {
    const prefix = `officialAuthorityRefreshRequirements[${index}]`;
    if (!requirement || typeof requirement !== "object" || Array.isArray(requirement)) {
      issues.push(`${prefix} must be an object.`);
      continue;
    }
    for (const field of [
      "sectionIdentifier",
      "retrievalMethod",
      "retrievalState",
      "alternateOfficialRetrievalChannel"
    ]) {
      if (
        typeof requirement[field] !== "string" ||
        requirement[field].trim().length === 0
      ) {
        issues.push(`${prefix}.${field} must be a non-empty string.`);
      }
    }
    const discoveryRequired =
      requirement.retrievalMethod === "official_url_discovery_required";
    for (const field of ["officialUrl", "issuingDomain"]) {
      if (
        requirement[field] !== null &&
        (typeof requirement[field] !== "string" ||
          requirement[field].trim().length === 0)
      ) {
        issues.push(`${prefix}.${field} must be null or a non-empty string.`);
      }
      if (!discoveryRequired && requirement[field] === null) {
        issues.push(
          `${prefix}.${field} may be null only for official URL discovery.`
        );
      }
    }
    if (
      ![
        "shell_accessible",
        "browser_accessible",
        "automation_blocked",
        "unofficial_reference_only",
        "unavailable",
        "shell_download_blocked",
        "browser_official_retrieval_available",
        "authority_absent",
        "authority_archive_inconsistent",
        "official_authority_hash_verified"
      ].includes(requirement.retrievalState)
    ) {
      issues.push(`${prefix}.retrievalState is invalid.`);
    }
    if (
      requirement.retrievalDate !== null &&
      !DATE_PATTERN.test(requirement.retrievalDate ?? "")
    ) {
      issues.push(`${prefix}.retrievalDate must be null or YYYY-MM-DD.`);
    }
    if (
      requirement.capturedSourceSha256 !== null &&
      !SHA256_PATTERN.test(requirement.capturedSourceSha256 ?? "")
    ) {
      issues.push(`${prefix}.capturedSourceSha256 must be null or SHA-256.`);
    }
    if (
      [
        "shell_accessible",
        "browser_accessible",
        "browser_official_retrieval_available"
      ].includes(requirement.retrievalState) &&
      !SHA256_PATTERN.test(requirement.capturedSourceSha256 ?? "")
    ) {
      issues.push(
        `${prefix} successful retrieval must carry a captured-source hash.`
      );
    }
  }
}

function validateRetrievalMethods(methods, issues) {
  if (!Array.isArray(methods) || methods.length === 0) {
    issues.push("retrievalMethods must be a non-empty array.");
    return;
  }
  for (const [index, method] of methods.entries()) {
    const prefix = `retrievalMethods[${index}]`;
    if (!method || typeof method !== "object" || Array.isArray(method)) {
      issues.push(`${prefix} must be an object.`);
      continue;
    }
    for (const field of ["method", "locator", "issuingDomain", "status"]) {
      if (
        typeof method[field] !== "string" ||
        method[field].trim().length === 0
      ) {
        issues.push(`${prefix}.${field} must be a non-empty string.`);
      }
    }
    if (
      method.alternateOfficialRetrievalChannel !== null &&
      (typeof method.alternateOfficialRetrievalChannel !== "string" ||
        method.alternateOfficialRetrievalChannel.trim().length === 0)
    ) {
      issues.push(
        `${prefix}.alternateOfficialRetrievalChannel must be null or non-empty.`
      );
    }
  }
}

function readRepositoryResearchFile(rootDir, relativePath) {
  if (
    typeof relativePath !== "string" ||
    relativePath.length === 0 ||
    path.posix.isAbsolute(relativePath) ||
    relativePath.includes("\\") ||
    relativePath.split("/").includes("..")
  ) {
    throw new Error(`Research path is not portable: ${relativePath ?? "missing"}.`);
  }
  const absolutePath = path.resolve(rootDir, relativePath);
  const relativeResolved = path.relative(rootDir, absolutePath);
  if (
    relativeResolved === "" ||
    relativeResolved.startsWith("..") ||
    path.isAbsolute(relativeResolved)
  ) {
    throw new Error(`Research path escapes the repository: ${relativePath}.`);
  }
  return fs.readFileSync(absolutePath);
}

function sha256Bytes(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function validateSessionBResearchEnvelope({
  descriptor,
  manifest,
  research,
  actualBundleSha256,
  bundleByteCount
}) {
  const expectedJurisdictions = [
    "KY",
    "NC",
    "ND",
    "NE",
    "NH",
    "NJ",
    "NM",
    "NV",
    "NY",
    "OH",
    "OK",
    "OR"
  ];
  if (
    descriptor.sourceCommit !==
    "f54348b5dc5f448e5a5b3916ca98388f84c7f704"
  ) {
    throw new Error("Session B research sourceCommit is not the approved commit.");
  }
  if (
    manifest.bundlePath !== descriptor.bundlePath ||
    manifest.bundleSha256 !== actualBundleSha256 ||
    manifest.bundleByteCount !== bundleByteCount ||
    manifest.jurisdictionCount !== 12 ||
    manifest.inventorySlotCount !== 182 ||
    manifest.allReviewHashesVerified !== true
  ) {
    throw new Error("Session B research manifest does not reconcile.");
  }
  if (
    research.jurisdictionCount !== 12 ||
    research.inventorySlotCount !== 182 ||
    research.allReviewHashesVerified !== true ||
    !Array.isArray(research.jurisdictions)
  ) {
    throw new Error("Session B research bundle envelope does not reconcile.");
  }
  const jurisdictions = research.jurisdictions.map(
    (record) => record.jurisdiction
  );
  if (
    canonicalStringify(jurisdictions) !==
    canonicalStringify(expectedJurisdictions)
  ) {
    throw new Error("Session B research jurisdictions do not match the reservation.");
  }
  const slotCount = research.jurisdictions.reduce(
    (total, record) => total + (record.mechanismInventory?.length ?? 0),
    0
  );
  if (slotCount !== 182) {
    throw new Error(`Session B mechanism count is ${slotCount}, not 182.`);
  }
}

function validateSessionDResearchEnvelope({
  descriptor,
  manifest,
  research,
  actualBundleSha256,
  bundleByteCount
}) {
  const expectedJurisdictions = [
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
  if (
    descriptor.sourceCommit !==
    "e341927a42ea54abb8b03e587493a5826fa3e0d3"
  ) {
    throw new Error("Session D research sourceCommit is not the approved commit.");
  }
  if (
    manifest.bundlePath !== descriptor.bundlePath ||
    manifest.bundleSha256 !== actualBundleSha256 ||
    manifest.bundleByteCount !== bundleByteCount ||
    manifest.jurisdictionCount !== 12 ||
    manifest.inventorySlotCount !== 131 ||
    manifest.allReviewHashesVerified !== true
  ) {
    throw new Error("Session D research manifest does not reconcile.");
  }
  if (
    research.jurisdictionCount !== 12 ||
    research.inventorySlotCount !== 131 ||
    research.allReviewHashesVerified !== true ||
    !Array.isArray(research.jurisdictions)
  ) {
    throw new Error("Session D research bundle envelope does not reconcile.");
  }
  const jurisdictions = research.jurisdictions.map(
    (record) => record.jurisdiction
  );
  if (
    canonicalStringify(jurisdictions) !==
    canonicalStringify(expectedJurisdictions)
  ) {
    throw new Error("Session D research jurisdictions do not match the reservation.");
  }
  const slotCount = research.jurisdictions.reduce(
    (total, record) => total + (record.mechanismKeys?.length ?? 0),
    0
  );
  if (slotCount !== 131) {
    throw new Error(`Session D keyed mechanism count is ${slotCount}, not 131.`);
  }
}

function sessionBResearchInventorySha256(mechanismInventory) {
  return sha256Bytes(
    Buffer.from(
      JSON.stringify(researchCanonicalizeObject(mechanismInventory)),
      "utf8"
    )
  );
}

function sessionDResearchInventorySha256({
  jurisdiction,
  controllingReviewSha256,
  mechanismKeys
}) {
  return sha256Bytes(
    Buffer.from(
      `${jurisdiction}\n${controllingReviewSha256}\n${mechanismKeys.join("\n")}\n`,
      "utf8"
    )
  );
}

function sessionDDenominatorAdjudication(researchRecord) {
  const keyedBodyCount = researchRecord.mechanismKeys.length;
  const conflicts = {
    UT: {
      reviewSummaryCount: 16,
      unresolvedQuestion:
        "Identify the two allegedly omitted petition mechanisms or establish that the summary count is erroneous."
    },
    VT: {
      reviewSummaryCount: 13,
      unresolvedQuestion:
        "Determine from the controlling review whether one keyed section is a supporting action, local variant, cross-reference, duplicate, procedural appendix, or whether all fourteen are distinct mechanisms and the summary count is erroneous."
    },
    WV: {
      reviewSummaryCount: 11,
      unresolvedQuestion:
        "Identify the eleventh mechanism or formally correct the controlling review summary count."
    }
  };
  const conflict = conflicts[researchRecord.jurisdiction];
  if (conflict) {
    return {
      status: "count_conflict_unresolved",
      reviewSummaryCount: conflict.reviewSummaryCount,
      keyedBodyCount,
      resolution: null,
      unresolvedQuestion: conflict.unresolvedQuestion
    };
  }
  return {
    status: "keyed_denominator_reconciled",
    reviewSummaryCount: keyedBodyCount,
    keyedBodyCount,
    resolution: "accepted_unique_keyed_mechanisms",
    unresolvedQuestion: null
  };
}

function sessionDReviewDateEvidence(researchRecord) {
  if (researchRecord.jurisdiction === "WV") {
    return {
      filenameAsOf: "2026-08-02",
      internalReviewDate: "2026-08-01",
      status: "conflict"
    };
  }
  const filenameMatch = /__ASOF-(\d{4}-\d{2}-\d{2})__/.exec(
    researchRecord.controllingReviewAssetPath
  );
  return {
    filenameAsOf: filenameMatch?.[1] ?? researchRecord.reviewedThrough,
    internalReviewDate: researchRecord.reviewedThrough,
    status: "reconciled"
  };
}

function sessionDAuthorityRequirements(researchRecord) {
  const flags = [];
  if (["SC", "TN"].includes(researchRecord.jurisdiction)) {
    flags.push("official_url_discovery_required");
  }
  if (["VT", "WY"].includes(researchRecord.jurisdiction)) {
    flags.push("official_authority_refresh_required");
  }
  const rawRequirements =
    researchRecord.officialPrimaryAuthorityRefreshRequirements ?? [];
  if (rawRequirements.length === 0) {
    return {
      flags,
      requirements: [
        {
          officialUrl: null,
          issuingDomain: null,
          sectionIdentifier:
            `${researchRecord.jurisdiction} current primary authority`,
          retrievalMethod: "official_url_discovery_required",
          retrievalDate: null,
          capturedSourceSha256: null,
          retrievalState: "unavailable",
          alternateOfficialRetrievalChannel:
            "Normalization must locate and capture current official legislative or judicial authority before adopting legal conclusions."
        }
      ]
    };
  }

  return {
    flags,
    requirements: rawRequirements.map((requirement) => ({
      officialUrl: requirement.officialUrl,
      issuingDomain: requirement.issuingDomain,
      sectionIdentifier: requirement.sectionIdentifier,
      retrievalMethod: requirement.officialGovernmentSource
        ? "normalization_time_official_retrieval_required"
        : "reference_only_no_authority_adoption",
      retrievalDate: null,
      capturedSourceSha256: null,
      retrievalState: requirement.officialGovernmentSource
        ? "unavailable"
        : "unofficial_reference_only",
      alternateOfficialRetrievalChannel: requirement.officialGovernmentSource
        ? "Use an approved shell or browser retrieval channel against this exact official locator and capture a content hash."
        : "Locate and capture the corresponding official primary authority before adopting a legal conclusion."
    }))
  };
}

function legalReviewAssetsByJurisdiction(repositoryAssetAudit) {
  const rows = [
    ...(repositoryAssetAudit?.assets ?? []),
    ...(repositoryAssetAudit?.libraryAssetsAbsentFromRepositoryInventory ?? [])
  ].filter((asset) => asset?.assetClass === "legal_review");
  const result = new Map();
  for (const row of rows) {
    const list = result.get(row.jurisdiction) ?? [];
    if (
      !list.some(
        (entry) =>
          entry.canonicalRelativePath === row.canonicalRelativePath &&
          entry.sha256 === row.sha256
      )
    ) {
      list.push(row);
    }
    result.set(row.jurisdiction, list);
  }
  return result;
}

export function legalReviewAssetsForTesting(repositoryAssetAudit) {
  return legalReviewAssetsByJurisdiction(repositoryAssetAudit);
}

function reviewedThroughForRevision(revision) {
  const match = /^ASOF-(\d{4}-\d{2}-\d{2})$/.exec(revision ?? "");
  if (!match) {
    throw new Error(`Legal-review revision is not ASOF-YYYY-MM-DD: ${revision}.`);
  }
  return match[1];
}

function materializationDestinationFor(jurisdiction, assetPath) {
  return path.posix.join(
    MATERIALIZATION_PREFIX,
    jurisdiction,
    path.posix.basename(assetPath)
  );
}

function canonicalizeObject(value) {
  if (Array.isArray(value)) return value.map((entry) => canonicalizeObject(entry));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalizeObject(value[key])])
  );
}

function researchCanonicalizeObject(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => researchCanonicalizeObject(entry));
  }
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, researchCanonicalizeObject(value[key])])
  );
}

function canonicalizeMechanismValue(value) {
  if (Array.isArray(value)) {
    const entries = value.map((entry) => canonicalizeMechanismValue(entry));
    return entries.every(
      (entry) =>
        entry === null ||
        ["string", "number", "boolean"].includes(typeof entry)
    )
      ? entries.sort((left, right) =>
          canonicalStringify(left).localeCompare(canonicalStringify(right))
        )
      : entries;
  }
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .filter((key) => !VOLATILE_MECHANISM_FIELDS.has(key))
      .sort()
      .map((key) => [key, canonicalizeMechanismValue(value[key])])
  );
}

function canonicalStringArray(value, field) {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array.`);
  const result = value.map((entry, index) =>
    requiredString(entry, `${field}[${index}]`)
  );
  if (new Set(result).size !== result.length) {
    throw new Error(`${field} must not contain duplicates.`);
  }
  return result.sort();
}

function safeCanonicalStringArray(value, field, issues) {
  try {
    return canonicalStringArray(value, field);
  } catch (error) {
    issues.push(error.message);
    return [];
  }
}

function requiredString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  const normalized = value.trim();
  if (/^\/workspaces(?:\/|$)/.test(normalized)) {
    throw new Error(`${field} may not contain an absolute Codespace path.`);
  }
  return normalized;
}

function normalizeJurisdiction(value) {
  if (typeof value !== "string" || !JURISDICTION_PATTERN.test(value)) {
    throw new Error("jurisdiction must be a two-letter uppercase code.");
  }
  return value;
}

function normalizeSha256(value, field) {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new Error(`${field} must be a lowercase SHA-256.`);
  }
  return value;
}

function rejectAbsoluteWorkspacePaths(value, field, issues) {
  if (typeof value === "string") {
    if (
      path.posix.isAbsolute(value) ||
      /^[A-Za-z]:[\\/]/.test(value) ||
      value.startsWith("file://")
    ) {
      const message = `${field} contains a nonportable absolute path.`;
      if (issues) issues.push(message);
      else throw new Error(message);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      rejectAbsoluteWorkspacePaths(entry, `${field}[${index}]`, issues)
    );
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      rejectAbsoluteWorkspacePaths(entry, `${field}.${key}`, issues);
    }
  }
}
