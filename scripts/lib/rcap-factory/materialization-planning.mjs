import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const LEGAL_REVIEW_MATERIALIZATION_CONTRACT_PATH =
  "data/record-clearing/production-factory/legal-review-materialization-contract.json";
export const OFFICIAL_PDF_SOURCE_PROJECTION_PATH =
  "data/record-clearing/production-factory/official-pdf-source-assignment-projection.json";
export const OFFICIAL_PDF_PRODUCTION_QUEUE_PATH =
  "data/record-clearing/production-factory/official-pdf-production-queue.json";
export const OFFICIAL_PDF_RECONCILIATION_PATH =
  "data/record-clearing/production-factory/official-pdf-source-contract-reconciliation.json";
export const LEGAL_REVIEW_CONTRACT_SCHEMA =
  "rcap-legal-review-materialization-contract/v1";
export const OFFICIAL_PDF_PROJECTION_SCHEMA =
  "rcap-official-pdf-source-assignment-projection/v1";

const NORMALIZATION_INPUT_PATH =
  "data/record-clearing/production-factory/normalization-readiness-input.json";
const REPOSITORY_ASSET_AUDIT_PATH =
  "data/record-clearing/master-library/repository-asset-audit.json";
const SOURCE_ARTIFACT_REGISTRY_PATH =
  "data/record-clearing/source-artifact-registry.json";
const ALL_STATE_BUILD_MANIFEST_PATH =
  "data/rcap-all50/all-state-build-manifest.json";
const KS_COMMERCIAL_EXCLUSION_PATH =
  "data/record-clearing/production-factory/source-acquisition/rcap-ks-commercial-license.json";
const CO_SOURCE_REQUIREMENTS_PATH =
  "data/record-clearing/production-factory/official-pdf-families/CO/source-requirements.json";
const CANONICAL_JOBS_ROOT = "planning/record-clearing-100-percent/jobs";
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const SAFE_IDENTITY_FRAGMENT = /[^a-z0-9]+/gu;
const OFFICIAL_PDF_DISPOSITIONS = new Set([
  "exact_worker_assignable",
  "unresolved_identity",
  "deliberately_excluded_commercial_license",
  "source_gated_identity",
  "local_scope_identity",
  "role_mismatch",
  "legal_design_or_technical_policy_blocked"
]);

