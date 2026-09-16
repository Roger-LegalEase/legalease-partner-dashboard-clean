#!/usr/bin/env node
// Regression proof for the Final verification review page: a protected packet
// draft derived from a real trusted-source seed must produce a non-null
// verification summary, so the review page renders its verification branch.
//
// Before the fix, readPacketPlan dropped packetReadyWhen while the stored
// verification context kept it, verificationSummary returned null and the
// review page rendered "Final verification is not available for this matter"
// for every matter (hosted runs 35120640545 and 35122300936). This proof
// builds the model from the real modules with no database and no browser.
import { register } from "node:module";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const presentation = await import("../src/lib/expungement-ai/briefcase-presentation-authority.ts");
const packetInformation = await import("../src/lib/expungement-ai/packet-information.ts");
const summaryModule = await import("../src/components/expungement-ai/verification-summary.ts");
const registry = await import("../src/lib/rcap-engine/profile-registry.ts");
const projection = await import("../src/lib/rcap-engine/public-profile-projection.ts");

const failures = [];
const check = (passed, message) => {
  console.log(`${passed ? "ok  " : "FAIL"} ${message}`);
  if (!passed) failures.push(message);
};

const profile = registry.getProfileByJurisdiction("MS");
const publicProfile = projection.projectPublicProfile(profile);
const chosen = [
  ["Are you asking about your own record?", "Yes"],
  ["Did this case happen in Mississippi (not a federal case)?", "State or local"],
  ["How did the case end?", "The case was dropped or thrown out"],
  ["What kind of charge was it?", "Misdemeanor"],
  ["Do any of these sound like your situation?", "Non-conviction expungement for dismissal, no disposition, or acquittal"],
  ["About how long ago did this case end or get resolved?", "More than 10 years ago"],
  ["Have you completed everything the court ordered in this case?", "Yes"]
];
const answers = {};
for (const [prompt, desired] of chosen) {
  const question = publicProfile.questions.find((entry) => entry.prompt === prompt);
  const option = (question?.options ?? []).find((candidate) => {
    const label = question.optionDisplay?.[candidate]?.label ?? candidate;
    return label.toLowerCase().startsWith(desired.toLowerCase());
  });
  if (question && option) answers[question.id] = option;
}
check(Object.keys(answers).length === chosen.length, "the Mississippi non-conviction screening answers resolve against the public profile");

const source = {
  jurisdiction: "MS",
  profileVersion: profile.profileVersion,
  matterId: "11111111-1111-4111-8111-111111111111",
  answers,
  product: "expungement_ai_dtc",
  sourceSessionId: "44444444-4444-4444-8444-444444444444",
  claimedAt: "2026-09-16T12:00:00.000Z",
  partnerBenefitActive: false,
  partnerSlug: null
};
const seeded = presentation.protectedPacketVerificationSeedFromTrustedSource(source);
check(Boolean(seeded), "the trusted-source seed evaluates to a protected draft");
const evaluation = seeded?.authoritative.evaluation;
check(
  evaluation?.resultCode === "packet_ready_with_caution" && Array.isArray(evaluation?.packetPlan?.packetReadyWhen),
  `the compiled plan carries packetReadyWhen (result ${evaluation?.resultCode ?? "none"})`
);

// Simulate the jsonb round trip the persisted record goes through.
const stored = JSON.parse(JSON.stringify(seeded?.verification ?? null));
const model = stored ? packetInformation.protectedPacketInformationModelFor(stored) : null;
check(Boolean(model), "the protected packet information model is available for the stored draft");
check(
  Array.isArray(model?.packetPlan?.packetReadyWhen),
  "the model reads packetReadyWhen back from the stored plan"
);

const summary = model
  ? summaryModule.verificationSummary({ ...model, stateCode: "MS", pathwayId: evaluation?.pathwayId ?? null })
  : null;
check(summary !== null, "the review page's verification summary is non-null for a freshly derived protected draft");

// The Mississippi non-conviction route carries offense_category and
// sentence_completion_date forward from the participant's screening answers
// (charge level and court-requirements completion); the builder hides them
// only while they are answered, so the draft can no longer be stuck as
// incomplete on questions it never shows.
check(
  model?.prefilledAnswers?.offense_category === answers.offense_level
    && model?.prefilledAnswers?.sentence_completion_date === "Yes",
  "the charge level and court-requirements answers are carried forward into the packet inputs"
);
check(
  Array.isArray(model?.missingInputIds) && !model.missingInputIds.includes("offense_category") && !model.missingInputIds.includes("sentence_completion_date"),
  "the carried-forward inputs are no longer missing"
);
check(
  Array.isArray(model?.builderQuestions) && !model.builderQuestions.some((question) => question.id === "offense_category" || question.id === "sentence_completion_date"),
  "the builder does not re-ask the carried-forward inputs while they are answered"
);
const unsureSource = { ...source, answers: { ...answers, offense_level: "I am not sure", court_requirements_completed: "not_sure" } };
const unsureSeed = presentation.protectedPacketVerificationSeedFromTrustedSource(unsureSource);
const unsureModel = unsureSeed ? packetInformation.protectedPacketInformationModelFor(JSON.parse(JSON.stringify(unsureSeed.verification))) : null;
// An unsure charge level sends the screening to needs_review (no packet plan);
// whatever the route, nothing is carried forward for it, and whenever the
// packet still requires the input the builder asks for it.
check(
  unsureModel === null
    || (!("offense_category" in unsureModel.prefilledAnswers)
      && (!unsureModel.requiredInputIds.includes("offense_category")
        || unsureModel.builderQuestions.some((question) => question.id === "offense_category"))),
  "an unsure charge level carries nothing forward and the builder asks for the offense category whenever it is required"
);

// The forged-context rejection must survive: an extra key the model does not carry is still refused.
if (model) {
  const forgedContext = model.verificationContext.map((entry) => entry.key === "packetPlan"
    ? { ...entry, value: { ...entry.value, forgedDependency: true } }
    : entry);
  const forged = summaryModule.verificationSummary({ ...model, verificationContext: forgedContext, stateCode: "MS", pathwayId: evaluation?.pathwayId ?? null });
  check(forged === null, "a forged packet plan key in the stored context is still rejected");
}

if (failures.length > 0) {
  console.error(`verify-review-summary-packet-plan failed: ${failures.length} check(s)`);
  process.exit(1);
}
console.log("verify-review-summary-packet-plan passed");
