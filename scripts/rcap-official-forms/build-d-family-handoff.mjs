// The final D family handoff: all 253 families in one category each, after
// three independent review passes.
//
// Dispositions are layered in the order they were issued, and a later review
// supersedes an earlier one only for the families it actually inspected. The
// v3 review saw 20; the other 233 keep the category the corrections-v2 and
// approval-evidence reviews gave them. Nothing here is authored by the session
// that did the work.
//
// Track promotion is deliberately absent. The Codex track-mapping lane owns
// that, and this file gives it family-level truth to build on.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const git = (args) => execFileSync("git", args, { cwd: rootDir, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }).trim();
const gitQuiet = (args) => { try { return git(args); } catch { return null; } };
const readJsonAt = (ref, file) => { const raw = gitQuiet(["show", `${ref}:${file}`]); if (!raw) return null; try { return JSON.parse(raw); } catch { return null; } };

const priorReconciliation = JSON.parse(fs.readFileSync(
  path.join(rootDir, "docs/record-clearing/d-wave/corrections-v2/final-reconciliation.json"), "utf8"));
const affected = JSON.parse(fs.readFileSync(
  path.join(rootDir, "docs/record-clearing/d-wave/v3/affected-family-index.json"), "utf8"));

const V3_REVIEW = "claude/rcap-review-d-v3-shard-0";
const v3Head = gitQuiet(["rev-parse", `origin/${V3_REVIEW}`]);
const v3 = readJsonAt(`origin/${V3_REVIEW}`, "docs/record-clearing/d-wave/v3/review/review-findings.json");
if (!v3) throw new Error("v3 review findings not readable");

const v3Disposition = new Map();
for (const f of v3.families ?? []) {
  v3Disposition.set(f.familyId, {
    disposition: f.disposition,
    findings: (f.findings ?? []).map((x) => ({
      id: x.id, severity: x.severity, file: x.file ?? null,
      fieldOrRegion: x.fieldOrRegion ?? null,
      visibleDefect: x.visibleDefect ?? null,
      acceptanceCondition: x.acceptanceCondition ?? null,
      likelyOwner: x.likelyOwner ?? null
    }))
  });
}

// How a pre-v3 category reads as a plain disposition.
const CATEGORY_TO_DISPOSITION = {
  prior_approval_reaffirmed: "technical_approved",
  newly_technical_approved: "technical_approved",
  technical_approved: "technical_approved",
  prior_hold_preserved: "held_on_source_or_design",
  moved_to_held_on_source_or_design: "held_on_source_or_design",
  held_on_source_or_design: "held_on_source_or_design",
  correction_required: "correction_required",
  still_correction_required: "correction_required",
  corrected_after_re_review_pending_confirmation: "correction_required"
};

const affectedById = new Map(affected.families.map((f) => [f.familyId, f]));

const rows = [];
for (const prior of priorReconciliation.families) {
  const priorDisposition = CATEGORY_TO_DISPOSITION[prior.finalCategory] ?? "correction_required";
  const v3Result = v3Disposition.get(prior.familyId) ?? null;
  const a = affectedById.get(prior.familyId) ?? null;

  rows.push({
    familyId: prior.familyId,
    priorPopulation: prior.priorDisposition,
    dispositionBeforeV3: priorDisposition,
    reviewedInV3: Boolean(v3Result),
    v3Disposition: v3Result?.disposition ?? null,
    // A later review supersedes an earlier one only where it looked.
    finalDisposition: v3Result ? v3Result.disposition : priorDisposition,
    changedByV3: Boolean(v3Result) && v3Result.disposition !== priorDisposition,
    v3Action: a?.action ?? null,
    participantArtifactRerenderedInV3: a?.requiresParticipantRerender === true,
    openFindings: v3Result?.disposition === "correction_required" ? v3Result.findings : []
  });
}

rows.sort((a, b) => a.familyId.localeCompare(b.familyId));

const count = (p) => rows.filter(p).length;
const finalCounts = rows.reduce((acc, r) => { acc[r.finalDisposition] = (acc[r.finalDisposition] ?? 0) + 1; return acc; }, {});

