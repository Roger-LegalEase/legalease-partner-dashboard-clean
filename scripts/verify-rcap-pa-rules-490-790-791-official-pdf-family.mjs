#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const familyRelativeDir =
  "data/record-clearing/production-factory/official-pdf-families/PA";
const familyDir = path.join(rootDir, familyRelativeDir);
const options = parseArguments(process.argv.slice(2));

class PennsylvaniaFamilyBoundaryError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "PennsylvaniaFamilyBoundaryError";
    this.code = code;
  }
}

try {
  const result = verifyFamily();
  applyRequestedBoundaryGate(result);

  if (options.json) {
    process.stdout.write(`${JSON.stringify(result.summary, null, 2)}\n`);
  } else {
    process.stdout.write(
      [
        "PA Rules 490/790/791 official-PDF family verification passed.",
        `Queue reconciliation: ${result.summary.documentIdentities}/8 identities and ${result.summary.usageBindings}/18 usage bindings.`,
        `Source posture: ${result.summary.exactPinnedIdentities} exact identities require captain projection; ${result.summary.unresolvedSourceIdentities} IFP identities remain unresolved.`,
        "Worker binary source reads: 0 authorized; renderer activation: disabled.",
        "Complete participant packets emitted: 0; generation enabled: false."
      ].join("\n") + "\n"
    );
  }
} catch (error) {
  if (error instanceof PennsylvaniaFamilyBoundaryError) {
    process.stderr.write(
      `[PA_OFFICIAL_PDF_BLOCKED] code=${error.code} ${error.message}\n`
    );
    process.exitCode = 1;
  } else {
    process.stderr.write(
      `${error instanceof Error ? error.stack ?? error.message : String(error)}\n`
    );
    process.exitCode = 1;
  }
}

function verifyFamily() {
  const family = readFamilyJson("family-manifest.json");
  const dependencies = readFamilyJson("materialization-dependencies.json");
  const requirements = readFamilyJson("source-requirements.json");
  const fieldMap = readFamilyJson("field-map-scaffold.json");
  const ownership = readFamilyJson("field-ownership.json");
  const fixtures = readFamilyJson("fixtures.json");
  const assembly = readFamilyJson("packet-assembly.json");
  const inspection = readFamilyJson(
    "rule-790-petition-source-inspection.json"
  );
  const review = readFamilyJson("review-manifest.json");
  const queue = readRepositoryJson(
    "data/record-clearing/production-factory/official-pdf-production-queue.json"
  );
  const sourceRegistry = readRepositoryJson(
    "data/record-clearing/source-artifact-registry.json"
  );
  const repositoryAudit = readRepositoryJson(
    "data/record-clearing/master-library/repository-asset-audit.json"
  );
  const authority = readRepositoryJson(
    "data/record-clearing/master-library/authority.json"
  );
  const memo = readRepositoryJson(
    "data/record-clearing/legal-design-intake/PA.memo.json"
  );

  const queueFamily = queue.families.find(
    (entry) => entry.jurisdiction === "PA"
  );
  assert.ok(queueFamily, "PA must exist in the official-PDF production queue");

  verifyFamilyManifest(family, queueFamily);
  verifySourceRequirements(
    requirements,
    queueFamily,
    authority,
    sourceRegistry,
    repositoryAudit
  );
  verifyFieldScaffolds(fieldMap, ownership, queueFamily);
  verifyFixtures(fixtures, requirements);
  verifyPacketAssembly(assembly, queueFamily, memo);
  verifyReviewPosture(review, inspection);
  verifyDependencies(dependencies);
  verifyNoPrivateSourceSink({
    family,
    dependencies,
    requirements,
    fieldMap,
    ownership,
    fixtures,
    assembly,
    inspection,
    review
  });
  verifyNoBinaryCopies();
  verifyLegacyIsolation();

  const exactPinnedIdentities = requirements.requirements.filter(
    (requirement) =>
      requirement.identityBindingStatus === "exact_pinned_identity"
  ).length;
  const unresolvedSourceIdentities = requirements.requirements.filter(
    (requirement) =>
      requirement.identityBindingStatus === "unknown_source_identity"
  ).length;
  const usageBindings = requirements.requirements.reduce(
    (count, requirement) => count + requirement.usageBindings.length,
    0
  );

  return {
    requirements,
    summary: {
      familyId: family.familyId,
      jurisdiction: "PA",
      documentIdentities: requirements.requirements.length,
      exactPinnedIdentities,
      unresolvedSourceIdentities,
      usageBindings,
      queueUsageBindingsCovered: usageBindings,
      workerReadAuthorized: false,
      workerMaterializationAuthorized: false,
      workerReady: false,
      rendererActivationAllowed: false,
      generationAllowed: false,
      completeParticipantPackets: 0,
      binarySourceReadsPerformedByVerifier: 0
    }
  };
}

