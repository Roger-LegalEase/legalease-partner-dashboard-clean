#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FAMILY_ID = "rcap-ak-official-pdf-family";
const FAMILY_DIR =
  "data/record-clearing/production-factory/official-pdf-families/AK";
const MODULE_PATH =
  "src/lib/rcap/packets/jurisdictions/alaska/official-pdf/family.ts";

const files = {
  family: `${FAMILY_DIR}/family-manifest.json`,
  dependencies: `${FAMILY_DIR}/dependencies.json`,
  sourceRequirements: `${FAMILY_DIR}/source-requirements.json`,
  renderer: `${FAMILY_DIR}/renderer-scaffold.json`,
  fieldMap: `${FAMILY_DIR}/field-map-scaffold.json`,
  ownershipSchema: `${FAMILY_DIR}/field-ownership.schema.json`,
  ownership: `${FAMILY_DIR}/field-ownership.json`,
  fixtureSchema: `${FAMILY_DIR}/fixtures.schema.json`,
  fixtures: `${FAMILY_DIR}/fixtures.json`,
  assembly: `${FAMILY_DIR}/packet-assembly.json`,
  review: `${FAMILY_DIR}/review-manifest.json`,
  memo: "data/record-clearing/legal-design-intake/AK.memo.json",
  trackRegistry: "data/record-clearing/legal-design-track-registry.json",
  packetSets: "data/record-clearing/legal-design-packet-set-manifests.json",
  relationships:
    "data/record-clearing/legal-design-track-source-relationships.json",
  specifications: "data/record-clearing/legal-design-specifications.json",
  authority: "data/record-clearing/master-library/authority.json",
  trackAudit: "data/record-clearing/master-library/track-source-audit.json",
  repositoryAudit:
    "data/record-clearing/master-library/repository-asset-audit.json",
  sourceRegistry: "data/record-clearing/source-artifact-registry.json",
  productionQueue:
    "data/record-clearing/production-factory/official-pdf-production-queue.json",
  module: MODULE_PATH
};

const TRACK_IDS = [
  "ak-courtview",
  "ak-tf805",
  "ak-tf800",
  "ak-mistaken-identity"
];
const EXACT_DOCUMENT_IDS = new Set(["TF-810", "TF-805", "TF-800"]);
const UNMANIFESTED_DOCUMENT_ID = "DPS-REQUEST-TO-SEAL-CRIM-INFO";
const DOCUMENT_IDS = new Set([
  ...EXACT_DOCUMENT_IDS,
  UNMANIFESTED_DOCUMENT_ID
]);
const COMPONENT_IDS = new Set([
  "ak-courtview-process-guidance-1",
  "ak-courtview-primary-filing-2",
  "ak-tf805-primary-filing-1",
  "ak-tf805-certificate-of-service-2",
  "ak-tf805-proposed-order-3",
  "ak-tf800-primary-filing-1",
  "ak-mistaken-identity-primary-filing-1"
]);
const OFFICIAL_COMPONENT_IDS = new Set(
  [...COMPONENT_IDS].filter(
    (componentId) => componentId !== "ak-courtview-process-guidance-1"
  )
);
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
const ALLOWED_FIXTURE_BOUNDARIES = new Set([
  "no_filing_required",
  "process_guidance_missing",
  "required_before_filing",
  "manual_completion_required",
  "post_generation_handoff",
  "captain_projection_required",
  "authority_unmanifested"
]);

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

function findRequirement(requirements, value) {
  return requirements.find(
    (requirement) =>
      requirement.componentDocumentId === value ||
      requirement.authorityDocumentId === value
  );
}

function readAcquisitionDependency(dependency) {
  const workingTreePath = absolute(dependency.recordPath);
  if (fs.existsSync(workingTreePath)) {
    return {
      record: JSON.parse(fs.readFileSync(workingTreePath, "utf8")),
      source: "working_tree_dependency_record"
    };
  }

  const gitObject = spawnSync(
    "git",
    ["show", `${dependency.commit}:${dependency.recordPath}`],
    { cwd: ROOT, encoding: "utf8" }
  );
  if (gitObject.status !== 0) {
    failures.push(
      `Published Alaska acquisition dependency is unavailable at ${dependency.commit}:${dependency.recordPath}.`
    );
    return { record: null, source: "unavailable" };
  }

  try {
    return {
      record: JSON.parse(gitObject.stdout),
      source: "published_git_object"
    };
  } catch (error) {
    failures.push(
      `Published Alaska acquisition dependency is invalid JSON (${error instanceof Error ? error.message : String(error)}).`
    );
    return { record: null, source: "invalid" };
  }
}

