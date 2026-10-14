import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import { isNy16059Packet } from "@/lib/expungement-ai/ny-16059-packet-facts";

/** Exact applicant-owned fields on source pages 10 and 12. Existing generic
 * date/text-or-unknown validation and raw answer shapes are retained. These
 * descriptors neither split aggregate contact prose nor adopt account data. */
export const NY_CURRENT_DOCUMENT_CONTACT_SOURCE = {
  revision: "08/2026", pages: 14,
  sha256: "633f06e1481d9c1a4b3ec987770eff577ac1147afeb3de0661b15c3ce659bccf",
  mappingSha256: "9bbb150e06d1bb71918e717040cfde48106f1dc213664020bef833c59e6fea81"
} as const;
export const NY_CURRENT_DOCUMENT_PARTICIPANT_FIELDS = [
  { id: "date_of_birth", field: "ApplicantDateOfBirth", pages: [10], optional: false },
  { id: "street_address", field: "Appplicant Street Address", pages: [10, 12], optional: false },
  { id: "city_state_zip", field: "Applicant City State Zip", pages: [10, 12], optional: false },
  { id: "phone_number", field: "ApplicantPhone", pages: [10, 12], optional: false },
  { id: "email_address", field: "ApplicantEmail", pages: [10, 12], optional: true }
] as const;
export type NyCurrentDocumentParticipantFieldId = typeof NY_CURRENT_DOCUMENT_PARTICIPANT_FIELDS[number]["id"];
const descriptor = (id: NyCurrentDocumentParticipantFieldId, prompt: string, helperText: string, esPrompt: string, esHelper: string): ProfileQuestion => ({
  id, stage: "packet_information", type: id === "date_of_birth" ? "date_or_unknown" : "text_or_unknown",
  required: id !== "email_address", contextOnly: false, lifecyclePhase: "postpay_official_form_field", options: null,
  prompt, helperText, translations: { es: { prompt: esPrompt, helperText: esHelper } }
});
const DESCRIPTORS = [
  descriptor("date_of_birth", "What is the applicant's date of birth?",
    "Use the applicant's actual birth date. If it is unknown, save that answer rather than guessing. This completes the application caption; it does not decide eligibility.",
    "¿Cuál es la fecha de nacimiento de la persona solicitante?",
    "Use la fecha de nacimiento real de la persona solicitante. Si la desconoce, guarde esa respuesta en lugar de adivinar. Este dato completa el encabezado de la solicitud; no determina la elegibilidad."),
  descriptor("street_address", "What street address should appear for the applicant on this application?",
    "Use the applicant's address for this application, including any apartment or unit. This is not the court's or prosecutor's address. If unavailable or unknown, preserve that answer and check the receiving court's completion instructions.",
    "¿Qué dirección debe aparecer para la persona solicitante en esta solicitud?",
    "Use la dirección de la persona solicitante para esta solicitud, incluido cualquier apartamento o unidad. No es la dirección del tribunal ni de la fiscalía. Si no está disponible o la desconoce, conserve esa respuesta y consulte las instrucciones del tribunal receptor para completar la solicitud."),
  descriptor("city_state_zip", "What city, state and ZIP code go with that applicant address?",
    "Keep these details with the applicant's street address. Enter the actual wording; do not substitute a court county or guess a ZIP code.",
    "¿Qué ciudad, estado y código postal corresponden a esa dirección de la persona solicitante?",
    "Mantenga estos datos junto con la dirección de la persona solicitante. Ingrese los datos reales; no sustituya el condado del tribunal ni adivine un código postal."),
  descriptor("phone_number", "What phone number should appear for the applicant on this application?",
    "Enter the applicant's number as it should appear, including any extension. If the applicant has no phone number, say so; if the number is unknown, save that answer. Do not use the court's, prosecutor's or server's number.",
    "¿Qué número de teléfono debe aparecer para la persona solicitante en esta solicitud?",
    "Ingrese el número de la persona solicitante tal como debe aparecer, incluida cualquier extensión. Si la persona no tiene número de teléfono, indíquelo; si lo desconoce, guarde esa respuesta. No use el número del tribunal, de la fiscalía ni de quien entregue los documentos."),
  descriptor("email_address", "What email address, if any, does the applicant want to provide on this application?",
    "Email is optional. The form says that if an email address is provided, a copy of the court's decision will be emailed to it. An account email is not selected automatically, and providing this address does not certify service or sign an affirmation.",
    "¿Qué dirección de correo electrónico, si alguna, desea proporcionar la persona solicitante en esta solicitud?",
    "El correo electrónico es opcional. El formulario indica que, si se proporciona una dirección, se enviará a ella una copia de la decisión del tribunal. No se selecciona automáticamente el correo de una cuenta, y proporcionar esta dirección no certifica una notificación ni firma una afirmación.")
];

/** Return only the five exact fields for merging by ID. Already supplied valid
 * descriptors are reused once, with missing Spanish copy supplied. An existing
 * incompatible contract is reported, never silently overwritten or duplicated.
 * Caller must keep these as document-completion facts, not eligibility gates. */
export function ny16059CurrentDocumentQuestions(stateCode: string, pathwayId: string | null, existing: readonly ProfileQuestion[] = []) {
  if (!isNy16059Packet(stateCode, pathwayId)) return null;
  const questions: ProfileQuestion[] = [], addedIds: string[] = [], reusedIds: string[] = [], descriptorIssues: Array<{ id: string; code: string }> = [];
  for (const target of DESCRIPTORS) {
    const supplied = existing.filter(q => q.id === target.id), first = supplied[0];
    if (supplied.length > 1 && supplied.some(q => JSON.stringify(q) !== JSON.stringify(first))) { descriptorIssues.push({ id: target.id, code: "conflicting_existing_descriptors" }); continue; }
    if (first) {
      if (first.type !== target.type || first.answerContract || first.contextOnly || first.stage !== "packet_information"
        || target.id === "email_address" && first.required) { descriptorIssues.push({ id: target.id, code: "existing_descriptor_needs_explicit_reconciliation" }); continue; }
      questions.push({ ...structuredClone(first), translations: { ...structuredClone(first.translations), es: { ...target.translations!.es, ...structuredClone(first.translations?.es) } } });
      reusedIds.push(target.id);
    } else { questions.push(structuredClone(target)); addedIds.push(target.id); }
  }
  return { questions, addedIds, reusedIds, descriptorIssues, source: structuredClone(NY_CURRENT_DOCUMENT_CONTACT_SOURCE), fields: structuredClone(NY_CURRENT_DOCUMENT_PARTICIPANT_FIELDS),
    meaning: "applicant_owned_document_completion" as const, unknownChangesEligibility: false as const, accountEmailAdopted: false as const,
    aggregateContactParsed: false as const, serviceConsentInferred: false as const, qualifiedSpanishReview: "pending" as const };
}
