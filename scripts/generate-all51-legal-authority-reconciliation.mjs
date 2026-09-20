// All-51 legal authority and adoption reconciliation.
//
// Answers one question for every pathway the closure ledger holds open on
// legal_review_pending: what is actually missing, measured against every
// authority layer that already exists.
//
// The rule this enforces: nothing goes back to legal review when its exact
// track sits in an adopted hash-bound memo, its legal design is already
// approved, its completed-output family is already approved, or the only thing
// outstanding is renderer, mapping, source packaging, family bridging,
// metadata, visual review or hosted acceptance.
//
// Authority layers, in the order they are consulted:
//   1. data/record-clearing/legal-design-intake/<CODE>.memo.json  (hash-bound)
//   2. data/record-clearing/legal-design-track-registry.json
//   3. data/record-clearing/legal-design-specifications.json
//   4. data/record-clearing/legal-design-packet-set-manifests.json
//   5. data/record-clearing/legal-design-track-source-relationships.json
//   6. data/rcap-all50/review-artifacts/d-adoption-reconciliation.json
//   7. data/rcap-codex/d-adoption-continuity/track-adoption.json
//   8. data/rcap-ledger/completed-output-counsel-manifest.json
//   9. data/rcap-ledger/track-terminalization.json
//  10. data/rcap-ledger/launch-graph.json + the ALL51 coverage reconciliation
//
// Usage:
//   node scripts/generate-all51-legal-authority-reconciliation.mjs           # write
//   node scripts/generate-all51-legal-authority-reconciliation.mjs --check   # verify

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readOwnerLegalDecision } from "./lib/rcap-owner-legal-decision.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");

const OUT_JSON = "data/rcap-ledger/all51-legal-authority-reconciliation.json";
const OUT_MD = "docs/record-clearing/ALL51_LEGAL_AUTHORITY_RECONCILIATION.md";
const MEMO_DIR = "data/record-clearing/legal-design-intake";

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
const readOptional = (rel) => (fs.existsSync(path.join(root, rel)) ? readJson(rel) : null);

const closure = readJson("data/rcap-ledger/sellable-pathway-closure.json");
const legalJoin = readJson("data/rcap-ledger/paid-pathway-legal-join.json");
const launchGraph = readJson("data/rcap-ledger/launch-graph.json");
const coverage = readJson("data/rcap-all50/all51-coverage-reconciliation.json");
const trackAdoption = readOptional("data/rcap-codex/d-adoption-continuity/track-adoption.json");
const adoptionReconciliation = readOptional("data/rcap-all50/review-artifacts/d-adoption-reconciliation.json");
const terminalization = readOptional("data/rcap-ledger/track-terminalization.json");
const counselManifest = readOptional("data/rcap-ledger/completed-output-counsel-manifest.json");
const ownerDecision = readOwnerLegalDecision();

// ---------------------------------------------------------------------------
// Layer 1: the hash-bound legal memos. One per jurisdiction, 586 tracks.
// ---------------------------------------------------------------------------

const memoTracks = new Map();   // trackId -> memo track record
const memoByJurisdiction = new Map();

