#!/usr/bin/env node

// Hawaii HCJDC official-PDF family verifier.
//
// A normal run succeeds only while the state-scoped artifacts accurately
// describe a disabled, zero-mapping, zero-sample scaffold. The negative CLI
// gates intentionally fail when asked to require a materialized source,
// selectable candidate, or renderable route.
//
// This verifier reads repository metadata as identity evidence. It never
// resolves or opens a repositorySourcePath/private path and has no acquisition
// or materialization mode.

import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const {
  HAWAII_OFFICIAL_PDF_ACTIVE_FIELD_MAPPINGS,
  HAWAII_OFFICIAL_PDF_ACTIVE_OVERLAY_PLACEMENTS,
  HAWAII_OFFICIAL_PDF_ACTIVE_RENDERERS,
  HAWAII_OFFICIAL_PDF_CANDIDATE_EVIDENCE,
  HAWAII_OFFICIAL_PDF_FAMILY_ID,
  HAWAII_OFFICIAL_PDF_FORM_IDS,
  HAWAII_OFFICIAL_PDF_ROUTE_BOUNDARIES,
  HAWAII_OFFICIAL_PDF_SOURCE_BACKED_SAMPLES,
  HAWAII_OFFICIAL_PDF_SOURCE_BOUNDARIES,
  HAWAII_OFFICIAL_PDF_TRACK_IDS,
  HawaiiOfficialPdfFamilyBlockedError,
  assertHawaiiCandidateEvidenceSelectable,
  assertHawaiiOfficialPdfDocumentReady,
  assertHawaiiOfficialPdfTrackRenderable,
  renderHawaiiOfficialPdfFamilyPacket
} = await import(
  "@/lib/rcap/packets/jurisdictions/hawaii/official-pdf/family"
);

const args = parseArgs(process.argv.slice(2));
const root = process.cwd();
const familyDir = path.join(
  root,
  "data/record-clearing/production-factory/official-pdf-families/HI"
);

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const readFamilyJson = (fileName) =>
  JSON.parse(fs.readFileSync(path.join(familyDir, fileName), "utf8"));

const manifest = readFamilyJson("family-manifest.json");
const dependencies = readFamilyJson("dependencies.json");
const sourceRequirements = readFamilyJson("source-requirements.json");
const fieldMap = readFamilyJson("field-map-scaffold.json");
const renderer = readFamilyJson("renderer-scaffold.json");
const ownership = readFamilyJson("field-ownership.json");
const ownershipSchema = readFamilyJson("field-ownership.schema.json");
const fixtures = readFamilyJson("fixtures.json");
const fixtureSchema = readFamilyJson("fixtures.schema.json");
const packetAssembly = readFamilyJson("packet-assembly.json");
const review = readFamilyJson("review-manifest.json");

const authority = readJson("data/record-clearing/master-library/authority.json");
const sourceRegistry = readJson(
  "data/record-clearing/source-artifact-registry.json"
);
const authorityAudit = readJson(
  "data/record-clearing/master-library/repository-asset-audit.json"
);
const candidateDispositions = readJson(
  "data/record-clearing/master-library/edition-1-2/candidate-dispositions.json"
);
const sourceAcquisitionQueue = readJson(
  "data/record-clearing/master-library/source-acquisition-queue.json"
);
const sourceAudit = readJson(
  "data/record-clearing/master-library/track-source-audit.json"
);
const relationships = readJson(
  "data/record-clearing/legal-design-track-source-relationships.json"
);
const packetSets = readJson(
  "data/record-clearing/legal-design-packet-set-manifests.json"
);
const hawaiiMemo = readJson(
  "data/record-clearing/legal-design-intake/HI.memo.json"
);
const productionQueue = readJson(
  "data/record-clearing/production-factory/official-pdf-production-queue.json"
);

const failures = [];
const notes = [];
const ok = (condition, message) => {
  if (!condition) failures.push(message);
};
const note = (message) => notes.push(message);

const FAMILY_ID = "rcap-hi-official-pdf-family";
const EXPECTED_FORM_IDS = ["HCJDC-159", "HCJDC-159B"];
const EXPECTED_TRACK_IDS = [
  "hi_nonconviction_expungement",
  "hi_dag_danc_expungement",
  "hi_712_1200_deferred_expungement",
  "hi_first_time_drug_offender_expungement",
  "hi_marijuana_three_grams_expungement",
  "hi_pre_2004_drug_offender_expungement",
  "hi_first_time_property_offender_expungement",
  "hi_under_21_dui_expungement"
];
const EXPECTED_CANDIDATE_IDS = [
  "expungement-application-rev-2026-06",
  "hawaii-expungement-reference",
  "revised-exp-application-2019-11"
];
const CONVICTION_STAGE_ONE_TRACK_IDS = [
  "hi_first_time_drug_offender_expungement",
  "hi_marijuana_three_grams_expungement",
  "hi_pre_2004_drug_offender_expungement",
  "hi_first_time_property_offender_expungement",
  "hi_under_21_dui_expungement"
];
const HASH_PATTERN = /^[a-f0-9]{64}$/;

// ---------------------------------------------------------------------------
// 1. Family boundary and artifact inventory
// ---------------------------------------------------------------------------

