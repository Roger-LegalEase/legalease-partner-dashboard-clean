import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import type { RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";
import { contactRepresentationHash } from "@/lib/expungement-ai/contact-representation";
import { ND_FIRST_OFFENSE_FAMILY } from "@/lib/expungement-ai/nd-first-offense-family-inputs";

export const ND_LEGACY_RECORD_TYPE = "record_type";

/** GA-17 / Q-003cc2b98811955e705a. The adopted four-component successor
 * consumes no generic record taxonomy. The pinned profile still names this
 * nonpublic ID in inherited trigger metadata; its evaluator does not read the
 * value. Do not turn a conviction outcome into a choice among overlapping
 * labels. Retain independent historical answers without making them a gate.
 * Exact pins refuse a later factual, document or conditional consumer. */
export function ndFirstOffenseRecordIsContext(
  profile: EngineProfile | undefined, pathwayId: string | null,
  specification: RegisteredSpecification | null | undefined
): boolean {
  const source = ND_FIRST_OFFENSE_FAMILY;
  return profile?.jurisdiction.code === "ND" && pathwayId === source.route
    && contactRepresentationHash(profile) === source.profileSha256
    && specification?.routeKey === `ND:${source.route}`
    && specification.trackId === source.track
    && contactRepresentationHash(specification) === source.successorSpecificationCanonicalSha256
    && !JSON.stringify(specification).includes(ND_LEGACY_RECORD_TYPE);
}

export function ndFirstOffenseRecordContextQuestion<T extends ProfileQuestion>(question: T,
  profile: EngineProfile | undefined, pathwayId: string | null,
  specification: RegisteredSpecification | null | undefined
): T {
  if (question.id !== ND_LEGACY_RECORD_TYPE || !ndFirstOffenseRecordIsContext(profile, pathwayId, specification)
    || question.stage !== "packet_information" || question.type !== "single_choice"
    || question.prompt !== "What type of record is this?"
    || JSON.stringify(question.options) !== JSON.stringify(["Arrest or charge", "Court case", "Conviction", "Juvenile matter", "I am not sure"])) return question;
  return { ...question, required: false,
    prompt: "Earlier record-type answer (optional history)",
    helperText: "The earlier question asked, ‘What type of record is this?’ Its labels can overlap. Your answer is kept for review or correction; it does not decide eligibility or fill a field in this packet. No record type is inferred from your case outcome. The criminal judgment and separate record questions still establish the relevant facts.",
    translations: { ...question.translations, es: { ...question.translations?.es,
      prompt: "Respuesta anterior sobre el tipo de expediente (historial opcional)",
      helperText: "La pregunta anterior era: ‘¿Qué tipo de expediente es este?’. Sus categorías pueden coincidir. Su respuesta se conserva para revisarla o corregirla; no determina la elegibilidad ni completa un campo de este paquete. No se deduce ningún tipo de expediente a partir del resultado del caso. La sentencia penal y las preguntas separadas sobre el expediente siguen estableciendo los hechos pertinentes."
    } } };
}
