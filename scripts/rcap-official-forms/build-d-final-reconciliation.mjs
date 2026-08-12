// The final additive reconciliation across all 253 families.
//
// Nothing here is asserted from memory. Dispositions come out of the three
// Phase 4 review branches, the approval-evidence review branch if it has
// landed, and the byte-level audit of what each branch actually changed. The
// categories must sum to 253, and every prior approval and prior hold must be
// accounted for individually rather than in aggregate.
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
const byId = new Map(manifest.families.map((f) => [f.familyId, f]));

// --- Phase 4: the 61 corrected families ------------------------------------
const phase4 = new Map();
const reviewBranches = {};
for (const shard of [0, 1, 2]) {
  const branch = `claude/rcap-review-d-corrections-v2-shard-${shard}`;
  const head = gitQuiet(["rev-parse", `origin/${branch}`]);
  reviewBranches[`corrections-shard-${shard}`] = { branch, head };
  const doc = readJsonAt(`origin/${branch}`, `docs/record-clearing/d-wave/corrections-v2/review/shard-${shard}/review-findings.json`);
  if (!doc) continue;
  for (const f of doc.families ?? []) {
    phase4.set(f.familyId, { disposition: f.disposition, shard, findings: (f.findings ?? []).map((x) => x.id ?? x.category ?? null) });
  }
}

// --- The approval-evidence review of the 104, if it has landed -------------
const evidenceBranch = "claude/rcap-review-d-approval-evidence-v2";
const evidenceHead = gitQuiet(["rev-parse", `origin/${evidenceBranch}`]);
reviewBranches["approval-evidence"] = { branch: evidenceBranch, head: evidenceHead };
const evidenceDoc = evidenceHead
  ? readJsonAt(`origin/${evidenceBranch}`, "docs/record-clearing/d-wave/corrections-v2/review/approval-evidence/review-findings.json")
  : null;
const evidenceResult = new Map();
for (const f of evidenceDoc?.families ?? []) evidenceResult.set(f.familyId, f.result ?? f.disposition);

// What this session's own evidence pass flagged, used only when the
// independent review has not landed. It is labelled as unconfirmed wherever it
// is used, because the session that wrote the evidence may not grade it.
const ownEvidence = JSON.parse(fs.readFileSync(path.join(rootDir, "docs/record-clearing/d-wave/corrections-v2/approval-evidence-summary.json"), "utf8"));
const ownFlagged = new Set(ownEvidence.familiesWhoseFiledArtifactFailedACheck.map((f) => f.familyId));

// Families corrected after Phase 4 reviewed them. Their new bytes have not been
// independently seen, so they are counted as still open rather than approved.
const CORRECTED_AFTER_REVIEW = {
  "VT:200-00132-form-en": "contact sheet rebuilt after re-review found it was never rebuilt",
  "VT:200-00132a-form-en": "contact sheet rebuilt after re-review found it was never rebuilt",
  "VT:200-00631-form-en": "contact sheet rebuilt after re-review found it was never rebuilt",
  "WI:cr-267-form-en": "contact sheet rebuilt after re-review found it was never rebuilt",
  "NH:nhjb-2317-form-petition-en": "overflow ledger now records the below-floor width constraint alongside the /MaxLen gate",
  "NH:nhjb-3056-form-petition-en": "overflow ledger now records the below-floor width constraint alongside the /MaxLen gate",
  "NH:nhjb-3124-form-petition-en": "overflow ledger now records the below-floor width constraint alongside the /MaxLen gate"
};

// --- Did any prior hold's bytes move? --------------------------------------
function familyBytesChanged(familyId) {
  const m = byId.get(familyId);
  if (!m) return null;
  const lane = index.laneCorrectionBranches[m.lane];
  if (!lane) return null;
  const dir = `${PRODUCTION}/${m.jurisdictionSlug}/${familyId.split(":")[1]}`;
  const changed = (gitQuiet(["diff", "--name-only", lane.head, `origin/${lane.to}`, "--", dir]) ?? "").split("\n").filter(Boolean);
  return { changed: changed.length > 0, files: changed.length };
}