function verifyFamilyManifest(family, queueFamily) {
  assert.equal(family.schemaVersion, "rcap-official-pdf-family/v1");
  assert.equal(family.familyId, "pa-rules-490-790-791");
  assert.equal(family.jurisdiction, "PA");
  assert.equal(queueFamily.familyId, "rcap-pa-official-pdf-family");
  assert.equal(queueFamily.workerReady, false);
  assert.equal(queueFamily.packetReady, false);
  assert.equal(queueFamily.enabled, false);
  assert.deepEqual(queueFamily.counts, {
    trackCount: 7,
    topLevelOfficialPdfTrackCount: 6,
    composedTrackCount: 1,
    componentCount: 18,
    documentCount: 8,
    exactSourceRequirementCount: 6,
    unresolvedSourceIdentityCount: 2
  });

  const expectedDocumentIds = queueFamily.documents.map(
    (document) => document.officialFormId
  );
  assert.deepEqual(
    family.documents,
    expectedDocumentIds,
    "Family document identities must follow the current production queue exactly"
  );
  assert.deepEqual(
    [...family.tracks.map((track) => track.trackId)].sort(),
    [...queueFamily.trackIds].sort(),
    "Family tracks must match the current production queue"
  );

  for (const familyTrack of family.tracks) {
    const expectedSourceDocumentIds = queueFamily.documents
      .filter((document) =>
        document.usageBindings.some(
          (binding) => binding.trackId === familyTrack.trackId
        )
      )
      .map((document) => document.officialFormId)
      .sort();
    assert.deepEqual(
      [...familyTrack.sourceDocumentIds].sort(),
      expectedSourceDocumentIds,
      `${familyTrack.trackId} source-document coverage must match the queue`
    );
  }

  assert.equal(family.sourceMaterialization.allSourcesRequired, true);
  assert.equal(family.sourceMaterialization.workerReadySourceCount, 0);
  assert.equal(
    family.sourceMaterialization.missingWorkerProjectedExactSources,
    6
  );
  assert.equal(family.sourceMaterialization.unresolvedSourceIdentities, 2);
  assert.equal(family.sourceMaterialization.workerReady, false);
  assert.equal(family.sourceMaterialization.workerMayAcquireSources, false);
  assert.equal(family.sourceMaterialization.workerMayReadSources, false);
  assert.equal(family.sourceMaterialization.renderActivationAllowed, false);
  assert.equal(
    family.sourceMaterialization.registryPresenceConfersReadiness,
    false
  );
  assert.equal(family.status.packetReady, false);
  assert.equal(family.status.enabled, false);
  assert.equal(
    family.legalDesignProvenance.treatment,
    "read_only_design_provenance"
  );
  assert.equal(
    family.legalDesignProvenance.legalDesignChangedByThisFamily,
    false
  );
}

