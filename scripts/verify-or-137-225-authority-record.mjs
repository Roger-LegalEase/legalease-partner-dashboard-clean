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

// --- 3. the record does not outrun its own evidence ---------------------------
// The quotes above prove what the MEMO says. Nothing in this repository proves
// what Oregon Laws 2025 chapter 349 says: those bytes are not here and not in
// the source library. A record that resolves which interpretation the repository
// follows can slide into reading as a statutory holding just by being cited a
// few times, so the limitation is checked rather than trusted to stay written.
const standing = record.evidentiaryStanding ?? null;
check(Boolean(standing), "the record no longer states its evidentiary standing; a provenance resolution that does not say so reads as primary-source proof");
if (standing) {
  // The disclaimer lives under a key whose name supplies the negation, so match
  // on what it asserts -- that no enrolled or session-law text backs this record
  // -- rather than on the word "not", which the key already carries.
  check(typeof standing.whatThisRecordIsNot === "string"
    && /enrolled/i.test(standing.whatThisRecordIsNot)
    && /no enrolled or session-law text was read/i.test(standing.whatThisRecordIsNot),
    "the record no longer disclaims resting on the enrolled statute's own text");
  const gate = standing.beforeStatutoryAuthorityMayBeBound ?? {};
  const options = Array.isArray(gate.options) ? gate.options : [];
  check(options.length === 2, "the two routes to binding statutoryAuthority (primary source, or counsel) are no longer both recorded");
  check(options.some(option => /primary[- ]source|enrolled|session[- ]law/i.test(option)),
    "the primary-source route to binding statutoryAuthority is no longer recorded");
  check(options.some(option => /counsel/i.test(option)),
    "the counsel route to binding statutoryAuthority is no longer recorded");
}
// The record must not claim to open anything, whatever its prose says elsewhere.
for (const [field, expected] of [["opensAnyRoute", false], ["isCounselApproval", false], ["createsOutputApproval", false], ["productionAuthorized", false], ["commercialRoutesOpened", 0]]) {
  check(record[field] === expected, `${field} is no longer ${JSON.stringify(expected)}; this record may not carry authority it did not earn`);
}

// --- 4. the review really does say what this record overturns ------------------
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

  // The proposed-order conclusion rests on one sentence in the acquisition
  // manifest. It is the reason no custom order is drafted, so it is checked
  // against the manifest rather than trusted to have been read correctly.
  const manifestPath = path.join(corpusRoot, "STATES/OR/STATE_MANIFEST.csv");
  if (!fs.existsSync(manifestPath)) {
    skipped.push("the OJD order statement could not be checked: STATES/OR/STATE_MANIFEST.csv is not present");
  } else {
    const manifest = normalize(fs.readFileSync(manifestPath, "utf8"));
    const claimed = record.vehicleConfirmedIndependently?.proposedOrderGap?.lookupPerformed?.ojdStatement ?? "";
    check(claimed.length > 0 && manifest.includes(normalize(claimed)),
      "the OJD statement that the court creates the order is not verbatim in the Oregon acquisition manifest; the decision not to draft a proposed order rests on it");
  }
}

// --- 5. the proposed-order gap stays closed the way it was closed -------------
const gap = record.vehicleConfirmedIndependently?.proposedOrderGap ?? {};
check(/Do not draft a custom proposed order/i.test(String(gap.disposition ?? "")),
  "the proposed-order disposition no longer refuses to draft a custom order");

for (const note of skipped) console.log(`  skipped  ${note}`);
for (const problem of problems) console.error(`  FAIL  ${problem}`);

if (problems.length) {
  console.error(`\nFAIL verify-or-137-225-authority-record — ${problems.length} of ${checked} checks failed`);
  process.exit(1);
}
console.log(`OK verify-or-137-225-authority-record — ${checked} checks${skipped.length ? `, ${skipped.length} skipped` : ""}; the record's quotes and its account of what it overturns both hold`);
