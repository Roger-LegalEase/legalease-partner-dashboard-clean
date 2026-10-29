import assert from "node:assert/strict";
import fs from "node:fs";
import { register } from "node:module";

register("./lib/ts-esm-loader.mjs", import.meta.url);
const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { evaluateScreening, isCourtFiledPetitionRoute } = await import("../src/lib/rcap-engine/evaluator.ts");
const { getCurrentFulfillmentRecord } = await import("../src/lib/rcap/fulfillment/grade-a-registry.ts");
const { admitCommercialAction, COMMERCIAL_ADMISSION_POINTS } = await import("../src/lib/rcap/fulfillment/grade-a-authority.ts");

const profile = getProfileByJurisdiction("IA");
const originalProfile = JSON.stringify(profile);
const routes = [
  ["minor-prostitution-7251", "Prostitution conviction expungement for conduct while under 18 under Iowa Code § 725.1", "725.1(1)(a)"],
  ["misdemeanor-901c3", "Misdemeanor conviction expungement under Iowa Code § 901C.3", "714.2(5)"],
  ["public-intoxication-12346", "Public-intoxication conviction expungement under Iowa Code § 123.46", "123.46(2)"],
  ["underage-alcohol-12347", "Underage-alcohol conviction expungement under Iowa Code § 123.47", "123.47(3)"]
];
// Independent coherent facts, not the old inventory witness (which incorrectly
// describes these conviction routes as dismissals and puts the minor at age30).
const facts = ([id, context, charge]) => ({
  ownership_scope: "Yes", jurisdiction_scope: "State or local",
  case_outcome: "Misdemeanor conviction", offense_level: "Misdemeanor",
  possible_pathway_context: context, age_at_offense: id === routes[0][0] ? "17" : "20",
  prior_relief: "No", financial_obligations: "Yes", record_documents: "Yes",
  county: "Johnson", court: "Iowa District Court for Johnson County",
  charge, case_identifier: "SYNTHETIC-IA-0001", conviction_date: "2015-01-15",
  disposition_date: "2015-01-15", sentence_completion_actual_date: "2015-01-15",
  sentence_completion_date: "Yes", pending_cases: "No",
  new_convictions_during_waiting_period: "No", special_preconditions_confirmed: "Yes"
});
const evaluate = answers => evaluateScreening({ jurisdiction: "IA", profileVersion: profile.profileVersion, answers });
const failures = [];
let checks = 0;
function check(label, fn) {
  try { fn(); checks++; console.log("PASS " + label); }
  catch (error) { failures.push(label); console.error("FAIL " + label + ": " + error.message); }
}
function held(evaluation, id) {
  assert.equal(evaluation.pathwayId, id);
  assert.equal(evaluation.paymentAllowed, false);
  assert(!["packet_ready", "packet_ready_with_caution"].includes(evaluation.resultCode));
}
const codes = e => e.reasons.map(r => r.code);

check("existing Form5 application is a court route, not automatic relief", () => {
  const pathway = profile.pathways.find(p => p.id === routes[0][0]);
  assert.equal(pathway.routeType, "court_filing");
  assert.equal(pathway.filingRequired, true);
  assert.equal(pathway.automatic, false);
  assert.equal(isCourtFiledPetitionRoute(profile, pathway), true);
});
check("existing IA memo distinguishes the exact court-debt requirements", () => {
  const memo = JSON.parse(fs.readFileSync("data/record-clearing/legal-design-intake/IA.memo.json"));
  for (const id of ["ia-7251", "ia-12346", "ia-12347"]) {
    const track = memo.tracks.find(t => t.trackId === id);
    assert(JSON.stringify(track).includes("Rule 2.83(3)"));
    assert(JSON.stringify(track).includes("Court debt is not a precondition"));
  }
  assert(memo.tracks.find(t => t.trackId === "ia-901c3").controllingAuthority.summary.includes("financial obligations are paid"));
});

