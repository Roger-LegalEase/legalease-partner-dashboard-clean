import { RESEARCH115_COMPONENT_COPY, MD_CANNABIS_COMPONENT_COPY, IOWA_MISDEMEANOR_COMPONENT_COPY } from "@/lib/expungement-ai/research115-packet-copy";
import type { ProfileQuestion, AnswerValue } from "@/lib/expungement-ai/frontend/contracts";
import type { ScreeningEvaluation, ScreeningResultCode } from "@/lib/rcap-engine/contracts";
import { questionAnswerState } from "@/lib/expungement-ai/question-answer-state";
import { evaluateResearchLimitedRoute } from "@/lib/rcap-engine/research115-limited-branches";
import { AK_IDENTITY_ROUTE, evaluateAlaskaIdentity, alaskaIdentityQuestions } from "@/lib/rcap-engine/alaska-identity-research";
import { WEST_VIRGINIA_407_ROUTE, evaluateWestVirginia407, westVirginia407Questions } from "@/lib/rcap-engine/west-virginia-407-facts";
import { GA_NONCONVICTION_ROUTE, georgiaNonconvictionQuestions } from "@/lib/rcap-engine/georgia-nonconviction-research";
import { MD_CANNABIS_ROUTE, evaluateMarylandCannabis, marylandCannabisQuestions, marylandCannabisFactIds } from "@/lib/rcap-engine/maryland-cannabis-research";
import { MASSACHUSETTS_ADULT_SEALING_ROUTE, evaluateMassachusettsAdultSealing, massachusettsAdultSealingQuestions } from "@/lib/rcap-engine/massachusetts-adult-sealing-facts";
import { MASSACHUSETTS_ADULT_DOCUMENT_FACT_IDS, massachusettsAdultSealingDocumentQuestions, massachusettsAdultSealingDocumentAnswerKnown } from "@/lib/rcap/documents/massachusetts-adult-sealing-document-facts";
import { ALASKA_IDENTITY_DOCUMENT_FACT_IDS, ALASKA_IDENTITY_LATER_INPUT_IDS, alaskaIdentityDocumentQuestions, alaskaIdentityDocumentAnswerKnown } from "@/lib/rcap/documents/alaska-identity-document-facts";
import { IOWA_MISDEMEANOR_ROUTE, IOWA_MISDEMEANOR_EXPLICIT_UNKNOWN_FACT_IDS, iowaMisdemeanorQuestions, iowaMisdemeanorFactsFromAnswers, evaluateIowaMisdemeanorPreparation } from "@/lib/rcap-engine/iowa-misdemeanor-native.mjs";

function preparationAnswerComplete(routeKey: string, question: ProfileQuestion, value: unknown, asOf: string): boolean {
  const state = questionAnswerState(question, value, asOf);
  return state === "known_valid" || routeKey === IOWA_MISDEMEANOR_ROUTE
    && IOWA_MISDEMEANOR_EXPLICIT_UNKNOWN_FACT_IDS.includes(question.id)
    && (state === "uncertain" || state === "unanswered" && value === null);
}

export function research115Eligibility(routeKey: string, facts: Readonly<Record<string, unknown>>, asOf: string) {
  const projected = { ...facts };
  const questions = research115PacketQuestions(routeKey, facts);
  if (routeKey === MD_CANNABIS_ROUTE) {
    const active = new Set(questions.map(question => question.id));
    // Retained waiver answers cannot elect a waiver on the separately selected court-fee branch.
    for (const id of marylandCannabisFactIds(facts, true)) if (!active.has(id)) projected[id] = undefined;
  }
  // A saved uncertainty is not evidence. Preserve the raw draft and apply the actual control contract only to evaluation.
  for (const question of questions) {
    if (!preparationAnswerComplete(routeKey, question, facts[question.id], asOf)) projected[question.id] = undefined;
  }
  if (routeKey === IOWA_MISDEMEANOR_ROUTE) return { ...evaluateIowaMisdemeanorPreparation(projected, { synthetic: false, filingDate: asOf }), reviewId: "HG007" as const };
  if (routeKey === AK_IDENTITY_ROUTE) return evaluateAlaskaIdentity(projected, asOf);
  if (routeKey === WEST_VIRGINIA_407_ROUTE) return evaluateWestVirginia407(routeKey, projected, asOf);
  if (routeKey === MD_CANNABIS_ROUTE) return evaluateMarylandCannabis(projected, asOf);
  if (routeKey === MASSACHUSETTS_ADULT_SEALING_ROUTE) return evaluateMassachusettsAdultSealing(routeKey, projected, asOf);
  return routeKey === GA_NONCONVICTION_ROUTE ? evaluateResearchLimitedRoute(routeKey, projected, asOf) : null;
}