for (const [label, relativePath] of Object.entries(files)) {
  ok(fs.existsSync(absolute(relativePath)), `${label}: missing ${relativePath}.`);
}

const family = readJson(files.family);
const dependencies = readJson(files.dependencies);
const sourceRequirements = readJson(files.sourceRequirements);
const renderer = readJson(files.renderer);
const fieldMap = readJson(files.fieldMap);
const ownershipSchema = readJson(files.ownershipSchema);
const ownership = readJson(files.ownership);
const fixtureSchema = readJson(files.fixtureSchema);
const fixtures = readJson(files.fixtures);
const assembly = readJson(files.assembly);
const review = readJson(files.review);
const memo = readJson(files.memo);
const trackRegistry = readJson(files.trackRegistry);
const packetSets = readJson(files.packetSets);
const relationships = readJson(files.relationships);
const specifications = readJson(files.specifications);
const authority = readJson(files.authority);
const trackAudit = readJson(files.trackAudit);
const repositoryAudit = readJson(files.repositoryAudit);
const sourceRegistry = readJson(files.sourceRegistry);
const productionQueue = readJson(files.productionQueue);
const moduleText = fs.readFileSync(absolute(files.module), "utf8");

const acquisitionDependency = family.acquisitionDependencyEvidence;
const { record: acquisitionRecord, source: acquisitionEvidenceSource } =
  readAcquisitionDependency(acquisitionDependency);

// ---------------------------------------------------------------------------
// 1. Family boundary, queue scope, and assignment contract
// ---------------------------------------------------------------------------

ok(
  family.familyId === FAMILY_ID && family.jurisdiction === "AK",
  "Family manifest is not bound to the Alaska family."
);
ok(
  sameSet(family.scope.trackIds, TRACK_IDS) &&
    sameSet(family.scope.documentIds, [...DOCUMENT_IDS]) &&
    family.scope.trackCount === 4 &&
    family.scope.officialPdfComponentCount === 6 &&
    family.scope.adoptedPacketComponentCountIncludingGuidance === 7 &&
    family.scope.documentCount === 4 &&
    family.scope.exactRetainedIdentityCount === 3 &&
    family.scope.authorityUnmanifestedIdentityCount === 1,
  "Family scope differs from the adopted Alaska queue family."
);
ok(
  family.sourceContract.contractKind ===
    "dependency_scaffold_not_worker_assignment" &&
    family.sourceContract.assignmentAnchor === null &&
    family.sourceContract.portableProjection === null &&
    family.sourceContract.captainAssignmentRequired === true &&
    family.sourceContract.portableProjectionRequired === true &&
    family.sourceContract.workerReady === false &&
    family.sourceContract.workerReadAuthorized === false &&
    family.sourceContract.workerMaterializationAuthorized === false &&
    family.sourceContract.workerMayAcquireOrDownloadSources === false &&
    family.sourceContract.captainProjectedExactSources === 0 &&
    family.sourceContract.repositorySourcePathTreatment ===
      "identity_evidence_only_never_worker_source",
  "Family source contract became worker-ready or gained a source locator."
);
ok(
  family.status.packetReady === false &&
    family.status.generationAllowed === false &&
    family.status.enabled === false &&
    family.authorityPosture.activeRendererCount === 0 &&
    family.authorityPosture.activeFieldMappingCount === 0 &&
    family.authorityPosture.activeOverlayPlacementCount === 0,
  "Family manifest opened a runtime, renderer, or mapping gate."
);
const scopedMemoTracks = memo.tracks.filter((track) =>
  TRACK_IDS.includes(track.trackId)
);
const scopedRegistryTracks = trackRegistry.tracks.filter(
  (track) =>
    track.jurisdiction === "AK" && TRACK_IDS.includes(track.trackId)
);
ok(
  scopedMemoTracks.length === TRACK_IDS.length &&
    scopedMemoTracks.every(
      (track) =>
        track.outputStrategy === "official_pdf_fill" &&
        track.legalDesignDecision?.status ===
          "legal_design_approved_with_limitations"
    ) &&
    scopedRegistryTracks.length === TRACK_IDS.length &&
    scopedRegistryTracks.every(
      (track) =>
        track.outputStrategy === "official_pdf_fill" &&
        track.legalDesignStatus ===
          "legal_design_approved_with_limitations"
    ),
  "Alaska memo or track registry no longer defines the four approved-with-limitations official-PDF tracks."
);
const queueFamily = productionQueue.families.find(
  (candidate) => candidate.familyId === FAMILY_ID
);
ok(
  queueFamily?.jurisdiction === "AK" &&
    sameSet(queueFamily.trackIds, TRACK_IDS) &&
    queueFamily.counts?.trackCount === 4 &&
    queueFamily.counts?.componentCount === 6 &&
    queueFamily.counts?.documentCount === 4 &&
    queueFamily.counts?.exactSourceRequirementCount === 3 &&
    queueFamily.counts?.unresolvedSourceIdentityCount === 1 &&
    queueFamily.workerReady === false &&
    queueFamily.packetReady === false &&
    queueFamily.enabled === false,
  "Read-only production queue evidence differs from the Alaska family scope."
);
ok(
  authority.edition === "1.2" &&
    authority.adoptionStatus === "adopted" &&
    authority.retention.archiveSha256 ===
      sourceRequirements.authorityArchiveSha256,
  "Master Library Edition 1.2 authority pin differs from the Alaska scaffold."
);
section("1. Boundary: four Alaska routes remain isolated and runtime-disabled.");

