import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";

/** Reuses the retained TF-810 contact map. This is not a finding that a case
 * qualifies under Rule 40, a current-source approval, or fulfillment authority. */
export const AK_COURTVIEW_PATHWAY = "confidentiality-of-acquittals-and-dismissals-as-22-35-030-administrative-rule-40";
export const AK_TF810_CONTACT_SOURCE = {
  familyId: "ak-courtview-set", formId: "TF-810", revision: "5/25",
  sourceSha256: "c5e55ce0c0bb2a008ad9cde5e62c4900f413c8fb64a913e94c81554c64b69582",
  mapPath: "data/rcap-all50/overlays/census-v1/ak/ak-courtview-set--official-pdf-fill/production-field-map.json",
  mapSha256: "bc5d50377fc550c27440c2e23ccd24ca440333578b7118735725edce167c3f0e",
  profileVersion: "2026-06-19-source-conversion-1",
  profileSourceFingerprint: "8b11231dee9fe53f5a41a541dd07ff435778d94aa410ed6064783ecb5e6ea40a",
  profileAuthorityFingerprint: "558957e7eb015305f3db9ce1ceaf266869151ed9138afe3ef9d3d37f6b7e807a"
} as const;
export const AK_TF810_PUBLIC_ID = "ak_tf810_case_still_public";
export const AK_TF810_CONTACT_FIELDS = [
  { id: "ak_tf810_contact_address", field: "address", participantKey: "street_address", optional: false },
  { id: "ak_tf810_contact_phone", field: "phoneNo", participantKey: "phone", optional: false },
  { id: "ak_tf810_contact_email", field: "email", participantKey: "email", optional: true },
  { id: "ak_tf810_case_number", field: "caseNo", matterKey: "case_number", optional: false }
] as const;
export const AK_TF810_CONTACT_IDS = [AK_TF810_PUBLIC_ID, ...AK_TF810_CONTACT_FIELDS.map(f => f.id)];
export function isAkCourtviewContact(state: string, pathwayId: string | null) {
  return state === "AK" && pathwayId === AK_COURTVIEW_PATHWAY;
}
function knownText(raw: unknown): string | null {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const entry = raw as Record<string, unknown>;
    if (Object.keys(entry).some(k => k !== "value" && k !== "unknown") || entry.unknown !== false) return null;
    raw = entry.value;
  }
  return typeof raw === "string" && raw.trim() && !/^(?:unknown|i am not sure|not sure|no estoy seguro)$/i.test(raw.trim()) ? raw : null;
}
// Exact standalone non-facts only: never inspect substrings, infer an address,
// require court approval for ordinary contact facts, or rewrite saved answers.
const UNAVAILABLE_CONTACT = ["none", "ninguno", "ninguna", "unavailable", "not available", "no disponible", "confidential", "confidencial"];
const NON_CONTACT_FACTS: Record<string, ReadonlySet<string>> = {
  ak_tf810_contact_address: new Set([...UNAVAILABLE_CONTACT, "no address", "no mailing address", "sin dirección", "sin dirección postal", "no tengo dirección"]),
  ak_tf810_contact_phone: new Set([...UNAVAILABLE_CONTACT, "no phone", "no phone number", "no telephone", "no telephone number", "sin teléfono", "sin número de teléfono", "no tengo teléfono"]),
  ak_tf810_contact_email: new Set([...UNAVAILABLE_CONTACT, "none", "no email", "no email address", "ninguno", "ninguna", "sin correo electrónico", "no tengo correo electrónico"])
};
export function akCourtviewContactText(id: string, raw: unknown): string | null {
  const value = knownText(raw);
  return value !== null && !NON_CONTACT_FACTS[id]?.has(value.trim().toLocaleLowerCase("en-US")) ? value : null;
}
export function akCourtviewContactAnswerState(
  state: string, pathwayId: string | null, id: string, raw: unknown,
  generic: "unanswered" | "invalid" | "known_valid" | "uncertain" | "declined"
) {
  return isAkCourtviewContact(state, pathwayId) && Object.hasOwn(NON_CONTACT_FACTS, id)
    && generic === "known_valid" && akCourtviewContactText(id, raw) === null ? "invalid" : generic;
}
export function akCourtviewContactIds(state: string, pathwayId: string | null, answers: Record<string, unknown>, includeInactive = false): string[] {
  if (!isAkCourtviewContact(state, pathwayId)) return [];
  return includeInactive || knownText(answers[AK_TF810_PUBLIC_ID]) === "Yes" ? [...AK_TF810_CONTACT_IDS] : [AK_TF810_PUBLIC_ID];
}
const textQuestion = (id: string, prompt: string, helperText: string, es: string, esHelper: string, required: boolean): ProfileQuestion => ({
  id, stage: "packet_information", type: "text_or_unknown", required, contextOnly: false,
  lifecyclePhase: "postpay_official_form_field", options: null, prompt, helperText,
  translations: { es: { prompt: es, helperText: esHelper } }
});
const QUESTIONS: ProfileQuestion[] = [
  { id: AK_TF810_PUBLIC_ID, stage: "packet_information", type: "single_choice", required: false, contextOnly: false,
    lifecyclePhase: "postpay_official_form_field", options: ["Yes", "No", "I am not sure"],
    prompt: "Is this case still showing on the public CourtView website?",
    helperText: "TF-810 is a request to correct a case that should have been removed but still appears. Check the actual case. This answer does not establish a legal ground for removal or permission to file.",
    optionDisplay: { Yes: { label: "Yes", translations: { es: { label: "Sí" } } }, No: { label: "No", translations: { es: { label: "No" } } }, "I am not sure": { label: "I am not sure", translations: { es: { label: "No estoy seguro" } } } },
    translations: { es: { prompt: "¿Este caso todavía aparece en el sitio web público de CourtView?",
      helperText: "TF-810 es una solicitud para corregir un caso que debería haberse retirado pero que todavía aparece. Verifique el caso real. Esta respuesta no establece un fundamento legal para retirarlo ni permiso para presentar la solicitud." } } },
  textQuestion("ak_tf810_case_number", "What is the case number for this TF-810 request?",
    "Copy the case number from the actual court record. If you do not know it, keep that answer; do not substitute another case number.",
    "¿Cuál es el número de caso para esta solicitud TF-810?",
    "Copie el número de caso del expediente judicial correspondiente. Si no lo conoce, conserve esa respuesta; no sustituya el número de otro caso.", true),
  textQuestion("ak_tf810_contact_address", "What address should appear for the person requesting removal on TF-810?",
    "Enter the requester’s contact address exactly as it should appear. Do not substitute the court address, residence history or arrest location. If unavailable, confidential or unknown, keep that answer and obtain the court’s applicable instructions; do not invent an address.",
    "¿Qué dirección debe aparecer en TF-810 para la persona que solicita retirar el caso?",
    "Ingrese la dirección de contacto de la persona solicitante tal como debe aparecer. No sustituya la dirección del tribunal, el historial de residencia ni el lugar del arresto. Si no está disponible, es confidencial o la desconoce, conserve esa respuesta y obtenga las instrucciones aplicables del tribunal; no invente una dirección.", true),
  textQuestion("ak_tf810_contact_phone", "What phone number should appear for the person requesting removal on TF-810?",
    "Use the requester’s actual contact number, including any extension. If there is no phone number or it is unknown, preserve that answer and check the court’s instructions. Do not use the court’s or another party’s number.",
    "¿Qué número de teléfono debe aparecer en TF-810 para la persona que solicita retirar el caso?",
    "Use el número de contacto real de la persona solicitante, incluida cualquier extensión. Si no tiene teléfono o desconoce el número, conserve esa respuesta y consulte las instrucciones del tribunal. No use el número del tribunal ni de otra parte.", true),
  textQuestion("ak_tf810_contact_email", "What email address, if any, does the requester choose to provide on TF-810?",
    "Email is optional. TF-810 says: “By providing an email address, you agree that the court and other parties can send court documents to you at this email address.” Leave it blank if you do not choose this delivery method. An account email or earlier contact answer is not selected automatically.",
    "¿Qué dirección de correo electrónico, si alguna, decide proporcionar la persona solicitante en TF-810?",
    "El correo electrónico es opcional. Al proporcionar una dirección, acepta que el tribunal y las demás partes le envíen documentos judiciales a esa dirección. Déjela en blanco si no elige este método de envío. No se selecciona automáticamente el correo de una cuenta ni una respuesta de contacto anterior.", false)
];
export function akCourtviewContactQuestions(state: string, pathwayId: string | null, answers: Record<string, unknown>, includeInactive = false): ProfileQuestion[] {
  const ids = new Set(akCourtviewContactIds(state, pathwayId, answers, includeInactive));
  return QUESTIONS.filter(q => ids.has(q.id)).map(q => structuredClone(q));
}

