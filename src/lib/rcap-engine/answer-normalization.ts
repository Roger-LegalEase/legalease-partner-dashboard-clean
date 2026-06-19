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

export function requiredMissingPublicQuestionIds(publicProfile: PublicJurisdictionProfile, answers: Record<string, ScreeningAnswerValue>) {
  const publicIds = publicQuestionIdSet(publicProfile);
  return publicProfile.questions
    .filter((question) => publicIds.has(question.id))
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
