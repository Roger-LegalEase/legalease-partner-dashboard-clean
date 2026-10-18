import type { EngineProfile, PublicQuestion } from "@/lib/rcap-engine/contracts";

// GA-12 Q-3ab8bb479903ec6dc680 / QD-bd6b15fff22cbe1501cb; IL.memo il-prostitution-j-vacate.
export const IL_PROSTITUTION_ROUTE = "felony-prostitution-relief";
export const IL_PROSTITUTION_FACT_ID = "il_prostitution_final_record";
export const IL_PROSTITUTION_SOURCE = "IL.memo:il-prostitution-j-vacate;20ILCS2630/5.2(j)";
export function illinoisProstitutionContext(profile: EngineProfile | undefined, pathway: string | null | undefined): boolean {
  return profile?.jurisdiction.code === "IL" && pathway === IL_PROSTITUTION_ROUTE
    && profile.profileVersion === "2026-06-19-source-conversion-1"
    && profile.source?.sourceCorpusSha256 === "aa34523e3b643b32124db5d83973622f37082f2d112b3e32ef55912258a7e630"
    && profile.pathways.some(p => p.id === IL_PROSTITUTION_ROUTE);
}
// Supplemental EN/ES copy is a source-grounded draft, pending qualified review.
export const IL_PROSTITUTION_QUESTION: PublicQuestion = {
  id: IL_PROSTITUTION_FACT_ID, stage: "pathway_routing", type: "single_choice", required: false,
  contextOnly: false, doesNotSelectPathway: true, lifecyclePhase: "prepay_route_splitter",
  prompt: "Does the final conviction record say Class 4 felony prostitution?",
  helperText: "Check the final conviction record, including any amendment. An original charge, a general felony label or an earlier offense category does not answer this question. Choose I am not sure if you cannot confirm what the record says.",
  options: ["Yes", "No", "I am not sure"],
  optionDisplay: { Yes: { label: "Yes", translations: { es: { label: "Sí" } } }, No: { label: "No", translations: { es: { label: "No" } } }, "I am not sure": { label: "I am not sure", translations: { es: { label: "No estoy seguro" } } } },
  translations: { es: {
    prompt: "¿El expediente de la condena final dice Class 4 felony prostitution?",
    helperText: "Consulte el expediente de la condena final, incluida cualquier modificación. Un cargo original, una etiqueta general de delito grave o una categoría anterior no responde esta pregunta. Elija No estoy seguro si no puede confirmar lo que dice el expediente."
  } }
};
export function illinoisProstitutionQuestionApplies(profile: EngineProfile | undefined, pathway: string | null | undefined, id: string): boolean {
  return id !== IL_PROSTITUTION_FACT_ID || illinoisProstitutionContext(profile, pathway);
}
export const IL_PROSTITUTION_COPY = {
  missing: "Check whether the final conviction record says Class 4 felony prostitution. Neither a general felony label nor an earlier category establishes this fact.",
  record_conflict: "The reported final record does not establish a Class 4 felony prostitution conviction. Review the final disposition and applicable procedure; this is not a decision about every record-clearing option.",
  record_review: "The reported Class 4 felony prostitution fact is retained for review. Sentence and condition completion, the requested relief and any separate trafficking-related procedure still need review. No eligibility, court finding or payment authority is established.",
  source_review: "The source for this record question needs review before continuing. No eligibility or payment authority is established."
} as const;
export function illinoisProstitutionFacts(answers: Record<string, unknown>): "missing" | "record_conflict" | "record_review" {
  // A choice is an account of the final record, never a classification from prose.
  const value = answers[IL_PROSTITUTION_FACT_ID];
  if (value !== "Yes" && value !== "No") return "missing";
  return value === "Yes" && answers.case_outcome === "Felony conviction" ? "record_review" : "record_conflict";
}
