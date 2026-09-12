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
  "nj.disposition_kind": "convicted_or_adjudicated_delinquent",
  "nj.pending_charges": false,
  "nj.prior_criminal_conviction_expungement": false,
  "nj.includes_title_39_matter": false,
  "nj.marijuana_regrading_applies": false,
  "nj.early_pathway_compelling_circumstances": false,
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
assert.equal(njCn10557RequiredFactIds("nj_disorderly_persons-set").length, 20);
assert.equal(njCn10557RequiredFactIds("nj_indictable_conviction-set").length, 22);
const disorderlyAuthorized = assertNjCn10557ConvictionPacketAuthorized(
  "nj_disorderly_persons-set", disorderly);
assert.equal(disorderlyAuthorized.branch, "DISORDERLY_OR_PETTY_COUNT_AT_MOST_FIVE");
assert.deepEqual(disorderlyAuthorized.authorizedSelections, ["guilty"]);
assert.equal(classifyNjCn10557ConvictionRoute("nj_disorderly_persons-set", {
  ...disorderly, "nj.disorderly_or_petty_count": 8, "nj.convictions_entered_same_day": true,
}).branch, "SAME_DAY_CONVICTIONS");
assert.equal(classifyNjCn10557ConvictionRoute("nj_disorderly_persons-set", {
  ...disorderly, "nj.disorderly_or_petty_count": 8, "nj.convictions_closely_related": true,
}).branch, "CLOSELY_RELATED_SEQUENCE");
const indictableAuthorized = assertNjCn10557ConvictionPacketAuthorized(
  "nj_indictable_conviction-set", indictable);
assert.equal(indictableAuthorized.branch, "ONE_CRIME_WITH_AT_MOST_THREE_DISORDERLY_OR_PETTY_OFFENSES");
assert.deepEqual(indictableAuthorized.authorizedSelections, ["guilty", "seekJuvNever"]);

const refused = [
  [{ ...disorderly, "matter.statute_citation": undefined }, "MISSING_REQUIRED_FACTS"],
  [{ ...disorderly, "nj.disposition_kind": "dismissed" }, "WRONG_DISPOSITION_BRANCH"],
  [{ ...disorderly, "nj.pending_charges": true }, "SELF_HELP_STOP"],
  [{ ...disorderly, "nj.any_crime_conviction": true }, "WRONG_ROUTE"],
  [{ ...disorderly, "nj.disorderly_or_petty_count": 6 }, "NO_SUPPORTED_BRANCH"],
  [{ ...disorderly, "nj.marijuana_regrading_applies": true }, "SELF_HELP_STOP"],
  [{ ...disorderly, "nj.early_pathway_compelling_circumstances": true }, "SELF_HELP_STOP"],
  [{ ...disorderly, "participant.has_legal_name_change": true }, "SOURCE_ALIAS_STOP"],
  [{ ...indictable, "nj.indictable_conviction_count": 0 }, "WRONG_ROUTE"],
  [{ ...indictable, "nj.subsequent_crime_conviction": true }, "NO_SUPPORTED_BRANCH"],
  [{ ...indictable, "nj.drug_crime_compelling_circumstances_route": true }, "SELF_HELP_STOP"],
  [{ ...indictable, "matter.incarceration_term_type": "none" }, "SOURCE_VALUE_UNSUPPORTED"],
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
