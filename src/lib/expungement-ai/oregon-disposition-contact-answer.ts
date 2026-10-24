import { OR_DISPOSITION_CONFIGURATIONS } from "@/lib/rcap-engine/oregon-disposition-identity";

/** Browser-safe shape/meaning decoder shared with the held source projection.
 * Exact standalone non-facts only; never parse or rewrite a real address. */
export const OR_CONTACT_IDS = ["or_ojd_mailing_street", "or_ojd_mailing_city_state_zip", "or_ojd_email", "or_osp_address_choice", "or_osp_mailing_street", "or_osp_mailing_city_state_zip"] as const;
const NON_FACTS = new Set([
  "unknown", "not sure", "i am not sure", "no estoy seguro", "no estoy segura",
  "no lo sé", "no lo se", "no sé", "no se", "desconocido", "desconocida",
  "none", "ninguno", "ninguna", "unavailable", "not available", "no disponible",
  "confidential", "confidencial", "no address", "no mailing address", "sin dirección",
  "sin dirección postal", "no tengo dirección", "no email", "no email address", "sin correo electrónico"
]);
export function oregonContactKnownText(raw: unknown): string | null {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const entry = raw as Record<string, unknown>;
    if (entry.unknown !== false || Object.keys(entry).some(key => key !== "value" && key !== "unknown")) return null;
    raw = entry.value;
  }
  return typeof raw === "string" && raw.trim() && !NON_FACTS.has(raw.trim().toLocaleLowerCase("en-US")) ? raw : null;
}
export function oregonContactAnswerState(
  state: string, pathwayId: string | null, id: string, raw: unknown,
  generic: "unanswered" | "invalid" | "known_valid" | "uncertain" | "declined",
  savedAnswerNeedsClarification = false
) {
  if (state !== "OR" || !Object.values(OR_DISPOSITION_CONFIGURATIONS).some(c => c.pathwayId === pathwayId)
    || !OR_CONTACT_IDS.some(candidate => candidate === id)) return generic;
  return savedAnswerNeedsClarification || id !== "or_osp_address_choice"
    && generic === "known_valid" && oregonContactKnownText(raw) === null ? "invalid" : generic;
}
