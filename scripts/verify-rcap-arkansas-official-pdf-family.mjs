#!/usr/bin/env node

// Arkansas ACIC official-PDF family verifier.
//
// A normal run succeeds only while the Arkansas artifacts remain a disabled,
// evidence-only scaffold. Negative gates intentionally exit nonzero when asked
// to require an exact or resolved source, materialized bytes, a renderable
// route, or a packet-ready route.

import fs from "node:fs";
import path from "node:path";
import { createRequire, register } from "node:module";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const {
  ARKANSAS_OFFICIAL_PDF_ACTIVE_FIELD_MAPPINGS,
  ARKANSAS_OFFICIAL_PDF_ACTIVE_OVERLAY_PLACEMENTS,
  ARKANSAS_OFFICIAL_PDF_ACTIVE_RENDERERS,
  ARKANSAS_OFFICIAL_PDF_FAMILY_ID,
  ARKANSAS_OFFICIAL_PDF_FORM_IDS,
  ARKANSAS_OFFICIAL_PDF_ROUTE_BOUNDARIES,
  ARKANSAS_OFFICIAL_PDF_SOURCE_BACKED_SAMPLES,
  ARKANSAS_OFFICIAL_PDF_SOURCE_BOUNDARIES,
  ARKANSAS_OFFICIAL_PDF_TRACK_IDS,
  ArkansasOfficialPdfFamilyBlockedError,
  assertArkansasCandidateEvidenceSelectable,
  assertArkansasOfficialPdfAuthorityResolved,
  assertArkansasOfficialPdfDocumentMaterialized,
  assertArkansasOfficialPdfExactRequirement,
  assertArkansasOfficialPdfPacketReady,
  assertArkansasOfficialPdfTrackRenderable,
  renderArkansasOfficialPdfFamilyPacket,
} =
  await import("@/lib/rcap/packets/jurisdictions/arkansas/official-pdf/family");

const args = parseArgs(process.argv.slice(2));
const root = process.cwd();
const familyDir = path.join(
  root,
  "data/record-clearing/production-factory/official-pdf-families/AR",
);
const modulePath = path.join(
  root,
  "src/lib/rcap/packets/jurisdictions/arkansas/official-pdf/family.ts",
);

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const readFamilyJson = (fileName) =>
  JSON.parse(fs.readFileSync(path.join(familyDir, fileName), "utf8"));

const manifest = readFamilyJson("family-manifest.json");
const dependencies = readFamilyJson("dependencies.json");
const lanes = readFamilyJson("lanes.json");
const sourceRequirements = readFamilyJson("source-requirements.json");
const renderer = readFamilyJson("renderer-scaffold.json");
const fieldMapSchema = readFamilyJson("field-map.schema.json");
const fieldMap = readFamilyJson("field-map.json");
const ownershipSchema = readFamilyJson("field-ownership.schema.json");
const ownership = readFamilyJson("field-ownership.json");
const fixtureSchema = readFamilyJson("fixtures.schema.json");
const fixtures = readFamilyJson("fixtures.json");
const packetAssembly = readFamilyJson("packet-assembly.json");
const review = readFamilyJson("review-manifest.json");

const productionQueue = readJson(
  "data/record-clearing/production-factory/official-pdf-production-queue.json",
);
const packetSets = readJson(
  "data/record-clearing/legal-design-packet-set-manifests.json",
);
const legalMemo = readJson(
  "data/record-clearing/legal-design-intake/AR.memo.json",
);
const inRepoEvidence = readJson(
  "data/record-clearing/production-factory/source-acquisition/rcap-ar-in-repo-identity-reconciliation-acic.json",
);
const publicEvidence = readJson(
  "data/record-clearing/production-factory/source-acquisition/rcap-ar-public-official-download-acic-gaps.json",
);

const failures = [];
const notes = [];
const ok = (condition, message) => {
  if (!condition) failures.push(message);
};
const note = (message) => notes.push(message);

const FAMILY_ID = "rcap-ar-official-pdf-family";
const EXPECTED_TRACK_IDS = [
  "ar-act346",
  "ar-act531",
  "ar-arrest-seal",
  "ar-cs-possession-seal",
  "ar-drug-court",
  "ar-felony-seal",
  "ar-misdemeanor-dwi-seal",
  "ar-misdemeanor-seal",
  "ar-nonconviction-seal",
  "ar-pardon-seal",
  "ar-veterans-court",
];
const EXPECTED_FORM_IDS = [
  "ACIC-ORDER-DISMISS-AND-SEAL-FIRST-OFFENDERS",
  "ACIC-ORDER-DRUG-COURT",
  "ACIC-ORDER-SEAL-ACT-531-ACT-1460",
  "ACIC-ORDER-TO-SEAL-ARREST",
  "ACIC-ORDER-TO-SEAL-CS-POSSESSION",
  "ACIC-ORDER-TO-SEAL-MISDEMEANOR-DWI-BWI",
  "ACIC-ORDER-TO-SEAL-NONCONVICTION",
  "ACIC-ORDER-TO-SEAL-PARDONED-OFFENDER",
  "ACIC-ORDER-VETERANS-COURT",
  "ACIC-PETITION-DISMISS-AND-SEAL-FIRST-OFFENDERS",
  "ACIC-PETITION-DRUG-COURT",
  "ACIC-PETITION-SEAL-ACT-531-ACT-1460",
  "ACIC-PETITION-TO-SEAL-ARREST",
  "ACIC-PETITION-TO-SEAL-CS-POSSESSION",
  "ACIC-PETITION-TO-SEAL-MISDEMEANOR-DWI-BWI",
  "ACIC-PETITION-TO-SEAL-NONCONVICTION",
  "ACIC-PETITION-TO-SEAL-PARDONED-OFFENDER",
  "ACIC-PETITION-VETERANS-COURT",
  "ACIC-UNIFORM-ORDER-TO-SEAL",
  "ACIC-UNIFORM-PETITION-TO-SEAL",
];
const EXPECTED_EVIDENCE_JOB_IDS = [
  "rcap-ar-in-repo-identity-reconciliation-acic",
  "rcap-ar-public-official-download-acic-gaps",
];
const EXACT_NULL_FIELDS = [
  "exactAuthorityDescriptor",
  "revision",
  "canonicalAuthorityPath",
  "officialSourceUrl",
  "expectedSha256",
  "expectedBytes",
  "expectedMediaType",
  "assignmentAnchor",
  "portableProjection",
  "materializationDestination",
  "verificationCommand",
];
const HASH_PATTERN = /^[a-f0-9]{64}$/;

