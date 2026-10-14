import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import { contactRepresentationHash } from "@/lib/expungement-ai/contact-representation";
import { DE_CONVICTION_FACT_IDS, DE_COURT, DE_SBI, deAdultConviction, deConvictionQuestionApplies } from "@/lib/rcap-engine/delaware-conviction-rules";

/** GA20's four original DE appearances. DE-01/02 retain separate mechanisms;
 * these are corrections to owned facts, never route selection or approval. */
export const DE_PROTECTED_CORRECTION_ROUTES = [DE_COURT, DE_SBI,
  "juvenile-expungement-under-10-del-c-1017-1019-1017a",
  "pardon-based-discretionary-expungement-under-11-del-c-4375"] as const;
export const DE_PROTECTED_PROFILE_SHA256 = "b37cab84b2a00c572d170364992fc81cfd6014f954086e8b7257fd798a5b84d7";

export function delawareProtectedCorrectionContract(profile: EngineProfile | undefined, pathwayId: string | null): boolean {
  return profile?.jurisdiction.code === "DE"
    && contactRepresentationHash(profile) === DE_PROTECTED_PROFILE_SHA256
    && (pathwayId === null || DE_PROTECTED_CORRECTION_ROUTES.some(route => route === pathwayId));
}

export function delawareProtectedCorrectionIds(profile: EngineProfile | undefined, pathwayId: string | null,
  answers: Record<string, unknown>, includeInactive = false): string[] {
  if (!delawareProtectedCorrectionContract(profile, pathwayId)) return [];
  // Null-route holds retain only their own public facts. A possible-pathway
  // label supplies neither fact ownership nor a selected legal mechanism.
  const existing = ["state_exclusion_categories", "case_outcome", "pardon_status"]
    .filter(id => Object.hasOwn(answers, id));
  const adult = typeof answers.case_outcome === "string" && deAdultConviction(answers);
  const facts = DE_CONVICTION_FACT_IDS.filter(id => includeInactive
    ? Object.hasOwn(answers, id) || adult
    : adult && deConvictionQuestionApplies("DE", answers, id));
  return [...existing, ...facts];
}

export function delawareProtectedExclusionQuestion<T extends ProfileQuestion>(question: T,
  profile: EngineProfile | undefined, pathwayId: string | null): T {
  if (question.id !== "state_exclusion_categories" || !delawareProtectedCorrectionContract(profile, pathwayId)) return question;
  return { ...question,
    helperText: "This earlier category answer does not by itself establish eligibility or an exclusion. Delaware's mandatory, discretionary, pardon and juvenile procedures have different rules. Keep your actual answer or mark uncertainty; use the separate record questions where offered. An unresolved offense or procedure still needs review.",
    translations: { ...question.translations, es: { ...question.translations?.es,
      helperText: "Esta respuesta anterior sobre la categoría no establece por sí sola la elegibilidad ni una exclusión. Los procedimientos de Delaware de eliminación obligatoria, discrecional, por indulto y de menores tienen reglas distintas. Conserve su respuesta real o indique la incertidumbre; use las preguntas separadas sobre el expediente cuando se ofrezcan. Un delito o procedimiento sin aclarar aún requiere revisión."
    } } };
}
