#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  assertNjCn10557ConvictionPacketAuthorized,
  classifyNjCn10557ConvictionRoute,
  NJ_CN10557_CONVICTION_ROW_MAPPINGS,
  njCn10557RequiredFactIds,
} from "./lib/nj-cn10557-conviction-route.mjs";

const common = Object.freeze({
  "matter.conviction_date": "2020-04-17",
  "matter.charge": "Synthetic conviction",
  "matter.statute_citation": "N.J.S.A. 2C:33-2",
  "matter.final_sentence": "10 days jail, 12 months probation, $250 fine",
  "matter.court": "Municipal",
  "matter.incarceration_term_type": "jail time",
  "matter.incarceration_completion_date": "2020-04-27",
  "matter.probation_completion_date": "2021-04-17",
  "matter.fines_paid_date": "2021-05-03",
  "matter.original_arrest_charge": "Synthetic conviction",
  "matter.original_arrest_statute": "2C:33-2",
  "matter.original_arrest_municipality": "Newark",
  "matter.original_case_number": "SYN-2020-001",
  "matter.parole_applicable": false,
  "nj.disposition_kind": "convicted_or_adjudicated_delinquent",
  "nj.pending_charges": false,
  "nj.prior_criminal_conviction_expungement": false,
  "nj.includes_title_39_matter": false,
  "nj.marijuana_regrading_applies": false,
  "nj.early_pathway_compelling_circumstances": false,
  "nj.outstanding_financial_assessment": false,
  "nj.prosecutor_objection": false,
  "nj.nonexpungeable_offense": false,
  "participant.has_legal_name_change": false,
});
const disorderly = Object.freeze({
  ...common,
  "nj.any_crime_conviction": false,
  "nj.disorderly_or_petty_count": 1,
  "nj.convictions_entered_same_day": false,
  "nj.convictions_closely_related": false,
});
const indictable = Object.freeze({
  ...common,
  "nj.indictable_conviction_count": 1,
  "nj.disorderly_or_petty_count": 2,
  "nj.subsequent_crime_conviction": false,
  "nj.convictions_single_judgment_or_same_day": false,
  "nj.convictions_closely_related": false,
  "nj.drug_crime_compelling_circumstances_route": false,
});

assert.equal(Object.keys(NJ_CN10557_CONVICTION_ROW_MAPPINGS).length, 9);
assert.equal(njCn10557RequiredFactIds("nj_disorderly_persons-set").length, 28);
assert.equal(njCn10557RequiredFactIds("nj_indictable_conviction-set").length, 30);
const disorderlyAuthorized = assertNjCn10557ConvictionPacketAuthorized(
  "nj_disorderly_persons-set", disorderly);
assert.equal(disorderlyAuthorized.branch, "DISORDERLY_OR_PETTY_COUNT_AT_MOST_FIVE");
assert.deepEqual(disorderlyAuthorized.authorizedSelections, ["guilty"]);
assert.equal(classifyNjCn10557ConvictionRoute("nj_disorderly_persons-set", {
  ...disorderly, "nj.disorderly_or_petty_count": 8, "nj.convictions": undefined,
  "nj.convictions_entered_same_day": true, "nj.relationship_records_verified": true,
  "nj.related_conviction_records": [{ caseNumber: "SYN-1", convictionDate: "2020-04-17" },
    { caseNumber: "SYN-2", convictionDate: "2020-04-17" }],
}).branch, "SAME_DAY_CONVICTIONS");
assert.equal(classifyNjCn10557ConvictionRoute("nj_disorderly_persons-set", {
  ...disorderly, "nj.disorderly_or_petty_count": 8, "nj.convictions_closely_related": true,
  "nj.relationship_records_verified": true,
  "nj.related_conviction_records": [{ caseNumber: "SYN-1", convictionDate: "2020-04-17" },
    { caseNumber: "SYN-2", convictionDate: "2020-04-18" }],
}).branch, "CLOSELY_RELATED_SEQUENCE");
const indictableAuthorized = assertNjCn10557ConvictionPacketAuthorized(
  "nj_indictable_conviction-set", indictable);