// ---------------------------------------------------------------------------
// 1. Family boundary and artifact inventory
// ---------------------------------------------------------------------------

ok(manifest.familyId === FAMILY_ID, "Family manifest has the wrong familyId.");
ok(manifest.jurisdiction === "AR", "Family manifest is not Arkansas-scoped.");
ok(
  manifest.productionQueuePriority === 17,
  "Family manifest no longer carries queue priority 17.",
);
ok(
  sameArray(manifest.scope?.trackIds ?? [], EXPECTED_TRACK_IDS),
  "Family manifest track order or scope changed.",
);
ok(
  sameArray(manifest.scope?.officialFormIds ?? [], EXPECTED_FORM_IDS),
  "Family manifest document order or scope changed.",
);
ok(
  manifest.scope?.routeCount === 11 &&
    manifest.scope?.packetComponentCount === 27 &&
    manifest.scope?.officialPdfComponentCount === 22 &&
    manifest.scope?.externalPacketComponentCount === 5 &&
    manifest.scope?.documentIdentityCount === 20,
  "Family manifest has incorrect route, component, or identity counts.",
);
ok(
  manifest.authorityPosture?.knownDocumentIdentityCount === 20 &&
    manifest.authorityPosture?.candidateBackedDocumentIdentityCount === 20 &&
    manifest.authorityPosture?.physicalCandidateEvidenceCount === 22 &&
    manifest.authorityPosture?.trackedEvidenceRecordCount === 2 &&
    manifest.authorityPosture?.exactSourceRequirementCount === 0 &&
    manifest.authorityPosture?.authorityUnmanifestedDocumentCount === 20 &&
    manifest.authorityPosture?.mixedFooterIdentityCount === 1 &&
    manifest.authorityPosture?.compositeQueueIdentityCount === 2,
  "Family manifest authority posture no longer preserves the Arkansas evidence counts.",
);
ok(
  manifest.status?.legalDesignChanged === false &&
    manifest.status?.sourceBackedSampleCount === 0 &&
    manifest.status?.packetReady === false &&
    manifest.status?.generationAllowed === false &&
    manifest.status?.enabled === false,
  "Family manifest claims design mutation, a source-backed sample, or runtime readiness.",
);
ok(
  manifest.sourceMaterialization?.assignmentAnchor === null &&
    manifest.sourceMaterialization?.portableProjection === null &&
    manifest.sourceMaterialization?.portableProjectionAvailable === false &&
    manifest.sourceMaterialization?.workerReady === false &&
    manifest.sourceMaterialization?.workerMaterializationAuthorized === false &&
    manifest.sourceMaterialization?.workerReadAuthorized === false &&
    manifest.sourceMaterialization?.workerMayAcquireOrDownloadSources === false,
  "Family manifest fabricates assignment, projection, worker authority, or readiness.",
);
ok(
  manifest.sourceMaterialization?.repositorySourcePathTreatment ===
    "identity_evidence_only_never_worker_source" &&
    manifest.sourceMaterialization?.publicDownloadRecordTreatment ===
      "identity_evidence_only_not_a_worker_binary" &&
    manifest.sourceMaterialization
      ?.candidateHashMayBecomeExpectedHashWithoutAuthorityAdoption === false &&
    manifest.sourceMaterialization
      ?.generatedOrHistoricalSampleMaySubstituteForSource === false,
  "Family manifest permits an evidence path, prior download, candidate hash, or sample fallback.",
);
ok(
  Object.keys(manifest.artifacts ?? {}).length === 12,
  "Family manifest must name exactly twelve state-scoped JSON artifacts.",
);
for (const artifactPath of Object.values(manifest.artifacts ?? {})) {
  ok(
    typeof artifactPath === "string" &&
      fs.existsSync(path.join(root, artifactPath)),
    `Family artifact is missing: ${artifactPath}.`,
  );
}
ok(
  manifest.implementationModule ===
    "src/lib/rcap/packets/jurisdictions/arkansas/official-pdf/family.ts" &&
    fs.existsSync(path.join(root, manifest.implementationModule)),
  "Arkansas fail-closed implementation module is missing or misnamed.",
);
ok(
  manifest.dedicatedVerifier ===
    "scripts/verify-rcap-arkansas-official-pdf-family.mjs",
  "Family manifest names the wrong dedicated verifier.",
);
note(
  "1. Boundary: twelve Arkansas JSON artifacts and one isolated fail-closed module are present.",
);

// ---------------------------------------------------------------------------
// 2. Queue identity and zero-exact-source posture
// ---------------------------------------------------------------------------

const queueFamily = productionQueue.families.find(
  (entry) => entry.familyId === FAMILY_ID,
);
ok(
  Boolean(queueFamily),
  "Arkansas family is absent from the production queue.",
);
if (queueFamily) {
  ok(
    queueFamily.jurisdiction === "AR" &&
      queueFamily.priority === 17 &&
      queueFamily.workerReady === false &&
      queueFamily.packetReady === false &&
      queueFamily.enabled === false,
    "Production queue Arkansas family changed identity or readiness.",
  );
  ok(
    sameArray(queueFamily.trackIds ?? [], EXPECTED_TRACK_IDS),
    "Production queue Arkansas track set changed.",
  );
  ok(
    sameArray(
      (queueFamily.documents ?? []).map((entry) => entry.officialFormId),
      EXPECTED_FORM_IDS,
    ),
    "Production queue Arkansas document set changed.",
  );
  ok(
    queueFamily.counts?.trackCount === 11 &&
      queueFamily.counts?.componentCount === 22 &&
      queueFamily.counts?.documentCount === 20 &&
      queueFamily.counts?.exactSourceRequirementCount === 0 &&
      queueFamily.counts?.unresolvedSourceIdentityCount === 20,
    "Production queue no longer reports 11 tracks, 22 uses, 20 identities, zero exact requirements, and 20 unresolved identities.",
  );

  for (const document of queueFamily.documents ?? []) {
    ok(
      document.sourceIdentityState === "authority_identity_unresolved" &&
        document.exactSourceRequirement === null &&
        document.workerReady === false &&
        (document.authorityAssets ?? []).length === 0 &&
        (document.repositoryCandidates ?? []).length === 0 &&
        (document.officialSourceUrls ?? []).length === 0,
      `${document.officialFormId}: queue identity unexpectedly became exact or worker-ready.`,
    );
  }
}
note(
  "2. Queue: all 20 identities remain unresolved, with 22 uses and zero exact requirements.",
);

