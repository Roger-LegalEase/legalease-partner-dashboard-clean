import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import type { RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";
import { contactRepresentationHash } from "@/lib/expungement-ai/contact-representation";
import memo from "../../../data/record-clearing/legal-design-intake/CA.memo.json";
import guidance from "../../../data/rcap-all50/guidance-packets/ca.json";
import familyProof from "../../../data/record-clearing/production-factory/packet-proofs/rcap-ca-guidance-implementation.json";

export const CA_AUTOMATIC_CONTEXT_ROUTE = "tool-2-automatic-relief";
/** Original GA17 Q-7d6cfd17cb6742576d64. The retained automatic no-filing
 * guidance uses specific record/status facts, never the overlapping menu.
 * Do not alias record_type to recordTypeSought or select the BCIA8706 branch.
 * This exception changes historical collection only, not automatic relief. */
export function caAutomaticRecordIsContext(profile: EngineProfile | undefined,
  pathwayId: string | null, specification: RegisteredSpecification | null | undefined,
  current: { memo?: unknown; guidance?: unknown; familyProof?: unknown } = {}): boolean {
  if (profile?.jurisdiction.code !== "CA" || pathwayId !== CA_AUTOMATIC_CONTEXT_ROUTE || specification != null) return false;
  const route = profile.pathways.find(candidate => candidate.id === pathwayId) as
    { automatic?: unknown; filingRequired?: unknown; routeType?: unknown } | undefined;
  const plan = profile.packetGenerator.pathways.find(candidate => candidate.pathwayId === pathwayId);
  return route?.automatic === true && route.filingRequired === false && route.routeType === "automatic"
    && plan?.mode === "automatic_relief_verification_and_guidance" && plan.formMappingStatus === "not_required"
    && Array.isArray(plan.formCandidates) && plan.formCandidates.length === 0
    && contactRepresentationHash(profile) === "9838b3e3f3986491e4cabecbcbd21eef32825e9ce107f07a77c539f0dee6517b"
    && contactRepresentationHash(current.memo === undefined ? memo : current.memo) === "872ce45c66dc7a56f91b7093ef7824296e96bc9e726e18a29d21052bd6f136eb"
    && contactRepresentationHash(current.guidance === undefined ? guidance : current.guidance) === "6e5ff4b892a135275e67f3b387a80910d6cfac898771857b95771bb13f9381b8"
    && contactRepresentationHash(current.familyProof === undefined ? familyProof : current.familyProof) === "5d3b7af58d3c9c6b813464d39790fc4b47767f41fcbed6cf557e28b3e02f2cc4";
}

export function caAutomaticRecordContextQuestion<T extends ProfileQuestion>(question: T,
  profile: EngineProfile | undefined, pathwayId: string | null,
  specification: RegisteredSpecification | null | undefined): T {
  if (question.id !== "record_type" || !caAutomaticRecordIsContext(profile, pathwayId, specification)
    || question.stage !== "packet_information" || question.type !== "single_choice"
    || question.prompt !== "What type of record is this?"
    || JSON.stringify(question.options) !== JSON.stringify(["Arrest or charge", "Court case", "Conviction", "Juvenile matter", "I am not sure"])) return question;
  return { ...question, required: false,
    prompt: "Earlier record-type answer (optional history)",
    helperText: "The earlier labels can overlap. Your saved answer is optional history. It does not establish whether automatic relief occurred, select an arrest or conviction record, or request a DOJ correction. The specific case facts and the current limits of this service remain unchanged.",
    translations: { ...question.translations, es: { ...question.translations?.es,
      prompt: "Respuesta anterior sobre el tipo de expediente (historial opcional)",
      helperText: "Las categorías anteriores pueden coincidir. Su respuesta guardada es un historial opcional. No establece si se otorgó el alivio automático, no selecciona un expediente de arresto o condena ni solicita una corrección al DOJ. Los hechos específicos del caso y los límites actuales de este servicio no cambian."
    } } };
}