ok(manifest.familyId === FAMILY_ID, "Family manifest has the wrong familyId.");
ok(manifest.jurisdiction === "HI", "Family manifest is not Hawaii-scoped.");
ok(
  manifest.productionQueuePriority === 11,
  "Family manifest no longer carries queue priority 11."
);
ok(
  sameSet(manifest.scope?.trackIds ?? [], EXPECTED_TRACK_IDS),
  "Family manifest track scope differs from the eight official-PDF routes."
);
ok(
  sameSet(manifest.scope?.officialFormIds ?? [], EXPECTED_FORM_IDS),
  "Family manifest document scope differs from HCJDC-159 and HCJDC-159B."
);
ok(
  manifest.scope?.officialPdfComponentCount === 8 &&
    manifest.scope?.documentIdentityCount === 2,
  "Family manifest has incorrect component or document counts."
);
ok(
  manifest.status?.legalDesignChanged === false &&
    manifest.status?.sourceBackedSampleCount === 0 &&
    manifest.status?.packetReady === false &&
    manifest.status?.generationAllowed === false &&
    manifest.status?.enabled === false,
  "Family manifest claims design mutation, samples, readiness, or enablement."
);
ok(
  manifest.sourceMaterialization?.assignmentAnchor === null &&
    manifest.sourceMaterialization?.portableProjection === null &&
    manifest.sourceMaterialization?.portableProjectionAvailable === false &&
    manifest.sourceMaterialization?.workerReady === false &&
    manifest.sourceMaterialization?.workerMaterializationAuthorized === false &&
    manifest.sourceMaterialization?.workerReadAuthorized === false &&
    manifest.sourceMaterialization?.workerMayAcquireOrDownloadSources === false,
  "Family manifest fabricates assignment, projection, worker authority, or readiness."
);
ok(
  manifest.sourceMaterialization?.repositorySourcePathTreatment ===
      "identity_evidence_only_never_worker_source" &&
    manifest.sourceMaterialization
      ?.generatedOrHistoricalSampleMaySubstituteForSource === false &&
    manifest.sourceMaterialization
      ?.unmanifestedCandidateMaySubstituteForAuthorityAsset === false,
  "Family manifest permits a repository path, sample, or candidate source fallback."
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
  "Hawaii fail-closed implementation module is missing."
);
ok(
  manifest.dedicatedVerifier ===
    "scripts/verify-rcap-hawaii-hcjdc-official-pdf-family.mjs",
  "Family manifest names the wrong dedicated verifier."
);
note(
  "1. Boundary: twelve Hawaii-scoped artifacts exist; the family is disabled and isolated."
);

// ---------------------------------------------------------------------------
// 2. Queue, authority, and source relationship identity
// ---------------------------------------------------------------------------

const queueFamily = productionQueue.families.find(
  (entry) => entry.familyId === FAMILY_ID
);
ok(Boolean(queueFamily), "Hawaii family is absent from the production queue.");
if (queueFamily) {
  ok(
    queueFamily.jurisdiction === "HI" &&
      queueFamily.priority === 11 &&
      queueFamily.workerReady === false &&
      queueFamily.packetReady === false &&
      queueFamily.enabled === false,
    "Production queue Hawaii family changed readiness or identity."
  );
  ok(
    sameSet(queueFamily.trackIds ?? [], EXPECTED_TRACK_IDS),
    "Production queue Hawaii track set changed."
  );
  ok(
    sameSet(
      (queueFamily.documents ?? []).map((entry) => entry.officialFormId),
      EXPECTED_FORM_IDS
    ),
    "Production queue Hawaii document set changed."
  );
  ok(
    queueFamily.counts?.exactSourceRequirementCount === 0 &&
      queueFamily.counts?.unresolvedSourceIdentityCount === 2,
    "Production queue no longer reports zero exact sources and two unresolved identities."
  );
}

const hiRelationships = relationships.relationships.filter(
  (entry) => entry.jurisdiction === "HI"
);
ok(
  hiRelationships.length === 8,
  "Hawaii source relationship count is not eight."
);
for (const relationship of hiRelationships) {
  ok(
    EXPECTED_TRACK_IDS.includes(relationship.trackId) &&
      EXPECTED_FORM_IDS.includes(relationship.officialFormId),
    `${relationship.componentId}: unexpected Hawaii source relationship.`
  );
  ok(
    relationship.sha256 === null &&
      relationship.officialSourceUrl === null &&
      relationship.corpusState === "unchecked",
    `${relationship.componentId}: source relationship unexpectedly gained a source pin or URL.`
  );
}

const hiSourceRows = sourceAcquisitionQueue.rows.filter(
  (entry) => entry.jurisdiction === "HI"
);
const inScopeSourceRows = hiSourceRows.filter((entry) =>
  EXPECTED_TRACK_IDS.includes(entry.trackId)
);
ok(
  inScopeSourceRows.length === 8,
  "Hawaii source-acquisition identity row count is not eight."
);
for (const row of inScopeSourceRows) {
  ok(
    EXPECTED_FORM_IDS.includes(row.expectedDocumentId) &&
      row.expectedDocumentRole === "primary_filing" &&
      row.currentEditionStatus === "authority_unmanifested_source" &&
      row.sourceIdentityConfidence === "document_identity_known" &&
      row.edition12Disposition === "identity_established_binary_unavailable" &&
      row.runtimeEffect === "runtime_disabled",
    `${row.componentId}: source-acquisition posture changed.`
  );
}

const hiSourceAuditTracks = sourceAudit.tracks.filter(
  (entry) => entry.jurisdiction === "HI" && EXPECTED_TRACK_IDS.includes(entry.trackId)
);
ok(
  hiSourceAuditTracks.length === 8,
  "Hawaii track-source audit no longer covers all eight routes."
);
for (const track of hiSourceAuditTracks) {
  const officialComponents = track.components.filter(
    (component) => component.outputStrategy === "official_pdf_fill"
  );
  ok(
    officialComponents.length === 1,
    `${track.trackId}: expected exactly one official-PDF component.`
  );
  for (const component of officialComponents) {
    ok(
      component.result === "authority_unmanifested_source" &&
        component.asset === null &&
        component.sha256Verified === false,
      `${component.componentId}: track-source audit no longer fails closed.`
    );
  }
}
note(
  "2. Identity: queue, acquisition rows, relationships, and track audit still declare two unmanifested form identities."
);

// ---------------------------------------------------------------------------
// 3. Source requirement scaffold and exact non-selectable candidate pins
// ---------------------------------------------------------------------------

