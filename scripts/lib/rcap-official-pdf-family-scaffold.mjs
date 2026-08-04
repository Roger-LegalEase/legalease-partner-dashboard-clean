import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const AUTHORITY_PATH = "data/record-clearing/master-library/authority.json";
const LEGAL_DESIGN_PATH =
  "data/record-clearing/legal-design-track-registry.json";
const SOURCE_REGISTRY_PATH =
  "data/record-clearing/source-artifact-registry.json";
const REPOSITORY_AUDIT_PATH =
  "data/record-clearing/master-library/repository-asset-audit.json";
const SOURCE_DEPENDENCY =
  "rcap-nationwide-source-materialization-contract";
const SOURCE_REQUIREMENT_SCHEMA =
  "rcap-source-materialization-requirement/v1";
const SOURCE_REQUIREMENT_SCAFFOLD_SCHEMA =
  "rcap-source-materialization-requirement-scaffold/v1";
const SOURCE_REQUIREMENT_SCAFFOLD_SET_SCHEMA =
  "rcap-source-materialization-requirement-scaffold-set/v1";
const FIELD_OWNERSHIP_SCHEMA =
  "data/record-clearing/production-factory/official-pdf-families/schemas/field-ownership.schema.json";
const FIXTURE_SCHEMA =
  "data/record-clearing/production-factory/official-pdf-families/schemas/fixture-scaffold.schema.json";