// ---------------------------------------------------------------------------
// 2. Exact identities, unmanifested DPS posture, and acquisition evidence
// ---------------------------------------------------------------------------

const requirements = sourceRequirements.requirements;
ok(
  sourceRequirements.contractKind ===
    "dependency_scaffold_not_worker_assignment" &&
    sourceRequirements.assignmentAnchor === null &&
    sourceRequirements.portableProjection === null &&
    sourceRequirements.captainAssignmentRequired === true &&
    sourceRequirements.portableProjectionRequired === true &&
    sourceRequirements.workerReady === false &&
    sourceRequirements.workerReadAuthorized === false &&
    sourceRequirements.workerMaterializationAuthorized === false &&
    sourceRequirements.networkAcquisitionAuthorized === false &&
    sourceRequirements.counts.captainProjectedExactSources === 0,
  "Source requirements became a worker assignment or acquisition instruction."
);
ok(
  requirements.length === DOCUMENT_IDS.size &&
    unique(requirements.map((item) => item.componentDocumentId)) &&
    sameSet(
      requirements.map((item) => item.componentDocumentId),
      [...DOCUMENT_IDS]
    ) &&
    requirements.every(
      (requirement) =>
        requirement.workerReady === false &&
        requirement.workerReadAuthorized === false &&
        requirement.workerMaterializationAuthorized === false &&
        Object.keys(requirement).every(
          (key) => !key.startsWith("verificationSource")
        )
    ),
  "Every Alaska document must remain non-worker-ready and have no verification-source locator."
);
ok(
  requirements.every((requirement) => {
    if (!Object.hasOwn(requirement, "portableLocator")) {
      return true;
    }
    return (
      requirement.portableLocator === null ||
      requirement.portableLocatorTreatment === "candidate_only"
    );
  }),
  "An Alaska portable locator is presented as authoritative instead of candidate-only."
);

const auditTracks = trackAudit.tracks.filter(
  (track) => track.jurisdiction === "AK" && TRACK_IDS.includes(track.trackId)
);
const auditComponents = auditTracks.flatMap((track) => track.components);
const officialRelationships = relationships.relationships.filter(
  (relationship) =>
    relationship.jurisdiction === "AK" &&
    OFFICIAL_COMPONENT_IDS.has(relationship.componentId)
);
const assignmentByComponent = new Map(
  specifications.officialFormAssignments
    .filter(
      (assignment) =>
        assignment.jurisdiction === "AK" &&
        OFFICIAL_COMPONENT_IDS.has(assignment.componentId)
    )
    .map((assignment) => [assignment.componentId, assignment])
);

// Identity-only metadata joins: these recorded paths are never resolved,
// opened, hashed, or interpreted as worker sources.
const registryByPath = new Map(
  sourceRegistry.artifacts
    .filter((artifact) => artifact.jurisdiction === "AK")
    .map((artifact) => [artifact.sourcePath, artifact])
);
const registryByArtifactId = new Map(
  sourceRegistry.artifacts
    .filter((artifact) => artifact.jurisdiction === "AK")
    .map((artifact) => [artifact.artifactId, artifact])
);
const repositoryByPath = new Map(
  repositoryAudit.assets
    .filter((asset) => asset.jurisdiction === "AK")
    .map((asset) => [asset.sourcePath, asset])
);
const repositoryByArtifactId = new Map(
  repositoryAudit.assets
    .filter((asset) => asset.jurisdiction === "AK")
    .map((asset) => [asset.artifactId, asset])
);