ok(
  sourceRequirements.schemaVersion ===
      "rcap-source-materialization-scaffold/v1" &&
    sourceRequirements.normativeRequirementSchema ===
      "rcap-source-materialization-requirement/v1" &&
    sourceRequirements.contractKind ===
      "dependency_scaffold_not_worker_assignment",
  "Source requirements have the wrong scaffold contract."
);
ok(
  sourceRequirements.familyId === FAMILY_ID &&
    sourceRequirements.jurisdiction === "HI" &&
    sourceRequirements.authorityEdition === `master-library/${authority.edition}` &&
    sourceRequirements.authorityArchiveSha256 ===
      authority.retention.archiveSha256,
  "Source requirements are not bound to the Hawaii family and adopted edition."
);
ok(
  sourceRequirements.assignmentAnchor === null &&
    sourceRequirements.portableProjection === null &&
    sourceRequirements.portableProjectionAvailable === false &&
    sourceRequirements.workerMaterializationAuthorized === false &&
    sourceRequirements.workerReadAuthorized === false &&
    sourceRequirements.workerMayAcquireOrDownloadSources === false &&
    sourceRequirements.workerReady === false,
  "Source requirements fabricate assignment, projection, or worker authority."
);
ok(
  sourceRequirements.counts?.exactAuthoritySourceRequirements === 0 &&
    sourceRequirements.counts?.authorityUnmanifestedDocuments === 2 &&
    sourceRequirements.counts?.exactCandidateEvidencePins === 3 &&
    sourceRequirements.counts?.candidateEvidenceMappedToAuthorityIdentity ===
      0 &&
    sourceRequirements.counts?.captainProjectedExactSources === 0,
  "Source requirement counts overstate authority mapping or materialization."
);

const requirements = sourceRequirements.requirements ?? [];
ok(
  sameSet(
    requirements.map((entry) => entry.officialFormId),
    EXPECTED_FORM_IDS
  ),
  "Source requirement set differs from the two known form identities."
);
for (const requirement of requirements) {
  const prefix = requirement.officialFormId;
  ok(
    requirement.authorityState === "authority_unmanifested_source" &&
      requirement.identityBindingStatus ===
        "document_identity_known_exact_authority_asset_unresolved" &&
      requirement.sourceIdentityConfidence === "document_identity_known",
    `${prefix}: source identity state is overstated or changed.`
  );
  ok(
    requirement.authorityDocumentId === null &&
      requirement.workflowKey === null &&
      requirement.officialTitle === null &&
      requirement.issuingAuthority === null &&
      requirement.officialSourceUrl === null &&
      requirement.revision === null &&
      requirement.assetClass === null &&
      requirement.canonicalAuthorityPath === null,
    `${prefix}: requirement fabricates an adopted authority asset identity.`
  );
  ok(
    requirement.expectedSha256 === null &&
      requirement.expectedBytes === null &&
      requirement.expectedMediaType === null &&
      requirement.proposedMaterializationDestination === null &&
      requirement.verificationCommand === null,
    `${prefix}: requirement fabricates exact bytes, a destination, or a command.`
  );
  ok(
    requirement.packetCandidate === false &&
      requirement.generationAllowed === false &&
      requirement.workerMaterializationAuthorized === false &&
      requirement.workerReadAuthorized === false &&
      requirement.captainAssignmentEligibility ===
        "ineligible_until_successor_authority_edition_manifests_exact_asset",
    `${prefix}: unmanifested identity became selectable or worker-authorized.`
  );
  ok(
    sameSet(
      requirement.proposedCandidateEvidenceIds ?? [],
      EXPECTED_CANDIDATE_IDS
    ) &&
      requirement.candidateEvidenceTreatment ===
        "unmapped_hold_provenance_evidence_never_source",
    `${prefix}: candidate evidence treatment changed.`
  );

  const expectedBindings = hiRelationships
    .filter((entry) => entry.officialFormId === prefix)
    .map((entry) => ({
      trackId: entry.trackId,
      componentId: entry.componentId,
      role: "primary_filing",
      order: componentOrder(entry.trackId, entry.componentId)
    }));
  ok(
    stable(requirement.usageBindings) === stable(expectedBindings),
    `${prefix}: usage bindings differ from normalized relationships and packet order.`
  );
}