// ---------------------------------------------------------------------------
// 3. Requirements, usage bindings, and packet-set fidelity
// ---------------------------------------------------------------------------

ok(
  sourceRequirements.familyId === FAMILY_ID &&
    sourceRequirements.contractKind ===
      "dependency_scaffold_not_worker_assignment",
  "Source requirements changed family or contract kind.",
);
ok(
  sourceRequirements.assignmentAnchor === null &&
    sourceRequirements.portableProjection === null &&
    sourceRequirements.portableProjectionAvailable === false &&
    sourceRequirements.workerReady === false &&
    sourceRequirements.workerMaterializationAuthorized === false &&
    sourceRequirements.workerReadAuthorized === false &&
    sourceRequirements.workerMayAcquireOrDownloadSources === false,
  "Source requirements fabricate assignment, projection, or worker authority.",
);
ok(
  sourceRequirements.counts?.documentIdentities === 20 &&
    sourceRequirements.counts?.officialPdfUsageBindings === 22 &&
    sourceRequirements.counts?.candidateBackedDocumentIdentities === 20 &&
    sourceRequirements.counts?.physicalCandidateEvidenceRecords === 22 &&
    sourceRequirements.counts?.exactAuthoritySourceRequirements === 0 &&
    sourceRequirements.counts?.authorityUnmanifestedDocuments === 20 &&
    sourceRequirements.counts?.mixedFooterIdentities === 1 &&
    sourceRequirements.counts?.compositeQueueIdentities === 2 &&
    sourceRequirements.counts?.captainProjectedExactSources === 0,
  "Source requirement aggregate counts changed.",
);
ok(
  sameArray(
    sourceRequirements.requirements.map((entry) => entry.officialFormId),
    EXPECTED_FORM_IDS,
  ),
  "Source requirement document ordering or identity changed.",
);

for (const requirement of sourceRequirements.requirements) {
  ok(
    requirement.authorityState === "authority_unmanifested_source" &&
      requirement.identityBindingStatus ===
        "document_identity_known_exact_authority_asset_unresolved",
    `${requirement.officialFormId}: authority state is not unresolved.`,
  );
  for (const field of EXACT_NULL_FIELDS) {
    ok(
      requirement[field] === null,
      `${requirement.officialFormId}: ${field} must remain null.`,
    );
  }
  ok(
    requirement.authoritySelectable === false &&
      requirement.generationAllowed === false &&
      requirement.workerMaterializationAuthorized === false &&
      requirement.workerReadAuthorized === false,
    `${requirement.officialFormId}: source selection or generation was enabled.`,
  );
}

const expectedPacketSets = packetSets.packetSets
  .filter((entry) => EXPECTED_TRACK_IDS.includes(entry.trackId))
  .sort(byTrackId);
const actualPackets = [...packetAssembly.packets].sort(byTrackId);
ok(
  expectedPacketSets.length === 11 && actualPackets.length === 11,
  "Arkansas packet-set or family packet count is not eleven.",
);
for (const expectedPacket of expectedPacketSets) {
  const actualPacket = actualPackets.find(
    (entry) => entry.trackId === expectedPacket.trackId,
  );
  ok(Boolean(actualPacket), `${expectedPacket.trackId}: packet is missing.`);
  if (!actualPacket) continue;

  const expectedComponents = expectedPacket.components.map(
    projectPacketComponent,
  );
  const actualComponents = actualPacket.components.map(projectPacketComponent);
  ok(
    deepEqual(actualComponents, expectedComponents),
    `${expectedPacket.trackId}: deterministic component sequence differs from the adopted packet set.`,
  );
  ok(
    actualPacket.generationState === "blocked" &&
      actualPacket.components.every(
        (component) =>
          component.officialFormId === null ||
          (component.familyTreatment === "owned_scaffold" &&
            component.rendererStrategy === null),
      ),
    `${expectedPacket.trackId}: packet assembly claims an active official-PDF component.`,
  );
}

const expectedUsageBindings = expectedPacketSets
  .flatMap((packet) =>
    packet.components
      .filter((component) => component.officialFormId !== null)
      .map((component) => ({
        officialFormId: component.officialFormId,
        trackId: packet.trackId,
        componentId: component.componentId,
        role: component.role,
        requirement: component.requirement,
        conditionDescription: component.conditionDescription,
        order: component.order,
      })),
  )
  .sort(byUsageBinding);
const actualUsageBindings = sourceRequirements.requirements
  .flatMap((requirement) =>
    requirement.usageBindings.map((binding) => ({
      officialFormId: requirement.officialFormId,
      ...binding,
    })),
  )
  .sort(byUsageBinding);
ok(
  expectedUsageBindings.length === 22 &&
    deepEqual(actualUsageBindings, expectedUsageBindings),
  "The 22 source-requirement usage bindings differ from adopted packet components.",
);
ok(
  packetAssembly.packets.flatMap((packet) => packet.components).length === 27 &&
    packetAssembly.packets
      .flatMap((packet) => packet.components)
      .filter((component) => component.officialFormId !== null).length === 22 &&
    packetAssembly.packets
      .flatMap((packet) => packet.components)
      .filter(
        (component) =>
          component.familyTreatment === "external_required_component",
      ).length === 5,
  "Packet assembly no longer contains exactly 27 positions, 22 official-PDF uses, and 5 external guidance positions.",
);
note(
  "3. Assembly: all 27 adopted positions and all 22 official-PDF usage bindings are deterministic and unchanged.",
);