export function buildLegalReviewMaterializationContract(rootDir) {
  const input = readJson(rootDir, NORMALIZATION_INPUT_PATH);
  const audit = readJson(rootDir, REPOSITORY_ASSET_AUDIT_PATH);
  const stateManifest = readJson(rootDir, ALL_STATE_BUILD_MANIFEST_PATH);
  const parents = readCanonicalParents(rootDir);
  const stateNames = new Map(
    (stateManifest.states ?? []).map((state) => [
      state.code,
      state.name ?? state.jurisdictionName ?? state.code
    ])
  );
  const ownerByJurisdiction = new Map();
  for (const [session, jurisdictions] of Object.entries(
    input.bundleOwners ?? {}
  )) {
    for (const jurisdiction of jurisdictions ?? []) {
      if (ownerByJurisdiction.has(jurisdiction)) {
        throw new Error(
          `Legal-review materialization owner is duplicated for ${jurisdiction}.`
        );
      }
      ownerByJurisdiction.set(jurisdiction, session);
    }
  }
  const absentAssets = audit.libraryAssetsAbsentFromRepositoryInventory ?? [];
  const assignments = [...(input.expectedJurisdictions ?? [])]
    .sort()
    .map((jurisdiction) => {
      const reviews = absentAssets.filter(
        (asset) =>
          asset.jurisdiction === jurisdiction &&
          asset.assetClass === "legal_review" &&
          asset.documentId === "STATEWIDE"
      );
      const addenda = absentAssets.filter(
        (asset) =>
          asset.jurisdiction === jurisdiction &&
          asset.assetClass === "legal_review_addendum"
      );
      if (reviews.length !== 1) {
        throw new Error(
          `${jurisdiction} must have exactly one active legal review; found ${reviews.length}.`
        );
      }
      if (addenda.length !== 0) {
        throw new Error(
          `${jurisdiction} has ${addenda.length} unexpected legal-review addenda.`
        );
      }
      const review = reviews[0];
      const ownerSession = ownerByJurisdiction.get(jurisdiction);
      if (!["SESSION_B", "SESSION_D"].includes(ownerSession)) {
        throw new Error(
          `${jurisdiction} has no supported materialization owner session.`
        );
      }
      const canonicalParent = parents.filter(
        (parent) =>
          parent.lane === "normalization" &&
          (parent.jurisdictions ?? []).includes(jurisdiction)
      );
      if (canonicalParent.length !== 1) {
        throw new Error(
          `${jurisdiction} must map to exactly one normalization parent.`
        );
      }
      const basename = path.posix.basename(review.canonicalRelativePath);
      const jobId =
        `rcap-${jurisdiction.toLowerCase()}-legal-review-materialization`;
      const materializationDestination =
        `tmp/rcap-factory/materialized-authority/legal-reviews/` +
        `${jurisdiction}/${basename}`;
      const receiptOutput =
        `tmp/rcap-factory/legal-review-materialization-receipts/` +
        `${jurisdiction}.json`;
      const verificationCommand =
        "node scripts/verify-rcap-legal-review-materialization.mjs " +
        `--jurisdiction ${jurisdiction}`;
      return {
        jobId,
        jurisdiction,
        ownerSession,
        canonicalParent: canonicalParent[0].jobId,
        activeReview: {
          documentId: review.documentId,
          expectedTitle:
            "LEGALEASE NATIONWIDE RECORD-CLEARING LEGAL REVIEW",
          expectedJurisdictionName:
            stateNames.get(jurisdiction) ?? jurisdiction,
          expectedSha256: review.sha256,
          expectedBytes: null,
          expectedMime: "text/markdown",
          authorityEdition: String(input.authorityEdition),
          revision: review.revision,
          sourceArchiveIdentity:
            path.posix.basename(
              String(input.authorityArchive?.portableLocator ?? "").split("://")[1] ?? ""
            ),
          expectedArchiveSha256: input.authorityArchive?.sha256,
          expectedArchiveBytes: input.authorityArchive?.bytes,
          portableArchiveLocator: input.authorityArchive?.portableLocator,
          portableSourceLocator:
            `attorney-review-package://${review.canonicalRelativePath}`,
          archiveRelativePath: review.canonicalRelativePath,
          materializationDestination
        },
        receiptOutput,
        expectedActiveReviewCount: 1,
        expectedAddendumCount: 0,
        downstreamDependentJobs: [
          `rcap-${jurisdiction.toLowerCase()}-legal-design-normalization`
        ],
        focusedVerifier:
          "scripts/verify-rcap-legal-review-materialization.mjs",
        verificationCommand,
        ownedPaths: [materializationDestination, receiptOutput].sort(),
        assignmentClaim: {
          targetType: "compiled_job",
          jobId,
          jurisdiction,
          ownerSession,
          status: "reserved"
        },
        stopCondition:
          "Materialize only the exact pinned active legal review from the exact pinned archive, " +
          "write the verifier-issued receipt, and stop. Do not research, normalize, edit review " +
          "text, accept an addendum, publish an edition, enable runtime, promote, or deploy.",
        currentStatus: "blocked_external_archive_and_verified_receipt_required"
      };
    });

  return canonicalize({
    schemaVersion: LEGAL_REVIEW_CONTRACT_SCHEMA,
    authorityEdition: String(input.authorityEdition),
    generatedFrom: generatedFrom(rootDir, [
      NORMALIZATION_INPUT_PATH,
      REPOSITORY_ASSET_AUDIT_PATH,
      ALL_STATE_BUILD_MANIFEST_PATH
    ]),
    sourceArchive: {
      identity: path.posix.basename(
        String(input.authorityArchive?.portableLocator ?? "").split("://")[1] ?? ""
      ),
      portableLocator: input.authorityArchive?.portableLocator,
      expectedSha256: input.authorityArchive?.sha256,
      expectedBytes: input.authorityArchive?.bytes,
      allowedMaterializationRoot:
        "tmp/rcap-factory/materialized-authority/legal-reviews"
    },
    assignmentCount: assignments.length,
    expectedActiveReviewCount: assignments.length,
    expectedAddendumCount: 0,
    assignments,
    invariants: {
      exactArchiveRequired: true,
      exactReviewHashRequired: true,
      expectedMimeRequired: true,
      exactlyOneActiveReviewPerJurisdiction: true,
      unexpectedAddendaFailClosed: true,
      pathEscapeAllowed: false,
      overwriteAllowed: false,
      workerReviewMutationAllowed: false,
      materializationConfersNormalizationReadiness: false
    }
  });
}

