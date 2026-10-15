import type { EngineProfile } from "@/lib/rcap-engine/contracts";
import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import type { RegisteredSpecification } from "@/lib/rcap/grade-a/packet-specification";
import { contactRepresentationHash } from "@/lib/expungement-ai/contact-representation";
import memo from "../../../data/record-clearing/legal-design-intake/AK.memo.json";
import proof from "../../../data/record-clearing/production-factory/packet-proofs/rcap-ak-guidance-implementation.json";
import mistakenIdentityMap from "../../../data/rcap-all50/overlays/census-v1/ak/ak-mistaken-identity-set--official-pdf-fill/production-field-map.json";
import sisMap from "../../../data/rcap-all50/overlays/census-v1/ak/composed-treatment:obligation:runtime-only:ak:set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085--custom-pleading/production-field-map.json";
import ownerAdoption from "../../../data/rcap-grade-a/legal-decisions/OWNER_BATCH_ADOPTION_2026-09-02.json";
import nationalDecision from "../../../data/record-clearing/legal-decisions/2026-08-28-national-legal-decisions.json";

export const AK_JUVENILE_CONTEXT_ROUTE = "juvenile-record-sealing-as-47-12-300";

export const AK_PARDON_CONTEXT_ROUTE = "executive-pardon-backstop";

/** Original GA17 Q-526a69646b0d265fd526. The adopted ak-pardon guidance
 * consumes conviction details and specific source predicates, not the generic
 * overlapping taxonomy. This changes only collection of that inherited field.
 * The retained plan/raw history, guidance-only scope and all authority stay put.
 * A changed source/proof or a registered specification requires a fresh check. */
export function akPardonRecordIsContext(profile: EngineProfile | undefined,
  pathwayId: string | null, specification: RegisteredSpecification | null | undefined,
  currentMemo: unknown = memo, currentProof: unknown = proof): boolean {
  return pathwayId === AK_PARDON_CONTEXT_ROUTE
    && retainedAlaskaGuidanceSource(profile, specification, currentMemo, currentProof);
}

/** Original GA17 Q-109ca1a84eab3ee90c38. The retained juvenile guidance
 * consumes the distinct juvenileRecord yes/no fact, never this generic menu.
 * This only preserves optional taxonomy history; intentional unsupported scope,
 * the existing plan and all authority remain unchanged. */
export function akJuvenileRecordIsContext(profile: EngineProfile | undefined,
  pathwayId: string | null, specification: RegisteredSpecification | null | undefined,
  currentMemo: unknown = memo, currentProof: unknown = proof): boolean {
  return pathwayId === AK_JUVENILE_CONTEXT_ROUTE
    && retainedAlaskaGuidanceSource(profile, specification, currentMemo, currentProof);
}

function retainedAlaskaGuidanceSource(profile: EngineProfile | undefined,
  specification: RegisteredSpecification | null | undefined,
  currentMemo: unknown, currentProof: unknown): boolean {
  return profile?.jurisdiction.code === "AK"
    && contactRepresentationHash(profile) === "7489686e1c7c6ed4b4406cb8d81f712ba199da49b7211dec92be030610da1bc7"
    && specification == null
    && contactRepresentationHash(currentMemo) === "791dc754b5bca3bd578e9a2f3aac291f762525688567453792ca577a148a4f55"
    && contactRepresentationHash(currentProof) === "2402988858343a37e0a8ed3a911802b2c70124b6f9dc96ff611a4d8609795046";
}

export function akPardonRecordContextQuestion<T extends ProfileQuestion>(question: T,
  profile: EngineProfile | undefined, pathwayId: string | null,
  specification: RegisteredSpecification | null | undefined): T {
  if (question.id !== "record_type" || !akPardonRecordIsContext(profile, pathwayId, specification)
    || question.stage !== "packet_information" || question.type !== "single_choice"
    || question.prompt !== "What type of record is this?"
    || JSON.stringify(question.options) !== JSON.stringify(["Arrest or charge", "Court case", "Conviction", "Juvenile matter", "I am not sure"])) return question;
  return { ...question, required: false,
    prompt: "Earlier record-type answer (optional history)",
    helperText: "The earlier labels can overlap. Your saved answer is optional history; it does not identify the conviction or decide whether a pardon is available. This route provides information about executive clemency, not a pardon application.",
    translations: { ...question.translations, es: { ...question.translations?.es,
      prompt: "Respuesta anterior sobre el tipo de expediente (historial opcional)",
      helperText: "Las categorías anteriores pueden coincidir. Su respuesta guardada es un historial opcional; no identifica la condena ni determina si puede obtener un indulto. Esta vía ofrece información sobre la clemencia ejecutiva, no una solicitud de indulto."
    } } };
}

