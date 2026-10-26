import assert from "node:assert/strict";
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);
const { dispositionFromAnswers, selectComposedRoute } = await import("../src/lib/rcap-engine/composed-route-selector.ts");
const rows = [
  ["Felony conviction", "felony_conviction"],
  ["Misdemeanor conviction", "other_conviction"],
  ["Pardoned conviction", "other_conviction"],
  ["Arrest or citation with no charge filed", "non_conviction"],
  ["Dismissed, no-billed, nolle prosequi, or not prosecuted", "non_conviction"],
  ["Acquitted or found not guilty", "non_conviction"],
  ["Diversion, deferred disposition, supervision, or similar program", "unknown"],
  ["Other conviction or adjudication", "unknown"],
  ["Juvenile adjudication or offense committed as a minor", "unknown"],
  ["I am not sure", "unknown"],
  ["Outcome unknown or record needed", "unknown"],
  ["not a conviction", "unknown"],
  ["", "unknown"]
];
let checked = 0;
for (const [case_outcome, expected] of rows) {
  for (const offense_level of ["Felony", "Misdemeanor", "I am not sure", undefined]) {
    const actual = dispositionFromAnswers({ case_outcome, offense_level });
    assert.equal(actual, expected, `${case_outcome} / charged as ${offense_level}`);
    const selection = selectComposedRoute({ jurisdiction: "IL", pathwayId: "felony-prostitution-relief", disposition: actual });
    assert.equal(selection.status, expected === "felony_conviction" ? "selected" : "route_conditions_unmet");
    // The accepted MS mapping does not acquire a new record-class restriction.
    assert.equal(selectComposedRoute({ jurisdiction: "MS", pathwayId: "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal", disposition: actual }).trackId, "ms-nonconv");
    checked++;
  }
}
assert.equal(dispositionFromAnswers(undefined), "unknown");
assert.equal(dispositionFromAnswers({ case_outcome: { value: "Felony conviction", unknown: true } }), "unknown");
console.log(JSON.stringify({ status: "PASS", checked: checked + 2, scope: "Final record class and composed track boundary; does not prove offense-specific eligibility or fulfillment" }));