export function buildOfficialPdfSourceProjection(rootDir) {
  const queue = readJson(rootDir, OFFICIAL_PDF_PRODUCTION_QUEUE_PATH);
  const reconciliation = readJson(rootDir, OFFICIAL_PDF_RECONCILIATION_PATH);
  const registry = readJson(rootDir, SOURCE_ARTIFACT_REGISTRY_PATH);
  const normalizationInput = readJson(rootDir, NORMALIZATION_INPUT_PATH);
  const ksExclusion = readJson(rootDir, KS_COMMERCIAL_EXCLUSION_PATH);
  const coRequirements = readJson(rootDir, CO_SOURCE_REQUIREMENTS_PATH);
  const excludedKansasIds = new Set(
    (ksExclusion.excludedDocuments ?? []).map((entry) => entry.documentId)
  );
  const coRoleConflictIds = new Set(
    sourceRequirementRows(coRequirements)
      .filter(
        (entry) =>
          entry.roleConflict === true ||
          entry.disposition === "authority_unmanifested_source_and_role_conflict" ||
          entry.sourceIdentityState ===
            "authority_unmanifested_source_and_role_conflict"
      )
      .map((entry) => entry.documentId ?? entry.officialFormId)
      .filter(Boolean)
  );
  // The CO family contract expressly records this denial/grant-order conflict.
  coRoleConflictIds.add("JDF-684");

  const artifactsBySourcePath = new Map();
  for (const artifact of registry.artifacts ?? []) {
    if (typeof artifact.sourcePath !== "string") continue;
    const rows = artifactsBySourcePath.get(artifact.sourcePath) ?? [];
    rows.push(artifact);
    artifactsBySourcePath.set(artifact.sourcePath, rows);
  }

  const identities = [];
  for (const family of queue.families ?? []) {
    for (const document of family.documents ?? []) {
      const jurisdiction = family.jurisdiction;
      const disposition = officialPdfDisposition({
        jurisdiction,
        document,
        excludedKansasIds,
        coRoleConflictIds
      });
      const requirement = document.exactSourceRequirement;
      const authorityAsset =
        (document.authorityAssets ?? []).find(
          (asset) =>
            requirement &&
            asset.documentId === requirement.documentId &&
            asset.sha256 === requirement.expectedSha256
        ) ??
        (document.authorityAssets ?? [])[0] ??
        null;
      const registryCandidates = requirement
        ? (artifactsBySourcePath.get(requirement.repositorySourcePath) ?? []).filter(
            (artifact) =>
              (artifact.measuredSha256 ?? artifact.inventorySha256) ===
                requirement.expectedSha256 &&
              artifact.sizeBytes === requirement.expectedBytes
          )
        : [];
      const registryArtifact =
        registryCandidates.length === 1 ? registryCandidates[0] : null;
      const identityKey = sourceIdentityKey(
        jurisdiction,
        document.officialFormId
      );
      const componentUses = [...(document.usageBindings ?? [])]
        .map((binding) => ({
          trackId: binding.trackId,
          componentId: binding.componentId ?? null,
          role: binding.role ?? null,
          requirement: binding.requirement ?? null,
          conditionDescription: binding.conditionDescription ?? null
        }))
        .sort(compareComponentUse);
      const implementationFamily =
        document.rendererLaneCandidate === "acroform_or_hybrid_candidate"
          ? "acroform_fill"
          : document.rendererLaneCandidate === "coordinate_overlay_candidate"
            ? "flat_pdf_overlay"
            : null;
      const archiveRelativePath =
        requirement?.canonicalAuthorityPath ?? null;
      const basename = archiveRelativePath
        ? path.posix.basename(archiveRelativePath)
        : null;
      const exactSourceContract = requirement
        ? {
            authorityEdition: `master-library/${queue.authorityEdition}`,
            sourceArchiveIdentity: path.posix.basename(
              String(
                normalizationInput.authorityArchive?.portableLocator ?? ""
              ).split("://")[1] ?? ""
            ),
            sourceArchiveSha256:
              normalizationInput.authorityArchive?.sha256,
            sourceArchiveBytes:
              normalizationInput.authorityArchive?.bytes,
            portableArchiveLocator:
              normalizationInput.authorityArchive?.portableLocator,
            archiveRelativePath,
            portableSourceLocator:
              `attorney-review-package://${archiveRelativePath}`,
            materializationDestination:
              `official-pdf/${jurisdiction}/${basename}`,
            expectedSha256: requirement.expectedSha256,
            expectedBytes: requirement.expectedBytes,
            expectedMime: requirement.expectedMediaType,
            readOnlyTreatment: "worker_read_only_no_modify"
          }
        : null;
      const assignmentBlockers = disposition === "exact_worker_assignable"
        ? [
            "exact_source_archive_not_materialized",
            ...(document.relationshipResults ?? []).includes(
              "pending_global_audit_regeneration"
            )
              ? ["pending_global_audit_regeneration"]
              : []
          ]
        : [disposition];

      identities.push({
        identityKey,
        familyId: family.familyId,
        jurisdiction,
        queueOfficialFormId: document.officialFormId,
        disposition,
        assignmentEligible: disposition === "exact_worker_assignable",
        assignmentBlockers,
        officialDocument: {
          documentId:
            authorityAsset?.documentId ??
            requirement?.documentId ??
            document.officialFormId,
          officialTitle:
            authorityAsset?.officialTitle ?? document.officialFormId,
          issuingAuthority:
            registryArtifact?.issuingAuthority ??
            "not_recorded_in_integrated_source_contract",
          documentRole:
            authorityAsset?.documentRole ??
            requirement?.documentRole ??
            null,
          revision: authorityAsset?.revision ?? null,
          language:
            authorityAsset?.workflowKey?.split(":").at(-1) ?? "EN",
          expectedSha256: requirement?.expectedSha256 ?? null,
          expectedBytes: requirement?.expectedBytes ?? null,
          expectedMime: requirement?.expectedMediaType ?? null,
          pageCount: registryArtifact?.pageCount ?? null,
          structuralClass:
            registryArtifact?.technicalClass ??
            document.rendererLaneCandidate ??
            null,
          canonicalAuthorityPath:
            requirement?.canonicalAuthorityPath ?? null,
          authorityStatus:
            document.sourceIdentityState,
          runtimeDisabled: (document.authorityAssets ?? []).every(
            (asset) => asset.runtimeStatus === "runtime_disabled"
          )
        },
        exactSourceContract,
        trackIds: [...new Set(componentUses.map((use) => use.trackId))].sort(),
        componentIds: [
          ...new Set(
            componentUses
              .map((use) => use.componentId)
              .filter((componentId) => typeof componentId === "string")
          )
        ].sort(),
        componentUses,
        implementationFamily,
        fieldOwnershipScaffold:
          `data/record-clearing/production-factory/official-pdf-families/` +
          `${jurisdiction}/field-ownership.json`,
        legalDesignDependency:
          disposition === "legal_design_or_technical_policy_blocked"
            ? "legal_design_resolution_required"
            : "integrated_legal_design_identity",
        relationshipResults: [...(document.relationshipResults ?? [])].sort(),
        sourceIdentityState: document.sourceIdentityState,
        rendererLaneCandidate: document.rendererLaneCandidate,
        assignmentEffect: "work_assignment_only",
        grantsSourceApproval: false,
        grantsLegalOutputApproval: false,
        grantsVisualApproval: false,
        grantsCounselAdoption: false,
        grantsPacketReady: false,
        grantsRuntimeEnablement: false
      });
    }
  }
  identities.sort((left, right) =>
    left.identityKey.localeCompare(right.identityKey)
  );
  const countsByDisposition = Object.fromEntries(
    [...new Set(identities.map((identity) => identity.disposition))]
      .sort()
      .map((disposition) => [
        disposition,
        identities.filter((identity) => identity.disposition === disposition)
          .length
      ])
  );
  const queueTotals = reconciliation.queueCoverage?.totals ?? {};
  if (
    identities.length !== queueTotals.documentIdentities ||
    identities.filter((identity) => identity.exactSourceContract).length !==
      queueTotals.exactSourceRequirements
  ) {
    throw new Error(
      "Official-PDF projection does not reconcile to the integrated production queue."
    );
  }

  return canonicalize({
    schemaVersion: OFFICIAL_PDF_PROJECTION_SCHEMA,
    authorityEdition: `master-library/${queue.authorityEdition}`,
    generatedFrom: generatedFrom(rootDir, [
      OFFICIAL_PDF_PRODUCTION_QUEUE_PATH,
      OFFICIAL_PDF_RECONCILIATION_PATH,
      SOURCE_ARTIFACT_REGISTRY_PATH,
      NORMALIZATION_INPUT_PATH,
      KS_COMMERCIAL_EXCLUSION_PATH,
      CO_SOURCE_REQUIREMENTS_PATH
    ]),
    sourceArchive: {
      identity: path.posix.basename(
        String(normalizationInput.authorityArchive?.portableLocator ?? "").split(
          "://"
        )[1] ?? ""
      ),
      portableLocator: normalizationInput.authorityArchive?.portableLocator,
      expectedSha256: normalizationInput.authorityArchive?.sha256,
      expectedBytes: normalizationInput.authorityArchive?.bytes,
      materializationRootContract:
        "RCAP_SOURCE_MATERIALIZATION_ROOT",
      status: "external_archive_not_materialized"
    },
    coverage: {
      queueIdentityCount: identities.length,
      componentUseCount: identities.reduce(
        (total, identity) => total + identity.componentUses.length,
        0
      ),
      exactSourceContractCount: identities.filter(
        (identity) => identity.exactSourceContract
      ).length,
      assignmentEligibleCount: identities.filter(
        (identity) => identity.assignmentEligible
      ).length,
      countsByDisposition
    },
    identities,
    invariants: {
      everyQueueIdentityDispositionedExactlyOnce: true,
      unresolvedIdentityAssignmentAllowed: false,
      commercialRestrictionAssignmentAllowed: false,
      localIdentityStatewidePromotionAllowed: false,
      roleMismatchAssignmentAllowed: false,
      sourceGatedGenerationAllowed: false,
      staleRevisionSubstitutionAllowed: false,
      crossDocumentSubstitutionAllowed: false,
      projectionIsMaterialization: false,
      projectionIsImplementation: false,
      projectionIsApproval: false,
      projectionEnablesRuntime: false
    }
  });
}

