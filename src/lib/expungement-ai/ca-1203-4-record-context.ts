import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import type { RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";
import { contactRepresentationHash } from "@/lib/expungement-ai/contact-representation";
import memo from "../../../data/record-clearing/legal-design-intake/CA.memo.json";
import fieldMap from "../../../data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/production-field-map.json";
import sourceReceipt from "../../../data/rcap-all50/overlays/census-v1/ca/ca-1203-4-set--official-pdf-fill/source-receipt.json";

export const CA_12034_CONTEXT_ROUTE = "tool-1-dismissal-set-aside";
/** Original GA17 Q-fa51657f98ce25890cc1. The exact retained CR-180 family
 * uses probation, conviction, sentence and relief facts, never this overlapping menu.
 * Optional historical context grants no relief, venue, editor or output authority.
 * The separate California guidance approval is not this family’s output authority. */
export function ca12034RecordIsContext(profile: EngineProfile | undefined,
  pathwayId: string | null, specification: RegisteredSpecification | null | undefined,
  current: { memo?: unknown; fieldMap?: unknown; sourceReceipt?: unknown } = {}): boolean {
  return profile?.jurisdiction.code === "CA" && pathwayId === CA_12034_CONTEXT_ROUTE
    && specification == null
    && contactRepresentationHash(profile) === "754b7bb08f3b9010549c686c1571eeeb850afc8ac256cf28b20f25a1c6ef4a0f"
    && contactRepresentationHash(current.memo === undefined ? memo : current.memo) === "872ce45c66dc7a56f91b7093ef7824296e96bc9e726e18a29d21052bd6f136eb"
    && contactRepresentationHash(current.fieldMap === undefined ? fieldMap : current.fieldMap) === "1d0b9c3a4dff4fba9187892e077197cc92cfaab9aa9e888fc7850bbf4cd557c8"
    && contactRepresentationHash(current.sourceReceipt === undefined ? sourceReceipt : current.sourceReceipt) === "1d20ad7db654a4dd71cdc266146cc80024f93f4b58d34064cbebe818d7f315e7";
}

export function ca12034RecordContextQuestion<T extends ProfileQuestion>(question: T,
  profile: EngineProfile | undefined, pathwayId: string | null,
  specification: RegisteredSpecification | null | undefined): T {
  if (question.id !== "record_type" || !ca12034RecordIsContext(profile, pathwayId, specification)
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