ok(
  auditTracks.length === TRACK_IDS.length &&
    officialRelationships.length === OFFICIAL_COMPONENT_IDS.size &&
    assignmentByComponent.size === OFFICIAL_COMPONENT_IDS.size,
  "Alaska audit, relationship, or official-form assignment coverage is incomplete."
);

for (const requirement of requirements) {
  const matchingComponents = auditComponents.filter(
    (component) => component.officialFormId === requirement.componentDocumentId
  );
  ok(
    matchingComponents.length === requirement.usageBindings.length,
    `${requirement.componentDocumentId}: usage binding count differs from the track-source audit.`
  );

  if (EXACT_DOCUMENT_IDS.has(requirement.componentDocumentId)) {
    ok(
      requirement.authorityState === "authority_mapped_packet_candidate" &&
        requirement.identityBindingStatus ===
          "exact_pinned_identity_shared_relationship_unpinned" &&
        requirement.packetCandidate === true &&
        requirement.generationAllowed === false &&
        requirement.captainAssignmentEligibility ===
          "requires_assignment_anchor_and_portable_projection" &&
        requirement.repositorySourcePathTreatment ===
          "identity_evidence_only_never_worker_source",
      `${requirement.componentDocumentId}: exact identity posture changed.`
    );

    for (const component of matchingComponents) {
      ok(
        component.result === "authority_mapped_packet_candidate" &&
          component.sha256Verified === false &&
          component.asset?.workflowKey === requirement.workflowKey &&
          component.asset?.documentId === requirement.authorityDocumentId &&
          component.asset?.documentRole === requirement.authorityDocumentRole &&
          component.asset?.officialTitle === requirement.officialTitle &&
          component.asset?.revision === requirement.revision &&
          component.asset?.canonicalRelativePath ===
            requirement.canonicalAuthorityPath &&
          component.asset?.sha256 === requirement.expectedSha256 &&
          component.asset?.packetCandidate === true &&
          component.asset?.generationAllowed === false &&
          component.asset?.runtimeStatus === "runtime_disabled",
        `${requirement.componentDocumentId}: Edition 1.2 identity differs.`
      );
      const relationship = officialRelationships.find(
        (candidate) => candidate.componentId === component.componentId
      );
      ok(
        relationship?.officialFormId === requirement.componentDocumentId &&
          relationship?.sha256 === null &&
          relationship?.corpusState === "unchecked",
        `${component.componentId}: shared relationship unexpectedly gained an authority pin.`
      );
      ok(
        assignmentByComponent.get(component.componentId)?.mappingStatus ===
          "not_mapped",
        `${component.componentId}: shared official-form assignment was modified.`
      );
    }

    const registry = registryByPath.get(requirement.repositorySourcePath);
    const repositoryAsset = repositoryByPath.get(
      requirement.repositorySourcePath
    );
    ok(
      registry?.inventorySha256 === requirement.expectedSha256 &&
        registry?.measuredSha256 === requirement.expectedSha256 &&
        registry?.sizeBytes === requirement.expectedBytes &&
        registry?.pageCount === requirement.expectedPageCount &&
        registry?.fieldCount === requirement.expectedFieldCount &&
        registry?.technicalClass === requirement.carriedTechnicalClass &&
        registry?.encrypted === false &&
        registry?.xfa === false,
      `${requirement.componentDocumentId}: carried registry measurements differ.`
    );
    ok(
      repositoryAsset?.status === "manifested_packet_form" &&
        repositoryAsset?.sha256 === requirement.expectedSha256 &&
        repositoryAsset?.libraryRow?.workflowKey === requirement.workflowKey &&
        repositoryAsset?.libraryRow?.documentId ===
          requirement.authorityDocumentId &&
        repositoryAsset?.libraryRow?.revision === requirement.revision &&
        repositoryAsset?.libraryRow?.canonicalRelativePath ===
          requirement.canonicalAuthorityPath,
      `${requirement.componentDocumentId}: repository audit identity differs.`
    );
    sourceObservations.push({
      componentDocumentId: requirement.componentDocumentId,
      state: "captain_assignment_and_portable_projection_required"
    });
    continue;
  }

  ok(
    requirement.componentDocumentId === UNMANIFESTED_DOCUMENT_ID &&
      requirement.authorityState === "authority_unmanifested_source" &&
      requirement.identityBindingStatus ===
        "acquired_exact_identity_successor_edition_manifest_pending" &&
      requirement.workflowKey === null &&
      requirement.authorityDocumentId === null &&
      requirement.assetClass === null &&
      requirement.canonicalAuthorityPath === null &&
      requirement.repositorySourcePath === null &&
      requirement.expectedSha256 === null &&
      requirement.expectedBytes === null &&
      requirement.packetCandidate === false &&
      requirement.generationAllowed === false &&
      requirement.captainAssignmentEligibility ===
        "ineligible_until_successor_edition_manifest",
    "DPS source was promoted from authority_unmanifested_source."
  );
  ok(
    matchingComponents.length === 1 &&
      matchingComponents[0].result === "authority_unmanifested_source" &&
      matchingComponents[0].asset === null &&
      matchingComponents[0].requiresPacketBinary === true,
    "DPS track-source audit no longer records an unmanifested required form."
  );

  const historicalRegistry =
    registryByArtifactId.get("requesttosealcriminfo");
  const historicalRepository =
    repositoryByArtifactId.get("requesttosealcriminfo");
  const historicalEvidence = requirement.historicalRepositoryEvidence;
  ok(
    historicalRegistry?.inventorySha256 === historicalEvidence.sha256 &&
      historicalRegistry?.sizeBytes === historicalEvidence.bytes &&
      historicalRegistry?.pageCount === historicalEvidence.pageCount &&
      historicalRegistry?.fieldCount === historicalEvidence.fieldCount &&
      historicalRegistry?.technicalClass ===
        historicalEvidence.technicalClass &&
      historicalRepository?.status === "manifested_source_gated" &&
      historicalRepository?.libraryRow?.documentId ===
        historicalEvidence.retainedEditionDocumentId &&
      historicalRepository?.libraryRow?.assetClass ===
        historicalEvidence.retainedEditionAssetClass,
    "Historical DPS repository evidence differs or was confused with the packet identity."
  );

  const acquired = acquisitionRecord?.acquisitions?.find(
    (candidate) =>
      candidate.acquisitionId ===
      requirement.acquisitionEvidence.acquisitionId
  );
  ok(
    acquisitionRecord?.jobId === requirement.acquisitionEvidence.jobId &&
      acquisitionRecord?.downloadedSourceCount === 1 &&
      acquired?.documentId === requirement.componentDocumentId &&
      acquired?.disposition ===
        requirement.acquisitionEvidence.disposition &&
      acquired?.officialTitle === requirement.officialTitle &&
      acquired?.resolvedRevision === requirement.revision &&
      acquired?.sha256 === requirement.acquisitionEvidence.sha256 &&
      acquired?.sizeBytes === requirement.acquisitionEvidence.bytes &&
      acquired?.pageCount === requirement.acquisitionEvidence.pageCount &&
      acquired?.acroFormPresent === false &&
      acquired?.formFieldCount === 0 &&
      acquisitionRecord?.editionPosture?.retainedEditionAsset === null &&
      acquisitionRecord?.editionPosture?.componentResult ===
        "authority_unmanifested_source" &&
      acquisitionRecord?.method?.binaryDeposition?.includes(
        "NOT committed"
      ) &&
      acquisitionRecord?.method?.editionMutated === false &&
      acquisitionRecord?.gates?.binariesEnteringVersionControl === 0,
    "Published DPS acquisition evidence differs from the carried disposition."
  );
  sourceObservations.push({
    componentDocumentId: requirement.componentDocumentId,
    state:
      "acquired_identity_confirmed_successor_edition_manifest_and_captain_projection_required"
  });
}