function verifySourceRequirements(
  requirements,
  queueFamily,
  authority,
  sourceRegistry,
  repositoryAudit
) {
  assert.equal(
    requirements.schemaVersion,
    "rcap-source-materialization-requirement-scaffold-set/v1"
  );
  assert.equal(
    requirements.normativeRequirementSchema,
    "rcap-source-materialization-requirement/v1"
  );
  assert.equal(requirements.contractState, "pending_captain_owned_assignment");
  assert.equal(requirements.assignmentManifest, null);
  assert.equal(requirements.portableProjectionAvailable, false);
  assert.equal(requirements.workerReady, false);
  assert.equal(requirements.workerReadAuthorized, false);
  assert.equal(requirements.workerMaterializationAuthorized, false);
  assert.equal(requirements.networkAcquisitionAuthorized, false);
  assert.equal(requirements.generationAllowed, false);
  assert.deepEqual(requirements.counts, {
    documentIdentities: 8,
    exactPinnedIdentities: 6,
    unresolvedSourceIdentities: 2,
    usageBindings: 18,
    captainProjectedSources: 0
  });
  assert.equal(requirements.requirements.length, 8);

  assert.equal(authority.edition, "1.2");
  assert.equal(authority.defaultRuntimePosture, "runtime_disabled");
  assert.equal(
    authority.retention.archiveSha256,
    "7edd0a0e8308b58e12f59494a326342cc83dd362bb58f787e43d6fb475ef43bd"
  );

  const requirementsById = uniqueMap(
    requirements.requirements,
    (requirement) => requirement.documentId,
    "source requirement documentId"
  );
  assert.deepEqual(
    [...requirementsById.keys()].sort(),
    queueFamily.documents
      .map((document) => document.officialFormId)
      .sort(),
    "Source requirements must cover every queue identity exactly once"
  );

  const allDeclaredComponentIds = [];
  for (const queueDocument of queueFamily.documents) {
    const requirement = requirementsById.get(queueDocument.officialFormId);
    assert.ok(requirement);
    assert.equal(
      requirement.schemaVersion,
      "rcap-source-materialization-requirement-scaffold/v1"
    );
    assert.equal(requirement.contractState, "pending_captain_owned_assignment");
    assert.equal(requirement.jurisdiction, "PA");
    assert.equal(requirement.workerReadAuthorized, false);
    assert.equal(requirement.workerMaterializationAuthorized, false);
    assert.equal(requirement.workerReady, false);
    assert.equal(requirement.generationAllowed, false);
    assert.equal(
      requirement.provenance.registryPresenceConfersReadiness,
      false
    );
    assert.equal(
      requirement.resolvedReadOnlySourcePath,
      null,
      `${requirement.documentId} must not expose a worker-readable source path`
    );

    const actualPairs = requirement.usageBindings.map((binding) => ({
      trackId: binding.trackId,
      componentId: binding.componentId
    }));
    const expectedPairs = queueDocument.usageBindings.map((binding) => ({
      trackId: binding.trackId,
      componentId: binding.componentId
    }));
    assert.deepEqual(
      actualPairs,
      expectedPairs,
      `${requirement.documentId} usage bindings must match the queue exactly`
    );
    allDeclaredComponentIds.push(
      ...requirement.usageBindings.map((binding) => binding.componentId)
    );

    if (queueDocument.exactSourceRequirement === null) {
      verifyUnresolvedRequirement(requirement, queueDocument);
    } else {
      verifyExactRequirement(
        requirement,
        queueDocument,
        authority,
        sourceRegistry,
        repositoryAudit
      );
    }
  }

  assert.equal(new Set(allDeclaredComponentIds).size, 18);
  assert.equal(allDeclaredComponentIds.length, 18);
  assert.deepEqual(
    [...allDeclaredComponentIds].sort(),
    queueFamily.documents
      .flatMap((document) =>
        document.usageBindings.map((binding) => binding.componentId)
      )
      .sort(),
    "Source requirement component IDs must equal the production queue"
  );
}

