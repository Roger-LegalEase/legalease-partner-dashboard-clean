// The D captain handoff: five gates, and the track-level effect of them.
//
// Every disposition here is read out of an independent review branch. This
// script does not author one, and where a review has not spoken it says so
// rather than inferring. The three prior populations -- 104 approved, 61
// corrected, 88 held -- must each be accounted for family by family, and the
// three must sum to 253 with no family appearing twice and none missing.
//
// Track disposition is derived, never asserted: a track is at best "potentially
// promotable", and only when every family it requires is terminal and every
// non-technical gate on it is terminal too. Nothing here marks a track terminal
// and nothing regenerates the canonical ledger.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PRODUCTION = "data/rcap-all50/overlays/production";

const git = (args) => execFileSync("git", args, { cwd: rootDir, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }).trim();
const gitQuiet = (args) => { try { return git(args); } catch { return null; } };
const readJsonAt = (ref, file) => { const raw = gitQuiet(["show", `${ref}:${file}`]); if (!raw) return null; try { return JSON.parse(raw); } catch { return null; } };

const index = JSON.parse(fs.readFileSync(path.join(rootDir, "docs/record-clearing/d-wave/corrections-v2/correction-index.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, "docs/record-clearing/d-wave/corrected-review-manifest.json"), "utf8"));
const byFamilyId = new Map(manifest.families.map((f) => [f.familyId, f]));

// --- the independent reviews ------------------------------------------------
const reviews = { corrections: {}, approvalEvidence: null };
const correctionDisposition = new Map();
for (const shard of [0, 1, 2]) {
  const branch = `claude/rcap-review-d-corrections-v2-shard-${shard}`;
  const head = gitQuiet(["rev-parse", `origin/${branch}`]);
  const doc = head ? readJsonAt(`origin/${branch}`, `docs/record-clearing/d-wave/corrections-v2/review/shard-${shard}/review-findings.json`) : null;
  reviews.corrections[`shard-${shard}`] = { branch, head, families: doc?.families?.length ?? 0 };
  for (const f of doc?.families ?? []) {
    correctionDisposition.set(f.familyId, {
      disposition: f.disposition, shard,
      findings: (f.findings ?? []).map((x) => (typeof x === "string" ? x : (x.id ?? x.category ?? null))).filter(Boolean),
      blocker: (f.findings ?? []).map((x) => (typeof x === "string" ? x : x.acceptanceCondition)).filter(Boolean)[0] ?? null
    });
  }
}
{
  const branch = "claude/rcap-review-d-approval-evidence-v2";
  const head = gitQuiet(["rev-parse", `origin/${branch}`]);
  const doc = head ? readJsonAt(`origin/${branch}`, "docs/record-clearing/d-wave/corrections-v2/review/approval-evidence/review-findings.json") : null;
  reviews.approvalEvidence = { branch, head, families: doc?.families?.length ?? 0, totals: doc?.totals ?? null, doc };
}
const approvalResult = new Map();
for (const f of reviews.approvalEvidence.doc?.families ?? []) {
  approvalResult.set(f.familyId, {
    result: f.result ?? f.disposition,
    participantUnchanged: f.participantArtifactUnchanged ?? f.verified?.participantArtifactByteIdenticalToLaneHead ?? null,
    participantSha256: f.participantArtifactSha256 ?? null,
    participantPresent: f.participantArtifactPresent ?? null,
    findings: f.findings ?? []
  });
}

// Families corrected after Phase 4 had already inspected them. Their new bytes
// have not been independently seen, so they are open, not approved.
const CORRECTED_AFTER_REVIEW = new Set([
  "VT:200-00132-form-en", "VT:200-00132a-form-en", "VT:200-00631-form-en", "WI:cr-267-form-en",
  "NH:nhjb-2317-form-petition-en", "NH:nhjb-3056-form-petition-en", "NH:nhjb-3124-form-petition-en"
]);

function bytesChanged(familyId) {
  const m = byFamilyId.get(familyId);
  const lane = m && index.laneCorrectionBranches[m.lane];
  if (!lane) return { participant: null, sheet: null };
  const dir = `${PRODUCTION}/${m.jurisdictionSlug}/${familyId.split(":")[1]}`;
  const changed = (gitQuiet(["diff", "--name-only", lane.head, `origin/${lane.to}`, "--", dir]) ?? "").split("\n").filter(Boolean);
  return {
    participant: changed.some((p) => /\/fixtures\/.*-filled\.pdf$/.test(p)),
    sheet: changed.some((p) => /\/contact-sheet\/.*\.pdf$/.test(p))
  };
}

// --- Gate 1: the 61 prior corrections --------------------------------------
const gate1 = [];
for (const family of index.families) {
  const d = correctionDisposition.get(family.familyId);
  const moved = bytesChanged(family.familyId);
  const correctedAfter = CORRECTED_AFTER_REVIEW.has(family.familyId);
  let finalDisposition;
  if (!d) finalDisposition = "correction_required";
  else if (correctedAfter) finalDisposition = "correction_required";
  else finalDisposition = d.disposition;
  gate1.push({
    familyId: family.familyId, state: family.state, lane: family.lane,
    originalFinding: family.corrections.map((c) => c.reviewFindingId),
    correctionType: [...new Set(family.corrections.map((c) => c.defectClass))].sort(),
    participantPdfChanged: moved.participant, contactSheetChanged: moved.sheet,
    correctedBranch: family.correctionBranch,
    correctedCommit: gitQuiet(["rev-parse", `origin/${family.correctionBranch}`]),
    independentDisposition: d?.disposition ?? "not_reviewed",
    independentReviewShard: d?.shard ?? null,
    finalDisposition,
    remainingBlocker: finalDisposition === "correction_required"
      ? (correctedAfter
          ? "corrected after independent review had already inspected it; the new bytes have not been independently seen"
          : (d?.blocker ?? d?.findings?.join("; ") ?? "no independent disposition recorded"))
      : (finalDisposition === "held_on_source_or_design" ? (d?.findings?.join("; ") ?? null) : null)
  });
}
const g1counts = gate1.reduce((a, r) => { a[r.finalDisposition] = (a[r.finalDisposition] ?? 0) + 1; return a; }, {});

// --- Gate 2: the 104 prior approvals ---------------------------------------
const gate2 = [];
for (const familyId of index.preservedTechnicalApproved) {
  const r = approvalResult.get(familyId);
  gate2.push({
    familyId,
    result: r?.result ?? "not_reviewed",
    participantArtifactPresent: r?.participantPresent ?? null,
    participantArtifactUnchanged: r?.participantUnchanged ?? null,
    participantArtifactSha256: r?.participantSha256 ?? null,
    findings: r?.findings ?? []
  });
}
const g2counts = gate2.reduce((a, r) => { a[r.result] = (a[r.result] ?? 0) + 1; return a; }, {});

// --- Gate 3: the 88 prior holds --------------------------------------------
const gate3 = [];
for (const familyId of index.preservedHeldOnSourceOrDesign) {
  const moved = bytesChanged(familyId);
  const changed = Boolean(moved.participant || moved.sheet);
  gate3.push({
    familyId,
    finalDisposition: changed ? "hold_changed" : "held_on_source_or_design",
    bytesChanged: changed,
    // A hold may only move on genuinely new source or legal-design evidence.
    // No review returned any, so none moves.
    newSourceOrLegalDesignEvidence: null
  });
}

// --- Gate 4: all 253 --------------------------------------------------------
const finalCategoryOf = new Map();
for (const r of gate1) finalCategoryOf.set(r.familyId, r.finalDisposition);
for (const r of gate2) {
  finalCategoryOf.set(r.familyId, r.result === "prior_technical_approval_reaffirmed" ? "technical_approved" : r.result);
}
for (const r of gate3) finalCategoryOf.set(r.familyId, r.finalDisposition);

const allIds = [...index.preservedTechnicalApproved, ...index.families.map((f) => f.familyId), ...index.preservedHeldOnSourceOrDesign];
const dupes = allIds.filter((id, i) => allIds.indexOf(id) !== i);
const finalCounts = {};
for (const id of allIds) { const c = finalCategoryOf.get(id) ?? "unassigned"; finalCounts[c] = (finalCounts[c] ?? 0) + 1; }

// --- Gate 5: track-level effect ---------------------------------------------
//
// A track names its official forms, not its families, so the join is by
// document id. A family whose document a track names is required by it.
const TERMINAL_READINESS = /terminal|approved_for_live|live/i;
const tracks = [];
// Where a track record could not be derived at all. Lane D2A writes no
// jurisdiction summary, so its five states declare no tracks anywhere in the
// repository; several D2B and D3B states record an empty track array. This is
// stated rather than papered over: a track invented to reach an expected count
// would be worse than a missing one.
const jurisdictionsWithNoTrackRecord = [];
const jurisdictionSlugs = [...new Set(manifest.families.map((f) => f.jurisdictionSlug))];
for (const slug of jurisdictionSlugs) {
  const laneOf = manifest.families.find((f) => f.jurisdictionSlug === slug)?.lane;
  const branch = laneOf ? `origin/${index.laneCorrectionBranches[laneOf].to}` : null;
  const summary = branch ? readJsonAt(branch, `${PRODUCTION}/${slug}/jurisdiction-summary.json`) : null;
  if (!summary) jurisdictionsWithNoTrackRecord.push({ jurisdictionSlug: slug, lane: laneOf, reason: "no jurisdiction-summary.json on the lane's branch" });
  else if ((summary.tracks ?? []).length === 0) jurisdictionsWithNoTrackRecord.push({ jurisdictionSlug: slug, lane: laneOf, reason: "jurisdiction-summary.json records an empty track array" });
  for (const t of summary?.tracks ?? []) {
    const refs = (t.officialFormRefs ?? []).map((s) => String(s).toLowerCase());
    const required = manifest.families.filter((f) => f.jurisdictionSlug === slug
      && f.documentId && refs.some((r) => r.includes(String(f.documentId).toLowerCase())));
    const dispositions = required.map((f) => ({ familyId: f.familyId, disposition: finalCategoryOf.get(f.familyId) ?? "unassigned" }));
    const holds = required.flatMap((f) => f.productionHolds ?? []);
    const allFamiliesApproved = dispositions.length > 0 && dispositions.every((d) => d.disposition === "technical_approved");
    // Non-technical gates. Every one of these is recorded per family by the
    // lanes; none of them is this cycle's to clear, and a track cannot be
    // promotable while any is outstanding.
    const currentness = required.map((f) => f.currentness).find((c) => c && c !== "none_recorded_source_reports_current") ?? "none_recorded_source_reports_current";
    const legalDesign = required.map((f) => f.legalDesign).find((c) => c && c !== "unrecorded") ?? "unrecorded";
    const nonTechnicalTerminal = holds.length === 0 && legalDesign !== "unrecorded" && TERMINAL_READINESS.test(String(t.readiness ?? ""));
    const blocker = dispositions.length === 0 ? "no family in this corpus maps to this track's official forms"
      : (!allFamiliesApproved ? `families not terminal: ${dispositions.filter((d) => d.disposition !== "technical_approved").map((d) => `${d.familyId}=${d.disposition}`).join(", ")}`
        : (holds.length > 0 ? `production holds outstanding: ${[...new Set(holds)].join(", ")}`
          : (legalDesign === "unrecorded" ? "legal-design review not recorded" : "readiness is not terminal")));
    tracks.push({
      trackId: t.trackId, jurisdiction: summary.jurisdiction ?? slug, lane: laneOf,
      requiredFamilyIds: required.map((f) => f.familyId),
      familyDispositions: dispositions,
      currentnessStatus: currentness,
      legalDesignStatus: legalDesign,
      legalAdoptionStatus: t.readiness ?? null,
      participantTreatmentStatus: required.map((f) => f.implementationStatus).filter(Boolean)[0] ?? null,
      technicalReviewStatus: dispositions.length === 0 ? "no_family_mapped"
        : (allFamiliesApproved ? "all_required_families_technical_approved" : "not_all_families_technical_approved"),
      trackCandidateDisposition: allFamiliesApproved && nonTechnicalTerminal ? "potentially_promotable"
        : (dispositions.some((d) => d.disposition === "correction_required") ? "correction_required"
          : (dispositions.some((d) => d.disposition === "held_on_source_or_design") ? "held" : "held")),
      exactBlocker: allFamiliesApproved && nonTechnicalTerminal ? null : blocker,
      terminal: false
    });
  }
}
const trackCounts = tracks.reduce((a, t) => { a[t.trackCandidateDisposition] = (a[t.trackCandidateDisposition] ?? 0) + 1; return a; }, {});

const gates = [
  { gate: "Gate 1 — exactly 61 unique prior corrections", pass: gate1.length === 61 && new Set(gate1.map((r) => r.familyId)).size === 61, observed: gate1.length },
  { gate: "Gate 1 — dispositions sum to 61", pass: Object.values(g1counts).reduce((a, b) => a + b, 0) === 61, observed: g1counts },
  { gate: "Gate 2 — exactly 104 unique prior approvals", pass: gate2.length === 104 && new Set(gate2.map((r) => r.familyId)).size === 104, observed: gate2.length },
  { gate: "Gate 2 — every prior approval independently adjudicated", pass: gate2.every((r) => r.result !== "not_reviewed"), observed: gate2.filter((r) => r.result === "not_reviewed").length },
  // Counted over the families that actually have a filed artifact. The
  // reviewer records `unchanged: true` for the 19 without one as well, which is
  // vacuously true and would inflate this to 104.
  { gate: "Gate 2 — 85/85 participant hashes byte-identical",
    pass: gate2.filter((r) => r.participantArtifactPresent === true && r.participantArtifactUnchanged === true).length === 85
      && gate2.filter((r) => r.participantArtifactPresent === true).length === 85,
    observed: {
      withArtifact: gate2.filter((r) => r.participantArtifactPresent === true).length,
      unchanged: gate2.filter((r) => r.participantArtifactPresent === true && r.participantArtifactUnchanged === true).length
    } },
  { gate: "Gate 2 — 19 families correctly identified as having no filed artifact", pass: gate2.filter((r) => r.participantArtifactPresent === false).length === 19, observed: gate2.filter((r) => r.participantArtifactPresent === false).length },
  { gate: "Gate 3 — exactly 88 unique prior holds, each appearing once", pass: gate3.length === 88 && new Set(gate3.map((r) => r.familyId)).size === 88, observed: gate3.length },
  { gate: "Gate 3 — no hold changed", pass: gate3.every((r) => r.finalDisposition === "held_on_source_or_design"), observed: gate3.filter((r) => r.finalDisposition !== "held_on_source_or_design").map((r) => r.familyId) },
  { gate: "Gate 4 — 104 + 61 + 88 = 253", pass: allIds.length === 253, observed: allIds.length },
  { gate: "Gate 4 — no duplicate family", pass: dupes.length === 0, observed: dupes },
  { gate: "Gate 4 — every family carries exactly one final category", pass: allIds.every((id) => finalCategoryOf.has(id)), observed: allIds.filter((id) => !finalCategoryOf.has(id)).length },
  { gate: "Gate 5 — no track marked terminal", pass: tracks.every((t) => t.terminal === false), observed: tracks.filter((t) => t.terminal).length },
  { gate: "Gate 5 — all 67 D tracks derivable from repository evidence", pass: null, advisory: true,
    observed: { expected: 67, derived: tracks.length, unaccounted: 67 - tracks.length, jurisdictionsWithNoTrackRecord } }
];

const out = {
  schema: "rcap-d-captain-handoff/v1",
  posture: "Additive. No canonical ledger regenerated, no track marked terminal, nothing merged into canonical integration. Every disposition is read from an independent review branch; none is authored here.",
  d0v2: { branch: "claude/rcap-d0-form-factory-remediation-v2", commit: "b412f543" },
  correctionBranches: Object.fromEntries(Object.entries(index.laneCorrectionBranches)
    .map(([lane, r]) => [lane, { branch: r.to, commit: gitQuiet(["rev-parse", `origin/${r.to}`]), fromLaneHead: r.head }])),
  approvalEvidenceBranches: Object.fromEntries(["d1a", "d1b", "d1c", "d2a", "d2b", "d3a", "d3b"]
    .map((l) => [l.toUpperCase(), { branch: `claude/rcap-${l}-approval-evidence-v2`, commit: gitQuiet(["rev-parse", `origin/claude/rcap-${l}-approval-evidence-v2`]) }])),
  independentReviews: {
    corrections: reviews.corrections,
    approvalEvidence: { branch: reviews.approvalEvidence.branch, head: reviews.approvalEvidence.head,
      families: reviews.approvalEvidence.families, totals: reviews.approvalEvidence.totals }
  },
  gate1: { counts: g1counts, families: gate1 },
  gate2: { counts: g2counts, families: gate2 },
  gate3: { counts: gate3.reduce((a, r) => { a[r.finalDisposition] = (a[r.finalDisposition] ?? 0) + 1; return a; }, {}), families: gate3 },
  gate4: { totalFamilies: allIds.length, finalCounts, duplicates: dupes },
  gate5: {
    tracksExpected: 67,
    tracksDerivedFromRepositoryEvidence: tracks.length,
    derivationBasis: "the `tracks` array each lane wrote into data/rcap-all50/overlays/production/<state>/jurisdiction-summary.json, joined to families by official form document id",
    jurisdictionsWithNoTrackRecord,
    unaccountedAgainstExpected: 67 - tracks.length,
    counts: trackCounts, tracks
  },
  gates
};

const outDir = path.join(rootDir, "docs/record-clearing/d-wave/corrections-v2");
fs.writeFileSync(path.join(outDir, "captain-handoff.json"), `${JSON.stringify(out, null, 2)}\n`);

console.log(JSON.stringify({ gate1: g1counts, gate2: g2counts, gate4: finalCounts, gate5: { tracks: tracks.length, ...trackCounts } }, null, 2));
for (const g of gates) {
  console.log(`${g.advisory ? "NOTE" : (g.pass ? "PASS" : "FAIL")}  ${g.gate}`);
  if (!g.pass) console.log(`      ${JSON.stringify(g.observed).slice(0, 400)}`);
}
const req = gates.filter((g) => !g.advisory);
console.log(req.every((g) => g.pass) ? "\nALL GATES PASSED" : "\nGATES FAILED");
process.exitCode = req.every((g) => g.pass) ? 0 : 1;