export function validateLegalReviewMaterializationContract(contract) {
  const issues = [];
  if (contract?.schemaVersion !== LEGAL_REVIEW_CONTRACT_SCHEMA) {
    issues.push(`schemaVersion must be ${LEGAL_REVIEW_CONTRACT_SCHEMA}.`);
  }
  const assignments = contract?.assignments;
  if (!Array.isArray(assignments) || assignments.length === 0) {
    issues.push("assignments must be a non-empty array.");
    return issues;
  }
  const jurisdictions = new Set();
  const jobs = new Set();
  const destinations = new Set();
  for (const assignment of assignments) {
    const prefix = assignment?.jurisdiction ?? "unknown";
    if (!/^[A-Z]{2}$/u.test(assignment?.jurisdiction ?? "")) {
      issues.push(`${prefix}: jurisdiction is invalid.`);
    }
    if (jurisdictions.has(assignment.jurisdiction)) {
      issues.push(`${prefix}: jurisdiction is duplicated.`);
    }
    jurisdictions.add(assignment.jurisdiction);
    if (jobs.has(assignment.jobId)) issues.push(`${prefix}: jobId is duplicated.`);
    jobs.add(assignment.jobId);
    const review = assignment.activeReview ?? {};
    for (const field of [
      "documentId",
      "expectedTitle",
      "expectedJurisdictionName",
      "expectedMime",
      "authorityEdition",
      "revision",
      "sourceArchiveIdentity",
      "portableArchiveLocator",
      "portableSourceLocator",
      "archiveRelativePath",
      "materializationDestination"
    ]) {
      if (typeof review[field] !== "string" || review[field].trim() === "") {
        issues.push(`${prefix}: activeReview.${field} is required.`);
      }
    }
    if (!SHA256_PATTERN.test(review.expectedSha256 ?? "")) {
      issues.push(`${prefix}: activeReview.expectedSha256 is invalid.`);
    }
    if (!SHA256_PATTERN.test(review.expectedArchiveSha256 ?? "")) {
      issues.push(`${prefix}: activeReview.expectedArchiveSha256 is invalid.`);
    }
    if (
      !portableLogicalLocator(review.portableArchiveLocator) ||
      !portableLogicalLocator(review.portableSourceLocator)
    ) {
      issues.push(`${prefix}: legal-review locators are not portable.`);
    }
    if (
      review.expectedArchiveSha256 !== contract.sourceArchive?.expectedSha256 ||
      review.expectedArchiveBytes !== contract.sourceArchive?.expectedBytes ||
      review.portableArchiveLocator !== contract.sourceArchive?.portableLocator
    ) {
      issues.push(`${prefix}: active review does not match the source archive contract.`);
    }
    if (
      review.expectedBytes !== null &&
      (!Number.isSafeInteger(review.expectedBytes) || review.expectedBytes <= 0)
    ) {
      issues.push(`${prefix}: activeReview.expectedBytes is invalid.`);
    }
    if (
      assignment.expectedActiveReviewCount !== 1 ||
      assignment.expectedAddendumCount !== 0
    ) {
      issues.push(`${prefix}: review/addendum cardinality is not 1/0.`);
    }
    for (const candidate of [
      review.archiveRelativePath,
      review.materializationDestination,
      assignment.receiptOutput,
      ...(assignment.ownedPaths ?? [])
    ]) {
      if (!portableRelativePath(candidate)) {
        issues.push(`${prefix}: non-portable or escaping path ${candidate}.`);
      }
    }
    if (
      !String(review.materializationDestination).startsWith(
        `tmp/rcap-factory/materialized-authority/legal-reviews/${prefix}/`
      )
    ) {
      issues.push(`${prefix}: materialization destination escapes the allowed root.`);
    }
    if (
      !String(review.archiveRelativePath).startsWith(
        `STATES/${prefix}/01_LEGAL_REVIEW/`
      )
    ) {
      issues.push(`${prefix}: review archive path does not match the jurisdiction.`);
    }
    if (!(assignment.ownedPaths ?? []).includes(review.materializationDestination)) {
      issues.push(`${prefix}: materialization destination is outside job ownership.`);
    }
    if (!(assignment.ownedPaths ?? []).includes(assignment.receiptOutput)) {
      issues.push(`${prefix}: receipt output is outside job ownership.`);
    }
    if (destinations.has(review.materializationDestination)) {
      issues.push(`${prefix}: materialization destination is duplicated.`);
    }
    destinations.add(review.materializationDestination);
  }
  if (contract.assignmentCount !== assignments.length) {
    issues.push("assignmentCount does not reconcile.");
  }
  return issues;
}