const targetRequirement = targetDocumentId
  ? findRequirement(requirements, targetDocumentId)
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
  if (targetRequirement.authorityState === "authority_unmanifested_source") {
    failures.push(
      `${targetRequirement.componentDocumentId}: acquired evidence is not an adopted asset; successor-edition manifestation and a captain projection are required.`
    );
  } else {
    failures.push(
      `${targetRequirement.componentDocumentId}: captain assignment anchor and portable projection are required; repositorySourcePath is identity evidence only.`
    );
  }
}
section(
  "2. Sources: three retained exact identities require captain projection; the acquired DPS identity remains authority-unmanifested."
);

// ---------------------------------------------------------------------------
// 3. Adopted packet assembly, staging, and physical-document deduplication
// ---------------------------------------------------------------------------

const packetSetById = new Map(
  packetSets.packetSets
    .filter(
      (packetSet) =>
        packetSet.jurisdiction === "AK" && TRACK_IDS.includes(packetSet.trackId)
    )
    .map((packetSet) => [packetSet.packetSetId, packetSet])
);
ok(
  assembly.runtimeRegistered === false &&
    assembly.routeReadyCount === 0 &&
    assembly.assemblies.length === TRACK_IDS.length &&
    sameSet(
      assembly.assemblies.map((route) => route.trackId),
      TRACK_IDS
    ),
  "Packet assembly opened runtime state or lost Alaska routes."
);
for (const routeAssembly of assembly.assemblies) {
  const packetSet = packetSetById.get(routeAssembly.packetSetId);
  ok(
    packetSet?.trackId === routeAssembly.trackId &&
      packetSet?.version === routeAssembly.packetSetVersion &&
      sameJson(
        routeAssembly.logicalComponents,
        packetSet?.components.map(projectComponent)
      ) &&
      routeAssembly.assemblyState === "blocked",
    `${routeAssembly.trackId}: assembly differs from its adopted packet set.`
  );
}
const courtviewAssembly = assembly.assemblies.find(
  (route) => route.trackId === "ak-courtview"
);
ok(
  courtviewAssembly?.stages?.[0]?.kind === "courtview_lookup" &&
    courtviewAssembly?.stages?.[0]?.outcomes?.includes(
      "no_filing_required"
    ) &&
    courtviewAssembly?.physicalDocumentInstances?.[0]?.renderState ===
      "blocked_process_guidance_and_captain_projection",
  "CourtView assembly no longer leads with the lookup/no-filing outcome."
);
const tf805Assembly = assembly.assemblies.find(
  (route) => route.trackId === "ak-tf805"
);
ok(
  tf805Assembly?.physicalDocumentInstances?.length === 1 &&
    tf805Assembly?.physicalDocumentInstances?.[0]?.componentDocumentId ===
      "TF-805" &&
    tf805Assembly?.physicalDocumentInstances?.[0]?.physicalCopyCount === 1 &&
    tf805Assembly?.physicalDocumentInstances?.[0]?.logicalComponentIds
      ?.length === 3 &&
    tf805Assembly?.physicalDocumentInstances?.[0]?.deduplicationRule ===
      "single_physical_document_multi_role",
  "TF-805 physical-document deduplication contract changed."
);
const dpsAssembly = assembly.assemblies.find(
  (route) => route.trackId === "ak-mistaken-identity"
);
ok(
  dpsAssembly?.physicalDocumentInstances?.[0]?.renderState ===
    "blocked_authority_unmanifested" &&
    dpsAssembly?.requiredBeforeFiling?.length === 2,
  "DPS assembly lost its authority or third-party filing gate."
);
section("3. Assembly: four adopted packet sets match, including one-copy TF-805.");