const dispositionById = new Map(
  candidateDispositions.decisions
    .filter((entry) => entry.jurisdiction === "HI")
    .map((entry) => [entry.candidateId, entry])
);
const registryByPath = new Map(
  sourceRegistry.artifacts
    .filter((entry) => entry.jurisdiction === "HI" && entry.fileType === "pdf")
    .map((entry) => [entry.sourcePath, entry])
);
const auditByPath = new Map(
  authorityAudit.assets
    .filter((entry) => entry.jurisdiction === "HI" && entry.fileType === "pdf")
    .map((entry) => [entry.sourcePath, entry])
);
const evidence = sourceRequirements.candidateEvidence ?? [];
ok(
  sameSet(
    evidence.map((entry) => entry.candidateId),
    EXPECTED_CANDIDATE_IDS
  ),
  "Candidate evidence set differs from the three exact Hawaii pins."
);
for (const candidate of evidence) {
  const prefix = candidate.candidateId;
  const disposition = dispositionById.get(prefix);
  const registry = registryByPath.get(candidate.repositoryPath);
  const audit = auditByPath.get(candidate.repositoryPath);
  ok(Boolean(disposition), `${prefix}: Edition 1.2 disposition is missing.`);
  ok(Boolean(registry), `${prefix}: source registry evidence is missing.`);
  ok(Boolean(audit), `${prefix}: repository audit evidence is missing.`);
  ok(
    HASH_PATTERN.test(candidate.sha256) &&
      Number.isInteger(candidate.bytes) &&
      candidate.bytes > 0,
    `${prefix}: candidate pin is malformed.`
  );
  if (disposition) {
    ok(
      disposition.sha256 === candidate.sha256 &&
        disposition.bytes === candidate.bytes &&
        disposition.edition12Disposition === "hold_provenance" &&
        disposition.runtimeEffect === "not_resolver_selectable",
      `${prefix}: candidate disposition differs from scaffold evidence.`
    );
  }
  if (registry) {
    ok(
      registry.inventorySha256 === candidate.sha256 &&
        registry.measuredSha256 === candidate.sha256 &&
        registry.sizeBytes === candidate.bytes &&
        registry.technicalClass === candidate.historicalTechnicalClass &&
        registry.pageCount === candidate.historicalPageCount &&
        registry.fieldCount === candidate.historicalFieldCount,
      `${prefix}: source-registry measurement differs from candidate evidence.`
    );
  }
  if (audit) {
    ok(
      audit.sha256 === candidate.sha256 &&
        audit.status === "unmanifested_repository_asset",
      `${prefix}: repository audit does not preserve unmanifested status.`
    );
  }
  ok(
    candidate.repositoryPath.startsWith("private/") &&
      candidate.repositoryPathTreatment ===
        "identity_evidence_only_never_worker_source" &&
      candidate.authorityRelationship === "none_unmapped_candidate" &&
      candidate.maySatisfyRequirement === false,
    `${prefix}: a private path or candidate is treated as a worker source.`
  );
}
ok(
  sourceRequirements.provenance?.freshLocalVerification === false &&
    sourceRequirements.provenance?.registryPresenceConfersReadiness === false &&
    sourceRequirements.provenance
      ?.privateRepositoryPathsWereResolvedOrReadByWorker === false &&
    sourceRequirements.provenance?.candidatePinsConferAuthority === false &&
    sourceRequirements.provenance
      ?.candidatePinsConferMaterializationReadiness === false,
  "Source provenance overstates fresh verification, authority, or readiness."
);
note(
  "3. Sources: three exact candidate pins reconcile as inert hold_provenance evidence; zero exact authority requirements exist."
);

// ---------------------------------------------------------------------------
// 4. Dependencies preserve source, legal-design, and compatibility gates
// ---------------------------------------------------------------------------

ok(
  dependencies.familyId === FAMILY_ID && dependencies.jurisdiction === "HI",
  "Dependency declaration is not bound to this Hawaii family."
);
const dependencyById = new Map(
  (dependencies.dependencies ?? []).map((entry) => [
    entry.dependencyId,
    entry
  ])
);
for (const dependencyId of [
  "hi-successor-authority-edition-source-identities",
  "hi-captain-assignment-and-portable-projection",
  "hi-candidate-authority-reconciliation",
  "hi-current-hcjdc-form-and-instructions",
  "hi-deferred-route-guidance-specifications",
  "hi-712-1200-waiting-period-legal-design",
  "hi-conviction-stage-one-legal-design",
  "hi-projected-source-technical-inspection",
  "hi-field-map-and-ownership-completion",
  "hi-source-backed-samples-and-review"
]) {
  ok(
    dependencyById.get(dependencyId)?.status === "blocked",
    `${dependencyId}: required blocker is missing or not blocked.`
  );
}
ok(
  dependencyById.get("hi-adjacent-surface-isolation")?.status === "satisfied",
  "Hawaii adjacent-surface isolation is not recorded as satisfied."
);
ok(
  dependencyById.get("hi-captain-assignment-and-portable-projection")
      ?.assignmentAnchor === null &&
    dependencyById.get("hi-captain-assignment-and-portable-projection")
      ?.portableProjection === null &&
    dependencyById.get("hi-captain-assignment-and-portable-projection")
      ?.workerMayResolveByPrivatePath === false &&
    dependencyById.get("hi-captain-assignment-and-portable-projection")
      ?.workerMayAcquireOrDownload === false,
  "Captain dependency fabricates assignment/projection or permits worker resolution."
);
ok(
  sameSet(
    dependencyById.get("hi-conviction-stage-one-legal-design")?.trackIds ??
      [],
    CONVICTION_STAGE_ONE_TRACK_IDS
  ),
  "Conviction stage-one dependency track set changed."
);
note(
  "4. Dependencies: authority, captain projection, guidance, legal-design, mapping, review, and compatibility remain independent."
);

// ---------------------------------------------------------------------------
// 5. Packet assembly copies the adopted component sequence exactly
// ---------------------------------------------------------------------------

