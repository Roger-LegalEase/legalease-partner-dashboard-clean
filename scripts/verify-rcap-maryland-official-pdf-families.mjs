#!/usr/bin/env node

// Maryland remaining official-PDF family verifier.
//
// This verifier has two deliberately different successful states:
//
// 1. The normal no-argument run passes when the exact source contract is
//    internally consistent and absent binaries remain explicitly fail-closed.
// 2. `--document-id <id> --require-materialized` verifies one materialized
//    source's exact bytes for a source custodian. It does not promote a field
//    map or make a route renderer-selectable.
//
// If exact bytes appear during an implementation run while mappings and field
// ownership are still scaffolds, the normal run fails and directs the worker to
// continue through inspection, mapping, deterministic rendering, and visual
// artifacts. Generated samples elsewhere in tmp/ are never source inputs.

import { register } from "node:module";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const {
  MARYLAND_REMAINING_ACROFORM_MAPPINGS,
  MARYLAND_REMAINING_OFFICIAL_PDF_FAMILY_ID,
  MARYLAND_REMAINING_OFFICIAL_PDF_PACKETS,
  MARYLAND_REMAINING_OFFICIAL_PDF_SOURCE_IDENTITIES,
  MARYLAND_REMAINING_OVERLAY_PLACEMENTS,
  MarylandOfficialPdfFamilyBlockedError,
  assertMarylandRemainingOfficialPdfTrackRenderable
} = await import(
  "@/lib/rcap/packets/jurisdictions/maryland/official-pdf/family"
);

const args = parseArgs(process.argv.slice(2));
const root = process.cwd();
const familyDir = path.join(
  root,
  "data/record-clearing/production-factory/official-pdf-families/MD"
);

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const readFamilyJson = (fileName) =>
  JSON.parse(fs.readFileSync(path.join(familyDir, fileName), "utf8"));

const manifest = readFamilyJson("family-manifest.json");
const dependencies = readFamilyJson("dependencies.json");
const sourceRequirements = readFamilyJson("source-requirements.json");
const fieldMap = readFamilyJson("field-map-scaffold.json");
const ownership = readFamilyJson("field-ownership.json");
const ownershipSchema = readFamilyJson("field-ownership.schema.json");
const fixtures = readFamilyJson("fixtures.json");
const fixtureSchema = readFamilyJson("fixtures.schema.json");
const packetAssembly = readFamilyJson("packet-assembly.json");
const review = readFamilyJson("review-manifest.json");

const authority = readJson("data/record-clearing/master-library/authority.json");
const sourceRegistry = readJson("data/record-clearing/source-artifact-registry.json");
const authorityAudit = readJson(
  "data/record-clearing/master-library/repository-asset-audit.json"
);
const candidateDispositions = readJson(
  "data/record-clearing/master-library/edition-1-2/candidate-dispositions.json"
);
const legalTracks = readJson("data/record-clearing/legal-design-track-registry.json");
const legalPacketSets = readJson(
  "data/record-clearing/legal-design-packet-set-manifests.json"
);
const relationships = readJson(
  "data/record-clearing/legal-design-track-source-relationships.json"
);
const tranchePins = readJson(
  "data/record-clearing/implementation-tranches/tranche-2-authority-pins.json"
);

const failures = [];
const notes = [];
const ok = (condition, message) => {
  if (!condition) failures.push(message);
};
const note = (message) => notes.push(message);

const EXPECTED_DOCUMENT_IDS = [
  "CC-DC-CR-072A",
  "CC-DC-CR-072B",
  "CC-DC-CR-072C",
  "CC-DC-CR-072D",
  "CC-DC-CR-078",
  "CC-DC-089"
];
const SOURCE_GATED_IDS = new Set([
  "CC-DC-CR-072A",
  "CC-DC-CR-072B",
  "CC-DC-CR-072C",
  "CC-DC-CR-072D"
]);
const PACKET_CANDIDATE_IDS = new Set(["CC-DC-CR-078", "CC-DC-089"]);
const EXPECTED_TRACK_IDS = [
  "md_10105_favorable",
  "md_10105_early",
  "md_10110_conviction",
  "md_cannabis_petition",
  "md_pardon_expungement"
];
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const FAMILY_ID = "md-district-court-expungement-form-family";

// ---------------------------------------------------------------------------
// 1. Family boundary and expected artifacts
// ---------------------------------------------------------------------------

