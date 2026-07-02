import { register } from "node:module";

process.env.RCAP_EVALUATOR_TODAY = "2026-07-01";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { getAllJurisdictionProfiles, getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");
const { evaluateScreening } = await import("../src/lib/rcap-engine/evaluator.ts");
const { deriveScreens } = await import("../src/components/expungement-ai/screening/screens.ts");

const failures = [];
const TIMING_OPTIONS = [
  "lt_1_year",
  "years_1_to_2",
  "years_2_to_3",
  "years_3_to_5",
  "years_5_to_7",
  "years_7_to_10",
  "gt_10_years",
  "not_sure",
  "still_open"
];
const PREPAY_DATE_IDS = new Set([
  "disposition_date",
  "dismissal_date",
  "completion_date",
  "sentence_completion_actual_date",
  "case_closed_date",
  "conviction_date",
  "last_conviction_date",
  "release_date",
  "sentencing_date",
  "discharge_date",
  "probation_parole_supervision_end_date"
]);

const assert = (condition, message) => { if (!condition) failures.push(message); };

for (const profile of getAllJurisdictionProfiles()) {
  const jurisdiction = profile.jurisdiction;
  const publicProfile = projectPublicProfile(profile);
  const hadPrepayTimingDate = profile.questions.some((question) =>
    question.stage === "timing_and_completion"
    && question.type === "date_or_unknown"
    && PREPAY_DATE_IDS.has(question.id)
  );
  const prepayExactDates = publicProfile.questions.filter((question) =>
    question.lifecyclePhase === "prepay_timing_gate"
    && question.type === "date_or_unknown"
    && PREPAY_DATE_IDS.has(question.id)
  );
  assert(prepayExactDates.length === 0, `${jurisdiction.code}: prepayment timing gate still exposes exact date inputs: ${prepayExactDates.map((q) => q.id).join(", ")}`);
  const timing = publicProfile.questions.find((question) => question.id === "resolved_timing_bucket");
  if (hadPrepayTimingDate) {
    assert(timing, `${jurisdiction.code}: public profile must expose resolved_timing_bucket.`);
    assert(timing?.type === "single_choice", `${jurisdiction.code}: resolved_timing_bucket must be single_choice.`);
    assert(TIMING_OPTIONS.every((option) => timing?.options?.includes(option)), `${jurisdiction.code}: resolved_timing_bucket options are incomplete.`);
  }
}

const msProfile = getProfileByJurisdiction("MS");
const msPublic = projectPublicProfile(msProfile);
const msScreens = deriveScreens(msPublic);
const msTiming = msPublic.questions.find((question) => question.id === "resolved_timing_bucket");
assert(msTiming?.prompt === "About how long ago did this case end or get resolved?", "Mississippi must ask approximate timing, not an exact date.");
assert(msTiming?.helperText?.includes("An estimate is okay for this free screening."), "Mississippi timing helper must explain estimate is okay.");
assert(msScreens.some((question) => question.id === "resolved_timing_bucket"), "Derived Mississippi screens must include resolved_timing_bucket.");
assert(!msScreens.some((question) => question.id === "disposition_date" && question.type === "date_or_unknown"), "Derived Mississippi screens must not include exact disposition_date date input.");

function msAnswers(bucket) {
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

const oldEnough = evaluateScreening({
  jurisdiction: "MS",
  profileVersion: msProfile.profileVersion,
  matterId: "verify-approximate-timing-old-enough",
  answers: msAnswers("gt_10_years")
});
assert(["packet_ready", "packet_ready_with_caution"].includes(oldEnough.resultCode), `Old-enough bucket should reach a possible packet result, got ${oldEnough.resultCode}.`);
assert(oldEnough.paymentAllowed === true, "Old-enough bucket should allow payment only after packet-ready result.");

const unknown = evaluateScreening({
  jurisdiction: "MS",
  profileVersion: msProfile.profileVersion,
  matterId: "verify-approximate-timing-unknown",
  answers: msAnswers("not_sure")
});
assert(unknown.resultCode === "needs_more_info", `not_sure bucket should return needs_more_info, got ${unknown.resultCode}.`);
assert(unknown.paymentAllowed === false, "not_sure bucket must not allow payment.");

const stillOpen = evaluateScreening({
  jurisdiction: "MS",
  profileVersion: msProfile.profileVersion,
  matterId: "verify-approximate-timing-still-open",
  answers: msAnswers("still_open")
});
assert(stillOpen.resultCode === "not_yet", `still_open bucket should fail closed as not_yet, got ${stillOpen.resultCode}.`);
assert(stillOpen.paymentAllowed === false, "still_open bucket must not allow payment.");

assert(!JSON.stringify([oldEnough, unknown, stillOpen]).includes("1970-01-01"), "Timing bucket evaluation must not generate a fake exact date.");
const evaluatorSource = await import("node:fs").then((fs) => fs.readFileSync(new URL("../src/lib/rcap-engine/evaluator.ts", import.meta.url), "utf8"));
assert(evaluatorSource.includes("timing_bucket_too_recent"), "Evaluator must carry a too-recent bucket branch for waiting-period routes.");

if (failures.length) {
  console.error("Approximate timing screening verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Approximate timing screening verifier passed.");
console.log(`Mississippi timing question: ${msTiming?.id} (${msTiming?.options?.join(", ")})`);
console.log(`Old enough: ${oldEnough.resultCode}, paymentAllowed=${oldEnough.paymentAllowed}`);
console.log(`Not sure: ${unknown.resultCode}, paymentAllowed=${unknown.paymentAllowed}`);
console.log(`Still open: ${stillOpen.resultCode}, paymentAllowed=${stillOpen.paymentAllowed}`);
