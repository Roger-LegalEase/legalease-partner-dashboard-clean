import assert from "node:assert/strict";
import fs from "node:fs";
import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);
const { evaluateScreening, InvalidAnswerError } = await import("../src/lib/rcap-engine/evaluator.ts");
const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const witnesses = JSON.parse(fs.readFileSync("data/rcap-ledger/public-witness-answer-sets.json", "utf8")).witnesses;
const profile = getProfileByJurisdiction("DE");
const base = witnesses.find(row => row.jurisdiction === "DE").finalAnswers;
let checked = 0;
// Section 4373(b) is not a universal bar: § 4374(a)(2) expressly
// addresses its misdemeanors. Broad legacy answers lack exact offense facts.
for (const pathway of profile.pathways) {
  for (const context of [pathway.label, undefined]) {
    for (const category of ["Domestic violence", "Violent offense", "Other named excluded offense", "I am not sure"]) {
      const answers = { ...base, state_exclusion_categories: [category] };
      if (context) answers.possible_pathway_context = context;
      else delete answers.possible_pathway_context;
      const result = evaluateScreening({ jurisdiction: "DE", profileVersion: profile.profileVersion, matterId: "synthetic-de-mechanism", answers });
      assert.equal(result.resultCode, "needs_review", `${pathway.id}: ${category}`);
      assert.equal(result.paymentAllowed, false);
      assert.ok(result.reasons.some(reason => ["de.state_exclusion_scope_unknown", "de.state_exclusion_unknown"].includes(reason.code)));
      checked++;
    }
  }
}
// Conflicting multi-select answers cannot use None to erase a selected concern.
for (const categories of [["None of these", "Domestic violence"], ["Domestic violence", "I am not sure"]]) {
  assert.throws(() => evaluateScreening({ jurisdiction: "DE", profileVersion: profile.profileVersion, matterId: "synthetic-de-conflict", answers: { ...base, state_exclusion_categories: categories } }), InvalidAnswerError);
  checked++;
}
console.log(JSON.stringify({ status: "PASS", checked, scope: "Delaware broad category answers do not establish a statewide exclusion; all remain payment-refused pending exact facts", legalEligibilityOrDeliveryProven: false }));
