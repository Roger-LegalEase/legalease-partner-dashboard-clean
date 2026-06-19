import "server-only";

import crypto from "node:crypto";
import { answerText, isAffirmative, isNegative, isUnknownAnswer, requiredMissingPublicQuestionIds, validatePublicAnswerQuestionIds } from "@/lib/rcap-engine/answer-normalization";
import type { EngineProfile, ScreeningAnswerValue, ScreeningEvaluation, ScreeningEvaluationRequest, ScreeningReason, ScreeningResultCode } from "@/lib/rcap-engine/contracts";
import { assertProfileVersion, getProfileByJurisdiction } from "@/lib/rcap-engine/profile-registry";
import { isPacketPlanFulfillmentReady, packetPlanForPathway } from "@/lib/rcap-engine/packet-planner";
import { projectPublicProfile } from "@/lib/rcap-engine/public-profile-projection";

export class UnsupportedJurisdictionError extends Error {
  constructor(readonly jurisdiction: string) {
    super(`Unsupported jurisdiction: ${jurisdiction}`);
    this.name = "UnsupportedJurisdictionError";
  }
}

export class ProfileVersionMismatchError extends Error {
  constructor(readonly currentProfileVersion: string) {
    super("Profile version mismatch.");
    this.name = "ProfileVersionMismatchError";
  }
}

export class InvalidAnswerError extends Error {
  constructor(readonly invalidQuestionIds: string[]) {
    super(`Unknown question ids: ${invalidQuestionIds.join(", ")}`);
    this.name = "InvalidAnswerError";
  }
}

export function evaluateScreening(request: ScreeningEvaluationRequest): ScreeningEvaluation {
  const profile = getProfileByJurisdiction(request.jurisdiction);
  if (!profile) throw new UnsupportedJurisdictionError(request.jurisdiction);

  const version = assertProfileVersion(profile, request.profileVersion);
  if (!version.ok) throw new ProfileVersionMismatchError(version.currentProfileVersion);

  const publicProfile = projectPublicProfile(profile);
  const invalidQuestionIds = validatePublicAnswerQuestionIds(publicProfile, request.answers);
  if (invalidQuestionIds.length > 0) throw new InvalidAnswerError(invalidQuestionIds);

  return evaluateAgainstProfile(profile, request);
}

export function evaluationHash(evaluation: ScreeningEvaluation, answers: Record<string, unknown>) {
  return crypto.createHash("sha256").update(JSON.stringify({
    jurisdiction: evaluation.jurisdiction,
    profileVersion: evaluation.profileVersion,
    matterId: evaluation.matterId,
    resultCode: evaluation.resultCode,
    pathwayId: evaluation.pathwayId,
    reasonCodes: evaluation.reasons.map((reason) => reason.code),
    answers
  })).digest("hex");
}

function evaluateAgainstProfile(profile: EngineProfile, request: ScreeningEvaluationRequest): ScreeningEvaluation {
  const answers = request.answers;
  const jurisdiction = profile.jurisdiction.code;
  const hardStop = hardStopReason(profile, answers);
  if (hardStop) return result(profile, request, "hard_stop", [hardStop]);

  const publicProfile = projectPublicProfile(profile);
  const missingQuestionIds = requiredMissingPublicQuestionIds(publicProfile, answers);
  if (missingQuestionIds.length > 0) {
    return result(profile, request, "needs_more_info", [reason(jurisdiction, "missing_required_facts", "Required public screening facts are missing.")], {
      missingQuestionIds
    });
  }

  const notYet = timingReason(profile, answers);
  if (notYet) return result(profile, request, "not_yet", [notYet], { cautions: ["A source-defined timing or completion condition is not satisfied."] });

  const exclusion = exclusionReason(profile, answers);
  if (exclusion) return result(profile, request, exclusion.code.endsWith("unknown") ? "needs_review" : "likely_not_eligible", [exclusion]);

  const ambiguity = ambiguityReason(profile, answers);
  if (ambiguity) return result(profile, request, "needs_review", [ambiguity]);

  const pathway = selectPathway(profile, answers);
  if (!pathway) {
    return result(profile, request, "needs_review", [reason(jurisdiction, "unmatched_source_route", "The supplied facts did not match an executable source-defined route.")]);
  }

  const plan = packetPlanForPathway(profile, pathway.id);
  if (plan?.mode === "automatic_relief_verification_and_guidance") {
    return result(profile, request, "guidance_only", [reason(jurisdiction, "automatic_or_no_filing_route", "The selected source-defined route is automatic or guidance-only.", pathway.sourceRef)], {
      pathwayId: pathway.id,
      packetPlan: plan,
      paymentAllowed: false
    });
  }

  const selectedCode: ScreeningResultCode = sourceCaution(profile, answers, pathway.id) ? "packet_ready_with_caution" : "packet_ready";
  return result(profile, request, selectedCode, [reason(jurisdiction, "source_pathway_match", `Answers match ${pathway.label}.`, pathway.sourceRef)], {
    pathwayId: pathway.id,
    packetPlan: plan,
    paymentAllowed: isPacketPlanFulfillmentReady(plan)
  });
}