assert.equal(indictableAuthorized.branch, "ONE_CRIME_WITH_AT_MOST_THREE_DISORDERLY_OR_PETTY_OFFENSES");
assert.deepEqual(indictableAuthorized.authorizedSelections, ["guilty", "seekJuvNever"]);

const refused = [
  [{ ...disorderly, "matter.statute_citation": undefined }, "MISSING_REQUIRED_FACTS"],
  [{ ...disorderly, "nj.disposition_kind": "dismissed" }, "WRONG_DISPOSITION_BRANCH"],
  [{ ...disorderly, "nj.pending_charges": true }, "SELF_HELP_STOP"],
  [{ ...disorderly, "nj.pending_charges": "unknown" }, "INVALID_FACT"],
  [{ ...disorderly, "matter.conviction_date": "2020-02-31" }, "INVALID_FACT"],
  [{ ...disorderly, "matter.fines_paid_date": "UNKNOWN" }, "INVALID_FACT"],
  [{ ...disorderly, "matter.probation_completion_date": "2099-01-01" }, "INVALID_CHRONOLOGY"],
  [{ ...disorderly, "matter.incarceration_completion_date": "2010-01-01" }, "INVALID_CHRONOLOGY"],
  [{ ...disorderly, "matter.fines_paid_date": "2026-08-29" }, "WAITING_PERIOD_NOT_SATISFIED"],
  [{ ...disorderly, "matter.parole_applicable": true }, "MISSING_REQUIRED_FACTS"],
  [{ ...disorderly, "matter.parole_applicable": true,
    "matter.parole_completion_date": "2026-08-29" }, "WAITING_PERIOD_NOT_SATISFIED"],
  [{ ...disorderly, "matter.final_sentence": { unknown: true } }, "INVALID_FACT"],
  [{ ...disorderly, "nj.outstanding_financial_assessment": true }, "SELF_HELP_STOP"],
  [{ ...disorderly, "nj.prosecutor_objection": true }, "SELF_HELP_STOP"],
  [{ ...disorderly, "nj.nonexpungeable_offense": true }, "SELF_HELP_STOP"],
  [{ ...disorderly, "nj.any_crime_conviction": true }, "WRONG_ROUTE"],
  [{ ...disorderly, "nj.disorderly_or_petty_count": 6 }, "NO_SUPPORTED_BRANCH"],
  [{ ...disorderly, "nj.marijuana_regrading_applies": true }, "SELF_HELP_STOP"],
  [{ ...disorderly, "nj.early_pathway_compelling_circumstances": true }, "SELF_HELP_STOP"],
  [{ ...disorderly, "participant.has_legal_name_change": true }, "SOURCE_ALIAS_STOP"],
  [{ ...indictable, "nj.indictable_conviction_count": 0 }, "WRONG_ROUTE"],
  [{ ...indictable, "nj.subsequent_crime_conviction": true }, "NO_SUPPORTED_BRANCH"],
  [{ ...indictable, "nj.drug_crime_compelling_circumstances_route": true }, "SELF_HELP_STOP"],
  [{ ...indictable, "matter.incarceration_term_type": "none" }, "SOURCE_VALUE_UNSUPPORTED"],
  [{ ...indictable, "matter.statute_citation": "2C:15-1" }, "NONEXPUNGEABLE_OFFENSE"],
  [{ ...indictable, "nj.indictable_conviction_count": 2,
    "nj.convictions_single_judgment_or_same_day": true }, "UNVERIFIED_RELATIONSHIP"],
];
for (const [facts, state] of refused) {
  const familyId = Object.hasOwn(facts, "nj.indictable_conviction_count")
    ? "nj_indictable_conviction-set" : "nj_disorderly_persons-set";
  const result = classifyNjCn10557ConvictionRoute(familyId, facts);
  assert.equal(result.state, state);
  assert.deepEqual(result.authorizedSelections, []);
  assert.throws(() => assertNjCn10557ConvictionPacketAuthorized(familyId, facts));
}

console.log("NJ_CN10557_CONVICTION_ROUTE_PASS assertions=47");
