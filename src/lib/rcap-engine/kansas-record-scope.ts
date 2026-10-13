import type { PublicQuestion } from "@/lib/rcap-engine/contracts";
import { kansasDistrictFromAnswers, kansasDistrictQuestionApplies, KS_DISTRICT_FACT_IDS, KS_DISTRICT_QUESTIONS, type KansasDistrictSelection } from "@/lib/rcap-engine/kansas-district-facts";

export const KS_MUNICIPAL_CONVICTION = "municipal-conviction-or-diversion-expungement-under-12-4516";
export const KS_MUNICIPAL_ARREST = "municipal-arrest-record-expungement-under-12-4516a";
export const KS_RECORD_SCOPE_FACT_IDS = ["ks_record_court_scope", "ks_diversion_fulfilled", ...KS_DISTRICT_FACT_IDS] as const;
type Answers = Record<string, unknown>;
type Selection = KansasDistrictSelection | { status: "not_applicable" }
  | { status: "clarification"; missingQuestionIds: string[] }
  | { status: "district_arrest" }
  | { status: "selected"; pathwayId: string; branch: "conviction" | "fulfilled_diversion" | "unfulfilled_diversion" | "arrest" };

/** KS.memo municipal tracks and K.S.A. 12-4516(a), 12-4516a(a).
 * These facts identify a candidate, not statutory grounds, elapsed time or
 * permission to file. A municipal appeal in district court is not silently
 * routed to the originating municipal court's packet. The district arrest
 * track (22-2410) cannot be replaced with a conviction/diversion route.
 */
export function kansasRecordScopeFromAnswers(answers: Answers): Selection {
  const scope = answers.ks_record_court_scope;
  if (scope === undefined) return { status: "not_applicable" }; // Preserve legacy answers; do not infer a court.
  if (typeof scope !== "string" || !["municipal_ordinance", "district_state_law", "municipal_appealed_to_district"].includes(scope)) {
    return { status: "clarification", missingQuestionIds: ["ks_record_court_scope"] };
  }
  const outcome = answers.case_outcome;
  const arrest = ["Arrest or citation with no charge filed", "Dismissed, no-billed, nolle prosequi, or not prosecuted", "Acquitted or found not guilty"].includes(typeof outcome === "string" ? outcome : "");
  if (scope !== "municipal_ordinance") {
    if (arrest) return { status: "district_arrest" };
    return kansasDistrictFromAnswers(answers);
  }
  if (arrest) return { status: "selected", pathwayId: KS_MUNICIPAL_ARREST, branch: "arrest" };
  if (outcome === "Misdemeanor conviction") return { status: "selected", pathwayId: KS_MUNICIPAL_CONVICTION, branch: "conviction" };
  if (outcome === "Diversion, deferred disposition, supervision, or similar program") {
    if (!["yes", "no"].includes(String(answers.ks_diversion_fulfilled))) {
      return { status: "clarification", missingQuestionIds: ["ks_diversion_fulfilled"] };
    }
    return { status: "selected", pathwayId: KS_MUNICIPAL_CONVICTION,
      branch: answers.ks_diversion_fulfilled === "yes" ? "fulfilled_diversion" : "unfulfilled_diversion" };
  }
  // A felony, ambiguous adjudication or juvenile answer does not establish a
  // city-ordinance conviction. Never coerce it to a misdemeanor from charge level.
  return { status: "clarification", missingQuestionIds: ["ks_record_court_scope", "case_outcome"] };
}

export function kansasRecordScopeQuestionApplies(jurisdiction: string, answers: Answers, id: string): boolean {
  if (jurisdiction === "KS" && !kansasDistrictQuestionApplies(answers, id)) return false;
  return jurisdiction !== "KS" || id !== "ks_diversion_fulfilled"
    || (answers.ks_record_court_scope === "municipal_ordinance"
      && answers.case_outcome === "Diversion, deferred disposition, supervision, or similar program");
}

// Source-backed drafts; independent language review remains required.
export const KS_RECORD_SCOPE_QUESTIONS: PublicQuestion[] = [
  {
    id: "ks_record_court_scope", stage: "pathway_routing", type: "single_choice",
    required: false, contextOnly: false, doesNotSelectPathway: false, lifecyclePhase: "prepay_route_splitter",
    prompt: "What do the Kansas case records show about the law and court for this case?",
    helperText: "Check the citation, charge and court record. A city police department can enforce state law, so the arresting agency alone does not answer this. Include an appeal to district court. Review separate cases separately.",
    options: ["municipal_ordinance", "district_state_law", "municipal_appealed_to_district", "other_or_unknown"],
    optionDisplay: {
      municipal_ordinance: { label: "City ordinance case in municipal court, with no district-court appeal", translations: { es: { label: "Caso por ordenanza municipal en un tribunal municipal, sin apelación al tribunal de distrito" } } },
      district_state_law: { label: "State-law case for district court", translations: { es: { label: "Caso bajo la ley estatal que corresponde al tribunal de distrito" } } },
      municipal_appealed_to_district: { label: "Municipal case appealed to district court", translations: { es: { label: "Caso municipal apelado al tribunal de distrito" } } },
      other_or_unknown: { label: "Something else or I am not sure", translations: { es: { label: "Otra situación o no estoy seguro" } } }
    },
    translations: { es: {
      prompt: "¿Qué indican los documentos del caso de Kansas sobre la ley y el tribunal de este caso?",
      helperText: "Revise la citación, el cargo y el expediente judicial. La policía municipal puede aplicar la ley estatal, por lo que la agencia que realizó el arresto no basta para responder. Incluya cualquier apelación al tribunal de distrito. Revise los casos distintos por separado."
    } }
  },
  {
    id: "ks_diversion_fulfilled", stage: "pathway_routing", type: "single_choice",
    required: false, contextOnly: false, doesNotSelectPathway: false, lifecyclePhase: "prepay_route_splitter",
    prompt: "Does this municipal case have a diversion agreement whose terms you have fulfilled?",
    helperText: "Check the agreement and completion record. Admission to a program or completing one task does not establish fulfillment of the diversion agreement. Do not substitute the arrest date for a fulfillment date.",
    options: ["yes", "no", "other_or_unknown"],
    optionDisplay: {
      yes: { label: "Yes, the diversion agreement's terms are fulfilled", translations: { es: { label: "Sí, se han cumplido los términos del acuerdo de desvío" } } },
      no: { label: "No, the diversion agreement's terms remain unfulfilled", translations: { es: { label: "No, quedan términos del acuerdo de desvío sin cumplir" } } },
      other_or_unknown: { label: "A different program or I am not sure", translations: { es: { label: "Otro programa o no estoy seguro" } } }
    },
    translations: { es: {
      prompt: "¿Tiene este caso municipal un acuerdo de desvío cuyos términos haya cumplido?",
      helperText: "Revise el acuerdo y el registro de cumplimiento. La admisión a un programa o completar una tarea no demuestra que se haya cumplido el acuerdo de desvío. No sustituya la fecha de cumplimiento por la fecha de arresto."
    } }
  },
  ...KS_DISTRICT_QUESTIONS
];
