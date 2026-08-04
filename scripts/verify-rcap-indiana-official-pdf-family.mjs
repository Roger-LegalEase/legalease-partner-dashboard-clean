#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FAMILY_ID = "rcap-in-official-pdf-family";
const FAMILY_DIR =
  "data/record-clearing/production-factory/official-pdf-families/IN";
const MODULE_DIR = "src/lib/rcap/packets/jurisdictions/indiana";

const files = {
  family: `${FAMILY_DIR}/family-manifest.json`,
  sourceSchema: `${FAMILY_DIR}/source-requirements.schema.json`,
  sources: `${FAMILY_DIR}/source-requirements.json`,
  rendererSchema: `${FAMILY_DIR}/renderer-scaffold.schema.json`,
  renderer: `${FAMILY_DIR}/renderer-scaffold.json`,
  mapsSchema: `${FAMILY_DIR}/field-maps.schema.json`,
  maps: `${FAMILY_DIR}/field-maps.json`,
  ownershipSchema: `${FAMILY_DIR}/field-ownership.schema.json`,
  ownership: `${FAMILY_DIR}/field-ownership.json`,
  fixturesSchema: `${FAMILY_DIR}/fixtures.schema.json`,
  fixtures: `${FAMILY_DIR}/fixtures.json`,
  assemblySchema: `${FAMILY_DIR}/packet-assembly.schema.json`,
  assembly: `${FAMILY_DIR}/packet-assembly.json`,
  dependencies: `${FAMILY_DIR}/dependencies.json`,
  review: `${FAMILY_DIR}/review-manifest.json`,
  preflight: `${MODULE_DIR}/official-pdf-preflight.ts`,
  acroform: `${MODULE_DIR}/acroform.ts`,
  queue:
    "data/record-clearing/production-factory/official-pdf-production-queue.json",
  packetSets: "data/record-clearing/legal-design-packet-set-manifests.json",
  authority: "data/record-clearing/master-library/authority.json",
  repositoryAudit:
    "data/record-clearing/master-library/repository-asset-audit.json",
  sourceRegistry: "data/record-clearing/source-artifact-registry.json",
};

const TRACK_IDS = [
  "in_arrest_no_charges",
  "in_conviction_d6",
  "in_conviction_felony",
  "in_conviction_misd",
  "in_conviction_serious_felony",
  "in_section1_petition",
];

const DOCUMENT_IDS = [
  "CCA conviction expungement order",
  "CCA conviction expungement petition",
  "CCA Section 1 expungement order",
  "CCA Section 1 non-conviction expungement petition",
  "CCA-GF-0120-3016",
  "CCA-XP-0120-7002 Form ACR",
  "CCA-XP-0220-7008",
  "CCA-XP-0220-7009",
  "CCA-XP-0220-7010",
  "Confidential Information Form",
];

const EXACT_PINS = {
  "CCA-XP-0220-7008": {
    workflowKey: "IN:CCA-XP-0220-7008:PETITION:EN",
    sha256: "2c4aaf4a68b06f192e5f0c4b9bbfe0dd4c04b4b1f5e0fbab879bb450223e78f0",
    bytes: 3981416,
    fields: 85,
    canonical:
      "STATES/IN/02_PACKET_FORMS/IN__FORM__CCA-XP-0220-7008__conviction-expungement-insert-i-c-35-38-9-2__REV-2020-02__EN.pdf",
  },
  "CCA-XP-0220-7009": {
    workflowKey: "IN:CCA-XP-0220-7009:PETITION:EN",
    sha256: "499ed8a49c785fa949bcce19c3783f84318b73bc162cb5db8576094a321990b1",
    bytes: 2620327,
    fields: 67,
    canonical:
      "STATES/IN/02_PACKET_FORMS/IN__FORM__CCA-XP-0220-7009__conviction-expungement-insert-i-c-35-38-9-3__REV-2020-02__EN.pdf",
  },
  "CCA-XP-0220-7010": {
    workflowKey: "IN:CCA-XP-0220-7010:PETITION:EN",
    sha256: "b613c145701a5185fd11d4df61efad5d3b352fc13987581531267868724fbf4b",
    bytes: 784143,
    fields: 68,
    canonical:
      "STATES/IN/02_PACKET_FORMS/IN__FORM__CCA-XP-0220-7010__conviction-expungement-insert-i-c-35-38-9-4__REV-2020-02__EN.pdf",
  },
};

const EXACT_DOCUMENT_IDS = new Set(Object.keys(EXACT_PINS));
const UNRESOLVED_DOCUMENT_IDS = new Set(
  DOCUMENT_IDS.filter((documentId) => !EXACT_DOCUMENT_IDS.has(documentId)),
);
const MANUAL_FIELDS = [
  "participantSignature",
  "participantSignatureDate",
  "participantVerification",
  "fullSocialSecurityNumber",
];
const PROTECTED_OWNERS = [
  "court",
  "judge",
  "clerk",
  "prosecutor",
  "agency",
  "law_enforcement",
  "attorney",
  "notary",
  "witness",
  "process_server",
  "unknown",
];