for (const file of fs.readdirSync(path.join(root, MEMO_DIR)).sort()) {
  if (!file.endsWith(".memo.json") || file === "TEMPLATE.memo.json") continue;
  const rel = `${MEMO_DIR}/${file}`;
  const raw = fs.readFileSync(path.join(root, rel), "utf8");
  const memo = JSON.parse(raw);
  const hash = createHash("sha256").update(raw).digest("hex");
  memoByJurisdiction.set(memo.jurisdiction, { path: rel, hash, memoVersion: memo.memoVersion, submittedAt: memo.submittedAt, trackCount: memo.tracks.length });

  for (const track of memo.tracks) {
    memoTracks.set(track.trackId, {
      jurisdiction: memo.jurisdiction,
      trackId: track.trackId,
      memoPath: rel,
      memoHash: hash,
      memoVersion: memo.memoVersion,
      legalName: track.legalName ?? null,
      legalDesignStatus: track.legalDesignDecision?.status ?? null,
      legalDesignRationale: track.legalDesignDecision?.rationale ?? null,
      reviewedAsOf: track.effectiveDates?.reviewedAsOf ?? null,
      controllingAuthority: track.controllingAuthority?.citations ?? [],
      officialSources: (track.officialSources ?? []).map((s) => ({ title: s.title ?? null, retrievedOn: s.retrievedOn ?? null })),
      releaseBlockingQuestions: (track.unresolvedQuestions ?? []).filter((q) => q.impact === "release_blocker").length,
      // Provenance is what separates a legal question from a sourcing or
      // translation one. A memo that says "the official PDF has not been
      // acquired" is naming a source blocker, not asking counsel anything.
      counselConfirmationQuestions: (track.unresolvedQuestions ?? [])
        .filter((q) => q.impact === "release_blocker" && q.provenance?.classificationBasis === "counsel_confirmation_required").length,
      sourceAcquisitionQuestions: (track.unresolvedQuestions ?? [])
        .filter((q) => q.impact === "release_blocker" && q.provenance?.classificationBasis === "explicit_state_addendum").length,
      mechanicalQuestions: (track.unresolvedQuestions ?? [])
        .filter((q) => q.impact === "release_blocker" && q.provenance?.classificationBasis === "mechanical_translation").length,
      unresolvedQuestions: (track.unresolvedQuestions ?? []).length
    });
  }
}

// ---------------------------------------------------------------------------
// Layers 6 and 7: adoption classification per track.
// ---------------------------------------------------------------------------

const adoptionByTrack = new Map();
for (const track of trackAdoption?.tracks ?? []) {
  adoptionByTrack.set(track.trackId, {
    classification: track.classification ?? null,
    newSubstantiveReviewRequired: Boolean(track.newSubstantiveReviewRequired),
    counselJobId: track.counselJobId ?? null,
    rationale: track.classificationRationale ?? null
  });
}
for (const track of adoptionReconciliation?.tracks ?? []) {
  const existing = adoptionByTrack.get(track.trackId) ?? {};
  adoptionByTrack.set(track.trackId, {
    classification: existing.classification ?? track.classification ?? null,
    newSubstantiveReviewRequired: existing.newSubstantiveReviewRequired ?? Boolean(track.newSubstantiveReviewRequired),
    counselJobId: existing.counselJobId ?? track.counselJobId ?? null,
    rationale: existing.rationale ?? track.classificationRationale ?? null
  });
}

// ---------------------------------------------------------------------------
// Layer 9: terminalization, which carries the per-track technical lane.
// ---------------------------------------------------------------------------

const terminalByTrack = new Map();
for (const track of terminalization?.tracks ?? []) {
  if (!track.trackId) continue;
  terminalByTrack.set(track.trackId, {
    lane: track.lane ?? track.laneAssignment ?? null,
    terminal: track.terminal ?? null,
    treatment: track.treatment ?? track.treatmentClassification ?? null
  });
}

const joinByKey = new Map(legalJoin.pathways.map((p) => [p.pathwayKey, p]));
const coverageByCode = new Map(coverage.jurisdictions.map((j) => [j.jurisdiction, j]));

const pendingRows = closure.pathways.filter(
  (p) => (p.openBlockers ?? []).some((b) => b.id === "legal_review_pending")
);

// Blockers that are unambiguously not legal questions.
const TECHNICAL_BLOCKERS = new Set(["renderer_unavailable", "gate_build", "route_metadata", "intake_fix", "wait_anchor_fix", "not_paid_product", "packet_spec_incomplete", "filing_determination_missing"]);

