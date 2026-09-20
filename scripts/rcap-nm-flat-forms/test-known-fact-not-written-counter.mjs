#!/usr/bin/env node
import assert from "node:assert/strict";

import { countCompleteness } from "./nm-packet-host.mjs";

const artifact = [{ file: "fixture.pdf", documents: ["NM-TEST"] }];
const base = {
  formNumber: "NM-TEST", documentId: "NM-TEST",
  canonicalWrites: [],
  selectionControls: [],
  canonicalRefusals: []
};

const held = countCompleteness([{
  ...base,
  canonicalRefusals: [{
    field: "NM-TEST/p1-address", fieldName: "address", document: "NM-TEST", page: 1,
    effectiveLabel: "Mailing Address",
    reason: "the platform holds the value but the measured line refused it",
    completenessDisposition: "KNOWN_FACT_NOT_WRITTEN",
    requiredBeforeFiling: false,
    theBuildHoldsAValueForThisBlank: true
  }]
}], [], artifact, "");
assert.equal(held.counters.knownRequiredFieldsMissing, 1);
assert.equal(held.findings.filter((row) => row.counter === "knownRequiredFieldsMissing").length, 1);
assert.equal(held.ledger[0].disposition, "KNOWN_FACT_NOT_WRITTEN");

const protectedOnly = countCompleteness([{
  ...base,
  canonicalRefusals: [{
    field: "NM-TEST/p1-judge", fieldName: "judge", document: "NM-TEST", page: 1,
    effectiveLabel: "Judge Signature", reason: "the judge signs",
    category: "court_prosecutor_clerk_or_agency_owned", requiredBeforeFiling: false
  }]
}], [], artifact, "");
assert.equal(protectedOnly.counters.knownRequiredFieldsMissing, 0);
assert.equal(Object.values(protectedOnly.counters).reduce((sum, count) => sum + count, 0), 0);

console.log("PASS NM known-fact omission counter: 5 assertions");
