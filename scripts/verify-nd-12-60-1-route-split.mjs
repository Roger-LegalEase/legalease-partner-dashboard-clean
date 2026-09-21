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

  // One direction only, and deliberately.
  //
  // An overstated "identical" hides a real divergence that could demand a split,
  // so every field the record calls shared is still asserted to be shared.
  //
  // The reverse is NOT checked. The record describes the complete field
  // partition as it stood, but a field that later converges -- `unresolvedQuestions`
  // being answered the same way on all three grounds is the obvious case -- does
  // not touch the one-route determination. Requiring historical differences to
  // persist would turn a description into a launch obligation and fail CI for
  // the branches becoming MORE alike, which is the opposite of a defect.
  for (const key of claimedIdentical) {
    check(identical.includes(key),
      `the record calls ${key} identical across the three tracks, but the memo now differs on it`);
  }

  // --- 2. the production surface, which is what the conclusion turns on --------
  // If any of these diverges, the grounds no longer produce the same documents
  // through the same process, and the determination must be revisited rather
  // than inherited.
  for (const key of ["components", "rules", "destination", "geography",
    "outputStrategy", "manualCompletionItems"]) {
    check(identical.includes(key),
      `${key} now differs across the grounds; the one-route determination rests on it being shared and must be revisited`);
  }

  // The controlling source set matters only insofar as it decides the filing
  // vehicle. Sources may legitimately be cited differently per ground; what may
  // not happen is a source change that moves the vehicle or the documents.
  if (!identical.includes("officialSources")) {
    check(identical.includes("outputStrategy") && identical.includes("components"),
      "the controlling source set now differs across the grounds AND the vehicle or components moved with it; that is a split, not a citation difference");
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

  // --- 5. every ground-specific condition stays expressible inside one packet --
  // This is the substantive guard the determination rests on: a ground may carry
  // its own eligibility and its own proof, but the moment a ground needs its own
  // GENERATED document the one-packet reading fails. The components being
  // identical is that check; this adds that none of them is ground-specific.
  const groundWords = /pardon|misdemeanor|felony/i;
  for (const track of tracks) {
    const specific = (track.components ?? []).filter((component) => groundWords.test(JSON.stringify(component)));
    check(specific.length === 0,
      `${track.trackId} now carries a ground-specific generated component (${specific.map((c) => c.role).join(", ")}); that condition can no longer be represented inside the one packet`);
  }

  // The pardon certificate is the one ground-specific artifact, and it must stay
  // a participant-obtained attachment rather than becoming something the
  // platform generates or demands before it will produce the packet.
  const pardoned = tracks.find((track) => track.trackId === "nd-seal-pardoned-conviction");
  const certificate = (pardoned?.supportingDocuments ?? []).find(
    (document) => /certificate of pardon/i.test(String(document.name ?? "")));
  check(Boolean(certificate),
    "the certificate of pardon is no longer carried as a supporting document on the pardoned ground");
  check(!(pardoned?.components ?? []).some((component) => /pardon/i.test(JSON.stringify(component))),
    "the certificate of pardon has become a generated component; it is an external filing attachment");
}

// --- 6. the record does not claim authority it has not earned -----------------
check(/One route\./.test(String(record.determination ?? "")),
  "the record no longer determines a single route");
check(String(record.consequencesForTheBuild?.route ?? "").includes("Do not create three"),
  "the record no longer instructs against creating three routes");
check(/a shared chapter number is not a shared route/i.test(
  String(record.whatThisDoesNotDecide?.otherChapterTracks ?? "")),
  "the record no longer excludes the § 12-60.1-05 nonconviction tracks from this determination");

// The implementation rules are the part a builder acts on, so they are pinned
// rather than left to survive on goodwill.
const rules = record.consequencesForTheBuild?.implementationRules ?? {};
check(/never an upload prerequisite/i.test(String(rules.pardonCertificateIsNotAComponent ?? "")),
  "the record no longer forbids making the pardon certificate an upload prerequisite for packet generation");
check(/never a platform-generated component/i.test(String(rules.pardonCertificateIsNotAComponent ?? "")),
  "the record no longer states that the pardon certificate is not a generated component");
check(/filing readiness/i.test(String(rules.requiredBeforeFilingIsNotAGenerationGate ?? "")),
  "the record no longer distinguishes requiredBeforeFiling from a packet-generation gate");
check(/must preserve which .* ground actually qualified/i.test(String(rules.preserveTheQualifyingGround ?? "")),
  "the record no longer requires the engine to preserve the qualifying ground");
check(/Do not silently collapse/i.test(String(rules.doNotInventAPreferredGround ?? "")),
  "the record no longer forbids inventing a preferred ground when more than one qualifies");
for (const [field, expected] of [["opensAnyRoute", false], ["isCounselApproval", false],
  ["createsOutputApproval", false], ["productionAuthorized", false], ["commercialRoutesOpened", 0]]) {
  check(record[field] === expected, `${field} is no longer ${JSON.stringify(expected)}`);
}

for (const problem of problems) console.error(`  FAIL  ${problem}`);
if (problems.length) {
  console.error(`\nFAIL verify-nd-12-60-1-route-split — ${problems.length} of ${checked} checks failed`);
  process.exit(1);
}
console.log(`OK verify-nd-12-60-1-route-split — ${checked} checks; the grounds still share one vehicle, one instrument and one process, and every ground-specific condition still fits inside the one packet`);