ok(
  packetAssembly.familyId === FAMILY_ID &&
    packetAssembly.jurisdiction === "HI",
  "Packet assembly is not bound to this Hawaii family."
);
ok(
  packetAssembly.assemblyPolicy?.currentGenerationAllowed === false &&
    packetAssembly.assemblyPolicy?.runtimeIntegrationAllowed === false &&
    packetAssembly.assemblyPolicy?.legacyPrivatePathLookupAllowed === false &&
    packetAssembly.assemblyPolicy?.downloadOrSourceFallbackAllowed === false &&
    packetAssembly.assemblyPolicy?.candidateEvidenceSourceFallbackAllowed ===
      false &&
    packetAssembly.assemblyPolicy?.generatedSampleSourceFallbackAllowed ===
      false,
  "Packet assembly permits generation, integration, or a prohibited source fallback."
);
const normalizedPacketByTrack = new Map(
  packetSets.packetSets
    .filter(
      (entry) =>
        entry.jurisdiction === "HI" && EXPECTED_TRACK_IDS.includes(entry.trackId)
    )
    .map((entry) => [entry.trackId, entry])
);
const assemblyByTrack = new Map(
  (packetAssembly.packets ?? []).map((entry) => [entry.trackId, entry])
);
ok(
  sameSet([...assemblyByTrack.keys()], EXPECTED_TRACK_IDS),
  "Packet assembly does not contain exactly the eight official-PDF routes."
);
for (const trackId of EXPECTED_TRACK_IDS) {
  const normalized = normalizedPacketByTrack.get(trackId);
  const assembly = assemblyByTrack.get(trackId);
  ok(Boolean(normalized), `${trackId}: normalized packet set is missing.`);
  ok(Boolean(assembly), `${trackId}: packet assembly scaffold is missing.`);
  if (!normalized || !assembly) continue;

  const expectedComponents = normalized.components.map(componentIdentity);
  const actualComponents = assembly.components.map(componentIdentity);
  ok(
    stable(actualComponents) === stable(expectedComponents),
    `${trackId}: packet component sequence differs from the adopted packet set.`
  );
  ok(
    assembly.generationState === "blocked" &&
      assembly.blockingReasonCodes.includes("authority_unmanifested_source") &&
      assembly.blockingReasonCodes.includes("captain_assignment_required") &&
      assembly.blockingReasonCodes.includes("portable_projection_required") &&
      assembly.blockingReasonCodes.includes("field_mapping_pending") &&
      assembly.blockingReasonCodes.includes("generation_disabled"),
    `${trackId}: packet assembly is not fail-closed on source and rendering gates.`
  );
  ok(
    assembly.components.every(
      (component) => component.rendererStrategy === null
    ),
    `${trackId}: packet assembly selects a renderer.`
  );

  if (trackId === "hi_712_1200_deferred_expungement") {
    ok(
      assembly.blockingReasonCodes.includes(
        "legal_design_waiting_period_blocker"
      ) &&
        assembly.components[1]?.legalDesignState ===
          "blocked_until_three_year_rule_and_section_712_1200_branch_confirmed",
      "Section 712-1200 waiting-period legal-design blocker was lost."
    );
  }
  if (CONVICTION_STAGE_ONE_TRACK_IDS.includes(trackId)) {
    ok(
      assembly.blockingReasonCodes.includes(
        "conviction_stage_one_legal_design_blocker"
      ) &&
        assembly.components[0]?.familyTreatment ===
          "external_required_component" &&
        assembly.components[0]?.outputStrategy === "custom_pleading" &&
        assembly.components[1]?.legalDesignState ===
          "packet_capable_stage_2_after_signed_court_order",
      `${trackId}: staged conviction design was changed.`
    );
  }
}
ok(
  (packetAssembly.excludedTracks ?? []).some(
    (entry) =>
      entry.trackId === "hi_state_initiated_marijuana_pilot" &&
      entry.reason.includes("process_guidance")
  ),
  "State-initiated marijuana pilot is not explicitly excluded as guidance."
);
note(
  "5. Assembly: eight blocked sequences reproduce adopted component identity, ordering, and staged-route boundaries."
);

// ---------------------------------------------------------------------------
// 6. Field, renderer, ownership, and fixture scaffolds are zero-active
// ---------------------------------------------------------------------------

ok(
  fieldMap.familyId === FAMILY_ID &&
    fieldMap.jurisdiction === "HI" &&
    fieldMap.activeMappingCount === 0 &&
    fieldMap.activeOverlayPlacementCount === 0,
  "Field-map scaffold is not Hawaii-bound and zero-active."
);
ok(
  fieldMap.mappingPolicy?.sourceOfFieldNames ===
      "freshly_verified_captain_projected_exact_authority_bytes" &&
    fieldMap.mappingPolicy?.authorityAssetRequired === true &&
    fieldMap.mappingPolicy?.captainAssignmentRequired === true &&
    fieldMap.mappingPolicy?.portableProjectionRequired === true &&
    fieldMap.mappingPolicy?.repositoryCandidateArtifactsAreEvidenceOnly ===
      true &&
    fieldMap.mappingPolicy?.activeMappingCountUntilAllGatesPass === 0,
  "Field-map policy permits unverified or candidate-backed mapping."
);
ok(
  sameSet(
    fieldMap.forms.map((entry) => entry.officialFormId),
    EXPECTED_FORM_IDS
  ),
  "Field-map form set differs from the known document identities."
);
for (const form of fieldMap.forms) {
  ok(
    form.authorityState === "authority_unmanifested_source" &&
      form.rendererStrategy === null &&
      form.mappingReady === false &&
      form.expectedStructure === null &&
      Array.isArray(form.candidateRendererStrategies) &&
      form.candidateRendererStrategies.length === 0 &&
      Array.isArray(form.mappings) &&
      form.mappings.length === 0 &&
      Array.isArray(form.overlayPlacements) &&
      form.overlayPlacements.length === 0,
    `${form.officialFormId}: field-map scaffold invents structure, renderer, or mappings.`
  );
}

ok(
  renderer.familyId === FAMILY_ID &&
    renderer.jurisdiction === "HI" &&
    renderer.enabled === false &&
    renderer.activeRendererCount === 0 &&
    renderer.rendererAdapters.every((entry) => entry.enabled === false) &&
    renderer.documents.every(
      (entry) =>
        entry.sourceAuthorityState === "authority_unmanifested_source" &&
        entry.candidateRenderer === null &&
        entry.activeRenderer === null
    ),
  "Renderer scaffold contains an active or selected renderer."
);
ok(
  renderer.renderContract?.sourceMutationAllowed === false &&
    renderer.renderContract?.sourceAcquisitionAllowed === false &&
    renderer.renderContract?.legacyPrivatePathReadAllowed === false &&
    renderer.renderContract?.candidateSourceSubstitutionAllowed === false &&
    renderer.renderContract?.currentRenderingAllowed === false,
  "Renderer contract permits mutation, acquisition, private reads, substitution, or rendering."
);