export function validateOfficialPdfSourceProjection(projection) {
  const issues = [];
  if (projection?.schemaVersion !== OFFICIAL_PDF_PROJECTION_SCHEMA) {
    issues.push(`schemaVersion must be ${OFFICIAL_PDF_PROJECTION_SCHEMA}.`);
  }
  const identities = projection?.identities;
  if (!Array.isArray(identities) || identities.length === 0) {
    issues.push("identities must be a non-empty array.");
    return issues;
  }
  const keys = new Set();
  const queueKeys = new Set();
  const destinations = new Set();
  for (const identity of identities) {
    const prefix = identity?.identityKey ?? "unknown";
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(prefix)) {
      issues.push(`${prefix}: identityKey is not safe kebab case.`);
    }
    if (keys.has(prefix)) issues.push(`${prefix}: identityKey is duplicated.`);
    keys.add(prefix);
    const queueKey = `${identity.jurisdiction}:${identity.queueOfficialFormId}`;
    if (queueKeys.has(queueKey)) issues.push(`${queueKey}: queue identity is duplicated.`);
    queueKeys.add(queueKey);
    if (!OFFICIAL_PDF_DISPOSITIONS.has(identity.disposition)) {
      issues.push(`${prefix}: disposition is not recognized.`);
    }
    if (
      identity.assignmentEligible !==
      (identity.disposition === "exact_worker_assignable")
    ) {
      issues.push(`${prefix}: assignment eligibility and disposition disagree.`);
    }
    if (identity.assignmentEligible) {
      const source = identity.exactSourceContract;
      if (!source) {
        issues.push(`${prefix}: assignable identity has no source contract.`);
        continue;
      }
      for (const field of [
        "sourceArchiveIdentity",
        "portableArchiveLocator",
        "archiveRelativePath",
        "portableSourceLocator",
        "materializationDestination",
        "expectedMime"
      ]) {
        if (typeof source[field] !== "string" || source[field].trim() === "") {
          issues.push(`${prefix}: exactSourceContract.${field} is required.`);
        }
      }
      for (const field of [
        "documentId",
        "officialTitle",
        "issuingAuthority",
        "documentRole",
        "revision",
        "language",
        "expectedSha256",
        "expectedMime",
        "structuralClass",
        "canonicalAuthorityPath",
        "authorityStatus"
      ]) {
        if (
          typeof identity.officialDocument?.[field] !== "string" ||
          identity.officialDocument[field].trim() === ""
        ) {
          issues.push(`${prefix}: officialDocument.${field} is required.`);
        }
      }
      if (!SHA256_PATTERN.test(source.expectedSha256 ?? "")) {
        issues.push(`${prefix}: expectedSha256 is invalid.`);
      }
      if (!SHA256_PATTERN.test(source.sourceArchiveSha256 ?? "")) {
        issues.push(`${prefix}: sourceArchiveSha256 is invalid.`);
      }
      if (!Number.isSafeInteger(source.expectedBytes) || source.expectedBytes <= 0) {
        issues.push(`${prefix}: expectedBytes is invalid.`);
      }
      if (
        identity.officialDocument?.expectedSha256 !== source.expectedSha256 ||
        identity.officialDocument?.expectedBytes !== source.expectedBytes ||
        identity.officialDocument?.expectedMime !== source.expectedMime
      ) {
        issues.push(`${prefix}: official document and source pins disagree.`);
      }
      if (
        !Number.isSafeInteger(identity.officialDocument?.pageCount) ||
        identity.officialDocument.pageCount <= 0
      ) {
        issues.push(`${prefix}: officialDocument.pageCount is invalid.`);
      }
      if (
        source.expectedMime !== "application/pdf" ||
        !portableLogicalLocator(source.portableArchiveLocator) ||
        !portableLogicalLocator(source.portableSourceLocator)
      ) {
        issues.push(`${prefix}: source MIME or locator contract is invalid.`);
      }
      if (
        source.sourceArchiveSha256 !== projection.sourceArchive?.expectedSha256 ||
        source.sourceArchiveBytes !== projection.sourceArchive?.expectedBytes ||
        source.portableArchiveLocator !== projection.sourceArchive?.portableLocator
      ) {
        issues.push(`${prefix}: source archive contract does not match the projection.`);
      }
      for (const candidate of [
        source.archiveRelativePath,
        source.materializationDestination
      ]) {
        if (!portableRelativePath(candidate)) {
          issues.push(`${prefix}: non-portable source path ${candidate}.`);
        }
      }
      if (
        !String(source.materializationDestination).startsWith(
          `official-pdf/${identity.jurisdiction}/`
        )
      ) {
        issues.push(`${prefix}: materialization destination escapes official-pdf root.`);
      }
      if (destinations.has(source.materializationDestination)) {
        issues.push(`${prefix}: materialization destination is duplicated.`);
      }
      destinations.add(source.materializationDestination);
      if (identity.officialDocument?.runtimeDisabled !== true) {
        issues.push(`${prefix}: assignment is not explicitly runtime-disabled.`);
      }
      if ((identity.componentUses ?? []).length === 0) {
        issues.push(`${prefix}: assignable identity has no component use.`);
      }
      if (
        !portableRelativePath(identity.fieldOwnershipScaffold) ||
        !["acroform_fill", "flat_pdf_overlay"].includes(
          identity.implementationFamily
        )
      ) {
        issues.push(`${prefix}: implementation family or field scaffold is invalid.`);
      }
    }
  }
  if (projection.coverage?.queueIdentityCount !== identities.length) {
    issues.push("queueIdentityCount does not reconcile.");
  }
  const countTotal = Object.values(
    projection.coverage?.countsByDisposition ?? {}
  ).reduce((total, value) => total + value, 0);
  if (countTotal !== identities.length) {
    issues.push("disposition counts do not reconcile.");
  }
  if (
    projection.coverage?.assignmentEligibleCount !==
      identities.filter((identity) => identity.assignmentEligible).length ||
    projection.coverage?.exactSourceContractCount !==
      identities.filter((identity) => identity.exactSourceContract).length
  ) {
    issues.push("exact-source or assignment-eligible coverage does not reconcile.");
  }
  return issues;
}