// ---------------------------------------------------------------------------
// 4. Candidate evidence reconciliation without authority promotion
// ---------------------------------------------------------------------------

ok(
  inRepoEvidence.jobId === EXPECTED_EVIDENCE_JOB_IDS[0] &&
    inRepoEvidence.jurisdiction === "AR" &&
    inRepoEvidence.downloadedSourceCount === 0 &&
    inRepoEvidence.totals?.assignedAcquisitions === 17 &&
    inRepoEvidence.totals?.reconciled === 17 &&
    inRepoEvidence.totals?.retainedArtifactsUsed === 18 &&
    inRepoEvidence.unresolvedIdentities?.length === 0,
  "Tracked in-repository Arkansas evidence record changed identity or totals.",
);
ok(
  publicEvidence.jobId === EXPECTED_EVIDENCE_JOB_IDS[1] &&
    publicEvidence.jurisdiction === "AR" &&
    publicEvidence.downloadedSourceCount === 3 &&
    publicEvidence.totals?.assignedAcquisitions === 3 &&
    publicEvidence.totals?.arkansasQueueRowsAddressed === 4,
  "Tracked public Arkansas evidence record changed identity or totals.",
);

const expectedEvidence = [
  ...extractInRepoEvidence(inRepoEvidence),
  ...extractPublicEvidence(publicEvidence),
].sort(byCandidateId);
const actualEvidence = sourceRequirements.candidateEvidence
  .map(projectCandidateEvidence)
  .sort(byCandidateId);
ok(
  expectedEvidence.length === 22 && actualEvidence.length === 22,
  "Arkansas physical candidate evidence count is not twenty-two.",
);
ok(
  deepEqual(actualEvidence, expectedEvidence),
  "Candidate evidence does not exactly reconcile to the two tracked Arkansas records.",
);
for (const evidence of sourceRequirements.candidateEvidence) {
  ok(
    HASH_PATTERN.test(evidence.observedSha256) &&
      Number.isInteger(evidence.observedBytes) &&
      evidence.observedBytes > 0,
    `${evidence.candidateId}: evidence hash or byte count is invalid.`,
  );
  ok(
    EXPECTED_EVIDENCE_JOB_IDS.includes(evidence.evidenceRecordJobId) &&
      evidence.freshLocalVerification === false &&
      evidence.authorityAdopted === false &&
      evidence.resolverSelectable === false,
    `${evidence.candidateId}: evidence was promoted, freshly asserted, or attributed to another record.`,
  );
}

const mixedAcquisition = publicEvidence.acquisitions.find(
  (entry) =>
    entry.documentId === "ACIC-PETITION-DISMISS-AND-SEAL-FIRST-OFFENDERS",
);
ok(
  mixedAcquisition?.resolvedRevision === null &&
    mixedAcquisition?.proposedRevision === "REV-2014-08-25" &&
    mixedAcquisition?.requiresAuthorityConfirmation === true &&
    sameArray(
      mixedAcquisition.footerObservations.map((entry) => entry.page),
      [1, 2, 3, 4, 5],
    ) &&
    mixedAcquisition.footerObservations.filter((entry) =>
      entry.footer.includes("08/25/2014"),
    ).length === 4 &&
    mixedAcquisition.footerObservations.filter((entry) =>
      entry.footer.includes("04/01/2015"),
    ).length === 1,
  "Act 346 petition mixed-footer evidence or unresolved revision decision was lost.",
);

const uniformPetition = publicEvidence.acquisitions.find(
  (entry) => entry.documentId === "ACIC-UNIFORM-PETITION-TO-SEAL",
);
ok(
  uniformPetition?.compositeDocument === true &&
    uniformPetition?.halves?.length === 2 &&
    new Set(uniformPetition.halves.map((entry) => entry.resolvedRevision))
      .size === 2 &&
    new Set(
      uniformPetition.halves.map(
        (entry) =>
          entry.retainedArtifact?.recordedSha256 ?? entry.binary?.sha256,
      ),
    ).size === 2,
  "Uniform petition felony and misdemeanor candidate variants were collapsed.",
);

const uniformOrder = inRepoEvidence.reconciliations.find(
  (entry) => entry.documentId === "ACIC-UNIFORM-ORDER-TO-SEAL",
);
ok(
  uniformOrder?.retainedArtifacts?.length === 2 &&
    new Set(uniformOrder.retainedArtifacts.map((entry) => entry.recordedSha256))
      .size === 2 &&
    new Set(uniformOrder.retainedArtifacts.map((entry) => entry.provenRevision))
      .size === 2,
  "Uniform order felony and misdemeanor candidate variants were collapsed.",
);
note(
  "4. Evidence: 22 physical candidates reconcile to exactly two tracked records; none is authority or a resolver source.",
);

// ---------------------------------------------------------------------------
// 5. Lanes, renderer, maps, ownership, fixtures, and schemas
// ---------------------------------------------------------------------------

ok(
  lanes.counts?.documentIdentityLanes === 20 &&
    lanes.counts?.candidateEvidenceRecords === 22 &&
    lanes.counts?.authorityAdoptedLanes === 0 &&
    lanes.counts?.materializationReadyLanes === 0 &&
    lanes.counts?.activeRendererLanes === 0 &&
    lanes.documents?.length === 20,
  "Lane counts no longer describe a fully blocked 20-document scaffold.",
);
for (const lane of lanes.documents) {
  ok(
    lane.materializationLane === "ineligible_authority_unmanifested" &&
      lane.activeRenderer === null &&
      lane.rendererLane === "pending_fresh_local_source_inspection",
    `${lane.officialFormId}: lane became materializable or renderable.`,
  );
}
ok(
  renderer.enabled === false &&
    renderer.activeRendererCount === 0 &&
    renderer.rendererAdapters?.length === 3 &&
    renderer.rendererAdapters.every((entry) => entry.enabled === false) &&
    renderer.documents?.length === 20,
  "Renderer scaffold is missing a disabled adapter or claims an enabled renderer.",
);
for (const document of renderer.documents) {
  ok(
    document.sourceAuthorityState === "authority_unmanifested_source" &&
      document.candidateRenderer === null &&
      document.activeRenderer === null,
    `${document.officialFormId}: renderer source or strategy was activated.`,
  );
}