function hardStopReason(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>): ScreeningReason | undefined {
  const jurisdiction = profile.jurisdiction.code;
  if (isNegative(answers.ownership_scope)) {
    return reason(jurisdiction, "ownership_scope_hard_stop", "The consumer flow can only evaluate a person checking their own record.");
  }
  const scope = answerText(answers.jurisdiction_scope);
  if (scope.toLowerCase().includes("federal")) {
    return reason(jurisdiction, "federal_or_out_of_scope", "Federal matters are outside this state record-clearing engine.");
  }
  return undefined;
}

function timingReason(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>): ScreeningReason | undefined {
  const jurisdiction = profile.jurisdiction.code;
  if (isNegative(answers.sentence_completion_date) || isAffirmative(answers.pending_cases)) {
    return reason(jurisdiction, "timing_or_completion_blocker", "The source-defined completion, supervision, or pending-case condition is not satisfied.");
  }
  const disposition = answerText(answers.disposition_date);
  if (/^\d{4}-\d{2}-\d{2}$/.test(disposition)) {
    const earliest = addYears(disposition, 3);
    if (earliest && earliest > new Date()) {
      return reason(jurisdiction, "waiting_period_not_satisfied", `The earliest source-review date is ${earliest.toISOString().slice(0, 10)}.`);
    }
  }
  return undefined;
}

function exclusionReason(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>): ScreeningReason | undefined {
  const jurisdiction = profile.jurisdiction.code;
  const categories = Array.isArray(answers.state_exclusion_categories)
    ? answers.state_exclusion_categories.map(String)
    : answerText(answers.state_exclusion_categories).split("|");
  const normalized = categories.map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (normalized.some((value) => value.includes("not sure"))) {
    return reason(jurisdiction, "state_exclusion_unknown", "A source-defined exclusion category is uncertain and requires review.");
  }
  const selectedExclusions = normalized.filter((value) => !value.includes("none of these"));
  if (selectedExclusions.length > 0) {
    return reason(jurisdiction, "state_exclusion_selected", "A source-defined exclusion or review-required category was selected.");
  }
  return undefined;
}

function ambiguityReason(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>): ScreeningReason | undefined {
  const jurisdiction = profile.jurisdiction.code;
  const legalFields = profile.questions.filter((question) => question.contextOnly !== true && question.stage !== "case_details" && question.stage !== "record_readiness");
  const ambiguous = legalFields.find((question) => isUnknownAnswer(answers[question.id]));
  if (ambiguous) return reason(jurisdiction, "source_fact_unknown", `${ambiguous.id} is uncertain and requires source review.`);
  return undefined;
}

function selectPathway(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>) {
  const context = answerText(answers.possible_pathway_context).toLowerCase();
  if (context) {
    const byContext = profile.pathways.find((pathway) => contextTokenMatch(context, pathway.label) || contextTokenMatch(context, pathway.summary));
    if (byContext) return byContext;
  }

  const outcome = answerText(answers.case_outcome).toLowerCase();
  const automatic = profile.pathways.find((pathway) => /automatic|clean slate|no-filing/i.test(`${pathway.label} ${pathway.summary}`));
  if (/automatic|clean slate/.test(context) && automatic) return automatic;

  const nonConviction = profile.pathways.find((pathway) => /non[- ]conviction|dismiss|acquit|arrest/i.test(`${pathway.label} ${pathway.summary}`));
  if (/dismiss|acquit|no charge|not prosecuted|arrest/.test(outcome) && nonConviction) return nonConviction;

  const juvenile = profile.pathways.find((pathway) => /juvenile|minor/i.test(`${pathway.label} ${pathway.summary}`));
  if (/juvenile|minor/.test(outcome) && juvenile) return juvenile;

  const conviction = profile.pathways.find((pathway) => /conviction|misdemeanor|felony/i.test(`${pathway.label} ${pathway.summary}`));
  if (/conviction|misdemeanor|felony/.test(outcome) && conviction) return conviction;

  return profile.pathways[0];
}