export function akJuvenileRecordContextQuestion<T extends ProfileQuestion>(question: T,
  profile: EngineProfile | undefined, pathwayId: string | null,
  specification: RegisteredSpecification | null | undefined): T {
  if (question.id !== "record_type" || !akJuvenileRecordIsContext(profile, pathwayId, specification)
    || question.stage !== "packet_information" || question.type !== "single_choice"
    || question.prompt !== "What type of record is this?"
    || JSON.stringify(question.options) !== JSON.stringify(["Arrest or charge", "Court case", "Conviction", "Juvenile matter", "I am not sure"])) return question;
  return { ...question, required: false,
    prompt: "Earlier record-type answer (optional history)",
    helperText: "The earlier labels can overlap. Your saved answer is optional history; it does not establish that this is a juvenile record. Juvenile relief remains outside the adult scope LegalEase serves; this route provides information and referrals, not a juvenile filing.",
    translations: { ...question.translations, es: { ...question.translations?.es,
      prompt: "Respuesta anterior sobre el tipo de expediente (historial opcional)",
      helperText: "Las categorías anteriores pueden coincidir. Su respuesta guardada es un historial opcional; no establece que este sea un expediente de menores. La ayuda para expedientes de menores sigue fuera del alcance para adultos de LegalEase; esta vía ofrece información y referencias, no una solicitud judicial para menores."
    } } };
}


export const AK_MISTAKEN_IDENTITY_CONTEXT_ROUTE = "sealing-for-mistaken-identity-or-false-accusation-as-12-62-180";
export const AK_SIS_CONTEXT_ROUTE = "set-aside-after-a-suspended-imposition-of-sentence-as-12-55-085";

/** Original GA17 Q336/Qeaf. Both retained canonical maps have no destination
 * for the overlapping generic taxonomy. The Sept 2 mistaken-identity withholding
 * and Aug 28 SIS original-case decision remain distinct from runtime authority.
 * This predicate only scopes optional history; it does not select either family. */
export function akAgencyOrSisRecordIsContext(profile: EngineProfile | undefined,
  pathwayId: string | null, specification: RegisteredSpecification | null | undefined,
  current: { memo?: unknown; fieldMap?: unknown; decision?: unknown } = {}): boolean {
  const agency = pathwayId === AK_MISTAKEN_IDENTITY_CONTEXT_ROUTE;
  if (!agency && pathwayId !== AK_SIS_CONTEXT_ROUTE) return false;
  return profile?.jurisdiction.code === "AK" && specification == null
    && contactRepresentationHash(profile) === "7489686e1c7c6ed4b4406cb8d81f712ba199da49b7211dec92be030610da1bc7"
    && contactRepresentationHash(current.memo === undefined ? memo : current.memo) === "791dc754b5bca3bd578e9a2f3aac291f762525688567453792ca577a148a4f55"
    && contactRepresentationHash(current.fieldMap === undefined ? (agency ? mistakenIdentityMap : sisMap) : current.fieldMap)
      === (agency ? "3426bac335a57169b238c6c1262d4b081bd4376027ffe718b2a0d7621b3eda84" : "8bf9a49c17e7567844d31c69b8a9869a688b2b19d665c41a9b758058944b64e5")
    && contactRepresentationHash(current.decision === undefined ? (agency ? ownerAdoption : nationalDecision) : current.decision)
      === (agency ? "2bb062a72b11e18448f91d981a98832518626a2beca5b7c4e8f0167868e618ee" : "6af5cc139a7ce03ce2ba1690db125861af15141cd993745b8f365fda555230b1");
}

export function akAgencyOrSisRecordContextQuestion<T extends ProfileQuestion>(question: T,
  profile: EngineProfile | undefined, pathwayId: string | null,
  specification: RegisteredSpecification | null | undefined): T {
  if (question.id !== "record_type" || !akAgencyOrSisRecordIsContext(profile, pathwayId, specification)
    || question.stage !== "packet_information" || question.type !== "single_choice"
    || question.prompt !== "What type of record is this?"
    || JSON.stringify(question.options) !== JSON.stringify(["Arrest or charge", "Court case", "Conviction", "Juvenile matter", "I am not sure"])) return question;
  const agency = pathwayId === AK_MISTAKEN_IDENTITY_CONTEXT_ROUTE;
  return { ...question, required: false,
    prompt: "Earlier record-type answer (optional history)",
    helperText: agency
      ? "The earlier labels can overlap. Your saved answer is optional history; it does not establish mistaken identity or false accusation. This service does not currently offer the agency application."
      : "The earlier labels can overlap. Your saved answer is optional history; it does not establish an SIS, discharge, or set-aside decision. This service currently provides information on this route, not a filing packet.",
    translations: { ...question.translations, es: { ...question.translations?.es,
      prompt: "Respuesta anterior sobre el tipo de expediente (historial opcional)",
      helperText: agency
        ? "Las categorías anteriores pueden coincidir. Su respuesta guardada es un historial opcional; no establece un error de identidad ni una acusación falsa. Este servicio no ofrece actualmente la solicitud ante la agencia."
        : "Las categorías anteriores pueden coincidir. Su respuesta guardada es un historial opcional; no establece una SIS, una resolución de finalización ni una decisión de dejar sin efecto la condena. Este servicio ofrece actualmente información sobre esta vía, no un paquete para presentar."
    } } };
}
