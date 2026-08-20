#!/usr/bin/env node
// Focused verification for the Gate B wave C independent review, shard b.
// Reviewer-owned. Checks only this shard's own review records; it asserts
// nothing about implementation paths and repairs nothing.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const ROOT = "data/rcap-all50/pdf-independent-reviews/wave-c-shard-b";
const VOCAB = new Set([
  "approved_platform_ready",
  "correction_required",
  "substantive_owner_decision_required",
]);
const REVIEWER_ROOTS = [
  "data/rcap-all50/pdf-independent-reviews/wave-c-shard-b/",
  "docs/record-clearing/pdf-independent-reviews/wave-c-shard-b/",
];

let failures = 0;
const fail = (ok, msg) => {
  if (!ok) { failures += 1; console.error(`FAIL  ${msg}`); }
  else console.log(`ok    ${msg}`);
};

const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

const assignment = read(path.join(ROOT, "assignment.json"));
const verdicts = read(path.join(ROOT, "verdicts.json"));

// 1. the denominator and the slice
fail(assignment.denominatorDerivation.reviewableFamilies === 16,
  "denominator: exactly 16 reviewable families");
fail(assignment.frozenDenominator.length === 16,
  "denominator: the frozen list carries 16 ids");
const sorted = [...assignment.frozenDenominator].sort();
fail(JSON.stringify(sorted) === JSON.stringify(assignment.frozenDenominator),
  "denominator: canonical ids are sorted lexicographically");
fail(!assignment.frozenDenominator.includes("NE:dc-1-15-form-en"),
  "denominator: NE DC-1-15 is excluded");
const slice = assignment.frozenDenominator.slice(4, 8);
fail(JSON.stringify(slice) === JSON.stringify(assignment.assignedFamilies),
  "slice: assigned families are exactly frozenDenominator[4:8]");
fail(assignment.assignedFamilies.length === 4, "slice: exactly four families");
fail(!assignment.assignedFamilies.includes("NE:dc-1-15-form-en"),
  "slice: the batch does not include NE DC-1-15");
for (const [label, other] of [["a", [0, 4]], ["c", [8, 12]], ["d", [12, 16]]]) {
  const overlap = assignment.assignedFamilies.filter((f) =>
    assignment.frozenDenominator.slice(other[0], other[1]).includes(f));
  fail(overlap.length === 0, `slice: no overlap with shard ${label}`);
}

// 2. every assigned family accounted for exactly once
const seen = new Map();
for (const v of verdicts.verdicts) seen.set(v.familyId, (seen.get(v.familyId) ?? 0) + 1);
fail(seen.size === 4, "verdicts: four distinct families");
for (const f of assignment.assignedFamilies)
  fail(seen.get(f) === 1, `verdicts: ${f} appears exactly once`);

// 3. verdict vocabulary
for (const v of verdicts.verdicts)
  fail(VOCAB.has(v.verdict), `vocabulary: ${v.familyId} carries a valid verdict (${v.verdict})`);

// 4. every referenced hash matches disk
for (const f of assignment.assignedFamilies) {
  const rec = read(path.join(ROOT, `${f.replace(":", "-")}.review.json`));
  fail(rec.familyId === f, `record: ${f} names itself`);
  fail(VOCAB.has(rec.verdict), `record: ${f} verdict is in vocabulary`);
  fail(rec.reviewBaseCommit === verdicts.reviewBaseCommit,
    `record: ${f} pins the shard review base`);

  for (const [label, entry] of Object.entries(rec.hashEvidence.recomputedFromDisk)) {
    fail(fs.existsSync(entry.path), `hash: ${f} ${label} path exists`);
    fail(sha(entry.path) === entry.sha256, `hash: ${f} ${label} matches disk`);
  }
  for (const pg of rec.hashEvidence.allPageRasterManifest.pages) {
    fail(fs.existsSync(pg.path), `raster: ${f} page ${pg.page} exists`);
    fail(sha(pg.path) === pg.sha256, `raster: ${f} page ${pg.page} matches disk`);
    fail(pg.matchesRecordedRasterManifest === true,
      `raster: ${f} page ${pg.page} matches the recorded all-page manifest`);
  }
  const rm = rec.hashEvidence.allPageRasterManifest;
  fail(rm.everyRelevantPageRasterized === true, `raster: ${f} covers every relevant page`);
  fail(rm.boundHashMatchesContactSheetOnDisk === true,
    `raster: ${f} manifest is bound to the current contact sheet`);
  fail(rm.pages.length === rm.pagesCarryingFields.length,
    `raster: ${f} one raster per page carrying fields`);

  // complete visual evidence digest is reproducible from the parts
  const h = crypto.createHash("sha256");
  for (const pg of rm.pages) h.update(Buffer.from(pg.sha256, "hex"));
  h.update(Buffer.from(rec.hashEvidence.recomputedFromDisk.contactSheetSha256.sha256, "hex"));
  fail(h.digest("hex") === rec.hashEvidence.completeVisualEvidenceSha256.value,
    `visual-evidence: ${f} composite digest is reproducible`);

  // sidecar
  const sc = rec.hashEvidence.provenanceSidecar;
  fail(sc.sidecarPinsMatchDisk === true, `sidecar: ${f} pins match disk`);
  fail(sc.satisfiesCanonicalContract === true, `sidecar: ${f} satisfies the canonical contract`);

  // a correction must name what it needs to name
  if (rec.verdict !== "approved_platform_ready")
    fail(Array.isArray(rec.findings) && rec.findings.length > 0,
      `findings: ${f} records at least one named finding`);
  for (const fnd of rec.findings) {
    fail(typeof fnd.observedResult === "string" && fnd.observedResult.length > 0,
      `findings: ${f}/${fnd.id} states an observed result`);
    fail(typeof fnd.requiredResult === "string" && fnd.requiredResult.length > 0,
      `findings: ${f}/${fnd.id} states a required result`);
    fail(typeof fnd.smallestCorrection === "string" && fnd.smallestCorrection.length > 0,
      `findings: ${f}/${fnd.id} states the smallest correction`);
  }

  // approval requires a source recomputation this reviewer could perform
  if (rec.verdict === "approved_platform_ready")
    fail(rec.sourceVerification.performed === true,
      `approval: ${f} may not be approved without source verification`);
}

// 5. reviewer branch is distinct from the reviewed branch
fail(verdicts.reviewerBranch !== verdicts.reviewedBranch,
  "branch: reviewer branch is distinct from the reviewed branch");
const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf8" }).trim();
fail(branch === verdicts.reviewerBranch, `branch: HEAD is on ${verdicts.reviewerBranch}`);

// 6. no non-review path changed
const base = assignment.declaredReviewBase;
const changed = execFileSync("git", ["diff", "--name-only", base, "HEAD"], { encoding: "utf8" })
  .split("\n").map((s) => s.trim()).filter(Boolean);
for (const p of changed)
  fail(REVIEWER_ROOTS.some((r) => p.startsWith(r)), `scope: ${p} is reviewer-owned`);
fail(changed.length > 0, "scope: this review changed something");

// 7. whitespace
try {
  execFileSync("git", ["diff", "--check", base, "HEAD"], { encoding: "utf8" });
  fail(true, "git diff --check is clean");
} catch { fail(false, "git diff --check is clean"); }

console.log(failures === 0
  ? `\nPASS  wave C shard b: ${assignment.assignedFamilies.length} families, all referenced hashes match disk`
  : `\nFAIL  ${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
