import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import type { RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";
import { contactRepresentationHash } from "@/lib/expungement-ai/contact-representation";
import memo from "../../../data/record-clearing/legal-design-intake/AR.memo.json";
import fieldMap from "../../../data/rcap-all50/overlays/census-v1/ar/ar-felony-seal-set--official-pdf-fill/production-field-map.json";
import sourceReceipt from "../../../data/rcap-all50/overlays/census-v1/ar/ar-felony-seal-set--official-pdf-fill/source-receipt.json";

export const AR_FELONY_CONTEXT_ROUTE = "situation-c-felony-convictions";
/** Original GA17 Q-36092d24f1d0fd9f26a8. The exact retained ACIC family
 * uses conviction, sentencing and record-origin facts, never this overlapping menu.
 * Optional historical context grants no relief, venue, editor or output authority.
 * The separate preadjudication guidance approval does not authorize this family. */
export function arFelonyRecordIsContext(profile: EngineProfile | undefined,
  pathwayId: string | null, specification: RegisteredSpecification | null | undefined,
  current: { memo?: unknown; fieldMap?: unknown; sourceReceipt?: unknown } = {}): boolean {
  return profile?.jurisdiction.code === "AR" && pathwayId === AR_FELONY_CONTEXT_ROUTE
    && specification == null
    && contactRepresentationHash(profile) === "6d5af336305f8c60425e8a085e35434de4af8c3f79988f50781ca18c11bacd4d"
    && contactRepresentationHash(current.memo === undefined ? memo : current.memo) === "972dfc81242973d0795068cca97efda0c05e9171a1946bec158057a511780838"
    && contactRepresentationHash(current.fieldMap === undefined ? fieldMap : current.fieldMap) === "ccbe9c9311820bb9b456aaba69bf7fe206f557f2960b9feb0ebf79854d2716b6"
    && contactRepresentationHash(current.sourceReceipt === undefined ? sourceReceipt : current.sourceReceipt) === "4a8671a5cf37ac6fa16d09dc482669cd2d12ab3d95b543afd399578e3c86fc01";
}

export function arFelonyRecordContextQuestion<T extends ProfileQuestion>(question: T,
  profile: EngineProfile | undefined, pathwayId: string | null,
  specification: RegisteredSpecification | null | undefined): T {
  if (question.id !== "record_type" || !arFelonyRecordIsContext(profile, pathwayId, specification)
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