ok(manifest.familyId === FAMILY_ID, "Family manifest has the wrong familyId.");
ok(manifest.jurisdiction === "MD", "Family manifest is not Maryland-scoped.");
ok(
  manifest.implementationJobId === "IMP-OF-01-md-district-court-form-family",
  "Family manifest is not bound to IMP-OF-01."
);
ok(
  manifest.existingCompletedImplementation?.trackId ===
    "md_second_chance_shielding",
  "The completed shielding implementation is not explicitly preserved."
);
ok(
  manifest.existingCompletedImplementation?.treatment ===
    "preserved_external_implementation",
  "The completed shielding tranche is not marked external and preserved."
);
ok(
  manifest.status?.packetReady === false &&
    manifest.status?.generationAllowed === false &&
    manifest.status?.enabled === false,
  "The family manifest claims readiness, generation, or enablement."
);
ok(
  manifest.sourceMaterialization?.registryPresenceConfersReadiness === false,
  "The family manifest treats registry presence as local source readiness."
);
ok(
  manifest.sourceMaterialization?.generatedSampleMaySubstituteForSource === false,
  "The family manifest permits generated samples to substitute for sources."
);

for (const artifactPath of Object.values(manifest.artifacts ?? {})) {
  ok(
    typeof artifactPath === "string" &&
      fs.existsSync(path.join(root, artifactPath)),
    `Family artifact is missing: ${artifactPath}.`
  );
}
ok(
  fs.existsSync(path.join(root, manifest.implementationModule ?? "")),
  "Maryland fail-closed implementation module is missing."
);
ok(
  manifest.dedicatedVerifier ===
    "scripts/verify-rcap-maryland-official-pdf-families.mjs",
  "Family manifest names the wrong dedicated verifier."
);
note("1. Boundary: Maryland-only family artifacts exist; shielding remains external and preserved.");

// ---------------------------------------------------------------------------
// 2. Exact source requirements and authority identity
// ---------------------------------------------------------------------------

ok(
  sourceRequirements.schemaVersion ===
    "rcap-source-materialization-requirement-set/v1",
  "Source requirement set has the wrong schemaVersion."
);
ok(
  sourceRequirements.familyId === FAMILY_ID &&
    sourceRequirements.jurisdiction === "MD",
  "Source requirement set is not bound to the Maryland family."
);
ok(
  sourceRequirements.aggregateState === "binary_materialization_required" &&
    sourceRequirements.workerReady === false,
  "Source requirement set does not fail closed on materialization."
);
ok(
  sourceRequirements.registryPresenceConfersReadiness === false,
  "Source requirement set treats stale registry presence as readiness."
);

const requirements = sourceRequirements.requirements ?? [];
const requirementIds = requirements.map((entry) => entry.documentId);
ok(
  sameSet(requirementIds, EXPECTED_DOCUMENT_IDS),
  "Source requirement document set is not exactly the six remaining Maryland forms."
);
ok(
  new Set(requirementIds).size === requirementIds.length,
  "Source requirements contain a duplicate documentId."
);

const registryByPath = new Map(
  sourceRegistry.artifacts.map((entry) => [entry.sourcePath, entry])
);
const auditByPath = new Map(
  authorityAudit.assets.map((entry) => [entry.sourcePath, entry])
);
const dispositionByDocument = new Map(
  candidateDispositions.decisions
    .filter((entry) => entry.jurisdiction === "MD")
    .map((entry) => [entry.documentId, entry])
);
const unusedPacketCandidateByWorkflow = new Map(
  (tranchePins.packetCandidatesNotUsedByThisTranche ?? []).map((entry) => [
    entry.workflowKey,
    entry
  ])
);

