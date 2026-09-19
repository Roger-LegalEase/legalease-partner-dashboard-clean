import "server-only";

import type { EngineProfile, PublicJurisdictionProfile, ScreeningAnswerValue } from "@/lib/rcap-engine/contracts";

export function answerText(value: ScreeningAnswerValue | undefined) {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.join(" | ").trim();
  return String(value).trim();
}

export function isUnknownAnswer(value: ScreeningAnswerValue | undefined) {
  const text = answerText(value).toLowerCase();
  return !text || text.includes("not sure") || text.includes("unknown") || text.includes("prefer not");
}

/**
 * True only when a question is explicitly answered with an "I don't know"-style value
 * ("I am not sure", "unknown", "prefer not"). Unlike {@link isUnknownAnswer}, a missing,
 * undefined, or empty answer is NOT treated as unknown — absence of a required public answer
 * is handled separately by {@link requiredMissingPublicQuestionIds}.
 */
export function isExplicitUnknownAnswer(value: ScreeningAnswerValue | undefined) {
  const text = answerText(value).toLowerCase();
  if (!text) return false;
  return text.includes("not sure") || text.includes("unknown") || text.includes("prefer not");
}

export function isAffirmative(value: ScreeningAnswerValue | undefined) {
  const text = answerText(value).toLowerCase();
  return text === "true" || text === "yes" || text.startsWith("yes,") || text.includes("state or local");
}

export function isNegative(value: ScreeningAnswerValue | undefined) {
  const text = answerText(value).toLowerCase();
  return text === "false" || text === "no" || text.startsWith("no,");
}

export function requiredMissingQuestionIds(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>) {
  return profile.questions
    .filter((question) => question.required && question.contextOnly !== true)
    .filter((question) => {
      const value = answers[question.id];
      if (value === undefined || value === null) return true;
      if (Array.isArray(value)) return value.length === 0;
      return String(value).trim() === "";
    })
    .map((question) => question.id);
}

/**
 * Required screening facts the participant has not answered yet.
 *
 * This is the SCREENING gate, not the Checkout gate, and the `isPrepaymentQuestion`
 * filter below is what keeps the two apart. A question this filter drops is not a
 * required fact nobody ever collects: `postpay_*` names the section of the guided
 * journey a question belongs to, never the payment boundary.
 *
 * Checkout stands behind a different gate entirely, and a stricter one:
 *
 *   POST /api/expungement-ai/checkout
 *     -> requireCurrentPacketVerification           (payment-adapter.ts)
 *     -> a verification is `verified` only when the participant asked to verify
 *        AND missingInputIds is empty               (packet-information.ts)
 *     -> missingInputIds = collectionGateInputIds() = prepayGateFactIds()
 *     -> prepayGateFactIds = EVERY fact the participant still owes, including
 *        the render-required and filing-readiness ones
 *                                                   (packet-collection.ts)
 *
 * So a fact the packet needs is resolved before money moves even though this
 * function ignores it. `scripts/verify-rcap-prepurchase-render-facts.mjs` asserts
 * that, route by route, against each route's own packet specification. Loosening
 * either gate on the assumption that the other one catches it is the way this
 * stops being true.
 */
export function requiredMissingPublicQuestionIds(publicProfile: PublicJurisdictionProfile, answers: Record<string, ScreeningAnswerValue>) {
  const publicIds = publicQuestionIdSet(publicProfile);
  return publicProfile.questions
    .filter((question) => publicIds.has(question.id))
    .filter((question) => isPrepaymentQuestion(question))
    .filter((question) => question.required && question.contextOnly !== true)
    .filter((question) => !hasAnswer(answers[question.id]))
    .map((question) => question.id);
}

export function validateAnswerQuestionIds(profile: EngineProfile, answers: Record<string, ScreeningAnswerValue>) {
  const valid = new Set(profile.questions.map((question) => question.id));
  return Object.keys(answers).filter((questionId) => !valid.has(questionId));
}

export function validatePublicAnswerQuestionIds(publicProfile: PublicJurisdictionProfile, answers: Record<string, ScreeningAnswerValue>) {
  const valid = publicQuestionIdSet(publicProfile);
  return Object.keys(answers).filter((questionId) => !valid.has(questionId));
}

function hasAnswer(value: ScreeningAnswerValue | undefined) {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  return String(value).trim() !== "";
}

function publicQuestionIdSet(publicProfile: PublicJurisdictionProfile) {
  return new Set([
    ...publicProfile.questions.map((question) => question.id),
    ...publicProfile.flowStages.flatMap((stage) => stage.questionIds)
  ]);
}

function isPrepaymentQuestion(question: { stage: string; lifecyclePhase?: string }) {
  if (question.lifecyclePhase) return question.lifecyclePhase.startsWith("prepay_");
  return !["record_readiness", "case_details", "packet_information"].includes(question.stage);
}
