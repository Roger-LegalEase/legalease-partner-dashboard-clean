import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const PRODUCTION_QUEUE_PATH =
  "data/record-clearing/production-factory/official-pdf-production-queue.json";
const LEGAL_DESIGN_PATH =
  "data/record-clearing/legal-design-track-registry.json";
const AUTHORITY_PATH = "data/record-clearing/master-library/authority.json";
const SOURCE_CONTRACT_PATH =
  "docs/record-clearing/RCAP_SOURCE_MATERIALIZATION_CONTRACT.md";
const MATERIALIZED_SOURCE_VERIFIER =
  "scripts/verify-rcap-materialized-source.mjs";
const SOURCE_DEPENDENCY =
  "rcap-nationwide-source-materialization-contract";
const FIELD_OWNERSHIP_SCHEMA =
  "data/record-clearing/production-factory/official-pdf-families/schemas/field-ownership.schema.json";
const FIXTURE_SCHEMA =
  "data/record-clearing/production-factory/official-pdf-families/schemas/fixture-scaffold.schema.json";

export const QUEUED_OFFICIAL_PDF_SCAFFOLD_SPEC_SCHEMA =
  "rcap-queued-official-pdf-family-scaffold-spec/v1";

export function buildQueuedOfficialPdfFamilyScaffold({ root, specPath }) {
  const spec = readJson(root, specPath);
  validateSpec(spec);

  const productionQueue = readJson(root, PRODUCTION_QUEUE_PATH);
  const legalDesign = readJson(root, LEGAL_DESIGN_PATH);
  const authority = readJson(root, AUTHORITY_PATH);
  const familyMatches = productionQueue.families.filter(
    (family) => family.jurisdiction === spec.jurisdiction
  );
  assert.equal(
    familyMatches.length,
    1,
    `${spec.jurisdiction}: production queue family`
  );
  const queueFamily = familyMatches[0];
  assert.equal(queueFamily.familyId, spec.familyId);
  assert.equal(queueFamily.materializationDependency, SOURCE_DEPENDENCY);
  assert.equal(queueFamily.workerReady, false);
  assert.equal(queueFamily.packetReady, false);
  assert.equal(queueFamily.enabled, false);

  const tracks = queueFamily.trackIds.map((trackId) => {
    const matches = legalDesign.tracks.filter(
      (track) =>
        track.jurisdiction === spec.jurisdiction &&
        track.trackId === trackId
    );
    assert.equal(matches.length, 1, `${spec.jurisdiction}:${trackId}`);
    const track = matches[0];
    assert.equal(track.outputStrategy, "official_pdf_fill", trackId);
    return track;
  });
  assert.equal(tracks.length, queueFamily.counts.trackCount);
  assertNoDuplicates(
    tracks.map((track) => track.trackId),
    "track"
  );

  const components = tracks.flatMap((track) =>
    track.packetSet.components
      .filter((component) => component.outputStrategy === "official_pdf_fill")
      .map((component) => ({
        trackId: track.trackId,
        ...component
      }))
  );
  assert.equal(components.length, queueFamily.counts.componentCount);
  assertNoDuplicates(
    components.map((component) => component.componentId),
    "component"
  );
  for (const component of components) {
    assert.equal(typeof component.officialFormId, "string");
    assert.ok(component.officialFormId.length > 0, component.componentId);
  }

  const documents = queueFamily.documents;
  assert.equal(documents.length, queueFamily.counts.documentCount);
  assertNoDuplicates(
    documents.map((document) => document.officialFormId),
    "document identity"
  );
  assert.deepEqual(
    sorted(documents.map((document) => document.officialFormId)),
    sorted(unique(components.map((component) => component.officialFormId))),
    `${spec.jurisdiction}: queue documents must cover every official-PDF component`
  );

  for (const document of documents) {
    const expectedBindings = components
      .filter(
        (component) => component.officialFormId === document.officialFormId
      )
      .map((component) => ({
        trackId: component.trackId,
        componentId: component.componentId,
        role: component.role
      }));
    assert.deepEqual(
      sorted(
        document.usageBindings.map(
          (binding) =>
            `${binding.trackId}:${binding.componentId}:${binding.role}`
        )
      ),
      sorted(
        expectedBindings.map(
          (binding) =>
            `${binding.trackId}:${binding.componentId}:${binding.role}`
        )
      ),
      `${spec.jurisdiction}:${document.officialFormId}: usage bindings`
    );
  }

  const exactDocuments = documents.filter(
    (document) => document.exactSourceRequirement !== null
  );
  const unresolvedDocuments = documents.filter(
    (document) => document.exactSourceRequirement === null
  );
  assert.equal(
    exactDocuments.length,
    queueFamily.counts.exactSourceRequirementCount
  );
  assert.equal(
    unresolvedDocuments.length,
    queueFamily.counts.unresolvedSourceIdentityCount
  );

  const sourceRequirements = buildSourceRequirements({
    authority,
    documents,
    queueFamily,
    spec
  });
  const rendererScaffold = buildRendererScaffold({
    documents,
    queueFamily,
    spec
  });
  const fieldMapScaffold = buildFieldMapScaffold({
    documents,
    tracks,
    spec
  });
  const fieldOwnership = buildFieldOwnership({ documents, spec });
  const fixtures = buildFixtures({ tracks, spec });
  const packetAssembly = buildPacketAssembly({
    components,
    documents,
    tracks,
    spec
  });
  const dependencies = buildDependencies({
    exactDocuments,
    unresolvedDocuments,
    spec
  });
  const reviewManifest = buildReviewManifest({
    exactDocuments,
    unresolvedDocuments,
    spec
  });

  const artifactPaths = {
    scaffoldSpec: specPath,
    dependencies: `${spec.outputDirectory}/dependencies.json`,
    sourceRequirements: `${spec.outputDirectory}/source-requirements.json`,
    rendererScaffold: `${spec.outputDirectory}/renderer-scaffold.json`,
    fieldMapScaffold: `${spec.outputDirectory}/field-map-scaffold.json`,
    fieldOwnershipSchema: FIELD_OWNERSHIP_SCHEMA,
    fieldOwnership: `${spec.outputDirectory}/field-ownership.json`,
    fixtureSchema: FIXTURE_SCHEMA,
    fixtures: `${spec.outputDirectory}/fixtures.json`,
    packetAssembly: `${spec.outputDirectory}/packet-assembly.json`,
    reviewManifest: `${spec.outputDirectory}/review-manifest.json`
  };

  const familyManifest = {
    schemaVersion: "rcap-official-pdf-family/v1",
    familyId: spec.familyId,
    jurisdiction: spec.jurisdiction,
    jurisdictionName: spec.jurisdictionName,
    authorityFamily: spec.authorityFamily,
    implementationJobId: spec.implementationJobId,
    productionQueuePriority: queueFamily.priority,
    outputStrategies: ["official_pdf_fill"],
    scope: {
      trackIds: queueFamily.trackIds,
      trackCount: queueFamily.counts.trackCount,
      officialPdfComponentCount: queueFamily.counts.componentCount,
      documentIds: documents.map((document) => document.officialFormId),
      documentCount: queueFamily.counts.documentCount,
      exactIdentityCount: exactDocuments.length,
      unresolvedIdentityCount: unresolvedDocuments.length
    },
    sourceMaterialization: {
      dependencyJobId: SOURCE_DEPENDENCY,
      contractPath: SOURCE_CONTRACT_PATH,
      requirementManifest: artifactPaths.sourceRequirements,
      contractKind: "dependency_scaffold_not_worker_assignment",
      assignmentAnchor: null,
      portableProjection: null,
      portableProjectionAvailable: false,
      captainAssignmentRequired: true,
      portableProjectionRequired: true,
      workerReady: false,
      workerMaterializationAuthorized: false,
      workerReadAuthorized: false,
      workerMayAcquireOrDownloadSources: false,
      repositorySourcePathTreatment:
        "identity_evidence_only_never_worker_source",
      registryPresenceConfersReadiness: false
    },
    artifacts: artifactPaths,
    implementationModule: spec.modulePath,
    dedicatedVerifier: spec.dedicatedVerifier,
    status: {
      sourceRequirements: "scaffolded_pending_authority_and_assignment",
      localSourceVerification: "pending_captain_projection",
      pdfStructureInspection: "pending_authorized_source_bytes",
      fieldMapping: "scaffolded_zero_active_mappings",
      packetRendering: "blocked",
      sourceBackedSampleCount: 0,
      visualReview: "pending_source_backed_samples",
      counselReview: "not_submitted",
      legalDesignChanged: false,
      packetReady: false,
      generationAllowed: false,
      enabled: false
    },
    blockers: [
      "Captain-owned assignment anchor and portable source projection are absent.",
      "Exact retained identities require read-only materialization and fresh byte verification.",
      "Authority-unmanifested identities require successor-edition manifestation before assignment.",
      "PDF structure, field names, overlay coordinates, ownership, fixtures, and samples remain unconfirmed.",
      ...spec.blockers
    ],
    invariants: spec.invariants
  };

  const jsonArtifacts = {
    "family-manifest.json": familyManifest,
    "dependencies.json": dependencies,
    "source-requirements.json": sourceRequirements,
    "renderer-scaffold.json": rendererScaffold,
    "field-map-scaffold.json": fieldMapScaffold,
    "field-ownership.json": fieldOwnership,
    "fixtures.json": fixtures,
    "packet-assembly.json": packetAssembly,
    "review-manifest.json": reviewManifest
  };
  const textArtifacts = {
    [spec.modulePath]: buildBoundaryModule({
      documents,
      queueFamily,
      spec
    }),
    [spec.dedicatedVerifier]: buildDedicatedVerifier({ spec, specPath })
  };

  return {
    spec,
    queueFamily,
    tracks,
    components,
    documents,
    exactDocuments,
    unresolvedDocuments,
    jsonArtifacts,
    textArtifacts
  };
}

