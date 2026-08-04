#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const requireReady = process.argv.includes("--require-ready");
const unexpectedArgs = process.argv
  .slice(2)
  .filter((argument) => argument !== "--" && argument !== "--require-ready");

if (unexpectedArgs.length > 0) {
  fail(`Unsupported argument(s): ${unexpectedArgs.join(", ")}`);
}

const familyDir =
  "data/record-clearing/production-factory/official-pdf-families/AL";
const packetCatalogPath =
  "src/lib/rcap/packets/jurisdictions/alabama/packet-assemblies.json";
const boundaryPath =
  "src/lib/rcap/packets/jurisdictions/alabama/official-pdf-preflight.ts";
const acroformPath = "src/lib/rcap/packets/jurisdictions/alabama/acroform.ts";
const reconciliationPath =
  "data/record-clearing/production-factory/source-acquisition/rcap-al-in-repo-identity-reconciliation-cr-65.json";

const expectedTracks = [
  "al-misd-nonconviction-90",
  "al-felony-nonconviction-90",
  "al-misd-dwop",
  "al-felony-dwop",
  "al-diversion",
  "al-misd-conviction",
  "al-pardoned-felony",
  "al-trafficking",
  "al-pardon",
];
const expectedDocuments = ["CR-65", "C-10-CRIMINAL", "ABPP-3"];
const expectedLegalBlockers = new Map([
  ["al-misd-nonconviction-90", 0],
  ["al-felony-nonconviction-90", 2],
  ["al-misd-dwop", 2],
  ["al-felony-dwop", 2],
  ["al-diversion", 0],
  ["al-misd-conviction", 0],
  ["al-pardoned-felony", 2],
  ["al-trafficking", 0],
  ["al-pardon", 0],
]);

