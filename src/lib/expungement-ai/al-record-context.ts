import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import type { RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";
import { contactRepresentationHash } from "@/lib/expungement-ai/contact-representation";
import memo from "../../../data/record-clearing/legal-design-intake/AL.memo.json";
import decision from "../../../data/rcap-grade-a/legal-decisions/LEGAL_BLOCKED_RESOLUTION_2026-09-11.json";
import map0 from "../../../data/rcap-all50/overlays/census-v1/al/al-misd-conviction-set--official-pdf-fill/production-field-map.json";
import map1 from "../../../data/rcap-all50/overlays/census-v1/al/al-pardoned-felony-set--official-pdf-fill/production-field-map.json";
import map2 from "../../../data/rcap-all50/overlays/census-v1/al/al-trafficking-set--custom-pleading/production-field-map.json";
import map3 from "../../../data/rcap-all50/overlays/census-v1/al/al-misd-nonconviction-90-set--official-pdf-fill/production-field-map.json";
import map4 from "../../../data/rcap-all50/overlays/census-v1/al/al-felony-nonconviction-90-set--official-pdf-fill/production-field-map.json";
import map5 from "../../../data/rcap-all50/overlays/census-v1/al/al-misd-dwop-set--official-pdf-fill/production-field-map.json";
import map6 from "../../../data/rcap-all50/overlays/census-v1/al/al-felony-dwop-set--official-pdf-fill/production-field-map.json";
import map7 from "../../../data/rcap-all50/overlays/census-v1/al/al-diversion-set--official-pdf-fill/production-field-map.json";

export const AL_RECORD_CONTEXT_ROUTES = [
  "eligible-conviction-expungement-under-the-redeemer-act",
  "human-trafficking-victim-expungement",
  "non-conviction-expungement-under-ala-code-15-27-1-a-and-15-27-2-a",
  "pardoned-felony-expungement-under-ala-code-15-27-2-c"
] as const;
const maps = [map0, map1, map2, map3, map4, map5, map6, map7];
const mapHashes = ["db1c36bd38093d471de517c143444e51b980703e93248f67f9bc94622647d752", "31d561e3223fe6e08f6e28f30c1485275d28c7cf3e44568be49004e27662cb55", "0d6eb39cde7891b5a4a74e7b512b8cb480de52cb1dab3cd3453d680a4b1e9077", "0c83630010f09f603bae663793ae3b6403c082e67b02ce657c6a0aba9193597d", "f59a10d0f9b6e2daf66f1a847ce5f64ae05159a5193e4101ce2bb2d001fde188", "a73a914afaf8ac3da35a195bcf9f7be7660875dd7451b2ab7fe632ce6afe2b50", "9eab2cc5e1351da080ed560d59c65aaecb365c0c31abc2d9973d6d01bd37bc33", "86d8360de85fe8f47eb72e73632172fcdfd2bb72ac64fc9c0a175d1c8ba2ce98"];

/** Original GA17 Q2dd99/Qed8eb/Q829a/Q2ddd. Existing AL source maps consume
 * specific legal facts, never the overlapping generic record_type menu. This
 * guard permits only optional historical context; it selects no family or relief.
 * The trafficking directory label is not a new composed vehicle: its retained
 * source requires official CR-65. VF59's historical nonterminal qualification,
 * existing filing safeguards, and runtime authority remain unchanged. */
export function alRecordIsContext(profile: EngineProfile | undefined,
  pathwayId: string | null, specification: RegisteredSpecification | null | undefined,
  current: { memo?: unknown; maps?: unknown; decision?: unknown } = {}): boolean {
  if (!AL_RECORD_CONTEXT_ROUTES.some(route => route === pathwayId)) return false;
  const currentMaps = current.maps === undefined ? maps : current.maps;
  return profile?.jurisdiction.code === "AL" && specification == null
    && contactRepresentationHash(profile) === "ca219c1a1419f8b2900fd6368ac7202ba779ac084dae7e4dd507be943a29011c"
    && contactRepresentationHash(current.memo === undefined ? memo : current.memo) === "62ee8eb99e0c1a45090bdd37f838671f9d7637e20f792e60cf0dbdb218bf31de"
    && contactRepresentationHash(current.decision === undefined ? decision : current.decision) === "b3e80db48e72a3387edd84d2df3684592b2ccaa72dc7aa1e2fec50b24e42b988"
    && Array.isArray(currentMaps) && currentMaps.length === mapHashes.length
    && mapHashes.every((hash, index) => Object.hasOwn(currentMaps, index)
      && contactRepresentationHash(currentMaps[index]) === hash);
}

export function alRecordContextQuestion<T extends ProfileQuestion>(question: T,
  profile: EngineProfile | undefined, pathwayId: string | null,
  specification: RegisteredSpecification | null | undefined): T {
  if (question.id !== "record_type" || !alRecordIsContext(profile, pathwayId, specification)
    || question.stage !== "packet_information" || question.type !== "single_choice"
    || question.prompt !== "What type of record is this?"
    || JSON.stringify(question.options) !== JSON.stringify(["Arrest or charge", "Court case", "Conviction", "Juvenile matter", "I am not sure"])) return question;
  return { ...question, required: false,
    prompt: "Earlier record-type answer (optional history)",
    helperText: "The earlier labels can overlap. Your saved answer is optional history. It does not establish a disposition, conviction, pardon, trafficking connection, or eligibility for relief. The specific facts and the current limits of this service remain unchanged.",
    translations: { ...question.translations, es: { ...question.translations?.es,
      prompt: "Respuesta anterior sobre el tipo de expediente (historial opcional)",
      helperText: "Las categorías anteriores pueden coincidir. Su respuesta guardada es un historial opcional. No establece una resolución, una condena, un indulto, una relación con la trata de personas ni los requisitos para obtener una reparación. Los hechos específicos y los límites actuales de este servicio no cambian."
    } } };
}
