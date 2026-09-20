#!/usr/bin/env node

/**
 * The Oregon subsection-authority record says what its sources say, or it fails.
 *
 * `2026-09-20-or-137-225-subsection-authority-resolved-by-enrolled-session-law.json`
 * decides which of two committed records governs the ORS subsection for the
 * dismissed-charge and acquittal branches. It decides by quoting them. Those
 * quotes are load-bearing: they are the whole reason the memo's `(1)(d)` wins
 * over the review's `(1)(c)`, and a paraphrase dressed as a quotation would make
 * the decision unauditable.
 *
 * WHY THIS IS A SEPARATE CONTROL FROM THE FORM ONE
 *
 * `verify-or-ojd-set-aside-form-record.mjs` checks quotes against a PDF in the
 * private source library, which most checkouts do not have, so it skips. The
 * memo is committed to this repository, so the memo half of this record can be
 * checked everywhere and always. The two controls fail for different reasons and
 * are available in different places; folding them together would mean the weaker
 * availability won.
 *
 * WHAT IT CHECKS
 *
 *   1. every quote attributed to the memo appears verbatim in the memo field the
 *      record names;
 *   2. the record's characterisation of the review's own track table is true --
 *      the review really does file Tracks 2 and 3 under (1)(c) and (1)(d) as an
 *      unidentified Track 7 -- because that characterisation is what the record
 *      overturns, and overturning something it has described wrongly would be
 *      worse than not overturning it;
 *   3. the memo still attributes (1)(d) to both branches. If the memo is ever
 *      edited to say something else, this record's conclusion no longer follows
 *      from it and must be revisited rather than quietly inherited.
 *
 * Review-side checks skip when the private library is absent, and say so.
 * Memo-side checks never skip.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const RECORD = "data/record-clearing/legal-decisions/2026-09-20-or-137-225-subsection-authority-resolved-by-enrolled-session-law.json";
const MEMO = "data/record-clearing/legal-design-intake/OR.memo.json";
const REVIEW_RELATIVE = "STATES/OR/01_LEGAL_REVIEW/OR__LEGAL-REVIEW__STATEWIDE__oregon-record-clearing-legal-review__ASOF-2026-08-01__EN.md";
const CORPUS_CANDIDATES = [
  "private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1",
  "../legalease-partner-dashboard-clean/private/source-imports/Expungement_AI_RCAP_Master_Library_Edition_1"
];

const normalize = value => value
  .replace(/[‘’]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/—/g, "--")
  .replace(/\s+/g, " ")
  .trim();

const record = JSON.parse(fs.readFileSync(path.join(ROOT, RECORD), "utf8"));
const memo = JSON.parse(fs.readFileSync(path.join(ROOT, MEMO), "utf8"));

const problems = [];
const skipped = [];
let checked = 0;
const check = (ok, message) => { checked += 1; if (!ok) problems.push(message); };

// --- 1. memo quotes, verbatim -------------------------------------------------
const memoHay = normalize(`${memo._officialAuthorityConfirmation ?? ""} ${memo._controllingReview ?? ""}`);
const established = record.whatTheEnrolledReadingEstablished ?? {};
const memoQuotes = [
  ["subsectionIdentity", established.subsectionIdentity?.quote],
  ["objectionPeriod", established.objectionPeriod?.quote],
  ["fees", established.fees?.quote],
  ["grantStandard", established.grantStandard?.quote],
  ["vehicleConfirmedIndependently", record.vehicleConfirmedIndependently?.quote]
];
for (const [label, quote] of memoQuotes) {
  const fragments = normalize(quote ?? "").split("...").map(part => part.trim()).filter(Boolean);
  check(fragments.length > 0 && fragments.every(fragment => memoHay.includes(fragment)),
    `the quote at ${label} is not verbatim in the memo`);
}

// --- 2. the memo still says what the conclusion rests on -----------------------
const tracks = Array.isArray(memo.tracks) ? memo.tracks : [];
const trackById = id => tracks.find(entry => (entry.id ?? entry.trackId ?? entry.shortName) === id) ?? null;
for (const [id, subsection] of [
  ["or_arrest_no_charges", "ORS 137.225(1)(c)"],
  ["or_dismissed_charge", "ORS 137.225(1)(d)"],
  ["or_acquittal", "ORS 137.225(1)(d)"]
]) {
  const track = trackById(id);
  check(Boolean(track) && String(track.legalName ?? "").includes(subsection),
    `the memo no longer attributes ${subsection} to ${id}; this record's conclusion rests on that attribution and must be revisited, not inherited`);
}

// --- 3. the review really does say what this record overturns ------------------
const corpusRoot = CORPUS_CANDIDATES
  .map(candidate => path.resolve(ROOT, candidate))
  .find(candidate => fs.existsSync(path.join(candidate, REVIEW_RELATIVE)));

if (!corpusRoot) {
  skipped.push("the review's track table could not be checked: the private source library is not in this checkout");
} else {
  const review = fs.readFileSync(path.join(corpusRoot, REVIEW_RELATIVE), "utf8");
  // A record may only overturn a reading it has stated correctly.
  check(/\|\s*2\.\s*Dismissed charge\s*\|\s*ORS 137\.225\(1\)\(c\)/.test(review),
    "the review does not file Track 2 under (1)(c), so this record describes the reading it overturns incorrectly");
  check(/\|\s*3\.\s*Acquittal\s*\|\s*ORS 137\.225\(1\)\(c\)/.test(review),
    "the review does not file Track 3 under (1)(c), so this record describes the reading it overturns incorrectly");
  check(/\|\s*7\.\s*Subsection \(1\)\(d\) relief\s*\|\s*ORS 137\.225\(1\)\(d\)\s*\|\s*Unidentified/.test(review),
    "the review does not file (1)(d) as an unidentified Track 7, so this record's account of the trap is wrong");
  const sealing = record.whatTheEnrolledReadingEstablished?.sealingEffect?.reviewText ?? "";
  check(normalize(review).includes(normalize(sealing)) && sealing.length > 0,
    "the sealing-effect quote is not verbatim in the review");
}

for (const note of skipped) console.log(`  skipped  ${note}`);
for (const problem of problems) console.error(`  FAIL  ${problem}`);

if (problems.length) {
  console.error(`\nFAIL verify-or-137-225-authority-record — ${problems.length} of ${checked} checks failed`);
  process.exit(1);
}
console.log(`OK verify-or-137-225-authority-record — ${checked} checks${skipped.length ? `, ${skipped.length} skipped` : ""}; the record's quotes and its account of what it overturns both hold`);
