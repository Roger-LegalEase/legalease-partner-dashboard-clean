#!/usr/bin/env node
// The captain-owned D work queue, derived from the final family handoff.
//
//   node scripts/generate-rcap-d-track-queue.mjs
//   node scripts/generate-rcap-d-track-queue.mjs --check
//
// The inputs are the final D family handoff (253 families, independently
// dispositioned), the independent v3 review that produced the eight open
// families, and the Codex track-family map. Every track gate is RECOMPUTED
// here against the final dispositions rather than carried over from the map's
// own older outcomes, because a family approval is not a track terminality and
// the map was written before the final handoff existed.
//
// Nothing this file writes promotes anything. It produces a queue.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const HANDOFF = "docs/record-clearing/d-wave/v3/family-handoff.json";
const REVIEW = "docs/record-clearing/d-wave/v3/review/review-findings.json";
const MAP = "data/rcap-codex/d-track-terminalization/track-family-map.json";
const OUT_QUEUE = "data/rcap-all50/review-artifacts/d-track-queue.json";
const OUT_ASSIGNMENTS = "data/rcap-all50/review-artifacts/d-correction-assignments.json";
const OUT_DOC = "docs/rcap/review/d/final-handoff-integration.md";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const handoff = read(HANDOFF);
const review = read(REVIEW);
const map = read(MAP);

const problems = [];
const fail = (m) => problems.push(m);

/* ---- families -------------------------------------------------------- */

const finalDisposition = new Map(handoff.families.map((f) => [f.familyId, f.finalDisposition]));
if (finalDisposition.size !== handoff.families.length) fail("a family id appears more than once in the handoff");
if (handoff.families.length !== 253) fail(`expected 253 families, found ${handoff.families.length}`);

const familyTotals = { technical_approved: 0, correction_required: 0, held_on_source_or_design: 0 };
for (const family of handoff.families) {
  if (!(family.finalDisposition in familyTotals)) {
    fail(`${family.familyId}: unknown final disposition ${family.finalDisposition}`);
    continue;
  }
  familyTotals[family.finalDisposition] += 1;
}
if (familyTotals.technical_approved !== 157) fail(`expected 157 approved, found ${familyTotals.technical_approved}`);
if (familyTotals.correction_required !== 8) fail(`expected 8 correction_required, found ${familyTotals.correction_required}`);
if (familyTotals.held_on_source_or_design !== 88) fail(`expected 88 held, found ${familyTotals.held_on_source_or_design}`);

const openFamilyIds = handoff.openFamilies.map((f) => f.familyId).sort();
if (openFamilyIds.length !== 8) fail(`expected 8 open families, found ${openFamilyIds.length}`);

/* ---- the four bounded correction assignments -------------------------- */
//
// Scoped from the independent review's own findings, not from a guess about
// which jurisdictions look related.

// The review records findings per family, not as a flat list.
const findingsByFamily = new Map();
for (const family of review.families ?? []) {
  if (!family.familyId) continue;
  const openFindings = family.findings ?? family.openFindings ?? [];
  findingsByFamily.set(family.familyId, openFindings);
}
const reviewedCorrectionFamilies = (review.families ?? [])
  .filter((f) => f.disposition === "correction_required")
  .map((f) => f.familyId)
  .sort();
if (reviewedCorrectionFamilies.length !== 8) {
  fail(`the independent review returned ${reviewedCorrectionFamilies.length} correction_required families, expected 8`);
}
if (reviewedCorrectionFamilies.join("|") !== openFamilyIds.join("|")) {
  fail("the review's correction_required families do not match the handoff's open families");
}

