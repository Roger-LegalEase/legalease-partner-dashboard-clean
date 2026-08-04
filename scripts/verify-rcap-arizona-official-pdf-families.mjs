#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FAMILY_ID = "rcap-az-official-pdf-family";
const FAMILY_DIR =
  "data/record-clearing/production-factory/official-pdf-families/AZ";
const MODULE_PATH =
  "src/lib/rcap/packets/jurisdictions/arizona/official-pdf/family.ts";
const VERIFIER_PATH =
  "scripts/verify-rcap-arizona-official-pdf-families.mjs";

const files = {
  family: `${FAMILY_DIR}/family-manifest.json`,
  sourceRequirementsSchema: `${FAMILY_DIR}/source-requirements.schema.json`,
  sourceRequirements: `${FAMILY_DIR}/source-requirements.json`,
  renderer: `${FAMILY_DIR}/renderer-scaffold.json`,
  fieldMapSchema: `${FAMILY_DIR}/field-map.schema.json`,
  fieldMaps: `${FAMILY_DIR}/field-maps.json`,
  ownershipSchema: `${FAMILY_DIR}/field-ownership.schema.json`,
  ownership: `${FAMILY_DIR}/field-ownership.json`,
  fixtureSchema: `${FAMILY_DIR}/fixtures.schema.json`,
  fixtures: `${FAMILY_DIR}/fixtures.json`,
  assemblySchema: `${FAMILY_DIR}/packet-assembly.schema.json`,
  assembly: `${FAMILY_DIR}/packet-assembly.json`,
  dependencies: `${FAMILY_DIR}/dependencies.json`,
  review: `${FAMILY_DIR}/review-manifest.json`,
  packetSets: "data/record-clearing/legal-design-packet-set-manifests.json",
  authority: "data/record-clearing/master-library/authority.json",
  repositoryAudit:
    "data/record-clearing/master-library/repository-asset-audit.json",
  sourceRegistry: "data/record-clearing/source-artifact-registry.json",
  productionQueue:
    "data/record-clearing/production-factory/official-pdf-production-queue.json",
  module: MODULE_PATH,
  verifier: VERIFIER_PATH
};

const TRACK_IDS = [
  "az_certificate_second_chance",
  "az_marijuana_expungement_arrest_no_charges",
  "az_marijuana_expungement_limited_jurisdiction",
  "az_marijuana_expungement_superior_court",
  "az_record_sealing_arrest_no_charges",
  "az_record_sealing_conviction",
  "az_record_sealing_dismissal_not_guilty",
  "az_set_aside"
];

const DOCUMENT_IDS = [
  "AOC-CREM2F-071221",
  "AOC-CREM2F-071221-CONT",
  "AOC-CREM3F-071221",
  "AOCCR41FORM31A-082224",
  "AOCCR41FORM31A-082224-CONT",
  "AOCCR41FORM31B-082224",
  "AOCCRSA3F-010122",
  "AOCCRSA4F-010122",
  "AOCCRSL1F-050825",
  "AOCCRSL1F-050825-CONT",
  "AOCCRSL2F-050825"
];

const EXACT_DOCUMENT_IDS = new Set([
  "AOC-CREM2F-071221",
  "AOC-CREM3F-071221",
  "AOCCRSL1F-050825",
  "AOCCRSL2F-050825"
]);

const UNRESOLVED_DOCUMENT_IDS = new Set(
  DOCUMENT_IDS.filter((documentId) => !EXACT_DOCUMENT_IDS.has(documentId))
);

const COMPONENT_IDS = [
  "az_certificate_second_chance-primary-filing-1",
  "az_certificate_second_chance-proposed-order-2",
  "az_marijuana_expungement_arrest_no_charges-primary-filing-1",
  "az_marijuana_expungement_limited_jurisdiction-primary-filing-1",
  "az_marijuana_expungement_limited_jurisdiction-continuation-2",
  "az_marijuana_expungement_superior_court-primary-filing-1",
  "az_record_sealing_arrest_no_charges-primary-filing-1",
  "az_record_sealing_arrest_no_charges-proposed-order-2",
  "az_record_sealing_conviction-primary-filing-1",
  "az_record_sealing_conviction-proposed-order-2",
  "az_record_sealing_conviction-continuation-3",
  "az_record_sealing_dismissal_not_guilty-primary-filing-1",
  "az_record_sealing_dismissal_not_guilty-proposed-order-2",
  "az_set_aside-primary-filing-1",
  "az_set_aside-proposed-order-2",
  "az_set_aside-continuation-3"
];

const PROTECTED_OWNER_CLASSES = [
  "judge",
  "clerk",
  "court",
  "agency",
  "law_enforcement_officer",
  "prosecutor",
  "attorney",
  "notary",
  "witness",
  "process_server",
  "unknown"
];

const argv = process.argv.slice(2);
let jsonOutput = false;
let requireProjectedSource = false;
let targetDocumentId = null;
const argumentErrors = [];

for (let index = 0; index < argv.length; index += 1) {
  const argument = argv[index];
  if (argument === "--json") {
    jsonOutput = true;
  } else if (argument === "--require-projected-source") {
    requireProjectedSource = true;
  } else if (argument === "--document-id") {
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      argumentErrors.push("--document-id requires a value.");
    } else {
      targetDocumentId = value;
      index += 1;
    }
  } else {
    argumentErrors.push(`Unknown argument: ${argument}`);
  }
}

const failures = [...argumentErrors];
const sections = [];
const sourceObservations = [];

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), "utf8"));
}