ok(
  fieldMap.activeMappingCount === 0 &&
    fieldMap.activeOverlayPlacementCount === 0 &&
    fieldMap.forms?.length === 20,
  "Field-map scaffold gained mappings, overlays, or lost a form.",
);
for (const form of fieldMap.forms) {
  ok(
    form.authorityState === "authority_unmanifested_source" &&
      form.rendererStrategy === null &&
      form.mappingReady === false &&
      form.expectedStructure === null &&
      form.mappings?.length === 0 &&
      form.overlayPlacements?.length === 0,
    `${form.officialFormId}: field mapping is no longer a zero-row scaffold.`,
  );
}

ok(ownership.forms?.length === 20, "Ownership map must contain 20 forms.");
for (const form of ownership.forms) {
  const isOrder = form.documentRole === "proposed_order";
  ok(
    form.sourceAuthorityState === "authority_unmanifested_source" &&
      form.expectedFieldCount === null &&
      form.coverageComplete === false &&
      form.fields?.length === 0,
    `${form.officialFormId}: ownership map asserts unmeasured PDF fields.`,
  );
  ok(
    isOrder
      ? form.knownManualCompletionItems?.some(
          (entry) =>
            entry.semanticItem === "judge_clerk_and_court_completion" &&
            entry.owner === "prohibited_from_generation",
        )
      : form.knownManualCompletionItems?.some(
          (entry) =>
            entry.semanticItem === "participant_signature_and_date" &&
            entry.owner === "participant_manual",
        ),
    `${form.officialFormId}: semantic manual/prohibited ownership policy is missing.`,
  );
}

validateWithSchema(fieldMapSchema, fieldMap, "field-map.json");
validateWithSchema(ownershipSchema, ownership, "field-ownership.json");
validateWithSchema(fixtureSchema, fixtures, "fixtures.json");
ok(
  fixtures.fixtureKind === "synthetic_preflight_contract_only" &&
    fixtures.containsRealParticipantData === false &&
    fixtures.factsAreEligibilityDeterminations === false &&
    fixtures.renderedSampleCount === 0 &&
    fixtures.sampleArtifacts?.length === 0 &&
    fixtures.routeFixtures?.length === 11,
  "Fixtures claim real data, determinations, rendering, or the wrong route count.",
);
for (const fixture of fixtures.routeFixtures) {
  const memoTrack = legalMemo.tracks.find(
    (entry) => entry.trackId === fixture.trackId,
  );
  const expectedFactKeys = (memoTrack?.participantInputs ?? []).map(
    (entry) => entry.key,
  );
  ok(
    sameArray(fixture.requiredFactKeys, expectedFactKeys) &&
      sameArray(Object.keys(fixture.syntheticFacts), expectedFactKeys) &&
      Object.values(fixture.syntheticFacts).every(
        (value) => value === "SYNTHETIC_UNANSWERED",
      ) &&
      fixture.renderExpected === false,
    `${fixture.trackId}: synthetic fixture differs from adopted participant fact keys or claims rendering.`,
  );
  const packet = packetAssembly.packets.find(
    (entry) => entry.trackId === fixture.trackId,
  );
  ok(
    deepEqual(
      fixture.currentExpectedBlockers,
      packet?.blockingReasonCodes ?? [],
    ),
    `${fixture.trackId}: fixture blockers differ from packet blockers.`,
  );
}
ok(
  fixtures.boundaryFixtures?.length === 8 &&
    sameSet(
      fixtures.boundaryFixtures.map((entry) => entry.expectedCode),
      [
        "authority_unmanifested_source",
        "candidate_evidence_not_authority",
        "authority_mixed_footer_revision_unresolved",
        "authority_composite_identity_unresolved",
        "legal_design_waiting_period_blocker",
        "legal_design_venue_blocker",
      ],
    ),
  "Boundary fixtures no longer cover unresolved, evidence, composite, materialization, and legal blockers.",
);
note(
  "5. Scaffolds: schemas validate; all 20 maps are zero-row; all 11 fixtures are synthetic and blocked.",
);

// ---------------------------------------------------------------------------
// 6. Legal blockers, dependencies, review, and promotion
// ---------------------------------------------------------------------------

const inScopeMemoTracks = legalMemo.tracks.filter((entry) =>
  EXPECTED_TRACK_IDS.includes(entry.trackId),
);
ok(
  inScopeMemoTracks.length === 11 &&
    inScopeMemoTracks.every(
      (entry) =>
        entry.legalDesignDecision?.status ===
        "legal_design_approved_with_limitations",
    ),
  "The eleven in-scope Arkansas tracks lost approved-with-limitations status.",
);
const buildBlockers = inScopeMemoTracks.flatMap((track) =>
  (track.unresolvedQuestions ?? [])
    .filter((question) => question.impact === "build_blocker")
    .map((question) => ({
      trackId: track.trackId,
      affectedElement: question.affectedElement,
    })),
);
ok(
  deepEqual(buildBlockers, [
    {
      trackId: "ar-misdemeanor-dwi-seal",
      affectedElement: "waiting_period",
    },
    {
      trackId: "ar-misdemeanor-dwi-seal",
      affectedElement: "waiting_period",
    },
    {
      trackId: "ar-nonconviction-seal",
      affectedElement: "venue",
    },
  ]),
  "The two DWI waiting-period questions and one nonconviction venue build blocker changed.",
);

