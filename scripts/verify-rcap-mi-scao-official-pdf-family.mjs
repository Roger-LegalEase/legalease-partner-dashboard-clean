#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FAMILY_DIR =
  "data/record-clearing/production-factory/official-pdf-families/MI";
const REQUIRE_MATERIALIZED = process.argv.includes("--require-materialized");
const EXPECTED_FAMILY_ID = "mi-scao-set-aside-applications";
const EXPECTED_TRACK_IDS = [
  "mi_setaside_application",
  "mi_setaside_first_owi",
  "mi_setaside_marihuana",
  "mi_setaside_trafficking"
];
const EXPECTED_DOCUMENT_IDS = ["MC-227", "MC-227A", "MC-227B"];
const WRITE_MASK = 0o222;
const SHA256 = /^[0-9a-f]{64}$/u;

const manifest = readJson(`${FAMILY_DIR}/family-manifest.json`);
const sourceSet = readJson(`${FAMILY_DIR}/source-requirements.json`);
const fieldMap = readJson(`${FAMILY_DIR}/field-map-scaffold.json`);
const ownershipSchema = readJson(`${FAMILY_DIR}/field-ownership.schema.json`);
const ownership = readJson(`${FAMILY_DIR}/field-ownership.json`);
const fixtureSchema = readJson(`${FAMILY_DIR}/fixtures.schema.json`);
const fixtures = readJson(`${FAMILY_DIR}/fixtures.json`);
const assembly = readJson(`${FAMILY_DIR}/packet-assembly.json`);
const review = readJson(`${FAMILY_DIR}/review-manifest.json`);
const registry = readJson("data/record-clearing/legal-design-track-registry.json");
const sourceRegistry = readJson("data/record-clearing/source-artifact-registry.json");
const repositoryAudit = readJson(
  "data/record-clearing/master-library/repository-asset-audit.json"
);
const authority = readJson("data/record-clearing/master-library/authority.json");

verifyFamilyManifest();
const officialTracks = verifyLegalDesignAndAssembly();
const materialization = verifySourceRequirements(officialTracks);
verifyFieldMap(officialTracks);
verifyOwnership();
verifyFixtures(officialTracks);
verifyReviewState(materialization);

if (REQUIRE_MATERIALIZED && materialization.pending.length > 0) {
  throw new Error(
    `MI source materialization required: ${materialization.pending.join(", ")}`
  );
}

console.log(
  [
    "MI SCAO official-PDF family verification passed.",
    `tracks=${officialTracks.length}`,
    `documents=${sourceSet.requirements.length}`,
    `materialized=${materialization.ready.length}`,
    `pending=${materialization.pending.length}`,
    `mode=${REQUIRE_MATERIALIZED ? "require-materialized" : "scaffold"}`
  ].join(" ")
);

function verifyFamilyManifest() {
  assert.equal(manifest.schemaVersion, "rcap-official-pdf-family/v1");
  assert.equal(manifest.familyId, EXPECTED_FAMILY_ID);
  assert.equal(manifest.jurisdiction, "MI");
  assert.deepEqual(sorted(manifest.documents), EXPECTED_DOCUMENT_IDS);
  assert.deepEqual(
    sorted(manifest.tracks.map((track) => track.trackId)),
    EXPECTED_TRACK_IDS
  );
  assert.equal(
    manifest.sourceMaterialization.dependencyJobId,
    "rcap-nationwide-source-materialization-contract"
  );
  assert.equal(manifest.sourceMaterialization.allSourcesRequired, true);
  assert.equal(manifest.sourceMaterialization.workerMayAcquireSources, false);
  assert.equal(
    manifest.sourceMaterialization.registryPresenceConfersReadiness,
    false
  );
  assert.equal(
    manifest.dedicatedVerifier,
    "scripts/verify-rcap-mi-scao-official-pdf-family.mjs"
  );
  for (const artifactPath of Object.values(manifest.artifacts)) {
    assertPortablePath(artifactPath);
    assert.ok(fs.existsSync(path.join(ROOT, artifactPath)), artifactPath);
  }
}

