import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";

/** Existing JD-CR-202 defendant fields, not a new packet family or legal gate. */
export const CT_CLEAN_SLATE_ROUTE = "petitioned-clean-slate-erasure-for-eligible-pre-2000-convictions-jd-cr-202";
export const CT_CLEAN_SLATE_CONTACT_SOURCE = {
  familyId: "ct-cleanslate-petition-set", trackId: "ct-cleanslate-petition", formId: "JD-CR-202", revision: "11-23", page: 1,
  sourceSha256: "b5a917c2cd07727172a50534a4884a63e8ae08704b631c62a199c3454623062c",
  mapPath: "data/rcap-all50/overlays/census-v1/ct/ct-cleanslate-petition-set--official-pdf-fill/production-field-map.json",
  mapSha256: "904cb094c58087ff6fc813203855c7a2330519b1a7cda064a08704e7fca8a4d6",
  profileSha256: "2cd98fe022c2578c80d9b6405f2ea349dbcecb2dbf7dcd06589e098880095696",
  profileVersion: "2026-06-19-source-conversion-1",
  profileSourceFingerprint: "9417e1863420e1df725060c38960b7ac19da40f59f1f329e30436a0d31a8589a",
  profileAuthorityFingerprint: "7ffed3719894dc5d47b369fdbae1da2537ec47dc5662f190318fb661ff31f958"
} as const;
export const CT_CLEAN_SLATE_CONTACT_FIELDS = [
  { id: "mailing_address", field: "form1[0].PAGE1[0].DEFADDRESS[0]", participantKey: "street_address" },
  { id: "phone_number", field: "form1[0].PAGE1[0].DEFPHONE[0]", participantKey: "phone" },
  { id: "email_address", field: "form1[0].PAGE1[0].DEFEMAIL[0]", participantKey: "email" }
] as const;
export const CT_CLEAN_SLATE_CONTACT_IDS = CT_CLEAN_SLATE_CONTACT_FIELDS.map(field => field.id);
export function isCtCleanSlateContact(state: string, pathwayId: string | null) {
  return state === "CT" && pathwayId === CT_CLEAN_SLATE_ROUTE;
}
const NON_FACTS = new Set(["unknown", "i am not sure", "not sure", "no estoy seguro", "none", "ninguno", "ninguna", "unavailable", "not available", "no disponible", "confidential", "confidencial", "no address", "no mailing address", "sin dirección", "sin dirección postal", "no tengo dirección", "no phone", "no phone number", "no telephone", "sin teléfono", "no tengo teléfono", "no email", "no email address", "sin correo electrónico", "no tengo correo electrónico"]);
export function ctCleanSlateContactText(raw: unknown): string | null {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const entry = raw as Record<string, unknown>;
    if (Object.keys(entry).some(key => key !== "value" && key !== "unknown") || entry.unknown !== false) return null;
    raw = entry.value;
  }
  return typeof raw === "string" && raw.trim() && !NON_FACTS.has(raw.trim().toLocaleLowerCase("en-US")) ? raw : null;
}
/** The existing client status uses the same strict source decoder as mapping. */
export function ctCleanSlateContactAnswerState(state: string, pathwayId: string | null, id: string, raw: unknown,
  generic: "unanswered" | "invalid" | "known_valid" | "uncertain" | "declined") {
  return isCtCleanSlateContact(state, pathwayId) && CT_CLEAN_SLATE_CONTACT_IDS.some(fieldId => fieldId === id)
    && generic === "known_valid" && ctCleanSlateContactText(raw) === null ? "invalid" : generic;
}
function sameRawContact(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object" || Array.isArray(left) !== Array.isArray(right)) return false;
  const a = Object.keys(left).sort(), b = Object.keys(right).sort();
  return a.length === b.length && a.every((key, index) => key === b[index]
    && sameRawContact((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key]));
}
const question = (id: string, prompt: string, helperText: string, es: string, esHelper: string): ProfileQuestion => ({
  id, stage: "packet_information", type: "text_or_unknown", required: true, contextOnly: false,
  lifecyclePhase: "postpay_official_form_field", options: null, prompt, helperText,
  translations: { es: { prompt: es, helperText: esHelper } }
});
const QUESTIONS = [
  question("mailing_address", "What address should appear for the defendant on JD-CR-202?",
    "Enter the defendant’s contact address, including any apartment or unit. This is not the court’s, prosecutor’s or attorney’s address. If unavailable, confidential or unknown, keep that answer and check the receiving court’s completion instructions. These details complete the form; they do not decide eligibility.",
    "¿Qué dirección debe aparecer para la persona acusada en JD-CR-202?",
    "Ingrese la dirección de contacto de la persona acusada, incluido cualquier apartamento o unidad. No es la dirección del tribunal, de la fiscalía ni de un abogado. Si no está disponible, es confidencial o la desconoce, conserve esa respuesta y consulte las instrucciones del tribunal receptor para completar el formulario. Estos datos completan el formulario; no determinan la elegibilidad."),
  question("phone_number", "What phone number should appear for the defendant on JD-CR-202?",
    "Use the defendant’s actual contact number, including any extension. If there is no phone number or it is unknown, save that answer and check the court’s completion instructions. Do not substitute another person’s or the court’s number.",
    "¿Qué número de teléfono debe aparecer para la persona acusada en JD-CR-202?",
    "Use el número de contacto real de la persona acusada, incluida cualquier extensión. Si no tiene teléfono o desconoce el número, guarde esa respuesta y consulte las instrucciones del tribunal para completar el formulario. No sustituya el número de otra persona ni del tribunal."),
  question("email_address", "What email address should appear for the defendant on JD-CR-202?",
    "Enter the defendant’s actual email address for this form. If there is no email address or it is unknown, save that answer and check the court’s completion instructions. An account email is not selected automatically. This answer does not sign the form or certify service.",
    "¿Qué dirección de correo electrónico debe aparecer para la persona acusada en JD-CR-202?",
    "Ingrese la dirección de correo electrónico real de la persona acusada para este formulario. Si no tiene correo electrónico o desconoce la dirección, guarde esa respuesta y consulte las instrucciones del tribunal para completar el formulario. No se selecciona automáticamente el correo de una cuenta. Esta respuesta no firma el formulario ni certifica una notificación.")
];
export function ctCleanSlateContactQuestions(answers: Readonly<Record<string, unknown>> = {}): ProfileQuestion[] {
  const questions = structuredClone(QUESTIONS);
  if (Object.hasOwn(answers, "contact_information")) {
    const raw = answers.contact_information;
    const history = typeof raw === "string" ? raw : JSON.stringify(raw);
    questions[0].helperText += `\nEarlier contact answer (history only; not split into form fields): ${history}`;
    questions[0].translations!.es!.helperText += `\nRespuesta de contacto anterior (solo historial; no se divide en campos del formulario): ${history}`;
  }
  return questions;
}
export function ctCleanSlateContactInputs(snapshot: {
  jurisdiction: string; pathwayId: string | null; selectedTrackId?: string | null;
  profileVersion: string; profileSourceFingerprint: string | null; profileAuthorityFingerprint: string | null;
  screeningAnswers: Record<string, unknown>; prefilledAnswers: Record<string, unknown>; packetAnswers: Record<string, unknown>;
}) {
  if (!isCtCleanSlateContact(snapshot.jurisdiction, snapshot.pathwayId)
    || snapshot.selectedTrackId != null && snapshot.selectedTrackId !== CT_CLEAN_SLATE_CONTACT_SOURCE.trackId
    || snapshot.profileVersion !== CT_CLEAN_SLATE_CONTACT_SOURCE.profileVersion
    || snapshot.profileSourceFingerprint !== CT_CLEAN_SLATE_CONTACT_SOURCE.profileSourceFingerprint
    || snapshot.profileAuthorityFingerprint !== CT_CLEAN_SLATE_CONTACT_SOURCE.profileAuthorityFingerprint) return null;
  const maps = [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers];
  const writes = CT_CLEAN_SLATE_CONTACT_FIELDS.flatMap(field => {
    const supplied = maps.filter(map => Object.hasOwn(map, field.id)).map(map => ctCleanSlateContactText(map[field.id]));
    return supplied.length && supplied.every(value => value !== null && value === supplied[0])
      ? [{ factId: field.id, field: field.field, participantKey: field.participantKey, value: supplied[0]! }] : [];
  });
  const conflictingIds = CT_CLEAN_SLATE_CONTACT_FIELDS.filter(field => {
    const raw = maps.filter(map => Object.hasOwn(map, field.id)).map(map => map[field.id]);
    if (raw.length < 2) return false;
    const first = ctCleanSlateContactText(raw[0]);
    return !raw.every(value => first !== null ? ctCleanSlateContactText(value) === first
      : sameRawContact(value, raw[0]));
  }).map(field => field.id);
  return { source: CT_CLEAN_SLATE_CONTACT_SOURCE, writes, conflictingIds,
    unresolvedIds: CT_CLEAN_SLATE_CONTACT_FIELDS.filter(field => !writes.some(write => write.factId === field.id)).map(field => field.id),
    meaning: "defendant_owned_form_completion" as const, qualifiedSpanishReview: "pending" as const,
    aggregateContactParsed: false as const, accountEmailAdopted: false as const,
    generationAllowed: false as const, deliveryAllowed: false as const, admissionGranted: false as const };
}