const ASSIGNMENTS = [
  {
    id: "D-FIX-1",
    title: "Missouri semantic binding",
    familyIds: openFamilyIds.filter((id) => id.startsWith("MO:")),
    defect:
      "The petitioner's own name is bound into 'Other Defendants', a field whose printed label names an outside agency, while every sibling agency field is refused as protected. The filed petition therefore names the petitioner as an additional respondent agency.",
    requiredResult: [
      "Participant identity must not populate an agency or outside-party field.",
      "Agency identity and address stay protected unless exact reviewed evidence supplies them.",
      "Canonical, boundary and negative fixtures.",
      "Actual PDF and contact-sheet proof, not a description of one.",
      "Fresh independent review."
    ]
  },
  {
    id: "D-FIX-2",
    title: "New Hampshire evidence rebuild",
    familyIds: openFamilyIds.filter((id) => id.startsWith("NH:")),
    defect:
      "The participant artifact and its evidence disagree: the contact sheet was not regenerated from the corrected artifact, so the manifest hashes and the removed control captions cannot both be trusted.",
    requiredResult: [
      "The participant PDF remains the reviewed corrected artifact.",
      "The contact sheet is regenerated from that exact final artifact.",
      "Manifest hashes match the artifact they claim.",
      "Removed control captions remain absent.",
      "Fresh independent review."
    ]
  },
  {
    id: "D-FIX-3",
    title: "Washington decoder and matcher",
    familyIds: openFamilyIds.filter((id) => id.startsWith("WA:")),
    defect:
      "The lane profile and the decoder disagree about which lines were refused and which were rendered, and an unreadable-line count of zero coexists with a decoder that refused lines. Single-character PDF text runs are matched before assembly, so labels are matched against fragments.",
    requiredResult: [
      "The lane profile and decoder report the same refused and rendered lines.",
      "The unreadable-line count cannot remain zero while the decoder refuses lines.",
      "Single-character text runs are assembled into usable label tokens before matching.",
      "No guessed anchor; undecodable geometry fails closed.",
      "Exact fixture, PDF, contact-sheet and refusal-ledger proof.",
      "Fresh independent review."
    ]
  },
  {
    id: "D-FIX-4",
    title: "Shared fitter and overflow reporting",
    familyIds: openFamilyIds.filter((id) => id.startsWith("VA:") || id.startsWith("VT:")),
    defect:
      "The fitter reports a clean shrink while the drawn value is shortened, so mid-word truncation is recorded as complete output and text beyond the widget bounds is reported as fitted.",
    requiredResult: [
      "Drawn output preserves the complete supplied value or records an explicit refusal or clip.",
      "Text extending beyond widget bounds is never reported as clean shrinking.",
      "Mid-word truncation is never reported as complete.",
      "requiredWidth, availableWidth, chosen font size, rendered value length and disposition agree.",
      "A shortened drawn value is recorded as clipped or refused.",
      "Mutations for false clean-shrink outcomes.",
      "Fresh independent review."
    ]
  }
];

const assignedFamilies = ASSIGNMENTS.flatMap((a) => a.familyIds).sort();
if (assignedFamilies.length !== openFamilyIds.length || assignedFamilies.some((id, i) => id !== openFamilyIds[i])) {
  fail(`the four assignments cover ${assignedFamilies.join(", ")} but the open families are ${openFamilyIds.join(", ")}`);
}

/* ---- blocked component relationships ---------------------------------- */
//
// Seven distinct categories, kept distinct. Collapsing them into one
// source-acquisition bucket would send 104 relationships to the wrong owner:
// most are missing a binary, but a quarter are missing the metadata that would
// say which binary, and a handful are pinned to a document no family renders.

function classifyRelationship(record) {
  if (record.reasonCode === "track_specific_form_set_conflicts_with_generic_registry_relationship") {
    return "family_identity_ambiguous";
  }
  if (record.reasonCode === "track_specific_source_has_no_rendered_family") {
    return "relationship_unsupported_by_evidence";
  }
  // An exact document-id match failed. What is missing depends on what the
  // pinned relationship already carries.
  if (record.relationshipSourceSha256) return "currentness_unverified";
  if (record.officialSourceUrl) return "missing_source_binary";
  return "missing_canonical_relationship_metadata";
}