function verifyLegalDesignAndAssembly() {
  const officialTracks = registry.tracks.filter(
    (track) =>
      track.jurisdiction === "MI" &&
      track.outputStrategy === "official_pdf_fill"
  );
  assert.deepEqual(
    sorted(officialTracks.map((track) => track.trackId)),
    EXPECTED_TRACK_IDS,
    "MI official_pdf_fill tracks changed; update this family deliberately"
  );
  assert.equal(assembly.schemaVersion, "rcap-official-pdf-packet-assembly/v1");
  assert.equal(assembly.familyId, EXPECTED_FAMILY_ID);
  assert.equal(assembly.assemblyPolicy.participantDeliverable, "one_pdf");
  assert.equal(assembly.assemblyPolicy.zipAllowed, false);
  assert.equal(assembly.assemblyPolicy.deterministic, true);
  assert.equal(assembly.assemblyPolicy.downloadOrSourceFallbackAllowed, false);
  assert.equal(assembly.assemblyPolicy.signatureImagesGenerated, false);
  assert.deepEqual(
    sorted(assembly.packets.map((packet) => packet.trackId)),
    EXPECTED_TRACK_IDS
  );

  const documentIds = new Set(EXPECTED_DOCUMENT_IDS);
  for (const track of officialTracks) {
    const packet = assembly.packets.find(
      (candidate) => candidate.trackId === track.trackId
    );
    assert.ok(packet, `missing assembly for ${track.trackId}`);
    assert.equal(packet.assembledParticipantPdf, true);
    assert.match(packet.outputFileName, /\.pdf$/u);
    assert.ok(packet.documents.length >= 1);
    assert.deepEqual(
      packet.documents.map((document) => document.order),
      packet.documents.map((_, index) => index + 1)
    );
    for (const document of packet.documents) {
      assert.ok(documentIds.has(document.documentId), document.documentId);
      assert.equal(document.rendererStrategy, "acroform_fill");
      assert.equal(document.renderOnce, true);
    }

    const legalComponents = track.packetSet.components
      .filter((component) => component.outputStrategy === "official_pdf_fill")
      .map((component) => component.componentId);
    const assembledComponents = packet.documents.flatMap(
      (document) => document.componentIds
    );
    assert.deepEqual(
      sorted(assembledComponents),
      sorted(legalComponents),
      `${track.trackId} assembly must preserve every legal-design component`
    );
    assertNoDuplicates(assembledComponents, `${track.trackId} component`);
  }

  const excluded = new Set(
    assembly.excludedDocuments.map((document) => document.documentId)
  );
  for (const courtDocument of ["MC-228", "MC-228A", "MC-228B", "MC-262"]) {
    assert.ok(excluded.has(courtDocument), `${courtDocument} must stay excluded`);
  }
  return officialTracks;
}