/** Resolve only explicit source-owned facts across protected maps. No parsing of
 * old aggregate contact/location, account identity, legal grounds or signatures. */
export function akCourtviewContactInputs(snapshot: {
  jurisdiction: string; pathwayId: string | null; selectedTrackId?: string | null;
  profileVersion: string; profileSourceFingerprint: string | null; profileAuthorityFingerprint: string | null;
  screeningAnswers: Record<string, unknown>; prefilledAnswers: Record<string, unknown>; packetAnswers: Record<string, unknown>;
}) {
  if (!isAkCourtviewContact(snapshot.jurisdiction, snapshot.pathwayId)
    || snapshot.selectedTrackId != null && snapshot.selectedTrackId !== "ak-courtview"
    || snapshot.profileVersion !== AK_TF810_CONTACT_SOURCE.profileVersion
    || snapshot.profileSourceFingerprint !== AK_TF810_CONTACT_SOURCE.profileSourceFingerprint
    || snapshot.profileAuthorityFingerprint !== AK_TF810_CONTACT_SOURCE.profileAuthorityFingerprint) return null;
  const maps = [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers];
  const read = (id: string) => {
    const entries = maps.filter(m => Object.hasOwn(m, id)).map(m => knownText(m[id]));
    return entries.length && entries.every(value => value !== null && value === entries[0]) ? entries[0] : null;
  };
  if (read(AK_TF810_PUBLIC_ID) !== "Yes") return null;
  const writes = AK_TF810_CONTACT_FIELDS.flatMap(field => {
    const value = akCourtviewContactText(field.id, read(field.id));
    const destination = "participantKey" in field ? { participantKey: field.participantKey } : { matterKey: field.matterKey };
    return value === null ? [] : [{ factId: field.id, documentId: "TF-810", field: field.field, ...destination, value }];
  });
  return { source: AK_TF810_CONTACT_SOURCE, writes,
    unresolvedIds: AK_TF810_CONTACT_FIELDS.filter(field => !field.optional && !writes.some(w => w.factId === field.id)).map(f => f.id),
    sourceCurrency: "existing_hold_preserved" as const, qualifiedSpanishReview: "pending" as const,
    generationAllowed: false as const, deliveryAllowed: false as const, admissionGranted: false as const };
}
