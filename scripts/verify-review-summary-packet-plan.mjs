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

// ANSWER REUSE. The Mississippi non-conviction packet requires
// offense_category and sentence_completion_date, the builder never asks them,
// and nothing else answered them, so every draft stayed incomplete and could
// never verify. They are now carried forward from the participant's own
// explicit screening answers, and only where the source and the destination
// are the same fact.
const PATHWAY = "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";
const carry = (overrides) => packetInformation.carriedForwardPacketAnswers("MS", PATHWAY, { ...answers, ...overrides });

// sentence_completion_date is named like a date but the profile defines it as a
// completion status, and the evaluator only reads it as one. Demonstrated from
// the profile itself rather than asserted.
const groups = publicProfile.postPaymentPacketCompletion ?? {};
const publicQuestions = [
  ...publicProfile.questions,
  ...(groups.requiredPacketCompletionFields ?? []),
  ...(groups.officialFormFields ?? []),
  ...(groups.customPleadingFields ?? [])
];
const completionQuestion = publicQuestions.find((question) => question.id === "sentence_completion_date");
check(
  completionQuestion?.type === "yes_no_unsure" && /Is the sentence complete/i.test(completionQuestion?.prompt ?? ""),
  `sentence_completion_date is a completion status, not a calendar date (type ${completionQuestion?.type ?? "absent"})`
);
const courtQuestion = publicQuestions.find((question) => question.id === "court_requirements_completed");
check(
  /completed everything the court ordered/i.test(courtQuestion?.prompt ?? "") && (courtQuestion?.options ?? []).includes("yes"),
  "court_requirements_completed asks whether everything the court ordered is complete"
);

// The equivalent mapping, and only it: "yes, everything the court ordered is
// complete" entails the ordered sentence is complete. No other value carries.
check(carry({ court_requirements_completed: "yes" }).sentence_completion_date === "Yes", "\"yes, everything the court ordered is complete\" carries the equivalent completion status");
check(!("sentence_completion_date" in carry({ court_requirements_completed: "not_sure" })), "an unsure court-requirements answer carries nothing, so unknown stays unknown");
check(!("sentence_completion_date" in carry({ court_requirements_completed: "no" })), "a negative court-requirements answer is not converted into a sentence-completion answer");
check(!("sentence_completion_date" in carry({ court_requirements_completed: "not_applicable" })), "a not-applicable court-requirements answer asserts no completion and carries nothing");
check(!("sentence_completion_date" in carry({ court_requirements_completed: undefined })), "an absent court-requirements answer carries nothing");
check(
  Object.values(carry({ court_requirements_completed: "yes" })).every((value) => typeof value === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(value)),
  "no carried value is a fabricated calendar date"
);

// offense_category has no question of its own; the charge level is the same fact.
check(carry({}).offense_category === answers.offense_level, "the participant's own charge level carries into the offense classification");
check(!("offense_category" in carry({ offense_level: "I am not sure" })), "an unsure charge level classifies nothing and carries nothing");
check(!("offense_category" in carry({ offense_level: undefined })), "an absent charge level carries nothing");

// Nothing is carried outside the route whose packet needs it.
check(
  Object.keys(packetInformation.carriedForwardPacketAnswers("MS", "some-other-pathway", answers)).length === 0
    && Object.keys(packetInformation.carriedForwardPacketAnswers("CA", PATHWAY, answers)).length === 0,
  "no answer is carried outside the Mississippi non-conviction route"
);

check(
  model?.prefilledAnswers?.offense_category === answers.offense_level && model?.prefilledAnswers?.sentence_completion_date === "Yes",
  "the derived draft carries both inputs from the participant's own screening answers"
);
check(
  Array.isArray(model?.missingInputIds) && !model.missingInputIds.includes("offense_category") && !model.missingInputIds.includes("sentence_completion_date"),
  "the carried-forward inputs are no longer missing, so the draft can complete"
);
check(
  Array.isArray(model?.builderQuestions) && !model.builderQuestions.some((question) => question.id === "offense_category" || question.id === "sentence_completion_date"),
  "the builder does not re-ask an input the participant already answered"
);

// A saved packet answer is more specific than a carried-forward one and wins.
const precedence = packetInformation.protectedPacketDraftSeedFromAuthoritative({
  authoritative: seeded.authoritative,
  screeningAnswers: answers,
  packetAnswers: { offense_category: "Felony" },
  dependencies: { commercialFlowVersion: 1, entitlementSource: "consumer_payment", productId: "expungement_packet" },
  capturedAt: "2026-09-16T12:00:00.000Z"
});
check(
  precedence?.snapshot.packetAnswers.offense_category === "Felony" && !("offense_category" in (precedence?.snapshot.prefilledAnswers ?? {})),
  "a saved packet answer overrides the carried-forward value rather than the other way round"
);

// Whenever nothing could be carried, the packet's own question is asked.
const unsureSeed = presentation.protectedPacketVerificationSeedFromTrustedSource({ ...source, answers: { ...answers, offense_level: "I am not sure" } });
const unsureModel = unsureSeed ? packetInformation.protectedPacketInformationModelFor(JSON.parse(JSON.stringify(unsureSeed.verification))) : null;
check(
  unsureModel === null
    || (!("offense_category" in unsureModel.prefilledAnswers)
      && (!unsureModel.requiredInputIds.includes("offense_category")
        || unsureModel.builderQuestions.some((question) => question.id === "offense_category"))),
  "an unsure charge level leaves the offense classification to the builder wherever the packet requires it"
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
