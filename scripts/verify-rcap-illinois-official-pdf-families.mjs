#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const ROOT = process.cwd();
const FAMILY_ID = "il-statewide-official-form-families";
const PRODUCTION_QUEUE_FAMILY_ID = "rcap-il-official-pdf-family";
const OFFICIAL_PDF_USAGE_BINDING_COUNT = 48;
const FAMILY_DIR =
  "data/record-clearing/production-factory/official-pdf-families/IL";
const MODULE_PATH =
  "src/lib/rcap/packets/jurisdictions/illinois/official-pdf/family.ts";

const files = {
  family: `${FAMILY_DIR}/family-manifest.json`,
  dependencies: `${FAMILY_DIR}/dependencies.json`,
  sourceRequirementsSchema: `${FAMILY_DIR}/source-requirements.schema.json`,
  sourceRequirements: `${FAMILY_DIR}/source-requirements.json`,
  renderer: `${FAMILY_DIR}/renderer-scaffold.json`,
  fieldMap: `${FAMILY_DIR}/field-map-scaffold.json`,
  ownershipSchema: `${FAMILY_DIR}/field-ownership.schema.json`,
  ownership: `${FAMILY_DIR}/field-ownership.json`,
  fixtureSchema: `${FAMILY_DIR}/fixtures.schema.json`,
  fixtures: `${FAMILY_DIR}/fixtures.json`,
  assembly: `${FAMILY_DIR}/packet-assembly.json`,
  review: `${FAMILY_DIR}/review-manifest.json`,
  trackRegistry: "data/record-clearing/legal-design-track-registry.json",
  packetSets: "data/record-clearing/legal-design-packet-set-manifests.json",
  relationships:
    "data/record-clearing/legal-design-track-source-relationships.json",
  specifications: "data/record-clearing/legal-design-specifications.json",
  authority: "data/record-clearing/master-library/authority.json",
  trackAudit: "data/record-clearing/master-library/track-source-audit.json",
  repositoryAudit:
    "data/record-clearing/master-library/repository-asset-audit.json",
  candidateDispositions:
    "data/record-clearing/master-library/edition-1-2/candidate-dispositions.json",
  acquisitionDispositions:
    "data/record-clearing/master-library/edition-1-2/source-acquisition-dispositions.json",
  sourceRegistry: "data/record-clearing/source-artifact-registry.json",
  productionQueue:
    "data/record-clearing/production-factory/official-pdf-production-queue.json",
  illinoisAddendum:
    "data/record-clearing/master-library/edition-1-2/legal-review-addenda/IL.md",
  module: MODULE_PATH
};

const ADULT_TRACKS = [
  "il-exp-nonconv",
  "il-exp-supervision",
  "il-exp-qualprob",
  "il-exp-precompletion",
  "il-seal-nonconv",
  "il-seal-2yr",
  "il-seal-3yr",
  "il-seal-edu",
  "il-exp-pardon"
];
const TRACK_IDS = [...ADULT_TRACKS, "il-cannabis-vacate", "il-prb-cert"];
const DIRECT_DOCUMENT_IDS = new Set([
  "EXP-AD Request",
  "EXP-AD Case List",
  "EXP-AD Order Granting",
  "CXP Motion to Vacate and Expunge",
  "PRB Certificate of Sealing Application",
  "PRB Certificate of Sealing Eligibility Acknowledgement",
  "PRB Certificate of Expungement for Military Application",
  "PRB Certificate of Expungement for Military Eligibility Acknowledgement"
]);
const RULE_298_ID = "FW-CIV-APPLICATION";
const UNMANIFESTED_DOCUMENT_IDS = new Set([
  "EXP-AD Additional Cases Expungement",
  "CXP Additional Cannabis Convictions",
  "CXP Getting Started Motion to Vacate and Expunge",
  "CXP Notice of Court Date for Motion",
  "CXP Additional Notice of Court Date",
  "CXP Order Granting or Denying Motion"
]);
const COMPONENT_DOCUMENT_IDS = new Set([
  ...DIRECT_DOCUMENT_IDS,
  RULE_298_ID,
  ...UNMANIFESTED_DOCUMENT_IDS
]);
const PROTECTED_OWNER_CLASSES = new Set([
  "judge",
  "clerk",
  "prosecutor",
  "agency",
  "attorney",
  "notary",
  "witness",
  "process_server",
  "unknown"
]);
const ALLOWED_FIXTURE_ERRORS = new Set([
  "source_missing",
  "authority_unmanifested",
  "component_mapping_unapproved",
  "renderer_classification_unresolved",
  "branch_unavailable",
  "generation_disabled"
]);

const argv = process.argv.slice(2);
let jsonOutput = false;
let requireMaterialized = false;
let targetDocumentId = null;
const argumentErrors = [];