function verifyExactRequirement(
  requirement,
  queueDocument,
  authority,
  sourceRegistry,
  repositoryAudit
) {
  const expected = queueDocument.exactSourceRequirement;
  assert.ok(expected);
  assert.equal(
    requirement.normativeRequirementSchema,
    "rcap-source-materialization-requirement/v1"
  );
  assert.equal(requirement.identityBindingStatus, "exact_pinned_identity");
  assert.equal(requirement.authorityAssetState, "authority_asset_known");
  assert.equal(requirement.registryState, "registry_metadata_present");
  assert.equal(requirement.materializationState, "binary_materialization_required");
  assert.equal(requirement.authorityEdition, `master-library/${authority.edition}`);
  assert.equal(
    requirement.authorityArchiveSha256,
    authority.retention.archiveSha256
  );
  for (const key of [
    "canonicalAuthorityPath",
    "repositorySourcePath",
    "expectedSha256",
    "expectedBytes",
    "expectedMediaType"
  ]) {
    assert.equal(
      requirement[key],
      expected[key],
      `${requirement.documentId} ${key} must match the queue pin`
    );
  }
  assert.equal(requirement.repositorySourcePathTreatment, "identity_evidence_only");
  assert.ok(
    requirement.portableLocatorCandidate.endsWith(
      requirement.canonicalAuthorityPath
    )
  );
  assert.equal(
    requirement.proposedMaterializationDestination,
    `official-pdf-sources/PA/${requirement.documentId}.pdf`
  );
  assert.deepEqual(requirement.assignmentBinding, {
    assignmentJobId: null,
    assignmentBaseCommit: null,
    assignmentManifestSha256: null,
    state: "captain_owned_assignment_required"
  });

  const registryEntry = sourceRegistry.artifacts.find(
    (entry) => entry.sourcePath === requirement.repositorySourcePath
  );
  assert.ok(registryEntry, `${requirement.documentId} registry row must exist`);
  assert.equal(registryEntry.fileType, "pdf");
  assert.equal(registryEntry.inventorySha256, requirement.expectedSha256);
  assert.equal(registryEntry.measuredSha256, requirement.expectedSha256);
  assert.equal(registryEntry.sizeBytes, requirement.expectedBytes);
  assert.equal(
    registryEntry.technicalClass,
    requirement.expectedStructure.technicalClass
  );
  assert.equal(registryEntry.pageCount, requirement.expectedStructure.pageCount);
  assert.equal(registryEntry.fieldCount, requirement.expectedStructure.fieldCount);
  assert.equal(registryEntry.encrypted, false);
  assert.equal(registryEntry.xfa, false);

  const auditEntry = repositoryAudit.assets.find(
    (entry) => entry.libraryRow?.documentId === requirement.documentId
  );
  assert.ok(
    auditEntry,
    `${requirement.documentId} repository-audit row must exist`
  );
  assert.equal(auditEntry.sourcePath, requirement.repositorySourcePath);
  assert.equal(auditEntry.sha256, requirement.expectedSha256);
  assert.equal(auditEntry.status, "manifested_packet_form");
  assert.equal(auditEntry.libraryRow.workflowKey, requirement.workflowKey);
  assert.equal(auditEntry.libraryRow.revision, requirement.revision);
  assert.equal(
    auditEntry.libraryRow.canonicalRelativePath,
    requirement.canonicalAuthorityPath
  );
}

function verifyUnresolvedRequirement(requirement, queueDocument) {
  assert.equal(requirement.normativeRequirementSchema, null);
  assert.equal(requirement.identityBindingStatus, "unknown_source_identity");
  assert.equal(requirement.authorityAssetState, "authority_identity_unresolved");
  assert.equal(requirement.registryState, "registry_metadata_absent");
  assert.equal(requirement.materializationState, "unknown_source_identity");
  assert.equal(requirement.workflowKey, null);
  assert.equal(requirement.revision, null);
  for (const key of [
    "canonicalAuthorityPath",
    "repositorySourcePath",
    "expectedSha256",
    "expectedBytes",
    "expectedMediaType",
    "expectedStructure",
    "readOnlyTreatment",
    "portableLocatorCandidate",
    "proposedMaterializationDestination",
    "verificationCommandCandidate",
    "retentionPolicyCandidate",
    "expectedMeasurementBasis"
  ]) {
    assert.equal(
      requirement[key],
      null,
      `${requirement.documentId} must not invent unresolved ${key}`
    );
  }
  assert.equal(
    requirement.repositorySourcePathTreatment,
    "identity_unresolved_no_worker_source"
  );
  assert.equal(requirement.networkAcquisitionAuthorized, false);
  assert.deepEqual(
    requirement.provenance.officialIndexUrls,
    queueDocument.officialSourceUrls
  );
  assert.deepEqual(requirement.assignmentBinding, {
    assignmentJobId: null,
    assignmentBaseCommit: null,
    assignmentManifestSha256: null,
    state: "ineligible_until_exact_authority_identity_is_adopted"
  });
  assert.deepEqual(
    requirement.usageBindings.map(normalizeUsageBinding),
    queueDocument.usageBindings.map(normalizeUsageBinding),
    `${requirement.documentId} unresolved usage semantics must match the queue`
  );
}