for (const requirement of requirements) {
  const prefix = requirement.documentId;
  ok(
    requirement.schemaVersion ===
      "rcap-source-materialization-requirement/v1",
    `${prefix}: wrong requirement schemaVersion.`
  );
  ok(
    requirement.authorityEdition === authority.edition,
    `${prefix}: authority edition does not match the adopted edition.`
  );
  ok(
    requirement.authorityArchiveSha256 === authority.retention.archiveSha256,
    `${prefix}: authority archive hash does not match the adopted edition.`
  );
  ok(HASH_PATTERN.test(requirement.expectedSha256), `${prefix}: invalid SHA-256.`);
  ok(
    Number.isInteger(requirement.expectedBytes) &&
      requirement.expectedBytes > 0,
    `${prefix}: invalid expected byte count.`
  );
  ok(
    requirement.expectedMediaType === "application/pdf",
    `${prefix}: media type is not application/pdf.`
  );
  ok(
    requirement.repositorySourcePath === requirement.materializationDestination,
    `${prefix}: repository path and materialization destination differ.`
  );
  ok(
    requirement.materializationDestination.startsWith(
      "private/Nationwide Record Clearing/LegalEase Maryland/"
    ) && !requirement.materializationDestination.split("/").includes(".."),
    `${prefix}: materialization destination is outside the Maryland Nationwide folder.`
  );
  ok(
    requirement.readOnlyTreatment === "worker_read_only_no_modify",
    `${prefix}: worker source policy is not read-only.`
  );
  ok(
    requirement.materializationState === "binary_materialization_required",
    `${prefix}: source is represented as materialized before local verification.`
  );
  ok(
    requirement.generationAllowed === false,
    `${prefix}: source requirement claims generation is allowed.`
  );
  ok(
    requirement.verificationCommand ===
      `node scripts/verify-rcap-maryland-official-pdf-families.mjs --document-id ${prefix} --require-materialized`,
    `${prefix}: verification command is not exact and self-contained.`
  );

  if (SOURCE_GATED_IDS.has(prefix)) {
    ok(
      requirement.assetClass === "source_gated" &&
        requirement.packetCandidate === false &&
        requirement.packetRole === "primary_filing",
      `${prefix}: source-gated primary authority posture was changed.`
    );
  } else if (PACKET_CANDIDATE_IDS.has(prefix)) {
    ok(
      requirement.assetClass === "packet_form" &&
        requirement.packetCandidate === true,
      `${prefix}: packet-form companion posture was changed.`
    );
  }

  const registry = registryByPath.get(requirement.repositorySourcePath);
  ok(Boolean(registry), `${prefix}: exact source path is absent from the source registry.`);
  if (registry) {
    ok(
      registry.inventorySha256 === requirement.expectedSha256 &&
        registry.measuredSha256 === requirement.expectedSha256,
      `${prefix}: source registry hash differs from the requirement.`
    );
    ok(
      registry.sizeBytes === requirement.expectedBytes,
      `${prefix}: source registry byte count differs from the requirement.`
    );
    ok(registry.fileType === "pdf", `${prefix}: source registry type is not PDF.`);
  }

  const audit = auditByPath.get(requirement.repositorySourcePath);
  ok(Boolean(audit), `${prefix}: exact source path is absent from the authority audit.`);
  if (audit) {
    ok(
      audit.sha256 === requirement.expectedSha256,
      `${prefix}: authority audit hash differs from the requirement.`
    );
    ok(
      audit.libraryRow?.workflowKey === requirement.workflowKey,
      `${prefix}: workflow key differs from the authority audit.`
    );
    ok(
      audit.libraryRow?.assetClass === requirement.assetClass,
      `${prefix}: asset class differs from the authority audit.`
    );
    ok(
      audit.libraryRow?.revision === requirement.revision,
      `${prefix}: revision differs from the authority audit.`
    );
    ok(
      audit.libraryRow?.canonicalRelativePath ===
        requirement.canonicalAuthorityPath,
      `${prefix}: canonical authority path differs from the authority audit.`
    );
  }

  if (SOURCE_GATED_IDS.has(prefix)) {
    const disposition = dispositionByDocument.get(prefix);
    ok(Boolean(disposition), `${prefix}: source-gated disposition is missing.`);
    if (disposition) {
      ok(
        disposition.edition12Disposition === "adopt_source_gated" &&
          disposition.sha256 === requirement.expectedSha256 &&
          disposition.bytes === requirement.expectedBytes,
        `${prefix}: source-gated disposition identity changed.`
      );
    }
  } else {
    const pin = unusedPacketCandidateByWorkflow.get(requirement.workflowKey);
    ok(Boolean(pin), `${prefix}: existing tranche does not record the unused packet candidate.`);
    if (pin) {
      ok(
        pin.assetClass === "packet_form" &&
          pin.sha256 === requirement.expectedSha256,
        `${prefix}: unused packet-candidate authority pin differs.`
      );
    }
  }
}
note("2. Sources: six identities match Edition 1.2, the source registry, and the authority audit.");

// ---------------------------------------------------------------------------
// 3. Dependencies distinguish source, authority, and route readiness
// ---------------------------------------------------------------------------