export function research115PacketFactIds(routeKey: string, facts: Readonly<Record<string, unknown>>, includeInactive = false): string[] {
  if (routeKey === IOWA_MISDEMEANOR_ROUTE) return iowaMisdemeanorQuestions(facts, includeInactive).map(q => q.id);
  if (routeKey === AK_IDENTITY_ROUTE) return [...alaskaIdentityQuestions(facts, includeInactive).map(q => q.id),
    ...(includeInactive || evaluateAlaskaIdentity(facts, new Date().toISOString().slice(0, 10)).branchId === "dps_initial_request" ? [...ALASKA_IDENTITY_DOCUMENT_FACT_IDS, "case_identifier", "charge"] : [])];
  if (routeKey === WEST_VIRGINIA_407_ROUTE) return westVirginia407Questions(routeKey).map(q => q.id);
  if (routeKey === MD_CANNABIS_ROUTE) return marylandCannabisFactIds(facts, includeInactive);
  if (routeKey === MASSACHUSETTS_ADULT_SEALING_ROUTE) return [...massachusettsAdultSealingQuestions(routeKey, facts, includeInactive).map(q => q.id), ...MASSACHUSETTS_ADULT_DOCUMENT_FACT_IDS];
  return routeKey === GA_NONCONVICTION_ROUTE ? georgiaNonconvictionQuestions(facts, includeInactive).map(q => q.id) : [];
}

/** Authenticated packet intake only; the research does not add a screening questionnaire. */
export function research115PacketQuestions(routeKey: string, facts: Readonly<Record<string, unknown>>): ProfileQuestion[] {
  const definitions = routeKey === WEST_VIRGINIA_407_ROUTE ? westVirginia407Questions(routeKey)
    : routeKey === MASSACHUSETTS_ADULT_SEALING_ROUTE ? [...massachusettsAdultSealingQuestions(routeKey, facts), ...massachusettsAdultSealingDocumentQuestions(routeKey).map(q => ({ ...q, options: undefined, optionsEn: undefined, optionsEs: undefined }))]
    : (routeKey === GA_NONCONVICTION_ROUTE ? georgiaNonconvictionQuestions(facts)
      : routeKey === AK_IDENTITY_ROUTE ? alaskaIdentityQuestions(facts)
      : routeKey === IOWA_MISDEMEANOR_ROUTE ? iowaMisdemeanorQuestions(facts)
      : routeKey === MD_CANNABIS_ROUTE ? marylandCannabisQuestions(facts) : []).map(q => ({
    id: q.id, type: q.type, prompt: q.en, promptEs: q.es,
    options: "options" in q && q.options ? [...q.options] : undefined, optionsEn: "optionsEn" in q && q.optionsEn ? [...q.optionsEn] : undefined, optionsEs: "optionsEs" in q && q.optionsEs ? [...q.optionsEs] : undefined
  }));
  const alaskaDocuments = routeKey === AK_IDENTITY_ROUTE && evaluateAlaskaIdentity(facts, new Date().toISOString().slice(0, 10)).branchId === "dps_initial_request"
    ? alaskaIdentityDocumentQuestions(routeKey).map(q => ({ ...q, options: undefined, optionsEn: undefined, optionsEs: undefined })) : [];
  return [...definitions, ...alaskaDocuments]
    .map(q => ({ id: q.id, stage: "packet_information", prompt: q.prompt,
      type: q.type === "yes_no_unknown" ? "yes_no_unsure" : q.type === "number" ? "text" : q.type,
      required: !("required" in q && q.required === false), contextOnly: false,
      lifecyclePhase: "required" in q && q.required === false ? "optional_or_later" : "prepay_required",
      options: q.options ?? null, translations: { es: { prompt: q.promptEs } },
      ...(q.options && q.optionsEs ? { optionDisplay: Object.fromEntries(q.options.map((value, i) => [value, { label: q.optionsEn?.[i] ?? value, translations: { es: { label: q.optionsEs![i] } } }])) } : {}) }));
}