const dependencyById = new Map(
  dependencies.dependencies.map((entry) => [entry.dependencyId, entry]),
);
for (const dependencyId of [
  "ar-successor-authority-edition-source-identities",
  "ar-act346-mixed-footer-revision",
  "ar-uniform-petition-composite-binding",
  "ar-uniform-order-composite-binding",
  "ar-captain-assignment-and-portable-projection",
  "ar-dwi-bwi-waiting-period-legal-design",
  "ar-nonconviction-venue-legal-design",
  "ar-projected-source-technical-inspection",
  "ar-field-map-and-ownership-completion",
  "ar-source-backed-samples-and-review",
]) {
  ok(
    dependencyById.get(dependencyId)?.status === "blocked",
    `${dependencyId}: required dependency is not blocked.`,
  );
}
ok(
  dependencyById.get("ar-acic-candidate-evidence-reconciliation")?.status ===
    "satisfied_as_evidence_only" &&
    dependencyById.get("ar-acic-candidate-evidence-reconciliation")
      ?.authorityAssetsAdopted === 0,
  "Candidate reconciliation was promoted beyond evidence-only status.",
);
ok(
  review.sourceReview?.knownDocumentIdentityCount === 20 &&
    review.sourceReview?.physicalCandidateEvidenceCount === 22 &&
    review.sourceReview?.exactAuthorityAssetCount === 0 &&
    review.sourceReview?.exactSourceRequirementCount === 0 &&
    review.sourceReview?.authorityUnmanifestedDocumentCount === 20 &&
    review.sourceReview?.captainAssignedSourceCount === 0 &&
    review.sourceReview?.portableProjectedSourceCount === 0 &&
    review.sourceReview?.locallyVerifiedReadOnlySourceCount === 0,
  "Review manifest source posture changed.",
);
ok(
  review.evidenceReviews?.length === 5 &&
    review.documentReviews?.length === 20 &&
    review.routeReviews?.length === 11 &&
    review.sourceBackedSampleCount === 0 &&
    review.samplePackets?.length === 0 &&
    review.visualInspectionArtifacts?.length === 0 &&
    review.fieldMapReviewArtifacts?.length === 0,
  "Review manifest gained a sample/review artifact or lost scope.",
);
ok(
  review.evidenceReviews
    .filter((entry) => "selectedRevision" in entry)
    .every((entry) => entry.selectedRevision === null),
  "Review manifest selected a mixed-footer or composite revision.",
);
ok(
  review.promotion?.packetReady === false &&
    review.promotion?.generationAllowed === false &&
    review.promotion?.enabled === false &&
    review.promotion?.approvedForLive === false &&
    review.promotion?.live === false,
  "Review manifest promotes Arkansas toward runtime or live use.",
);
note(
  "6. Review: three legal build-blocker questions, authority decisions, and all promotion gates remain blocked.",
);

// ---------------------------------------------------------------------------
// 7. Typed boundary, runtime-negative assertions, and isolation
// ---------------------------------------------------------------------------

ok(
  ARKANSAS_OFFICIAL_PDF_FAMILY_ID === FAMILY_ID &&
    sameArray(ARKANSAS_OFFICIAL_PDF_TRACK_IDS, EXPECTED_TRACK_IDS) &&
    sameArray(ARKANSAS_OFFICIAL_PDF_FORM_IDS, EXPECTED_FORM_IDS),
  "TypeScript boundary identity differs from the family manifests.",
);
ok(
  ARKANSAS_OFFICIAL_PDF_SOURCE_BOUNDARIES.length === 20 &&
    ARKANSAS_OFFICIAL_PDF_SOURCE_BOUNDARIES.every(
      (entry) =>
        entry.authorityState === "authority_unmanifested_source" &&
        entry.exactAuthorityDescriptor === null &&
        entry.revision === null &&
        entry.expectedSha256 === null &&
        entry.expectedBytes === null &&
        entry.assignmentAnchor === null &&
        entry.portableProjection === null &&
        entry.authoritySelectable === false &&
        entry.materializationAuthorized === false &&
        entry.rendererEnabled === false,
    ),
  "TypeScript source boundaries fabricate exact source data or runtime readiness.",
);
ok(
  ARKANSAS_OFFICIAL_PDF_ROUTE_BOUNDARIES.length === 11 &&
    ARKANSAS_OFFICIAL_PDF_ROUTE_BOUNDARIES.every(
      (entry) => entry.packetReady === false && entry.rendererEnabled === false,
    ),
  "TypeScript route boundaries claim packet or renderer readiness.",
);
ok(
  ARKANSAS_OFFICIAL_PDF_ACTIVE_RENDERERS.length === 0 &&
    ARKANSAS_OFFICIAL_PDF_SOURCE_BACKED_SAMPLES.length === 0 &&
    Object.values(ARKANSAS_OFFICIAL_PDF_ACTIVE_FIELD_MAPPINGS).every(
      (entries) => entries.length === 0,
    ) &&
    Object.values(ARKANSAS_OFFICIAL_PDF_ACTIVE_OVERLAY_PLACEMENTS).every(
      (entries) => entries.length === 0,
    ),
  "TypeScript boundary exposes a renderer, sample, mapping, or overlay.",
);

expectBlocked(
  () => assertArkansasOfficialPdfExactRequirement("ACIC-ORDER-TO-SEAL-ARREST"),
  "authority_unmanifested_source",
  "exact requirement assertion",
);
expectBlocked(
  () =>
    assertArkansasOfficialPdfAuthorityResolved(
      "ACIC-PETITION-DISMISS-AND-SEAL-FIRST-OFFENDERS",
    ),
  "authority_mixed_footer_revision_unresolved",
  "mixed-footer authority assertion",
);
expectBlocked(
  () =>
    assertArkansasOfficialPdfAuthorityResolved("ACIC-UNIFORM-PETITION-TO-SEAL"),
  "authority_composite_identity_unresolved",
  "composite petition authority assertion",
);
expectBlocked(
  () =>
    assertArkansasOfficialPdfAuthorityResolved("ACIC-UNIFORM-ORDER-TO-SEAL"),
  "authority_composite_identity_unresolved",
  "composite order authority assertion",
);
expectBlocked(
  () => assertArkansasCandidateEvidenceSelectable("ACIC-ORDER-VETERANS-COURT"),
  "candidate_evidence_not_authority",
  "candidate selection assertion",
);
expectBlocked(
  () =>
    assertArkansasOfficialPdfDocumentMaterialized("ACIC-ORDER-TO-SEAL-ARREST"),
  "authority_unmanifested_source",
  "materialization assertion",
);
expectBlocked(
  () => assertArkansasOfficialPdfTrackRenderable("ar-misdemeanor-dwi-seal"),
  "legal_design_waiting_period_blocker",
  "DWI render assertion",
);
expectBlocked(
  () => assertArkansasOfficialPdfPacketReady("ar-nonconviction-seal"),
  "legal_design_venue_blocker",
  "nonconviction packet assertion",
);
expectBlocked(
  () => renderArkansasOfficialPdfFamilyPacket("ar-act346", {}),
  "authority_mixed_footer_revision_unresolved",
  "runtime render assertion",
);

