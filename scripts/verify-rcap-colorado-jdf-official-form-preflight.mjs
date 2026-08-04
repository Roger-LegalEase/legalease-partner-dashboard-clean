#!/usr/bin/env node

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
  "data/record-clearing/production-factory/official-pdf-families/CO";
const packetCatalogPath =
  "src/lib/rcap/packets/jurisdictions/colorado/packet-assemblies.json";
const boundaryPath =
  "src/lib/rcap/packets/jurisdictions/colorado/jdf-official-form-preflight.ts";

const expectedTracks = [
  "co_petition_seal_arrest",
  "co_motion_seal_nonconviction",
  "co_clean_slate",
  "co_motion_seal_conviction",
  "co_municipal_conviction_seal",
  "co_multiple_conviction_seal",
  "co_decriminalized_conduct_seal",
  "co_pardoned_conviction_seal",
];

const expectedDocumentIds = [
  "JDF-417",
  "JDF-417-ORDER",
  "JDF-477",
  "JDF-478",
  "JDF-2363",
  "JDF-612",
  "JDF-615",
  "JDF-683",
  "JDF-684",
  "JDF-641",
  "JDF-642",
  "JDF-2370",
  "JDF-2374",
  "JDF-680",
  "JDF-681",
];

const expectedUnresolvedIds = ["JDF-417-ORDER", "JDF-684"];
const expectedOverlayIds = ["JDF-680", "JDF-683"];
const expectedFactoryJobs = [
  "rcap-co-acroform-fill",
  "rcap-co-flat-pdf-overlay",
  "rcap-co-in-repo-identity-reconciliation-needs-edition-reclass-not-acquisition",
  "rcap-co-official-download-automation-blocked",
  "rcap-co-source-identity-resolution-jdf-417-order",
];

const expectedDistinctAssets = {
  "JDF-418": {
    artifactId:
      "jdf-418-order-to-seal-arrest-and-criminal-records-rev-2024-03-20",
    sha256: "b027be364d93a1f5b879916c144260e7aeeaadc46309bf69c9478d6ad70c7993",
    bytes: 542987,
  },
  "JDF-686": {
    artifactId:
      "jdf-686-order-to-seal-municipal-conviction-records-rev-2023-02-08",
    sha256: "abf997d8e701df0c74b1eb7833b35f30c006b50bf71b019abf7754d898433200",
    bytes: 63657,
  },
  "JDF-2371": {
    artifactId:
      "jdf-2371-motion-to-seal-conviction-records-conduct-no-longer-prohibited-rev-2025-07-01",
    sha256: "642558b85e3f3df8c15808369685bbe56398523c7794b6a949d20fd7b4f8b6d6",
    bytes: 669287,
  },
};