function ok(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function section(message) {
  sections.push(message);
}

function unique(values) {
  return new Set(values).size === values.length;
}

function sameSet(actual, expected) {
  return (
    actual.length === expected.length &&
    actual.every((value) => expected.includes(value))
  );
}

function sameJson(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function projectComponent(component) {
  return {
    componentId: component.componentId,
    role: component.role,
    requirement: component.requirement,
    conditionDescription: component.conditionDescription ?? null,
    outputStrategy: component.outputStrategy,
    officialFormId: component.officialFormId,
    order: component.order
  };
}

function projectUsage(binding) {
  return {
    trackId: binding.trackId,
    componentId: binding.componentId,
    role: binding.role
  };
}

function sortedUsages(bindings) {
  return bindings
    .map(projectUsage)
    .toSorted((left, right) =>
      `${left.trackId}:${left.componentId}`.localeCompare(
        `${right.trackId}:${right.componentId}`
      )
    );
}

function outputAndExitEarly() {
  const result = {
    ok: false,
    familyId: FAMILY_ID,
    jurisdiction: "AZ",
    sectionCount: sections.length,
    sections,
    failures
  };
  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.error(
      `Arizona official-PDF family verification failed (${failures.length} issue${failures.length === 1 ? "" : "s"}).`
    );
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
  }
  process.exit(1);
}

for (const [label, relativePath] of Object.entries(files)) {
  ok(fs.existsSync(absolute(relativePath)), `${label}: missing ${relativePath}.`);
}

if (failures.length > 0) {
  outputAndExitEarly();
}

const family = readJson(files.family);
const sourceRequirementsSchema = readJson(files.sourceRequirementsSchema);
const sourceRequirements = readJson(files.sourceRequirements);
const renderer = readJson(files.renderer);
const fieldMapSchema = readJson(files.fieldMapSchema);
const fieldMaps = readJson(files.fieldMaps);
const ownershipSchema = readJson(files.ownershipSchema);
const ownership = readJson(files.ownership);
const fixtureSchema = readJson(files.fixtureSchema);
const fixtures = readJson(files.fixtures);
const assemblySchema = readJson(files.assemblySchema);
const assembly = readJson(files.assembly);
const dependencies = readJson(files.dependencies);
const review = readJson(files.review);
const packetSets = readJson(files.packetSets);
const authority = readJson(files.authority);
const repositoryAudit = readJson(files.repositoryAudit);
const sourceRegistry = readJson(files.sourceRegistry);
const productionQueue = readJson(files.productionQueue);
const moduleText = fs.readFileSync(absolute(files.module), "utf8");
const verifierText = fs.readFileSync(absolute(files.verifier), "utf8");

// ---------------------------------------------------------------------------
// 1. Family and immutable queue scope
// ---------------------------------------------------------------------------

ok(
  family.familyId === FAMILY_ID && family.jurisdiction === "AZ",
  "Family manifest is not bound to the Arizona family."
);
ok(
  sameJson(family.scope.trackIds, TRACK_IDS) &&
    sameJson(family.scope.documentIds, DOCUMENT_IDS) &&
    family.scope.trackCount === 8 &&
    family.scope.officialPdfComponentCount === 16 &&
    family.scope.documentCount === 11 &&
    family.scope.exactRetainedIdentityCount === 4 &&
    family.scope.authorityUnresolvedIdentityCount === 7 &&
    family.scope.exactIdentityUsageCount === 9 &&
    family.scope.unresolvedIdentityUsageCount === 7 &&
    family.scope.deduplicatedIdentityUsageCount === 5,
  "Family scope differs from the assigned eight-track Arizona queue family."
);
ok(
  family.sourceContract.contractKind ===
    "pre_materialization_dependency_scaffold_not_worker_assignment" &&
    family.sourceContract.materializationDependency ===
      "rcap-nationwide-source-materialization-contract" &&
    family.sourceContract.assignmentAnchor === null &&
    family.sourceContract.portableProjection === null &&
    family.sourceContract.captainAssignmentRequired === true &&
    family.sourceContract.portableProjectionRequired === true &&
    family.sourceContract.workerReadAuthorized === false &&
    family.sourceContract.workerReady === false &&
    family.sourceContract.workerMaterializationAuthorized === false &&
    family.sourceContract.workerMayAcquireOrDownloadSources === false &&
    family.sourceContract.captainProjectedExactSources === 0 &&
    family.sourceContract.repositorySourcePathTreatment ===
      "identity_evidence_only_never_worker_source",
  "Family source contract became a worker assignment, locator, or acquisition path."
);
ok(
  family.status.packetReady === false &&
    family.status.generationAllowed === false &&
    family.status.enabled === false &&
    family.rendererPosture.activeRendererCount === 0 &&
    family.rendererPosture.activeFieldMappingCount === 0 &&
    family.rendererPosture.activeOverlayPlacementCount === 0 &&
    family.rendererPosture.routeReadyCount === 0,
  "Family manifest opened a renderer, mapping, route, or runtime gate."
);

const queueFamily = productionQueue.families.find(
  (candidate) => candidate.familyId === FAMILY_ID
);
ok(
  queueFamily?.jurisdiction === "AZ" &&
    sameJson(queueFamily.trackIds, TRACK_IDS) &&
    queueFamily.counts?.trackCount === 8 &&
    queueFamily.counts?.componentCount === 16 &&
    queueFamily.counts?.documentCount === 11 &&
    queueFamily.counts?.exactSourceRequirementCount === 4 &&
    queueFamily.counts?.unresolvedSourceIdentityCount === 7 &&
    queueFamily.rendererLaneCounts?.acroform_or_hybrid_candidate === 2 &&
    queueFamily.rendererLaneCounts?.coordinate_overlay_candidate === 2 &&
    queueFamily.rendererLaneCounts?.pending_fresh_local_source_inspection ===
      7 &&
    queueFamily.workerReady === false &&
    queueFamily.packetReady === false &&
    queueFamily.enabled === false,
  "Read-only production queue evidence differs from the Arizona assignment."
);
ok(
  sameJson(
    queueFamily.documents.map((document) => document.officialFormId),
    DOCUMENT_IDS
  ),
  "Queue document identity order or membership changed."
);
section(
  "1. Boundary: eight tracks, sixteen components, and eleven document identities remain isolated and runtime-disabled."
);

// ---------------------------------------------------------------------------
// 2. Exact pins and unresolved identity stops
// ---------------------------------------------------------------------------

ok(
  sourceRequirementsSchema.properties?.jurisdiction?.const === "AZ" &&
    sourceRequirementsSchema.properties?.workerReady?.const === false &&
    sourceRequirementsSchema.properties?.workerReadAuthorized?.const ===
      false &&
    sourceRequirementsSchema.properties?.workerMaterializationAuthorized
      ?.const === false &&
    sourceRequirementsSchema.properties?.requirements?.minItems === 11 &&
    sourceRequirementsSchema.properties?.requirements?.maxItems === 11,
  "Source-requirements schema lost Arizona scope or fail-closed cardinality."
);
ok(
  authority.edition === "1.2" &&
    authority.adoptionStatus === "adopted" &&
    authority.retention?.archiveSha256 ===
      sourceRequirements.authorityArchiveSha256,
  "Master Library Edition 1.2 authority pin differs from the Arizona scaffold."
);
ok(
  sourceRequirements.schemaVersion ===
    "rcap-source-materialization-scaffold/v1" &&
    sourceRequirements.contractKind ===
      "pre_materialization_dependency_scaffold_not_worker_assignment" &&
    sourceRequirements.assignmentAnchor === null &&
    sourceRequirements.portableProjection === null &&
    sourceRequirements.captainAssignmentRequired === true &&
    sourceRequirements.portableProjectionRequired === true &&
    sourceRequirements.workerReadAuthorized === false &&
    sourceRequirements.workerReady === false &&
    sourceRequirements.workerMaterializationAuthorized === false &&
    sourceRequirements.networkAcquisitionAuthorized === false &&
    sourceRequirements.counts.documents === 11 &&
    sourceRequirements.counts.retainedExactIdentities === 4 &&
    sourceRequirements.counts.authorityUnresolvedIdentities === 7 &&
    sourceRequirements.counts.exactIdentityUsageBindings === 9 &&
    sourceRequirements.counts.unresolvedIdentityUsageBindings === 7 &&
    sourceRequirements.counts.captainProjectedExactSources === 0,
  "Source requirements gained assignment/readiness or lost required counts."
);

const requirements = sourceRequirements.requirements;
ok(
  requirements.length === 11 &&
    unique(requirements.map((requirement) => requirement.componentDocumentId)) &&
    sameJson(
      requirements.map((requirement) => requirement.componentDocumentId),
      DOCUMENT_IDS
    ),
  "Source requirement identity slots are not the assigned eleven unique documents."
);

const registryByPath = new Map(
  sourceRegistry.artifacts.map((artifact) => [artifact.sourcePath, artifact])
);
const repositoryByPath = new Map(
  repositoryAudit.assets.map((artifact) => [artifact.sourcePath, artifact])
);
const queueDocumentById = new Map(
  queueFamily.documents.map((document) => [
    document.officialFormId,
    document
  ])
);

let exactUsageCount = 0;
let unresolvedUsageCount = 0;

for (const requirement of requirements) {
  const queueDocument = queueDocumentById.get(
    requirement.componentDocumentId
  );
  ok(
    Boolean(queueDocument),
    `${requirement.componentDocumentId}: no matching queue document.`
  );
  ok(
    requirement.workerReady === false &&
      requirement.workerReadAuthorized === false &&
      requirement.workerMaterializationAuthorized === false &&
      requirement.generationAllowed === false &&
      requirement.freshLocalVerification === false &&
      requirement.registryPresenceConfersReadiness === false &&
      requirement.assignmentFields?.assignedJobSha256 === null &&
      requirement.assignmentFields?.portableLocator === null &&
      requirement.assignmentFields?.materializationDestination === null &&
      sameJson(
        sortedUsages(requirement.usageBindings),
        sortedUsages(queueDocument?.usageBindings ?? [])
      ),
    `${requirement.componentDocumentId}: assignment, readiness, or usage binding drifted.`
  );

  if (EXACT_DOCUMENT_IDS.has(requirement.componentDocumentId)) {
    exactUsageCount += requirement.usageBindings.length;
    const queueExact = queueDocument?.exactSourceRequirement;
    const authorityAsset = queueDocument?.authorityAssets?.[0];
    const registryArtifact = registryByPath.get(
      requirement.repositorySourcePathEvidence
    );
    const repositoryArtifact = repositoryByPath.get(
      requirement.repositorySourcePathEvidence
    );
    const expectedCommand =
      `node scripts/verify-rcap-materialized-source.mjs --document-id ${requirement.authorityDocumentId}` +
      ` --sha256 ${requirement.expectedSha256} --bytes ${requirement.expectedBytes}`;

    ok(
      queueDocument?.sourceIdentityState ===
        "exact_source_requirement_ready" &&
        queueExact &&
        requirement.authorityState === "authority_asset_known" &&
        requirement.identityBindingStatus === "exact_pinned_identity" &&
        requirement.requirementDescriptorSchemaVersion ===
          "rcap-source-materialization-requirement/v1" &&
        requirement.workflowKey === authorityAsset?.workflowKey &&
        requirement.authorityDocumentId === queueExact.documentId &&
        requirement.authorityDocumentRole === queueExact.documentRole &&
        requirement.officialTitle === authorityAsset?.officialTitle &&
        requirement.revision === authorityAsset?.revision &&
        requirement.assetClass === authorityAsset?.assetClass &&
        requirement.packetCandidate === authorityAsset?.packetCandidate &&
        requirement.canonicalAuthorityPath ===
          queueExact.canonicalAuthorityPath &&
        requirement.repositorySourcePathEvidence ===
          queueExact.repositorySourcePath &&
        requirement.expectedSha256 === queueExact.expectedSha256 &&
        requirement.expectedBytes === queueExact.expectedBytes &&
        requirement.expectedMediaType === queueExact.expectedMediaType &&
        requirement.expectedMeasurementBasis ===
          "carried_forward_registry_measurement" &&
        requirement.sourceMaterializationState ===
          "binary_materialization_required" &&
        requirement.readOnlyTreatment === "worker_read_only_no_modify" &&
        requirement.retentionPolicy ===
          "retain_until_worker_integration_then_captain_managed_cleanup" &&
        requirement.verificationCommand === expectedCommand &&
        requirement.captainAssignmentEligibility ===
          "requires_assignment_anchor_and_portable_projection",
      `${requirement.componentDocumentId}: exact identity does not match the queue and retained authority asset.`
    );
    ok(
      /^[0-9a-f]{64}$/.test(requirement.expectedSha256) &&
        Number.isSafeInteger(requirement.expectedBytes) &&
        requirement.expectedBytes > 0 &&
        registryArtifact?.inventorySha256 === requirement.expectedSha256 &&
        registryArtifact?.measuredSha256 === requirement.expectedSha256 &&
        registryArtifact?.sizeBytes === requirement.expectedBytes &&
        registryArtifact?.pageCount === requirement.carriedPageCount &&
        registryArtifact?.fieldCount === requirement.carriedFieldCount &&
        registryArtifact?.technicalClass ===
          requirement.carriedTechnicalClass &&
        registryArtifact?.encrypted === false &&
        registryArtifact?.xfa === false &&
        repositoryArtifact?.sha256 === requirement.expectedSha256 &&
        repositoryArtifact?.libraryRow?.documentId ===
          requirement.authorityDocumentId &&
        repositoryArtifact?.libraryRow?.assetClass === requirement.assetClass &&
        repositoryArtifact?.libraryRow?.canonicalRelativePath ===
          requirement.canonicalAuthorityPath,
      `${requirement.componentDocumentId}: carried registry measurement or authority reconciliation differs.`
    );
    sourceObservations.push({
      componentDocumentId: requirement.componentDocumentId,
      identityBindingStatus: "exact_pinned_identity",
      state: "binary_materialization_required",
      expectedSha256: requirement.expectedSha256,
      expectedBytes: requirement.expectedBytes
    });
    continue;
  }

  unresolvedUsageCount += requirement.usageBindings.length;
  ok(
    UNRESOLVED_DOCUMENT_IDS.has(requirement.componentDocumentId) &&
      queueDocument?.sourceIdentityState === "authority_identity_unresolved" &&
      queueDocument?.exactSourceRequirement === null &&
      queueDocument?.authorityAssets?.length === 0 &&
      queueDocument?.repositoryCandidates?.length === 0 &&
      requirement.authorityState === "authority_identity_unresolved" &&
      requirement.identityBindingStatus === "unknown_source_identity" &&
      requirement.requirementDescriptorSchemaVersion === null &&
      requirement.workflowKey === null &&
      requirement.authorityDocumentId === null &&
      requirement.authorityDocumentRole === null &&
      requirement.officialTitle === null &&
      requirement.revision === null &&
      requirement.assetClass === null &&
      requirement.packetCandidate === false &&
      requirement.canonicalAuthorityPath === null &&
      requirement.repositorySourcePathEvidence === null &&
      requirement.expectedSha256 === null &&
      requirement.expectedBytes === null &&
      requirement.expectedMediaType === null &&
      requirement.carriedPageCount === null &&
      requirement.carriedFieldCount === null &&
      requirement.carriedTechnicalClass === null &&
      requirement.expectedMeasurementBasis === null &&
      requirement.sourceMaterializationState === "unknown_source_identity" &&
      requirement.readOnlyTreatment === null &&
      requirement.retentionPolicy === null &&
      requirement.verificationCommand === null &&
      requirement.captainAssignmentEligibility ===
        "ineligible_until_exact_authority_identity_is_adopted" &&
      requirement.nonSubstitutableEvidence.every(
        (evidence) => evidence.selectable === false
      ),
    `${requirement.componentDocumentId}: unresolved identity gained an invented source or pin.`
  );
  sourceObservations.push({
    componentDocumentId: requirement.componentDocumentId,
    identityBindingStatus: "unknown_source_identity",
    state: "ineligible_for_materialization"
  });
}

ok(
  exactUsageCount === 9 && unresolvedUsageCount === 7,
  "Exact and unresolved usage totals do not equal the assigned 9/7 split."
);
const rsa3 = requirements.find(
  (requirement) =>
    requirement.componentDocumentId === "AOCCRSA3F-010122"
);
const rsa4 = requirements.find(
  (requirement) =>
    requirement.componentDocumentId === "AOCCRSA4F-010122"
);
const form31a = requirements.find(
  (requirement) =>
    requirement.componentDocumentId === "AOCCR41FORM31A-082224"
);
ok(
  rsa3?.nonSubstitutableEvidence?.[0]?.evidenceId ===
    "AOCCRSA3F-103023" &&
    rsa3.nonSubstitutableEvidence[0].selectable === false &&
    rsa4?.nonSubstitutableEvidence?.[0]?.evidenceId ===
      "AOCCRSA4F-103023" &&
    rsa4.nonSubstitutableEvidence[0].selectable === false &&
    form31a?.nonSubstitutableEvidence?.[0]?.evidenceId === "AO-2025-215" &&
    form31a.nonSubstitutableEvidence[0].selectable === false,
  "Near-name retained certificate forms or the Rule 41 order lost explicit non-substitution treatment."
);
section(
  "2. Sources: four exact pins carry hashes/bytes and seven identities fail closed as unknown; zero sources are projected."
);

// ---------------------------------------------------------------------------
// 3. Renderer lanes, zero-write field maps, and ownership
// ---------------------------------------------------------------------------

ok(
  renderer.enabled === false &&
    renderer.activeRendererCount === 0 &&
    renderer.documents.length === 11 &&
    sameJson(
      renderer.documents.map((document) => document.componentDocumentId),
      DOCUMENT_IDS
    ) &&
    renderer.documents.every((document) => document.activeRenderer === null),
  "Renderer scaffold contains an active, missing, or reordered document renderer."
);
const acroformCandidates = renderer.documents.filter(
  (document) =>
    document.candidateRendererLane === "acroform_or_hybrid_fill"
);
const overlayCandidates = renderer.documents.filter(
  (document) => document.candidateRendererLane === "coordinate_overlay"
);
const unresolvedRendererDocuments = renderer.documents.filter(
  (document) => document.identityBindingStatus === "unknown_source_identity"
);
ok(
  acroformCandidates.length === 2 &&
    sameSet(
      acroformCandidates.map((document) => document.componentDocumentId),
      ["AOCCRSL1F-050825", "AOCCRSL2F-050825"]
    ) &&
    overlayCandidates.length === 2 &&
    sameSet(
      overlayCandidates.map((document) => document.componentDocumentId),
      ["AOC-CREM2F-071221", "AOC-CREM3F-071221"]
    ) &&
    unresolvedRendererDocuments.length === 7 &&
    unresolvedRendererDocuments.every(
      (document) =>
        document.candidateRendererLane === null &&
        document.rendererSelectionState ===
          "prohibited_unknown_source_identity"
    ),
  "AcroForm, overlay, or unresolved renderer-lane counts changed."
);

ok(
  fieldMapSchema.properties?.jurisdiction?.const === "AZ" &&
    fieldMapSchema.properties?.activeMappingCount?.const === 0 &&
    fieldMapSchema.properties?.activeOverlayPlacementCount?.const === 0 &&
    fieldMapSchema.properties?.documents?.minItems === 11 &&
    fieldMapSchema.properties?.documents?.maxItems === 11 &&
    fieldMaps.activeMappingCount === 0 &&
    fieldMaps.activeOverlayPlacementCount === 0 &&
    fieldMaps.documents.length === 11 &&
    sameJson(
      fieldMaps.documents.map((document) => document.componentDocumentId),
      DOCUMENT_IDS
    ) &&
    fieldMaps.documents.every(
      (document) =>
        document.sourceBacked === false &&
        document.activeMappings.length === 0 &&
        document.activeOverlayPlacements.length === 0
    ),
  "Field-map schema or map opened a write or lost document coverage."
);
for (const fieldMap of fieldMaps.documents) {
  const requirement = requirements.find(
    (candidate) =>
      candidate.componentDocumentId === fieldMap.componentDocumentId
  );
  const rendererDocument = renderer.documents.find(
    (candidate) =>
      candidate.componentDocumentId === fieldMap.componentDocumentId
  );
  ok(
    fieldMap.identityBindingStatus === requirement?.identityBindingStatus &&
      fieldMap.candidateRendererLane ===
        rendererDocument?.candidateRendererLane &&
      fieldMap.carriedPageCount === requirement?.carriedPageCount &&
      fieldMap.carriedFieldCount === requirement?.carriedFieldCount &&
      fieldMap.carriedTechnicalClass ===
        requirement?.carriedTechnicalClass &&
      (requirement?.identityBindingStatus === "exact_pinned_identity"
        ? fieldMap.fieldEnumerationStatus ===
          "pending_captain_projection_inspection"
        : fieldMap.fieldEnumerationStatus ===
          "prohibited_unknown_source_identity"),
    `${fieldMap.componentDocumentId}: field-map identity or carried metadata drifted.`
  );
}

ok(
  ownershipSchema.properties?.jurisdiction?.const === "AZ" &&
    ownershipSchema.properties?.documents?.minItems === 11 &&
    ownershipSchema.properties?.documents?.maxItems === 11 &&
    ownership.automationPolicy.activeWritableFieldCount === 0 &&
    ownership.automationPolicy.signaturesAlwaysManual === true &&
    ownership.automationPolicy.swornStatementsAlwaysManual === true &&
    ownership.automationPolicy.unknownOwnerDefaultsToProtected === true &&
    PROTECTED_OWNER_CLASSES.every((owner) =>
      ownership.automationPolicy.protectedOwnerClasses.includes(owner)
    ) &&
    ownership.documents.length === 11 &&
    sameJson(
      ownership.documents.map((document) => document.componentDocumentId),
      DOCUMENT_IDS
    ) &&
    ownership.documents.every(
      (document) =>
        document.activeWritableFields.length === 0 &&
        document.protectedBlocks.length >= 1 &&
        document.protectedBlocks.some(
          (block) =>
            block.owner === "unknown" && block.automation === "never_fill"
        ) &&
        document.manualParticipantBlocks.every(
          (block) => block.automation === "manual_only"
        )
    ),
  "Ownership schema or map opened automation or lost manual/protected coverage."
);
const proposedOrderOwnership = ownership.documents.filter((document) =>
  [
    "AOCCR41FORM31B-082224",
    "AOCCRSA4F-010122",
    "AOCCRSL2F-050825"
  ].includes(document.componentDocumentId)
);
ok(
  proposedOrderOwnership.every((document) =>
    document.protectedBlocks.some(
      (block) => block.owner === "judge" && block.automation === "never_fill"
    )
  ),
  "A proposed-order document lost protected judicial ownership."
);
section(
  "3. Mapping: two AcroForm candidates, two overlay candidates, and seven unknown lanes remain zero-write with protected ownership."
);

// ---------------------------------------------------------------------------
// 4. Adopted assemblies and physical-source deduplication
// ---------------------------------------------------------------------------

ok(
  assemblySchema.properties?.jurisdiction?.const === "AZ" &&
    assemblySchema.properties?.runtimeRegistered?.const === false &&
    assemblySchema.properties?.routeReadyCount?.const === 0 &&
    assemblySchema.properties?.physicalSourceCatalog?.minItems === 11 &&
    assemblySchema.properties?.physicalSourceCatalog?.maxItems === 11 &&
    assemblySchema.properties?.assemblies?.minItems === 8 &&
    assemblySchema.properties?.assemblies?.maxItems === 8,
  "Packet-assembly schema lost Arizona scope or deterministic cardinality."
);
ok(
  assembly.runtimeRegistered === false &&
    assembly.routeReadyCount === 0 &&
    assembly.assemblies.length === 8 &&
    sameJson(
      assembly.assemblies.map((route) => route.trackId),
      TRACK_IDS
    ) &&
    assembly.physicalSourceCatalog.length === 11 &&
    unique(
      assembly.physicalSourceCatalog.map(
        (document) => document.componentDocumentId
      )
    ) &&
    unique(
      assembly.physicalSourceCatalog.map(
        (document) => document.sourceIdentityKey
      )
    ) &&
    sameJson(
      assembly.physicalSourceCatalog.map(
        (document) => document.componentDocumentId
      ),
      DOCUMENT_IDS
    ) &&
    assembly.physicalSourceCatalog.every(
      (document) => document.runtimeSelectable === false
    ),
  "Packet assembly opened runtime or lost route/source-catalog coverage."
);
ok(
  assembly.deduplication.componentUsageCount === 16 &&
    assembly.deduplication.uniquePhysicalSourceSlotCount === 11 &&
    assembly.deduplication.deduplicatedUsageBindingCount === 5 &&
    assembly.deduplication.uniqueExactSourceCount === 4 &&
    assembly.deduplication.uniqueUnresolvedSourceSlotCount === 7 &&
    assembly.deduplication.componentUsageCount -
      assembly.deduplication.uniquePhysicalSourceSlotCount ===
      assembly.deduplication.deduplicatedUsageBindingCount,
  "Physical-source deduplication counts differ from 16 usages / 11 slots / 5 repeated bindings."
);

const packetSetByTrack = new Map(
  packetSets.packetSets
    .filter(
      (packetSet) =>
        packetSet.jurisdiction === "AZ" &&
        TRACK_IDS.includes(packetSet.trackId)
    )
    .map((packetSet) => [packetSet.trackId, packetSet])
);
ok(
  packetSetByTrack.size === 8,
  "Adopted packet-set manifest no longer contains all eight Arizona tracks."
);

const assembledComponentIds = [];
let physicalInstanceCount = 0;

for (const routeAssembly of assembly.assemblies) {
  const packetSet = packetSetByTrack.get(routeAssembly.trackId);
  ok(
    packetSet?.packetSetId === routeAssembly.packetSetId &&
      packetSet?.version === routeAssembly.packetSetVersion &&
      sameJson(
        routeAssembly.logicalComponents,
        packetSet?.components.map(projectComponent)
      ) &&
      routeAssembly.assemblyState === "blocked",
    `${routeAssembly.trackId}: assembly differs from its adopted packet set.`
  );

  const logicalIds = routeAssembly.logicalComponents.map(
    (component) => component.componentId
  );
  const physicalLogicalIds = routeAssembly.physicalDocumentInstances.flatMap(
    (document) => document.logicalComponentIds
  );
  assembledComponentIds.push(...logicalIds);
  physicalInstanceCount += routeAssembly.physicalDocumentInstances.length;

  ok(
    unique(
      routeAssembly.physicalDocumentInstances.map(
        (document) => document.sourceIdentityKey
      )
    ) &&
      sameSet(physicalLogicalIds, logicalIds) &&
      unique(physicalLogicalIds) &&
      routeAssembly.physicalDocumentInstances.every(
        (document) =>
          document.physicalCopyCount === 1 &&
          document.logicalComponentIds.length >= 1
      ),
    `${routeAssembly.trackId}: physical instances duplicate a source or fail to cover logical components exactly once.`
  );

  for (const physicalDocument of routeAssembly.physicalDocumentInstances) {
    const catalogDocument = assembly.physicalSourceCatalog.find(
      (candidate) =>
        candidate.componentDocumentId ===
        physicalDocument.componentDocumentId
    );
    const logicalComponents = routeAssembly.logicalComponents.filter(
      (component) =>
        physicalDocument.logicalComponentIds.includes(component.componentId)
    );
    const expectedRenderState =
      catalogDocument?.identityBindingStatus === "exact_pinned_identity"
        ? "blocked_source_materialization"
        : "blocked_unknown_source_identity";
    ok(
      catalogDocument?.sourceIdentityKey ===
        physicalDocument.sourceIdentityKey &&
        logicalComponents.every(
          (component) =>
            component.officialFormId ===
            physicalDocument.componentDocumentId
        ) &&
        physicalDocument.renderState === expectedRenderState,
      `${routeAssembly.trackId}/${physicalDocument.instanceId}: physical source identity or fail-closed state drifted.`
    );
  }
}

ok(
  assembledComponentIds.length === 16 &&
    sameSet(assembledComponentIds, COMPONENT_IDS) &&
    unique(assembledComponentIds) &&
    physicalInstanceCount === 16,
  "Assemblies do not cover all sixteen adopted component usages exactly once."
);

for (const catalogDocument of assembly.physicalSourceCatalog) {
  const requirement = requirements.find(
    (candidate) =>
      candidate.componentDocumentId ===
      catalogDocument.componentDocumentId
  );
  ok(
    catalogDocument.identityBindingStatus ===
      requirement?.identityBindingStatus &&
      sameJson(
        sortedUsages(catalogDocument.usageBindings),
        sortedUsages(requirement?.usageBindings ?? [])
      ),
    `${catalogDocument.componentDocumentId}: physical-source catalog lost identity or provenance bindings.`
  );
}
section(
  "4. Assembly: eight adopted packets cover sixteen logical usages while eleven physical source slots deduplicate five repeated bindings."
);

// ---------------------------------------------------------------------------
// 5. Synthetic fixtures cover every logical component and both stop classes
// ---------------------------------------------------------------------------

ok(
  fixtureSchema.properties?.jurisdiction?.const === "AZ" &&
    fixtureSchema.properties?.fixtureDataPolicy?.const ===
      "synthetic_only_no_source_bytes_no_participant_data" &&
    fixtureSchema.properties?.fixtures?.minItems === 16 &&
    fixtureSchema.properties?.fixtures?.maxItems === 16 &&
    fixtures.fixtureDataPolicy ===
      "synthetic_only_no_source_bytes_no_participant_data" &&
    fixtures.fixtures.length === 16 &&
    unique(fixtures.fixtures.map((fixture) => fixture.fixtureId)) &&
    unique(fixtures.fixtures.map((fixture) => fixture.componentId)) &&
    sameSet(
      fixtures.fixtures.map((fixture) => fixture.componentId),
      COMPONENT_IDS
    ) &&
    sameSet(
      [...new Set(fixtures.fixtures.map((fixture) => fixture.trackId))],
      TRACK_IDS
    ) &&
    fixtures.fixtures.every(
      (fixture) =>
        fixture.synthetic === true &&
        fixture.generationAttempted === false &&
        fixture.manualSignaturesBlank === true &&
        fixture.thirdPartyFieldsBlank === true
    ),
  "Fixture schema or fixtures lost synthetic policy, cardinality, or component/track coverage."
);

let exactFixtureCount = 0;
let unresolvedFixtureCount = 0;
for (const fixture of fixtures.fixtures) {
  const requirement = requirements.find(
    (candidate) =>
      candidate.componentDocumentId === fixture.componentDocumentId
  );
  const expectedBoundary =
    requirement?.identityBindingStatus === "exact_pinned_identity"
      ? "source_materialization_required"
      : "unknown_source_identity";
  if (expectedBoundary === "source_materialization_required") {
    exactFixtureCount += 1;
  } else {
    unresolvedFixtureCount += 1;
  }
  ok(
    fixture.identityBindingStatus === requirement?.identityBindingStatus &&
      fixture.expectedBoundaryCode === expectedBoundary &&
      requirement?.usageBindings.some(
        (binding) =>
          binding.trackId === fixture.trackId &&
          binding.componentId === fixture.componentId
      ),
    `${fixture.fixtureId}: fixture identity, usage, or expected stop differs.`
  );
}
ok(
  exactFixtureCount === 9 && unresolvedFixtureCount === 7,
  "Fixture stop-class counts do not match nine exact usages and seven unresolved usages."
);
section(
  "5. Fixtures: sixteen synthetic component fixtures cover nine materialization stops and seven unknown-identity stops."
);

// ---------------------------------------------------------------------------
// 6. Review and dependency gates remain closed
// ---------------------------------------------------------------------------

ok(
  review.sourceBackedSampleCount === 0 &&
    review.fieldMapReviewArtifactCount === 0 &&
    review.identitySummary.exactPinned === 4 &&
    review.identitySummary.unknownSourceIdentity === 7 &&
    review.identitySummary.captainProjected === 0 &&
    review.identitySummary.freshlyVerifiedLocalBytes === 0 &&
    review.documentReviews.length === 11 &&
    review.routeReviews.length === 8 &&
    sameJson(
      review.documentReviews.map(
        (document) => document.componentDocumentId
      ),
      DOCUMENT_IDS
    ) &&
    sameJson(
      review.routeReviews.map((route) => route.trackId),
      TRACK_IDS
    ) &&
    review.documentReviews.every(
      (document) =>
        document.sampleStatus === "not_generated" &&
        document.technicalReview === "not_started" &&
        document.visualReview === "not_started" &&
        document.legalOutputReview === "not_started"
    ) &&
    review.routeReviews.every(
      (route) =>
        route.sampleStatus === "not_generated" &&
        route.reviewStatus === "blocked" &&
        route.blockers.length >= 1
    ) &&
    Object.values(review.approvals).every((value) => value === false),
  "Review manifest contains a sample, approval, or coverage gap."
);

const dependencyById = new Map(
  dependencies.dependencies.map((dependency) => [
    dependency.dependencyId,
    dependency
  ])
);
for (const dependencyId of [
  "az-source-materialization-contract",
  "az-seven-exact-authority-identities",
  "az-non-substitution-reconciliation",
  "az-source-gated-petition-clearance",
  "az-projected-source-technical-inspection",
  "az-field-map-and-ownership-completion",
  "az-deterministic-source-backed-regression",
  "az-source-freshness-visual-legal-review",
  "az-certificate-form-currency"
]) {
  ok(
    dependencyById.get(dependencyId)?.status === "blocked",
    `${dependencyId}: required dependency is not blocked.`
  );
}
ok(
  dependencyById.get("az-shared-surface-isolation")?.status ===
    "satisfied",
  "Arizona shared-surface isolation dependency is not satisfied."
);
section(
  "6. Review: zero source-backed samples and all authority, projection, mapping, technical, visual, legal, and currency gates remain closed."
);

// ---------------------------------------------------------------------------
// 7. Typed runtime boundary is terminal and unregistered
// ---------------------------------------------------------------------------

for (const marker of [
  FAMILY_ID,
  "ARIZONA_OFFICIAL_PDF_TRACK_IDS",
  "ARIZONA_OFFICIAL_PDF_DOCUMENT_IDS",
  "ARIZONA_OFFICIAL_PDF_COMPONENTS",
  "unknown_source_identity",
  "source_materialization_required",
  "generation_disabled",
  "activeRendererCount: 0"
]) {
  ok(moduleText.includes(marker), `TypeScript boundary is missing ${marker}.`);
}
for (const trackId of TRACK_IDS) {
  ok(
    moduleText.includes(`"${trackId}"`),
    `TypeScript boundary omits track ${trackId}.`
  );
}
for (const componentId of COMPONENT_IDS) {
  ok(
    moduleText.includes(`"${componentId}"`),
    `TypeScript boundary omits component ${componentId}.`
  );
}
for (const requirement of requirements) {
  ok(
    moduleText.includes(`"${requirement.componentDocumentId}"`),
    `TypeScript boundary omits document ${requirement.componentDocumentId}.`
  );
  if (requirement.identityBindingStatus === "exact_pinned_identity") {
    ok(
      moduleText.includes(requirement.expectedSha256) &&
        moduleText.includes(`expectedBytes: ${requirement.expectedBytes}`),
      `TypeScript boundary omits exact pins for ${requirement.componentDocumentId}.`
    );
  }
}

const packetRegistryFiles = fs
  .readdirSync(absolute("src/lib/rcap/packets"))
  .filter((fileName) => /^registry.*\.ts$/.test(fileName))
  .map((fileName) => `src/lib/rcap/packets/${fileName}`);
for (const registryFile of packetRegistryFiles) {
  const text = fs.readFileSync(absolute(registryFile), "utf8");
  ok(
    !text.includes("jurisdictions/arizona/official-pdf") &&
      !text.includes(FAMILY_ID),
    `${registryFile}: Arizona scaffold was imported into a shared registry.`
  );
}
section(
  "7. Runtime: typed exact/unresolved terminal stops exist and no shared packet registry imports Arizona."
);

// ---------------------------------------------------------------------------
// 8. Shared-surface isolation and no source-byte ingress
// ---------------------------------------------------------------------------

for (const preservedPath of family.preservedSharedSurfaces) {
  ok(
    fs.existsSync(absolute(preservedPath)),
    `Preserved shared surface is missing: ${preservedPath}.`
  );
}
const unstagedSharedDiff = spawnSync(
  "git",
  ["diff", "--quiet", "--", ...family.preservedSharedSurfaces],
  { cwd: ROOT }
);
const stagedSharedDiff = spawnSync(
  "git",
  ["diff", "--cached", "--quiet", "--", ...family.preservedSharedSurfaces],
  { cwd: ROOT }
);
ok(
  unstagedSharedDiff.status === 0 && stagedSharedDiff.status === 0,
  "A shared queue, legal-design, authority, audit, registry, or package surface changed."
);

const familyPdfFiles = [];
function collectPdfFiles(directory) {
  if (!fs.existsSync(directory)) {
    return;
  }
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectPdfFiles(entryPath);
    } else if (entry.name.toLowerCase().endsWith(".pdf")) {
      familyPdfFiles.push(entryPath);
    }
  }
}
collectPdfFiles(absolute(FAMILY_DIR));
collectPdfFiles(absolute(path.dirname(MODULE_PATH)));
ok(
  familyPdfFiles.length === 0,
  "Arizona-owned paths contain copied, acquired, generated, or reconstructed PDF bytes."
);