const moduleSource = fs.readFileSync(modulePath, "utf8");
ok(
  !/\b(?:node:fs|node:path|fetch\s*\(|https?:\/\/|pdf-lib|repositorySourcePath)\b/.test(
    moduleSource,
  ),
  "Typed boundary contains a filesystem, network, PDF, URL, or repository-path source sink.",
);
const familySourceText = [
  ...fs
    .readdirSync(familyDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => fs.readFileSync(path.join(familyDir, name), "utf8")),
  moduleSource,
].join("\n");
ok(
  !familySourceText.includes("private/Nationwide Record Clearing/"),
  "Arkansas family artifacts expose a private source path.",
);
ok(
  !familySourceText.includes('"materializationDestination": "'),
  "Arkansas family artifacts expose a materialization destination.",
);

const unexpectedImports = listFilesRecursively(
  path.join(root, "src/lib/rcap"),
).filter((filePath) => {
  if (filePath === modulePath || !/\.(?:ts|tsx)$/.test(filePath)) return false;
  const source = fs.readFileSync(filePath, "utf8");
  return (
    source.includes("jurisdictions/arkansas/official-pdf") ||
    source.includes("ARKANSAS_OFFICIAL_PDF_FAMILY")
  );
});
ok(
  unexpectedImports.length === 0,
  `Arkansas boundary was imported by a shared/live surface: ${unexpectedImports
    .map((filePath) => path.relative(root, filePath))
    .join(", ")}.`,
);
note(
  "7. Runtime: exact, unresolved, materialization, render, and packet assertions fail closed; no source sink or shared import exists.",
);

if (failures.length > 0) {
  finish({
    ok: false,
    familyId: FAMILY_ID,
    failures,
    notes,
  });
}

const requestedGate = selectRequestedGate(args);
if (requestedGate) {
  runNegativeGate(requestedGate);
}

finish({
  ok: true,
  familyId: FAMILY_ID,
  jurisdiction: "AR",
  productionQueuePriority: 17,
  counts: {
    tracks: 11,
    packetComponents: 27,
    officialPdfUsages: 22,
    externalGuidanceComponents: 5,
    documentIdentities: 20,
    candidateEvidenceRecords: 22,
    exactAuthorityRequirements: 0,
    activeRenderers: 0,
    activeMappings: 0,
    sourceBackedSamples: 0,
  },
  notes,
});

function extractInRepoEvidence(record) {
  return record.reconciliations.flatMap((reconciliation) =>
    reconciliation.retainedArtifacts.map((artifact) => {
      let variantScopeTrackId = null;
      if (reconciliation.documentId === "ACIC-UNIFORM-ORDER-TO-SEAL") {
        variantScopeTrackId = artifact.artifactId.includes("-felony-")
          ? "ar-felony-seal"
          : "ar-misdemeanor-seal";
      }

      return {
        candidateId: artifact.artifactId,
        officialFormId: reconciliation.documentId,
        variantScopeTrackId,
        evidenceKind:
          reconciliation.documentId === "ACIC-UNIFORM-ORDER-TO-SEAL"
            ? "retained_composite_variant_metadata"
            : "retained_asset_reconciliation_metadata",
        candidateRevision: artifact.provenRevision
          ? `REV-${artifact.provenRevision}`
          : reconciliation.currentRevision,
        proposedRevision: null,
        observedSha256: artifact.recordedSha256,
        observedBytes: artifact.sizeBytes,
        historicalPageCount: artifact.pageCount,
        historicalTechnicalClass: artifact.technicalClass,
        mixedFooterRevision: false,
        evidenceRecordJobId: record.jobId,
        freshLocalVerification: false,
        authorityAdopted: false,
        resolverSelectable: false,
      };
    }),
  );
}

function extractPublicEvidence(record) {
  const extracted = [];
  for (const acquisition of record.acquisitions) {
    if (acquisition.documentId === "ACIC-UNIFORM-PETITION-TO-SEAL") {
      for (const half of acquisition.halves) {
        const retained = half.retainedArtifact;
        extracted.push({
          candidateId:
            retained?.artifactId ?? half.inventoryCrossCheck.artifactId,
          officialFormId: acquisition.documentId,
          variantScopeTrackId: half.coversTrackId,
          evidenceKind:
            half.half === "felony"
              ? "retained_composite_variant_metadata"
              : "public_download_and_inventory_crosscheck",
          candidateRevision: half.resolvedRevision,
          proposedRevision: null,
          observedSha256: retained?.recordedSha256 ?? half.binary.sha256,
          observedBytes: retained?.sizeBytes ?? half.binary.sizeBytes,
          historicalPageCount: retained?.pageCount ?? half.pageCount,
          historicalTechnicalClass: retained?.technicalClass ?? null,
          mixedFooterRevision: half.half === "felony",
          evidenceRecordJobId: record.jobId,
          freshLocalVerification: false,
          authorityAdopted: false,
          resolverSelectable: false,
        });
      }
      continue;
    }

    extracted.push({
      candidateId: acquisition.acquisitionId,
      officialFormId: acquisition.documentId,
      variantScopeTrackId: null,
      evidenceKind: "public_official_download_record",
      candidateRevision: acquisition.resolvedRevision,
      proposedRevision: acquisition.proposedRevision ?? null,
      observedSha256: acquisition.binary.sha256,
      observedBytes: acquisition.binary.sizeBytes,
      historicalPageCount: acquisition.pageCount,
      historicalTechnicalClass: null,
      mixedFooterRevision:
        acquisition.revisionStatus === "unconfirmed_mixed_printed_footer",
      evidenceRecordJobId: record.jobId,
      freshLocalVerification: false,
      authorityAdopted: false,
      resolverSelectable: false,
    });
  }
  return extracted;
}

function projectCandidateEvidence(entry) {
  return {
    candidateId: entry.candidateId,
    officialFormId: entry.officialFormId,
    variantScopeTrackId: entry.variantScopeTrackId,
    evidenceKind: entry.evidenceKind,
    candidateRevision: entry.candidateRevision,
    proposedRevision: entry.proposedRevision,
    observedSha256: entry.observedSha256,
    observedBytes: entry.observedBytes,
    historicalPageCount: entry.historicalPageCount,
    historicalTechnicalClass: entry.historicalTechnicalClass,
    mixedFooterRevision: entry.mixedFooterRevision,
    evidenceRecordJobId: entry.evidenceRecordJobId,
    freshLocalVerification: entry.freshLocalVerification,
    authorityAdopted: entry.authorityAdopted,
    resolverSelectable: entry.resolverSelectable,
  };
}

function projectPacketComponent(component) {
  return {
    componentId: component.componentId,
    role: component.role,
    requirement: component.requirement,
    conditionDescription: component.conditionDescription,
    outputStrategy: component.outputStrategy,
    officialFormId: component.officialFormId,
    order: component.order,
  };
}

function validateWithSchema(schema, value, label) {
  try {
    const require = createRequire(import.meta.url);
    const Ajv = require("ajv");
    const compatibleSchema = structuredClone(schema);
    delete compatibleSchema.$schema;
    const validate = new Ajv({ allErrors: true }).compile(compatibleSchema);
    ok(
      validate(value),
      `${label} fails its checked-in schema: ${JSON.stringify(validate.errors)}`,
    );
  } catch (error) {
    failures.push(`${label} schema validation crashed: ${error.message}`);
  }
}

function expectBlocked(operation, expectedCode, label) {
  try {
    operation();
    failures.push(`${label} unexpectedly succeeded.`);
  } catch (error) {
    ok(
      error instanceof ArkansasOfficialPdfFamilyBlockedError &&
        error.code === expectedCode,
      `${label} returned ${
        error instanceof ArkansasOfficialPdfFamilyBlockedError
          ? error.code
          : (error?.name ?? "unknown error")
      }, expected ${expectedCode}.`,
    );
  }
}

function runNegativeGate(gate) {
  try {
    switch (gate.kind) {
      case "exact":
        assertArkansasOfficialPdfExactRequirement(gate.value);
        break;
      case "resolved":
        assertArkansasOfficialPdfAuthorityResolved(gate.value);
        break;
      case "materialized":
        assertArkansasOfficialPdfDocumentMaterialized(gate.value);
        break;
      case "renderable":
        assertArkansasOfficialPdfTrackRenderable(gate.value);
        break;
      case "packet":
        assertArkansasOfficialPdfPacketReady(gate.value);
        break;
      default:
        throw new Error(`Unsupported gate kind: ${gate.kind}`);
    }

    finish({
      ok: false,
      familyId: FAMILY_ID,
      requestedGate: gate,
      failures: ["Negative gate unexpectedly succeeded."],
    });
  } catch (error) {
    if (!(error instanceof ArkansasOfficialPdfFamilyBlockedError)) {
      finish({
        ok: false,
        familyId: FAMILY_ID,
        requestedGate: gate,
        failures: [error?.message ?? String(error)],
      });
    }

    finish({
      ok: false,
      familyId: FAMILY_ID,
      requestedGate: gate,
      blockedAsExpected: true,
      code: error.code,
      message: error.message,
    });
  }
}

function parseArgs(argv) {
  const parsed = { json: false, gates: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      parsed.json = true;
      continue;
    }

    const gateNames = new Map([
      ["--require-exact", "exact"],
      ["--require-resolved", "resolved"],
      ["--reject-unresolved", "resolved"],
      ["--require-materialized", "materialized"],
      ["--require-renderable", "renderable"],
      ["--require-packet-ready", "packet"],
    ]);
    if (gateNames.has(arg)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        process.stderr.write(`${arg} requires an identifier.\n`);
        process.exit(2);
      }
      parsed.gates.push({ kind: gateNames.get(arg), value });
      index += 1;
      continue;
    }

    process.stderr.write(`Unknown argument: ${arg}\n`);
    process.exit(2);
  }
  return parsed;
}