type PacketQuestionModel = {
  stateCode: string; pathwayId: string | null; questions: ProfileQuestion[]; builderQuestions: ProfileQuestion[];
  initialAnswers: Record<string, AnswerValue>; missingInputIds: string[]; stage: "not_started" | "in_progress" | "facts_complete" | "ready_to_generate"; reviewedAt: string | null; expectedComponents?: string[];
};


/** Keep raw answers and existing plans; add the material facts to the existing intake surface. */
export function withResearch115PacketQuestions<T extends PacketQuestionModel>(model: T): T {
  const routeKey = `${model.stateCode}:${model.pathwayId ?? ""}`;
  const additions = research115PacketQuestions(routeKey, model.initialAnswers);
  if (!additions.length) return model;
  const later = new Set<string>(routeKey === AK_IDENTITY_ROUTE ? ALASKA_IDENTITY_LATER_INPUT_IDS : []);
  const merge = (prior: ProfileQuestion[]) => [...prior.filter(q => !additions.some(a => a.id === q.id))
    .map(q => later.has(q.id) ? { ...q, required: false, contextOnly: true, lifecyclePhase: "optional_or_later" as const } : q), ...additions];
  const gate = research115Eligibility(`${model.stateCode}:${model.pathwayId ?? ""}`, model.initialAnswers, new Date().toISOString().slice(0, 10));
  const componentCopy = RESEARCH115_COMPONENT_COPY[`${model.stateCode}:${model.pathwayId ?? ""}` as keyof typeof RESEARCH115_COMPONENT_COPY];
  const iowaFacts = routeKey === IOWA_MISDEMEANOR_ROUTE && gate?.status === "qualifying"
    ? iowaMisdemeanorFactsFromAnswers(model.initialAnswers, { synthetic: false, filingDate: new Date().toISOString().slice(0, 10) }).facts : null;
  const components = gate?.status !== "qualifying" ? [] : iowaFacts
    ? [IOWA_MISDEMEANOR_COMPONENT_COPY.form[0],
      ...(iowaFacts.aliases.length > 1 ? [IOWA_MISDEMEANOR_COMPONENT_COPY.aliases[0]] : []),
      ...(iowaFacts.filingMethod === "paper" ? [IOWA_MISDEMEANOR_COMPONENT_COPY.paperService[0]] : []),
      IOWA_MISDEMEANOR_COMPONENT_COPY.instructions[0]] : model.stateCode === "MD" && "documentIds" in gate
    ? gate.documentIds.map(id => {
      const copy = MD_CANNABIS_COMPONENT_COPY[id as keyof typeof MD_CANNABIS_COMPONENT_COPY];
      if (!copy) throw new Error("Unsupported Maryland packet component: " + id);
      return copy[0];
    }) : componentCopy?.map(([en]) => en) ?? [];
  const documentIds = routeKey === MASSACHUSETTS_ADULT_SEALING_ROUTE ? MASSACHUSETTS_ADULT_DOCUMENT_FACT_IDS
    : routeKey === AK_IDENTITY_ROUTE && gate?.status === "qualifying" ? ALASKA_IDENTITY_DOCUMENT_FACT_IDS : [];
  const documentAnswerKnown = routeKey === MASSACHUSETTS_ADULT_SEALING_ROUTE ? massachusettsAdultSealingDocumentAnswerKnown : alaskaIdentityDocumentAnswerKnown;
  const missing = additions.filter(q => q.required && (!preparationAnswerComplete(routeKey, q, model.initialAnswers[q.id], new Date().toISOString().slice(0, 10))
    || documentIds.some(id => id === q.id)
      && !documentAnswerKnown(routeKey, q.id, model.initialAnswers[q.id], new Date().toISOString().slice(0, 10)))
    || gate?.missingFactIds.includes(q.id)).map(q => q.id);
  if (documentIds.length && model.questions.some(q => q.id === "participant_full_legal_name" && q.required)
    && !documentAnswerKnown(routeKey, "participant_full_legal_name", model.initialAnswers.participant_full_legal_name, new Date().toISOString().slice(0, 10))) missing.push("participant_full_legal_name");
  return { ...model, questions: merge(model.questions), builderQuestions: merge(model.builderQuestions),
    missingInputIds: [...new Set([...model.missingInputIds.filter(id => !later.has(id)), ...missing])],
    ...(model.expectedComponents && gate ? { expectedComponents: components } : {}),
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
