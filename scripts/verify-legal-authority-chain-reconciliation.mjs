#!/usr/bin/env node
/**
 * The two nines stay different nines, and the stale rows stay named.
 *
 * This is not a re-derivation of the reconciliation record — that is generated
 * and `--check`ed. It asserts the two claims a reader needs to trust:
 *
 *   1. The populations are disjoint. If a route ever appears in both, the two
 *      registers really are talking about the same thing and the reconciliation
 *      record's whole answer stops being true.
 *   2. Every ratification row the controlling decisions answered is still named,
 *      and no row is quietly cleared without the decision that clears it.
 *
 * It also refuses the coincidence that started this: if both registers report
 * the same count and the record does not say they are different populations,
 * that is exactly the reading that produced a contradiction where there was
 * none, and it fails rather than passing silently.
 */
import fs from "node:fs";

const record = JSON.parse(fs.readFileSync("data/rcap-ledger/legal-authority-chain-reconciliation.json", "utf8"));
const failures = [];

const research = record.populations.legalResearchTracks;
const ratification = record.populations.ratificationCurrency;

if (research.openNow !== 0) {
  failures.push(`the register reports ${research.openNow} open legal-research track(s); the record's answer assumes zero.`);
}
if (record.disjoint !== true) {
  failures.push(`the populations overlap on ${record.overlap.join(", ")}. The two registers are describing the same routes, so "different questions about different routes" is no longer the answer.`);
}
if (research.trackIds.length === ratification.open && record.disjoint !== true) {
  failures.push("both registers report the same count and the populations are not disjoint, which is the coincidence this record exists to resolve.");
}
if (!Array.isArray(record.answeredByControllingDecisionsSince)) {
  failures.push("answeredByControllingDecisionsSince is missing.");
} else if (record.answeredByControllingDecisionsSince.length === 0 && /stale/.test(record.finding)) {
  failures.push("the finding claims stale rows and names none.");
}

// A row the decisions answered must still be recorded as open by the
// reconciliation, or the record is describing a state that no longer exists.
const reconciliation = JSON.parse(fs.readFileSync("data/rcap-ledger/all51-legal-authority-reconciliation.json", "utf8"));
const stillOpen = new Set(reconciliation.rows
  .filter((row) => row.classification === "LEGAL_RECONFIRMATION_REQUIRED")
  .map((row) => row.pathwayKey));
for (const pathwayKey of record.answeredByControllingDecisionsSince ?? []) {
  if (!stillOpen.has(pathwayKey)) {
    failures.push(`${pathwayKey}: named as an answered-but-still-open row and it is no longer open. Regenerate the reconciliation record.`);
  }
}
if (record.createsApproval !== false) failures.push("this record must not claim to create an approval.");

console.log(`Legal authority chain: ${research.trackIds.length} research tracks (${research.openNow} open) and ${ratification.open} ratification rows, disjoint=${record.disjoint}, ${(record.answeredByControllingDecisionsSince ?? []).length} answered by the 2026-08-28 decisions.`);
if (failures.length > 0) {
  console.error("\nLegal authority chain reconciliation FAILED:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
for (const pathwayKey of record.answeredByControllingDecisionsSince ?? []) {
  console.log(`  STALE BLOCKER  ${pathwayKey} — counsel ratification is recorded as not current, and a 2026-08-28 controlling decision answers it.`);
}
console.log("Two registers, two populations, one current answer each.");