ok(
  dependencies.familyId === FAMILY_ID && dependencies.jurisdiction === "MD",
  "Dependency declaration is not bound to this Maryland family."
);
const dependencyById = new Map(
  (dependencies.dependencies ?? []).map((entry) => [
    entry.dependencyId,
    entry
  ])
);
ok(
  dependencyById.get("md-source-materialization")?.status === "blocked",
  "Source materialization is not blocked."
);
ok(
  sameSet(
    dependencyById.get("md-source-materialization")?.documentIds ?? [],
    EXPECTED_DOCUMENT_IDS
  ),
  "Source materialization dependency does not name all six exact forms."
);
ok(
  dependencyById.get("md-source-materialization")?.workerMayResolveByDownload ===
    false,
  "A worker is allowed to download Maryland sources."
);
ok(
  sameSet(
    dependencyById.get("md-072-authority-clearance")?.documentIds ?? [],
    [...SOURCE_GATED_IDS]
  ) &&
    dependencyById.get("md-072-authority-clearance")?.workerMayResolve === false,
  "CC-DC-CR-072 authority clearance is not captain-owned and fail-closed."
);
ok(
  dependencyById.get("md-existing-shielding-tranche")?.status === "satisfied",
  "Existing shielding tranche is not preserved as a satisfied dependency."
);
ok(
  (dependencies.excludedOrExternalForms ?? []).some(
    (entry) =>
      entry.documentId === "DC-CR-071" &&
      entry.treatment === "not_an_official_pdf_fill_route"
  ),
  "DC-CR-071 is not explicitly excluded from official_pdf_fill."
);
ok(
  (dependencies.excludedOrExternalForms ?? []).some(
    (entry) =>
      entry.documentId === "CC-DC-CR-072G2" &&
      entry.treatment === "reference_not_packet_component"
  ),
  "CC-DC-CR-072G2 is not explicitly held as a non-packet reference."
);
note("3. Dependencies: source materialization, 072 authority, companion pins, and preserved tranche are separate.");

// ---------------------------------------------------------------------------
// 4. Packet assembly is an exact copy of adopted component identity, not law
// ---------------------------------------------------------------------------

const mdOfficialTracks = legalTracks.tracks.filter(
  (entry) =>
    entry.jurisdiction === "MD" &&
    entry.outputStrategy === "official_pdf_fill" &&
    EXPECTED_TRACK_IDS.includes(entry.trackId)
);
ok(
  sameSet(
    mdOfficialTracks.map((entry) => entry.trackId),
    EXPECTED_TRACK_IDS
  ),
  "Legal-design registry no longer contains the expected five Maryland tracks."
);

const normalizedPacketByTrack = new Map(
  legalPacketSets.packetSets
    .filter((entry) => entry.jurisdiction === "MD")
    .map((entry) => [entry.trackId, entry])
);
const assemblyByTrack = new Map(
  (packetAssembly.packets ?? []).map((entry) => [entry.trackId, entry])
);
ok(
  packetAssembly.assemblyPolicy?.currentGenerationAllowed === false &&
    packetAssembly.assemblyPolicy?.runtimeIntegrationAllowed === false &&
    packetAssembly.assemblyPolicy?.downloadOrSourceFallbackAllowed === false &&
    packetAssembly.assemblyPolicy?.generatedSampleSourceFallbackAllowed === false,
  "Packet assembly does not fail closed on generation, integration, or source fallback."
);
ok(
  sameSet([...assemblyByTrack.keys()], EXPECTED_TRACK_IDS),
  "Packet assembly does not contain exactly the five remaining tracks."
);

for (const trackId of EXPECTED_TRACK_IDS) {
  const normalized = normalizedPacketByTrack.get(trackId);
  const assembly = assemblyByTrack.get(trackId);
  ok(Boolean(normalized), `${trackId}: normalized packet set is missing.`);
  ok(Boolean(assembly), `${trackId}: packet assembly definition is missing.`);
  if (!normalized || !assembly) continue;
  ok(
    assembly.generationState === "blocked" &&
      assembly.blockingReasonCodes.includes("authority_source_gated") &&
      assembly.blockingReasonCodes.includes("source_materialization_required") &&
      assembly.blockingReasonCodes.includes("field_mapping_pending"),
    `${trackId}: packet assembly is not blocked by authority, source, and mapping.`
  );

  const actualComponents = assembly.documents.map((document) => ({
    componentId: document.componentId,
    officialFormId: document.documentId,
    role: document.role,
    requirement: document.requirement,
    order: document.order
  }));
  const expectedComponents = normalized.components.map((component) => ({
    componentId: component.componentId,
    officialFormId: component.officialFormId,
    role: component.role,
    requirement: component.requirement,
    order: component.order
  }));
  ok(
    stable(actualComponents) === stable(expectedComponents),
    `${trackId}: assembly components differ from the adopted packet set.`
  );
  ok(
    assembly.documents.every(
      (document) =>
        document.rendererStrategy ===
        "unresolved_pending_verified_inspection"
    ),
    `${trackId}: a renderer strategy was selected before verified inspection.`
  );
}

const relationshipByComponent = new Map(
  relationships.relationships
    .filter((entry) => entry.jurisdiction === "MD")
    .map((entry) => [entry.componentId, entry])
);
for (const packet of packetAssembly.packets) {
  for (const document of packet.documents) {
    const relationship = relationshipByComponent.get(document.componentId);
    ok(
      relationship?.officialFormId === document.documentId,
      `${document.componentId}: assembly document differs from the source relationship.`
    );
    if (EXPECTED_DOCUMENT_IDS.includes(document.documentId)) {
      ok(
        relationship?.sha256 === null,
        `${document.componentId}: a worker unexpectedly changed the captain-owned source pin.`
      );
    }
  }
}
note("4. Assembly: five blocked packets reproduce adopted component identity and ordering exactly.");

