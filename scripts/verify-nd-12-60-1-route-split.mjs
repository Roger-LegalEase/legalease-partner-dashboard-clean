#!/usr/bin/env node

/**
 * The 12-60.1 route determination says what the memo says, or it fails.
 *
 * `2026-09-21-nd-12-60-1-route-split-determination.json` decides that one route
 * serves all three grounds under N.D.C.C. § 12-60.1-02(1). The decision rests on
 * a field-by-field comparison of the memo's three tracks, and that comparison is
 * the kind of claim that rots: a later edit to one track's components, rules or
 * destination would break the "identical" half without anyone noticing, and the
 * record would go on asserting a partition that no longer holds.
 *
 * So the partition is recomputed here from the memo rather than read back from
 * the record. The record is checked against that computation, in both
 * directions: it fails if a field the record calls identical has diverged, and
 * it fails if a field the record calls divergent has converged.
 *
 * The memo is committed, so nothing here skips.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const RECORD = "data/record-clearing/legal-decisions/2026-09-21-nd-12-60-1-route-split-determination.json";
const MEMO = "data/record-clearing/legal-design-intake/ND.memo.json";
const GROUND_TRACKS = [
  "nd-seal-misdemeanor-conviction",
  "nd-seal-felony-conviction",
  "nd-seal-pardoned-conviction"
];

const read = (relative) => JSON.parse(fs.readFileSync(path.join(ROOT, relative), "utf8"));
const record = read(RECORD);
const memo = read(MEMO);

const problems = [];
let checked = 0;
const check = (ok, message) => { checked += 1; if (!ok) problems.push(message); };

const tracks = GROUND_TRACKS.map((id) =>
  (memo.tracks ?? []).find((entry) => entry.trackId === id) ?? null);
check(tracks.every(Boolean),
  `the memo no longer carries all three § 12-60.1-02(1) tracks: ${GROUND_TRACKS.join(", ")}`);

if (tracks.every(Boolean)) {
  // --- 1. recompute the partition ---------------------------------------------
  const keys = [...new Set(tracks.flatMap((track) => Object.keys(track)))].sort();
  const identical = [];
  const differs = [];
  for (const key of keys) {
    const rendered = tracks.map((track) => JSON.stringify(track[key] ?? null));
    (new Set(rendered).size === 1 ? identical : differs).push(key);
  }

  const claimedIdentical = record.measuredFromTheMemo?.identicalAcrossAllThree ?? [];
  const claimedDiffers = record.measuredFromTheMemo?.differs ?? [];

  // Both directions. An overstated "identical" hides a real divergence that
  // could demand a split; an overstated "differs" would understate how much the
  // branches share and make the one-route conclusion look weaker than it is.
  for (const key of claimedIdentical) {
    check(identical.includes(key),
      `the record calls ${key} identical across the three tracks, but the memo now differs on it`);
  }
  for (const key of claimedDiffers) {
    check(differs.includes(key),
      `the record calls ${key} divergent, but the memo now holds the same value on all three`);
  }
  check(claimedIdentical.length === identical.length && claimedDiffers.length === differs.length,
    `the memo's field partition is now ${identical.length} identical / ${differs.length} divergent, but the record states ${claimedIdentical.length} / ${claimedDiffers.length}`);

  // --- 2. the fields the conclusion actually turns on --------------------------
  // These are the production surface. If any of them ever diverges, the one-route
  // determination has to be revisited rather than inherited.
  for (const key of ["components", "rules", "destination", "geography", "officialSources",
    "outputStrategy", "manualCompletionItems"]) {
    check(identical.includes(key),
      `${key} now differs across the grounds; the one-route determination rests on it being shared and must be revisited`);
  }

  // --- 3. one instrument, named at chapter level -------------------------------
  const primary = tracks[0].components?.find((component) => component.role === "primary_filing") ?? null;
  check(Boolean(primary), "the misdemeanor track no longer declares a primary_filing component");
  check(/Petition to Seal Criminal Records Under N\.D\.C\.C\. Chapter 12-60\.1/.test(String(primary?.notes ?? "")),
    "the primary filing is no longer the chapter-level Petition to Seal Criminal Records");
  check(/12-60\.1-03\(2\)\(a\) to \(d\)/.test(String(primary?.notes ?? "")),
    "the petition's contents are no longer specified by § 12-60.1-03(2)(a) to (d)");
  const order = tracks[0].components?.find((component) => component.role === "proposed_order") ?? null;
  check(Boolean(order) && order.requirement === "required",
    "the mandatory proposed order is no longer a required component");

  // --- 4. one vehicle ----------------------------------------------------------
  check(tracks.every((track) => track.outputStrategy === "custom_pleading"),
    "the three grounds no longer share the custom_pleading vehicle");
  check(tracks.every((track) => track.outputStrategyStatus === "resolved"),
    "a ground's vehicle is no longer resolved, so the determination rests on an open question");

  // --- 5. the divergence is eligibility, and stays eligibility -----------------
  for (const key of ["waitingPeriods", "exclusions"]) {
    check(differs.includes(key),
      `${key} no longer differs; if the grounds have converged on eligibility this record's account of them is wrong`);
  }
}

// --- 6. the record does not claim authority it has not earned -----------------
check(/One route\./.test(String(record.determination ?? "")),
  "the record no longer determines a single route");
check(String(record.consequencesForTheBuild?.route ?? "").includes("Do not create three"),
  "the record no longer instructs against creating three routes");
check(/a shared chapter number is not a shared route/i.test(
  String(record.whatThisDoesNotDecide?.otherChapterTracks ?? "")),
  "the record no longer excludes the § 12-60.1-05 nonconviction tracks from this determination");
for (const [field, expected] of [["opensAnyRoute", false], ["isCounselApproval", false],
  ["createsOutputApproval", false], ["productionAuthorized", false], ["commercialRoutesOpened", 0]]) {
  check(record[field] === expected, `${field} is no longer ${JSON.stringify(expected)}`);
}

for (const problem of problems) console.error(`  FAIL  ${problem}`);
if (problems.length) {
  console.error(`\nFAIL verify-nd-12-60-1-route-split — ${problems.length} of ${checked} checks failed`);
  process.exit(1);
}
console.log(`OK verify-nd-12-60-1-route-split — ${checked} checks; the memo still partitions the way this determination says it does`);
