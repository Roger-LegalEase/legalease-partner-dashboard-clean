#!/usr/bin/env node

// Florida official-PDF family verifier.
//
// A normal run succeeds only while the Florida-scoped artifacts accurately
// describe a disabled, zero-mapping, zero-sample scaffold. Negative CLI gates
// intentionally fail when asked to require a resolved source, materialized
// source, or renderable route.

import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const {
  FLORIDA_OFFICIAL_PDF_ACTIVE_FIELD_MAPPINGS,
  FLORIDA_OFFICIAL_PDF_ACTIVE_OVERLAY_PLACEMENTS,
  FLORIDA_OFFICIAL_PDF_ACTIVE_RENDERERS,
  FLORIDA_OFFICIAL_PDF_FAMILY_ID,
  FLORIDA_OFFICIAL_PDF_FORM_IDS,
  FLORIDA_OFFICIAL_PDF_ROUTE_BOUNDARIES,
  FLORIDA_OFFICIAL_PDF_SOURCE_BACKED_SAMPLES,
  FLORIDA_OFFICIAL_PDF_SOURCE_BOUNDARIES,
  FLORIDA_OFFICIAL_PDF_TRACK_IDS,
  FloridaOfficialPdfFamilyBlockedError,
  assertFloridaOfficialPdfDocumentMaterialized,
  assertFloridaOfficialPdfSourceResolved,
  assertFloridaOfficialPdfTrackRenderable,
  renderFloridaOfficialPdfFamilyPacket
} = await import(
  "@/lib/rcap/packets/jurisdictions/florida/official-pdf/family"
);