// ---------------------------------------------------------------------------
// 4. Renderer, field-map, and ownership boundaries
// ---------------------------------------------------------------------------

ok(
  renderer.enabled === false &&
    renderer.activeRendererCount === 0 &&
    renderer.documents.length === DOCUMENT_IDS.size &&
    sameSet(
      renderer.documents.map((document) => document.componentDocumentId),
      [...DOCUMENT_IDS]
    ) &&
    renderer.documents.every((document) => document.activeRenderer === null),
  "Renderer scaffold contains an active or missing document renderer."
);
ok(
  fieldMap.activeMappingCount === 0 &&
    fieldMap.activeOverlayPlacementCount === 0 &&
    fieldMap.documents.length === DOCUMENT_IDS.size &&
    fieldMap.documents.every(
      (document) =>
        document.mappings.length === 0 &&
        document.overlayPlacements.length === 0
    ),
  "Field-map scaffold contains an active write or placement."
);
const dpsFieldMap = fieldMap.documents.find(
  (document) =>
    document.componentDocumentId === UNMANIFESTED_DOCUMENT_ID
);
ok(
  dpsFieldMap?.candidateDrafts?.length === 1 &&
    dpsFieldMap?.candidateDrafts?.[0]?.active === false &&
    dpsFieldMap?.fieldEnumerationStatus ===
      "prohibited_until_successor_edition_manifest_and_captain_projection",
  "Historical DPS overlay draft was activated or lost its authority gate."
);
ok(
  ownershipSchema.properties?.jurisdiction?.const === "AK" &&
    ownership.automationPolicy.activeWritableFieldCount === 0 &&
    ownership.automationPolicy.signaturesAlwaysManual === true &&
    ownership.automationPolicy.swornVerificationAlwaysManual === true &&
    PROTECTED_OWNER_CLASSES.every((owner) =>
      ownership.automationPolicy.protectedOwnerClasses.includes(owner)
    ) &&
    ownership.documents.length === DOCUMENT_IDS.size &&
    ownership.documents.every(
      (document) => document.activeWritableFields.length === 0
    ),
  "Field ownership opened automation or lost protected owner classes."
);
const dpsOwnership = ownership.documents.find(
  (document) =>
    document.componentDocumentId === UNMANIFESTED_DOCUMENT_ID
);
ok(
  dpsOwnership?.protectedBlocks?.some(
    (block) =>
      block.owner === "law_enforcement_officer_or_prosecutor" &&
      block.automation === "never_fill"
  ) &&
    dpsOwnership?.protectedBlocks?.some(
      (block) =>
        block.owner === "agency" && block.automation === "never_fill"
    ),
  "DPS officer, prosecutor, or agency fields are not protected."
);
section("4. Mapping: four documents remain zero-write with manual signatures.");

