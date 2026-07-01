import { register } from "node:module";

// Both-direction proof for routes moved from HELD_GUIDANCE to the
// CORRECTED_AWAITING_RECONFIRM tier. These routes are BUILT (route-specific
// wait/anchor/gates corrected) but the $50 clamp stays SHUT pending Lawrence's
// ratification. The proof therefore demonstrates:
//   - qualifying + wait satisfied  -> needs_review + lawrence_reconfirmation_required, payment=false
//     (reaches the reconfirm hold: not a false sell, not a false guidance/exclusion drop)
//   - just-under wait               -> not_yet, payment=false
//   - just-over wait                -> needs_review (reconfirm hold), payment=false
//   - non-qualifying (pending case) -> fails closed (not_yet/needs_review/likely_not_eligible/needs_more_info), payment=false
//   - payment is ALWAYS false (clamp shut for the whole tier)
process.env.RCAP_EVALUATOR_TODAY = "2026-07-01";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");
const { evaluateScreening } = await import("../src/lib/rcap-engine/evaluator.ts");

const TODAY = new Date("2026-07-01T00:00:00.000Z");
const failures = [];
const rows = [];

// Each route: the pathway to route to (by label regex), the route's OWN corrected
// wait, the case_outcome/offense that select it. wait:{value,unit} or null for event-based.
const ROUTES = [
  // Missouri
  { code: "MO", route: /610-140/, name: "MO 610.140 felony 3yr", wait: { value: 3, unit: "years" }, caseOutcome: "Felony conviction", offenseLevel: "Felony" },
  { code: "MO", route: /610-140/, name: "MO 610.140 misdemeanor 1yr", wait: { value: 1, unit: "years" }, caseOutcome: "Misdemeanor conviction", offenseLevel: "Misdemeanor" },
  { code: "MO", route: /610-130/, name: "MO 610.130 first-DWI 10yr", wait: { value: 10, unit: "years" }, caseOutcome: "Misdemeanor conviction", offenseLevel: "Misdemeanor" },
  { code: "MO", route: /610-145/, name: "MO 610.145 mistaken-identity event", wait: null, caseOutcome: "Dismissed, no-billed, nolle prosequi, or not prosecuted", offenseLevel: "Misdemeanor" },
  // Louisiana — 894(B)/893(E) set-aside routes are event-based; clean-period routes are 5yr (mis) / 10yr (fel)
  { code: "LA", route: /^non-conviction-arrest-expungement$/, name: "LA non-conviction event", wait: null, caseOutcome: "Dismissed, no-billed, nolle prosequi, or not prosecuted", offenseLevel: "Misdemeanor" },
  { code: "LA", route: /894-b-set-aside/, name: "LA 894(B) set-aside event", wait: null, caseOutcome: "Misdemeanor conviction", offenseLevel: "Misdemeanor" },
  { code: "LA", route: /misdemeanor-five-year-clean-period/, name: "LA misdemeanor 5yr clean", wait: { value: 5, unit: "years" }, caseOutcome: "Misdemeanor conviction", offenseLevel: "Misdemeanor" },
  { code: "LA", route: /first-offense-marijuana.*998/, name: "LA marijuana 90d", wait: { value: 90, unit: "days" }, caseOutcome: "Misdemeanor conviction", offenseLevel: "Misdemeanor" },
  { code: "LA", route: /893-e-set-aside/, name: "LA 893(E) set-aside event", wait: null, caseOutcome: "Felony conviction", offenseLevel: "Felony" },
  { code: "LA", route: /felony-ten-year-clean-period/, name: "LA felony 10yr clean", wait: { value: 10, unit: "years" }, caseOutcome: "Felony conviction", offenseLevel: "Felony" },
  // Nebraska — § 29-2264 set-aside (record stays visible), runs from sentence completion, no fixed wait
  { code: "NE", route: /set-aside-probation-fine-community-service/, name: "NE set-aside probation event", wait: null, caseOutcome: "Conviction or adjudication", offenseLevel: "Misdemeanor" },
  { code: "NE", route: /set-aside-incarceration-one-year-or-less/, name: "NE set-aside incarceration event", wait: null, caseOutcome: "Conviction or adjudication", offenseLevel: "Felony" },
  // Virginia — regime-1 non-conviction expungement (event-based) + petition-based sealing (mis 7yr / fel 10yr)
  { code: "VA", route: /regime-1-expungement-available-now/, name: "VA regime-1 non-conviction event", wait: null, caseOutcome: "Dismissed, no-billed, nolle prosequi, or not prosecuted", offenseLevel: "Misdemeanor" },
  { code: "VA", route: /petition-based-sealing/, name: "VA petition sealing misdemeanor 7yr", wait: { value: 7, unit: "years" }, caseOutcome: "Misdemeanor conviction", offenseLevel: "Misdemeanor" },
  { code: "VA", route: /petition-based-sealing/, name: "VA petition sealing felony 10yr", wait: { value: 10, unit: "years" }, caseOutcome: "Felony conviction", offenseLevel: "Felony" },
  // Maine — CR-218 adult conviction sealing (Class E), 4yr
  { code: "ME", route: /^adult-conviction-sealing$/, name: "ME adult conviction sealing 4yr", wait: { value: 4, unit: "years" }, caseOutcome: "Conviction or adjudication", offenseLevel: "Misdemeanor" },
  // Illinois — 20 ILCS 2630/5.2(j) felony-prostitution relief, event-based after sentence completion
  { code: "IL", route: /felony-prostitution-relief/, name: "IL felony-prostitution event", wait: null, caseOutcome: "Felony conviction", offenseLevel: "Felony" },
  // Idaho — § 19-2604(1) withheld-judgment set-aside, event-based after probation completion (caution-tier)
  { code: "ID", route: /withheld-judgment-idaho-code-19-2604/, name: "ID withheld-judgment set-aside event", wait: null, caseOutcome: "Conviction or adjudication", offenseLevel: "Misdemeanor" }
];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function addDuration(date, duration, direction) {
  const next = new Date(date.getTime());
  const amount = duration.value * direction;
  if (duration.unit === "days") next.setUTCDate(next.getUTCDate() + amount);
  else if (duration.unit === "months") next.setUTCMonth(next.getUTCMonth() + amount);
  else next.setUTCFullYear(next.getUTCFullYear() + amount);
  return next;
}