const relationshipRows = [];
for (const track of map.tracks) {
  for (const record of track.unresolvedFormRelationships ?? []) {
    relationshipRows.push({
      trackId: track.trackId,
      jurisdiction: track.jurisdiction,
      componentId: record.componentId,
      officialFormId: record.officialFormId,
      officialSourceUrl: record.officialSourceUrl ?? null,
      relationshipSourceSha256: record.relationshipSourceSha256 ?? null,
      corpusState: record.corpusState,
      reasonCode: record.reasonCode,
      exactReason: record.exactReason,
      classification: classifyRelationship(record),
      evidence: record.evidence ?? []
    });
  }
}
relationshipRows.sort((a, b) => a.componentId.localeCompare(b.componentId));
const relationshipCounts = {};
for (const row of relationshipRows) {
  relationshipCounts[row.classification] = (relationshipCounts[row.classification] ?? 0) + 1;
}

/* ---- the 67-track queue ----------------------------------------------- */

const CANDIDATE_TREATMENTS = new Set([
  "production_packet_candidate",
  "complete_guidance_candidate",
  "exact_supported_deferral_candidate",
  "deliberate_scope_exclusion_candidate",
  "correction_required",
  "held_on_source_or_design"
]);

if (map.tracks.length !== 67) fail(`expected 67 D tracks, found ${map.tracks.length}`);
if (new Set(map.tracks.map((t) => t.trackId)).size !== map.tracks.length) fail("a D track id appears more than once");