// ---------------------------------------------------------------------------
// 5. Field-map and ownership scaffolds contain no invented active fields
// ---------------------------------------------------------------------------

ok(
  fieldMap.familyId === FAMILY_ID && fieldMap.jurisdiction === "MD",
  "Field-map scaffold is not bound to this Maryland family."
);
ok(
  fieldMap.mappingPolicy?.sourceOfFieldNames ===
    "freshly_verified_local_bytes" &&
    fieldMap.mappingPolicy?.candidateArtifactsAreEvidenceOnly === true &&
    fieldMap.mappingPolicy?.activeMappingCountUntilSourceVerification === 0,
  "Field-map policy permits non-verified or active pre-source mappings."
);
ok(
  sameSet(
    fieldMap.forms.map((entry) => entry.documentId),
    EXPECTED_DOCUMENT_IDS
  ),
  "Field-map scaffold does not cover exactly six forms."
);

const fieldMapByDocument = new Map(
  fieldMap.forms.map((entry) => [entry.documentId, entry])
);
for (const requirement of requirements) {
  const form = fieldMapByDocument.get(requirement.documentId);
  const registry = registryByPath.get(requirement.repositorySourcePath);
  ok(Boolean(form), `${requirement.documentId}: field-map scaffold is missing.`);
  if (!form || !registry) continue;
  ok(
    form.mappingReady === false &&
      form.rendererStrategy === "unresolved_pending_verified_inspection",
    `${requirement.documentId}: mapping or renderer is active before inspection.`
  );
  ok(
    Array.isArray(form.mappings) &&
      form.mappings.length === 0 &&
      Array.isArray(form.overlayPlacements) &&
      form.overlayPlacements.length === 0,
    `${requirement.documentId}: scaffold contains an active mapping or overlay.`
  );
  ok(
    form.expectedStructure?.technicalClass === registry.technicalClass &&
      form.expectedStructure?.pageCount === registry.pageCount &&
      form.expectedStructure?.fieldCount === registry.fieldCount &&
      form.expectedStructure?.encrypted === registry.encrypted &&
      form.expectedStructure?.xfa === registry.xfa,
    `${requirement.documentId}: carried-forward structure differs from the source registry.`
  );
  ok(
    form.expectedStructure?.mustVerifyFromMaterializedBytes === true,
    `${requirement.documentId}: carried-forward structure is treated as fresh verification.`
  );
}

ok(
  ownership.schemaVersion === "rcap-official-pdf-field-ownership/v1" &&
    ownership.familyId === FAMILY_ID &&
    ownership.jurisdiction === "MD",
  "Field ownership map is not bound to this Maryland family."
);
ok(
  ownershipSchema.$id === "rcap-md-official-pdf-field-ownership/v1",
  "Field ownership schema has the wrong identity."
);
ok(
  sameSet(
    ownership.forms.map((entry) => entry.documentId),
    EXPECTED_DOCUMENT_IDS
  ),
  "Field ownership map does not cover exactly six forms."
);
ok(
  sameSet(ownership.policy?.mappingAllowedFor ?? [], [
    "participant",
    "system_derived"
  ]),
  "Field ownership permits an owner other than participant or system_derived."
);
for (const prohibitedOwner of [
  "participant_manual",
  "witness_manual",
  "court",
  "judge",
  "clerk",
  "prosecutor",
  "agency",
  "attorney",
  "notary",
  "process_server",
  "prohibited_from_generation"
]) {
  ok(
    ownership.policy?.mustRemainBlank?.includes(prohibitedOwner),
    `Field ownership does not keep ${prohibitedOwner} fields blank.`
  );
}
for (const form of ownership.forms) {
  ok(
    form.status === "pending_materialization" &&
      form.coverageComplete === false &&
      Array.isArray(form.fields) &&
      form.fields.length === 0,
    `${form.documentId}: ownership scaffold claims unverified field coverage.`
  );
  ok(
    form.expectedFieldCount ===
      fieldMapByDocument.get(form.documentId)?.expectedStructure?.fieldCount,
    `${form.documentId}: ownership and field-map expected counts differ.`
  );
}
note("5. Fields: all mappings and ownership rows remain empty pending exact source inspection.");

// ---------------------------------------------------------------------------
// 6. Synthetic fixture contract and typed stops
// ---------------------------------------------------------------------------