function boundaryDates(duration) {
  const threshold = addDuration(TODAY, duration, -1);
  const under = new Date(threshold.getTime());
  under.setUTCDate(under.getUTCDate() + 1);
  const over = new Date(threshold.getTime());
  over.setUTCDate(over.getUTCDate() - 1);
  return { under: under.toISOString().slice(0, 10), over: over.toISOString().slice(0, 10) };
}

function pathwayBy(profile, pattern) {
  return profile.pathways.find((pathway) => pattern.test(pathway.label) || pattern.test(pathway.id));
}

function answerFor(question, spec, date) {
  const id = question.id;
  if (id === "ownership_scope") return "Yes";
  if (id === "jurisdiction_scope") return "State or local";
  if (id === "case_outcome") return spec.caseOutcome;
  if (id === "offense_level") return spec.offenseLevel;
  if (id === "possible_pathway_context") return spec.pathway.label;
  if (id === "disposition_date" || id === "arrest_date") return date;
  if (id === "state_exclusion_categories") return ["None of these"];
  if (id === "sentence_completion_date" || id === "financial_obligations" || id === "special_preconditions_confirmed") return "Yes";
  if (id === "pending_cases" || id === "new_convictions_during_waiting_period" || id === "pardon_status" || id === "identity_error" || id === "trafficking_status") return "No";
  if (id === "record_documents" || id === "criminal_history") return "Yes";
  if (id === "court") return `${spec.profile.jurisdiction.name} trial court`;
  if (id === "charge") return spec.offenseLevel === "Felony" ? "Synthetic felony conviction" : "Synthetic misdemeanor conviction";
  if (id === "county_or_filing_location" || id === "county") return "Synthetic County";
  if (id === "case_identifier") return "SYN-CASE-001";
  if (id === "offense_category") return "None of these";
  if (id === "age_at_offense" || id === "prior_conviction_count" || id === "prior_felony_count") return id === "age_at_offense" ? 30 : 0;
  if (question.type === "number_or_range") return 30;
  if (question.type === "multi_select") return ["None of these"];
  if (question.type === "yes_no_unsure" || question.type === "yes_no_prefer_not_to_say") return "No";
  if (Array.isArray(question.options) && question.options.length) {
    return question.options.find((option) => !/federal|not sure|unknown|prefer not|none of these/i.test(String(option))) ?? question.options[0];
  }
  return "Synthetic answer";
}