const forbiddenCodeFragments = [
  "PDF" + "Document",
  "node:" + "crypto",
  "fetch" + "(",
  "https." + "request",
  "create" + "ReadStream"
];
ok(
  forbiddenCodeFragments.every(
    (fragment) =>
      !moduleText.includes(fragment) && !verifierText.includes(fragment)
  ),
  "Arizona code contains a PDF parser, hashing, network acquisition, or byte-stream path."
);

for (const requirement of requirements) {
  ok(
    requirement.assignmentFields.portableLocator === null &&
      requirement.assignmentFields.materializationDestination === null,
    `${requirement.componentDocumentId}: a locator or materialization destination was invented.`
  );
}

const ownedTextFiles = Object.values(files).filter(
  (relativePath) =>
    relativePath.startsWith(FAMILY_DIR) ||
    relativePath === MODULE_PATH ||
    relativePath === VERIFIER_PATH
);
for (const relativePath of ownedTextFiles) {
  const text = fs.readFileSync(absolute(relativePath), "utf8");
  ok(
    !text.includes("/" + "workspaces/"),
    `${relativePath}: host-specific absolute path is persisted.`
  );
}
section(
  "8. Isolation: shared surfaces are untouched, no PDF bytes exist, and no source-reading, hashing, or network path was added."
);

