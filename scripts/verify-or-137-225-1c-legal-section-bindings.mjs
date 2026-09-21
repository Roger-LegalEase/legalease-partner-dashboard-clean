#!/usr/bin/env node

/**
 * The Oregon section bindings say what the memo says, or they fail.
 *
 * `2026-09-21-or-137-225-1c-legal-section-bindings.json` writes five of the
 * seven legal sections the Oregon packet specification is missing. Those five
 * are statements a participant's packet will eventually print as law, so each
 * one carries the memo sentence it came from, and each of those sentences is
 * checked to still be in the memo, verbatim.
 *
 * That is the whole point of the control. A binding record is the easiest place
 * in this repository for a plausible-sounding legal statement to enter: it looks
 * like evidence, it cites subsections, and nothing downstream re-reads the
 * source. So the source is re-read here.
 *
 * The two unbound sections are checked just as hard. `statutoryAuthority` is
 * unbound because the 2026-09-20 subsection record limits itself to what the
 * memo says rather than what the enrolled statute says, and `copyRequirements`
 * is unbound because no source states a copy count. Either one silently
 * flipping to bound would be the failure this file exists to catch.
 *
 * The memo is committed, so nothing here skips.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const RECORD = "data/record-clearing/legal-decisions/2026-09-21-or-137-225-1c-legal-section-bindings.json";
const MEMO = "data/record-clearing/legal-design-intake/OR.memo.json";
const GENERATOR = "scripts/generate-rcap-oregon-packet-specification.mjs";
const ROUTE_KEY = "OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c";
const BOUND = ["filingDestination", "feeAndWaiver", "serviceAndNotice", "postFilingTimeline", "hearingAndObjectionStops"];
const UNBOUND = ["statutoryAuthority", "copyRequirements"];

const read = (relative) => JSON.parse(fs.readFileSync(path.join(ROOT, relative), "utf8"));
const normalize = (value) => String(value).replace(/\s+/g, " ").trim();

const record = read(RECORD);
const memo = read(MEMO);
const generator = fs.readFileSync(path.join(ROOT, GENERATOR), "utf8");

const problems = [];
let checked = 0;
const check = (ok, message) => { checked += 1; if (!ok) problems.push(message); };

// The whole memo track, flattened once: a basis quote may come from rules,
// from a component note or from anywhere else the track states the rule.
const track = (memo.tracks ?? []).find((entry) => (entry.id ?? entry.trackId) === record.memoTrack) ?? null;
check(Boolean(track), `the memo no longer carries track ${record.memoTrack}`);
const haystack = track ? normalize(JSON.stringify(track)) : "";

check(record.routeKey === ROUTE_KEY, "the record no longer binds the route this verifier covers");

// --- 1. every bound section is traceable to the memo, verbatim ----------------
for (const key of BOUND) {
  const section = record.sections?.[key] ?? null;
  check(section?.bound === true, `${key} is no longer bound`);
  check(typeof section?.statement === "string" && section.statement.length > 40,
    `${key} has no usable statement`);
  check(Array.isArray(section?.authority) && section.authority.length > 0,
    `${key} binds without naming an authority`);
  check(section?.authority?.every((citation) => /^ORS \d/.test(citation)),
    `${key} cites something that is not an ORS provision`);
  // The teeth: the sentence the binding rests on must still be in the memo.
  check(typeof section?.basisQuote === "string" && section.basisQuote.length > 0
    && haystack.includes(normalize(section.basisQuote)),
    `the basis quote for ${key} is not verbatim in the memo track; the binding no longer rests on the source it cites`);
}
check(Object.values(record.sections ?? {}).filter((section) => section.bound).length === BOUND.length,
  `the record binds a different number of sections than the ${BOUND.length} this verifier knows about`);

// --- 2. the two unbound sections stay unbound, with their reasons -------------
for (const key of UNBOUND) {
  const section = record.sections?.[key] ?? null;
  check(section?.bound === false, `${key} is now bound; it may not be until its own source is read`);
  check(typeof section?.whyNot === "string" && section.whyNot.length > 40,
    `${key} is unbound without recording why`);
}
check(/proves what the memo says, not what the enrolled statute says/i
  .test(String(record.sections?.statutoryAuthority?.whyNot ?? "")),
  "the record no longer carries the evidentiary limit that keeps statutoryAuthority unbound");
check(/binding those five must not be read as having settled this one/i
  .test(String(record.sections?.statutoryAuthority?.doNotInfer ?? "")),
  "the record no longer warns that binding the procedural sections does not settle the controlling subsection");

// --- 3. the proposed order is filled, never composed --------------------------
const order = record.proposedOrderRule ?? {};
check(/it never composes one/i.test(String(order.rule ?? "")),
  "the record no longer forbids composing a proposed order");
check(/never completes the signature or the court's findings/i.test(String(order.theCourtCompletesIt ?? "")),
  "the record no longer states that the court completes the order");
check(/do not draft a custom proposed order -- stands/i.test(String(order.consistentWithTheEarlierRecord ?? "")),
  "the record no longer carries forward the earlier disposition against a custom proposed order");

// --- 4. the generator carries the record rather than writing law --------------
check(generator.includes(RECORD),
  "the generator no longer reads this binding record");
check(/binds \$\{bindings\.routeKey\}, not \$\{ROUTE_KEY\}/.test(generator),
  "the generator no longer refuses a binding record written for another route");
check(/legalSectionsBound: unboundLegalSections\.length === 0/.test(generator),
  "legalSectionsBound is no longer computed; a hardcoded value becomes a lie the day the last section binds");
check(!/legalSectionsBound: false/.test(generator),
  "the generator still hardcodes legalSectionsBound");
check(/without a statement and authority/.test(generator),
  "the generator no longer refuses a section bound without a statement and an authority");

// --- 5. five of seven is not composable, and the record says so ---------------
const status = record.statusOfThisRecord ?? {};
check(status.sectionsBound === BOUND.length && status.sectionsLeftUnbound === UNBOUND.length,
  "the record's own count no longer matches its sections");
check(status.legalSectionsBoundOverall === false,
  "the record now claims the specification's legal sections are bound overall");
check(/no packet may be composed from this specification/i.test(String(status.readThisFirst ?? "")),
  "the record no longer warns that a partly bound specification is not composable");
check(/is not hand-edited/i.test(String(record.specificationNotRegenerated?.notFixedHere ?? "")),
  "the record no longer refuses to hand-edit the generated specification");

// --- 6. no authority it has not earned ---------------------------------------
for (const [field, expected] of [["opensAnyRoute", false], ["isCounselApproval", false],
  ["createsOutputApproval", false], ["productionAuthorized", false], ["commercialRoutesOpened", 0]]) {
  check(record[field] === expected, `${field} is no longer ${JSON.stringify(expected)}`);
}

for (const problem of problems) console.error(`  FAIL  ${problem}`);
if (problems.length) {
  console.error(`\nFAIL verify-or-137-225-1c-legal-section-bindings — ${problems.length} of ${checked} checks failed`);
  process.exit(1);
}
console.log(`OK verify-or-137-225-1c-legal-section-bindings — ${checked} checks; five sections still rest on memo text that is still there, and two are still honestly unbound`);
