#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const FAMILY_ID = "rcap-mo-official-pdf-family";
const FAMILY_DIR =
  "data/record-clearing/production-factory/official-pdf-families/MO";
const MODULE_PATH =
  "src/lib/rcap/packets/jurisdictions/missouri/official-pdf/family.ts";
const VERIFIER_PATH =
  "scripts/verify-rcap-missouri-official-pdf-families.mjs";

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
  relationships:
    "data/record-clearing/legal-design-track-source-relationships.json",
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
  "mo-311-326-minor-in-possession",
  "mo-575-120-identity-theft-correction",
  "mo-610-122-arrest-expungement",
  "mo-610-130-first-intoxication",
  "mo-610-140-arrest",
  "mo-610-140-conviction",
  "mo-610-145-mistaken-identity",
  "mo-art-xiv-marijuana"
];

const DOCUMENT_IDS = [
  "CR143",
  "CR145",
  "CR300",
  "CR301",
  "CR310",
  "CR311",
  "CR360",
  "CR370",
  "CR375",
  "FI-05",
  "GN10"
];

const EXACT_DOCUMENT_IDS = new Set([
  "CR145",
  "CR300",
  "CR301",
  "CR360",
  "CR375",
  "FI-05"
]);
const UNKNOWN_DOCUMENT_IDS = new Set(["CR143", "CR310", "CR311", "CR370"]);
const UNSUPPORTED_DOCUMENT_IDS = new Set(["GN10"]);
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
let targetDocumentId = null;
let targetTrackId = null;
let assertedSha256 = null;
let assertedBytes = null;
let requireExactIdentity = false;
let requireMaterializedSource = false;
let requireRenderable = false;
let requirePacketReady = false;
let requireFamilyMaterialized = false;
const argumentErrors = [];

function takeValue(index, argument) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    argumentErrors.push(`${argument} requires a value.`);
    return { value: null, nextIndex: index };
  }
  return { value, nextIndex: index + 1 };
}

for (let index = 0; index < argv.length; index += 1) {
  const argument = argv[index];
  if (argument === "--json") {
    jsonOutput = true;
  } else if (argument === "--document-id") {
    const result = takeValue(index, argument);
    targetDocumentId = result.value;
    index = result.nextIndex;
  } else if (argument === "--track-id") {
    const result = takeValue(index, argument);
    targetTrackId = result.value;
    index = result.nextIndex;
  } else if (argument === "--assert-sha256") {
    const result = takeValue(index, argument);
    assertedSha256 = result.value;
    index = result.nextIndex;
  } else if (argument === "--assert-bytes") {
    const result = takeValue(index, argument);
    if (result.value !== null) {
      assertedBytes = Number(result.value);
    }
    index = result.nextIndex;
  } else if (argument === "--require-exact-identity") {
    requireExactIdentity = true;
  } else if (argument === "--require-materialized-source") {
    requireMaterializedSource = true;
  } else if (argument === "--require-renderable") {
    requireRenderable = true;
  } else if (argument === "--require-packet-ready") {
    requirePacketReady = true;
  } else if (argument === "--require-family-materialized") {
    requireFamilyMaterialized = true;
  } else {
    argumentErrors.push(`Unknown argument: ${argument}`);
  }
}

const failures = [...argumentErrors];
const gateFailures = [];
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