try {
  await verify();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

async function verify() {
  const schemas = {
    sourceRequirements: readJson(
      `${familyDir}/source-requirements.schema.json`,
    ),
    fieldMaps: readJson(`${familyDir}/field-maps.schema.json`),
    fieldOwnership: readJson(`${familyDir}/field-ownership.schema.json`),
    fixtures: readJson(`${familyDir}/fixtures.schema.json`),
    packetAssemblies: readJson(`${familyDir}/packet-assemblies.schema.json`),
    reviewManifest: readJson(`${familyDir}/review-manifest.schema.json`),
  };
  const sourceRequirements = readJson(`${familyDir}/source-requirements.json`);
  const fieldMaps = readJson(`${familyDir}/field-maps.json`);
  const ownership = readJson(`${familyDir}/field-ownership.json`);
  const fixtures = readJson(`${familyDir}/fixtures.json`);
  const packetCatalog = readJson(packetCatalogPath);
  const reviewManifest = readJson(`${familyDir}/review-manifest.json`);

  const implementationJob = readJson(
    "planning/record-clearing-100-percent/jobs/IMP-OF-04-co-jdf-family.json",
  );
  const legalDesignRegistry = readJson(
    "data/record-clearing/legal-design-track-registry.json",
  );
  const sourceRegistry = readJson(
    "data/record-clearing/source-artifact-registry.json",
  );
  const repositoryAssetAudit = readJson(
    "data/record-clearing/master-library/repository-asset-audit.json",
  );
  const acquisitionDocuments = readJson(
    "planning/record-clearing-100-percent/acquisition-intelligence/documents.json",
  );
  const masterLibraryAuthority = readJson(
    "data/record-clearing/master-library/authority.json",
  );
  const productionQueue = readJson(
    "data/record-clearing/production-factory/official-pdf-production-queue.json",
  );

  const dataBySchema = {
    sourceRequirements,
    fieldMaps,
    fieldOwnership: ownership,
    fixtures,
    packetAssemblies: packetCatalog,
    reviewManifest,
  };
  verifySchemas(schemas, dataBySchema);

  const normalizedByTrack = verifyNormalizedScope(
    implementationJob,
    legalDesignRegistry,
    productionQueue,
  );
  verifySourceRequirements(
    sourceRequirements,
    normalizedByTrack,
    sourceRegistry,
    repositoryAssetAudit,
    masterLibraryAuthority,
    productionQueue,
  );
  verifyIdentityDeclarations(
    sourceRequirements,
    acquisitionDocuments,
    sourceRegistry,
    productionQueue,
  );
  verifyFieldMaps(fieldMaps, sourceRequirements, normalizedByTrack);
  verifyOwnership(ownership, normalizedByTrack);
  verifyFixtures(fixtures, ownership, normalizedByTrack);
  verifyPacketAssemblies(
    packetCatalog,
    fixtures,
    fieldMaps,
    sourceRequirements,
    normalizedByTrack,
  );
  verifyReviewManifest(
    reviewManifest,
    fieldMaps,
    sourceRequirements,
    packetCatalog,
  );
  verifyBoundaryIsolation(packetCatalog);

  const sourceResults = sourceRequirements.documents.map((requirement) => ({
    documentId: requirement.documentId,
    code: "captain_assignment_required",
    detail:
      "source path intentionally not resolved without an assignment anchor and portable projection",
  }));

  const readinessBlockers = collectReadinessBlockers({
    sourceRequirements,
    fieldMaps,
    reviewManifest,
    packetCatalog,
    normalizedByTrack,
    sourceResults,
  });
  assert(
    readinessBlockers.length > 0,
    "preflight unexpectedly has no readiness blockers",
  );
  if (requireReady) {
    throw new Error(
      `--require-ready failed closed: ${readinessBlockers.join("; ")}`,
    );
  }

  const sourceCounts = sourceResults.reduce((summary, result) => {
    summary[result.code] = (summary[result.code] ?? 0) + 1;
    return summary;
  }, {});
  process.stdout.write(
    [
      "Colorado JDF official-form preflight verification passed.",
      `  normalized tracks: ${expectedTracks.length}`,
      `  declared official-form identities: ${expectedDocumentIds.length}`,
      `  exact retained source identities: ${sourceRequirements.documents.length}`,
      `  unresolved identities: ${sourceRequirements.unresolvedIdentities.length}`,
      "  retained authority role mismatches: 1 (JDF-2370)",
      `  flat-PDF overlay candidates: ${expectedOverlayIds.length} (0 confirmed coordinates)`,
      `  source state: ${Object.entries(sourceCounts)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([code, count]) => `${code}=${count}`)
        .join(", ")}`,
      "  materialization authority: absent (pending captain assignment; no assignment anchor or portable projection)",
      "  mappings/reviews: 0 approved; no source-backed samples",
      "  live/shared registry integration: absent",
      "  private-path inspection: not attempted by this verifier",
    ].join("\n") + "\n",
  );
}

function verifySchemas(schemas, dataBySchema) {
  for (const [name, schema] of Object.entries(schemas)) {
    assert(
      schema.$schema === "https://json-schema.org/draft/2020-12/schema",
      `${name}: schema must declare JSON Schema 2020-12`,
    );
    assert(
      typeof schema.$id === "string" && schema.$id.length > 0,
      `${name}: schema needs an $id`,
    );
    assert(
      typeof schema.title === "string" && schema.title.length > 0,
      `${name}: schema needs a title`,
    );
    assert(schema.type === "object", `${name}: schema root must be an object`);
    assert(
      schema.additionalProperties === false,
      `${name}: schema root must reject additional properties`,
    );
    validateAgainstSchema(schema, dataBySchema[name], schema, name);
  }
}

function verifyNormalizedScope(job, registry, productionQueue) {
  assert(job.jobId === "IMP-OF-04-co-jdf-family", "implementation job drift");
  assert(job.trackCount === 8, "implementation job trackCount must remain 8");
  assertExactSet(job.tracks, expectedTracks, "implementation job tracks");

  const normalizedByTrack = new Map();
  for (const trackId of expectedTracks) {
    const candidates = registry.tracks.filter(
      (track) => track.trackId === trackId && track.jurisdiction === "CO",
    );
    assert(
      candidates.length === 1,
      `${trackId}: expected one normalized track`,
    );
    const track = candidates[0];
    assert(
      track.outputStrategy === "official_pdf_fill",
      `${trackId}: normalized output strategy drift`,
    );
    assert(
      track.packetSet?.packetSetId === `${trackId}-set` &&
        track.packetSet.version === "1.0.0",
      `${trackId}: normalized packet-set identity drift`,
    );
    normalizedByTrack.set(trackId, track);
  }

  const normalizedComponents = [...normalizedByTrack.values()].flatMap(
    (track) => track.packetSet.components,
  );
  const normalizedOfficialIds = normalizedComponents
    .map((component) => component.officialFormId)
    .filter((documentId) => documentId !== null);
  assert(
    normalizedComponents.length === 16,
    "normalized CO scope must retain 16 components including process guidance",
  );
  assertExactSet(
    normalizedOfficialIds,
    expectedDocumentIds,
    "normalized official-form identities",
  );
  assert(
    normalizedComponents.filter(
      (component) =>
        component.outputStrategy === "process_guidance" &&
        component.officialFormId === null,
    ).length === 1,
    "normalized CO scope must retain exactly one process-guidance component",
  );

  const queueFamilies = productionQueue.families.filter(
    (family) => family.jurisdiction === "CO",
  );
  assert(
    queueFamilies.length === 1,
    "production queue must have one CO family",
  );
  const queueFamily = queueFamilies[0];
  assert(
    queueFamily.familyId === "rcap-co-official-pdf-family",
    "production queue CO family drift",
  );
  assertExactSet(
    queueFamily.trackIds,
    expectedTracks,
    "production queue tracks",
  );
  assert(
    queueFamily.counts.trackCount === 8 &&
      queueFamily.counts.componentCount === 15 &&
      queueFamily.counts.documentCount === 15 &&
      queueFamily.counts.exactSourceRequirementCount === 13 &&
      queueFamily.counts.unresolvedSourceIdentityCount === 2,
    "production queue CO counts drift",
  );
  assertExactSet(
    queueFamily.documents.map((document) => document.officialFormId),
    expectedDocumentIds,
    "production queue document identities",
  );
  assert(
    queueFamily.workerReady === false &&
      queueFamily.packetReady === false &&
      queueFamily.enabled === false,
    "production queue CO family must remain disabled",
  );

  return normalizedByTrack;
}

function verifySourceRequirements(
  manifest,
  normalizedByTrack,
  sourceRegistry,
  repositoryAssetAudit,
  authority,
  productionQueue,
) {
  assert(manifest.schemaVersion === 1, "source evidence schemaVersion drift");
  assert(
    manifest.familyId === "co-statewide-jdf-official-form-family" &&
      manifest.jurisdiction === "CO",
    "source evidence family identity drift",
  );
  assert(
    manifest.sourceSelectionPolicy ===
      "explicit_artifact_workflow_sha256_bytes_only_no_scan_alias_or_fallback",
    "source selection policy widened",
  );
  assertNonAuthorizingContract(manifest, "source evidence root");
  assert(
    manifest.contractAuthority ===
      "informational_preflight_only_not_normative_materialization_contract",
    "source evidence must not claim normative materialization authority",
  );
  assert(
    manifest.declaredIdentityCount === 15 &&
      manifest.resolvedSourceCount === 13 &&
      manifest.unresolvedIdentityCount === 2,
    "source identity counts drift",
  );
  assert(
    manifest.documents.length === 13 &&
      manifest.unresolvedIdentities.length === 2,
    "source evidence array counts drift",
  );
  assert(
    manifest.runtimeStatus === "runtime_disabled" &&
      manifest.generationAllowed === false,
    "source family runtime gate widened",
  );

  const resolvedIds = expectedDocumentIds.filter(
    (documentId) => !expectedUnresolvedIds.includes(documentId),
  );
  assertExactSet(
    manifest.documents.map((document) => document.documentId),
    resolvedIds,
    "resolved source identities",
  );
  assertExactSet(
    manifest.authorityPins.generatedFactoryJobs,
    expectedFactoryJobs,
    "generated CO factory jobs",
  );
  assert(
    manifest.authorityPins.edition === authority.edition &&
      manifest.authorityPins.archiveSha256 ===
        authority.retention.archiveSha256,
    "Master Library edition authority pin drift",
  );
  const legalReviewRows = [
    ...repositoryAssetAudit.assets,
    ...repositoryAssetAudit.libraryAssetsAbsentFromRepositoryInventory,
  ].filter(
    (asset) =>
      asset.workflowKey === manifest.authorityPins.legalReviewWorkflowKey,
  );
  assert(legalReviewRows.length === 1, "CO legal-review authority row missing");
  const legalReview = legalReviewRows[0];
  assert(
    legalReview.sha256 === manifest.authorityPins.legalReviewSha256 &&
      legalReview.canonicalRelativePath ===
        manifest.authorityPins.legalReviewCanonicalPath,
    "CO legal-review authority pin drift",
  );

  const expectedArtifactIds = new Set(
    manifest.documents.map((document) => document.artifactId),
  );
  const sourceByArtifact = uniqueMap(
    sourceRegistry.artifacts.filter((artifact) =>
      expectedArtifactIds.has(artifact.artifactId),
    ),
    (artifact) => artifact.artifactId,
    "source artifact registry",
  );
  const queueFamily = productionQueue.families.find(
    (family) => family.jurisdiction === "CO",
  );
  const queueByDocument = uniqueMap(
    queueFamily.documents,
    (document) => document.officialFormId,
    "CO production queue documents",
  );
  const normalizedComponents = new Map(
    [...normalizedByTrack.values()]
      .flatMap((track) => track.packetSet.components)
      .map((component) => [component.componentId, component]),
  );

  for (const document of manifest.documents) {
    assertNonAuthorizingContract(document, document.documentId);
    assert(
      document.portableLocatorTreatment ===
        "candidate_identity_locator_only_not_materialization_authority",
      `${document.documentId}: portable locator must be candidate-only`,
    );
    assert(
      document.materializationState ===
        "binary_materialization_absent_pending_authorized_assignment" &&
        document.workerTreatment ===
          "read_only_no_download_modify_copy_or_reconstruct",
      `${document.documentId}: materialization posture widened`,
    );
    assert(
      document.sourceCurrent === false &&
        document.mappingApproved === false &&
        document.runtimeStatus === "runtime_disabled" &&
        document.generationAllowed === false,
      `${document.documentId}: source/mapping/runtime gate widened`,
    );
    const normalized = normalizedComponents.get(document.componentId);
    assert(normalized, `${document.documentId}: normalized component missing`);
    assert(
      normalized.officialFormId === document.documentId &&
        normalized.role === document.declaredComponentRole,
      `${document.documentId}: normalized identity or role drift`,
    );

    const sourceArtifact = sourceByArtifact.get(document.artifactId);
    assert(
      sourceArtifact,
      `${document.documentId}: source registry row missing`,
    );
    assert(
      sourceArtifact.jurisdiction === "CO" &&
        sourceArtifact.sourcePath === document.repositorySourcePath &&
        sourceArtifact.measuredSha256 === document.expected.sha256 &&
        sourceArtifact.inventorySha256 === document.expected.sha256 &&
        sourceArtifact.sizeBytes === document.expected.bytes &&
        sourceArtifact.fileType === "pdf",
      `${document.documentId}: source registry fingerprint drift`,
    );
    assert(
      sourceArtifact.technicalClass ===
        document.technicalExpectation.technicalClass &&
        sourceArtifact.pageCount === document.technicalExpectation.pageCount &&
        sourceArtifact.fieldCount ===
          document.technicalExpectation.fieldCount &&
        sourceArtifact.encrypted === false &&
        sourceArtifact.xfa === false,
      `${document.documentId}: historical technical measurement drift`,
    );

    const queueDocument = queueByDocument.get(document.documentId);
    assert(
      queueDocument,
      `${document.documentId}: production queue row missing`,
    );
    const queueRequirement = queueDocument.exactSourceRequirement;
    assert(
      queueRequirement &&
        queueRequirement.documentId === document.documentId &&
        queueRequirement.documentRole === document.documentRole &&
        queueRequirement.repositorySourcePath ===
          document.repositorySourcePath &&
        queueRequirement.canonicalAuthorityPath ===
          document.canonicalAuthorityPath &&
        queueRequirement.expectedSha256 === document.expected.sha256 &&
        queueRequirement.expectedBytes === document.expected.bytes,
      `${document.documentId}: production queue source identity drift`,
    );
    assert(
      queueDocument.workerReady === false,
      `${document.documentId}: production queue worker gate widened`,
    );
    const authorityAssets = queueDocument.authorityAssets.filter(
      (asset) => asset.workflowKey === document.workflowKey,
    );
    assert(
      authorityAssets.length === 1 &&
        authorityAssets[0].documentId === document.documentId &&
        authorityAssets[0].documentRole === document.documentRole &&
        authorityAssets[0].revision === document.revision &&
        authorityAssets[0].canonicalRelativePath ===
          document.canonicalAuthorityPath &&
        authorityAssets[0].sha256 === document.expected.sha256 &&
        authorityAssets[0].generationAllowed === false &&
        authorityAssets[0].runtimeStatus === "runtime_disabled",
      `${document.documentId}: queue authority asset drift`,
    );

    const repositoryAssets = repositoryAssetAudit.assets.filter(
      (asset) =>
        asset.artifactId === document.artifactId &&
        asset.sourcePath === document.repositorySourcePath &&
        asset.sha256 === document.expected.sha256 &&
        asset.libraryRow?.workflowKey === document.workflowKey,
    );
    assert(
      repositoryAssets.length === 1 &&
        repositoryAssets[0].libraryRow.documentId === document.documentId &&
        repositoryAssets[0].libraryRow.revision === document.revision &&
        repositoryAssets[0].libraryRow.canonicalRelativePath ===
          document.canonicalAuthorityPath,
      `${document.documentId}: repository authority identity drift`,
    );
  }

  assert(
    manifest.documents.filter(
      (document) =>
        document.authorityDisposition === "authority_mapped_packet_candidate",
    ).length === 12,
    "authority-mapped source count must remain 12",
  );
  const roleMismatch = manifest.documents.filter(
    (document) => document.authorityDisposition === "authority_role_mismatch",
  );
  assert(
    roleMismatch.length === 1 &&
      roleMismatch[0].documentId === "JDF-2370" &&
      roleMismatch[0].documentRole === "INSTRUCTIONS" &&
      roleMismatch[0].declaredComponentRole === "primary_filing",
    "JDF-2370 role mismatch declaration drift",
  );
  assertExactSet(
    manifest.documents
      .filter(
        (document) =>
          document.rendererCandidate === "coordinate_overlay" &&
          document.technicalExpectation.technicalClass === "flat_pdf",
      )
      .map((document) => document.documentId),
    expectedOverlayIds,
    "flat-PDF overlay candidates",
  );
}

function verifyIdentityDeclarations(
  manifest,
  acquisitionDocuments,
  sourceRegistry,
  productionQueue,
) {
  assertExactSet(
    manifest.unresolvedIdentities.map((entry) => entry.documentId),
    expectedUnresolvedIds,
    "unresolved identities",
  );
  const acquisitions = uniqueMap(
    acquisitionDocuments.documents,
    (document) => document.acquisitionId,
    "acquisition intelligence",
  );
  const queueFamily = productionQueue.families.find(
    (family) => family.jurisdiction === "CO",
  );
  const queueByDocument = new Map(
    queueFamily.documents.map((document) => [
      document.officialFormId,
      document,
    ]),
  );
  for (const declaration of manifest.unresolvedIdentities) {
    assert(
      declaration.resolverSource === null &&
        declaration.aliasAllowed === false &&
        declaration.runtimeStatus === "runtime_disabled" &&
        declaration.generationAllowed === false,
      `${declaration.documentId}: unresolved declaration gate widened`,
    );
    const acquisition = acquisitions.get(declaration.acquisitionId);
    const queueDocument = queueByDocument.get(declaration.documentId);
    assert(
      acquisition &&
        acquisition.documentId === declaration.documentId &&
        acquisition.jurisdiction === "CO" &&
        acquisition.componentIds.includes(declaration.componentId) &&
        acquisition.trackIds.includes(declaration.trackId) &&
        acquisition.officialIndexUrl === declaration.officialIndexUrl,
      `${declaration.documentId}: acquisition declaration drift`,
    );
    assert(
      declaration.trackSourceDisposition === "authority_unmanifested_source" &&
        queueDocument?.relationshipResults.length === 1 &&
        queueDocument.relationshipResults[0] ===
          declaration.trackSourceDisposition &&
        declaration.acquisitionStatus === acquisition.finalResearchStatus,
      `${declaration.documentId}: raw track-source/acquisition status drift`,
    );
    if (declaration.documentId === "JDF-417-ORDER") {
      assert(
        declaration.authorityDisposition === "identity_unresolved" &&
          acquisition.finalResearchStatus === "identity_unresolved" &&
          declaration.authorityCandidate === null &&
          declaration.roleConflict === false,
        "JDF-417-ORDER must remain an unresolved identity",
      );
    } else {
      assert(
        declaration.documentId === "JDF-684" &&
          declaration.authorityDisposition ===
            "authority_unmanifested_source_and_role_conflict" &&
          acquisition.finalResearchStatus ===
            "official_download_automation_blocked" &&
          declaration.roleConflict === true,
        "JDF-684 unresolved role/currentness declaration drift",
      );
      const candidate = declaration.authorityCandidate;
      const artifact = sourceRegistry.artifacts.find(
        (entry) => entry.artifactId === candidate.artifactId,
      );
      assert(
        candidate.documentRole === "DENIAL_ORDER" &&
          candidate.usableForDeclaredComponent === false &&
          artifact?.sourceTreatment === "reference_only" &&
          artifact.sourcePath === candidate.repositorySourcePath &&
          artifact.measuredSha256 === candidate.sha256 &&
          artifact.sizeBytes === candidate.bytes,
        "JDF-684 denial-order evidence drift",
      );
    }
  }

  const expectedNonAliases = {
    "JDF-417-ORDER": "JDF-418",
    "JDF-684": "JDF-686",
    "JDF-2370": "JDF-2371",
  };
  assert(
    manifest.nonAliasDeclarations.length === 3,
    "non-alias declaration count drift",
  );
  for (const declaration of manifest.nonAliasDeclarations) {
    assert(
      expectedNonAliases[declaration.declaredDocumentId] ===
        declaration.distinctDocumentId,
      `${declaration.declaredDocumentId}: non-alias target drift`,
    );
    assert(
      declaration.disposition === "do_not_alias",
      `${declaration.declaredDocumentId}: alias prohibition widened`,
    );
  }

  for (const [documentId, expected] of Object.entries(expectedDistinctAssets)) {
    const artifacts = sourceRegistry.artifacts.filter(
      (artifact) => artifact.artifactId === expected.artifactId,
    );
    assert(
      artifacts.length === 1 &&
        artifacts[0].measuredSha256 === expected.sha256 &&
        artifacts[0].sizeBytes === expected.bytes,
      `${documentId}: distinct authority asset fingerprint drift`,
    );
    assert(
      !manifest.documents.some(
        (document) => document.documentId === documentId,
      ),
      `${documentId}: distinct asset must not be silently selected`,
    );
  }

  const unresolvedById = new Map(
    manifest.unresolvedIdentities.map((entry) => [entry.documentId, entry]),
  );
  assert(
    unresolvedById.get("JDF-417-ORDER").knownDistinctAuthorityAsset
      .documentId === "JDF-418" &&
      unresolvedById.get("JDF-684").knownDistinctAuthorityAsset.documentId ===
        "JDF-686",
    "unresolved distinct-authority evidence drift",
  );
}

function verifyFieldMaps(catalog, sourceRequirements, normalizedByTrack) {
  assert(
    catalog.familyId === "co-statewide-jdf-official-form-family" &&
      catalog.jurisdiction === "CO",
    "field-map catalog family drift",
  );
  assert(
    catalog.mappingPolicy ===
      "no_source_field_binding_or_overlay_coordinate_without_exact_source_inspection",
    "field-map source gate widened",
  );
  assert(catalog.fieldMaps.length === 15, "field-map count must remain 15");
  assertExactSet(
    catalog.fieldMaps.map((fieldMap) => fieldMap.documentId),
    expectedDocumentIds,
    "field-map document identities",
  );
  const sourceByDocument = new Map(
    sourceRequirements.documents.map((document) => [
      document.documentId,
      document,
    ]),
  );
  const resolutionByDocument = new Map(
    sourceRequirements.unresolvedIdentities.map((entry) => [
      entry.documentId,
      entry,
    ]),
  );
  const requiredKeysByTrack = normalizedRequiredKeys(normalizedByTrack);

  for (const fieldMap of catalog.fieldMaps) {
    const source = sourceByDocument.get(fieldMap.documentId);
    const resolution = resolutionByDocument.get(fieldMap.documentId);
    assert(
      Boolean(source) !== Boolean(resolution),
      `${fieldMap.documentId}: field map must have one identity source`,
    );
    assertExactSet(
      fieldMap.canonicalInputKeys,
      requiredKeysByTrack.get(fieldMap.trackId),
      `${fieldMap.documentId} canonical inputs`,
    );
    assert(
      fieldMap.sourceFieldInventory.length === 0 &&
        fieldMap.sourceFieldBindings.length === 0 &&
        fieldMap.overlayPlacements.length === 0 &&
        fieldMap.activeRendererStrategy === null &&
        fieldMap.unclassifiedSourceFieldPolicy === "reject",
      `${fieldMap.documentId}: unverified source mapping became active`,
    );
    assert(
      fieldMap.reviewStatus.identityApproved === false &&
        fieldMap.reviewStatus.ownershipApproved === false &&
        fieldMap.reviewStatus.mappingApproved === false &&
        fieldMap.reviewStatus.visual === "visual_review_pending" &&
        fieldMap.reviewStatus.legalOutput === "legal_output_review_pending" &&
        fieldMap.runtimeStatus === "runtime_disabled" &&
        fieldMap.generationAllowed === false,
      `${fieldMap.documentId}: field-map approval gate widened`,
    );

    if (source) {
      assert(
        fieldMap.sourceRequirementId === source.sourceRequirementId &&
          fieldMap.resolutionId === null &&
          fieldMap.exactSourceSha256 === source.expected.sha256 &&
          fieldMap.strategyCandidate === source.rendererCandidate &&
          fieldMap.trackId === source.trackId &&
          fieldMap.componentId === source.componentId,
        `${fieldMap.documentId}: field-map/source reference drift`,
      );
      const expectedStatus =
        source.authorityDisposition === "authority_role_mismatch"
          ? "blocked_authority_role_mismatch"
          : "blocked_pending_exact_source_inspection";
      assert(
        fieldMap.mappingStatus === expectedStatus,
        `${fieldMap.documentId}: mapping status drift`,
      );
    } else {
      assert(
        fieldMap.sourceRequirementId === null &&
          fieldMap.resolutionId === resolution.resolutionId &&
          fieldMap.exactSourceSha256 === null &&
          fieldMap.strategyCandidate === null &&
          fieldMap.mappingStatus === "blocked_unresolved_identity",
        `${fieldMap.documentId}: unresolved field-map posture drift`,
      );
    }
  }

  assertExactSet(
    catalog.fieldMaps
      .filter((fieldMap) => fieldMap.strategyCandidate === "coordinate_overlay")
      .map((fieldMap) => fieldMap.documentId),
    expectedOverlayIds,
    "coordinate-overlay field-map candidates",
  );
}

function verifyOwnership(catalog, normalizedByTrack) {
  assert(
    catalog.familyId === "co-statewide-jdf-official-form-family" &&
      catalog.jurisdiction === "CO",
    "ownership catalog family drift",
  );
  assert(
    catalog.coverageScope ===
      "normalized_generation_keys_only_pending_exact_source_inventory" &&
      catalog.sourceFieldCoverageState === "pending_exact_source_inventory" &&
      catalog.unclassifiedSourceFieldPolicy === "reject",
    "ownership coverage gate widened",
  );
  assertExactSet(
    catalog.writableOwners,
    ["participant", "system_derived"],
    "writable owners",
  );
  const expectedActorPolicies = {
    participant: "auto_fill_candidate",
    system_derived: "auto_fill_candidate",
    participant_manual: "leave_blank",
    court: "leave_blank",
    clerk: "leave_blank",
    judge: "leave_blank",
    prosecutor: "leave_blank",
    law_enforcement: "leave_blank",
    agency: "leave_blank",
    notary: "leave_blank",
    process_server: "leave_blank",
    prohibited_from_generation: "reject",
  };
  const actorPolicies = uniqueMap(
    catalog.actorDefaults,
    (entry) => entry.owner,
    "ownership actor defaults",
  );
  assertExactSet(
    [...actorPolicies.keys()],
    Object.keys(expectedActorPolicies),
    "ownership actors",
  );
  for (const [owner, policy] of Object.entries(expectedActorPolicies)) {
    assert(
      actorPolicies.get(owner).automationPolicy === policy,
      `${owner}: ownership default policy drift`,
    );
  }

  const requiredKeysByTrack = normalizedRequiredKeys(normalizedByTrack);
  const normalizedKeys = [...new Set([...requiredKeysByTrack.values()].flat())];
  const expectedFieldKeys = [
    ...normalizedKeys,
    "participantSignature",
    "participantSignatureDate",
  ];
  assert(catalog.fields.length === 20, "ownership field count must remain 20");
  assertExactSet(
    catalog.fields.map((field) => field.fieldKey),
    expectedFieldKeys,
    "ownership field keys",
  );
  for (const field of catalog.fields) {
    assert(
      typeof field.evidence === "string" && field.evidence.trim().length > 0,
      `${field.fieldKey}: ownership evidence missing`,
    );
    if (
      ["participantSignature", "participantSignatureDate"].includes(
        field.fieldKey,
      )
    ) {
      assert(
        field.owner === "participant_manual" &&
          field.automationPolicy === "leave_blank" &&
          field.documentUse === "manual_completion",
        `${field.fieldKey}: manual signature/date posture widened`,
      );
    } else {
      assert(
        field.owner === "participant" &&
          ["auto_fill_candidate", "screening_only"].includes(
            field.automationPolicy,
          ),
        `${field.fieldKey}: normalized input ownership drift`,
      );
    }
  }

  assertExactSet(
    catalog.routes.map((route) => route.routeId),
    expectedTracks,
    "ownership routes",
  );
  for (const route of catalog.routes) {
    assertExactSet(
      route.fieldKeys,
      [
        ...requiredKeysByTrack.get(route.routeId),
        "participantSignature",
        "participantSignatureDate",
      ],
      `${route.routeId} ownership fields`,
    );
  }
}

function verifyFixtures(catalog, ownership, normalizedByTrack) {
  assert(
    catalog.familyId === "co-statewide-jdf-official-form-family" &&
      catalog.jurisdiction === "CO",
    "fixture catalog family drift",
  );
  assert(catalog.fixtures.length === 8, "fixture count must remain 8");
  assertExactSet(
    catalog.fixtures.map((fixture) => fixture.routeId),
    expectedTracks,
    "fixture routes",
  );
  assertExactSet(
    catalog.thirdPartyOwnersAlwaysBlank,
    [
      "court",
      "clerk",
      "judge",
      "prosecutor",
      "law_enforcement",
      "agency",
      "notary",
      "process_server",
    ],
    "third-party owners always blank",
  );
  const requiredKeysByTrack = normalizedRequiredKeys(normalizedByTrack);
  const ownershipFields = new Set(
    ownership.fields.map((field) => field.fieldKey),
  );
  for (const fixture of catalog.fixtures) {
    const expectedKeys = requiredKeysByTrack.get(fixture.routeId);
    assert(
      fixture.synthetic === true &&
        fixture.packetSetId === `${fixture.routeId}-set`,
      `${fixture.fixtureId}: synthetic fixture identity drift`,
    );
    assertExactSet(
      fixture.requiredFactKeys,
      expectedKeys,
      `${fixture.fixtureId} required facts`,
    );
    assertExactSet(
      Object.keys(fixture.facts),
      expectedKeys,
      `${fixture.fixtureId} supplied facts`,
    );
    for (const [key, value] of Object.entries(fixture.facts)) {
      assert(
        ownershipFields.has(key),
        `${fixture.fixtureId}: unknown fact ${key}`,
      );
      assertNonemptyFact(value, `${fixture.fixtureId}.${key}`);
    }
    assertExactSet(
      fixture.manualFieldsExpectedBlank,
      ["participantSignature", "participantSignatureDate"],
      `${fixture.fixtureId} manual fields`,
    );
    assert(
      fixture.primaryBlockers.length > 0 &&
        fixture.expectedGateResult.currentWorkspace === "blocked_fail_closed" &&
        fixture.expectedGateResult.wrongBytes ===
          "source_fingerprint_mismatch" &&
        fixture.expectedGateResult.exactCandidateBytes ===
          "blocked_pending_identity_mapping_technical_visual_and_legal_gates" &&
        fixture.expectedGateResult.runtime === "runtime_disabled",
      `${fixture.fixtureId}: expected fail-closed result drift`,
    );
  }
}

function verifyPacketAssemblies(
  catalog,
  fixtures,
  fieldMaps,
  sourceRequirements,
  normalizedByTrack,
) {
  assert(
    catalog.schemaVersion === 1 &&
      catalog.familyId === "co-statewide-jdf-official-form-family" &&
      catalog.jurisdiction === "CO" &&
      catalog.definitionStatus === "preflight_only_not_registered" &&
      catalog.sourceSelectionPolicy ===
        "explicit_source_requirement_or_unresolved_identity_only",
    "packet preflight catalog identity or source policy drift",
  );
  assert(
    catalog.packetAssemblies.length === 8,
    "packet assembly count must remain 8",
  );
  assertExactSet(
    catalog.packetAssemblies.map((assembly) => assembly.trackId),
    expectedTracks,
    "packet assembly tracks",
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
  const sourceById = uniqueMap(
    sourceRequirements.documents,
    (document) => document.sourceRequirementId,
    "source requirements",
  );
  const resolutionById = uniqueMap(
    sourceRequirements.unresolvedIdentities,
    (entry) => entry.resolutionId,
    "unresolved identities",
  );
  const requiredKeysByTrack = normalizedRequiredKeys(normalizedByTrack);

  for (const assembly of catalog.packetAssemblies) {
    const normalized = normalizedByTrack.get(assembly.trackId);
    assert(
      assembly.packetSetId === normalized.packetSet.packetSetId &&
        assembly.packetSetVersion === normalized.packetSet.version &&
        assembly.outputStrategy === normalized.outputStrategy &&
        assembly.compositionMode === null,
      `${assembly.trackId}: packet-set envelope drift`,
    );
    assertExactSet(
      assembly.requiredFactKeys,
      requiredKeysByTrack.get(assembly.trackId),
      `${assembly.trackId} required facts`,
    );
    const fixture = fixtureById.get(assembly.fixtureId);
    assert(
      fixture?.routeId === assembly.trackId &&
        fixture.packetSetId === assembly.packetSetId,
      `${assembly.trackId}: fixture reference drift`,
    );
    assert(
      assembly.legalDesignBlocked ===
        normalized.legalDesignBlockers.length > 0 &&
        assembly.legalDesignBlockerCount ===
          normalized.legalDesignBlockers.length,
      `${assembly.trackId}: legal-design blocker count drift`,
    );
    assert(
      assembly.components.length === normalized.packetSet.components.length,
      `${assembly.trackId}: component count drift`,
    );
    for (const component of assembly.components) {
      const normalizedComponent = normalized.packetSet.components.find(
        (entry) => entry.componentId === component.componentId,
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
      assert(
        component.approval.identityApproved === false &&
          component.approval.mappingApproved === false &&
          component.approval.visual === "visual_review_pending" &&
          component.approval.legalOutput === "legal_output_review_pending" &&
          component.runtimeStatus === "runtime_disabled" &&
          component.generationAllowed === false,
        `${component.componentId}: component approval gate widened`,
      );
      if (component.kind === "process_guidance") {
        assert(
          component.officialFormId === null &&
            component.fieldMapId === null &&
            component.sourceRequirementId === null &&
            component.resolutionId === null &&
            component.componentStatus ===
              "existing_normalized_definition_outside_official_form_lane",
          `${component.componentId}: process guidance crossed official-form lane`,
        );
        continue;
      }
      const fieldMap = mapById.get(component.fieldMapId);
      assert(
        fieldMap &&
          fieldMap.documentId === component.officialFormId &&
          fieldMap.componentId === component.componentId,
        `${component.componentId}: field-map reference drift`,
      );
      if (component.sourceRequirementId !== null) {
        const source = sourceById.get(component.sourceRequirementId);
        assert(
          source &&
            source.documentId === component.officialFormId &&
            source.componentId === component.componentId &&
            component.resolutionId === null,
          `${component.componentId}: source reference drift`,
        );
      } else {
        const resolution = resolutionById.get(component.resolutionId);
        assert(
          resolution &&
            resolution.documentId === component.officialFormId &&
            resolution.componentId === component.componentId,
          `${component.componentId}: resolution reference drift`,
        );
      }
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
}

function verifyReviewManifest(
  manifest,
  fieldMaps,
  sourceRequirements,
  packetCatalog,
) {
  assert(
    manifest.schemaVersion === 1 &&
      manifest.familyId === "co-statewide-jdf-official-form-family" &&
      manifest.jurisdiction === "CO",
    "review manifest family drift",
  );
  assert(
    manifest.reviewState === "blocked_before_source_backed_sample_generation" &&
      manifest.sourceBackedSampleCount === 0 &&
      manifest.visualArtifactCount === 0 &&
      manifest.fieldMapReviewArtifactCount === 0 &&
      manifest.humanLegalReviewStatus === "not_submitted",
    "review artifact gate widened",
  );
  const external = manifest.externalIdentityReconciliationEvidence;
  assert(
    external.remoteBranch ===
      "origin/rcap-factory/rcap-co-in-repo-identity-reconciliation-needs-edition-reclass-no-2155c27d" &&
      external.commit === "6afe0d9" &&
      external.portableProjectionState === "absent_in_this_checkout" &&
      external.sourceEffect === "none_keep_fail_closed",
    "external JDF-2370/JDF-2371/JDF-2374 reconciliation evidence drift",
  );
  const priorClaim = manifest.priorApprovalClaimDisposition;
  assert(
    priorClaim.reproducibleApprovalArtifactPresent === false &&
      priorClaim.exactSourceBytesPresent === false &&
      priorClaim.disposition === "not_adopted",
    "unreproducible historical overlay approval was adopted",
  );
  assert(
    manifest.componentReviews.length === 15,
    "component review count must remain 15",
  );
  assertExactSet(
    manifest.componentReviews.map((review) => review.documentId),
    expectedDocumentIds,
    "component review identities",
  );
  const mapsByDocument = new Map(
    fieldMaps.fieldMaps.map((fieldMap) => [fieldMap.documentId, fieldMap]),
  );
  const sourceByDocument = new Map(
    sourceRequirements.documents.map((source) => [source.documentId, source]),
  );
  const resolutionByDocument = new Map(
    sourceRequirements.unresolvedIdentities.map((resolution) => [
      resolution.documentId,
      resolution,
    ]),
  );
  for (const review of manifest.componentReviews) {
    const fieldMap = mapsByDocument.get(review.documentId);
    assert(
      fieldMap &&
        review.fieldMapId === fieldMap.fieldMapId &&
        review.trackId === fieldMap.trackId &&
        review.componentId === fieldMap.componentId,
      `${review.documentId}: review/field-map reference drift`,
    );
    const source = sourceByDocument.get(review.documentId);
    const resolution = resolutionByDocument.get(review.documentId);
    assert(
      review.sourceRequirementId === (source?.sourceRequirementId ?? null) &&
        review.resolutionId === (resolution?.resolutionId ?? null),
      `${review.documentId}: review identity reference drift`,
    );
    if (resolution) {
      assert(
        review.identityState === "unresolved_identity" &&
          review.materializationState ===
            "not_applicable_unresolved_identity" &&
          review.mappingReview ===
            "prohibited_pending_identity_or_role_resolution",
        `${review.documentId}: unresolved review gate widened`,
      );
    } else if (source.authorityDisposition === "authority_role_mismatch") {
      assert(
        review.identityState === "authority_role_mismatch" &&
          review.materializationState === "source_missing" &&
          review.mappingReview ===
            "prohibited_pending_identity_or_role_resolution",
        `${review.documentId}: role-mismatch review gate widened`,
      );
    } else {
      assert(
        review.identityState === "authority_candidate_pinned_not_approved" &&
          review.materializationState === "source_missing" &&
          review.mappingReview === "pending_exact_source_inventory",
        `${review.documentId}: source-backed review started without bytes`,
      );
    }
    assert(
      review.sampleStatus === "not_generated" &&
        review.sourceFreshnessReview === "pending" &&
        review.visualReview === "pending" &&
        review.legalOutputReview === "pending" &&
        Object.values(review.approvals).every((value) => value === false),
      `${review.documentId}: component review approval gate widened`,
    );
  }
  assertExactSet(
    manifest.componentReviews
      .filter(
        (review) => review.coordinateReview === "unconfirmed_source_absent",
      )
      .map((review) => review.documentId),
    expectedOverlayIds,
    "unconfirmed coordinate reviews",
  );

  assertExactSet(
    manifest.trackReviews.map((review) => review.trackId),
    expectedTracks,
    "track reviews",
  );
  const assemblyByTrack = new Map(
    packetCatalog.packetAssemblies.map((assembly) => [
      assembly.trackId,
      assembly,
    ]),
  );
  for (const review of manifest.trackReviews) {
    const assembly = assemblyByTrack.get(review.trackId);
    assert(
      assembly &&
        review.sampleStatus === "not_generated" &&
        review.assemblyStatus === assembly.assemblyStatus &&
        review.reviewStatus === "blocked" &&
        review.packetReady === false &&
        review.generationAllowed === false &&
        review.runtimeStatus === "runtime_disabled",
      `${review.trackId}: route review gate widened`,
    );
  }
  assert(
    Object.values(manifest.familyReview).every((value) => value === false),
    "family review approval gate widened",
  );
}

function verifyBoundaryIsolation(packetCatalog) {
  const boundary = fs.readFileSync(resolveRepoPath(boundaryPath), "utf8");
  assert(
    boundary.includes("ColoradoJdfPreflightError") &&
      boundary.includes("assertColoradoJdfOfficialFormFamilyReady") &&
      boundary.includes('"family_not_ready"'),
    "CO boundary is missing its typed fail-closed guard",
  );
  assert(
    !boundary.includes("pdf-lib") &&
      !boundary.includes("node:fs") &&
      !boundary.includes("fetch(") &&
      !boundary.includes("private/Nationwide") &&
      !boundary.includes("/packets/registry"),
    "CO boundary must not select sources, render PDFs, or import a registry",
  );
  assert(
    packetCatalog.definitionStatus === "preflight_only_not_registered",
    "CO catalog registration posture drift",
  );

  const packetDirectory = resolveRepoPath("src/lib/rcap/packets");
  const registryFiles = fs
    .readdirSync(packetDirectory)
    .filter(
      (name) =>
        name.startsWith("registry") &&
        (name.endsWith(".ts") || name.endsWith(".tsx")),
    );
  for (const name of registryFiles) {
    const registry = fs.readFileSync(path.join(packetDirectory, name), "utf8");
    assert(
      !registry.includes("colorado/jdf-official-form-preflight") &&
        !registry.includes("co-statewide-jdf-official-form-family"),
      `${name}: CO preflight family must not be live/shared-registered`,
    );
  }
}

function collectReadinessBlockers({
  sourceRequirements,
  fieldMaps,
  reviewManifest,
  packetCatalog,
  normalizedByTrack,
  sourceResults,
}) {
  const blockers = [];
  if (
    sourceRequirements.contractState !== "assigned" ||
    sourceRequirements.assignmentAnchor === null ||
    sourceRequirements.portableProjection === null ||
    sourceRequirements.workerMaterializationAuthorized !== true
  ) {
    blockers.push("materialization_contract_unassigned");
  }
  const unverifiedSources = sourceResults.filter(
    (result) => result.code !== "verified_assigned_source",
  );
  if (unverifiedSources.length > 0) {
    blockers.push(
      `exact_sources_unverified:${unverifiedSources
        .map((result) => `${result.documentId}:${result.code}`)
        .join(",")}`,
    );
  }
  if (sourceRequirements.unresolvedIdentities.length > 0) {
    blockers.push(
      `unresolved_identities:${sourceRequirements.unresolvedIdentities
        .map((entry) => entry.documentId)
        .join(",")}`,
    );
  }
  const roleMismatches = sourceRequirements.documents.filter(
    (document) => document.authorityDisposition === "authority_role_mismatch",
  );
  if (roleMismatches.length > 0) {
    blockers.push(
      `authority_role_mismatches:${roleMismatches
        .map((document) => document.documentId)
        .join(",")}`,
    );
  }
  const activeMappings = fieldMaps.fieldMaps.filter(
    (fieldMap) =>
      fieldMap.sourceFieldBindings.length > 0 ||
      fieldMap.overlayPlacements.length > 0 ||
      fieldMap.activeRendererStrategy !== null ||
      fieldMap.reviewStatus.mappingApproved,
  );
  if (
    activeMappings.length !== fieldMaps.fieldMaps.length ||
    fieldMaps.fieldMaps.length === 0
  ) {
    blockers.push(
      `approved_mappings:${activeMappings.length}/${fieldMaps.fieldMaps.length}`,
    );
  }
  if (
    reviewManifest.sourceBackedSampleCount === 0 ||
    !reviewManifest.familyReview.technicalReviewPassed ||
    !reviewManifest.familyReview.visualReviewPassed ||
    !reviewManifest.familyReview.legalOutputApproved ||
    !reviewManifest.familyReview.counselApproved
  ) {
    blockers.push("source_backed_reviews_incomplete");
  }
  const legalDesignBlockers = [...normalizedByTrack.values()]
    .filter((track) => track.legalDesignBlockers.length > 0)
    .map((track) => `${track.trackId}:${track.legalDesignBlockers.length}`);
  if (legalDesignBlockers.length > 0) {
    blockers.push(`legal_design_blockers:${legalDesignBlockers.join(",")}`);
  }
  if (
    packetCatalog.packetAssemblies.some(
      (assembly) =>
        !assembly.packetReady ||
        !assembly.generationAllowed ||
        assembly.runtimeStatus !== "runtime_ready",
    )
  ) {
    blockers.push("packet_assemblies_runtime_disabled");
  }
  return blockers;
}

function assertNonAuthorizingContract(value, label) {
  assert(
    value.contractState === "pending_captain_assignment" &&
      value.assignmentAnchor === null &&
      value.portableProjection === null &&
      value.portableProjectionPresent === false &&
      value.workerMaterializationAuthorized === false &&
      value.repositoryPrivatePathTreatment ===
        "identity_evidence_only_not_materialization_authority",
    `${label}: source contract must remain explicitly non-authorizing`,
  );
}

function normalizedRequiredKeys(normalizedByTrack) {
  return new Map(
    [...normalizedByTrack.entries()].map(([trackId, track]) => [
      trackId,
      track.generationRequirements
        .filter((requirement) => requirement.requirement === "required")
        .map((requirement) => requirement.key),
    ]),
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
      `${location}: value is not in the declared enum`,
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
        `${location}: fewer than ${schema.minItems} items`,
      );
    }
    if (schema.maxItems !== undefined) {
      assert(
        value.length <= schema.maxItems,
        `${location}: more than ${schema.maxItems} items`,
      );
    }
    if (schema.uniqueItems) {
      const serialized = value.map((entry) => JSON.stringify(entry));
      assert(
        new Set(serialized).size === serialized.length,
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
      assert(
        value.length >= schema.minLength,
        `${location}: string shorter than ${schema.minLength}`,
      );
    }
    if (schema.pattern !== undefined) {
      assert(
        new RegExp(schema.pattern).test(value),
        `${location}: string does not match ${schema.pattern}`,
      );
    }
    if (schema.format === "uri") {
      let parsed;
      try {
        parsed = new URL(value);
      } catch {
        throw new Error(`${location}: invalid URI`);
      }
      assert(Boolean(parsed.protocol), `${location}: URI lacks a protocol`);
    }
    return;
  }

  if (typeof value === "number" && schema.minimum !== undefined) {
    assert(value >= schema.minimum, `${location}: value below minimum`);
  }
}

function resolveSchemaRef(rootSchema, ref) {
  assert(ref.startsWith("#/"), `unsupported non-local schema ref: ${ref}`);
  return ref
    .slice(2)
    .split("/")
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce((value, segment) => {
      assert(
        value && Object.hasOwn(value, segment),
        `unresolved schema ref: ${ref}`,
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

function assertNonemptyFact(value, label) {
  if (typeof value === "string") {
    assert(value.trim().length > 0, `${label}: blank string`);
    return;
  }
  if (Array.isArray(value)) {
    assert(value.length > 0, `${label}: empty array`);
    return;
  }
  assert(
    typeof value === "boolean" ||
      (typeof value === "number" && Number.isFinite(value)),
    `${label}: unsupported fixture value`,
  );
}

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function readJson(relativePath) {
  const absolutePath = resolveRepoPath(relativePath);
  try {
    return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch (error) {
    throw new Error(
      `${relativePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function resolveRepoPath(relativePath) {
  return resolveWithin(rootDir, relativePath);
}

function resolveWithin(baseDir, relativePath) {
  assert(
    typeof relativePath === "string" && !path.isAbsolute(relativePath),
    `path must be repository-relative: ${relativePath}`,
  );
  const absolutePath = path.resolve(baseDir, relativePath);
  const relative = path.relative(baseDir, absolutePath);
  assert(
    relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative),
    `path escapes its root: ${relativePath}`,
  );
  return absolutePath;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function fail(message) {
  process.stderr.write(
    `Colorado JDF official-form preflight verification failed: ${message}\n`,
  );
  process.exitCode = 1;
}
