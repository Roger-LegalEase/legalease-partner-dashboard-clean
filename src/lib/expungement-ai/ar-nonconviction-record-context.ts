import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import type { RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";
import { contactRepresentationHash } from "@/lib/expungement-ai/contact-representation";
import memo from "../../../data/record-clearing/legal-design-intake/AR.memo.json";
import fieldMap from "../../../data/rcap-all50/overlays/census-v1/ar/ar-nonconviction-seal-set--official-pdf-fill/production-field-map.json";
import sourceReceipt from "../../../data/rcap-all50/overlays/census-v1/ar/ar-nonconviction-seal-set--official-pdf-fill/source-receipt.json";

export const AR_NONCONVICTION_CONTEXT_ROUTE = "situation-a-non-convictions";
// Reviewed source receipt and its one exact reviewed successor: e0eeff358
// refreshed only the shared manifest pin, whose AR packet-set entry is identical.
const AR_SOURCE_RECEIPT_REPRESENTATIONS = new Set([
  "0b7e47beb605ee13963902f0ba1cdca12ed0671fa33fedb037c8cfc6c47df483",
  "41b66962752c1cdbbe165215b5b7126df3dedd62e69061096c451c2956f4dc26"
]);
/** Original GA17 Q-1ab16c42dd48e5b516f6. The exact retained ACIC family
 * uses disposition, filing and record-origin facts, never this overlapping menu.
 * Optional historical context grants no relief, venue, editor or output authority.
 * The separate preadjudication guidance approval does not authorize this family. */
export function arNonconvictionRecordIsContext(profile: EngineProfile | undefined,
  pathwayId: string | null, specification: RegisteredSpecification | null | undefined,
  current: { memo?: unknown; fieldMap?: unknown; sourceReceipt?: unknown } = {}): boolean {
  return profile?.jurisdiction.code === "AR" && pathwayId === AR_NONCONVICTION_CONTEXT_ROUTE
    && specification == null
    && contactRepresentationHash(profile) === "6d5af336305f8c60425e8a085e35434de4af8c3f79988f50781ca18c11bacd4d"
    && contactRepresentationHash(current.memo === undefined ? memo : current.memo) === "972dfc81242973d0795068cca97efda0c05e9171a1946bec158057a511780838"
    && contactRepresentationHash(current.fieldMap === undefined ? fieldMap : current.fieldMap) === "279d521704f3bae470bffc49be42bc9bbaab39fe908017ea999da3e0775b0b23"
    && AR_SOURCE_RECEIPT_REPRESENTATIONS.has(contactRepresentationHash(current.sourceReceipt === undefined ? sourceReceipt : current.sourceReceipt));
}

export function arNonconvictionRecordContextQuestion<T extends ProfileQuestion>(question: T,
  profile: EngineProfile | undefined, pathwayId: string | null,
  specification: RegisteredSpecification | null | undefined): T {
  if (question.id !== "record_type" || !arNonconvictionRecordIsContext(profile, pathwayId, specification)
    || question.stage !== "packet_information" || question.type !== "single_choice"
    || question.prompt !== "What type of record is this?"
    || JSON.stringify(question.options) !== JSON.stringify(["Arrest or charge", "Court case", "Conviction", "Juvenile matter", "I am not sure"])) return question;
  return { ...question, required: false,
    prompt: "Earlier record-type answer (optional history)",
    helperText: "The earlier labels can overlap. Your saved answer is optional history. It does not establish a disposition, where the record originated, where to file, or eligibility for relief. The specific case facts and the current limits of this service remain unchanged.",
    translations: { ...question.translations, es: { ...question.translations?.es,
      prompt: "Respuesta anterior sobre el tipo de expediente (historial opcional)",
      helperText: "Las categorías anteriores pueden coincidir. Su respuesta guardada es un historial opcional. No establece una resolución, dónde se originó el expediente, dónde presentar la solicitud ni los requisitos para obtener una reparación. Los hechos específicos del caso y los límites actuales de este servicio no cambian."
    } } };
}
