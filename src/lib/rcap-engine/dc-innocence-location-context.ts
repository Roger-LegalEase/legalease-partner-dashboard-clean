import type { EngineProfile, PublicQuestion } from "@/lib/rcap-engine/contracts";
import type { RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";

export const DC_INNOCENCE_PATHWAY = "dc_actual_innocence_expungement_16_803";
export const DC_LEGACY_LOCATION = "residency_or_location";
const SOURCE_REFS = ["section:48-68", "section:15-26", "pathways:15-26", "corpus-unit:29", "section:213-252", "corpus-unit:32", "corpus-unit:13", "packet_logic:213-252", "corpus-unit:30"];

// GA-16-M01436 / Q-968b7bc50644bf0950b6. The retained DC motion has a
// fixed Superior Court caption. Mailing contact and the prosecutor's service
// address are separate source facts. A statewide inherited generic location
// is neither of them. Preserve it as historical context, never an alias.
export function dcInnocenceLocationIsContext(
  profile: EngineProfile | undefined, pathwayId: string | null,
  specification: RegisteredSpecification | null | undefined
): boolean {
  if (profile?.jurisdiction.code !== "DC" || pathwayId !== DC_INNOCENCE_PATHWAY
    || profile.profileVersion !== "2026-06-19-source-conversion-1"
    || profile.source?.sourceCorpusSha256 !== "988b68029434ace064151c98bf5ab564c4b90673167cbeb305f8ec92213b8c65"
    || profile.pathways.filter(pathway => pathway.id === pathwayId).length !== 1
    || specification?.routeKey !== `DC:${DC_INNOCENCE_PATHWAY}`
    || specification.trackId !== "dc_innocence_expungement"
    || specification.specificationSha256 !== "e3a5c28938551d62e0ccbb68107857ae771dfde5566d85970fa94ea79c86413f"
    || JSON.stringify(specification).includes(DC_LEGACY_LOCATION)
    || JSON.stringify(specification.documents[0]?.sections?.[0]?.captionContract?.courtLines) !== JSON.stringify([
      { prefix: "SUPERIOR COURT OF THE DISTRICT OF COLUMBIA" }, { prefix: "CRIMINAL DIVISION" }
    ])) return false;
  const plans = profile.packetGenerator.pathways.filter(plan => plan.pathwayId === pathwayId);
  const plan = plans[0];
  if (plans.length !== 1 || plan.requiredInputIds !== undefined
    || plan.mode !== "state_specific_custom_packet_from_source_rules"
    || plan.formMappingStatus !== "custom_or_manual_mapping_required"
    || plan.formCandidates?.length !== 0
    || JSON.stringify(plan.sourceRuleRefs) !== JSON.stringify(SOURCE_REFS)) return false;
  // Refuse a new eligibility, condition, lifecycle or other source consumer.
  // The only reviewed occurrence is this exact inherited required-input slot.
  const locations: string[] = [];
  function visit(value: unknown, path: string) {
    if (typeof value === "string" && value.includes(DC_LEGACY_LOCATION)) locations.push(path);
    else if (value && typeof value === "object") for (const [key, child] of Object.entries(value)) {
      if (key.includes(DC_LEGACY_LOCATION)) locations.push(`${path}/key:${key}`);
      visit(child, `${path}/${key}`);
    }
  }
  visit(profile, "");
  return locations.length === 1 && locations[0] === "/packetGenerator/requiredInputs/12";
}

export function dcInnocenceLocationQuestion<T extends PublicQuestion>(
  question: T, profile: EngineProfile | undefined, pathwayId: string | null,
  specification: RegisteredSpecification | null | undefined
): T {
  if (question.id !== DC_LEGACY_LOCATION || !dcInnocenceLocationIsContext(profile, pathwayId, specification)
    || question.stage !== "packet_information" || question.type !== "text_or_unknown"
    || question.prompt !== "What city or location belongs with this matter?"
    || (question.helperText ?? "") !== "" || question.options !== null
    || question.required !== true || question.contextOnly !== false
    || question.lifecyclePhase !== "postpay_packet_field") return question;
  return { ...question, required: false,
    prompt: "Would you like to correct the earlier location answer? (Optional saved context)",
    helperText: "This earlier answer is kept as context and is not printed in this motion. The court caption is fixed. Use the separate mailing-address question for contact details; the prosecutor's service address is completed separately before filing.",
    translations: { ...question.translations, es: { ...question.translations?.es,
      prompt: "¿Desea corregir la respuesta anterior sobre el lugar? (Contexto guardado opcional)",
      helperText: "La respuesta anterior se conserva como contexto y no se imprime en esta moción. El encabezado del tribunal es fijo. Use la pregunta separada sobre la dirección postal para los datos de contacto; la dirección de notificación de la fiscalía se completa por separado antes de presentar la moción."
    } } };
}