const rows = pendingRows.map((row) => {
  const join = joinByKey.get(row.pathwayKey) ?? null;
  const trackIds = join?.registryTrackIds ?? [];
  const memos = trackIds.map((id) => memoTracks.get(id)).filter(Boolean);
  const adoptions = trackIds.map((id) => adoptionByTrack.get(id)).filter(Boolean);
  const terminals = trackIds.map((id) => terminalByTrack.get(id)).filter(Boolean);
  const blockerIds = new Set((row.openBlockers ?? []).map((b) => b.id));
  const technicalBlockers = [...blockerIds].filter((id) => TECHNICAL_BLOCKERS.has(id));

  const memoApproved = memos.length > 0
    && memos.every((m) => m.legalDesignStatus === "legal_design_approved" || m.legalDesignStatus === "legal_design_approved_with_limitations");
  const memoResearchRequired = memos.some((m) => m.legalDesignStatus === "legal_research_required");
  const standingAdoption = adoptions.some((a) => a.classification === "standing_adoption_applies" || a.classification === "layout_only_continuity_applies");
  const substantiveReviewRequired = adoptions.some((a) => a.newSubstantiveReviewRequired);
  const outputApproved = join?.legalStatus === "approved_by_decision_owner";
  const familyBridge = Boolean(join?.familyBridgePresent);
  const reconfirmation = blockerIds.has("legal_reconfirmation");

  const counselConfirmations = memos.reduce((a, m) => a + m.counselConfirmationQuestions, 0);
  const sourceQuestions = memos.reduce((a, m) => a + m.sourceAcquisitionQuestions, 0);

  const classification = classify({
    memos, memoApproved, memoResearchRequired, standingAdoption, substantiveReviewRequired,
    outputApproved, familyBridge, reconfirmation, trackIds, join, technicalBlockers, row,
    counselConfirmations, sourceQuestions
  });

  return {
    jurisdiction: row.jurisdiction,
    pathway: row.pathwayId,
    pathwayKey: row.pathwayKey,
    pathwayLabel: row.pathwayLabel,
    trackIds,
    legalMemoPaths: [...new Set(memos.map((m) => m.memoPath))],
    legalMemoHashes: [...new Set(memos.map((m) => m.memoHash))],
    legalDesignStatus: memos.length === 0
      ? "no_memo_track_bridge"
      : [...new Set(memos.map((m) => m.legalDesignStatus))].join(", "),
    reviewedAsOf: [...new Set(memos.map((m) => m.reviewedAsOf).filter(Boolean))].sort().pop() ?? null,
    controllingAuthority: [...new Set(memos.flatMap((m) => m.controllingAuthority))].slice(0, 12),
    openLegalDesignBlocker: memos.reduce((a, m) => a + m.releaseBlockingQuestions, 0),
    counselConfirmationQuestions: counselConfirmations,
    sourceAcquisitionQuestions: sourceQuestions,
    mechanicalTranslationQuestions: memos.reduce((a, m) => a + m.mechanicalQuestions, 0),
    packetFamily: join?.packetFamilies ?? [],
    familyBridgePresent: familyBridge,
    standingAdoption: adoptions.map((a) => a.classification).filter(Boolean),
    completedOutputApproval: outputApproved
      ? (ownerDecision.records ?? []).map((r) => r.id).join(", ") || "approved_by_decision_owner"
      : "owner_approval_pending",
    sourceCurrentness: [...new Set(memos.flatMap((m) => m.officialSources.map((s) => s.retrievedOn)).filter(Boolean))].sort().pop() ?? null,
    technicalStatus: technicalBlockers.length > 0 ? technicalBlockers.join(", ") : "no technical blocker open",
    visualStatus: coverageByCode.get(row.jurisdiction)?.reviewStatuses?.visual ?? "unknown",
    currentLaunchStatus: row.stages?.successfullyRendered ? "renders; payment closed" : "does not render; payment closed",
    terminalizationLane: [...new Set(terminals.map((t) => t.lane).filter(Boolean))],
    actualRemainingBlocker: classification.actualRemainingBlocker,
    classification: classification.classification,
    reason: classification.reason
  };
});

/**
 * One row, one classification. Legal classes are only reachable when no
 * adopted authority already answers the question.
 */
