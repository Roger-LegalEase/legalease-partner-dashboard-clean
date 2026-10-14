import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";

/** Existing ND family destinations. This projection grants no packet or route authority. */
export const ND_FIRST_OFFENSE_FAMILY = {
  route: "first-offense-possession-sealing",
  track: "nd-marijuana-first-offense-seal",
  familyId: "rcap-nd-custom-pleading",
  componentId: "nd-marijuana-first-offense-seal-primary-filing-1",
  mapPath: "data/rcap-all50/overlays/census-v1/nd/rcap-nd-custom-pleading--custom-pleading/production-field-map.json",
  mapSha256: "299d785562fe77ba5ffe310a8afbd7c377dd3384e7954ccb67d1839b213f5000",
  sourceReceiptSha256: "9d4093cbd88492a42a515ecc361e6d8e6e1c31d2b16fcacd757988d8f2bd106d",
  approvalId: "auth-2026-08-19-owner-legal-approval-completed-output",
  adoptionId: "EXT-ADOPT-01-standing-external-counsel-adoption",
  legacySpecificationCanonicalSha256: "c221c7d4f735d15526a1f5ac97b85055556f4b0c6ef1b2cf8327ce87af42f2f7",
  profileSha256: "02161fac85c2f585313ccdfaa9b91bc58054646a4356e2d486b5d7acc20f322f",
  profileVersion: "2026-06-19-source-conversion-1",
  profileSourceFingerprint: "c205813b263764fe44648ba577d91e8fadb52b55974b7fe154495bbff1b8ede7",
  profileAuthorityFingerprint: "71b23213d639ad3489a8602c6f13f938e4c9ba9def5a2e3b32f20951718edc8b"
} as const;

export const ND_FIRST_OFFENSE_CONTACT_FIELDS = [
  { id: "mailing_address", field: "mailing_address", participantKey: "street_address" },
  { id: "phone_number", field: "telephone", participantKey: "phone" },
  { id: "email_address", field: "email", participantKey: "email" }
] as const;

/** These are existing labelled record blanks, not newly required intake answers. */
export const ND_FIRST_OFFENSE_LOCATION_HANDBACKS = [
  { field: "fact_mjCounty", sourceKey: "mjCounty", question: "Which North Dakota county?" },
  { field: "fact_mjCourtType", sourceKey: "mjCourtType", question: "Was the case in district court or municipal court?" }
] as const;

const NON_FACTS = new Set(["unknown", "unsure", "not sure", "i am not sure", "no estoy seguro", "unavailable", "not available", "no disponible", "none", "ninguno", "ninguna", "confidential", "confidencial", "no mailing address", "no address", "sin dirección", "sin dirección postal", "no tengo dirección", "no phone", "no phone number", "no telephone", "sin teléfono", "no tengo teléfono", "no email", "no email address", "sin correo electrónico", "no tengo correo electrónico"]);
export function ndFirstOffenseContactText(raw: unknown): string | null {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const wrapper = raw as Record<string, unknown>;
    if (Object.keys(wrapper).some(key => key !== "value" && key !== "unknown") || wrapper.unknown !== false) return null;
    raw = wrapper.value;
  }
  return typeof raw === "string" && raw.trim() && !NON_FACTS.has(raw.trim().toLocaleLowerCase("en-US")) ? raw : null;
}

function sameRaw(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object" || Array.isArray(left) !== Array.isArray(right)) return false;
  const a = Object.keys(left).sort(), b = Object.keys(right).sort();
  return a.length === b.length && a.every((key, index) => key === b[index]
    && sameRaw((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key]));
}

export function ndFirstOffenseFamilyInputs(snapshot: {
  jurisdiction: string; pathwayId: string | null; selectedTrackId?: string | null;
  profileVersion: string; profileSourceFingerprint: string | null; profileAuthorityFingerprint: string | null;
  screeningAnswers: Record<string, unknown>; prefilledAnswers: Record<string, unknown>; packetAnswers: Record<string, unknown>;
}) {
  const source = ND_FIRST_OFFENSE_FAMILY;
  if (snapshot.jurisdiction !== "ND" || snapshot.pathwayId !== source.route
    || snapshot.selectedTrackId != null && snapshot.selectedTrackId !== source.track
    || snapshot.profileVersion !== source.profileVersion
    || snapshot.profileSourceFingerprint !== source.profileSourceFingerprint
    || snapshot.profileAuthorityFingerprint !== source.profileAuthorityFingerprint) return null;
  const maps = [snapshot.screeningAnswers, snapshot.prefilledAnswers, snapshot.packetAnswers];
  const writes = ND_FIRST_OFFENSE_CONTACT_FIELDS.flatMap(field => {
    const supplied = maps.filter(map => Object.hasOwn(map, field.id)).map(map => ndFirstOffenseContactText(map[field.id]));
    return supplied.length && supplied.every(value => value !== null && value === supplied[0])
      ? [{ factId: field.id, field: `${source.componentId}.${field.field}`, participantKey: field.participantKey, value: supplied[0]! }] : [];
  });
  const conflictingIds = ND_FIRST_OFFENSE_CONTACT_FIELDS.filter(field => {
    const supplied = maps.filter(map => Object.hasOwn(map, field.id)).map(map => map[field.id]);
    if (supplied.length < 2) return false;
    const first = ndFirstOffenseContactText(supplied[0]);
    return !supplied.every(value => first !== null ? ndFirstOffenseContactText(value) === first : sameRaw(value, supplied[0]));
  }).map(field => field.id);
  return {
    source, writes, conflictingIds,
    unavailableIds: ND_FIRST_OFFENSE_CONTACT_FIELDS.filter(field => !writes.some(write => write.factId === field.id)).map(field => field.id),
    universallyRequiredContactIds: [] as string[],
    locationHandbacks: ND_FIRST_OFFENSE_LOCATION_HANDBACKS.map(item => ({ ...item, field: `${source.componentId}.${item.field}`, actor: "participant_before_filing" as const })),
    legacyPurposeIdsNotAliased: ["contact_information", "residency_or_location"] as const,
    aggregateContactParsed: false as const, serviceAddressIsMailingAddress: false as const,
    countyIsJudicialDistrict: false as const, courtTypeInferred: false as const,
    routeSelectedByContact: false as const, generationAllowed: false as const,
    deliveryAllowed: false as const, admissionGranted: false as const
  };
}

