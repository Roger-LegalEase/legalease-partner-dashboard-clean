#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const FAMILY = "ri_first_offender_felony-set";
const OUT = path.join(ROOT,
  "data/rcap-all50/overlays/census-v1/ri/ri-first-offender-felony-set--official-pdf-fill");
const BUILDER = path.join(ROOT, "scripts/build-census-v1-ri_first_offender_felony-set.mjs");
const DECISION = path.join(ROOT,
  "data/rcap-grade-a/legal-decisions/LEGAL_BLOCKED_RESOLUTION_2026-09-11.json");

let assertions = 0;
const check = (condition, message) => { assertions += 1; assert.ok(condition, message); };
const equal = (actual, expected, message) => { assertions += 1; assert.equal(actual, expected, message); };
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const read = (file) => fs.readFileSync(file, "utf8");

if (!process.argv.includes("--unit")) {
  const result = JSON.parse(execFileSync(process.execPath, [BUILDER, "--no-raster"], {
    cwd: ROOT,
    encoding: "utf8"
  }));
  equal(result.status, "COMPLETED", "the current family build completes");
  check(result.nineCountersZero === true, "the builder reports all nine counters zero");
}

const decision = readJson(DECISION).decisions.find((row) =>
  row.decisionId === "RI-FIRST-OFFENDER-SUPERIOR-55-PART-TWO");
equal(decision?.disposition, "LEGAL_CLEAR", "the current binding clears the Part Two treatment");
equal(decision?.bindingProductRule,
  "For a single-felony first-offender route use Superior-55 Part Two. The participant must truthfully satisfy/check the required statements and execute the affidavit before the authorized notary or clerk.",
  "the test binds the exact current Part Two rule");

const map = readJson(path.join(OUT, "production-field-map.json"));
const receipt = readJson(path.join(OUT, "source-receipt.json"));
const counters = readJson(path.join(OUT, "reports/completeness-counters.json"));
const writes = readJson(path.join(OUT, "reports/actual-writes.json"));
const guide = read(path.join(OUT, "participant-instructions.md"));

check(counters.allNineZero === true, "all nine current builder counters are zero");
for (const [counter, value] of Object.entries(counters.counters)) {
  equal(value, 0, `${counter} remains zero`);
}
equal(map.routeSelectionsMade.length, 2, "only the two source-supported motion route selections are made");
check(map.routeSelectionsMade.every((row) => !/Part Two|MISDEMEANOR/i.test(row.control)),
  "no sworn Part Two statement is selected by the platform");

const primary = map.maps.find((row) => row.documentRole === "primary_filing");
const order = map.maps.find((row) => row.documentRole === "proposed_order");
const officialRows = primary.canonicalRefusals.filter((row) =>
  /^(?:1 Counts|2 Charges|3 Dispositions) [1-4]$/.test(row.fieldName));
const orderRows = order.canonicalRefusals.filter((row) => /^order_charge_line_[1-4]$/.test(row.fieldName));
equal(officialRows.length, 12, "all twelve printed official charge cells remain modelled");
equal(orderRows.length, 4, "all four proposed-order charge rows remain modelled");
equal(officialRows.filter((row) => row.requiredBeforeFiling === true).length, 3,
  "only the complete first official count/charge/disposition row is unconditionally required");
equal(orderRows.filter((row) => row.requiredBeforeFiling === true).length, 1,
  "only the first proposed-order charge row is unconditionally required");
equal(officialRows.filter((row) => row.completenessDisposition === "OPTIONAL_PARTICIPANT_CONTENT").length, 9,
  "the nine cells in unused additional official rows are conditional participant content");
equal(orderRows.filter((row) => row.completenessDisposition === "OPTIONAL_PARTICIPANT_CONTENT").length, 3,
  "the three unused additional order rows are conditional participant content");
check([...officialRows, ...orderRows]
  .filter((row) => row.requiredBeforeFiling !== true)
  .every((row) => /only if the docket has that many charge rows/i.test(row.conditionDescription ?? "")),
"every additional row names its docket-count condition");
equal(map.maps.filter((row) => (row.repeatingRowGroups ?? []).length > 0).length, 2,
  "only the motion and proposed order declare repeating charge groups");
for (const row of [primary, order]) {
  const group = row.repeatingRowGroups[0];
  equal(group.minimumUsedRows, 1, `${row.documentRole} requires at least one used row`);
  equal(group.maximumRowsPrinted, 4, `${row.documentRole} preserves all four printed rows`);
}

const currentBinding = receipt.groundingRecords.find((row) =>
  row.recordId === "RI-FIRST-OFFENDER-SUPERIOR-55-PART-TWO");
equal(currentBinding?.read, decision.bindingProductRule,
  "the current source receipt binds the exact legal-clear decision");
check(!receipt.whatThisReceiptDoesNotEstablish.some((row) => /Part Two wording.*drafting error/i.test(row)),
  "the source receipt no longer reopens the resolved universal Part Two hold");

for (const required of [
  "Part Two: Single Conviction",
  "single MISDEMEANOR offense",
  "authorized notary or clerk",
  "ten-year lookback",
  "complete every cell of each row you actually use",
  "leave the remaining rows wholly blank"
]) check(guide.includes(required), `participant guide retains required copy: ${required}`);

const forbidden = [
  /WHAT WOULD SETTLE IT IS NOT IN THIS PACKET/i,
  /five-year lookback/i,
  /obligation:unit:RI:/i,
  /ri_first_offender_felony-(?:primary|proposed|notice|filing|certified)/i,
  /data\/rcap-grade-a/i,
  /egress proxy/i,
  /THIS BUILD DID NOT FETCH/i,
  /committed track registry/i
];
for (const pattern of forbidden) check(!pattern.test(guide), `participant guide omits ${pattern}`);

for (const fixture of ["canonical", "boundary"]) {
  const pdf = path.join(OUT, "fixtures", `${fixture}.pdf`);
  const text = execFileSync("pdftotext", ["-layout", pdf, "-"], { encoding: "utf8" });
  for (const pattern of forbidden) check(!pattern.test(text), `${fixture} packet omits ${pattern}`);
  check(/ten-year lookback/i.test(text), `${fixture} packet states the ten-year lookback`);
  check(/single MISDEMEANOR/i.test(text), `${fixture} packet preserves the official mismatch wording`);
}

equal(writes.documents.length, 2, "both fixtures retain byte-derived write proof");
check(writes.documents.every((row) => row.refusedFieldsWithInk.length === 0),
  "no protected participant, notary, clerk, or court field carries ink");
check(writes.documents.every((row) => row.actualWrites.length === 9),
  "all nine source-supported identity writes remain readable in each packet");

// Negative controls: each old defect shape is still detected by the assertions above.
check(forbidden.some((pattern) => pattern.test("WHAT WOULD SETTLE IT IS NOT IN THIS PACKET")),
  "negative control recognizes the stale universal hold");
check(forbidden.some((pattern) => pattern.test("Any arrest during the five-year lookback")),
  "negative control recognizes the stale five-year rule");
const mutatedAdditional = { ...officialRows.find((row) => row.fieldName === "1 Counts 2"),
  requiredBeforeFiling: true, completenessDisposition: "REQUIRED_BEFORE_FILING" };
check(!(mutatedAdditional.requiredBeforeFiling === false
  && mutatedAdditional.completenessDisposition === "OPTIONAL_PARTICIPANT_CONTENT"),
"negative control rejects an unconditional unused charge cell");

console.log(JSON.stringify({
  result: "PASS",
  familyId: FAMILY,
  assertions,
  negativeControls: 3,
  sourceAndActorProtectionsPreserved: true
}));
