import { sameKnownQuestionAnswer } from "@/lib/expungement-ai/question-answer-state";
import { caProp64CaptionAnswerState } from "@/lib/expungement-ai/ca-prop64-caption-answer";
/** Source-specific caption facts. This wire carries owner declarations only;
 * it cannot infer account contact, service consent, or filing authority. */
export const CA_CONTACT_CONTRACT = "ca_prop64_contacts_v2" as const;
export const CA_CONTACT_LEGACY_CONTRACT = "ca_prop64_contacts_v1" as const;
// CA-CAPTION-CONTACT-01 / GA-15: this version records an explicit substitute-address declaration, never verified enrollment.
export const CA_DESIGNATED_ADDRESS_VERSION = "ca_prop64_designated_address_v1" as const;
export const CA_SAFE_AT_HOME_ID = "ca_safe_at_home_participation";
export const CA_FILER_CONTACT = "ca_prop64_filer_contact";
export const CA_COURT_CONTACT = "ca_prop64_court_address";
export const CA_CONTACT_IDS = [CA_FILER_CONTACT, CA_COURT_CONTACT];
export type CaContactContext = { representation: string; defendantName: string; county: string; safeAtHome?: boolean };
export type CaOptionalContact = { status: "" | "known" | "absent" | "unknown"; value: string };
export type CaFilerContact = {
  version: typeof CA_CONTACT_CONTRACT | typeof CA_CONTACT_LEGACY_CONTRACT | typeof CA_DESIGNATED_ADDRESS_VERSION; kind: "filer"; representation: string; defendantName: string;
  attorneyName: string; barNumber: string; street: string; city: string; state: string; zip: string; phone: string | CaOptionalContact;
  fax: CaOptionalContact; email: CaOptionalContact; firm: CaOptionalContact;
};
export type CaCourtContact = {
  version: typeof CA_CONTACT_CONTRACT | typeof CA_CONTACT_LEGACY_CONTRACT; kind: "court"; county: string; street: string; cityStateZip: string;
  mailingRelationship: "" | "same" | "distinct" | "unknown"; mailingAddress: string;
};
export type CaContact = CaFilerContact | CaCourtContact;
const line = (v: unknown): v is string => typeof v === "string" && !/[\x00-\x1f\x7f]/.test(v);
const object = (v: unknown, keys: string[]): v is Record<string, unknown> => Boolean(v && typeof v === "object" && !Array.isArray(v)
  && [Object.prototype, null].includes(Object.getPrototypeOf(v)) && Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k)));
const optional = (v: unknown) => object(v, ["status", "value"]) && ["", "known", "absent", "unknown"].includes(String(v.status)) && typeof v.status === "string" && line(v.value);
export const caContactKnownText = (v: string) => Boolean(v.trim()) && !["unknown", "unsure", "not sure", "i am not sure", "i'm not sure", "no sé", "no se", "no estoy seguro", "no estoy segura", "prefer not to say"].includes(v.trim().toLowerCase().replace(/\u2019/g, "'"));
// In v2, no-phone declarations belong to the explicit status, not the number.
export const caContactPhoneText = (value: string) => caContactKnownText(value)
  && !/^(?:none|n\/?a|no phone|no phone number|no telephone|no telephone number|ninguno|ninguna|sin teléfono|sin número de teléfono)$/i.test(value.trim());
