#!/usr/bin/env node
/**
 * The re-review completion matrix.
 *
 * Thirty-two review units spread across two controls, two corpora and
 * twenty-seven jurisdictions is exactly the shape of work where somebody
 * eventually says "I thought that one was done". This counts them, derived
 * from the supersession record rather than maintained beside it, so the count
 * cannot be right about a unit the record disagrees with.
 *
 * The five statuses are deliberately more than "done / not done", because
 * "not done" hides the distinction that matters most here: a unit nobody has
 * started and a unit counsel examined and SENT BACK are both unsatisfied and
 * are not remotely the same situation. A hold is a result. It is the review
 * working.
 *
 * Only approved_current_bytes satisfies a control, and only when its review
 * record binds the exact baseline and current digests. Everything else counts
 * as outstanding here and refuses there.
 *
 *   node scripts/terminalization/generate-provenance-review-matrix.mjs
 *   node scripts/terminalization/generate-provenance-review-matrix.mjs --check
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { REVIEW_STATUSES, requiredReviewBaseline } from "./terminalization-provenance-model.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE = "data/rcap-all50/terminalization-provenance-supersessions.json";
const OUT = "data/rcap-all50/terminalization-provenance-review-matrix.json";
const check = process.argv.includes("--check");

const document = JSON.parse(fs.readFileSync(path.join(rootDir, SOURCE), "utf8"));
const jurisdiction = (profilePath) => path.basename(profilePath, ".json").split("-")[0];

const STATUSES = Object.keys(REVIEW_STATUSES);
const blank = () => Object.fromEntries(STATUSES.map((s) => [s, 0]));

const units = document.supersessions.map((entry) => {
  const required = requiredReviewBaseline({ supersession: entry });
  const status = entry.disposition?.reviewStatus ?? "not_started";
  const record = entry.disposition?.reviewRecord ?? null;
  // A record only counts when it binds this unit's exact digests. A review of
  // some other pair is not this unit's review, however genuine it is.
  const boundCorrectly =
    Boolean(record) &&
    record.bindsBaselineSha256 === required.sha256 &&
    record.bindsCurrentSha256 === entry.currentSha256;
  return {
    unit: `${jurisdiction(entry.profilePath)}:${entry.reviewedSha256.slice(0, 10)}`,
    jurisdiction: jurisdiction(entry.profilePath),
    profilePath: entry.profilePath,
    reviewedSha256: entry.reviewedSha256,
    currentSha256: entry.currentSha256,
    disposition: entry.disposition?.bucket ?? null,
    priority: entry.disposition?.bucket === "TARGETED_REREVIEW_REQUIRED" ? 1 : 2,
    reviewBaselineSha256: required.sha256,
    reviewsWholeChain: entry.priorChain?.pinnedDigestIsItselfARepin === true,
    pathwaysInScope:
      entry.disposition?.reviewScope?.scope === "named_pathways_only"
        ? entry.disposition.reviewScope.pathways.length
        : null,
    recordCount: entry.recordCount,
    reviewStatus: status,
    satisfies: REVIEW_STATUSES[status]?.satisfies === true && boundCorrectly,
    reviewRecordBindsThisUnit: record ? boundCorrectly : null
  };
});

const tally = (subset) => {
  const counts = blank();
  for (const unit of subset) counts[unit.reviewStatus] = (counts[unit.reviewStatus] ?? 0) + 1;
  return counts;
};

const targeted = units.filter((u) => u.priority === 1);
const full = units.filter((u) => u.priority === 2);
const satisfiedCount = units.filter((u) => u.satisfies).length;
const holds = units.filter((u) => u.reviewStatus === "hold_correction_required");

const next = {
  schemaVersion: "rcap-terminalization-provenance-review-matrix/v1",
  generatedBy: "scripts/terminalization/generate-provenance-review-matrix.mjs",
  derivedFrom: SOURCE,
  purpose:
    "The completion state of the 32 terminalization provenance re-reviews, counted from the supersession record rather than maintained beside it. It exists so that progress is a number nobody has to reconstruct, and so that a held review is visible as a result rather than as an absence.",
  statuses: Object.fromEntries(
    Object.entries(REVIEW_STATUSES).map(([name, meta]) => [name, { satisfiesAControl: meta.satisfies, meaning: meta.why }])
  ),
  whatSatisfiesAControl:
    "approved_current_bytes, and only when the review record binds both this unit's review baseline and the profile's current digest. A review of an adjacent pair of digests is not this unit's review. Every other status leaves C1 or C2 refusing.",
  holdsAreAResult:
    "hold_correction_required is a successful review, not a failed one. A reviewer who finds a profile wrong must be able to say so without it reading as non-delivery. The next step after a hold is to correct the profile, which moves its current digest, which retires the unit as superseded_by_new_profile and opens a fresh one against the corrected bytes. Nobody should approve current bytes to make a suite green.",
  progress: {
    total: units.length,
    reviewed: satisfiedCount,
    remaining: units.length - satisfiedCount,
    targeted: { total: targeted.length, reviewed: targeted.filter((u) => u.satisfies).length },
    full: { total: full.length, reviewed: full.filter((u) => u.satisfies).length },
    holds: holds.length,
    line:
      `${satisfiedCount} / ${units.length} reviewed, ${units.length - satisfiedCount} remaining · ` +
      `Targeted: ${targeted.filter((u) => u.satisfies).length} / ${targeted.length} · ` +
      `Full: ${full.filter((u) => u.satisfies).length} / ${full.length} · ` +
      `Holds: ${holds.length}`
  },
  byStatus: { all: tally(units), targeted: tally(targeted), full: tally(full) },
  unitsReviewingTheWholeChain: units.filter((u) => u.reviewsWholeChain).length,
  recordsUnblockedWhenAllSatisfied: units.reduce((total, unit) => total + unit.recordCount, 0),
  units: units.sort((a, b) => a.priority - b.priority || a.unit.localeCompare(b.unit))
};

const serialized = `${JSON.stringify(next, null, 2)}\n`;
const outPath = path.join(rootDir, OUT);

if (check) {
  if (!fs.existsSync(outPath) || fs.readFileSync(outPath, "utf8") !== serialized) {
    console.error("the review completion matrix is stale; re-run without --check");
    process.exit(1);
  }
  console.log(`review matrix current. ${next.progress.line}`);
  process.exit(0);
}

fs.writeFileSync(outPath, serialized);
console.log(`wrote ${OUT}`);
console.log(`  ${next.progress.line}`);
