import crypto from "node:crypto";
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
  "legal_review_hash_mismatch",
  "legal_review_materialization_required",
  "mechanism_inventory_hash_mismatch",
  "mechanism_inventory_required",
  "expected_source_ids_required",
  "official_authority_refresh_required"
]);

export function canonicalStringify(value) {
  return JSON.stringify(canonicalizeObject(value));
}

export function canonicalizeMechanismInventory(rows) {
  if (!Array.isArray(rows)) {
    throw new Error("mechanismInventory must be an array.");
  }

  const sourceIds = new Set();
  const reviewSlots = new Set();
  const canonicalRows = rows.map((row, index) => {
    const prefix = `mechanismInventory[${index}]`;
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error(`${prefix} must be an object.`);
    }
    const unknown = Object.keys(row).filter(
      (field) => !REQUIRED_INVENTORY_ROW_FIELDS.includes(field)
    );
    if (unknown.length > 0) {
      throw new Error(
        `${prefix} contains unsupported fields: ${unknown.sort().join(", ")}.`
      );
    }
    for (const field of REQUIRED_INVENTORY_ROW_FIELDS) {
      if (!Object.hasOwn(row, field)) {
        throw new Error(`${prefix} is missing ${field}.`);
      }
    }

    const sourceId = requiredString(row.sourceId, `${prefix}.sourceId`);
    const reviewSlot = requiredString(row.reviewSlot, `${prefix}.reviewSlot`);
    if (sourceIds.has(sourceId)) {
      throw new Error(`mechanismInventory contains duplicate sourceId ${sourceId}.`);
    }
    if (reviewSlots.has(reviewSlot)) {
      throw new Error(
        `mechanismInventory contains duplicate reviewSlot ${reviewSlot}.`
      );
    }
    sourceIds.add(sourceId);
    reviewSlots.add(reviewSlot);

    if (!["relief", "non_relief"].includes(row.classification)) {
      throw new Error(
        `${prefix}.classification must be relief or non_relief.`
      );
    }

    return {
      sourceId,
      reviewSlot,
      legalMechanismName: requiredString(
        row.legalMechanismName,
        `${prefix}.legalMechanismName`
      ),
      classification: row.classification,
      candidateFilingActor: requiredString(
        row.candidateFilingActor,
        `${prefix}.candidateFilingActor`
      ),
      candidateDestination: requiredString(
        row.candidateDestination,
        `${prefix}.candidateDestination`
      ),
      referencedStatutesOrRules: canonicalStringArray(
        row.referencedStatutesOrRules,
        `${prefix}.referencedStatutesOrRules`
      ),
      referencedOfficialForms: canonicalStringArray(
        row.referencedOfficialForms,
        `${prefix}.referencedOfficialForms`
      ),
      unresolvedQuestions: canonicalStringArray(
        row.unresolvedQuestions,
        `${prefix}.unresolvedQuestions`
      )
    };
  });

  return canonicalRows.sort(
    (left, right) =>
      left.sourceId.localeCompare(right.sourceId) ||
      left.reviewSlot.localeCompare(right.reviewSlot)
  );
}

