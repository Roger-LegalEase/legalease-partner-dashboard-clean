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
  /\bqualify\b/i,
  /\bapproved\b/i,
  /\bguaranteed\b/i
];
const ROOT = process.cwd();
const EXPECTED_TIMING_PROMPT = "About how long ago did this case end or get resolved?";

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
const timingQuestion = publicProfile.questions.find((question) => question.id === "resolved_timing_bucket");
assert(timingQuestion, "Mississippi public profile must include resolved_timing_bucket.");
assert(timingQuestion?.required === true, "Mississippi resolved_timing_bucket must be required before evaluation.");
assert(timingQuestion?.lifecyclePhase === "prepay_timing_gate", "Mississippi resolved_timing_bucket must be a prepay timing gate.");
assert(timingQuestion?.stage === "timing_and_completion", "Mississippi resolved_timing_bucket must remain in timing_and_completion.");
assert(timingQuestion?.prompt === EXPECTED_TIMING_PROMPT, "Mississippi must ask approximate timing, not an exact date.");
assert(timingQuestion?.helperText?.includes("An estimate is okay for this free screening."), "Mississippi timing helper must explain estimates are acceptable.");
assert(!publicProfile.questions.some((question) => question.id === "disposition_date" && question.lifecyclePhase?.startsWith("prepay_")), "Mississippi prepayment profile must not expose exact disposition_date.");

const courtQuestion = publicProfile.questions.find((question) => question.id === "court_requirements_completed");
assert(courtQuestion, "Mississippi public profile must include court_requirements_completed.");

const screens = deriveScreens(publicProfile);
const screenIds = screens.map((question) => question.id);
assert(screens.length > 5, `Mississippi derived screen count must be more than 5; got ${screens.length}.`);
assert(screenIds.includes("resolved_timing_bucket"), "ScreeningFlow-derived MS screens must include resolved_timing_bucket.");
assert(screenIds.includes("court_requirements_completed"), "ScreeningFlow-derived MS screens must include court_requirements_completed.");
assert(!screenIds.includes("disposition_date"), "ScreeningFlow-derived MS screens must not include disposition_date.");

function buildAnswers(bucket = "gt_10_years") {
  return {
    ownership_scope: "Yes",
    jurisdiction_scope: "State or local",
    case_outcome: "Dismissed, no-billed, nolle prosequi, or not prosecuted",
    offense_level: "Misdemeanor",
    possible_pathway_context: "Non-conviction expungement for dismissal, no disposition, or acquittal",
    resolved_timing_bucket: bucket,
    court_requirements_completed: "yes",
    pending_cases: "No"
  };
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

const happy = evaluate("happy", buildAnswers("gt_10_years"));
assert(
  happy.resultCode === "packet_ready" || happy.resultCode === "packet_ready_with_caution",
  `Mississippi supported happy path should be packet-ready, got ${happy.resultCode}.`
);
assert(happy.paymentAllowed === true, "Mississippi supported happy path should allow payment only after packet-ready result.");

const unsureTiming = evaluate("unsure-timing", buildAnswers("not_sure"));
assert(unsureTiming.resultCode === "needs_more_info", `Unsure timing should return needs_more_info, got ${unsureTiming.resultCode}.`);
assert(unsureTiming.paymentAllowed === false, "Unsure timing must not allow payment.");
assert(unsureTiming.missingQuestionIds.includes("resolved_timing_bucket"), "Unsure timing must point back to resolved_timing_bucket.");

const stillOpen = evaluate("still-open", buildAnswers("still_open"));
assert(stillOpen.resultCode === "not_yet", `Still-open timing should return not_yet, got ${stillOpen.resultCode}.`);
assert(stillOpen.paymentAllowed === false, "Still-open timing must not allow payment.");

const incompleteCourt = evaluate("court-no", {
  ...buildAnswers("gt_10_years"),
  court_requirements_completed: "no"
});
assert(incompleteCourt.resultCode === "not_yet", `Court-incomplete path should return not_yet, got ${incompleteCourt.resultCode}.`);
assert(incompleteCourt.paymentAllowed === false, "Court-incomplete path must not allow payment.");

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
console.log(`Public timing question: ${timingQuestion?.id} · ${timingQuestion?.lifecyclePhase} · required=${timingQuestion?.required}`);
console.log(`Derived screens: ${screens.length} (${screenIds.join(" -> ")})`);
console.log(`Happy path: ${happy.resultCode}, paymentAllowed=${happy.paymentAllowed}`);
console.log(`Unsure timing: ${unsureTiming.resultCode}, missing=${unsureTiming.missingQuestionIds.join(",")}`);
console.log(`Still open: ${stillOpen.resultCode}, paymentAllowed=${stillOpen.paymentAllowed}`);