const argv = process.argv.slice(2);
let jsonOutput = false;
let targetDocumentId = null;
let requireSourceReady = false;
let requireMaterialized = false;
let requireRenderable = false;
const failures = [];
const sections = [];

for (let index = 0; index < argv.length; index += 1) {
  const argument = argv[index];
  if (argument === "--json") {
    jsonOutput = true;
  } else if (argument === "--document-id") {
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      failures.push("--document-id requires a value.");
    } else {
      targetDocumentId = value;
      index += 1;
    }
  } else if (argument === "--require-source-ready") {
    requireSourceReady = true;
  } else if (argument === "--require-materialized") {
    requireMaterialized = true;
  } else if (argument === "--require-renderable") {
    requireRenderable = true;
  } else {
    failures.push(`Unknown argument: ${argument}`);
  }
}

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), "utf8"));
}

function check(condition, message) {
  if (!condition) failures.push(message);
}

function section(message) {
  sections.push(message);
}

function sameJson(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function sameSet(actual, expected) {
  return (
    actual.length === expected.length &&
    actual.every((value) => expected.includes(value))
  );
}

function unique(values) {
  return new Set(values).size === values.length;
}

function sortedUsages(bindings) {
  return bindings
    .map((binding) => ({
      trackId: binding.trackId,
      componentId: binding.componentId,
      role: binding.role,
    }))
    .sort((left, right) =>
      `${left.trackId}:${left.componentId}`.localeCompare(
        `${right.trackId}:${right.componentId}`,
      ),
    );
}

function projectComponent(component) {
  return {
    componentId: component.componentId,
    role: component.role,
    requirement: component.requirement,
    conditionDescription: component.conditionDescription ?? null,
    outputStrategy: component.outputStrategy,
    officialFormId: component.officialFormId,
    order: component.order,
  };
}

for (const [label, relativePath] of Object.entries(files)) {
  check(
    fs.existsSync(absolute(relativePath)),
    `${label}: missing ${relativePath}`,
  );
}

if (failures.length > 0) finish();

const family = readJson(files.family);
const sourceSchema = readJson(files.sourceSchema);
const sources = readJson(files.sources);
const rendererSchema = readJson(files.rendererSchema);
const renderer = readJson(files.renderer);
const mapsSchema = readJson(files.mapsSchema);
const maps = readJson(files.maps);
const ownershipSchema = readJson(files.ownershipSchema);
const ownership = readJson(files.ownership);
const fixturesSchema = readJson(files.fixturesSchema);
const fixtures = readJson(files.fixtures);
const assemblySchema = readJson(files.assemblySchema);
const assembly = readJson(files.assembly);
const dependencies = readJson(files.dependencies);
const review = readJson(files.review);
const queue = readJson(files.queue);
const packetSets = readJson(files.packetSets);
const authority = readJson(files.authority);
const repositoryAudit = readJson(files.repositoryAudit);
const sourceRegistry = readJson(files.sourceRegistry);
const preflightText = fs.readFileSync(absolute(files.preflight), "utf8");
const acroformText = fs.readFileSync(absolute(files.acroform), "utf8");
const verifierText = fs.readFileSync(
  absolute("scripts/verify-rcap-indiana-official-pdf-family.mjs"),
  "utf8",
);

// 1. Immutable family boundary and queue scope.
check(
  family.familyId === FAMILY_ID &&
    family.jurisdiction === "IN" &&
    family.priority === 15 &&
    family.authorityEdition === "1.2" &&
    family.authorityArchiveSha256 ===
      "7edd0a0e8308b58e12f59494a326342cc83dd362bb58f787e43d6fb475ef43bd",
  "Family identity, priority, or Edition 1.2 authority pin drifted.",
);
check(
  family.authorityPins.legalReviewWorkflowKey ===
    "IN:STATEWIDE:LEGAL_REVIEW:EN" &&
    family.authorityPins.legalReviewSha256 ===
      "bb95a5e31824b64d6a73539e4a322498ded1f7bd9baf97e08569e0f2cbad5544" &&
    family.authorityPins.legalReviewAddendumWorkflowKey ===
      "IN:STATEWIDE-ADDENDUM:LEGAL_REVIEW_ADDENDUM:EN" &&
    family.authorityPins.legalReviewAddendumSha256 ===
      "1d864c7fea5512042830826ddd799f5bc7b9d42e3aecde1a24470cd2d38495b9",
  "Indiana legal-review authority pins drifted.",
);
check(
  sameJson(family.scope.trackIds, TRACK_IDS) &&
    sameJson(family.scope.documentIds, DOCUMENT_IDS) &&
    family.scope.trackCount === 6 &&
    family.scope.topLevelOfficialPdfTrackCount === 5 &&
    family.scope.officialPdfComponentCount === 31 &&
    family.scope.documentIdentityCount === 10 &&
    family.scope.exactRetainedRequirementCount === 3 &&
    family.scope.authorityUnresolvedIdentityCount === 7,
  "Family scope differs from the assigned 6-track / 31-use / 10-document family.",
);
check(
  family.sourceContract.assignmentAnchor === null &&
    family.sourceContract.portableProjection === null &&
    family.sourceContract.workerReady === false &&
    family.sourceContract.workerReadAuthorized === false &&
    family.sourceContract.workerMaterializationAuthorized === false &&
    family.sourceContract.workerMayAcquireOrDownloadSources === false &&
    family.status.packetReady === false &&
    family.status.generationAllowed === false &&
    family.status.enabled === false,
  "Family source or runtime boundary is no longer fail closed.",
);

const queueFamily = queue.families.find(
  (candidate) => candidate.familyId === FAMILY_ID,
);
check(
  queueFamily?.jurisdiction === "IN" &&
    queueFamily.priority === 15 &&
    sameJson(queueFamily.trackIds, TRACK_IDS) &&
    queueFamily.counts.trackCount === 6 &&
    queueFamily.counts.topLevelOfficialPdfTrackCount === 5 &&
    queueFamily.counts.componentCount === 31 &&
    queueFamily.counts.documentCount === 10 &&
    queueFamily.counts.exactSourceRequirementCount === 3 &&
    queueFamily.counts.unresolvedSourceIdentityCount === 7 &&
    queueFamily.workerReady === false &&
    queueFamily.packetReady === false &&
    queueFamily.enabled === false,
  "Read-only production queue evidence differs from Indiana family scope.",
);
check(
  sameJson(
    queueFamily.documents.map((document) => document.officialFormId),
    DOCUMENT_IDS,
  ),
  "Queue document identity order or membership changed.",
);
check(
  authority.edition === "1.2" &&
    authority.adoptionStatus === "adopted" &&
    authority.retention.archiveSha256 === family.authorityArchiveSha256,
  "Master Library Edition 1.2 authority no longer matches the Indiana pin.",
);
section(
  "Boundary: 6 tracks, 31 official-PDF uses, and 10 identities are isolated.",
);

// 2. Source identity, usage provenance, and materialization contract.
check(
  sourceSchema.properties.jurisdiction.const === "IN" &&
    sourceSchema.properties.workerReadAuthorized.const === false &&
    sourceSchema.properties.workerMaterializationAuthorized.const === false &&
    sourceSchema.properties.requirements.minItems === 10 &&
    sourceSchema.properties.requirements.maxItems === 10,
  "Source schema lost Indiana cardinality or worker authorization stops.",
);
check(
  sources.contractState === "pending_captain_assignment" &&
    sources.contractKind === "dependency_scaffold_not_worker_assignment" &&
    sources.assignmentAnchor === null &&
    sources.portableProjection === null &&
    sources.workerReady === false &&
    sources.workerReadAuthorized === false &&
    sources.workerMaterializationAuthorized === false &&
    sources.networkAcquisitionAuthorized === false &&
    sources.counts.documents === 10 &&
    sources.counts.exactRetainedRequirements === 3 &&
    sources.counts.authorityUnresolvedIdentities === 7 &&
    sources.counts.exactUsageBindings === 3 &&
    sources.counts.unresolvedUsageBindings === 28 &&
    sources.counts.captainProjectedExactSources === 0 &&
    sources.generationAllowed === false,
  "Source requirements gained authority/readiness or lost assigned counts.",
);
check(
  sources.requirements.length === 10 &&
    sameJson(
      sources.requirements.map(
        (requirement) => requirement.componentDocumentId,
      ),
      DOCUMENT_IDS,
    ) &&
    unique(
      sources.requirements.map(
        (requirement) => requirement.componentDocumentId,
      ),
    ),
  "Source requirements do not preserve all 10 unique document identities.",
);

const queueDocumentById = new Map(
  queueFamily.documents.map((document) => [document.officialFormId, document]),
);
const registryByPath = new Map(
  sourceRegistry.artifacts.map((artifact) => [artifact.sourcePath, artifact]),
);
const repositoryByPath = new Map(
  repositoryAudit.assets.map((asset) => [asset.sourcePath, asset]),
);
let exactUsageCount = 0;
let unresolvedUsageCount = 0;

for (const requirement of sources.requirements) {
  const queueDocument = queueDocumentById.get(requirement.componentDocumentId);
  check(
    requirement.workerReady === false &&
      requirement.workerReadAuthorized === false &&
      requirement.workerMaterializationAuthorized === false &&
      requirement.generationAllowed === false &&
      requirement.freshLocalVerification === false &&
      requirement.registryPresenceConfersReadiness === false &&
      requirement.assignmentFields.assignedJobSha256 === null &&
      requirement.assignmentFields.portableLocator === null &&
      requirement.assignmentFields.materializationDestination === null &&
      sameJson(
        sortedUsages(requirement.usageBindings),
        sortedUsages(queueDocument?.usageBindings ?? []),
      ),
    `${requirement.componentDocumentId}: worker authority, assignment, or usage provenance drifted.`,
  );

  const exactPin = EXACT_PINS[requirement.componentDocumentId];
  if (exactPin) {
    exactUsageCount += requirement.usageBindings.length;
    const registryArtifact = registryByPath.get(
      requirement.repositorySourcePathEvidence,
    );
    const repositoryAsset = repositoryByPath.get(
      requirement.repositorySourcePathEvidence,
    );
    check(
      requirement.identityBindingStatus === "exact_pinned_identity" &&
        requirement.authorityState === "authority_asset_known" &&
        requirement.workflowKey === exactPin.workflowKey &&
        requirement.authorityDocumentId === requirement.componentDocumentId &&
        requirement.authorityDocumentRole === "PETITION" &&
        requirement.revision === "REV-2020-02" &&
        requirement.assetClass === "packet_form" &&
        requirement.canonicalAuthorityPath === exactPin.canonical &&
        requirement.expectedSha256 === exactPin.sha256 &&
        requirement.expectedBytes === exactPin.bytes &&
        requirement.expectedMediaType === "application/pdf" &&
        requirement.technicalExpectation.technicalClass === "clean_acroform" &&
        requirement.technicalExpectation.pageCount === 3 &&
        requirement.technicalExpectation.fieldCount === exactPin.fields &&
        requirement.technicalExpectation.encrypted === false &&
        requirement.technicalExpectation.xfa === false &&
        requirement.sourceMaterializationState ===
          "binary_materialization_required" &&
        requirement.readOnlyTreatment === "worker_read_only_no_modify",
      `${requirement.componentDocumentId}: exact immutable pin drifted.`,
    );
    check(
      queueDocument?.sourceIdentityState === "exact_source_requirement_ready" &&
        queueDocument.exactSourceRequirement.expectedSha256 ===
          exactPin.sha256 &&
        queueDocument.exactSourceRequirement.expectedBytes === exactPin.bytes &&
        registryArtifact?.measuredSha256 === exactPin.sha256 &&
        registryArtifact?.sizeBytes === exactPin.bytes &&
        registryArtifact?.pageCount === 3 &&
        registryArtifact?.fieldCount === exactPin.fields &&
        registryArtifact?.technicalClass === "clean_acroform" &&
        repositoryAsset?.sha256 === exactPin.sha256 &&
        repositoryAsset?.libraryRow?.canonicalRelativePath ===
          exactPin.canonical,
      `${requirement.componentDocumentId}: carried queue/registry evidence differs.`,
    );
    continue;
  }

  unresolvedUsageCount += requirement.usageBindings.length;
  check(
    UNRESOLVED_DOCUMENT_IDS.has(requirement.componentDocumentId) &&
      queueDocument?.sourceIdentityState === "authority_identity_unresolved" &&
      queueDocument?.exactSourceRequirement === null &&
      requirement.identityBindingStatus === "unknown_source_identity" &&
      requirement.authorityState === "authority_identity_unresolved" &&
      requirement.requirementDescriptorSchemaVersion === null &&
      requirement.workflowKey === null &&
      requirement.authorityDocumentId === null &&
      requirement.authorityDocumentRole === null &&
      requirement.officialTitle === null &&
      requirement.revision === null &&
      requirement.assetClass === null &&
      requirement.canonicalAuthorityPath === null &&
      requirement.repositorySourcePathEvidence === null &&
      requirement.expectedSha256 === null &&
      requirement.expectedBytes === null &&
      requirement.expectedMediaType === null &&
      requirement.technicalExpectation === null &&
      requirement.expectedMeasurementBasis === null &&
      requirement.sourceMaterializationState === "unknown_source_identity" &&
      requirement.readOnlyTreatment === null &&
      requirement.retentionPolicy === null &&
      requirement.verificationCommand === null,
    `${requirement.componentDocumentId}: unresolved identity gained an invented pin or locator.`,
  );
}

check(
  exactUsageCount === 3 && unresolvedUsageCount === 28,
  "Exact/unresolved usage provenance no longer totals 3/28.",
);
const formAcr = sources.requirements.find(
  (requirement) =>
    requirement.componentDocumentId === "CCA-XP-0120-7002 Form ACR",
);
check(
  formAcr?.resolutionClass === "legal_design_identity_split_required" &&
    formAcr.plannedBundleSharingState ===
      "identity_split_placeholder_not_source" &&
    formAcr.retainedNonSubstitutableEvidence?.evidenceClass ===
      "supporting_process_docx" &&
    formAcr.retainedNonSubstitutableEvidence.sha256 ===
      "21001a1265eb8ff2872f0771ef6e7e75b6b0ad664b2d43aaed912f4e0f4c76c3" &&
    formAcr.retainedNonSubstitutableEvidence.treatment ===
      "identity_evidence_only_not_pdf_source_and_not_materialization_candidate",
  "Form ACR identity split or DOCX non-substitution evidence was lost.",
);
section(
  "Sources: 3 exact pins and 7 unresolved identities remain fail closed.",
);

// 3. Renderer, mapping, and field-ownership scaffolds.
check(
  rendererSchema.properties.jurisdiction.const === "IN" &&
    renderer.enabled === false &&
    renderer.activeRendererCount === 0 &&
    renderer.laneCounts.acroformOrHybrid === 3 &&
    renderer.laneCounts.coordinateOverlay === 0 &&
    renderer.laneCounts.unknown === 7 &&
    renderer.documents.length === 10 &&
    sameJson(
      renderer.documents.map((document) => document.componentDocumentId),
      DOCUMENT_IDS,
    ) &&
    renderer.documents.every(
      (document) =>
        document.activeRenderer === null &&
        document.activeMappingCount === 0 &&
        document.activeOverlayPlacementCount === 0,
    ),
  "Renderer scaffold opened a renderer or lost document/lane coverage.",
);
const acroformCandidates = renderer.documents.filter(
  (document) => document.candidateRendererLane === "acroform_or_hybrid_fill",
);
const unknownSentinels = renderer.documents.filter(
  (document) => document.identityBindingStatus === "unknown_source_identity",
);
check(
  sameSet(
    acroformCandidates.map((document) => document.componentDocumentId),
    Object.keys(EXACT_PINS),
  ) &&
    unknownSentinels.length === 7 &&
    unknownSentinels.every(
      (document) =>
        document.candidateRendererLane === null &&
        document.rendererSelectionState ===
          "prohibited_unknown_source_identity",
    ) &&
    renderer.rendererAdapters.find(
      (adapter) => adapter.kind === "coordinate_overlay",
    )?.candidateCount === 0 &&
    renderer.rendererAdapters.find(
      (adapter) => adapter.kind === "non_renderer_identity_and_inspection_stop",
    )?.candidateCount === 7,
  "AcroForm, overlay, or unknown-sentinel classification drifted.",
);

check(
  mapsSchema.properties.jurisdiction.const === "IN" &&
    maps.fieldMaps.length === 10 &&
    sameJson(
      maps.fieldMaps.map((fieldMap) => fieldMap.componentDocumentId),
      DOCUMENT_IDS,
    ) &&
    maps.fieldMaps.every(
      (fieldMap) =>
        fieldMap.activeRendererStrategy === null &&
        fieldMap.sourceFieldInventory.length === 0 &&
        fieldMap.sourceFieldBindings.length === 0 &&
        fieldMap.overlayPlacements.length === 0 &&
        fieldMap.unclassifiedSourceFieldPolicy === "reject" &&
        fieldMap.runtimeStatus === "runtime_disabled" &&
        fieldMap.generationAllowed === false,
    ),
  "Field maps opened a source binding, overlay placement, or runtime path.",
);
for (const fieldMap of maps.fieldMaps) {
  const source = sources.requirements.find(
    (requirement) =>
      requirement.componentDocumentId === fieldMap.componentDocumentId,
  );
  const rendererDocument = renderer.documents.find(
    (document) => document.componentDocumentId === fieldMap.componentDocumentId,
  );
  check(
    fieldMap.requirementId === source?.requirementId &&
      fieldMap.identityBindingStatus === source?.identityBindingStatus &&
      fieldMap.strategyCandidate === rendererDocument?.candidateRendererLane &&
      fieldMap.usageBindingCount === source?.usageBindings.length,
    `${fieldMap.componentDocumentId}: source, renderer, and map metadata drifted.`,
  );
}

check(
  ownershipSchema.properties.jurisdiction.const === "IN" &&
    ownership.fields.length === 25 &&
    ownership.routes.length === 6 &&
    sameSet(
      ownership.routes.map((route) => route.routeId),
      TRACK_IDS,
    ) &&
    sameSet(
      ownership.manualFieldsExpectedBlank ?? MANUAL_FIELDS,
      MANUAL_FIELDS,
    ) &&
    PROTECTED_OWNERS.every((owner) =>
      ownership.protectedOwnerClasses.includes(owner),
    ) &&
    MANUAL_FIELDS.every((fieldKey) => {
      const field = ownership.fields.find(
        (candidate) => candidate.fieldKey === fieldKey,
      );
      return (
        field?.owner === "participant_manual" &&
        field.automationPolicy === "leave_blank"
      );
    }),
  "Field ownership lost route coverage, protected actors, or manual fields.",
);
section(
  "Mapping: 3 AcroForm candidates, 0 overlay candidates, and 7 sentinels.",
);

// 4. Adopted usage preservation and deterministic one-PDF assembly.
check(
  assemblySchema.properties.jurisdiction.const === "IN" &&
    assemblySchema.properties.runtimeRegistered.const === false &&
    assemblySchema.properties.routeReadyCount.const === 0 &&
    assembly.runtimeRegistered === false &&
    assembly.routeReadyCount === 0 &&
    assembly.sourceSlots.length === 8 &&
    assembly.assemblies.length === 6 &&
    assembly.deduplication.logicalDocumentIdentityCount === 10 &&
    assembly.deduplication.plannedAssemblySourceSlotCount === 8 &&
    assembly.deduplication.logicalComponentUseCount === 31 &&
    assembly.deduplication.plannedPacketInstanceCount === 26 &&
    assembly.deduplication.deduplicatedPacketInstanceCount === 5,
  "Assembly lost deterministic 10/8/31/26/5 deduplication counts.",
);
check(
  unique(assembly.sourceSlots.map((sourceSlot) => sourceSlot.sourceSlotId)) &&
    assembly.sourceSlots.every(
      (sourceSlot) => sourceSlot.runtimeSelectable === false,
    ) &&
    assembly.sourceSlots.find(
      (sourceSlot) =>
        sourceSlot.sourceSlotId === "in-source-slot-cca-xp-0120-7002-form-acr",
    )?.slotKind === "identity_split_placeholder",
  "Source-slot catalog duplicates, selects, or substitutes a blocked identity.",
);

const packetSetByTrack = new Map(
  packetSets.packetSets
    .filter(
      (packetSet) =>
        packetSet.jurisdiction === "IN" &&
        TRACK_IDS.includes(packetSet.trackId),
    )
    .map((packetSet) => [packetSet.trackId, packetSet]),
);
let logicalUseCount = 0;
let physicalInstanceCount = 0;

for (const routeAssembly of assembly.assemblies) {
  const packetSet = packetSetByTrack.get(routeAssembly.trackId);
  const adoptedOfficialComponents = packetSet?.components
    .filter((component) => component.outputStrategy === "official_pdf_fill")
    .map(projectComponent);
  check(
    packetSet?.packetSetId === routeAssembly.packetSetId &&
      packetSet.version === routeAssembly.packetSetVersion &&
      sameJson(
        routeAssembly.logicalComponents.map(projectComponent),
        adoptedOfficialComponents,
      ) &&
      routeAssembly.legalDesignBlockerCount === 0,
    `${routeAssembly.trackId}: official-PDF subassembly differs from adopted legal design.`,
  );

  const logicalComponentIds = routeAssembly.logicalComponents.map(
    (component) => component.componentId,
  );
  const instanceComponentIds = routeAssembly.plannedDocumentInstances.flatMap(
    (instance) => instance.logicalComponentIds,
  );
  logicalUseCount += logicalComponentIds.length;
  physicalInstanceCount += routeAssembly.plannedDocumentInstances.length;
  check(
    unique(instanceComponentIds) &&
      sameSet(instanceComponentIds, logicalComponentIds) &&
      unique(
        routeAssembly.plannedDocumentInstances.map(
          (instance) => instance.sourceSlotId,
        ),
      ) &&
      routeAssembly.plannedDocumentInstances.every(
        (instance) => instance.physicalCopyCount === 1,
      ) &&
      routeAssembly.targetOutputPdfCountWhenReady === 1 &&
      routeAssembly.currentOutputPdfCount === 0 &&
      routeAssembly.assemblyState === "blocked_preflight_only" &&
      routeAssembly.runtimeStatus === "runtime_disabled" &&
      routeAssembly.generationAllowed === false,
    `${routeAssembly.trackId}: physical deduplication or one-PDF terminal state drifted.`,
  );
}
check(
  logicalUseCount === 31 && physicalInstanceCount === 26,
  "Assemblies no longer cover all 31 uses through 26 planned instances.",
);
const seriousAssembly = assembly.assemblies.find(
  (candidate) => candidate.trackId === "in_conviction_serious_felony",
);
check(
  seriousAssembly?.routeOutputStrategy === "custom_pleading" &&
    seriousAssembly.officialPdfSubassemblyOnly === true &&
    seriousAssembly.logicalComponents.length === 3 &&
    seriousAssembly.externalLaneComponentIds.length === 4,
  "Serious-felony custom-pleading legal design was changed.",
);
section(
  "Assembly: 31 uses become 26 deduplicated instances and one target PDF.",
);

// 5. Synthetic route and document-gate fixtures.
check(
  fixturesSchema.properties.jurisdiction.const === "IN" &&
    fixtures.routeFixtures.length === 6 &&
    fixtures.documentGateFixtures.length === 10 &&
    sameSet(
      fixtures.routeFixtures.map((fixture) => fixture.routeId),
      TRACK_IDS,
    ) &&
    sameJson(
      fixtures.documentGateFixtures.map(
        (fixture) => fixture.componentDocumentId,
      ),
      DOCUMENT_IDS,
    ) &&
    sameSet(fixtures.manualFieldsExpectedBlank, MANUAL_FIELDS),
  "Fixture coverage or manual blank policy drifted.",
);
for (const fixture of fixtures.routeFixtures) {
  const routeAssembly = assembly.assemblies.find(
    (candidate) => candidate.trackId === fixture.routeId,
  );
  check(
    fixture.synthetic === true &&
      fixture.requiredFactKeys.every((key) =>
        Object.prototype.hasOwnProperty.call(fixture.facts, key),
      ) &&
      sameJson(fixture.requiredFactKeys, routeAssembly?.requiredFactKeys) &&
      fixture.logicalOfficialPdfComponentCount ===
        routeAssembly?.logicalComponents.length &&
      fixture.plannedAssemblyInstanceCount ===
        routeAssembly?.plannedDocumentInstances.length &&
      fixture.expectedTerminalCode === "unknown_source_identity" &&
      fixture.expectedOutputPdfCount === 0 &&
      fixture.targetOutputPdfCountWhenReady === 1 &&
      fixture.runtimeStatus === "runtime_disabled",
    `${fixture.fixtureId}: route fixture no longer proves its fail-closed boundary.`,
  );
}
for (const fixture of fixtures.documentGateFixtures) {
  const expectedCode = EXACT_DOCUMENT_IDS.has(fixture.componentDocumentId)
    ? "source_materialization_required"
    : "unknown_source_identity";
  check(
    fixture.expectedTerminalCode === expectedCode,
    `${fixture.fixtureId}: expected exact/unresolved terminal code drifted.`,
  );
}
section(
  "Fixtures: 6 routes and all 10 exact/unresolved source gates are covered.",
);

// 6. Dependencies and review posture.
const dependencyById = new Map(
  dependencies.dependencies.map((dependency) => [
    dependency.dependencyId,
    dependency,
  ]),
);
for (const dependencyId of [
  "in-captain-assignment-anchor",
  "in-portable-source-projection",
  "in-exact-retained-source-verification",
  "in-petition-order-bundle-authority",
  "in-appearance-form-authority-remap",
  "in-form-acr-identity-split",
  "in-confidential-information-form-authority-remap",
  "in-renderer-lane-selection",
  "in-field-map-and-ownership-review",
  "in-deterministic-source-backed-regression",
  "in-custom-pleading-lane-integration",
  "in-source-freshness-technical-visual-legal-review",
  "in-legacy-factory-contract-regeneration",
]) {
  check(
    dependencyById.get(dependencyId)?.status === "blocked",
    `${dependencyId}: required dependency is not blocked.`,
  );
}
check(
  dependencyById.get("in-shared-surface-isolation")?.status === "satisfied",
  "Indiana shared-surface isolation is not satisfied.",
);
check(
  review.sourceBackedSampleCount === 0 &&
    review.fieldMapReviewArtifactCount === 0 &&
    review.identitySummary.exactPinned === 3 &&
    review.identitySummary.unknownSourceIdentity === 7 &&
    review.identitySummary.captainProjected === 0 &&
    review.identitySummary.freshlyVerifiedLocalBytes === 0 &&
    review.documentReviews.length === 10 &&
    review.routeReviews.length === 6 &&
    sameJson(
      review.documentReviews.map((document) => document.componentDocumentId),
      DOCUMENT_IDS,
    ) &&
    sameJson(
      review.routeReviews.map((route) => route.trackId),
      TRACK_IDS,
    ) &&
    review.documentReviews.every(
      (document) =>
        document.sampleStatus === "not_generated" &&
        document.technicalReview === "not_started" &&
        document.visualReview === "not_started" &&
        document.legalOutputReview === "not_started",
    ) &&
    review.routeReviews.every(
      (route) =>
        route.sampleStatus === "not_generated" &&
        route.reviewStatus === "blocked" &&
        route.blockers.length > 0,
    ) &&
    Object.values(review.approvals).every((value) => value === false),
  "Review manifest contains an approval, source sample, or coverage gap.",
);
section(
  "Review: source, mapping, technical, visual, legal, and counsel gates are closed.",
);

// 7. Typed stop boundary, factory output, and private-byte isolation.
for (const marker of [
  FAMILY_ID,
  "INDIANA_OFFICIAL_PDF_TRACK_IDS",
  "INDIANA_OFFICIAL_PDF_DOCUMENT_IDS",
  "unknown_source_identity",
  "source_materialization_required",
  "family_not_renderable",
  "workerReadAuthorized: false",
  "workerMaterializationAuthorized: false",
]) {
  check(preflightText.includes(marker), `Typed preflight omits ${marker}.`);
}
for (const trackId of TRACK_IDS) {
  check(
    preflightText.includes(`"${trackId}"`),
    `Typed preflight omits track ${trackId}.`,
  );
}
for (const documentId of DOCUMENT_IDS) {
  check(
    preflightText.includes(`"${documentId}"`),
    `Typed preflight omits document ${documentId}.`,
  );
}
for (const [documentId, exactPin] of Object.entries(EXACT_PINS)) {
  check(
    acroformText.includes(`"${documentId}"`) &&
      acroformText.includes(exactPin.sha256) &&
      acroformText.includes(`expectedBytes: ${exactPin.bytes}`),
    `AcroForm boundary omits exact pin ${documentId}.`,
  );
}
check(
  !preflightText.includes("pdf-lib") &&
    !acroformText.includes("pdf-lib") &&
    !preflightText.includes("PDF" + "Document") &&
    !acroformText.includes("PDF" + "Document") &&
    !preflightText.includes("fetch" + "(") &&
    !acroformText.includes("fetch" + "("),
  "Typed Indiana boundary contains a PDF parser or network acquisition path.",
);

const ownedRoots = [absolute(FAMILY_DIR), absolute(MODULE_DIR)];
const ownedFiles = [];
for (const ownedRoot of ownedRoots) collectFiles(ownedRoot, ownedFiles);
check(
  ownedFiles.every((ownedPath) => !ownedPath.toLowerCase().endsWith(".pdf")),
  "Indiana-owned paths contain copied, acquired, or generated PDF bytes.",
);
const dangerousSinkPatterns = [
  /fs\.(?:readFileSync|statSync|existsSync)\([^)]*repositorySourcePathEvidence/su,
  /path\.(?:join|resolve)\([^)]*repositorySourcePathEvidence/su,
  /\bawait\s+fetch\s*\(/su,
  /\b(?:axios|https?|undici)\.(?:get|request)\s*\(/su,
];
check(
  dangerousSinkPatterns.every(
    (pattern) =>
      !pattern.test(preflightText) &&
      !pattern.test(acroformText) &&
      !pattern.test(verifierText),
  ),
  "Indiana code exposes repository evidence to a filesystem or network sink.",
);

const sharedSurfaces = [
  files.queue,
  files.packetSets,
  "data/record-clearing/legal-design-track-registry.json",
  files.sourceRegistry,
  files.repositoryAudit,
  files.authority,
  "package.json",
];
const unstagedSharedDiff = spawnSync(
  "git",
  ["diff", "--quiet", "--", ...sharedSurfaces],
  { cwd: ROOT },
);
const stagedSharedDiff = spawnSync(
  "git",
  ["diff", "--cached", "--quiet", "--", ...sharedSurfaces],
  { cwd: ROOT },
);
check(
  unstagedSharedDiff.status === 0 && stagedSharedDiff.status === 0,
  "A shared queue, legal-design, registry, authority, or package surface changed.",
);
section(
  "Isolation: typed stops exist; shared surfaces and private bytes are untouched.",
);

// Explicit negative gates.
const targetRequirement = targetDocumentId
  ? sources.requirements.find(
      (requirement) =>
        requirement.componentDocumentId === targetDocumentId ||
        requirement.authorityDocumentId === targetDocumentId,
    )
  : null;
if (targetDocumentId && !targetRequirement) {
  failures.push(`unknown_document: ${targetDocumentId}`);
}
if (requireSourceReady && !targetDocumentId) {
  failures.push("--require-source-ready requires --document-id.");
}
if (requireSourceReady && targetRequirement) {
  failures.push(
    targetRequirement.identityBindingStatus === "exact_pinned_identity"
      ? `${targetRequirement.componentDocumentId}: source_materialization_required`
      : `${targetRequirement.componentDocumentId}: unknown_source_identity`,
  );
}
if (requireMaterialized) {
  failures.push(
    "binary_materialization_required: captain assignment and portable projection are absent for all exact Indiana sources",
  );
}
if (requireRenderable) {
  failures.push(
    "family_not_renderable: 7 unknown identities, 3 unmaterialized exact sources, 0 active mappings, and 0 source-backed samples",
  );
}

finish();

function collectFiles(directory, target) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectFiles(entryPath, target);
    else if (entry.isFile()) target.push(entryPath);
  }
}

function finish() {
  const result = {
    ok: failures.length === 0,
    familyId: FAMILY_ID,
    jurisdiction: "IN",
    sectionCount: sections.length,
    sections,
    scope: {
      tracks: 6,
      officialPdfUses: 31,
      documentIdentities: 10,
      exactPins: 3,
      unresolvedIdentities: 7,
      plannedPhysicalSourceSlots: 8,
      plannedPacketInstances: 26,
      targetPdfCountPerRoute: 1,
    },
    sourceContract: {
      assignmentAnchor: null,
      portableProjection: null,
      workerReadAuthorized: false,
      workerMaterializationAuthorized: false,
      sourceBackedSamples: 0,
    },
    failures,
  };

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else if (failures.length === 0) {
    console.log(
      `Indiana official-PDF family verification passed (${sections.length} sections).`,
    );
    for (const message of sections) console.log(`- ${message}`);
  } else {
    console.error(
      `Indiana official-PDF family verification failed (${failures.length} issue${failures.length === 1 ? "" : "s"}).`,
    );
    for (const failure of failures) console.error(`- ${failure}`);
  }

  if (failures.length > 0) process.exitCode = 1;
}