ok(
  ownershipSchema.$id === "rcap-hi-official-pdf-field-ownership/v1" &&
    ownership.schemaVersion === "rcap-official-pdf-field-ownership/v1" &&
    ownership.familyId === FAMILY_ID &&
    ownership.jurisdiction === "HI",
  "Field ownership schema or map has the wrong identity."
);
ok(
  sameSet(
    ownership.forms.map((entry) => entry.officialFormId),
    EXPECTED_FORM_IDS
  ),
  "Field ownership map does not cover exactly two form identities."
);
ok(
  sameSet(ownership.policy?.mappingAllowedFor ?? [], [
    "participant",
    "system_derived"
  ]) &&
    ownership.policy?.unclassifiedMappingAllowed === false &&
    ownership.policy?.signatureImagesGenerated === false &&
    ownership.policy?.sourceInspectionRequired === true,
  "Field ownership permits unsafe owner classes or skips source inspection."
);
for (const owner of [
  "participant_manual",
  "court",
  "judge",
  "clerk",
  "prosecutor",
  "law_enforcement",
  "agency",
  "attorney",
  "notary",
  "witness",
  "process_server",
  "prohibited_from_generation"
]) {
  ok(
    ownership.policy?.mustRemainBlank?.includes(owner),
    `Field ownership does not keep ${owner} fields blank.`
  );
}
for (const form of ownership.forms) {
  ok(
    form.sourceAuthorityState === "authority_unmanifested_source" &&
      form.status === "blocked_authority_unmanifested" &&
      form.expectedFieldCount === null &&
      form.coverageComplete === false &&
      Array.isArray(form.fields) &&
      form.fields.length === 0 &&
      form.knownManualCompletionItems.every(
        (entry) =>
          entry.owner === "participant_manual" &&
          entry.mappingState ===
            "semantic_policy_only_no_pdf_field_asserted"
      ),
    `${form.officialFormId}: ownership scaffold claims fields or completed coverage.`
  );
}

ok(
  fixtureSchema.$id === "rcap-hi-official-pdf-fixtures/v1" &&
    fixtures.schemaVersion === "rcap-official-pdf-fixtures/v1" &&
    fixtures.familyId === FAMILY_ID &&
    fixtures.jurisdiction === "HI" &&
    fixtures.fixtureKind === "preflight_contract_only" &&
    fixtures.containsParticipantFactValues === false,
  "Fixture schema or data has the wrong identity or contains participant values."
);
ok(
  fixtures.renderedSampleCount === 0 &&
    Array.isArray(fixtures.sampleArtifacts) &&
    fixtures.sampleArtifacts.length === 0,
  "Fixture scaffold fabricates a rendered sample."
);
ok(
  sameSet(
    fixtures.routeFixtures.map((entry) => entry.trackId),
    EXPECTED_TRACK_IDS
  ),
  "Route fixtures do not cover exactly eight official-PDF tracks."
);
const memoByTrack = new Map(
  hawaiiMemo.tracks
    .filter((entry) => EXPECTED_TRACK_IDS.includes(entry.trackId))
    .map((entry) => [entry.trackId, entry])
);
for (const fixture of fixtures.routeFixtures) {
  const memoTrack = memoByTrack.get(fixture.trackId);
  const relationship = hiRelationships.find(
    (entry) => entry.trackId === fixture.trackId
  );
  ok(Boolean(memoTrack), `${fixture.trackId}: controlling memo track is missing.`);
  ok(
    relationship?.officialFormId === fixture.officialFormId &&
      relationship?.componentId === fixture.componentId,
    `${fixture.trackId}: fixture form or component identity changed.`
  );
  if (memoTrack) {
    ok(
      sameSet(
        fixture.requiredFactKeys,
        memoTrack.participantInputs.map((entry) => entry.key)
      ),
      `${fixture.trackId}: fixture fact keys differ from controlling legal design.`
    );
  }
  ok(
    fixture.renderExpected === false &&
      fixture.currentExpectedBlockers.includes(
        "authority_unmanifested_source"
      ) &&
      fixture.currentExpectedBlockers.includes(
        "captain_assignment_required"
      ) &&
      fixture.currentExpectedBlockers.includes(
        "portable_projection_required"
      ) &&
      fixture.currentExpectedBlockers.includes("field_mapping_pending") &&
      fixture.currentExpectedBlockers.includes("generation_disabled"),
    `${fixture.trackId}: fixture is not an explicit fail-closed preflight.`
  );
}
const boundaryKinds = new Set(
  fixtures.boundaryFixtures.map((entry) => entry.kind)
);
for (const kind of [
  "authority_unmanifested",
  "candidate_substitution_prohibited",
  "captain_assignment_required",
  "portable_projection_required",
  "private_path_read_prohibited",
  "legal_design_waiting_period",
  "conviction_stage_one_legal_design"
]) {
  ok(boundaryKinds.has(kind), `Boundary fixtures omit ${kind}.`);
}
note(
  "6. Scaffolds: renderers, mappings, placements, ownership rows, participant values, and samples all remain zero-active."
);

// ---------------------------------------------------------------------------
// 7. TypeScript boundary is data-equivalent and terminal
// ---------------------------------------------------------------------------

