import type { ProfileQuestion } from "@/lib/expungement-ai/frontend/contracts";
import { MT_DEFERRED_QUESTIONS, montanaDeferredFactApplies, MT_DEFERRED_ROUTE } from "@/lib/rcap-engine/montana-deferred-facts";
import type { EngineProfile } from "@/lib/rcap-engine/contracts";

const text = (id: string, prompt: string, es: string, type = "text_or_unknown"): ProfileQuestion => ({
  id, prompt, stage: "packet_information", type, required: false, contextOnly: false, options: null,
  helperText: "Use the actual record for this case. Keep an unknown answer if you cannot confirm it. Saving this detail does not sign or file a document.",
  translations: { es: { prompt: es, helperText: "Use el expediente real de este caso. Mantenga una respuesta desconocida si no puede confirmarla. Guardar este dato no firma ni presenta un documento." } }
});
const choice = (id: string, en: string, es: string, values: [string, string, string][]): ProfileQuestion => ({
  ...text(id, en, es, "single_choice"), options: values.map(([value]) => value),
  optionDisplay: Object.fromEntries(values.map(([value, label, translated]) => [value, { label, translations: { es: { label: translated } } }]))
});
const common = [
  text("fullName", "What is your full legal name for this case?", "¿Cuál es su nombre legal completo para este caso?"),
  text("dateOfBirth", "What is your date of birth?", "¿Cuál es su fecha de nacimiento?", "date_or_unknown"),
  text("mailingAddress", "What is your current mailing address, including city, state and ZIP code?", "¿Cuál es su dirección postal actual, incluida la ciudad, el estado y el código postal?"),
  text("phone", "What telephone number may be printed for you on these documents?", "¿Qué número de teléfono se puede imprimir para usted en estos documentos?"),
  text("email", "What email address may be printed for you on these documents?", "¿Qué dirección de correo electrónico se puede imprimir para usted en estos documentos?"),
  text("chargeName", "What is the exact charge named in the deferred-sentence order?", "¿Cuál es el cargo exacto que figura en la orden de sentencia aplazada?"),
  text("arrestDate", "What is the arrest date for this charge in the case record?", "¿Cuál es la fecha de arresto por este cargo en el expediente del caso?", "date_or_unknown"),
  text("citizenshipConfirmed", "Are you a United States citizen?", "¿Es ciudadano de los Estados Unidos?", "yes_no_unsure"),
  text("denialQuestion", "Do you need advice about whether you may deny or omit this charge on an application?", "¿Necesita asesoramiento sobre si puede negar u omitir este cargo en una solicitud?", "yes_no_unsure")
];
const court = [
  choice("sentencingCourtLevel", "Which kind of court entered the deferred-sentence order?", "¿Qué tipo de tribunal dictó la orden de sentencia aplazada?", [["district", "District court", "Tribunal de distrito"], ["justice", "Justice court", "Tribunal de justicia"], ["municipal_city", "Municipal or city court", "Tribunal municipal o de la ciudad"], ["unknown", "I am not sure", "No estoy seguro"]]),
  text("courtName", "What is the exact name of the sentencing court on the order?", "¿Cuál es el nombre exacto del tribunal que dictó la sentencia según la orden?"),
  text("sentencingCounty", "In which Montana county is that sentencing court?", "¿En qué condado de Montana está ese tribunal?"),
  text("caseNumber", "What is the original criminal case number on the deferred-sentence order?", "¿Cuál es el número del caso penal original que figura en la orden de sentencia aplazada?"),
  choice("pleaOrVerdict", "Does the record show a guilty plea, a no-contest plea, or a guilty verdict?", "¿El expediente indica una declaración de culpabilidad, una declaración de no oposición o un veredicto de culpabilidad?", [["guilty", "Guilty plea", "Declaración de culpabilidad"], ["nolo contendere", "No-contest plea", "Declaración de no oposición"], ["verdict", "Guilty verdict", "Veredicto de culpabilidad"], ["unknown", "I am not sure", "No estoy seguro"]]),
  text("sentencingDate", "On what date did the court defer imposition of sentence?", "¿En qué fecha aplazó el tribunal la imposición de la sentencia?", "date_or_unknown"),
  text("prosecutingOffice", "What prosecuting office handled this original criminal case?", "¿Qué fiscalía llevó este caso penal original?"),
  text("prosecutorAddress", "What current mailing address did you confirm for that prosecuting office?", "¿Qué dirección postal actual confirmó para esa fiscalía?"),
  text("prosecutorEmail", "What email address identifies that prosecuting office?", "¿Qué dirección de correo electrónico identifica a esa fiscalía?"),
  text("clerkContacted", "Have you contacted the sentencing court clerk about this request?", "¿Se ha comunicado con la secretaría del tribunal que dictó la sentencia sobre esta solicitud?", "yes_no_unsure"),
  text("revocationConfirmedByClerk", "Did the sentencing court clerk confirm from the case record that no petition to revoke was filed during deferral?", "¿Confirmó la secretaría del tribunal, a partir del expediente, que no se presentó una petición de revocación durante el aplazamiento?", "yes_no_unsure"),
  text("recordConfirmed", "Have you checked the deferred-sentence order and confirmed the case details you supplied from the record?", "¿Ha revisado la orden de sentencia aplazada y confirmado en el expediente los datos del caso que proporcionó?", "yes_no_unsure"),
  text("earlyTermination", "Are you asking the court to end a deferral period that is still running?", "¿Está solicitando que el tribunal termine un período de aplazamiento que aún continúa?", "yes_no_unsure"),
  text("localFormOverride", "Did the court clerk identify a local form or procedure that must be used instead of this drafted motion?", "¿Indicó la secretaría del tribunal un formulario o procedimiento local que deba usarse en lugar de esta moción redactada?", "yes_no_unsure"),
  text("disputedCompletion", "Is there a dispute about whether the deferral ended or its conditions were completed?", "¿Existe una disputa sobre si terminó el aplazamiento o se cumplieron sus condiciones?", "yes_no_unsure")
];
export const MT_DEFERRED_DOCUMENT_QUESTION_IDS = [...common, ...court].map(q => q.id);
export function montanaDeferredDocumentQuestions(profile: EngineProfile, answers: Record<string, unknown>, stage: "court_motion" | "doj_after_order" | null, includeInactive = false): ProfileQuestion[] {
  const sourceQuestions = MT_DEFERRED_QUESTIONS.filter(q => includeInactive || stage === "court_motion" && q.id === "mt_deferred_revocation_petition" || montanaDeferredFactApplies(profile, MT_DEFERRED_ROUTE, answers, q.id)).map(q => ({ ...q, contextOnly: false, required: false, options: Array.isArray(q.options) ? q.options.filter((value): value is string => typeof value === "string") : null }));
  return [...sourceQuestions, ...(stage || includeInactive ? common : []), ...(stage === "court_motion" || includeInactive ? court : [])];
}