export function stableJson(value, space = 2) {
  return `${JSON.stringify(canonicalize(value), null, space)}\n`;
}

export function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function officialPdfDisposition({
  jurisdiction,
  document,
  excludedKansasIds,
  coRoleConflictIds
}) {
  if (
    jurisdiction === "KS" &&
    excludedKansasIds.has(document.officialFormId)
  ) {
    return "deliberately_excluded_commercial_license";
  }
  if (jurisdiction === "CA" && document.officialFormId === "SDSC-CRM-307") {
    return "local_scope_identity";
  }
  if (
    (document.exactSourceRequirement &&
      (document.relationshipResults ?? []).includes("authority_role_mismatch")) ||
    (jurisdiction === "CO" && coRoleConflictIds.has(document.officialFormId))
  ) {
    return "role_mismatch";
  }
  if (
    (jurisdiction === "CO" &&
      document.officialFormId === "JDF-417-ORDER") ||
    (document.sourceIdentityState === "exact_source_requirement_ready" &&
      document.rendererLaneCandidate ===
        "nonrenderable_source_policy_required" &&
      (document.authorityAssets ?? []).some(
        (asset) => asset.assetClass === "packet_form"
      ))
  ) {
    return "legal_design_or_technical_policy_blocked";
  }
  if (
    document.exactSourceRequirement &&
    ((document.relationshipResults ?? []).includes(
      "authority_mapped_source_gated"
    ) ||
      (document.authorityAssets ?? []).some(
        (asset) => asset.assetClass === "source_gated"
      ))
  ) {
    return "source_gated_identity";
  }
  if (
    document.sourceIdentityState === "exact_source_requirement_ready" &&
    document.exactSourceRequirement &&
    (document.authorityAssets ?? []).some(
      (asset) => asset.assetClass === "packet_form"
    ) &&
    [
      "acroform_or_hybrid_candidate",
      "coordinate_overlay_candidate"
    ].includes(document.rendererLaneCandidate)
  ) {
    return "exact_worker_assignable";
  }
  return "unresolved_identity";
}

