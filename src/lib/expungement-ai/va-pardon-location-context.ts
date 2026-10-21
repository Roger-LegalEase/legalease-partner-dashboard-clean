import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import type { RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";
import { vaPardonTypeQuestion } from "@/lib/expungement-ai/va-pardon-type-source";
import { virginiaRecordContextApplies } from "@/lib/expungement-ai/virginia-record-context";
import { VA_RECORD_ORIGIN_ID } from "@/lib/rcap-engine/virginia-record-origin";

export function vaPardonLocationApplies(profile: EngineProfile | undefined, pathwayId: string | null,
  specification: RegisteredSpecification | null | undefined, answers: Readonly<Record<string, unknown>>, unresolvedIds: readonly string[] = []): boolean {
  return Boolean(profile && !unresolvedIds.includes(VA_RECORD_ORIGIN_ID)
    && vaPardonTypeQuestion(profile, pathwayId, specification, answers, unresolvedIds)
    && virginiaRecordContextApplies(profile.jurisdiction.code, pathwayId, answers));
}

// These inventory entries concern record origin; the adopted origin fact is separate from receiving-court authority.
export function vaPardonLocationScopeEntry(entry: { section: string; ruleId: string; factIds: string[] }): boolean {
  return entry.factIds.length === 1 && entry.factIds[0] === "residency_or_location"
    && ((entry.section === "orderedDecisionRules" && entry.ruleId === "rule-70-out-of-state-federal-records-are-not-reachable-by-virgi")
      || (entry.section === "exclusionRules" && ["exclusion-18", "exclusion-30"].includes(entry.ruleId)));
}

// GA-16-M01643 / Q-aae46f53eb742ee526b6: retain the exact adopted held pardon branch, never receiving-court authority.
export function vaPardonLocationQuestion<T extends ProfileQuestion>(question: T, profile: EngineProfile | undefined,
  pathwayId: string | null, specification: RegisteredSpecification | null | undefined, answers: Readonly<Record<string, unknown>>): T {
  if (question.id !== "residency_or_location" || !vaPardonLocationApplies(profile, pathwayId, specification, answers)
    || question.stage !== "packet_information" || question.type !== "text_or_unknown"
    || question.prompt !== "What city or location belongs with this matter?"
    || (question.helperText ?? "") !== "" || question.options !== null
    || question.required !== true || question.contextOnly !== false
    || question.lifecyclePhase !== "postpay_packet_field") return question;
  return { ...question, required: false,
    prompt: "Would you like to correct the earlier location answer? (Optional saved context)",
    helperText: "This earlier answer is kept as context. It does not identify the receiving court or show that a court form has been prepared. The pardon document and case records are needed to confirm the receiving court and case. Use the separate mailing-address question for correspondence.",
    translations: { ...question.translations, es: { ...question.translations?.es,
      prompt: "¿Desea corregir la respuesta anterior sobre el lugar? (Contexto guardado opcional)",
      helperText: "La respuesta anterior se conserva como contexto. No identifica el tribunal receptor ni demuestra que se haya preparado un formulario judicial. Se necesitan el documento de indulto y los expedientes del caso para confirmar el tribunal receptor y el caso. Use la pregunta separada sobre la dirección postal para la correspondencia."
    } } };
}