export function writeQueuedOfficialPdfFamilyScaffold({ root, specPath }) {
  const built = buildQueuedOfficialPdfFamilyScaffold({ root, specPath });
  fs.mkdirSync(path.join(root, built.spec.outputDirectory), {
    recursive: true
  });
  for (const [fileName, value] of Object.entries(built.jsonArtifacts)) {
    fs.writeFileSync(
      path.join(root, built.spec.outputDirectory, fileName),
      `${JSON.stringify(value, null, 2)}\n`,
      "utf8"
    );
  }
  for (const [relativePath, value] of Object.entries(built.textArtifacts)) {
    fs.mkdirSync(path.dirname(path.join(root, relativePath)), {
      recursive: true
    });
    fs.writeFileSync(path.join(root, relativePath), value, "utf8");
  }
  return built;
}

export function verifyQueuedOfficialPdfFamilyScaffold({
  root,
  specPath,
  requireSource = null,
  requireRenderable = null,
  requirePacket = null
}) {
  const built = buildQueuedOfficialPdfFamilyScaffold({ root, specPath });
  const failures = [];

  for (const [fileName, expected] of Object.entries(built.jsonArtifacts)) {
    const relativePath = `${built.spec.outputDirectory}/${fileName}`;
    if (!fs.existsSync(path.join(root, relativePath))) {
      failures.push(`${relativePath}: missing deterministic artifact.`);
      continue;
    }
    const actual = readJson(root, relativePath);
    if (!deepEqual(actual, expected)) {
      failures.push(
        `${relativePath}: differs from the deterministic queue-backed scaffold.`
      );
    }
  }
  for (const [relativePath, expected] of Object.entries(
    built.textArtifacts
  )) {
    if (!fs.existsSync(path.join(root, relativePath))) {
      failures.push(`${relativePath}: missing deterministic artifact.`);
      continue;
    }
    const actual = fs.readFileSync(path.join(root, relativePath), "utf8");
    if (actual !== expected) {
      failures.push(
        `${relativePath}: differs from the deterministic queue-backed scaffold.`
      );
    }
  }

  const sourceRequirements =
    built.jsonArtifacts["source-requirements.json"];
  assert.equal(sourceRequirements.assignmentAnchor, null);
  assert.equal(sourceRequirements.portableProjection, null);
  assert.equal(sourceRequirements.workerMaterializationAuthorized, false);
  assert.equal(sourceRequirements.workerReadAuthorized, false);
  for (const requirement of sourceRequirements.requirements) {
    assert.equal(requirement.workerMaterializationAuthorized, false);
    assert.equal(requirement.workerReadAuthorized, false);
    assert.notEqual(
      requirement.schemaVersion,
      "rcap-source-materialization-requirement/v1"
    );
  }

  const activeRendererCount =
    built.jsonArtifacts["renderer-scaffold.json"].documents.filter(
      (document) => document.activeRenderer
    ).length;
  const activeMappingCount =
    built.jsonArtifacts["field-map-scaffold.json"].forms.reduce(
      (count, form) =>
        count + form.mappings.length + form.overlayPlacements.length,
      0
    );
  const sampleCount =
    built.jsonArtifacts["review-manifest.json"].samplePackets.length;
  assert.equal(activeRendererCount, 0);
  assert.equal(activeMappingCount, 0);
  assert.equal(sampleCount, 0);

  if (requireSource !== null) {
    const document = built.documents.find(
      (candidate) => candidate.officialFormId === requireSource
    );
    if (!document) {
      failures.push(`Unknown --require-source document: ${requireSource}.`);
    } else if (document.exactSourceRequirement === null) {
      failures.push(
        `${requireSource}: authority asset manifestation, captain assignment, and portable projection are required.`
      );
    } else {
      failures.push(
        `${requireSource}: captain assignment and portable projection are required; repositorySourcePath is identity evidence only.`
      );
    }
  }

  if (requireRenderable !== null) {
    if (!built.queueFamily.trackIds.includes(requireRenderable)) {
      failures.push(
        `Unknown --require-renderable track: ${requireRenderable}.`
      );
    } else {
      failures.push(
        `${requireRenderable}: renderability is blocked pending authorized sources, confirmed mappings, fixtures, samples, and review.`
      );
    }
  }

  if (requirePacket !== null) {
    if (!built.queueFamily.trackIds.includes(requirePacket)) {
      failures.push(`Unknown --require-packet track: ${requirePacket}.`);
    } else {
      failures.push(
        `${requirePacket}: participant packet assembly is defined but runtime generation remains disabled.`
      );
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    summary: {
      familyId: built.spec.familyId,
      jurisdiction: built.spec.jurisdiction,
      tracks: built.queueFamily.counts.trackCount,
      components: built.queueFamily.counts.componentCount,
      documents: built.queueFamily.counts.documentCount,
      exactIdentities: built.exactDocuments.length,
      unresolvedIdentities: built.unresolvedDocuments.length,
      activeRenderers: activeRendererCount,
      activeMappings: activeMappingCount,
      sourceBackedSamples: sampleCount,
      workerReady: false,
      enabled: false
    },
    sections: [
      "Boundary: the queue family, legal-design tracks, and official-PDF component bindings reconcile.",
      "Sources: exact retained identities and unresolved identities remain separately fail-closed.",
      "Renderers: AcroForm, overlay, and unknown-structure lanes have zero active implementations.",
      "Mappings: field maps and ownership maps remain empty until authorized byte inspection.",
      "Fixtures: synthetic route fixtures and terminal boundary cases are declared.",
      "Assembly: deterministic one-PDF packet sequences deduplicate physical documents.",
      "Review: no source-backed sample, visual approval, counsel approval, or runtime enablement exists.",
      "Isolation: the typed module has no source acquisition path and always throws a terminal stop."
    ]
  };
}

function buildSourceRequirements({ authority, documents, queueFamily, spec }) {
  return {
    schemaVersion: "rcap-source-materialization-scaffold/v1",
    familyId: spec.familyId,
    jurisdiction: spec.jurisdiction,
    authorityEdition: `master-library/${authority.edition}`,
    authorityArchiveSha256: authority.retention.archiveSha256,
    dependencyJobId: SOURCE_DEPENDENCY,
    contractKind: "dependency_scaffold_not_worker_assignment",
    normativeRequirementSchema:
      "rcap-source-materialization-requirement/v1",
    assignmentAnchor: null,
    portableProjection: null,
    portableProjectionAvailable: false,
    captainAssignmentRequired: true,
    portableProjectionRequired: true,
    workerMaterializationAuthorized: false,
    workerReadAuthorized: false,
    workerMayAcquireOrDownloadSources: false,
    repositorySourcePathTreatment:
      "identity_evidence_only_never_worker_source",
    aggregateState:
      "authority_manifestation_and_captain_projection_required",
    workerReady: false,
    counts: {
      documents: queueFamily.counts.documentCount,
      exactIdentityPins: queueFamily.counts.exactSourceRequirementCount,
      unresolvedIdentities:
        queueFamily.counts.unresolvedSourceIdentityCount,
      captainProjectedSources: 0
    },
    requirements: documents.map((document) => {
      const exact = document.exactSourceRequirement;
      const repositoryCandidate =
        exact === null
          ? null
          : document.repositoryCandidates.find(
              (candidate) =>
                candidate.sha256 === exact.expectedSha256 &&
                candidate.sizeBytes === exact.expectedBytes
            ) ?? null;
      if (exact !== null) {
        assert.ok(repositoryCandidate, document.officialFormId);
        assert.match(exact.expectedSha256, /^[a-f0-9]{64}$/u);
        assert.ok(Number.isSafeInteger(exact.expectedBytes));
        assert.ok(exact.expectedBytes > 0);
      }
      return {
        schemaVersion:
          "rcap-source-materialization-requirement-scaffold/v1",
        contractState: "pending_captain_owned_assignment",
        componentDocumentId: document.officialFormId,
        authorityState:
          exact === null
            ? "authority_unmanifested_source"
            : document.relationshipResults.includes(
                  "authority_mapped_packet_candidate"
                )
              ? "authority_mapped_packet_candidate"
              : "authority_mapped_source_gated",
        identityBindingStatus:
          exact?.identityBindingStatus ??
          "authority_identity_unresolved",
        authorityDocumentId: exact?.documentId ?? null,
        authorityDocumentRole: exact?.documentRole ?? null,
        workflowKey:
          document.authorityAssets[0]?.workflowKey ?? null,
        officialTitle:
          document.authorityAssets[0]?.officialTitle ?? null,
        revision: document.authorityAssets[0]?.revision ?? null,
        assetClass: document.authorityAssets[0]?.assetClass ?? null,
        canonicalAuthorityPath:
          exact?.canonicalAuthorityPath ?? null,
        repositorySourcePath:
          exact?.repositorySourcePath ?? null,
        repositorySourcePathTreatment:
          exact === null
            ? "no_worker_locator"
            : "identity_evidence_only_never_worker_source",
        expectedSha256: exact?.expectedSha256 ?? null,
        expectedBytes: exact?.expectedBytes ?? null,
        expectedMediaType: exact?.expectedMediaType ?? null,
        expectedStructureEvidence:
          repositoryCandidate === null
            ? null
            : {
                technicalClass:
                  repositoryCandidate.technicalClass ?? null,
                pageCount: repositoryCandidate.pageCount ?? null,
                fieldCount: repositoryCandidate.fieldCount ?? null,
                encrypted: repositoryCandidate.encrypted ?? null,
                xfa: repositoryCandidate.xfa ?? null,
                measurementBasis:
                  "carried_forward_registry_measurement",
                mustVerifyFromMaterializedBytes: true
              },
        packetCandidate:
          document.authorityAssets[0]?.packetCandidate === true,
        generationAllowed: false,
        workerReady: false,
        workerMaterializationAuthorized: false,
        workerReadAuthorized: false,
        captainAssignmentEligibility:
          exact === null
            ? "ineligible_until_successor_authority_edition_manifests_exact_asset"
            : "requires_assignment_anchor_and_portable_projection",
        usageBindings: document.usageBindings.map((binding) => ({
          trackId: binding.trackId,
          componentId: binding.componentId,
          role: binding.role,
          requirement: binding.requirement ?? null,
          conditionDescription: binding.conditionDescription ?? null
        }))
      };
    }),
    activationRule:
      "Only a captain-owned assignment carrying a portable projection may promote an adopted exact identity. Unmanifested identities must first enter a successor authority edition. This manifest grants no worker source access."
  };
}

function buildRendererScaffold({ documents, queueFamily, spec }) {
  return {
    schemaVersion: "rcap-official-pdf-renderer-scaffold/v1",
    familyId: spec.familyId,
    jurisdiction: spec.jurisdiction,
    rendererSelectionPolicy: {
      freshAuthorizedByteInspectionRequired: true,
      carriedTechnicalClassIsEvidenceOnly: true,
      xfaRequiresExplicitPolicy: true,
      encryptedPdfRequiresPermissionReview: true,
      flatOrScannedPdfRequiresConfirmedCoordinates: true,
      acroformRequiresExactFieldInventory: true,
      fallbackRendererAllowed: false,
      networkAcquisitionAllowed: false
    },
    laneCountsFromQueue: queueFamily.rendererLaneCounts,
    activeRendererCount: 0,
    documents: documents.map((document) => ({
      componentDocumentId: document.officialFormId,
      sourceIdentityState: document.sourceIdentityState,
      rendererLaneCandidate: document.rendererLaneCandidate,
      rendererSelectionState:
        "pending_authorized_source_inspection",
      activeRenderer: false,
      acroformFieldMapReady: false,
      overlayCoordinatesReady: false,
      implementationBlocker:
        document.exactSourceRequirement === null
          ? "authority_asset_unmanifested"
          : "captain_projection_and_fresh_structure_inspection_required"
    }))
  };
}

function buildFieldMapScaffold({ documents, tracks, spec }) {
  return {
    schemaVersion: "rcap-official-pdf-field-map/v1",
    familyId: spec.familyId,
    jurisdiction: spec.jurisdiction,
    mappingPolicy: {
      sourceOfFieldNames: "freshly_verified_authorized_local_bytes",
      sourceOfOverlayCoordinates:
        "visually_confirmed_authorized_source_pages",
      carriedForwardStructureIsEvidenceOnly: true,
      unknownSemanticMatchesRemainUnmapped: true,
      thirdPartyFieldsRemainBlank: true,
      signatureImagesGenerated: false,
      sourceFallbackAllowed: false
    },
    activeMappingCount: 0,
    activeOverlayPlacementCount: 0,
    forms: documents.map((document) => {
      const trackIds = unique(
        document.usageBindings.map((binding) => binding.trackId)
      );
      return {
        componentDocumentId: document.officialFormId,
        sourceIdentityState: document.sourceIdentityState,
        rendererLaneCandidate: document.rendererLaneCandidate,
        mappingState:
          document.exactSourceRequirement === null
            ? "blocked_authority_identity_unresolved"
            : "pending_authorized_structure_and_field_confirmation",
        mappingReady: false,
        trackIds,
        componentIds: document.usageBindings.map(
          (binding) => binding.componentId
        ),
        unresolvedRequiredFactKeys: unique(
          tracks
            .filter((track) => trackIds.includes(track.trackId))
            .flatMap((track) =>
              track.generationRequirements
                .filter(
                  (requirement) =>
                    requirement.requirement === "required"
                )
                .map((requirement) => requirement.key)
            )
        ).sort(),
        mappings: [],
        overlayPlacements: []
      };
    })
  };
}

function buildFieldOwnership({ documents, spec }) {
  return {
    schemaVersion: "rcap-official-pdf-field-ownership/v1",
    familyId: spec.familyId,
    jurisdiction: spec.jurisdiction,
    schemaPath: FIELD_OWNERSHIP_SCHEMA,
    mappingAllowedFor: ["participant", "system_derived"],
    mustRemainBlank: [
      "participant_manual",
      "court",
      "judge",
      "clerk",
      "prosecutor",
      "agency",
      "attorney",
      "notary",
      "process_server",
      "prohibited_from_generation"
    ],
    forms: documents.map((document) => ({
      documentId: document.officialFormId,
      status: "pending_materialization",
      expectedFieldCount:
        document.repositoryCandidates[0]?.fieldCount ?? null,
      coverageComplete: false,
      fields: []
    }))
  };
}

function buildFixtures({ tracks, spec }) {
  return {
    schemaVersion: "rcap-official-pdf-fixture-scaffold/v1",
    familyId: spec.familyId,
    jurisdiction: spec.jurisdiction,
    schemaPath: FIXTURE_SCHEMA,
    syntheticDataOnly: true,
    fixtureState: "pending_field_map_and_fact_type_binding",
    tracks: tracks.map((track) => ({
      trackId: track.trackId,
      fixtureId: `${track.trackId}-synthetic-layout`,
      caseReference: `SYN-${spec.jurisdiction}-${track.trackId}`,
      requiredFactKeys: track.generationRequirements
        .filter(
          (requirement) => requirement.requirement === "required"
        )
        .map((requirement) => requirement.key),
      conditionalFactKeys: track.generationRequirements
        .filter(
          (requirement) => requirement.requirement === "conditional"
        )
        .map((requirement) => requirement.key),
      manualCompletionItems: track.manualCompletionItems.map((item) => ({
        item: item.item,
        whereInPacket: item.whereInPacket,
        expectedTreatment: "left_usable_and_blank"
      }))
    })),
    requiredBoundaryFixtures: [
      "missing_required_input",
      "authority_identity_unresolved",
      "captain_projection_missing",
      "source_hash_mismatch",
      "source_size_mismatch",
      "source_mime_mismatch",
      "third_party_field_ownership",
      "mapping_unconfirmed",
      "deterministic_repeat"
    ]
  };
}

function buildPacketAssembly({ components, documents, tracks, spec }) {
  return {
    schemaVersion: "rcap-official-pdf-packet-assembly/v1",
    familyId: spec.familyId,
    jurisdiction: spec.jurisdiction,
    assemblyPolicy: {
      participantDeliverable: "one_pdf",
      zipAllowed: false,
      deterministic: true,
      deterministicTimestamp: "2000-01-01T00:00:00.000Z",
      producer: "LegalEase",
      preserveOfficialFixedLanguage: true,
      sourceLookupMode: "captain_projection_exact_identity_only",
      downloadOrSourceFallbackAllowed: false,
      duplicatePhysicalDocumentAllowed: false,
      signatureImagesGenerated: false
    },
    packets: tracks.map((track) => {
      const trackComponents = components
        .filter((component) => component.trackId === track.trackId)
        .sort((left, right) => left.order - right.order);
      const groupedDocuments = [];
      for (const component of trackComponents) {
        const existing = groupedDocuments.find(
          (document) =>
            document.componentDocumentId === component.officialFormId
        );
        if (existing) {
          existing.componentIds.push(component.componentId);
          existing.roles.push(component.role);
          existing.requirements.push(component.requirement);
          if (component.conditionDescription !== null) {
            existing.conditionDescriptions.push(
              component.conditionDescription
            );
          }
          continue;
        }
        const queueDocument = documents.find(
          (document) =>
            document.officialFormId === component.officialFormId
        );
        assert.ok(queueDocument, component.officialFormId);
        groupedDocuments.push({
          componentDocumentId: component.officialFormId,
          order: component.order,
          rendererLaneCandidate:
            queueDocument.rendererLaneCandidate,
          renderState: "blocked",
          renderOnce: true,
          componentIds: [component.componentId],
          roles: [component.role],
          requirements: [component.requirement],
          conditionDescriptions:
            component.conditionDescription === null
              ? []
              : [component.conditionDescription]
        });
      }
      return {
        trackId: track.trackId,
        outputFileName: `${track.trackId}-participant-packet.pdf`,
        assembledParticipantPdf: true,
        deterministic: true,
        packetReady: false,
        documents: groupedDocuments
      };
    })
  };
}

function buildDependencies({ exactDocuments, unresolvedDocuments, spec }) {
  return {
    schemaVersion: "rcap-official-pdf-family-dependencies/v1",
    familyId: spec.familyId,
    jurisdiction: spec.jurisdiction,
    dependencies: [
      {
        dependencyId: "successor_authority_manifestation",
        requiredFor: unresolvedDocuments.map(
          (document) => document.officialFormId
        ),
        satisfied: unresolvedDocuments.length === 0,
        owner: "authority_captain"
      },
      {
        dependencyId: "captain_owned_assignment_anchor",
        requiredFor: exactDocuments.map(
          (document) => document.officialFormId
        ),
        satisfied: false,
        owner: "source_materialization_captain"
      },
      {
        dependencyId: "portable_read_only_source_projection",
        requiredFor: exactDocuments.map(
          (document) => document.officialFormId
        ),
        satisfied: false,
        owner: "source_materialization_captain"
      },
      {
        dependencyId: "size_mime_sha256_verification",
        requiredFor: exactDocuments.map(
          (document) => document.officialFormId
        ),
        satisfied: false,
        owner: "official_pdf_worker"
      },
      {
        dependencyId: "acroform_xfa_flat_structure_inspection",
        requiredFor: exactDocuments.map(
          (document) => document.officialFormId
        ),
        satisfied: false,
        owner: "official_pdf_worker"
      },
      {
        dependencyId: "field_and_overlay_mapping_confirmation",
        requiredFor: exactDocuments.map(
          (document) => document.officialFormId
        ),
        satisfied: false,
        owner: "official_pdf_worker"
      },
      {
        dependencyId: "source_backed_samples_and_visual_review",
        requiredFor: exactDocuments.map(
          (document) => document.officialFormId
        ),
        satisfied: false,
        owner: "official_pdf_worker"
      }
    ],
    sourceContract: {
      contractPath: SOURCE_CONTRACT_PATH,
      verifierPath: MATERIALIZED_SOURCE_VERIFIER,
      assignmentAnchor: null,
      portableProjection: null
    }
  };
}

function buildReviewManifest({
  exactDocuments,
  unresolvedDocuments,
  spec
}) {
  return {
    schemaVersion: "rcap-official-pdf-family-review/v1",
    familyId: spec.familyId,
    jurisdiction: spec.jurisdiction,
    buildStatus: "overlay_field_maps_drafted",
    sourceReview: "pending_captain_projection",
    technicalReview: "pending_authorized_source_inspection",
    visualReview: "pending_source_backed_samples",
    humanLegalReviewStatus: "not_submitted",
    sourceFreshnessReview: "pending",
    legalDesignChanged: false,
    exactIdentityDocumentIds: exactDocuments.map(
      (document) => document.officialFormId
    ),
    unresolvedIdentityDocumentIds: unresolvedDocuments.map(
      (document) => document.officialFormId
    ),
    samplePackets: [],
    visualInspectionArtifacts: [],
    promotion: {
      sourceRequirementsComplete: false,
      mappingsComplete: false,
      ownershipComplete: false,
      deterministicFixturesPassing: false,
      sourceBackedSamplesRendered: false,
      visualReviewComplete: false,
      counselApproved: false,
      packetReady: false,
      generationAllowed: false,
      enabled: false
    }
  };
}

function buildBoundaryModule({ documents, queueFamily, spec }) {
  const constantPrefix = spec.jurisdiction.replaceAll("-", "_");
  const className = `${spec.jurisdictionName.replaceAll(/[^A-Za-z0-9]/gu, "")}OfficialPdfFamilyBlockedError`;
  const renderFunction = `render${spec.jurisdictionName.replaceAll(/[^A-Za-z0-9]/gu, "")}OfficialPdfFamilyPacket`;
  const sourceBoundaries = documents.map((document) => ({
    componentDocumentId: document.officialFormId,
    authorityState:
      document.exactSourceRequirement === null
        ? "authority_unmanifested_source"
        : "exact_identity_pending_captain_projection",
    expectedSha256:
      document.exactSourceRequirement?.expectedSha256 ?? null,
    expectedBytes:
      document.exactSourceRequirement?.expectedBytes ?? null,
    rendererLaneCandidate: document.rendererLaneCandidate,
    workerReady: false
  }));
  return `export const ${constantPrefix}_OFFICIAL_PDF_FAMILY_ID = ${JSON.stringify(spec.familyId)} as const;

export const ${constantPrefix}_OFFICIAL_PDF_TRACK_IDS = ${JSON.stringify(queueFamily.trackIds, null, 2)} as const;

export const ${constantPrefix}_OFFICIAL_PDF_DOCUMENT_IDS = ${JSON.stringify(documents.map((document) => document.officialFormId), null, 2)} as const;

export const ${constantPrefix}_OFFICIAL_PDF_SOURCE_BOUNDARIES = ${JSON.stringify(sourceBoundaries, null, 2)} as const;

export const ${constantPrefix}_OFFICIAL_PDF_ACTIVE_RENDERERS = [] as const;
export const ${constantPrefix}_OFFICIAL_PDF_ACTIVE_FIELD_MAPPINGS = [] as const;
export const ${constantPrefix}_OFFICIAL_PDF_ACTIVE_OVERLAY_PLACEMENTS = [] as const;
export const ${constantPrefix}_OFFICIAL_PDF_SOURCE_BACKED_SAMPLES = [] as const;

export class ${className} extends Error {
  readonly code = "official_pdf_family_blocked";

  constructor(
    readonly familyId: typeof ${constantPrefix}_OFFICIAL_PDF_FAMILY_ID,
    readonly trackId: (typeof ${constantPrefix}_OFFICIAL_PDF_TRACK_IDS)[number]
  ) {
    super(
      \`\${familyId}:\${trackId} is blocked pending authority manifestation, captain-projected sources, confirmed mappings, deterministic samples, and review.\`
    );
    this.name = "${className}";
  }
}

export function ${renderFunction}(
  trackId: (typeof ${constantPrefix}_OFFICIAL_PDF_TRACK_IDS)[number]
): never {
  throw new ${className}(
    ${constantPrefix}_OFFICIAL_PDF_FAMILY_ID,
    trackId
  );
}
`;
}

function buildDedicatedVerifier({ specPath }) {
  return `#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import { runQueuedOfficialPdfFamilyVerifierCli } from "./lib/rcap-queued-official-pdf-family-verifier.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

await runQueuedOfficialPdfFamilyVerifierCli({
  root: ROOT,
  specPath: ${JSON.stringify(specPath)},
  argv: process.argv.slice(2)
});
`;
}

function validateSpec(spec) {
  assert.equal(
    spec.schemaVersion,
    QUEUED_OFFICIAL_PDF_SCAFFOLD_SPEC_SCHEMA
  );
  assert.match(spec.jurisdiction, /^[A-Z]{2}$/u);
  assert.equal(typeof spec.jurisdictionName, "string");
  assert.ok(spec.jurisdictionName.length > 0);
  assert.equal(
    spec.familyId,
    `rcap-${spec.jurisdiction.toLowerCase()}-official-pdf-family`
  );
  for (const key of [
    "outputDirectory",
    "modulePath",
    "dedicatedVerifier"
  ]) {
    assertPortablePath(spec[key]);
  }
  assert.equal(
    spec.outputDirectory,
    `data/record-clearing/production-factory/official-pdf-families/${spec.jurisdiction}`
  );
  assert.ok(spec.modulePath.endsWith("/official-pdf/family.ts"));
  assert.ok(spec.dedicatedVerifier.startsWith("scripts/verify-rcap-"));
  assert.ok(spec.dedicatedVerifier.endsWith(".mjs"));
  assert.equal(typeof spec.authorityFamily, "string");
  assert.ok(spec.authorityFamily.length > 0);
  assert.equal(typeof spec.implementationJobId, "string");
  assert.ok(spec.implementationJobId.length > 0);
  assert.ok(Array.isArray(spec.blockers));
  assert.ok(Array.isArray(spec.invariants));
}

function readJson(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function unique(values) {
  return [...new Set(values)];
}

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function assertNoDuplicates(values, label) {
  assert.equal(new Set(values).size, values.length, `duplicate ${label}`);
}

function assertPortablePath(relativePath) {
  assert.equal(typeof relativePath, "string");
  assert.ok(relativePath.length > 0);
  assert.equal(path.posix.isAbsolute(relativePath), false, relativePath);
  assert.equal(path.win32.isAbsolute(relativePath), false, relativePath);
  assert.equal(relativePath.includes("\\"), false, relativePath);
  const segments = relativePath.split("/");
  assert.ok(
    segments.every(
      (segment) =>
        segment.length > 0 && segment !== "." && segment !== ".."
    ),
    relativePath
  );
  assert.equal(path.posix.normalize(relativePath), relativePath);
}

function deepEqual(left, right) {
  try {
    assert.deepEqual(left, right);
    return true;
  } catch {
    return false;
  }
}