const tracks = [];
for (const track of map.tracks) {
  const families = (track.requiredFamilies ?? []).map((family) => {
    const disposition = finalDisposition.get(family.familyId) ?? null;
    if (!disposition) fail(`${track.trackId}: required family ${family.familyId} is not in the final handoff`);
    return {
      familyId: family.familyId,
      documentId: family.documentId ?? null,
      sourceSha256: family.sourceSha256 ?? null,
      implementationBranch: family.implementationBranch ?? null,
      implementationCommit: family.implementationCommit ?? null,
      relationshipMethod: family.relationshipMethod ?? null,
      finalDisposition: disposition
    };
  });

  const unresolved = relationshipRows.filter((r) => r.trackId === track.trackId);
  const dispositions = families.map((f) => f.finalDisposition);
  const hasCorrection = dispositions.includes("correction_required");
  const hasHeld = dispositions.includes("held_on_source_or_design");
  const allApproved = families.length > 0 && dispositions.every((d) => d === "technical_approved");

  // The family gate, and then the gates a family approval says nothing about.
  let familyGate;
  if (families.length === 0) familyGate = "no_exact_family_relationship";
  else if (hasCorrection) familyGate = "blocked_by_correction_required_family";
  else if (hasHeld) familyGate = "blocked_by_held_family";
  else familyGate = "all_required_families_approved";

  // A track is never terminal here. Its candidate treatment records what it
  // would become once its blockers close — nothing more.
  let candidateTreatment;
  if (hasCorrection) candidateTreatment = "correction_required";
  else if (hasHeld || families.length === 0 || unresolved.length > 0) candidateTreatment = "held_on_source_or_design";
  else candidateTreatment = "production_packet_candidate";
  if (!CANDIDATE_TREATMENTS.has(candidateTreatment)) fail(`${track.trackId}: illegal candidate treatment`);

  // Root blocker, in the order a participant would hit it.
  let rootBlocker;
  let rootBlockerOwner;
  let nextExecutableAction;
  if (hasCorrection) {
    const assignment = ASSIGNMENTS.find((a) => a.familyIds.some((id) => families.some((f) => f.familyId === id)));
    rootBlocker = `a required family is correction_required (${assignment?.id ?? "unassigned"})`;
    rootBlockerOwner = "Terminal D remediation owner";
    nextExecutableAction = `complete ${assignment?.id ?? "the correction assignment"} and obtain fresh independent review`;
  } else if (families.length === 0 || unresolved.length > 0) {
    const kinds = [...new Set(unresolved.map((r) => r.classification))].sort();
    rootBlocker = families.length === 0
      ? "no exact family relationship resolves for this track"
      : `${unresolved.length} pinned component relationship(s) unresolved: ${kinds.join(", ")}`;
    rootBlockerOwner = kinds.includes("missing_canonical_relationship_metadata") || kinds.includes("family_identity_ambiguous")
      ? "Terminal D relationship-metadata owner"
      : "Terminal D source owner";
    nextExecutableAction = "resolve the pinned relationships by their exact classification; do not treat a missing relationship as a missing source";
  } else if (hasHeld) {
    rootBlocker = "a required family is held on source or legal design";
    rootBlockerOwner = "Terminal D source/design owner";
    nextExecutableAction = "close the family's recorded source or legal-design hold";
  } else {
    rootBlocker = "no family blocker; the nontechnical track gates remain open";
    rootBlockerOwner = "Terminal A with the named gate owners";
    nextExecutableAction = "close legal-adoption continuity, participant treatment, runtime wiring and staging acceptance for this track";
  }

  tracks.push({
    trackId: track.trackId,
    jurisdiction: track.jurisdiction,
    legalName: track.legalName,
    implementationLane: track.implementationLane,
    canonicalRequiredTreatment: track.canonicalRequiredTreatment,
    requiredFamilyIds: families.map((f) => f.familyId),
    requiredFamilies: families,
    familyGate,
    allRequiredFamiliesApproved: allApproved,
    unresolvedRelationshipCount: unresolved.length,
    unresolvedRelationshipClassifications: [...new Set(unresolved.map((r) => r.classification))].sort(),
    // Gates a family approval does not answer. Carried from the map's recorded
    // status and never inferred from the technical disposition.
    sourceIdentityStatus: track.sourceCurrentnessStatus?.identity ?? track.sourceCurrentnessStatus ?? "unknown",
    sourceCurrentnessStatus: track.sourceCurrentnessStatus?.currentness ?? track.sourceCurrentnessStatus ?? "unknown",
    governingLawCurrentness: track.sourceCurrentnessStatus?.governingLaw ?? "unknown",
    legalDesignStatus: track.legalDesignStatus ?? "unknown",
    legalAdoptionContinuity: track.legalAdoptionStatus ?? "unknown",
    participantTreatmentStatus: track.participantTreatmentStatus ?? "unknown",
    runtimeWiringStatus: track.runtimeWiringStatus ?? "unknown",
    paymentAndCreditBehavior: {
      paymentAllowed: false,
      checkoutSuppressed: true,
      packetCreditConsumption: "none",
      partnerCreditConsumed: false,
      note: "No D track is sellable in this pass. Nothing here makes a route sellable."
    },
    stagingStatus: track.stagingStatus ?? "unknown",
    rootBlocker,
    rootBlockerOwner,
    nextExecutableAction,
    candidateProductTreatment: candidateTreatment,
    terminal: false
  });
}
tracks.sort((a, b) => a.trackId.localeCompare(b.trackId));

const d2aTracks = tracks.filter((t) => t.implementationLane === "D2A").map((t) => t.trackId);
const edges = tracks.reduce((sum, t) => sum + t.requiredFamilyIds.length, 0);

const gateCounts = {
  all_required_families_approved: tracks.filter((t) => t.familyGate === "all_required_families_approved").length,
  blocked_by_correction_required_family: tracks.filter((t) => t.familyGate === "blocked_by_correction_required_family").length,
  blocked_by_held_family: tracks.filter((t) => t.familyGate === "blocked_by_held_family").length,
  no_exact_family_relationship: tracks.filter((t) => t.familyGate === "no_exact_family_relationship").length
};

/* ---- owner queue ------------------------------------------------------ */