ok(
  fixtureSchema.$id === "rcap-md-official-pdf-fixtures/v1",
  "Fixture schema has the wrong identity."
);
ok(
  fixtures.schemaVersion === "rcap-official-pdf-fixtures/v1" &&
    fixtures.familyId === FAMILY_ID &&
    fixtures.syntheticDataOnly === true,
  "Fixture data is not synthetic and family-bound."
);
ok(
  sameSet(
    fixtures.positiveFixtures.map((entry) => entry.trackId),
    EXPECTED_TRACK_IDS
  ),
  "Positive fixture set does not cover exactly five tracks."
);
const positiveFixtureIds = new Set(
  fixtures.positiveFixtures.map((entry) => entry.fixtureId)
);
for (const fixture of fixtures.positiveFixtures) {
  ok(
    fixture.fixtureId.startsWith("md-") &&
      fixture.caseReference.startsWith("SYN-"),
    `${fixture.fixtureId}: fixture identity is not visibly synthetic.`
  );
  ok(
    fixture.currentExpectedResult === "authority_source_gated",
    `${fixture.fixtureId}: fixture claims current render success.`
  );
  ok(
    Object.keys(fixture.facts ?? {}).length >= 6,
    `${fixture.fixtureId}: fixture lacks useful layout facts.`
  );
  ok(
    (fixture.manualFieldsExpectedBlank ?? []).some((entry) =>
      entry.includes("signature")
    ),
    `${fixture.fixtureId}: fixture does not preserve a manual signature blank.`
  );
  for (const [key, value] of Object.entries(fixture.facts ?? {})) {
    if (key.toLowerCase().includes("email")) {
      ok(
        String(value).endsWith(".invalid"),
        `${fixture.fixtureId}: email is not on the reserved .invalid domain.`
      );
    }
  }
}
const boundaryKinds = new Set(
  fixtures.boundaryFixtures.map((entry) => entry.kind)
);
for (const requiredKind of [
  "materialization_required",
  "authority_source_gated",
  "third_party_field_ownership",
  "conditional_companion_only",
  "authority_role_mismatch"
]) {
  ok(
    boundaryKinds.has(requiredKind),
    `Boundary fixtures omit ${requiredKind}.`
  );
}
for (const fixture of fixtures.boundaryFixtures) {
  ok(
    positiveFixtureIds.has(fixture.basedOn),
    `${fixture.fixtureId}: basedOn does not name a positive fixture.`
  );
}
note("6. Fixtures: five synthetic route candidates and five typed fail-closed boundaries are present.");

// ---------------------------------------------------------------------------
// 7. Code contract is data-equivalent and terminal
// ---------------------------------------------------------------------------