const totals = {
  totalFamilies: rows.length,
  final: {
    technical_approved: finalCounts.technical_approved ?? 0,
    correction_required: finalCounts.correction_required ?? 0,
    held_on_source_or_design: finalCounts.held_on_source_or_design ?? 0
  },
  byPriorPopulation: {
    priorApprovals: {
      total: count((r) => r.priorPopulation === "technical_approved"),
      stillApproved: count((r) => r.priorPopulation === "technical_approved" && r.finalDisposition === "technical_approved"),
      nowCorrectionRequired: count((r) => r.priorPopulation === "technical_approved" && r.finalDisposition === "correction_required"),
      nowHeld: count((r) => r.priorPopulation === "technical_approved" && r.finalDisposition === "held_on_source_or_design")
    },
    priorCorrections: {
      total: count((r) => r.priorPopulation === "correction_required"),
      nowApproved: count((r) => r.priorPopulation === "correction_required" && r.finalDisposition === "technical_approved"),
      stillCorrectionRequired: count((r) => r.priorPopulation === "correction_required" && r.finalDisposition === "correction_required"),
      nowHeld: count((r) => r.priorPopulation === "correction_required" && r.finalDisposition === "held_on_source_or_design")
    },
    priorHolds: {
      total: count((r) => r.priorPopulation === "held_on_source_or_design"),
      preserved: count((r) => r.priorPopulation === "held_on_source_or_design" && r.finalDisposition === "held_on_source_or_design"),
      changed: count((r) => r.priorPopulation === "held_on_source_or_design" && r.finalDisposition !== "held_on_source_or_design")
    }
  },
  v3: {
    familiesReviewed: v3Disposition.size,
    approved: count((r) => r.v3Disposition === "technical_approved"),
    correctionRequired: count((r) => r.v3Disposition === "correction_required"),
    changedByV3: count((r) => r.changedByV3),
    participantArtifactsRerendered: count((r) => r.participantArtifactRerenderedInV3),
    manifestRepairOnly: affected.totals.manifestRepairOnly
  }
};

const gates = [
  { gate: "every family appears exactly once", pass: new Set(rows.map((r) => r.familyId)).size === rows.length && rows.length === 253, observed: rows.length },
  { gate: "the three final categories sum to 253", pass: Object.values(totals.final).reduce((a, b) => a + b, 0) === 253, observed: totals.final },
  { gate: "every family carries a final disposition", pass: rows.every((r) => Boolean(r.finalDisposition)), observed: rows.filter((r) => !r.finalDisposition).length },
  { gate: "no family outside the v3 review's 20 had its disposition changed by it", pass: rows.every((r) => !r.changedByV3 || r.reviewedInV3), observed: rows.filter((r) => r.changedByV3 && !r.reviewedInV3).map((r) => r.familyId) },
  { gate: "every open family carries at least one acceptance condition", pass: rows.filter((r) => r.finalDisposition === "correction_required").every((r) => (r.openFindings ?? []).some((f) => f.acceptanceCondition)), observed: rows.filter((r) => r.finalDisposition === "correction_required" && !(r.openFindings ?? []).some((f) => f.acceptanceCondition)).map((r) => r.familyId) },
  { gate: "prior holds are unchanged", pass: totals.byPriorPopulation.priorHolds.changed === 0, observed: totals.byPriorPopulation.priorHolds.changed }
];

const out = {
  schema: "rcap-d-family-handoff/final",
  posture: "Family-level only. No track disposition is derived here; the Codex track-mapping lane owns that. Nothing merged into canonical integration, no ledger regenerated, no track marked terminal.",
  factoryVersions: {
    d0v2: { branch: "claude/rcap-d0-form-factory-remediation-v2", commit: "b412f543" },
    d0v3: { branch: "claude/rcap-d0-form-factory-remediation-v3", commit: gitQuiet(["rev-parse", "origin/claude/rcap-d0-form-factory-remediation-v3"]) }
  },
  currentFamilyBranches: Object.fromEntries(["D1A", "D1B", "D1C", "D2A", "D2B", "D3A", "D3B"].map((l) => {
    const b = `claude/rcap-${l.toLowerCase()}-corrections-v3`;
    return [l, { branch: b, commit: gitQuiet(["rev-parse", `origin/${b}`]) }];
  })),
  independentReviews: {
    correctionsV2: priorReconciliation.reviewBranches,
    v3: { branch: V3_REVIEW, commit: v3Head, familiesReviewed: v3Disposition.size, dispositionCounts: v3.dispositionCounts ?? null }
  },
  totals, gates,
  openFamilies: rows.filter((r) => r.finalDisposition === "correction_required"),
  families: rows
};

const outDir = path.join(rootDir, "docs/record-clearing/d-wave/v3");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "family-handoff.json"), `${JSON.stringify(out, null, 2)}\n`);

console.log(JSON.stringify(totals, null, 2));
for (const g of gates) {
  console.log(`${g.pass ? "PASS" : "FAIL"}  ${g.gate}`);
  if (!g.pass) console.log(`      ${JSON.stringify(g.observed).slice(0, 300)}`);
}
console.log(gates.every((g) => g.pass) ? "\nRECONCILED TO 253" : "\nFAILED");
process.exitCode = gates.every((g) => g.pass) ? 0 : 1;
