import "server-only";
import { questionAnswerState, scalarAnswerText } from "@/lib/expungement-ai/question-answer-state";
import { projectPublicProfile } from "@/lib/rcap-engine/public-profile-projection";
import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import type { RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";
import { contactRepresentationHash } from "@/lib/expungement-ai/contact-representation";
import memo from "../../../data/record-clearing/legal-design-intake/MN.memo.json";
import petitionMap from "../../../data/rcap-all50/overlays/census-v1/mn/mn-petition-609a02-subd3-set--custom-pleading/production-field-map.json";
import petitionWiring from "../../../data/rcap-all50/overlays/census-v1/mn/mn-petition-609a02-subd3-set--custom-pleading/product-wiring.json";
import prosecutorMap from "../../../data/rcap-all50/overlays/census-v1/mn/mn-prosecutor-agreed-set--custom-pleading/production-field-map.json";
import prosecutorWiring from "../../../data/rcap-all50/overlays/census-v1/mn/mn-prosecutor-agreed-set--custom-pleading/product-wiring.json";

export const MN_PETITION_ROUTE = "petition-based-expungement-under-609a-02-03";
export const MN_PROSECUTOR_ROUTE = "prosecutor-agreed-sealing-without-a-full-petition-under-609a-025";
export const MN_CASE_COUNTY = "mn_deciding_case_county";
export const MN_PROSECUTED_COUNTY = "mn_prosecuted_case_county";
export const MN_PROSECUTOR_KIND = "mn_prosecuted_by";
export const MN_PROSECUTING_CITY = "mn_prosecuting_city";
export const MN_TWO_COUNTY_SOURCE = "MN.memo:mn_petition_609a02_subd3, mn_prosecutor_agreed; required participant county/prosecutedBy inputs";
/** Hashes of the imported constants, computed once per process on first use.
 * Anything passed in current.* is hashed live, so overrides stay exact. */
let imported: { memo: string; petitionMap: string; prosecutorMap: string; petitionWiring: string; prosecutorWiring: string } | undefined;
const importedHashes = () => imported ??= { memo: contactRepresentationHash(memo),
  petitionMap: contactRepresentationHash(petitionMap), prosecutorMap: contactRepresentationHash(prosecutorMap),
  petitionWiring: contactRepresentationHash(petitionWiring), prosecutorWiring: contactRepresentationHash(prosecutorWiring) };

/** Collection identity only. This is not a route/track crosswalk, agreement,
 * filing authority or an installation of the retained document families. */
export function mnTwoCountySourceContract(profile: EngineProfile | undefined,
  pathwayId: string | null | undefined, specification: RegisteredSpecification | null | undefined,
  current: { memo?: unknown; map?: unknown; wiring?: unknown } = {}): boolean {
  if (profile?.jurisdiction.code !== "MN" || specification != null
    || ![MN_PETITION_ROUTE, MN_PROSECUTOR_ROUTE].includes(pathwayId ?? "")) return false;
  const petition = pathwayId === MN_PETITION_ROUTE;
  return contactRepresentationHash(profile) === "f779704436f10e0aabf0949877f3213af1900d5bf51729cec8397006e6a3f8bf"
    && (current.memo === undefined ? importedHashes().memo : contactRepresentationHash(current.memo)) === "f0e6fbc0b3082a8721be317442151023be3a31fcb597dd96c4dde4e76596644a"
    && (current.map === undefined ? petition ? importedHashes().petitionMap : importedHashes().prosecutorMap : contactRepresentationHash(current.map))
      === (petition ? "4ed42eaf8d64764f9ffafdfda713fdaf84b082662e29f2579022680d88607b66" : "8b3e793a3ac0d4431c0c609c8465a14137ba02db05466110e99b6cf7ef53b419")
    && (current.wiring === undefined ? petition ? importedHashes().petitionWiring : importedHashes().prosecutorWiring : contactRepresentationHash(current.wiring))
      === (petition ? "d02b19ce7bdb8542c13c5135a8c2a3e24d28c01c48d9cae5c3a4be3c452b4ca2" : "b1a525e1f98998aa1557d1b15b7251640027f17cce5574466e828fd10e2b0765");
}

export function mnTwoCountyFactIds(pathwayId: string): string[] {
  return pathwayId === MN_PETITION_ROUTE ? [MN_CASE_COUNTY]
    : pathwayId === MN_PROSECUTOR_ROUTE ? [MN_PROSECUTED_COUNTY, MN_PROSECUTOR_KIND, MN_PROSECUTING_CITY] : [];
}

// Engineering EN/ES copy; adopted meaning does not certify final translations.
export function mnTwoCountyQuestions(pathwayId: string): ProfileQuestion[] {
  const text = (id: string, prompt: string, helperText: string, es: string, esHelper: string): ProfileQuestion => ({
    id, stage: "packet_information", type: "text_or_unknown", required: true, contextOnly: false, options: null,
    prompt, helperText, translations: { es: { prompt: es, helperText: esHelper } }
  });
  if (pathwayId === MN_PETITION_ROUTE) return [text(MN_CASE_COUNTY,
    "Which Minnesota county's district court decided this case?",
    "Use the county shown for this case in the court papers. Your home county and the county where you sign can be different.",
    "¿El tribunal de distrito de qué condado de Minnesota resolvió este caso?",
    "Use el condado que figura para este caso en los documentos judiciales. Su condado de residencia y el condado donde firma pueden ser distintos.")];
  if (pathwayId !== MN_PROSECUTOR_ROUTE) return [];
  const kind = text(MN_PROSECUTOR_KIND, "Was this case prosecuted by the county attorney or a city attorney?",
    "Use the prosecutor named in the court papers. This answer does not show that the prosecutor agreed to sealing.",
    "¿Este caso fue procesado por la fiscalía del condado o por una fiscalía municipal?",
    "Use la fiscalía nombrada en los documentos judiciales. Esta respuesta no demuestra que haya aceptado el sellado.");
  kind.type = "single_choice";
  kind.options = ["county_attorney", "city_attorney", "unknown"];
  kind.optionDisplay = {
    county_attorney: { label: "County attorney", translations: { es: { label: "Fiscalía del condado" } } },
    city_attorney: { label: "City attorney", translations: { es: { label: "Fiscalía municipal" } } },
    unknown: { label: "I am not sure", translations: { es: { label: "No estoy seguro" } } }
  };
  return [text(MN_PROSECUTED_COUNTY, "In which Minnesota county was this case prosecuted?",
    "Use the county shown for this case in the court papers.",
    "¿En qué condado de Minnesota se procesó este caso?",
    "Use el condado que figura para este caso en los documentos judiciales."), kind,
  text(MN_PROSECUTING_CITY, "Which city's attorney prosecuted this case?",
    "Use the city named for the prosecuting attorney in the court papers.",
    "¿La fiscalía de qué ciudad procesó este caso?",
    "Use la ciudad que figura para la fiscalía en los documentos judiciales.")];
}

/** Current target-case meaning, confirmed explicitly through the existing
 * record-fact contract. A historical generic State/local scalar is not proof. */
export const MN_TARGET_ORIGIN_ID = "jurisdiction_scope";
export const MN_TARGET_ORIGIN_SOURCE = "OWNER-RELAYED-ADOPTION-v4:MN target conviction only; other history evaluated separately";
// These are existing target-case inputs in the MN profile/held source. The
// charge/statute source answer is retained literally. No actual case-number
// value is held here; possession of paperwork is not identity. Missing optional
// identity remains unanswered, not a new question.
// No residence, signing county, contact or destination answer supplies origin.
export const MN_TARGET_ORIGIN_IDENTITY_INPUTS = [
  "court", "charge",
  "source_question_04_4-what-were-the-charges-and-statute-numb"
] as const;

export function mnTargetOriginQuestion(profile: EngineProfile | undefined, pathwayId: string | null | undefined, specification: RegisteredSpecification | null | undefined): ProfileQuestion | null {
  if (!profile || !mnTwoCountySourceContract(profile, pathwayId, specification)) return null;
  const question = projectPublicProfile(profile).questions.find(candidate => candidate.id === MN_TARGET_ORIGIN_ID);
  const options = question?.options;
  if (!question || question.prompt !== "Did this case happen in Minnesota (not a federal case)?"
    || question.type !== "single_choice" || !Array.isArray(options) || !options.every(option => typeof option === "string")
    || JSON.stringify(options) !== JSON.stringify(["State or local", "Federal", "I am not sure"])) return null;
  return { id: question.id, stage: question.stage, type: question.type, prompt: question.prompt,
    helperText: question.helperText, required: true, contextOnly: false,
    lifecyclePhase: question.lifecyclePhase, options,
    translations: question.translations };
}

/** Filter a single source-owned inventory entry, never a fact from the
 * aggregate set: another unresolved rule may reference the same fact. */
export function mnTargetOriginRule18Entry(entry: { section: string; ruleId: string; factIds: string[] }): boolean {
  return entry.section === "orderedDecisionRules" && entry.ruleId === "rule-18-federal-or-out-of-state-conviction"
    && entry.factIds.length === 1 && entry.factIds[0] === "residency_or_location";
}


/** Explicit protected facts, never a public request/track ID.
 * The existing exact null-spec contract above remains unchanged. These facts
 * identify only a held source-stage candidate; no statutory finding, numeric
 * wait, automatic-relief displacement or commercial authority is granted.
 */
const MN_STAGE = {
  result: "mn_record_final_action", recordClass: "mn_record_conviction_class",
  reduction: "mn_record_reduction_reference", felonySection: "mn_record_felony_section",
  diversion: "mn_diversion_completion", dismissal: "mn_diversion_dismissal",
  discharge: "mn_sentence_discharge_date", completion: "mn_diversion_completion_date",
  newCharge: "mn_new_charge_since_diversion_completion",
  newConviction: "mn_new_conviction_since_discharge",
  response: "mn_prosecutor_sealing_response"
} as const;

function mnStageChoice(id: string, prompt: string, es: string,
  choices: readonly (readonly [string, string, string])[]): ProfileQuestion {
  return { id, stage: "packet_information", type: "single_choice", required: true, contextOnly: false,
    prompt, helperText: "Answer from what happened in this case. Choose I am not sure when you cannot tell.",
    translations: { es: { prompt: es, helperText: "Responda según lo ocurrido en este caso. Si no puede determinarlo, elija No estoy seguro." } },
    options: choices.map(([value]) => value),
    optionDisplay: Object.fromEntries(choices.map(([value, label, esLabel]) => [value, { label, translations: { es: { label: esLabel } } }])) };
}
const MN_UNKNOWN = ["unknown", "I am not sure", "No estoy seguro"] as const;
const MN_YES_NO = [["yes", "Yes", "Sí"], ["no", "No", "No"], MN_UNKNOWN] as const;
function mnStageScalar(question: ProfileQuestion, answers: Readonly<Record<string, unknown>>): string | null {
  const raw = answers[question.id];
  if (questionAnswerState(question, raw) !== "known_valid") return null;
  // The existing typed completion control admits primitive booleans. Read its
  // known value consistently without changing the retained answer or save API.
  return typeof raw === "boolean" ? raw ? "Yes" : "No" : scalarAnswerText(raw)?.trim() ?? null;
}
function mnStageOutcome(answers: Readonly<Record<string, unknown>>): string | null {
  return mnStageScalar({ id: "case_outcome", type: "single_choice", options: [
    "Arrest or citation with no charge filed", "Dismissed, no-billed, nolle prosequi, or not prosecuted",
    "Diversion, deferred disposition, supervision, or similar program", "Misdemeanor conviction",
    "Felony conviction", "Other conviction or adjudication", "I am not sure"
  ] } as ProfileQuestion, answers);
}

/** Only missing detail is newly collected. Existing typed outcome establishes
 * misdemeanor/felony class; no duplicate charge-level or free-text alias. Old
 * narrative source questions remain literal/history and are never parsed.
 */
export function mnProtectedStageQuestions(profile: EngineProfile | undefined, pathwayId: string, answers: Readonly<Record<string, unknown>>, includeInactive = false, unresolved: readonly string[] = []): ProfileQuestion[] {
  answers = Object.fromEntries(Object.entries(answers).filter(([id]) => !unresolved.includes(id)));
  if (!mnTwoCountySourceContract(profile, pathwayId, null)) return [];
  return mnStageQuestionsFromValidatedSource(profile!, pathwayId, answers, includeInactive);
}

// Private synchronous builders receive only this invocation's validated inputs.
// No retained cache or caller-supplied validation token crosses a public entry.
function mnStageQuestionsFromValidatedSource(profile: EngineProfile, pathwayId: string,
  answers: Readonly<Record<string, unknown>>, includeInactive = false): ProfileQuestion[] {
  const outcome = mnStageOutcome(answers); const questions: ProfileQuestion[] = [];
  const add = (active: boolean, question: ProfileQuestion) => { if (active || includeInactive) questions.push(question); };
  const convicted = ["Misdemeanor conviction", "Felony conviction", "Other conviction or adjudication"].includes(outcome ?? "");
  const diversion = outcome === "Diversion, deferred disposition, supervision, or similar program";
  // Reuse the existing projected typed control, including its current prompt
  // and translations. It was in the dictionary, not previously offered by
  // these held models; this source-bound connection adds no new fact meaning.
  const projected = projectPublicProfile(profile!);
  const existingCompletion = [...projected.questions,
    ...Object.values(projected.postPaymentPacketCompletion ?? {}).flat()]
    .find(question => question.id === "sentence_completion_date");
  if (!existingCompletion || existingCompletion.type !== "yes_no_unsure") return [];
  add(convicted, { ...existingCompletion, required: true, contextOnly: false } as ProfileQuestion);
  // Despite its legacy ID, this existing control is yes/no completion, not
  // a calendar date. No unknown/cleared value or old discharge date proves it.
  const completionQuestion = { id: "sentence_completion_date", type: "yes_no_unsure" } as ProfileQuestion;
  const completionRaw = answers.sentence_completion_date;
  const sentenceComplete = questionAnswerState(completionQuestion, completionRaw) === "known_valid"
    && (completionRaw === true || scalarAnswerText(completionRaw)?.trim() === "Yes");
  const dischargeQuestion = { id: MN_STAGE.discharge, type: "date_or_unknown" } as ProfileQuestion;
  const dischargeKnown = convicted && sentenceComplete && mnStageScalar(dischargeQuestion, answers) !== null;
  add(outcome === "Dismissed, no-billed, nolle prosequi, or not prosecuted", mnStageChoice(MN_STAGE.result,
    "What final action does the court record show?", "¿Qué decisión final figura en el expediente judicial?", [
      ["acquitted", "Found not guilty", "Declaración de no culpabilidad"],
      ["dismissed", "All charges in this case were dismissed", "Se desestimaron todos los cargos de este caso"],
      ["other_or_disputed", "Another result, conditions I cannot resolve, or a disputed result", "Otro resultado, condiciones que no puedo aclarar o un resultado controvertido"], MN_UNKNOWN]));
  const recordClassQuestion = mnStageChoice(MN_STAGE.recordClass,
    "What does the final conviction record call the offense?", "¿Cómo clasifica el delito el expediente de la condena final?", [
      ["petty_misdemeanor", "Petty misdemeanor", "Petty misdemeanor (infracción menor)"],
      ["misdemeanor", "Misdemeanor", "Misdemeanor (delito menor)"],
      ["gross_misdemeanor", "Gross misdemeanor", "Gross misdemeanor (delito menor grave)"],
      ["felony", "Felony", "Felony (delito grave)"],
      ["juvenile_or_other", "Juvenile adjudication or another description", "Adjudicación de menores u otra descripción"], MN_UNKNOWN]);
  add(outcome === "Other conviction or adjudication", recordClassQuestion);
  const recordClass = outcome === "Misdemeanor conviction" ? "misdemeanor" : outcome === "Felony conviction" ? "felony" : mnStageScalar(recordClassQuestion, answers);
  add(convicted && ["gross_misdemeanor", "felony"].includes(recordClass ?? ""), mnStageChoice(MN_STAGE.reduction,
    "Does the sentencing order expressly mention either of these Minnesota statute references about the conviction's level?",
    "¿La orden de sentencia menciona expresamente alguna de estas disposiciones de Minnesota sobre la clasificación de la condena?", [
      ["609_13_2_2", "The order expressly cites 609.13, subdivision 2(2)", "La orden cita expresamente 609.13, subdivisión 2(2)"],
      ["609_13_1_2", "The order expressly cites 609.13, subdivision 1(2)", "La orden cita expresamente 609.13, subdivisión 1(2)"],
      ["no_reference", "Neither reference appears in the order", "Ninguna de estas referencias figura en la orden"], MN_UNKNOWN]));
  add(convicted && recordClass === "felony", mnStageChoice(MN_STAGE.felonySection,
    "Does the final conviction record identify Minnesota Statutes section 152.025?",
    "¿El expediente de la condena final identifica la sección 152.025 de las leyes de Minnesota?", [
      ["152_025", "Yes, section 152.025", "Sí, la sección 152.025"],
      ["another_section", "It identifies another section", "Identifica otra sección"], MN_UNKNOWN]));
  const diversionQuestion = mnStageChoice(MN_STAGE.diversion, "What happened to the diversion program or stay of adjudication?",
    "¿Qué ocurrió con el programa de desvío o la suspensión de la adjudicación?", [
      ["completed", "I completed its terms", "Cumplí sus condiciones"], ["active", "It is still in progress", "Sigue en curso"],
      ["revoked_or_failed", "It was revoked or I did not complete it", "Fue revocado o no lo completé"], MN_UNKNOWN]);
  add(diversion, diversionQuestion);
  const diversionCompleted = diversion && mnStageScalar(diversionQuestion, answers) === "completed";
  add(diversion, mnStageChoice(MN_STAGE.dismissal, "What does the record now say happened to the charges?",
    "¿Qué indica ahora el expediente que ocurrió con los cargos?", [
      ["dismissed", "The charges were dismissed", "Los cargos fueron desestimados"],
      ["not_dismissed", "The charges have not been dismissed", "Los cargos no han sido desestimados"], MN_UNKNOWN]));
  for (const [id, active, prompt, es] of [
    [MN_STAGE.discharge, convicted && sentenceComplete, "When was the sentence for this conviction fully discharged?", "¿Cuándo terminó por completo la sentencia de esta condena?"],
    [MN_STAGE.completion, diversionCompleted, "When did you complete the diversion program or stay terms?", "¿Cuándo cumplió las condiciones del programa de desvío o de la suspensión?"]
  ] as const) add(active, { id, stage: "packet_information", type: "date_or_unknown", required: true, contextOnly: false, options: null,
    prompt, helperText: "Use the date for this case. Choose unknown if you cannot identify it.",
    translations: { es: { prompt: es, helperText: "Use la fecha de este caso. Elija desconocida si no puede identificarla." } } });
  add(diversionCompleted, mnStageChoice(MN_STAGE.newCharge, "Have you been charged with a new crime since completing those terms?",
    "¿Le han imputado un delito nuevo desde que cumplió esas condiciones?", MN_YES_NO));
  add(dischargeKnown, mnStageChoice(MN_STAGE.newConviction, "Have you been convicted of a new crime since this sentence was discharged?",
    "¿Le han condenado por un delito nuevo desde que terminó esta sentencia?", MN_YES_NO));
  if (pathwayId === MN_PROSECUTOR_ROUTE) {
    add(outcome !== "Arrest or citation with no charge filed", mnStageChoice(MN_STAGE.response, "What has the prosecutor told you about sealing this case?",
      "¿Qué le ha comunicado la fiscalía sobre el sellado de este caso?", [
        ["not_requested", "I have not asked yet", "Todavía no lo he solicitado"],
        ["awaiting_response", "I asked and have not received a decision", "Lo solicité y todavía no he recibido una decisión"],
        ["agreed", "The prosecutor has agreed to sealing", "La fiscalía ha aceptado el sellado"],
        ["declined", "The prosecutor declined", "La fiscalía lo rechazó"],
        ["negotiation", "The prosecutor wants to negotiate", "La fiscalía quiere negociar"], MN_UNKNOWN]));

  }
  return questions;
}
export function mnProtectedStageFactIds(profile: EngineProfile | undefined, pathwayId: string, answers: Readonly<Record<string, unknown>>, includeInactive = false, unresolved: readonly string[] = []): string[] {
  return mnProtectedStageQuestions(profile, pathwayId, answers, includeInactive, unresolved).map(question => question.id);
}

export type MnHeldSourceStage = {
  status: "held"; authority: false; qualificationCheckboxExportAllowed: false; statutoryDeterminationEstablished: false;
  candidate: null | { trackId: "mn_petition_609a02_subd3" | "mn_prosecutor_agreed"; familyId: string; unitId: string;
    clause: string | null; output: "official_forms" | "request_guidance" };
  missingFactIds: string[]; holds: string[];
};
/** Candidate metadata only: deliberately NOT selectComposedRoute.selected and
 * not consumed by commercial authority/fulfillment. The actual family/spec and
 * confirmed document adapter remain a separate guarded application task.
 */
export function mnProtectedStageCandidate(profile: EngineProfile | undefined, pathwayId: string | null | undefined,
  specification: RegisteredSpecification | null | undefined, answers: Readonly<Record<string, unknown>>,
  unresolved: readonly string[] = []): MnHeldSourceStage | null {
  return mnProtectedStageContext(profile, pathwayId, specification, answers, unresolved)?.candidate ?? null;
}

/** Guard each invocation, then share its active questions and held metadata.
 * This is not a reusable source attestation or a commercial authority context.
 */
export function mnProtectedStageContext(profile: EngineProfile | undefined, pathwayId: string | null | undefined,
  specification: RegisteredSpecification | null | undefined, answers: Readonly<Record<string, unknown>>,
  unresolved: readonly string[] = []): { questions: ProfileQuestion[]; candidate: MnHeldSourceStage } | null {
  if (!mnTwoCountySourceContract(profile, pathwayId, specification)) return null;
  const currentAnswers = Object.fromEntries(Object.entries(answers).filter(([id]) => !unresolved.includes(id)));
  const questions = mnStageQuestionsFromValidatedSource(profile!, pathwayId!, currentAnswers);
  return { questions, candidate: mnStageCandidateFromValidatedSource(pathwayId!, currentAnswers, questions, unresolved) };
}

function mnStageCandidateFromValidatedSource(pathwayId: string, answers: Readonly<Record<string, unknown>>,
  questions: readonly ProfileQuestion[], unresolved: readonly string[]): MnHeldSourceStage {
  const missingFactIds = questions.filter(question => unresolved.includes(question.id)
    || mnStageScalar(question, answers) === null).map(question => question.id);
  const holds = ["actual_document_spec_stage_and_confirmed_field_adapter_unconnected", "automatic_relief_precedence_unchanged",
    "existing_origin_charge_safety_statutory_wait_exclusion_and_handoff_gates_unchanged"];
  const held = (candidate: MnHeldSourceStage["candidate"]): MnHeldSourceStage => ({ status: "held", authority: false, qualificationCheckboxExportAllowed: false, statutoryDeterminationEstablished: false, candidate, missingFactIds, holds });
  const outcome = mnStageOutcome(answers);
  const completionQuestion = { id: "sentence_completion_date", type: "yes_no_unsure" } as ProfileQuestion;
  const completedRaw = answers.sentence_completion_date;
  if (questionAnswerState(completionQuestion, completedRaw) === "known_valid"
    && (completedRaw === false || scalarAnswerText(completedRaw)?.trim() === "No")
    && questionAnswerState({ id: MN_STAGE.discharge, type: "date_or_unknown" } as ProfileQuestion, answers[MN_STAGE.discharge]) === "known_valid") {
    holds.push("current_incomplete_status_conflicts_with_retained_discharge_date_no_completion_inference");
  }
  if (!outcome) {
    missingFactIds.push("case_outcome"); holds.push("unknown_outcome_does_not_establish_subd3_population"); return held(null);
  }
  if (outcome === "Arrest or citation with no charge filed") {
    holds.push("answered_no_charge_does_not_establish_subd3_population"); return held(null);
  }
  const value = (id: string) => {
    const question = questions.find(question => question.id === id);
    return question && !unresolved.includes(id) ? mnStageScalar(question, answers) : null;
  };
  let clause: string | null = null;
  if (outcome === "Dismissed, no-billed, nolle prosequi, or not prosecuted") {
    if (["acquitted", "dismissed"].includes(value(MN_STAGE.result) ?? "")) {
      clause = "qualification_resolved_in_favor"; holds.push("final_record_resolution_and_conditions_still_require_source_check");
    }
  } else if (outcome === "Diversion, deferred disposition, supervision, or similar program") {
    if (value(MN_STAGE.diversion) === "completed") {
      clause = "qualification_diversion_or_stay";
      if (value(MN_STAGE.dismissal) !== "dismissed") holds.push(pathwayId === MN_PROSECUTOR_ROUTE
        ? "prosecutor_diversion_exception_preserved_no_petition_dismissal_inference" : "petition_diversion_dismissal_not_established");
    }
  } else {
    const recordClass = outcome === "Misdemeanor conviction" ? "misdemeanor"
      : outcome === "Felony conviction" ? "felony" : value(MN_STAGE.recordClass);
    if (["petty_misdemeanor", "misdemeanor"].includes(recordClass ?? "")) clause = "qualification_petty_or_misdemeanor";
    if (recordClass === "gross_misdemeanor") {
      if (value(MN_STAGE.reduction) === "no_reference") clause = "qualification_gross_misdemeanor";
      if (value(MN_STAGE.reduction) === "609_13_2_2") { clause = "qualification_gross_misdemeanor_deemed_misdemeanor"; holds.push("record_reference_is_not_platform_deemed_class_certification"); }
    }
    if (recordClass === "felony") {
      if (value(MN_STAGE.reduction) === "609_13_1_2") { clause = "qualification_felony_deemed_lesser"; holds.push("exact_subd3b_membership_and_four_or_five_year_branch_not_established"); }
      else if (value(MN_STAGE.reduction) === "no_reference" && value(MN_STAGE.felonySection) === "152_025") clause = "qualification_felony_152_025";
      else holds.push("qualification_felony_listed_in_subd_3b_requires_exact_retained_statute_comparison_not_participant_legal_guess");
    }
  }
  if (!clause) { holds.push("source_clause_not_established_no_narrative_or_context_label_inference"); return held(null); }
  holds.push("candidate_clause_does_not_compute_wait_or_certify_qualification");
  if (pathwayId === MN_PETITION_ROUTE) return held({ trackId: "mn_petition_609a02_subd3", familyId: "mn_petition_609a02_subd3-set",
    unitId: "mn_petition_609a02_subd3", clause, output: "official_forms" });
  const response = value(MN_STAGE.response);
  if (["declined", "negotiation"].includes(response ?? "")) { holds.push("prosecutor_handoff_preserved"); return held(null); }
  if (!response) return held(null);
  // Participant response reports are not an institutional programme binding,
  // a verified agreement or a sworn qualification-clause selection. Source
  // discovery and exact document-stage adoption remain platform work.
  holds.push("prosecutor_response_is_participant_report_not_verified_institutional_stage",
    "exact_applicable_programme_and_source_binding_not_established");
  return held({ trackId: "mn_prosecutor_agreed", familyId: "mn_prosecutor_agreed-set",
    unitId: "mn_prosecutor_agreed-request-stage", clause, output: "request_guidance" });
}