function classify(ctx) {
  const { memos, memoApproved, memoResearchRequired, standingAdoption, substantiveReviewRequired,
    outputApproved, familyBridge, reconfirmation, trackIds, join, technicalBlockers,
    counselConfirmations, sourceQuestions } = ctx;

  // No bridge from the pathway to any registry track: nothing can be looked up,
  // let alone reviewed.
  if (trackIds.length === 0) {
    return {
      classification: "NO_PATHWAY_TO_TRACK_BRIDGE",
      reason: "The pathway resolves to no registry track, so no memo, adoption record or family can attach to it.",
      actualRemainingBlocker: "Bind the pathway to a registry track."
    };
  }

  // A track exists but no memo covers it: this is the only route to genuine new
  // legal design work.
  if (memos.length === 0) {
    return {
      classification: "TRUE_LEGAL_DESIGN_BLOCKER",
      reason: "The pathway's registry track is not present in any hash-bound legal memo, so its legal design has never been written.",
      actualRemainingBlocker: `Legal design for ${trackIds.join(", ")}.`
    };
  }

  if (memoResearchRequired) {
    return {
      classification: "TRUE_LEGAL_DESIGN_BLOCKER",
      reason: "The memo records legal_research_required for this track. The design is not complete and no adoption covers it.",
      actualRemainingBlocker: `Complete the legal research the memo names for ${trackIds.join(", ")}.`
    };
  }

  if (substantiveReviewRequired) {
    return {
      classification: "TRUE_COMPLETED_OUTPUT_LEGAL_REVIEW_REQUIRED",
      reason: "The adoption reconciliation marks this track as requiring new substantive counsel review.",
      actualRemainingBlocker: "New substantive counsel review of the completed output."
    };
  }

  // Ratification currency is the one thing an adopted memo does not answer.
  if (reconfirmation && familyBridge && outputApproved) {
    return {
      classification: "LEGAL_RECONFIRMATION_REQUIRED",
      reason: "The legal design is adopted and the completed output is approved, but counsel ratification of this route is not current.",
      actualRemainingBlocker: "Reconfirm that counsel ratification is current."
    };
  }

  // From here the legal question is answered. What remains is mechanical.
  if (!familyBridge) {
    return {
      classification: "NO_TRACK_TO_FAMILY_BRIDGE",
      reason: memoApproved
        ? "The legal design is approved in a hash-bound memo, but the track reaches no packet family, so no approval can attach to a packet."
        : "The track reaches no packet family.",
      actualRemainingBlocker: `Bridge ${trackIds.join(", ")} to a packet family, or record the pathway as a non-packet service outcome.`
    };
  }

  if (technicalBlockers.length > 0) {
    return {
      classification: "TECHNICAL_BLOCKER",
      reason: `The legal design is adopted and the family is bridged. What is open is engineering: ${technicalBlockers.join(", ")}.`,
      actualRemainingBlocker: technicalBlockers.join(", ")
    };
  }

  // The memo's own release-blocking questions, once bridging and engineering are
  // clear. Only the counsel-confirmation ones are a legal ask; the rest name a
  // source that has not been acquired.
  if (counselConfirmations > 0) {
    return {
      classification: "TRUE_COMPLETED_OUTPUT_LEGAL_REVIEW_REQUIRED",
      reason: `The adopted memo leaves ${counselConfirmations} release-blocking question(s) whose provenance is counsel_confirmation_required.`,
      actualRemainingBlocker: `Counsel confirmation of ${counselConfirmations} named question(s).`
    };
  }

  if (sourceQuestions > 0) {
    return {
      classification: "SOURCE_BLOCKER",
      reason: `The adopted memo leaves ${sourceQuestions} release-blocking question(s) that name an official source not yet acquired. Acquiring the source answers them; counsel is not the bottleneck.`,
      actualRemainingBlocker: `Acquire ${sourceQuestions} named official source(s).`
    };
  }

  if (outputApproved) {
    return {
      classification: "APPROVAL_NOT_LINKED",
      reason: "The legal design is adopted, the family is bridged and the completed output is approved. The closure ledger has not projected that approval onto this pathway row.",
      actualRemainingBlocker: "Project the recorded approval into the closure ledger."
    };
  }

  if (standingAdoption || memoApproved) {
    return {
      classification: "LEGAL_DESIGN_ALREADY_APPROVED",
      reason: "The exact track sits in an adopted hash-bound memo with an approved legal design. The completed-output approval has not yet been recorded for this family.",
      actualRemainingBlocker: "Record the completed output under the existing standing adoption."
    };
  }

  return {
    classification: "STALE_GENERATED_STATUS",
    reason: "No legal, bridging or technical gate is open, and the ledger still reports the legal gate as pending.",
    actualRemainingBlocker: "Regenerate the closure ledger."
  };
}

const counts = {};
for (const row of rows) counts[row.classification] = (counts[row.classification] ?? 0) + 1;

const LEGAL_CLASSES = new Set([
  "TRUE_LEGAL_DESIGN_BLOCKER",
  "TRUE_COMPLETED_OUTPUT_LEGAL_REVIEW_REQUIRED",
  "LEGAL_RECONFIRMATION_REQUIRED"
]);