const args = parseArgs(process.argv.slice(2));
const root = process.cwd();
const familyDir = path.join(
  root,
  "data/record-clearing/production-factory/official-pdf-families/FL"
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
const acquisitionQueue = readJson(
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
const floridaMemo = readJson(
  "data/record-clearing/legal-design-intake/FL.memo.json"
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

const FAMILY_ID = "rcap-fl-official-pdf-family";
const EXPECTED_TRACK_IDS = [
  "fl-10yr-bridge",
  "fl-administrative",
  "fl-early-juvenile",
  "fl-expunction",
  "fl-juvenile-diversion",
  "fl-sealing",
  "fl-self-defense",
  "fl-trafficking"
];
const EXPECTED_FORM_IDS = [
  "FDLE-ADMINISTRATIVE-EXPUNCTION-APPLICATION",
  "FDLE-CERTIFICATE-OF-ELIGIBILITY-APPLICATION",
  "FDLE-EARLY-JUVENILE-EXPUNCTION-APPLICATION",
  "FDLE-JUVENILE-DIVERSION-EXPUNCTION-APPLICATION",
  "FDLE-SELF-DEFENSE-EXPUNCTION-APPLICATION",
  "FL-RULE-3.989-AFFIDAVIT",
  "FL-RULE-3.989-ORDER",
  "FL-RULE-3.989-PETITION"
];
const COMMON_BLOCKERS = [
  "authority_unmanifested_source",
  "captain_assignment_required",
  "portable_projection_required",
  "field_mapping_pending",
  "generation_disabled"
];

// ---------------------------------------------------------------------------
// 1. Family boundary and artifact inventory
// ---------------------------------------------------------------------------

ok(manifest.familyId === FAMILY_ID, "Family manifest has the wrong familyId.");
ok(manifest.jurisdiction === "FL", "Family manifest is not Florida-scoped.");
ok(
  manifest.productionQueuePriority === 14,
  "Family manifest no longer carries queue priority 14."
);
ok(
  sameSet(manifest.scope?.trackIds ?? [], EXPECTED_TRACK_IDS),
  "Family manifest track scope differs from the eight queue tracks."
);
ok(
  sameSet(manifest.scope?.officialFormIds ?? [], EXPECTED_FORM_IDS),
  "Family manifest form scope differs from the nine queue identities."
);
ok(
  manifest.scope?.routeCount === 8 &&
    manifest.scope?.packetComponentCount === 23 &&
    manifest.scope?.officialPdfComponentCount === 18 &&
    manifest.scope?.externalPacketComponentCount === 5 &&
    manifest.scope?.documentIdentityCount === 8,
  "Family manifest has incorrect route, component, or document counts."
);
ok(
  manifest.status?.legalDesignChanged === false &&
    manifest.status?.sourceBackedSampleCount === 0 &&
    manifest.status?.packetReady === false &&
    manifest.status?.generationAllowed === false &&
    manifest.status?.enabled === false,
  "Family manifest claims design mutation, samples, or runtime readiness."
);
ok(
  manifest.sourceMaterialization?.assignmentAnchor === null &&
    manifest.sourceMaterialization?.portableProjection === null &&
    manifest.sourceMaterialization?.portableProjectionAvailable === false &&
    manifest.sourceMaterialization?.workerReady === false &&
    manifest.sourceMaterialization?.workerMaterializationAuthorized ===
      false &&
    manifest.sourceMaterialization?.workerReadAuthorized === false &&
    manifest.sourceMaterialization?.workerMayAcquireOrDownloadSources ===
      false,
  "Family manifest fabricates assignment, projection, or worker authority."
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
  "Florida fail-closed implementation module is missing."
);
ok(
  manifest.dedicatedVerifier ===
    "scripts/verify-rcap-florida-official-pdf-families.mjs",
  "Family manifest names the wrong verifier."
);
note(
  "1. Boundary: twelve Florida-scoped artifacts exist; the family is disabled and isolated."
);

// ---------------------------------------------------------------------------
// 2. Queue, relationships, acquisition rows, and track audit
// ---------------------------------------------------------------------------

const queueFamily = productionQueue.families.find(
  (entry) => entry.familyId === FAMILY_ID
);
ok(Boolean(queueFamily), "Florida family is absent from the production queue.");
if (queueFamily) {
  ok(
    queueFamily.jurisdiction === "FL" &&
      queueFamily.priority === 14 &&
      queueFamily.workerReady === false &&
      queueFamily.packetReady === false &&
      queueFamily.enabled === false,
    "Production queue Florida family changed readiness or identity."
  );
  ok(
    sameSet(queueFamily.trackIds ?? [], EXPECTED_TRACK_IDS),
    "Production queue Florida track set changed."
  );
  ok(
    sameSet(
      (queueFamily.documents ?? []).map((entry) => entry.officialFormId),
      EXPECTED_FORM_IDS
    ),
    "Production queue Florida document set changed."
  );
  ok(
    queueFamily.counts?.trackCount === 8 &&
      queueFamily.counts?.componentCount === 18 &&
      queueFamily.counts?.documentCount === 8 &&
      queueFamily.counts?.exactSourceRequirementCount === 0 &&
      queueFamily.counts?.unresolvedSourceIdentityCount === 8,
    "Production queue Florida counts changed."
  );
  for (const document of queueFamily.documents ?? []) {
    ok(
      document.sourceIdentityState === "authority_identity_unresolved" &&
        document.exactSourceRequirement === null &&
        document.workerReady === false &&
        document.authorityAssets?.length === 0 &&
        document.repositoryCandidates?.length === 0 &&
        document.officialSourceUrls?.length === 0,
      `${document.officialFormId}: queue source posture no longer fails closed.`
    );
  }
}

const flRelationships = relationships.relationships.filter(
  (entry) =>
    entry.jurisdiction === "FL" &&
    EXPECTED_TRACK_IDS.includes(entry.trackId)
);
ok(
  flRelationships.length === 18,
  "Florida source relationship count is not nineteen."
);
for (const relationship of flRelationships) {
  ok(
    EXPECTED_FORM_IDS.includes(relationship.officialFormId) &&
      relationship.sha256 === null &&
      relationship.officialSourceUrl === null &&
      relationship.corpusState === "unchecked",
    `${relationship.componentId}: source relationship unexpectedly gained a pin or URL.`
  );
}

// The retired continuation keeps its queue row so the negative answer stays on
// the record, but it is not a live acquisition row and is not counted as one.
const acquisitionRows = acquisitionQueue.rows.filter(
  (entry) =>
    entry.jurisdiction === "FL" &&
    EXPECTED_TRACK_IDS.includes(entry.trackId) &&
    entry.componentRetired !== true
);
ok(
  acquisitionQueue.rows.some(
    (entry) =>
      entry.acquisitionKey === "acquire:FL:fl-rule-3-989-continuation" &&
      entry.componentRetired === true &&
      entry.acquisitionRequired === false
  ),
  "The resolved Florida continuation row left the queue instead of staying answered."
);
ok(
  acquisitionRows.length === 18,
  "Florida source-acquisition row count is not nineteen."
);
for (const row of acquisitionRows) {
  ok(
    EXPECTED_FORM_IDS.includes(row.expectedDocumentId) &&
      row.currentEditionStatus === "authority_unmanifested_source" &&
      row.sourceIdentityConfidence === "document_identity_known" &&
      row.edition12Disposition ===
        "identity_established_binary_unavailable" &&
      row.runtimeEffect === "runtime_disabled",
    `${row.componentId}: source-acquisition posture changed.`
  );
}

const auditTracks = sourceAudit.tracks.filter(
  (entry) =>
    entry.jurisdiction === "FL" &&
    EXPECTED_TRACK_IDS.includes(entry.trackId)
);
ok(auditTracks.length === 8, "Florida track audit no longer covers eight routes.");
const auditedOfficialComponents = auditTracks.flatMap((track) =>
  track.components.filter(
    (component) => component.outputStrategy === "official_pdf_fill"
  )
);
ok(
  auditedOfficialComponents.length === 18,
  "Florida track audit no longer contains eighteen official-PDF components."
);
for (const component of auditedOfficialComponents) {
  ok(
    component.result === "authority_unmanifested_source" &&
      component.asset === null &&
      component.sha256Verified === false,
    `${component.componentId}: track audit no longer fails closed.`
  );
}
note(
  "2. Identity: queue, relationships, acquisition rows, and audit agree on 8 routes, 18 bindings, and 8 unresolved documents."
);

// ---------------------------------------------------------------------------
// 3. Source requirement scaffold
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
  sourceRequirements.authorityEdition === `master-library/${authority.edition}` &&
    sourceRequirements.authorityArchiveSha256 ===
      authority.retention.archiveSha256,
  "Source requirements are not pinned to the adopted authority edition."
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
  sourceRequirements.counts?.documentIdentities === 9 &&
    sourceRequirements.counts?.officialPdfUsageBindings === 19 &&
    sourceRequirements.counts?.exactAuthoritySourceRequirements === 0 &&
    sourceRequirements.counts?.authorityUnmanifestedDocuments === 9 &&
    sourceRequirements.counts?.queueMappedRepositoryCandidates === 0 &&
    sourceRequirements.counts?.captainProjectedExactSources === 0,
  "Source requirement counts overstate source or materialization readiness."
);

const requirements = sourceRequirements.requirements ?? [];
ok(
  sameSet(
    requirements.map((entry) => entry.officialFormId),
    EXPECTED_FORM_IDS
  ),
  "Source requirement set differs from the nine queue identities."
);
const normalizedPacketByTrack = new Map(
  packetSets.packetSets
    .filter(
      (entry) =>
        entry.jurisdiction === "FL" &&
        EXPECTED_TRACK_IDS.includes(entry.trackId)
    )
    .map((entry) => [entry.trackId, entry])
);
const expectedOfficialComponents = [...normalizedPacketByTrack.values()]
  .flatMap((packet) =>
    packet.components.map((component) => ({
      ...component,
      trackId: packet.trackId
    }))
  )
  .filter((component) => component.outputStrategy === "official_pdf_fill");

for (const requirement of requirements) {
  const prefix = requirement.officialFormId;
  ok(
    requirement.authorityState === "authority_unmanifested_source" &&
      requirement.identityBindingStatus ===
        "document_identity_known_exact_authority_asset_unresolved" &&
      requirement.sourceIdentityConfidence === "document_identity_known",
    `${prefix}: source identity state is overstated or changed.`
  );
  for (const field of [
    "authorityDocumentId",
    "workflowKey",
    "officialTitle",
    "issuingAuthority",
    "officialSourceUrl",
    "revision",
    "assetClass",
    "canonicalAuthorityPath",
    "expectedSha256",
    "expectedBytes",
    "expectedMediaType",
    "proposedMaterializationDestination",
    "verificationCommand",
    "assignmentAnchor",
    "portableProjection"
  ]) {
    ok(
      requirement[field] === null,
      `${prefix}: requirement fabricates ${field}.`
    );
  }
  ok(
    requirement.packetCandidate === false &&
      requirement.generationAllowed === false &&
      requirement.workerMaterializationAuthorized === false &&
      requirement.workerReadAuthorized === false &&
      requirement.captainAssignmentEligibility ===
        "ineligible_until_successor_authority_edition_manifests_exact_asset",
    `${prefix}: unresolved source became selectable or worker-authorized.`
  );

  const expectedBindings = expectedOfficialComponents
    .filter((component) => component.officialFormId === prefix)
    .map(bindingIdentity);
  ok(
    stable(requirement.usageBindings) === stable(expectedBindings),
    `${prefix}: usage bindings differ from adopted packet order.`
  );
}
ok(
  Array.isArray(sourceRequirements.candidateEvidence) &&
    sourceRequirements.candidateEvidence.length === 0 &&
    sourceRequirements.provenance?.freshLocalVerification === false &&
    sourceRequirements.provenance?.registryPresenceConfersReadiness === false &&
    sourceRequirements.provenance
      ?.repositoryPathsWereResolvedOrReadByWorker === false &&
    sourceRequirements.provenance?.nearMatchAssetsConferAuthority === false &&
    sourceRequirements.provenance
      ?.nearMatchAssetsConferMaterializationReadiness === false,
  "Source provenance permits candidate inference or overstates verification."
);
note(
  "3. Sources: eight authority-unmanifested requirements preserve null pins, null locators, zero candidates, and zero worker authority."
);

// ---------------------------------------------------------------------------
// 4. Legal-design and dependency gates
// ---------------------------------------------------------------------------

const dependencyById = new Map(
  (dependencies.dependencies ?? []).map((entry) => [
    entry.dependencyId,
    entry
  ])
);
for (const dependencyId of [
  "fl-successor-authority-edition-source-identities",
  "fl-captain-assignment-and-portable-projection",
  "fl-current-official-forms-and-instructions",
  "fl-expunction-specialty-route-criteria",
  "fl-maintained-disqualifying-offense-data",
  "fl-circuit-packet-variation-review",
  "fl-trafficking-governing-mechanism",
  "fl-projected-source-technical-inspection",
  "fl-field-map-and-ownership-completion",
  "fl-source-backed-samples-and-review"
]) {
  ok(
    dependencyById.get(dependencyId)?.status === "blocked",
    `${dependencyId}: required blocker is missing or not blocked.`
  );
}
ok(
  dependencyById.get("fl-expunction-specialty-route-criteria")?.gateClass ===
      "build_blocker" &&
    dependencyById.get("fl-current-official-forms-and-instructions")
      ?.gateClass === "release_blocker" &&
    dependencyById.get("fl-maintained-disqualifying-offense-data")
      ?.gateClass === "release_blocker" &&
    dependencyById.get("fl-circuit-packet-variation-review")?.gateClass ===
      "release_blocker" &&
    dependencyById.get("fl-trafficking-governing-mechanism")?.gateClass ===
      "release_blocker",
  "Dependency manifest collapses build and release blockers."
);
ok(
  dependencyById.get("fl-captain-assignment-and-portable-projection")
      ?.assignmentAnchor === null &&
    dependencyById.get("fl-captain-assignment-and-portable-projection")
      ?.portableProjection === null &&
    dependencyById.get("fl-captain-assignment-and-portable-projection")
      ?.workerMayResolveByRepositoryPath === false &&
    dependencyById.get("fl-captain-assignment-and-portable-projection")
      ?.workerMayAcquireOrDownload === false,
  "Captain dependency permits worker source resolution or acquisition."
);
ok(
  dependencyById.get("fl-third-party-and-participant-manual-completion")
    ?.status === "satisfied_as_policy",
  "Manual-completion ownership policy is missing."
);
ok(
  dependencyById.get("fl-adjacent-surface-isolation")?.status === "satisfied",
  "Florida adjacent-surface isolation is not satisfied."
);

const memoByTrack = new Map(
  floridaMemo.tracks
    .filter((entry) => EXPECTED_TRACK_IDS.includes(entry.trackId))
    .map((entry) => [entry.trackId, entry])
);
ok(memoByTrack.size === 8, "Controlling Florida memo no longer covers 8 tracks.");
for (const [trackId, memoTrack] of memoByTrack) {
  ok(
    memoTrack.legalDesignDecision?.status ===
      "legal_design_approved_with_limitations",
    `${trackId}: legal-design status changed.`
  );
}
const memoBuildBlockers = [...memoByTrack.values()].flatMap((track) =>
  track.unresolvedQuestions
    .filter((question) => question.impact === "build_blocker")
    .map((question) => ({
      trackId: track.trackId,
      affectedElement: question.affectedElement
    }))
);
ok(
  stable(memoBuildBlockers) ===
    stable([
      {
        trackId: "fl-expunction",
        affectedElement: "eligibility_branch"
      }
    ]),
  "Florida legal-design build blockers changed or were reclassified."
);
note(
  "4. Dependencies: the expunction route-selection build blocker remains distinct from source and release gates."
);

// ---------------------------------------------------------------------------
// 5. Deterministic packet assembly
// ---------------------------------------------------------------------------

ok(
  packetAssembly.assemblyPolicy?.deterministicAssemblyRequired === true &&
    packetAssembly.assemblyPolicy?.preserveConditionalComponents === true &&
    packetAssembly.assemblyPolicy?.externalComponentsRemainRequired === true &&
    packetAssembly.assemblyPolicy?.currentGenerationAllowed === false &&
    packetAssembly.assemblyPolicy?.runtimeIntegrationAllowed === false &&
    packetAssembly.assemblyPolicy?.legacyRepositoryPathLookupAllowed === false &&
    packetAssembly.assemblyPolicy?.downloadOrSourceFallbackAllowed === false &&
    packetAssembly.assemblyPolicy?.nearMatchSourceFallbackAllowed === false,
  "Packet assembly permits nondeterminism, generation, or source fallback."
);
const assemblyByTrack = new Map(
  (packetAssembly.packets ?? []).map((entry) => [entry.trackId, entry])
);
ok(
  sameSet([...assemblyByTrack.keys()], EXPECTED_TRACK_IDS),
  "Packet assembly does not contain exactly the eight queue routes."
);
let assembledComponentCount = 0;
let assembledOfficialCount = 0;
let assembledExternalCount = 0;
for (const trackId of EXPECTED_TRACK_IDS) {
  const normalized = normalizedPacketByTrack.get(trackId);
  const assembly = assemblyByTrack.get(trackId);
  ok(Boolean(normalized), `${trackId}: normalized packet set is missing.`);
  ok(Boolean(assembly), `${trackId}: packet assembly scaffold is missing.`);
  if (!normalized || !assembly) continue;

  ok(
    stable(assembly.components.map(componentIdentity)) ===
      stable(normalized.components.map(componentIdentity)),
    `${trackId}: packet sequence differs from the adopted packet set.`
  );
  ok(
    assembly.generationState === "blocked" &&
      COMMON_BLOCKERS.every((code) =>
        assembly.blockingReasonCodes.includes(code)
      ) &&
      assembly.components.every(
        (component) => component.rendererStrategy === null
      ),
    `${trackId}: packet assembly is not fail-closed.`
  );
  for (const component of assembly.components) {
    const official = component.outputStrategy === "official_pdf_fill";
    ok(
      component.familyTreatment ===
        (official ? "owned_scaffold" : "external_required_component"),
      `${component.componentId}: family treatment differs from output strategy.`
    );
    assembledComponentCount += 1;
    if (official) assembledOfficialCount += 1;
    else assembledExternalCount += 1;
  }
}
ok(
  assembledComponentCount === 23 &&
    assembledOfficialCount === 18 &&
    assembledExternalCount === 5,
  "Assembled component totals are not 23/18/5."
);
ok(
  assemblyByTrack
    .get("fl-expunction")
    ?.blockingReasonCodes.includes("legal_design_route_selection_blocker") &&
    (assemblyByTrack.get("fl-expunction")?.components ?? []).every(
      (component) =>
        component.componentId !== "fl-expunction-continuation-6" &&
        component.officialFormId !== "FL-RULE-3.989-CONTINUATION"
    ),
  "Expunction build blocker was lost, or the retired continuation identity returned."
);
ok(
  (packetAssembly.excludedTracks ?? []).some(
    (entry) =>
      entry.trackId === "fl-auto-seal" &&
      entry.reason.includes("process_guidance")
  ),
  "Automatic sealing guidance track is not explicitly excluded."
);
note(
  "5. Assembly: all 23 adopted components retain exact order, including 18 owned PDF positions and 5 external positions."
);

// ---------------------------------------------------------------------------
// 6. Zero-active scaffolds and synthetic fixtures
// ---------------------------------------------------------------------------

ok(
  fieldMap.activeMappingCount === 0 &&
    fieldMap.activeOverlayPlacementCount === 0 &&
    sameSet(
      fieldMap.forms.map((entry) => entry.officialFormId),
      EXPECTED_FORM_IDS
    ),
  "Field-map scaffold is not zero-active for all nine forms."
);
for (const form of fieldMap.forms) {
  const requirement = requirements.find(
    (entry) => entry.officialFormId === form.officialFormId
  );
  ok(
    form.authorityState === "authority_unmanifested_source" &&
      form.rendererStrategy === null &&
      form.mappingReady === false &&
      form.expectedStructure === null &&
      form.candidateRendererStrategies.length === 0 &&
      form.mappings.length === 0 &&
      form.overlayPlacements.length === 0,
    `${form.officialFormId}: field map invents source structure or mappings.`
  );
  ok(
    sameSet(
      form.componentIds,
      requirement.usageBindings.map((entry) => entry.componentId)
    ) &&
      sameSet(
        form.trackIds,
        requirement.usageBindings.map((entry) => entry.trackId)
      ),
    `${form.officialFormId}: field-map usage scope differs from requirements.`
  );
}

ok(
  renderer.enabled === false &&
    renderer.activeRendererCount === 0 &&
    renderer.rendererAdapters.every((entry) => entry.enabled === false) &&
    sameSet(
      renderer.documents.map((entry) => entry.officialFormId),
      EXPECTED_FORM_IDS
    ) &&
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
    renderer.renderContract?.legacyRepositoryPathReadAllowed === false &&
    renderer.renderContract?.nearMatchSourceSubstitutionAllowed === false &&
    renderer.renderContract?.currentRenderingAllowed === false,
  "Renderer contract permits mutation, acquisition, substitution, or rendering."
);

ok(
  ownershipSchema.$id === "rcap-fl-official-pdf-field-ownership/v1" &&
    ownership.familyId === FAMILY_ID &&
    ownership.jurisdiction === "FL" &&
    sameSet(
      ownership.forms.map((entry) => entry.officialFormId),
      EXPECTED_FORM_IDS
    ),
  "Field ownership schema or map has the wrong identity."
);
ok(
  sameSet(ownership.policy?.mappingAllowedFor ?? [], [
    "participant",
    "system_derived"
  ]) &&
    ownership.policy?.unclassifiedMappingAllowed === false &&
    ownership.policy?.signatureImagesGenerated === false &&
    ownership.policy?.sourceInspectionRequired === true,
  "Field ownership permits unsafe mapping or skips source inspection."
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
      form.fields.length === 0 &&
      form.knownManualCompletionItems.every(
        (entry) =>
          entry.mappingState ===
          "semantic_policy_only_no_pdf_field_asserted"
      ),
    `${form.officialFormId}: ownership map claims fields or coverage.`
  );
}

ok(
  fixtureSchema.$id === "rcap-fl-official-pdf-fixtures/v1" &&
    fixtures.fixtureKind === "synthetic_preflight_contract_only" &&
    fixtures.containsRealParticipantData === false &&
    fixtures.factsAreEligibilityDeterminations === false &&
    fixtures.renderedSampleCount === 0 &&
    fixtures.sampleArtifacts.length === 0,
  "Fixture schema or data claims real data, eligibility, or rendered samples."
);
ok(
  sameSet(
    fixtures.routeFixtures.map((entry) => entry.trackId),
    EXPECTED_TRACK_IDS
  ),
  "Synthetic route fixtures do not cover exactly eight tracks."
);
for (const fixture of fixtures.routeFixtures) {
  const memoTrack = memoByTrack.get(fixture.trackId);
  const expectedFactKeys =
    memoTrack?.participantInputs.map((entry) => entry.key) ?? [];
  ok(
    sameSet(fixture.requiredFactKeys, expectedFactKeys) &&
      sameSet(Object.keys(fixture.syntheticFacts), expectedFactKeys) &&
      Object.values(fixture.syntheticFacts).every(
        (value) => value === "SYNTHETIC_UNANSWERED"
      ),
    `${fixture.trackId}: synthetic facts differ from controlling input keys.`
  );
  ok(
    fixture.renderExpected === false &&
      COMMON_BLOCKERS.every((code) =>
        fixture.currentExpectedBlockers.includes(code)
      ),
    `${fixture.trackId}: fixture is not a fail-closed preflight.`
  );
}
ok(
  fixtures.routeFixtures
    .find((entry) => entry.trackId === "fl-expunction")
    ?.currentExpectedBlockers.includes(
      "legal_design_route_selection_blocker"
    ),
  "Expunction synthetic fixture lost the route-selection blocker."
);
note(
  "6. Scaffolds: renderers, mappings, placements, ownership rows, real participant data, and samples remain zero-active."
);

// ---------------------------------------------------------------------------
// 7. TypeScript boundary and isolation
// ---------------------------------------------------------------------------

ok(
  FLORIDA_OFFICIAL_PDF_FAMILY_ID === FAMILY_ID &&
    sameSet([...FLORIDA_OFFICIAL_PDF_TRACK_IDS], EXPECTED_TRACK_IDS) &&
    sameSet([...FLORIDA_OFFICIAL_PDF_FORM_IDS], EXPECTED_FORM_IDS),
  "TypeScript family, track, or form identities differ from JSON."
);
ok(
  sameSet(
    FLORIDA_OFFICIAL_PDF_SOURCE_BOUNDARIES.map(
      (entry) => entry.officialFormId
    ),
    EXPECTED_FORM_IDS
  ) &&
    FLORIDA_OFFICIAL_PDF_SOURCE_BOUNDARIES.every(
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
  "TypeScript source boundaries fabricate a source or active mapping."
);
const codeRouteByTrack = new Map(
  FLORIDA_OFFICIAL_PDF_ROUTE_BOUNDARIES.map((entry) => [
    entry.trackId,
    entry
  ])
);
for (const trackId of EXPECTED_TRACK_IDS) {
  const route = codeRouteByTrack.get(trackId);
  const assembly = assemblyByTrack.get(trackId);
  ok(Boolean(route), `${trackId}: TypeScript route boundary is missing.`);
  if (!route || !assembly) continue;
  const assemblyOfficial = assembly.components
    .filter((entry) => entry.outputStrategy === "official_pdf_fill")
    .map(officialBoundaryIdentity);
  ok(
    stable(route.officialComponents) === stable(assemblyOfficial) &&
      stable(route.blockers) === stable(assembly.blockingReasonCodes) &&
      route.runtimeDisabled === true &&
      route.generationAllowed === false,
    `${trackId}: TypeScript route differs from packet assembly.`
  );
  for (const invoke of [
    () => assertFloridaOfficialPdfTrackRenderable(trackId),
    () => renderFloridaOfficialPdfFamilyPacket(trackId, {})
  ]) {
    try {
      invoke();
      ok(false, `${trackId}: terminal route boundary returned.`);
    } catch (error) {
      ok(
        error instanceof FloridaOfficialPdfFamilyBlockedError &&
          error.code === route.blockers[0],
        `${trackId}: terminal route boundary threw the wrong typed blocker.`
      );
    }
  }
}
for (const formId of EXPECTED_FORM_IDS) {
  for (const invoke of [
    () => assertFloridaOfficialPdfSourceResolved(formId),
    () => assertFloridaOfficialPdfDocumentMaterialized(formId)
  ]) {
    try {
      invoke();
      ok(false, `${formId}: terminal document boundary returned.`);
    } catch (error) {
      ok(
        error instanceof FloridaOfficialPdfFamilyBlockedError &&
          error.code === "authority_unmanifested_source",
        `${formId}: document boundary did not fail as unresolved source.`
      );
    }
  }
}
for (const [invoke, code] of [
  [
    () => assertFloridaOfficialPdfTrackRenderable("fl-unknown"),
    "unsupported_track"
  ],
  [
    () => assertFloridaOfficialPdfSourceResolved("FL-UNKNOWN"),
    "unsupported_document"
  ],
  [
    () => assertFloridaOfficialPdfDocumentMaterialized("FL-UNKNOWN"),
    "unsupported_document"
  ]
]) {
  try {
    invoke();
    ok(false, `Unknown boundary did not fail with ${code}.`);
  } catch (error) {
    ok(
      error instanceof FloridaOfficialPdfFamilyBlockedError &&
        error.code === code,
      `Unknown boundary did not fail with ${code}.`
    );
  }
}
ok(
  FLORIDA_OFFICIAL_PDF_ACTIVE_RENDERERS.length === 0 &&
    FLORIDA_OFFICIAL_PDF_ACTIVE_FIELD_MAPPINGS.length === 0 &&
    FLORIDA_OFFICIAL_PDF_ACTIVE_OVERLAY_PLACEMENTS.length === 0 &&
    FLORIDA_OFFICIAL_PDF_SOURCE_BACKED_SAMPLES.length === 0,
  "TypeScript module exposes an active renderer, mapping, placement, or sample."
);

const centralRegistrySource = fs.readFileSync(
  path.join(root, "src/lib/rcap/packets/registry.ts"),
  "utf8"
);
ok(
  !centralRegistrySource.includes(
    "jurisdictions/florida/official-pdf/family"
  ),
  "Fail-closed Florida scaffold was imported by the central registry."
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
  "Florida TypeScript boundary contains source-resolution code."
);

const forbiddenSourceRoot = ["private", "Nationwide Record Clearing"].join(
  path.sep
);
for (const filePath of [
  ...walkFiles(familyDir),
  path.join(root, manifest.implementationModule),
  path.join(root, manifest.dedicatedVerifier)
]) {
  ok(
    !fs.readFileSync(filePath, "utf8").includes(forbiddenSourceRoot),
    `${path.relative(root, filePath)} contains a forbidden private source path.`
  );
}
note(
  "7. Code: JSON and TypeScript agree; every source, materialization, and route request reaches a typed terminal stop."
);

// ---------------------------------------------------------------------------
// 8. Review truthfulness and requested negative gates
// ---------------------------------------------------------------------------

ok(
  review.legalDesignChanged === false &&
    review.adjacentFloridaSurfacesChanged === false &&
    review.sourceBackedSampleCount === 0 &&
    review.samplePackets.length === 0 &&
    review.visualInspectionArtifacts.length === 0 &&
    review.fieldMapReviewArtifacts.length === 0,
  "Review manifest claims design changes or source-backed output."
);
ok(
  review.sourceReview?.knownDocumentIdentityCount === 8 &&
    review.sourceReview?.exactAuthorityAssetCount === 0 &&
    review.sourceReview?.authorityUnmanifestedDocumentCount === 8 &&
    review.sourceReview?.exactSourceRequirementCount === 0 &&
    review.sourceReview?.queueMappedRepositoryCandidateCount === 0 &&
    review.sourceReview?.captainAssignedSourceCount === 0 &&
    review.sourceReview?.portableProjectedSourceCount === 0 &&
    review.sourceReview?.locallyVerifiedReadOnlySourceCount === 0,
  "Review source counts overstate source or local verification state."
);
ok(
  sameSet(
    review.documentReviews.map((entry) => entry.officialFormId),
    EXPECTED_FORM_IDS
  ) &&
    sameSet(
      review.routeReviews.map((entry) => entry.trackId),
      EXPECTED_TRACK_IDS
    ),
  "Review manifest does not cover exactly nine documents and eight routes."
);
ok(
  review.promotion?.packetReady === false &&
    review.promotion?.generationAllowed === false &&
    review.promotion?.enabled === false &&
    review.promotion?.approvedForLive === false &&
    review.promotion?.live === false,
  "Review manifest claims promotion or live readiness."
);

if (args.requireSource) {
  ok(
    EXPECTED_FORM_IDS.includes(args.requireSource),
    `Unknown --require-source form ${args.requireSource}.`
  );
  failures.push(
    `${args.requireSource}: resolved source requested, but its authority identity is unmanifested.`
  );
}
if (args.requireMaterialized) {
  ok(
    EXPECTED_FORM_IDS.includes(args.requireMaterialized),
    `Unknown --require-materialized form ${args.requireMaterialized}.`
  );
  failures.push(
    `${args.requireMaterialized}: materialized source requested, but no exact authority asset, captain assignment, or portable projection exists.`
  );
}
if (args.requireRenderable) {
  ok(
    EXPECTED_TRACK_IDS.includes(args.requireRenderable),
    `Unknown --require-renderable track ${args.requireRenderable}.`
  );
  failures.push(
    `${args.requireRenderable}: renderable route requested, but the family is intentionally fail-closed.`
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
      "Florida official-PDF family verification failed:\n"
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
        packetComponentCount: 24,
        officialPdfComponentCount: 19,
        externalPacketComponentCount: 5,
        documentIdentityCount: EXPECTED_FORM_IDS.length,
        exactAuthoritySourceRequirementCount: 0,
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
    `Florida official-PDF family verification passed (${notes.length} sections).\n`
  );
  for (const entry of notes) {
    process.stdout.write(`- ${entry}\n`);
  }
}

function bindingIdentity(component) {
  return {
    trackId: component.trackId,
    componentId: component.componentId,
    role: component.role,
    requirement: component.requirement,
    conditionDescription: component.conditionDescription ?? null,
    order: component.order
  };
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

function officialBoundaryIdentity(component) {
  return {
    componentId: component.componentId,
    officialFormId: component.officialFormId,
    order: component.order
  };
}

function parseArgs(argv) {
  const result = {
    json: false,
    requireSource: null,
    requireMaterialized: null,
    requireRenderable: null
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      result.json = true;
      continue;
    }

    const options = [
      ["--require-source", "requireSource"],
      ["--require-materialized", "requireMaterialized"],
      ["--require-renderable", "requireRenderable"]
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
      result[assignedOption[1]] = arg.slice(
        assignedOption[0].length + 1
      );
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

function walkFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(entryPath) : [entryPath];
  });
}
