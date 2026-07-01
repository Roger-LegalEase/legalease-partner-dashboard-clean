import { register } from "node:module";

process.env.RCAP_EVALUATOR_TODAY = "2026-07-01";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { getAllJurisdictionProfiles, getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");
const { evaluateScreening } = await import("../src/lib/rcap-engine/evaluator.ts");

const TODAY = new Date("2026-07-01T00:00:00.000Z");
const failures = [];
const DATE_FACT_IDS = new Set([
  "disposition_date",
  "arrest_date",
  "sentence_completion_actual_date",
  "release_date",
  "sentencing_date",
  "discharge_date",
  "last_conviction_date",
  "conviction_date",
  "probation_parole_supervision_end_date"
]);

const PROOF_CASES = [
  { code: "CA", route: /petition-based felony sealing/i, waitId: "wait-08", name: "CA petition felony sealing", caseOutcome: "Felony conviction", offenseLevel: "Felony" },
  { code: "CT", route: /petitioned clean slate/i, waitId: "wait-04", name: "CT pre-2000 JD-CR-202 petition" },
  { code: "DC", route: /misdemeanor conviction after 5 years/i, waitId: "wait-dc-806-misdemeanor-5yr", name: "DC §16-806 misdemeanor motion" },
  { code: "GA", route: /sb 288 misdemeanor/i, waitId: "wait-07", name: "GA SB-288 court petition" },
  { code: "IL", route: /^adult conviction sealing/i, waitId: "wait-18", name: "IL adult conviction sealing forms" },
  { code: "OR", route: /arrests or charges without conviction/i, waitId: "wait-07", name: "OR arrest set-aside petition", caseOutcome: "Arrest, citation, or charge with no conviction" },
  { code: "IA", route: /acquittal or all-charges-dismissed/i, waitId: "wait-01", name: "IA §901C.2 acquittal/dismissal petition", caseOutcome: "Dismissed" },
  { code: "KY", route: /misdemeanor, violation/i, waitId: "wait-02", name: "KY misdemeanor expungement petition" },
  { code: "NJ", route: /arrest, dismissal/i, waitId: "wait-13", name: "NJ §2C:52-6 non-conviction petition", caseOutcome: "Dismissed" },
  { code: "MT", route: /misdemeanor-conviction/i, waitId: "wait-06", name: "MT misdemeanor conviction expungement" }
];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function normalized(value) {
  return String(value ?? "").toLowerCase();
}

function parseDuration(text) {
  const lower = normalized(text);
  const numeric = lower.match(/\b(\d+)\s*(day|days|month|months|year|years|yr|yrs)\b/);
  if (numeric) return { value: Number(numeric[1]), unit: numeric[2].startsWith("day") ? "days" : numeric[2].startsWith("month") ? "months" : "years" };
  const words = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const word = lower.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\s*(day|days|month|months|year|years)\b/);
  if (word) return { value: words[word[1]], unit: word[2].startsWith("day") ? "days" : word[2].startsWith("month") ? "months" : "years" };
  if (/immediate|no waiting period|upon event/.test(lower)) return { value: 0, unit: "days" };
  return undefined;
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

function waitingRow(profile, id) {
  const row = (profile.waitingPeriodRules ?? []).find((candidate) => candidate.id === id);
  const duration = row?.duration ?? parseDuration(row?.ruleText ?? "");
  return row && duration ? { id: row.id, duration } : undefined;
}

function answerFor(question, fixture) {
  const id = question.id;
  if (id === "ownership_scope") return "Yes";
  if (id === "jurisdiction_scope") return "State or local";
  if (id === "case_outcome") return fixture.caseOutcome ?? "Misdemeanor conviction";
  if (id === "offense_level") return fixture.offenseLevel ?? "Misdemeanor";
  if (id === "possible_pathway_context") return fixture.pathway.label;
  if (id === "waiting_rule_id") return fixture.waitId ?? "";
  if (DATE_FACT_IDS.has(id)) return fixture.date;
  if (id === "state_exclusion_categories") return ["None of these"];
  if (id === "sentence_completion_date" || id === "financial_obligations" || id === "special_preconditions_confirmed") return "Yes";
  if (id === "pending_cases" || id === "new_convictions_during_waiting_period" || id === "pardon_status" || id === "identity_error" || id === "trafficking_status") return "No";
  if (id === "dc_offense_severity_group") return "Not in Offense Severity Group 1, 2, or 3";
  if (id === "actual_innocence_basis") return "Offense did not occur";
  if (id === "wi_expungement_ordered_at_sentencing" || id === "wi_no_probation_jail_prison") return fixture.wiFact ?? "Yes";
  if (id.startsWith("ny_16059_")) {
    if (id === "ny_16059_total_eligible_convictions") return 1;
    if (id === "ny_16059_felony_convictions") return 0;
    return "No";
  }
  if (id === "ny_16058_treatment_program_completed" || id === "in_prosecutor_consent_confirmed") return "Yes";
  if (id === "record_documents" || id === "criminal_history") return "Yes";
  if (id === "court") return `${fixture.profile.jurisdiction.name} trial court`;
  if (id === "charge") return fixture.offenseLevel === "Felony" ? "Synthetic felony conviction" : "Synthetic misdemeanor conviction";
  if (id === "county_or_filing_location" || id === "county") return "Synthetic County";
  if (id === "case_identifier") return "SYN-CASE-001";
  if (id === "offense_category") return "None of these";
  if (id === "eligible_conviction_count") return 1;
  if (id === "eligible_conviction_class") return fixture.offenseLevel ?? "Misdemeanor";
  if (id === "route_family_detail") return fixture.pathway.label;
  if (id === "prior_conviction_count" || id === "prior_felony_count") return 0;
  if (question.type === "number_or_range") return 1;
  if (question.type === "multi_select") return ["None of these"];
  if (question.type === "yes_no_unsure" || question.type === "yes_no_prefer_not_to_say") return "No";
  if (Array.isArray(question.options) && question.options.length) {
    return question.options.find((option) => !/federal|not sure|unknown|prefer not|none of these/i.test(String(option))) ?? question.options[0];
  }
  return "Synthetic answer";
}

function evaluateFixture(fixture, date, mutate) {
  const answers = {};
  for (const question of projectPublicProfile(fixture.profile).questions) answers[question.id] = answerFor(question, { ...fixture, date });
  if (mutate) mutate(answers);
  return evaluateScreening({
    jurisdiction: fixture.profile.jurisdiction.code,
    profileVersion: fixture.profile.profileVersion,
    matterId: `court-petition-product-${fixture.profile.jurisdiction.code}-${fixture.pathway.id}`,
    answers
  });
}

function packetOpen(evaluation) {
  return evaluation.paymentAllowed === true && (evaluation.resultCode === "packet_ready" || evaluation.resultCode === "packet_ready_with_caution");
}

function pathwayBy(profile, pattern) {
  return profile.pathways.find((pathway) => pattern.test(pathway.label) || pattern.test(pathway.id));
}

const proofRows = [];
for (const proof of PROOF_CASES) {
  const profile = getProfileByJurisdiction(proof.code);
  const pathway = pathwayBy(profile, proof.route);
  const wait = waitingRow(profile, proof.waitId);
  assert(pathway, `${proof.name}: pathway not found.`);
  assert(wait, `${proof.name}: wait row ${proof.waitId} not found.`);
  if (!pathway || !wait) continue;
  const dates = boundaryDates(wait.duration);
  const fixture = { profile, pathway, waitId: wait.id, caseOutcome: proof.caseOutcome ?? "Misdemeanor conviction", offenseLevel: proof.offenseLevel ?? "Misdemeanor" };
  const under = evaluateFixture(fixture, dates.under);
  const over = evaluateFixture(fixture, dates.over);
  const missing = evaluateFixture(fixture, dates.over, (answers) => {
    for (const id of DATE_FACT_IDS) delete answers[id];
  });
  assert(!packetOpen(under), `${proof.name}: just-under wait offered payment.`);
  assert(packetOpen(over), `${proof.name}: just-over wait did not offer payment.`);
  assert(over.resultCode !== "packet_ready_with_caution" || over.paymentAllowed === true, `${proof.name}: packet_ready_with_caution did not offer $50.`);
  assert(missing.paymentAllowed === false && ["needs_more_info", "needs_review"].includes(missing.resultCode), `${proof.name}: missing anchor did not fail closed.`);
  proofRows.push(`${proof.code} | ${pathway.label} | ${wait.id}:${wait.duration.value} ${wait.duration.unit} | under=${under.resultCode}/${under.paymentAllowed} | over=${over.resultCode}/${over.paymentAllowed} | missing=${missing.resultCode}/${missing.paymentAllowed}`);
}

const automaticRows = [];
for (const profile of getAllJurisdictionProfiles()) {
  for (const pathway of profile.pathways) {
    const text = normalized(`${pathway.id} ${pathway.label}`);
    if (!/automatic|clean slate automatic|automatic clean slate|no filing/.test(text)) continue;
    const fixture = { profile, pathway, waitId: "", date: "2000-01-01" };
    const evaluation = evaluateFixture(fixture, "2000-01-01");
    assert(evaluation.paymentAllowed === false, `${profile.jurisdiction.code} ${pathway.label}: automatic route allowed payment.`);
    assert(evaluation.resultCode === "guidance_only" || evaluation.resultCode === "needs_review", `${profile.jurisdiction.code} ${pathway.label}: automatic route was not guidance/review.`);
    automaticRows.push(`${profile.jurisdiction.code}:${evaluation.resultCode}/${evaluation.paymentAllowed}`);
  }
}

function edge(code, pattern, mutate, expected) {
  const profile = getProfileByJurisdiction(code);
  const pathway = pathwayBy(profile, pattern);
  assert(pathway, `${code} edge pathway not found: ${pattern}`);
  if (!pathway) return undefined;
  const evaluation = evaluateFixture({ profile, pathway, waitId: "", date: "2000-01-01" }, "2000-01-01", mutate);
  assert(expected(evaluation), `${code} ${pathway.label}: unexpected edge result ${evaluation.resultCode}/${evaluation.paymentAllowed}/${evaluation.reasons.map((reason) => reason.code).join(",")}`);
  return `${code} | ${pathway.label} | ${evaluation.resultCode}/${evaluation.paymentAllowed} | ${evaluation.reasons.map((reason) => reason.code).join(",")}`;
}

const edgeRows = [
  edge("CT", /absolute pardon/i, undefined, (evaluation) => evaluation.resultCode === "guidance_only" && evaluation.paymentAllowed === false),
  edge("AK", /suspended imposition/i, undefined, (evaluation) => evaluation.resultCode === "guidance_only" && evaluation.paymentAllowed === false),
  edge("GA", /agency\/prosecutor/i, undefined, (evaluation) => evaluation.resultCode === "guidance_only" && evaluation.paymentAllowed === false),
  edge("GA", /sb 288 misdemeanor/i, undefined, (evaluation) => evaluation.paymentAllowed === false || packetOpen(evaluation)),
  edge("WI", /adult conviction expungement/i, (answers) => {
    delete answers.wi_expungement_ordered_at_sentencing;
  }, (evaluation) => evaluation.resultCode === "needs_more_info" && evaluation.paymentAllowed === false),
  edge("WI", /adult conviction expungement/i, (answers) => {
    answers.wi_expungement_ordered_at_sentencing = "No";
  }, (evaluation) => evaluation.resultCode === "guidance_only" && evaluation.paymentAllowed === false),
  edge("WI", /adult conviction expungement/i, undefined, (evaluation) => packetOpen(evaluation))
].filter(Boolean);

const ny16059Profile = getProfileByJurisdiction("NY");
const ny16059Pathway = pathwayBy(ny16059Profile, /cpl 160\.59/i);
assert(ny16059Pathway, "NY CPL 160.59 pathway not found.");
if (ny16059Pathway) {
  const nyFixture = { profile: ny16059Profile, pathway: ny16059Pathway, waitId: "wait-03", caseOutcome: "Felony conviction", offenseLevel: "Felony" };
  const nyThreeYear = evaluateFixture(nyFixture, "2023-07-01", (answers) => {
    answers.sentencing_date = "2023-07-01";
    answers.release_date = "2023-07-01";
    answers.ny_16059_total_eligible_convictions = 1;
    answers.ny_16059_felony_convictions = 1;
    answers.ny_16059_ineligible_offense = "No";
    answers.ny_16059_sex_offender_registration = "No";
    answers.ny_16059_pending_charge = "No";
    answers.ny_16059_post_last_conviction_crime = "No";
    answers.ny_16059_prior_sealing = "No";
  });
  assert(nyThreeYear.resultCode === "not_yet" && nyThreeYear.paymentAllowed === false, `NY CPL 160.59 three-year case should be not_yet/no payment, got ${nyThreeYear.resultCode}/${nyThreeYear.paymentAllowed}.`);
  const nyThreeConvictions = evaluateFixture(nyFixture, "2010-07-01", (answers) => {
    answers.sentencing_date = "2010-07-01";
    answers.release_date = "2010-07-01";
    answers.ny_16059_total_eligible_convictions = 3;
    answers.ny_16059_felony_convictions = 1;
    answers.ny_16059_ineligible_offense = "No";
    answers.ny_16059_sex_offender_registration = "No";
    answers.ny_16059_pending_charge = "No";
    answers.ny_16059_post_last_conviction_crime = "No";
    answers.ny_16059_prior_sealing = "No";
  });
  assert(nyThreeConvictions.resultCode === "likely_not_eligible" && nyThreeConvictions.paymentAllowed === false, `NY CPL 160.59 three-conviction case should be blocked/no payment, got ${nyThreeConvictions.resultCode}/${nyThreeConvictions.paymentAllowed}.`);
  edgeRows.push(`NY | CPL 160.59 3-year wait | ${nyThreeYear.resultCode}/${nyThreeYear.paymentAllowed} | ${nyThreeYear.reasons.map((reason) => reason.code).join(",")}`);
  edgeRows.push(`NY | CPL 160.59 3 convictions | ${nyThreeConvictions.resultCode}/${nyThreeConvictions.paymentAllowed} | ${nyThreeConvictions.reasons.map((reason) => reason.code).join(",")}`);
}

console.log("court_petition_proof_cases:");
for (const row of proofRows) console.log(row);
console.log(`automatic_clean_slate_and_automatic_routes_checked=${automaticRows.length}`);
console.log(`automatic_route_results_sample=${automaticRows.slice(0, 20).join(",")}`);
console.log("edge_cases:");
for (const row of edgeRows) console.log(row);
console.log("payment_model=flat $50 only for user-filed court petition/motion/pleading routes that reach packet_ready or packet_ready_with_caution after compiled-rule matching and wait/criteria confirmation.");
console.log("legal_review_flags=Per-state petition waits, exclusions, and criteria remain flagged for Lawrence ratification before deploy.");

if (failures.length > 0) {
  console.error("verify-rcap-court-petition-product-model failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("verify-rcap-court-petition-product-model: OK");