ok(
  HAWAII_OFFICIAL_PDF_FAMILY_ID === FAMILY_ID,
  "TypeScript family ID differs from the manifest."
);
ok(
  sameSet([...HAWAII_OFFICIAL_PDF_TRACK_IDS], EXPECTED_TRACK_IDS) &&
    sameSet([...HAWAII_OFFICIAL_PDF_FORM_IDS], EXPECTED_FORM_IDS),
  "TypeScript track or form identity set differs from JSON."
);
ok(
  sameSet(
    HAWAII_OFFICIAL_PDF_SOURCE_BOUNDARIES.map(
      (entry) => entry.officialFormId
    ),
    EXPECTED_FORM_IDS
  ) &&
    HAWAII_OFFICIAL_PDF_SOURCE_BOUNDARIES.every(
      (entry) =>
        entry.authorityState === "authority_unmanifested_source" &&
        entry.expectedSha256 === null &&
        entry.expectedBytes === null &&
        entry.expectedMediaType === null &&
        entry.assignmentAnchor === null &&
        entry.portableProjection === null &&
        entry.materialized === false &&
        entry.workerReadAuthorized === false &&
        entry.rendererEnabled === false &&
        entry.activeFieldMappingCount === 0 &&
        entry.activeOverlayPlacementCount === 0
    ),
  "TypeScript source boundaries fabricate a source, assignment, or active mapping."
);
const codeCandidateById = new Map(
  HAWAII_OFFICIAL_PDF_CANDIDATE_EVIDENCE.map((entry) => [
    entry.candidateId,
    entry
  ])
);
for (const candidate of evidence) {
  const codeCandidate = codeCandidateById.get(candidate.candidateId);
  ok(Boolean(codeCandidate), `${candidate.candidateId}: code pin is missing.`);
  if (!codeCandidate) continue;
  ok(
    codeCandidate.sha256 === candidate.sha256 &&
      codeCandidate.bytes === candidate.bytes &&
      codeCandidate.repositoryPathEvidence === candidate.repositoryPath &&
      codeCandidate.edition12Disposition === candidate.edition12Disposition &&
      codeCandidate.runtimeEffect === candidate.runtimeEffect &&
      codeCandidate.mappedOfficialFormId === null &&
      codeCandidate.maySatisfyRequirement === false,
    `${candidate.candidateId}: TypeScript and JSON candidate evidence differ.`
  );
}

const codeRouteByTrack = new Map(
  HAWAII_OFFICIAL_PDF_ROUTE_BOUNDARIES.map((entry) => [
    entry.trackId,
    entry
  ])
);
for (const trackId of EXPECTED_TRACK_IDS) {
  const codeRoute = codeRouteByTrack.get(trackId);
  const assembly = assemblyByTrack.get(trackId);
  ok(Boolean(codeRoute), `${trackId}: TypeScript route boundary is missing.`);
  ok(Boolean(assembly), `${trackId}: JSON packet assembly is missing.`);
  if (!codeRoute || !assembly) continue;
  const officialComponent = assembly.components.find(
    (entry) => entry.outputStrategy === "official_pdf_fill"
  );
  ok(
    officialComponent?.officialFormId === codeRoute.officialFormId &&
      officialComponent?.componentId === codeRoute.componentId &&
      officialComponent?.order === codeRoute.stage &&
      stable(assembly.blockingReasonCodes) === stable(codeRoute.blockers) &&
      codeRoute.runtimeDisabled === true &&
      codeRoute.generationAllowed === false,
    `${trackId}: TypeScript route boundary differs from packet assembly.`
  );

  try {
    assertHawaiiOfficialPdfTrackRenderable(trackId);
    ok(false, `${trackId}: renderability assertion returned.`);
  } catch (error) {
    ok(
      error instanceof HawaiiOfficialPdfFamilyBlockedError &&
        error.code === codeRoute.blockers[0],
      `${trackId}: renderability assertion threw the wrong typed blocker.`
    );
  }
  try {
    renderHawaiiOfficialPdfFamilyPacket(trackId, {});
    ok(false, `${trackId}: renderer returned.`);
  } catch (error) {
    ok(
      error instanceof HawaiiOfficialPdfFamilyBlockedError &&
        error.code === codeRoute.blockers[0],
      `${trackId}: renderer did not preserve the typed terminal blocker.`
    );
  }
}
for (const formId of EXPECTED_FORM_IDS) {
  try {
    assertHawaiiOfficialPdfDocumentReady(formId);
    ok(false, `${formId}: document readiness assertion returned.`);
  } catch (error) {
    ok(
      error instanceof HawaiiOfficialPdfFamilyBlockedError &&
        error.code === "authority_unmanifested_source",
      `${formId}: document readiness did not fail as authority_unmanifested_source.`
    );
  }
}
for (const candidateId of EXPECTED_CANDIDATE_IDS) {
  try {
    assertHawaiiCandidateEvidenceSelectable(candidateId);
    ok(false, `${candidateId}: candidate selectability assertion returned.`);
  } catch (error) {
    ok(
      error instanceof HawaiiOfficialPdfFamilyBlockedError &&
        error.code === "candidate_source_not_selectable",
      `${candidateId}: candidate selection did not fail as non-selectable.`
    );
  }
}
for (const [kind, invoke, code] of [
  [
    "track",
    () => assertHawaiiOfficialPdfTrackRenderable("hi_unknown"),
    "unsupported_track"
  ],
  [
    "document",
    () => assertHawaiiOfficialPdfDocumentReady("HCJDC-UNKNOWN"),
    "unsupported_document"
  ],
  [
    "candidate",
    () => assertHawaiiCandidateEvidenceSelectable("hi-unknown-candidate"),
    "unsupported_candidate"
  ]
]) {
  try {
    invoke();
    ok(false, `Unknown ${kind} did not fail.`);
  } catch (error) {
    ok(
      error instanceof HawaiiOfficialPdfFamilyBlockedError &&
        error.code === code,
      `Unknown ${kind} did not fail with ${code}.`
    );
  }
}
ok(
  HAWAII_OFFICIAL_PDF_ACTIVE_RENDERERS.length === 0 &&
    HAWAII_OFFICIAL_PDF_ACTIVE_FIELD_MAPPINGS.length === 0 &&
    HAWAII_OFFICIAL_PDF_ACTIVE_OVERLAY_PLACEMENTS.length === 0 &&
    HAWAII_OFFICIAL_PDF_SOURCE_BACKED_SAMPLES.length === 0,
  "TypeScript module exposes an active renderer, mapping, placement, or sample."
);