const OWNED_PATHS = {
  correction: ["data/rcap-all50/overlays/production/**", "data/rcap-all50/hard-forms/**", "scripts/rcap-official-forms/**"],
  source: ["data/rcap-all50/official-sources/**", "data/record-clearing/legal-design-track-source-relationships.json"],
  relationship: ["data/record-clearing/legal-design-track-source-relationships.json"],
  adoption: ["docs/record-clearing/d-wave/**", "data/rcap-all50/review-artifacts/d-*.json"]
};
const PROHIBITED_PATHS = [
  "data/rcap-ledger/**",
  "data/rcap-all50/review-artifacts/f2-dispositions.json",
  "src/**",
  "supabase/**",
  "package.json",
  "deploy/**"
];

const jobs = [];
const job = (id, kind, trackIds, familyIds, owner, expectedOutput, stopCondition, terminalEffect, owned) => jobs.push({
  jobId: id,
  kind,
  owner,
  trackIds: [...trackIds].sort(),
  familyIds: [...familyIds].sort(),
  baseSha: handoff.schema?.baseSha ?? null,
  ownedPaths: owned,
  prohibitedPaths: PROHIBITED_PATHS,
  requiredEvidence: "exact rendered artifact, contact sheet and manifest hashes, or the exact official source bytes, as the kind requires",
  expectedOutput,
  stopCondition,
  independentReviewRequired: true,
  terminalEffectWhenAccepted: terminalEffect
});

for (const assignment of ASSIGNMENTS) {
  const trackIds = tracks.filter((t) => t.requiredFamilyIds.some((id) => assignment.familyIds.includes(id))).map((t) => t.trackId);
  job(
    assignment.id, "d_correction", trackIds, assignment.familyIds, "Terminal D remediation owner",
    assignment.requiredResult.join(" "),
    "Stop if the correction would touch a family outside this assignment's exact family ids.",
    "the family becomes eligible for re-review; no track becomes terminal",
    OWNED_PATHS.correction
  );
}

const byClassification = new Map();
for (const row of relationshipRows) {
  const list = byClassification.get(row.classification) ?? [];
  list.push(row);
  byClassification.set(row.classification, list);
}
const CLASSIFICATION_JOBS = {
  missing_source_binary: ["D-SRC-ACQUIRE", "source acquisition", "Terminal D source owner", "retrieve and pin the named official binary"],
  currentness_unverified: ["D-SRC-CURRENT", "currentness confirmation", "Terminal D source owner", "confirm the pinned binary is the currently operative revision"],
  missing_canonical_relationship_metadata: ["D-REL-META", "relationship metadata", "Terminal D relationship-metadata owner", "supply the canonical relationship metadata that names which official document the component binds"],
  family_identity_ambiguous: ["D-REL-AMBIG", "relationship metadata", "Terminal D relationship-metadata owner", "resolve the conflict between the track-specific form set and the generic registry relationship"],
  relationship_unsupported_by_evidence: ["D-REL-UNSUPPORTED", "relationship metadata", "Terminal D relationship-metadata owner", "either render a family for the pinned document or withdraw the relationship"],
  source_stale_or_superseded: ["D-SRC-STALE", "source acquisition", "Terminal D source owner", "replace the superseded source"],
  legal_design_relationship_missing: ["D-DESIGN-REL", "legal-design completion", "Roger/counsel with Terminal D", "supply the missing legal-design relationship"]
};
for (const [classification, [id, kind, owner, output]] of Object.entries(CLASSIFICATION_JOBS)) {
  const rows = byClassification.get(classification) ?? [];
  if (rows.length === 0) continue;
  job(
    id, kind, [...new Set(rows.map((r) => r.trackId))], [], owner, output,
    "Stop if closing this would require asserting a document identity the evidence does not supply.",
    "the blocked relationship resolves; the track's family gate is re-evaluated",
    classification.startsWith("missing_source") || classification.startsWith("currentness") || classification.startsWith("source_")
      ? OWNED_PATHS.source
      : OWNED_PATHS.relationship
  );
}

