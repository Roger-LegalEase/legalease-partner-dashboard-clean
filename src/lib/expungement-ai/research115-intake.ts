import { RESEARCH115_COMPONENT_COPY } from "@/lib/expungement-ai/research115-packet-copy";
import type { ProfileQuestion, AnswerValue } from "@/lib/expungement-ai/frontend/contracts";
import type { ScreeningEvaluation, ScreeningResultCode } from "@/lib/rcap-engine/contracts";
import { questionAnswerState } from "@/lib/expungement-ai/question-answer-state";
import { evaluateResearchLimitedRoute } from "@/lib/rcap-engine/research115-limited-branches";
import { AK_IDENTITY_ROUTE, evaluateAlaskaIdentity, alaskaIdentityQuestions } from "@/lib/rcap-engine/alaska-identity-research";
import { WEST_VIRGINIA_407_ROUTE, evaluateWestVirginia407, westVirginia407Questions } from "@/lib/rcap-engine/west-virginia-407-facts";
import { GA_NONCONVICTION_ROUTE, georgiaNonconvictionQuestions } from "@/lib/rcap-engine/georgia-nonconviction-research";

export function research115Eligibility(routeKey: string, facts: Readonly<Record<string, unknown>>, asOf: string) {
  if (routeKey === AK_IDENTITY_ROUTE) return evaluateAlaskaIdentity(facts, asOf);
  if (routeKey === WEST_VIRGINIA_407_ROUTE) return evaluateWestVirginia407(routeKey, facts, asOf);
  return routeKey === GA_NONCONVICTION_ROUTE ? evaluateResearchLimitedRoute(routeKey, facts, asOf) : null;
}

export function research115PacketFactIds(routeKey: string, facts: Readonly<Record<string, unknown>>, includeInactive = false): string[] {
  if (routeKey === AK_IDENTITY_ROUTE) return alaskaIdentityQuestions(facts, includeInactive).map(q => q.id);
  if (routeKey === WEST_VIRGINIA_407_ROUTE) return westVirginia407Questions(routeKey).map(q => q.id);
  return routeKey === GA_NONCONVICTION_ROUTE ? georgiaNonconvictionQuestions(facts, includeInactive).map(q => q.id) : [];
}

/** Authenticated packet intake only; the research does not add a screening questionnaire. */
export function research115PacketQuestions(routeKey: string, facts: Readonly<Record<string, unknown>>): ProfileQuestion[] {
  const definitions = routeKey === WEST_VIRGINIA_407_ROUTE ? westVirginia407Questions(routeKey)
    : (routeKey === GA_NONCONVICTION_ROUTE ? georgiaNonconvictionQuestions(facts)
      : routeKey === AK_IDENTITY_ROUTE ? alaskaIdentityQuestions(facts) : []).map(q => ({
    id: q.id, type: q.type, prompt: q.en, promptEs: q.es,
    options: "options" in q && q.options ? [...q.options] : undefined, optionsEn: "optionsEn" in q && q.optionsEn ? [...q.optionsEn] : undefined, optionsEs: "optionsEs" in q && q.optionsEs ? [...q.optionsEs] : undefined
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
  initialAnswers: Record<string, AnswerValue>; missingInputIds: string[]; stage: "not_started" | "in_progress" | "facts_complete" | "ready_to_generate"; reviewedAt: string | null; expectedComponents?: string[];
};


/** Keep raw answers and existing plans; add the material facts to the existing intake surface. */
export function withResearch115PacketQuestions<T extends PacketQuestionModel>(model: T): T {
  const additions = research115PacketQuestions(`${model.stateCode}:${model.pathwayId ?? ""}`, model.initialAnswers);
  if (!additions.length) return model;
  const merge = (prior: ProfileQuestion[]) => [...prior.filter(q => !additions.some(a => a.id === q.id)), ...additions];
  const gate = research115Eligibility(`${model.stateCode}:${model.pathwayId ?? ""}`, model.initialAnswers, new Date().toISOString().slice(0, 10));
  const missing = additions.filter(q => questionAnswerState(q, model.initialAnswers[q.id]) !== "known_valid"
    || gate?.missingFactIds.includes(q.id)).map(q => q.id);
  return { ...model, questions: merge(model.questions), builderQuestions: merge(model.builderQuestions),
    missingInputIds: [...new Set([...model.missingInputIds, ...missing])],
    ...(model.expectedComponents && gate ? { expectedComponents: gate.status === "qualifying"
      ? RESEARCH115_COMPONENT_COPY[`${model.stateCode}:${model.pathwayId ?? ""}` as keyof typeof RESEARCH115_COMPONENT_COPY].map(([en]) => en) : [] } : {}),
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