function sourceIdentityKey(jurisdiction, officialFormId) {
  const slug =
    String(officialFormId)
      .toLowerCase()
      .replace(SAFE_IDENTITY_FRAGMENT, "-")
      .replace(/^-+|-+$/gu, "")
      .slice(0, 48)
      .replace(/-+$/gu, "") || "document";
  const digest = crypto
    .createHash("sha256")
    .update(`${jurisdiction}:${officialFormId}`)
    .digest("hex")
    .slice(0, 10);
  return `rcap-${jurisdiction.toLowerCase()}-${slug}-${digest}`;
}

function sourceRequirementRows(value) {
  if (Array.isArray(value)) return value.flatMap(sourceRequirementRows);
  if (!value || typeof value !== "object") return [];
  const rows = [];
  if (
    typeof value.documentId === "string" ||
    typeof value.officialFormId === "string"
  ) {
    rows.push(value);
  }
  for (const child of Object.values(value)) {
    if (child && typeof child === "object") rows.push(...sourceRequirementRows(child));
  }
  return rows;
}

function readCanonicalParents(rootDir) {
  return fs
    .readdirSync(path.join(rootDir, CANONICAL_JOBS_ROOT))
    .filter((name) => name.endsWith(".json"))
    .map((name) => readJson(rootDir, `${CANONICAL_JOBS_ROOT}/${name}`));
}