// The nontechnical gates. Deliberately NOT one blanket counsel job and NOT one
// blanket source job: adoption, participant treatment, runtime and staging are
// separate questions with separate owners.
const heldTracks = tracks.filter((t) => t.familyGate === "blocked_by_held_family").map((t) => t.trackId);
if (heldTracks.length > 0) {
  job("D-HELD-FAMILY", "legal-design completion", heldTracks, [], "Terminal D source/design owner",
    "close the recorded source or legal-design hold on each named family",
    "Stop if the hold's recorded reason is not the reason being closed.",
    "the family gate re-evaluates; no track becomes terminal", OWNED_PATHS.source);
}
const cleanTracks = tracks.filter((t) => t.familyGate === "all_required_families_approved").map((t) => t.trackId);
if (cleanTracks.length > 0) {
  job("D-ADOPT", "legal-adoption continuity", cleanTracks, [], "Roger/counsel with Terminal A",
    "classify each track's adoption as standing_adoption_applies, layout_only_continuity_applies, new_substantive_review_required, outside_standing_scope or insufficient_evidence_to_classify",
    "Stop rather than classify a track whose evidence does not support any of the five.",
    "adoption continuity closes for the named tracks", OWNED_PATHS.adoption);
  job("D-PARTICIPANT", "participant guidance or exact deferral", cleanTracks, [], "Terminal B participant-treatment owner",
    "an EN/ES participant treatment for each track, with payment and credit suppressed",
    "Stop if the treatment would assert a legal claim the family evidence does not support.",
    "the participant-treatment gate closes", OWNED_PATHS.adoption);
  job("D-RUNTIME", "runtime wiring", cleanTracks, [], "Terminal A runtime owner",
    "a compiled pathway for each track, or a recorded decision that it stays out of the runtime",
    "Stop if the track's primary blocker has not closed first.",
    "the runtime gate closes; the route remains non-sellable", ["src/lib/rcap-engine/compiled/profiles/**"]);
  job("D-STAGING", "staging acceptance", cleanTracks, [], "Terminal A staging owner",
    "staging acceptance evidence on the final source and digest",
    "Stop until the final worker digest is published.",
    "the staging gate closes", OWNED_PATHS.adoption);
  job("D-REVIEW", "independent review", cleanTracks, [], "independent reviewer (not the author)",
    "an independent disposition for every corrected or newly authored D artifact",
    "Stop if the reviewer authored the artifact.",
    "the review gate closes", OWNED_PATHS.adoption);
}

/* ---- write ------------------------------------------------------------ */