export function buildOfficialPdfFamilyScaffold({ root, specPath }) {
  const spec = readJson(root, specPath);
  assert.equal(
    spec.schemaVersion,
    "rcap-official-pdf-family-scaffold-spec/v1"
  );
  assertPortablePath(spec.outputDirectory);
  assert.equal(spec.sourceMaterializationDependency, SOURCE_DEPENDENCY);
  assert.ok(Array.isArray(spec.trackIds) && spec.trackIds.length > 0);
  assertNoDuplicates(spec.trackIds, "track");

  const authority = readJson(root, AUTHORITY_PATH);
  const legalDesign = readJson(root, LEGAL_DESIGN_PATH);
  const sourceRegistry = readJson(root, SOURCE_REGISTRY_PATH);
  const repositoryAudit = readJson(root, REPOSITORY_AUDIT_PATH);

  const tracks = spec.trackIds.map((trackId) => {
    const matches = legalDesign.tracks.filter(
      (track) =>
        track.jurisdiction === spec.jurisdiction &&
        track.trackId === trackId
    );
    assert.equal(matches.length, 1, `legal-design track ${trackId}`);
    const track = matches[0];
    assert.equal(track.outputStrategy, "official_pdf_fill", trackId);
    return track;
  });

  const components = tracks.flatMap((track) =>
    track.packetSet.components
      .filter((component) => component.outputStrategy === "official_pdf_fill")
      .map((component) => ({
        trackId: track.trackId,
        ...component
      }))
  );
  assert.ok(components.length > 0);
  for (const component of components) {
    assert.ok(component.officialFormId, component.componentId);
  }
  assertNoDuplicates(
    components.map((component) => component.componentId),
    "component"
  );

  const observedDocumentIds = unique(
    components.map((component) => component.officialFormId)
  );
  const documentIds = spec.documentOrder ?? sorted(observedDocumentIds);
  assert.deepEqual(
    sorted(documentIds),
    sorted(observedDocumentIds),
    "documentOrder must contain every and only legal-design form ID"
  );
  assertNoDuplicates(documentIds, "document");

  const documentRecords = documentIds.map((documentId) => {
    const auditMatches = repositoryAudit.assets.filter(
      (asset) =>
        asset.jurisdiction === spec.jurisdiction &&
        asset.status === "manifested_packet_form" &&
        asset.libraryRow?.documentId === documentId
    );
    assert.equal(
      auditMatches.length,
      1,
      `${documentId} must resolve to one retained packet-form identity`
    );
    const audit = auditMatches[0];
    const artifactMatches = sourceRegistry.artifacts.filter(
      (artifact) => artifact.sourcePath === audit.sourcePath
    );
    assert.equal(
      artifactMatches.length,
      1,
      `${documentId} source registry identity`
    );
    const artifact = artifactMatches[0];
    assert.equal(artifact.jurisdiction, spec.jurisdiction);
    assert.equal(artifact.fileType, "pdf");
    assert.equal(artifact.inventorySha256, audit.sha256);
    assert.equal(artifact.measuredSha256, audit.sha256);
    assert.ok(Number.isSafeInteger(artifact.sizeBytes));
    assert.ok(artifact.sizeBytes > 0);
    return { documentId, audit, artifact };
  });

  const requirements = documentRecords.map(({ documentId, audit, artifact }) => {
    const usageBindings = components
      .filter((component) => component.officialFormId === documentId)
      .map((component) => ({
        trackId: component.trackId,
        componentId: component.componentId
      }));
    const role =
      audit.libraryRow.workflowKey?.split(":")[2] ??
      artifact.role ??
      "OFFICIAL_FORM";
    return {
      schemaVersion: SOURCE_REQUIREMENT_SCAFFOLD_SCHEMA,
      normativeRequirementSchema: SOURCE_REQUIREMENT_SCHEMA,
      contractState: "pending_captain_owned_assignment",
      authorityEdition: `master-library/${authority.edition}`,
      authorityArchiveSha256: authority.retention.archiveSha256,
      jurisdiction: spec.jurisdiction,
      documentId,
      documentRole: role,
      canonicalAuthorityPath: audit.libraryRow.canonicalRelativePath,
      repositorySourcePath: audit.sourcePath,
      repositorySourcePathTreatment: "identity_evidence_only",
      portableLocatorCandidate: `rcap-master-library-edition-${authority.edition.replaceAll(".", "-")}://${audit.libraryRow.canonicalRelativePath}`,
      proposedMaterializationDestination:
        `official-pdf-sources/${spec.jurisdiction}/${documentId}.pdf`,
      expectedSha256: audit.sha256,
      expectedBytes: artifact.sizeBytes,
      expectedMediaType: "application/pdf",
      readOnlyTreatment: "worker_read_only_no_modify",
      verificationCommandCandidate: [
        "node scripts/verify-rcap-materialized-source.mjs",
        `--document-id ${documentId}`,
        `--sha256 ${audit.sha256}`,
        `--bytes ${artifact.sizeBytes}`
      ].join(" "),
      retentionPolicy:
        "retain_until_worker_integration_then_captain_managed_cleanup",
      expectedMeasurementBasis: "carried_forward_registry_measurement",
      identityBindingStatus: "exact_pinned_identity",
      authorityAssetState: "authority_asset_known",
      registryState: "registry_metadata_present",
      materializationState: "binary_materialization_required",
      assignmentBinding: {
        assignmentJobId: null,
        assignmentBaseCommit: null,
        assignmentManifestSha256: null,
        state: "captain_owned_assignment_required"
      },
      workerMaterializationAuthorized: false,
      usageBindings,
      provenance: {
        registryPath: SOURCE_REGISTRY_PATH,
        authorityReconciliationPath: REPOSITORY_AUDIT_PATH,
        freshLocalVerification: false,
        registryPresenceConfersReadiness: false
      }
    };
  });

  const sourceRequirements = {
    schemaVersion: SOURCE_REQUIREMENT_SCAFFOLD_SET_SCHEMA,
    normativeRequirementSchema: SOURCE_REQUIREMENT_SCHEMA,
    familyId: spec.familyId,
    jurisdiction: spec.jurisdiction,
    dependencyJobId: SOURCE_DEPENDENCY,
    contractState: "pending_captain_owned_assignment",
    assignmentManifest: null,
    portableProjectionAvailable: false,
    allSourcesRequired: true,
    aggregateState: "binary_materialization_required",
    workerReady: false,
    requirements
  };

  const fieldMapScaffold = {
    schemaVersion: "rcap-official-pdf-field-map/v1",
    familyId: spec.familyId,
    jurisdiction: spec.jurisdiction,
    mappingPolicy: {
      sourceOfFieldNames: "freshly_verified_local_bytes",
      carriedForwardStructureIsEvidenceOnly: true,
      candidateArtifactsAreEvidenceOnly: true,
      unknownSemanticMatchesRemainUnmapped: true,
      missingMappedFieldFails: "field_not_found",
      unconfirmedOverlayFails: "mapping_unconfirmed",
      thirdPartyFieldsRemainBlank: true,
      signatureImagesGenerated: false
    },
    forms: documentRecords.map(({ documentId, artifact }) => {
      const formTracks = unique(
        components
          .filter((component) => component.officialFormId === documentId)
          .map((component) => component.trackId)
      );
      const candidateInventory =
        spec.candidateInventories?.[documentId] ?? null;
      if (candidateInventory !== null) {
        assertPortablePath(candidateInventory);
        assert.ok(
          fs.existsSync(path.join(root, candidateInventory)),
          candidateInventory
        );
      }
      return {
        documentId,
        rendererStrategyCandidate: rendererCandidate(artifact),
        materializationState: "binary_materialization_required",
        mappingState: "pending_local_structure_and_field_confirmation",
        mappingReady: false,
        expectedStructure: {
          technicalClass: artifact.technicalClass,
          pageCount: artifact.pageCount ?? null,
          fieldCount: artifact.fieldCount ?? null,
          encrypted: artifact.encrypted ?? null,
          xfa: artifact.xfa ?? null,
          measurementBasis: "carried_forward_registry_measurement",
          mustVerifyFromMaterializedBytes: true
        },
        candidateInventory,
        candidateInventoryTreatment:
          candidateInventory === null
            ? "none"
            : "non_authoritative_mapping_evidence",
        trackIds: formTracks,
        componentIds: components
          .filter((component) => component.officialFormId === documentId)
          .map((component) => component.componentId),
        unresolvedRequiredFactKeys: unique(
          tracks
            .filter((track) => formTracks.includes(track.trackId))
            .flatMap((track) =>
              track.generationRequirements
                .filter((requirement) => requirement.requirement === "required")
                .map((requirement) => requirement.key)
            )
        ).sort(),
        mappings: [],
        overlays: []
      };
    })
  };

  const fieldOwnership = {
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
    forms: documentRecords.map(({ documentId, artifact }) => ({
      documentId,
      status: "pending_materialization",
      expectedFieldCount: artifact.fieldCount ?? null,
      coverageComplete: false,
      fields: []
    }))
  };

  const fixtureScaffold = {
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
        .filter((requirement) => requirement.requirement === "required")
        .map((requirement) => requirement.key),
      conditionalFactKeys: track.generationRequirements
        .filter((requirement) => requirement.requirement === "conditional")
        .map((requirement) => requirement.key),
      manualCompletionItems: track.manualCompletionItems.map((item) => ({
        item: item.item,
        whereInPacket: item.whereInPacket,
        expectedTreatment: "left_usable_and_blank"
      }))
    })),
    requiredBoundaryFixtures: [
      "missing_required_input",
      "source_missing",
      "source_hash_mismatch",
      "third_party_field_ownership",
      "deterministic_repeat"
    ]
  };

  const packetAssembly = {
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
      sourceLookupMode: "exact_requirement_only",
      downloadOrSourceFallbackAllowed: false,
      signatureImagesGenerated: false
    },
    packets: tracks.map((track) => {
      const trackComponents = components.filter(
        (component) => component.trackId === track.trackId
      );
      const trackDocuments = unique(
        trackComponents.map((component) => component.officialFormId)
      );
      return {
        trackId: track.trackId,
        outputFileName: `${track.trackId}-participant-packet.pdf`,
        assembledParticipantPdf: true,
        documents: trackDocuments.map((documentId, index) => {
          const documentComponents = trackComponents.filter(
            (component) => component.officialFormId === documentId
          );
          return {
            documentId,
            order: index + 1,
            rendererStrategy: "pending_materialized_source_inspection",
            componentIds: documentComponents.map(
              (component) => component.componentId
            ),
            requirement:
              documentComponents.some(
                (component) => component.requirement === "required"
              )
                ? "required"
                : "conditional",
            renderOnce: true
          };
        })
      };
    })
  };

  const artifactPaths = {
    scaffoldSpec: specPath,
    sourceRequirements: `${spec.outputDirectory}/source-requirements.json`,
    fieldMapScaffold: `${spec.outputDirectory}/field-map-scaffold.json`,
    fieldOwnershipSchema: FIELD_OWNERSHIP_SCHEMA,
    fieldOwnershipMap: `${spec.outputDirectory}/field-ownership.json`,
    fixtureSchema: FIXTURE_SCHEMA,
    fixtureScaffold: `${spec.outputDirectory}/fixture-scaffold.json`,
    packetAssembly: `${spec.outputDirectory}/packet-assembly.json`,
    reviewManifest: `${spec.outputDirectory}/review-manifest.json`
  };

  const familyManifest = {
    schemaVersion: "rcap-official-pdf-family/v1",
    familyId: spec.familyId,
    jurisdiction: spec.jurisdiction,
    authorityFamily: spec.authorityFamily,
    implementationJobId: spec.implementationJobId,
    outputStrategies: ["official_pdf_fill"],
    legalDesignSource: LEGAL_DESIGN_PATH,
    sourceMaterialization: {
      dependencyJobId: SOURCE_DEPENDENCY,
      requirementManifest: artifactPaths.sourceRequirements,
      allSourcesRequired: true,
      state: "binary_materialization_required",
      contractState: "pending_captain_owned_assignment",
      assignmentManifest: null,
      portableProjectionAvailable: false,
      workerReady: false,
      registryPresenceConfersReadiness: false,
      workerMayAcquireSources: false
    },
    tracks: tracks.map((track) => ({
      trackId: track.trackId,
      sourceDocumentIds: unique(
        components
          .filter((component) => component.trackId === track.trackId)
          .map((component) => component.officialFormId)
      )
    })),
    documents: documentIds,
    artifacts: artifactPaths,
    dedicatedVerifier: spec.dedicatedVerifier,
    status: {
      sourceRequirements: "exact_identity_scaffold_pending_assignment",
      localSourceVerification: "pending_materialization",
      pdfStructureInspection: "pending_materialization",
      fieldMapping: "scaffolded_pending_materialization",
      packetRendering: "pending_materialization",
      visualReview: "pending_materialization",
      counselReview: "not_submitted",
      packetReady: false,
      enabled: false
    },
    blockers: spec.blockers,
    invariants: spec.invariants
  };

  const reviewManifest = {
    schemaVersion: "rcap-official-pdf-family-review/v1",
    familyId: spec.familyId,
    jurisdiction: spec.jurisdiction,
    buildStatus: "field_map_scaffolds_drafted",
    sourceReview: "pending_materialization",
    technicalReview: "pending_materialization",
    visualReview: "pending_materialization",
    humanLegalReviewStatus: "not_submitted",
    sourceFreshnessReview: "pending",
    legalDesignChanged: false,
    samplePackets: [],
    visualInspectionArtifacts: [],
    unresolvedDependencies: [
      "The source-materialization contract is integrated; a captain-owned immutable assignment and portable projection must still be issued.",
      "Every exact source must be materialized as read-only local bytes and independently verified.",
      "Fresh PDF structure inspection must replace carried-forward measurements.",
      "Every field must receive one ownership classification and every mapping must be visually confirmed.",
      ...spec.blockers
    ],
    promotion: {
      legalOutputApproved: false,
      counselApproved: false,
      packetReady: false,
      generationAllowed: false,
      enabled: false
    }
  };

  return {
    spec,
    documents: documentRecords,
    artifacts: {
      "family-manifest.json": familyManifest,
      "source-requirements.json": sourceRequirements,
      "field-map-scaffold.json": fieldMapScaffold,
      "field-ownership.json": fieldOwnership,
      "fixture-scaffold.json": fixtureScaffold,
      "packet-assembly.json": packetAssembly,
      "review-manifest.json": reviewManifest
    }
  };
}