for (let index = 0; index < argv.length; index += 1) {
  const argument = argv[index];
  if (argument === "--json") {
    jsonOutput = true;
  } else if (argument === "--require-materialized") {
    requireMaterialized = true;
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

function validateJsonSchema(schema, value, label) {
  try {
    const require = createRequire(import.meta.url);
    const Ajv = require("ajv");
    const validate = new Ajv({ allErrors: true }).compile(schema);
    ok(
      validate(value),
      `${label} fails its checked-in schema: ${JSON.stringify(validate.errors)}`
    );
  } catch (error) {
    failures.push(`${label} schema validation crashed: ${error.message}`);
  }
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

for (const [label, relativePath] of Object.entries(files)) {
  ok(
    fs.existsSync(absolute(relativePath)),
    `${label}: missing ${relativePath}.`
  );
}

const family = readJson(files.family);
const dependencies = readJson(files.dependencies);
const sourceRequirementsSchema = readJson(files.sourceRequirementsSchema);
const sourceRequirements = readJson(files.sourceRequirements);
const renderer = readJson(files.renderer);
const fieldMap = readJson(files.fieldMap);
const ownershipSchema = readJson(files.ownershipSchema);
const ownership = readJson(files.ownership);
const fixtureSchema = readJson(files.fixtureSchema);
const fixtures = readJson(files.fixtures);
const assembly = readJson(files.assembly);
const review = readJson(files.review);
const trackRegistry = readJson(files.trackRegistry);
const packetSets = readJson(files.packetSets);
const relationships = readJson(files.relationships);
const specifications = readJson(files.specifications);
const authority = readJson(files.authority);
const trackAudit = readJson(files.trackAudit);
const repositoryAudit = readJson(files.repositoryAudit);
const candidateDispositions = readJson(files.candidateDispositions);
const acquisitionDispositions = readJson(files.acquisitionDispositions);
const sourceRegistry = readJson(files.sourceRegistry);
const productionQueue = readJson(files.productionQueue);
const addendumText = fs.readFileSync(absolute(files.illinoisAddendum), "utf8");
const moduleText = fs.readFileSync(absolute(files.module), "utf8");

// ---------------------------------------------------------------------------
// 1. Family boundary and immutable authority posture
// ---------------------------------------------------------------------------

ok(
  family.familyId === FAMILY_ID && family.jurisdiction === "IL",
  "Family manifest is not bound to the Illinois family."
);
ok(
  sameSet(family.scope.adultExpAdTracks, ADULT_TRACKS),
  "Family manifest adult track scope differs from the adopted nine-track family."
);
ok(
  family.scope.componentDocumentCount === COMPONENT_DOCUMENT_IDS.size &&
    family.scope.officialPdfUsageBindingCount ===
      OFFICIAL_PDF_USAGE_BINDING_COUNT &&
    family.scope.routeCount === TRACK_IDS.length,
  "Family manifest document, usage-binding, or route count is incorrect."
);
ok(
  family.artifacts.sourceRequirementsSchema ===
    `${FAMILY_DIR}/source-requirements.schema.json` &&
    family.artifacts.sourceRequirements ===
      `${FAMILY_DIR}/source-requirements.json` &&
    family.immutableInputs.productionQueue === files.productionQueue,
  "Family manifest does not declare its source schema, requirements, and production-queue provenance input."
);
ok(
  family.authorityPosture.directlyMappedPacketAssets ===
    DIRECT_DOCUMENT_IDS.size &&
    family.authorityPosture.retainedAssetWithComponentMappingPending === 1 &&
    family.authorityPosture.authorityUnmanifestedRequiredComponents ===
      UNMANIFESTED_DOCUMENT_IDS.size &&
    family.authorityPosture.routeReadyCount === 0,
  "Family manifest authority counts or route-ready posture changed."
);
ok(
  family.status.packetReady === false &&
    family.status.generationAllowed === false &&
    family.status.enabled === false,
  "Family manifest opened a runtime or promotion gate."
);
ok(
  family.sourceMaterialization.contractKind ===
    "dependency_scaffold_not_worker_assignment" &&
    family.sourceMaterialization.assignmentAnchor === null &&
    family.sourceMaterialization.portableProjection === null &&
    family.sourceMaterialization.captainAssignmentRequired === true &&
    family.sourceMaterialization.portableProjectionRequired === true &&
    family.sourceMaterialization.workerReady === false &&
    family.sourceMaterialization.workerReadAuthorized === false &&
    family.sourceMaterialization.workerMaterializationAuthorized === false &&
    family.sourceMaterialization.workerMayAcquireOrDownloadSources === false &&
    family.sourceMaterialization.repositorySourcePathTreatment ===
      "identity_evidence_only_never_worker_source" &&
    family.sourceMaterialization.historicalRepositoryPathTreatment ===
      "identity_evidence_only_never_worker_source",
  "Family manifest represents Illinois source materialization as worker-ready."
);
ok(
  authority.edition === "1.2" &&
    authority.adoptionStatus === "adopted" &&
    authority.retention.archiveSha256 ===
      sourceRequirements.authorityArchiveSha256,
  "Master Library Edition 1.2 authority pin differs from the source contract."
);
ok(
  addendumText.includes("Every Illinois track remains `runtime_disabled`") &&
    addendumText.includes(
      "only the non-military § 5.2(e-6) branch remains held"
    ) &&
    addendumText.includes(
      "the Board's own currentness confirmation is an open release gate"
    ),
  "Controlling Illinois addendum markers changed."
);
section(
  "1. Boundary: 11 Illinois routes remain isolated and runtime-disabled."
);

// ---------------------------------------------------------------------------
// 2. Source authority, exact identities, and materialization
// ---------------------------------------------------------------------------

const requirements = sourceRequirements.requirements;
validateJsonSchema(
  sourceRequirementsSchema,
  sourceRequirements,
  "source-requirements.json"
);
ok(
  requirements.length === COMPONENT_DOCUMENT_IDS.size &&
    unique(requirements.map((item) => item.componentDocumentId)) &&
    sameSet(
      requirements.map((item) => item.componentDocumentId),
      [...COMPONENT_DOCUMENT_IDS]
    ),
  "Source requirements do not cover each component document exactly once."
);
ok(
  sourceRequirements.counts.directAuthorityMappings ===
    DIRECT_DOCUMENT_IDS.size &&
    sourceRequirements.counts.officialPdfUsageBindings ===
      OFFICIAL_PDF_USAGE_BINDING_COUNT &&
    sourceRequirements.counts.retainedAssetsWithComponentMappingPending === 1 &&
    sourceRequirements.counts.authorityUnmanifestedComponents ===
      UNMANIFESTED_DOCUMENT_IDS.size,
  "Source requirement authority or usage-binding counts are incorrect."
);
ok(
  sourceRequirements.schemaVersion ===
    "rcap-source-materialization-scaffold/v1" &&
    sourceRequirements.contractKind ===
      "dependency_scaffold_not_worker_assignment" &&
    sourceRequirements.assignmentAnchor === null &&
    sourceRequirements.portableProjection === null &&
    sourceRequirements.captainAssignmentRequired === true &&
    sourceRequirements.portableProjectionRequired === true &&
    sourceRequirements.workerReady === false &&
    sourceRequirements.workerReadAuthorized === false &&
    sourceRequirements.workerMaterializationAuthorized === false &&
    sourceRequirements.repositorySourcePathTreatment ===
      "identity_evidence_only_never_worker_source" &&
    sourceRequirements.historicalRepositoryPathTreatment ===
      "identity_evidence_only_never_worker_source" &&
    sourceRequirements.provenance.productionQueueUsageBindingSource ===
      files.productionQueue &&
    sourceRequirements.provenance.productionQueueFamilyId ===
      PRODUCTION_QUEUE_FAMILY_ID &&
    sourceRequirements.provenance.usageBindingsAuthorizeSourceReads === false &&
    sourceRequirements.counts.captainProjectedExactSources === 0,
  "Illinois source contract became a worker-ready or normative materialization assignment."
);
ok(
  requirements.every((requirement) =>
    Object.keys(requirement).every(
      (key) => !key.startsWith("verificationSource")
    )
  ),
  "Illinois source contract contains a worker verification-source locator."
);
ok(
  requirements.every(
    (requirement) =>
      requirement.workerReadAuthorized === false &&
      requirement.workerMaterializationAuthorized === false
  ),
  "Every Illinois source record must explicitly deny worker reads and materialization."
);

const queueFamily = productionQueue.families.find(
  (entry) => entry.familyId === PRODUCTION_QUEUE_FAMILY_ID
);
ok(
  queueFamily?.jurisdiction === "IL" &&
    queueFamily?.priority === 6 &&
    queueFamily?.workerReady === false &&
    queueFamily?.packetReady === false &&
    queueFamily?.enabled === false &&
    queueFamily?.counts?.trackCount === TRACK_IDS.length &&
    queueFamily?.counts?.componentCount === OFFICIAL_PDF_USAGE_BINDING_COUNT &&
    queueFamily?.counts?.documentCount === COMPONENT_DOCUMENT_IDS.size &&
    queueFamily?.counts?.exactSourceRequirementCount ===
      DIRECT_DOCUMENT_IDS.size &&
    queueFamily?.counts?.unresolvedSourceIdentityCount ===
      UNMANIFESTED_DOCUMENT_IDS.size + 1,
  "Current production-queue Illinois identity, counts, or disabled posture changed."
);

const queueDocuments = queueFamily?.documents ?? [];
const queueDocumentById = new Map(
  queueDocuments.map((document) => [document.officialFormId, document])
);
const queueUsageBindings = queueDocuments.flatMap((document) =>
  document.usageBindings.map((binding) => ({
    officialFormId: document.officialFormId,
    ...binding
  }))
);
ok(
  queueDocuments.length === COMPONENT_DOCUMENT_IDS.size &&
    sameSet(
      queueDocuments.map((document) => document.officialFormId),
      [...COMPONENT_DOCUMENT_IDS]
    ) &&
    queueUsageBindings.length === OFFICIAL_PDF_USAGE_BINDING_COUNT &&
    unique(queueUsageBindings.map((binding) => binding.componentId)),
  "Production queue does not expose 15 Illinois identities and 48 unique official-PDF component bindings."
);

for (const requirement of requirements) {
  const queueDocument = queueDocumentById.get(requirement.componentDocumentId);
  const queueBindingRoles = [
    ...new Set(
      (queueDocument?.usageBindings ?? []).map((binding) => binding.role)
    )
  ];
  ok(
    sameJson(requirement.usageBindings, queueDocument?.usageBindings) &&
      sameSet(requirement.packetRoles, queueBindingRoles),
    `${requirement.componentDocumentId}: source provenance differs from the exact current production-queue usage bindings.`
  );

  if (DIRECT_DOCUMENT_IDS.has(requirement.componentDocumentId)) {
    ok(
      queueDocument?.sourceIdentityState === "exact_source_requirement_ready" &&
        queueDocument?.exactSourceRequirement !== null &&
        sameJson(
          queueDocument?.exactSourceRequirement?.usageBindings,
          queueDocument?.usageBindings.map(({ trackId, componentId }) => ({
            trackId,
            componentId
          }))
        ),
      `${requirement.componentDocumentId}: exact queue identity or compact requirement bindings changed.`
    );
  } else {
    ok(
      queueDocument?.sourceIdentityState === "authority_identity_unresolved" &&
        queueDocument?.exactSourceRequirement === null,
      `${requirement.componentDocumentId}: unresolved queue identity was promoted to an exact requirement.`
    );
  }
}

const rule298QueueDocument = queueDocumentById.get(RULE_298_ID);
ok(
  rule298QueueDocument?.usageBindings?.length === ADULT_TRACKS.length &&
    rule298QueueDocument?.sourceIdentityState ===
      "authority_identity_unresolved" &&
    rule298QueueDocument?.exactSourceRequirement === null &&
    rule298QueueDocument?.authorityAssets?.length === 0 &&
    rule298QueueDocument?.repositoryCandidates?.length === 0,
  "Rule 298 queue provenance no longer preserves nine uses and an unresolved authority identity."
);

const auditTracks = trackAudit.tracks.filter(
  (track) => track.jurisdiction === "IL" && TRACK_IDS.includes(track.trackId)
);
const auditComponents = auditTracks.flatMap((track) => track.components);
// These maps join immutable audit metadata by recorded identity-evidence path.
// Their keys are never resolved, opened, hashed, or treated as worker sources.
const registryByPath = new Map(
  sourceRegistry.artifacts
    .filter((artifact) => artifact.jurisdiction === "IL")
    .map((artifact) => [artifact.sourcePath, artifact])
);
const registryByArtifactId = new Map(
  sourceRegistry.artifacts
    .filter((artifact) => artifact.jurisdiction === "IL")
    .map((artifact) => [artifact.artifactId, artifact])
);
const repositoryAuditByPath = new Map(
  repositoryAudit.assets
    .filter((asset) => asset.jurisdiction === "IL")
    .map((asset) => [asset.sourcePath, asset])
);
const dispositionByCandidateId = new Map(
  candidateDispositions.decisions
    .filter((decision) => decision.jurisdiction === "IL")
    .map((decision) => [decision.candidateId, decision])
);

const captainProjectedExactCount = 0;

for (const requirement of requirements) {
  const prefix = requirement.componentDocumentId;
  const matchingAuditComponents = auditComponents.filter(
    (component) => component.officialFormId === prefix
  );
  ok(
    matchingAuditComponents.length > 0,
    `${prefix}: no adopted track-source-audit component uses this document.`
  );

  if (DIRECT_DOCUMENT_IDS.has(prefix)) {
    ok(
      requirement.authorityState === "authority_mapped_packet_candidate" &&
        requirement.assetClass === "packet_form" &&
        requirement.packetCandidate === true &&
        requirement.generationAllowed === false &&
        requirement.workerMaterializationAuthorized === false &&
        requirement.captainAssignmentEligibility ===
          "requires_assignment_anchor_and_portable_projection",
      `${prefix}: direct packet-asset authority posture changed.`
    );

    for (const component of matchingAuditComponents) {
      const asset = component.asset;
      ok(
        component.result === "authority_mapped_packet_candidate" &&
          asset?.workflowKey === requirement.workflowKey &&
          asset?.documentId === requirement.authorityDocumentId &&
          asset?.documentRole === requirement.authorityDocumentRole &&
          asset?.officialTitle === requirement.officialTitle &&
          asset?.revision === requirement.revision &&
          asset?.assetClass === "packet_form" &&
          asset?.sha256 === requirement.expectedSha256 &&
          asset?.canonicalRelativePath === requirement.canonicalAuthorityPath &&
          asset?.packetCandidate === true &&
          asset?.generationAllowed === false &&
          asset?.runtimeStatus === "runtime_disabled",
        `${prefix}: exact identity differs from the Edition 1.2 track-source audit.`
      );
      ok(
        component.sha256Verified === false,
        `${prefix}: shared relationship unexpectedly reports a verified SHA pin.`
      );
    }
  } else if (prefix === RULE_298_ID) {
    ok(
      requirement.authorityState ===
        "retained_packet_asset_component_mapping_pending" &&
        requirement.authorityDocumentId === "FW-CIV-APPLICATION" &&
        requirement.workflowKey === "IL:FW-CIV-APPLICATION:APPLICATION:EN" &&
        requirement.workerMaterializationAuthorized === false &&
        requirement.captainAssignmentEligibility ===
          "requires_assignment_anchor_and_portable_projection",
      "Rule 298 source contract no longer preserves the mapping blocker."
    );
    ok(
      matchingAuditComponents.length === ADULT_TRACKS.length &&
        matchingAuditComponents.every(
          (component) =>
            component.result === "authority_unmanifested_source" &&
            component.asset === null
        ),
      "Rule 298 normalized components no longer match the Edition 1.2 mapping-blocked state."
    );
    const acquisition = acquisitionDispositions.decisions.find(
      (decision) =>
        decision.acquisitionKey ===
        "acquire:IL:ill-s-ct-r-298-application-for-waiver-of-court-fees"
    );
    ok(
      acquisition?.edition12Disposition === "acquired_and_adopted" &&
        acquisition?.sourceIdentityConfidence ===
          "document_identity_confirmed_component_names_the_rule_not_the_form" &&
        acquisition?.rationale?.includes("mapping blocker"),
      "Rule 298 acquisition disposition no longer establishes retained FW-CIV plus a mapping blocker."
    );
  } else if (UNMANIFESTED_DOCUMENT_IDS.has(prefix)) {
    ok(
      requirement.authorityState === "authority_unmanifested_source" &&
        requirement.identityBindingStatus ===
          "prohibited_pending_successor_edition" &&
        requirement.authorityDocumentId === null &&
        requirement.workflowKey === null &&
        requirement.assetClass === null &&
        requirement.packetCandidate === false &&
        requirement.generationAllowed === false &&
        requirement.canonicalAuthorityPath === null &&
        requirement.repositorySourcePath === null &&
        requirement.expectedSha256 === null &&
        requirement.expectedBytes === null &&
        requirement.expectedPageCount === null &&
        requirement.expectedFieldCount === null &&
        requirement.workerMaterializationAuthorized === false &&
        requirement.captainAssignmentEligibility ===
          "ineligible_authority_unmanifested",
      `${prefix}: unmanifested source was promoted or given a selectable locator.`
    );
    ok(
      matchingAuditComponents.every(
        (component) =>
          component.result === "authority_unmanifested_source" &&
          component.asset === null
      ),
      `${prefix}: Edition 1.2 audit no longer records authority_unmanifested_source.`
    );

    const evidence = requirement.historicalCandidateEvidence;
    const disposition = dispositionByCandidateId.get(evidence?.candidateId);
    const registry = registryByArtifactId.get(evidence?.candidateId);
    const repositoryCandidate = repositoryAuditByPath.get(
      evidence?.repositoryPath
    );
    ok(
      disposition?.edition12Disposition === evidence?.edition12Disposition &&
        disposition?.sha256 === evidence?.sha256 &&
        disposition?.bytes === evidence?.bytes,
      `${prefix}: historical candidate disposition evidence changed.`
    );
    ok(
      registry?.inventorySha256 === evidence?.sha256 &&
        registry?.measuredSha256 === evidence?.sha256 &&
        registry?.sizeBytes === evidence?.bytes &&
        registry?.pageCount === evidence?.pageCount &&
        registry?.fieldCount === evidence?.fieldCount &&
        registry?.technicalClass === evidence?.technicalClass,
      `${prefix}: historical registry measurements differ from the candidate-evidence record.`
    );
    ok(
      repositoryCandidate?.status === "unmanifested_repository_asset" &&
        repositoryCandidate?.libraryRow === null &&
        repositoryCandidate?.sha256 === evidence?.sha256,
      `${prefix}: historical candidate unexpectedly became a manifested packet asset.`
    );
    sourceObservations.push({
      componentDocumentId: prefix,
      authorityDocumentId: null,
      state: "authority_unmanifested_candidate_prohibited"
    });
    continue;
  }

  const registry = registryByPath.get(requirement.repositorySourcePath);
  const repositoryAsset = repositoryAuditByPath.get(
    requirement.repositorySourcePath
  );
  ok(
    registry?.inventorySha256 === requirement.expectedSha256 &&
      registry?.measuredSha256 === requirement.expectedSha256 &&
      registry?.sizeBytes === requirement.expectedBytes &&
      registry?.pageCount === requirement.expectedPageCount &&
      registry?.fieldCount === requirement.expectedFieldCount &&
      registry?.fileType === "pdf" &&
      registry?.encrypted === false &&
      registry?.xfa === false,
    `${prefix}: exact source registry measurements differ.`
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
    `${prefix}: Edition 1.2 repository audit identity differs.`
  );
  sourceObservations.push({
    componentDocumentId: requirement.componentDocumentId,
    authorityDocumentId: requirement.authorityDocumentId,
    state:
      requirement.componentDocumentId === RULE_298_ID
        ? "component_mapping_unapproved_retained_evidence_only"
        : "captain_assignment_and_portable_projection_required"
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
if (requireMaterialized && !targetDocumentId) {
  failures.push("--require-materialized requires --document-id.");
}
if (requireMaterialized && targetRequirement) {
  if (targetRequirement.authorityState === "authority_unmanifested_source") {
    failures.push(
      `${targetRequirement.componentDocumentId}: authority_unmanifested_source cannot be materialized or selected under Edition 1.2.`
    );
  } else if (
    targetRequirement.authorityState ===
    "retained_packet_asset_component_mapping_pending"
  ) {
    failures.push(
      `${targetRequirement.componentDocumentId}: component mapping remains unapproved; retained identity evidence cannot become an exact source requirement or worker-readable source.`
    );
  } else {
    failures.push(
      `${targetRequirement.componentDocumentId}: captain assignment anchor and portable projection are required; repositorySourcePath is identity evidence only and cannot be inspected as a worker source.`
    );
  }
}

ok(
  sourceRequirements.knownUnselectedCandidateEvidence.every(
    (candidate) =>
      dispositionByCandidateId.has(candidate.candidateId) &&
      !COMPONENT_DOCUMENT_IDS.has(candidate.candidateId)
  ),
  "Known unselected candidate evidence is missing or was confused with a component document."
);
section(
  "2. Sources: all 48 queue usage bindings are exact; 8 direct assets, 1 mapping-pending asset, and 6 unmanifested components remain read- and materialization-disabled."
);

// ---------------------------------------------------------------------------
// 3. Adopted packet assembly and PRB unit boundaries
// ---------------------------------------------------------------------------

const packetSetById = new Map(
  packetSets.packetSets
    .filter((packetSet) => packetSet.jurisdiction === "IL")
    .map((packetSet) => [packetSet.packetSetId, packetSet])
);
const templateById = new Map(
  assembly.assemblyTemplates.map((template) => [template.templateId, template])
);

ok(
  assembly.runtimeRegistered === false &&
    assembly.routeReadyCount === 0 &&
    assembly.adultRouteAssemblies.length === ADULT_TRACKS.length,
  "Assembly contract opened runtime state or lost adult routes."
);

for (const routeAssembly of assembly.adultRouteAssemblies) {
  const packetSet = packetSetById.get(routeAssembly.packetSetId);
  const template = templateById.get(routeAssembly.templateId);
  ok(
    packetSet?.trackId === routeAssembly.trackId &&
      packetSet?.version === routeAssembly.packetSetVersion &&
      ADULT_TRACKS.includes(routeAssembly.trackId),
    `${routeAssembly.trackId}: adult packet-set identity differs.`
  );
  const materializedTemplate = template?.components.map((component) => ({
    componentId: routeAssembly.componentBindings[component.slot],
    role: component.role,
    requirement: component.requirement,
    conditionDescription: component.conditionDescription,
    outputStrategy: component.outputStrategy,
    officialFormId: component.officialFormId,
    order: component.order
  }));
  ok(
    sameJson(materializedTemplate, packetSet?.components.map(projectComponent)),
    `${routeAssembly.trackId}: template binding differs from the adopted packet set.`
  );
  ok(
    routeAssembly.assemblyState === "blocked_authority_and_materialization",
    `${routeAssembly.trackId}: assembly is not fail-closed.`
  );
}

const cannabisPacket = packetSetById.get(assembly.cannabisAssembly.packetSetId);
ok(
  cannabisPacket?.trackId === "il-cannabis-vacate" &&
    sameJson(
      assembly.cannabisAssembly.components,
      cannabisPacket.components.map(projectComponent)
    ) &&
    assembly.cannabisAssembly.rule298Treatment ===
      "participant_action_only_not_an_adopted_packet_component" &&
    !assembly.cannabisAssembly.components.some(
      (component) => component.officialFormId === RULE_298_ID
    ),
  "Cannabis packet differs from the adopted packet set or invents a Rule 298 component."
);

const prbPacket = packetSetById.get(assembly.prbAssembly.packetSetId);
ok(
  prbPacket?.trackId === "il-prb-cert" &&
    sameJson(
      assembly.prbAssembly.normalizedComponentSequence,
      prbPacket.components.map(projectComponent)
    ) &&
    assembly.prbAssembly.rule298Treatment ===
      "participant_action_only_not_an_adopted_packet_component" &&
    !assembly.prbAssembly.normalizedComponentSequence.some(
      (component) => component.officialFormId === RULE_298_ID
    ),
  "PRB packet differs from the adopted packet set or invents a Rule 298 component."
);

const prbTrack = trackRegistry.tracks.find(
  (track) => track.jurisdiction === "IL" && track.trackId === "il-prb-cert"
);
ok(
  prbTrack?.outputStrategyDeclared === "composed" &&
    prbTrack?.compositionMode === "mixed" &&
    sameJson(
      assembly.prbAssembly.unitViews.map((unit) => ({
        unitId: unit.unitId,
        order: unit.order,
        available: unit.available
      })),
      prbTrack?.units.map((unit) => ({
        unitId: unit.unitId,
        order: unit.order,
        available: unit.available
      }))
    ),
  "PRB unit views differ from the adopted composed-track definition."
);
const nonmilitaryView = assembly.prbAssembly.unitViews.find(
  (unit) => unit.unitId === "il-prb-cert-nonmilitary-expungement-branch"
);
ok(
  nonmilitaryView?.available === false &&
    nonmilitaryView?.componentIds.length === 0 &&
    prbTrack?.units.find((unit) => unit.unitId === nonmilitaryView?.unitId)
      ?.outputStrategyStatus === "unresolved",
  "PRB non-military branch no longer fails closed."
);
const projectedPrbComponentIds = assembly.prbAssembly.unitViews.flatMap(
  (unit) => unit.componentIds
);
ok(
  unique(projectedPrbComponentIds) &&
    sameSet(
      projectedPrbComponentIds,
      prbPacket.components.map((component) => component.componentId)
    ),
  "PRB branch views do not partition the adopted packet components exactly once."
);
section("3. Assembly: 9 adult, 1 CXP, and 1 composed PRB contract match.");

// ---------------------------------------------------------------------------
// 4. Renderer and zero-mapping field/ownership scaffolds
// ---------------------------------------------------------------------------

ok(
  renderer.familyId === FAMILY_ID &&
    renderer.enabled === false &&
    renderer.activeRendererCount === 0 &&
    renderer.rendererAdapters.every((adapter) => adapter.enabled === false) &&
    renderer.documents.length === COMPONENT_DOCUMENT_IDS.size &&
    sameSet(
      renderer.documents.map((document) => document.componentDocumentId),
      [...COMPONENT_DOCUMENT_IDS]
    ) &&
    renderer.documents.every((document) => document.activeRenderer === null),
  "Renderer scaffold enabled a renderer or lost document coverage."
);
ok(
  renderer.documents.find(
    (document) =>
      document.componentDocumentId === "CXP Motion to Vacate and Expunge"
  )?.rendererClassificationState === "technical_classification_discrepancy",
  "CXP technical-classification discrepancy is no longer fail-closed."
);
const cxpDisposition = dispositionByCandidateId.get(
  "cxp-motion-to-vacate-and-expunge"
);
const cxpRegistry = registryByArtifactId.get(
  "cxp-motion-to-vacate-and-expunge"
);
const cxpRenderer = renderer.documents.find(
  (document) =>
    document.componentDocumentId === "CXP Motion to Vacate and Expunge"
);
ok(
  cxpDisposition?.structuralClass === "flat_pdf" &&
    cxpRegistry?.technicalClass === "clean_acroform" &&
    cxpRegistry?.fieldCount === 135 &&
    cxpRenderer?.authorityStructuralClass === "flat_pdf" &&
    cxpRenderer?.historicalTechnicalClass === "clean_acroform" &&
    cxpRenderer?.candidateRenderer === null,
  "CXP renderer discrepancy is not grounded in both immutable authority and historical inspection."
);
ok(
  fieldMap.familyId === FAMILY_ID &&
    fieldMap.activeMappingCount === 0 &&
    fieldMap.activeOverlayPlacementCount === 0 &&
    fieldMap.documents.length === COMPONENT_DOCUMENT_IDS.size &&
    sameSet(
      fieldMap.documents.map((document) => document.componentDocumentId),
      [...COMPONENT_DOCUMENT_IDS]
    ) &&
    fieldMap.documents.every(
      (document) =>
        document.mappings.length === 0 &&
        document.overlayPlacements.length === 0 &&
        document.candidateDrafts.every(
          (draft) =>
            draft.treatment ===
              "historical_candidate_only_not_authority_or_mapping_evidence" &&
            fs.existsSync(absolute(draft.path))
        )
    ),
  "Field-map scaffold contains active mappings/placements or invalid candidate treatment."
);
ok(
  ownershipSchema.properties?.documents?.minItems ===
    COMPONENT_DOCUMENT_IDS.size &&
    ownershipSchema.properties?.documents?.maxItems ===
      COMPONENT_DOCUMENT_IDS.size &&
    fixtureSchema.properties?.syntheticDataOnly?.const === true,
  "Illinois ownership or fixture schema contract changed."
);
ok(
  ownership.familyId === FAMILY_ID &&
    ownership.documents.length === COMPONENT_DOCUMENT_IDS.size &&
    sameSet(
      ownership.documents.map((document) => document.componentDocumentId),
      [...COMPONENT_DOCUMENT_IDS]
    ) &&
    ownership.documents.every(
      (document) =>
        document.classifiedFieldCount === 0 &&
        document.writableMappedFieldCount === 0 &&
        document.fieldOwnership.length === 0 &&
        document.protectedOwnerClasses.every((owner) =>
          PROTECTED_OWNER_CLASSES.has(owner)
        )
    ),
  "Ownership scaffold contains classified/writable fields or lost document coverage."
);
for (const document of ownership.documents) {
  const mapDocument = fieldMap.documents.find(
    (candidate) =>
      candidate.componentDocumentId === document.componentDocumentId
  );
  const requirement = findRequirement(
    requirements,
    document.componentDocumentId
  );
  ok(
    document.sourceAuthorityState === requirement?.authorityState &&
      document.carriedFieldCount === mapDocument?.carriedFieldCount,
    `${document.componentDocumentId}: ownership, field-map, and source states differ.`
  );
}
section("4. Mapping: 15 documents are covered with zero active field writes.");

// ---------------------------------------------------------------------------
// 5. Synthetic fixtures remain blocked and signatures remain manual
// ---------------------------------------------------------------------------

ok(
  fixtures.familyId === FAMILY_ID &&
    fixtures.syntheticDataOnly === true &&
    fixtures.fixtures.length >= 15 &&
    unique(fixtures.fixtures.map((fixture) => fixture.fixtureId)) &&
    fixtures.fixtures.every(
      (fixture) =>
        TRACK_IDS.includes(fixture.trackId) &&
        Object.hasOwn(fixtures.dataSets, fixture.dataSetId) &&
        fixture.expectedOutcome === "blocked" &&
        ALLOWED_FIXTURE_ERRORS.has(fixture.expectedErrorCode)
    ) &&
    TRACK_IDS.every((trackId) =>
      fixtures.fixtures.some((fixture) => fixture.trackId === trackId)
    ),
  "Fixture coverage, synthetic posture, or fail-closed expectations changed."
);

function inspectSignatureValues(value, keyPath = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      inspectSignatureValues(entry, [...keyPath, String(index)])
    );
    return;
  }
  if (!value || typeof value !== "object") {
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    const nextPath = [...keyPath, key];
    if (key.toLowerCase().includes("signature")) {
      ok(
        entry === null,
        `Fixture ${nextPath.join(".")} must remain null for manual signature.`
      );
    } else {
      inspectSignatureValues(entry, nextPath);
    }
  }
}
inspectSignatureValues(fixtures.dataSets);
section(
  "5. Fixtures: every route has synthetic, blocked, manual-signature data."
);

// ---------------------------------------------------------------------------
// 6. Review state remains empty and unapproved
// ---------------------------------------------------------------------------

ok(
  review.familyId === FAMILY_ID &&
    review.sourceBackedSampleCount === 0 &&
    review.visualArtifactCount === 0 &&
    review.fieldMapReviewArtifactCount === 0 &&
    review.documentReviews.length === COMPONENT_DOCUMENT_IDS.size &&
    review.routeReviews.length === TRACK_IDS.length &&
    sameSet(
      review.routeReviews.map((route) => route.trackId),
      TRACK_IDS
    ) &&
    review.routeReviews.every(
      (route) =>
        route.sampleStatus === "not_generated" &&
        route.reviewStatus === "blocked"
    ) &&
    Object.values(review.approvals).every((value) => value === false),
  "Review manifest contains samples, approvals, or incomplete route coverage."
);
ok(
  review.excludedHistoricalArtifacts.every(
    (artifact) =>
      artifact.reason.includes("not") ||
      artifact.reason.includes("do not establish")
  ),
  "Historical output is no longer explicitly excluded as review evidence."
);
section("6. Review: no source-backed sample or approval exists.");

// ---------------------------------------------------------------------------
// 7. Dependency states preserve every authority and release gate
// ---------------------------------------------------------------------------

const dependencyById = new Map(
  dependencies.dependencies.map((dependency) => [
    dependency.dependencyId,
    dependency
  ])
);
const requiredBlockedDependencies = [
  "il-edition-1-2-authority-archive",
  "il-captain-source-assignment-and-portable-projection",
  "il-shared-relationship-sha-pins",
  "il-rule-298-component-mapping",
  "il-unmanifested-required-components",
  "il-cxp-renderer-classification",
  "il-prb-currentness-release-gate",
  "il-prb-nonmilitary-expungement-form",
  "il-projected-source-technical-inspection",
  "il-field-map-and-ownership-completion",
  "il-visual-and-legal-output-review"
];
ok(
  requiredBlockedDependencies.every(
    (dependencyId) => dependencyById.get(dependencyId)?.status === "blocked"
  ) &&
    dependencyById.get("il-legacy-generator-isolation")?.status === "satisfied",
  "Dependency contract opened an authority, source, mapping, branch, or review gate."
);
const projectionDependency = dependencyById.get(
  "il-captain-source-assignment-and-portable-projection"
);
ok(
  projectionDependency?.kind === "captain_assignment_portable_projection" &&
    projectionDependency?.reason.includes(
      "repositorySourcePath values are identity evidence only"
    ) &&
    projectionDependency?.reason.includes("never opened"),
  "Dependency contract does not preserve the captain-assignment and portable-projection boundary."
);
section(
  "7. Dependencies: all source, mapping, renderer, branch, and review gates stay closed."
);

// ---------------------------------------------------------------------------
// 8. TypeScript boundary is fail-closed and not centrally registered
// ---------------------------------------------------------------------------

for (const marker of [
  FAMILY_ID,
  "ILLINOIS_OFFICIAL_PDF_TRACK_IDS",
  "ILLINOIS_OFFICIAL_PDF_COMPONENT_DOCUMENT_IDS",
  "authority_unmanifested",
  "component_mapping_unapproved",
  "renderer_classification_unresolved",
  "branch_unavailable",
  "generation_disabled",
  "activeRendererCount: 0"
]) {
  ok(
    moduleText.includes(marker),
    `TypeScript boundary is missing marker ${marker}.`
  );
}
for (const trackId of TRACK_IDS) {
  ok(
    moduleText.includes(`"${trackId}"`),
    `TypeScript boundary omits ${trackId}.`
  );
}
for (const requirement of requirements) {
  ok(
    moduleText.includes(`"${requirement.componentDocumentId}"`),
    `TypeScript boundary omits ${requirement.componentDocumentId}.`
  );
  if (requirement.expectedSha256) {
    ok(
      moduleText.includes(requirement.expectedSha256),
      `TypeScript boundary omits exact hash for ${requirement.componentDocumentId}.`
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
    !text.includes("jurisdictions/illinois/official-pdf") &&
      !text.includes(FAMILY_ID),
    `${registryFile}: Illinois scaffold was imported into a shared registry.`
  );
}
section(
  "8. Boundary: typed stops exist and no shared registry imports the family."
);

// ---------------------------------------------------------------------------
// 9. Legacy and adjacent Illinois implementations remain untouched
// ---------------------------------------------------------------------------

const preservedPaths = [
  ...family.preservedLegacySurfaces,
  ...family.preservedAdjacentIllinoisImplementation
];
for (const preservedPath of preservedPaths) {
  ok(
    fs.existsSync(absolute(preservedPath)),
    `Preserved Illinois surface is missing: ${preservedPath}.`
  );
}
const unstagedLegacyDiff = spawnSync(
  "git",
  ["diff", "--quiet", "--", ...preservedPaths],
  { cwd: ROOT }
);
const stagedLegacyDiff = spawnSync(
  "git",
  ["diff", "--cached", "--quiet", "--", ...preservedPaths],
  { cwd: ROOT }
);
ok(
  unstagedLegacyDiff.status === 0 && stagedLegacyDiff.status === 0,
  "A preserved Illinois legacy or custom-pleading surface has a staged or unstaged change."
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
  "Illinois family paths contain generated or copied PDF bytes."
);

const ilRelationships = relationships.relationships.filter(
  (relationship) =>
    relationship.jurisdiction === "IL" &&
    TRACK_IDS.includes(relationship.trackId)
);
const ilAssignments = specifications.officialFormAssignments.filter(
  (assignment) =>
    assignment.jurisdiction === "IL" && TRACK_IDS.includes(assignment.trackId)
);
ok(
  ilRelationships.length === ilAssignments.length &&
    ilRelationships.every((relationship) =>
      ilAssignments.some(
        (assignment) =>
          assignment.trackId === relationship.trackId &&
          assignment.componentId === relationship.componentId &&
          assignment.officialFormId === relationship.officialFormId
      )
    ) &&
    ilAssignments.every(
      (assignment) => assignment.mappingStatus === "not_mapped"
    ),
  "Immutable Illinois component relationships or mapping posture changed."
);
section(
  "9. Isolation: legacy files are untouched and no PDF bytes were added."
);

const result = {
  ok: failures.length === 0,
  familyId: FAMILY_ID,
  jurisdiction: "IL",
  sectionCount: sections.length,
  sections,
  sourceSummary: {
    officialPdfUsageBindings: OFFICIAL_PDF_USAGE_BINDING_COUNT,
    directAuthorityMappings: DIRECT_DOCUMENT_IDS.size,
    retainedAssetsWithComponentMappingPending: 1,
    authorityUnmanifestedComponents: UNMANIFESTED_DOCUMENT_IDS.size,
    captainProjectedExactSources: captainProjectedExactCount,
    awaitingCaptainProjection: DIRECT_DOCUMENT_IDS.size + 1,
    workerSourceInspectionPerformed: false
  },
  captainSourceContract: {
    assignmentAnchor: null,
    portableProjection: null,
    captainAssignmentRequired: true,
    portableProjectionRequired: true,
    workerReadAuthorized: false,
    workerMaterializationAuthorized: false,
    repositorySourcePathTreatment: "identity_evidence_only_never_worker_source",
    historicalRepositoryPathTreatment:
      "identity_evidence_only_never_worker_source"
  },
  targetDocumentId,
  requireMaterialized,
  sourceObservations,
  failures
};

if (jsonOutput) {
  console.log(JSON.stringify(result, null, 2));
} else if (failures.length === 0) {
  console.log(
    `Illinois official-PDF family verification passed (${sections.length} sections).`
  );
  for (const message of sections) {
    console.log(`- ${message}`);
  }
  console.log(
    `- Captain source contract: assignment anchor required; portable projection required; ${captainProjectedExactCount} projected exact sources; legacy private bytes were not inspected.`
  );
} else {
  console.error(
    `Illinois official-PDF family verification failed (${failures.length} issue${failures.length === 1 ? "" : "s"}).`
  );
  console.error(
    `- Captain source contract: assignment anchor required; portable projection required; ${captainProjectedExactCount} projected exact sources; legacy private bytes were not inspected.`
  );
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
}

if (failures.length > 0) {
  process.exitCode = 1;
}