const queue = {
  schemaVersion: "rcap-d-track-queue/v1",
  generatedBy: "scripts/generate-rcap-d-track-queue.mjs",
  window: "2026-08-12-w3",
  statement:
    "The current D plan of record. Family dispositions come from the final handoff; every track gate is recomputed against them. No track is terminal, no family disposition is changed, and the canonical completion ledger is untouched.",
  inputs: {
    familyHandoff: { path: HANDOFF, commit: "4069948997e8ec8398cb0c7bd9b47ef93a6b299d", branch: "claude/rcap-d-corrected-review-manifest" },
    independentReview: { path: REVIEW, commit: "3601d8fe3ad2b90a1ab1ca119343a83cbec2b501", branch: "claude/rcap-review-d-v3-shard-0", reviewedBase: "7cdba10c" },
    trackFamilyMap: { path: MAP, commit: "0a4eaff57ccdd68ac4e9eb03abe739aca0dab0ed", branch: "codex/rcap-d-track-terminalization" }
  },
  familyTotals: { ...familyTotals, total: handoff.families.length },
  openFamilyIds,
  trackTotals: {
    tracks: tracks.length,
    d2aTracks: d2aTracks.length,
    familyEdges: edges,
    ...gateCounts
  },
  blockedComponentRelationships: {
    total: relationshipRows.length,
    countsReportedByCodex: map.counts?.unresolvedPinnedComponentRelationships ?? null,
    note:
      "The repository-derived count is the number of unresolvedFormRelationships records across all 67 tracks. Codex reported 101, which is the subset whose corpusState is 'unchecked'; three more are pinned to a document present in the corpus but rendered by no D family.",
    classifications: relationshipCounts,
    records: relationshipRows
  },
  exactBlockers: [
    {
      id: "D-BLOCK-1",
      severity: "high",
      finding:
        "Three of the eight open families are required by no D track in the 67: MO:cr145-form-petition-en, VA:cc-1203-form-en and VT:200-00631-form-en. Their jurisdictions do have D tracks, but those tracks bind to different families (MO CR-300/CR-360/GN-10, VA CC-1473/CC-1201, VT 200-00130/200-00132/600-00228). The corrections are still required — the families are open on independent review — but no track is currently waiting on them.",
      question: "Was each of these three built for a track outside the D 67, or is a relationship missing from the track map?",
      owner: "Terminal D relationship-metadata owner with Terminal A"
    },
    {
      id: "D-BLOCK-2",
      severity: "high",
      finding:
        "D-FIX-4 is a defect in the SHARED fitter, not in two families. The review found it in VA CC-1203 and VT 200-00631 because those are the two it opened, but a fitter that reports a clean shrink while truncating a drawn value can have produced the same silent defect in any family the factory rendered.",
      question: "Once the fitter is corrected, which already-approved families need their rendered artifacts re-checked against the corrected fitter?",
      owner: "Terminal D remediation owner with the independent reviewer"
    },
    {
      id: "D-BLOCK-3",
      severity: "medium",
      finding:
        "25 of the 67 tracks resolve no exact family relationship at all, and 104 pinned component relationships are unresolved. Neither is a source-acquisition problem by default: 29 are missing the metadata that would name which document to acquire, and 5 are relationship defects rather than source gaps.",
      question: "Who owns supplying canonical relationship metadata, as distinct from acquiring binaries?",
      owner: "Terminal D relationship-metadata owner"
    }
  ],
  d2aTracks,
  tracks
};

const assignments = {
  schemaVersion: "rcap-d-correction-assignments/v1",
  window: "2026-08-12-w3",
  statement: "Four bounded correction assignments covering exactly the eight open D families. No assignment may touch a family outside its own list.",
  openFamilyIds,
  assignments: ASSIGNMENTS.map((a) => ({
    ...a,
    trackIds: tracks.filter((t) => t.requiredFamilyIds.some((id) => a.familyIds.includes(id))).map((t) => t.trackId).sort(),
    reviewFindingIds: a.familyIds
      .flatMap((id) => (handoff.openFamilies.find((f) => f.familyId === id)?.openFindings ?? []).map((f) => f.id))
      .sort(),
    reviewFindings: a.familyIds.flatMap((id) =>
      (handoff.openFamilies.find((f) => f.familyId === id)?.openFindings ?? []).map((f) => ({
        id: f.id,
        familyId: id,
        severity: f.severity,
        file: f.file,
        fieldOrRegion: f.fieldOrRegion,
        visibleDefect: f.visibleDefect,
        acceptanceCondition: f.acceptanceCondition
      }))),
    ownedPaths: OWNED_PATHS.correction,
    prohibitedPaths: PROHIBITED_PATHS,
    independentReviewRequired: true,
    promotionEffect: "none; an accepted correction makes the family eligible for re-review and makes no track terminal"
  })),
  jobs
};

