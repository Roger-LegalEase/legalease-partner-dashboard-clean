import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";

process.env.RCAP_EVALUATOR_TODAY = "2026-07-01";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { getAllJurisdictionProfiles, getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");
const { evaluateScreening } = await import("../src/lib/rcap-engine/evaluator.ts");

const root = process.cwd();
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function answerFor(question, stateName, fixture) {
  const id = question.id;
  if (id === "ownership_scope") return "Yes";
  if (id === "jurisdiction_scope") return "State or local";
  if (id === "case_outcome") return fixture.caseOutcome ?? "Misdemeanor conviction";
  if (id === "offense_level") return fixture.offenseLevel ?? "Misdemeanor";
  if (id === "possible_pathway_context") return "";
  if (id === "state_exclusion_categories") return ["None of these"];
  if (id === "sentence_completion_date" || id === "financial_obligations") return "Yes";
  if (id === "pending_cases" || id === "pardon_status" || id === "identity_error" || id === "trafficking_status") return "No";
  if (id === "disposition_date" || id === "arrest_date") return fixture.date ?? "2015-01-01";
  if (id === "record_documents" || id === "criminal_history") return "Yes";
  if (id === "court") return `${stateName} trial court`;
  if (id === "charge") return fixture.charge ?? "Synthetic misdemeanor charge";
  if (id === "county_or_filing_location" || id === "county") return "Synthetic County";
  if (id === "case_identifier") return "SYN-CASE-001";
  if (question.type === "number_or_range") return 30;
  if (question.type === "multi_select") return ["None of these"];
  if (question.type === "yes_no_unsure" || question.type === "yes_no_prefer_not_to_say") return "No";
  if (Array.isArray(question.options) && question.options.length) {
    return question.options.find((option) => !/federal|not sure|unknown|prefer not|none of these/i.test(String(option))) ?? question.options[0];
  }
  return "Synthetic answer";
}

function buildAnswers(profile, fixture = {}) {
  const pub = projectPublicProfile(profile);
  const answers = {};
  for (const question of pub.questions) {
    if (question.required || question.id === "possible_pathway_context") {
      answers[question.id] = answerFor(question, pub.jurisdiction.name, fixture);
    }
  }
  if (fixture.context) answers.possible_pathway_context = fixture.context;
  return answers;
}

function evaluateFixture(fixture) {
  const profile = getProfileByJurisdiction(fixture.code);
  const evaluation = evaluateScreening({
    jurisdiction: fixture.code,
    profileVersion: profile.profileVersion,
    matterId: `verify-${fixture.code}-${fixture.name.replace(/[^a-z0-9]+/gi, "-")}`,
    answers: buildAnswers(profile, fixture)
  });
  return { profile, evaluation };
}

function printCase(label, fixture, evaluation) {
  console.log(`${label}: ${fixture.code} ${fixture.name}`);
  console.log(`  context: ${fixture.context ?? "(none)"}`);
  console.log(`  result: ${evaluation.resultCode}`);
  console.log(`  pathway: ${evaluation.pathwayId ?? "(none)"}`);
  console.log(`  paymentAllowed: ${evaluation.paymentAllowed}`);
  console.log(`  reasons: ${evaluation.reasons.map((reason) => reason.code).join(", ")}`);
}

const evaluatorSource = fs.readFileSync(path.join(root, "src/lib/rcap-engine/evaluator.ts"), "utf8");
assert(!evaluatorSource.includes("addYears(disposition, 3"), "Evaluator must not contain addYears(disposition, 3).");
assert(!evaluatorSource.includes("return profile.pathways[0]"), "Evaluator must not silently fall back to profile.pathways[0].");
assert(evaluatorSource.includes("orderedDecisionRules"), "Evaluator must reference compiled orderedDecisionRules.");
assert(evaluatorSource.includes("isPacketPlanFulfillmentReady(plan)") && evaluatorSource.includes("route.deterministic"), "Payment must require deterministic compiled-rule route matching.");

const requiredCases = [
  {
    name: "NY CPL 160.59 10-year wait unmet",
    code: "NY",
    context: "Discretionary conviction sealing by petition under CPL 160.59",
    date: "2022-07-01",
    caseOutcome: "Misdemeanor conviction",
    charge: "Synthetic misdemeanor conviction",
    allow: ["not_yet", "needs_review"]
  },
  {
    name: "TX 1-year arrest no-charge route two years old",
    code: "TX",
    context: "Expunction for arrest with no charge filed after the limitations period",
    date: "2024-07-01",
    caseOutcome: "Arrest or citation with no charge filed",
    charge: "Class A misdemeanor synthetic arrest",
    allow: ["packet_ready", "packet_ready_with_caution", "needs_review"]
  },
  {
    name: "UT 60/180-day automatic path",
    code: "UT",
    context: "Path B — Automatic expungement after acquittal or dismissal with prejudice",
    date: "2024-07-01",
    caseOutcome: "Acquitted or found not guilty",
    charge: "Synthetic misdemeanor",
    allow: ["guidance_only", "needs_review", "not_yet"]
  },
  {
    name: "Unknown/no deterministic match",
    code: "NY",
    context: "This is not a compiled pathway",
    date: "2015-01-01",
    caseOutcome: "Other conviction or adjudication",
    charge: "Synthetic ambiguous record",
    allow: ["needs_review"]
  }
];

for (const fixture of requiredCases) {
  const { evaluation } = evaluateFixture(fixture);
  printCase("required", fixture, evaluation);
  assert(fixture.allow.includes(evaluation.resultCode), `${fixture.name}: expected one of ${fixture.allow.join(", ")}, got ${evaluation.resultCode}.`);
  assert(evaluation.resultCode !== "packet_ready" || fixture.name.includes("TX 1-year"), `${fixture.name}: must not return packet_ready.`);
  assert(evaluation.resultCode !== "packet_ready_with_caution" || fixture.name.includes("TX 1-year"), `${fixture.name}: must not return packet_ready_with_caution.`);
  if (fixture.name.includes("NY CPL")) assert(evaluation.paymentAllowed === false, "NY CPL 160.59 unmet wait must not allow payment.");
  if (fixture.name.includes("TX 1-year")) {
    assert(!JSON.stringify(evaluation).includes("2027-07-01"), "TX 1-year route must not return old generic 2027-07-01 timing.");
    if (evaluation.paymentAllowed) assert(evaluation.reasons.some((reason) => reason.code.includes("compiled_rule_match")), "TX payment requires compiled rule match reason.");
  }
  if (fixture.name.includes("UT 60/180")) assert(evaluation.paymentAllowed === false, "UT automatic/guidance route must not allow payment.");
  if (fixture.name.includes("Unknown")) assert(evaluation.paymentAllowed === false && !evaluation.pathwayId, "Unknown route must not select a fallback pathway or allow payment.");
}

const additionalCases = [
  {
    name: "Texas 180-day Class C proof",
    code: "TX",
    context: "Expunction for arrest with no charge filed after the limitations period",
    date: "2025-01-01",
    caseOutcome: "Arrest or citation with no charge filed",
    charge: "Class C misdemeanor synthetic arrest",
    allow: ["packet_ready", "packet_ready_with_caution", "needs_review"]
  },
  {
    name: "Texas 1-year Class A/B proof",
    code: "TX",
    context: "Expunction for arrest with no charge filed after the limitations period",
    date: "2024-07-01",
    caseOutcome: "Arrest or citation with no charge filed",
    charge: "Class A misdemeanor synthetic arrest",
    allow: ["packet_ready", "packet_ready_with_caution", "needs_review"]
  },
  {
    name: "Maryland 5-year proof",
    code: "MD",
    context: "Most eligible misdemeanor expungement under Crim. Proc. 10-110",
    date: "2022-07-01",
    caseOutcome: "Misdemeanor conviction",
    charge: "Synthetic misdemeanor conviction",
    allow: ["not_yet", "needs_review"]
  },
  {
    name: "New York 10-year proof",
    code: "NY",
    context: "Discretionary conviction sealing by petition under CPL 160.59",
    date: "2022-07-01",
    caseOutcome: "Misdemeanor conviction",
    charge: "Synthetic misdemeanor conviction",
    allow: ["not_yet", "needs_review"]
  }
];

for (const fixture of additionalCases) {
  const { evaluation } = evaluateFixture(fixture);
  printCase("additional", fixture, evaluation);
  assert(fixture.allow.includes(evaluation.resultCode), `${fixture.name}: expected ${fixture.allow.join(", ")}, got ${evaluation.resultCode}.`);
  assert(!JSON.stringify(evaluation).includes("2027-07-01"), `${fixture.name}: must not expose old generic 3-year date.`);
}

for (const fixture of [
  { name: "CT Clean Slate still packet-capable if safely executable", code: "CT", context: "Petitioned Clean Slate erasure for eligible pre-2000 convictions (JD-CR-202)", date: "2015-01-01", caseOutcome: "Misdemeanor conviction", charge: "Synthetic misdemeanor conviction" },
  { name: "NE packet pathway still reachable or review-closed", code: "NE", context: "Conviction set-aside after probation, fine-only sentence, or community service under § 29-2264(2)", date: "2015-01-01", caseOutcome: "Misdemeanor conviction", charge: "Synthetic misdemeanor conviction" },
  { name: "NY packet pathway no early payment", code: "NY", context: "Discretionary conviction sealing by petition under CPL 160.59", date: "2022-07-01", caseOutcome: "Misdemeanor conviction", charge: "Synthetic misdemeanor conviction" },
  { name: "UT packet pathway still reachable or review-closed", code: "UT", context: "Path D — Petition-based expungement with a BCI Certificate of Eligibility", date: "2015-01-01", caseOutcome: "Misdemeanor conviction", charge: "Synthetic misdemeanor conviction" },
  { name: "CT absolute pardon guidance-only", code: "CT", context: "Absolute pardon resulting in erasure", date: "2015-01-01", caseOutcome: "Misdemeanor conviction", charge: "Synthetic misdemeanor conviction" }
]) {
  const { evaluation } = evaluateFixture(fixture);
  printCase("protected", fixture, evaluation);
  if (fixture.name.includes("absolute pardon")) {
    assert(evaluation.resultCode === "guidance_only" || evaluation.resultCode === "needs_review", "CT absolute pardon must remain guidance/review only.");
    assert(evaluation.paymentAllowed === false, "CT absolute pardon must not allow payment.");
  } else {
    assert(evaluation.paymentAllowed === false || ["packet_ready", "packet_ready_with_caution"].includes(evaluation.resultCode), `${fixture.name}: payment may only accompany packet-ready result.`);
  }
}

const dcProofCases = [
  {
    name: "DC automatic expungement guidance-only",
    code: "DC",
    context: "Automatic expungement under D.C. Code § 16-802",
    date: "2015-01-01",
    caseOutcome: "Misdemeanor conviction",
    charge: "Synthetic misdemeanor conviction",
    expect: "guidance_only",
    payment: false,
    text: "DC has an automatic sealing law, but the court says automatic sealing is not currently operating. You may still have a motion-based option."
  },
  {
    name: "DC automatic sealing guidance-only",
    code: "DC",
    context: "Automatic sealing under D.C. Code § 16-805",
    date: "2015-01-01",
    caseOutcome: "Misdemeanor conviction",
    charge: "Synthetic misdemeanor conviction",
    expect: "guidance_only",
    payment: false
  },
  {
    name: "DC felony 8-year motion fails closed without severity clearance",
    code: "DC",
    context: "Motion to seal felony conviction after 8 years under D.C. Code § 16-806",
    date: "2015-01-01",
    caseOutcome: "Felony conviction",
    charge: "Synthetic felony conviction",
    expect: "needs_review",
    payment: false,
    reason: "felony_severity_group_not_cleared"
  },
  {
    name: "DC actual innocence bare dismissal fails closed",
    code: "DC",
    context: "Actual-innocence expungement by motion under D.C. Code § 16-803",
    date: "2015-01-01",
    caseOutcome: "Dismissed, no-billed, nolle prosequi, or not prosecuted",
    charge: "Synthetic dismissed charge",
    expect: "needs_review",
    payment: false,
    reason: "actual_innocence_basis_not_established"
  },
  {
    name: "DC juvenile guidance-only in adult flow",
    code: "DC",
    context: "Juvenile sealing under D.C. Code § 16-2335",
    date: "2015-01-01",
    caseOutcome: "Juvenile adjudication or offense committed as a minor",
    charge: "Synthetic juvenile matter",
    expect: "guidance_only",
    payment: false
  }
];

for (const fixture of dcProofCases) {
  const { evaluation } = evaluateFixture(fixture);
  printCase("dc-proof", fixture, evaluation);
  assert(evaluation.resultCode === fixture.expect, `${fixture.name}: expected ${fixture.expect}, got ${evaluation.resultCode}.`);
  assert(evaluation.paymentAllowed === fixture.payment, `${fixture.name}: expected paymentAllowed=${fixture.payment}.`);
  if (fixture.reason) assert(evaluation.reasons.some((reason) => reason.code.includes(fixture.reason)), `${fixture.name}: missing ${fixture.reason} reason.`);
  if (fixture.text) assert(evaluation.reasons.some((reason) => reason.text.includes(fixture.text)), `${fixture.name}: missing Lawrence automatic-route copy.`);
}

console.log("full 51-state current sweep:");
for (const profile of getAllJurisdictionProfiles().sort((a, b) => a.jurisdiction.code.localeCompare(b.jurisdiction.code))) {
  const fixture = {
    name: `${profile.jurisdiction.code} current sweep`,
    code: profile.jurisdiction.code,
    context: profile.pathways[0]?.label,
    date: "2015-01-01",
    caseOutcome: "Misdemeanor conviction",
    charge: "Synthetic misdemeanor conviction"
  };
  let evaluation;
  try {
    evaluation = evaluateFixture(fixture).evaluation;
  } catch (error) {
    failures.push(`${profile.jurisdiction.code}: sweep crashed: ${error instanceof Error ? error.message : String(error)}`);
    continue;
  }
  const deterministic = evaluation.reasons.some((reason) => reason.code.includes("compiled_rule_match"));
  const timingState = evaluation.reasons.some((reason) => reason.code.includes("waiting_period_not_satisfied"))
    ? "not_yet"
    : evaluation.reasons.some((reason) => reason.code.includes("waiting_anchor_missing"))
      ? "missing"
      : evaluation.reasons.some((reason) => reason.code.includes("waiting_rule_not_executed") || reason.code.includes("waiting_anchor_not_determined"))
        ? "needs_review"
        : "not_applicable_or_satisfied";
  const waitingRules = (profile.waitingPeriodRules ?? []).length;
  console.log(`${profile.jurisdiction.code} | pathways=${profile.pathways.length} | orderedRules=${profile.orderedDecisionRules.length} | waitingRules=${waitingRules} | before snapshot unavailable; current patched result shown | result=${evaluation.resultCode} | payment=${evaluation.paymentAllowed} | deterministic=${deterministic} | timing=${timingState}`);
  assert(evaluation.paymentAllowed === false || deterministic, `${profile.jurisdiction.code}: payment allowed without deterministic compiled-rule match.`);
}

if (failures.length > 0) {
  console.error("verify-rcap-evaluator-rule-driven-safety failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("verify-rcap-evaluator-rule-driven-safety: OK");
console.log("The evaluator now fails closed unless a deterministic compiled source-rule route supports packet/payment.");