export const ND_FIRST_OFFENSE_CONTACT_IDS = ND_FIRST_OFFENSE_CONTACT_FIELDS.map(field => field.id);
export function isNdFirstOffenseFamily(state: string, pathwayId: string | null) {
  return state === "ND" && pathwayId === ND_FIRST_OFFENSE_FAMILY.route;
}
export function ndFirstOffenseContactAnswerState(state: string, pathwayId: string | null, id: string, raw: unknown,
  generic: "unanswered" | "invalid" | "known_valid" | "uncertain" | "declined") {
  return isNdFirstOffenseFamily(state, pathwayId) && ND_FIRST_OFFENSE_CONTACT_IDS.some(fieldId => fieldId === id)
    && generic === "known_valid" && ndFirstOffenseContactText(raw) === null ? "invalid" : generic;
}
const question = (id: string, prompt: string, helperText: string, es: string, esHelper: string): ProfileQuestion => ({
  id, stage: "packet_information", type: "text_or_unknown", required: false, contextOnly: false,
  lifecyclePhase: "postpay_packet_field", options: null, prompt, helperText,
  translations: { es: { prompt: es, helperText: esHelper } }
});
const CONTACT_SCOPE = "You can leave an unavailable contact method unanswered here. Use the participant’s own details, not the court’s or prosecutor’s contact information. These answers do not decide eligibility, certify service, sign or file a document.";
const CONTACT_SCOPE_ES = "Aquí puede dejar sin responder un medio de contacto que no esté disponible. Use los datos de la propia persona participante, no los del tribunal ni de la fiscalía. Estas respuestas no determinan la elegibilidad, no certifican una notificación y no firman ni presentan un documento.";
const QUESTIONS = [
  question("mailing_address", "What mailing address should appear for you on the first-offense possession motion?",
    "Enter your actual mailing address, including any apartment or unit. If unavailable, confidential or unknown, save that answer. " + CONTACT_SCOPE,
    "¿Qué dirección postal debe aparecer para usted en la moción por una primera infracción de posesión?",
    "Ingrese su dirección postal real, incluido cualquier apartamento o unidad. Si no está disponible, es confidencial o la desconoce, guarde esa respuesta. " + CONTACT_SCOPE_ES),
  question("phone_number", "What phone number should appear for you on the first-offense possession motion?",
    "Enter your actual contact number, including any extension. If unavailable or unknown, save that answer. " + CONTACT_SCOPE,
    "¿Qué número de teléfono debe aparecer para usted en la moción por una primera infracción de posesión?",
    "Ingrese su número de contacto real, incluida cualquier extensión. Si no está disponible o lo desconoce, guarde esa respuesta. " + CONTACT_SCOPE_ES),
  question("email_address", "What email address should appear for you on the first-offense possession motion?",
    "Enter your actual email address for this motion. An account email is not selected automatically. If unavailable or unknown, save that answer. " + CONTACT_SCOPE,
    "¿Qué dirección de correo electrónico debe aparecer para usted en la moción por una primera infracción de posesión?",
    "Ingrese su dirección de correo electrónico real para esta moción. No se selecciona automáticamente el correo de una cuenta. Si no está disponible o lo desconoce, guarde esa respuesta. " + CONTACT_SCOPE_ES)
];
export function ndFirstOffenseContactQuestions(answers: Readonly<Record<string, unknown>> = {}): ProfileQuestion[] {
  const questions = structuredClone(QUESTIONS);
  for (const id of ["contact_information", "residency_or_location"]) if (Object.hasOwn(answers, id)) {
    const raw = answers[id], history = typeof raw === "string" ? raw : JSON.stringify(raw);
    questions[0].helperText += `\nEarlier ${id === "contact_information" ? "contact" : "location"} answer (history only; not copied into document fields): ${history}`;
    questions[0].translations!.es!.helperText += `\nRespuesta anterior de ${id === "contact_information" ? "contacto" : "ubicación"} (solo historial; no se copia en los campos del documento): ${history}`;
  }
  return questions;
}