function evaluate(spec, date, mutate) {
  const answers = {};
  for (const question of projectPublicProfile(spec.profile).questions) answers[question.id] = answerFor(question, spec, date);
  if (mutate) mutate(answers);
  return evaluateScreening({
    jurisdiction: spec.profile.jurisdiction.code,
    profileVersion: spec.profile.profileVersion,
    matterId: `awaiting-reconfirm-${spec.profile.jurisdiction.code}-${spec.pathway.id}`,
    answers
  });
}

const RECONFIRM_REASON = "reconfirmation_required";

for (const route of ROUTES) {
  const profile = getProfileByJurisdiction(route.code);
  const pathway = pathwayBy(profile, route.route);
  assert(pathway, `${route.name}: pathway not found for ${route.route}.`);
  if (!pathway) continue;
  const spec = { ...route, profile, pathway };

  // qualifying: anchor far in the past so any positive wait is satisfied
  const qualifying = evaluate(spec, "2000-01-01");
  const held = qualifying.resultCode === "needs_review"
    && qualifying.paymentAllowed === false
    && qualifying.reasons.some((reason) => reason.code.includes(RECONFIRM_REASON));
  assert(held, `${route.name}: qualifying case must reach the reconfirm hold (needs_review + lawrence_reconfirmation_required, no payment); got ${qualifying.resultCode}/${qualifying.paymentAllowed} [${qualifying.reasons.map((r) => r.code).join(",")}].`);

  // fail-closed: a pending case must block regardless of timing
  const pendingBlocked = evaluate(spec, "2000-01-01", (answers) => { answers.pending_cases = "Yes"; });
  assert(pendingBlocked.paymentAllowed === false
    && ["not_yet", "needs_review", "likely_not_eligible", "needs_more_info"].includes(pendingBlocked.resultCode),
    `${route.name}: pending case must fail closed; got ${pendingBlocked.resultCode}/${pendingBlocked.paymentAllowed}.`);

  let boundary = "event-based (no numeric wait)";
  if (route.wait) {
    const dates = boundaryDates(route.wait);
    const under = evaluate(spec, dates.under);
    const over = evaluate(spec, dates.over);
    boundary = `${route.wait.value} ${route.wait.unit}: under=${under.resultCode}/${under.paymentAllowed} over=${over.resultCode}/${over.paymentAllowed}`;
    assert(under.resultCode === "not_yet" && under.paymentAllowed === false,
      `${route.name}: just-under wait must be not_yet/no-payment; got ${under.resultCode}/${under.paymentAllowed}.`);
    assert(over.resultCode === "needs_review" && over.paymentAllowed === false && over.reasons.some((r) => r.code.includes(RECONFIRM_REASON)),
      `${route.name}: just-over wait must reach reconfirm hold/no-payment; got ${over.resultCode}/${over.paymentAllowed}.`);
  }

  // clamp: payment must be false in every branch
  assert(qualifying.paymentAllowed === false && pendingBlocked.paymentAllowed === false,
    `${route.name}: payment must stay clamped shut for awaiting-reconfirm routes.`);

  rows.push(`${route.code} | ${pathway.label} | qualifying=${qualifying.resultCode}/${qualifying.paymentAllowed} | pending=${pendingBlocked.resultCode} | ${boundary}`);
}

console.log("awaiting_reconfirm_route_proofs:");
for (const row of rows) console.log(row);

if (failures.length > 0) {
  console.error("verify-rcap-awaiting-reconfirm-routes failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("verify-rcap-awaiting-reconfirm-routes: OK");
console.log("Built held routes reach the reconfirm hold when qualifying, fail closed otherwise, and keep the $50 clamp shut pending Lawrence ratification.");