function verifySourceRequirements(officialTracks) {
  assert.equal(
    sourceSet.schemaVersion,
    "rcap-source-materialization-requirement-set/v1"
  );
  assert.equal(sourceSet.familyId, EXPECTED_FAMILY_ID);
  assert.equal(sourceSet.jurisdiction, "MI");
  assert.equal(sourceSet.allSourcesRequired, true);
  assert.equal(sourceSet.workerReady, false);
  assert.equal(
    sourceSet.dependencyJobId,
    "rcap-nationwide-source-materialization-contract"
  );
  assert.deepEqual(
    sorted(sourceSet.requirements.map((requirement) => requirement.documentId)),
    EXPECTED_DOCUMENT_IDS
  );
  assertNoDuplicates(
    sourceSet.requirements.map((requirement) => requirement.documentId),
    "source document"
  );
  assertNoDuplicates(
    sourceSet.requirements.map(
      (requirement) => requirement.materializationDestination
    ),
    "materialization destination"
  );

  const legalComponentIds = new Set(
    officialTracks.flatMap((track) =>
      track.packetSet.components
        .filter((component) => component.outputStrategy === "official_pdf_fill")
        .map((component) => component.componentId)
    )
  );
  const boundComponentIds = sourceSet.requirements.flatMap((requirement) =>
    requirement.usageBindings.map((binding) => binding.componentId)
  );
  assert.deepEqual(
    sorted(boundComponentIds),
    sorted([...legalComponentIds]),
    "every physical or embedded legal-design component needs one exact source binding"
  );
  assertNoDuplicates(boundComponentIds, "source usage component");

  const ready = [];
  const pending = [];
  for (const requirement of sourceSet.requirements) {
    assert.equal(
      requirement.schemaVersion,
      "rcap-source-materialization-requirement/v1"
    );
    assert.equal(requirement.authorityEdition, authority.edition);
    assert.equal(
      requirement.authorityArchiveSha256,
      authority.retention.archiveSha256
    );
    assert.equal(requirement.jurisdiction, "MI");
    assert.match(requirement.expectedSha256, SHA256);
    assert.ok(
      Number.isSafeInteger(requirement.expectedBytes) &&
        requirement.expectedBytes > 0
    );
    assert.equal(requirement.expectedMediaType, "application/pdf");
    assert.equal(
      requirement.readOnlyTreatment,
      "worker_read_only_no_modify"
    );
    assert.equal(
      requirement.retentionPolicy,
      "retain_until_worker_integration_then_captain_managed_cleanup"
    );
    assert.equal(
      requirement.expectedMeasurementBasis,
      "carried_forward_registry_measurement"
    );
    assert.equal(requirement.identityBindingStatus, "exact_pinned_identity");
    assert.equal(requirement.authorityAssetState, "authority_asset_known");
    assert.equal(requirement.registryState, "registry_metadata_present");
    assert.equal(
      requirement.materializationState,
      "binary_materialization_required"
    );
    assert.equal(requirement.provenance.freshLocalVerification, false);
    assert.equal(
      requirement.provenance.registryPresenceConfersReadiness,
      false
    );
    for (const relativePath of [
      requirement.canonicalAuthorityPath,
      requirement.repositorySourcePath,
      requirement.materializationDestination,
      requirement.provenance.registryPath,
      requirement.provenance.authorityReconciliationPath
    ]) {
      assertPortablePath(relativePath);
    }
    assert.equal(
      requirement.repositorySourcePath,
      requirement.materializationDestination
    );
    assert.equal(
      requirement.portableLocator,
      `rcap-master-library-edition-1-2://${requirement.canonicalAuthorityPath}`
    );
    assert.equal(
      requirement.verificationCommand,
      [
        "node scripts/verify-rcap-materialized-source.mjs",
        `--document-id ${requirement.documentId}`,
        `--sha256 ${requirement.expectedSha256}`,
        `--bytes ${requirement.expectedBytes}`
      ].join(" ")
    );

    const sourceArtifact = sourceRegistry.artifacts.find(
      (artifact) => artifact.sourcePath === requirement.repositorySourcePath
    );
    assert.ok(sourceArtifact, `${requirement.documentId} source registry row`);
    assert.equal(sourceArtifact.fileType, "pdf");
    assert.equal(sourceArtifact.inventorySha256, requirement.expectedSha256);
    assert.equal(sourceArtifact.measuredSha256, requirement.expectedSha256);
    assert.equal(sourceArtifact.sizeBytes, requirement.expectedBytes);

    const audit = repositoryAudit.assets.find(
      (asset) => asset.sourcePath === requirement.repositorySourcePath
    );
    assert.ok(audit, `${requirement.documentId} authority audit row`);
    assert.equal(audit.sha256, requirement.expectedSha256);
    assert.equal(audit.status, "manifested_packet_form");
    assert.equal(audit.libraryRow.documentId, requirement.documentId);
    assert.equal(
      audit.libraryRow.canonicalRelativePath,
      requirement.canonicalAuthorityPath
    );

    const absolutePath = path.join(
      ROOT,
      requirement.materializationDestination
    );
    if (!fs.existsSync(absolutePath)) {
      pending.push(requirement.documentId);
      continue;
    }
    verifyMaterializedFile(requirement, absolutePath);
    ready.push(requirement.documentId);
  }

  return { ready, pending };
}