const reviewCopy: Record<string, { en: string; es: string }> = {
  filed_revocation_requires_document_review: { en: "A filed revocation petition requires legal review before using this motion. Do not allege that no petition was filed.", es: "Una petición de revocación presentada requiere revisión jurídica antes de usar esta moción. No afirme que no se presentó una petición." },
  not_a_deferred_imposition: { en: "This document set is for deferred imposition of sentence. A suspended or different sentence requires a different review.", es: "Este conjunto de documentos corresponde a una imposición de sentencia aplazada. Una sentencia suspendida o distinta requiere otra revisión." },
  seeking_early_termination: { en: "A request to end a running deferral early requires separate review. This motion does not request early termination.", es: "Una solicitud para terminar antes un aplazamiento que continúa requiere revisión por separado. Esta moción no solicita la terminación anticipada." },
  disputed_completion: { en: "Resolve the dispute about expiration or completed conditions before using a motion that alleges completion.", es: "Resuelva la disputa sobre el vencimiento o el cumplimiento de las condiciones antes de usar una moción que afirme el cumplimiento." },
  court_specific_procedure_or_form: { en: "Follow the sentencing court's current local form or procedure. Do not substitute this general draft for a required local form.", es: "Siga el formulario o procedimiento local vigente del tribunal que dictó la sentencia. No sustituya un formulario local obligatorio por este borrador general." },
  noncitizen_requires_qualified_advice: { en: "Stop self-help document use and obtain qualified immigration advice. Deferred-sentence dismissal may still be a conviction for immigration purposes.", es: "No use los documentos de autoayuda y obtenga asesoramiento de inmigración calificado. Una desestimación después de una sentencia aplazada puede seguir siendo una condena para fines migratorios." },
  denial_of_charge_question_requires_qualified_advice: { en: "Get qualified advice before denying or omitting this charge. This process does not establish permission to deny it.", es: "Obtenga asesoramiento calificado antes de negar u omitir este cargo. Este proceso no establece autorización para negarlo." },
  current_conditions_or_financial_orders_unresolved: { en: "The current court conditions or financial orders remain unresolved. Do not allege that all conditions were completed.", es: "Las condiciones judiciales o las órdenes financieras vigentes siguen sin resolverse. No afirme que se cumplieron todas las condiciones." },
  deferral_period_not_terminated: { en: "The deferral period is still running. This completed-deferral motion cannot allege that the period ended.", es: "El período de aplazamiento continúa. Esta moción posterior al cumplimiento no puede afirmar que el período terminó." },
  court_terminated_remaining_time_requires_distinct_allegation: { en: "Keep the order terminating the remaining time for review. Any motion must describe that actual order rather than claim that the full period expired.", es: "Conserve la orden que terminó el tiempo restante para su revisión. Toda moción debe describir esa orden real en lugar de afirmar que venció todo el período." }
};
export function montanaDeferredDocumentReviewNotices(reasons: string[]): Array<{ en: string; es: string }> {
  return reasons.map(reason => reviewCopy[reason] ?? (reason.startsWith("conflicting_protected_fact:")
    ? { en: "Saved values for the same participant fact disagree. Review the displayed answer and explicitly confirm or correct it; previous values remain in saved history.", es: "Los valores guardados para el mismo dato del participante no coinciden. Revise la respuesta mostrada y confírmela o corríjala expresamente; los valores anteriores permanecen en el historial guardado." }
    : { en: "The saved dates are out of order. Check the case record and correct the dates before using these documents.", es: "Las fechas guardadas no siguen el orden cronológico. Consulte el expediente y corrija las fechas antes de usar estos documentos." }));
}
