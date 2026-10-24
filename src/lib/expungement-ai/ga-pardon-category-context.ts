import type { EngineProfile, PublicQuestion } from "@/lib/rcap-engine/contracts";
import type { RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";
import { GA_PARDON_ROUTE, GA_PARDON_SOURCE } from "@/lib/rcap-engine/georgia-pardon-facts";
import { getProfileByJurisdiction } from "@/lib/rcap-engine/profile-registry";

// GA-12-M00730 only. GA-02 and GA.memo ga-pardon-j7 require the final
// conviction citation and its specific exception facts. The current evaluator
// rejects the generic packet-only category ID and evaluates those exact facts.
// Preserve the old independent answer as context; never turn a charge level,
// offense label or category into a citation or legal exclusion determination.
export function georgiaPardonCategoryIsContext(
  state: string, pathwayId: string | null, specification: RegisteredSpecification | null,
  profile: EngineProfile | undefined = getProfileByJurisdiction(state)
): boolean {
  return state === "GA" && pathwayId === GA_PARDON_ROUTE
    && profile?.jurisdiction.code === "GA"
    && profile.pathways.some(pathway => pathway.id === GA_PARDON_ROUTE)
    && profile.profileVersion === "2026-06-19-source-conversion-1"
    && profile.source?.sourceCorpusSha256 === "2e9c9d5f9ad17fefb315d71b4336f0ffd2de6c1b614453cd06abd45f06cf2812"
    && GA_PARDON_SOURCE === "GA-02:2026-10-13;GA.memo:ga-pardon-j7;OCGA35-3-37(j)(7)"
    && specification?.routeKey === `GA:${GA_PARDON_ROUTE}`
    && specification.trackId === "ga-pardon-j7"
    // 2207c357a adopted-correction successor; reviewed: no category consumer added.
    && specification.specificationSha256 === "08fb09613f95f09510d6f6c6e120248ef80c828926a9c08fb9fc9e41b1e71fc9"
    // The technical fingerprint is this reviewed consumer scope, not an
    // approval. A new declared/conditional document consumer must be reviewed.
    && !JSON.stringify(specification).includes("offense_category");
}

export function gaPardonCategoryQuestion<T extends PublicQuestion>(
  question: T, state: string, pathwayId: string | null, specification: RegisteredSpecification | null
): T {
  if (question.id !== "offense_category" || !georgiaPardonCategoryIsContext(state, pathwayId, specification)
    || question.stage !== "packet_information" || question.type !== "text_or_unknown"
    || question.prompt !== "What category does the court record use for this offense?"
    || (question.helperText ?? "") !== "" || question.options !== null
    || question.required !== true || question.contextOnly !== false
    || question.lifecyclePhase !== "postpay_packet_field") return question;
  return { ...question, required: false,
    prompt: "What offense category does the record use? (Optional saved context)",
    helperText: "The earlier answer is kept for review or correction. This category does not decide pardon eligibility and is not printed in this packet. Use the separate Code section question for the exact final conviction citation; do not substitute the felony or misdemeanor level here.",
    translations: { ...question.translations, es: {
      ...question.translations?.es,
      prompt: "¿Qué categoría de delito usa el expediente? (Contexto guardado opcional)",
      helperText: "La respuesta anterior se conserva para revisarla o corregirla. Esta categoría no determina si la condena indultada reúne los requisitos y no se imprime en este paquete. Use la pregunta separada sobre la sección del Código para la referencia exacta de la condena final; no sustituya aquí la categoría por delito grave o delito menor."
    } } };
}