function verifyFieldScaffolds(fieldMap, ownership, queueFamily) {
  assert.equal(fieldMap.schemaVersion, "rcap-official-pdf-field-map/v1");
  assert.equal(
    ownership.schemaVersion,
    "rcap-official-pdf-field-ownership/v1"
  );
  assert.equal(fieldMap.mappingPolicy.workerSourceReadsAllowed, false);
  assert.equal(fieldMap.mappingPolicy.renderActivationAllowed, false);
  assert.equal(ownership.policy.workerSourceReadsAllowed, false);
  assert.equal(ownership.policy.classificationBeforeExactIdentityAllowed, false);
  assert.equal(fieldMap.forms.length, 8);
  assert.equal(ownership.forms.length, 8);

  const queueDocumentIds = queueFamily.documents
    .map((document) => document.officialFormId)
    .sort();
  const mapsById = uniqueMap(
    fieldMap.forms,
    (form) => form.documentId,
    "field-map documentId"
  );
  const ownershipById = uniqueMap(
    ownership.forms,
    (form) => form.documentId,
    "ownership documentId"
  );
  assert.deepEqual([...mapsById.keys()].sort(), queueDocumentIds);
  assert.deepEqual([...ownershipById.keys()].sort(), queueDocumentIds);

  for (const documentId of queueDocumentIds) {
    const map = mapsById.get(documentId);
    const owner = ownershipById.get(documentId);
    assert.equal(map.mappingReady, false);
    assert.notEqual(map.reviewRendererReady, true);
    assert.notEqual(map.rendererActivationAllowed, true);
    assert.equal(owner.approved ?? false, false);
    if (documentId.startsWith("PA-IFP-")) {
      assert.equal(map.identityBindingStatus, "unknown_source_identity");
      assert.equal(map.materializationState, "unknown_source_identity");
      assert.equal(map.mappingState, "prohibited_unknown_source_identity");
      assert.equal(map.rendererStrategy, null);
      assert.equal(map.expectedStructure, null);
      assert.deepEqual(map.mappings, []);
      assert.equal(owner.identityBindingStatus, "unknown_source_identity");
      assert.equal(owner.status, "prohibited_unknown_source_identity");
      assert.equal(
        owner.classificationStatus,
        "prohibited_unknown_source_identity"
      );
      assert.equal(owner.expectedFieldCount, null);
      assert.deepEqual(owner.fields, []);
    } else {
      assert.equal(map.materializationState, "binary_materialization_required");
    }
  }

  const rule790Map = mapsById.get("PA-RCRIM-P-790-PETITION");
  const rule790Ownership = ownershipById.get("PA-RCRIM-P-790-PETITION");
  assert.equal(rule790Map.carriedReviewEvidenceAvailable, true);
  assert.equal(rule790Map.reviewRendererReady, false);
  assert.equal(rule790Map.rendererActivationAllowed, false);
  const mappedAndProtectedNames = [
    ...rule790Map.mappings.map((entry) => entry.pdfFieldName),
    ...rule790Map.unmappedFields.map((entry) => entry.pdfFieldName)
  ];
  assert.equal(mappedAndProtectedNames.length, 76);
  assert.equal(new Set(mappedAndProtectedNames).size, 76);
  assert.equal(rule790Ownership.fields.length, 76);
  assert.deepEqual(
    [...mappedAndProtectedNames].sort(),
    rule790Ownership.fields.map((entry) => entry.pdfFieldName).sort(),
    "Carried Rule 790 map and ownership evidence must remain internally consistent"
  );
}

function verifyFixtures(fixtures, requirements) {
  assert.equal(fixtures.schemaVersion, "rcap-official-pdf-fixtures/v1");
  assert.equal(fixtures.syntheticDataOnly, true);
  assert.equal(fixtures.workerSourceReadsAllowed, false);
  assert.equal(fixtures.renderActivationAllowed, false);
  assert.ok(fixtures.positiveFixtures.length > 0);
  for (const fixture of fixtures.positiveFixtures) {
    assert.equal(fixture.reviewOnly, true);
    assert.equal(fixture.carriedReviewEvidenceOnly, true);
    assert.equal(fixture.currentlyRenderable, false);
  }

  const sourceGateFixtures = fixtures.boundaryFixtures.filter((fixture) =>
    ["materialization_required", "identity_resolution_required"].includes(
      fixture.kind
    )
  );
  assert.equal(sourceGateFixtures.length, 8);
  const gatesByDocumentId = uniqueMap(
    sourceGateFixtures,
    (fixture) => fixture.documentId,
    "source-gate fixture documentId"
  );
  assert.deepEqual(
    [...gatesByDocumentId.keys()].sort(),
    requirements.requirements
      .map((requirement) => requirement.documentId)
      .sort()
  );
  for (const requirement of requirements.requirements) {
    const fixture = gatesByDocumentId.get(requirement.documentId);
    assert.equal(
      fixture.identityBindingStatus,
      requirement.identityBindingStatus
    );
    if (requirement.identityBindingStatus === "unknown_source_identity") {
      assert.equal(fixture.kind, "identity_resolution_required");
      assert.equal(fixture.expect, "unknown_source_identity");
    } else {
      assert.equal(fixture.kind, "materialization_required");
      assert.equal(fixture.expect, "source_materialization_required");
    }
  }
}