for (const row of routes) {
  const [id] = row, base = facts(row), key = "IA:" + id;
  const paid = evaluate(base), unpaid = evaluate({ ...base, financial_obligations: "No" });
  check(id + " paid case remains a source-review hold", () => {
    held(paid, id); assert.equal(paid.resultCode, "needs_review");
    assert(codes(paid).includes("ia.waiting_rule_not_executed"));
  });
  check(id + " unpaid answer follows only its applicable requirement", () => {
    held(unpaid, id);
    if (id === "misdemeanor-901c3") {
      assert.equal(unpaid.resultCode, "not_yet");
      assert(codes(unpaid).includes("ia.timing_or_completion_blocker"));
    } else {
      assert.deepEqual(unpaid, paid);
    }
  });
  check(id + " explicit unknown debt is preserved for source review", () => {
    const answers = { ...base, financial_obligations: "I am not sure" }, before = structuredClone(answers);
    const e = evaluate(answers); held(e, id); assert.equal(e.resultCode, "needs_review");
    assert(codes(e).includes("ia.source_fact_unknown")); assert.deepEqual(answers, before);
  });
  check(id + " absent debt is never supplied as paid", () => {
    const answers = { ...base }; delete answers.financial_obligations;
    const e = evaluate(answers); assert.equal(e.paymentAllowed, false);
    assert.equal(e.resultCode, "needs_more_info");
    assert(e.missingQuestionIds.includes("financial_obligations"));
    assert(!Object.hasOwn(answers, "financial_obligations"));
  });
  for (const [label, patch] of [["pending case", { pending_cases: "Yes" }], ["later conviction", { new_convictions_during_waiting_period: "Yes" }], ["incomplete requirements", { sentence_completion_date: "No" }]]) {
    check(id + " retains " + label + " hold", () => {
      const e = evaluate({ ...base, ...patch }); held(e, id);
      assert.equal(e.resultCode, "not_yet"); assert(codes(e).includes("ia.timing_or_completion_blocker"));
    });
  }
  check(id + " owner exclusion remains a hard stop", () => {
    const e = evaluate({ ...base, ownership_scope: "No" });
    assert.equal(e.resultCode, "hard_stop"); assert.equal(e.paymentAllowed, false);
    assert.equal(e.packetPlan, undefined);
  });
  for (const age of ["17", "18", "I am not sure"]) {
    check(id + " age " + age + " cannot create missing eligibility or payment", () => {
      const e = evaluate({ ...base, age_at_offense: age }); held(e, id);
      assert.equal(e.resultCode, "needs_review");
      assert(codes(e).includes(age === "I am not sure" ? "ia.source_fact_unknown" : "ia.waiting_rule_not_executed"));
    });
  }
  check(id + " missing conviction date cannot become packet ready", () => {
    const answers = { ...base }; delete answers.conviction_date; delete answers.disposition_date;
    delete answers.sentence_completion_actual_date;
    const e = evaluate(answers); held(e, id);
    assert(["needs_review", "needs_more_info"].includes(e.resultCode));
  });
  check(id + " unknown timing fact remains held", () => {
    const e = evaluate({ ...base, sentence_completion_date: "I am not sure" }); held(e, id);
    assert(["needs_review", "needs_more_info"].includes(e.resultCode));
  });
  check(id + " all commercial admission points still deny without a fulfillment record", () => {
    const record = getCurrentFulfillmentRecord(key); assert.equal(record, null);
    for (const admissionPoint of COMMERCIAL_ADMISSION_POINTS) {
      const decision = admitCommercialAction({ admissionPoint, request: { routeId: key, jurisdiction: "IA", packetFamilyId: null }, record, observation: null });
      assert.equal(decision.admitted, false, admissionPoint);
      assert.equal(decision.authority.state, "NO_RECORD", admissionPoint);
      assert.equal(decision.authority.authorized, false, admissionPoint);
    }
  });
}
check("classification exception respects the existing automatic/no-filing structural veto", () => {
  const p = profile.pathways.find(p => p.id === routes[0][0]);
  assert.equal(isCourtFiledPetitionRoute(profile, { ...p, automatic: true, filingRequired: false }), false);
});
check("same7251 ID in another jurisdiction gets no Iowa exception", () => {
  const p = profile.pathways.find(p => p.id === routes[0][0]);
  const other = { ...profile, jurisdiction: { ...profile.jurisdiction, code: "ZZ" } };
  assert.equal(isCourtFiledPetitionRoute(other, p), false);
});
check("unknown route spelling cannot inherit the exact7251 exception", () => {
  const p = profile.pathways.find(p => p.id === routes[0][0]);
  assert.equal(isCourtFiledPetitionRoute(profile, { ...p, id: p.id + "-other" }), false);
});
check("all IA profile/source/approval objects remain immutable", () => assert.equal(JSON.stringify(profile), originalProfile));
console.log(`${checks}/${checks + failures.length} Iowa existing-route controls passed; no full statutory predicate, packet regeneration, approval or production acceptance is asserted.`);
if (failures.length) process.exitCode = 1;