function verifyFieldMap(officialTracks) {
  assert.equal(fieldMap.schemaVersion, "rcap-official-pdf-field-map/v1");
  assert.equal(fieldMap.familyId, EXPECTED_FAMILY_ID);
  assert.equal(fieldMap.jurisdiction, "MI");
  assert.equal(
    fieldMap.mappingPolicy.sourceOfFieldNames,
    "freshly_verified_local_bytes"
  );
  assert.equal(fieldMap.mappingPolicy.candidateArtifactsAreEvidenceOnly, true);
  assert.equal(fieldMap.mappingPolicy.unknownSemanticMatchesRemainUnmapped, true);
  assert.equal(fieldMap.mappingPolicy.thirdPartyFieldsRemainBlank, true);
  assert.equal(fieldMap.mappingPolicy.signatureImagesGenerated, false);
  assert.deepEqual(
    sorted(fieldMap.forms.map((form) => form.documentId)),
    EXPECTED_DOCUMENT_IDS
  );

  const sourceById = new Map(
    sourceSet.requirements.map((requirement) => [
      requirement.documentId,
      requirement
    ])
  );
  for (const form of fieldMap.forms) {
    const requirement = sourceById.get(form.documentId);
    assert.ok(requirement, form.documentId);
    const sourceArtifact = sourceRegistry.artifacts.find(
      (artifact) => artifact.sourcePath === requirement.repositorySourcePath
    );
    assert.equal(form.rendererStrategy, "acroform_fill");
    assert.equal(form.expectedStructure.fieldCount, sourceArtifact.fieldCount);
    assert.equal(form.expectedStructure.pageCount, sourceArtifact.pageCount);
    assert.equal(form.expectedStructure.encrypted, sourceArtifact.encrypted);
    assert.equal(form.expectedStructure.xfa, sourceArtifact.xfa);
    assert.equal(
      form.expectedStructure.measurementBasis,
      "carried_forward_registry_measurement"
    );
    assert.equal(
      form.expectedStructure.mustVerifyFromMaterializedBytes,
      true
    );
    assert.equal(form.mappingReady, false);
    assert.equal(
      form.mappingState,
      "pending_local_field_inventory_confirmation"
    );
    assert.deepEqual(form.mappings, []);

    const requiredFacts = unique(
      officialTracks
        .filter((track) => form.trackIds.includes(track.trackId))
        .flatMap((track) =>
          track.generationRequirements
            .filter((item) => item.requirement === "required")
            .map((item) => item.key)
        )
    );
    assert.deepEqual(
      sorted(form.unresolvedRequiredFactKeys),
      sorted(requiredFacts),
      `${form.documentId} unresolved facts must mirror legal design`
    );
  }
}

function verifyOwnership() {
  assert.equal(
    ownershipSchema.$id,
    "rcap-official-pdf-field-ownership/v1"
  );
  assert.equal(
    ownership.schemaVersion,
    "rcap-official-pdf-field-ownership/v1"
  );
  assert.equal(ownership.familyId, EXPECTED_FAMILY_ID);
  assert.equal(ownership.jurisdiction, "MI");
  assert.deepEqual(
    sorted(ownership.forms.map((form) => form.documentId)),
    EXPECTED_DOCUMENT_IDS
  );
  assert.deepEqual(
    sorted(ownership.policy.mappingAllowedFor),
    ["participant", "system_derived"]
  );
  for (const form of ownership.forms) {
    const fieldForm = fieldMap.forms.find(
      (candidate) => candidate.documentId === form.documentId
    );
    assert.equal(form.expectedFieldCount, fieldForm.expectedStructure.fieldCount);
    if (form.coverageComplete) {
      assert.equal(form.status, "ownership_reviewed");
      assert.equal(form.fields.length, form.expectedFieldCount);
    } else {
      assert.equal(form.status, "pending_materialization");
      assert.deepEqual(form.fields, []);
    }
    assertNoDuplicates(
      form.fields.map((field) => field.pdfFieldName),
      `${form.documentId} ownership field`
    );
    for (const field of form.fields) {
      if (field.mapped) {
        assert.ok(
          ownership.policy.mappingAllowedFor.includes(field.owner),
          `${form.documentId}:${field.pdfFieldName} owner ${field.owner} cannot be mapped`
        );
        assert.ok(field.factKey);
      }
    }
  }
}

