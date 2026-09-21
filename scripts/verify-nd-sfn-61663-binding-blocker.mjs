#!/usr/bin/env node

/**
 * The SFN-61663 blocker analysis says what the committed inputs say, or it fails.
 *
 * `2026-09-21-nd-sfn-61663-binding-blocker-analysis.json` explains why five
 * `official_sources` entries survived a day on which the form's bytes were
 * proven present. Its explanation is only worth anything if it is still true of
 * the files it describes, and every one of those files is committed: the corpus
 * index, the source registry and the Grade-A projection. Nothing here needs the
 * private corpus, so nothing here skips.
 *
 * WHY THIS IS CHECKED RATHER THAN TRUSTED
 *
 * An analysis that names a cause is the kind of document that quietly becomes
 * wrong: the index gets regenerated, a source record appears, the registry moves
 * to `single_record_only`, and the prose still says `unaccounted`. Worse, the
 * record would then read as a standing excuse for a blocker that had actually
 * become closable. So the two facts the conclusion rests on -- that no
 * identifier `SFN-61663` exists on either side, and that the registry therefore
 * says `unaccounted` -- are asserted against the files themselves.
 *
 * The check is deliberately two-sided. It fails if the analysis overstates the
 * blocker (claiming nothing is bound when something is), and it fails if the
 * analysis has gone stale (the world moved and the record did not).
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const RECORD = "data/record-clearing/legal-decisions/2026-09-21-nd-sfn-61663-binding-blocker-analysis.json";
const INDEX = "data/rcap-all50/local-source-corpus-index.json";
const REGISTRY = "data/rcap-grade-a/official-source-registry.json";
const PROJECTION = "data/rcap-grade-a/fulfillment-authority-projection.json";
const ROUTE = "ND:marijuana-specific-summary-pardon-or-sealing-relief";
const SOURCE_ID = "SFN-61663";

const read = (relative) => JSON.parse(fs.readFileSync(path.join(ROOT, relative), "utf8"));

const problems = [];
let checked = 0;
const check = (ok, message) => { checked += 1; if (!ok) problems.push(message); };

const record = read(RECORD);
const index = read(INDEX);
const registry = read(REGISTRY);
const projection = read(PROJECTION);

// --- 1. the bytes the record names are the bytes the index holds ---------------
const measured = record.whatIsMeasuredFromCommittedData?.bytesInTheIndex ?? {};
const entries = Array.isArray(index.entries) ? index.entries : [];
const byDigest = entries.filter((entry) => entry.sha256 === measured.sha256);
check(byDigest.length === 2,
  `the index no longer holds exactly two custodies of ${measured.sha256}; the record describes two`);
check(byDigest.every((entry) => entry.byteLength === measured.byteLength),
  "the indexed byte length no longer matches the length this record states");
check(byDigest.every((entry) => entry.state === "ND"),
  "the digest this record names is no longer a North Dakota asset");
check(byDigest.length > 0 && byDigest.every((entry) =>
  entry.formNumber === record.whatIsMeasuredFromCommittedData.theIdentifierGap.formNumberInTheIndex),
  "the index no longer keys those bytes under the document id this record names");

// --- 2. the identifier gap, which is the whole conclusion ----------------------
// If either of these ever becomes non-zero the analysis is stale and the blocker
// may now be closable. That is a reason to revisit it, not to keep citing it.
const withFormNumber = entries.filter(
  (entry) => String(entry.formNumber ?? "").toUpperCase().replace(/\s+/g, "-") === SOURCE_ID);
check(withFormNumber.length === 0,
  `the corpus index now carries ${SOURCE_ID} as a form number; the installed side may now resolve and this analysis is stale`);
check(record.whatIsMeasuredFromCommittedData?.theIdentifierGap?.entriesWhoseFormNumberIsSfn61663 === 0,
  "the record no longer states that no index entry carries this form number");
check(record.whatIsMeasuredFromCommittedData?.theIdentifierGap?.sourceRecordsDeclaringDocumentIdSfn61663 === 0,
  "the record no longer states that no packet source record declares this document id");

// --- 3. the registry still says what the record says it says -------------------
const governed = registry.sources?.[SOURCE_ID] ?? null;
check(Boolean(governed), `${SOURCE_ID} is no longer present in the governed source registry at all`);
check(governed?.status === "unaccounted",
  `${SOURCE_ID} is no longer 'unaccounted' but '${governed?.status}'; the analysis must be revisited before it is cited again`);
for (const field of ["expectedSha256", "installedSha256", "expectedFrom", "installedFrom", "corpusPath"]) {
  check(governed?.[field] === "", `${SOURCE_ID}.${field} is no longer empty; something now binds and this record is stale`);
}

// --- 4. the five entries are still the five entries ----------------------------
const route = (projection.routes ?? []).find((entry) => entry.routeId === ROUTE) ?? null;
check(Boolean(route), `${ROUTE} is no longer in the Grade-A projection`);
const official = (route?.missingProof ?? []).filter((entry) => entry.startsWith("official_sources:"));
check(official.length === 5,
  `the route now carries ${official.length} official_sources entries, not the five this record explains`);
for (const stated of record.theFiveEntries?.entries ?? []) {
  check(official.includes(stated), `the projection no longer carries the entry this record quotes: ${stated}`);
}
check(route?.state === "INCOMPLETE" && route?.commercialStatus === "not_commercially_eligible",
  "the route is no longer INCOMPLETE and not_commercially_eligible, so this record's status section is stale");

// --- 5. the record does not claim authority it has not earned ------------------
const status = record.statusOfThisSource ?? {};
check(status.authoritativeSourceBindingApplied === "NO" && status.gradeABlockerClosed === "NO",
  "the record now claims a binding or a closure it did not perform");
check(/Do not read 'the cause is understood' as 'the blocker is closed'/.test(String(status.readThisFirst ?? "")),
  "the record no longer warns that explaining a blocker is not closing it");
for (const [field, expected] of [["opensAnyRoute", false], ["isCounselApproval", false],
  ["createsOutputApproval", false], ["productionAuthorized", false], ["commercialRoutesOpened", 0]]) {
  check(record[field] === expected, `${field} is no longer ${JSON.stringify(expected)}`);
}

// --- 6. the revision ambiguity is real and still unresolved --------------------
// Recorded because binding the wrong bytes is worse than binding none, and a
// second candidate file is exactly how that happens.
const other = record.newFindingRevisionAmbiguity?.what ?? "";
const otherDigest = (other.match(/sha256 ([0-9a-f]{8,})/) ?? [])[1] ?? "";
check(otherDigest.length >= 8, "the record no longer names the competing digest");
check(entries.some((entry) => String(entry.sha256 ?? "").startsWith(otherDigest)
  && String(entry.state ?? "") === "ND"),
  "the competing North Dakota pardon file this record warns about is no longer in the index");

for (const problem of problems) console.error(`  FAIL  ${problem}`);
if (problems.length) {
  console.error(`\nFAIL verify-nd-sfn-61663-binding-blocker — ${problems.length} of ${checked} checks failed`);
  process.exit(1);
}
console.log(`OK verify-nd-sfn-61663-binding-blocker — ${checked} checks; the blocker is still exactly what this record says it is`);
