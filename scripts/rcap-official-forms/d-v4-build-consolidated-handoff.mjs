// The single D handoff Terminal A reads, built from the four review branches.
//
// Four reviewers returned four artifacts against four branches. Reconstructing
// one answer from those raw branches is work Terminal A should not have to do,
// and doing it by hand is how a disposition gets transcribed wrong. Everything
// here is read out of git at named commits.
//
// The reviewers cloned one commit before the generated-manifest refresh, so this
// also has to prove what their judgement rests on: that the participant PDF,
// contact sheet and manifest bytes they read are byte-identical to the bytes on
// the final branch tip. Where they are not, the review is stale for that family
// and the handoff says so rather than carrying the disposition forward.
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(REPO, "docs/record-clearing/d-wave/v4");

const git = (a) => execFileSync("git", a, { cwd: REPO, encoding: "utf8", maxBuffer: 512 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
const gitQ = (a) => { try { return git(a).trim(); } catch { return null; } };
const gitBytes = (a) => { try { return execFileSync("git", a, { cwd: REPO, maxBuffer: 512 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] }); } catch { return null; } };
const showJson = (ref, p) => { const r = gitQ(["show", `${ref}:${p}`]); if (!r) return null; try { return JSON.parse(r); } catch { return null; } };
const sha256 = (b) => (b === null ? null : crypto.createHash("sha256").update(b).digest("hex"));

const inputs = JSON.parse(fs.readFileSync(path.join(OUT, "implementation-inputs.json"), "utf8"));
const v3Handoff = JSON.parse(fs.readFileSync(path.join(REPO, "docs/record-clearing/d-wave/v3/family-handoff.json"), "utf8"));

// The four batches, each an implementation branch and the review branch that
// judged it.
const BATCHES = [
  { fix: "D-FIX-1", implementationBranch: "claude/rcap-d-fix-1-mo-cr145", reviewBranch: "claude/rcap-review-d-fix-1-mo",
    reviewFile: "docs/record-clearing/d-wave/v4/review/d-fix-1-review.json",
    families: ["MO:cr145-form-petition-en"] },
  { fix: "D-FIX-2", implementationBranch: "claude/rcap-d-fix-2-nh-nhjb-2956", reviewBranch: "claude/rcap-review-d-fix-2-nh",
    reviewFile: "docs/record-clearing/d-wave/v4/review/d-fix-2-review.json",
    families: ["NH:nhjb-2956-support-record-request-en"] },
  { fix: "D-FIX-3", implementationBranch: "claude/rcap-d-fix-3-wa-decoder", reviewBranch: "claude/rcap-review-d-fix-3-wa",
    reviewFile: "docs/record-clearing/d-wave/v4/review/d-fix-3-review.json",
    families: ["WA:blake-006-form-en", "WA:blake-008-form-en", "WA:crrlj-09-0100-form-en", "WA:crrlj-09-0870-form-en"] },
  { fix: "D-FIX-4", implementationBranch: "claude/rcap-d-fix-4-va-vt-clipping", reviewBranch: "claude/rcap-review-d-fix-4-va-vt",
    reviewFile: "docs/record-clearing/d-wave/v4/review/d-fix-4-review.json",
    families: ["VA:cc-1203-form-en", "VT:200-00631-form-en"] }
];

const ALLOWED = new Set(["technical_approved", "correction_required", "held_on_source_or_design"]);

/**
 * Pulls one family's disposition and findings out of a review artifact.
 *
 * The four reviewers used three shapes between them -- a single-family document,
 * a families array, and a dispositions map -- so this reads all three rather
 * than making one of them canonical after the fact. A shape it cannot read is
 * reported, never defaulted: a family whose disposition could not be found must
 * not silently become approved.
 */
// Which family a finding is about. Between them the four reviewers scoped
// findings five ways -- `familyId`, `family`, `subject`, `appliesTo`, and an
// array under `families` -- and a matcher that knows only its own lane's
// spelling silently drops every finding the others wrote. Washington's
// thirty-nine blockers arrived that way: read, counted, and attached to nothing.
const scopedTo = (finding, familyId) => {
  for (const key of ["familyId", "family", "subject", "appliesTo", "families"]) {
    const v = finding[key];
    if (v === undefined || v === null) continue;
    if (Array.isArray(v) ? v.includes(familyId) : v === familyId) return true;
  }
  return false;
};

function dispositionFor(review, familyId) {
  if (review?.family === familyId && review.disposition) {
    return { disposition: review.disposition, findings: review.findings ?? [], shape: "single_family_document" };
  }
  const arr = review?.families ?? review?.subjects ?? null;
  if (Array.isArray(arr)) {
    const hit = arr.find((f) => (f.familyId ?? f.family ?? f.subject) === familyId);
    if (hit?.disposition) {
      // A per-family list may hold finding objects or just their ids. Washington's
      // holds ids -- ten strings -- and treating a string as a finding object
      // yields ten blockers with a null id, a null severity and a null defect:
      // the count survives and everything a reader needs is gone.
      const byId = new Map((review.findings ?? []).map((f) => [f.id, f]));
      const listed = (hit.findings ?? []).map((f) => (typeof f === "string" ? byId.get(f) ?? { id: f } : f));
      const own = (review.findings ?? []).filter((x) => scopedTo(x, familyId));
      const merged = [...listed];
      for (const f of own) if (!merged.some((m) => m.id === f.id)) merged.push(f);
      return { disposition: hit.disposition, findings: merged, shape: "families_array" };
    }
  }
  const map = review?.dispositions ?? null;
  if (map && typeof map === "object" && map[familyId]) {
    const own = (review.findings ?? []).filter((x) => scopedTo(x, familyId));
    return { disposition: map[familyId], findings: own, shape: "dispositions_map" };
  }
  return { disposition: null, findings: [], shape: "not_found" };
}

/** The three artifact digests a handoff has to carry, at one commit. */
function artifactDigests(commit, pkg) {
  const at = (rel) => sha256(gitBytes(["cat-file", "blob", `${commit}:${pkg}/${rel}`]));
  return {
    participantPdfSha256: at("fixtures/canonical-filled.pdf"),
    contactSheetSha256: at("contact-sheet/blank-vs-filled.pdf"),
    artifactManifestSha256: at("reports/rendered-artifacts.json")
  };
}

const rows = [];
const batchRecords = [];

for (const batch of BATCHES) {
  const implTip = gitQ(["rev-parse", `origin/${batch.implementationBranch}`]);
  const reviewTip = gitQ(["rev-parse", `origin/${batch.reviewBranch}`]);
  const review = showJson(`origin/${batch.reviewBranch}`, batch.reviewFile);
  if (!review) throw new Error(`${batch.fix}: review artifact not readable at origin/${batch.reviewBranch}`);

  // The implementation commit the reviewer actually read: the review branch is
  // the implementation branch plus the review's own commits, so the newest
  // implementation commit that is an ancestor of the review tip is it.
  const reviewedImplCommit = gitQ(["merge-base", reviewTip, implTip]);

  batchRecords.push({
    fix: batch.fix,
    implementationBranch: batch.implementationBranch,
    implementationTip: implTip,
    reviewBranch: batch.reviewBranch,
    reviewCommit: reviewTip,
    implementationCommitReviewed: reviewedImplCommit,
    commitsAddedAfterReview: Number(gitQ(["rev-list", "--count", `${reviewedImplCommit}..${implTip}`]) ?? "0"),
    familiesInBatch: batch.families.length
  });

  for (const familyId of batch.families) {
    const input = inputs.families.find((f) => f.familyId === familyId);
    if (!input) throw new Error(`${familyId} is not one of the eight open families`);
    const pkg = input.familyPackagePath;

    const reviewed = artifactDigests(reviewedImplCommit, pkg);
    const final = artifactDigests(implTip, pkg);
    const unchanged = ["participantPdfSha256", "contactSheetSha256", "artifactManifestSha256"]
      .every((k) => reviewed[k] === final[k]);

    const { disposition, findings, shape } = dispositionFor(review, familyId);
    if (disposition !== null && !ALLOWED.has(disposition)) {
      throw new Error(`${familyId}: review returned a disposition outside the allowed set: ${disposition}`);
    }

    // Only bytes the reviewer actually read can carry their judgement. If any of
    // the three digests moved after the review, the disposition is recorded but
    // marked stale, and the family is not promotable on it.
    const carriesForward = disposition !== null && unchanged;

    rows.push({
      familyId,
      fix: batch.fix,
      state: input.state,
      lane: input.lane,
      implementationBranch: batch.implementationBranch,
      implementationCommit: implTip,
      implementationCommitReviewed: reviewedImplCommit,
      reviewBranch: batch.reviewBranch,
      reviewCommit: reviewTip,
      familyPackagePath: pkg,
      sourceSha256: input.sourceSha256,
      sourcePackMemberPath: input.sourcePackMemberPath,
      reviewedParticipantPdfSha256: reviewed.participantPdfSha256,
      currentParticipantPdfSha256: final.participantPdfSha256,
      currentContactSheetSha256: final.contactSheetSha256,
      currentArtifactManifestSha256: final.artifactManifestSha256,
      reviewedBytesEqualFinalBytes: unchanged,
      independentDisposition: disposition,
      dispositionShapeReadFrom: shape,
      dispositionCarriesToFinalBytes: carriesForward,
      openFindingCount: findings.length,
      remainingBlockers: findings.map((f) => ({
        id: f.id ?? null,
        severity: f.severity ?? null,
        file: f.file ?? null,
        fieldOrRegion: f.fieldOrRegion ?? f.field ?? f.region ?? f.fieldOrArea ?? null,
        visibleDefect: f.visibleDefect ?? f.defect ?? f.summary ?? null,
        acceptanceCondition: f.acceptanceCondition ?? null
      }))
    });
  }
}

rows.sort((a, b) => a.familyId.localeCompare(b.familyId));

// Refreshed totals across all 253. Only these eight can have moved, and each
// moves only where its review both issued a disposition and applies to the
// final bytes.
const newDisposition = new Map(rows.map((r) => [r.familyId, r.dispositionCarriesToFinalBytes ? r.independentDisposition : "correction_required"]));
const refreshed = { technical_approved: 0, correction_required: 0, held_on_source_or_design: 0 };
const changed = [];
for (const fam of v3Handoff.families) {
  const now = newDisposition.get(fam.familyId) ?? fam.finalDisposition;
  refreshed[now] = (refreshed[now] ?? 0) + 1;
  if (now !== fam.finalDisposition) changed.push({ familyId: fam.familyId, from: fam.finalDisposition, to: now });
}

const priorTotals = v3Handoff.totals.final;
const stillOpen = rows.filter((r) => newDisposition.get(r.familyId) !== "technical_approved");

const out = {
  schema: "rcap-d-v4-consolidated-handoff/v1",
  posture: "One consolidated result for the eight open D families, built from the four independent review branches at named commits. No family or track is promoted here; this is the record Terminal A integrates from.",
  canonicalControlPlaneBase: inputs.canonicalControlPlaneBase,
  sharedFactoryBaseCommit: gitQ(["rev-parse", "257bf0499b4327341ed103f9431733508b415e25"]),
  batches: batchRecords,
  hashContinuity: {
    question: "The reviewers cloned one commit before the generated-manifest refresh. Do the bytes they judged still exist on the final branch tips?",
    method: "For each family, the participant PDF, contact sheet and rendered-artifacts manifest are hashed at the reviewed implementation commit and at the branch tip, and compared.",
    familiesWhereReviewedBytesEqualFinalBytes: rows.filter((r) => r.reviewedBytesEqualFinalBytes).length,
    familiesWhereBytesMoved: rows.filter((r) => !r.reviewedBytesEqualFinalBytes).map((r) => r.familyId)
  },
  totals: {
    familiesInScope: rows.length,
    dispositions: rows.reduce((a, r) => { const d = r.independentDisposition ?? "(none returned)"; a[d] = (a[d] ?? 0) + 1; return a; }, {}),
    remainingBlockers: rows.reduce((n, r) => n + r.openFindingCount, 0)
  },
  refreshedTotalsAcross253: {
    before: priorTotals,
    after: refreshed,
    changedFamilies: changed,
    note: changed.length === 0
      ? "No family changed category: every one of the eight remains correction_required, so the D totals are unchanged at 157 / 8 / 88."
      : `${changed.length} family category changes.`
  },
  familiesStillBlocking: stillOpen.map((r) => r.familyId),
  families: rows
};

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "consolidated-handoff.json"), `${JSON.stringify(out, null, 2)}\n`);

console.log(`batches: ${batchRecords.length}   families: ${rows.length}`);
for (const b of batchRecords) {
  console.log(`  ${b.fix}  impl ${b.implementationTip.slice(0, 8)} (reviewed ${b.implementationCommitReviewed.slice(0, 8)}, +${b.commitsAddedAfterReview} after)  review ${b.reviewCommit.slice(0, 8)}`);
}
console.log("");
for (const r of rows) {
  console.log(`  ${r.familyId.padEnd(40)} ${String(r.independentDisposition).padEnd(21)} bytes-unchanged=${r.reviewedBytesEqualFinalBytes}  blockers=${r.openFindingCount}`);
}
console.log(`\nrefreshed totals across 253: ${JSON.stringify(out.refreshedTotalsAcross253.after)}`);
console.log(`was: ${JSON.stringify(priorTotals)}`);
console.log(out.refreshedTotalsAcross253.note);
