#!/usr/bin/env node
/**
 * Record the owner's dispositions onto the supersession record.
 *
 * The buckets below are Roger's, transcribed from the 2026-09-19
 * authorization and keyed to the exact (profile, reviewed digest) pair each
 * was decided against. Nothing here chooses a bucket. What this script does
 * choose — because it is measurement rather than judgement — is the review
 * scope each bucket implies:
 *
 *   - the baseline digest, which is the original committed digest wherever
 *     the pinned one was itself installed by an unrecorded re-pin, and the
 *     widest original where a group has more than one;
 *   - for TARGETED, the exact disturbed and newly-added pathways measured
 *     from that baseline, and the statement that the rest were excluded
 *     because the computed delta does not touch them;
 *   - for FULL, the whole current profile, and the record that the prior
 *     review is not carried forward as substantive authority.
 *
 * Computing the scope rather than transcribing it is deliberate. A scope
 * typed out by hand is a scope that can quietly omit a pathway, and the
 * pathway most likely to be omitted is the one somebody would rather not
 * re-review. The evaluator recomputes all of it and refuses a mismatch.
 *
 * No reviewRecord is written. This script records what must be reviewed; it
 * does not and cannot record that a review happened.
 *
 *   node scripts/terminalization/record-provenance-dispositions.mjs
 *   node scripts/terminalization/record-provenance-dispositions.mjs --check
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requiredReviewBaseline, isolationForBaseline } from "./terminalization-provenance-model.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DOCUMENT = path.join(rootDir, "data/rcap-all50/terminalization-provenance-supersessions.json");
const check = process.argv.includes("--check");

const RECORDED_BY = "Roger Roman (owner)";
const RECORDED_ON = "2026-09-19";
const AUTHORIZATION =
  "Roger instruction 2026-09-19: record these 32 dispositions. Zero pairs are NO_SUBSTANTIVE_CHANGE. Preserve every original review digest, every historical re-pin event and every original reviewedAsOf. Where the current pin was itself silently re-pinned, all re-review evidence must evaluate the entire original-digest -> current-digest chain. TARGETED means re-review the exact disturbed and newly added pathways only; FULL means re-review the current jurisdiction profile as a whole. Recording a disposition does not make C1 or C2 green.";

/** profile basename + reviewed digest prefix -> bucket and the owner's stated reason. */
const DISPOSITIONS = [
  ["AR-arkansas", "2472302ba0", "FULL", "3/3 reviewed pathways disturbed, 466 operative leaves"],
  ["AZ-arizona", "311ad605d4", "TARGETED", "1/3 prior pathways disturbed plus one newly added route"],
  ["CT-connecticut", "451fc6754e", "TARGETED", "whole chain 2/5 disturbed plus one new route"],
  ["CT-connecticut", "47a86bd5ed", "TARGETED", "2/5 disturbed plus one new route"],
  ["CT-connecticut", "8f857308ee", "TARGETED", "whole chain 2/5 disturbed plus one new route"],
  ["DC-district-of-columbia", "426fed6ae9", "TARGETED", "4/7, but comparatively narrow dimensions"],
  ["GA-georgia", "aa41244d85", "FULL", "whole chain 4/5 disturbed plus one new route"],
  ["HI-hawaii", "542e4af13a", "TARGETED", "whole chain 3/5, isolatable"],
  ["ID-idaho", "caf89c5e9b", "TARGETED", "3/5, narrow enough to isolate"],
  ["IL-illinois", "e491c80d8c", "FULL", "whole chain 8/9 disturbed, 197 operative leaves"],
  ["IN-indiana", "0202d53611", "FULL", "4/4 pathways disturbed"],
  ["KS-kansas", "06eceb937b", "FULL", "whole chain 3/4 old pathways plus two new routes"],
  ["KY-kentucky", "441a89c697", "FULL", "whole chain 4/5 plus one new route, 223 operative leaves"],
  ["KY-kentucky", "4f27411ff9", "FULL", "same whole-chain exposure: 4/5 plus one new route"],
  ["MA-massachusetts", "76e109a79c", "FULL", "7/7 disturbed"],
  ["ME-maine", "c10031cebf", "FULL", "5/5 disturbed"],
  ["MT-montana", "2b9380c023", "FULL", "5/5 disturbed, 229 operative leaves"],
  ["NC-north-carolina", "b74be5afc1", "FULL", "whole chain 3/3 disturbed"],
  ["ND-north-dakota", "7396f7a8e0", "FULL", "6/6 disturbed; commercial refusal remains unchanged"],
  ["NE-nebraska", "c0a19b73d6", "FULL", "whole chain 8/8 disturbed"],
  ["NV-nevada", "bbea0bb140", "TARGETED", "whole chain 3/7 disturbed plus one new route"],
  ["OH-ohio", "619b81642a", "TARGETED", "3/7 disturbed; isolatable"],
  ["OK-oklahoma", "41d0712389", "FULL", "whole chain 15/18 disturbed, 619 operative leaves"],
  ["SC-south-carolina", "d6cccee1ca", "FULL", "whole chain 5/7 and broad protected dimensions"],
  ["TN-tennessee", "bd06899404", "FULL", "4/4 disturbed"],
  ["TX-texas", "5d86879a79", "FULL", "whole chain 6/9, 215 operative leaves; the pinned leg badly understated it"],
  ["VA-virginia", "235b3e5ecc", "TARGETED", "2/3, comparatively narrow dimensions"],
  ["VT-vermont", "1a4267ce65", "TARGETED", "4/8, isolatable"],
  ["WA-washington", "c0da4e003c", "FULL", "whole chain 6/7 disturbed"],
  ["WI-wisconsin", "1384658236", "TARGETED", "2/5, mostly legal-authority scope"],
  ["WV-west-virginia", "0d5885d3ee", "FULL", "whole chain 6/7, 499 operative leaves; different SCA-C903 bytes"],
  ["WV-west-virginia", "ee9a8d389b", "FULL", "same whole chain 6/7, 499 operative leaves"]
];