function verifyPacketAssembly(assembly, queueFamily, memo) {
  assert.equal(
    assembly.schemaVersion,
    "rcap-official-pdf-packet-assembly/v1"
  );
  assert.equal(assembly.assemblyPolicy.partialParticipantPacketAllowed, false);
  assert.equal(assembly.assemblyPolicy.downloadOrSourceFallbackAllowed, false);
  assert.equal(assembly.assemblyPolicy.workerSourceReadsAllowed, false);
  assert.equal(assembly.assemblyPolicy.renderActivationAllowed, false);
  assert.equal(assembly.packets.length, 7);
  assert.deepEqual(
    assembly.packets.map((packet) => packet.trackId).sort(),
    [...queueFamily.trackIds].sort()
  );

  const queueBindingByComponentId = new Map();
  for (const document of queueFamily.documents) {
    for (const binding of document.usageBindings) {
      assert.equal(queueBindingByComponentId.has(binding.componentId), false);
      queueBindingByComponentId.set(binding.componentId, {
        ...normalizeUsageBinding(binding),
        documentId: document.officialFormId
      });
    }
  }

  const assemblyOfficialComponents = [];
  for (const packet of assembly.packets) {
    assert.equal(packet.targetParticipantPdf, true);
    assert.equal(packet.currentlyMaterializable, false);
    for (const component of packet.documents) {
      if (component.documentId === null) continue;
      const expected = queueBindingByComponentId.get(component.componentId);
      assert.ok(
        expected,
        `${component.componentId} must be a current queue usage binding`
      );
      assert.deepEqual(
        {
          ...normalizeUsageBinding({
            ...component,
            trackId: packet.trackId
          }),
          documentId: component.documentId
        },
        expected,
        `${component.componentId} assembly semantics must match the queue`
      );
      assemblyOfficialComponents.push(component.componentId);
      if (component.documentId.startsWith("PA-IFP-")) {
        assert.equal(
          component.identityBindingStatus,
          "unknown_source_identity"
        );
        assert.equal(component.renderState, "blocked_unknown_source_identity");
        assert.equal(
          component.implementation,
          "within_family_source_scaffold_only"
        );
        assert.ok(
          packet.conditionalBlockingDocumentIds?.some(
            (blocker) => blocker.documentId === component.documentId
          )
        );
      } else {
        assert.ok(
          packet.blockingDocumentIds.includes(component.documentId),
          `${component.componentId} must remain blocked without a worker source`
        );
      }
    }
  }
  assert.equal(assemblyOfficialComponents.length, 18);
  assert.equal(new Set(assemblyOfficialComponents).size, 18);
  assert.deepEqual(
    [...assemblyOfficialComponents].sort(),
    [...queueBindingByComponentId.keys()].sort()
  );

  const memoByTrack = new Map(
    memo.tracks.map((track) => [track.trackId, track])
  );
  for (const packet of assembly.packets) {
    const track = memoByTrack.get(packet.trackId);
    assert.ok(track, `${packet.trackId} must exist in the PA memo`);
    assert.equal(
      track.legalDesignDecision.status,
      "legal_design_approved_with_limitations"
    );
    assert.deepEqual(
      packet.documents.map(normalizeAssemblyComponentForMemo),
      track.components.map(normalizeMemoComponent),
      `${packet.trackId} must preserve the normalized legal design`
    );
  }
}

function verifyReviewPosture(review, inspection) {
  assert.equal(
    review.buildStatus,
    "queue_reconciled_source_gated_scaffold_complete"
  );
  assert.deepEqual(review.completeParticipantPackets, []);
  assert.equal(review.promotion.legalOutputApproved, false);
  assert.equal(review.promotion.counselApproved, false);
  assert.equal(review.promotion.packetReady, false);
  assert.equal(review.promotion.generationAllowed, false);
  assert.equal(review.promotion.enabled, false);
  assert.ok(
    review.unresolvedDependencies.some((entry) => entry.includes("PA-IFP-CCP"))
  );
  assert.ok(
    review.unresolvedDependencies.some((entry) => entry.includes("PA-IFP-MDJ"))
  );
  for (const sample of review.componentReviewSamples) {
    assert.equal(sample.evidenceTreatment, "carried_prior_review_artifact_metadata");
    assert.equal(sample.currentlyRenderable, false);
    assert.equal(sample.generationAllowed, false);
    assert.equal(sample.generationCommand, null);
  }

  assert.equal(
    inspection.sourceTreatment,
    "carried_historical_review_evidence_metadata_only"
  );
  assert.equal(inspection.workerReadAuthorized, false);
  assert.equal(inspection.generationAllowed, false);
  assert.equal(inspection.measurement.command, null);
  assert.equal(inspection.measurement.currentSourceReadPerformed, false);
  assert.equal(inspection.measurement.currentRenderActivationAllowed, false);
  assert.equal(inspection.reviewState.productionReady, false);
}