function sameJson(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
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

function sortedUsages(bindings) {
  return bindings
    .map((binding) => ({
      trackId: binding.trackId,
      componentId: binding.componentId,
      role: binding.role
    }))
    .sort((left, right) =>
      `${left.trackId}:${left.componentId}`.localeCompare(
        `${right.trackId}:${right.componentId}`
      )
    );
}

function schemaTypeMatches(value, schemaType) {
  const types = Array.isArray(schemaType) ? schemaType : [schemaType];
  return types.some((type) => {
    if (type === "null") return value === null;
    if (type === "array") return Array.isArray(value);
    if (type === "object") {
      return value !== null && typeof value === "object" && !Array.isArray(value);
    }
    if (type === "integer") return Number.isInteger(value);
    return typeof value === type;
  });
}

function validateSchemaNode(schema, value, location, errors) {
  if (schema.type !== undefined && !schemaTypeMatches(value, schema.type)) {
    errors.push(`${location}: does not match declared type.`);
    return;
  }
  if (Object.hasOwn(schema, "const") && !sameJson(value, schema.const)) {
    errors.push(`${location}: differs from schema const.`);
  }
  if (schema.enum && !schema.enum.some((candidate) => sameJson(value, candidate))) {
    errors.push(`${location}: is outside the schema enum.`);
  }
  if (
    typeof value === "string" &&
    schema.pattern &&
    !new RegExp(schema.pattern).test(value)
  ) {
    errors.push(`${location}: does not match the schema pattern.`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${location}: has fewer than ${schema.minItems} items.`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`${location}: has more than ${schema.maxItems} items.`);
    }
    if (schema.items) {
      value.forEach((item, index) =>
        validateSchemaNode(schema.items, item, `${location}[${index}]`, errors)
      );
    }
  }
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const requiredKey of schema.required ?? []) {
      if (!Object.hasOwn(value, requiredKey)) {
        errors.push(`${location}: missing required property ${requiredKey}.`);
      }
    }
    for (const [key, propertySchema] of Object.entries(
      schema.properties ?? {}
    )) {
      if (Object.hasOwn(value, key)) {
        validateSchemaNode(
          propertySchema,
          value[key],
          `${location}.${key}`,
          errors
        );
      }
    }
  }
}

function validateDocument(schema, value, label) {
  const errors = [];
  validateSchemaNode(schema, value, label, errors);
  for (const error of errors) failures.push(error);
  return errors.length === 0;
}

function gate(code, message, details = {}) {
  gateFailures.push({ code, message, details });
}

function outputAndExit() {
  const allFailures = [
    ...failures.map((message) => ({
      code: "scaffold_validation_failed",
      message,
      details: {}
    })),
    ...gateFailures
  ];
  const result = {
    ok: allFailures.length === 0,
    familyId: FAMILY_ID,
    jurisdiction: "MO",
    sectionCount: sections.length,
    sections,
    counts: {
      tracks: 8,
      officialPdfUses: 28,
      documents: 11,
      exactPdfIdentities: 6,
      unknownPdfIdentities: 4,
      unsupportedContainerIdentities: 1,
      logicalComponents: 28,
      packetPhysicalDocumentInstances: 25
    },
    sourceObservations,
    failures: allFailures
  };

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.ok) {
    console.log(
      "Missouri official-PDF family verification passed: 8 tracks, 28 uses, 11 identities (6 exact PDF, 4 unknown PDF, 1 unsupported container), 25 packet instances, and every runtime gate closed."
    );
    for (const message of sections) console.log(`- ${message}`);
  } else {
    console.error(
      `Missouri official-PDF family verification failed (${allFailures.length} issue${allFailures.length === 1 ? "" : "s"}).`
    );
    for (const failure of allFailures) {
      console.error(`- [${failure.code}] ${failure.message}`);
    }
  }

  process.exit(result.ok ? 0 : 1);
}

for (const [label, relativePath] of Object.entries(files)) {
  ok(fs.existsSync(absolute(relativePath)), `${label}: missing ${relativePath}.`);
}
if (failures.length > 0) outputAndExit();

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
const relationships = readJson(files.relationships);
const authority = readJson(files.authority);
const repositoryAudit = readJson(files.repositoryAudit);
const sourceRegistry = readJson(files.sourceRegistry);
const productionQueue = readJson(files.productionQueue);
const moduleText = fs.readFileSync(absolute(files.module), "utf8");
const verifierText = fs.readFileSync(absolute(files.verifier), "utf8");

// 1. Family, queue, and fail-closed source contract.
ok(
  family.familyId === FAMILY_ID &&
    family.jurisdiction === "MO" &&
    sameJson(family.scope.trackIds, TRACK_IDS) &&
    sameJson(family.scope.documentIds, DOCUMENT_IDS),
  "Family manifest differs from the assigned Missouri queue family."
);
ok(
  family.scope.trackCount === 8 &&
    family.scope.topLevelOfficialPdfTrackCount === 4 &&
    family.scope.composedTrackCount === 2 &&
    family.scope.officialPdfComponentCount === 28 &&
    family.scope.documentCount === 11 &&
    family.scope.exactRetainedPdfIdentityCount === 6 &&
    family.scope.unresolvedPdfIdentityCount === 5 &&
    family.scope.authorityUnmanifestedIdentityCount === 4 &&
    family.scope.unsupportedContainerIdentityCount === 1 &&
    family.scope.exactIdentityUsageCount === 17 &&
    family.scope.unresolvedIdentityUsageCount === 11 &&
    family.scope.familyDeduplicatedUsageCount === 17 &&
    family.scope.packetPhysicalDocumentInstanceCount === 25 &&
    family.scope.packetDeduplicatedUsageCount === 3,
  "Family counts differ from the 8-track, 28-use Missouri assignment."
);
ok(
  family.sourceContract.contractKind ===
    "pre_materialization_dependency_scaffold_not_worker_assignment" &&
    family.sourceContract.assignmentAnchor === null &&
    family.sourceContract.portableProjection === null &&
    family.sourceContract.captainAssignmentRequired === true &&
    family.sourceContract.portableProjectionRequired === true &&
    family.sourceContract.workerMaterializationAuthorized === false &&
    family.sourceContract.workerReadAuthorized === false &&
    family.sourceContract.workerReady === false &&
    family.sourceContract.workerMayAcquireOrDownloadSources === false &&
    family.sourceContract.captainProjectedExactSources === 0,
  "Family source contract gained worker authority, a locator, or readiness."
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
  queueFamily?.jurisdiction === "MO" &&
    queueFamily?.priority === 16 &&
    sameJson(queueFamily.trackIds, TRACK_IDS) &&
    queueFamily.counts?.trackCount === 8 &&
    queueFamily.counts?.topLevelOfficialPdfTrackCount === 4 &&
    queueFamily.counts?.composedTrackCount === 2 &&
    queueFamily.counts?.componentCount === 28 &&
    queueFamily.counts?.documentCount === 11 &&
    queueFamily.counts?.exactSourceRequirementCount === 6 &&
    queueFamily.counts?.unresolvedSourceIdentityCount === 5 &&
    queueFamily.rendererLaneCounts?.acroform_or_hybrid_candidate === 6 &&
    queueFamily.rendererLaneCounts?.pending_fresh_local_source_inspection ===
      5 &&
    queueFamily.workerReady === false &&
    queueFamily.packetReady === false &&
    queueFamily.enabled === false,
  "Read-only production queue evidence differs from Missouri priority 16."
);
ok(
  sameJson(
    queueFamily?.documents.map((document) => document.officialFormId),
    DOCUMENT_IDS
  ),
  "Queue document identity order or membership changed."
);
section(
  "Scope: all eight tracks and twenty-eight official-PDF uses remain isolated and runtime-disabled."
);

// 2. JSON Schema validation, exact pins, unknown identities, and GN10.
validateDocument(
  sourceRequirementsSchema,
  sourceRequirements,
  "source-requirements"
);
validateDocument(fieldMapSchema, fieldMaps, "field-maps");
validateDocument(ownershipSchema, ownership, "field-ownership");
validateDocument(fixtureSchema, fixtures, "fixtures");
validateDocument(assemblySchema, assembly, "packet-assembly");

ok(
  authority.edition === "1.2" &&
    authority.adoptionStatus === "adopted" &&
    authority.retention?.archiveSha256 ===
      sourceRequirements.authorityArchiveSha256,
  "Master Library Edition 1.2 authority pin differs from the scaffold."
);
ok(
  sourceRequirements.workerMaterializationAuthorized === false &&
    sourceRequirements.workerReadAuthorized === false &&
    sourceRequirements.workerReady === false &&
    sourceRequirements.assignmentAnchor === null &&
    sourceRequirements.portableProjection === null &&
    sourceRequirements.networkAcquisitionAuthorized === false &&
    sourceRequirements.counts.documents === 11 &&
    sourceRequirements.counts.retainedExactPdfIdentities === 6 &&
    sourceRequirements.counts.unresolvedPdfIdentities === 5 &&
    sourceRequirements.counts.authorityUnmanifestedIdentities === 4 &&
    sourceRequirements.counts.unsupportedContainerIdentities === 1 &&
    sourceRequirements.counts.exactIdentityUsageBindings === 17 &&
    sourceRequirements.counts.unresolvedIdentityUsageBindings === 11 &&
    sourceRequirements.counts.captainProjectedExactSources === 0,
  "Aggregate source requirements gained authority/readiness or lost counts."
);

const requirements = sourceRequirements.requirements;
const queueDocumentById = new Map(
  queueFamily.documents.map((document) => [document.officialFormId, document])
);
const registryByPath = new Map(
  sourceRegistry.artifacts.map((artifact) => [artifact.sourcePath, artifact])
);
const repositoryByPath = new Map(
  repositoryAudit.assets.map((artifact) => [artifact.sourcePath, artifact])
);
ok(
  requirements.length === 11 &&
    unique(requirements.map((item) => item.componentDocumentId)) &&
    sameJson(
      requirements.map((item) => item.componentDocumentId),
      DOCUMENT_IDS
    ),
  "Source requirements are not the eleven queue-ordered document slots."
);

let exactUsageCount = 0;
let unknownUsageCount = 0;
let unsupportedUsageCount = 0;

for (const requirement of requirements) {
  const queueDocument = queueDocumentById.get(requirement.componentDocumentId);
  ok(
    Boolean(queueDocument),
    `${requirement.componentDocumentId}: missing queue document.`
  );
  ok(
    requirement.workerMaterializationAuthorized === false &&
      requirement.workerReadAuthorized === false &&
      requirement.workerReady === false &&
      requirement.generationAllowed === false &&
      requirement.assignmentFields?.assignedJobSha256 === null &&
      requirement.assignmentFields?.portableLocator === null &&
      requirement.assignmentFields?.materializationDestination === null &&
      sameJson(
        sortedUsages(requirement.usageBindings),
        sortedUsages(queueDocument?.usageBindings ?? [])
      ),
    `${requirement.componentDocumentId}: worker flags, assignment fields, or usage bindings drifted.`
  );

  if (EXACT_DOCUMENT_IDS.has(requirement.componentDocumentId)) {
    exactUsageCount += requirement.usageBindings.length;
    const queueExact = queueDocument?.exactSourceRequirement;
    const authorityAsset = queueDocument?.authorityAssets?.[0];
    const candidate = queueDocument?.repositoryCandidates?.[0];
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
        requirement.authorityState === "authority_asset_known" &&
        requirement.identityBindingStatus === "exact_pinned_identity" &&
        requirement.requirementDescriptorSchemaVersion ===
          "rcap-source-materialization-requirement/v1" &&
        requirement.workflowKey === authorityAsset?.workflowKey &&
        requirement.authorityDocumentId === queueExact?.documentId &&
        requirement.authorityDocumentRole === queueExact?.documentRole &&
        requirement.officialTitle === authorityAsset?.officialTitle &&
        requirement.revision === authorityAsset?.revision &&
        requirement.assetClass === authorityAsset?.assetClass &&
        requirement.packetCandidate === authorityAsset?.packetCandidate &&
        requirement.canonicalAuthorityPath ===
          queueExact?.canonicalAuthorityPath &&
        requirement.repositorySourcePathEvidence ===
          queueExact?.repositorySourcePath &&
        requirement.expectedSha256 === queueExact?.expectedSha256 &&
        requirement.expectedBytes === queueExact?.expectedBytes &&
        requirement.expectedMediaType === "application/pdf" &&
        requirement.sourceMaterializationState ===
          "binary_materialization_required" &&
        requirement.verificationCommand === expectedCommand,
      `${requirement.componentDocumentId}: exact identity differs from queue authority.`
    );
    ok(
      /^[0-9a-f]{64}$/.test(requirement.expectedSha256) &&
        Number.isSafeInteger(requirement.expectedBytes) &&
        requirement.expectedBytes > 0 &&
        candidate?.sha256 === requirement.expectedSha256 &&
        candidate?.sizeBytes === requirement.expectedBytes &&
        candidate?.fileType === "pdf" &&
        candidate?.technicalClass === "clean_acroform" &&
        candidate?.encrypted === false &&
        candidate?.xfa === false &&
        registryArtifact?.inventorySha256 === requirement.expectedSha256 &&
        registryArtifact?.measuredSha256 === requirement.expectedSha256 &&
        registryArtifact?.sizeBytes === requirement.expectedBytes &&
        registryArtifact?.pageCount === requirement.carriedPageCount &&
        registryArtifact?.fieldCount === requirement.carriedFieldCount &&
        registryArtifact?.technicalClass ===
          requirement.carriedTechnicalClass &&
        repositoryArtifact?.sha256 === requirement.expectedSha256 &&
        repositoryArtifact?.libraryRow?.documentId ===
          requirement.authorityDocumentId &&
        repositoryArtifact?.libraryRow?.canonicalRelativePath ===
          requirement.canonicalAuthorityPath,
      `${requirement.componentDocumentId}: carried registry/repository evidence does not match the immutable pin.`
    );
    sourceObservations.push({
      componentDocumentId: requirement.componentDocumentId,
      identityBindingStatus: requirement.identityBindingStatus,
      state: requirement.sourceMaterializationState,
      expectedSha256: requirement.expectedSha256,
      expectedBytes: requirement.expectedBytes,
      workerMaterializationAuthorized: false,
      workerReadAuthorized: false
    });
    continue;
  }

  const nullIdentityFields = [
    requirement.requirementDescriptorSchemaVersion,
    requirement.workflowKey,
    requirement.authorityDocumentId,
    requirement.authorityDocumentRole,
    requirement.officialTitle,
    requirement.revision,
    requirement.assetClass,
    requirement.canonicalAuthorityPath,
    requirement.repositorySourcePathEvidence,
    requirement.expectedSha256,
    requirement.expectedBytes,
    requirement.expectedMediaType,
    requirement.carriedPageCount,
    requirement.carriedFieldCount,
    requirement.carriedTechnicalClass,
    requirement.verificationCommand
  ];
  ok(
    nullIdentityFields.every((value) => value === null) &&
      requirement.packetCandidate === false,
    `${requirement.componentDocumentId}: a non-exact slot acquired selectable identity fields.`
  );

  if (UNKNOWN_DOCUMENT_IDS.has(requirement.componentDocumentId)) {
    unknownUsageCount += requirement.usageBindings.length;
    ok(
      queueDocument?.sourceIdentityState === "authority_identity_unresolved" &&
        queueDocument?.exactSourceRequirement === null &&
        queueDocument?.authorityAssets?.length === 0 &&
        queueDocument?.repositoryCandidates?.length === 0 &&
        requirement.authorityState === "authority_identity_unresolved" &&
        requirement.identityBindingStatus === "unknown_source_identity" &&
        requirement.sourceMaterializationState === "unknown_source_identity" &&
        (requirement.componentDocumentId !== "CR370" ||
          requirement.nonSelectableEvidence?.every(
            (evidence) => evidence.selectable === false
          )),
      `${requirement.componentDocumentId}: unknown identity became selectable or borrowed nearby evidence.`
    );
    sourceObservations.push({
      componentDocumentId: requirement.componentDocumentId,
      identityBindingStatus: requirement.identityBindingStatus,
      state: requirement.sourceMaterializationState,
      expectedSha256: null,
      expectedBytes: null,
      workerMaterializationAuthorized: false,
      workerReadAuthorized: false
    });
    continue;
  }

  unsupportedUsageCount += requirement.usageBindings.length;
  const gn10Asset = queueDocument?.authorityAssets?.[0];
  const gn10Candidate = queueDocument?.repositoryCandidates?.[0];
  ok(
    UNSUPPORTED_DOCUMENT_IDS.has(requirement.componentDocumentId) &&
      queueDocument?.sourceIdentityState ===
        "registry_measurement_not_uniquely_selectable" &&
      queueDocument?.exactSourceRequirement === null &&
      requirement.authorityState ===
        "authority_asset_known_unsupported_container" &&
      requirement.identityBindingStatus ===
        "unsupported_container_no_pdf_requirement" &&
      requirement.sourceMaterializationState ===
        "unsupported_source_container" &&
      gn10Asset?.documentId === "GN10" &&
      gn10Asset?.canonicalRelativePath?.endsWith(".docx") &&
      gn10Candidate?.fileType === "docx" &&
      gn10Candidate?.technicalClass === "no_pdf_required" &&
      requirement.nonSelectableEvidence?.length === 2 &&
      requirement.nonSelectableEvidence.every(
        (evidence) => evidence.selectable === false
      ) &&
      requirement.nonSelectableEvidence.some(
        (evidence) => evidence.evidenceKind === "excluded_obsolete_pdf"
      ),
    "GN10 lost its unsupported-container stop or obsolete-PDF non-substitution rule."
  );
  sourceObservations.push({
    componentDocumentId: requirement.componentDocumentId,
    identityBindingStatus: requirement.identityBindingStatus,
    state: requirement.sourceMaterializationState,
    expectedSha256: null,
    expectedBytes: null,
    workerMaterializationAuthorized: false,
    workerReadAuthorized: false
  });
}

ok(
  exactUsageCount === 17 &&
    unknownUsageCount === 5 &&
    unsupportedUsageCount === 6,
  "Source usage split is not 17 exact, 5 unknown, and 6 unsupported."
);
section(
  "Sources: six immutable PDF pins reconcile, four PDF identities remain unknown, GN10 remains unsupported, and all aggregate/per-record worker flags are false."
);

// 3. Renderer, map, and ownership scaffolds.
const expectedIdentityByDocument = new Map(
  requirements.map((item) => [
    item.componentDocumentId,
    item.identityBindingStatus
  ])
);
ok(
  renderer.enabled === false &&
    renderer.activeRendererCount === 0 &&
    renderer.rendererAdapters.length === 2 &&
    renderer.rendererAdapters.every((adapter) => adapter.enabled === false) &&
    renderer.documents.length === 11 &&
    sameJson(
      renderer.documents.map((item) => item.componentDocumentId),
      DOCUMENT_IDS
    ),
  "Renderer scaffold activated or lost a document slot."
);
for (const document of renderer.documents) {
  ok(
    document.identityBindingStatus ===
      expectedIdentityByDocument.get(document.componentDocumentId) &&
      document.activeRenderer === null &&
      (EXACT_DOCUMENT_IDS.has(document.componentDocumentId)
        ? document.candidateRendererLane === "acroform_or_hybrid_fill" &&
          document.rendererSelectionState ===
            "pending_captain_projection_inspection"
        : document.candidateRendererLane === null &&
          document.rendererSelectionState.startsWith("prohibited_")),
    `${document.componentDocumentId}: renderer lane or active state drifted.`
  );
}

ok(
  fieldMaps.activeMappingCount === 0 &&
    fieldMaps.activeOverlayPlacementCount === 0 &&
    fieldMaps.documents.length === 11 &&
    sameJson(
      fieldMaps.documents.map((item) => item.componentDocumentId),
      DOCUMENT_IDS
    ) &&
    fieldMaps.documents.every(
      (item) =>
        item.sourceBacked === false &&
        item.activeMappings.length === 0 &&
        item.activeOverlayPlacements.length === 0
    ),
  "Field-map scaffold contains an active/source-backed mapping or lost a slot."
);
ok(
  ownership.automationPolicy.activeWritableFieldCount === 0 &&
    ownership.automationPolicy.signaturesAlwaysManual === true &&
    ownership.automationPolicy.swornStatementsAlwaysManual === true &&
    ownership.automationPolicy.notarialCompletionAlwaysManual === true &&
    ownership.automationPolicy.unknownOwnerDefaultsToProtected === true &&
    sameJson(
      ownership.automationPolicy.protectedOwnerClasses,
      PROTECTED_OWNER_CLASSES
    ) &&
    ownership.documents.length === 11 &&
    sameJson(
      ownership.documents.map((item) => item.componentDocumentId),
      DOCUMENT_IDS
    ),
  "Ownership policy no longer protects signatures, sworn/notarial blocks, or protected owners."
);
for (const document of ownership.documents) {
  ok(
    document.activeWritableFields.length === 0 &&
      document.manualParticipantBlocks.every(
        (block) => block.automation === "manual_only"
      ) &&
      document.protectedBlocks.length > 0 &&
      document.protectedBlocks.every(
        (block) => block.automation === "never_fill"
      ) &&
      document.protectedBlocks.some((block) => block.owner === "unknown"),
    `${document.componentDocumentId}: ownership scaffold opened a field or lost an unknown-owner stop.`
  );
}
section(
  "Rendering: six carried AcroForm candidates remain inactive; maps have zero writes and ownership remains protected/manual."
);

// 4. Adopted packet composition, relationships, and deterministic deduplication.
const packetSetByTrack = new Map(
  packetSets.packetSets
    .filter((packetSet) => TRACK_IDS.includes(packetSet.trackId))
    .map((packetSet) => [packetSet.trackId, packetSet])
);
ok(packetSetByTrack.size === 8, "Not all eight adopted packet sets exist.");
ok(
  assembly.runtimeRegistered === false &&
    assembly.routeReadyCount === 0 &&
    assembly.assemblyScope === "official_pdf_fill_components_only" &&
    assembly.assemblies.length === 8 &&
    sameJson(
      assembly.assemblies.map((item) => item.trackId),
      TRACK_IDS
    ),
  "Packet assembly registered a route or lost queue track order."
);
ok(
  assembly.deduplication.componentUsageCount === 28 &&
    assembly.deduplication.uniquePhysicalSourceSlotCount === 11 &&
    assembly.deduplication.familyDeduplicatedUsageBindingCount === 17 &&
    assembly.deduplication.packetPhysicalDocumentInstanceCount === 25 &&
    assembly.deduplication.packetDeduplicatedUsageBindingCount === 3 &&
    assembly.deduplication.uniqueExactPdfSourceCount === 6 &&
    assembly.deduplication.uniqueUnresolvedPdfSourceSlotCount === 5,
  "Assembly deduplication counts differ from 28 uses / 11 slots / 25 packet instances."
);

const logicalComponents = [];
const physicalInstances = [];
for (const packetAssembly of assembly.assemblies) {
  const packetSet = packetSetByTrack.get(packetAssembly.trackId);
  const expectedOfficialComponents = packetSet.components
    .filter((component) => component.outputStrategy === "official_pdf_fill")
    .map(projectComponent);
  const expectedNonOfficialCount =
    packetSet.components.length - expectedOfficialComponents.length;
  ok(
    packetAssembly.packetSetId === packetSet.packetSetId &&
      packetAssembly.packetSetVersion === packetSet.version &&
      packetAssembly.nonOfficialComponentCount === expectedNonOfficialCount &&
      sameJson(packetAssembly.logicalComponents, expectedOfficialComponents) &&
      packetAssembly.assemblyState === "blocked",
    `${packetAssembly.trackId}: official-PDF slice differs from the adopted packet set.`
  );

  const byDocument = new Map();
  for (const component of packetAssembly.logicalComponents) {
    logicalComponents.push({
      trackId: packetAssembly.trackId,
      ...component
    });
    const ids = byDocument.get(component.officialFormId) ?? [];
    ids.push(component.componentId);
    byDocument.set(component.officialFormId, ids);
  }
  ok(
    packetAssembly.physicalDocumentInstances.length === byDocument.size,
    `${packetAssembly.trackId}: physical instance count does not deduplicate equal identities.`
  );
  for (const instance of packetAssembly.physicalDocumentInstances) {
    physicalInstances.push(instance);
    ok(
      instance.physicalCopyCount === 1 &&
        sameJson(
          sorted(instance.logicalComponentIds),
          sorted(byDocument.get(instance.componentDocumentId) ?? [])
        ) &&
        instance.renderState.startsWith("blocked_"),
      `${packetAssembly.trackId}/${instance.componentDocumentId}: physical instance coverage or stop drifted.`
    );
  }
}

const componentIds = logicalComponents.map((component) => component.componentId);
ok(
  logicalComponents.length === 28 &&
    unique(componentIds) &&
    physicalInstances.length === 25,
  "Assembly does not contain 28 unique logical uses and 25 physical packet instances."
);
const relationshipByComponent = new Map(
  relationships.relationships
    .filter((relationship) => componentIds.includes(relationship.componentId))
    .map((relationship) => [relationship.componentId, relationship])
);
ok(
  relationshipByComponent.size === 28 &&
    logicalComponents.every((component) => {
      const relationship = relationshipByComponent.get(component.componentId);
      return (
        relationship?.jurisdiction === "MO" &&
        relationship?.trackId === component.trackId &&
        relationship?.officialFormId === component.officialFormId
      );
    }),
  "Track-source relationships do not cover all 28 uses by document ID."
);

ok(
  assembly.physicalSourceCatalog.length === 11 &&
    sameJson(
      assembly.physicalSourceCatalog.map((item) => item.componentDocumentId),
      DOCUMENT_IDS
    ) &&
    assembly.physicalSourceCatalog.every(
      (item) =>
        item.runtimeSelectable === false &&
        sameJson(
          sorted(item.usageComponentIds),
          sorted(
            logicalComponents
              .filter(
                (component) =>
                  component.officialFormId === item.componentDocumentId
              )
              .map((component) => component.componentId)
          )
        )
    ),
  "Physical source catalog lost document order, provenance, or non-selectability."
);
section(
  "Assembly: adopted order/conditions cover all 28 uses; 11 family slots and 25 packet instances preserve deterministic exact-identity deduplication."
);

// 5. Fixtures, dependency/review gates, and typed boundary parity.
ok(
  fixtures.fixtureDataPolicy ===
    "synthetic_only_no_source_bytes_no_participant_data" &&
    fixtures.fixtures.length === 28 &&
    unique(fixtures.fixtures.map((fixture) => fixture.fixtureId)) &&
    sameJson(
      sorted(fixtures.fixtures.map((fixture) => fixture.componentId)),
      sorted(componentIds)
    ) &&
    fixtures.fixtures.every(
      (fixture) =>
        fixture.synthetic === true &&
        fixture.generationAttempted === false &&
        fixture.manualSignaturesBlank === true &&
        fixture.thirdPartyFieldsBlank === true
    ),
  "Fixtures are not one synthetic fail-closed case per official-PDF use."
);
const fixtureCodeCounts = Object.fromEntries(
  [
    "binary_materialization_required",
    "unknown_source_identity",
    "unsupported_source_container"
  ].map((code) => [
    code,
    fixtures.fixtures.filter(
      (fixture) => fixture.expectedBoundaryCode === code
    ).length
  ])
);
ok(
  fixtureCodeCounts.binary_materialization_required === 17 &&
    fixtureCodeCounts.unknown_source_identity === 5 &&
    fixtureCodeCounts.unsupported_source_container === 6,
  "Fixture boundary split is not 17 materialization / 5 unknown / 6 unsupported."
);

ok(
  dependencies.familyId === FAMILY_ID &&
    dependencies.dependencies.length === 11 &&
    dependencies.dependencies.filter((item) => item.status === "satisfied")
      .length === 1 &&
    dependencies.dependencies.find(
      (item) => item.dependencyId === "mo-shared-surface-isolation"
    )?.status === "satisfied" &&
    dependencies.dependencies
      .filter((item) => item.dependencyId !== "mo-shared-surface-isolation")
      .every((item) => item.status === "blocked"),
  "Dependency manifest opened a readiness prerequisite."
);
ok(
  review.sourceBackedSampleCount === 0 &&
    review.fieldMapReviewArtifactCount === 0 &&
    review.documentReviews.length === 11 &&
    review.routeReviews.length === 8 &&
    sameJson(
      review.documentReviews.map((item) => item.componentDocumentId),
      DOCUMENT_IDS
    ) &&
    sameJson(
      review.routeReviews.map((item) => item.trackId),
      TRACK_IDS
    ) &&
    Object.values(review.approvals).every((value) => value === false),
  "Review manifest gained samples, approvals, or lost document/route coverage."
);

for (const value of [
  FAMILY_ID,
  ...TRACK_IDS,
  ...DOCUMENT_IDS,
  ...componentIds,
  ...requirements
    .filter((item) => item.expectedSha256 !== null)
    .map((item) => item.expectedSha256)
]) {
  ok(moduleText.includes(value), `Typed boundary is missing ${value}.`);
}
ok(
  moduleText.includes("assertMissouriExactSourcePin") &&
    moduleText.includes("preflightMissouriOfficialPdfDocument") &&
    moduleText.includes("assertMissouriOfficialPdfTrackRenderable") &&
    moduleText.includes("assertMissouriOfficialPdfPacketAssemblable") &&
    moduleText.includes("assertMissouriOfficialPdfFamilyMaterialized") &&
    moduleText.includes('"exact_source_pin_mismatch"') &&
    moduleText.includes('"unknown_source_identity"') &&
    moduleText.includes('"unsupported_source_container"') &&
    moduleText.includes('"binary_materialization_required"') &&
    moduleText.includes('"generation_disabled"') &&
    moduleText.includes('"packet_assembly_blocked"') &&
    (moduleText.match(/workerMaterializationAuthorized: false/g) ?? [])
      .length >= 12 &&
    (moduleText.match(/workerReadAuthorized: false/g) ?? []).length >= 12 &&
    !/^\s*import\s/m.test(moduleText),
  "Typed boundary lost a terminal stop, explicit worker flags, or isolation."
);
section(
  "Regression: 28 synthetic boundaries, 11 document reviews, 8 route reviews, and typed exact/unknown/unsupported/render/packet stops remain closed."
);

// 6. Static source-sink guard.
const privateSourcePrefix = ["private", "Nationwide Record Clearing", ""].join(
  "/"
);
const absoluteWorkspacePrefix = ["", "workspaces", ""].join("/");
ok(
  !moduleText.includes(privateSourcePrefix) &&
    !verifierText.includes(privateSourcePrefix),
  "Missouri code contains a private source path literal."
);
ok(
  !/\bfetch\s*\(|https?:\/\/|createHash\s*\(|readFileSync\s*\(\s*(?:requirement|candidate|artifact)/.test(
    moduleText
  ) &&
    !/\bfetch\s*\(|https?:\/\/|createHash\s*\(|readFileSync\s*\(\s*(?:requirement|candidate|artifact)/.test(
      verifierText
    ),
  "Missouri code contains a network, hashing, or dynamic source-byte sink."
);
ok(
  !moduleText.includes(absoluteWorkspacePrefix) &&
    !verifierText.includes(absoluteWorkspacePrefix),
  "Missouri code contains an absolute workspace path."
);
section(
  "Isolation: no private-path literal, network acquisition, source hashing, dynamic source-byte read, live import, or absolute workspace path exists."
);

// Optional terminal assertions used by negative regression tests.
const requirementById = new Map(
  requirements.map((requirement) => [
    requirement.componentDocumentId,
    requirement
  ])
);
if (
  (assertedSha256 !== null || assertedBytes !== null) &&
  targetDocumentId === null
) {
  gate(
    "unsupported_document",
    "--assert-sha256/--assert-bytes require --document-id."
  );
}
if (
  assertedSha256 !== null &&
  !/^[0-9a-f]{64}$/.test(assertedSha256)
) {
  gate(
    "exact_source_pin_mismatch",
    "Asserted SHA-256 must be 64 lowercase hexadecimal characters."
  );
}
if (
  assertedBytes !== null &&
  (!Number.isSafeInteger(assertedBytes) || assertedBytes <= 0)
) {
  gate(
    "exact_source_pin_mismatch",
    "Asserted byte count must be a positive safe integer."
  );
}

const targetRequirement =
  targetDocumentId === null ? null : requirementById.get(targetDocumentId);
if (targetDocumentId !== null && !targetRequirement) {
  gate(
    "unsupported_document",
    `Missouri official-PDF family does not declare "${targetDocumentId}".`,
    { componentDocumentId: targetDocumentId }
  );
}

if (
  targetRequirement &&
  (requireExactIdentity ||
    assertedSha256 !== null ||
    assertedBytes !== null ||
    requireMaterializedSource)
) {
  if (targetRequirement.identityBindingStatus === "unknown_source_identity") {
    gate(
      "unknown_source_identity",
      `${targetDocumentId} has no exact adopted PDF authority identity.`,
      { componentDocumentId: targetDocumentId }
    );
  } else if (
    targetRequirement.identityBindingStatus ===
    "unsupported_container_no_pdf_requirement"
  ) {
    gate(
      "unsupported_source_container",
      "GN10 has a retained DOCX authority asset but no selectable PDF identity under contract v1.",
      { componentDocumentId: "GN10" }
    );
  } else if (
    (assertedSha256 !== null &&
      assertedSha256 !== targetRequirement.expectedSha256) ||
    (assertedBytes !== null &&
      assertedBytes !== targetRequirement.expectedBytes)
  ) {
    gate(
      "exact_source_pin_mismatch",
      `${targetDocumentId} does not match the adopted immutable source pin.`,
      {
        componentDocumentId: targetDocumentId,
        assertedSha256,
        assertedBytes,
        expectedSha256: targetRequirement.expectedSha256,
        expectedBytes: targetRequirement.expectedBytes
      }
    );
  } else if (requireMaterializedSource) {
    gate(
      "binary_materialization_required",
      `${targetDocumentId} requires a captain assignment and verified portable PDF projection.`,
      {
        componentDocumentId: targetDocumentId,
        workerMaterializationAuthorized: false,
        workerReadAuthorized: false
      }
    );
  }
}

if ((requireRenderable || requirePacketReady) && targetTrackId === null) {
  gate(
    "unsupported_track",
    "--require-renderable/--require-packet-ready require --track-id."
  );
}
if (targetTrackId !== null && !TRACK_IDS.includes(targetTrackId)) {
  gate(
    "unsupported_track",
    `Missouri official-PDF family does not declare track "${targetTrackId}".`,
    { trackId: targetTrackId }
  );
} else if (targetTrackId !== null && requireRenderable) {
  gate(
    "generation_disabled",
    `${targetTrackId} remains runtime-disabled; no Missouri renderer is active.`,
    { trackId: targetTrackId, activeRendererCount: 0 }
  );
} else if (targetTrackId !== null && requirePacketReady) {
  gate(
    "packet_assembly_blocked",
    `${targetTrackId} cannot assemble a production packet from the pre-materialization scaffold.`,
    { trackId: targetTrackId, routeReady: false, runtimeRegistered: false }
  );
}
if (requireFamilyMaterialized) {
  gate(
    "family_materialization_required",
    "The Missouri family has no worker-readable or materialized source set.",
    {
      workerMaterializationAuthorized: false,
      workerReadAuthorized: false,
      workerReady: false
    }
  );
}

outputAndExit();