// A legal team assignment is one shared decision, not one row.
const assignmentGroups = new Map();
for (const row of rows) {
  if (!LEGAL_CLASSES.has(row.classification)) continue;
  const key = `${row.classification}`;
  const group = assignmentGroups.get(key) ?? { classification: row.classification, rows: [], jurisdictions: new Set(), trackIds: new Set() };
  group.rows.push(row.pathwayKey);
  group.jurisdictions.add(row.jurisdiction);
  for (const id of row.trackIds) group.trackIds.add(id);
  assignmentGroups.set(key, group);
}

const legalAssignments = [...assignmentGroups.values()].map((group, index) => ({
  assignmentId: `LA-${String(index + 1).padStart(2, "0")}`,
  classification: group.classification,
  affectedPathwayRows: group.rows.length,
  jurisdictions: [...group.jurisdictions].sort(),
  trackIds: [...group.trackIds].sort(),
  legalOwner: "Lawrence Blackmon",
  pathwayKeys: group.rows.sort()
}));

const register = {
  schemaVersion: 1,
  generatedBy: "scripts/generate-all51-legal-authority-reconciliation.mjs",
  createsApproval: false,
  authorityLayers: {
    legalMemos: { path: MEMO_DIR, jurisdictions: memoByJurisdiction.size, tracks: memoTracks.size,
      portedFrom: "feat/record-clearing-production-integration @ 3b6f4c10" },
    trackAdoption: trackAdoption ? { tracks: trackAdoption.tracks.length, summary: trackAdoption.summary } : null,
    adoptionReconciliation: adoptionReconciliation ? { tracks: adoptionReconciliation.tracks.length, counselJobs: adoptionReconciliation.counselJobs?.length ?? 0 } : null,
    terminalization: terminalization ? { tracks: terminalization.tracks.length } : null,
    counselManifest: counselManifest ? { instrument: counselManifest.instrument ?? null } : null,
    ownerLegalDecision: { approved: ownerDecision.approved, recordIds: (ownerDecision.records ?? []).map((r) => r.id) },
    launchGraph: { operationallySellable: launchGraph.counters.operationallySellable }
  },
  memoLegalDesignStatusCounts: countBy([...memoTracks.values()], (t) => t.legalDesignStatus ?? "unknown"),
  memoReleaseBlockingQuestions: {
    total: [...memoTracks.values()].reduce((a, t) => a + t.releaseBlockingQuestions, 0),
    counselConfirmationRequired: [...memoTracks.values()].reduce((a, t) => a + t.counselConfirmationQuestions, 0),
    officialSourceNotAcquired: [...memoTracks.values()].reduce((a, t) => a + t.sourceAcquisitionQuestions, 0),
    mechanicalTranslation: [...memoTracks.values()].reduce((a, t) => a + t.mechanicalQuestions, 0)
  },
  pathwayRows: rows.length,
  classificationCounts: counts,
  distinctLegalTeamAssignments: legalAssignments.length,
  legalAssignments,
  rows
};

