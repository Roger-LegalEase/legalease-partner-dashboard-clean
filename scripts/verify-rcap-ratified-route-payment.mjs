import { register } from "node:module";

// Both-direction PAYMENT proof for the held petition routes that Lawrence ratified on 2026-07-01
// and that were promoted from CORRECTED_AWAITING_RECONFIRM_ROUTES into RATIFIED_DEPLOYABLE_ROUTES.
// The $50 clamp is now OPEN for qualifying cases, so the proof asserts:
//   - qualifying + wait satisfied  -> packet_ready(_with_caution) + paymentAllowed=TRUE + compiled_rule_match
//   - just-under wait               -> not_yet, no payment
//   - just-over wait                -> packet_ready(_with_caution) + payment
//   - special_preconditions_confirmed = No -> fails closed, no payment (source-listed precondition gate)
//   - pending case                  -> fails closed, no payment
//   - route-specific hard gate (IL felony requirement) -> fails closed, no payment
process.env.RCAP_EVALUATOR_TODAY = "2026-07-01";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");
const { evaluateScreening } = await import("../src/lib/rcap-engine/evaluator.ts");

const TODAY = new Date("2026-07-01T00:00:00.000Z");
const failures = [];
const rows = [];

const ROUTES = [
  // Missouri
  { code: "MO", route: /610-140/, name: "MO 610.140 felony 3yr", wait: { value: 3, unit: "years" }, caseOutcome: "Felony conviction", offenseLevel: "Felony" },
  { code: "MO", route: /610-140/, name: "MO 610.140 misdemeanor 1yr", wait: { value: 1, unit: "years" }, caseOutcome: "Misdemeanor conviction", offenseLevel: "Misdemeanor" },
  { code: "MO", route: /610-130/, name: "MO 610.130 first-DWI 10yr", wait: { value: 10, unit: "years" }, caseOutcome: "Misdemeanor conviction", offenseLevel: "Misdemeanor" },
  { code: "MO", route: /610-145/, name: "MO 610.145 mistaken-identity event", wait: null, caseOutcome: "Dismissed, no-billed, nolle prosequi, or not prosecuted", offenseLevel: "Misdemeanor" },
  // Louisiana
  { code: "LA", route: /^non-conviction-arrest-expungement$/, name: "LA non-conviction event", wait: null, caseOutcome: "Dismissed, no-billed, nolle prosequi, or not prosecuted", offenseLevel: "Misdemeanor" },
  { code: "LA", route: /894-b-set-aside/, name: "LA 894(B) set-aside event", wait: null, caseOutcome: "Misdemeanor conviction", offenseLevel: "Misdemeanor" },
  { code: "LA", route: /misdemeanor-five-year-clean-period/, name: "LA misdemeanor 5yr clean", wait: { value: 5, unit: "years" }, caseOutcome: "Misdemeanor conviction", offenseLevel: "Misdemeanor" },
  { code: "LA", route: /first-offense-marijuana.*998/, name: "LA marijuana 90d", wait: { value: 90, unit: "days" }, caseOutcome: "Misdemeanor conviction", offenseLevel: "Misdemeanor" },
  { code: "LA", route: /893-e-set-aside/, name: "LA 893(E) set-aside event", wait: null, caseOutcome: "Felony conviction", offenseLevel: "Felony" },
  { code: "LA", route: /felony-ten-year-clean-period/, name: "LA felony 10yr clean", wait: { value: 10, unit: "years" }, caseOutcome: "Felony conviction", offenseLevel: "Felony" },
  // Nebraska
  { code: "NE", route: /set-aside-probation-fine-community-service/, name: "NE set-aside probation event", wait: null, caseOutcome: "Conviction or adjudication", offenseLevel: "Misdemeanor" },
  { code: "NE", route: /set-aside-incarceration-one-year-or-less/, name: "NE set-aside incarceration event", wait: null, caseOutcome: "Conviction or adjudication", offenseLevel: "Felony" },
  // Virginia
  { code: "VA", route: /regime-1-expungement-available-now/, name: "VA regime-1 non-conviction event", wait: null, caseOutcome: "Dismissed, no-billed, nolle prosequi, or not prosecuted", offenseLevel: "Misdemeanor" },
  { code: "VA", route: /petition-based-sealing/, name: "VA petition sealing misdemeanor 7yr", wait: { value: 7, unit: "years" }, caseOutcome: "Misdemeanor conviction", offenseLevel: "Misdemeanor" },
  { code: "VA", route: /petition-based-sealing/, name: "VA petition sealing felony 10yr", wait: { value: 10, unit: "years" }, caseOutcome: "Felony conviction", offenseLevel: "Felony" },
  // Maine
  { code: "ME", route: /^adult-conviction-sealing$/, name: "ME adult conviction sealing 4yr", wait: { value: 4, unit: "years" }, caseOutcome: "Conviction or adjudication", offenseLevel: "Misdemeanor" },
  // Illinois — felony hard gate: a misdemeanor prostitution record must fail closed
  { code: "IL", route: /felony-prostitution-relief/, name: "IL felony-prostitution event", wait: null, caseOutcome: "Felony conviction", offenseLevel: "Felony", hardGate: { mutate: (a) => { a.offense_level = "Misdemeanor"; a.charge = "Synthetic misdemeanor prostitution"; }, label: "misdemeanor prostitution" } },
  // Idaho
  { code: "ID", route: /withheld-judgment-idaho-code-19-2604/, name: "ID withheld-judgment set-aside event", wait: null, caseOutcome: "Conviction or adjudication", offenseLevel: "Misdemeanor" },
  // NY CPL 160.59 — 10yr wait; gate: <=2 convictions, <=1 felony. Hard gate: 3 convictions fails closed.
  {
    code: "NY", route: /discretionary-conviction-sealing-by-petition-under-cpl-160-59/, name: "NY 160.59 10yr", wait: { value: 10, unit: "years" }, caseOutcome: "Felony conviction", offenseLevel: "Felony",
    setup: (a, date) => {
      a.sentencing_date = date; a.release_date = date;
      a.ny_16059_total_eligible_convictions = 1; a.ny_16059_felony_convictions = 1;
      a.ny_16059_ineligible_offense = "No"; a.ny_16059_sex_offender_registration = "No";
      a.ny_16059_pending_charge = "No"; a.ny_16059_post_last_conviction_crime = "No"; a.ny_16059_prior_sealing = "No";
    },
    hardGate: { mutate: (a) => { a.ny_16059_total_eligible_convictions = 3; }, label: "3 eligible convictions" }
  },
  // CA HSC 11361.8 Prop 64 — gate: qualifying marijuana + lesser/no offense + branch. Hard gate: non-qualifying fails closed.
  {
    code: "CA", route: /prop-64-currently-serving-petition-11361-8/, name: "CA Prop64 currently-serving event", wait: null, caseOutcome: "Felony conviction", offenseLevel: "Felony",
    setup: (a) => { a.ca_prop64_qualifying_marijuana_offense = "Yes"; a.ca_prop64_lesser_or_no_offense = "Yes"; a.ca_prop64_branch = "currently serving"; a.ca_prop64_relief_requested = "dismissal and sealing"; },
    hardGate: { mutate: (a) => { a.ca_prop64_qualifying_marijuana_offense = "No"; }, label: "non-qualifying marijuana offense" }
  },
  {
    code: "CA", route: /prop-64-completed-sentence-application-11361-8/, name: "CA Prop64 completed-sentence event", wait: null, caseOutcome: "Felony conviction", offenseLevel: "Felony",
    setup: (a) => { a.ca_prop64_qualifying_marijuana_offense = "Yes"; a.ca_prop64_lesser_or_no_offense = "Yes"; a.ca_prop64_branch = "completed sentence"; a.ca_prop64_relief_requested = "dismissal and sealing"; },
    hardGate: { mutate: (a) => { a.ca_prop64_lesser_or_no_offense = "No"; }, label: "not a lesser/no offense under Prop 64" }
  }
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
  if (id === "age_at_offense") return 30;
  if (id === "prior_conviction_count" || id === "prior_felony_count") return 0;
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
  if (spec.setup) spec.setup(answers, date);
  if (mutate) mutate(answers);
  return evaluateScreening({
    jurisdiction: spec.profile.jurisdiction.code,
    profileVersion: spec.profile.profileVersion,
    matterId: `ratified-payment-${spec.profile.jurisdiction.code}-${spec.pathway.id}`,
    answers
  });
}

