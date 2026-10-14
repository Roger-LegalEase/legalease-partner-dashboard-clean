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
    : adult && (deConvictionQuestionApplies("DE", answers, id)
      || id === "release_date" && hasEarlierReleaseDateForNever(answers)));
  return [...existing, ...facts];
}

function hasEarlierReleaseDateForNever(answers: Record<string, unknown>): boolean {
  if (answers.de_incarceration !== "never" || !Object.hasOwn(answers, "release_date")) return false;
  const raw = answers.release_date;
  if (typeof raw === "string") return raw !== "";
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const value = raw as Record<string, unknown>;
  return value.unknown === true || typeof value.value === "string" && value.value !== "";
}

export function delawareProtectedExclusionQuestion<T extends ProfileQuestion>(question: T,
  profile: EngineProfile | undefined, pathwayId: string | null, answers: Record<string, unknown> = {}): T {
  if (!delawareProtectedCorrectionContract(profile, pathwayId)) return question;
  if (question.id === "release_date" && typeof answers.case_outcome === "string" && deAdultConviction(answers)
    && hasEarlierReleaseDateForNever(answers)) return { ...question, required: false,
      clearEarlierReleaseDate: true,
      prompt: "Review your earlier release date",
      helperText: "You now say there was no incarceration, but an earlier release-date answer is still saved. If that date was entered in error, clear the earlier date and save. Its original value stays in your saved history. If the release did occur, correct the incarceration answer instead. Uncertainty or conflicting facts still require review.",
      translations: { ...question.translations, es: { ...question.translations?.es,
        prompt: "Revise la fecha de puesta en libertad guardada anteriormente",
        helperText: "Ahora indica que no hubo encarcelamiento, pero aún está guardada una respuesta anterior sobre la fecha de puesta en libertad. Si ingresó esa fecha por error, borre la fecha anterior y guarde. El valor original permanece en su historial guardado. Si sí hubo puesta en libertad, corrija la respuesta sobre el encarcelamiento. La incertidumbre o los datos contradictorios aún requieren revisión."
      } } };
  if (question.id !== "state_exclusion_categories") return question;
  return { ...question,
    helperText: "This earlier category answer does not by itself establish eligibility or an exclusion. Delaware's mandatory, discretionary, pardon and juvenile procedures have different rules. Keep your actual answer or mark uncertainty; use the separate record questions where offered. An unresolved offense or procedure still needs review.",
    translations: { ...question.translations, es: { ...question.translations?.es,
      helperText: "Esta respuesta anterior sobre la categoría no establece por sí sola la elegibilidad ni una exclusión. Los procedimientos de Delaware de eliminación obligatoria, discrecional, por indulto y de menores tienen reglas distintas. Conserve su respuesta real o indique la incertidumbre; use las preguntas separadas sobre el expediente cuando se ofrezcan. Un delito o procedimiento sin aclarar aún requiere revisión."
    } } };
}
