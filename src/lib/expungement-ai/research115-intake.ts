import { RESEARCH115_COMPONENT_COPY, MD_CANNABIS_COMPONENT_COPY, IOWA_MISDEMEANOR_COMPONENT_COPY, IOWA_ALCOHOL_COMPONENT_COPY, IOWA_7251_COMPONENT_COPY } from "@/lib/expungement-ai/research115-packet-copy";
import type { ProfileQuestion, AnswerValue } from "@/lib/expungement-ai/frontend/contracts";
import type { EngineProfile, ScreeningEvaluation, ScreeningResultCode } from "@/lib/rcap-engine/contracts";
import { questionAnswerState } from "@/lib/expungement-ai/question-answer-state";
import { evaluateResearchLimitedRoute } from "@/lib/rcap-engine/research115-limited-branches";
import { AK_IDENTITY_ROUTE, evaluateAlaskaIdentity, alaskaIdentityQuestions } from "@/lib/rcap-engine/alaska-identity-research";
import { WEST_VIRGINIA_407_ROUTE, evaluateWestVirginia407, westVirginia407Questions } from "@/lib/rcap-engine/west-virginia-407-facts";
import { GA_NONCONVICTION_ROUTE, georgiaNonconvictionQuestions } from "@/lib/rcap-engine/georgia-nonconviction-research";
import { MD_CANNABIS_ROUTE, evaluateMarylandCannabis, marylandCannabisQuestions, marylandCannabisFactIds } from "@/lib/rcap-engine/maryland-cannabis-research";
import { MASSACHUSETTS_ADULT_SEALING_ROUTE, evaluateMassachusettsAdultSealing, massachusettsAdultSealingQuestions } from "@/lib/rcap-engine/massachusetts-adult-sealing-facts";
import { MASSACHUSETTS_ADULT_DOCUMENT_FACT_IDS, massachusettsAdultSealingDocumentQuestions, massachusettsAdultSealingDocumentAnswerKnown } from "@/lib/rcap/documents/massachusetts-adult-sealing-document-facts";
import { ALASKA_IDENTITY_DOCUMENT_FACT_IDS, ALASKA_IDENTITY_LATER_INPUT_IDS, alaskaIdentityDocumentQuestions, alaskaIdentityDocumentAnswerKnown } from "@/lib/rcap/documents/alaska-identity-document-facts";
import { MARYLAND_CANNABIS_DOCUMENT_FACT_IDS, marylandCannabisDocumentQuestions, marylandCannabisDocumentAnswerKnown } from "@/lib/rcap/documents/maryland-cannabis-document-facts";
import { IOWA_MISDEMEANOR_ROUTE, IOWA_MISDEMEANOR_EXPLICIT_UNKNOWN_FACT_IDS, iowaMisdemeanorQuestions, iowaMisdemeanorFactsFromAnswers, evaluateIowaMisdemeanorPreparation } from "@/lib/rcap-engine/iowa-misdemeanor-native.mjs";
import { IOWA_ALCOHOL_ROUTES, IOWA_ALCOHOL_EXPLICIT_UNKNOWN_FACT_IDS, iowaAlcoholQuestions, iowaAlcoholFactsFromAnswers, evaluateIowaAlcoholPreparation } from "@/lib/rcap-engine/iowa-alcohol-native.mjs";
import { ND_NONCONVICTION_ROUTE, ND_NONCONVICTION_OFFICIAL_SOURCE_SHA256, northDakotaNonconvictionFactIds, northDakotaNonconvictionQuestions, evaluateNorthDakotaNonconviction } from "@/lib/rcap-engine/north-dakota-nonconviction-facts";
import { ND_NONCONVICTION_DOCUMENT_FACT_IDS, northDakotaNonconvictionDocumentQuestions, northDakotaNonconvictionDocumentAnswerKnown } from "@/lib/rcap/documents/north-dakota-nonconviction-document-facts";
import { IOWA_7251_ROUTE, IOWA_7251_EXPLICIT_UNKNOWN_FACT_IDS, iowa7251Questions, iowa7251FactsFromAnswers, evaluateIowa7251Preparation } from "@/lib/rcap-engine/iowa-7251-native.mjs";

