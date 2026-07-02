import { register } from "node:module";
import fs from "node:fs";
import path from "node:path";

process.env.RCAP_EVALUATOR_TODAY = "2026-07-01";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");
const { evaluateScreening } = await import("../src/lib/rcap-engine/evaluator.ts");
const { safeUserFacingEngineText } = await import("../src/lib/expungement-ai/missing-fields.ts");
const { deriveScreens } = await import("../src/components/expungement-ai/screening/screens.ts");
const { toScreeningAnswers } = await import("../src/components/expungement-ai/screening/answers.ts");

const failures = [];
const BANNED_CONSUMER_TERMS = [
  /source review/i,
  /date anchor/i,
  /safely executable/i,
  /packet decision/i,
  /source-specific waiting period/i,
  /evaluator/i,
  /engine decides/i,
  /diagnostic/i,
  /\brule\b/i
];
const ROOT = process.cwd();
const EXPECTED_DATE_PROMPT = "What date did the case end or get resolved?";

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertNoConsumerLeak(label, values) {
  const display = values.map((value) => safeUserFacingEngineText(String(value))).join(" ");
  for (const pattern of BANNED_CONSUMER_TERMS) {
    assert(!pattern.test(display), `${label}: consumer display leaked ${pattern}: ${display}`);
  }
}

const profileRouteSource = fs.readFileSync(path.join(ROOT, "src/app/api/expungement-ai/profiles/[state]/route.ts"), "utf8");
assert(profileRouteSource.includes("projectPublicProfile(profile)"), "/api/expungement-ai/profiles/[state] must use projectPublicProfile(profile).");

const profile = getProfileByJurisdiction("MS");
assert(profile, "Mississippi profile must exist.");
const publicProfile = projectPublicProfile(profile);
const dateQuestion = publicProfile.questions.find((question) => question.id === "disposition_date");
assert(dateQuestion, "Mississippi public profile must include disposition_date.");
assert(dateQuestion?.required === true, "Mississippi disposition_date must be required before evaluation.");
assert(dateQuestion?.lifecyclePhase === "prepay_timing_gate", "Mississippi disposition_date must be a prepay timing gate.");
assert(dateQuestion?.stage === "timing_and_completion", "Mississippi disposition_date must remain in timing_and_completion.");
assert(dateQuestion?.prompt === EXPECTED_DATE_PROMPT, "Mississippi disposition_date prompt must be consumer-grade.");
assert(dateQuestion?.helperText?.includes("court docket"), "Mississippi disposition_date helper must point users to court records.");

const screens = deriveScreens(publicProfile);
const screenIds = screens.map((question) => question.id);
assert(screens.length > 5, `Mississippi derived screen count must be more than 5; got ${screens.length}.`);
assert(screenIds.includes("disposition_date"), "ScreeningFlow-derived MS screens must include disposition_date.");
assert(screenIds.indexOf("disposition_date") > screenIds.indexOf("possible_pathway_context"), "Date question should appear after route/source selection.");
assert(screens.find((question) => question.id === "disposition_date")?.prompt === EXPECTED_DATE_PROMPT, "Derived date screen must use consumer-grade prompt.");

function buildAnswers(dateValue) {
  const uiAnswers = {};
  for (const question of publicProfile.questions) {
    if (question.id === "ownership_scope") uiAnswers[question.id] = "Yes";
    if (question.id === "jurisdiction_scope") uiAnswers[question.id] = "State or local";
    if (question.id === "case_outcome") uiAnswers[question.id] = "Dismissed, no-billed, nolle prosequi, or not prosecuted";
    if (question.id === "offense_level") uiAnswers[question.id] = "Misdemeanor";
    if (question.id === "possible_pathway_context") uiAnswers[question.id] = "Non-conviction expungement for dismissal, no disposition, or acquittal";
    if (question.id === "disposition_date" && dateValue !== undefined) uiAnswers[question.id] = dateValue;
  }
  return toScreeningAnswers(uiAnswers);
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
  assertNoConsumerLeak(name, [result.userLabel, ...result.reasons.map((reason) => reason.text), ...result.nextSteps]);
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
assertNoConsumerLeak("missing-date-missing-list", missingDate.missingQuestionIds);

const unknownDate = evaluate("unknown-date", buildAnswers({ unknown: true }));
const unknownDisplay = [
  unknownDate.userLabel,
  ...unknownDate.reasons.map((reason) => safeUserFacingEngineText(reason.text)),
  ...unknownDate.nextSteps.map((step) => safeUserFacingEngineText(step))
].join(" ");
assert(unknownDate.paymentAllowed === false, "Unknown-date path must not allow payment.");
assert(unknownDate.resultCode === "needs_more_info", `Unknown-date path should return needs_more_info, got ${unknownDate.resultCode}.`);
assert(
  unknownDisplay.includes("We need the case date, dismissal date, disposition date, or completion date used to check the waiting period.")
    || unknownDisplay.includes("We need one more detail before we can prepare the right packet."),
  "Unknown-date path must show plain-language missing-date copy."
);
assertNoConsumerLeak("unknown-date-display", [unknownDisplay]);

const screeningFlowSource = fs.readFileSync(path.join(ROOT, "src/components/expungement-ai/screening/ScreeningFlow.tsx"), "utf8");
const localizationSource = fs.readFileSync(path.join(ROOT, "src/lib/expungement-ai/localization.ts"), "utf8");
assert(!screeningFlowSource.includes("The engine decides the result"), "Screening footer fallback must not mention engine decides.");
assert(!localizationSource.includes("The engine decides the result"), "Localized screening footer must not mention engine decides.");
assert(localizationSource.includes("the court or agency makes the final decision"), "Localized screening footer must mention court/agency final decision.");

if (failures.length > 0) {
  console.error("Mississippi Expungement.ai result-path verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Mississippi Expungement.ai result-path verifier passed.");
console.log(`Public profile date question: ${dateQuestion?.id} · ${dateQuestion?.lifecyclePhase} · required=${dateQuestion?.required}`);
console.log(`Derived screens: ${screens.length} (${screenIds.join(" -> ")})`);
console.log(`Happy path: ${happy.resultCode}, paymentAllowed=${happy.paymentAllowed}`);
console.log(`Missing date: ${missingDate.resultCode}, missing=${missingDate.missingQuestionIds.join(",")}`);
console.log(`Unknown date: ${unknownDate.resultCode}, paymentAllowed=${unknownDate.paymentAllowed}`);
