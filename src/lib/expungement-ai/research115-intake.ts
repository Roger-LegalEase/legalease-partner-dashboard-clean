import type { ProfileQuestion, AnswerValue } from "@/lib/expungement-ai/frontend/contracts";
import type { ScreeningEvaluation, ScreeningResultCode } from "@/lib/rcap-engine/contracts";
import { questionAnswerState } from "@/lib/expungement-ai/question-answer-state";
import { evaluateResearchLimitedRoute } from "@/lib/rcap-engine/research115-limited-branches";
import { GA_NONCONVICTION_ROUTE, georgiaNonconvictionQuestions } from "@/lib/rcap-engine/georgia-nonconviction-research";

export function research115Eligibility(routeKey: string, facts: Readonly<Record<string, unknown>>, asOf: string) {
  return routeKey === GA_NONCONVICTION_ROUTE ? evaluateResearchLimitedRoute(routeKey, facts, asOf) : null;
}

/** Authenticated packet intake only; the research does not add a screening questionnaire. */
export function research115PacketQuestions(routeKey: string, facts: Readonly<Record<string, unknown>>): ProfileQuestion[] {
  if (routeKey !== GA_NONCONVICTION_ROUTE) return [];
  const definitions = georgiaNonconvictionQuestions(facts).map(q => ({
    id: q.id, type: q.type, prompt: q.en, promptEs: q.es,
    options: q.options, optionsEn: q.optionsEn, optionsEs: q.optionsEs
  }));
  return definitions
    .map(q => ({ id: q.id, stage: "packet_information", prompt: q.prompt,
      type: q.type === "yes_no_unknown" ? "yes_no_unsure" : q.type === "number" ? "text" : q.type,
      required: true, contextOnly: false, lifecyclePhase: "prepay_required",
      options: q.options ?? null, translations: { es: { prompt: q.promptEs } },
      ...(q.options && q.optionsEs ? { optionDisplay: Object.fromEntries(q.options.map((value, i) => [value, { label: q.optionsEn?.[i] ?? value, translations: { es: { label: q.optionsEs![i] } } }])) } : {}) }));
}

type PacketQuestionModel = {
  stateCode: string; pathwayId: string | null; questions: ProfileQuestion[]; builderQuestions: ProfileQuestion[];
  initialAnswers: Record<string, AnswerValue>; missingInputIds: string[]; stage: "not_started" | "in_progress" | "facts_complete" | "ready_to_generate"; reviewedAt: string | null;
};

/** Keep raw answers and existing plans; add the material facts to the existing intake surface. */
export function withResearch115PacketQuestions<T extends PacketQuestionModel>(model: T): T {
  const additions = research115PacketQuestions(`${model.stateCode}:${model.pathwayId ?? ""}`, model.initialAnswers);
  if (!additions.length) return model;
  const merge = (prior: ProfileQuestion[]) => [...prior.filter(q => !additions.some(a => a.id === q.id)), ...additions];
  const missing = additions.filter(q => questionAnswerState(q, model.initialAnswers[q.id]) !== "known_valid").map(q => q.id);
  return { ...model, questions: merge(model.questions), builderQuestions: merge(model.builderQuestions),
    missingInputIds: [...new Set([...model.missingInputIds, ...missing])],
    ...(missing.length ? { stage: "in_progress", reviewedAt: null } : {}) };
}

/** A passing predicate preserves every existing hold; it cannot create packet or payment authority. */
export function constrainResearch115Evaluation<T extends { evaluation: ScreeningEvaluation }>(result: T, routeKey: string,
  facts: Readonly<Record<string, unknown>>, asOf: string): T {
  if (result.evaluation.resultCode === "hard_stop") return result;
  const gate = research115Eligibility(routeKey, facts, asOf);
  if (!gate || gate.status === "qualifying") return result;
  const code: ScreeningResultCode = gate.status === "excluded" ? "likely_not_eligible" : gate.status === "not_yet" ? "not_yet"
    : gate.status === "guidance" ? "guidance_only" : gate.status === "unknown" ? "needs_more_info" : "needs_review";
  return { ...result, evaluation: { ...result.evaluation, resultCode: code, paymentAllowed: false,
    reasons: [{ code: `research115.${gate.reviewId}.${gate.status}`, text: gate.reason }],
    missingQuestionIds: [...gate.missingFactIds], nextSteps: [gate.reason] } };
}