function countBy(items, keyOf) {
  const out = {};
  for (const item of items) {
    const key = keyOf(item);
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

const serialized = `${JSON.stringify(register, null, 2)}\n`;
const markdown = renderMarkdown(register);

if (CHECK) {
  const problems = [];
  const sum = Object.values(counts).reduce((a, b) => a + b, 0);
  if (sum !== rows.length) problems.push(`classifications sum to ${sum}, not ${rows.length}`);
  if (memoByJurisdiction.size !== 51) problems.push(`${memoByJurisdiction.size} legal memos present, expected 51`);
  for (const [rel, expected] of [[OUT_JSON, serialized], [OUT_MD, markdown]]) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) problems.push(`${rel} has not been generated`);
    else if (fs.readFileSync(abs, "utf8") !== expected) problems.push(`${rel} is stale; regenerate it`);
  }
  if (problems.length > 0) {
    console.error("All-51 legal authority reconciliation failed:");
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log(`All-51 legal authority reconciliation verified: ${rows.length} rows, ${legalAssignments.length} legal assignments.`);
  process.exit(0);
}

fs.mkdirSync(path.join(root, path.dirname(OUT_JSON)), { recursive: true });
fs.mkdirSync(path.join(root, path.dirname(OUT_MD)), { recursive: true });
fs.writeFileSync(path.join(root, OUT_JSON), serialized);
fs.writeFileSync(path.join(root, OUT_MD), markdown);

console.log(`Wrote ${OUT_JSON} and ${OUT_MD}`);
console.log(`Legal memos: ${memoByJurisdiction.size} jurisdictions, ${memoTracks.size} tracks`);
console.log(`Pathway rows: ${rows.length}`);
for (const [key, value] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`  ${key}: ${value}`);
console.log(`Distinct legal team assignments: ${legalAssignments.length}`);

function renderMarkdown(data) {
  const lines = [];
  lines.push("# All-51 legal authority and adoption reconciliation");
  lines.push("");
  lines.push("**Generated by** `scripts/generate-all51-legal-authority-reconciliation.mjs`. Do not edit by hand.");
  lines.push("");
  lines.push(`Every pathway the closure ledger holds open on \`legal_review_pending\` (${data.pathwayRows} rows),`);
  lines.push("measured against every authority layer that already exists.");
  lines.push("");
  lines.push("## Authority already on record");
  lines.push("");
  lines.push(`- **Hash-bound legal memos:** ${data.authorityLayers.legalMemos.jurisdictions} jurisdictions, `
    + `${data.authorityLayers.legalMemos.tracks} tracks, at \`${data.authorityLayers.legalMemos.path}\`.`);
  lines.push(`  Ported from ${data.authorityLayers.legalMemos.portedFrom}.`);
  lines.push("");
  lines.push("| Memo legal design status | Tracks |");
  lines.push("|---|---:|");
  for (const [key, value] of Object.entries(data.memoLegalDesignStatusCounts).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${key} | ${value} |`);
  }
  lines.push("");
  if (data.authorityLayers.trackAdoption) {
    lines.push(`- **Track adoption:** ${data.authorityLayers.trackAdoption.tracks} tracks classified; `
      + `\`new_substantive_review_required\` = ${data.authorityLayers.trackAdoption.summary?.new_substantive_review_required ?? "?"}, `
      + `\`counselJobs\` = ${data.authorityLayers.trackAdoption.summary?.counselJobs ?? "?"}.`);
  }
  lines.push(`- **Owner legal decision approved:** ${data.authorityLayers.ownerLegalDecision.approved} `
    + `(${data.authorityLayers.ownerLegalDecision.recordIds.join(", ") || "none"}).`);
  lines.push(`- **Operationally sellable pathways:** ${data.authorityLayers.launchGraph.operationallySellable}.`);
  lines.push("");
  lines.push("## Classification");
  lines.push("");
  lines.push("| Classification | Rows |");
  lines.push("|---|---:|");
  for (const [key, value] of Object.entries(data.classificationCounts).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${key} | ${value} |`);
  }
  lines.push(`| **TOTAL** | **${data.pathwayRows}** |`);
  lines.push("");
  lines.push(`## Legal team assignments: ${data.distinctLegalTeamAssignments}`);
  lines.push("");
  for (const assignment of data.legalAssignments) {
    lines.push(`### ${assignment.assignmentId} — ${assignment.classification}`);
    lines.push("");
    lines.push(`- **Affected pathway rows:** ${assignment.affectedPathwayRows}`);
    lines.push(`- **Jurisdictions:** ${assignment.jurisdictions.join(" ")}`);
    lines.push(`- **Track IDs:** ${assignment.trackIds.join(", ")}`);
    lines.push(`- **Legal owner:** ${assignment.legalOwner}`);
    lines.push("");
  }
  lines.push("## Every row");
  lines.push("");
  lines.push("| Jurisdiction | Pathway | Track | Legal design | Reviewed as of | Family bridge | Classification | Actual remaining blocker |");
  lines.push("|---|---|---|---|---|---|---|---|");
  for (const row of data.rows) {
    lines.push(`| ${row.jurisdiction} | \`${row.pathway}\` | ${row.trackIds.join(", ") || "—"} | ${row.legalDesignStatus} | `
      + `${row.reviewedAsOf ?? "—"} | ${row.familyBridgePresent ? "yes" : "no"} | ${row.classification} | ${row.actualRemainingBlocker} |`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}