const rows = [];
for (const familyId of index.preservedTechnicalApproved) {
  const independent = evidenceResult.get(familyId) ?? null;
  const flagged = ownFlagged.has(familyId);
  rows.push({
    familyId, priorDisposition: "technical_approved",
    finalCategory: independent
      ? (independent === "prior_technical_approval_reaffirmed" ? "prior_approval_reaffirmed" : independent)
      : (flagged ? "newly_correction_required_pending_independent_confirmation" : "prior_approval_pending_evidence_review"),
    independentEvidenceResult: independent,
    flaggedByEvidenceRegeneration: flagged,
    participantArtifactChanged: false
  });
}
for (const family of index.families) {
  const p4 = phase4.get(family.familyId);
  const correctedAfter = CORRECTED_AFTER_REVIEW[family.familyId] ?? null;
  let finalCategory;
  if (!p4) finalCategory = "correction_pending_independent_review";
  else if (correctedAfter) finalCategory = "corrected_after_re_review_pending_confirmation";
  else if (p4.disposition === "technical_approved") finalCategory = "newly_technical_approved";
  else if (p4.disposition === "held_on_source_or_design") finalCategory = "moved_to_held_on_source_or_design";
  else finalCategory = "still_correction_required";
  rows.push({
    familyId: family.familyId, priorDisposition: "correction_required",
    finalCategory,
    phase4Disposition: p4?.disposition ?? null,
    phase4Shard: p4?.shard ?? null,
    phase4Findings: p4?.findings ?? [],
    correctedAfterReReview: correctedAfter,
    participantArtifactChanged: family.rerenderRequired
  });
}
for (const familyId of index.preservedHeldOnSourceOrDesign) {
  const moved = familyBytesChanged(familyId);
  rows.push({
    familyId, priorDisposition: "held_on_source_or_design",
    finalCategory: moved?.changed ? "hold_changed" : "prior_hold_preserved",
    bytesChanged: moved?.changed ?? null
  });
}

const count = (p) => rows.filter(p).length;
const totals = {
  totalFamilies: rows.length,
  priorTechnicalApprovals: {
    total: index.preservedTechnicalApproved.length,
    reaffirmed: count((r) => r.finalCategory === "prior_approval_reaffirmed"),
    pendingIndependentEvidenceReview: count((r) => r.finalCategory === "prior_approval_pending_evidence_review"),
    newlyCorrectionRequired: count((r) => r.finalCategory === "newly_correction_required_pending_independent_confirmation" || (r.priorDisposition === "technical_approved" && r.finalCategory === "correction_required")),
    newlyHeld: count((r) => r.priorDisposition === "technical_approved" && r.finalCategory === "held_on_source_or_design")
  },
  priorCorrectionRequired: {
    total: index.families.length,
    newlyTechnicalApproved: count((r) => r.finalCategory === "newly_technical_approved"),
    stillCorrectionRequired: count((r) => r.finalCategory === "still_correction_required"),
    correctedAfterReReviewPendingConfirmation: count((r) => r.finalCategory === "corrected_after_re_review_pending_confirmation"),
    movedToHeld: count((r) => r.finalCategory === "moved_to_held_on_source_or_design"),
    pendingReview: count((r) => r.finalCategory === "correction_pending_independent_review")
  },
  priorHolds: {
    total: index.preservedHeldOnSourceOrDesign.length,
    preserved: count((r) => r.finalCategory === "prior_hold_preserved"),
    changed: count((r) => r.finalCategory === "hold_changed")
  }
};

const sums = {
  approvedBucket: Object.values(totals.priorTechnicalApprovals).slice(1).reduce((a, b) => a + b, 0),
  correctionBucket: Object.values(totals.priorCorrectionRequired).slice(1).reduce((a, b) => a + b, 0),
  holdBucket: Object.values(totals.priorHolds).slice(1).reduce((a, b) => a + b, 0)
};
const gates = [
  { gate: "the three prior populations still total 253", pass: 104 + 61 + 88 === 253 && rows.length === 253, observed: rows.length },
  { gate: "the 104 prior approvals are each individually categorised", pass: sums.approvedBucket === 104, observed: sums.approvedBucket },
  { gate: "the 61 prior corrections are each individually categorised", pass: sums.correctionBucket === 61, observed: sums.correctionBucket },
  { gate: "the 88 prior holds are each individually categorised", pass: sums.holdBucket === 88, observed: sums.holdBucket },
  { gate: "no prior hold's bytes changed", pass: totals.priorHolds.changed === 0, observed: rows.filter((r) => r.finalCategory === "hold_changed").map((r) => r.familyId) },
  { gate: "every family carries a final category", pass: rows.every((r) => Boolean(r.finalCategory)), observed: rows.filter((r) => !r.finalCategory).length }
];

const out = {
  schema: "rcap-d-final-reconciliation/v1",
  d0v2: "b412f543",
  reviewBranches,
  approvalEvidenceReviewLanded: Boolean(evidenceDoc),
  totals, sums, gates, families: rows.sort((a, b) => a.familyId.localeCompare(b.familyId))
};
fs.writeFileSync(path.join(rootDir, "docs/record-clearing/d-wave/corrections-v2/final-reconciliation.json"), `${JSON.stringify(out, null, 2)}\n`);

console.log(JSON.stringify({ totals, sums, approvalEvidenceReviewLanded: Boolean(evidenceDoc) }, null, 2));
for (const g of gates) {
  console.log(`${g.pass ? "PASS" : "FAIL"}  ${g.gate}`);
  if (!g.pass) console.log(`      ${JSON.stringify(g.observed).slice(0, 400)}`);
}
console.log(gates.every((g) => g.pass) ? "\nRECONCILED TO 253" : "\nRECONCILIATION FAILED");
process.exitCode = gates.every((g) => g.pass) ? 0 : 1;