function selectRequestedGate(parsed) {
  if (parsed.gates.length > 1) {
    process.stderr.write("Provide at most one negative gate per invocation.\n");
    process.exit(2);
  }
  return parsed.gates[0] ?? null;
}

function finish(result) {
  const shouldSucceed = result.ok === true;
  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else if (shouldSucceed) {
    process.stdout.write(
      `PASS ${result.familyId}: ${result.counts.tracks} tracks, ${result.counts.officialPdfUsages} official-PDF uses, ${result.counts.documentIdentities} identities, ${result.counts.candidateEvidenceRecords} evidence records, zero exact sources.\n`,
    );
    for (const item of result.notes ?? []) {
      process.stdout.write(`- ${item}\n`);
    }
  } else {
    process.stderr.write(`${JSON.stringify(result, null, 2)}\n`);
  }
  process.exit(shouldSucceed ? 0 : 1);
}

function listFilesRecursively(directoryPath) {
  const files = [];
  for (const entry of fs.readdirSync(directoryPath, {
    withFileTypes: true,
  })) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursively(entryPath));
    } else {
      files.push(entryPath);
    }
  }
  return files;
}

function sameArray(left, right) {
  return (
    left.length === right.length &&
    left.every((entry, index) => entry === right[index])
  );
}

function sameSet(left, right) {
  return (
    new Set(left).size === new Set(right).size &&
    [...new Set(left)].every((entry) => new Set(right).has(entry))
  );
}

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function byTrackId(left, right) {
  return left.trackId.localeCompare(right.trackId);
}

function byCandidateId(left, right) {
  return left.candidateId.localeCompare(right.candidateId);
}

function byUsageBinding(left, right) {
  return [left.officialFormId, left.trackId, left.componentId]
    .join("\u0000")
    .localeCompare(
      [right.officialFormId, right.trackId, right.componentId].join("\u0000"),
    );
}
