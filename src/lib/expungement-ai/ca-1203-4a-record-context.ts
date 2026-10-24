import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import type { RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";
import { contactRepresentationHash } from "@/lib/expungement-ai/contact-representation";
import memo from "../../../data/record-clearing/legal-design-intake/CA.memo.json";
import fieldMap from "../../../data/rcap-all50/overlays/census-v1/ca/ca-1203-4a-set--official-pdf-fill/production-field-map.json";
import sourceReceipt from "../../../data/rcap-all50/overlays/census-v1/ca/ca-1203-4a-set--official-pdf-fill/source-receipt.json";

export const CA_12034A_CONTEXT_ROUTE = "dismissal-and-set-aside-without-probation-under-penal-code-1203-4a";
/** Original GA17 Q-8d36dbd014ecfa39d612. The exact retained CR-180 family
 * uses probation, conviction, sentence and relief facts, never this overlapping menu.
 * Optional historical context grants no relief, venue, editor or output authority.
 * The separate California guidance approval is not this family’s output authority. */
export function ca12034aRecordIsContext(profile: EngineProfile | undefined,
  pathwayId: string | null, specification: RegisteredSpecification | null | undefined,
  current: { memo?: unknown; fieldMap?: unknown; sourceReceipt?: unknown } = {}): boolean {
  return profile?.jurisdiction.code === "CA" && pathwayId === CA_12034A_CONTEXT_ROUTE
    && specification == null
    && contactRepresentationHash(profile) === "9838b3e3f3986491e4cabecbcbd21eef32825e9ce107f07a77c539f0dee6517b"
    && contactRepresentationHash(current.memo === undefined ? memo : current.memo) === "872ce45c66dc7a56f91b7093ef7824296e96bc9e726e18a29d21052bd6f136eb"
    && contactRepresentationHash(current.fieldMap === undefined ? fieldMap : current.fieldMap) === "98fd41f8783be8d2889033feee2fdea35c74ed5d4e17d2552e9f0e485995a5dd"
    && contactRepresentationHash(current.sourceReceipt === undefined ? sourceReceipt : current.sourceReceipt) === "97243faaf5e726af405662bce1f91b7210579efe4a031966d3268ba703b1650a";
}

export function ca12034aRecordContextQuestion<T extends ProfileQuestion>(question: T,
  profile: EngineProfile | undefined, pathwayId: string | null,
  specification: RegisteredSpecification | null | undefined): T {
  if (question.id !== "record_type" || !ca12034aRecordIsContext(profile, pathwayId, specification)
    || question.stage !== "packet_information" || question.type !== "single_choice"
    || question.prompt !== "What type of record is this?"
    || JSON.stringify(question.options) !== JSON.stringify(["Arrest or charge", "Court case", "Conviction", "Juvenile matter", "I am not sure"])) return question;
  return { ...question, required: false,
    prompt: "Earlier record-type answer (optional history)",
    helperText: "The earlier labels can overlap. Your saved answer is optional history. It does not establish a conviction, sentence completion, an offense classification, or eligibility for relief. The specific case facts and the current limits of this service remain unchanged.",
    translations: { ...question.translations, es: { ...question.translations?.es,
      prompt: "Respuesta anterior sobre el tipo de expediente (historial opcional)",
      helperText: "Las categorías anteriores pueden coincidir. Su respuesta guardada es un historial opcional. No establece una condena, el cumplimiento de la sentencia, la clasificación de un delito ni los requisitos para obtener una reparación. Los hechos específicos del caso y los límites actuales de este servicio no cambian."
    } } };
}