export function writeOfficialPdfFamilyScaffold({ root, specPath }) {
  const built = buildOfficialPdfFamilyScaffold({ root, specPath });
  const outputDirectory = path.join(root, built.spec.outputDirectory);
  fs.mkdirSync(outputDirectory, { recursive: true });
  for (const [fileName, value] of Object.entries(built.artifacts)) {
    fs.writeFileSync(
      path.join(outputDirectory, fileName),
      `${JSON.stringify(value, null, 2)}\n`,
      "utf8"
    );
  }
  return built;
}

export function verifyOfficialPdfFamilyScaffold({
  root,
  specPath,
  requireMaterialized = false
}) {
  const built = buildOfficialPdfFamilyScaffold({ root, specPath });
  for (const [fileName, expected] of Object.entries(built.artifacts)) {
    const actual = readJson(
      root,
      `${built.spec.outputDirectory}/${fileName}`
    );
    assert.deepEqual(
      actual,
      expected,
      `${built.spec.familyId}:${fileName} is not the deterministic scaffold`
    );
  }

  const ready = [];
  const pending = [];
  for (const requirement of built.artifacts["source-requirements.json"]
    .requirements) {
    assert.equal(
      requirement.schemaVersion,
      SOURCE_REQUIREMENT_SCAFFOLD_SCHEMA
    );
    assert.equal(requirement.normativeRequirementSchema, SOURCE_REQUIREMENT_SCHEMA);
    assert.equal(requirement.contractState, "pending_captain_owned_assignment");
    assert.equal(requirement.repositorySourcePathTreatment, "identity_evidence_only");
    assert.equal(requirement.workerMaterializationAuthorized, false);
    assert.deepEqual(requirement.assignmentBinding, {
      assignmentJobId: null,
      assignmentBaseCommit: null,
      assignmentManifestSha256: null,
      state: "captain_owned_assignment_required"
    });
    assertPortablePath(requirement.canonicalAuthorityPath);
    assertPortablePath(requirement.repositorySourcePath);
    assertPortablePath(requirement.proposedMaterializationDestination);
    assert.equal(
      requirement.proposedMaterializationDestination.startsWith("private/"),
      false
    );
    assert.equal(
      requirement.portableLocatorCandidate.includes("://private/"),
      false
    );
    pending.push(requirement.documentId);
  }
  if (requireMaterialized && pending.length > 0) {
    throw new Error(
      `${built.spec.familyId} source materialization unavailable: a captain-owned assignment and portable projection are required for ${pending.join(", ")}`
    );
  }
  return {
    familyId: built.spec.familyId,
    tracks: built.spec.trackIds.length,
    documents: built.documents.length,
    ready,
    pending
  };
}

function rendererCandidate(artifact) {
  if (artifact.encrypted === true || artifact.xfa === true) {
    return "nonrenderable_source_policy_required";
  }
  if (
    artifact.technicalClass === "clean_acroform" ||
    artifact.technicalClass === "dirty_acroform" ||
    artifact.technicalClass === "acroform_clean" ||
    artifact.technicalClass === "acroform_dirty"
  ) {
    return "acroform_fill_candidate";
  }
  if (
    artifact.technicalClass === "flat_pdf" ||
    artifact.technicalClass === "scanned_pdf"
  ) {
    return "coordinate_overlay_candidate";
  }
  return "pending_processability_inspection";
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