function preparationAnswerComplete(routeKey: string, question: ProfileQuestion, value: unknown, asOf: string): boolean {
  const state = questionAnswerState(question, value, asOf);
  const unknownIds = routeKey === IOWA_MISDEMEANOR_ROUTE ? IOWA_MISDEMEANOR_EXPLICIT_UNKNOWN_FACT_IDS
    : routeKey === IOWA_7251_ROUTE ? IOWA_7251_EXPLICIT_UNKNOWN_FACT_IDS
    : Object.hasOwn(IOWA_ALCOHOL_ROUTES, routeKey) ? IOWA_ALCOHOL_EXPLICIT_UNKNOWN_FACT_IDS : [];
  if (unknownIds.includes(question.id)) {
    if (value === null) return true;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const wrapper = value as Record<string, unknown>;
      const prototype = Object.getPrototypeOf(wrapper);
      if ((prototype === Object.prototype || prototype === null)
        && Object.keys(wrapper).every(key => key === "value" || key === "unknown")
        && (wrapper.unknown === undefined || typeof wrapper.unknown === "boolean")
        && (wrapper.value === undefined || wrapper.value === null || ["string", "boolean"].includes(typeof wrapper.value)
          || typeof wrapper.value === "number" && Number.isFinite(wrapper.value))
        && (wrapper.unknown === true || Object.hasOwn(wrapper, "value") && wrapper.value === null)) return true;
    }
  }
  return state === "known_valid" || unknownIds.includes(question.id)
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
    // The strict Form 5 decoder distinguishes omitted/blank optional age from malformed input.
    if (routeKey === IOWA_7251_ROUTE && question.id === "ia_7251_age_at_act") continue;
    if (!preparationAnswerComplete(routeKey, question, facts[question.id], asOf)) projected[question.id] = undefined;
  }
  if (routeKey === IOWA_MISDEMEANOR_ROUTE) return { ...evaluateIowaMisdemeanorPreparation(projected, { synthetic: false, filingDate: asOf }), reviewId: "HG007" as const };
  if (routeKey === IOWA_7251_ROUTE) {
    const { facts: privateFacts, ...preparation } = evaluateIowa7251Preparation(projected, { synthetic: false, filingDate: asOf });
    // Keep person and contact facts in the owner-only mapper, outside eligibility copy.
    void privateFacts;
    return { ...preparation, reviewId: "HG006" as const, routeId: IOWA_7251_ROUTE };
  }
  if (routeKey === ND_NONCONVICTION_ROUTE) return evaluateNorthDakotaNonconviction(routeKey, projected, asOf);
  if (Object.hasOwn(IOWA_ALCOHOL_ROUTES, routeKey)) return { ...evaluateIowaAlcoholPreparation(routeKey, projected, { synthetic: false, filingDate: asOf })!, reviewId: routeKey === "IA:public-intoxication-12346" ? "HG008" as const : "HG009" as const };
  if (routeKey === AK_IDENTITY_ROUTE) return evaluateAlaskaIdentity(projected, asOf);
  if (routeKey === WEST_VIRGINIA_407_ROUTE) return evaluateWestVirginia407(routeKey, projected, asOf);
  if (routeKey === MD_CANNABIS_ROUTE) return evaluateMarylandCannabis(projected, asOf);
  if (routeKey === MASSACHUSETTS_ADULT_SEALING_ROUTE) return evaluateMassachusettsAdultSealing(routeKey, projected, asOf);
  return routeKey === GA_NONCONVICTION_ROUTE ? evaluateResearchLimitedRoute(routeKey, projected, asOf) : null;
}