try {
  verify();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

function verify() {
  const schemaNames = [
    "source-requirements",
    "field-maps",
    "field-ownership",
    "fixtures",
    "packet-assemblies",
    "dependencies",
    "review-manifest",
  ];
  const schemas = new Map(
    schemaNames.map((name) => [
      name,
      readJson(`${familyDir}/${name}.schema.json`),
    ]),
  );
  const documents = new Map(
    schemaNames.map((name) => [
      name,
      readJson(
        name === "packet-assemblies"
          ? packetCatalogPath
          : `${familyDir}/${name}.json`,
      ),
    ]),
  );

  for (const name of schemaNames) {
    const schema = schemas.get(name);
    assert(
      schema.$schema === "https://json-schema.org/draft/2020-12/schema" &&
        typeof schema.$id === "string" &&
        schema.type === "object" &&
        schema.additionalProperties === false,
      `${name}: invalid schema envelope`,
    );
    validateAgainstSchema(schema, documents.get(name), schema, name);
  }

  const sourceRequirements = documents.get("source-requirements");
  const fieldMaps = documents.get("field-maps");
  const ownership = documents.get("field-ownership");
  const fixtures = documents.get("fixtures");
  const packetCatalog = documents.get("packet-assemblies");
  const dependencies = documents.get("dependencies");
  const reviewManifest = documents.get("review-manifest");

  const implementationJob = readJson(
    "planning/record-clearing-100-percent/jobs/IMP-OF-06-al-cr-65-c10-family.json",
  );
  const legalDesignRegistry = readJson(
    "data/record-clearing/legal-design-track-registry.json",
  );
  const sourceRegistry = readJson(
    "data/record-clearing/source-artifact-registry.json",
  );
  const authority = readJson(
    "data/record-clearing/master-library/authority.json",
  );
  const acquisitionIntelligence = readJson(
    "planning/record-clearing-100-percent/acquisition-intelligence/documents.json",
  );
  const reconciliation = readJson(reconciliationPath);

  const normalizedByTrack = verifyNormalizedScope(
    implementationJob,
    legalDesignRegistry,
  );
  verifySourceAuthority({
    sourceRequirements,
    sourceRegistry,
    authority,
    acquisitionIntelligence,
    reconciliation,
    normalizedByTrack,
  });
  verifyFieldMaps(fieldMaps, normalizedByTrack);
  verifyOwnership(ownership, normalizedByTrack);
  verifyFixtures(fixtures, normalizedByTrack);
  verifyPacketCatalog(packetCatalog, fixtures, fieldMaps, normalizedByTrack);
  verifyDependencies(dependencies);
  verifyReviews(reviewManifest, packetCatalog);
  verifyBoundaryIsolation();

  const readinessBlockers = [
    "captain_assignment_required",
    "cr65_edition_projection_required",
    "abpp3_source_unmanifested",
    "abpp3_waiver_of_liability_dependency_unresolved",
    "field_mappings_approved:0/3",
    "source_backed_reviews_complete:0/12",
    "legal_design_blockers:8",
    "pardon_product_scope_pending",
    "runtime_disabled",
  ];

  if (requireReady) {
    throw new Error(
      `--require-ready failed closed: ${readinessBlockers.join("; ")}`,
    );
  }

  process.stdout.write(
    [
      "Alabama official-PDF preflight verification passed.",
      "  normalized tracks/components: 9/26",
      "  declared identities: 3 (retained exact=2, unmanifested=1, unresolved identity=0)",
      "  retained usage bindings: CR-65=17, C-10-CRIMINAL=8",
      "  ABPP-3: exact official identity observed; retained source absent; mandatory companion dependency recorded",
      "  field ownership: 35 fields (33 normalized + 2 participant-manual)",
      "  mappings/source-backed samples: 0/3, 0",
      "  legal-design blockers: 8 across 4 tracks",
      "  captain assignment/portable projection: absent; runtime disabled",
      "  shared/live registry integration: absent",
      "  private-path inspection: not attempted by this verifier",
    ].join("\n") + "\n",
  );
}

function verifyNormalizedScope(job, registry) {
  assert(
    job.jobId === "IMP-OF-06-al-cr-65-c10-family" &&
      job.trackCount === 9 &&
      job.lane === "implementation-acroform",
    "implementation job drift",
  );
  assertExactSet(job.tracks, expectedTracks, "implementation job tracks");
  const tracks = registry.tracks.filter((track) => track.jurisdiction === "AL");
  assert(tracks.length === 9, "normalized Alabama track count must remain 9");
  assertExactSet(
    tracks.map((track) => track.trackId),
    expectedTracks,
    "normalized Alabama tracks",
  );
  const byTrack = uniqueMap(
    tracks,
    (track) => track.trackId,
    "normalized tracks",
  );
  const components = tracks.flatMap((track) => track.packetSet.components);
  assert(components.length === 26, "normalized component count must remain 26");
  assert(
    components.filter((component) => component.officialFormId === "CR-65")
      .length === 17 &&
      components.filter(
        (component) => component.officialFormId === "C-10-CRIMINAL",
      ).length === 8 &&
      components.filter((component) => component.officialFormId === "ABPP-3")
        .length === 1,
    "normalized document usage counts drift",
  );
  for (const [trackId, track] of byTrack) {
    assert(
      track.outputStrategy === "official_pdf_fill" &&
        track.packetSet.version === "1.0.0",
      `${trackId}: normalized output strategy or packet version drift`,
    );
    assert(
      track.legalDesignBlockers.length === expectedLegalBlockers.get(trackId),
      `${trackId}: legal-design blocker count drift`,
    );
  }
  return byTrack;
}

function verifySourceAuthority({
  sourceRequirements,
  sourceRegistry,
  authority,
  acquisitionIntelligence,
  reconciliation,
  normalizedByTrack,
}) {
  assert(
    sourceRequirements.familyId === "al-statewide-official-form-family" &&
      sourceRequirements.contractState === "pending_captain_assignment" &&
      sourceRequirements.assignmentAnchor === null &&
      sourceRequirements.portableProjection === null &&
      sourceRequirements.portableProjectionPresent === false &&
      sourceRequirements.workerReadAuthorized === false &&
      sourceRequirements.workerMaterializationAuthorized === false &&
      sourceRequirements.generationAllowed === false,
    "family source contract widened",
  );
  assert(
    sourceRequirements.declaredIdentityCount === 3 &&
      sourceRequirements.retainedSourceCount === 2 &&
      sourceRequirements.unmanifestedSourceCount === 1 &&
      sourceRequirements.unresolvedIdentityCount === 0,
    "source identity counts drift",
  );
  assertExactSet(
    [
      ...sourceRequirements.documents.map((source) => source.documentId),
      ...sourceRequirements.unmanifestedSources.map(
        (source) => source.documentId,
      ),
    ],
    expectedDocuments,
    "declared source identities",
  );
  assert(
    authority.edition === "1.2" &&
      authority.retention.archiveSha256 ===
        sourceRequirements.authorityPins.archiveSha256,
    "Edition 1.2 authority pin drift",
  );
  const reconciliationSha = crypto
    .createHash("sha256")
    .update(readText(reconciliationPath))
    .digest("hex");
  assert(
    reconciliationSha ===
      sourceRequirements.authorityPins.cr65ReconciliationSha256,
    "CR-65 reconciliation file hash drift",
  );

  const sourceByDocument = uniqueMap(
    sourceRequirements.documents,
    (source) => source.documentId,
    "retained source requirements",
  );
  for (const source of sourceRequirements.documents) {
    assert(
      source.contractState === "pending_captain_assignment" &&
        source.assignmentAnchor === null &&
        source.portableProjection === null &&
        source.portableProjectionPresent === false &&
        source.workerReadAuthorized === false &&
        source.workerMaterializationAuthorized === false &&
        source.sourceInspectionState ===
          "prohibited_until_captain_assignment" &&
        source.repositorySourcePathTreatment ===
          "identity_evidence_only_do_not_resolve_or_read" &&
        source.mappingApproved === false &&
        source.runtimeStatus === "runtime_disabled" &&
        source.generationAllowed === false,
      `${source.documentId}: retained source contract widened`,
    );
    assert(
      typeof source.repositorySourcePath === "string" &&
        source.repositorySourcePath.startsWith("private/"),
      `${source.documentId}: private identity-evidence string drift`,
    );
  }

  const cr65 = sourceByDocument.get("CR-65");
  const reconciliationEntry = reconciliation.reconciliations.find(
    (entry) => entry.documentId === "CR-65",
  );
  assert(
    reconciliation.jobId === "rcap-al-in-repo-identity-reconciliation-cr-65" &&
      reconciliation.downloadedSourceCount === 0 &&
      reconciliation.totals.reconciled === 1 &&
      reconciliation.totals.componentsBound === 17 &&
      reconciliationEntry.retainedArtifact.artifactId === cr65.artifactId &&
      reconciliationEntry.retainedArtifact.recordedSha256 ===
        cr65.expected.sha256 &&
      reconciliationEntry.retainedArtifact.sizeBytes === cr65.expected.bytes &&
      reconciliationEntry.retainedArtifact.pageCount ===
        cr65.technicalExpectation.pageCount &&
      reconciliationEntry.retainedArtifact.fieldCount ===
        cr65.technicalExpectation.fieldCount &&
      reconciliationEntry.retainedArtifact.sourcePath ===
        cr65.repositorySourcePath &&
      reconciliationEntry.sharedFormBinding.componentCount === 17,
    "CR-65 exact reconciliation drift",
  );
  assertExactSet(
    cr65.usageBindings.map((binding) => binding.componentId),
    reconciliationEntry.sharedFormBinding.componentIds,
    "CR-65 usage bindings",
  );

  const c10 = sourceByDocument.get("C-10-CRIMINAL");
  const c10Registry = sourceRegistry.artifacts.find(
    (artifact) => artifact.artifactId === c10.artifactId,
  );
  assert(
    c10.workflowKey === "AL:C-10-CRIMINAL:AFFIDAVIT:EN" &&
      c10.canonicalAuthorityPath ===
        "STATES/AL/02_PACKET_FORMS/AL__FORM__C-10-CRIMINAL__affidavit-of-substantial-hardship-and-order__REV-2024-05__EN.pdf" &&
      c10Registry.jurisdiction === "AL" &&
      c10Registry.presence === "present" &&
      c10Registry.inventorySha256 === c10.expected.sha256 &&
      c10Registry.measuredSha256 === c10.expected.sha256 &&
      c10Registry.sizeBytes === c10.expected.bytes &&
      c10Registry.pageCount === c10.technicalExpectation.pageCount &&
      c10Registry.fieldCount === c10.technicalExpectation.fieldCount &&
      c10Registry.sourcePath === c10.repositorySourcePath &&
      c10.usageBindings.length === 8,
    "C-10-CRIMINAL exact retained identity drift",
  );

  const abpp = sourceRequirements.unmanifestedSources[0];
  const intelligence = acquisitionIntelligence.documents.find(
    (document) => document.acquisitionId === "acquire:AL:abpp-3",
  );
  assert(
    abpp.documentId === "ABPP-3" &&
      abpp.artifactId === null &&
      abpp.repositorySourcePath === null &&
      abpp.workerReadAuthorized === false &&
      abpp.workerDownloadAuthorized === false &&
      abpp.workerMaterializationAuthorized === false &&
      abpp.generationAllowed === false &&
      intelligence.documentId === abpp.documentId &&
      intelligence.currentRevision === abpp.revision &&
      intelligence.officialIndexUrl === abpp.officialIndexUrl &&
      intelligence.directOfficialUrl === abpp.directOfficialUrl &&
      intelligence.revisionEvidence.includes(abpp.observedFingerprint.sha256) &&
      intelligence.revisionEvidence.includes("160,009 bytes") &&
      intelligence.expectedFormat.includes("4 pages") &&
      intelligence.nextAction.includes("Waiver of Liability"),
    "ABPP-3 unmanifested source intelligence drift",
  );

  const normalizedBindings = [...normalizedByTrack.values()]
    .flatMap((track) =>
      track.packetSet.components.map((component) => ({
        trackId: track.trackId,
        componentId: component.componentId,
        documentId: component.officialFormId,
      })),
    )
    .filter((binding) => binding.documentId !== "ABPP-3");
  assertExactSet(
    sourceRequirements.documents.flatMap((source) =>
      source.usageBindings.map(
        (binding) => `${binding.trackId}:${binding.componentId}`,
      ),
    ),
    normalizedBindings.map(
      (binding) => `${binding.trackId}:${binding.componentId}`,
    ),
    "retained source usage bindings",
  );
}

function verifyFieldMaps(catalog, normalizedByTrack) {
  assert(
    catalog.familyId === "al-statewide-official-form-family" &&
      catalog.mappingPolicy ===
        "no_source_field_binding_without_captain_assignment_and_exact_source_inspection" &&
      catalog.fieldMaps.length === 3,
    "field-map catalog drift",
  );
  assertExactSet(
    catalog.fieldMaps.map((fieldMap) => fieldMap.documentId),
    expectedDocuments,
    "field-map documents",
  );
  const generationKeys = new Set(
    [...normalizedByTrack.values()].flatMap((track) =>
      track.generationRequirements.map((requirement) => requirement.key),
    ),
  );
  for (const fieldMap of catalog.fieldMaps) {
    assert(
      fieldMap.activeRendererStrategy === null &&
        fieldMap.sourceFieldInventory.length === 0 &&
        fieldMap.sourceFieldBindings.length === 0 &&
        fieldMap.overlayPlacements.length === 0 &&
        fieldMap.unclassifiedSourceFieldPolicy === "reject" &&
        fieldMap.reviewStatus.identityApproved === false &&
        fieldMap.reviewStatus.ownershipApproved === false &&
        fieldMap.reviewStatus.mappingApproved === false &&
        fieldMap.runtimeStatus === "runtime_disabled" &&
        fieldMap.generationAllowed === false,
      `${fieldMap.documentId}: mapping gate widened`,
    );
    for (const key of fieldMap.normalizedInputKeys) {
      assert(
        generationKeys.has(key),
        `${fieldMap.documentId}: unknown normalized key ${key}`,
      );
    }
  }
}

function verifyOwnership(ownership, normalizedByTrack) {
  assert(
    ownership.fields.length === 35 &&
      ownership.routes.length === 9 &&
      ownership.sourceFieldCoverageState ===
        "not_started_worker_read_prohibited" &&
      ownership.unclassifiedSourceFieldPolicy === "reject",
    "field ownership envelope drift",
  );
  const normalizedKeys = new Set(
    [...normalizedByTrack.values()].flatMap((track) =>
      track.generationRequirements.map((requirement) => requirement.key),
    ),
  );
  assert(normalizedKeys.size === 33, "normalized generation key count drift");
  assertExactSet(
    ownership.fields.map((field) => field.fieldKey),
    [...normalizedKeys, "participantSignature", "participantSignatureDate"],
    "field ownership keys",
  );
  for (const field of ownership.fields) {
    if (
      field.fieldKey === "participantSignature" ||
      field.fieldKey === "participantSignatureDate"
    ) {
      assert(
        field.owner === "participant_manual" &&
          field.automationPolicy === "leave_blank",
        `${field.fieldKey}: signature ownership widened`,
      );
    }
  }
  assertExactSet(
    ownership.routes.map((route) => route.routeId),
    expectedTracks,
    "field ownership routes",
  );
}

function verifyFixtures(catalog, normalizedByTrack) {
  assert(catalog.fixtures.length === 9, "fixture count must remain 9");
  assertExactSet(
    catalog.fixtures.map((fixture) => fixture.routeId),
    expectedTracks,
    "fixture routes",
  );
  for (const fixture of catalog.fixtures) {
    const normalized = normalizedByTrack.get(fixture.routeId);
    const requiredKeys = normalized.generationRequirements
      .filter((requirement) => requirement.requirement === "required")
      .map((requirement) => requirement.key);
    assertExactSet(
      fixture.requiredFactKeys,
      requiredKeys,
      `${fixture.fixtureId} required facts`,
    );
    assertExactSet(
      Object.keys(fixture.facts),
      requiredKeys,
      `${fixture.fixtureId} supplied facts`,
    );
    assertExactSet(
      fixture.manualFieldsExpectedBlank,
      ["participantSignature", "participantSignatureDate"],
      `${fixture.fixtureId} manual fields`,
    );
    assert(
      fixture.synthetic === true &&
        fixture.expectedGateResult.currentWorkspace === "blocked_fail_closed" &&
        fixture.expectedGateResult.runtime === "runtime_disabled" &&
        fixture.primaryBlockers.length > 0,
      `${fixture.fixtureId}: expected gate widened`,
    );
  }
}

function verifyPacketCatalog(catalog, fixtures, fieldMaps, normalizedByTrack) {
  assert(
    catalog.familyId === "al-statewide-official-form-family" &&
      catalog.definitionStatus === "preflight_only_not_registered" &&
      catalog.packetAssemblies.length === 9,
    "packet catalog envelope drift",
  );
  const fixtureById = uniqueMap(
    fixtures.fixtures,
    (fixture) => fixture.fixtureId,
    "fixtures",
  );
  const mapById = uniqueMap(
    fieldMaps.fieldMaps,
    (fieldMap) => fieldMap.fieldMapId,
    "field maps",
  );
  let componentCount = 0;
  for (const assembly of catalog.packetAssemblies) {
    const normalized = normalizedByTrack.get(assembly.trackId);
    const requiredKeys = normalized.generationRequirements
      .filter((requirement) => requirement.requirement === "required")
      .map((requirement) => requirement.key);
    assert(
      assembly.packetSetId === normalized.packetSet.packetSetId &&
        assembly.packetSetVersion === normalized.packetSet.version &&
        assembly.outputStrategy === normalized.outputStrategy &&
        assembly.compositionMode === normalized.compositionMode &&
        assembly.legalDesignBlockerCount ===
          normalized.legalDesignBlockers.length &&
        assembly.legalDesignBlocked ===
          normalized.legalDesignBlockers.length > 0,
      `${assembly.trackId}: packet envelope drift`,
    );
    assertExactSet(
      assembly.requiredFactKeys,
      requiredKeys,
      `${assembly.trackId} packet facts`,
    );
    const fixture = fixtureById.get(assembly.fixtureId);
    assert(
      fixture.routeId === assembly.trackId &&
        fixture.packetSetId === assembly.packetSetId,
      `${assembly.trackId}: fixture link drift`,
    );
    assert(
      assembly.components.length === normalized.packetSet.components.length,
      `${assembly.trackId}: component count drift`,
    );
    componentCount += assembly.components.length;
    for (const component of assembly.components) {
      const normalizedComponent = normalized.packetSet.components.find(
        (candidate) => candidate.componentId === component.componentId,
      );
      assert(
        normalizedComponent &&
          component.order === normalizedComponent.order &&
          component.role === normalizedComponent.role &&
          component.requirement === normalizedComponent.requirement &&
          component.conditionDescription ===
            normalizedComponent.conditionDescription &&
          component.outputStrategy === normalizedComponent.outputStrategy &&
          component.officialFormId === normalizedComponent.officialFormId &&
          component.officialSourceUrl === normalizedComponent.officialSourceUrl,
        `${component.componentId}: normalized component drift`,
      );
      const fieldMap = mapById.get(component.fieldMapId);
      assert(
        fieldMap.documentId === component.officialFormId &&
          component.kind === "official_pdf" &&
          component.approval.identityApproved === false &&
          component.approval.mappingApproved === false &&
          component.runtimeStatus === "runtime_disabled" &&
          component.generationAllowed === false,
        `${component.componentId}: mapping or approval link drift`,
      );
    }
    assert(
      assembly.assemblyStatus === "blocked_preflight_only" &&
        assembly.expectedPreflightError === "family_not_ready" &&
        assembly.sourceCurrent === false &&
        assembly.runtimeDisabled === true &&
        assembly.runtimeStatus === "runtime_disabled" &&
        assembly.packetReady === false &&
        assembly.generationAllowed === false,
      `${assembly.trackId}: assembly gate widened`,
    );
  }
  assert(
    componentCount === 26,
    "packet catalog component count must remain 26",
  );
}

function verifyDependencies(catalog) {
  assert(
    catalog.dependencyCount === 9 &&
      catalog.resolvedDependencyCount === 0 &&
      catalog.dependencies.length === 9 &&
      catalog.runtimeStatus === "runtime_disabled" &&
      catalog.generationAllowed === false,
    "dependency catalog gate widened",
  );
  assertExactSet(
    catalog.dependencies.map((dependency) => dependency.category),
    [
      "captain_assignment",
      "edition_projection",
      "source_acquisition",
      "packet_component_design",
      "source_inspection",
      "field_mapping",
      "review",
      "legal_design",
      "product_scope",
    ],
    "dependency categories",
  );
  for (const dependency of catalog.dependencies) {
    assert(
      dependency.blocking === true &&
        dependency.preservesNormalizedDesign === true &&
        dependency.resolved === false &&
        dependency.runtimeStatus === "runtime_disabled" &&
        dependency.generationAllowed === false,
      `${dependency.dependencyId}: dependency gate widened`,
    );
  }
}

function verifyReviews(manifest, packetCatalog) {
  assert(
    manifest.reviewState === "blocked_before_source_backed_sample_generation" &&
      manifest.sourceBackedSampleCount === 0 &&
      manifest.visualArtifactCount === 0 &&
      manifest.fieldMapReviewArtifactCount === 0 &&
      manifest.humanLegalReviewStatus === "not_submitted" &&
      manifest.documentReviews.length === 3 &&
      manifest.routeReviews.length === 9,
    "review manifest envelope drift",
  );
  assert(
    manifest.sourceReconciliationEvidence.path === reconciliationPath &&
      manifest.sourceReconciliationEvidence.sha256 ===
        "61bee535989b9d645f54a52059647e40abeac4f1608bd577965af45fed53564c" &&
      manifest.sourceReconciliationEvidence.workerReadEffect ===
        "none_keep_fail_closed",
    "review reconciliation evidence drift",
  );
  assertExactSet(
    manifest.documentReviews.map((review) => review.documentId),
    expectedDocuments,
    "document reviews",
  );
  assertExactSet(
    manifest.routeReviews.map((review) => review.trackId),
    expectedTracks,
    "route reviews",
  );
  const assemblyByTrack = uniqueMap(
    packetCatalog.packetAssemblies,
    (assembly) => assembly.trackId,
    "packet assemblies",
  );
  for (const review of manifest.routeReviews) {
    const assembly = assemblyByTrack.get(review.trackId);
    assert(
      review.componentCount === assembly.components.length &&
        review.legalDesignBlockerCount === assembly.legalDesignBlockerCount &&
        review.sampleStatus === "not_generated",
      `${review.trackId}: route review drift`,
    );
    assertClosedApproval(review.approvals, `${review.trackId} review`);
  }
  for (const review of manifest.documentReviews) {
    assert(
      review.sampleStatus === "not_generated" &&
        review.mappingReview === "not_submitted" &&
        review.visualReview === "not_submitted" &&
        review.legalOutputReview === "not_submitted",
      `${review.documentId}: document review gate widened`,
    );
    assertClosedApproval(review.approvals, `${review.documentId} review`);
  }
  assertClosedApproval(manifest.familyReview, "family review");
}

function verifyBoundaryIsolation() {
  const boundary = readText(boundaryPath);
  const acroform = readText(acroformPath);
  const sharedRegistry = readText("src/lib/rcap/packets/registry.ts");
  const sharedResolver = readText("src/lib/rcap/packets/resolve.ts");
  assert(
    boundary.includes("assertAlabamaOfficialPdfFamilyReady") &&
      boundary.includes("captain_assignment_required") &&
      boundary.includes("abpp3_source_unmanifested") &&
      acroform.includes("assertAlabamaAcroformFillReady") &&
      acroform.includes('rendererStatus: "runtime_disabled"') &&
      !boundary.includes("pdf-lib") &&
      !acroform.includes("pdf-lib"),
    "typed fail-closed boundary drift",
  );
  for (const sharedFile of [sharedRegistry, sharedResolver]) {
    assert(
      !sharedFile.includes("al-statewide-official-form-family") &&
        !sharedFile.includes("jurisdictions/alabama/official-pdf-preflight") &&
        !sharedFile.includes("jurisdictions/alabama/acroform"),
      "Alabama preflight was registered in a shared/live path",
    );
  }
}

function assertClosedApproval(approval, label) {
  assert(
    Object.values(approval).every((value) => value === false),
    `${label}: approval gate widened`,
  );
}

function validateAgainstSchema(schema, value, rootSchema, location) {
  if (schema.$ref) {
    validateAgainstSchema(
      resolveSchemaRef(rootSchema, schema.$ref),
      value,
      rootSchema,
      location,
    );
    return;
  }
  if ("const" in schema) {
    assert(
      deepEqual(value, schema.const),
      `${location}: expected const ${JSON.stringify(schema.const)}`,
    );
  }
  if (Array.isArray(schema.enum)) {
    assert(
      schema.enum.some((candidate) => deepEqual(value, candidate)),
      `${location}: value not in declared enum`,
    );
  }
  if (schema.type !== undefined) {
    const allowedTypes = Array.isArray(schema.type)
      ? schema.type
      : [schema.type];
    assert(
      allowedTypes.some((type) => matchesSchemaType(value, type)),
      `${location}: expected type ${allowedTypes.join("|")}`,
    );
  }
  if (value === null) return;
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined) {
      assert(
        value.length >= schema.minItems,
        `${location}: too few array items`,
      );
    }
    if (schema.maxItems !== undefined) {
      assert(
        value.length <= schema.maxItems,
        `${location}: too many array items`,
      );
    }
    if (schema.uniqueItems) {
      assert(
        new Set(value.map((entry) => JSON.stringify(entry))).size ===
          value.length,
        `${location}: duplicate array items`,
      );
    }
    if (schema.items) {
      value.forEach((entry, index) =>
        validateAgainstSchema(
          schema.items,
          entry,
          rootSchema,
          `${location}[${index}]`,
        ),
      );
    }
    return;
  }
  if (typeof value === "object") {
    const properties = schema.properties ?? {};
    for (const required of schema.required ?? []) {
      assert(
        Object.hasOwn(value, required),
        `${location}: missing required property ${required}`,
      );
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        assert(
          Object.hasOwn(properties, key),
          `${location}: unexpected property ${key}`,
        );
      }
    }
    for (const [key, propertySchema] of Object.entries(properties)) {
      if (Object.hasOwn(value, key)) {
        validateAgainstSchema(
          propertySchema,
          value[key],
          rootSchema,
          `${location}.${key}`,
        );
      }
    }
    return;
  }
  if (typeof value === "string") {
    if (schema.minLength !== undefined) {
      assert(value.length >= schema.minLength, `${location}: string too short`);
    }
    if (schema.pattern !== undefined) {
      assert(
        new RegExp(schema.pattern).test(value),
        `${location}: pattern mismatch`,
      );
    }
    if (schema.format === "uri") {
      assert(Boolean(new URL(value).protocol), `${location}: invalid URI`);
    }
    return;
  }
  if (typeof value === "number" && schema.minimum !== undefined) {
    assert(value >= schema.minimum, `${location}: value below minimum`);
  }
  if (typeof value === "number" && schema.maximum !== undefined) {
    assert(value <= schema.maximum, `${location}: value above maximum`);
  }
}

