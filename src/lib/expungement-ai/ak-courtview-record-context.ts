import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import type { RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";
import { contactRepresentationHash } from "@/lib/expungement-ai/contact-representation";
import { AK_COURTVIEW_PATHWAY } from "@/lib/expungement-ai/ak-courtview-contact";
import fieldMap from "../../../data/rcap-all50/overlays/census-v1/ak/ak-courtview-set--official-pdf-fill/production-field-map.json";

export const AK_LEGACY_RECORD_TYPE = "record_type";

/** GA17 Q-a639e390962d5b77a5f0. The retained TF-810 map consumes exact
 * requester/case facts and leaves legal grounds to the participant. Its generic
 * inherited record taxonomy is neither a public predicate nor a form value.
 * Keep the original plan and raw answers; change collection only. These exact
 * pins refuse a changed profile/map or a newly registered runtime specification.
 * Source currency, legal grounds and output/fulfillment authority stay separate. */
export function akCourtviewRecordIsContext(
  profile: EngineProfile | undefined, pathwayId: string | null,
  specification: RegisteredSpecification | null | undefined,
  currentMap: unknown = fieldMap
): boolean {
  return profile?.jurisdiction.code === "AK" && pathwayId === AK_COURTVIEW_PATHWAY
    && contactRepresentationHash(profile) === "7489686e1c7c6ed4b4406cb8d81f712ba199da49b7211dec92be030610da1bc7"
    && specification == null
    && contactRepresentationHash(currentMap) === "d983964d526fc6579809076ec76d4ea089f0bc63ab969f1bb5d57940d8eaabb3"
    && !JSON.stringify(currentMap).includes(AK_LEGACY_RECORD_TYPE);
}

export function akCourtviewRecordContextQuestion<T extends ProfileQuestion>(question: T,
  profile: EngineProfile | undefined, pathwayId: string | null,
  specification: RegisteredSpecification | null | undefined
): T {
  if (question.id !== AK_LEGACY_RECORD_TYPE || !akCourtviewRecordIsContext(profile, pathwayId, specification)
    || question.stage !== "packet_information" || question.type !== "single_choice"
    || question.prompt !== "What type of record is this?"
    || JSON.stringify(question.options) !== JSON.stringify(["Arrest or charge", "Court case", "Conviction", "Juvenile matter", "I am not sure"])) return question;
  return { ...question, required: false,
    prompt: "Earlier record-type answer (optional history)",
    helperText: "The earlier question asked, ‘What type of record is this?’ Its labels can overlap. Your answer is kept for review or correction; it does not select a ground for CourtView removal or fill a TF-810 field. No record type is inferred from how the case ended. The actual case disposition and the applicable removal ground must be established separately.",
    translations: { ...question.translations, es: { ...question.translations?.es,
      prompt: "Respuesta anterior sobre el tipo de expediente (historial opcional)",
      helperText: "La pregunta anterior era: ‘¿Qué tipo de expediente es este?’. Sus categorías pueden coincidir. Su respuesta se conserva para revisarla o corregirla; no selecciona un fundamento para retirar el caso de CourtView ni completa un campo de TF-810. No se deduce ningún tipo de expediente a partir del resultado del caso. El resultado real del caso y el fundamento aplicable para retirarlo deben establecerse por separado."
    } } };
}