const BUCKETS = { TARGETED: "TARGETED_REREVIEW_REQUIRED", FULL: "FULL_REREVIEW_REQUIRED" };

const document = JSON.parse(fs.readFileSync(DOCUMENT, "utf8"));
const problems = [];

const bySlug = new Map();
for (const entry of document.supersessions) {
  bySlug.set(`${path.basename(entry.profilePath, ".json")}|${entry.reviewedSha256.slice(0, 10)}`, entry);
}

const seen = new Set();
for (const [profile, digestPrefix, shorthand, rationale] of DISPOSITIONS) {
  const key = `${profile}|${digestPrefix}`;
  const entry = bySlug.get(key);
  if (!entry) {
    problems.push(`no superseded pair matches ${key}`);
    continue;
  }
  if (seen.has(key)) problems.push(`${key} is dispositioned twice`);
  seen.add(key);

  const required = requiredReviewBaseline({ supersession: entry });
  const isolation = isolationForBaseline({ supersession: entry, baselineSha256: required.sha256 });
  if (!isolation) {
    problems.push(`${key}: no isolation measured for the required baseline ${required.sha256.slice(0, 10)}`);
    continue;
  }

  const bucket = BUCKETS[shorthand];
  const reviewScope = {
    baseline: required.sha256 === entry.reviewedSha256 ? "pinned_reviewed_digest" : "original_committed_digest",
    baselineSha256: required.sha256,
    baselineWhy: required.why,
    currentSha256: entry.currentSha256
  };

  if (bucket === "TARGETED_REREVIEW_REQUIRED") {
    const disturbed = isolation.reviewedPathwaysDisturbed.map((p) => p.pathwayId);
    const gained = isolation.pathwaysGained;
    const reviewedAtBaseline = isolation.pathwaysAtReview;
    reviewScope.scope = "named_pathways_only";
    reviewScope.pathways = [...disturbed, ...gained].sort();
    reviewScope.disturbedExistingPathways = disturbed.sort();
    reviewScope.newlyAddedPathways = [...gained].sort();
    reviewScope.pathwaysAtBaseline = reviewedAtBaseline;
    reviewScope.excludedCount = reviewedAtBaseline - disturbed.length;
    reviewScope.excludedBecause =
      "The computed delta from the review baseline to the current profile bytes does not touch these pathways, leaf by leaf. They are excluded from the re-review on that measurement, not on assumption, and the exclusion is void if the profile moves again.";
  } else {
    reviewScope.scope = "entire_current_profile";
    reviewScope.carriesForwardPriorReviewAsAuthority = false;
    reviewScope.priorReviewTreatment =
      "Preserved as historical provenance only. The delta is broad enough that the earlier review can no longer be meaningfully isolated, so it is not carried forward as substantive authority for any pathway.";
    reviewScope.pathwaysAtBaseline = isolation.pathwaysAtReview;
    reviewScope.reviewedPathwaysDisturbed = isolation.reviewedPathwaysDisturbed.length;
  }

  entry.disposition = {
    bucket,
    recordedBy: RECORDED_BY,
    recordedOn: RECORDED_ON,
    authorization: AUTHORIZATION,
    rationale,
    reviewScope,
    reviewRecord: null,
    reviewStatus: "not_started"
  };
}

for (const entry of document.supersessions) {
  if (!entry.disposition) {
    problems.push(`${path.basename(entry.profilePath, ".json")} @ ${entry.reviewedSha256.slice(0, 10)} has no disposition`);
  }
}

// Totals belong to the generator, which is the file's serializer. Writing
// them here too would give the document two writers that can disagree.

if (problems.length > 0) {
  console.error(`recording dispositions FAILED — ${problems.length} problem(s):`);
  for (const problem of problems) console.error(` - ${problem}`);
  process.exit(1);
}

// --check compares the disposition blocks alone, not the whole file: the
// generator owns every other byte, and comparing those here would make this
// script fail whenever a delta legitimately moved.
const onDisk = JSON.parse(fs.readFileSync(DOCUMENT, "utf8"));
const byPair = (doc) =>
  Object.fromEntries(doc.supersessions.map((e) => [`${e.profilePath}|${e.reviewedSha256}`, e.disposition ?? null]));

if (check) {
  const want = JSON.stringify(byPair(document));
  const have = JSON.stringify(byPair(onDisk));
  if (want !== have) {
    console.error("recorded dispositions are stale; re-run without --check");
    process.exit(1);
  }
  console.log(`dispositions current. ${DISPOSITIONS.length} recorded, 0 NO_SUBSTANTIVE_CHANGE.`);
  process.exit(0);
}
const serialized = `${JSON.stringify(document, null, 2)}\n`;
fs.writeFileSync(DOCUMENT, serialized);
const counts = { TARGETED_REREVIEW_REQUIRED: 0, FULL_REREVIEW_REQUIRED: 0, NO_SUBSTANTIVE_CHANGE: 0 };
for (const entry of document.supersessions) if (entry.disposition) counts[entry.disposition.bucket] += 1;
console.log(
  `recorded ${DISPOSITIONS.length} dispositions: ${counts.FULL_REREVIEW_REQUIRED} FULL, ${counts.TARGETED_REREVIEW_REQUIRED} TARGETED, ` +
    `${counts.NO_SUBSTANTIVE_CHANGE} NO_SUBSTANTIVE_CHANGE. Totals are the generator's; re-run it to normalise them.`
);
