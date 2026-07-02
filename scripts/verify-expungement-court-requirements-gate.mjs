import { register } from "node:module";

process.env.RCAP_EVALUATOR_TODAY = "2026-07-01";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { getAllJurisdictionProfiles, getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");
const { evaluateScreening } = await import("../src/lib/rcap-engine/evaluator.ts");

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const requiredLabels = ["yes", "no", "not_sure", "not_applicable"];
let profilesWithGate = 0;

for (const profile of getAllJurisdictionProfiles()) {
  const publicProfile = projectPublicProfile(profile);
  const gate = publicProfile.questions.find((question) => question.id === "court_requirements_completed");
  if (!gate) continue;
  profilesWithGate += 1;
  assert(gate.prompt === "Have you completed everything the court ordered in this case?", `${profile.jurisdiction.code}: court gate prompt mismatch.`);
  assert(gate.helperText?.includes("probation, parole, fines, fees, restitution"), `${profile.jurisdiction.code}: court gate helper must mention common court requirements.`);
  assert(gate.type === "single_choice", `${profile.jurisdiction.code}: court gate must be single_choice.`);
  assert(requiredLabels.every((option) => gate.options?.includes(option)), `${profile.jurisdiction.code}: court gate options are incomplete.`);
  assert(gate.translations?.es?.prompt, `${profile.jurisdiction.code}: court gate needs Spanish prompt.`);
  assert(gate.optionDisplay?.not_applicable?.translations?.es?.label, `${profile.jurisdiction.code}: court gate options need Spanish labels.`);
}

assert(profilesWithGate >= 30, `Expected broad court-requirements gate across relevant profiles; found ${profilesWithGate}.`);

const profile = getProfileByJurisdiction("MS");
const publicProfile = projectPublicProfile(profile);
assert(publicProfile.questions.some((question) => question.id === "court_requirements_completed"), "Mississippi must include court_requirements_completed.");

function answers(courtRequirements) {
  return {
    ownership_scope: "Yes",
    jurisdiction_scope: "State or local",
    case_outcome: "Dismissed, no-billed, nolle prosequi, or not prosecuted",
    offense_level: "Misdemeanor",
    possible_pathway_context: "Non-conviction expungement for dismissal, no disposition, or acquittal",
    resolved_timing_bucket: "gt_10_years",
    court_requirements_completed: courtRequirements,
    pending_cases: "No"
  };
}

const yes = evaluateScreening({
  jurisdiction: "MS",
  profileVersion: profile.profileVersion,
  matterId: "verify-court-requirements-yes",
  answers: answers("yes")
});
assert(["packet_ready", "packet_ready_with_caution"].includes(yes.resultCode), `yes should allow evaluator to continue, got ${yes.resultCode}.`);
assert(yes.paymentAllowed === true, "yes should allow payment when other gates pass.");

const no = evaluateScreening({
  jurisdiction: "MS",
  profileVersion: profile.profileVersion,
  matterId: "verify-court-requirements-no",
  answers: answers("no")
});
assert(no.resultCode === "not_yet", `no should return not_yet, got ${no.resultCode}.`);
assert(no.paymentAllowed === false, "no must prevent payment.");

const notSure = evaluateScreening({
  jurisdiction: "MS",
  profileVersion: profile.profileVersion,
  matterId: "verify-court-requirements-not-sure",
  answers: answers("not_sure")
});
assert(notSure.resultCode === "needs_more_info", `not_sure should return needs_more_info, got ${notSure.resultCode}.`);
assert(notSure.paymentAllowed === false, "not_sure must prevent payment.");

const notApplicable = evaluateScreening({
  jurisdiction: "MS",
  profileVersion: profile.profileVersion,
  matterId: "verify-court-requirements-not-applicable",
  answers: answers("not_applicable")
});
assert(notApplicable.paymentAllowed === true, "not_applicable should be neutral only when the route can otherwise proceed.");

if (failures.length) {
  console.error("Court requirements gate verifier failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Court requirements gate verifier passed.");
console.log(`Profiles with court_requirements_completed: ${profilesWithGate}`);
console.log(`yes=${yes.resultCode}/${yes.paymentAllowed}, no=${no.resultCode}/${no.paymentAllowed}, not_sure=${notSure.resultCode}/${notSure.paymentAllowed}`);