// ---------------------------------------------------------------------------
// 5. Synthetic fixtures cover every route and critical stop
// ---------------------------------------------------------------------------

ok(
  fixtureSchema.properties?.jurisdiction?.const === "AK" &&
    fixtures.fixtures.length >= 8 &&
    unique(fixtures.fixtures.map((fixture) => fixture.fixtureId)) &&
    sameSet(
      [...new Set(fixtures.fixtures.map((fixture) => fixture.trackId))],
      TRACK_IDS
    ) &&
    fixtures.fixtures.every(
      (fixture) =>
        fixture.synthetic === true &&
        fixture.generationAttempted === false &&
        fixture.manualSignaturesBlank === true &&
        fixture.thirdPartyFieldsBlank === true &&
        ALLOWED_FIXTURE_BOUNDARIES.has(fixture.expectedBoundaryCode)
    ),
  "Fixture scaffold lost route coverage, synthetic treatment, or fail-closed expectations."
);
for (const requiredFixtureId of [
  "ak-courtview-already-absent",
  "ak-courtview-guidance-missing",
  "ak-tf805-standard",
  "ak-tf805-sworn-verification",
  "ak-tf800-contested",
  "ak-mistaken-identity-unmanifested",
  "ak-mistaken-identity-third-party-missing"
]) {
  ok(
    fixtures.fixtures.some(
      (fixture) => fixture.fixtureId === requiredFixtureId
    ),
    `Missing critical Alaska fixture ${requiredFixtureId}.`
  );
}
section("5. Fixtures: all four routes and critical manual/authority stops are covered.");

// ---------------------------------------------------------------------------
// 6. Review remains empty and blocked
// ---------------------------------------------------------------------------

ok(
  review.sourceBackedSampleCount === 0 &&
    review.fieldMapReviewArtifactCount === 0 &&
    review.documentReviews.length === DOCUMENT_IDS.size &&
    review.routeReviews.length === TRACK_IDS.length &&
    sameSet(
      review.documentReviews.map(
        (document) => document.componentDocumentId
      ),
      [...DOCUMENT_IDS]
    ) &&
    sameSet(
      review.routeReviews.map((route) => route.trackId),
      TRACK_IDS
    ) &&
    review.documentReviews.every(
      (document) => document.sampleStatus === "not_generated"
    ) &&
    review.routeReviews.every(
      (route) =>
        route.sampleStatus === "not_generated" &&
        route.reviewStatus === "blocked"
    ) &&
    Object.values(review.approvals).every((value) => value === false),
  "Review manifest contains a sample, approval, or coverage gap."
);
section("6. Review: no source-backed sample or approval exists.");

// ---------------------------------------------------------------------------
// 7. Dependency gates remain closed
// ---------------------------------------------------------------------------

const dependencyById = new Map(
  dependencies.dependencies.map((dependency) => [
    dependency.dependencyId,
    dependency
  ])
);
const requiredBlockedDependencies = [
  "ak-captain-assignment-and-portable-projection",
  "ak-shared-relationship-sha-pins",
  "ak-courtview-process-guidance-specification",
  "ak-dps-successor-edition-manifest",
  "ak-projected-source-technical-inspection",
  "ak-field-map-and-ownership-completion",
  "ak-source-freshness-and-legal-output-review"
];
ok(
  requiredBlockedDependencies.every(
    (dependencyId) => dependencyById.get(dependencyId)?.status === "blocked"
  ) &&
    dependencyById.get("ak-shared-surface-isolation")?.status ===
      "satisfied",
  "Dependency contract opened an Alaska authority, source, mapping, or review gate."
);
ok(
  dependencyById
    .get("ak-captain-assignment-and-portable-projection")
    ?.reason.includes("never opened") &&
    dependencyById
      .get("ak-dps-successor-edition-manifest")
      ?.reason.includes("Acquisition evidence cannot promote or select"),
  "Dependency reasons do not preserve the worker-source or acquisition boundary."
);
section("7. Dependencies: captain projection, authority, mapping, and review gates stay closed.");