export function research115PacketFactIds(routeKey: string, facts: Readonly<Record<string, unknown>>, includeInactive = false): string[] {
  if (routeKey === IOWA_MISDEMEANOR_ROUTE) return iowaMisdemeanorQuestions(facts, includeInactive).map(q => q.id);
  if (routeKey === IOWA_7251_ROUTE) return [...iowa7251Questions(facts, includeInactive).map(q => q.id), "age_at_offense"];
  if (routeKey === ND_NONCONVICTION_ROUTE) return [...northDakotaNonconvictionFactIds(facts, includeInactive),
    ...(includeInactive || evaluateNorthDakotaNonconviction(routeKey, facts, new Date().toISOString().slice(0, 10))?.status === "qualifying" ? ND_NONCONVICTION_DOCUMENT_FACT_IDS : [])];
  if (Object.hasOwn(IOWA_ALCOHOL_ROUTES, routeKey)) return iowaAlcoholQuestions(routeKey, facts, includeInactive).map(q => q.id);
  if (routeKey === AK_IDENTITY_ROUTE) return [...alaskaIdentityQuestions(facts, includeInactive).map(q => q.id),
    ...(includeInactive || evaluateAlaskaIdentity(facts, new Date().toISOString().slice(0, 10)).branchId === "dps_initial_request" ? [...ALASKA_IDENTITY_DOCUMENT_FACT_IDS, "case_identifier", "charge"] : [])];
  if (routeKey === WEST_VIRGINIA_407_ROUTE) return westVirginia407Questions(routeKey).map(q => q.id);
  if (routeKey === MD_CANNABIS_ROUTE) return [...marylandCannabisFactIds(facts, includeInactive),
    ...(includeInactive || evaluateMarylandCannabis(facts, new Date().toISOString().slice(0, 10)).status === "qualifying" ? MARYLAND_CANNABIS_DOCUMENT_FACT_IDS : [])];
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
      : routeKey === IOWA_7251_ROUTE ? iowa7251Questions(facts)
      : routeKey === ND_NONCONVICTION_ROUTE ? northDakotaNonconvictionQuestions(facts)
      : Object.hasOwn(IOWA_ALCOHOL_ROUTES, routeKey) ? iowaAlcoholQuestions(routeKey, facts)
      : routeKey === MD_CANNABIS_ROUTE ? marylandCannabisQuestions(facts) : []).map(q => ({
    id: q.id, type: q.type, prompt: q.en, promptEs: q.es,
    ...("required" in q && typeof q.required === "boolean" ? { required: q.required } : {}),
    options: "options" in q && q.options ? [...q.options] : undefined, optionsEn: "optionsEn" in q && q.optionsEn ? [...q.optionsEn] : undefined, optionsEs: "optionsEs" in q && q.optionsEs ? [...q.optionsEs] : undefined
  }));
  const alaskaDocuments = routeKey === AK_IDENTITY_ROUTE && evaluateAlaskaIdentity(facts, new Date().toISOString().slice(0, 10)).branchId === "dps_initial_request"
    ? alaskaIdentityDocumentQuestions(routeKey).map(q => ({ ...q, options: undefined, optionsEn: undefined, optionsEs: undefined })) : [];
  const marylandDocuments = routeKey === MD_CANNABIS_ROUTE && evaluateMarylandCannabis(facts, new Date().toISOString().slice(0, 10)).status === "qualifying"
    ? marylandCannabisDocumentQuestions(routeKey) : [];
  const northDakotaDocuments = routeKey === ND_NONCONVICTION_ROUTE && evaluateNorthDakotaNonconviction(routeKey, facts, new Date().toISOString().slice(0, 10))?.status === "qualifying"
    ? northDakotaNonconvictionDocumentQuestions(routeKey).map(q => ({ ...q, options: undefined, optionsEn: undefined, optionsEs: undefined })) : [];
  return [...definitions, ...alaskaDocuments, ...marylandDocuments, ...northDakotaDocuments]
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
  const later = new Set<string>(routeKey === AK_IDENTITY_ROUTE ? ALASKA_IDENTITY_LATER_INPUT_IDS
    : routeKey === IOWA_7251_ROUTE ? ["financial_obligations", "age_at_offense", "contact_information"]
    : Object.hasOwn(IOWA_ALCOHOL_ROUTES, routeKey) ? ["financial_obligations"] : []);
  const merge = (prior: ProfileQuestion[]) => [...prior.filter(q => !additions.some(a => a.id === q.id))
    .map(q => later.has(q.id) ? { ...q, required: false, contextOnly: true, lifecyclePhase: "optional_or_later" as const } : q), ...additions];
  const gate = research115Eligibility(`${model.stateCode}:${model.pathwayId ?? ""}`, model.initialAnswers, new Date().toISOString().slice(0, 10));
  const componentCopy = RESEARCH115_COMPONENT_COPY[`${model.stateCode}:${model.pathwayId ?? ""}` as keyof typeof RESEARCH115_COMPONENT_COPY];
  const iowaFacts = routeKey === IOWA_MISDEMEANOR_ROUTE && gate?.status === "qualifying"
    ? iowaMisdemeanorFactsFromAnswers(model.initialAnswers, { synthetic: false, filingDate: new Date().toISOString().slice(0, 10) }).facts : null;
  const alcoholFacts = Object.hasOwn(IOWA_ALCOHOL_ROUTES, routeKey) && gate?.status === "qualifying"
    ? iowaAlcoholFactsFromAnswers(routeKey, model.initialAnswers, { synthetic: false, filingDate: new Date().toISOString().slice(0, 10) }).facts : null;
  const form5Facts = routeKey === IOWA_7251_ROUTE && gate?.status === "qualifying"
    ? iowa7251FactsFromAnswers(model.initialAnswers, { synthetic: false, filingDate: new Date().toISOString().slice(0, 10) }).facts : null;
  const components = gate?.status !== "qualifying" ? [] : form5Facts
    ? [IOWA_7251_COMPONENT_COPY.form[0], ...(form5Facts.filingMethod === "paper" ? [IOWA_MISDEMEANOR_COMPONENT_COPY.paperService[0]] : []), IOWA_7251_COMPONENT_COPY.instructions[0]] : alcoholFacts
    ? [IOWA_ALCOHOL_COMPONENT_COPY[routeKey === "IA:public-intoxication-12346" ? "form3" : "form4"][0],
      ...(alcoholFacts.filingMethod === "paper" ? [IOWA_MISDEMEANOR_COMPONENT_COPY.paperService[0]] : []),
      IOWA_ALCOHOL_COMPONENT_COPY.instructions[0]] : iowaFacts
    ? [IOWA_MISDEMEANOR_COMPONENT_COPY.form[0],
      ...(iowaFacts.aliases.length > 1 ? [IOWA_MISDEMEANOR_COMPONENT_COPY.aliases[0]] : []),
      ...(iowaFacts.filingMethod === "paper" ? [IOWA_MISDEMEANOR_COMPONENT_COPY.paperService[0]] : []),
      IOWA_MISDEMEANOR_COMPONENT_COPY.instructions[0]] : model.stateCode === "MD" && "documentIds" in gate
    ? gate.documentIds.map(id => {
      const copy = MD_CANNABIS_COMPONENT_COPY[id as keyof typeof MD_CANNABIS_COMPONENT_COPY];
      if (!copy) throw new Error("Unsupported Maryland packet component: " + id);
      return copy[0];
    }) : componentCopy?.map(([en]) => en) ?? [];
  const documentIds = routeKey === ND_NONCONVICTION_ROUTE && gate?.status === "qualifying" ? ND_NONCONVICTION_DOCUMENT_FACT_IDS
    : routeKey === MD_CANNABIS_ROUTE && gate?.status === "qualifying" ? MARYLAND_CANNABIS_DOCUMENT_FACT_IDS
    : routeKey === MASSACHUSETTS_ADULT_SEALING_ROUTE ? MASSACHUSETTS_ADULT_DOCUMENT_FACT_IDS
    : routeKey === AK_IDENTITY_ROUTE && gate?.status === "qualifying" ? ALASKA_IDENTITY_DOCUMENT_FACT_IDS : [];
  const documentAnswerKnown = routeKey === ND_NONCONVICTION_ROUTE ? northDakotaNonconvictionDocumentAnswerKnown
    : routeKey === MD_CANNABIS_ROUTE ? marylandCannabisDocumentAnswerKnown
    : routeKey === MASSACHUSETTS_ADULT_SEALING_ROUTE ? massachusettsAdultSealingDocumentAnswerKnown : alaskaIdentityDocumentAnswerKnown;
  const missing = additions.filter(q => q.required && (!preparationAnswerComplete(routeKey, q, model.initialAnswers[q.id], new Date().toISOString().slice(0, 10))
    || documentIds.some(id => id === q.id)
      && !documentAnswerKnown(routeKey, q.id, model.initialAnswers[q.id], new Date().toISOString().slice(0, 10)))
    || gate?.missingFactIds.includes(q.id)).map(q => q.id);
  for (const id of ["participant_full_legal_name", ...(routeKey === MD_CANNABIS_ROUTE ? ["charge"] : [])]) {
    if (documentIds.length && model.questions.some(q => q.id === id && q.required)
      && !documentAnswerKnown(routeKey, id, model.initialAnswers[id], new Date().toISOString().slice(0, 10))) missing.push(id);
  }
  return { ...model, questions: merge(model.questions), builderQuestions: merge(model.builderQuestions),
    missingInputIds: [...new Set([...model.missingInputIds.filter(id => !later.has(id)), ...missing])],
    ...(model.expectedComponents && gate ? { expectedComponents: components } : {}),
    ...(missing.length ? { stage: "in_progress", reviewedAt: null } : {}) };
}