function generatedFrom(rootDir, paths) {
  return [...paths]
    .sort()
    .map((relativePath) => ({
      path: relativePath,
      sha256: sha256File(path.join(rootDir, relativePath))
    }));
}

function readJson(rootDir, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8"));
}

function portableRelativePath(value) {
  if (typeof value !== "string" || value.trim() === "") return false;
  if (
    value.includes("\\") ||
    path.posix.isAbsolute(value) ||
    path.win32.isAbsolute(value) ||
    /^[A-Za-z]:/u.test(value)
  ) {
    return false;
  }
  const normalized = path.posix.normalize(value);
  return (
    normalized === value &&
    normalized !== "." &&
    normalized !== ".." &&
    !normalized.startsWith("../") &&
    !normalized.split("/").some((segment) => segment === "" || segment === "..")
  );
}

function portableLogicalLocator(value) {
  if (
    typeof value !== "string" ||
    value.trim() === "" ||
    value.includes("\\") ||
    value.includes("/workspaces/") ||
    value.includes("/home/")
  ) {
    return false;
  }
  const separator = value.indexOf("://");
  if (separator <= 0) return false;
  const scheme = value.slice(0, separator);
  const entry = value.slice(separator + 3);
  return (
    /^[a-z][a-z0-9+.-]*$/u.test(scheme) &&
    portableRelativePath(entry) &&
    entry !== "private" &&
    !entry.startsWith("private/")
  );
}

function compareComponentUse(left, right) {
  return (
    String(left.trackId).localeCompare(String(right.trackId)) ||
    String(left.componentId).localeCompare(String(right.componentId)) ||
    String(left.role).localeCompare(String(right.role))
  );
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])])
  );
}