function resolveSchemaRef(rootSchema, ref) {
  assert(ref.startsWith("#/"), `unsupported schema reference ${ref}`);
  return ref
    .slice(2)
    .split("/")
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce((value, segment) => {
      assert(
        value && Object.hasOwn(value, segment),
        `unresolved schema reference ${ref}`,
      );
      return value[segment];
    }, rootSchema);
}

function matchesSchemaType(value, type) {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }
  if (type === "integer") return Number.isInteger(value);
  return typeof value === type;
}

function uniqueMap(entries, keyOf, label) {
  const result = new Map();
  for (const entry of entries) {
    const key = keyOf(entry);
    assert(typeof key === "string" && key.length > 0, `${label}: blank key`);
    assert(!result.has(key), `${label}: duplicate ${key}`);
    result.set(key, entry);
  }
  return result;
}

function assertExactSet(actual, expected, label) {
  const uniqueActual = [...new Set(actual)].sort();
  const uniqueExpected = [...new Set(expected)].sort();
  assert(
    uniqueActual.length === actual.length,
    `${label}: duplicate values are not allowed`,
  );
  assert(
    deepEqual(uniqueActual, uniqueExpected),
    `${label}: expected [${uniqueExpected.join(", ")}], got [${uniqueActual.join(
      ", ",
    )}]`,
  );
}

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function readJson(relativePath) {
  try {
    return JSON.parse(readText(relativePath));
  } catch (error) {
    throw new Error(
      `${relativePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function readText(relativePath) {
  return fs.readFileSync(resolveRepoPath(relativePath), "utf8");
}

function resolveRepoPath(relativePath) {
  assert(
    typeof relativePath === "string" &&
      !path.isAbsolute(relativePath) &&
      !relativePath.replaceAll("\\", "/").startsWith("private/"),
    `tracked metadata path required; private source paths are prohibited: ${relativePath}`,
  );
  const absolutePath = path.resolve(rootDir, relativePath);
  const relative = path.relative(rootDir, absolutePath);
  assert(
    relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative),
    `path escapes repository root: ${relativePath}`,
  );
  return absolutePath;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function fail(message) {
  process.stderr.write(
    `Alabama official-PDF preflight verification failed: ${message}\n`,
  );
  process.exitCode = 1;
}