/** Apply exact held branch plans without granting verification or payment authority. */
export function constrainResearch115Evaluation<T extends { evaluation: ScreeningEvaluation; profile?: EngineProfile }>(result: T, routeKey: string,
  facts: Readonly<Record<string, unknown>>, asOf: string): T {
  if (result.evaluation.resultCode === "hard_stop") return result;
  const gate = research115Eligibility(routeKey, facts, asOf);
  const plan = result.evaluation.packetPlan;
  if (routeKey === ND_NONCONVICTION_ROUTE && gate?.status === "qualifying" && "branchId" in gate
    && gate.branchId === "pre_effective_date_petition" && result.profile?.jurisdiction.code === "ND"
    && result.evaluation.pathwayId === ND_NONCONVICTION_ROUTE.slice(3)
    && result.evaluation.resultCode === "guidance_only"
    && result.evaluation.reasons.length === 1 && result.evaluation.reasons[0].code === "nd.guidance_only_no_user_filed_court_petition"
    && plan?.pathwayId === ND_NONCONVICTION_ROUTE.slice(3) && plan.mode === "automatic_relief_verification_and_guidance"
    && plan.formMappingStatus === "source_candidate_identified" && plan.sourceFormIds.length === 1
    && plan.sourceFormIds[0].endsWith(":" + ND_NONCONVICTION_OFFICIAL_SOURCE_SHA256)) {
    // shortcut: Held preparation only; connect this branch to the existing fulfillment evaluator before release.
    return { ...result, packetType: "official_pdf_overlay", evaluation: { ...result.evaluation,
      resultCode: "needs_review", userLabel: "Needs review", paymentAllowed: false,
      reasons: [{ code: "research115.R053.petition_preparation_held", text: gate.reason }], nextSteps: [gate.reason],
      packetPlan: { ...plan, mode: "official_form_overlay_or_source_form_set", formMappingStatus: "source_candidate_identified",
        requiredInputIds: [...northDakotaNonconvictionFactIds(facts), "participant_full_legal_name", "nd_nonconviction_county", "case_identifier"] }
    } };
  }
  if (!gate || gate.status === "qualifying") return result;
  const code: ScreeningResultCode = gate.status === "excluded" ? "likely_not_eligible" : gate.status === "not_yet" ? "not_yet"
    : gate.status === "guidance" ? "guidance_only" : gate.status === "unknown" ? "needs_more_info" : "needs_review";
  return { ...result, evaluation: { ...result.evaluation, resultCode: code, paymentAllowed: false,
    reasons: [{ code: `research115.${gate.reviewId}.${gate.status}`, text: gate.reason }],
    missingQuestionIds: [...gate.missingFactIds], nextSteps: [gate.reason] } };
}