if (problems.length > 0) {
  console.error(`FAIL generate-rcap-d-track-queue (${problems.length} problem(s))`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

const writeOrCheck = (rel, text) => {
  const abs = path.join(rootDir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  if (checkOnly) {
    const current = fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : "";
    if (current !== text) {
      console.error(`${rel} is stale; re-run without --check`);
      process.exit(1);
    }
    return;
  }
  fs.writeFileSync(abs, text);
};

writeOrCheck(OUT_QUEUE, `${JSON.stringify(queue, null, 2)}\n`);
writeOrCheck(OUT_ASSIGNMENTS, `${JSON.stringify(assignments, null, 2)}\n`);

const doc = `# Final D family handoff — integrated, nothing promoted

**Family handoff:** \`4069948997e8ec8398cb0c7bd9b47ef93a6b299d\` on \`claude/rcap-d-corrected-review-manifest\`
**Independent v3 review:** \`3601d8fe3ad2b90a1ab1ca119343a83cbec2b501\` on \`claude/rcap-review-d-v3-shard-0\` (one commit above reviewed base \`7cdba10c\`, two owned review paths only)
**Track-family map:** \`0a4eaff57ccdd68ac4e9eb03abe739aca0dab0ed\` on \`codex/rcap-d-track-terminalization\`

Machine-readable: \`${OUT_QUEUE}\`, \`${OUT_ASSIGNMENTS}\`

## Families reconcile exactly

| Disposition | Count |
|---|---|
| technical_approved | ${familyTotals.technical_approved} |
| correction_required | ${familyTotals.correction_required} |
| held_on_source_or_design | ${familyTotals.held_on_source_or_design} |
| **total** | **${handoff.families.length}** |

Every family appears exactly once. Prior holds are unchanged at 88, and no
family outside the v3 review's 20 had its disposition moved by it.

## The eight open families map cleanly onto four assignments

${ASSIGNMENTS.map((a) => `* **${a.id} — ${a.title}**: ${a.familyIds.join(", ")}`).join("\n")}

No assignment may touch a family outside its own list.

## Track gates recomputed, not carried over

The track map was written before the final handoff existed, so every gate is
recomputed here against the final dispositions. A family approval is not a
track terminality, and none of the 67 tracks is terminal.

| Family gate | Tracks |
|---|---|
| all required families approved | ${gateCounts.all_required_families_approved} |
| blocked by a correction_required family | ${gateCounts.blocked_by_correction_required_family} |
| blocked by a held family | ${gateCounts.blocked_by_held_family} |
| no exact family relationship resolves | ${gateCounts.no_exact_family_relationship} |
| **total** | **${tracks.length}** |

${d2aTracks.length} tracks are D2A, reverified from the current map.
${edges} track-to-family edges resolve, every one against a family present in the handoff.

## The blocked relationships are not one bucket

The repository-derived count is **${relationshipRows.length}**, not the 101 the map's
own \`counts\` block reports — that figure is the subset whose \`corpusState\` is
\`unchecked\`, and three more are pinned to a document that exists in the corpus
but that no D family renders.

| Classification | Count |
|---|---|
${Object.entries(relationshipCounts).sort().map(([k, v]) => `| \`${k}\` | ${v} |`).join("\n")}

Collapsing these into one source-acquisition job would send most of them to the
wrong owner: ${relationshipCounts.missing_source_binary ?? 0} are missing a binary we can name,
but ${relationshipCounts.missing_canonical_relationship_metadata ?? 0} are missing the metadata that would say *which*
binary, and ${(relationshipCounts.family_identity_ambiguous ?? 0) + (relationshipCounts.relationship_unsupported_by_evidence ?? 0)} are relationship defects rather than source gaps.

## What did not happen

No track promoted. No family disposition changed. The canonical completion
ledger was not regenerated. No route was made sellable. No launch flag,
migration, staging or worker record was touched.
`;
writeOrCheck(OUT_DOC, doc);

console.log(checkOnly ? "d track queue current" : `wrote ${OUT_QUEUE}, ${OUT_ASSIGNMENTS}, ${OUT_DOC}`);
console.log(`  families ${familyTotals.technical_approved}/${familyTotals.correction_required}/${familyTotals.held_on_source_or_design} = ${handoff.families.length} | tracks ${tracks.length} | edges ${edges} | D2A ${d2aTracks.length} | blocked relationships ${relationshipRows.length} | jobs ${jobs.length}`);
void crypto;