function verifyFixtures(officialTracks) {
  assert.equal(fixtureSchema.$id, "rcap-official-pdf-fixtures/v1");
  assert.equal(fixtures.schemaVersion, "rcap-official-pdf-fixtures/v1");
  assert.equal(fixtures.familyId, EXPECTED_FAMILY_ID);
  assert.equal(fixtures.syntheticDataOnly, true);
  assert.deepEqual(
    sorted(fixtures.positiveFixtures.map((fixture) => fixture.trackId)),
    EXPECTED_TRACK_IDS
  );
  assertNoDuplicates(
    [
      ...fixtures.positiveFixtures.map((fixture) => fixture.fixtureId),
      ...fixtures.boundaryFixtures.map((fixture) => fixture.fixtureId)
    ],
    "fixture"
  );
  for (const fixture of fixtures.positiveFixtures) {
    assert.match(fixture.fixtureId, /^mi-/u);
    assert.match(fixture.caseReference, /^SYN-/u);
    assert.ok(fixture.manualFieldsExpectedBlank.length > 0);
    const track = officialTracks.find(
      (candidate) => candidate.trackId === fixture.trackId
    );
    assert.ok(track, fixture.trackId);
    const required = track.generationRequirements
      .filter((item) => item.requirement === "required")
      .map((item) => item.key);
    for (const key of required) {
      assert.ok(
        Object.hasOwn(fixture.facts, key),
        `${fixture.fixtureId} missing ${key}`
      );
      assert.notEqual(String(fixture.facts[key]).trim(), "");
    }
    assert.deepEqual(
      sorted(Object.keys(fixture.facts)),
      sorted(required),
      `${fixture.fixtureId} must not invent extra legal-design inputs`
    );
  }
  const positiveIds = new Set(
    fixtures.positiveFixtures.map((fixture) => fixture.fixtureId)
  );
  for (const boundary of fixtures.boundaryFixtures) {
    assert.ok(positiveIds.has(boundary.basedOn), boundary.basedOn);
    assert.ok(EXPECTED_TRACK_IDS.includes(boundary.trackId));
  }
}

function verifyReviewState(materialization) {
  assert.equal(review.schemaVersion, "rcap-official-pdf-family-review/v1");
  assert.equal(review.familyId, EXPECTED_FAMILY_ID);
  assert.equal(review.jurisdiction, "MI");
  assert.equal(review.legalDesignChanged, false);
  for (const value of Object.values(review.promotion)) {
    assert.equal(value, false);
  }
  if (materialization.pending.length > 0) {
    assert.equal(review.sourceReview, "pending_materialization");
    assert.equal(review.technicalReview, "pending_materialization");
    assert.equal(review.visualReview, "pending_materialization");
    assert.deepEqual(review.samplePackets, []);
    assert.deepEqual(review.visualInspectionArtifacts, []);
  }
}

function verifyMaterializedFile(requirement, absolutePath) {
  const stat = fs.lstatSync(absolutePath);
  assert.equal(stat.isSymbolicLink(), false, absolutePath);
  assert.equal(stat.isFile(), true, absolutePath);
  assert.equal(stat.nlink, 1, `${absolutePath} must not be a hard-link alias`);
  assert.equal(
    stat.mode & WRITE_MASK,
    0,
    `${absolutePath} must have no write bits`
  );
  assert.equal(stat.size, requirement.expectedBytes, absolutePath);
  const bytes = fs.readFileSync(absolutePath);
  assert.equal(bytes.subarray(0, 5).toString("ascii"), "%PDF-", absolutePath);
  assert.equal(sha256(bytes), requirement.expectedSha256, absolutePath);
  const latin = bytes.toString("latin1");
  assert.doesNotMatch(latin, /\/XFA\b/u, absolutePath);
  assert.doesNotMatch(latin, /\/Encrypt\b/u, absolutePath);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function unique(values) {
  return [...new Set(values)];
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