function verifyDependencies(dependencies) {
  assert.equal(
    dependencies.schemaVersion,
    "rcap-official-pdf-materialization-dependencies/v1"
  );
  assert.equal(dependencies.workerReady, false);
  assert.equal(dependencies.failurePolicy.fallbackAllowed, false);

  const sourceContract = dependencies.dependencies.find(
    (dependency) =>
      dependency.dependencyId === "rcap-nationwide-source-materialization-contract"
  );
  assert.ok(sourceContract);
  assert.equal(sourceContract.workerMayAcquireSources, false);
  assert.equal(sourceContract.workerMayReadSources, false);
  assert.equal(sourceContract.renderActivationAllowed, false);

  const exactSources = dependencies.dependencies.find(
    (dependency) =>
      dependency.dependencyId ===
      "pa-six-unavailable-rule-family-worker-sources"
  );
  assert.ok(exactSources);
  assert.deepEqual(
    [...exactSources.documentIds].sort(),
    [
      "PA-RCRIM-P-490-ORDER",
      "PA-RCRIM-P-490-PETITION",
      "PA-RCRIM-P-790-ORDER",
      "PA-RCRIM-P-790-PETITION",
      "PA-RCRIM-P-791-ORDER",
      "PA-RCRIM-P-791-PETITION"
    ]
  );
  assert.equal(exactSources.workerReadAuthorized, false);
  assert.equal(exactSources.generationAllowed, false);

  const unresolvedIfp = dependencies.dependencies.find(
    (dependency) =>
      dependency.dependencyId === "pa-ifp-unresolved-source-identities"
  );
  assert.ok(unresolvedIfp);
  assert.deepEqual(unresolvedIfp.documentIds, ["PA-IFP-CCP", "PA-IFP-MDJ"]);
  assert.equal(unresolvedIfp.publicIndexIsBinaryResolver, false);
  assert.equal(unresolvedIfp.workerReadAuthorized, false);
  assert.equal(unresolvedIfp.networkAcquisitionAuthorized, false);
  assert.equal(unresolvedIfp.generationAllowed, false);
}

function verifyNoPrivateSourceSink(artifacts) {
  walkObject(artifacts, (value, key, objectPath) => {
    if (
      [
        "workerReadAuthorized",
        "workerMaterializationAuthorized",
        "workerMayAcquireSources",
        "workerMayReadSources",
        "networkAcquisitionAuthorized",
        "renderActivationAllowed"
      ].includes(key)
    ) {
      assert.notEqual(
        value,
        true,
        `${objectPath} must not grant source or renderer authority`
      );
    }
    if (key === "resolvedReadOnlySourcePath") {
      assert.equal(
        value,
        null,
        `${objectPath} must not expose an assigned worker source`
      );
    }
    if (
      [
        "proposedMaterializationDestination",
        "materializationDestination",
        "verificationSourcePath"
      ].includes(key) &&
      typeof value === "string"
    ) {
      assert.equal(
        value.startsWith("private/"),
        false,
        `${objectPath} must not use private/ as a worker sink`
      );
    }
  });
}

function verifyNoBinaryCopies() {
  for (const relativeDirectory of [
    familyRelativeDir,
    "src/lib/rcap/packets/jurisdictions/pennsylvania/official-pdf"
  ]) {
    for (const filePath of walkFileNames(
      path.join(rootDir, relativeDirectory)
    )) {
      assert.notEqual(
        path.extname(filePath).toLowerCase(),
        ".pdf",
        `Official source bytes must not be copied into implementation paths: ${filePath}`
      );
    }
  }
}