ok(
  MARYLAND_REMAINING_OFFICIAL_PDF_FAMILY_ID === FAMILY_ID,
  "TypeScript family id differs from the tracked manifest."
);
ok(
  sameSet(
    MARYLAND_REMAINING_OFFICIAL_PDF_SOURCE_IDENTITIES.map(
      (entry) => entry.documentId
    ),
    EXPECTED_DOCUMENT_IDS
  ),
  "TypeScript source identity set differs from the requirement set."
);
const codeSourceById = new Map(
  MARYLAND_REMAINING_OFFICIAL_PDF_SOURCE_IDENTITIES.map((entry) => [
    entry.documentId,
    entry
  ])
);
for (const requirement of requirements) {
  const codeSource = codeSourceById.get(requirement.documentId);
  ok(Boolean(codeSource), `${requirement.documentId}: TypeScript source identity is missing.`);
  if (!codeSource) continue;
  ok(
    codeSource.sha256 === requirement.expectedSha256 &&
      codeSource.bytes === requirement.expectedBytes &&
      codeSource.mediaType === requirement.expectedMediaType &&
      codeSource.packetRole === requirement.packetRole &&
      codeSource.assetClass === requirement.assetClass &&
      codeSource.materializationDestination ===
        requirement.materializationDestination,
    `${requirement.documentId}: TypeScript and JSON source identities differ.`
  );
}
ok(
  sameSet(
    MARYLAND_REMAINING_OFFICIAL_PDF_PACKETS.map((entry) => entry.trackId),
    EXPECTED_TRACK_IDS
  ),
  "TypeScript packet set differs from the tracked assembly."
);
const codePacketByTrack = new Map(
  MARYLAND_REMAINING_OFFICIAL_PDF_PACKETS.map((entry) => [
    entry.trackId,
    entry
  ])
);
for (const trackId of EXPECTED_TRACK_IDS) {
  const codePacket = codePacketByTrack.get(trackId);
  const trackedPacket = assemblyByTrack.get(trackId);
  ok(Boolean(codePacket), `${trackId}: TypeScript packet contract is missing.`);
  ok(Boolean(trackedPacket), `${trackId}: tracked packet assembly is missing.`);
  if (!codePacket || !trackedPacket) continue;
  const codeDocuments = codePacket.documents.map((document) => ({
    componentId: document.componentId,
    documentId: document.documentId,
    role: document.role,
    requirement: document.requirement,
    conditionKey: document.conditionKey ?? null
  }));
  const trackedDocuments = trackedPacket.documents.map((document) => ({
    componentId: document.componentId,
    documentId: document.documentId,
    role: document.role,
    requirement: document.requirement,
    conditionKey: document.conditionKey ?? null
  }));
  ok(
    JSON.stringify(codeDocuments) === JSON.stringify(trackedDocuments),
    `${trackId}: TypeScript packet components differ from tracked assembly.`
  );
  ok(
    codePacket.runtimeDisabled === true &&
      codePacket.generationAllowed === false &&
      codePacket.blockers.includes("authority_source_gated") &&
      codePacket.blockers.includes("source_materialization_required") &&
      codePacket.blockers.includes("field_mapping_pending"),
    `${trackId}: TypeScript packet contract is not terminal and fail-closed.`
  );
}
ok(
  MARYLAND_REMAINING_ACROFORM_MAPPINGS.length === 0 &&
    MARYLAND_REMAINING_OVERLAY_PLACEMENTS.length === 0,
  "TypeScript module exposes an active mapping before source verification."
);
for (const trackId of EXPECTED_TRACK_IDS) {
  try {
    assertMarylandRemainingOfficialPdfTrackRenderable(trackId);
    ok(false, `${trackId}: fail-closed render assertion returned.`);
  } catch (error) {
    ok(
      error instanceof MarylandOfficialPdfFamilyBlockedError &&
        error.code === "authority_source_gated",
      `${trackId}: fail-closed render assertion did not throw authority_source_gated.`
    );
  }
}
try {
  assertMarylandRemainingOfficialPdfTrackRenderable("md_unknown");
  ok(false, "Unknown Maryland track did not fail.");
} catch (error) {
  ok(
    error instanceof MarylandOfficialPdfFamilyBlockedError &&
      error.code === "unknown_track",
    "Unknown Maryland track did not fail with unknown_track."
  );
}
const centralRegistrySource = fs.readFileSync(
  path.join(root, "src/lib/rcap/packets/registry.ts"),
  "utf8"
);
ok(
  !centralRegistrySource.includes(
    "jurisdictions/maryland/official-pdf/family"
  ),
  "Fail-closed Maryland scaffold was imported by the central registry."
);
note("7. Code: JSON and TypeScript identities agree; every route throws a typed terminal stop.");

// ---------------------------------------------------------------------------
// 8. Current checkout source state
// ---------------------------------------------------------------------------

const selectedRequirements = args.documentId
  ? requirements.filter((entry) => entry.documentId === args.documentId)
  : requirements;
if (args.documentId) {
  ok(
    selectedRequirements.length === 1,
    `Unknown --document-id ${args.documentId}.`
  );
}

const materialized = [];
const absent = [];
for (const requirement of selectedRequirements) {
  const absolutePath = path.join(root, requirement.materializationDestination);
  if (!fs.existsSync(absolutePath)) {
    absent.push(requirement.documentId);
    if (args.requireMaterialized) {
      ok(false, `${requirement.documentId}: exact source is not materialized.`);
    }
    continue;
  }

  materialized.push(requirement.documentId);
  const stat = fs.statSync(absolutePath);
  ok(stat.isFile(), `${requirement.documentId}: source destination is not a file.`);
  const realPath = fs.realpathSync(absolutePath);
  const relativeRealPath = path.relative(root, realPath);
  ok(
    relativeRealPath !== "" &&
      !relativeRealPath.startsWith("../") &&
      !path.isAbsolute(relativeRealPath),
    `${requirement.documentId}: source resolves outside this checkout.`
  );

  const bytes = fs.readFileSync(absolutePath);
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  ok(
    bytes.byteLength === requirement.expectedBytes,
    `${requirement.documentId}: byte count mismatch (${bytes.byteLength}, expected ${requirement.expectedBytes}).`
  );
  ok(
    sha256 === requirement.expectedSha256,
    `${requirement.documentId}: SHA-256 mismatch (${sha256}).`
  );
  ok(
    bytes.subarray(0, 5).toString("ascii") === "%PDF-",
    `${requirement.documentId}: bytes do not have a PDF signature.`
  );

  const latin = bytes.toString("latin1");
  const expected = fieldMapByDocument.get(requirement.documentId)?.expectedStructure;
  ok(
    /\/XFA\b/.test(latin) === expected?.xfa,
    `${requirement.documentId}: XFA state differs from the carried requirement.`
  );
  ok(
    /\/Encrypt\b/.test(latin) === expected?.encrypted,
    `${requirement.documentId}: encryption state differs from the carried requirement.`
  );
  if (!expected?.encrypted && !expected?.xfa) {
    try {
      const document = await PDFDocument.load(bytes, { updateMetadata: false });
      ok(
        document.getPageCount() === expected.pageCount,
        `${requirement.documentId}: page count differs from the requirement.`
      );
      ok(
        document.getForm().getFields().length === expected.fieldCount,
        `${requirement.documentId}: field count differs from the requirement.`
      );
    } catch (error) {
      ok(
        false,
        `${requirement.documentId}: exact bytes could not be parsed (${String(
          error?.message ?? error
        ).slice(0, 120)}).`
      );
    }
  }

  // A source custodian may verify one binary before implementation. A normal
  // family run must not remain green once source bytes appear while mapping and
  // ownership are still empty.
  if (!args.sourceOnly) {
    ok(
      false,
      `${requirement.documentId}: exact source is now materialized; continue through fresh inspection, full ownership classification, field mapping, deterministic sample rendering, and visual artifacts before this verifier may pass.`
    );
  }
}