// ---------------------------------------------------------------------------
// Explicit fail-closed source request
// ---------------------------------------------------------------------------

const targetRequirement = targetDocumentId
  ? requirements.find(
      (requirement) =>
        requirement.componentDocumentId === targetDocumentId ||
        requirement.authorityDocumentId === targetDocumentId
    )
  : null;

if (targetDocumentId) {
  ok(
    Boolean(targetRequirement),
    `Unknown --document-id value: ${targetDocumentId}.`
  );
}
if (requireProjectedSource && !targetDocumentId) {
  failures.push("--require-projected-source requires --document-id.");
}
if (requireProjectedSource && targetRequirement) {
  if (
    targetRequirement.identityBindingStatus === "unknown_source_identity"
  ) {
    failures.push(
      `${targetRequirement.componentDocumentId}: unknown_source_identity; an exact adopted authority identity is required before materialization.`
    );
  } else {
    failures.push(
      `${targetRequirement.componentDocumentId}: source_materialization_required; a captain assignment anchor and verified portable projection are required.`
    );
  }
}

const result = {
  ok: failures.length === 0,
  familyId: FAMILY_ID,
  jurisdiction: "AZ",
  sectionCount: sections.length,
  sections,
  scopeSummary: {
    tracks: 8,
    componentUsages: 16,
    uniqueDocumentIdentities: 11,
    deduplicatedUsageBindings: 5
  },
  sourceSummary: {
    retainedExactIdentities: EXACT_DOCUMENT_IDS.size,
    authorityUnresolvedIdentities: UNRESOLVED_DOCUMENT_IDS.size,
    exactIdentityUsageBindings: exactUsageCount,
    unresolvedIdentityUsageBindings: unresolvedUsageCount,
    acroformOrHybridCandidates: acroformCandidates.length,
    coordinateOverlayCandidates: overlayCandidates.length,
    captainProjectedExactSources: 0,
    activeRenderers: 0,
    activeFieldMappings: 0,
    activeOverlayPlacements: 0,
    sourceBackedSamples: 0,
    workerSourceInspectionPerformed: false,
    networkAcquisitionPerformed: false
  },
  captainSourceContract: {
    assignmentAnchor: null,
    portableProjection: null,
    captainAssignmentRequired: true,
    portableProjectionRequired: true,
    repositorySourcePathTreatment:
      "identity_evidence_only_never_worker_source"
  },
  targetDocumentId,
  requireProjectedSource,
  sourceObservations,
  failures
};

if (jsonOutput) {
  console.log(JSON.stringify(result, null, 2));
} else if (failures.length === 0) {
  console.log(
    `Arizona official-PDF family verification passed (${sections.length} sections).`
  );
  for (const message of sections) {
    console.log(`- ${message}`);
  }
  console.log(
    "- Source contract: 4 exact pins, 7 unknown identities, 0 projected sources, 0 active renderers, and no source bytes inspected."
  );
} else {
  console.error(
    `Arizona official-PDF family verification failed (${failures.length} issue${failures.length === 1 ? "" : "s"}).`
  );
  console.error(
    "- Source contract: assignment anchor and portable projection are absent; repository paths remain identity evidence only."
  );
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
}

if (failures.length > 0) {
  process.exitCode = 1;
}