function packetOpen(evaluation) {
  return evaluation.paymentAllowed === true && (evaluation.resultCode === "packet_ready" || evaluation.resultCode === "packet_ready_with_caution");
}

let anyPaymentOpened = false;

for (const route of ROUTES) {
  const profile = getProfileByJurisdiction(route.code);
  const pathway = pathwayBy(profile, route.route);
  assert(pathway, `${route.name}: pathway not found for ${route.route}.`);
  if (!pathway) continue;
  const spec = { ...route, profile, pathway };

  // qualifying: anchor far in the past so any positive wait is satisfied -> clamp OPENS
  const qualifying = evaluate(spec, "2000-01-01");
  assert(packetOpen(qualifying), `${route.name}: qualifying case must open the packet + payment; got ${qualifying.resultCode}/${qualifying.paymentAllowed} [${qualifying.reasons.map((r) => r.code).join(",")}].`);
  assert(qualifying.reasons.some((r) => r.code.includes("compiled_rule_match")), `${route.name}: paid result must carry a compiled_rule_match reason.`);
  if (packetOpen(qualifying)) anyPaymentOpened = true;

  // source-listed precondition gate: if not confirmed, must fail closed / no payment
  const preconditionsUnconfirmed = evaluate(spec, "2000-01-01", (a) => { a.special_preconditions_confirmed = "No"; });
  assert(!packetOpen(preconditionsUnconfirmed) && preconditionsUnconfirmed.paymentAllowed === false,
    `${route.name}: unconfirmed special preconditions must fail closed; got ${preconditionsUnconfirmed.resultCode}/${preconditionsUnconfirmed.paymentAllowed}.`);

  // pending case: must fail closed / no payment
  const pending = evaluate(spec, "2000-01-01", (a) => { a.pending_cases = "Yes"; });
  assert(!packetOpen(pending) && pending.paymentAllowed === false,
    `${route.name}: pending case must fail closed; got ${pending.resultCode}/${pending.paymentAllowed}.`);

  // route-specific hard gate (e.g. IL felony requirement)
  if (route.hardGate) {
    const gated = evaluate(spec, "2000-01-01", route.hardGate.mutate);
    assert(!packetOpen(gated) && gated.paymentAllowed === false,
      `${route.name}: hard gate (${route.hardGate.label}) must fail closed; got ${gated.resultCode}/${gated.paymentAllowed}.`);
  }

  let boundary = "event-based (no numeric wait)";
  if (route.wait) {
    const dates = boundaryDates(route.wait);
    const under = evaluate(spec, dates.under);
    const over = evaluate(spec, dates.over);
    boundary = `${route.wait.value} ${route.wait.unit}: under=${under.resultCode}/${under.paymentAllowed} over=${over.resultCode}/${over.paymentAllowed}`;
    assert(!packetOpen(under) && under.paymentAllowed === false && under.resultCode === "not_yet",
      `${route.name}: just-under wait must be not_yet/no-payment; got ${under.resultCode}/${under.paymentAllowed}.`);
    assert(packetOpen(over), `${route.name}: just-over wait must open the packet + payment; got ${over.resultCode}/${over.paymentAllowed}.`);
  }

  rows.push(`${route.code} | ${pathway.label} | qualifying=${qualifying.resultCode}/${qualifying.paymentAllowed} | preconds=${preconditionsUnconfirmed.resultCode} | pending=${pending.resultCode} | ${boundary}`);
}

assert(anyPaymentOpened, "No ratified route opened payment — the clamp did not open as expected.");

console.log("ratified_route_payment_proofs:");
for (const row of rows) console.log(row);

if (failures.length > 0) {
  console.error("verify-rcap-ratified-route-payment failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("verify-rcap-ratified-route-payment: OK");
console.log("Lawrence-ratified held routes open the $50 packet when qualifying, fail closed on unconfirmed preconditions / pending charges / hard-gate violations, and flip payment at the wait boundary.");
