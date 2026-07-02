import { register } from "node:module";

process.env.RCAP_EVALUATOR_TODAY = "2026-07-01";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");
const { evaluateScreening } = await import("../src/lib/rcap-engine/evaluator.ts");
const { safeUserFacingEngineText } = await import("../src/lib/expungement-ai/missing-fields.ts");

const failures = [];
const INTERNAL_COPY = [
  "The answers require source review before a packet decision.",
  "The source-specific waiting period has no safely executable date anchor."
];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

const profile = getProfileByJurisdiction("MS");
assert(profile, "Mississippi profile must exist.");
const publicProfile = projectPublicProfile(profile);
const dateQuestion = publicProfile.questions.find((question) => question.id === "disposition_date");
assert(dateQuestion, "Mississippi public profile must include disposition_date.");
assert(dateQuestion?.required === true, "Mississippi disposition_date must be required before evaluation.");
assert(dateQuestion?.lifecyclePhase === "prepay_timing_gate", "Mississippi disposition_date must be a prepay timing gate.");

function buildAnswers(dateValue) {
  const answers = {};
  for (const question of publicProfile.questions) {
    if (question.id === "ownership_scope") answers[question.id] = "Yes";
    if (question.id === "jurisdiction_scope") answers[question.id] = "State or local";
    if (question.id === "case_outcome") answers[question.id] = "Dismissed, no-billed, nolle prosequi, or not prosecuted";
    if (question.id === "offense_level") answers[question.id] = "Misdemeanor";
    if (question.id === "possible_pathway_context") answers[question.id] = "Uncharged or unprosecuted misdemeanor after 12 months (§ 99-15-59)";
    if (question.id === "disposition_date" && dateValue !== undefined) answers[question.id] = dateValue;
  }
  return answers;
}

function evaluate(name, answers) {
  const result = evaluateScreening({
    jurisdiction: "MS",
    profileVersion: profile.profileVersion,
    matterId: `ms-result-path-${name}`,
    answers
  });
  assert(
    result.paymentAllowed !== true || result.resultCode === "packet_ready" || result.resultCode === "packet_ready_with_caution",
    `${name}: payment opened for non-packet result ${result.resultCode}.`
  );
  for (const item of [result.userLabel, ...result.reasons.map((reason) => reason.text), ...result.nextSteps]) {
    assert(!INTERNAL_COPY.includes(safeUserFacingEngineText(item)), `${name}: internal copy remained user-facing: ${item}`);
  }
  return result;
}

const happy = evaluate("happy", buildAnswers("2020-01-01"));
assert(
  happy.resultCode === "packet_ready" || happy.resultCode === "packet_ready_with_caution",
  `Mississippi supported happy path should be packet-ready, got ${happy.resultCode}.`
);
assert(happy.paymentAllowed === true, "Mississippi supported happy path should allow payment only after packet-ready result.");

const missingDate = evaluate("missing-date", buildAnswers(undefined));
assert(missingDate.resultCode === "needs_more_info", `Missing-date path should return needs_more_info, got ${missingDate.resultCode}.`);
assert(missingDate.paymentAllowed === false, "Missing-date path must not allow payment.");
assert(missingDate.missingQuestionIds.includes("disposition_date"), "Missing-date path must ask for disposition_date.");

const unknownDate = evaluate("unknown-date", buildAnswers({ unknown: true }));
const unknownDisplay = [
  unknownDate.userLabel,
  ...unknownDate.reasons.map((reason) => safeUserFacingEngineText(reason.text)),
  ...unknownDate.nextSteps.map((step) => safeUserFacingEngineText(step))
].join(" ");
assert(unknownDate.paymentAllowed === false, "Unknown-date path must not allow payment.");
assert(
  unknownDate.resultCode === "needs_more_info" || unknownDate.resultCode === "needs_review",
  `Unknown-date path should fail closed as needs_more_info/needs_review, got ${unknownDate.resultCode}.`
);
assert(
  unknownDisplay.includes("We need the case date, disposition date, or completion date used to check the waiting period.")
    || unknownDisplay.includes("We need one more detail before we can prepare the right packet."),
  "Unknown-date path must show plain-language missing-date copy."
);
for (const phrase of INTERNAL_COPY) {
  assert(!unknownDisplay.includes(phrase), `Unknown-date display leaked internal copy: ${phrase}`);
}

if (failures.length > 0) {
  console.error("Mississippi Expungement.ai result-path verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Mississippi Expungement.ai result-path verifier passed.");
console.log(`Happy path: ${happy.resultCode}, paymentAllowed=${happy.paymentAllowed}`);
console.log(`Missing date: ${missingDate.resultCode}, missing=${missingDate.missingQuestionIds.join(",")}`);
console.log(`Unknown date: ${unknownDate.resultCode}, paymentAllowed=${unknownDate.paymentAllowed}`);
