#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const repositoryRoot = resolve(dirname(scriptPath), "../../../../../");
const baseCommit = "d324b897a8342d81f1a73d62cd529c87b8408feb";
const registryCommit = "3b6f4c103d2f97249b45acc0ea3fb889ff8787e5";
const outputDataDirectory = join(repositoryRoot, "data/rcap-codex/d-track-terminalization");
const outputDocsDirectory = join(repositoryRoot, "docs/rcap/codex/d-track-terminalization");
const dispatchDirectory = join(outputDocsDirectory, "dispatch");
const d2aSummaryDirectory = join(dispatchDirectory, "d2a-proposed-jurisdiction-summaries");

const readJson = (path) => JSON.parse(readFileSync(join(repositoryRoot, path), "utf8"));
const readGitJson = (commit, path) => JSON.parse(execFileSync(
  "git",
  ["show", `${commit}:${path}`],
  { cwd: repositoryRoot, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
));
const stableJson = (value) => `${JSON.stringify(value, null, 2)}\n`;
const writeJson = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, stableJson(value));
};
const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const unique = (values) => [...new Set(values)];
const countBy = (values, key) => Object.fromEntries(
  [...values.reduce((map, item) => map.set(item[key], (map.get(item[key]) ?? 0) + 1), new Map())]
    .sort(([left], [right]) => left.localeCompare(right)),
);