const centralRegistrySource = fs.readFileSync(
  path.join(root, "src/lib/rcap/packets/registry.ts"),
  "utf8"
);
ok(
  !centralRegistrySource.includes(
    "jurisdictions/hawaii/official-pdf/family"
  ),
  "Fail-closed Hawaii scaffold was imported by the central registry."
);
const moduleSource = fs.readFileSync(
  path.join(root, manifest.implementationModule),
  "utf8"
);
ok(
  !moduleSource.includes('from "node:fs"') &&
    !moduleSource.includes("from 'node:fs'") &&
    !moduleSource.includes("readFile") &&
    !moduleSource.includes("existsSync") &&
    !moduleSource.includes("fetch("),
  "Hawaii TypeScript boundary contains source-resolution or acquisition code."
);
note(
  "7. Code: JSON and TypeScript identities agree; every route, document, and candidate throws a typed terminal stop."
);

// ---------------------------------------------------------------------------
// 8. Review truthfulness and requested negative gates
// ---------------------------------------------------------------------------

ok(
  review.familyId === FAMILY_ID &&
    review.jurisdiction === "HI" &&
    review.legalDesignChanged === false &&
    review.adjacentHawaiiSurfacesChanged === false,
  "Review manifest claims a legal-design or adjacent-surface change."
);
ok(
  review.sourceBackedSampleCount === 0 &&
    review.samplePackets.length === 0 &&
    review.visualInspectionArtifacts.length === 0 &&
    review.fieldMapReviewArtifacts.length === 0,
  "Review manifest lists source-backed output that does not exist."
);
ok(
  review.sourceReview?.exactAuthorityAssetCount === 0 &&
    review.sourceReview?.authorityUnmanifestedDocumentCount === 2 &&
    review.sourceReview?.exactCandidateEvidencePinCount === 3 &&
    review.sourceReview?.candidateEvidenceMappedToAuthorityIdentityCount ===
      0 &&
    review.sourceReview?.captainAssignedSourceCount === 0 &&
    review.sourceReview?.portableProjectedSourceCount === 0 &&
    review.sourceReview?.locallyVerifiedReadOnlySourceCount === 0,
  "Review source counts overstate authority mapping or local source state."
);
ok(
  review.promotion?.packetReady === false &&
    review.promotion?.generationAllowed === false &&
    review.promotion?.enabled === false &&
    review.promotion?.approvedForLive === false &&
    review.promotion?.live === false,
  "Review manifest claims promotion or live readiness."
);

if (args.requireRenderable) {
  ok(
    EXPECTED_TRACK_IDS.includes(args.requireRenderable),
    `Unknown --require-renderable track ${args.requireRenderable}.`
  );
  failures.push(
    `${args.requireRenderable}: renderable route requested, but the family is intentionally fail-closed.`
  );
}
if (args.requireMaterialized) {
  ok(
    EXPECTED_FORM_IDS.includes(args.requireMaterialized),
    `Unknown --require-materialized form ${args.requireMaterialized}.`
  );
  failures.push(
    `${args.requireMaterialized}: materialized source requested, but no authority asset, captain assignment, or portable projection exists.`
  );
}
if (args.requireCandidateSelectable) {
  ok(
    EXPECTED_CANDIDATE_IDS.includes(args.requireCandidateSelectable),
    `Unknown --require-candidate-selectable candidate ${args.requireCandidateSelectable}.`
  );
  failures.push(
    `${args.requireCandidateSelectable}: selectable candidate requested, but hold_provenance evidence cannot satisfy an authority requirement.`
  );
}
note(
  "8. Review: zero source-backed samples and all promotion flags false; negative requirements fail closed."
);

if (failures.length > 0) {
  if (args.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          familyId: FAMILY_ID,
          result: "failed",
          failures,
          notes
        },
        null,
        2
      )}\n`
    );
  } else {
    process.stderr.write(
      "Hawaii HCJDC official-PDF family verification failed:\n"
    );
    for (const failure of failures) {
      process.stderr.write(`- ${failure}\n`);
    }
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
        routeCount: EXPECTED_TRACK_IDS.length,
        documentIdentityCount: EXPECTED_FORM_IDS.length,
        exactAuthoritySourceRequirementCount: 0,
        candidateEvidencePinCount: EXPECTED_CANDIDATE_IDS.length,
        activeRenderers: 0,
        activeMappings: 0,
        activeOverlayPlacements: 0,
        sourceBackedSamples: 0,
        workerReady: false,
        runtimeEnabled: false
      },
      null,
      2
    )}\n`
  );
} else {
  process.stdout.write(
    `Hawaii HCJDC official-PDF family verification passed (${notes.length} sections).\n`
  );
  for (const entry of notes) {
    process.stdout.write(`- ${entry}\n`);
  }
}

function componentIdentity(component) {
  return {
    componentId: component.componentId,
    role: component.role,
    requirement: component.requirement,
    conditionDescription: component.conditionDescription ?? null,
    outputStrategy: component.outputStrategy,
    officialFormId: component.officialFormId ?? null,
    order: component.order
  };
}

function componentOrder(trackId, componentId) {
  const packet = packetSets.packetSets.find(
    (entry) => entry.jurisdiction === "HI" && entry.trackId === trackId
  );
  return packet?.components.find(
    (component) => component.componentId === componentId
  )?.order;
}

function parseArgs(argv) {
  const result = {
    json: false,
    requireRenderable: null,
    requireMaterialized: null,
    requireCandidateSelectable: null
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      result.json = true;
      continue;
    }

    const options = [
      ["--require-renderable", "requireRenderable"],
      ["--require-materialized", "requireMaterialized"],
      ["--require-candidate-selectable", "requireCandidateSelectable"]
    ];
    const option = options.find(([flag]) => arg === flag);
    if (option) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${arg} requires a value.`);
      }
      result[option[1]] = value;
      index += 1;
      continue;
    }

    const assignedOption = options.find(([flag]) =>
      arg.startsWith(`${flag}=`)
    );
    if (assignedOption) {
      result[assignedOption[1]] = arg.slice(assignedOption[0].length + 1);
      continue;
    }

    throw new Error(`Unknown argument ${arg}.`);
  }
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
  return JSON.stringify(value);
}