export function mechanismInventorySha256({
  authorityEdition,
  jurisdiction,
  controllingReviewSha256,
  mechanismInventory
}) {
  const payload = {
    schemaVersion: MECHANISM_INVENTORY_SCHEMA,
    authorityEdition: requiredString(
      authorityEdition,
      "mechanism inventory authorityEdition"
    ),
    jurisdiction: normalizeJurisdiction(jurisdiction),
    controllingReviewSha256: normalizeSha256(
      controllingReviewSha256,
      "mechanism inventory controllingReviewSha256"
    ),
    rows: canonicalizeMechanismInventory(mechanismInventory)
  };
  return crypto
    .createHash("sha256")
    .update(canonicalStringify(payload))
    .digest("hex");
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
    issues.push(
      ...inspectNormalizationBundle({
        bundle,
        authorityEdition: String(input.authorityEdition),
        authorityArchive: input.authorityArchive,
        reviewAsset: asset
      }).issues.map((issue) => `${jurisdiction}: ${issue}`)
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
  if (
    reviewAsset &&
    bundle.reviewedThrough !== reviewedThroughForRevision(reviewAsset.revision)
  ) {
    issues.push("reviewedThrough does not match the controlling review revision.");
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
  const actualReviewSlots = inventory.map((row) => row.reviewSlot).sort();
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
      authorityEdition,
      jurisdiction,
      controllingReviewSha256: reviewAsset.sha256,
      mechanismInventory: inventory
    });
    if (bundle.mechanismInventorySha256 !== actualHash) {
      issues.push("mechanismInventorySha256 does not match the canonical inventory.");
    }
  } else if (!SHA256_PATTERN.test(bundle.mechanismInventorySha256 ?? "")) {
    issues.push("mechanismInventorySha256 must be a lowercase SHA-256.");
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
    legalReviewPrecedence: ORIGINAL_REVIEW_PRECEDENCE,
    precedenceStatus: "resolved",
    mechanismInventory: [],
    mechanismInventorySha256: null,
    expectedSourceIds: [],
    retainedForms: [],
    openQuestions: [],
    officialAuthorityRefreshRequirements: [],
    officialAuthorityRefreshStatus: "required",
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
      materializationDestination: materializationDestinationFor(
        jurisdiction,
        reviewAsset.canonicalRelativePath
      ),
      materializationState: "binary_materialization_required",
      readOnly: true,
      verificationCommand:
        `node scripts/verify-rcap-normalization-readiness.mjs --jurisdiction ${jurisdiction}`,
      verificationProvenance: "not_yet_verified_in_worker_codespace"
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
      legalReviewPrecedence: bundle.legalReviewPrecedence,
      precedenceStatus: bundle.precedenceStatus,
      mechanismInventory: canonicalizeMechanismInventory(
        bundle.mechanismInventory ?? []
      ),
      mechanismInventorySha256: bundle.mechanismInventorySha256 ?? null,
      expectedSourceIds: [...(bundle.expectedSourceIds ?? [])].sort(),
      retainedForms: [...(bundle.retainedForms ?? [])].sort(),
      openQuestions: [...(bundle.openQuestions ?? [])].sort(),
      officialAuthorityRefreshRequirements:
        bundle.officialAuthorityRefreshRequirements ?? [],
      officialAuthorityRefreshStatus:
        bundle.officialAuthorityRefreshStatus ?? "required",
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
  const received = new Set(
    (input?.bundles ?? []).map((bundle) => bundle?.jurisdiction).filter(Boolean)
  );
  return (
    received.size === expected.size &&
    [...expected].every((jurisdiction) => received.has(jurisdiction))
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
    "legalReviewPrecedence",
    "precedenceStatus",
    "mechanismInventory",
    "mechanismInventorySha256",
    "expectedSourceIds",
    "retainedForms",
    "openQuestions",
    "officialAuthorityRefreshRequirements",
    "officialAuthorityRefreshStatus",
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
          authorityEdition: record.authorityEdition,
          jurisdiction: record.jurisdiction,
          controllingReviewSha256: record.controllingReviewSha256,
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
  for (const issue of issues) {
    if (
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
    } else if (/mechanismInventorySha256/.test(issue)) {
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
  if (materialization.observedSha256 !== reviewAsset?.sha256) {
    issues.push("reviewMaterialization.observedSha256 does not match.");
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
  if (
    typeof materialization.verificationCommand !== "string" ||
    materialization.verificationCommand.trim().length === 0
  ) {
    issues.push("reviewMaterialization.verificationCommand is required.");
  }
  if (!["freshly_verified", "carried_forward_verified_receipt"].includes(
    materialization.verificationProvenance
  )) {
    issues.push("reviewMaterialization.verificationProvenance is invalid.");
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
      "officialUrl",
      "issuingDomain",
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
    if (
      ![
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
      requirement.retrievalState === "browser_official_retrieval_available" &&
      !SHA256_PATTERN.test(requirement.capturedSourceSha256 ?? "")
    ) {
      issues.push(
        `${prefix} browser retrieval must carry a captured-source hash.`
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
    if (/^\/workspaces(?:\/|$)/.test(value) || value.startsWith("file://")) {
      issues.push(`${field} contains a nonportable absolute path.`);
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