if (!args.requireMaterialized) {
  ok(
    absent.length + materialized.length === selectedRequirements.length,
    "Source-state accounting is incomplete."
  );
}
note(
  `8. Checkout: ${materialized.length} exact selected source(s) materialized; ${absent.length} absent and fail-closed.`
);

// ---------------------------------------------------------------------------
// 9. Review artifact truthfulness
// ---------------------------------------------------------------------------

ok(
  review.familyId === FAMILY_ID &&
    review.jurisdiction === "MD" &&
    review.legalDesignChanged === false &&
    review.existingTrancheChanged === false,
  "Review manifest changes legal design or the existing tranche."
);
ok(
  review.sourceReview === "pending_materialization" &&
    review.technicalReview === "pending_materialization" &&
    review.visualReview === "pending_materialization",
  "Review manifest claims a review that cannot occur without exact sources."
);
ok(
  Array.isArray(review.samplePackets) &&
    review.samplePackets.length === 0 &&
    Array.isArray(review.visualInspectionArtifacts) &&
    review.visualInspectionArtifacts.length === 0,
  "Review manifest lists sample or visual artifacts without source-backed rendering."
);
ok(
  review.promotion?.packetReady === false &&
    review.promotion?.generationAllowed === false &&
    review.promotion?.enabled === false,
  "Review manifest claims promotion readiness."
);
note("9. Review: no sample, visual, legal, generation, or promotion claim is fabricated.");

if (failures.length > 0) {
  if (args.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          familyId: FAMILY_ID,
          result: "failed",
          failures,
          notes,
          materialized,
          absent
        },
        null,
        2
      )}\n`
    );
  } else {
    process.stderr.write("Maryland official-PDF family verification failed:\n");
    for (const failure of failures) process.stderr.write(`- ${failure}\n`);
  }
  process.exitCode = 1;
} else if (args.json) {
  process.stdout.write(
    `${JSON.stringify(
      {
        familyId: FAMILY_ID,
        result: "passed",
        checks: notes.length,
        notes,
        materialized,
        absent,
        routeCount: EXPECTED_TRACK_IDS.length,
        documentCount: EXPECTED_DOCUMENT_IDS.length,
        activeMappings: 0,
        activeOverlayPlacements: 0,
        runtimeEnabled: false
      },
      null,
      2
    )}\n`
  );
} else {
  process.stdout.write(
    `Maryland official-PDF family verification passed (${notes.length} sections).\n`
  );
  for (const entry of notes) process.stdout.write(`- ${entry}\n`);
}

function parseArgs(argv) {
  const result = {
    documentId: null,
    requireMaterialized: false,
    sourceOnly: false,
    json: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--document-id") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--document-id requires a value.");
      }
      result.documentId = value;
      index += 1;
    } else if (arg.startsWith("--document-id=")) {
      result.documentId = arg.slice("--document-id=".length);
    } else if (arg === "--require-materialized") {
      result.requireMaterialized = true;
    } else if (arg === "--json") {
      result.json = true;
    } else {
      throw new Error(`Unknown argument ${arg}.`);
    }
  }
  if (result.requireMaterialized && !result.documentId) {
    throw new Error("--require-materialized requires --document-id.");
  }
  result.sourceOnly = Boolean(result.requireMaterialized && result.documentId);
  return result;
}

function sameSet(left, right) {
  return (
    new Set(left).size === left.length &&
    new Set(right).size === right.length &&
    [...left].sort().join("\u0000") === [...right].sort().join("\u0000")
  );
}

function stable(value) {
  return JSON.stringify(value, Object.keys(value[0] ?? {}).sort());
}