function verifyLegacyIsolation() {
  const forbiddenImports = [
    "packets/jurisdictions/pennsylvania/official-pdf",
    "pa-rules-490-790-791"
  ];
  for (const relativePath of [
    "src/app/api/rcap/documents/pennsylvania/create/route.ts",
    "src/lib/rcap/documents/packet-pdf.ts",
    "src/lib/rcap/documents/source-repository.ts",
    "src/lib/rcap/packets/registry.ts"
  ]) {
    const contents = fs.readFileSync(path.join(rootDir, relativePath), "utf8");
    for (const forbiddenImport of forbiddenImports) {
      assert.equal(
        contents.includes(forbiddenImport),
        false,
        `${relativePath} must not activate the PA review-only family`
      );
    }
  }
}

function applyRequestedBoundaryGate(result) {
  if (options.requireRenderable) {
    throw new PennsylvaniaFamilyBoundaryError(
      "render_activation_disabled",
      "Pennsylvania official-PDF rendering remains disabled."
    );
  }

  if (options.requireAllSources) {
    throw new PennsylvaniaFamilyBoundaryError(
      "family_source_incomplete",
      "Six exact identities lack captain-projected worker sources and two IFP identities remain unresolved."
    );
  }

  if (!options.requireSourceReady) return;
  const requirement = result.requirements.requirements.find(
    (entry) => entry.documentId === options.documentId
  );
  if (!requirement) {
    throw new PennsylvaniaFamilyBoundaryError(
      "unknown_document_id",
      `${options.documentId} is not a Pennsylvania queue identity.`
    );
  }
  if (requirement.identityBindingStatus === "unknown_source_identity") {
    throw new PennsylvaniaFamilyBoundaryError(
      "unknown_source_identity",
      `${requirement.documentId} has no adopted exact source identity.`
    );
  }
  throw new PennsylvaniaFamilyBoundaryError(
    "source_materialization_required",
    `${requirement.documentId} has no captain-projected worker source.`
  );
}

function parseArguments(arguments_) {
  const parsed = {
    documentId: null,
    requireAllSources: false,
    requireSourceReady: false,
    requireRenderable: false,
    json: false
  };
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--document-id") {
      const value = arguments_[index + 1];
      assert.ok(value && !value.startsWith("--"), "--document-id requires a value");
      parsed.documentId = value;
      index += 1;
    } else if (argument === "--require-all-sources") {
      parsed.requireAllSources = true;
    } else if (argument === "--require-source-ready") {
      parsed.requireSourceReady = true;
    } else if (argument === "--require-renderable") {
      parsed.requireRenderable = true;
    } else if (argument === "--json") {
      parsed.json = true;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (parsed.requireSourceReady) {
    assert.ok(
      parsed.documentId,
      "--require-source-ready requires --document-id"
    );
  } else {
    assert.equal(
      parsed.documentId,
      null,
      "--document-id is only valid with --require-source-ready"
    );
  }
  return parsed;
}

function readFamilyJson(fileName) {
  assert.equal(path.extname(fileName), ".json");
  return JSON.parse(fs.readFileSync(path.join(familyDir, fileName), "utf8"));
}

function readRepositoryJson(relativePath) {
  assert.equal(path.extname(relativePath), ".json");
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8"));
}

function normalizeUsageBinding(binding) {
  return {
    trackId: binding.trackId,
    componentId: binding.componentId,
    role: binding.role,
    requirement: binding.requirement,
    conditionDescription: binding.conditionDescription ?? null
  };
}

function normalizeMemoComponent(component) {
  return {
    role: component.role,
    requirement: component.requirement,
    outputStrategy: component.outputStrategy,
    officialFormId: component.officialFormId ?? null,
    conditionDescription: component.conditionDescription ?? null
  };
}

function normalizeAssemblyComponentForMemo(component) {
  return {
    role: component.role,
    requirement: component.requirement,
    outputStrategy:
      component.rendererStrategy === "acroform_fill" ||
      component.rendererStrategy === "official_pdf_fill"
        ? "official_pdf_fill"
        : component.rendererStrategy,
    officialFormId: component.documentId,
    conditionDescription: component.conditionDescription ?? null
  };
}

function uniqueMap(values, keyForValue, label) {
  const result = new Map();
  for (const value of values) {
    const key = keyForValue(value);
    assert.equal(result.has(key), false, `Duplicate ${label}: ${key}`);
    result.set(key, value);
  }
  return result;
}

function walkObject(value, visit, objectPath = "$") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      walkObject(entry, visit, `${objectPath}[${index}]`)
    );
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${objectPath}.${key}`;
    visit(child, key, childPath);
    walkObject(child, visit, childPath);
  }
}

function walkFileNames(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFileNames(filePath) : [filePath];
  });
}