export function caContactContext(answers: Readonly<Record<string, unknown>>): CaContactContext {
  const held = (id: string) => {
    const raw = answers[id];
    if (id !== "ca_prop64_filer_representation" && caProp64CaptionAnswerState(id, raw) !== "known_valid") return "";
    if (raw && typeof raw === "object" && !Array.isArray(raw) && "unknown" in raw && ![undefined, false].includes(raw.unknown as undefined | false)) return "";
    const v = raw && typeof raw === "object" && !Array.isArray(raw) && object(raw, Object.hasOwn(raw, "unknown") ? ["value", "unknown"] : ["value"])
    ? raw.unknown === true ? "" : raw.value : raw;
    return line(v) && caContactKnownText(v) ? v : ""; };
  return { representation: held("ca_prop64_filer_representation"), defendantName: held("participant_full_legal_name"), county: held("ca_prop64_filing_court_county"),
    ...(sameKnownQuestionAnswer({ id: CA_SAFE_AT_HOME_ID, type: "yes_no_unsure" }, answers[CA_SAFE_AT_HOME_ID], "Yes") ? { safeAtHome: true } : {}) };
}
export function emptyCaContact(id: string, context: CaContactContext): CaContact {
  return id === CA_FILER_CONTACT ? { version: context.safeAtHome ? CA_DESIGNATED_ADDRESS_VERSION : CA_CONTACT_CONTRACT, kind: "filer", representation: context.representation, defendantName: context.defendantName,
    attorneyName: "", barNumber: "", street: "", city: "", state: "", zip: "", phone: { status: "", value: "" }, fax: { status: "", value: "" }, email: { status: "", value: "" }, firm: { status: "", value: "" } }
    : { version: CA_CONTACT_CONTRACT, kind: "court", county: context.county, street: "", cityStateZip: "", mailingRelationship: "", mailingAddress: "" };
}
export function parseCaContact(id: string, raw: unknown): CaContact | null {
  if (!CA_CONTACT_IDS.includes(id) || !Array.isArray(raw) || raw.length !== 1 || typeof raw[0] !== "string") return null;
  let v: unknown; try { v = JSON.parse(raw[0]); } catch { return null; }
  const keys = id === CA_FILER_CONTACT
    ? ["version", "kind", "representation", "defendantName", "attorneyName", "barNumber", "street", "city", "state", "zip", "phone", "fax", "email", "firm"]
    : ["version", "kind", "county", "street", "cityStateZip", "mailingRelationship", "mailingAddress"];
  if (!object(v, keys) || (v.version !== CA_CONTACT_CONTRACT && v.version !== CA_CONTACT_LEGACY_CONTRACT && !(id === CA_FILER_CONTACT && v.version === CA_DESIGNATED_ADDRESS_VERSION)) || v.kind !== (id === CA_FILER_CONTACT ? "filer" : "court") || JSON.stringify(v) !== raw[0]) return null;
  for (const k of keys) if (!["fax", "email", "firm", ...(v.version !== CA_CONTACT_LEGACY_CONTRACT && id === CA_FILER_CONTACT ? ["phone"] : [])].includes(k) && !line(v[k])) return null;
  if (id === CA_FILER_CONTACT && (!["", "self_represented", "attorney", "unknown"].includes(String(v.representation)) || ![v.fax, v.email, v.firm].every(optional))) return null;
  if (id === CA_FILER_CONTACT && v.version !== CA_CONTACT_LEGACY_CONTRACT && !optional(v.phone)) return null;
  if (id === CA_COURT_CONTACT && !["", "same", "distinct", "unknown"].includes(String(v.mailingRelationship))) return null;
  return v as unknown as CaContact;
}
export function caContactCurrent(value: CaContact, context?: CaContactContext): boolean {
  if (!context) return false;
  return value.kind === "filer" ? ["self_represented", "attorney"].includes(context.representation) && caContactKnownText(context.defendantName)
    && value.representation === context.representation && value.defendantName === context.defendantName
    && (!context.safeAtHome || value.version === CA_DESIGNATED_ADDRESS_VERSION)
    : caContactKnownText(context.county) && value.county === context.county;
}
export function caContactAnswerState(id: string, raw: unknown, context?: CaContactContext): "unanswered" | "invalid" | "known_valid" | "uncertain" {
  if (raw === null || raw === undefined || raw === "" || Array.isArray(raw) && raw.length === 0) return "unanswered";
  const v = parseCaContact(id, raw); if (!v) return "invalid";
  if (!caContactCurrent(v, context)) return "uncertain";
  const required = v.kind === "filer" ? [v.street, v.city, v.state, v.zip, ...(typeof v.phone === "string" ? [v.phone] : []), ...(v.representation === "attorney" ? [v.attorneyName, v.barNumber] : [])]
    : [v.street, v.cityStateZip, ...(["same", "distinct"].includes(v.mailingRelationship) ? [] : ["" ]), ...(v.mailingRelationship === "distinct" ? [v.mailingAddress] : [])];
  if (!required.every(caContactKnownText)) return "uncertain";
  if (v.kind === "filer" && typeof v.phone !== "string" && v.phone.status !== "absent"
    && (v.phone.status !== "known" || !caContactPhoneText(v.phone.value))) return "uncertain";
  if (v.kind === "filer" && [v.fax, v.email, ...(v.representation === "attorney" ? [v.firm] : [])].some(f => f.status === "known" && !caContactKnownText(f.value))) return "uncertain";
  return "known_valid";
}
export const CA_CONTACT_LABELS: Record<string, { en: string; es: string }> = {
  representation: { en: "Filer", es: "Presentante" }, defendantName: { en: "Defendant", es: "Acusado" }, county: { en: "Court county", es: "Condado del tribunal" },
  attorneyName: { en: "Attorney's full name", es: "Nombre completo del abogado" }, barNumber: { en: "State Bar number", es: "Número del Colegio de Abogados" },
  street: { en: "Street address", es: "Dirección" }, city: { en: "City", es: "Ciudad" }, state: { en: "State", es: "Estado" }, zip: { en: "ZIP code", es: "Código postal" }, phone: { en: "Phone number", es: "Número de teléfono" },
  fax: { en: "Fax (optional)", es: "Fax (opcional)" }, email: { en: "Email (optional)", es: "Correo electrónico (opcional)" }, firm: { en: "Law firm (optional)", es: "Despacho jurídico (opcional)" },
  cityStateZip: { en: "Court city and ZIP code", es: "Ciudad y código postal del tribunal" }, mailingRelationship: { en: "Court mailing address", es: "Dirección postal del tribunal" }, mailingAddress: { en: "Separate court mailing address", es: "Dirección postal distinta del tribunal" }
};
export const CA_CONTACT_OPTION_LABELS: Record<string, { en: string; es: string }> = {
  "": { en: "Not answered", es: "Sin respuesta" }, known: { en: "Provided", es: "Proporcionado" }, absent: { en: "None", es: "Ninguno" }, unknown: { en: "I am not sure", es: "No estoy seguro" },
  same: { en: "Same as the street address", es: "La misma dirección" }, distinct: { en: "A different mailing address", es: "Una dirección postal diferente" },
  self_represented: { en: "The defendant, without an attorney", es: "El acusado, sin abogado" }, attorney: { en: "An attorney representing the defendant", es: "Un abogado que representa al acusado" }
};
export function formatCaContact(id: string, raw: unknown, locale: "en" | "es", juvenile = false): string {
  const v = parseCaContact(id, raw); if (!v) return locale === "es" ? "Respuesta guardada que necesita aclaración" : "Saved answer needs clarification";
  const retained = locale === "es" ? "Guardado, no se usará ni imprimirá" : "Saved, will not be used or printed";
  return Object.entries(v).filter(([key, value]) => {
    if (["version", "kind"].includes(key)) return false;
    const inactive = v.kind === "filer" && v.representation !== "attorney" && ["attorneyName", "barNumber", "firm"].includes(key)
      || v.kind === "court" && key === "mailingAddress" && v.mailingRelationship !== "distinct";
    return !inactive || Boolean(typeof value === "string" ? value.trim() : value.value.trim());
  }).map(([key, value]) => {
    const label = juvenile && key === "defendantName" ? locale === "es" ? "Solicitante" : "Applicant" : CA_CONTACT_LABELS[key]?.[locale] ?? key;
    const inactive = v.kind === "filer" && v.representation !== "attorney" && ["attorneyName", "barNumber", "firm"].includes(key)
      || v.kind === "court" && key === "mailingAddress" && v.mailingRelationship !== "distinct";
    // Only enum fields translate. A person's literal name, address or number
    // must survive even when it happens to match an enum token.
    const text = typeof value === "string"
      ? juvenile && key === "representation" && value === "self_represented" ? locale === "es" ? "El solicitante, sin abogado" : "The applicant, without an attorney"
        : juvenile && key === "representation" && value === "attorney" ? locale === "es" ? "Un abogado que representa al solicitante" : "An attorney representing the applicant"
        : ["representation", "mailingRelationship"].includes(key) ? CA_CONTACT_OPTION_LABELS[value]?.[locale] ?? value : value
      : `${CA_CONTACT_OPTION_LABELS[value.status][locale]}${value.value ? value.status === "known" ? ` (${value.value})` : `; ${retained}: ${value.value}` : ""}`;
    return `${label}: ${inactive ? `${retained}: ` : ""}${text || CA_CONTACT_OPTION_LABELS[""][locale]}`;
  }).join("\n");
}