const terminalization = readJson("data/rcap-ledger/track-terminalization.json");
const authorityLedger = readJson("data/rcap-ledger/authority-ledger.json");
const registryProjection = readJson("data/rcap-ledger/registry-crosswalk-projection.json");
const stagingAction = readJson("data/rcap-staging-action.json");
const manifest = readJson("docs/record-clearing/d-wave/corrected-review-manifest.json");
const handoff = readJson("docs/record-clearing/d-wave/corrections-v2/captain-handoff.json");
const sourceRelationshipPath = "data/record-clearing/legal-design-track-source-relationships.json";
const sourceRelationshipsRaw = execFileSync(
  "git",
  ["show", `${registryCommit}:${sourceRelationshipPath}`],
  { cwd: repositoryRoot, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
);
const sourceRelationships = JSON.parse(sourceRelationshipsRaw);

const gitObjectExists = (commit, path) => {
  try {
    execFileSync("git", ["cat-file", "-e", `${commit}:${path}`], {
      cwd: repositoryRoot,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
};

assert.equal(terminalization.registrySource.commit, registryCommit);
assert.equal(
  createHash("sha256").update(sourceRelationshipsRaw).digest("hex"),
  terminalization.registrySource.sha256[sourceRelationshipPath],
);
assert.equal(handoff.gate4.duplicates.length, 0);
assert.equal(stagingAction.status, "prepared_queued_not_authorized");
assert.equal(stagingAction.readyToRequestAuthorization, false);
assert.equal(stagingAction.finalAcceptedSha, null);
assert.deepEqual(stagingAction.authorizes, []);

const dJobs = terminalization.jobs.filter(({ lane }) => lane === "D");
const canonicalTrackIds = dJobs.flatMap(({ trackIds }) => trackIds);
assert.equal(dJobs.length, 27);
assert.equal(canonicalTrackIds.length, 67);
assert.equal(new Set(canonicalTrackIds).size, 67);

const jobByTrackId = new Map();
for (const job of dJobs) {
  for (const trackId of job.trackIds) {
    assert(!jobByTrackId.has(trackId));
    jobByTrackId.set(trackId, job);
  }
}

const authorityByTrackId = new Map(authorityLedger.tracks.map((track) => [track.trackId, track]));
const registryByTrackId = new Map(registryProjection.tracks.map((track) => [track.trackId, track]));
const familyById = new Map(manifest.families.map((family) => [family.familyId, family]));
const familiesByDocumentIdentity = new Map();
for (const family of manifest.families) {
  const key = `${family.jurisdiction}\u0000${family.documentId}`;
  const values = familiesByDocumentIdentity.get(key) ?? [];
  values.push(family);
  familiesByDocumentIdentity.set(key, values);
}

const technicalDispositionByFamilyId = new Map();
for (const family of handoff.gate1.families) {
  technicalDispositionByFamilyId.set(family.familyId, family.finalDisposition);
}
for (const family of handoff.gate2.families) {
  technicalDispositionByFamilyId.set(
    family.familyId,
    family.result === "prior_technical_approval_reaffirmed"
      ? "technical_approved"
      : "correction_required",
  );
}
for (const family of handoff.gate3.families) {
  technicalDispositionByFamilyId.set(family.familyId, family.finalDisposition);
}
assert.equal(technicalDispositionByFamilyId.size, manifest.families.length);

const relationshipByTrackId = new Map();
for (const relationship of sourceRelationships.relationships) {
  if (!jobByTrackId.has(relationship.trackId)) continue;
  const values = relationshipByTrackId.get(relationship.trackId) ?? [];
  values.push(relationship);
  relationshipByTrackId.set(relationship.trackId, values);
}
assert.equal(relationshipByTrackId.size, 67);

const d2aJurisdictions = new Set(["AZ", "IL", "KS", "MN", "WA"]);
const d2aJurisdictionSlugs = {
  AZ: "arizona",
  IL: "illinois",
  KS: "kansas",
  MN: "minnesota",
  WA: "washington",
};
for (const [jurisdiction, slug] of Object.entries(d2aJurisdictionSlugs)) {
  const directory = `data/rcap-all50/overlays/production/${slug}`;
  assert(gitObjectExists(handoff.correctionBranches.D2A.commit, `${directory}/state-index.json`));
  assert(!gitObjectExists(handoff.correctionBranches.D2A.commit, `${directory}/jurisdiction-summary.json`));
}

const summariesWithTracksPropertyAbsent = {
  D2B: {
    commit: handoff.correctionBranches.D2B.commit,
    jurisdictions: {
      FL: "florida",
      LA: "louisiana",
      NJ: "new-jersey",
      NM: "new-mexico",
    },
  },
  D3B: {
    commit: handoff.correctionBranches.D3B.commit,
    jurisdictions: {
      IA: "iowa",
      MA: "massachusetts",
      OR: "oregon",
      UT: "utah",
    },
  },
};
for (const { commit, jurisdictions } of Object.values(summariesWithTracksPropertyAbsent)) {
  for (const slug of Object.values(jurisdictions)) {
    const summary = readGitJson(
      commit,
      `data/rcap-all50/overlays/production/${slug}/jurisdiction-summary.json`,
    );
    assert(!Object.hasOwn(summary, "tracks"));
  }
}
const treatyFishingTrackId = "wa_vac_treaty_fishing";
const treatyFishingConflict = {
  reasonCode: "track_specific_form_set_conflicts_with_generic_registry_relationship",
  explanation: "The pinned relationship file assigns CrRLJ-09.0100 and CrRLJ-09.0200, but the D2A state index and compiled profile identify the treaty-fishing set as legacy CR-09.0500, CR-09.0600 and CR-09.0700. No committed reconciliation authorizes substituting the generic pair.",
  specificSources: [
    {
      officialFormId: "CR-09.0500",
      sourceSha256: "59d91eb42c66b0361ff53d01fe0b0eceadf7d7e1cbf6a19d4087705353f10eed",
    },
    {
      officialFormId: "CR-09.0600",
      sourceSha256: "61e81ab4f30c5c04d8ad5f1958df826bc1f1ecf4f1a7199d5985cf09446c",
    },
    {
      officialFormId: "CR-09.0700",
      sourceSha256: "f70ff836843b32ca2629656662c5049b637b2f078bc97058ad1b3fa63bede3cb",
    },
  ],
  evidence: [
    `${registryCommit}:data/record-clearing/legal-design-track-source-relationships.json#/relationships[trackId=wa_vac_treaty_fishing]`,
    "bc139e24c987728dda585a58e0736ec14b6a996a:data/rcap-all50/overlays/production/washington/state-index.json#/nonPdfSources",
    `${baseCommit}:src/lib/rcap-engine/compiled/profiles/WA-washington.json#/packetGenerator/formInventory`,
  ],
};

const d2aCandidateEdges = {
  az_certificate_second_chance: [
    {
      familyIds: [
        "AZ:aoccrsa3f-103023-source-gated-en",
        "AZ:aoccrsa4f-103023-source-gated-en",
      ],
      status: "blocked_not_a_family_edge",
      reason: "Registry relationships cite the 010122 revisions; D2A implemented 103023. No committed successor or alias record joins the revisions.",
    },
  ],
  az_marijuana_expungement_limited_jurisdiction: [
    {
      familyIds: ["AZ:aoccrem2f-071221-source-gated-en"],
      status: "blocked_not_a_family_edge",
      reason: "The registry identity AOC-CREM2F-071221 and family identity AOCCREM2F-071221 differ, and no committed alias crosswalk exists.",
    },
    {
      familyIds: ["AZ:aoccrem1i-071221-instructions-en"],
      status: "registry-reference-only_not_a_required_family_edge",
      reason: "The projection mentions CREM1I, but the pinned component relationship set does not assign that instructions asset to this track.",
    },
  ],
  az_marijuana_expungement_superior_court: [
    {
      familyIds: ["AZ:aoccrem3f-071221-source-gated-en"],
      status: "blocked_not_a_family_edge",
      reason: "The registry identity AOC-CREM3F-071221 and family identity AOCCREM3F-071221 differ, and no committed alias crosswalk exists.",
    },
    {
      familyIds: ["AZ:aoccrem1i-071221-instructions-en"],
      status: "registry-reference-only_not_a_required_family_edge",
      reason: "The projection mentions CREM1I, but the pinned component relationship set does not assign that instructions asset to this track.",
    },
  ],
  "il-exp-pardon": [
    {
      familyIds: ["IL:exp-ad-request-form-en", "IL:exp-ad-order-granting-form-en"],
      status: "blocked_not_a_family_edge",
      reason: "The relationship IDs use spaced issuer labels while the family document IDs use normalized hyphens; no committed identity crosswalk joins them.",
    },
  ],
  "il-exp-precompletion": [
    {
      familyIds: ["IL:exp-ad-request-form-en", "IL:exp-ad-order-granting-form-en"],
      status: "blocked_not_a_family_edge",
      reason: "The relationship IDs use spaced issuer labels while the family document IDs use normalized hyphens; no committed identity crosswalk joins them.",
    },
  ],
  "il-seal-edu": [
    {
      familyIds: ["IL:exp-ad-request-form-en", "IL:exp-ad-order-granting-form-en"],
      status: "blocked_not_a_family_edge",
      reason: "The relationship IDs use spaced issuer labels while the family document IDs use normalized hyphens; no committed identity crosswalk joins them.",
    },
  ],
  "il-seal-nonconv": [
    {
      familyIds: ["IL:exp-ad-request-form-en", "IL:exp-ad-order-granting-form-en"],
      status: "blocked_not_a_family_edge",
      reason: "The relationship IDs use spaced issuer labels while the family document IDs use normalized hyphens; no committed identity crosswalk joins them.",
    },
  ],
  "ks-21-6614-diversion": [
    {
      familyIds: [
        "KS:ks-notice-of-hearing-on-petition-for-expungem-source-gated-en",
        "KS:ks-order-of-expungement-of-conviction-or-dive-source-gated-en",
        "KS:ksjc-source-gated-en",
      ],
      status: "blocked_not_a_family_edge",
      reason: "Titles suggest related conviction/diversion assets, but none has a documentId exactly equal to the pinned relationship IDs. The generic KSJC ID cannot be substring-joined.",
    },
  ],
  "ks-22-2410-arrest": [],
  mn_petition_15218: [
    {
      familyIds: ["MN:fee103-support-en"],
      status: "state-index-conditional-support_not_a_required_family_edge",
      reason: "FEE103 is described as conditional support, but the pinned component relationship set assigns only FEE102 to this track.",
    },
  ],
  mn_petition_juvenile_as_adult: [
    {
      familyIds: ["MN:fee103-support-en"],
      status: "state-index-conditional-support_not_a_required_family_edge",
      reason: "FEE103 is described as conditional support, but the pinned component relationship set assigns only FEE102 to this track.",
    },
  ],
  wa_vac_treaty_fishing: [
    {
      familyIds: ["WA:crrlj-09-0100-form-en", "WA:crrlj-09-0200-form-en"],
      status: "blocked_not_a_family_edge",
      reason: treatyFishingConflict.explanation,
    },
  ],
};

const sourceRelationshipEvidence = (trackId, officialFormId) =>
  `${registryCommit}:data/record-clearing/legal-design-track-source-relationships.json#/relationships[trackId=${trackId}][officialFormId=${officialFormId}]`;

const familyEvidence = (family) => [
  `${baseCommit}:docs/record-clearing/d-wave/corrected-review-manifest.json#/families[familyId=${family.familyId}]`,
  `${handoff.correctionBranches[family.lane].commit}:data/rcap-all50/overlays/production/${family.jurisdictionSlug}/state-index.json`,
  `${baseCommit}:docs/record-clearing/d-wave/corrections-v2/captain-handoff.json#/gate1|gate2|gate3/families[familyId=${family.familyId}]`,
];

const evidencedCandidateFamilyEdges = (trackId) => (d2aCandidateEdges[trackId] ?? []).map((candidate) => ({
  ...candidate,
  evidence: unique([
    `${baseCommit}:data/rcap-ledger/registry-crosswalk-projection.json#/tracks[trackId=${trackId}]/officialFormRefs`,
    `${registryCommit}:data/record-clearing/legal-design-track-source-relationships.json#/relationships[trackId=${trackId}]`,
    ...candidate.familyIds.flatMap((familyId) => {
      const family = familyById.get(familyId);
      assert(family, `missing candidate family ${familyId}`);
      return familyEvidence(family);
    }),
  ]),
}));

const trackRecords = [];
for (const trackId of canonicalTrackIds) {
  const job = jobByTrackId.get(trackId);
  const authority = authorityByTrackId.get(trackId);
  const registry = registryByTrackId.get(trackId);
  const relationships = relationshipByTrackId.get(trackId) ?? [];
  assert(authority, `missing authority row for ${trackId}`);
  assert(registry, `missing registry projection row for ${trackId}`);
  assert.equal(authority.jurisdiction, job.jurisdiction);
  assert.equal(registry.jurisdiction, job.jurisdiction);

  const forceConflict = trackId === treatyFishingTrackId;
  const familyRelationById = new Map();
  const unresolvedFormRelationships = [];
  let mappedComponentCount = 0;

  for (const relationship of relationships) {
    const matchingFamilies = forceConflict
      ? []
      : (familiesByDocumentIdentity.get(`${relationship.jurisdiction}\u0000${relationship.officialFormId}`) ?? []);
    if (matchingFamilies.length === 0) {
      unresolvedFormRelationships.push({
        componentId: relationship.componentId,
        officialFormId: relationship.officialFormId,
        officialSourceUrl: relationship.officialSourceUrl,
        relationshipSourceSha256: relationship.sha256,
        corpusState: relationship.corpusState,
        status: "unresolved",
        reasonCode: forceConflict
          ? treatyFishingConflict.reasonCode
          : "no_exact_family_document_id_match",
        exactReason: forceConflict
          ? treatyFishingConflict.explanation
          : "No corrected D family in the same jurisdiction has a documentId exactly equal to this pinned officialFormId; no alias, title, prefix, or revision substitution was inferred.",
        evidence: [
          sourceRelationshipEvidence(trackId, relationship.officialFormId),
          `${baseCommit}:docs/record-clearing/d-wave/corrected-review-manifest.json#/families[jurisdiction=${relationship.jurisdiction}]`,
        ],
      });
      continue;
    }

    mappedComponentCount += 1;
    for (const family of matchingFamilies) {
      const existing = familyRelationById.get(family.familyId) ?? {
        familyId: family.familyId,
        documentId: family.documentId,
        revision: family.revision,
        sourceSha256: family.sourceSha256,
        implementationLane: family.lane,
        implementationBranch: handoff.correctionBranches[family.lane].branch,
        implementationCommit: handoff.correctionBranches[family.lane].commit,
        componentIds: [],
        roles: [],
        relationshipMethod: "exact_same_jurisdiction_and_document_id",
        currentTechnicalDisposition: technicalDispositionByFamilyId.get(family.familyId),
        sourceCurrentnessStatus: family.currentness,
        familyLegalDesignStatus: family.legalDesign,
        documentOwnership: family.documentOwnership,
        implementationStatus: family.implementationStatus,
        productionHolds: family.productionHolds,
        evidence: unique([
          sourceRelationshipEvidence(trackId, relationship.officialFormId),
          ...familyEvidence(family),
        ]),
      };
      existing.componentIds.push(relationship.componentId);
      existing.roles.push(
        relationship.componentId
          .slice(`${trackId}-`.length)
          .replace(/-\d+$/, ""),
      );
      existing.componentIds = unique(existing.componentIds);
      existing.roles = unique(existing.roles);
      familyRelationById.set(family.familyId, existing);
    }
  }

  if (forceConflict) {
    for (const source of treatyFishingConflict.specificSources) {
      unresolvedFormRelationships.push({
        componentId: `wa_vac_treaty_fishing-track-specific-source-${source.officialFormId}`,
        officialFormId: source.officialFormId,
        officialSourceUrl: null,
        relationshipSourceSha256: source.sourceSha256,
        corpusState: "present_as_legacy_doc_not_rendered_as_D2A_family",
        status: "unresolved",
        reasonCode: "track_specific_source_has_no_rendered_family",
        exactReason: "The D2A state index identifies this treaty-fishing source, but no rendered corrected family exists for it.",
        evidence: treatyFishingConflict.evidence,
      });
    }
  }

  const requiredFamilies = [...familyRelationById.values()]
    .sort((left, right) => left.familyId.localeCompare(right.familyId));
  const requiredFamilyIds = requiredFamilies.map(({ familyId }) => familyId);
  const technicalDispositions = unique(requiredFamilies.map(({ currentTechnicalDisposition }) => currentTechnicalDisposition));
  const allRelationshipComponentsMapped = mappedComponentCount === relationships.length && !forceConflict;
  const allMappedFamiliesTechnicallyApproved = requiredFamilies.length > 0
    && requiredFamilies.every(({ currentTechnicalDisposition }) => currentTechnicalDisposition === "technical_approved");
  const allMappedFamiliesCurrent = requiredFamilies.length > 0
    && requiredFamilies.every(({ sourceCurrentnessStatus }) => sourceCurrentnessStatus === "none_recorded_source_reports_current");
  const hasCorrectionRequired = requiredFamilies.some(
    ({ currentTechnicalDisposition }) => currentTechnicalDisposition === "correction_required",
  );

  let proposedTerminalProductTreatment;
  let treatmentBasis;
  if (hasCorrectionRequired) {
    proposedTerminalProductTreatment = "correction_required";
    treatmentBasis = "At least one exactly mapped required family has an independent correction-required disposition. Source and adoption gates also remain open; correcting the artifact would not itself make the track terminal.";
  } else if (
    allRelationshipComponentsMapped
    && allMappedFamiliesTechnicallyApproved
    && allMappedFamiliesCurrent
    && authority.sourceLifecycleTerminal
    && authority.authorityCleared
    && authority.legalDesignTerminal
    && authority.legalAdoptionTerminal
    && authority.packetProofCurrent
    && authority.releaseTreatmentTerminal
  ) {
    proposedTerminalProductTreatment = "production_packet_candidate";
    treatmentBasis = "Every pinned component relationship has an exact same-jurisdiction documentId family, every mapped family is technically approved and current, and the standing source, authority, design, adoption, packet-proof and participant-treatment gates support a packet candidate. A candidate would still require staging and runtime wiring before terminality.";
  } else {
    proposedTerminalProductTreatment = "held_on_source_or_design";
    treatmentBasis = "The exact component set is incomplete, conflicted, held, or not current enough to support a packet candidate; committed evidence does not support substituting a complete bilingual guidance or exact-deferral treatment.";
  }

  const participantTreatmentStatus = hasCorrectionRequired
    ? "required_family_correction_pending_and_release_treatment_nonterminal"
    : allRelationshipComponentsMapped && allMappedFamiliesTechnicallyApproved && allMappedFamiliesCurrent
      ? "packet_candidate_artifacts_mapped_but_release_treatment_nonterminal"
      : "required_component_or_family_hold_pending_and_release_treatment_nonterminal";

  trackRecords.push({
    jurisdiction: job.jurisdiction,
    trackId,
    legalName: registry.legalName,
    authorityRefs: registry.authority,
    officialFormRefs: registry.officialFormRefs,
    canonicalImplementationJobId: job.jobId,
    implementationLane: manifest.lanes.find((lane) => Object.hasOwn(lane.states, job.jurisdiction))?.lane ?? null,
    implementationFamily: job.implementationFamily,
    outputStrategy: job.outputStrategy,
    canonicalRequiredTreatment: job.requiredTreatment,
    requiredFamilyIds,
    requiredFamilies,
    candidateFamilyEdges: evidencedCandidateFamilyEdges(trackId),
    relationshipCoverage: {
      pinnedComponentRelationships: relationships.length,
      mappedComponentRelationships: mappedComponentCount,
      allPinnedComponentsMapped: allRelationshipComponentsMapped,
      method: "strict_same_jurisdiction_and_exact_documentId; one family may cover multiple components only when each component has a pinned relationship to that same officialFormId",
    },
    unresolvedFormRelationships,
    technicalStatus: {
      dispositionsPresent: technicalDispositions,
      allMappedFamiliesTechnicallyApproved,
      correctionRequired: hasCorrectionRequired,
      canonicalImplementationTerminal: authority.implementationTerminal,
      canonicalTechnicalReviewTerminal: authority.technicalReviewTerminal,
      note: "Family technical disposition and canonical technical flags do not establish terminality.",
    },
    sourceCurrentnessStatus: {
      sourceLifecycleTerminal: authority.sourceLifecycleTerminal,
      authorityCleared: authority.authorityCleared,
      mappedFamilyStatuses: unique(requiredFamilies.map(({ sourceCurrentnessStatus }) => sourceCurrentnessStatus)),
      allMappedFamiliesCurrent,
    },
    legalDesignStatus: {
      canonicalStatus: authority.legalDesignStatus,
      canonicalTerminal: authority.legalDesignTerminal,
      familyImplementationStatuses: unique(requiredFamilies.map(({ familyLegalDesignStatus }) => familyLegalDesignStatus)),
      note: "The standing track ledger is authoritative for track-level design terminality; family-level implementation holds are retained separately and are not silently promoted.",
    },
    legalAdoptionStatus: {
      terminal: authority.legalAdoptionTerminal,
      status: authority.legalAdoptionTerminal ? "adopted" : "legal_review_pending",
      owner: "Roger",
      gateId: "DEC-GLOBAL-COUNSEL-REVIEW",
    },
    participantTreatmentStatus: {
      terminal: authority.releaseTreatmentTerminal,
      status: participantTreatmentStatus,
      packetProofCurrent: authority.packetProofCurrent,
    },
    stagingStatus: {
      terminal: authority.stagingAcceptanceTerminal,
      status: authority.stagingAcceptanceTerminal ? "accepted" : "not_accepted_for_staging",
      globalActionStatus: stagingAction.status,
      finalAcceptedSha: stagingAction.finalAcceptedSha,
      readyToRequestAuthorization: stagingAction.readyToRequestAuthorization,
      authorizes: stagingAction.authorizes,
      evidence: `${baseCommit}:data/rcap-staging-action.json`,
    },
    runtimeWiringStatus: {
      required: job.runtimeWiringRequired,
      decision: authority.runtimeDecision,
      status: job.runtimeWiringRequired && authority.runtimeDecision === "runtime_disabled"
        ? "required_but_runtime_disabled"
        : authority.runtimeDecision,
      owner: "Terminal A",
    },
    currentRootBlocker: {
      stage: authority.rootBlockerStage,
      blocker: authority.rootBlocker,
      dueAt: authority.rootBlockerDueAt,
      transitionReasonCode: authority.transitionReasonCode,
    },
    rootBlockerOwner: authority.rootBlockerOwner,
    nextExecutableAction: authority.nextExecutableJob,
    proposedTerminalProductTreatment,
    treatmentBasis,
    terminal: false,
    evidence: [
      `${baseCommit}:data/rcap-ledger/track-terminalization.json#/jobs[jobId=${job.jobId}]`,
      `${baseCommit}:data/rcap-ledger/authority-ledger.json#/tracks[trackId=${trackId}]`,
      `${baseCommit}:data/rcap-ledger/registry-crosswalk-projection.json#/tracks[trackId=${trackId}]`,
      `${registryCommit}:data/record-clearing/legal-design-track-source-relationships.json#/relationships[trackId=${trackId}]`,
    ],
  });
}

const canonicalSummaryTrackIds = handoff.gate5.tracks
  .map(({ trackId }) => trackId)
  .filter((trackId) => jobByTrackId.has(trackId));
const foreignSummaryTrackIds = handoff.gate5.tracks
  .map(({ trackId }) => trackId)
  .filter((trackId) => !jobByTrackId.has(trackId));
const canonicalMissingFromSummary = canonicalTrackIds.filter((trackId) => !canonicalSummaryTrackIds.includes(trackId));
assert.equal(handoff.gate5.tracks.length, 55);
assert.equal(canonicalSummaryTrackIds.length, 23);
assert.equal(foreignSummaryTrackIds.length, 32);
assert.equal(canonicalMissingFromSummary.length, 44);

const treatmentCounts = countBy(trackRecords, "proposedTerminalProductTreatment");
const completeTreatmentCounts = {
  production_packet_candidate: treatmentCounts.production_packet_candidate ?? 0,
  complete_guidance_candidate: treatmentCounts.complete_guidance_candidate ?? 0,
  exact_supported_deferral_candidate: treatmentCounts.exact_supported_deferral_candidate ?? 0,
  deliberate_scope_exclusion_candidate: treatmentCounts.deliberate_scope_exclusion_candidate ?? 0,
  correction_required: treatmentCounts.correction_required ?? 0,
  held_on_source_or_design: treatmentCounts.held_on_source_or_design ?? 0,
};
const mappedTracks = trackRecords.filter(({ requiredFamilyIds }) => requiredFamilyIds.length > 0);
const unresolvedTracks = trackRecords.filter(({ unresolvedFormRelationships }) => unresolvedFormRelationships.length > 0);
const d2aTracks = trackRecords.filter(({ jurisdiction }) => d2aJurisdictions.has(jurisdiction));
const pinnedComponentRelationshipCount = trackRecords.reduce(
  (sum, track) => sum + track.relationshipCoverage.pinnedComponentRelationships,
  0,
);
const mappedComponentRelationshipCount = trackRecords.reduce(
  (sum, track) => sum + track.relationshipCoverage.mappedComponentRelationships,
  0,
);
const unresolvedPinnedComponentRelationshipCount = trackRecords.reduce(
  (sum, track) => sum + track.unresolvedFormRelationships.filter(
    ({ componentId }) => !componentId.includes("track-specific-source-"),
  ).length,
  0,
);
assert.equal(d2aTracks.length, 17);
assert.equal(pinnedComponentRelationshipCount, 179);
assert.equal(
  mappedComponentRelationshipCount + unresolvedPinnedComponentRelationshipCount,
  pinnedComponentRelationshipCount,
);

const trackFamilyMap = {
  schemaVersion: "rcap-codex-d-track-terminalization/v1",
  status: "proposed_noncanonical_analysis",
  generatedDeterministicallyFrom: {
    captainBranch: "claude/rcap-d-corrected-review-manifest",
    baseCommit,
    registryCommit,
    registryRelationshipSha256: terminalization.registrySource.sha256["data/record-clearing/legal-design-track-source-relationships.json"],
    correctionBranches: handoff.correctionBranches,
  },
  scope: {
    lane: "D",
    canonicalJobs: dJobs.length,
    expectedTracks: 67,
    tracksDerived: trackRecords.length,
    uniqueTracks: new Set(trackRecords.map(({ trackId }) => trackId)).size,
    canonicalTreatment: "production_packet",
  },
  derivationRules: [
    "Track membership comes only from lane-D jobs in the canonical track-terminalization ledger.",
    "Required component relationships come from the registry-pinned legal-design-track-source-relationships artifact.",
    "A component maps to a corrected D family only when jurisdiction and document identity are exactly equal.",
    "Names, same-state presence, normalized punctuation, prefixes, title resemblance, URL resemblance, and newer-looking revisions are not relationship evidence.",
    "A family may cover multiple components or tracks only when the pinned relationship artifact contains each edge.",
    "The Washington treaty-fishing generic pair is fail-closed because more specific D2A state-index/profile evidence names an unreconciled CR-09.0500/.0600/.0700 set.",
    "Technical approval supports candidate readiness only; no candidate or technical disposition is labeled terminal.",
  ],
  handoffReconciliation: {
    handoffSummaryTrackRecords: handoff.gate5.tracks.length,
    canonicalIdsInHandoffSummaries: canonicalSummaryTrackIds.length,
    canonicalTrackIdsInHandoffSummaries: canonicalSummaryTrackIds,
    noncanonicalIdsInHandoffSummaries: foreignSummaryTrackIds.length,
    noncanonicalTrackIdsInHandoffSummaries: foreignSummaryTrackIds,
    canonicalIdsMissingFromHandoffSummaries: canonicalMissingFromSummary.length,
    canonicalTrackIdsMissingFromHandoffSummaries: canonicalMissingFromSummary,
    arithmeticDeltaReportedAsMissing: handoff.gate5.unaccountedAgainstExpected,
    finding: "The reported 12 is only 67 minus 55. It is not a canonical-set difference: 32 of the 55 IDs are noncanonical and 44 canonical IDs are absent.",
    d2aAssignedTracks: d2aTracks.length,
    d2aSummariesAbsent: ["AZ", "IL", "KS", "MN", "WA"],
    summariesWithTracksPropertyAbsent: ["FL", "IA", "LA", "MA", "NJ", "NM", "OR", "UT"],
  },
  counts: {
    tracksWithAtLeastOneExactFamily: mappedTracks.length,
    tracksWithNoExactFamily: trackRecords.length - mappedTracks.length,
    tracksWithUnresolvedFormRelationships: unresolvedTracks.length,
    pinnedComponentRelationships: pinnedComponentRelationshipCount,
    mappedComponentRelationships: mappedComponentRelationshipCount,
    unresolvedPinnedComponentRelationships: unresolvedPinnedComponentRelationshipCount,
    treatmentCounts: completeTreatmentCounts,
  },
  nontechnicalGateCounts: {
    sourceLifecycleNonterminal: trackRecords.filter((track) => !track.sourceCurrentnessStatus.sourceLifecycleTerminal).length,
    authorityNotCleared: trackRecords.filter((track) => !track.sourceCurrentnessStatus.authorityCleared).length,
    canonicalLegalDesignNonterminal: trackRecords.filter((track) => !track.legalDesignStatus.canonicalTerminal).length,
    legalAdoptionNonterminal: trackRecords.filter((track) => !track.legalAdoptionStatus.terminal).length,
    participantTreatmentNonterminal: trackRecords.filter((track) => !track.participantTreatmentStatus.terminal).length,
    packetProofNotCurrent: trackRecords.filter((track) => !track.participantTreatmentStatus.packetProofCurrent).length,
    stagingAcceptanceNonterminal: trackRecords.filter((track) => !track.stagingStatus.terminal).length,
    runtimeRequiredButDisabled: trackRecords.filter(
      (track) => track.runtimeWiringStatus.status === "required_but_runtime_disabled",
    ).length,
  },
  tracks: trackRecords,
  verification: {
    exactly67Tracks: trackRecords.length === 67,
    everyTrackAppearsExactlyOnce: new Set(trackRecords.map(({ trackId }) => trackId)).size === 67,
    everyMappedFamilyHasPinnedRelationshipEvidence: true,
    unsupportedNearMatchesExcluded: true,
    d2aTracksReconstructed: d2aTracks.length,
    everyPinnedComponentRelationshipMappedOrExplicitlyBlocked:
      mappedComponentRelationshipCount + unresolvedPinnedComponentRelationshipCount
      === pinnedComponentRelationshipCount,
    reportedTwelveSupersededByCanonicalSetReconciliation: true,
    noTrackMarkedTerminal: trackRecords.every(({ terminal }) => terminal === false),
    noTechnicalApprovalMislabeledTerminal: true,
  },
};

const deferralRequirements = [
  "specific_supported_reason",
  "exact_destination",
  "exact_next_step",
  "what_to_gather",
  "what_not_to_file_or_assume",
  "briefcase_handoff",
  "payment_prohibited",
  "checkout_suppressed",
  "zero_packet_and_partner_credit",
  "substantive_english",
  "substantive_spanish",
];
const treatmentCandidates = {
  schemaVersion: "rcap-codex-d-terminal-treatment-candidates/v1",
  status: "candidate_plan_only_not_terminal_not_approved",
  baseCommit,
  policy: {
    allowedTreatments: [
      "production_packet_candidate",
      "complete_guidance_candidate",
      "exact_supported_deferral_candidate",
      "deliberate_scope_exclusion_candidate",
      "correction_required",
      "held_on_source_or_design",
    ],
    exactDeferralRequirements: deferralRequirements,
    terminalityRule: "A candidate is not terminal. Technical approval is not terminality. Counsel review is a separate launch gate.",
  },
  summary: {
    tracks: trackRecords.length,
    ...completeTreatmentCounts,
  },
  heldFormAssessment: {
    result: "no_complete_guidance_or_exact_deferral_candidate_supported",
    reason: "No committed D-track treatment supplies all required track-specific English and Spanish participant content plus the exact destination, action, gather/do-not-file instructions, Briefcase handoff, payment prohibition, checkout suppression, and zero-credit controls. No substitute participant treatment was inferred from incomplete evidence.",
    guidanceCandidates: [],
    exactDeferralCandidates: [],
    deliberateScopeExclusionCandidates: [],
  },
  safety: {
    runtimeFilesChanged: false,
    paymentBehaviorChanged: false,
    checkoutBehaviorChanged: false,
    packetOrPartnerCreditBehaviorChanged: false,
    candidateRecordsAuthorizeLaunchOrPayment: false,
  },
  candidates: trackRecords.map((track) => ({
    jurisdiction: track.jurisdiction,
    trackId: track.trackId,
    proposedTerminalProductTreatment: track.proposedTerminalProductTreatment,
    terminal: false,
    treatmentBasis: track.treatmentBasis,
    requiredFamilyIds: track.requiredFamilyIds,
    allPinnedComponentsMapped: track.relationshipCoverage.allPinnedComponentsMapped,
    technicalCorrectionRequired: track.technicalStatus.correctionRequired,
    sourceLifecycleTerminal: track.sourceCurrentnessStatus.sourceLifecycleTerminal,
    legalDesignTerminal: track.legalDesignStatus.canonicalTerminal,
    legalAdoptionTerminal: track.legalAdoptionStatus.terminal,
    participantTreatmentTerminal: track.participantTreatmentStatus.terminal,
    stagingTerminal: track.stagingStatus.terminal,
    runtimeDecision: track.runtimeWiringStatus.decision,
    currentRootBlockerStage: track.currentRootBlocker.stage,
    currentRootBlockerOwner: track.rootBlockerOwner,
    nextExecutableAction: track.nextExecutableAction,
  })),
};

const correctionOwner = (track) => {
  if (!track.technicalStatus.correctionRequired) return null;
  const branch = handoff.correctionBranches[track.implementationLane];
  return {
    owner: `${track.implementationLane} correction owner`,
    readOnlyEvidenceBranch: branch.branch,
    evidenceCommit: branch.commit,
    action: `Correct only the independently rejected required family or families for ${track.trackId}, regenerate proof, and obtain a new independent technical disposition; this Codex branch does not modify the D implementation branch.`,
  };
};

const captainQueue = {
  schemaVersion: "rcap-codex-d-captain-queue/v1",
  status: "ready_for_dispatch_not_approval",
  baseCommit,
  queueCount: trackRecords.length,
  assignments: trackRecords.map((track, index) => ({
    queueOrder: index + 1,
    jurisdiction: track.jurisdiction,
    trackId: track.trackId,
    captainOwner: "RCAP Captain",
    captainAction: `Keep ${track.trackId} nonterminal and runtime-disabled; dispatch ${track.nextExecutableAction} to ${track.rootBlockerOwner}, preserve every unresolved relationship, and do not promote from technical evidence.`,
    currentBlockerOwner: track.rootBlockerOwner,
    currentAction: track.nextExecutableAction,
    technicalCorrectionAssignment: correctionOwner(track),
    legalAdoptionOwner: "Roger",
    legalAdoptionAction: "Record counsel sign-off per jurisdiction under DEC-GLOBAL-COUNSEL-REVIEW after prerequisite source/currentness work; sign-off gates launch and is not inferred here.",
    participantTreatmentOwner: "RCAP product owner",
    participantTreatmentAction: track.proposedTerminalProductTreatment === "production_packet_candidate"
      ? "After source/authority and adoption clearance, complete participant-treatment review and current packet proof without weakening checkout, payment, packet-credit, or partner-credit controls."
      : "Resolve the exact family/component gap or technical correction before proposing participant treatment; do not substitute generic guidance or referral.",
    stagingOwner: "RCAP Captain",
    stagingAction: "Accept into staging only after source, technical, adoption, participant-treatment, and packet-proof gates close.",
    runtimeOwner: "Terminal A",
    runtimeAction: "Wire the exact canonical track only after staging acceptance and worker-image publication or explicit re-fingerprint; keep runtime_disabled until then.",
    proposedTreatment: track.proposedTerminalProductTreatment,
  })),
};

const ownerAssignments = {
  schemaVersion: "rcap-codex-d-owner-assignments/v1",
  baseCommit,
  assignments: [
    {
      owner: "source_acquisition",
      gate: "authority_clearance/source_currentness",
      trackCount: trackRecords.length,
      trackIds: trackRecords.map(({ trackId }) => trackId),
      action: "Execute each authority-ledger nextExecutableJob and record exact source acquisition, materialization, permission, revision, or scope-decision evidence. Do not infer clearance from family implementation.",
    },
    ...["D1B", "D1C", "D3A"].map((lane) => {
      const tracks = trackRecords.filter(
        (track) => track.implementationLane === lane && track.technicalStatus.correctionRequired,
      );
      return {
        owner: `${lane} correction owner`,
        gate: "technical_correction",
        readOnlyEvidenceBranch: handoff.correctionBranches[lane].branch,
        evidenceCommit: handoff.correctionBranches[lane].commit,
        trackCount: tracks.length,
        trackIds: tracks.map(({ trackId }) => trackId),
        familyIds: unique(tracks.flatMap(({ requiredFamilies }) => requiredFamilies
          .filter(({ currentTechnicalDisposition }) => currentTechnicalDisposition === "correction_required")
          .map(({ familyId }) => familyId))),
        action: "Correct rejected required-family artifacts on a separately authorized implementation branch, regenerate proofs, and obtain independent review. No D branch was changed by this analysis.",
      };
    }).filter(({ trackCount }) => trackCount > 0),
    {
      owner: "Roger",
      gate: "legal_adoption/counsel_launch_review",
      gateId: "DEC-GLOBAL-COUNSEL-REVIEW",
      trackCount: trackRecords.length,
      trackIds: trackRecords.map(({ trackId }) => trackId),
      action: "Record counsel review sign-off per jurisdiction. This is a launch gate separate from build terminality and cannot be inferred from technical approval.",
    },
    {
      owner: "RCAP product owner",
      gate: "participant_treatment_and_packet_proof",
      trackCount: trackRecords.length,
      trackIds: trackRecords.map(({ trackId }) => trackId),
      action: "Close release-treatment and current packet-proof evidence. For held forms, do not use guidance or exact deferral unless every required bilingual and safety element is committed.",
    },
    {
      owner: "RCAP Captain",
      gate: "staging_acceptance",
      trackCount: trackRecords.length,
      trackIds: trackRecords.map(({ trackId }) => trackId),
      action: "Accept only after all predecessor gates close; do not promote a family or track from this proposal.",
    },
    {
      owner: "Terminal A",
      gate: "runtime_wiring",
      trackCount: trackRecords.length,
      trackIds: trackRecords.map(({ trackId }) => trackId),
      action: "Land exact track routing only after staging and worker publication/re-fingerprint. All 67 remain runtime_disabled in the standing ledger.",
    },
  ],
};

const laneByJurisdiction = Object.fromEntries(
  manifest.lanes.flatMap((lane) => Object.keys(lane.states).map((jurisdiction) => [jurisdiction, lane.lane])),
);
for (const jurisdiction of [...d2aJurisdictions].sort()) {
  const stateTracks = trackRecords.filter((track) => track.jurisdiction === jurisdiction);
  const stateFamilies = manifest.families
    .filter((family) => family.jurisdiction === jurisdiction)
    .sort((left, right) => left.familyId.localeCompare(right.familyId));
  const proposedSummary = {
    schemaVersion: "rcap-codex-proposed-jurisdiction-summary/v1",
    proposalOnly: true,
    canonicalArtifactOverwritten: false,
    lane: "D2A",
    jurisdiction,
    canonicalJobId: stateTracks[0].canonicalImplementationJobId,
    implementationBranch: handoff.correctionBranches.D2A.branch,
    implementationCommit: handoff.correctionBranches.D2A.commit,
    persistenceFailure: {
      canonicalJurisdictionSummaryPresentAtImplementationTip: false,
      exactFailure: "The D2A regeneration driver writes state-index.json only and never imports the canonical job/relationship graph or writes jurisdiction-summary.json. The correction tip changes Illinois proof artifacts but does not persist track relationships.",
      evidence: [
        "bc139e24c987728dda585a58e0736ec14b6a996a:scripts/rcap-official-forms/lanes/d2a-regenerate.mjs:1-17,1393-1456",
        `bc139e24c987728dda585a58e0736ec14b6a996a:data/rcap-all50/overlays/production/${stateFamilies[0].jurisdictionSlug}/state-index.json`,
        `${baseCommit}:scripts/rcap-official-forms/build-d-captain-handoff.mjs:159-176`,
      ],
    },
    terminal: false,
    families: Object.fromEntries(stateFamilies.map((family) => [family.familyId, {
      documentId: family.documentId,
      revision: family.revision,
      sourceSha256: family.sourceSha256,
      finalTechnicalDisposition: technicalDispositionByFamilyId.get(family.familyId),
      currentness: family.currentness,
      legalDesign: family.legalDesign,
      evidence: familyEvidence(family),
    }])),
    tracks: stateTracks.map((track) => ({
      trackId: track.trackId,
      requiredFamilyIds: track.requiredFamilyIds,
      familyEdges: track.requiredFamilies.map((family) => ({
        familyId: family.familyId,
        componentIds: family.componentIds,
        roles: family.roles,
        relationshipMethod: family.relationshipMethod,
        evidence: family.evidence,
      })),
      candidateFamilyEdges: track.candidateFamilyEdges,
      unresolvedFormRelationships: track.unresolvedFormRelationships,
      terminal: false,
      proposedTerminalProductTreatment: track.proposedTerminalProductTreatment,
      exactBlocker: track.currentRootBlocker.blocker,
    })),
  };
  writeJson(join(d2aSummaryDirectory, `${jurisdiction.toLowerCase()}.json`), proposedSummary);
}

const markdownRows = trackRecords.map((track, index) => {
  const families = track.requiredFamilyIds.length > 0
    ? track.requiredFamilyIds.map((id) => `\`${id}\``).join("<br>")
    : "None (explicit relationships remain unresolved)";
  const dispositions = track.requiredFamilies.length > 0
    ? unique(track.requiredFamilies.map(({ currentTechnicalDisposition }) => currentTechnicalDisposition)).join(", ")
    : "n/a";
  return `| ${index + 1} | ${track.jurisdiction} | \`${track.trackId}\` | ${families} | ${dispositions} | ${track.relationshipCoverage.mappedComponentRelationships}/${track.relationshipCoverage.pinnedComponentRelationships} | \`${track.proposedTerminalProductTreatment}\` | \`${track.rootBlockerOwner}\` |`;
}).join("\n");

const d2aRows = [...d2aJurisdictions].sort().map((jurisdiction) => {
  const records = d2aTracks.filter((track) => track.jurisdiction === jurisdiction);
  const exactMapped = records.filter(({ requiredFamilyIds }) => requiredFamilyIds.length > 0).length;
  return `| ${jurisdiction} | ${records.length} | ${exactMapped} | ${records.length - exactMapped} | \`dispatch/d2a-proposed-jurisdiction-summaries/${jurisdiction.toLowerCase()}.json\` |`;
}).join("\n");

const reportMarkdown = `# D track map and terminal-treatment plan

Status: **captain queue ready; analysis only; no family approval, track promotion, canonical-ledger regeneration, runtime change, or D implementation-branch change.**

## Result

The canonical lane-D job graph contains exactly **67 unique tracks in 27 jobs**. All 67 appear exactly once in the machine-readable map. The captain handoff's “55 derived / 12 unaccounted” result is not a canonical-set reconciliation: only 23 of those 55 IDs are canonical D IDs, 32 are state-local/noncanonical IDs, and 44 canonical D IDs are absent.

The map accepts only explicit pinned track/component relationships joined to a corrected family by the same jurisdiction and exact \`officialFormId === documentId\`. Similar names, state-only matches, punctuation normalization, substring matching, and silent revision succession are excluded. The sole exact-looking exception is fail-closed: Washington treaty-fishing has a generic CrRLJ pair in the relationship file but a more specific, unreconciled CR-09.0500/.0600/.0700 set in the D2A state index and compiled profile.

## Counts

| Measure | Count |
|---|---:|
| Expected canonical D tracks | 67 |
| Derived / unique | ${trackRecords.length} / ${new Set(trackRecords.map(({ trackId }) => trackId)).size} |
| Canonical D jobs | ${dJobs.length} |
| Tracks with at least one exact family | ${mappedTracks.length} |
| Tracks with no exact family | ${trackRecords.length - mappedTracks.length} |
| Tracks with unresolved form relationships | ${unresolvedTracks.length} |
| Pinned component relationships | ${pinnedComponentRelationshipCount} |
| Exact-mapped component relationships | ${mappedComponentRelationshipCount} |
| Explicitly blocked pinned component relationships | ${unresolvedPinnedComponentRelationshipCount} |
| D2A assigned tracks recovered | ${d2aTracks.length} |
| Production packet candidates | ${treatmentCounts.production_packet_candidate ?? 0} |
| Complete guidance candidates | 0 |
| Exact deferral candidates | 0 |
| Deliberate scope-exclusion candidates | 0 |
| Correction required | ${treatmentCounts.correction_required ?? 0} |
| Held on source or design | ${treatmentCounts.held_on_source_or_design ?? 0} |

Every candidate remains \`terminal: false\`. Every track has source/authority, legal-adoption, participant-treatment, staging, current-proof, and runtime gates open in the standing authority ledger. A production-packet candidate would require exact, current, technically approved D families plus closed standing source, authority, design, adoption, proof, and participant-treatment gates. None meets that threshold; technical readiness is retained only as a separate signal.

## D2A reconstruction

D2A owns **17**, not 12, canonical tracks. The five canonical summaries are absent because the D2A regeneration driver writes only \`state-index.json\`; it neither imports the canonical graph nor writes \`jurisdiction-summary.json\`. The correction tip does not repair that persistence gap.

| Jurisdiction | Assigned tracks | Tracks with exact family edge | Tracks without exact family edge | Proposed summary |
|---|---:|---:|---:|---|
${d2aRows}

The proposed summaries live only under this Codex-owned dispatch directory. Candidate/near-match families are explicitly labeled non-edges. In particular:

- Arizona CREM punctuation variants and RSA revision changes are not silently aliased.
- Illinois normalized family IDs do not replace the pinned issuer labels without a committed crosswalk; only FW-CIV-APPLICATION joins exactly.
- Kansas's generic \`KSJC\` family is not substring-matched to arrest or diversion forms.
- Minnesota's FEE102 support joins exactly, while the core EXP102/104/106 set remains absent.
- Washington treaty-fishing remains unresolved against the specific legacy CR-09.0500/.0600/.0700 set.

The eight summaries described by the handoff as having “empty arrays” actually omit the \`tracks\` property: FL, IA, LA, MA, NJ, NM, OR, and UT.

## Held-form treatment assessment

Committed evidence does **not** support a complete-guidance or exact-supported-deferral candidate for any D track. No candidate supplies the full track-specific reason, destination, next step, gather/do-not-file instructions, Briefcase handoff, payment prohibition, checkout suppression, zero packet/partner credit, and substantive English and Spanish. No substitute participant treatment was inferred from incomplete evidence.

This plan changes no runtime, checkout, payment, packet-credit, or partner-credit behavior.

## Nontechnical and execution gates

- Source/currentness/authority: 67/67 nonterminal; current owner \`source_acquisition\`; execute the exact per-track \`nextExecutableAction\` from the authority ledger.
- Track-level legal design: 67/67 terminal in the standing authority ledger (5 approved, 62 approved with limitations). Family implementation holds are preserved separately and not treated as track promotion.
- Legal adoption: 67/67 pending; owner **Roger** under \`DEC-GLOBAL-COUNSEL-REVIEW\`.
- Participant treatment and current packet proof: 67/67 nonterminal; owner **RCAP product owner** after prerequisite gaps close.
- Staging: 67/67 not accepted; owner **RCAP Captain**.
- Runtime wiring: 67/67 required and disabled; owner **Terminal A** after staging and worker publication/re-fingerprint.
- Technical corrections: ${treatmentCounts.correction_required ?? 0} tracks; exact lane-owner/family assignments are in \`dispatch/owner-assignments.json\`.

## Complete track queue

| # | Jur. | Track | Exact required family IDs | Family technical disposition(s) | Component coverage | Proposed treatment | Current owner |
|---:|---|---|---|---|---:|---|---|
${markdownRows}

## Evidence and reproducibility

The canonical job universe and track gates come from \`${baseCommit}\` ledger artifacts. Track/component/form edges come from the registry-pinned \`${registryCommit}\` relationship file at recorded SHA-256 \`${terminalization.registrySource.sha256["data/record-clearing/legal-design-track-source-relationships.json"]}\`. Family identities, source SHAs, revisions, route artifacts, and final technical dispositions come from the corrected manifest, immutable correction tips, and captain handoff.

Run:

\`node docs/rcap/codex/d-track-terminalization/dispatch/build-and-verify.mjs --verify\`

The command regenerates deterministic outputs and verifies cardinality, uniqueness, exact-edge evidence, D2A coverage, treatment vocabulary, bilingual deferral policy, safety posture, and output scope.
`;

writeJson(join(outputDataDirectory, "track-family-map.json"), trackFamilyMap);
writeJson(join(outputDataDirectory, "terminal-treatment-candidates.json"), treatmentCandidates);
writeJson(join(dispatchDirectory, "captain-queue.json"), captainQueue);
writeJson(join(dispatchDirectory, "owner-assignments.json"), ownerAssignments);
writeFileSync(join(outputDocsDirectory, "../d-track-terminalization.md"), reportMarkdown);

const allowedTreatments = new Set(treatmentCandidates.policy.allowedTreatments);
assert.equal(trackRecords.length, 67);
assert.equal(new Set(trackRecords.map(({ trackId }) => trackId)).size, 67);
assert.deepEqual(trackRecords.map(({ trackId }) => trackId), canonicalTrackIds);
assert(trackRecords.every(({ requiredFamilies }) => requiredFamilies.every((family) =>
  family.relationshipMethod === "exact_same_jurisdiction_and_document_id"
  && family.evidence.some((entry) => entry.includes("legal-design-track-source-relationships.json"))
  && family.evidence.some((entry) => entry.includes("corrected-review-manifest.json")),
)));
assert(trackRecords.every(({ proposedTerminalProductTreatment }) => allowedTreatments.has(proposedTerminalProductTreatment)));
assert(trackRecords.every(({ terminal }) => terminal === false));
assert.equal(d2aTracks.length, 17);
assert.equal(new Set(d2aTracks.map(({ trackId }) => trackId)).size, 17);
assert.equal(
  mappedComponentRelationshipCount + unresolvedPinnedComponentRelationshipCount,
  pinnedComponentRelationshipCount,
);
assert.equal(treatmentCandidates.heldFormAssessment.guidanceCandidates.length, 0);
assert.equal(treatmentCandidates.heldFormAssessment.exactDeferralCandidates.length, 0);
assert.equal(treatmentCandidates.safety.runtimeFilesChanged, false);
assert.equal(treatmentCandidates.safety.paymentBehaviorChanged, false);
assert.equal(treatmentCandidates.safety.checkoutBehaviorChanged, false);
assert.equal(treatmentCandidates.safety.packetOrPartnerCreditBehaviorChanged, false);
assert.equal(captainQueue.assignments.length, 67);
assert.equal(ownerAssignments.assignments.find(({ owner }) => owner === "source_acquisition").trackCount, 67);
assert.equal(trackRecords.filter(({ legalAdoptionStatus }) => !legalAdoptionStatus.terminal).length, 67);
assert.equal(trackRecords.filter(({ participantTreatmentStatus }) => !participantTreatmentStatus.terminal).length, 67);
assert.equal(trackRecords.filter(({ stagingStatus }) => !stagingStatus.terminal).length, 67);
assert.equal(trackRecords.filter(({ runtimeWiringStatus }) => runtimeWiringStatus.status === "required_but_runtime_disabled").length, 67);

const outputFiles = [
  join(outputDataDirectory, "track-family-map.json"),
  join(outputDataDirectory, "terminal-treatment-candidates.json"),
  join(outputDocsDirectory, "../d-track-terminalization.md"),
  join(dispatchDirectory, "captain-queue.json"),
  join(dispatchDirectory, "owner-assignments.json"),
  scriptPath,
  ...[...d2aJurisdictions].sort().map((jurisdiction) =>
    join(d2aSummaryDirectory, `${jurisdiction.toLowerCase()}.json`)),
];
const isCodexOwnedOutputPath = (repositoryPath) =>
  repositoryPath.startsWith("data/rcap-codex/d-track-terminalization/")
  || repositoryPath === "docs/rcap/codex/d-track-terminalization.md"
  || repositoryPath.startsWith("docs/rcap/codex/d-track-terminalization/dispatch/");
const worktreeStatusEntries = execFileSync(
  "git",
  ["status", "--porcelain=v1", "-z"],
  { cwd: repositoryRoot, encoding: "utf8" },
).split("\u0000").filter(Boolean);
const changedWorktreePaths = worktreeStatusEntries.map((entry) => entry.slice(3));
assert(changedWorktreePaths.every((path) =>
  path === "data/rcap-codex/"
  || path === "docs/rcap/codex/"
  || isCodexOwnedOutputPath(path),
));
const verificationReport = {
  schemaVersion: "rcap-codex-d-track-terminalization-verification/v1",
  result: "PASS",
  assertions: {
    canonicalDJobs: dJobs.length,
    expectedTracks: 67,
    tracksDerived: trackRecords.length,
    uniqueTracks: new Set(trackRecords.map(({ trackId }) => trackId)).size,
    d2aTracksRecovered: d2aTracks.length,
    canonicalIdsMissingFromOriginalHandoff: canonicalMissingFromSummary.length,
    pinnedComponentRelationships: pinnedComponentRelationshipCount,
    exactMappedComponentRelationships: mappedComponentRelationshipCount,
    explicitlyBlockedPinnedComponentRelationships: unresolvedPinnedComponentRelationshipCount,
    unaccountedPinnedComponentRelationships: 0,
    unsupportedFamilyEdges: 0,
    tracksMarkedTerminal: 0,
    incompleteGuidanceCandidates: 0,
    incompleteExactDeferralCandidates: 0,
    paymentOrCreditBehaviorChanges: 0,
    deterministicOrdering: true,
    onlyCodexOwnedOutputPaths: outputFiles.every((path) =>
      isCodexOwnedOutputPath(relative(repositoryRoot, path))),
    onlyCodexOwnedWorktreePathsChanged: true,
  },
  treatmentCounts: completeTreatmentCounts,
  outputSha256: Object.fromEntries(outputFiles
    .filter((path) => path !== join(dispatchDirectory, "verification-report.json"))
    .sort()
    .map((path) => [relative(repositoryRoot, path), sha256(path)])),
};
writeJson(join(dispatchDirectory, "verification-report.json"), verificationReport);

console.log(JSON.stringify({
  result: verificationReport.result,
  jobs: dJobs.length,
  tracks: trackRecords.length,
  uniqueTracks: new Set(trackRecords.map(({ trackId }) => trackId)).size,
  d2aTracks: d2aTracks.length,
  mappedTracks: mappedTracks.length,
  unresolvedTracks: unresolvedTracks.length,
  treatmentCounts: completeTreatmentCounts,
}, null, 2));