// ---------------------------------------------------------------------------
// 8. Typed boundary is fail-closed and not registered
// ---------------------------------------------------------------------------

for (const marker of [
  FAMILY_ID,
  "ALASKA_OFFICIAL_PDF_TRACK_IDS",
  "ALASKA_OFFICIAL_PDF_DOCUMENT_IDS",
  "no_filing_required",
  "process_guidance_missing",
  "captain_projection_required",
  "authority_unmanifested",
  "generation_disabled",
  "activeRendererCount: 0"
]) {
  ok(moduleText.includes(marker), `TypeScript boundary is missing marker ${marker}.`);
}
for (const trackId of TRACK_IDS) {
  ok(moduleText.includes(`"${trackId}"`), `TypeScript boundary omits ${trackId}.`);
}
for (const requirement of requirements) {
  ok(
    moduleText.includes(`"${requirement.componentDocumentId}"`),
    `TypeScript boundary omits ${requirement.componentDocumentId}.`
  );
  const carriedSha =
    requirement.expectedSha256 ?? requirement.acquisitionEvidence?.sha256;
  if (carriedSha) {
    ok(
      moduleText.includes(carriedSha),
      `TypeScript boundary omits carried digest for ${requirement.componentDocumentId}.`
    );
  }
}
const registryFiles = fs
  .readdirSync(absolute("src/lib/rcap/packets"))
  .filter((fileName) => /^registry.*\.ts$/.test(fileName))
  .map((fileName) => `src/lib/rcap/packets/${fileName}`);
for (const registryFile of registryFiles) {
  const text = fs.readFileSync(absolute(registryFile), "utf8");
  ok(
    !text.includes("jurisdictions/alaska/official-pdf") &&
      !text.includes(FAMILY_ID),
    `${registryFile}: Alaska scaffold was imported into a shared registry.`
  );
}
section("8. Boundary: typed stops exist and no shared registry imports Alaska.");

// ---------------------------------------------------------------------------
// 9. Shared/live isolation and no source-byte ingress
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
  "A shared queue, registry, package, audit, or coded Alaska state-pack surface changed."
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
  "Alaska family paths contain copied, acquired, or generated PDF bytes."
);

const verifierText = fs.readFileSync(
  absolute("scripts/verify-rcap-alaska-official-pdf-families.mjs"),
  "utf8"
);
const forbiddenVerifierFragments = [
  "private" + "/",
  "PDF" + "Document",
  "node:" + "crypto",
  "fetch" + "(",
  "https." + "request"
];
ok(
  forbiddenVerifierFragments.every(
    (fragment) => !verifierText.includes(fragment)
  ),
  "Alaska verifier contains a private-byte, PDF-inspection, hashing, or network-acquisition path."
);
section("9. Isolation: shared surfaces are untouched and no source bytes were inspected or added.");

const result = {
  ok: failures.length === 0,
  familyId: FAMILY_ID,
  jurisdiction: "AK",
  sectionCount: sections.length,
  sections,
  sourceSummary: {
    retainedExactIdentities: EXACT_DOCUMENT_IDS.size,
    authorityUnmanifestedIdentities: 1,
    acquisitionConfirmedUnmanifestedIdentities: 1,
    captainProjectedExactSources: 0,
    activeRenderers: 0,
    activeFieldMappings: 0,
    activeOverlayPlacements: 0,
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
  acquisitionDependency: {
    source: acquisitionEvidenceSource,
    ref: acquisitionDependency.ref,
    commit: acquisitionDependency.commit,
    recordPath: acquisitionDependency.recordPath,
    disposition: "acquired_public_official_download",
    editionPosture: "authority_unmanifested_source",
    selectable: false
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
    `Alaska official-PDF family verification passed (${sections.length} sections).`
  );
  for (const message of sections) {
    console.log(`- ${message}`);
  }
  console.log(
    "- Captain source contract: assignment anchor required; portable projection required; 0 projected sources; no private bytes inspected and no download performed."
  );
} else {
  console.error(
    `Alaska official-PDF family verification failed (${failures.length} issue${failures.length === 1 ? "" : "s"}).`
  );
  console.error(
    "- Captain source contract: assignment anchor required; portable projection required; 0 projected sources; no private bytes inspected and no download performed."
  );
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
}

if (failures.length > 0) {
  process.exitCode = 1;
}