function sourceCaution(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>, pathwayId: string) {
  const pathway = profile.pathways.find((candidate) => candidate.id === pathwayId);
  const text = `${pathway?.label ?? ""} ${pathway?.summary ?? ""}`.toLowerCase();
  return text.includes("caution") || text.includes("review") || isAffirmative(answers.prior_relief);
}

function result(
  profile: EngineProfile,
  request: ScreeningEvaluationRequest,
  resultCode: ScreeningResultCode,
  reasons: ScreeningReason[],
  overrides: Partial<ScreeningEvaluation> = {}
): ScreeningEvaluation {
  const paymentAllowed = overrides.paymentAllowed === true && (resultCode === "packet_ready" || resultCode === "packet_ready_with_caution");
  return {
    jurisdiction: profile.jurisdiction.code,
    profileVersion: profile.profileVersion,
    matterId: request.matterId,
    resultCode,
    userLabel: labelForResult(resultCode),
    reasons,
    missingQuestionIds: overrides.missingQuestionIds ?? [],
    cautions: overrides.cautions ?? [],
    nextSteps: nextStepsForResult(resultCode),
    paymentAllowed,
    ...(overrides.pathwayId ? { pathwayId: overrides.pathwayId } : {}),
    ...(overrides.packetPlan ? { packetPlan: overrides.packetPlan } : {})
  };
}

function labelForResult(resultCode: ScreeningResultCode) {
  const labels: Record<ScreeningResultCode, string> = {
    packet_ready: "A source-defined packet pathway may be available.",
    packet_ready_with_caution: "A source-defined packet pathway may be available with cautions.",
    needs_more_info: "More case details are required.",
    not_yet: "A timing or completion condition is not satisfied yet.",
    guidance_only: "This route is guidance-only or automatic relief verification.",
    not_covered_yet: "This record type is not covered yet.",
    likely_not_eligible: "The answers appear to hit a source-defined exclusion.",
    needs_review: "The answers require source review before a packet decision.",
    hard_stop: "This matter is outside the self-help state screening scope."
  };
  return labels[resultCode];
}

function nextStepsForResult(resultCode: ScreeningResultCode) {
  const nextSteps: Record<ScreeningResultCode, string[]> = {
    packet_ready: ["Save this result.", "Confirm every packet field.", "Generate the source-driven self-help packet only after payment is allowed."],
    packet_ready_with_caution: ["Review the cautions.", "Confirm every packet field.", "Do not file until the packet and instructions are reviewed."],
    needs_more_info: ["Answer the missing source-defined questions.", "Use court records when possible.", "Run the evaluation again."],
    not_yet: ["Save the timing result.", "Confirm the anchor date from records.", "Return when the source-defined wait may be satisfied."],
    guidance_only: ["Review the state-specific guidance.", "Verify the record status with the listed source.", "Do not pay for a filing packet for this route."],
    not_covered_yet: ["Save this result.", "Request follow-up.", "Consider legal aid or attorney help."],
    likely_not_eligible: ["Review the source-backed reason.", "Do not use automated packet generation.", "Consider legal aid or attorney help."],
    needs_review: ["Gather court records.", "Save the result.", "Get source review before any filing packet is generated."],
    hard_stop: ["Do not use this state self-help packet flow.", "Gather the relevant record.", "Contact legal aid or an attorney."]
  };
  return nextSteps[resultCode];
}

function reason(jurisdiction: string, suffix: string, text: string, sourceRef?: string): ScreeningReason {
  return {
    code: `${jurisdiction.toLowerCase()}.${suffix}`,
    text,
    ...(sourceRef ? { sourceRef } : {})
  };
}

function contextTokenMatch(context: string, value: string) {
  const tokens = value.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 4);
  return tokens.some((token) => context.includes(token));
}

function addYears(dateText: string, years: number) {
  const [year, month, day] = dateText.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(Date.UTC(year + years, month - 1, day));
}
