import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";

/** Contact destinations in the existing approved municipal family, not route selection. */
export const KS_MUNICIPAL_CONTACT_ROUTES = {
  "municipal-conviction-or-diversion-expungement-under-12-4516": "ks-12-4516-municipal",
  "municipal-arrest-record-expungement-under-12-4516a": "ks-12-4516a-municipal-arrest"
} as const;
export const KS_MUNICIPAL_CONTACT_SOURCE = {
  familyId: "rcap-ks-custom-pleading", page: 1,
  mapPath: "data/rcap-all50/overlays/census-v1/ks/rcap-ks-custom-pleading--custom-pleading/production-field-map.json",
  mapSha256: "cd85d71ca23b942b21297da5dde2da1c446ddee9833c03c901aa6771288c3af2",
  sourceReceiptSha256: "3bc874983218ff179a8f681b1ab7acfb8d052021fbdaeab7e4196f326edb75c4",
  approvalId: "auth-2026-08-19-owner-legal-approval-completed-output",
  adoptionId: "EXT-ADOPT-01-standing-external-counsel-adoption",
  profileSha256: "a8231b14f6a5e29b2a2923c0705390fdefdf8ad17b711bf8d192a1419131e500",
  profileVersion: "2026-06-19-source-conversion-1",
  profileSourceFingerprint: "c0bbc9c540a680f360113b8aee2ee5ac0f19ffda4958c8f3974366f68c150362",
  profileAuthorityFingerprints: {
    "municipal-conviction-or-diversion-expungement-under-12-4516": "1ce8adbcf5009af3c3af62321ad6d5fe0c46ebbe4e00144bdfd2ba96952b7a79",
    "municipal-arrest-record-expungement-under-12-4516a": "13c5aa3cea2075b3b8bc2c4dbf611c4900a010dd9ed148b35af89fe72a6bba1c"
  }
} as const;
export const KS_MUNICIPAL_CONTACT_FIELDS = [
  { id: "mailing_address", field: "mailing_address", participantKey: "street_address" },
  { id: "phone_number", field: "telephone", participantKey: "phone" },
  { id: "email_address", field: "email", participantKey: "email" }
] as const;
export const KS_MUNICIPAL_CONTACT_IDS = KS_MUNICIPAL_CONTACT_FIELDS.map(field => field.id);
export function isKsMunicipalContact(state: string, pathwayId: string | null) {
  return state === "KS" && pathwayId !== null && Object.hasOwn(KS_MUNICIPAL_CONTACT_ROUTES, pathwayId);
}
const NON_FACTS = new Set(["unknown", "i am not sure", "not sure", "no estoy seguro", "none", "ninguno", "ninguna", "unavailable", "not available", "no disponible", "confidential", "confidencial", "no address", "no mailing address", "sin dirección", "sin dirección postal", "no tengo dirección", "no phone", "no phone number", "no telephone", "sin teléfono", "no tengo teléfono", "no email", "no email address", "sin correo electrónico", "no tengo correo electrónico"]);
export function ksMunicipalContactText(raw: unknown): string | null {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const entry = raw as Record<string, unknown>;
    if (Object.keys(entry).some(key => key !== "value" && key !== "unknown") || entry.unknown !== false) return null;
    raw = entry.value;
  }
  return typeof raw === "string" && raw.trim() && !NON_FACTS.has(raw.trim().toLocaleLowerCase("en-US")) ? raw : null;
}
/** The existing client status uses the same strict source decoder as mapping. */
export function ksMunicipalContactAnswerState(state: string, pathwayId: string | null, id: string, raw: unknown,
  generic: "unanswered" | "invalid" | "known_valid" | "uncertain" | "declined") {
  return isKsMunicipalContact(state, pathwayId) && KS_MUNICIPAL_CONTACT_IDS.some(fieldId => fieldId === id)
    && generic === "known_valid" && ksMunicipalContactText(raw) === null ? "invalid" : generic;
}
function sameRawContact(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object" || Array.isArray(left) !== Array.isArray(right)) return false;
  const a = Object.keys(left).sort(), b = Object.keys(right).sort();
  return a.length === b.length && a.every((key, index) => key === b[index]
    && sameRawContact((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key]));
}
const question = (id: string, prompt: string, helperText: string, es: string, esHelper: string): ProfileQuestion => ({
  id, stage: "packet_information", type: "text_or_unknown", required: false, contextOnly: false,
  lifecyclePhase: "postpay_packet_field", options: null, prompt, helperText,
  translations: { es: { prompt: es, helperText: esHelper } }
});
const LOCAL_SCOPE = "You can leave an unavailable contact method unanswered here. These details are for the existing municipal petition contact block, not the court, prosecutor or an attorney. Confirm the city’s current form and process; a local form or different charter ordinance still requires its own review. These answers do not establish eligibility, authorize filing or certify service.";
const LOCAL_SCOPE_ES = "Aquí puede dejar sin responder un medio de contacto que no esté disponible. Estos datos son para el bloque de contacto de la petición municipal existente, no para el tribunal, la fiscalía ni un abogado. Confirme el formulario y el proceso actuales de la ciudad; un formulario local o una ordenanza municipal diferente aún requieren su propia revisión. Estas respuestas no establecen la elegibilidad, no autorizan la presentación ni certifican una notificación.";
const QUESTIONS = [
  question("mailing_address", "What mailing address should appear for the petitioner on the municipal petition?",
    "Enter the petitioner’s actual mailing address, including any apartment or unit. If unavailable, confidential or unknown, save that answer and check the receiving municipal court’s completion instructions. " + LOCAL_SCOPE,
    "¿Qué dirección postal debe aparecer para la persona solicitante en la petición municipal?",
    "Ingrese la dirección postal real de la persona solicitante, incluido cualquier apartamento o unidad. Si no está disponible, es confidencial o la desconoce, guarde esa respuesta y consulte las instrucciones del tribunal municipal receptor para completar el formulario. " + LOCAL_SCOPE_ES),
  question("phone_number", "What phone number should appear for the petitioner on the municipal petition?",
    "Enter the petitioner’s actual contact number, including any extension. If there is no phone number or it is unknown, save that answer and check the municipal court’s completion instructions. " + LOCAL_SCOPE,
    "¿Qué número de teléfono debe aparecer para la persona solicitante en la petición municipal?",
    "Ingrese el número de contacto real de la persona solicitante, incluida cualquier extensión. Si no tiene teléfono o desconoce el número, guarde esa respuesta y consulte las instrucciones del tribunal municipal para completar el formulario. " + LOCAL_SCOPE_ES),
  question("email_address", "What email address should appear for the petitioner on the municipal petition?",
    "Enter the petitioner’s actual email address for this petition. If unavailable or unknown, save that answer and check the municipal court’s completion instructions. An account email is not selected automatically. " + LOCAL_SCOPE,
    "¿Qué dirección de correo electrónico debe aparecer para la persona solicitante en la petición municipal?",
    "Ingrese la dirección de correo electrónico real de la persona solicitante para esta petición. Si no está disponible o la desconoce, guarde esa respuesta y consulte las instrucciones del tribunal municipal para completar el formulario. No se selecciona automáticamente el correo de una cuenta. " + LOCAL_SCOPE_ES)
];
export function ksMunicipalContactQuestions(answers: Readonly<Record<string, unknown>> = {}): ProfileQuestion[] {
  const questions = structuredClone(QUESTIONS);
  if (Object.hasOwn(answers, "contact_information")) {
    const raw = answers.contact_information;
    const history = typeof raw === "string" ? raw : JSON.stringify(raw);
    questions[0].helperText += `\nEarlier contact answer (history only; not split into form fields): ${history}`;
    questions[0].translations!.es!.helperText += `\nRespuesta de contacto anterior (solo historial; no se divide en campos del formulario): ${history}`;
  }
  return questions;
}
export function ksMunicipalContactInputs(snapshot: {
  jurisdiction: string; pathwayId: string | null; selectedTrackId?: string | null;
  profileVersion: string; profileSourceFingerprint: string | null; profileAuthorityFingerprint: string | null;
  screeningAnswers: Record<string, unknown>; prefilledAnswers: Record<string, unknown>; packetAnswers: Record<string, unknown>;
}) {
  if (!isKsMunicipalContact(snapshot.jurisdiction, snapshot.pathwayId)
    || snapshot.selectedTrackId != null && snapshot.selectedTrackId !== KS_MUNICIPAL_CONTACT_ROUTES[snapshot.pathwayId as keyof typeof KS_MUNICIPAL_CONTACT_ROUTES]
    || snapshot.profileVersion !== KS_MUNICIPAL_CONTACT_SOURCE.profileVersion
    || snapshot.profileSourceFingerprint !== KS_MUNICIPAL_CONTACT_SOURCE.profileSourceFingerprint
    || snapshot.profileAuthorityFingerprint !== KS_MUNICIPAL_CONTACT_SOURCE.profileAuthorityFingerprints[snapshot.pathwayId as keyof typeof KS_MUNICIPAL_CONTACT_ROUTES]) return null;
  const maps = [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers];
  const writes = KS_MUNICIPAL_CONTACT_FIELDS.flatMap(field => {
    const supplied = maps.filter(map => Object.hasOwn(map, field.id)).map(map => ksMunicipalContactText(map[field.id]));
    return supplied.length && supplied.every(value => value !== null && value === supplied[0])
      ? [{ factId: field.id, field: `${KS_MUNICIPAL_CONTACT_ROUTES[snapshot.pathwayId as keyof typeof KS_MUNICIPAL_CONTACT_ROUTES]}-primary-filing-1.${field.field}`, participantKey: field.participantKey, value: supplied[0]! }] : [];
  });
  const conflictingIds = KS_MUNICIPAL_CONTACT_FIELDS.filter(field => {
    const raw = maps.filter(map => Object.hasOwn(map, field.id)).map(map => map[field.id]);
    if (raw.length < 2) return false;
    const first = ksMunicipalContactText(raw[0]);
    return !raw.every(value => first !== null ? ksMunicipalContactText(value) === first
      : sameRawContact(value, raw[0]));
  }).map(field => field.id);
  return { source: KS_MUNICIPAL_CONTACT_SOURCE, writes, conflictingIds,
    unresolvedIds: KS_MUNICIPAL_CONTACT_FIELDS.filter(field => !writes.some(write => write.factId === field.id)).map(field => field.id),
    meaning: "petitioner_owned_municipal_contact_completion" as const,
    universallyRequiredContactIds: [] as string[], qualifiedSpanishReview: "pending" as const,
    localFormOrCharterApproved: false as const, routeSelectedByContact: false as const, aggregateContactParsed: false as const, accountEmailAdopted: false as const,
    generationAllowed: false as const, deliveryAllowed: false as const, admissionGranted: false as const };
}
